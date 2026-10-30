// Films et séries à deux : cherche les infos sur Internet à la place du téléphone.
// Avec une clé TMDB (secret TMDB_KEY) : affiches, synopsis en français, bande-annonce, où regarder en
// Suisse, et propositions pour le match à deux. Sans clé : Wikipédia (films) et TVmaze (séries).
// Réservé aux membres de la maison. La clé reste ici, jamais dans l'app.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const KEY = Deno.env.get("TMDB_KEY") ?? "";
const MDB = Deno.env.get("MDBLIST_KEY") ?? "";
const IMG = "https://image.tmdb.org/t/p/";
type Item = { reco?: number; tmdb_id: number | null; media: "movie" | "tv"; title: string; original?: string; year: number | null; poster: string | null; overview: string; source: string; pop?: number; dispo?: boolean; cinema?: boolean; gids?: number[]; lang?: string; note?: number };

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
    poster: x.poster_path ? IMG + "w342" + x.poster_path : null, overview: String(x.overview || ""), source: "tmdb", pop: Number(x.popularity || 0),
    gids: ((x.genre_ids as number[]) ?? ((x.genres as { id: number }[]) ?? []).map(g => g.id)), lang: String(x.original_language || ""), note: Math.round(Number(x.vote_average || 0) * 10) / 10 };
};

// Ce qui fait le goût d'un film : qui l'a fait, qui joue dedans, ses thèmes, sa durée, son succès, son public.
type Person = { id: number; name: string };
const CERT: Record<string, string> = { G: "tous", PG: "tous", "PG-13": "12", R: "16", "NC-17": "18", U: "tous", "TV-Y": "tous", "TV-Y7": "tous", "TV-G": "tous", "TV-PG": "tous", "TV-14": "12", "TV-MA": "16", "0": "tous", "6": "tous" };
function traitsOf(d: Record<string, any>, media: "movie" | "tv") {
  const crew = (d.credits?.crew ?? []) as Record<string, any>[];
  const dir: Person[] = media === "movie" ? crew.filter(c => c.job === "Director").slice(0, 2).map(c => ({ id: c.id, name: c.name }))
    : (d.created_by ?? []).slice(0, 2).map((c: Record<string, any>) => ({ id: c.id, name: c.name }));
  const cast: Person[] = ((d.credits?.cast ?? []) as Record<string, any>[]).slice(0, 5).map(c => ({ id: c.id, name: c.name }));
  const job = (re: RegExp, n: number) => { const seen = new Set<number>(); return crew.filter(c => re.test(c.job) && !seen.has(c.id) && seen.add(c.id)).slice(0, n).map(c => ({ id: c.id, name: c.name })); };
  const wri = job(/^(Screenplay|Writer|Novel|Story)$/, 2), comp = job(/^(Original Music Composer|Music)$/, 1), dop = job(/^Director of Photography$/, 1);
  const kw: Person[] = ((d.keywords?.keywords ?? d.keywords?.results ?? []) as Record<string, any>[]).slice(0, 15).map(k => ({ id: k.id, name: k.name }));
  const pays: string[] = (d.origin_country ?? (d.production_countries ?? []).map((c: Record<string, string>) => c.iso_3166_1) ?? []).slice(0, 2);
  const rt = d.runtime || (d.episode_run_time ?? [])[0] || null;
  const rev = Number(d.revenue || 0), vc = Number(d.vote_count || 0);
  const bo = rev > 300e6 ? "blockbuster" : rev > 60e6 ? "succes" : vc > 8000 ? "culte" : vc < 1200 ? "confidentiel" : "public";
  let cert = "";
  if (media === "movie") {
    const rd = (d.release_dates?.results ?? []) as Record<string, any>[];
    for (const c of ["CH", "FR", "US"]) { const r = rd.find(x => x.iso_3166_1 === c)?.release_dates?.find((x: Record<string, string>) => x.certification)?.certification; if (r) { cert = CERT[r] ?? (/\d+/.test(r) ? String(Math.min(18, Number(r.match(/\d+/)![0]))) : ""); break; } }
  } else {
    const cr = (d.content_ratings?.results ?? []) as Record<string, any>[];
    for (const c of ["CH", "FR", "US"]) { const r = cr.find(x => x.iso_3166_1 === c)?.rating; if (r) { cert = CERT[r] ?? (/\d+/.test(r) ? String(Math.min(18, Number(r.match(/\d+/)![0]))) : ""); break; } }
  }
  if (cert && /^\d+$/.test(cert)) cert = Number(cert) <= 10 ? "tous" : Number(cert) <= 14 ? "12" : Number(cert) <= 16 ? "16" : "18";
  // le studio (Ghibli, A24, Toho…) et la saga (Harry Potter, Alien…) : deux indices de plus sur le goût
  const co: Person[] = ((d.production_companies ?? []) as Record<string, any>[]).slice(0, 3).map(c => ({ id: c.id, name: c.name }));
  const col = d.belongs_to_collection ? { id: d.belongs_to_collection.id, name: d.belongs_to_collection.name } : null;
  return { dir, wri, comp, dop, cast, kw, pays, rt, bo, cert, vc, co, col, v: 2 };
}
const APPEND = (media: string) => media === "movie" ? "credits,keywords,release_dates" : "credits,keywords,content_ratings";
async function traitsFor(x: Item) {
  try { const d = await tmdb(`/${x.media}/${x.tmdb_id}`, { append_to_response: APPEND(x.media) }); return { ...x, gids: x.gids?.length ? x.gids : (d.genres ?? []).map((g: { id: number }) => g.id), traits: traitsOf(d, x.media) }; }
  catch { return x; }
}

