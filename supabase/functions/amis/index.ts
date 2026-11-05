// Les amis du ciné. Chaque ami a un lien à vie (révocable) : il ouvre la page ami.html, donne son prénom, joue à
// Cinder sur la collection de la maison, note ce qu'il a vu, et se compare à Yatoni, à Mariana et aux autres amis.
// Un ami ne voit QUE le cinéma : ni le ménage, ni l'argent, ni rien d'autre de la maison.
// Sécurité : jeton aléatoire de 256 bits, la base n'en garde que l'empreinte SHA-256 ; révocation vérifiée à
// chaque appel ; tout ce qui vient de l'extérieur est validé et borné ; aucune table n'est ouverte à anon.
// Côté maison, les actions sont réservées aux membres connectés.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPPRIME_PAR = "yatonirc@gmail.com";
const ORIGINS = ["https://maison.yatoni.ch", "https://inotay.github.io", "http://localhost:8765"];
const cors = (req: Request) => {
  const o = req.headers.get("Origin") ?? "";
  return { "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0], "Vary": "Origin", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
};
const MAX_AMIS = 60;
const VOTES = new Set(["oui", "super", "non", "vu"]);
const RE_JETON = /^[A-Za-z0-9_-]{43}$/, RE_K = /^(movie|tv):([0-9]{1,9})$/, RE_ID = /^[0-9a-f-]{36}$/;
const RE_POSTER = /^https:\/\/image\.tmdb\.org\/t\/p\/w\d{2,3}\/[A-Za-z0-9_.-]{1,80}$/;
const KEY = Deno.env.get("TMDB_KEY") ?? "";

const str = (v: unknown, n: number) => String(v ?? "").replace(/[\u0000-\u001f\u007f-\u009f<>​-‏‪-‮⁠-⁩﻿]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const int = (v: unknown, lo: number, hi: number) => { const x = Number(v); return Number.isInteger(x) && x >= lo && x <= hi ? x : null; };
async function sha(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function jetonNeuf() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
// Les mots de passe des comptes amis : PBKDF2-SHA-256, sel aléatoire, jamais gardés en clair.
const RE_PSEUDO = /^[\p{L}\p{N}._-]{3,24}$/u, RE_EMAIL = /^[^\s@<>]{1,64}@[^\s@<>]{1,80}\.[a-z]{2,24}$/i;
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
async function hacher(mdp: string, sel: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(mdp), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(sel), iterations: 120_000 }, k, 256));
}
function pareil(a: string, b: string) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
// L'e-mail du mot de passe oublié : par Resend, seulement si la clé et l'expéditeur sont réglés dans les secrets
// de la fonction (RESEND_API_KEY, EMAIL_FROM). Sinon, la page propose de demander un nouveau lien.
const MAIL_OK = !!(Deno.env.get("RESEND_API_KEY") && Deno.env.get("EMAIL_FROM"));
async function envoyerMail(to: string, sujet: string, texte: string) {
  if (!MAIL_OK) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: Deno.env.get("EMAIL_FROM"), to: [to], subject: sujet, text: texte }) });
    if (!r.ok) console.warn("mail", r.status, await r.text());
    return r.ok;
  } catch (e) { console.warn("mail", e); return false; }
}
const PAGE = "https://maison.yatoni.ch/ami.html";

// Un frein simple contre les rafales (par adresse, dans cette instance de la fonction) : 120 appels par minute.
const vus = new Map<string, number[]>();
function trop(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "?", t = Date.now();
  const l = (vus.get(ip) ?? []).filter(x => t - x < 60e3); l.push(t); vus.set(ip, l);
  if (vus.size > 5000) vus.clear();
  return l.length > 120;
}

