// Le jeu de Ciné Azami (pour Yatoni et Mariana dans l'app, et pour les amis sur leur page) : des points à chaque
// avis, des combos quand on enchaîne, un objectif du jour avec son coffre, une série de jours, un niveau de
// cinéphile, et une fête à chaque match. Fonctions pures : chaque page garde l'état où elle veut (réglages de la
// maison, compte de l'ami) et dessine la fête à sa façon. Jamais de classement entre les personnes.
export const OBJECTIF = 10;           // films triés par jour pour ouvrir le coffre
export const COFFRE = 100;            // points du coffre
export const MATCH = 50;              // points d'un match
export const COMBO_S = 9;             // secondes max entre deux avis pour garder l'élan
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
// l'élan, en trois chaleurs (0 : rien, 1 : ça chauffe, 2 : chaud, 3 : en feu) et un mot aux paliers seulement
export const chaleur = c => c >= 8 ? 3 : c >= 5 ? 2 : c >= 3 ? 1 : 0;
// aux paliers de l'élan, le cri est suivi d'un « ×5 », « ×10 »… (sinon rien)
export const elanMot = c => c >= 5 && (c === 5 || c % 5 === 0) ? `×${c}` : '';
// Les cris du jeu, façon jeu de combat (ou Trombone Champ) : un mot qui claque à chaque avis, selon ce qu'on a dit.
// Envie, très envie, bof, non, et pour un film vu : selon la note. Jamais deux fois le même mot de suite.
export const CRIS = {
  oui: ['Nice !', 'Tasty !', 'Likky !', 'Netflix and chill !', 'Badaboom !', 'Kachow !', 'Miam !', 'Yummy !', 'Oh yeah !', 'Banger !', 'Pop-corn !', 'Yes yes yes !', 'Chef’s kiss !', 'Wouhou !', 'Crunch !', 'Groovy !', 'Bingo !', 'Zoom zoom !', 'Boom !', 'Dingue !', 'Yay !', 'Sweet !', 'Hop là !', 'Ça claque !', 'Wow !', 'Spicy !', 'Jackpot !', 'Okiii !', 'Miaou !', 'Slurp !', 'Youpi !', 'Vroum !', 'Chaud chaud !', 'Gimme !', 'Hmm hmm !', 'Croustillant !', 'Ding ding !', 'Paf !', 'Let’s go !', 'Tchac !'],
  super: ['MEGA !', 'LEGENDARY !', 'SUPERSTAR !', 'KABOOM !', 'Holy moly !', 'Coup de foudre !', 'OMG !', 'Purrrfect !', 'Masterpiece !', 'HYPE !', 'Bombe !', 'Waouh waouh !', 'GOAL !', 'Feu d’artifice !', 'ULTRA !', 'Banzaï !', 'Je veux, je veux !', 'Mamma mia !', 'Ka-ching !', 'Explosion !', 'Big love !', 'Turbo !', 'Ooooh yes !', 'Kawaii !', 'Wahou !'],
  non: ['Nop !', 'UhUh !', 'Ikky !', 'NoNo !', 'Yok !', 'Bof bof !', 'Nan !', 'Pfff !', 'Bye bye !', 'Next !', 'Meh !', 'Nein !', 'Hmm non !', 'Skip !', 'Zut !', 'Nope nope !', 'Sniff !', 'Pas pour moi !', 'Ciao !', 'Pschitt !', 'Oof !', 'Zzz !', 'Mouif !', 'Au suivant !', 'Pas ce soir !', 'Niet !', 'Plop !', 'Hop, à la poubelle !', 'Pouet !', 'KaKa !', 'PooPoo !'],
  beurk: ['YUCK !', 'Jamais !', 'Burk burk !', 'Au secours !', 'Nooon !', 'Berk !', 'Horreur !', 'Pouah !', 'Fuyez !', 'Beurk !', 'Même pas en rêve !', 'Gloups !', 'Aaargh !', 'AïeAïeAïe !', 'Interdit !', 'KaKa !', 'PooPoo !', 'Pouet pouet !'],
  vuTop: ['Hehe !', 'KnowDat !', 'Classique !', 'Culte !', 'Respect !', 'Iconique !', 'Old but gold !', 'Bien vu !', 'Ahh celui-là !', 'Légende !', 'Chef-d’œuvre !', 'Le goût !', 'Validé !', 'Tu connais !', 'Grand cru !', 'Frissons !'],
  vuMoyen: ['WawaWiwa !', 'Ok ok !', 'Pas mal !', 'Mouais !', 'Correct !', 'Sympa !', 'Ça passe !', 'Comme ci comme ça !', 'Bof-ish !', 'Moyennement !', 'Mi-figue !', 'Tiède !', 'Pourquoi pas !'],
  vuBas: ['Eurk !', 'OuLala !', 'Aïe !', 'Ouch !', 'Raté !', 'Rendez-moi mes 2 h !', 'Bouh !', 'Plouf !', 'Snif !', 'Oof !', 'AïeAïeAïe !', 'Ça pique !', 'Navet !', 'Oups !', 'Glagla !', 'KaKa !', 'Pouet !', 'PooPoo !'],
  vu: ['Hehe !', 'KnowDat !', 'Déjà vu !', 'Check !', 'Coché !', 'Vu et revu !', 'Je connais !', 'Done !'],
};
const derniers = [];
// le cri d'un avis, et son genre (pour la couleur) : oui, super, non, beurk, vu-top, vu-moyen, vu-bas
export function cri(vote, note) {
  const g = vote === 'vu' ? (note >= 4 ? 'vuTop' : note >= 2.5 ? 'vuMoyen' : note > 0 ? 'vuBas' : 'vu') : CRIS[vote] ? vote : 'oui';
  const l = CRIS[g].filter(m => !derniers.includes(m));
  const m = l[Math.floor(Math.random() * l.length)] || CRIS[g][0];
  derniers.push(m); if (derniers.length > 8) derniers.shift();
  return { mot: m, genre: g };
}
// Le montrer : le mot en gros au milieu de l'écran, chaque lettre tremble à sa façon (plus fort quand l'élan monte),
// les points en petit dessous. Même dessin dans l'app et sur la page des amis (styles .cri dans leurs feuilles).
export function afficherCri(host, { mot, genre, points = '', chaleur = 0, palier = '' }) {
  host.querySelectorAll(':scope > .cri').forEach(x => x.remove());
  const el = document.createElement('div'); el.className = `cri g-${genre} c${chaleur}`; el.setAttribute('aria-hidden', 'true');
  el.style.setProperty('--r', `${(Math.random() * 16 - 8).toFixed(1)}deg`); el.style.setProperty('--n', String(Math.max(6, [...mot].length)));
  const w = document.createElement('div'); w.className = 'cri-mot';
  [...mot].forEach((ch, i) => { const sp = document.createElement('span'); sp.textContent = ch; sp.style.setProperty('--d', `${(-Math.random() * .4).toFixed(2)}s`); sp.style.setProperty('--i', i); w.appendChild(sp); });
  el.appendChild(w);
  if (points || palier) { const p = document.createElement('div'); p.className = 'cri-pts'; p.textContent = [points, palier].filter(Boolean).join('  '); el.appendChild(p); }
  host.appendChild(el); setTimeout(() => el.remove(), 1300);
  return el;
}
// deux appareils : on garde le plus avancé (et le plus récent pour la série du jour)
export function fusion(a, b) {
  const x = propre(a), y = propre(b);
  const r = x.maj >= y.maj ? { ...x } : { ...y };
  r.xp = Math.max(x.xp, y.xp); r.record = Math.max(x.record, y.record); r.matchs = Math.max(x.matchs, y.matchs);
  return r;
}