async function details(id: number, media: "movie" | "tv") {
  const d = await tmdb(`/${media}/${id}`, { append_to_response: "videos,watch/providers," + APPEND(media) });
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
    cinema: media === "movie" ? (await nowPlaying()).has(id) : false, traits: traitsOf(d, media),
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
async function resolveOne(it: { title: string; media: string; year?: number }, lite = false) {
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
  // en lot (import Letterboxd, test de goût) : la fiche courte suffit (affiche, résumé, traits du goût)
  if (lite) return await traitsFor(fromTmdb(best, media)!);
  return await details(best.id as number, media);
}
async function pool<T, R>(list: T[], n: number, fn: (x: T) => Promise<R>) {
  const out: R[] = new Array(list.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => { while (i < list.length) { const k = i++; try { out[k] = await fn(list[k]); } catch { out[k] = null as R; } } }));
  return out;
}

// Propositions pour le match à deux : ce qui ressemble à ce que vous avez aimé, et les tendances.
// Les genres des films n'ont pas tous le même numéro pour les séries.
const TVG: Record<string, string> = { "878": "10765", "14": "10765", "28": "10759", "12": "10759", "10752": "10768" };
type Prefs = { like?: number[]; dislike?: number[]; langs?: string[]; people?: number[]; kws?: number[]; cos?: number[] };
async function deck(seeds: { tmdb_id: number; media: string }[], exclude: Set<string>, mood: string, subs: string[], prefs: Prefs = {}) {
  if (!KEY) return [];
  // toutes les sources partent en même temps ; chacune donne une liste, qu'on mélange ensuite
  const jobs: Promise<Item[]>[] = [];
  const src = (path: string, params: Record<string, string>, media?: string, tag: Partial<Item> = {}) =>
    jobs.push(tmdb(path, params).then(r => ((r.results ?? []) as Record<string, unknown>[]).map(x => fromTmdb(x, media)).filter(Boolean).map(x => ({ ...x!, ...tag }))).catch(() => []));
  // plus vous avez jugé de films, plus il faut chercher loin : chaque tour suivant va piocher plus profond
  let depth = 0;
  const rnd = (n: number) => String(1 + Math.floor(Math.random() * Math.min(500, n * (1 + depth * 2))));
  const build = async () => {
  if (mood === "cine") jobs.push(nowPlaying().then(() => npCache?.items ?? []));
  // ce qui est inclus dans vos abonnements
  const pids = subs.length && mood !== "cine" ? await providerIds(subs) : [];
  const GEN: Record<string, string> = { leger: "35", frisson: "53", romance: "10749", animation: "16", docu: "99", sf: "878" };
  for (const media of pids.length ? ["movie", "tv"] : []) src(`/discover/${media}`, { watch_region: "CH", with_watch_providers: pids.join("|"), with_watch_monetization_types: "flatrate|free", sort_by: "popularity.desc", "vote_count.gte": "200", ...(GEN[mood] ? { with_genres: media === "tv" ? (TVG[GEN[mood]] ?? GEN[mood]) : GEN[mood] } : {}), page: rnd(4) }, media, { dispo: true });
  // les modes de pioche : pépites (très bien notés, peu connus), classiques, nouveautés, ce soir en moins de 2 h
  const MODE: Record<string, (media: string) => Record<string, string>> = {
    pepites: () => ({ sort_by: "vote_average.desc", "vote_average.gte": "7.2", "vote_count.gte": "120", "vote_count.lte": "2500" }),
    classiques: m => ({ sort_by: "vote_average.desc", "vote_count.gte": "800", [m === "tv" ? "first_air_date.lte" : "primary_release_date.lte"]: "1989-12-31" }),
    nouveautes: m => ({ sort_by: "popularity.desc", "vote_count.gte": "40", [m === "tv" ? "first_air_date.gte" : "primary_release_date.gte"]: new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10) }),
    court: () => ({ sort_by: "vote_average.desc", "vote_count.gte": "400", "with_runtime.lte": "105", "with_runtime.gte": "60" }),
  };
  if (MODE[mood]) {
    const like = (prefs.like ?? []).slice(0, 3).map(String), dislike = (prefs.dislike ?? []).slice(0, 2).map(String);
    for (const media of mood === "court" ? ["movie"] : ["movie", "tv"]) {
      const g = media === "tv" ? like.map(x => TVG[x] ?? x) : like, no = media === "tv" ? dislike.map(x => TVG[x] ?? x) : dislike;
      const base = { ...MODE[mood](media), ...(no.length ? { without_genres: no.join(",") } : {}) };
      src(`/discover/${media}`, { ...base, page: rnd(mood === "nouveautes" ? 2 : 8) }, media);
      if (g.length) src(`/discover/${media}`, { ...base, with_genres: g.join("|"), page: rnd(4) }, media);
      if (prefs.langs?.length && media === "movie") src("/discover/movie", { ...base, with_original_language: prefs.langs[0], page: rnd(3) }, media);
    }
    for (const pid of (prefs.people ?? []).slice(0, 2)) src("/discover/movie", { ...MODE[mood]("movie"), "vote_count.lte": "100000", with_people: String(pid) }, "movie");
  } else if (mood !== "cine") {
    // ce que vos avis ont appris : genres aimés (sans ceux que vous n'aimez pas), langues, équipes, thèmes
    const like = (prefs.like ?? []).slice(0, 3).map(String).sort(() => Math.random() - .5).slice(0, 2), dislike = (prefs.dislike ?? []).slice(0, 3).map(String);
    if (like.length) for (const media of ["movie", "tv"]) {
      const g = media === "tv" ? like.map(x => TVG[x] ?? x) : like, no = media === "tv" ? dislike.map(x => TVG[x] ?? x) : dislike;
      src(`/discover/${media}`, { with_genres: g.join("|"), ...(no.length ? { without_genres: no.join(",") } : {}), sort_by: "vote_average.desc", "vote_count.gte": "300", page: rnd(20) }, media);
    }
    for (const pid of (prefs.people ?? []).slice(0, 3)) src("/discover/movie", { with_people: String(pid), sort_by: "vote_average.desc", "vote_count.gte": "80", page: rnd(2) }, "movie");
    if (prefs.kws?.length) for (const media of ["movie", "tv"]) src(`/discover/${media}`, { with_keywords: prefs.kws.slice(0, 4).join("|"), sort_by: "vote_average.desc", "vote_count.gte": "100", page: rnd(5) }, media);
    // et chaque thème aimé pour lui-même (érotisme, satire, humour noir…) : sinon les thèmes rares se noient
    for (const kw of (prefs.kws ?? []).slice(0, 6)) src("/discover/movie", { with_keywords: String(kw), sort_by: "vote_average.desc", "vote_count.gte": "60", page: rnd(2) }, "movie");
    // les studios que vous aimez (Ghibli, A24…)
    for (const c of (prefs.cos ?? []).slice(0, 2)) src("/discover/movie", { with_companies: String(c), sort_by: "vote_average.desc", "vote_count.gte": "60", page: rnd(4) }, "movie");
    if (prefs.langs?.length) src("/discover/movie", { with_original_language: prefs.langs[Math.floor(Math.random() * Math.min(2, prefs.langs.length))], sort_by: "vote_average.desc", "vote_count.gte": "150", page: rnd(12) }, "movie");
    // une pioche au hasard dans les films reconnus, d'une décennie tirée au sort, pour sortir des sentiers
    { const d = 1950 + 10 * Math.floor(Math.random() * 8); src("/discover/movie", { "primary_release_date.gte": `${d}-01-01`, "primary_release_date.lte": `${d + 9}-12-31`, sort_by: "vote_average.desc", "vote_count.gte": "300", page: rnd(8) }, "movie"); }
    // les recommandations de vos films adorés : on compte combien d'entre eux recommandent chaque film
    for (const s of seeds.slice(0, 6)) jobs.push(tmdb(`/${s.media}/${s.tmdb_id}/recommendations`, { page: rnd(2) }).then(r => ((r.results ?? []) as Record<string, unknown>[]).map(x => fromTmdb(x, s.media)).filter(Boolean).map(x => ({ ...x!, reco: 1 }))).catch(() => []));
    const GENRE: Record<string, string> = { leger: "35", frisson: "53", romance: "10749", animation: "16", docu: "99", sf: "878" };
    if (mood && GENRE[mood]) for (const media of ["movie", "tv"]) src(`/discover/${media}`, { with_genres: media === "tv" ? (TVG[GENRE[mood]] ?? GENRE[mood]) : GENRE[mood], sort_by: "popularity.desc", "vote_count.gte": "300", page: rnd(3) }, media);
    src("/trending/all/week", { page: rnd(3) });
    src("/movie/top_rated", { page: rnd(40) }, "movie"); src("/movie/top_rated", { page: rnd(40) }, "movie");
    src("/tv/top_rated", { page: rnd(15) }, "tv");
    // au-delà du premier tour : aussi des films moins connus mais bien notés
    if (depth) for (const media of ["movie", "tv"]) src(`/discover/${media}`, { sort_by: "vote_average.desc", "vote_count.gte": "60", "vote_count.lte": "800", page: rnd(30) }, media);
  }
  };
  const lists: Item[][] = [];
  const neufs = () => { const ks = new Set<string>(); for (const l of lists) for (const x of l) { const k = `${x.media}:${x.tmdb_id}`; if (x.poster && x.overview && !exclude.has(k)) ks.add(k); } return ks.size; };
  for (depth = 0; depth < 4; depth++) {
    jobs.length = 0; await build();
    lists.push(...await Promise.all(jobs));
    if (neufs() >= 80 || mood === "cine") break;
  }
  const recoN = new Map<string, number>();
  for (const l of lists) for (const x of l) if (x.reco) { const k = `${x.media}:${x.tmdb_id}`; recoN.set(k, (recoN.get(k) || 0) + 1); }
  // on mélange les sources une par une, sans doublons ni ce qui est déjà dans votre liste
  const out: Item[] = [], seen = new Set<string>();
  // une large pioche (le téléphone ne garde ensuite que ce qui a le plus de chances de te plaire)
  for (let i = 0; out.length < 90 && lists.some(l => l.length > i); i++) for (const l of lists) {
    const x = l[i]; if (!x || !x.poster || !x.overview) continue;
    const k = `${x.media}:${x.tmdb_id}`; if (seen.has(k) || exclude.has(k)) continue;
    seen.add(k); out.push({ ...x, reco: recoN.get(k) || 0 });
  }
  // ceux que plusieurs de vos films recommandent passent devant
  const strong = out.filter(x => (x.reco || 0) >= 2).sort((a, b) => (b.reco || 0) - (a.reco || 0));
  out.splice(0, out.length, ...strong, ...out.filter(x => (x.reco || 0) < 2));
  // les plus prometteurs reçoivent leur fiche « goût » (équipe, thèmes, durée, succès, public)
  const rich = await pool(out, 16, traitsFor);
  return rich.map((x, i) => x ?? out[i]);
}

