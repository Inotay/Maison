// Films et séries à deux : cherche les infos sur Internet à la place du téléphone.
// Avec une clé TMDB (secret TMDB_KEY) : affiches, synopsis en français, bande-annonce, où regarder en
// Suisse, et propositions pour le match à deux. Sans clé : Wikipédia (films) et TVmaze (séries).
// Réservé aux membres de la maison. La clé reste ici, jamais dans l'app.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const KEY = Deno.env.get("TMDB_KEY") ?? "";
const IMG = "https://image.tmdb.org/t/p/";
type Item = { tmdb_id: number | null; media: "movie" | "tv"; title: string; year: number | null; poster: string | null; overview: string; source: string; pop?: number };

async function tmdb(path: string, params: Record<string, string> = {}) {
  const u = new URL("https://api.themoviedb.org/3" + path);
  for (const [k, v] of Object.entries({ language: "fr-FR", ...params })) u.searchParams.set(k, v);
  const headers: Record<string, string> = { accept: "application/json" };
  if (KEY.length > 40) headers.Authorization = `Bearer ${KEY}`; else u.searchParams.set("api_key", KEY);
  const r = await fetch(u, { headers });
  if (!r.ok) throw new Error(`TMDB ${r.status}`);
  return await r.json();
}
const yearOf = (d?: string) => d && /^\d{4}/.test(d) ? Number(d.slice(0, 4)) : null;
const fromTmdb = (x: Record<string, unknown>, media?: string): Item | null => {
  const m = (media || x.media_type) as string;
  if (m !== "movie" && m !== "tv") return null;
  return { tmdb_id: x.id as number, media: m, title: String(x.title || x.name || ""), year: yearOf((x.release_date || x.first_air_date) as string),
    poster: x.poster_path ? IMG + "w342" + x.poster_path : null, overview: String(x.overview || ""), source: "tmdb", pop: Number(x.popularity || 0) };
};

async function details(id: number, media: "movie" | "tv") {
  const d = await tmdb(`/${media}/${id}`, { append_to_response: "videos,watch/providers,credits" });
  let vids = (d.videos?.results ?? []) as Record<string, string>[];
  if (!vids.length) { try { vids = (await tmdb(`/${media}/${id}/videos`, { language: "en-US" })).results ?? []; } catch { /* rien */ } }
  const tr = vids.find(v => v.site === "YouTube" && v.type === "Trailer") || vids.find(v => v.site === "YouTube");
  const ch = d["watch/providers"]?.results?.CH ?? {};
  const providers = [...(ch.flatrate ?? []).map((p: Record<string, string>) => ({ name: p.provider_name, logo: p.logo_path ? IMG + "w92" + p.logo_path : null, kind: "abo" })),
    ...(ch.free ?? []).map((p: Record<string, string>) => ({ name: p.provider_name, logo: p.logo_path ? IMG + "w92" + p.logo_path : null, kind: "gratuit" })),
    ...(ch.rent ?? []).slice(0, 3).map((p: Record<string, string>) => ({ name: p.provider_name, logo: p.logo_path ? IMG + "w92" + p.logo_path : null, kind: "location" }))];
  const director = media === "movie" ? (d.credits?.crew ?? []).filter((c: Record<string, string>) => c.job === "Director").map((c: Record<string, string>) => c.name).slice(0, 2).join(", ")
    : (d.created_by ?? []).map((c: Record<string, string>) => c.name).slice(0, 2).join(", ");
  return {
    ...fromTmdb(d, media), runtime: d.runtime || (d.episode_run_time ?? [])[0] || null, seasons: d.number_of_seasons ?? null,
    episodes: media === "tv" ? (d.seasons ?? []).filter((s: Record<string, number>) => s.season_number > 0).map((s: Record<string, number>) => s.episode_count) : null,
    genres: (d.genres ?? []).map((g: Record<string, string>) => g.name), director: director || null, providers,
    trailer: tr ? `https://www.youtube.com/watch?v=${tr.key}` : null, link: `https://www.themoviedb.org/${media}/${id}`,
  };
}

