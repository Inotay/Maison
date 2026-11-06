// Rappels : prévient par notification (Web Push) quand quelque chose est vraiment en retard.
// Lancée par le planificateur deux fois par jour (action « run »), et appelée par l'app pour
// obtenir la clé publique VAPID (action « vapid »). Les clés sont générées ici au premier appel
// et gardées dans app_secrets, une table sans règle d'accès pour les comptes de l'app.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
// Suivi de chaque envoi : la dernière réussite et la dernière erreur par appareil (pour comprendre une
// notification qui n'arrive pas).
let SUIVI: ReturnType<typeof admin> | null = null;
// anciens abonnements (ancienne adresse) d'une personne qui en a un sur la nouvelle : on les saute (doublons)
let VIEUX = new Set<string>();
async function vieuxAbonnements(db: ReturnType<typeof admin>) {
  const { data } = await db.from("push_subscriptions").select("endpoint, email, origin");
  const l = (data ?? []) as { endpoint: string; email: string; origin: string | null }[];
  const neufs = new Set(l.filter(x => x.origin).map(x => x.email));
  VIEUX = new Set(l.filter(x => !x.origin && neufs.has(x.email)).map(x => x.endpoint));
}
const envoiBrut = webpush.sendNotification.bind(webpush);
(webpush as unknown as { sendNotification: typeof envoiBrut }).sendNotification = async (sub, payload, opts) => {
  const ep = (sub as { endpoint?: string })?.endpoint ?? "";
  if (ep && VIEUX.has(ep)) return { statusCode: 201, body: "", headers: {} } as Awaited<ReturnType<typeof envoiBrut>>;   // doublon : rien n'est envoyé
  try {
    const r = await envoiBrut(sub, payload, opts);
    if (SUIVI && ep) await SUIVI.from("push_subscriptions").update({ ok_at: new Date().toISOString() }).eq("endpoint", ep);
    return r;
  } catch (e) {
    const st = (e as { statusCode?: number }).statusCode, msg = (e as Error).message ?? String(e);
    if (SUIVI && ep) await SUIVI.from("push_subscriptions").update({ err: `${st ?? ""} ${msg}`.trim().slice(0, 200), err_at: new Date().toISOString() }).eq("endpoint", ep);
    throw e;
  }
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });

const DAY = 86400000;
const admin = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function vapid(db: ReturnType<typeof admin>) {
  const { data } = await db.from("app_secrets").select("name, value").in("name", ["vapid_public", "vapid_private", "vapid_subject"]);
  const got = Object.fromEntries((data ?? []).map((r: { name: string; value: string }) => [r.name, r.value]));
  if (!got.vapid_public || !got.vapid_private) {
    const k = webpush.generateVAPIDKeys();
    await db.from("app_secrets").upsert([
      { name: "vapid_public", value: k.publicKey }, { name: "vapid_private", value: k.privateKey },
      { name: "vapid_subject", value: got.vapid_subject || "mailto:maison@inotay.github.io" },
    ]);
    return { publicKey: k.publicKey, privateKey: k.privateKey, subject: got.vapid_subject || "mailto:maison@inotay.github.io" };
  }
  return { publicKey: got.vapid_public, privateKey: got.vapid_private, subject: got.vapid_subject || "mailto:maison@inotay.github.io" };
}

// Jour local (Suisse) d'une date, en AAAA-MM-JJ.
const zurich = (d: Date) => new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const daysBetween = (a: string, b: string) => Math.round((new Date(b + "T12:00:00Z").getTime() - new Date(a + "T12:00:00Z").getTime()) / DAY);

// Calendrier de ramassage (même grille que dechets.js) : peut-on descendre cette sorte maintenant ?
const O = "ok", R = "route", N = "non";
const WEEK: Record<string, string[][]> = {
  poubelles: [[O, R], [N, N], [O, O], [O, R], [N, N], [O, O], [O, O]],
  papier: [[O, R], [N, N], [O, O], [O, R], [N, N], [O, O], [O, O]],
  verre: [[N, N], [O, O], [O, O], [O, O], [O, R], [R, R], [R, R]],
  compost: [[N, N], [O, O], [O, O], [O, O], [O, R], [R, R], [R, R]],
};
function possibleNow(sorte: string, now: Date) {
  const w = WEEK[sorte]; if (!w) return true;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Zurich", weekday: "short", hour: "numeric", hour12: false }).formatToParts(now);
  const wd = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts.find(p => p.type === "weekday")!.value);
  const h = Number(parts.find(p => p.type === "hour")!.value) % 24;
  return w[wd][h >= 12 ? 1 : 0] !== N;
}

type Item = { kind: "chore" | "task"; id: string; title: string; who: string | null; late: number; sorte?: string | null };