// Les alertes (lancées chaque jour par le planificateur) : un film de vos listes passe en salle à Lausanne,
// arrive sur un de vos abonnements, ou une série en cours a une nouvelle saison. Chaque alerte part une seule fois.
const wantsV = (v: unknown) => v === "oui" || v === "super";
async function alertes(db: ReturnType<typeof createClient>) {
  const [{ data: films }, { data: reg }, { data: sent }, { data: subsRows }, { data: keysRows }] = await Promise.all([
    db.from("films").select("id, tmdb_id, media, title, original, year, status, votes, providers, seasons, checked_at").in("status", ["a_voir", "en_cours"]),
    db.from("reglages").select("valeur").eq("cle", "abonnements").maybeSingle(),
    db.from("film_alertes").select("film_id, kind, info"),
    db.from("push_subscriptions").select("endpoint, email, sub"),
    db.from("app_secrets").select("name, value").in("name", ["vapid_public", "vapid_private", "vapid_subject"]),
  ]);
  const done = new Set((sent ?? []).map((r: Record<string, string>) => `${r.film_id}|${r.kind}|${r.info}`));
  const subs: string[] = (reg?.valeur as string[]) ?? [];
  const isSub = (name: string) => subs.some(k => SUB_RE[k]?.test(name));
  const out: { film: Record<string, any>; kind: string; info: string; title: string; body: string; to: string[] }[] = [];
  const fans = (f: Record<string, any>) => Object.entries(f.votes ?? {}).filter(([, v]) => wantsV(v)).map(([e]) => e);
  const wanted = (films ?? []).filter((f: Record<string, any>) => f.status === "a_voir" && fans(f).length);
  // 1. en salle à Lausanne
  try {
    const sl = await salles();
    for (const f of wanted) {
      if (f.media !== "movie") continue;
      const keys = new Set([nrm(f.title || ""), nrm(f.original || "")].filter(Boolean));
      for (const x of sl) {
        const parts = [x.title, ...x.title.replace(/\((19|20)\d{2}\)/, "").split(/[()]/)].map(nrm).filter(k => k.length > 1);
        if (!parts.some(k => keys.has(k)) || (x.year && f.year && Math.abs(x.year - f.year) > 1)) continue;
        const info = x.where;   // une seule alerte par film et par salle
        out.push({ film: f, kind: "salle", info, to: fans(f), title: `🎟 ${f.title} ${x.where === "Cinémathèque" ? "à la Cinémathèque" : `au ${x.where}`}`, body: `${x.when ?? "En ce moment"}. Il est dans votre liste.` });
        break;
      }
    }
  } catch (e) { console.error("alertes salles", e); }
  // 2. arrivé sur un de vos abonnements (les plus anciennes vérifications d'abord)
  if (KEY && subs.length) {
    const todo = wanted.filter((f: Record<string, any>) => f.tmdb_id).sort((a: Record<string, any>, b: Record<string, any>) => String(a.checked_at ?? "").localeCompare(String(b.checked_at ?? ""))).slice(0, 30);
    await pool(todo, 6, async (f: Record<string, any>) => {
      const ch = (await tmdb(`/${f.media}/${f.tmdb_id}/watch/providers`)).results?.CH ?? {};
      const providers = [...(ch.flatrate ?? []).map((p: Record<string, string>) => ({ name: p.provider_name, logo: p.logo_path ? IMG + "w92" + p.logo_path : null, kind: "abo" })),
        ...(ch.free ?? []).map((p: Record<string, string>) => ({ name: p.provider_name, logo: p.logo_path ? IMG + "w92" + p.logo_path : null, kind: "gratuit" })),
        ...(ch.rent ?? []).slice(0, 3).map((p: Record<string, string>) => ({ name: p.provider_name, logo: p.logo_path ? IMG + "w92" + p.logo_path : null, kind: "location" }))];
      const before = new Set(((f.providers ?? []) as Record<string, string>[]).filter(p => p.kind !== "location").map(p => p.name));
      // la première vérification sert de point de départ (sinon tout ce qui est déjà dispo sonnerait d'un coup)
      if (f.checked_at) for (const p of providers) if (p.kind !== "location" && isSub(p.name) && !before.has(p.name))
        out.push({ film: f, kind: "abo", info: p.name, to: fans(f), title: `✓ ${f.title} est sur ${p.name}`, body: "Il est dans votre liste, et c’est inclus dans votre abonnement." });
      await db.from("films").update({ providers, checked_at: new Date().toISOString() }).eq("id", f.id);
    });
  }
  // 3. nouvelle saison d'une série en cours
  if (KEY) {
    const series = (films ?? []).filter((f: Record<string, any>) => f.status === "en_cours" && f.media === "tv" && f.tmdb_id);
    await pool(series, 4, async (f: Record<string, any>) => {
      const d = await tmdb(`/tv/${f.tmdb_id}`); const n = Number(d.number_of_seasons || 0);
      if (f.seasons && n > f.seasons) out.push({ film: f, kind: "saison", info: String(n), to: [], title: `📺 ${f.title} : saison ${n}`, body: "Une nouvelle saison de votre série en cours est sortie." });
      if (n && n !== f.seasons) await db.from("films").update({ seasons: n }).eq("id", f.id);
    });
  }
  const fresh = out.filter(a => !done.has(`${a.film.id}|${a.kind}|${a.info}`));
  if (!fresh.length) return { alertes: 0 };
  const k = Object.fromEntries((keysRows ?? []).map((r: Record<string, string>) => [r.name, r.value]));
  let sent2 = 0;
  if (k.vapid_public && k.vapid_private) {
    webpush.setVapidDetails(k.vapid_subject || "mailto:maison@inotay.github.io", k.vapid_public, k.vapid_private);
    const byPerson = new Map<string, typeof fresh>();
    const all = [...new Set((subsRows ?? []).map((s: Record<string, string>) => String(s.email || "").toLowerCase()))];
    for (const a of fresh) for (const e of (a.to.length ? a.to : all)) byPerson.set(e, [...(byPerson.get(e) ?? []), a]);
    for (const s of subsRows ?? []) {
      const list = byPerson.get(String(s.email || "").toLowerCase()) ?? []; if (!list.length) continue;
      const payload = list.length === 1 ? { title: list[0].title, body: list[0].body } : { title: `🍿 ${list.length} bonnes nouvelles pour votre ciné`, body: list.slice(0, 3).map(a => a.title.replace(/^\S+ /, "")).join(" · ") };
      try { await webpush.sendNotification(s.sub, JSON.stringify({ ...payload, tag: "maison-cine", url: "./?do=film" }), { TTL: 12 * 3600 }); sent2++; }
      catch (e) { const st = (e as { statusCode?: number }).statusCode; if (st === 404 || st === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint); }
    }
  }
  await db.from("film_alertes").upsert(fresh.map(a => ({ film_id: a.film.id, kind: a.kind, info: a.info })));
  return { alertes: fresh.length, envoyees: sent2 };
}