// Sans clé TMDB : séries sur TVmaze, films sur Wikipédia (résumé en français, affiche depuis la page anglaise).
const strip = (s: string) => s.replace(/<[^>]+>/g, "").trim();
async function wikiSummary(lang: string, title: string) {
  const r = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, { headers: { "user-agent": "Maison/1.0 (app de maison)" } });
  return r.ok ? await r.json() : null;
}
async function freeSearch(q: string): Promise<Item[]> {
  const out: Item[] = [];
  try {
    const tv = await (await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`)).json();
    for (const { show: s } of (tv ?? []).slice(0, 4)) out.push({ tmdb_id: null, media: "tv", title: s.name, year: yearOf(s.premiered), poster: s.image?.medium ?? null, overview: strip(s.summary ?? ""), source: "tvmaze" });
  } catch { /* rien */ }
  try {
    const w = await (await fetch(`https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q + " film")}&srlimit=4&format=json`, { headers: { "user-agent": "Maison/1.0" } })).json();
    for (const h of w.query?.search ?? []) {
      const s = await wikiSummary("fr", h.title); if (!s || !/film|série/i.test(s.description ?? s.extract ?? "")) continue;
      let poster = s.thumbnail?.source ?? null;
      if (!poster) { const en = await wikiSummary("en", h.title.replace(/ \(film.*\)$/, "")); poster = en?.thumbnail?.source ?? null; }
      out.push({ tmdb_id: null, media: /série/i.test(s.description ?? "") ? "tv" : "movie", title: s.title.replace(/ \((film|série).*\)$/, ""), year: yearOf((s.description ?? "").match(/\d{4}/)?.[0]), poster, overview: s.extract ?? "", source: "wikipedia" });
    }
  } catch { /* rien */ }
  return out;
}

// Un lien collé : IMDb (tt…), TMDB, Letterboxd ; sinon le texte sert de recherche.
async function fromLink(text: string): Promise<Item[] | null> {
  const imdb = text.match(/\btt\d{6,9}\b/)?.[0];
  if (imdb && KEY) { const f = await tmdb(`/find/${imdb}`, { external_source: "imdb_id" }); return [...(f.movie_results ?? []).map((x: Record<string, unknown>) => fromTmdb(x, "movie")), ...(f.tv_results ?? []).map((x: Record<string, unknown>) => fromTmdb(x, "tv"))].filter(Boolean) as Item[]; }
  const t = text.match(/themoviedb\.org\/(movie|tv)\/(\d+)/);
  if (t && KEY) return [await details(Number(t[2]), t[1] as "movie" | "tv")] as Item[];
  const lb = text.match(/letterboxd\.com\/film\/([a-z0-9-]+)/i);
  if (lb) return await search(lb[1].replace(/-\d{4}$/, "").replace(/-/g, " "));
  return null;
}
async function search(q: string): Promise<Item[]> {
  if (!KEY) return await freeSearch(q);
  const r = await tmdb("/search/multi", { query: q, include_adult: "false", region: "CH" });
  return (r.results ?? []).map((x: Record<string, unknown>) => fromTmdb(x)).filter(Boolean).slice(0, 10) as Item[];
}

// Propositions pour le match à deux : ce qui ressemble à ce que vous avez aimé, et les tendances.
async function deck(seeds: { tmdb_id: number; media: string }[], exclude: Set<string>, mood: string) {
  if (!KEY) return [];
  const lists: Item[][] = [];
  for (const s of seeds.slice(0, 4)) { try { lists.push(((await tmdb(`/${s.media}/${s.tmdb_id}/recommendations`)).results ?? []).map((x: Record<string, unknown>) => fromTmdb(x, s.media)).filter(Boolean)); } catch { /* rien */ } }
  const GENRE: Record<string, string> = { leger: "35", frisson: "53,27", romance: "10749", animation: "16", docu: "99", sf: "878,14" };
  if (mood && GENRE[mood]) {
    for (const media of ["movie", "tv"]) { try { lists.push(((await tmdb(`/discover/${media}`, { with_genres: GENRE[mood].split(",")[0], sort_by: "popularity.desc", "vote_count.gte": "300", page: String(1 + Math.floor(Math.random() * 3)) })).results ?? []).map((x: Record<string, unknown>) => fromTmdb(x, media)).filter(Boolean)); } catch { /* rien */ } }
  }
  try { lists.push(((await tmdb("/trending/all/week")).results ?? []).map((x: Record<string, unknown>) => fromTmdb(x)).filter(Boolean)); } catch { /* rien */ }
  try { lists.push(((await tmdb("/movie/top_rated", { page: String(1 + Math.floor(Math.random() * 5)) })).results ?? []).map((x: Record<string, unknown>) => fromTmdb(x, "movie")).filter(Boolean)); } catch { /* rien */ }
  // on mélange les sources une par une, sans doublons ni ce qui est déjà dans votre liste
  const out: Item[] = [], seen = new Set<string>();
  for (let i = 0; out.length < 30 && lists.some(l => l.length > i); i++) for (const l of lists) {
    const x = l[i]; if (!x || !x.poster || !x.overview) continue;
    const k = `${x.media}:${x.tmdb_id}`; if (seen.has(k) || exclude.has(k)) continue;
    seen.add(k); out.push(x);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: { user } } = await db.auth.getUser((req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, ""));
  const me = (user?.email ?? "").toLowerCase();
  const { data: member } = me ? await db.from("members").select("email").eq("email", me).maybeSingle() : { data: null };
  if (!member) return json({ error: "Pas membre de la maison." }, 401);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { body = {}; }
  try {
    const action = String(body.action ?? "");
    if (action === "status") return json({ tmdb: !!KEY });
    if (action === "search") {
      const q = String(body.q ?? "").trim(); if (!q) return json({ results: [] });
      const viaLink = /https?:\/\/|\btt\d{6,}/.test(q) ? await fromLink(q) : null;
      return json({ results: viaLink ?? await search(q), tmdb: !!KEY });
    }
    if (action === "details") {
      if (!KEY || !body.tmdb_id) return json({ error: "Pas de détails sans TMDB." }, 400);
      return json(await details(Number(body.tmdb_id), body.media === "tv" ? "tv" : "movie"));
    }
    if (action === "deck") {
      const seeds = (body.seeds ?? []) as { tmdb_id: number; media: string }[];
      const exclude = new Set(((body.exclude ?? []) as string[]).map(String));
      return json({ results: await deck(seeds, exclude, String(body.mood ?? "")), tmdb: !!KEY });
    }
    return json({ error: "Action inconnue." }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