async function run(db: ReturnType<typeof admin>) {
  const now = new Date(), today = zurich(now);
  const [{ data: members }, { data: chores }, { data: tasks }, { data: subs }] = await Promise.all([
    db.from("members").select("email, name"),
    db.from("chores").select("id, title, every_days, turn, last_done_at, sorte, notified_at, snooze_until, prive, options"),
    db.from("tasks").select("id, title, assignee, due_on, done, notified_at, snooze_until"),
    db.from("push_subscriptions").select("endpoint, email, sub"),
  ]);
  const emails = (members ?? []).map((m: { email: string }) => m.email);
  const items: Item[] = [];
  for (const c of chores ?? []) {
    if (c.prive || c.options?.pilule) continue;   // perso et pilule : leurs propres rappels (minuteurs)
    if (c.notified_at && zurich(new Date(c.notified_at)) === today) continue;
    if (c.snooze_until && c.snooze_until >= today) continue;   // repoussée en mode calme
    // Jamais faite : on compte depuis sa création n'est pas possible ici, on la considère due aujourd'hui (pas de rappel avant 2 jours de retard réel).
    const due = c.last_done_at ? new Date(new Date(c.last_done_at).getTime() + Number(c.every_days) * DAY) : null;
    const late = due ? daysBetween(zurich(due), today) : 0;
    if (c.sorte) { if (late >= 2 && possibleNow(c.sorte, now)) items.push({ kind: "chore", id: c.id, title: c.title, who: null, late, sorte: c.sorte }); }
    else if (late >= 2) items.push({ kind: "chore", id: c.id, title: c.title, who: c.turn ?? null, late });
  }
  for (const t of tasks ?? []) {
    if (t.done || !t.due_on) continue;
    if (t.snooze_until && t.snooze_until >= today) continue;
    if (t.notified_at && zurich(new Date(t.notified_at)) === today) continue;
    const late = daysBetween(String(t.due_on), today);
    if (late >= 1) items.push({ kind: "task", id: t.id, title: t.title, who: t.assignee ?? null, late });
  }
  if (!items.length) return { sent: 0, items: 0 };

  const keys = await vapid(db);
  webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
  let sent = 0; const dead: string[] = [];
  for (const email of emails) {
    const mine = items.filter(i => !i.who || i.who === email);
    if (!mine.length) continue;
    const list = mine.sort((a, b) => b.late - a.late).slice(0, 4).map(i => `${i.title} (${i.late} j)`).join(", ");
    // Beaucoup de retard : un message qui rassure plutôt qu'une liste qui écrase.
    const lots = mine.length >= 5;
    const title = lots ? "On respire" : mine.length === 1 ? "Une chose attend" : `${mine.length} choses attendent`;
    const payload = JSON.stringify({ title, body: lots ? "Beaucoup de choses attendent. Pas de panique : ouvre l'app, elle te dit par quoi commencer." : list, tag: "maison-rappel", url: lots ? "./?v=maison" : mine[0].kind === "task" ? "./?v=maison" : "./?v=menage" });
    for (const s of (subs ?? []).filter((s: { email: string }) => s.email === email)) {
      try { await webpush.sendNotification(s.sub, payload, { TTL: 6 * 3600 }); sent++; }
      catch (e) { const st = (e as { statusCode?: number }).statusCode; if (st === 404 || st === 410) dead.push(s.endpoint); else console.warn("push", email, (e as Error).message); }
    }
  }
  if (dead.length) await db.from("push_subscriptions").delete().in("endpoint", dead);
  const stamp = now.toISOString();
  const cIds = items.filter(i => i.kind === "chore").map(i => i.id), tIds = items.filter(i => i.kind === "task").map(i => i.id);
  if (cIds.length) await db.from("chores").update({ notified_at: stamp }).in("id", cIds);
  if (tIds.length) await db.from("tasks").update({ notified_at: stamp }).in("id", tIds);
  return { sent, items: items.length };
}