// Les notes de la presse et du public (MDBList : IMDb, Metacritic presse et spectateurs, Rotten Tomatoes critiques
// et public, Letterboxd, Trakt, MyAnimeList, Roger Ebert) et les prix. Gardées 30 jours dans film_notes.
// 1 000 demandes par jour au plus : on compte ce qui reste et on s'arrête avant.
type Presse = Record<string, number | string>;
let mdbLeft = 1000, mdbPause = 0;
function compact(d: Record<string, any>): Presse | null {
  if (!d || !Array.isArray(d.ratings)) return null;
  const o: Presse = {};
  const R = Object.fromEntries((d.ratings as Record<string, any>[]).map(r => [r.source, r]));
  const put = (k: string, src: string, f: "value" | "score" = "value", nk = "") => { const r = R[src]; if (r?.[f] != null) { o[k] = Number(r[f]); if (nk && r.votes) o[nk] = Number(r.votes); } };
  put("imdb", "imdb", "value", "imdbN"); put("mc", "metacritic", "value", "mcN"); put("mcu", "metacriticuser"); put("rt", "tomatoes", "value", "rtN");
  put("pop", "popcorn"); if (o.pop == null) put("pop", "tomatoesaudience"); put("lb", "letterboxd", "value", "lbN"); put("tr", "trakt"); put("mal", "myanimelist"); put("eb", "rogerebert");
  if (d.awards) { const a = String(d.awards); if (/Won \d+ Oscar/i.test(a)) o.oscar = 1; const w = a.match(/(\d+) wins?/i); if (w) o.prix = Number(w[1]); const n = a.match(/(\d+) nominations?/i); if (n) o.nomin = Number(n[1]); }
  if (d.score) o.mdb = Number(d.score);
  return Object.keys(o).length ? o : null;
}
// undefined : pas demandé (quota, pause) ; null : demandé, rien trouvé.
async function presseOf(db: ReturnType<typeof createClient>, media: string, id: number, fetchNew: boolean | (() => boolean) = true): Promise<Presse | null | undefined> {
  const cle = `${media}:${id}`;
  const { data } = await db.from("film_notes").select("data, at").eq("cle", cle).maybeSingle();
  if (data && Date.now() - Date.parse(data.at) < 30 * 864e5) return data.data as Presse | null;
  if (!MDB || mdbLeft < 30 || Date.now() < mdbPause || !(typeof fetchNew === "function" ? fetchNew() : fetchNew)) return (data?.data as Presse) ?? undefined;
  const r = await fetch(`https://api.mdblist.com/tmdb/${media === "tv" ? "show" : "movie"}/${id}?apikey=${MDB}`);
  const left = Number(r.headers.get("x-ratelimit-remaining")); if (r.headers.has("x-ratelimit-remaining") && Number.isFinite(left)) mdbLeft = left;
  if (r.status === 429) { const ra = Number(r.headers.get("retry-after")); mdbPause = Date.now() + (Number.isFinite(ra) && ra > 0 ? ra * 1000 : 60000); console.warn("mdblist 429", ra, (await r.text()).slice(0, 200)); return undefined; }
  if (r.status >= 500) return undefined;
  const p = r.ok ? compact(await r.json()) : null;
  await db.from("film_notes").upsert({ cle, data: p, at: new Date().toISOString() });
  return p;
}
async function presseBatch(db: ReturnType<typeof createClient>, n: number) {
  if (!MDB) return { error: "Pas de clé MDBList." };
  const { data } = await db.from("films").select("id, tmdb_id, media, votes, ratings").not("tmdb_id", "is", null).is("presse", null);
  // d'abord ce qui apprend le plus : les films notés, puis les envies, puis le reste
  const rank = (f: Record<string, any>) => (Object.keys(f.ratings ?? {}).length ? 0 : Object.values(f.votes ?? {}).some(wantsV) ? 1 : 2);
  const todo = (data ?? []).sort((a, b) => rank(a) - rank(b)), batch = todo.slice(0, n);
  let ok = 0, vide = 0, pas = 0;
  for (const f of batch) {
    if (Date.now() < mdbPause || mdbLeft < 30) break;
    const p = await presseOf(db, f.media, f.tmdb_id);
    if (p === undefined) { pas++; continue; }
    await db.from("films").update({ presse: p ?? { aucune: 1 } }).eq("id", f.id); p ? ok++ : vide++;
    await new Promise(r => setTimeout(r, 250));   // doucement : MDBList limite aussi le rythme
  }
  return { faits: ok, sans: vide, pas, reste: todo.length - ok - vide, quota: mdbLeft, pause: Math.max(0, Math.round((mdbPause - Date.now()) / 1000)) };
}

