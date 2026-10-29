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
  // le studio (Ghibli, A24…) dit beaucoup ; la saga, juste un peu (chaque film d'une saga reste jugé pour lui-même)
  for (const c of t.co || []) add(m, 's:' + c.id, 1.2, c.name, 'studio');
  if (t.col) add(m, 'col:' + t.col.id, .6, t.col.name, 'saga');
  // films et séries ne se jugent pas pareil : le genre compte aussi « dans les séries » ou « dans les films »
  add(m, 'm:' + f.media, .8, f.media === 'tv' ? 'les séries' : 'les films', 'media');
  for (const g of f.gids || []) { const id = TV2M[g] || g; if (GENRES[id]) add(m, `gm:${id}:${f.media}`, .35, '', 'gm'); }
  return [...m].map(([k, [w, label, kind]]) => [k, w, label, kind]);
}

export const wants = v => v === 'oui' || v === 'super';
// Chacun note à sa façon : quelqu'un qui ne met presque jamais moins de 3 veut dire « décevant » par un 3.
// On lit donc chaque note par rapport à la moyenne et à l'écart de la personne. Et comme les « bof » sont souvent
// bien plus nombreux que les envies, leur poids total est ramené à celui des avis positifs.
const STATS = {};
export function stats(films, email) {
  const rs = films.map(f => f.ratings?.[email]?.note).filter(Boolean);
  const n = rs.length, mu = n ? rs.reduce((a, b) => a + b, 0) / n : 3;
  const sd = n > 1 ? Math.sqrt(rs.reduce((a, b) => a + (b - mu) ** 2, 0) / (n - 1)) : 1.2;
  let pos = 0, bof = 0;
  for (const f of films) { const v = f.votes?.[email]; if (f.ratings?.[email]?.note) continue; if (wants(v)) pos++; else if (v === 'non') bof++; }
  pos += rs.filter(r => r > mu).length;
  const st = n >= 10 ? { mu, sd: Math.max(.6, sd), n } : { mu: 3, sd: 1.2, n };
  st.bof = bof > pos * 1.5 ? (pos * 1.5) / bof : 1;
  return (STATS[email] = st);
}
// Ce qu'un film dit du goût de quelqu'un, d'environ -3 (détesté) à +5 (coup de cœur adoré). Les avis anciens
// comptent un peu moins que les récents (le goût bouge), mais jamais moins de la moitié.
export function signal(f, email, now = Date.now(), st = STATS[email] || { mu: 3, sd: 1.2, bof: 1 }) {
  const r = f.ratings?.[email]?.note, v = f.votes?.[email];
  let w = 0;
  if (r) w = Math.max(-3.2, Math.min(2.8, ((r - st.mu) / st.sd + .35) * 1.25));
  else if (v === 'super') w = W.aSuper;      // ⭐ très envie
  else if (v === 'oui') w = W.aOui;
  else if (v === 'non') w = -W.aBof * st.bof;   // bof : pas intéressé (ça dit peu de ce qu'on aimerait)
  else if (v === 'beurk') w = -1.6;   // non ! : je n'aime pas ce genre de film
  if ((f.coeur || []).includes(email)) w = Math.max(w, 0) + 2.5;
  return w * age(f, email, now);
}
const age = (f, email, now) => { const at = Date.parse(f.ratings?.[email]?.at || f.seen_at || f.created_at || ''); return at ? Math.max(.5, Math.pow(.5, (now - at) / (8 * 365 * 864e5))) : 1; };
// Deux questions différentes : « est-ce que ça m'attire ? » (la curiosité, ce que Cinder demande) et « est-ce que
// je vais l'aimer ? » (le goût, ce que disent les notes). Un film qu'on a regardé, même moyen, nous attirait.
export const W = { aSuper: 1, aOui: .5, aBof: .05, cBof: 1, mix: .9 };   // réglés sur vos avis (v172)
export function curiosity(f, email, now = Date.now(), st = STATS[email] || { mu: 3, sd: 1.2, bof: 1 }) {
  const r = f.ratings?.[email]?.note, v = f.votes?.[email];
  let c = 0;
  if (r) c = .6 + .35 * (r - st.mu) / st.sd;
  else if (f.seen?.[email]) c = .5;
  else if (v === 'super') c = 2;
  else if (v === 'oui') c = 1;
  else if (v === 'non') c = -W.cBof * st.bof;   // bof : pas intéressé, pas curieux d'en savoir plus
  else if (v === 'beurk') c = -1.6;
  if ((f.coeur || []).includes(email)) c += 1;
  return c * age(f, email, now);
}
// Le goût du couple : les films vus ensemble et notés par les deux, à la moyenne de vos deux notes.
export function coupleSignal(f, a, b) {
  const x = f.ratings?.[a]?.note, y = f.ratings?.[b]?.note;
  return f.status === 'vu' && x && y ? ((x + y) / 2 - 3) * 1.25 : 0;
}