// Minuteurs des corvées en étapes (lave-vaisselle, lessive) : quand le temps est écoulé et que
// personne n'a encore été prévenu pour ce lancement, une notification part (à la personne pour une
// corvée personnelle, aux deux sinon). Appelé chaque minute par le planificateur.
const SEQ: Record<string, { label: string; steps: { key: string; minutes?: number; meta?: string; btn: string }[] }> = {
  lavevaisselle: { label: "Lave-vaisselle", steps: [{ key: "cycle", minutes: 60, btn: "Lancer" }, { key: "sortir", btn: "Sortie", meta: "Fini : sortir la vaisselle" }] },
  // la machine à laver se libère dès que le linge part au séchoir : le séchoir a son propre minuteur
  lessive: { label: "Lessive", steps: [{ key: "lavage", minutes: 60, btn: "Lancer" }, { key: "sortir", btn: "Au séchoir", meta: "Lavage fini : mettre au séchoir" }] },
  sechage: { label: "Séchage", steps: [{ key: "sechage", minutes: 80, btn: "Lancer" }, { key: "ranger", btn: "Rangée", meta: "Sec : sortir, plier et ranger" }] },
};
async function minuteurs(db: ReturnType<typeof admin>) {
  const now = Date.now();
  const [{ data: chores }, { data: subs }] = await Promise.all([
    db.from("chores").select("id, sorte, turn, step, started_at, notified_at, options").not("started_at", "is", null),
    db.from("push_subscriptions").select("endpoint, email, sub"),
  ]);
  const due = (chores ?? []).filter((c: { sorte: string; step: number; started_at: string; notified_at: string | null; options: { minutes?: Record<string, number> } | null }) => {
    const q = SEQ[c.sorte]; if (!q) return false;
    const st = q.steps[Math.min(Number(c.step) || 0, q.steps.length - 1)];
    const min = Number(c.options?.minutes?.[st.key]) || st.minutes || 0;
    if (!min) return false;
    const ready = new Date(c.started_at).getTime() + min * 60000;
    return now >= ready && !(c.notified_at && new Date(c.notified_at).getTime() >= new Date(c.started_at).getTime());
  });
  // Tâches perso (« Pour moi ») : 24 h après la dernière fois sans l'avoir refaite, une notification à cette
  // seule personne ; puis une par 24 h tant que ce n'est pas fait.
  const { data: perso } = await db.from("chores").select("id, title, every_days, prive, last_done_at, created_at, notified_at, step, options").not("prive", "is", null);
  const [{ data: pilules }, { data: membres }, { data: notifs }] = await Promise.all([
    db.from("chores").select("id, prive, turn, options").not("options->pilule", "is", null),
    db.from("members").select("email, name"),
    db.from("reglages").select("cle, valeur").like("cle", "pilnotif:%"),
  ]);
  const persoDues = (perso ?? []).filter((c: { every_days: number; last_done_at: string | null; created_at: string; notified_at: string | null; options: { pilule?: unknown } | null }) => {
    if (c.options?.pilule) return false;
    const depuis = new Date(c.last_done_at ?? c.created_at).getTime(), ecart = (Number(c.every_days) || 1) * DAY;
    if (now < depuis + ecart) return false;
    const n = c.notified_at ? new Date(c.notified_at).getTime() : 0;
    return n < depuis + ecart || now - n >= DAY;
  });
  // Minuteurs de cuisine lancés depuis une recette : une notification à la personne qui l'a lancé.
  const nowIso = new Date(now).toISOString();
  const { data: kt } = await db.from("kitchen_timers").select("id, owner, label, ends_at").is("notified_at", null).lte("ends_at", nowIso);
  await db.from("kitchen_timers").delete().lt("ends_at", new Date(now - DAY).toISOString());
  const pilNotifs = new Map<string, Record<string, { j: string; k: number }>>((notifs ?? []).map((r: { cle: string; valeur: Record<string, { j: string; k: number }> }) => [r.cle.slice(9), r.valeur || {}] as [string, Record<string, { j: string; k: number }>]));
  const pil = pilulesDues((pilules ?? []) as PilChore[], (membres ?? []) as { email: string; name: string }[], pilNotifs, now);
  if (!due.length && !(kt ?? []).length && !persoDues.length && !pil.length) return { sent: 0, items: 0 };
  const keys = await vapid(db);
  webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
  let sent = 0; const dead: string[] = [];
  for (const t of kt ?? []) {
    const payload = JSON.stringify({ title: "Minuteur fini", body: t.label || "C'est prêt", tag: `timer-${t.id}`, url: "./?v=recettes" });
    for (const s of (subs ?? []).filter((s: { email: string }) => s.email === t.owner)) {
      try { await webpush.sendNotification(s.sub, payload, { TTL: 900, urgency: "high" }); sent++; }
      catch (e) { const st = (e as { statusCode?: number }).statusCode; if (st === 404 || st === 410) dead.push(s.endpoint); else console.warn("push", (e as Error).message); }
    }
    await db.from("kitchen_timers").update({ notified_at: nowIso }).eq("id", t.id);
  }
  for (const c of due) {
    const q = SEQ[c.sorte]; const nx = q.steps[Math.min((Number(c.step) || 0) + 1, q.steps.length - 1)];
    const payload = JSON.stringify({ title: `${q.label} : prêt`, body: nx.meta || nx.btn, tag: `maison-seq-${c.id}`, url: "./?v=menage" });
    for (const s of (subs ?? []).filter((s: { email: string }) => !c.turn || s.email === c.turn)) {
      try { await webpush.sendNotification(s.sub, payload, { TTL: 3 * 3600, urgency: "high" }); sent++; }
      catch (e) { const st = (e as { statusCode?: number }).statusCode; if (st === 404 || st === 410) dead.push(s.endpoint); else console.warn("push", (e as Error).message); }
    }
    await db.from("chores").update({ notified_at: new Date().toISOString() }).eq("id", c.id);
  }
  for (const c of persoDues) {
    const payload = JSON.stringify({ title: c.title, body: "Pas encore fait depuis 24 h.", tag: `maison-perso-${c.id}`, url: "./?v=menage" });
    for (const s of (subs ?? []).filter((s: { email: string }) => s.email === c.prive)) {
      try { await webpush.sendNotification(s.sub, payload, { TTL: 6 * 3600 }); sent++; }
      catch (e) { const st = (e as { statusCode?: number }).statusCode; if (st === 404 || st === 410) dead.push(s.endpoint); else console.warn("push", (e as Error).message); }
    }
    await db.from("chores").update({ notified_at: new Date().toISOString() }).eq("id", c.id);
  }
  for (const p of pil) {
    const payload = JSON.stringify({ title: p.title, body: p.body, tag: `maison-pil-${p.c.id}-${p.k}`, url: "./?v=menage" });
    for (const s of (subs ?? []).filter((s: { email: string }) => s.email === p.to)) {
      try { await webpush.sendNotification(s.sub, payload, { TTL: 6 * 3600, urgency: "high" }); sent++; }
      catch (e) { const st = (e as { statusCode?: number }).statusCode; if (st === 404 || st === 410) dead.push(s.endpoint); else console.warn("push", (e as Error).message); }
    }
  }
  // ce qui est parti : par carte et par personne (le jour du comprimé et le nombre de rappels envoyés)
  const parCarte = new Map<string, PilChore>(); for (const p of pil) parCarte.set(p.c.id, p.c);
  for (const [id, c] of parCarte) {
    const ordo = pil.some(p => p.c.id === id && p.ordo);
    if (ordo) await db.from("chores").update({ options: { ...c.options, pilule: { ...c.options.pilule, ordo_vu: true } } }).eq("id", id);
    const v = { ...(pilNotifs.get(id) ?? {}) };
    for (const p of pil.filter(p => p.c.id === id && !p.ordo)) v[p.to] = { j: p.j, k: p.k };
    if (pil.some(p => p.c.id === id && !p.ordo)) await db.from("reglages").upsert({ cle: `pilnotif:${id}`, valeur: v });
  }
  if (dead.length) await db.from("push_subscriptions").delete().in("endpoint", dead);
  return { sent, items: due.length + (kt ?? []).length + persoDues.length + pil.length };
}