// Mettre à jour la fiche détaillée (traits) des films déjà enregistrés : ceux qui n'en ont pas, puis les anciennes
// fiches sans studio ni saga. Ne renvoie que des compteurs ; à relancer jusqu'à « reste: 0 ».
async function retraits(db: ReturnType<typeof createClient>, n: number) {
  if (!KEY) return { error: "Pas de TMDB." };
  const { data } = await db.from("films").select("id, tmdb_id, media, traits, gids, lang, note").not("tmdb_id", "is", null);
  const todo = (data ?? []).filter(f => !f.traits || f.traits.v !== 2);
  const batch = todo.slice(0, n);
  let ok = 0;
  await pool(batch, 8, async (f: Record<string, any>) => {
    try {
      const d = await tmdb(`/${f.media}/${f.tmdb_id}`, { append_to_response: APPEND(f.media) });
      const patch: Record<string, unknown> = { traits: traitsOf(d, f.media) };
      if (!f.gids?.length) patch.gids = (d.genres ?? []).map((g: { id: number }) => g.id);
      if (!f.lang && d.original_language) patch.lang = d.original_language;
      if (d.vote_average) patch.note = Math.round(Number(d.vote_average) * 10) / 10;
      if (f.media === "movie" && d.runtime) patch.runtime = d.runtime;
      await db.from("films").update(patch).eq("id", f.id); ok++;
    } catch (e) { console.warn("retraits", f.tmdb_id, (e as Error).message); }
  });
  return { faits: ok, reste: todo.length - ok };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { body = {}; }
  // Les séances des salles de Lausanne sont publiques : pas besoin d'être membre pour les lire.
  if (body.action === "salles") { try { return json({ salles: await salles() }); } catch (e) { return json({ error: (e as Error).message }, 500); } }
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // le planificateur, une fois par jour : rien n'est renvoyé de privé, les notifications vont aux membres
  if (body.action === "presse") { try { return json(await presseBatch(db, Math.min(120, Number(body.n) || 60))); } catch (e) { console.error(e); return json({ error: (e as Error).message }, 500); } }
  if (body.action === "retraits") { try { return json(await retraits(db, Math.min(80, Number(body.n) || 40))); } catch (e) { console.error(e); return json({ error: (e as Error).message }, 500); } }
  if (body.action === "alertes") { try { return json(await alertes(db)); } catch (e) { console.error(e); return json({ error: (e as Error).message }, 500); } }
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
      const media = body.media === "tv" ? "tv" : "movie";
      const [d, presse] = await Promise.all([details(Number(body.tmdb_id), media), presseOf(db, media, Number(body.tmdb_id)).catch(() => null)]);
      return json({ ...d, presse });
    }
    if (action === "resolve") {
      if (!KEY) return json({ results: [] });
      const items = ((body.items ?? []) as { title: string; media: string; year?: number }[]).slice(0, 40);
      return json({ results: await pool(items, body.lite ? 8 : 6, x => resolveOne(x, !!body.lite)) });
    }
    if (action === "deck") {
      const seeds = (body.seeds ?? []) as { tmdb_id: number; media: string }[];
      const exclude = new Set(((body.exclude ?? []) as string[]).map(String));
      const np = KEY ? await nowPlaying() : new Set<number>();
      const res = (await deck(seeds, exclude, String(body.mood ?? ""), ((body.subs ?? []) as string[]).map(String), (body.prefs ?? {}) as Prefs)).map(x => ({ ...x, cinema: x.cinema || (x.media === "movie" && np.has(x.tmdb_id!)) }));
      // notes presse et public : celles déjà en cache pour tous, et jusqu'à 12 nouvelles par pioche
      let fresh = 0;
      await pool(res, 8, async (x: Record<string, any>) => { const p = await presseOf(db, x.media, x.tmdb_id, () => fresh++ < 8).catch(() => null); if (p) x.presse = p; });
      return json({ results: res, tmdb: !!KEY });
    }
    return json({ error: "Action inconnue." }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
