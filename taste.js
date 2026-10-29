// Le goût ciné de chacun : un profil appris de chaque avis (envie, bof, note après l'avoir vu, coup de cœur).
// Chaque film est décrit par ses traits : qui l'a réalisé, écrit, mis en musique, filmé, qui joue dedans,
// ses thèmes, son genre, sa langue et son pays, son époque, sa durée, son succès, son public. Un avis positif
// renforce ses traits, un avis négatif les affaiblit. Les traits rares (un réalisateur, un thème précis)
// comptent plus que les traits communs (un genre, l'anglais). Une proposition reçoit un score : la somme
// de ses traits pondérés par le profil, plus un peu de qualité (la note TMDB) et un peu de hasard pour
// continuer d'apprendre. Rien ne sort de l'app : tout est calculé sur le téléphone.

export const GENRES = { 28: 'les films d’action', 12: 'l’aventure', 16: 'l’animation', 35: 'les comédies', 80: 'les polars', 99: 'les documentaires', 18: 'les drames',
  10751: 'les films familiaux', 14: 'le fantastique', 36: 'les films historiques', 27: 'l’horreur', 10402: 'les films musicaux', 9648: 'les mystères', 10749: 'les romances',
  878: 'la science-fiction', 10770: 'les téléfilms', 53: 'les thrillers', 10752: 'les films de guerre', 37: 'les westerns', 10762: 'les séries jeunesse', 10763: 'l’info',
  10764: 'la téléréalité', 10766: 'les feuilletons', 10767: 'les talk-shows' };
const TV2M = { 10759: 28, 10765: 878, 10768: 10752 };
const LANGS = { ja: 'le cinéma japonais', ko: 'le cinéma coréen', fr: 'le cinéma français', it: 'le cinéma italien', es: 'le cinéma espagnol', de: 'le cinéma allemand',
  zh: 'le cinéma chinois', cn: 'le cinéma de Hong Kong', sv: 'le cinéma suédois', da: 'le cinéma danois', no: 'le cinéma norvégien', ru: 'le cinéma russe',
  pt: 'le cinéma portugais', fa: 'le cinéma iranien', hi: 'le cinéma indien', pl: 'le cinéma polonais', tr: 'le cinéma turc', th: 'le cinéma thaï', ro: 'le cinéma roumain', el: 'le cinéma grec' };
const BO = { blockbuster: 'les gros succès', succes: 'les succès en salle', culte: 'les films cultes', confidentiel: 'les films confidentiels' };
const RT = { court: 'les films courts', moyen: '', long: 'les films longs' };
// thèmes TMDB qui ne disent rien du goût
const BANAL = /^(duringcreditsstinger|aftercreditsstinger|woman director|based on novel or book|sequel|remake|prequel|3d|imax|short film|anime)$/i;

const add = (m, k, w, label, kind) => { const x = m.get(k); if (!x || x[0] < w) m.set(k, [w, label, kind]); };
// Les traits d'un film : [clé, poids, libellé, type]
export function feats(f) {
  const m = new Map(), t = f.traits || {};
  for (const g of f.gids || []) { const id = TV2M[g] || g; if (GENRES[id]) add(m, 'g:' + id, .7, GENRES[id], 'genre'); }
  for (const p of t.dir || []) add(m, 'p:' + p.id, 3, p.name, f.media === 'tv' ? 'crea' : 'dir');
  for (const p of t.wri || []) add(m, 'p:' + p.id, 1.6, p.name, 'wri');
  for (const p of t.comp || []) add(m, 'p:' + p.id, 1.4, p.name, 'comp');
  for (const p of t.dop || []) add(m, 'p:' + p.id, 1.2, p.name, 'dop');
  (t.cast || []).forEach((p, i) => add(m, 'p:' + p.id, i < 2 ? 1.3 : .8, p.name, 'cast'));
  for (const k of t.kw || []) if (!BANAL.test(k.name)) add(m, 'k:' + k.id, 1.1, k.name, 'kw');
  if (f.lang) add(m, 'l:' + f.lang, f.lang === 'en' ? .25 : 1, LANGS[f.lang] || '', 'lang');
  for (const c of t.pays || []) add(m, 'c:' + c, .4, '', 'pays');
  if (f.year) { const d = Math.floor(f.year / 10) * 10; add(m, 'd:' + d, .6, d < 2000 ? `les années ${String(d).slice(2)}` : `les années ${d}`, 'dec'); }
  const rt = t.rt || f.runtime; if (rt && f.media === 'movie') { const b = rt < 95 ? 'court' : rt <= 135 ? 'moyen' : 'long'; add(m, 'rt:' + b, .4, RT[b], 'rt'); }
  if (t.bo && BO[t.bo]) add(m, 'bo:' + t.bo, .5, BO[t.bo], 'bo');
  if (t.cert) add(m, 'cert:' + t.cert, .3, '', 'cert');
  add(m, 'm:' + f.media, .4, f.media === 'tv' ? 'les séries' : 'les films', 'media');
  return [...m].map(([k, [w, label, kind]]) => [k, w, label, kind]);
}