// La pilule : le prochain comprimé est dû le lendemain du dernier jour pris (P.jour), à l'heure choisie (heure de
// Zurich). Carte perso (prive) : seule sa personne est rappelée ; carte en commun : les deux, chacun selon ses
// réglages (P.rappels[email] : premier rappel = décalage en minutes après l'heure, -1 = aucun ; relances = 2 h après
// le premier, puis quand il reste 4 h dans la fenêtre de 24 h de la notice, puis à 24 h). Pour un vert, seulement le
// premier. Ce qui est parti est noté dans reglages « pilnotif:<id> » ({ email: { j, k } }), à part de la carte.
// L'ordonnance : un rappel à sa personne, 30 jours avant sa fin.
type PilRap = { premier?: number; relances?: boolean };
type Pil = { heure?: string; jour?: string; n?: number; discret?: boolean; ordo_fin?: string | null; ordo_vu?: boolean; pour?: string; rappels?: Record<string, PilRap> };
type PilChore = { id: string; prive: string | null; turn: string | null; options: { pilule: Pil } & Record<string, unknown> };
function zurichMs(iso: string, hhmm: string): number {
  const [y, m, d] = iso.split("-").map(Number), [h, mi] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(guess)).map(p => [p.type, p.value]));
  const vu = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
  return guess - (vu - guess);
}
function pilulesDues(rows: PilChore[], membres: { email: string; name: string }[], deja: Map<string, Record<string, { j: string; k: number }>>, now: number) {
  const out: { c: PilChore; to: string; title: string; body: string; j: string; k: number; ordo?: boolean }[] = [];
  for (const c of rows) {
    const P = c.options.pilule, elle = P.pour || c.prive || c.turn || "";
    if (!elle) continue;
    const nom = membres.find(m => m.email === elle)?.name || "elle";
    const qui = c.prive ? [elle] : membres.map(m => m.email);
    const d = P.discret !== false;
    if (P.ordo_fin && !P.ordo_vu && /^\d{4}-\d{2}-\d{2}$/.test(P.ordo_fin) && now >= zurichMs(P.ordo_fin, "12:00") - 30 * DAY) {
      const fin = P.ordo_fin.split("-").reverse().join(".");
      out.push({ c, to: elle, j: "", k: 0, ordo: true, title: d ? "Petit rappel" : "Ordonnance de la pilule", body: d ? `Un renouvellement approche (${fin}).` : `Elle se termine le ${fin} : pense à la faire renouveler.` });
    }
    if (!P.heure || !P.jour || !P.n || !/^\d{2}:\d{2}$/.test(P.heure)) continue;
    const [jy, jm, jd] = P.jour.split("-").map(Number);
    const j = new Date(Date.UTC(jy, jm - 1, jd) + DAY).toISOString().slice(0, 10);
    const due = zurichMs(j, P.heure), retard = now - due;
    if (retard < 0) continue;
    const vert = P.n > 24;
    const limite = new Date(due + DAY).toLocaleTimeString("fr-CH", { timeZone: "Europe/Zurich", hour: "2-digit", minute: "2-digit" });
    for (const to of qui) {
      const moi = to === elle;
      const r = { premier: moi ? 0 : 30, relances: true, ...(P.rappels?.[to] ?? {}) };
      if (Number(r.premier) < 0) continue;
      const p0 = Math.max(0, Number(r.premier) || 0) * 60e3;
      const paliers = vert || !r.relances ? [p0] : [p0, p0 + 2 * 3600e3, 20 * 3600e3, DAY].filter((x, i, a) => i === 0 || x > a[i - 1]);
      const passes = paliers.filter(x => retard >= x).length;
      const avant = deja.get(c.id)?.[to];
      const dejaK = avant && avant.j === j ? avant.k : 0;
      if (passes <= dejaK) continue;
      const k = passes - 1, palier = paliers[k];
      const etape = palier === DAY ? 3 : palier === 20 * 3600e3 ? 2 : k === 0 ? 0 : 1;
      const t: [string, string] = d
        ? (moi ? [["Petit rappel", "C'est l'heure."], ["Petit rappel", "Pas encore coché."], ["Petit rappel", `Encore jusqu'à ${limite}.`], ["Petit rappel", "Ouvre l'app quand tu peux."]][etape] as [string, string]
               : [["Petit rappel", `Pour ${nom} : c'est l'heure.`], ["Petit rappel", `${nom} : pas encore coché.`], ["Petit rappel", `${nom} : encore jusqu'à ${limite}.`], ["Petit rappel", `${nom} : ouvrez l'app.`]][etape] as [string, string])
        : vert ? [moi ? "Pilule" : `Pilule de ${nom}`, `Comprimé vert ${P.n}, sans hormone.`]
        : moi ? [["Pilule", `C'est l'heure (comprimé ${P.n}).`], ["Pilule", "Pas encore cochée. Moins de 24 h de retard : la protection reste complète."], ["Pilule : il reste 4 h", `Prends-la avant ${limite} pour rester dans les 24 h.`], ["Pilule : plus de 24 h", "Ouvre l'app : elle te dit quoi faire selon le jour de la plaquette."]][etape] as [string, string]
        : [[`Pilule de ${nom}`, `C'est l'heure (comprimé ${P.n}).`], [`Pilule de ${nom}`, "Pas encore cochée. Moins de 24 h de retard : la protection reste complète."], [`Pilule de ${nom} : il reste 4 h`, `À prendre avant ${limite} pour rester dans les 24 h.`], [`Pilule de ${nom} : plus de 24 h`, "Ouvrez l'app : elle dit quoi faire selon le jour de la plaquette."]][etape] as [string, string];
      out.push({ c, to, title: t[0], body: t[1], j, k: passes });
    }
  }
  return out;
}