// La rareté de chaque trait dans tout ce qu'on connaît (vos films et les propositions).
export function rarity(list) {
  const df = new Map(); let n = 0;
  for (const f of list) { n++; for (const [k] of feats(f)) df.set(k, (df.get(k) || 0) + 1); }
  return k => /^(p|k|s|col):/.test(k) ? 1 + Math.log((1 + n) / (1 + (df.get(k) || 0))) * .5 : 1;
}

// manual : les réglages à la main { boost: {clé: libellé}, ban: {clé: libellé} } ; sig : pour le couple.
// Un « bof » juge l'histoire et l'affiche, pas l'équipe : il pèse peu sur les réalisateurs, acteurs et studios
// (on peut ne pas être curieux d'un film d'un cinéaste qu'on adore par ailleurs).
const PEOPLE = new Set(['dir', 'crea', 'wri', 'comp', 'dop', 'cast', 'studio']);
export function profile(films, email, idf = () => 1, manual = {}, sig = signal) {
  const P = new Map(), N = new Map(), C = new Map(), NC = new Map(), liked = new Map(); let n = 0, pos = 0, neg = 0;
  const now = Date.now(), st = stats(films, email), solo = sig === signal;
  const xs = [];
  for (const f of films) {
    const w = sig(f, email, now, st), c = solo ? curiosity(f, email, now, st) : 0; if (!w && !c) continue;
    n++; (w || c) > 0 ? pos++ : neg++;
    const bof = solo && !f.ratings?.[email]?.note && f.votes?.[email] === 'non';
    if (f.note && f.ratings?.[email]?.note) xs.push([f.note - 6.8, w]);
    for (const [k, fw, label, kind] of feats(f)) {
      const damp = bof && PEOPLE.has(kind) ? .35 : 1;
      if (w) { P.set(k, (P.get(k) || 0) + w * damp * fw * idf(k)); N.set(k, (N.get(k) || 0) + 1); }
      if (c) { C.set(k, (C.get(k) || 0) + c * damp * fw * idf(k)); NC.set(k, (NC.get(k) || 0) + 1); }
      if (w >= 1.2 && (kind === 'studio' || kind === 'saga' || kind === 'dir' || kind === 'crea' || kind === 'comp' || kind === 'dop' || kind === 'wri' || kind === 'cast' || kind === 'kw')) { const l = liked.get(k) || []; if (l.length < 3) l.push(f.title); liked.set(k, l); }
    }
  }
  const Pn = new Map([...P].map(([k, v]) => [k, v / Math.sqrt(N.get(k) + 1)]));
  const Cn = new Map([...C].map(([k, v]) => [k, v / Math.sqrt(NC.get(k) + 1)]));
  // une consigne explicite (« plus de ça », « jamais ça ») pèse plus que vingt avis
  for (const k of Object.keys(manual.boost || {})) Pn.set(k, Math.max(0, Pn.get(k) || 0) + 2.5);
  for (const k of Object.keys(manual.ban || {})) Pn.set(k, -6);
  // ton rapport à la note du public (TMDB) : appris sur tes propres notes, au lieu d'un bonus fixe
  let beta = .25;
  if (xs.length >= 15) { const mx = xs.reduce((a, [x]) => a + x, 0) / xs.length, my = xs.reduce((a, [, y]) => a + y, 0) / xs.length;
    const cov = xs.reduce((a, [x, y]) => a + (x - mx) * (y - my), 0), vx = xs.reduce((a, [x]) => a + (x - mx) ** 2, 0);
    if (vx > 0) beta = Math.max(-.15, Math.min(.45, (cov / vx) * .5)); }
  for (const k of Object.keys(manual.boost || {})) Cn.set(k, Math.max(0, Cn.get(k) || 0) + 2.5);
  for (const k of Object.keys(manual.ban || {})) Cn.set(k, -6);
  return { email, n, pos, neg, Pn, Cn, liked, idf, ban: new Set(Object.keys(manual.ban || {})), manual, beta, st };
}