// ── Les goûts ──
// Un avis : une note (vu) ou un vote (envie, très envie, bof).
type Avis = { k: string; title: string; year: number | null; poster: string | null; media: string; vote: string; note: number | null };
const envie = (a?: Avis) => !!a && !a.note && (a.vote === "oui" || a.vote === "super");
const bof = (a?: Avis) => !!a && !a.note && a.vote === "non";
// À quel point deux avis sur le même film vont dans le même sens (0 à 1), et le poids de cette comparaison.
function accord(a: Avis, b: Avis): [number, number] {
  if (a.note && b.note) return [1 - Math.abs(a.note - b.note) / 4.5, 1];
  const [n, o] = a.note ? [a, b] : b.note ? [b, a] : [null, null];
  if (n && o) {
    if (envie(o)) return [n.note! >= 4 ? .85 : n.note! >= 3 ? .5 : .15, .5];
    if (bof(o)) return [n.note! >= 4 ? .1 : n.note! >= 3 ? .4 : .9, .5];
    return [0, 0];
  }
  if (envie(a) && envie(b)) return [1, .6];
  if ((envie(a) && bof(b)) || (bof(a) && envie(b))) return [0, .6];
  if (bof(a) && bof(b)) return [1, .2];
  return [0, 0];
}
const fiche = (a: Avis) => ({ k: a.k, title: a.title, year: a.year, poster: a.poster, media: a.media });
// Ce que deux personnes ont en commun : compatibilité, envies communes, coups de cœur de l'un pas encore vus par
// l'autre, films adorés tous les deux, grands désaccords. Jamais de classement entre les personnes.
function comparer(moi: Map<string, Avis>, lui: Map<string, Avis>) {
  let s = 0, w = 0, n = 0;
  const matches: (ReturnType<typeof fiche> & { super: boolean })[] = [], adores: ReturnType<typeof fiche>[] = [], desaccords: (ReturnType<typeof fiche> & { moi: number; lui: number })[] = [];
  for (const [k, a] of moi) {
    const b = lui.get(k); if (!b) continue;
    const [x, p] = accord(a, b); if (p) { s += x * p; w += p; n++; }
    if (envie(a) && envie(b)) matches.push({ ...fiche(a), super: a.vote === "super" || b.vote === "super" });
    if (a.note && b.note && a.note >= 4.2 && b.note >= 4.2) adores.push(fiche(a));
    if (a.note && b.note && Math.abs(a.note - b.note) >= 2.5) desaccords.push({ ...fiche(a), moi: a.note, lui: b.note });
  }
  // ses coups de cœur que je n'ai pas encore jugés
  const pourMoi = [...lui.values()].filter(b => b.note && b.note >= 4.5 && !moi.has(b.k)).sort((x, y) => y.note! - x.note!).slice(0, 12).map(b => ({ ...fiche(b), note: b.note }));
  return {
    compat: w >= 3 && n >= 5 ? Math.round(100 * s / w) : null, communs: n,
    matches: matches.sort((x, y) => Number(y.super) - Number(x.super)).slice(0, 24),
    adores: adores.slice(0, 12), desaccords: desaccords.sort((x, y) => Math.abs(y.moi - y.lui) - Math.abs(x.moi - x.lui)).slice(0, 5), pourMoi,
    nMatches: matches.length,
  };
}