// Frais : ce qui périme dans les deux jours (une seule notification par aliment, jamais le jour de l'achat).
async function fresh(db: ReturnType<typeof admin>) {
  const now = new Date(), today = zurich(now), limit = zurich(new Date(now.getTime() + 2 * DAY));
  const { data: rows } = await db.from("pantry").select("id, label, expires_on, bought_at").is("status", null).is("notified_at", null).lte("expires_on", limit);
  const due = (rows ?? []).filter((r: { bought_at: string }) => zurich(new Date(r.bought_at)) !== today)
    .sort((a: { expires_on: string }, b: { expires_on: string }) => a.expires_on.localeCompare(b.expires_on));
  if (!due.length) return { sent: 0, items: 0 };
  const { data: subs } = await db.from("push_subscriptions").select("endpoint, email, sub");
  const keys = await vapid(db);
  webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
  const names = due.slice(0, 5).map((r: { label: string }) => r.label).join(", ") + (due.length > 5 ? "…" : "");
  const title = due.length === 1 ? `${due[0].label} : à finir bientôt` : `${due.length} aliments à finir bientôt`;
  const payload = JSON.stringify({ title, body: `${names}. Des idées de recettes pour les finir dans l'app.`, tag: "maison-frais", url: "./?v=recettes" });
  let sent = 0; const dead: string[] = [];
  for (const s of subs ?? []) {
    try { await webpush.sendNotification(s.sub, payload, { TTL: 6 * 3600 }); sent++; }
    catch (e) { const st = (e as { statusCode?: number }).statusCode; if (st === 404 || st === 410) dead.push(s.endpoint); else console.warn("push", (e as Error).message); }
  }
  if (dead.length) await db.from("push_subscriptions").delete().in("endpoint", dead);
  await db.from("pantry").update({ notified_at: now.toISOString() }).in("id", due.map((r: { id: string }) => r.id));
  return { sent, items: due.length };
}

