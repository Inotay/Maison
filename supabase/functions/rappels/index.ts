// Rappels : prévient par notification (Web Push) quand quelque chose est vraiment en retard.
// Lancée par le planificateur deux fois par jour (action « run »), et appelée par l'app pour
// obtenir la clé publique VAPID (action « vapid »). Les clés sont générées ici au premier appel
// et gardées dans app_secrets, une table sans règle d'accès pour les comptes de l'app.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

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
    db.from("chores").select("id, title, every_days, turn, last_done_at, sorte, notified_at"),
    db.from("tasks").select("id, title, assignee, due_on, done, notified_at"),
    db.from("push_subscriptions").select("endpoint, email, sub"),
  ]);
  const emails = (members ?? []).map((m: { email: string }) => m.email);
  const items: Item[] = [];
  for (const c of chores ?? []) {
    if (c.notified_at && zurich(new Date(c.notified_at)) === today) continue;
    // Jamais faite : on compte depuis sa création n'est pas possible ici, on la considère due aujourd'hui (pas de rappel avant 2 jours de retard réel).
    const due = c.last_done_at ? new Date(new Date(c.last_done_at).getTime() + Number(c.every_days) * DAY) : null;
    const late = due ? daysBetween(zurich(due), today) : 0;
    if (c.sorte) { if (late >= 2 && possibleNow(c.sorte, now)) items.push({ kind: "chore", id: c.id, title: c.title, who: null, late, sorte: c.sorte }); }
    else if (late >= 2) items.push({ kind: "chore", id: c.id, title: c.title, who: c.turn ?? null, late });
  }
  for (const t of tasks ?? []) {
    if (t.done || !t.due_on) continue;
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
    const title = mine.length === 1 ? "Une chose attend" : `${mine.length} choses attendent`;
    const payload = JSON.stringify({ title, body: list, tag: "maison-rappel", url: mine[0].kind === "task" ? "./?v=maison" : "./?v=menage" });
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
  lessive: { label: "Lessive", steps: [{ key: "lavage", minutes: 60, btn: "Lancer" }, { key: "sechage", minutes: 80, btn: "Au séchage", meta: "Lavage fini : mettre au séchage" }, { key: "ranger", btn: "Rangée", meta: "Sec : plier et ranger" }] },
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
  // Minuteurs de cuisine lancés depuis une recette : une notification à la personne qui l'a lancé.
  const nowIso = new Date(now).toISOString();
  const { data: kt } = await db.from("kitchen_timers").select("id, owner, label, ends_at").is("notified_at", null).lte("ends_at", nowIso);
  await db.from("kitchen_timers").delete().lt("ends_at", new Date(now - DAY).toISOString());
  if (!due.length && !(kt ?? []).length) return { sent: 0, items: 0 };
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
      try { await webpush.sendNotification(s.sub, payload, { TTL: 3600 }); sent++; }
      catch (e) { const st = (e as { statusCode?: number }).statusCode; if (st === 404 || st === 410) dead.push(s.endpoint); else console.warn("push", (e as Error).message); }
    }
    await db.from("chores").update({ notified_at: new Date().toISOString() }).eq("id", c.id);
  }
  if (dead.length) await db.from("push_subscriptions").delete().in("endpoint", dead);
  return { sent, items: due.length + (kt ?? []).length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const db = admin();
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
    if (action === "run") return json(await run(db));
    if (action === "minuteurs") return json(await minuteurs(db));
    return json({ error: "Action inconnue." }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
