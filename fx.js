// Maison : petites récompenses. Particules, rebonds et mots gentils quand on a fait quelque chose.
// Tout passe par une couche fixe au-dessus de l'app, donc rien ne gêne le rendu de la liste.

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const C = { bleu: '#9CC4E4', creme: '#F3EBDF', lampe: '#F0B65A', rouge: '#E8907A', fauve: '#B8A48F' };

let layer = null;
function fxLayer() {
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'fx';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
  }
  return layer;
}

function spawn(x, y, html, style, keyframes, ms, easing = 'cubic-bezier(.2,.7,.2,1)') {
  const el = document.createElement('span');
  el.className = 'fx-p';
  el.innerHTML = html;
  Object.assign(el.style, { left: x + 'px', top: y + 'px' }, style);
  fxLayer().appendChild(el);
  const a = el.animate(keyframes, { duration: ms, easing, fill: 'forwards' });
  a.onfinish = () => el.remove();
  setTimeout(() => el.remove(), ms + 200);
}

// Étincelles : pour un article coché, une tâche faite.
function sparkle(x, y, n = 10) {
  for (let i = 0; i < n; i++) {
    const ang = rnd(0, Math.PI * 2), d = rnd(28, 70), s = rnd(10, 18);
    spawn(x, y, '✦', { color: i % 3 ? C.creme : C.bleu, fontSize: s + 'px' }, [
      { transform: 'translate(-50%,-50%) scale(0) rotate(0deg)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(ang) * d * .6}px), calc(-50% + ${Math.sin(ang) * d * .6}px)) scale(1.2) rotate(40deg)`, opacity: 1, offset: .4 },
      { transform: `translate(calc(-50% + ${Math.cos(ang) * d}px), calc(-50% + ${Math.sin(ang) * d}px)) scale(0) rotate(90deg)`, opacity: 0 },
    ], rnd(500, 750));
  }
}

// Confettis : corvée faite, liste terminée.
function confetti(x, y, n = 26) {
  const cols = [C.bleu, C.creme, C.lampe, C.rouge];
  for (let i = 0; i < n; i++) {
    const ang = rnd(-Math.PI * .95, -Math.PI * .05), v = rnd(90, 190), w = rnd(5, 9), h = rnd(8, 14);
    const dx = Math.cos(ang) * v, dy = Math.sin(ang) * v;
    spawn(x, y, '', { width: w + 'px', height: h + 'px', background: pick(cols), borderRadius: '2px' }, [
      { transform: `translate(-50%,-50%) rotate(${rnd(0, 360)}deg)`, opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${rnd(180, 540)}deg)`, opacity: 1, offset: .45 },
      { transform: `translate(calc(-50% + ${dx * 1.25}px), calc(-50% + ${dy + 220}px)) rotate(${rnd(360, 900)}deg)`, opacity: 0 },
    ], rnd(900, 1300), 'cubic-bezier(.15,.6,.4,1)');
  }
}

// Pièces : un remboursement, une dépense ajoutée.
function coins(x, y, n = 12) {
  for (let i = 0; i < n; i++) {
    const dx = rnd(-110, 110), up = rnd(-150, -60), s = rnd(10, 16);
    spawn(x, y, '', { width: s + 'px', height: s + 'px', borderRadius: '50%', background: C.lampe, boxShadow: `inset 0 0 0 2.5px #C98A2E, inset 0 0 0 4px ${C.lampe}` }, [
      { transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx * .6}px), calc(-50% + ${up}px)) scale(1)`, opacity: 1, offset: .4 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${up + 260}px)) scale(.9)`, opacity: 0 },
    ], rnd(800, 1100), 'cubic-bezier(.2,.5,.5,1)');
  }
}

