// Les sources fines du goût ciné, à côté de la fonction « films » : palmarès (Wikidata, Cahiers du cinéma,
// Sight and Sound), presse titre par titre (AlloCiné) et tons (un modèle de langage, si une clé ANTHROPIC_API_KEY
// est posée). Tout est lu une fois par film puis gardé dans la table films. Ne renvoie que des compteurs.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const LLM = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const wantsV = (v: unknown) => v === "oui" || v === "super";
async function pool<T, R>(list: T[], n: number, fn: (x: T) => Promise<R>) {
  const out: R[] = new Array(list.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => { while (i < list.length) { const k = i++; try { out[k] = await fn(list[k]); } catch { out[k] = null as R; } } }));
  return out;
}

// ── Palmarès : prix et sélections (Wikidata), top 10 annuel des Cahiers du cinéma et sondage Sight and Sound
// (Wikipédia, CC BY-SA). On relie les films par leur page Wikipédia anglaise, donnée par Wikidata.
const WUA = { "user-agent": "Maison/1.0 (app de maison privée; contact yatonirc@gmail.com)" };
const AW: [RegExp, string][] = [[/^Palme d'or$/i, "palme"], [/^Grand prix du Festival de Cannes/i, "cannes_gp"], [/^Lion d'or/i, "lion"], [/^Ours d'or/i, "ours"], [/^Léopard d'or/i, "leopard"],
  [/^Oscar du meilleur film$/i, "oscar_film"], [/^César du meilleur film$/i, "cesar"], [/Cristal (du|d'Annecy).*long/i, "annecy"], [/^Oscar du meilleur film international|^Oscar du meilleur film en langue étrangère/i, "oscar_inter"], [/^Oscar du meilleur film d'animation/i, "oscar_anim"]];
const NOM: [RegExp, string][] = [[/^Palme d'or$/i, "cannes"], [/^Lion d'or/i, "venise"], [/^Ours d'or/i, "berlin"], [/^Léopard d'or/i, "locarno"], [/^Oscar du meilleur film$/i, "oscar_film_nom"]];
const wtitle = (u?: string) => u ? decodeURIComponent(u.replace(/^https:\/\/\w+\.wikipedia\.org\/wiki\//, "")).replace(/_/g, " ") : "";
const wkey = (t: string) => t.replace(/_/g, " ").trim().replace(/^./, c => c.toUpperCase());
async function wikiRaw(title: string) { const r = await fetch(`https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(title)}&action=raw`, { headers: WUA }); return r.ok ? await r.text() : ""; }
// les listes, gardées 30 jours : { "Titre de la page": rang ou [rang, année] }
async function liste(db: ReturnType<typeof createClient>, nom: "cahiers" | "ss") {
  const cle = "liste:" + nom;
  const { data } = await db.from("film_notes").select("data, at").eq("cle", cle).maybeSingle();
  if (data?.data && Date.now() - Date.parse(data.at) < 30 * 864e5) return data.data as Record<string, any>;
  const out: Record<string, any> = {};
  if (nom === "cahiers") {
    const t = await wikiRaw("Cahiers du Cinéma's Annual Top 10 Lists");
    let year = 0, rank = 0;
    for (const row of t.split(/\n\|-/)) {
      const y = row.match(/colspan="\d+"\s*\|\s*'*((?:19|20)\d{2})/); if (y) { year = Number(y[1]); continue; }
      const r = row.match(/^\s*!\s*(?:rowspan="\d+"\s*\|\s*)?(\d{1,2})\./m); if (r) rank = Number(r[1]);
      const l = row.match(/''\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]''/); if (l && year) { const k = wkey(l[1]); if (!out[k]) out[k] = [rank || 10, year]; }
    }
  } else {
    const t = await wikiRaw("The Sight and Sound Greatest Films of All Time 2022");
    const crit = t.indexOf("Critics' poll"), dirs = t.indexOf("Directors' poll");
    const grab = (a: number, b: number, tag: string) => { let i = 0; for (const m of t.slice(a, b > a ? b : t.length).matchAll(/''\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]''/g)) { const k = wkey(m[1]); i++; out[k] = { ...(out[k] ?? {}), [tag]: i }; } };
    if (crit >= 0) grab(crit, dirs, "c"); if (dirs >= 0) grab(dirs, -1, "d");
  }
  if (Object.keys(out).length > 10) await db.from("film_notes").upsert({ cle, data: out, at: new Date().toISOString() });
  return out;
}
async function wikidata(media: string, ids: number[]) {
  const prop = media === "tv" ? "P4983" : "P4947", allo = media === "tv" ? "P1267" : "P1265";
  const q = `SELECT ?id ?allo ?en ?fr (GROUP_CONCAT(DISTINCT ?awL; separator="|") AS ?aw) (GROUP_CONCAT(DISTINCT ?nmL; separator="|") AS ?nm) WHERE {
    VALUES ?id { ${ids.map(i => `"${i}"`).join(" ")} } ?item wdt:${prop} ?id .
    OPTIONAL { ?item wdt:${allo} ?allo } OPTIONAL { ?en schema:about ?item; schema:isPartOf <https://en.wikipedia.org/> } OPTIONAL { ?fr schema:about ?item; schema:isPartOf <https://fr.wikipedia.org/> }
    OPTIONAL { ?item wdt:P166 ?a . ?a rdfs:label ?awL FILTER(lang(?awL)='fr') } OPTIONAL { ?item wdt:P1411 ?n . ?n rdfs:label ?nmL FILTER(lang(?nmL)='fr') } } GROUP BY ?id ?allo ?en ?fr`;
  const r = await fetch("https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(q), { headers: { ...WUA, accept: "application/sparql-results+json" } });
  if (!r.ok) throw new Error("Wikidata " + r.status);
  const out = new Map<number, Record<string, any>>();
  for (const b of (await r.json()).results?.bindings ?? []) {
    const id = Number(b.id.value); if (out.has(id)) continue;
    const aw = String(b.aw?.value ?? "").split("|").filter(Boolean), nm = String(b.nm?.value ?? "").split("|").filter(Boolean);
    out.set(id, { allo: b.allo?.value ?? null, en: wtitle(b.en?.value), fr: wtitle(b.fr?.value), prix: [...new Set(aw.map(a => AW.find(([re]) => re.test(a))?.[1]).filter(Boolean))], selec: [...new Set([...nm, ...aw].map(a => NOM.find(([re]) => re.test(a))?.[1]).filter(Boolean))], nPrix: aw.length, nNom: nm.length });
  }
  return out;
}
async function palmaresBatch(db: ReturnType<typeof createClient>, n: number) {
  const { data } = await db.from("films").select("id, tmdb_id, media").not("tmdb_id", "is", null).is("palmares", null);
  const todo = (data ?? []).slice(0, n);
  if (!todo.length) return { faits: 0, reste: 0 };
  const [cah, ss] = await Promise.all([liste(db, "cahiers"), liste(db, "ss")]);
  let ok = 0;
  for (const media of ["movie", "tv"]) {
    const part = todo.filter(f => f.media === media);
    for (let i = 0; i < part.length; i += 80) {
      const chunk = part.slice(i, i + 80), wd = await wikidata(media, chunk.map(f => f.tmdb_id));
      for (const f of chunk) {
        const w = wd.get(f.tmdb_id) ?? { aucun: 1 };
        if (w.en) { const k = wkey(w.en); if (cah[k]) w.cahiers = cah[k]; if (ss[k]) w.ss = ss[k]; }
        await db.from("films").update({ palmares: w }).eq("id", f.id); ok++;
      }
    }
  }
  return { faits: ok, reste: (data ?? []).length - ok, listes: { cahiers: Object.keys(cah).length, ss: Object.keys(ss).length } };
}

// ── La presse titre par titre (AlloCiné, page « critiques presse », lue une fois par film et gardée)
const AUA = { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15", "accept-language": "fr-CH,fr;q=0.9" };
const unent = (s: string) => s.replace(/&#0?39;|&apos;/g, "’").replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();
async function allocine(id: string) {
  const r = await fetch(`https://www.allocine.fr/film/fichefilm-${id}/critiques/presse/`, { headers: AUA });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("AlloCiné " + r.status);
  const t = await r.text(), out: Record<string, number> = {};
  for (const m of t.matchAll(/rating-mdl n(\d{2}) stareval-stars[\s\S]{0,900}?stareval-link-info[^>]*>([^<]{2,60})<\/span>/g)) { const k = unent(m[2]); if (!(k in out)) out[k] = Number(m[1]) / 10; }
  return Object.keys(out).length ? out : null;
}
async function critiquesBatch(db: ReturnType<typeof createClient>, n: number) {
  const { data } = await db.from("films").select("id, media, palmares, ratings, votes").eq("media", "movie").not("palmares", "is", null).is("critiques", null);
  const rank = (f: Record<string, any>) => (Object.keys(f.ratings ?? {}).length ? 0 : Object.values(f.votes ?? {}).some(wantsV) ? 1 : 2);
  const todo = (data ?? []).sort((a, b) => rank(a) - rank(b)), t0 = Date.now();
  let ok = 0, sans = 0, err = 0;
  for (const f of todo.slice(0, n)) {
    if (Date.now() - t0 > 110e3) break;
    const id = f.palmares?.allo;
    try { const c = id ? await allocine(String(id)) : null; await db.from("films").update({ critiques: c ?? { aucune: 1 } }).eq("id", f.id); c ? ok++ : sans++; }
    catch (e) { err++; console.warn("allocine", id, (e as Error).message); if (err > 3) break; }
    await new Promise(r => setTimeout(r, 900));   // doucement, une page à la fois
  }
  return { faits: ok, sans, erreurs: err, reste: todo.length - ok - sans };
}

// ── Les tons et ambiances : un modèle de langage lit le synopsis et l'article Wikipédia (intrigue, accueil)
// et choisit dans une liste fixe. On ne garde que les mots choisis.
const TONS = ["contemplatif", "mélancolique", "poétique", "onirique", "surréaliste", "absurde", "humour noir", "satirique", "drôle", "cruel", "glaçant", "angoissant", "malaisant", "violent", "sensuel", "romantique", "tendre", "chaleureux", "nostalgique", "lumineux", "déchirant", "épique", "spectaculaire", "nerveux", "haletant", "cérébral", "intimiste", "naturaliste", "stylisé", "baroque", "minimaliste", "politique", "social", "spirituel", "mystérieux", "provocateur", "feel-good"];
async function wikiText(title: string, lang = "en") {
  if (!title) return "";
  const r = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&format=json&titles=${encodeURIComponent(title)}`, { headers: WUA });
  if (!r.ok) return "";
  const p = Object.values((await r.json()).query?.pages ?? {})[0] as Record<string, string> | undefined;
  const t = p?.extract ?? "";
  // l'intrigue et l'accueil d'abord : c'est là que se dit le ton
  const sec = (re: RegExp) => { const m = t.match(re); if (!m) return ""; const i = m.index! + m[0].length, j = t.slice(i).search(/\n== [^=]/); return t.slice(i, j > 0 ? i + j : i + 3000); };
  return [t.slice(0, 1200), sec(/\n== (Plot|Synopsis|Premise|Intrigue|Résumé)[^=]*==/), sec(/\n== (Reception|Critical reception|Accueil)[^=]*==/), sec(/\n== (Style|Themes|Analysis|Thèmes)[^=]*==/)].join("\n").slice(0, 7000);
}
async function tonsOf(f: Record<string, any>) {
  const txt = [f.overview, await wikiText(f.palmares?.en), f.palmares?.en ? "" : await wikiText(f.palmares?.fr, "fr")].filter(Boolean).join("\n\n").slice(0, 8000);
  if (txt.length < 200) return { aucun: 1 };
  const prompt = `Film : ${f.title}${f.year ? ` (${f.year})` : ""}.\n\nTextes :\n${txt}\n\nDécris le ton et l'ambiance de ce film (pas son sujet). Réponds seulement en JSON : {"tons": [2 à 6 mots pris uniquement dans cette liste : ${TONS.join(", ")}], "rythme": "lent" | "posé" | "soutenu" | "effréné", "intensite": "douce" | "moyenne" | "forte"}.`;
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": LLM, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-haiku-5-5", max_tokens: 200, messages: [{ role: "user", content: prompt }] }) });
  if (!r.ok) throw new Error("Anthropic " + r.status + " " + (await r.text()).slice(0, 200));
  const out = (await r.json()).content?.[0]?.text ?? "";
  const j = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1));
  const tons = (j.tons ?? []).map((x: string) => String(x).toLowerCase().trim()).filter((x: string) => TONS.includes(x)).slice(0, 6);
  return { tons, rythme: ["lent", "posé", "soutenu", "effréné"].includes(j.rythme) ? j.rythme : null, intensite: ["douce", "moyenne", "forte"].includes(j.intensite) ? j.intensite : null };
}
async function tonsBatch(db: ReturnType<typeof createClient>, n: number) {
  if (!LLM) return { error: "Pas de clé ANTHROPIC_API_KEY." };
  const { data } = await db.from("films").select("id, title, year, overview, palmares, ratings, votes").not("palmares", "is", null).is("tons", null);
  const rank = (f: Record<string, any>) => (Object.keys(f.ratings ?? {}).length ? 0 : Object.values(f.votes ?? {}).some(wantsV) ? 1 : 2);
  const todo = (data ?? []).sort((a, b) => rank(a) - rank(b)), t0 = Date.now();
  let ok = 0, err = 0;
  await pool(todo.slice(0, n), 4, async (f: Record<string, any>) => {
    if (Date.now() - t0 > 100e3 || err > 3) return;
    try { await db.from("films").update({ tons: await tonsOf(f) }).eq("id", f.id); ok++; } catch (e) { err++; console.warn("tons", f.title, (e as Error).message); }
  });
  return { faits: ok, erreurs: err, reste: todo.length - ok };
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { body = {}; }
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    if (body.action === "palmares") return json(await palmaresBatch(db, Math.min(400, Number(body.n) || 200)));
    if (body.action === "critiques") return json(await critiquesBatch(db, Math.min(120, Number(body.n) || 60)));
    if (body.action === "tons") return json(await tonsBatch(db, Math.min(80, Number(body.n) || 40)));
    if (body.action === "status") return json({ tons: !!LLM });
    return json({ error: "Action inconnue." }, 400);
  } catch (e) { console.error(e); return json({ error: (e as Error).message }, 500); }
});
