// Les amis du ciné. Chaque ami a un lien à vie (révocable) : il ouvre la page ami.html, donne son prénom, joue à
// Cinder sur la collection de la maison, note ce qu'il a vu, et se compare à Yatoni, à Mariana et aux autres amis.
// Un ami ne voit QUE le cinéma : ni le ménage, ni l'argent, ni rien d'autre de la maison.
// Sécurité : jeton aléatoire de 256 bits, la base n'en garde que l'empreinte SHA-256 ; révocation vérifiée à
// chaque appel ; tout ce qui vient de l'extérieur est validé et borné ; aucune table n'est ouverte à anon.
// Côté maison, les actions sont réservées aux membres connectés.
import { createClient } from "npm:@supabase/supabase-js@2";

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

  // ── Côté ami : seulement avec un lien valide ──
  if (["moi", "profil", "deck", "avis", "mes", "chercher", "comparer"].includes(action)) {
    const jeton = String(body.jeton ?? "");
    if (!RE_JETON.test(jeton)) return json({ error: "Lien invalide." }, 404);
    const { data: ami } = await db.from("amis").select("id, nom, revoked_at, tuto_at").eq("jeton_hash", await sha(jeton)).maybeSingle();
    if (!ami) return json({ error: "Lien invalide.", fini: true }, 404);
    if (ami.revoked_at) return json({ error: "Ce lien a été coupé.", fini: true }, 410);

    if (action === "moi") {
      await db.from("amis").update({ vu_at: new Date().toISOString() }).eq("id", ami.id);
      const [ms, { data: autres }, { count }] = await Promise.all([membres(), db.from("amis").select("nom").is("revoked_at", null).neq("id", ami.id).not("nom", "is", null), db.from("ami_avis").select("k", { count: "exact", head: true }).eq("ami_id", ami.id)]);
      return json({ nom: ami.nom ?? "", tuto: !!ami.tuto_at, hotes: ms.map(m => m.name), amis: (autres ?? []).map(a => a.nom), nAvis: count ?? 0 });
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
    if (action === "comparer") {
      const [g, cachés, ms, { data: autres }] = await Promise.all([goutsMembres(), discrets(), membres(), db.from("amis").select("id, nom").is("revoked_at", null).not("nom", "is", null)]);
      const tous = await avisAmis((autres ?? []).map(a => a.id).concat(ami.id));
      const moi = tous.get(ami.id) ?? new Map<string, Avis>();
      const personnes = [
        ...ms.filter(m => !cachés.has(m.email)).map(m => ({ nom: m.name, hote: true, ...comparer(moi, g.get(m.email) ?? new Map()) })),
        ...(autres ?? []).filter(a => a.id !== ami.id).map(a => ({ nom: a.nom, hote: false, ...comparer(moi, tous.get(a.id) ?? new Map()) })),
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
  if (action === "partage") {
    await db.from("reglages").upsert({ cle: `amis:partage:${me}`, valeur: { non: body.on === false } });
    return json({ ok: true });
  }
  if (action === "liste") {
    const [{ data: amis }, g, cachés] = await Promise.all([db.from("amis").select("id, nom, created_at, vu_at, revoked_at, cree_par").order("created_at", { ascending: false }), goutsMembres(), discrets()]);
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
      return { id: a.id, nom: a.nom, created_at: a.created_at, vu_at: a.vu_at, par: ms.find(m => m.email === a.cree_par)?.name ?? "", nAvis: sien.size, avecMoi: c, avecAutre: avecAutre ? { nom: autre!.name, compat: avecAutre.compat, nMatches: avecAutre.nMatches } : null, aTrois };
    });
    return json({ amis: liste, partage: !cachés.has(me) });
  }
  return json({ error: "Action inconnue." }, 400);
});