// Azami : au plus un petit mot par jour et par personne, le soir, seulement pour qui l'a laissée « bavarde »
// (réglage de l'app, recopié dans reglages 'azami:mode:<e-mail>'), et seulement si elle a quelque chose à dire :
// grève, balade, faim, crottes, soif, câlins ; sinon, une fois sur quatre, un mot doux. Ses jauges sont
// recalculées ici comme dans l'app (elles baissent avec le temps depuis la dernière mise à jour).
// Le mot du soir, lu hors de l'app (sur l'écran verrouillé) : des cartes postales, jamais un reproche, et
// jamais les mêmes phrases que dans l'app.
const AZ_MOTS: Record<string, string[]> = {
  greve: ["Grève de principe. Le tarif n'a pas changé : une friandise.", "Toujours en grève. Je négocie en friandises."],
  balade: ["Je suis partie me balader dans l'app. Tu me trouves ?", "Cache-cache ! Je suis quelque part dans l'app…"],
  faim: ["Mon ventre fait des bruits de machine à laver. Tu passes ?", "La gamelle et moi, on t'attend. Surtout moi.", "Hara peko… (j'ai faim) Je dis ça poliment."],
  crottes: ["Il y a des petites choses à ramasser dans l'app. Je ne sais pas qui. Enfin si.", "J'ai laissé des petits cadeaux. La poubelle est juste à côté."],
  soif: ["J'ai la langue comme du papier de verre. Un peu d'eau fraîche ?", "Il reste une casserole sale quelque part ? Sinon de l'eau, ça ira."],
  calins: ["Mon menton n'a vu personne aujourd'hui. Il tient bon.", "Je garde une place sur le canapé. Pour une caresse, par exemple."],
  mot: ["J'ai trouvé un rayon de soleil parfait. Je te garde une place.", "Gustave le pigeon est passé deux fois. Je l'ai regardé très fort.", "La fenêtre, le jardin, un chien. Journée chargée. Je t'attends.", "Okaeri ! (bon retour) Enfin, quand tu rentreras."],
};
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];
async function azami(db: ReturnType<typeof admin>, seul?: string) {
  const now = new Date(), today = zurich(now);
  const [{ data: reg }, { data: members }, { data: subs }] = await Promise.all([
    db.from("reglages").select("cle, valeur").like("cle", "azami:%"),
    db.from("members").select("email"),
    db.from("push_subscriptions").select("endpoint, email, sub"),
  ]);
  const R = Object.fromEntries((reg ?? []).map((r: { cle: string; valeur: unknown }) => [r.cle, r.valeur as Record<string, unknown>]));
  const e = (R["azami:etat"] ?? {}) as Record<string, number | unknown[] | boolean | null | undefined>;
  const h = Math.max(0, (now.getTime() - Number(e.maj || now.getTime())) / 3.6e6);
  const jauge = (k: string, par: number) => Math.max(0, Number(e[k] ?? 70) - par * h);
  const jours = e.soin ? (now.getTime() - Number(e.soin)) / DAY : 0;
  const crottes = Array.isArray(e.crottes) ? e.crottes.length : 0;
  const quoi = e.greve || jours >= 4 ? "greve" : e.balade || jours >= 2 ? "balade" : jauge("faim", 4) < 25 ? "faim" : crottes >= 3 ? "crottes"
    : jauge("soif", 3) < 25 ? "soif" : jauge("calins", 3) < 25 ? "calins" : (seul || Math.random() < .25) ? "mot" : null;
  if (!quoi) return { sent: 0, quoi: null };
  const deja = { ...((R["azami:notifs"] ?? {}) as Record<string, string>) };
  const keys = await vapid(db);
  webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
  let sent = 0; const dead: string[] = [];
  for (const { email } of (members ?? []) as { email: string }[]) {
    if (seul && email !== seul) continue;
    const mode = (R[`azami:mode:${email}`] as { mode?: string } | undefined)?.mode || "bavarde";
    if (!seul && (mode !== "bavarde" || deja[email] === today)) continue;
    const payload = JSON.stringify({ title: "Azami", body: pick(AZ_MOTS[quoi]), tag: "azami", url: "./?v=maison" });
    let ok = false;
    for (const s of (subs ?? []).filter((s: { email: string }) => s.email === email)) {
      try { await webpush.sendNotification(s.sub, payload, { TTL: 4 * 3600 }); sent++; ok = true; }
      catch (err) { const st = (err as { statusCode?: number }).statusCode; if (st === 404 || st === 410) dead.push(s.endpoint); else console.warn("push", (err as Error).message); }
    }
    if (ok && !seul) deja[email] = today;
  }
  if (dead.length) await db.from("push_subscriptions").delete().in("endpoint", dead);
  if (!seul) await db.from("reglages").upsert({ cle: "azami:notifs", valeur: deja });
  return { sent, quoi };
}

// Demande d'aide entre vous deux : notification à l'autre (nouvelle demande) ou à qui l'a demandée (réponse).
async function aide(db: ReturnType<typeof admin>, me: string, id: string) {
  const { data: h } = await db.from("help_requests").select("*").eq("id", id).maybeSingle();
  if (!h || (h.from_email !== me && h.to_email !== me)) return { error: "Demande introuvable." };
  const { data: members } = await db.from("members").select("email, name");
  const name = (e: string) => (members ?? []).find((m: { email: string }) => m.email === e)?.name || e.split("@")[0];
  const ASK: Record<string, string> = { remplacer: "Tu peux le faire à ma place ?", ensemble: "On le fait ensemble ?", souffler: "J'ai besoin de souffler. Tu peux prendre le relais ?" };
  const ANS: Record<string, string> = { pris: "s'en occupe", ensemble: "est d'accord pour le faire ensemble", non: "ne peut pas tout de suite" };
  const to = h.status ? h.from_email : h.to_email;
  // Petit rappel envoyé à l'autre (« tu peux penser à… ») : même circuit, autres mots.
  // Rappel pour une tâche à vous deux (« penser ») : « il faudrait qu'on y pense », pas « tu dois le faire ».
  const rappel = h.ask === "rappel" || h.ask === "penser", penser = h.ask === "penser";
  const ANS_R: Record<string, string> = penser
    ? { pris: "s'en occupe", ensemble: "propose de le faire ensemble", non: "y pensera un peu plus tard" }
    : { pris: "s'en occupe", non: "le fera un peu plus tard" };
  const payload = h.status
    ? JSON.stringify({ title: `${name(h.to_email)} ${(rappel ? ANS_R : ANS)[h.status] || "a répondu"}`, body: h.label || (rappel ? "Ton rappel" : "Ta demande d'aide"), tag: `aide-${h.id}`, url: "./?v=maison" })
    : rappel
      ? JSON.stringify({ title: penser ? `${name(h.from_email)} : il faudrait qu'on y pense` : `${name(h.from_email)} te fait penser à`, body: h.label || "Une chose à faire", tag: `rappel-${h.item_id || h.id}`, url: "./?v=maison" })
      : JSON.stringify({ title: `${name(h.from_email)} demande un coup de main`, body: [h.label, ASK[h.ask] || ASK.remplacer].filter(Boolean).join(" · "), tag: `aide-${h.id}`, url: "./?v=maison" });
  const { data: subs } = await db.from("push_subscriptions").select("endpoint, email, sub").eq("email", to);
  if (!(subs ?? []).length) return { sent: 0 };
  const keys = await vapid(db);
  webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
  let sent = 0; const dead: string[] = [];
  for (const s of subs ?? []) {
    try { await webpush.sendNotification(s.sub, payload, { TTL: 6 * 3600, urgency: "high" }); sent++; }
    catch (e) { const st = (e as { statusCode?: number }).statusCode; if (st === 404 || st === 410) dead.push(s.endpoint); else console.warn("push", (e as Error).message); }
  }
  if (dead.length) await db.from("push_subscriptions").delete().in("endpoint", dead);
  await db.from("help_requests").update({ notified_at: new Date().toISOString() }).eq("id", h.id);
  return { sent };
}