// Ce qu'un film dit du goût de quelqu'un, de -2.5 (détesté) à +4 (coup de cœur adoré).
export function signal(f, email) {
  const r = f.ratings?.[email]?.note, v = f.votes?.[email];
  let w = 0;
  if (r) w = (r - 3) * 1.25 + (r === 3 ? .15 : 0);
  else if (v === 'oui') w = 1;
  else if (v === 'non') w = -.35;      // bof : pas intéressé, indifférent
  else if (v === 'beurk') w = -1.6;   // non ! : je n'aime pas ce genre de film
  if ((f.coeur || []).includes(email)) w = Math.max(w, 0) + 2.5;
  return w;
}

// La rareté de chaque trait dans tout ce qu'on connaît (vos films et les propositions).
export function rarity(list) {
  const df = new Map(); let n = 0;
  for (const f of list) { n++; for (const [k] of feats(f)) df.set(k, (df.get(k) || 0) + 1); }
  return k => (k[0] === 'p' || k[0] === 'k') ? 1 + Math.log((1 + n) / (1 + (df.get(k) || 0))) * .5 : 1;
}

export function profile(films, email, idf = () => 1) {
  const P = new Map(), N = new Map(), liked = new Map(); let n = 0, pos = 0, neg = 0;
  for (const f of films) {
    const w = signal(f, email); if (!w) continue;
    n++; w > 0 ? pos++ : neg++;
    for (const [k, fw, label, kind] of feats(f)) {
      P.set(k, (P.get(k) || 0) + w * fw * idf(k)); N.set(k, (N.get(k) || 0) + 1);
      if (w >= 1.2 && (kind === 'dir' || kind === 'crea' || kind === 'comp' || kind === 'dop' || kind === 'wri' || kind === 'cast' || kind === 'kw')) { const l = liked.get(k) || []; if (l.length < 3) l.push(f.title); liked.set(k, l); }
    }
  }
  const Pn = new Map([...P].map(([k, v]) => [k, v / Math.sqrt(N.get(k) + 1)]));
  return { email, n, pos, neg, Pn, liked, idf };
}

export function score(prof, f) {
  if (!prof || !prof.n) return (f.note ? (f.note - 6.8) * .25 : 0);
  let s = 0, norm = 0;
  for (const [k, fw] of feats(f)) { const w = fw * prof.idf(k); norm += w * w; s += w * (prof.Pn.get(k) || 0); }
  s = norm ? s / Math.sqrt(norm) : 0;
  const conf = Math.min(1, prof.n / 25);
  return s * (.4 + .6 * conf) + (f.note ? (f.note - 6.8) * .25 : 0);
}
// Pour vous deux : un film que l'un adore et que l'autre déteste n'est pas un bon choix commun.
export const scoreBoth = (a, b, f) => { const x = score(a, f), y = score(b, f); return Math.min(x, y) * .6 + (x + y) / 2 * .4; };