Deno.serve(async (req) => {
  const CORS = cors(req);
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST seulement." }, 405);
  const raw = await req.text();
  if (raw.length > 20_000) return json({ error: "Trop gros." }, 413);
  let body: Record<string, unknown> = {};
  try { body = JSON.parse(raw); } catch { return json({ error: "Requête illisible." }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Requête illisible." }, 400);
  if (trop(req)) return json({ error: "Doucement : réessaie dans une minute." }, 429);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const action = String(body.action ?? "");

  const membres = async () => { const { data } = await db.from("members").select("email, name"); return (data ?? []) as { email: string; name: string }[]; };
  // qui ne partage pas ses goûts avec les amis (réglage de chacun, partagé par défaut)
  const discrets = async () => { const { data } = await db.from("reglages").select("cle, valeur").like("cle", "amis:partage:%"); return new Set((data ?? []).filter(r => r.valeur?.non).map(r => r.cle.slice(13))); };
  const goutsMembres = async () => {
    const { data } = await db.rpc("ami_gouts_membres");
    const par = new Map<string, Map<string, Avis>>();
    for (const r of (data ?? []) as Record<string, any>[]) {
      const m = par.get(r.email) ?? new Map(); par.set(r.email, m);
      m.set(r.k, { k: r.k, title: r.title, year: r.year, poster: r.poster, media: r.media, vote: r.note ? "vu" : r.vote, note: r.note ? Math.round(Number(r.note) * 10) / 10 : null });
    }
    return par;
  };
  const avisAmis = async (ids?: string[]) => {
    let q = db.from("ami_avis").select("ami_id, k, title, year, poster, media, vote, note");
    if (ids) q = q.in("ami_id", ids);
    const { data } = await q.limit(20000);
    const par = new Map<string, Map<string, Avis>>();
    for (const r of (data ?? []) as Record<string, any>[]) { const m = par.get(r.ami_id) ?? new Map(); par.set(r.ami_id, m); m.set(r.k, { ...r, note: r.note ?? null }); }
    return par;
  };

  // les liens entre amis : demandes (de → a) et liens acceptés (ok_at), vus depuis un ami
  const liensDe = async (id: string) => {
    const { data } = await db.from("ami_liens").select("de, a, ok_at").or(`de.eq.${id},a.eq.${id}`);
    const etat = new Map<string, "lie" | "envoye" | "recu">();
    for (const l of (data ?? []) as { de: string; a: string; ok_at: string | null }[]) {
      const autre = l.de === id ? l.a : l.de;
      etat.set(autre, l.ok_at ? "lie" : l.de === id ? "envoye" : "recu");
    }
    return etat;
  };

  // ── Comptes des amis : se connecter sans le lien, mot de passe oublié (sans être connecté, donc très freinés) ──
  const nouvelleSession = async (id: string) => { const t = jetonNeuf(); await db.from("ami_sessions").insert({ token_hash: await sha(t), ami_id: id }); return t; };
  const trouverCompte = async (qui: string) => {
    const q = str(qui, 120).toLowerCase(); if (!q) return null;
    const col = q.includes("@") ? "email" : "pseudo_n";
    const { data } = await db.from("amis").select("id, nom, revoked_at, pass_hash, pass_sel, email, pseudo_n").ilike(col, q.replace(/[%_\\]/g, "\\$&")).not("pass_hash", "is", null).limit(1).maybeSingle();
    return data;
  };
  if (action === "connexion") {
    const qui = str(body.qui, 120).toLowerCase(), mdp = String(body.mdp ?? "");
    if (!qui || mdp.length < 1 || mdp.length > 200) return json({ error: "Pseudo (ou e-mail) et mot de passe, s’il te plaît." }, 400);
    const depuis = new Date(Date.now() - 15 * 60e3).toISOString();
    const { count } = await db.from("ami_essais").select("at", { count: "exact", head: true }).eq("pseudo_n", qui).gte("at", depuis);
    if ((count ?? 0) >= 8) return json({ error: "Trop d’essais : réessaie dans un quart d’heure." }, 429);
    const a = await trouverCompte(qui);
    const bon = a?.pass_hash && a.pass_sel && pareil(await hacher(mdp, a.pass_sel), a.pass_hash);
    if (!a || !bon) { await db.from("ami_essais").insert({ pseudo_n: qui }); return json({ error: "Pseudo ou mot de passe incorrect." }, 401); }
    if (a.revoked_at) return json({ error: "Ce compte a été coupé.", fini: true }, 410);
    return json({ session: await nouvelleSession(a.id) });
  }
  if (action === "oubli") {
    if (!MAIL_OK) return json({ ok: false, sansMail: true });
    const a = await trouverCompte(String(body.qui ?? ""));
    if (a?.email && !a.revoked_at) {
      const { count } = await db.from("ami_resets").select("ami_id", { count: "exact", head: true }).eq("ami_id", a.id).gte("created_at", new Date(Date.now() - 3600e3).toISOString());
      if ((count ?? 0) < 3) {
        const t = jetonNeuf();
        await db.from("ami_resets").insert({ token_hash: await sha(t), ami_id: a.id, expire_at: new Date(Date.now() + 30 * 60e3).toISOString() });
        await envoyerMail(a.email, "Ciné Azami : nouveau mot de passe", `Bonjour ${a.nom || ""},\n\nPour choisir un nouveau mot de passe, ouvre ce lien (valable 30 minutes) :\n${PAGE}#reset=${t}\n\nSi tu n’as rien demandé, ignore ce message.`);
      }
    }
    return json({ ok: true });   // toujours la même réponse : on ne dit pas si le compte existe
  }
  if (action === "reinit") {
    const t = String(body.token ?? ""), mdp = String(body.mdp ?? "");
    if (!RE_JETON.test(t)) return json({ error: "Lien invalide." }, 400);
    if (mdp.length < 8 || mdp.length > 200) return json({ error: "Au moins 8 caractères." }, 400);
    const { data: r } = await db.from("ami_resets").select("ami_id, expire_at, used_at").eq("token_hash", await sha(t)).maybeSingle();
    if (!r || r.used_at || new Date(r.expire_at).getTime() < Date.now()) return json({ error: "Ce lien a expiré. Redemande-en un." }, 410);
    const sel = jetonNeuf();
    await db.from("amis").update({ pass_hash: await hacher(mdp, sel), pass_sel: sel }).eq("id", r.ami_id);
    await db.from("ami_resets").update({ used_at: new Date().toISOString() }).eq("token_hash", await sha(t));
    await db.from("ami_sessions").delete().eq("ami_id", r.ami_id);   // les autres appareils devront se reconnecter
    return json({ session: await nouvelleSession(r.ami_id) });
  }

  // ── Côté ami : avec son lien ou sa session ──
  if (["moi", "profil", "deck", "avis", "mes", "chercher", "comparer", "liens", "lier", "delier", "compte", "deconnexion", "inviter"].includes(action)) {
    const jeton = String(body.jeton ?? ""), session = String(body.session ?? "");
    let amiId: string | null = null;
    if (RE_JETON.test(session)) {
      const { data: se } = await db.from("ami_sessions").select("ami_id, vu_at").eq("token_hash", await sha(session)).maybeSingle();
      if (!se) return json({ error: "Session terminée : reconnecte-toi.", fini: true, session: true }, 401);
      amiId = se.ami_id;
      if (Date.now() - new Date(se.vu_at).getTime() > 3600e3) await db.from("ami_sessions").update({ vu_at: new Date().toISOString() }).eq("token_hash", await sha(session));
    } else if (!RE_JETON.test(jeton)) return json({ error: "Lien invalide." }, 404);
    const { data: ami } = amiId
      ? await db.from("amis").select("id, nom, revoked_at, tuto_at, pseudo, email, pass_hash").eq("id", amiId).maybeSingle()
      : await db.from("amis").select("id, nom, revoked_at, tuto_at, pseudo, email, pass_hash").eq("jeton_hash", await sha(jeton)).maybeSingle();
    if (!ami) return json({ error: "Lien invalide.", fini: true }, 404);
    if (ami.revoked_at) return json({ error: "Ce lien a été coupé.", fini: true }, 410);

    if (action === "compte") {
      const pseudo = str(body.pseudo, 24), email = str(body.email, 140).toLowerCase(), mdp = String(body.mdp ?? "");
      if (!RE_PSEUDO.test(pseudo)) return json({ error: "Pseudo : 3 à 24 lettres ou chiffres (. _ - permis), sans espace." }, 400);
      if (!RE_EMAIL.test(email)) return json({ error: "Il faut une adresse e-mail valable (pour retrouver ton mot de passe)." }, 400);
      if (mdp && (mdp.length < 8 || mdp.length > 200)) return json({ error: "Mot de passe : au moins 8 caractères." }, 400);
      if (!mdp && !ami.pass_hash) return json({ error: "Choisis un mot de passe." }, 400);
      const patch: Record<string, unknown> = { pseudo, pseudo_n: pseudo.toLowerCase(), email, compte_at: new Date().toISOString() };
      if (mdp) { const sel = jetonNeuf(); patch.pass_sel = sel; patch.pass_hash = await hacher(mdp, sel); }
      const { error } = await db.from("amis").update(patch).eq("id", ami.id);
      if (error) return json({ error: /pseudo/.test(error.message) ? "Ce pseudo est déjà pris." : /email/.test(error.message) ? "Cette adresse sert déjà pour un autre compte." : "Le compte n’a pas pu être créé." }, 409);
      return json({ ok: true, session: amiId ? null : await nouvelleSession(ami.id) });
    }
    if (action === "deconnexion") {
      if (amiId) await db.from("ami_sessions").delete().eq("token_hash", await sha(session));
      return json({ ok: true });
    }
    if (action === "inviter") {
      const nom = str(body.nom, 24);
      const [{ count: miens }, { count: tous }] = await Promise.all([
        db.from("amis").select("id", { count: "exact", head: true }).eq("invite_par", ami.id).is("revoked_at", null),
        db.from("amis").select("id", { count: "exact", head: true }).is("revoked_at", null)]);
      if ((miens ?? 0) >= 10) return json({ error: "Tu as déjà invité dix personnes." }, 429);
      if ((tous ?? 0) >= MAX_AMIS) return json({ error: "Le ciné est plein pour le moment." }, 429);
      const j = jetonNeuf();
      const { data: neuf, error } = await db.from("amis").insert({ jeton_hash: await sha(j), nom: nom || null, invite_par: ami.id }).select("id").single();
      if (error || !neuf) { console.error(error); return json({ error: "Le lien n’a pas pu être créé." }, 500); }
      await db.from("ami_liens").insert({ de: ami.id, a: neuf.id, ok_at: new Date().toISOString() });   // celui qui invite et l'invité sont liés d'office
      return json({ jeton: j, lien: `${PAGE}#${j}` });
    }

    if (action === "moi") {
      await db.from("amis").update({ vu_at: new Date().toISOString() }).eq("id", ami.id);
      const [ms, { data: autres }, { count }] = await Promise.all([membres(), db.from("amis").select("nom").is("revoked_at", null).neq("id", ami.id).not("nom", "is", null), db.from("ami_avis").select("k", { count: "exact", head: true }).eq("ami_id", ami.id)]);
      const { count: demandes } = await db.from("ami_liens").select("de", { count: "exact", head: true }).eq("a", ami.id).is("ok_at", null);
      return json({ nom: ami.nom ?? "", tuto: !!ami.tuto_at, hotes: ms.map(m => m.name), amis: (autres ?? []).map(a => a.nom), nAvis: count ?? 0, demandes: demandes ?? 0, compte: ami.pass_hash ? { pseudo: ami.pseudo, email: ami.email } : null, mail: MAIL_OK });
    }
    if (action === "profil") {
      const patch: Record<string, unknown> = {};
      if (body.nom !== undefined) { const nom = str(body.nom, 24); if (!nom) return json({ error: "Il faut un prénom." }, 400); patch.nom = nom; }
      if (body.tuto === true) patch.tuto_at = new Date().toISOString();
      if (Object.keys(patch).length) await db.from("amis").update(patch).eq("id", ami.id);
      return json({ ok: true });
    }
    if (action === "deck") {
      const { data, error } = await db.rpc("ami_pioche", { p_ami: ami.id, p_n: int(body.n, 1, 40) ?? 25 });
      if (error) { console.error(error); return json({ error: "La pioche ne répond pas." }, 500); }
      const g = await goutsMembres(), cachés = await discrets(), ms = await membres();
      // sur la carte : qui de la maison en a envie ou l'a adoré (si la personne partage ses goûts)
      return json({ films: (data ?? []).map((f: Record<string, any>) => ({ k: f.k, title: f.title, year: f.year, poster: f.poster, media: f.media, runtime: f.runtime, genres: (f.genres ?? []).slice(0, 3), dir: f.director, overview: f.overview,
        hotes: ms.filter(m => !cachés.has(m.email)).map(m => { const a = g.get(m.email)?.get(f.k); return a ? { nom: m.name, envie: envie(a), note: a.note } : null; }).filter(Boolean) })) });
    }
    if (action === "avis") {
      const k = String(body.k ?? ""), m = k.match(RE_K); if (!m) return json({ error: "Film inconnu." }, 400);
      const vote = String(body.vote ?? "");
      if (vote === "rien") { await db.from("ami_avis").delete().eq("ami_id", ami.id).eq("k", k); return json({ ok: true }); }
      if (!VOTES.has(vote)) return json({ error: "Avis inconnu." }, 400);
      const note = body.note == null ? null : Number(body.note);
      if (note !== null && !(note >= 0.5 && note <= 5)) return json({ error: "Note entre 0,5 et 5." }, 400);
      const media = m[1], tmdb_id = Number(m[2]);
      // la fiche du film : celle de la maison si elle existe, sinon ce que la recherche a renvoyé (vérifié)
      const { data: f } = await db.from("films").select("title, year, poster").eq("media", media).eq("tmdb_id", tmdb_id).limit(1).maybeSingle();
      const title = f?.title ?? str(body.title, 120), year = f?.year ?? int(body.year, 1880, 2100), poster = f?.poster ?? (typeof body.poster === "string" && RE_POSTER.test(body.poster) ? body.poster : null);
      if (!title) return json({ error: "Film inconnu." }, 400);
      const { error } = await db.from("ami_avis").upsert({ ami_id: ami.id, k, media, tmdb_id, title, year, poster, vote: note ? "vu" : vote, note: note ? Math.round(note * 10) / 10 : null, at: new Date().toISOString() });
      if (error) { console.error(error); return json({ error: "L’avis n’est pas passé." }, 500); }
      return json({ ok: true });
    }
    if (action === "mes") {
      const { data } = await db.from("ami_avis").select("k, title, year, poster, media, vote, note, at").eq("ami_id", ami.id).order("at", { ascending: false }).limit(3000);
      return json({ avis: data ?? [] });
    }
    if (action === "chercher") {
      const q = str(body.q, 80); if (q.length < 2 || !KEY) return json({ films: [] });
      const u = new URL("https://api.themoviedb.org/3/search/multi");
      for (const [a, b] of Object.entries({ query: q, language: "fr-FR", include_adult: "false" })) u.searchParams.set(a, b);
      const headers: Record<string, string> = { accept: "application/json" };
      if (KEY.length > 40) headers.Authorization = `Bearer ${KEY}`; else u.searchParams.set("api_key", KEY);
      try {
        const r = await fetch(u, { headers }); if (!r.ok) throw new Error(`TMDB ${r.status}`);
        const d = await r.json();
        const films = (d.results ?? []).filter((x: Record<string, any>) => x.media_type === "movie" || x.media_type === "tv").slice(0, 14).map((x: Record<string, any>) => ({
          k: `${x.media_type}:${x.id}`, media: x.media_type, title: str(x.title || x.name, 120), year: Number(String(x.release_date || x.first_air_date || "").slice(0, 4)) || null,
          poster: x.poster_path ? `https://image.tmdb.org/t/p/w342${x.poster_path}` : null, overview: str(x.overview, 320),
        }));
        return json({ films });
      } catch (e) { console.warn(e); return json({ error: "La recherche ne répond pas." }, 502); }
    }
    if (action === "liens") {
      const [{ data: tousAmis }, liens] = await Promise.all([db.from("amis").select("id, nom").is("revoked_at", null).not("nom", "is", null).neq("id", ami.id).order("nom"), liensDe(ami.id)]);
      return json({ amis: (tousAmis ?? []).map(a => ({ id: a.id, nom: a.nom, etat: liens.get(a.id) ?? "rien" })) });
    }
    if (action === "lier" || action === "delier") {
      const id = String(body.id ?? ""); if (!RE_ID.test(id) || id === ami.id) return json({ error: "Ami inconnu." }, 400);
      const { data: autre } = await db.from("amis").select("id").eq("id", id).is("revoked_at", null).not("nom", "is", null).maybeSingle();
      if (!autre) return json({ error: "Ami inconnu." }, 404);
      if (action === "delier") {   // refuser, annuler sa demande ou défaire le lien : plus rien entre les deux
        await db.from("ami_liens").delete().or(`and(de.eq.${ami.id},a.eq.${id}),and(de.eq.${id},a.eq.${ami.id})`);
        return json({ ok: true, etat: "rien" });
      }
      const { data: recue } = await db.from("ami_liens").select("de, ok_at").eq("de", id).eq("a", ami.id).maybeSingle();
      if (recue) { if (!recue.ok_at) await db.from("ami_liens").update({ ok_at: new Date().toISOString() }).eq("de", id).eq("a", ami.id); return json({ ok: true, etat: "lie" }); }
      const { count } = await db.from("ami_liens").select("a", { count: "exact", head: true }).eq("de", ami.id).is("ok_at", null);
      if ((count ?? 0) >= 30) return json({ error: "Beaucoup de demandes en attente déjà." }, 429);
      const { error } = await db.from("ami_liens").upsert({ de: ami.id, a: id }, { onConflict: "de,a", ignoreDuplicates: true });
      if (error) { console.error(error); return json({ error: "La demande n’est pas partie." }, 500); }
      return json({ ok: true, etat: "envoye" });
    }
    if (action === "comparer") {
      const [g, cachés, ms, { data: tousAmis }, liens] = await Promise.all([goutsMembres(), discrets(), membres(), db.from("amis").select("id, nom").is("revoked_at", null).not("nom", "is", null), liensDe(ami.id)]);
      // les autres amis : seulement ceux avec qui le lien est accepté des deux côtés
      const autres = (tousAmis ?? []).filter(a => a.id !== ami.id && liens.get(a.id) === "lie");
      const tous = await avisAmis(autres.map(a => a.id).concat(ami.id));
      const moi = tous.get(ami.id) ?? new Map<string, Avis>();
      const personnes = [
        ...ms.filter(m => !cachés.has(m.email)).map(m => ({ nom: m.name, hote: true, ...comparer(moi, g.get(m.email) ?? new Map()) })),
        ...autres.map(a => ({ nom: a.nom, hote: false, ...comparer(moi, tous.get(a.id) ?? new Map()) })),
      ];
      // tous ensemble : ce que moi ET chaque hôte (qui partage) voulons voir
      const hotes = ms.filter(m => !cachés.has(m.email)).map(m => g.get(m.email) ?? new Map<string, Avis>());
      const ensemble = hotes.length ? [...moi.values()].filter(a => envie(a) && hotes.every(h => envie(h.get(a.k)))).slice(0, 24).map(fiche) : [];
      return json({ personnes, ensemble, cachés: ms.filter(m => cachés.has(m.email)).map(m => m.name), nAvis: moi.size });
    }
  }

  // ── Côté maison : réservé aux membres connectés ──
  const { data: { user } } = await db.auth.getUser((req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, ""));
  const me = (user?.email ?? "").toLowerCase();
  const ms = me ? await membres() : [];
  if (!me || !ms.some(m => m.email === me)) return json({ error: "Pas membre de la maison." }, 401);

  if (action === "creer") {
    const { count } = await db.from("amis").select("id", { count: "exact", head: true }).is("revoked_at", null);
    if ((count ?? 0) >= MAX_AMIS) return json({ error: "Il y a déjà beaucoup d’amis : coupe d’abord un ancien lien." }, 429);
    const jeton = jetonNeuf(), nom = str(body.nom, 24) || null;
    const { data, error } = await db.from("amis").insert({ jeton_hash: await sha(jeton), nom, cree_par: me }).select("id").single();
    if (error) { console.error(error); return json({ error: "Le lien n’a pas pu être créé." }, 500); }
    return json({ id: data.id, jeton });
  }
  if (action === "renouveler" || action === "couper") {
    const id = String(body.id ?? ""); if (!RE_ID.test(id)) return json({ error: "Ami inconnu." }, 400);
    if (action === "couper") { await db.from("amis").update({ revoked_at: new Date().toISOString() }).eq("id", id); return json({ ok: true }); }
    const jeton = jetonNeuf();
    const { error } = await db.from("amis").update({ jeton_hash: await sha(jeton), revoked_at: null }).eq("id", id);
    if (error) return json({ error: "Pas réussi." }, 500);
    return json({ id, jeton });
  }
  // supprimer un ami pour de bon (lui et tous ses avis) : seul Yatoni peut le faire
  if (action === "supprimer") {
    if (me !== SUPPRIME_PAR) return json({ error: "Seul Yatoni peut supprimer un ami." }, 403);
    const id = String(body.id ?? ""); if (!RE_ID.test(id)) return json({ error: "Ami inconnu." }, 400);
    const { error } = await db.from("amis").delete().eq("id", id);
    if (error) { console.error(error); return json({ error: "Pas réussi." }, 500); }
    return json({ ok: true });
  }
  if (action === "partage") {
    await db.from("reglages").upsert({ cle: `amis:partage:${me}`, valeur: { non: body.on === false } });
    return json({ ok: true });
  }
  // le profil complet d'un ami : tous ses avis, du plus récent au plus ancien
  if (action === "profil_ami") {
    const id = String(body.id ?? ""); if (!RE_ID.test(id)) return json({ error: "Ami inconnu." }, 400);
    const { data } = await db.from("ami_avis").select("k, title, year, poster, media, vote, note, at").eq("ami_id", id).order("at", { ascending: false }).limit(3000);
    return json({ avis: data ?? [] });
  }
  if (action === "liste") {
    const [{ data: amis }, g, cachés] = await Promise.all([db.from("amis").select("id, nom, created_at, vu_at, revoked_at, cree_par, invite_par, pass_hash").order("created_at", { ascending: false }), goutsMembres(), discrets()]);
    const actifs = (amis ?? []).filter(a => !a.revoked_at);
    const av = await avisAmis(actifs.map(a => a.id));
    const moi = g.get(me) ?? new Map<string, Avis>(), autre = ms.find(m => m.email !== me);
    // pour ne pas me proposer un film que j'ai déjà écarté : mes « bof » sur les coups de cœur des amis
    const candidats = new Set<string>(); for (const m of av.values()) for (const a of m.values()) if (a.note && a.note >= 4.5 && !moi.has(a.k)) candidats.add(a.k);
    const ecartes = new Set<string>();
    if (candidats.size) {
      const ids = [...candidats].slice(0, 400).map(k => Number(k.split(":")[1]));
      const { data } = await db.from("films").select("media, tmdb_id, votes").in("tmdb_id", ids);
      for (const f of (data ?? []) as Record<string, any>[]) if (f.votes?.[me]) ecartes.add(`${f.media}:${f.tmdb_id}`);
    }
    const liste = (amis ?? []).map(a => {
      const sien = av.get(a.id) ?? new Map<string, Avis>();
      if (a.revoked_at) return { id: a.id, nom: a.nom, coupe: true, created_at: a.created_at };
      const c = comparer(moi, sien);
      c.pourMoi = c.pourMoi.filter(f => !ecartes.has(f.k));
      const avecAutre = autre && !cachés.has(autre.email) ? comparer(g.get(autre.email) ?? new Map(), sien) : null;
      const deux = autre ? g.get(autre.email) ?? new Map<string, Avis>() : null;
      const aTrois = deux ? [...sien.values()].filter(x => envie(x) && envie(moi.get(x.k)) && envie(deux.get(x.k))).slice(0, 12).map(fiche) : [];
      return { id: a.id, nom: a.nom, created_at: a.created_at, vu_at: a.vu_at, par: ms.find(m => m.email === a.cree_par)?.name ?? (amis ?? []).find(x => x.id === a.invite_par)?.nom ?? "", compte: !!a.pass_hash, nAvis: sien.size, avecMoi: c, avecAutre: avecAutre ? { nom: autre!.name, compat: avecAutre.compat, nMatches: avecAutre.nMatches } : null, aTrois };
    });
    return json({ amis: liste, partage: !cachés.has(me), peutSupprimer: me === SUPPRIME_PAR });
  }
  return json({ error: "Action inconnue." }, 400);
});