// Une corvée que quelqu'un fait d'habitude (Mariana nourrit Azami, vide sa caisse) : quand l'autre la fait,
// la personne d'habitude reçoit un mot (« Azami a mangé : Yatoni l'a nourrie à 14:15 »), pour ne pas la refaire.
async function annonce(db: ReturnType<typeof admin>, me: string, id: string) {
  const { data: c } = await db.from("chores").select("id, title, turn, options, last_done_at, last_done_by").eq("id", id).maybeSingle();
  const a = c?.options?.annonce;
  if (!c || !a || !c.turn || c.turn === me) return { sent: 0 };
  if (c.last_done_by !== me || !c.last_done_at || Date.now() - new Date(c.last_done_at).getTime() > 10 * 60000) return { sent: 0 };   // seulement juste après l'avoir fait
  const { data: members } = await db.from("members").select("email, name");
  const name = (members ?? []).find((m: { email: string }) => m.email === me)?.name || me.split("@")[0];
  const heure = new Date(c.last_done_at).toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich" });
  const payload = JSON.stringify({ title: a.titre || c.title, body: String(a.texte || "{qui} s'en est occupé à {heure}.").replace("{qui}", name).replace("{heure}", heure), tag: `annonce-${c.id}`, url: "./?v=menage" });
  const { data: subs } = await db.from("push_subscriptions").select("endpoint, email, sub").eq("email", c.turn);
  if (!(subs ?? []).length) return { sent: 0 };
  const keys = await vapid(db);
  webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
  let sent = 0; const dead: string[] = [];
  for (const s of subs ?? []) {
    try { await webpush.sendNotification(s.sub, payload, { TTL: 6 * 3600, urgency: "high" }); sent++; }
    catch (e) { const st = (e as { statusCode?: number }).statusCode; if (st === 404 || st === 410) dead.push(s.endpoint); else console.warn("push", (e as Error).message); }
  }
  if (dead.length) await db.from("push_subscriptions").delete().in("endpoint", dead);
  return { sent };
}