const KIND_TXT = { dir: n => `De ${n}`, crea: n => `Créée par ${n}`, wri: n => `Écrit par ${n}`, comp: n => `Musique de ${n}`, dop: n => `Image de ${n}`, cast: n => `Avec ${n}` };
// Pourquoi Azami le propose : les deux traits qui comptent le plus, avec un film aimé en exemple.
export function why(prof, f, max = 2) {
  if (!prof?.n) return [];
  const GEN = new Set(['genre', 'lang', 'dec', 'bo', 'rt']);
  const parts = feats(f).map(([k, fw, label, kind]) => [k, fw * prof.idf(k) * (prof.Pn.get(k) || 0), label, kind]).filter(x => x[2] && x[1] > (GEN.has(x[3]) ? .6 : .25)).sort((a, b) => b[1] - a[1]);
  const out = [], kinds = new Set();
  for (const [k, , label, kind] of parts) {
    if (out.length >= max || (kinds.has(kind) && kind !== 'cast')) continue;
    const ex = prof.liked.get(k)?.find(t => t !== f.title);
    if (KIND_TXT[kind]) out.push(KIND_TXT[kind](label) + (ex ? `, comme ${ex}` : ''));
    else if (kind === 'kw') out.push(`Thème : ${label}` + (ex ? `, comme ${ex}` : ''));
    else if (GEN.has(kind)) out.push(`${prof.self ? 'Tu aimes' : `${prof.name || 'Elle'} aime`} ${label}`);
    kinds.add(kind);
  }
  return out;
}
// Un trait que la personne n'aime vraiment pas (pour prévenir honnêtement).
export function warn(prof, f) {
  if (!prof?.n) return '';
  const bad = feats(f).map(([k, fw, label, kind]) => [fw * prof.idf(k) * (prof.Pn.get(k) || 0), label, kind]).filter(x => x[0] < -.6 && x[1]).sort((a, b) => a[0] - b[0])[0];
  return bad ? (KIND_TXT[bad[2]] ? `${KIND_TXT[bad[2]](bad[1])} : moins aimé jusqu’ici` : bad[2] === 'kw' ? `Thème moins aimé : ${bad[1]}` : `Pas trop ${prof.self ? 'ton' : 'son'} truc : ${bad[1]}`) : '';
}

// Ce que le profil a compris, pour l'afficher.
export function top(prof, films, { min = .3 } = {}) {
  const lab = new Map();
  for (const f of films) for (const [k, , label, kind] of feats(f)) if (label && !lab.has(k)) lab.set(k, [label, kind]);
  const rows = [...prof.Pn].filter(([k]) => lab.has(k)).map(([k, v]) => [k, v, ...lab.get(k)]).filter(r => r[3] !== 'dec' || Math.abs(r[1]) > .9);
  const pick = (kinds, sign, m = 4) => rows.filter(r => kinds.includes(r[3]) && (sign > 0 ? r[1] > min : r[1] < -min)).sort((a, b) => sign * (b[1] - a[1])).slice(0, m);
  return {
    people: pick(['dir', 'crea', 'comp', 'dop', 'wri', 'cast'], 1, 6), themes: pick(['kw'], 1, 5), genres: pick(['genre'], 1, 4), langs: pick(['lang', 'dec'], 1, 3),
    dislikes: pick(['genre', 'kw', 'dir', 'crea', 'bo', 'rt'], -1, 4),
  };
}
// Les pistes à donner au serveur pour aller chercher des propositions.
export function prefs(prof) {
  const rows = [...prof.Pn];
  const best = (re, m, sign = 1) => rows.filter(([k, v]) => re.test(k) && sign * v > .2).sort((a, b) => sign * (b[1] - a[1])).slice(0, m).map(([k]) => k.split(':')[1]);
  return { like: best(/^g:/, 3).map(Number), dislike: best(/^g:/, 2, -1).map(Number), langs: best(/^l:(?!en$)/, 2), people: best(/^p:/, 4).map(Number), kws: best(/^k:/, 4).map(Number) };
}

const simKeys = f => new Set(feats(f).filter(([, , , kind]) => kind === 'dir' || kind === 'crea' || kind === 'kw').map(([k]) => k));
// L'ordre des cartes : les mieux notés d'abord, sans enchaîner trois films du même réalisateur, et une carte
// sur quatre tirée au hasard pour continuer d'apprendre (sinon le profil s'enferme dans ce qu'il connaît).
export function order(list, scoreOf, n = list.length, explore = .25) {
  const pool = list.map(f => ({ f, s: scoreOf(f), k: simKeys(f) })).sort((a, b) => b.s - a.s);
  const out = [];
  while (pool.length && out.length < n) {
    let idx = 0;
    if (out.length % 4 === 3 && Math.random() < explore * 4) idx = Math.floor(Math.random() * pool.length);
    else {
      const recent = out.slice(-5);
      let best = -1e9;
      pool.slice(0, 15).forEach((c, i) => {
        const sim = recent.reduce((m, r) => { let x = 0; for (const k of c.k) if (r.k.has(k)) x += k[0] === 'p' ? 1 : .15; return Math.max(m, x); }, 0);
        const v = c.s - .35 * Math.min(2, sim);
        if (v > best) { best = v; idx = i; }
      });
    }
    out.push(pool.splice(idx, 1)[0]);
  }
  return out.map(x => x.f);
}
