// Le jeu de Ciné Azami (pour Yatoni et Mariana dans l'app, et pour les amis sur leur page) : des points à chaque
// avis, des combos quand on enchaîne, un objectif du jour avec son coffre, une série de jours, un niveau de
// cinéphile, et une fête à chaque match. Fonctions pures : chaque page garde l'état où elle veut (réglages de la
// maison, compte de l'ami) et dessine la fête à sa façon. Jamais de classement entre les personnes.
export const OBJECTIF = 10;           // films triés par jour pour ouvrir le coffre
export const COFFRE = 100;            // points du coffre
export const MATCH = 50;              // points d'un match
const COMBO_S = 9;                    // secondes max entre deux avis pour garder le combo
const jourDe = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const veille = j => { const d = new Date(j + 'T12:00'); d.setDate(d.getDate() - 1); return jourDe(d.getTime()); };

// niveau n : il faut 100 × n(n−1)/2 points (0, 100, 300, 600, 1000…)
export const seuil = n => 50 * n * (n - 1);
export function niveau(xp = 0) { let n = 1; while (seuil(n + 1) <= xp) n++; return n; }
export function titre(n) { return n >= 16 ? 'Cinémathèque' : n >= 12 ? 'Programmateur' : n >= 8 ? 'Critique' : n >= 5 ? 'Cinéphile' : n >= 3 ? 'Habitué' : 'Spectateur'; }
export function progres(xp = 0) { const n = niveau(xp), a = seuil(n), b = seuil(n + 1); return { n, titre: titre(n), pct: Math.round(100 * (xp - a) / (b - a)), reste: b - xp }; }

export const neuf = () => ({ xp: 0, serie: 0, jour: '', n: 0, coffre: '', dernier: 0, combo: 0, record: 0, matchs: 0, maj: 0 });
export function propre(e) {
  const x = { ...neuf(), ...(e && typeof e === 'object' ? e : {}) };
  for (const k of ['xp', 'serie', 'n', 'dernier', 'combo', 'record', 'matchs', 'maj']) x[k] = Math.max(0, Math.min(k === 'dernier' || k === 'maj' ? 1e13 : 1e9, Math.floor(Number(x[k]) || 0)));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x.jour)) x.jour = '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x.coffre)) x.coffre = '';
  return x;
}
// la série tient si on a joué hier ou aujourd'hui
export function serieDuJour(e, t = Date.now()) { const j = jourDe(t); return e.jour === j || e.jour === veille(j) ? e.serie : 0; }
export function aujourdhui(e, t = Date.now()) { return e.jour === jourDe(t) ? e.n : 0; }

// Un avis donné (vote : 'oui', 'super', 'non', 'vu'). Rend le nouvel état et ce qu'il faut fêter.
export function avis(e0, vote, { match = false, t = Date.now() } = {}) {
  const e = propre(e0), j = jourDe(t), f = { gain: 0, combo: 0, coffre: false, niveau: 0, serie: 0, match };
  const avant = niveau(e.xp);
  // la série de jours
  if (e.jour !== j) { e.serie = e.jour === veille(j) ? e.serie + 1 : 1; e.jour = j; e.n = 0; f.serie = e.serie; }
  e.n++;
  // le combo : des avis qui s'enchaînent sans traîner
  e.combo = t - e.dernier <= COMBO_S * 1000 ? e.combo + 1 : 1; e.dernier = t;
  e.record = Math.max(e.record, e.combo);
  f.combo = e.combo;
  f.gain = (vote === 'vu' ? 15 : 10) + Math.min(25, 5 * Math.max(0, e.combo - 2));
  if (match) { f.gain += MATCH; e.matchs++; }
  // l'objectif du jour : le coffre s'ouvre une fois
  if (e.n >= OBJECTIF && e.coffre !== j) { e.coffre = j; f.coffre = true; f.gain += COFFRE; }
  e.xp += f.gain;
  const apres = niveau(e.xp); if (apres > avant) f.niveau = apres;
  e.maj = t;
  return { e, f };
}
// deux appareils : on garde le plus avancé (et le plus récent pour la série du jour)
export function fusion(a, b) {
  const x = propre(a), y = propre(b);
  const r = x.maj >= y.maj ? { ...x } : { ...y };
  r.xp = Math.max(x.xp, y.xp); r.record = Math.max(x.record, y.record); r.matchs = Math.max(x.matchs, y.matchs);
  return r;
}