// Le score d'un film pour quelqu'un : ses traits pondérés par le profil, la qualité (note TMDB), et un bonus
// quand plusieurs films que vous aimez le recommandent (le plus proche d'un « ceux qui aiment ça ont adoré »).
// mix : 0 = seulement « vais-je l'aimer ? », 1 = seulement « est-ce que ça m'attire ? ».
export function score(prof, f, mix = W.mix) {
  const extra = (f.note ? (f.note - 6.8) * (prof?.beta ?? .25) : 0) + (f.reco > 1 ? .5 * Math.log2(f.reco) : 0);
  if (!prof || (!prof.n && !prof.ban?.size)) return extra;
  let a = 0, c = 0, norm = 0, banned = false;
  const useC = prof.Cn?.size ? mix : 0;
  for (const [k, fw] of feats(f)) { const w = fw * prof.idf(k); norm += w * w; a += w * (prof.Pn.get(k) || 0); if (useC) c += w * (prof.Cn.get(k) || 0); if (prof.ban?.has(k)) banned = true; }
  const s = norm ? ((1 - useC) * a + useC * c) / Math.sqrt(norm) : 0;
  const conf = Math.min(1, prof.n / 25);
  return s * (.4 + .6 * conf) + extra - (banned ? 8 : 0);
}
// Pour vous deux : un film que l'un adore et que l'autre déteste n'est pas un bon choix commun.
// Le goût du couple (vos notes communes) s'ajoute quand il y en a assez.
export const scoreBoth = (a, b, f, c, mix = W.mix) => { const x = score(a, f, mix), y = score(b, f, mix); return Math.min(x, y) * .6 + (x + y) / 2 * .4 + (c?.n >= 3 ? score(c, f, 0) * .3 : 0); };
export const banned = (prof, f) => !!prof?.ban?.size && feats(f).some(([k]) => prof.ban.has(k));

// La précision d'Azami : on cache une partie des notes, on devine, on compare (5 tours). Résultat : la part
// des paires de films (notés différemment) qu'Azami remet dans le bon ordre. 50 % = au hasard.
export function accuracy(films, email, idf, manual = {}) {
  const rated = films.filter(f => f.ratings?.[email]?.note);
  if (rated.length < 12) return null;
  const folds = 5, pred = new Map();
  rated.forEach((f, i) => f._fold = i % folds);
  for (let k = 0; k < folds; k++) {
    const hide = new Set(rated.filter(f => f._fold === k));
    const p = profile(films.filter(f => !hide.has(f)), email, idf, manual);
    for (const f of hide) pred.set(f, score(p, f, 0));
  }
  let ok = 0, all = 0;
  for (let i = 0; i < rated.length; i++) for (let j = i + 1; j < rated.length; j++) {
    const a = rated[i], b = rated[j], da = a.ratings[email].note - b.ratings[email].note; if (!da) continue;
    const dp = pred.get(a) - pred.get(b); all++; if (dp && Math.sign(dp) === Math.sign(da)) ok++; else if (!dp) ok += .5;
  }
  rated.forEach(f => delete f._fold);
  return all ? { acc: ok / all, n: rated.length } : null;
}

const KIND_TXT = { dir: n => `De ${n}`, crea: n => `Créée par ${n}`, wri: n => `Écrit par ${n}`, comp: n => `Musique de ${n}`, dop: n => `Image de ${n}`, cast: n => `Avec ${n}`, studio: n => `Produit par ${n}`, saga: n => `La saga ${n}` };
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
    people: pick(['dir', 'crea', 'comp', 'dop', 'wri', 'cast', 'studio'], 1, 6), themes: pick(['kw'], 1, 5), genres: pick(['genre'], 1, 4), langs: pick(['lang', 'dec'], 1, 3),
    dislikes: pick(['genre', 'kw', 'dir', 'crea', 'bo', 'rt'], -1, 4),
  };
}
// Les pistes à donner au serveur pour aller chercher des propositions.
export function prefs(prof) {
  const rows = [...prof.Pn];
  const best = (re, m, sign = 1) => rows.filter(([k, v]) => re.test(k) && sign * v > .2).sort((a, b) => sign * (b[1] - a[1])).slice(0, m).map(([k]) => k.split(':')[1]);
  return { like: best(/^g:/, 3).map(Number), dislike: best(/^g:/, 2, -1).map(Number), langs: best(/^l:(?!en$)/, 2), people: best(/^p:/, 4).map(Number), kws: best(/^k:/, 4).map(Number), cos: best(/^s:/, 2).map(Number) };
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
