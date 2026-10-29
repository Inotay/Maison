// Films et séries à deux : cherche les infos sur Internet à la place du téléphone.
// Avec une clé TMDB (secret TMDB_KEY) : affiches, synopsis en français, bande-annonce, où regarder en
// Suisse, et propositions pour le match à deux. Sans clé : Wikipédia (films) et TVmaze (séries).
// Réservé aux membres de la maison. La clé reste ici, jamais dans l'app.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const KEY = Deno.env.get("TMDB_KEY") ?? "";
const IMG = "https://image.tmdb.org/t/p/";
type Item = { tmdb_id: number | null; media: "movie" | "tv"; title: string; original?: string; year: number | null; poster: string | null; overview: string; source: string; pop?: number; dispo?: boolean; cinema?: boolean };

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
  return { tmdb_id: x.id as number, media: m, title: String(x.title || x.name || ""), original: String(x.original_title || x.original_name || ""), year: yearOf((x.release_date || x.first_air_date) as string),
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
    cinema: media === "movie" ? (await nowPlaying()).has(id) : false,
  };
}

// Ce qui passe au cinéma en Suisse en ce moment (TMDB), gardé 3 h.
let npCache: { at: number; ids: Set<number>; items: Item[] } | null = null;
async function nowPlaying() {
  if (!KEY) return new Set<number>();
  if (npCache && Date.now() - npCache.at < 3 * 3600e3) return npCache.ids;
  const items: Item[] = [];
  for (const page of ["1", "2"]) { try { items.push(...((await tmdb("/movie/now_playing", { region: "CH", page })).results ?? []).map((x: Record<string, unknown>) => ({ ...fromTmdb(x, "movie")!, cinema: true }))); } catch { /* rien */ } }
  npCache = { at: Date.now(), ids: new Set(items.map(i => i.tmdb_id!)), items };
  return npCache.ids;
}
// Vos abonnements → les identifiants TMDB des plateformes en Suisse (par le nom, plus solide que des numéros).
const SUB_RE: Record<string, RegExp> = { netflix: /netflix/i, disney: /disney/i, apple: /apple tv/i, hbo: /hbo|^max$/i, crunchyroll: /crunchyroll/i, prime: /amazon prime|prime video/i, mubi: /mubi/i, play: /play suisse/i, sky: /sky/i, canal: /canal/i };
let provCache: { at: number; list: { id: number; name: string }[] } | null = null;
async function providerIds(subs: string[]) {
  if (!provCache || Date.now() - provCache.at > 24 * 3600e3) {
    const list: { id: number; name: string }[] = [];
    for (const m of ["movie", "tv"]) { try { for (const p of (await tmdb(`/watch/providers/${m}`, { watch_region: "CH" })).results ?? []) list.push({ id: p.provider_id, name: p.provider_name }); } catch { /* rien */ } }
    provCache = { at: Date.now(), list };
  }
  const ids = new Set<number>();
  for (const s of subs) { const re = SUB_RE[s]; if (re) for (const p of provCache.list) if (re.test(p.name) && !/channel|amazon channel/i.test(p.name)) ids.add(p.id); }
  return [...ids];
}

