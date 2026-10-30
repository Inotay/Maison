// Le réglage personnel de l'algorithme, calculé à part (dans un « worker ») pour ne jamais bloquer l'écran.
// On essaie d'autres valeurs une par une (ce que pèse un bof, la qualité vue par le public, le mélange goût et
// curiosité…) et on garde celles qui devinent le mieux TES avis : tes envies contre tes bofs dans Cinder, et
// l'ordre de tes notes. Chaque essai est vérifié sur des films mis de côté (validation croisée), jamais sur ceux
// qui ont servi à apprendre. Une valeur n'est adoptée que si elle fait vraiment mieux.
import * as T from './taste.js';

const GRILLE = { cBof: [.4, .55, .7, .85, 1], mix: [.6, .75, .9, 1], aBof: [.02, .05, .1, .16], qA: [1.5, 2.25, 3, 4], qC: [1, 2, 3], crA: [1, 2, 3] };

// curiosité : est-ce que les envies passent devant les bofs ? (aire sous la courbe, en %)
function curiosite(films, email, idf) {
  const pos = films.filter(f => !f.ratings?.[email]?.note && T.wants(f.votes?.[email]));
  let neg = films.filter(f => !f.ratings?.[email]?.note && f.votes?.[email] === 'non');
  if (pos.length < 15 || neg.length < 60) return null;   // trop peu d'avis : on garde les valeurs de départ
  if (neg.length > 900) { neg = [...neg].sort((a, b) => (a._h ?? 0) - (b._h ?? 0)).slice(0, 900); }
  const voted = [...pos, ...neg], pred = new Map();
  voted.forEach((f, i) => f._k = i % 3);
  for (let k = 0; k < 3; k++) {
    const hide = new Set(voted.filter(f => f._k === k));
    const p = T.profile(films.filter(f => !hide.has(f)), email, idf);
    for (const f of hide) pred.set(f, T.score(p, f));
  }
  let ok = 0;
  for (const a of pos) for (const b of neg) { const d = pred.get(a) - pred.get(b); ok += d > 0 ? 1 : d === 0 ? .5 : 0; }
  return ok / (pos.length * neg.length) * 100;
}

// chaque valeur se juge sur ce qu'elle change : la curiosité (Cinder) ou l'ordre des notes
const QUOI = { cBof: 'c', mix: 'c', qC: 'c', aBof: 'n', qA: 'n', crA: 'n' };
self.onmessage = ({ data }) => {
  const { films, email, depart } = data;
  try {
    films.forEach((f, i) => f._h = (i * 2654435761) % 4294967296);   // un ordre fixe pour l'échantillon de bofs
    const idf = T.rarity(films);
    let w = { ...T.W, ...(depart || {}) };
    const juge = { c: () => curiosite(films, email, idf), n: () => { const a = T.accuracy(films, email, idf); return a && a.n >= 40 ? a.acc * 100 : null; } };
    // l'exigence dépend de la quantité d'avis : avec peu de données, un petit mieux peut être du hasard
    const nPos = films.filter(f => !f.ratings?.[email]?.note && T.wants(f.votes?.[email])).length, nNotes = films.filter(f => f.ratings?.[email]?.note).length;
    const seuil = { curiosite: Math.max(.4, 8 / Math.sqrt(Math.max(1, nPos))), notes: Math.max(.4, 12 / Math.sqrt(Math.max(1, nNotes))) };
    T.setReglage(email, w);
    const avant = { curiosite: juge.c(), notes: juge.n() };
    if (avant.curiosite == null && avant.notes == null) { self.postMessage({ ok: false, raison: 'pas assez d’avis' }); return; }
    const best = { ...avant };
    let change = false;
    for (let passe = 0; passe < 2; passe++) {
      let bouge = false;
      for (const [k, vals] of Object.entries(GRILLE)) {
        const m = QUOI[k] === 'c' ? 'curiosite' : 'notes'; if (best[m] == null) continue;
        for (const v of vals) {
          if (v === w[k]) continue;
          const essai = { ...w, [k]: v };
          T.setReglage(email, essai);
          const r = juge[QUOI[k]]();
          // une valeur n'est adoptée que si elle fait vraiment mieux (sinon c'est peut-être du hasard)
          if (r != null && r > best[m] + seuil[m]) { best[m] = r; w = essai; bouge = change = true; }
        }
        T.setReglage(email, w);
      }
      if (!bouge) break;
    }
    self.postMessage({ ok: true, adopte: change, w: change ? Object.fromEntries(Object.keys(GRILLE).map(k => [k, w[k]])) : (depart || null), avant, apres: best });
  } catch (e) { self.postMessage({ ok: false, raison: String(e?.message || e) }); }
};