// Les pièces des machines (compte tenu dans l'app) : sous 6 CHF, une notification à vous deux. Tout de suite quand
// on vient de passer sous le seuil, sinon une fois par jour au plus tant qu'on reste en dessous.
const PIECES_SEUIL = 6;
async function pieces(db: ReturnType<typeof admin>) {
  const [{ data: p }, { data: a }] = await Promise.all([
    db.from("reglages").select("valeur").eq("cle", "lessive:pieces").maybeSingle(),
    db.from("reglages").select("valeur").eq("cle", "lessive:pieces_alerte").maybeSingle(),
  ]);
  const solde = Number(p?.valeur?.solde); if (!Number.isFinite(solde) || solde >= PIECES_SEUIL) return { sent: 0 };
  const dernier = a?.valeur ?? {}, at = Number(dernier.at) || 0;
  const franchi = Number.isFinite(Number(dernier.solde)) ? Number(dernier.solde) >= PIECES_SEUIL : true;
  if (!franchi && Date.now() - at < 20 * 3600e3) return { sent: 0, deja: true };
  const f = (n: number) => n.toFixed(2);
  const cycles = Math.floor(solde / 2.5 + 1e-9);
  const reste = solde < 1 ? "plus assez pour une lessive" : cycles ? `de quoi faire ${cycles} lessive${cycles > 1 ? "s" : ""} avec séchage` : solde >= 1.5 ? "assez pour un séchage ou une lessive" : "assez pour une lessive, pas pour un séchage";
  const payload = JSON.stringify({ title: "Pièces pour les machines", body: `Plus que ${f(solde)} CHF : ${reste}. Pensez à en remettre.`, tag: "maison-pieces", url: "./?v=menage" });
  const { data: subs } = await db.from("push_subscriptions").select("endpoint, email, sub");
  const keys = await vapid(db);
  webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
  let sent = 0; const dead: string[] = [];
  for (const s of subs ?? []) {
    try { await webpush.sendNotification(s.sub, payload, { TTL: 12 * 3600 }); sent++; }
    catch (e) { const st = (e as { statusCode?: number }).statusCode; if (st === 404 || st === 410) dead.push(s.endpoint); else console.warn("push", (e as Error).message); }
  }
  if (dead.length) await db.from("push_subscriptions").delete().in("endpoint", dead);
  await db.from("reglages").upsert({ cle: "lessive:pieces_alerte", valeur: { at: Date.now(), solde } });
  return { sent };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const db = admin(); SUIVI = db; await vieuxAbonnements(db).catch(() => {});
  let body: Record<string, unknown> = {};
  if (req.method === "POST") { try { body = await req.json(); } catch { body = {}; } }
  const action = String(body.action ?? new URL(req.url).searchParams.get("action") ?? "run");
  try {
    if (action === "vapid") {
      // Clé publique : réservée aux membres.
      const { data: { user } } = await db.auth.getUser((req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, ""));
      const me = (user?.email ?? "").toLowerCase();
      const { data: member } = me ? await db.from("members").select("email").eq("email", me).maybeSingle() : { data: null };
      if (!member) return json({ error: "Pas membre de la maison." }, 401);
      return json({ publicKey: (await vapid(db)).publicKey });
    }
    if (action === "run") {
      // Heure suisse fixe toute l'année : le planificateur appelle aux deux heures UTC possibles
      // (heure d'été / d'hiver) avec l'heure locale voulue, et seule la bonne passe.
      if (body.heure !== undefined) {
        const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Zurich", hour: "numeric", hour12: false }).format(new Date())) % 24;
        if (h !== Number(body.heure)) return json({ skipped: `il est ${h} h à Zurich` });
      }
      // le petit mot d'Azami part avec la tournée du soir
      const soir = body.heure !== undefined && Number(body.heure) >= 12;
      return json({ ...(await run(db)), frais: await fresh(db), ...(soir ? { azami: await azami(db) } : {}) });
    }
    if (action === "minuteurs") return json(await minuteurs(db));
    if (action === "test") {
      // Notification d'essai, envoyée seulement aux appareils de la personne qui la demande.
      const { data: { user } } = await db.auth.getUser((req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, ""));
      const me = (user?.email ?? "").toLowerCase();
      const { data: member } = me ? await db.from("members").select("email").eq("email", me).maybeSingle() : { data: null };
      if (!member) return json({ error: "Pas membre de la maison." }, 401);
      const { data: subs } = await db.from("push_subscriptions").select("endpoint, sub").eq("email", me);
      if (!(subs ?? []).length) return json({ sent: 0, devices: 0 });
      const keys = await vapid(db);
      webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
      let sent = 0; const dead: string[] = [];
      for (const s of subs ?? []) {
        try { await webpush.sendNotification(s.sub, JSON.stringify({ title: "Maison", body: "Les notifications marchent sur ce téléphone.", tag: "maison-test", url: "./" }), { TTL: 600, urgency: "high" }); sent++; }
        catch (e) { const st = (e as { statusCode?: number }).statusCode; if (st === 404 || st === 410) dead.push(s.endpoint); else console.warn("push", (e as Error).message); }
      }
      if (dead.length) await db.from("push_subscriptions").delete().in("endpoint", dead);
      return json({ sent, devices: (subs ?? []).length, dead: dead.length });
    }
    if (action === "azami_test") {
      // Un mot d'Azami tout de suite, seulement sur les appareils de la personne qui le demande (pour essayer).
      const { data: { user } } = await db.auth.getUser((req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, ""));
      const me = (user?.email ?? "").toLowerCase();
      const { data: member } = me ? await db.from("members").select("email").eq("email", me).maybeSingle() : { data: null };
      if (!member) return json({ error: "Pas membre de la maison." }, 401);
      return json(await azami(db, me));
    }
    if (action === "aide") {
      const { data: { user } } = await db.auth.getUser((req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, ""));
      const me = (user?.email ?? "").toLowerCase();
      const { data: member } = me ? await db.from("members").select("email").eq("email", me).maybeSingle() : { data: null };
      if (!member) return json({ error: "Pas membre de la maison." }, 401);
      return json(await aide(db, me, String(body.id ?? "")));
    }
    if (action === "pieces") {
      const { data: { user } } = await db.auth.getUser((req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, ""));
      const me = (user?.email ?? "").toLowerCase();
      const { data: member } = me ? await db.from("members").select("email").eq("email", me).maybeSingle() : { data: null };
      if (!member) return json({ error: "Pas membre de la maison." }, 401);
      return json(await pieces(db));
    }
    if (action === "annonce") {
      const { data: { user } } = await db.auth.getUser((req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, ""));
      const me = (user?.email ?? "").toLowerCase();
      const { data: member } = me ? await db.from("members").select("email").eq("email", me).maybeSingle() : { data: null };
      if (!member) return json({ error: "Pas membre de la maison." }, 401);
      return json(await annonce(db, me, String(body.id ?? "")));
    }
    return json({ error: "Action inconnue." }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