// Cœurs : un mot déposé, un match.
function hearts(x, y, n = 12) {
  for (let i = 0; i < n; i++) {
    const dx = rnd(-70, 70), up = rnd(-120, -220), s = rnd(12, 24);
    spawn(x, y, '♥', { color: i % 2 ? C.rouge : C.bleu, fontSize: s + 'px' }, [
      { transform: 'translate(-50%,-50%) scale(0)', opacity: 0 },
      { transform: `translate(calc(-50% + ${dx * .3}px), calc(-50% + ${up * .3}px)) scale(1.15)`, opacity: 1, offset: .25 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${up}px)) scale(.8)`, opacity: 0 },
    ], rnd(1000, 1500));
  }
}

// Pattes : tout ce qui concerne Azami.
function paws(x, y, n = 6) {
  for (let i = 0; i < n; i++) {
    const dx = rnd(-60, 60), up = rnd(-70, -130);
    spawn(x, y, '🐾', { fontSize: rnd(13, 20) + 'px' }, [
      { transform: 'translate(-50%,-50%) scale(0) rotate(-20deg)', opacity: 0 },
      { transform: `translate(calc(-50% + ${dx * .4}px), calc(-50% + ${up * .4}px)) scale(1) rotate(10deg)`, opacity: 1, offset: .3 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${up}px)) scale(.7) rotate(-10deg)`, opacity: 0 },
    ], rnd(900, 1300));
  }
}

const KINDS = { sparkle, confetti, coins, hearts, paws };

// Point de départ : le centre de l'élément touché, sinon le milieu de l'écran.
function at(el) {
  if (el && el.getBoundingClientRect) {
    const r = el.getBoundingClientRect();
    if (r.width || r.height) return [r.left + r.width / 2, r.top + r.height / 2];
  }
  return [innerWidth / 2, innerHeight * .4];
}

export function burst(kind, el, n) {
  if (reduced()) return;
  const [x, y] = at(el);
  (KINDS[kind] || sparkle)(x, y, n);
  try { navigator.vibrate?.(kind === 'confetti' ? [10, 30, 10] : 8); } catch {}
}

// Azami sursaute de joie (l'image de la page en cours).
export function azamiJump() {
  if (reduced()) return;
  const img = document.querySelector('img.azami');
  if (!img) return;
  img.classList.remove('jump'); void img.offsetWidth; img.classList.add('jump');
  setTimeout(() => img.classList.remove('jump'), 900);
}

// Fait rebondir un élément (ligne cochée, carte solde…) après le rendu.
export function pop(el) {
  if (!el || reduced()) return;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  setTimeout(() => el.classList.remove('pop'), 700);
}

// Mots gentils, jamais deux fois le même d'affilée.
const SAID = {};
export function praise(kind) {
  const lists = {
    task: ['Et hop.', 'Une de moins.', 'Bien joué.', 'Azami approuve.', 'Propre.', 'Ça, c\'est fait.', 'Joli.', 'Boum.'],
    all: ['Tout est fait. Azami fait la sieste.', 'Plus rien à faire. Vraiment.', 'Liste vide, tête légère.'],
    chore: ['Merci !', 'Héros du ménage.', 'Azami ronronne.', 'Ça brille.', 'Quel appartement.', 'Respect.'],
    shop: ['Dans le panier.', 'Hop.', 'Trouvé.', 'Coché.', 'Nickel.'],
    basket: ['Panier complet. Rentrez vite.', 'Tout est trouvé, bravo.', 'Courses terminées.'],
    settle: ['Vous êtes quittes. Rien n\'est effacé.', 'Comptes à zéro, comme neufs.'],
    expense: ['Noté.', 'C\'est compté.', 'Dans les comptes.'],
    care: ['Déposé avec soin.', 'Dans sa boîte.', 'C\'est dit, doucement.'],
    match: ['Vous en avez envie tous les deux.'],
  };
  const l = lists[kind] || lists.task;
  let m = pick(l);
  if (l.length > 1 && m === SAID[kind]) m = pick(l.filter(x => x !== m));
  SAID[kind] = m;
  return m;
}
