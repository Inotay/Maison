// Soirée ciné avec des invités. Les membres créent un lien secret (valable 24 h, révocable) ; les invités, sans
// compte, ouvrent la page soiree.html, donnent un prénom et votent sur la sélection de films de la soirée.
// Un invité ne voit QUE cette sélection et les votes de la soirée : rien d'autre de la maison.
// Sécurité : jeton aléatoire de 256 bits ; la base n'en garde que l'empreinte SHA-256 (le lien reste sur le
// téléphone qui l'a créé) ; expiration et révocation vérifiées
// à chaque appel ; tout ce qui vient de l'extérieur est validé et borné ; aucune table n'est ouverte à anon.
import { createClient } from "npm:@supabase/supabase-js@2";

const ORIGINS = ["https://inotay.github.io"];
const cors = (req: Request) => {
  const o = req.headers.get("Origin") ?? "";
  return { "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0], "Vary": "Origin", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
};
const DUREE = 24 * 3600e3, MAX_FILMS = 60, MAX_INVITES = 20;
const VOTES = new Set(["oui", "super", "non", "vu"]);
const RE_JETON = /^[A-Za-z0-9_-]{43}$/, RE_INVITE = /^[a-f0-9]{32}$/, RE_K = /^[a-z0-9:_.-]{1,40}$/i;
const RE_POSTER = /^https:\/\/image\.tmdb\.org\/t\/p\/w\d{2,3}\/[A-Za-z0-9_.-]{1,80}$/;

// (caractères de contrôle, invisibles et d'inversion de sens retirés : un prénom ne peut pas se déguiser)
const str = (v: unknown, n: number) => String(v ?? "").replace(/[\u0000-\u001f\u007f-\u009f<>\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const num = (v: unknown, lo: number, hi: number) => { const x = Number(v); return Number.isFinite(x) && x >= lo && x <= hi ? Math.round(x * 10) / 10 : null; };
async function sha(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join("");
}
// Un frein simple contre les rafales (par adresse, dans cette instance de la fonction) : 90 appels par minute.
const vus = new Map<string, number[]>();
function trop(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "?", t = Date.now();
  const l = (vus.get(ip) ?? []).filter(x => t - x < 60e3); l.push(t); vus.set(ip, l);
  if (vus.size > 5000) vus.clear();
  return l.length > 90;
}
function jetonNeuf() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
// Une fiche de film réduite au strict nécessaire, chaque champ vérifié.
function filmPropre(x: Record<string, unknown>) {
  const k = String(x?.k ?? ""); if (!RE_K.test(k)) return null;
  const title = str(x.title, 120); if (!title) return null;
  const poster = typeof x.poster === "string" && RE_POSTER.test(x.poster) ? x.poster : null;
  return {
    k, title, poster, media: x.media === "tv" ? "tv" : "movie",
    year: num(x.year, 1880, 2100), runtime: num(x.runtime, 1, 600), note: num(x.note, 0, 10),
    overview: str(x.overview, 600), dir: str(x.dir, 80),
    genres: (Array.isArray(x.genres) ? x.genres : []).slice(0, 3).map(g => str(g, 30)).filter(Boolean),
    liste: x.liste === true,
  };
}

Deno.serve(async (req) => {
  const CORS = cors(req);
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST seulement." }, 405);
  const raw = await req.text();
  if (raw.length > 200_000) return json({ error: "Trop gros." }, 413);
  let body: Record<string, unknown> = {};
  try { body = JSON.parse(raw); } catch { return json({ error: "Requête illisible." }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Requête illisible." }, 400);
  if (trop(req)) return json({ error: "Doucement : réessaie dans une minute." }, 429);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const action = String(body.action ?? "");
  const now = Date.now();
  const noms = async () => { const { data } = await db.from("members").select("email, name"); return (data ?? []) as { email: string; name: string }[]; };

  // ── Côté invité : seulement avec un jeton valide ──
  if (action === "voir" || action === "voter") {
    const jeton = String(body.jeton ?? "");
    if (!RE_JETON.test(jeton)) return json({ error: "Lien invalide." }, 404);
    const { data: s } = await db.from("soirees").select("id, expires_at, revoked_at, pool").eq("jeton_hash", await sha(jeton)).maybeSingle();
    if (!s) return json({ error: "Lien invalide." }, 404);
    if (s.revoked_at || Date.parse(s.expires_at) < now) return json({ error: "Cette soirée est terminée.", fini: true }, 410);
    const invite = String(body.invite ?? "");
    if (!RE_INVITE.test(invite)) return json({ error: "Téléphone non reconnu." }, 400);
    const pool = (s.pool ?? []) as ReturnType<typeof filmPropre>[];
    if (action === "voter") {
      const nom = str(body.nom, 24), film = String(body.film ?? ""), vote = String(body.vote ?? "");
      if (!nom) return json({ error: "Il faut un prénom." }, 400);
      if (!pool.some(f => f?.k === film)) return json({ error: "Film inconnu." }, 400);
      const { data: deja } = await db.from("soiree_votes").select("invite").eq("soiree_id", s.id);
      const gens = new Set((deja ?? []).map(r => r.invite));
      if (!gens.has(invite) && gens.size >= MAX_INVITES) return json({ error: "Il y a déjà beaucoup d’invités pour cette soirée." }, 429);
      if (vote === "rien") await db.from("soiree_votes").delete().eq("soiree_id", s.id).eq("invite", invite).eq("film", film);
      else if (VOTES.has(vote)) {
        const { error } = await db.from("soiree_votes").upsert({ soiree_id: s.id, invite, nom, film, vote, at: new Date().toISOString() });
        if (error) return json({ error: "Le vote n’est pas passé." }, 500);
      } else return json({ error: "Vote inconnu." }, 400);
      await db.from("soiree_votes").update({ nom }).eq("soiree_id", s.id).eq("invite", invite).neq("nom", nom);
    }
    const { data: votes } = await db.from("soiree_votes").select("invite, nom, film, vote").eq("soiree_id", s.id);
    const hotes = (await noms()).map(m => m.name);
    return json({ ...resultats(pool, votes ?? [], invite), hotes, expires_at: s.expires_at });
  }

  // ── Côté maison : réservé aux membres connectés ──
  const { data: { user } } = await db.auth.getUser((req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, ""));
  const me = (user?.email ?? "").toLowerCase();
  const membres = me ? await noms() : [];
  if (!me || !membres.some(m => m.email === me)) return json({ error: "Pas membre de la maison." }, 401);

  if (action === "creer") {
    const list = (Array.isArray(body.pool) ? body.pool : []).slice(0, MAX_FILMS).map(x => filmPropre(x as Record<string, unknown>)).filter(Boolean);
    const seen = new Set<string>(), pool = list.filter(f => f && !seen.has(f.k) && seen.add(f.k));
    if (pool.length < 2) return json({ error: "Il faut au moins deux films." }, 400);
    // une seule soirée ouverte à la fois ; les vieilles soirées sont effacées au bout d'une semaine
    await db.from("soirees").update({ revoked_at: new Date().toISOString() }).is("revoked_at", null).gt("expires_at", new Date().toISOString());
    await db.from("soirees").delete().lt("expires_at", new Date(now - 7 * 864e5).toISOString());
    const jeton = jetonNeuf();
    const { data, error } = await db.from("soirees").insert({ jeton: "", jeton_hash: await sha(jeton), created_by: me, expires_at: new Date(now + DUREE).toISOString(), pool }).select("id, expires_at").single();
    if (error) { console.error(error); return json({ error: "La soirée n’a pas pu être créée." }, 500); }
    return json({ id: data.id, jeton, expires_at: data.expires_at });
  }
  if (action === "ouverte") {
    await db.from("soirees").delete().lt("expires_at", new Date(now - 7 * 864e5).toISOString());
    const { data: s } = await db.from("soirees").select("id, created_by, expires_at, pool").is("revoked_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!s) return json({ soiree: null });
    const { data: votes } = await db.from("soiree_votes").select("invite, nom, film, vote").eq("soiree_id", s.id);
    const r = resultats(s.pool ?? [], votes ?? [], "");
    return json({ soiree: { id: s.id, expires_at: s.expires_at, par: membres.find(m => m.email === s.created_by)?.name ?? "", parMoi: s.created_by === me, n: s.pool?.length ?? 0, classement: r.classement, gens: r.gens } });
  }
  if (action === "couper") {
    const id = String(body.id ?? "");
    if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: "Soirée inconnue." }, 400);
    await db.from("soirees").update({ revoked_at: new Date().toISOString() }).eq("id", id).is("revoked_at", null);
    return json({ ok: true });
  }
  return json({ error: "Action inconnue." }, 400);
});

// Les votes de la soirée : par film, qui en a envie ; le classement de la soirée ; et mes votes (jamais les
// identifiants des autres téléphones).
type V = { invite: string; nom: string; film: string; vote: string };
function resultats(pool: any[], votes: V[], invite: string) {
  const par = new Map<string, V[]>();
  for (const v of votes) { const l = par.get(v.film) ?? []; l.push(v); par.set(v.film, l); }
  const gens = [...new Set(votes.map(v => v.invite))].map(i => votes.find(v => v.invite === i)!.nom);
  const films = pool.filter(Boolean).map(f => {
    const l = par.get(f.k) ?? [];
    const envie = l.filter(v => v.vote === "oui" || v.vote === "super");
    return { ...f, score: l.reduce((a, v) => a + (v.vote === "super" ? 2 : v.vote === "oui" ? 1 : v.vote === "non" ? -.5 : 0), 0),
      envies: envie.map(v => ({ nom: v.nom, super: v.vote === "super" })), bof: l.filter(v => v.vote === "non").length, vu: l.filter(v => v.vote === "vu").map(v => v.nom) };
  });
  const classement = films.filter(f => f.envies.length).sort((a, b) => b.score - a.score || b.envies.length - a.envies.length).slice(0, 10)
    .map(f => ({ k: f.k, title: f.title, poster: f.poster, year: f.year, score: f.score, envies: f.envies, bof: f.bof }));
  const mes = Object.fromEntries(votes.filter(v => v.invite === invite).map(v => [v.film, v.vote]));
  return { films, classement, gens, mes, moi: votes.find(v => v.invite === invite)?.nom ?? "" };
}