// Les salles de Lausanne : Pathé (Flon, Les Galeries) par search.ch (séances du jour), la Cinémathèque
// par son programme (prochaines séances). Gardé 3 h. Données publiques.
type Salle = { title: string; where: string; url: string; year?: number; when?: string; next?: string };
let sallesCache: { at: number; list: Salle[] } | null = null;
const untag = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#0?39;|&rsquo;|&apos;/g, "’").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const SEANCE = /\b(Lu|Ma|Me|Je|Ve|Sa|Di)\.? (\d{1,2}) (janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre) (\d{1,2}:\d{2})/gi;
function zurichToday() { return new Date(new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Zurich" }).format(new Date()) + "T00:00:00Z"); }
async function salles(): Promise<Salle[]> {
  if (sallesCache && Date.now() - sallesCache.at < 3 * 3600e3) return sallesCache.list;
  const out: Salle[] = [], seen = new Set<string>();
  const UA = { "user-agent": "Mozilla/5.0 (Maison, app de maison)", "accept-language": "fr-CH,fr;q=0.9" };
  for (const [slug, where] of [["Pathe-Flon", "Pathé Flon"], ["Pathe-Les-Galeries", "Pathé Les Galeries"]]) {
    try {
      const html = await (await fetch(`https://search.ch/cine/Lausanne/${slug}`, { headers: UA })).text();
      const ms = [...html.matchAll(/<h1 class="kino-show-title"><a href="\/cine\/([^"\/]+)\/Lausanne\/[^"]*">([\s\S]*?)<\/a><\/h1>/g)];
      ms.forEach((m, i) => {
        const t = untag(m[2]); if (!t) return;
        const block = html.slice((m.index ?? 0) + m[0].length, ms[i + 1]?.index ?? html.length);
        const seances: [string, string][] = [];
        for (const row of block.split(/<tr>/).slice(1)) {
          const v = row.match(/kino-spoken">([^<]*)</)?.[1]?.trim();
          for (const h of row.matchAll(/<span[^>]*>(\d{1,2}:\d{2})<\/span>/g)) seances.push([h[1], v === "O" ? "VO" : v === "F" ? "VF" : v || ""]);
        }
        seances.sort((x, y) => x[0].localeCompare(y[0]));
        const k = where + "|" + t.toLowerCase(); if (seen.has(k)) return; seen.add(k);
        out.push({ title: t, where, url: `https://search.ch/cine/${m[1]}/Lausanne/${slug}`, when: seances.length ? "Aujourd’hui " + seances.map(([h, v]) => v ? `${h} ${v}` : h).join(", ") : "Cette semaine" });
      });
    } catch (e) { console.error("search.ch", slug, e); }
  }
  const today = zurichToday();
  for (let page = 1; page <= 8; page++) {
    try {
      const html = await (await fetch(`https://live.cinematheque.ch/?interval=all&page=${page}`, { headers: UA })).text();
      const ms = [...html.matchAll(/<h3[^>]*>\s*<a[^>]+href="(?:https:\/\/live\.cinematheque\.ch)?\/films\/([a-z0-9-]+)"[^>]*>([\s\S]*?)<\/a>/g)];
      let added = 0;
      ms.forEach((m, i) => {
        const t = untag(m[2]); if (!t || t.length > 120) return;
        const after = untag(html.slice((m.index ?? 0) + m[0].length, ms[i + 1]?.index ?? html.length)).slice(0, 2500);
        // prochaine séance à venir (l'année n'est pas écrite : on la devine)
        let next: Date | null = null, label = "";
        for (const d of after.matchAll(SEANCE)) {
          const mo = MOIS.indexOf(d[3].toLowerCase()); let dt = new Date(Date.UTC(today.getUTCFullYear(), mo, Number(d[2])));
          if (dt.getTime() < today.getTime() - 1) { if (today.getTime() - dt.getTime() > 180 * 864e5) dt = new Date(Date.UTC(today.getUTCFullYear() + 1, mo, Number(d[2]))); else continue; }
          if (!next || dt < next) { next = dt; label = `${d[1]} ${d[2]} ${d[3]} à ${d[4]}`; }
        }
        if (!next) return;
        const k = "cs|" + t.toLowerCase(); if (seen.has(k)) return; seen.add(k); added++;
        const year = Number(after.match(/·\s*((?:19|20)\d{2})\s*·/)?.[1]) || undefined;
        out.push({ title: t, where: "Cinémathèque", url: `https://live.cinematheque.ch/films/${m[1]}`, year, when: label, next: next.toISOString().slice(0, 10) });
      });
      if (!added) break;
    } catch (e) { console.error("cinematheque", page, e); break; }
  }
  console.log("salles", out.filter(s => s.where !== "Cinémathèque").length, out.filter(s => s.where === "Cinémathèque").length);
  if (out.length) sallesCache = { at: Date.now(), list: out };
  return out;
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

// Retrouver la bonne fiche d'un titre écrit à la main (titre + année + film ou série), puis ses détails.
const nrm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").replace(/^(le|la|les|l|the|a|an|un|une) /, "").trim();
async function resolveOne(it: { title: string; media: string; year?: number }) {
  const media = it.media === "tv" ? "tv" : "movie";
  const yk = media === "movie" ? "year" : "first_air_date_year";
  const q = it.title.replace(/\s*\((19|20)\d{2}\)\s*$/, "");
  let res: Record<string, unknown>[] = [];
  if (it.year) res = (await tmdb(`/search/${media}`, { query: q, [yk]: String(it.year) })).results ?? [];
  if (!res.length) res = (await tmdb(`/search/${media}`, { query: q })).results ?? [];
  if (!res.length) return null;
  const n = nrm(q), yr = (x: Record<string, unknown>) => yearOf((x.release_date || x.first_air_date) as string);
  const score = (x: Record<string, unknown>) => (nrm(String(x.title || x.name || "")) === n || nrm(String(x.original_title || x.original_name || "")) === n ? 4 : 0)
    + (it.year && yr(x) && Math.abs(yr(x)! - it.year) <= 1 ? 3 : 0) + (x.poster_path ? 2 : 0) + Math.min(2, Number(x.popularity || 0) / 20);
  const best = [...res].sort((a, b) => score(b) - score(a))[0];
  return await details(best.id as number, media);
}
async function pool<T, R>(list: T[], n: number, fn: (x: T) => Promise<R>) {
  const out: R[] = new Array(list.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => { while (i < list.length) { const k = i++; try { out[k] = await fn(list[k]); } catch { out[k] = null as R; } } }));
  return out;
}

// Propositions pour le match à deux : ce qui ressemble à ce que vous avez aimé, et les tendances.
async function deck(seeds: { tmdb_id: number; media: string }[], exclude: Set<string>, mood: string, subs: string[]) {
  if (!KEY) return [];
  const lists: Item[][] = [];
  if (mood === "cine") { await nowPlaying(); lists.push(npCache?.items ?? []); }
  // ce qui est inclus dans vos abonnements passe en premier
  const pids = subs.length ? await providerIds(subs) : [];
  if (pids.length && mood !== "cine") {
    const GEN: Record<string, string> = { leger: "35", frisson: "53", romance: "10749", animation: "16", docu: "99", sf: "878" };
    for (const media of ["movie", "tv"]) { try { lists.push(((await tmdb(`/discover/${media}`, { watch_region: "CH", with_watch_providers: pids.join("|"), with_watch_monetization_types: "flatrate|free", sort_by: "popularity.desc", "vote_count.gte": "200", ...(GEN[mood] ? { with_genres: GEN[mood] } : {}), page: String(1 + Math.floor(Math.random() * 4)) })).results ?? []).map((x: Record<string, unknown>) => ({ ...fromTmdb(x, media)!, dispo: true }))); } catch { /* rien */ } }
  }
  for (const s of seeds.slice(0, 4)) { try { lists.push(((await tmdb(`/${s.media}/${s.tmdb_id}/recommendations`)).results ?? []).map((x: Record<string, unknown>) => fromTmdb(x, s.media)).filter(Boolean)); } catch { /* rien */ } }
  const GENRE: Record<string, string> = { leger: "35", frisson: "53,27", romance: "10749", animation: "16", docu: "99", sf: "878,14" };
  if (mood === "cine") { /* seulement l'affiche du moment, plus les idées */ } else if (mood && GENRE[mood]) {
    for (const media of ["movie", "tv"]) { try { lists.push(((await tmdb(`/discover/${media}`, { with_genres: GENRE[mood].split(",")[0], sort_by: "popularity.desc", "vote_count.gte": "300", page: String(1 + Math.floor(Math.random() * 3)) })).results ?? []).map((x: Record<string, unknown>) => fromTmdb(x, media)).filter(Boolean)); } catch { /* rien */ } }
  }
  if (mood !== "cine") try { lists.push(((await tmdb("/trending/all/week")).results ?? []).map((x: Record<string, unknown>) => fromTmdb(x)).filter(Boolean)); } catch { /* rien */ }
  if (mood !== "cine") try { lists.push(((await tmdb("/movie/top_rated", { page: String(1 + Math.floor(Math.random() * 5)) })).results ?? []).map((x: Record<string, unknown>) => fromTmdb(x, "movie")).filter(Boolean)); } catch { /* rien */ }
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
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { body = {}; }
  // Les séances des salles de Lausanne sont publiques : pas besoin d'être membre pour les lire.
  if (body.action === "salles") { try { return json({ salles: await salles() }); } catch (e) { return json({ error: (e as Error).message }, 500); } }
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: { user } } = await db.auth.getUser((req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, ""));
  const me = (user?.email ?? "").toLowerCase();
  const { data: member } = me ? await db.from("members").select("email").eq("email", me).maybeSingle() : { data: null };
  if (!member) return json({ error: "Pas membre de la maison." }, 401);
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
    if (action === "resolve") {
      if (!KEY) return json({ results: [] });
      const items = ((body.items ?? []) as { title: string; media: string; year?: number }[]).slice(0, 40);
      return json({ results: await pool(items, 6, resolveOne) });
    }
    if (action === "deck") {
      const seeds = (body.seeds ?? []) as { tmdb_id: number; media: string }[];
      const exclude = new Set(((body.exclude ?? []) as string[]).map(String));
      const np = KEY ? await nowPlaying() : new Set<number>();
      const res = (await deck(seeds, exclude, String(body.mood ?? ""), ((body.subs ?? []) as string[]).map(String))).map(x => ({ ...x, cinema: x.cinema || (x.media === "movie" && np.has(x.tmdb_id!)) }));
      return json({ results: res, tmdb: !!KEY });
    }
    return json({ error: "Action inconnue." }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
