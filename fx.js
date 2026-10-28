// Maison : petites récompenses. Particules, rebonds et mots gentils quand on a fait quelque chose.
// Tout passe par une couche fixe au-dessus de l'app, donc rien ne gêne le rendu de la liste.

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const C = { bleu: '#1E2F3F', creme: '#FFFFFF', lampe: '#F2C14E', rouge: '#E8907A', fauve: '#B8A48F' };

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
    spawn(x, y, '✦', { color: i % 3 ? C.lampe : C.creme, fontSize: s + 'px' }, [
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

// Retour haptique. Android : vibration. iPhone : Safari n'a pas l'API vibration, mais un
// interrupteur natif (<input type="checkbox" switch>) déclenche le moteur haptique quand on
// le bascule dans un geste de l'utilisateur ; on en cache un et on le bascule.
let hapSwitch = null;
function hapticSwitch() {
  if (!hapSwitch) {
    const lab = document.createElement('label');
    lab.style.cssText = 'position:fixed;left:-100px;top:-100px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
    lab.setAttribute('aria-hidden', 'true');
    const inp = document.createElement('input');
    inp.type = 'checkbox'; inp.setAttribute('switch', ''); inp.tabIndex = -1;
    lab.appendChild(inp); document.body.appendChild(lab);
    hapSwitch = inp;
  }
  return hapSwitch;
}
export function haptic(level = 'light') {
  const pattern = { light: [10], medium: [18, 40, 18], heavy: [30, 50, 30, 50, 60] }[level] || [10];
  try { if (navigator.vibrate && navigator.vibrate(pattern)) return; } catch {}
  try {
    const sw = hapticSwitch();
    const pulses = { light: 1, medium: 2, heavy: 3 }[level] || 1;
    sw.click(); // dans le geste lui-même : c'est ce qui déclenche le moteur haptique d'iOS
    for (let i = 1; i < pulses; i++) setTimeout(() => sw.click(), i * 90);
  } catch {}
}

// « +1 » qui s'envole depuis le point touché.
export function floatUp(el, text = '+1') {
  if (reduced()) return;
  const [x, y] = at(el);
  spawn(x, y - 10, text, { color: C.lampe, fontSize: '22px', fontWeight: '900', textShadow: '0 2px 0 rgba(0,0,0,.35)' }, [
    { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 },
    { transform: 'translate(-50%,-90%) scale(1.25)', opacity: 1, offset: .25 },
    { transform: 'translate(-50%,-260%) scale(1)', opacity: 0 },
  ], 1100, 'cubic-bezier(.2,.8,.3,1)');
}

// Anneau qui s'élargit autour de la case cochée.
export function ring(el) {
  if (reduced()) return;
  const [x, y] = at(el);
  spawn(x, y, '', { width: '30px', height: '30px', borderRadius: '50%', border: `4px solid ${C.lampe}` }, [
    { transform: 'translate(-50%,-50%) scale(.6)', opacity: 1 },
    { transform: 'translate(-50%,-50%) scale(3.2)', opacity: 0 },
  ], 520, 'cubic-bezier(.1,.7,.3,1)');
}

// Pluie de confettis depuis le haut de l'écran.
function rain(n = 70) {
  for (let i = 0; i < n; i++) {
    const x = rnd(0, innerWidth), w = rnd(6, 11), h = rnd(10, 18), delay = rnd(0, 500);
    const cols = [C.lampe, '#FFFFFF', C.rouge, '#1E2F3F', '#9CC4E4'];
    setTimeout(() => spawn(x, -20, '', { width: w + 'px', height: h + 'px', background: pick(cols), borderRadius: '2px' }, [
      { transform: `translate(-50%,0) rotate(${rnd(0, 360)}deg)`, opacity: 1 },
      { transform: `translate(${rnd(-80, 80)}px, ${innerHeight * .55}px) rotate(${rnd(360, 1080)}deg)`, opacity: 1, offset: .7 },
      { transform: `translate(${rnd(-120, 120)}px, ${innerHeight + 40}px) rotate(${rnd(720, 1440)}deg)`, opacity: .6 },
    ], rnd(1400, 2200), 'cubic-bezier(.2,.4,.6,1)'), delay);
  }
}

// Grande célébration : flash, Azami qui saute au milieu, mot en gros, pluie de confettis.
// Réactions Azami V3 : un SVG joué une seule fois (azami/reactions/<id>_anime.svg), jamais deux à la fois.
const REACTION_MS = { tache_cochee: 4400, corvee_terminee: 4800, courses_completees: 4300, comptes_equilibres: 4700, mot_envoye: 4200, objectif_commun: 5000, surprise_coucou: 4600, fete_reussites: 5200, annuler: 3000, minuteur_fini: 3000, machine_lancee: 3000, recette_reussie: 4000, a_finir_vite: 3000, caresse_1: 2500, caresse_2: 2500, caresse_3: 2500 };
const reactionSrc = id => reduced() ? `azami/reactions/statiques/${id}_statique.svg` : `azami/reactions/${id}_anime.svg?${Date.now()}`;
let reactionEl = null;
// Petite réaction posée à côté d'un élément (la ligne cochée, le bouton), sans rien déplacer ni bloquer.
export function clearReaction() { if (reactionEl) { reactionEl.remove(); reactionEl = null; } }
export function react(id, anchor) {
  if (!REACTION_MS[id]) return;
  if (reactionEl) { reactionEl.remove(); reactionEl = null; }
  const img = document.createElement('img');
  img.className = 'reaction'; img.alt = ''; img.src = reactionSrc(id);
  const r = anchor?.getBoundingClientRect();
  const size = 120;
  const top = r ? Math.max(8, Math.min(innerHeight - size - 90, r.top + r.height / 2 - size / 2)) : innerHeight * .3;
  const left = r ? Math.min(innerWidth - size - 8, r.right + 6) : innerWidth / 2 - size / 2;
  img.style.cssText = `position:fixed;top:${top}px;left:${left}px;width:${size}px;height:${size}px;z-index:60;pointer-events:none;`;
  document.body.appendChild(img); reactionEl = img;
  requestAnimationFrame(() => img.classList.add('on'));
  const ms = reduced() ? 1600 : REACTION_MS[id];
  setTimeout(() => { img.classList.add('off'); }, ms - 400);
  setTimeout(() => { if (reactionEl === img) reactionEl = null; img.remove(); }, ms);
}

export function celebrate({ title, sub = '', level = 'big', badge = null, reaction = 'fete_reussites' } = {}) {
  if (reduced()) return;
  if (reactionEl) { reactionEl.remove(); reactionEl = null; }   // un seul Azami à l'écran
  const old = document.getElementById('cele'); if (old) old.remove();
  const box = document.createElement('div');
  box.id = 'cele'; box.setAttribute('aria-hidden', 'true');
  // Scène « reussite » V4.1 en secours, montée le temps de la fête puis retirée (jamais en boucle permanente).
  box.innerHTML = `<div class="cele-flash"></div><div class="cele-card"><div class="cele-pair"><img class="cele-azami" src="${REACTION_MS[reaction] ? reactionSrc(reaction) : (reduced() ? 'azami/v41/statiques/azami_v41_reussite_statique.svg' : `azami/v41/azami_v41_reussite_anime.svg?${Date.now()}`)}" alt="">${badge ? `<img class="cele-badge" src="${badge}" alt="">` : ''}</div><p class="cele-title">${title || 'Bravo !'}</p>${sub ? `<p class="cele-sub">${sub}</p>` : ''}</div>`;
  document.body.appendChild(box);
  requestAnimationFrame(() => box.classList.add('on'));
  burst('confetti', null, level === 'big' ? 40 : 24);
  rain(level === 'big' ? 80 : 40);
  setTimeout(() => sparkle(innerWidth / 2, innerHeight * .38, 14), 250);
  setTimeout(() => { box.classList.remove('on'); box.classList.add('off'); }, level === 'big' ? 2600 : 2000);
  setTimeout(() => box.remove(), level === 'big' ? 3100 : 2500);
}

// Secoue joyeusement un élément (la ligne cochée, la carte Réussites).
export function wiggle(el) {
  if (!el || reduced()) return;
  el.classList.remove('wiggle'); void el.offsetWidth; el.classList.add('wiggle');
  setTimeout(() => el.classList.remove('wiggle'), 700);
}

// Fait compter un nombre vers sa nouvelle valeur, avec un rebond à l'arrivée.
export function countUp(el, to, ms = 700) {
  if (!el) return;
  const from = Number(String(el.textContent).replace(/[^\d.-]/g, '')) || 0;
  if (reduced() || from === to) { el.textContent = to; return; }
  const t0 = performance.now();
  const step = now => {
    const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(step); else { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  };
  requestAnimationFrame(step);
}

// Haptique au toucher réel (iOS 17.4 à 26.4) : un interrupteur natif transparent posé sur le
// bouton reçoit le doigt lui-même ; iOS joue alors sa vibration. Le clic remonte au bouton comme
// d'habitude. Apple a fermé cette porte à partir d'iOS 26.5 : là, il ne se passe simplement rien.
export function armHaptics(root = document) {
  root.querySelectorAll('.tick, .btn, .nav button, .chips button, .icon-btn, .seg button').forEach(el => {
    if (el.querySelector(':scope > input.hap')) return;
    const t = document.createElement('input');
    t.type = 'checkbox'; t.setAttribute('switch', ''); t.className = 'hap'; t.tabIndex = -1;
    t.setAttribute('aria-hidden', 'true');
    el.appendChild(t);
  });
}

