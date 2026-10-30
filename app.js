// Maison : l'app du foyer.
// Sans configuration Supabase, l'app tourne en mode démo (données locales).

import { iconFor, ICONS as THEME_ICONS, norm, iconView, valueOf, classify, FALLBACK, PARENT, IMG as THEME_IMG } from './themes.js';
import { PACKS, ACTION_LABEL, EXPENSE_ACTIONS, personKey, actionFor, variantFor, variantSrc, isVariant } from './people.js';
import { SORTES, etat, descente, resume as dechetsResume, PRATIQUE } from './dechets.js';
import { RECETTES, CUISINES, TAGS, qty, HERO, loadEtapes, ETAPES_OK } from './recettes.js';
import { SHELF, dueText } from './fraicheur.js';
import { GLOSS, GEAR } from './cuisine.js';
import { TOUR, PAGE as GUIDE } from './guide.js';
import { aisleOf } from './rayons.js';
// Les visites d'Azami (gros fichier) se chargent après le démarrage, en arrière-plan, ou au premier besoin.
let VISITES = [], visitesP = null;
const loadVisites = () => visitesP ||= import('./visites.js').then(m => { VISITES = m.VISITES; }).catch(e => { visitesP = null; console.warn('visites', e); });
import { playMeow, randomMeow, MEOW_KINDS, pick } from './miaous.js';
import { schedule as scheduleBruits, ENTREE, CUES, DUREE, parle } from './bruits.js';
import * as T from './taste.js';
import * as LB from './lbx.js';
import { react, clearReaction, burst, azamiJump, pop, praise, haptic, floatUp, ring, celebrate, wiggle, countUp, armHaptics } from './fx.js';

// Azami V4.4 (azami/v44/*.svg) : un seul dessin, mouvement continu, yeux jamais mi-clos.
// Une scène par page, six accueils selon l'heure, « calme » en mode calme, connexion, hors ligne et chargement.
function greeting(h = new Date().getHours()) {
  if (h >= 22 || h < 5) return ['Bonne nuit', 'v44_repos'];
  if (h < 9) return ['Bonjour', 'v44_etirement'];
  if (h < 11) return ['Bonne matinée', 'v44_jeu'];
  if (h < 14) return ['Bon midi', 'v44_toilette'];
  if (h < 18) return ['Bonne après-midi', 'v44_marche'];
  return ['Bonsoir', 'v44_miaulement'];
}
// Azami : une image par scène, chargée une fois au démarrage et déplacée dans la page
// à chaque rendu (jamais recréée), pour qu'elle apparaisse tout de suite.
const SCENES = ['v44_cine', 'v44_collection', 'v44_etirement', 'v44_jeu', 'v44_toilette', 'v44_marche', 'v44_miaulement', 'v44_repos', 'v44_menage', 'v44_courses', 'v44_argent', 'v44_care', 'v44_cuisine', 'v44_reussite', 'v44_calme'];
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const azamiSrc = scene => scene.startsWith('v44_')
  ? `azami/v44/${reducedMotion() ? 'statiques/' : ''}azami_${scene}_${reducedMotion() ? 'statique' : 'anime'}.svg`
  : `azami/azami_${scene}_anime.svg`;
const azamiImgs = {};
function azamiImg(scene) {
  if (!azamiImgs[scene]) {
    const img = new Image(512, 512);
    img.className = `azami ${scene.startsWith('v44_') ? 'v44' : ''}`; img.decoding = 'sync'; img.src = azamiSrc(scene);
    azamiImgs[scene] = img;
  }
  return azamiImgs[scene];
}
const azami = (scene, alt) => `<span class="azami-slot" data-scene="${scene}" data-alt="${esc(alt)}"></span>`;
let coucouDone = false;
function maybeCoucou() {
  if (coucouDone || S.view !== 'maison' || !S.me) return;
  const today = isoDate(new Date());
  if (safeGet('maison-coucou') === today) { coucouDone = true; return; }
  coucouDone = true;
  if (Math.random() < 1 / 12) { safeSet('maison-coucou', today); setTimeout(() => react('surprise_coucou', document.querySelector('.hd .azami')), 900); }
}
function openTicket({ where, n, missing = '' }) {
  if (DEMO && !S.me) return;
  S.ticket = { where, n, payer: S.me, share: 50, persoWho: S.me };
  const old = document.getElementById('ticket'); if (old) old.remove();
  const box = document.createElement('div'); box.id = 'ticket';
  box.innerHTML = `<div class="ticket-card" role="dialog" aria-label="Ticket de caisse">
    <img class="ticket-icon" src="icons/themes/recu.webp" alt="">
    <p class="ticket-title">C'était combien ?</p>
    <p class="ticket-sub">${esc(where)} · ${pl(n, 'article', 'articles')}. Ça part directement dans les dépenses.</p>
    ${missing ? `<p class="ticket-miss">⚠ Il manque encore pour le menu : ${esc(missing)}. C'est resté sur la liste.</p>` : ''}
    <div class="row"><div class="grow"><label class="sr" for="ticket-amount">Montant</label><input class="field amount-input big" id="ticket-amount" inputmode="decimal" placeholder="0.00" autocomplete="off"></div><span class="ticket-cur">CHF</span></div>
    <p class="chip-label">Qui a payé ?</p>
    <div class="chips">${S.members.map(m => `<button type="button" data-action="ticket-pay" data-who="${esc(m.email)}" aria-pressed="${m.email === S.me}">${esc(m.email === S.me ? 'Moi' : m.name)}</button>`).join('')}</div>
    <details class="fold ticket-perso"><summary>Dont des articles perso</summary>
      <div class="row mt"><div class="grow"><label class="sr" for="ticket-perso">Montant perso</label><input class="field amount-input" id="ticket-perso" inputmode="decimal" placeholder="0.00" autocomplete="off"></div><span class="ticket-cur">CHF</span></div>
      <div class="chips">${S.members.map(m => `<button type="button" data-action="ticket-perso-who" data-who="${esc(m.email)}" aria-pressed="${m.email === S.me}">${esc(m.email === S.me ? 'Pour moi' : `Pour ${m.name}`)}</button>`).join('')}</div>
      <p class="hint" id="ticket-perso-txt">Ce montant est retiré du partage.</p></details>
    <p class="chip-label">Partage du reste</p>
    <div class="ticket-split"><input type="range" id="ticket-share" min="0" max="100" step="5" value="50" aria-label="Part de celui qui a payé"><div class="ticket-split-txt" id="ticket-split-txt">Moitié-moitié</div></div>
    <div class="form-actions"><button class="btn ghost" data-action="ticket-skip">Plus tard</button><button class="btn" data-action="ticket-ok">Noter la dépense</button></div></div>`;
  document.body.appendChild(box);
  requestAnimationFrame(() => { box.classList.add('on'); setTimeout(() => document.getElementById('ticket-amount')?.focus(), 350); });
  box.querySelector('#ticket-share').addEventListener('input', e => { S.ticket.share = Number(e.target.value); box.querySelector('#ticket-split-txt').textContent = splitText(); haptic(1); });
  box.querySelectorAll('[data-action="ticket-pay"]').forEach(b => b.addEventListener('click', () => { box.querySelector('#ticket-split-txt').textContent = splitText(); }));
  haptic(1);
}
// « Moitié-moitié », « Toi 70 % · Mariana 30 % », « Tout pour Mariana »…
function splitText() {
  const t = S.ticket; const p = t.share ?? 50;
  const payer = t.payer === S.me ? 'Toi' : nameOf(t.payer), oth = t.payer === S.me ? nameOf(other()) : 'Toi';
  if (p === 50) return 'Moitié-moitié';
  if (p === 100) return `${payer === 'Toi' ? 'Tout pour toi' : `Tout pour ${payer}`}, rien à partager`;
  if (p === 0) return `Avancé pour ${oth === 'Toi' ? 'toi' : oth} : ${oth === 'Toi' ? 'tu dois' : oth + ' doit'} tout`;
  return `${payer} ${p} % · ${oth} ${100 - p} %`;
}
// Les feuilles du bas se ferment aussi en les tirant vers le bas (depuis le haut de la feuille).
document.addEventListener('touchstart', e => {
  const card = e.target.closest?.('#ticket .ticket-card'); if (!card || e.touches.length !== 1 || card.scrollTop > 0 || e.target.closest('input, textarea, .fteam, .fprovs, .cine-ideas')) { sheetDrag = null; return; }
  sheetDrag = { card, y: e.touches[0].clientY, dy: 0 };
}, { passive: true });
document.addEventListener('touchmove', e => {
  if (!sheetDrag) return; const dy = e.touches[0].clientY - sheetDrag.y;
  if (dy < 0 || sheetDrag.card.scrollTop > 0) { sheetDrag.card.style.transform = ''; return; }
  sheetDrag.dy = dy; sheetDrag.card.style.transition = 'none'; sheetDrag.card.style.transform = `translateY(${dy * .9}px)`;
}, { passive: true });
document.addEventListener('touchend', () => {
  if (!sheetDrag) return; const { card, dy } = sheetDrag; sheetDrag = null; card.style.transition = '';
  if (dy > 110) { closeTicket(); render(); } else card.style.transform = '';
});
let sheetDrag = null;
function closeTicket() { const b = document.getElementById('ticket'); if (!b) return; b.classList.remove('on'); setTimeout(() => b.remove(), 300); S.ticket = null; }
function placeAzami() {
  document.querySelectorAll('.azami-slot').forEach(slot => {
    const img = azamiImg(slot.dataset.scene); img.alt = slot.dataset.alt;
    slot.replaceWith(img);
  });
}
// Toutes les scènes d'Azami sont chargées et décodées dès l'ouverture : changer de page ne les recharge plus.
// Après le démarrage, en arrière-plan : les étapes des recettes et les visites d'Azami.
setTimeout(() => { loadEtapes().then(() => { for (const c of [vegeCache, gearCache, rArtCache]) for (const k in c) delete c[k]; }).catch(() => {}); loadVisites(); }, 2500);
function preloadAzami() {
  const warm = sc => { const img = azamiImg(sc); img.decode?.().catch(() => {}); };
  warm(greeting(new Date().getHours())[1]);
  setTimeout(() => SCENES.forEach(warm), 800);
}

const CFG = window.MAISON_CONFIG || {};
const DEMO = !(CFG.supabaseUrl && CFG.supabaseKey);
const $app = document.getElementById('app');
const DAY = 86400000;

// État -----------------------------------------------------------------------

const S = {
  ready: false,
  me: null,            // e-mail de la personne connectée
  members: [],
  tasks: [], chores: [], choreLog: [], expenses: [], shopping: [], board: [], care: [], wins: [], plans: [], pantry: [], gear: {}, help: [], tips: null, calmSkip: [], helpSeen: new Set(),
  view: new URLSearchParams(location.search).get('v') || safeGet('maison-view') || 'maison',
  rq: '', rcuisine: '', rtime: '', rtype: '', timers: (() => { try { return JSON.parse(safeGet('maison-timers') || '[]').filter(t => t.end > Date.now() - 3600000); } catch { return []; } })(), recette: null, cook: null, panier: null, persons: Number(safeGet('maison-persons')) || 2,
  agendaHouse: safeGet('maison-agenda-house') !== '0',
  shopMode: safeGet('maison-shop-mode') || null,   // « je suis au supermarché » : la liste se concentre sur ce rayon
  achats: [],                                       // historique des articles achetés (pour les pré-listes, plus tard)
  folds: (() => { try { return JSON.parse(safeGet('maison-folds') || '{}'); } catch { return {}; } })(),
  maisonTab: 'faire', films: [], gouts: [], subs: ['hbo', 'disney', 'apple', 'crunchyroll'], loisirTab: safeGet('maison-loisir') || 'cine', cineTab: 'a_voir', cineQ: '', cineRes: null,
  agenda: { configured: null, events: [], calendar: '', loading: false, error: null, at: null },
  open: null,          // élément dont les actions sont dépliées
  openLetter: null,
  chips: {},           // sélections des groupes de puces
  login: { step: 'login', email: '' },
  recovery: false,     // arrivée par un lien « mot de passe oublié »
  showChoreForm: false,
  offline: false,
  edit: null,          // { type, id } : élément en cours de modification
  pick: null,          // { type, id } : choix d'icône ouvert
  hints: {},           // corrections d'icônes apprises (partagées)
};

let api = null;
let sb = null;

function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
// Thème choisi sur cet appareil : « ciel » (bleu) ou « brun » (la première version). Chacun le sien.
const THEME_COLORS = { ciel: '#53A5C7', brun: '#4A3627' };
let THEME = THEME_COLORS[safeGet('maison-theme')] ? safeGet('maison-theme') : 'ciel';
function applyTheme() {
  document.documentElement.dataset.theme = THEME;
  document.querySelector('meta[name="theme-color"]').content = THEME_COLORS[THEME];
}
applyTheme();
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch {} }

// Outils ---------------------------------------------------------------------

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pl = (n, one, many) => `${n} ${n > 1 ? many : one}`;
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
const nameOf = email => S.members.find(m => m.email === email)?.name || (email ? email.split('@')[0] : 'Nous deux');
const other = () => S.members.find(m => m.email !== S.me)?.email;
const firstName = () => nameOf(S.me);

const cents = n => Math.round(Number(n) * 100 + Number.EPSILON);
const chf = n => new Intl.NumberFormat('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents(n) / 100);

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function dayDiff(a, b) { return Math.round((startOfDay(a) - startOfDay(b)) / DAY); }
function isoDate(d) { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; }

function relDay(dateStr) {
  const d = dayDiff(new Date(dateStr + 'T12:00'), new Date());
  if (d === 0) return "aujourd'hui";
  if (d === 1) return 'demain';
  if (d === -1) return 'hier';
  if (d < 0 && d >= -7) return `il y a ${pl(-d, 'jour', 'jours')}`;
  if (d > 0 && d < 7) return new Date(dateStr + 'T12:00').toLocaleDateString('fr-CH', { weekday: 'long' });
  const far = Math.abs(d) > 300;
  return new Date(dateStr + 'T12:00').toLocaleDateString('fr-CH', { day: 'numeric', month: 'short', year: far ? 'numeric' : undefined });
}

function ago(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  const dd = dayDiff(new Date(), new Date(iso));
  if (dd === 0) return `il y a ${h} h`;
  if (dd === 1) return 'hier';
  if (dd < 7) return `il y a ${dd} jours`;
  return new Date(iso).toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' });
}

const appUrl = () => location.origin + location.pathname;

function authError(e) {
  const m = (e?.message || '').toLowerCase();
  if (m.includes('invalid login')) return 'Adresse ou mot de passe incorrect.';
  if (m.includes('not confirmed')) return "Confirme d'abord ton adresse avec le lien reçu par e-mail.";
  if (m.includes('already registered') || m.includes('already been registered')) return 'Ce compte existe déjà. Connecte-toi.';
  if (m.includes('password') && (m.includes('at least') || m.includes('short') || m.includes('weak'))) return 'Mot de passe trop court ou trop simple.';
  if (m.includes('rate') || m.includes('security purposes')) return "Trop d'essais. Attends une minute et réessaie.";
  return "Ça n'a pas marché. Vérifie ta connexion et réessaie.";
}

// Azami miaule de temps en temps. Un vrai enregistrement dans sounds/azami.m4a
// remplace la version synthétique.
let meowFile = null;
fetch('sounds/azami.m4a', { method: 'HEAD' }).then(r => { if (r.ok) meowFile = 'sounds/azami.m4a'; }).catch(() => {});
let audioCtx = null;
const ctxAudio = () => { audioCtx ||= new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state !== 'running') audioCtx.resume(); return audioCtx; };

// iPhone : l'interrupteur « silence » coupe les sons synthétiques (Web Audio) mais pas la lecture
// d'un média. On lance au premier toucher une piste muette en boucle : iOS passe alors en mode
// lecture et nos petits sons sortent même en mode silencieux. Mise en pause quand l'app est cachée.
// Audio : l'app se mélange à ce qui joue déjà (musique, YouTube) au lieu de le couper.
// Conséquence assumée : interrupteur silencieux enclenché = pas de sons de l'app, comme un jeu.
// (L'ancienne astuce de la piste muette en boucle rendait les sons audibles en mode silence,
// mais prenait la main sur la musique en cours.)
function unlockAudio() {
  try {
    if (navigator.audioSession && navigator.audioSession.type !== 'ambient') navigator.audioSession.type = 'ambient';
    const c = ctxAudio(); if (c.state === 'suspended') c.resume().then(() => propRun && propSound(propRun)).catch(() => {});
  } catch {}
}
['touchend', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, unlockAudio, { passive: true }));

// Petits sons de récompense, dans l'esprit Duolingo : notes claires et courtes, style marimba.
// Un fichier sounds/<nom>.m4a (tick, done, big, coin, heart) remplace la version synthétique.
const sfxFile = {};
['tick', 'done', 'big', 'coin', 'heart'].forEach(k => fetch(`sounds/${k}.m4a`, { method: 'HEAD' }).then(r => { if (r.ok) sfxFile[k] = `sounds/${k}.m4a`; }).catch(() => {}));
function note(c, freq, at, dur, vol, type = 'triangle') {
  const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
  o.type = type; o2.type = 'sine';
  o.frequency.value = freq; o2.frequency.value = freq * 2.01; // partiel brillant, un peu désaccordé
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + .008); g.gain.exponentialRampToValueAtTime(.0008, at + dur);
  o.connect(g); o2.connect(g); g.connect(c.destination);
  o2.detune.value = -4;
  const g2 = c.createGain(); g2.gain.value = .35; o2.disconnect(); o2.connect(g2); g2.connect(g);
  o.start(at); o2.start(at); o.stop(at + dur + .05); o2.stop(at + dur + .05);
}
function shimmer(c, at, dur, vol) {
  const len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  src.buffer = buf; f.type = 'highpass'; f.frequency.value = 6000; g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(c.destination); src.start(at);
}
let SOUNDS = safeGet('maison-sounds') !== '0';
function sfx(kind) {
  if (!SOUNDS) return;
  try {
    if (sfxFile[kind]) { const a = new Audio(sfxFile[kind]); a.volume = .7; a.play().catch(() => {}); return; }
    const c = ctxAudio(), t = c.currentTime + .01;
    const N = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, D6: 1174.66, E6: 1318.5, G6: 1567.98, C7: 2093 };
    if (kind === 'tick') { note(c, N.G5, t, .12, .12, 'sine'); }
    else if (kind === 'done') { note(c, N.G5, t, .28, .22); note(c, N.C6, t + .11, .4, .22); shimmer(c, t + .11, .25, .05); }
    else if (kind === 'big') { [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => note(c, f, t + i * .085, .35, .2)); note(c, N.E6, t + .34, .7, .2); note(c, N.G6, t + .42, .8, .14); shimmer(c, t + .34, .5, .07); }
    else if (kind === 'coin') { note(c, N.D6, t, .18, .16, 'square'); note(c, N.A5 * 2, t + .07, .5, .14, 'sine'); shimmer(c, t, .12, .03); }
    else if (kind === 'merci') { [N.G5, N.C6, N.E6, N.G6].forEach((f, i) => note(c, f, t + i * .075, .45, .13)); note(c, N.C7, t + .32, .9, .09, 'sine'); shimmer(c, t + .3, .45, .045); }
    else if (kind === 'heart') { note(c, N.C5, t, .9, .12, 'sine'); note(c, N.E5, t + .03, .9, .11, 'sine'); note(c, N.G5, t + .06, 1, .1, 'sine'); note(c, N.C6, t + .25, .9, .08, 'sine'); }
  } catch {}
}

// Miaulements d'ambiance : optionnels, rares (≈ 20 % des occasions, jamais à moins de 40 s),
// seulement avec un vrai enregistrement, après un premier geste, page visible, mouvement non réduit.
let MEOWS = safeGet('maison-meows') !== '0';
let lastAmbient = 0, touched = false;
addEventListener('touchstart', () => { touched = true; }, { once: true, passive: true });
addEventListener('pointerdown', () => { touched = true; }, { once: true });
setInterval(() => {
  if (!MEOWS || !meowFile || !touched || document.hidden) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!document.querySelector('img.azami')) return;
  const t = Date.now();
  if (t - lastAmbient < 40000) return;
  if (Math.random() < 0.2) { lastAmbient = t; meow(true, .25); }
}, 8000);
// Plusieurs miaulements (miaou, petit mew, mrrp ?, trille, long, ek ek, mrrrow sassy, ronron) : voir miaous.js.
// Un vrai enregistrement sounds/azami_<type>.m4a remplace le son synthétique de ce type.
const meowFiles = {};
Object.keys(MEOW_KINDS).forEach(k => fetch(`sounds/azami_${k}.m4a`, { method: 'HEAD' }).then(r => { if (r.ok) meowFiles[k] = `sounds/azami_${k}.m4a`; }).catch(() => {}));
function meow(force, volume = .6, kind = null) {
  if (!force && Math.random() > 0.18) return;
  try {
    if (!MEOWS && !force) return;
    const k = kind || randomMeow();
    const file = meowFiles[k] || (!kind && meowFile);
    if (file) { const a = new Audio(file); a.volume = volume; a.play().catch(() => {}); return; }
    playMeow(ctxAudio(), k, volume);
  } catch {}
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('on'), 2600);
}

const WEIGHTS = [['1', 'Légère'], ['2', 'Normale'], ['3', 'Lourde']];
const weightLabel = w => ({ 1: 'légère', 3: 'lourde' })[Number(w)] || '';
const FREQS = [[1, 'Chaque jour'], [2, 'Tous les 2 jours'], [3, 'Tous les 3 jours'], [7, 'Chaque semaine'], [10, 'Tous les 10 jours'], [14, 'Toutes les 2 semaines'], [30, 'Chaque mois']];
const freqLabel = n => (FREQS.find(f => f[0] === n)?.[1] || `Tous les ${n} jours`).toLowerCase();

const CATS = [['courses', 'Courses'], ['maison', 'Maison'], ['factures', 'Factures'], ['sorties', 'Sorties'], ['azami', 'Azami'], ['autre', 'Autre']];
const catLabel = c => CATS.find(x => x[0] === c)?.[1] || c;

const CARE_KINDS = [['merci', 'Un merci'], ['besoin', 'Un besoin'], ['poids', 'Ce qui me pèse'], ['envie', 'Une envie'], ['tendresse', 'De la tendresse']];
const careKind = k => CARE_KINDS.find(x => x[0] === k)?.[1];

function chip(group, value, fallback) {
  return (S.chips[group] ?? fallback) === value;
}
function chipGroup(group, options, fallback, label) {
  return `${label ? `<p class="chip-label">${esc(label)}</p>` : ''}<div class="chips" data-group="${group}" role="group" ${label ? `aria-label="${esc(label)}"` : ''}>${options
    .map(([v, l]) => `<button type="button" data-chip="${esc(v)}" aria-pressed="${chip(group, v, fallback)}">${esc(l)}</button>`)
    .join('')}</div>`;
}
const chipVal = (group, fallback) => S.chips[group] ?? fallback;

// Données : Supabase ou démo -------------------------------------------------

function remoteApi(client) {
  const apply = (q, match) => { for (const [k, v] of Object.entries(match)) q = q.eq(k, v); return q; };
  const ok = ({ data, error }) => { if (error) throw error; return data; };
  return {
    // Le serveur ne rend jamais plus de 1000 lignes d'un coup : au-delà (vos films dépassent les 2 000), on lit
    // page par page, dans un ordre stable. Sans ça, la moitié des films manquait (listes, goût, et des films
    // déjà jugés qui revenaient dans Cinder).
    async list(t, o = {}) {
      const base = () => { let q = client.from(t).select('*'); if (o.gte) q = q.gte(o.gte[0], o.gte[1]); if (o.order) q = q.order(o.order[0], { ascending: o.order[1] }); return q; };
      if (o.limit) return ok(await base().limit(o.limit)) || [];
      const first = ok(await base().range(0, 999)) || [];
      if (first.length < 1000) return first;
      const all = [];
      for (let from = 0; ; from += 1000) {
        const rows = ok(await base().order('id').range(from, from + 999)) || [];
        all.push(...rows); if (rows.length < 1000 || from > 50000) break;
      }
      return all;
    },
    async insert(t, row) { return ok(await client.from(t).insert(row).select().single()); },
    async insertMany(t, rows) { return ok(await client.from(t).insert(rows).select()) || []; },
    async update(t, match, patch) { ok(await apply(client.from(t).update(patch), match)); },
    async upsert(t, row) { ok(await client.from(t).upsert(row)); },
    async remove(t, match) { ok(await apply(client.from(t).delete(), match)); },
    async rpc(n, a) { return ok(await client.rpc(n, a)); },
  };
}

function demoApi() {
  const KEY = 'maison-demo-v1';
  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch {}
  db = db ? { ...demoSeed(), ...db } : demoSeed();
  const save = () => safeSet(KEY, JSON.stringify(db));
  const owners = { tasks: 'created_by', chores: 'created_by', chore_log: 'done_by', expenses: 'created_by', shopping: 'added_by', board: 'author', care_messages: 'author' };
  const visible = (t, r) => t === 'care_messages' ? (r.author === S.me || r.recipient === S.me) : true;
  const matches = (r, m) => Object.entries(m).every(([k, v]) => r[k] === v);
  return {
    async list(t, o = {}) {
      return (db[t] || []).filter(r => visible(t, r)).filter(r => !o.gte || r[o.gte[0]] >= o.gte[1]).map(r => ({ ...r }));
    },
    async insert(t, row) {
      const r = { id: uid(), created_at: new Date().toISOString(), ...row };
      if (owners[t] && !r[owners[t]]) r[owners[t]] = S.me;
      if (t === 'chore_log' && !r.done_at) r.done_at = new Date().toISOString();
      (db[t] ||= []).push(r); save(); return r;
    },
    async update(t, m, patch) { (db[t] || []).forEach(r => { if (matches(r, m)) Object.assign(r, patch); }); save(); },
    async insertMany(t, rows) { const out = rows.map(row => ({ id: uid(), created_at: new Date().toISOString(), ...row })); (db[t] ||= []).push(...out); save(); return out; },
    async upsert(t, row) {
      const key = t === 'icon_hints' ? 'word' : t === 'push_subscriptions' ? 'endpoint' : t === 'kitchen_gear' || t === 'azami_carnet' ? 'id' : t === 'reglages' ? 'cle' : 'email';
      const r = key === 'email' ? { ...row, email: row.email || S.me } : { ...row };
      db[t] = (db[t] || []).filter(x => x[key] !== r[key]); db[t].push(r); save();
    },
    async remove(t, m) { db[t] = (db[t] || []).filter(r => !matches(r, m)); save(); },
    async rpc(n, a) {
      if (n === 'care_mark_read') {
        const m = db.care_messages.find(r => r.id === a.msg && r.recipient === S.me);
        if (m && !m.read_at) { m.read_at = new Date().toISOString(); save(); }
      }
    },
  };
}

function demoSeed() {
  const Y = 'yatoni@demo', M = 'mariana@demo';
  const now = Date.now();
  const iso = d => new Date(now - d * DAY).toISOString();
  return {
    members: [{ email: Y, name: 'Yatoni' }, { email: M, name: 'Mariana' }],
    tasks: [
      { id: uid(), title: 'Appeler la gérance pour le store du salon', assignee: Y, due_on: isoDate(now + DAY), done: false, created_by: M, created_at: iso(2) },
      { id: uid(), title: 'Commander les ampoules des lampes en papier', assignee: null, due_on: null, done: false, created_by: Y, created_at: iso(1) },
      { id: uid(), title: 'Prendre rendez-vous chez la vétérinaire', assignee: M, due_on: isoDate(now + 4 * DAY), done: false, created_by: M, created_at: iso(3) },
      { id: uid(), title: 'Monter le meuble de l’entrée', assignee: Y, due_on: null, done: true, done_at: iso(1), created_by: Y, created_at: iso(6) },
    ],
    chores: [
      { id: uid(), title: 'Vaisselle', every_days: 3, weight: 1, fixed: true, turn: null, last_done_at: iso(4), last_done_by: M, created_by: Y, created_at: iso(30) },
      { id: uid(), title: "Vider la caisse d'Azami", every_days: 1, fixed: true, turn: M, last_done_at: iso(1), last_done_by: M, created_by: Y, created_at: iso(30) },
      { id: uid(), title: 'Aspirateur', every_days: 7, turn: M, last_done_at: iso(3), last_done_by: Y, created_by: Y, created_at: iso(30) },
      { id: uid(), title: 'Salle de bain', every_days: 14, weight: 3, turn: Y, last_done_at: iso(10), last_done_by: M, created_by: Y, created_at: iso(30) },
      { id: uid(), title: 'Changer les draps', every_days: 14, turn: M, last_done_at: null, last_done_by: null, created_by: M, created_at: iso(30) },
    ],
    chore_log: [
      ...[1, 5, 9, 12, 17, 20].map(d => ({ id: uid(), title: '', done_by: Y, done_at: iso(d) })),
      ...[3, 8, 10, 15, 22].map(d => ({ id: uid(), title: '', done_by: M, done_at: iso(d) })),
    ],
    wins: [
      { id: uid(), kind: 'chore', title: 'Aspirateur', done_by: Y, done_at: iso(1), weight: 2 },
      { id: uid(), kind: 'task', title: 'Rendre le colis', done_by: M, done_at: iso(1), weight: 1 },
      { id: uid(), kind: 'shop', title: 'Courses du samedi', done_by: Y, done_at: iso(2), weight: 1 },
      { id: uid(), kind: 'chore', title: 'Litière d\'Azami', done_by: M, done_at: iso(2), weight: 1 },
      { id: uid(), kind: 'chore', title: 'Salle de bain', done_by: Y, done_at: iso(3), weight: 3 },
      { id: uid(), kind: 'task', title: 'Appeler la gérance', done_by: Y, done_at: iso(5), weight: 1 },
      { id: uid(), kind: 'chore', title: 'Sortir les poubelles', done_by: M, done_at: iso(8), weight: 1 },
      { id: uid(), kind: 'settle', title: 'Comptes à zéro', done_by: M, done_at: iso(12), weight: 1 },
    ],
    expenses: [
      { id: uid(), label: 'Courses Migros', amount: 84.3, paid_by: Y, payer_share: 0.5, category: 'courses', spent_on: isoDate(now - DAY), is_settlement: false, created_by: Y, created_at: iso(1) },
      { id: uid(), label: 'Lampe en washi', amount: 120, paid_by: M, payer_share: 0.5, category: 'maison', spent_on: isoDate(now - 4 * DAY), is_settlement: false, created_by: M, created_at: iso(4) },
      { id: uid(), label: 'Croquettes et litière', amount: 39.9, paid_by: Y, payer_share: 0.5, category: 'azami', spent_on: isoDate(now - 6 * DAY), is_settlement: false, created_by: Y, created_at: iso(6) },
      { id: uid(), label: 'Facture électricité', amount: 96.4, paid_by: M, payer_share: 0.5, category: 'factures', spent_on: isoDate(now - 12 * DAY), is_settlement: false, created_by: M, created_at: iso(12) },
    ],
    shopping: ['Lait d’avoine', 'Tofu ferme', 'Riz japonais', 'Papier toilette', 'Citrons'].map((l, i) => ({ id: uid(), label: l, checked: i === 4, added_by: i % 2 ? M : Y, created_at: iso(i) })),
    board: [
      { id: uid(), body: 'Le plombier passe jeudi entre 8 h et 10 h. Quelqu’un doit être là.', important: true, pinned: true, author: M, created_at: iso(1) },
      { id: uid(), body: 'J’ai mis le double des clés dans le tiroir de l’entrée.', important: false, pinned: false, author: Y, created_at: iso(2) },
    ],
    care_messages: [
      { id: uid(), author: M, recipient: Y, kind: 'merci', body: "Merci d'avoir tout rangé dimanche pendant que je travaillais. Ça m'a fait du bien de rentrer dans un appart calme.", wants_talk: false, read_at: null, created_at: iso(0.3) },
    ],
    icon_hints: [],
  };
}

// Notifications --------------------------------------------------------------
// Sans serveur de push, l'app prévient quand elle est ouverte en arrière-plan.
// Avec une clé VAPID dans config.js, elle enregistre aussi l'abonnement pour un futur serveur.

let swReg = null;
let seen = { care: new Set(), primed: false };

async function enableNotifications() {
  if (!('Notification' in window)) { toast('Pas de notifications sur cet appareil. Installe l\'app sur l\'écran d\'accueil.'); return; }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { toast('Notifications refusées dans les réglages.'); render(); return; }
  safeSet('maison-notif', '1');
  await subscribePush();
  toast('Notifications activées');
  render();
}
// Abonnement push (notifications app fermée) : la clé publique vient du serveur de rappels.
async function pushKey() {
  if (CFG.vapidPublicKey) return CFG.vapidPublicKey;
  const cached = safeGet('maison-vapid'); if (cached) return cached;
  if (!sb) return null;
  const { data, error } = await sb.functions.invoke('rappels', { body: { action: 'vapid' } });
  if (error || !data?.publicKey) return null;
  safeSet('maison-vapid', data.publicKey);
  return data.publicKey;
}
async function subscribePush() {
  try {
    if (!swReg || !sb || !('pushManager' in swReg)) return;
    const key = await pushKey(); if (!key) return;
    const sub = await swReg.pushManager.getSubscription() || await swReg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey(key) });
    await api.upsert('push_subscriptions', { endpoint: sub.endpoint, email: S.me, sub: sub.toJSON() });
  } catch (e) { console.warn('push', e); }
}
function vapidKey(b64) {
  const pad = '='.repeat((4 - b64.length % 4) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
const notifOn = () => 'Notification' in window && Notification.permission === 'granted' && safeGet('maison-notif') === '1';
// Bandeau sur l'accueil tant que ce téléphone ne reçoit pas les notifications (rappels de l'autre,
// lave-vaisselle fini, aliments qui périment). Sur iPhone, il faut d'abord ouvrir l'app depuis l'icône.
function pushCard() {
  if (DEMO || !S.me || notifOn()) return '';
  const later = Number(safeGet('maison-notif-later')) || 0; if (Date.now() - later < 3 * DAY) return '';
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent), installed = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  const o = other() ? nameOf(other()) : 'l’autre';
  const why = `Pour recevoir les rappels de ${esc(o)}, la fin du lave-vaisselle et les aliments qui vont périmer.`;
  let body;
  if (ios && !installed) body = `<p class="help-what">Active les notifications</p><p class="help-ask">${why}</p>
    <ol class="push-steps"><li>Dans Safari, touche <b>Partager</b> (le carré avec la flèche).</li><li>Choisis <b>Sur l’écran d’accueil</b>.</li><li>Ouvre Maison depuis la nouvelle icône : ce bandeau te proposera d’activer.</li></ol>`;
  else if (!('Notification' in window)) return '';
  else if (Notification.permission === 'denied') body = `<p class="help-what">Les notifications sont bloquées</p><p class="help-ask">${why} Pour les autoriser : Réglages du téléphone, Notifications, Maison, Autoriser.</p>`;
  else body = `<p class="help-what">Active les notifications</p><p class="help-ask">${why}</p><div class="calm-actions"><button class="btn" data-action="notif">Activer</button></div>`;
  return `<section class="help-card push-card"><p class="calm-kicker">Sur ce téléphone</p>${body}<button class="link push-later" data-action="notif-later">Plus tard</button></section>`;
}

function notifyNew() {
  const mine = S.care.filter(c => c.recipient === S.me && !c.read_at);
  if (seen.primed && notifOn() && document.hidden) {
    const fresh = mine.filter(c => !seen.care.has(c.id));
    if (fresh.length) show('Un mot dans ta boîte', `${nameOf(fresh[0].author)} t'a écrit.`, 'care');
  }
  mine.forEach(c => seen.care.add(c.id));
  seen.primed = true;
}
function show(title, body, tag) {
  const opts = { body, icon: 'icons/icon-192.png', tag, data: { url: './' } };
  if (swReg) swReg.showNotification(title, opts).catch(() => {}); else try { new Notification(title, opts); } catch {}
}

// Icônes par thème -----------------------------------------------------------

const ctxOf = { tasks: 'task', shopping: 'shopping', expenses: 'expense', chores: 'chore', wins: 'task' };
const labelOf = (type, row) => type === 'tasks' || type === 'chores' || type === 'wins' ? row.title : row.label;
// Icône enregistrée, sauf si c'était l'icône large d'un thème qui a depuis une icône plus précise (« t:pates » → « t:lasagnes »).
function refined(type, row) {
  if (!row.icon || !row.icon.startsWith('t:')) return row.icon;
  const r = classify(labelOf(type, row) || '', S.hints);
  return r && PARENT[r.id] === row.icon.slice(2) ? `t:${r.id}` : row.icon;
}
const iconOf = (type, row) => (row.icon && !(isVariant(row.icon) && !variantSrc(row.icon)) ? refined(type, row) : null) || iconFor(labelOf(type, row), ctxOf[type], S.hints);

// Variantes personnalisées ---------------------------------------------------
// Qui « porte » l'élément : la personne assignée, à qui c'est le tour, qui a payé, qui l'a fait.
const ownerOf = (type, row) => ({ tasks: row.assignee, chores: row.turn, expenses: row.is_settlement ? null : row.paid_by, wins: row.done_by })[type] || null;
const personOf = email => { const m = S.members.find(x => x.email === email); return m ? personKey(m.name) : null; };
// L'icône stockée est-elle celle que l'app a choisie seule (et non un choix à la main) ?
function autoTheme(label, stored, ctx) {
  const r = classify(label, S.hints);
  if (r && r.id === 'hint') return null;          // appris d'un choix manuel : on le respecte
  if (!r) return null;
  if (!stored) return r.id;
  const v = iconView(stored);
  return (stored === r.value || stored === r.icon || v.id === r.id) ? r.id : null;
}
// Ce qu'on affiche : un choix manuel tel quel ; sinon la variante de la personne si elle existe ; sinon l'icône de thème.
function displayIcon(type, row, owner = ownerOf(type, row)) {
  const base = iconOf(type, row);
  if (isVariant(row.icon)) { if (variantSrc(row.icon)) return row.icon; }   // une variante d'un ancien pack : on repasse en automatique
  const theme = autoTheme(labelOf(type, row) || '', isVariant(row.icon) ? null : row.icon, ctxOf[type]);
  const action = actionFor(theme);
  if (type === 'expenses' && !EXPENSE_ACTIONS.has(action)) return base;
  // Vaisselle à la main en « qui veut » : chacun se voit soi-même sur son téléphone.
  if (!owner && type === 'chores' && action === 'vaisselle_main') owner = S.me;
  return variantFor(personOf(owner), action) || base;
}
const variantBadge = (type, row, who) => { const v = displayIcon(type, row, who); return isVariant(v) ? variantSrc(v) : null; };

// Une valeur d'icône (emoji, « t:id » ou « p:personne:action ») devient une illustration ou un emoji.
function iconHtml(v, cls = '') {
  if (isVariant(v)) { const src = variantSrc(v); if (src) return `<img class="ticon person ${cls}" src="${src}" alt="" width="34" height="34" loading="lazy">`; }
  const w = iconView(v);
  return w.img ? `<img class="ticon ${cls}" src="icons/themes/${w.img}.webp" alt="" width="34" height="34" loading="lazy">` : `<span class="ticon emoji ${cls}">${esc(w.emoji)}</span>`;
}
function iconBtn(type, row) {
  return `<button class="icon-btn" data-action="pick" data-type="${type}" data-id="${row.id}" aria-label="Changer l'icône" aria-expanded="${S.pick?.id === row.id}">${iconHtml(displayIcon(type, row))}</button>`;
}
function iconPicker(type, row) {
  if (S.pick?.id !== row.id) return '';
  const shown = displayIcon(type, row);
  const cur = isVariant(shown) ? {} : iconView(shown);
  const withImg = THEME_ICONS.filter(t => t.img), noImg = THEME_ICONS.filter(t => !t.img);
  const btn = t => { const v = t.img ? 't:' + t.id : t.icon; const on = cur.id ? cur.id === t.id : cur.emoji === t.icon; return `<button data-action="pick-set" data-type="${type}" data-id="${row.id}" data-icon="${esc(v)}" aria-label="${t.id}" ${on ? 'class="on"' : ''}>${iconHtml(v)}</button>`; };
  const people = Object.entries(PACKS).map(([person, actions]) => {
    const name = S.members.find(m => personKey(m.name) === person)?.name || person;
    return `<p class="picker-head">${esc(name)}</p>${actions.map(a => { const v = `p:${person}:${a}`; return `<button data-action="pick-set" data-type="${type}" data-id="${row.id}" data-icon="${v}" aria-label="${esc(name)} : ${esc(ACTION_LABEL[a] || a)}" ${shown === v ? 'class="on"' : ''}>${iconHtml(v)}</button>`; }).join('')}`;
  }).join('');
  return `<div class="picker" role="group" aria-label="Choisir une icône">${people}<p class="picker-head">Thèmes</p>${withImg.map(btn).join('')}${noImg.map(btn).join('')}</div>`;
}
function hintsFrom(rows) {
  const h = {};
  for (const r of rows) {
    h[r.word] = r.icon;
    for (const tok of r.word.split(' ')) if (tok.length >= 4) h['~' + tok] = r.icon;
  }
  return h;
}

// Chargement -----------------------------------------------------------------

async function loadAll() {
  const since = new Date(Date.now() - 30 * DAY).toISOString();
  const [members, tasks, chores, choreLog, expenses, shopping, board, care, hints, wins, plans, pantry, gearRows, help, tipRows, carnet, films, gouts, reglages] = await Promise.all([
    api.list('members'), api.list('tasks'), api.list('chores'), api.list('chore_log', { gte: ['done_at', since] }),
    api.list('expenses', { order: ['spent_on', false], limit: 500 }), api.list('shopping'), api.list('board'), api.list('care_messages'),
    api.list('icon_hints').catch(() => []), api.list('wins', { order: ['done_at', false], limit: 2000 }).catch(() => []),
    api.list('meal_plans').catch(() => []), api.list('pantry').catch(() => []), api.list('kitchen_gear').catch(() => []), api.list('help_requests').catch(() => []), api.list('user_tips').catch(() => null), api.list('azami_carnet').catch(() => []), api.list('films').catch(() => []), api.list('gouts').catch(() => []), api.list('reglages').catch(() => []),
  ]);
  wins.sort((a, b) => String(b.done_at).localeCompare(String(a.done_at)));
  const achats = wins.filter(w => w.kind === 'achat');
  wins.splice(0, wins.length, ...wins.filter(w => w.kind !== 'achat'));
  loadAgenda();
  Object.assign(S, { members, tasks, chores, choreLog, expenses, shopping, board, care, wins, achats, hints: hintsFrom(hints), plans: plans.sort((a, b) => a.created_at.localeCompare(b.created_at)), pantry: pantry.filter(x => !x.status), gear: Object.fromEntries(gearRows.map(g => [g.id, g.has])), help: help.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))), tips: tipRows ? (tipRows.find(r => r.email === S.me)?.seen || {}) : (S.tips || { all: true }), carnet: new Set((carnet || []).map(r => r.id)), carnetInfo: new Map((carnet || []).map(r => [r.id, { by: r.found_by, at: r.found_at }])), films: films || [], gouts: gouts || [], ...(Array.isArray((reglages || []).find(r => r.cle === 'abonnements')?.valeur) ? { subs: reglages.find(r => r.cle === 'abonnements').valeur } : {}),
    goutReg: Object.fromEntries((reglages || []).filter(r => r.cle.startsWith('gout:')).map(r => [r.cle.slice(5), r.valeur || {}])) });
  await ensureDechets();
  notifyNew();
  duoNotice();
  if (!DEMO) safeSet('maison-snapshot', JSON.stringify({ me: S.me, at: Date.now(), members, tasks, chores: S.chores, choreLog, expenses, shopping, board, wins, plans, pantry: S.pantry }));
}

// Les quatre sortes de déchets existent toujours comme corvées (sans tour, liées au calendrier de ramassage).
// Corvées en étapes : chaque étape se fait à la suite, les étapes minutées envoient une notification à la fin.
// Lave-vaisselle pour la maison ; lessive personnelle (une par personne).
const SEQ = {
  lavevaisselle: { label: 'Lave-vaisselle', icon: 'lavevaisselle', every: 4, personal: false, done: 'Lave-vaisselle vidé',
    steps: [{ key: 'cycle', btn: 'Lancer', doing: 'En route', minutes: 60 }, { key: 'sortir', btn: 'Sortie', meta: 'Fini : sortir la vaisselle' }] },
  lessive: { label: 'Lessive', icon: 'lessive', every: 14, personal: true, done: 'Lessive rangée',
    steps: [{ key: 'lavage', btn: 'Lancer', doing: 'Lavage en cours', minutes: 60 }, { key: 'sechage', btn: 'Au séchage', doing: 'Séchage en cours', minutes: 80 }, { key: 'ranger', btn: 'Rangée', meta: 'Sec : plier et ranger' }] },
};
const seqOf = c => c?.sorte && SEQ[c.sorte];
// Durées d'une corvée en étapes : gardées pour les fois suivantes. La lessive, c'est la même machine
// pour vous deux, donc la durée vaut aussi pour la lessive de l'autre.
async function saveSeqMinutes(c, minutes) {
  const rows = S.chores.filter(x => x.sorte === c.sorte);
  for (const r of rows) {
    const options = { ...(r.options || {}), minutes: { ...(r.options?.minutes || {}), ...minutes } };
    r.options = options;
    await api.update('chores', { id: r.id }, { options });
  }
}

const seqMinutes = (c, st) => Number(c.options?.minutes?.[st.key]) || st.minutes;
// Où en est la séquence : { step, ready, left } pendant un minuteur, { next } quand une étape est à faire.
function seqState(c, now = Date.now()) {
  const q = seqOf(c); const i = Math.min(Number(c.step) || 0, q.steps.length - 1);
  if (c.started_at) {
    const ready = new Date(c.started_at).getTime() + seqMinutes(c, q.steps[i]) * 60000;
    if (now < ready) return { phase: 'timer', i, ready, left: Math.ceil((ready - now) / 60000) };
    return { phase: 'next', i: i + 1 };
  }
  return { phase: 'start', i: 0, st: choreStatus(c) };
}
async function ensureDechets() {
  for (const [id, q] of Object.entries(SEQ)) {
    const owners = q.personal ? S.members.map(m => m.email) : [null];
    for (const who of owners) {
      if (S.chores.some(c => c.sorte === id && (c.turn || null) === who)) continue;
      const row = { title: q.label, every_days: q.every, weight: 1, fixed: true, turn: who, sorte: id, icon: `t:${q.icon}`, step: 0 };
      try { const r = await api.insert('chores', row); S.chores.push(r || row); } catch (e) { console.warn(id, e); }
    }
  }
  for (const s of SORTES) {
    if (S.chores.some(c => c.sorte === s.id)) continue;
    const row = { title: s.label, every_days: s.every, weight: 1, fixed: true, turn: null, sorte: s.id, icon: `t:${s.icon}` };
    try { const r = await api.insert('chores', row); S.chores.push(r || row); } catch (e) { console.warn('déchets', e); }
  }
}

// Sans réseau : on affiche le dernier instantané (lecture seule, sans Loisirs).
function loadSnapshot() {
  try {
    const snap = JSON.parse(safeGet('maison-snapshot') || 'null');
    if (!snap || snap.me !== S.me) return false;
    Object.assign(S, { members: snap.members, tasks: snap.tasks, chores: snap.chores, choreLog: snap.choreLog, expenses: snap.expenses, shopping: snap.shopping, board: snap.board, plans: snap.plans || [], pantry: snap.pantry || [], wins: (snap.wins || []).filter(w => w.kind !== 'achat'), care: [], snapshotAt: snap.at });
    return true;
  } catch { return false; }
}

const typing = () => ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) && document.activeElement.type !== 'checkbox';
let loadSeq = 0;
let refreshPending = false;

// Rafraîchit depuis la base. Pendant une saisie, on attend que le champ soit quitté
// (un re-rendu fermerait le clavier sur iPhone).
async function refresh() {
  if (typing()) { refreshPending = true; return; }
  const seq = ++loadSeq;
  try {
    await loadAll();
    if (seq !== loadSeq) return;
    S.offline = false; render();
  } catch (e) {
    console.error(e);
    S.offline = true;
    if (!S.members.length) loadSnapshot();
    render();
    if (S.members.length) toast('Hors-ligne : lecture seule.');
  }
}
document.addEventListener('focusout', () => { if (refreshPending) { refreshPending = false; setTimeout(refresh, 150); } });

let refreshTimer = null;
// Pendant Cinder, l'écho de nos propres votes ne recharge pas tout (c'était la cause des saccades) : on attend
// que le doigt se repose quelques secondes, et l'écran derrière la pile n'est redessiné qu'à la fermeture.
function scheduleRefresh() {
  clearTimeout(refreshTimer);
  if (!document.getElementById('deck')) { refreshTimer = setTimeout(refresh, 400); return; }
  refreshTimer = setTimeout(function later() {
    if (document.getElementById('deck') && (deck?.drag || performance.now() - (deck?.act || 0) < 4000)) { refreshTimer = setTimeout(later, 1500); return; }
    refresh();
  }, 4000);
}

// Une action à la fois par élément : un double tap n'enregistre pas deux fois.
const pending = new Set();
async function run(fn, okMsg, key = 'global') {
  if (S.offline) { toast('Hors-ligne : impossible d\'enregistrer pour le moment.'); return; }
  if (pending.has(key)) return;
  pending.add(key);
  try { await fn(); if (okMsg) toast(okMsg); loadSeq++; await loadAll(); render(); return true; }
  catch (e) { console.error(e); toast("Ça n'a pas marché. Vérifie la connexion et réessaie."); return false; }
  finally { pending.delete(key); }
}

// Une action sur le calendrier, puis relecture.
async function runAgenda(fn, okMsg) {
  if (S.offline) { toast('Hors-ligne : impossible pour le moment.'); return false; }
  if (pending.has('agenda')) return false;
  pending.add('agenda');
  try { await fn(); if (okMsg) toast(okMsg); await loadAgenda(); return true; }
  catch (e) { console.error(e); toast(e.message || "Ça n'a pas marché."); render(); return false; }
  finally { pending.delete('agenda'); }
}

// Journal des réussites : chaque chose faite y reste pour toujours.

// Annuler (comme Ctrl+Z) : après « fait », un bouton « Annuler » reste quelques secondes en haut à droite.
// On garde l'état d'avant des lignes modifiées, et on note ce qui a été ajouté pendant l'action pour l'enlever.
let CAPTURE = null, UNDO = null;
const tracked = a => ({ ...a, async insert(t, row) { const r = await a.insert(t, row); if (CAPTURE && r?.id) CAPTURE.push([t, r.id]); return r; } });
function undoable(label, before, fn, okMsg, key) {
  const cap = [];
  return run(async () => { CAPTURE = cap; try { await fn(); } finally { CAPTURE = null; } }, okMsg, key)
    .then(ok => { if (ok) offerUndo(label, before, cap); return ok; });
}
function offerUndo(label, before, cap) {
  UNDO = { label, before, cap };
  let b = document.getElementById('undo');
  if (!b) { b = document.createElement('button'); b.id = 'undo'; b.type = 'button'; b.addEventListener('click', doUndo); document.body.appendChild(b); }
  b.innerHTML = `<span class="undo-ic" aria-hidden="true">↶</span><span class="undo-txt"><b>Annuler</b><small>${esc(label)}</small></span>`;
  b.setAttribute('aria-label', `Annuler : ${label}`);
  requestAnimationFrame(() => b.classList.add('on'));
  clearTimeout(offerUndo.t); offerUndo.t = setTimeout(hideUndo, 10000);
}
function hideUndo() { UNDO = null; document.getElementById('undo')?.classList.remove('on'); }
function doUndo() {
  const u = UNDO; if (!u) return; hideUndo(); haptic(1); try { u.after?.(); } catch {}
  document.getElementById('cele')?.remove();
  react('annuler', document.querySelector('.hd .azami') || null);
  run(async () => {
    if (u.wait) Object.assign(u, await u.wait);
    for (const [t, id] of [...u.cap].reverse()) await api.remove(t, { id }).catch(e => console.warn('annuler', t, e));
    for (const b of u.before) { if (b.gone) await api.insert(b.t, b.row); else await api.update(b.t, { id: b.id }, b.row); }
  }, `Annulé : ${u.label}`, 'annuler-' + Date.now());   // jamais bloqué par une autre action en cours
}
document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && UNDO && !typing()) { e.preventDefault(); doUndo(); } });

function win(kind, title, weight = 1, icon = null) {
  setTimeout(() => visitMaybe(kind, weight), 3800);   // après la fête : Azami viendra peut-être parler
  return api.insert('wins', { kind, title: title || null, done_by: S.me, done_at: new Date().toISOString(), weight, icon }).catch(e => console.warn('win', e));
}
const WEEK = 7 * DAY;
function winsSince(ms) { const t = Date.now() - ms; return S.wins.filter(w => new Date(w.done_at).getTime() >= t); }
// Jours d'affilée (vous deux ensemble) avec au moins une chose faite, aujourd'hui compris ou hier.
function streak() {
  const days = new Set(S.wins.map(w => isoDate(new Date(w.done_at))));
  let n = 0; const d = new Date();
  if (!days.has(isoDate(d))) d.setDate(d.getDate() - 1);
  while (days.has(isoDate(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

// Première réussite du jour : la série grandit, on le fête.
const todayHasWin = () => S.wins.some(w => isoDate(new Date(w.done_at)) === isoDate(new Date()));
function streakCheer(delay = 0) {
  const n = streak();
  if (n < 2) return;
  setTimeout(() => { haptic('heavy'); celebrate({ reaction: 'fete_reussites', title: `Jour ${n} de suite`, sub: n >= 7 ? 'Une semaine entière. Azami est fière.' : 'Ensemble, chaque jour.' }); }, delay);
}

// Récompenses : quelle particule pour quel geste.
const AZAMI_ICONS = new Set(['🐱', '🐾', '🧶', '🪣', '🥣', '🥫']);
const AZAMI_IDS = /^t:(chat|croquettes|gamelle|patee|friandises|griffoir|arbreachat|jouetschat|plumeau|brossechat|antipuces|veto|vaccinchat|caissetransport|fontaine|herbeachat|gardechat|antipoils|collierchat|pesee|litiere)$/;
const isAzami = row => AZAMI_ICONS.has(row.icon) || AZAMI_IDS.test(row.icon || '') || /azami|\bchat(te)?\b|croquette|liti[eè]re|p[aâ]t[eé]e|v[eé]to/i.test(row.title || row.label || '');

// Argent ---------------------------------------------------------------------

function balances() {
  const net = Object.fromEntries(S.members.map(m => [m.email, 0]));
  for (const e of S.expenses) {
    const o = S.members.find(m => m.email !== e.paid_by)?.email;
    if (!o) continue;
    const owed = Math.round(cents(e.amount) * (1 - Number(e.payer_share)));
    net[e.paid_by] += owed;
    net[o] -= owed;
  }
  for (const k in net) net[k] = net[k] / 100;
  return net;
}

// Ce que chacun a payé et ce que chacun devait, depuis le dernier remboursement.
function balanceDetail() {
  const lastSettle = S.expenses.filter(e => e.is_settlement).sort((a, b) => b.created_at.localeCompare(a.created_at))[0] || null;
  const since = S.expenses.filter(e => !e.is_settlement && (!lastSettle || e.created_at > lastSettle.created_at));
  const by = Object.fromEntries(S.members.map(m => [m.email, { paid: 0, part: 0 }]));
  for (const e of since) {
    const o = S.members.find(m => m.email !== e.paid_by)?.email;
    if (!by[e.paid_by] || !o) continue;
    const total = cents(e.amount);
    const owed = Math.round(total * (1 - Number(e.payer_share)));
    by[e.paid_by].paid += total;
    by[e.paid_by].part += total - owed;
    by[o].part += owed;
  }
  for (const k in by) { by[k].paid /= 100; by[k].part /= 100; }
  return { by, since, lastSettle, total: since.reduce((s, e) => s + Number(e.amount), 0) };
}

// Effet d'une dépense sur le solde, vu par moi : combien l'autre me doit (positif) ou ce que je lui dois.
function expenseEffect(e) {
  const owed = Math.round(cents(e.amount) * (1 - Number(e.payer_share))) / 100;
  return e.paid_by === S.me ? owed : -owed;
}

// Agenda : un seul calendrier iCloud partagé, lu et écrit par la fonction « agenda » -----

const DEMO_EVENTS = () => { const d = n => isoDate(new Date(Date.now() + n * DAY)); const t = (n, h) => new Date(new Date(Date.now() + n * DAY).setHours(h, 0, 0, 0)).toISOString(); return [
  { id: 'e1', href: 'demo/e1', title: 'Dentiste Mariana', start: t(1, 14), end: t(1, 15), allDay: false, recurring: false, place: 'Rue de Bourg' },
  { id: 'e2', href: 'demo/e2', title: 'Dîner chez Antoine', start: t(3, 19), end: t(3, 23), allDay: false, recurring: false },
  { id: 'e3', href: 'demo/e3', title: 'Week-end à Aomori', start: d(9), end: d(12), allDay: true, recurring: false },
  { id: 'e4', href: 'demo/e4', title: 'Yoga', start: t(2, 19), end: t(2, 20), allDay: false, recurring: true },
]; };
async function agendaCall(body) {
  if (DEMO) {
    const key = 'maison-demo-agenda';
    let st = JSON.parse(safeGet(key) || 'null') || { configured: true, calendar: 'Les quatre pattes', events: DEMO_EVENTS() };
    if (body.action === 'setup') st = { configured: true, calendar: body.calendar_name, events: DEMO_EVENTS() };
    if (body.action === 'forget') st = { configured: false, calendar: '', events: [] };
    if (body.action === 'create') st.events.push({ ...body.event, id: uid(), href: 'demo/' + uid(), recurring: false });
    if (body.action === 'update') st.events = st.events.map(e => e.id === body.event.id ? { ...e, ...body.event } : e);
    if (body.action === 'delete') st.events = st.events.filter(e => e.href !== body.href);
    safeSet(key, JSON.stringify(st));
    return { ...st, events: [...st.events].sort((a, b) => a.start.localeCompare(b.start)), at: new Date().toISOString() };
  }
  const { data, error } = await sb.functions.invoke('agenda', { body });
  if (error) { let msg = error.message; try { const j = await error.context?.json(); if (j?.error) msg = j.error; } catch {} throw new Error(msg); }
  if (data?.error) throw new Error(data.error);
  return data;
}
// Tâche datée : la mettre aussi dans le calendrier partagé (iCloud), pour la voir dans Calendrier sur le téléphone.
const inCal = t => S.agenda.events.some(e => e.title === t.title && evDay(e) === t.due_on);
const calBtn = t => t.due_on && S.agenda.configured && !inCal(t) ? `<button class="btn ghost small" data-action="task-cal" data-id="${t.id}">${icn('cal')} Dans le calendrier</button>` : '';
function taskEvent(t) {
  if (t.due_time) { const s = new Date(`${t.due_on}T${String(t.due_time).slice(0, 5)}`); return { title: t.title, start: s.toISOString(), end: new Date(s.getTime() + 3600000).toISOString(), allDay: false, notes: 'Depuis Maison' }; }
  const n = new Date(t.due_on + 'T12:00'); n.setDate(n.getDate() + 1);
  return { title: t.title, start: t.due_on, end: isoDate(n), allDay: true, notes: 'Depuis Maison' };
}
async function loadAgenda() {
  if (S.agenda.loading) return;
  S.agenda.loading = true;
  try {
    const r = await agendaCall({ action: 'list' });
    Object.assign(S.agenda, { configured: !!r.configured, calendar: r.calendar || '', events: r.events || [], at: r.at, error: null, apple_id: r.apple_id, set_by: r.set_by });
    safeSet('maison-agenda', JSON.stringify(S.agenda));
  } catch (e) {
    console.warn('agenda', e);
    const cached = JSON.parse(safeGet('maison-agenda') || 'null');
    if (cached) Object.assign(S.agenda, cached, { error: e.message });
    else S.agenda.error = e.message;
  } finally { S.agenda.loading = false; render(); }
}
const evDay = e => e.allDay ? e.start.slice(0, 10) : isoDate(new Date(e.start));
const evTime = iso => new Date(iso).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
function evWhen(e) {
  if (e.allDay) { const n = dayDiff(new Date(e.end + 'T12:00'), new Date(e.start + 'T12:00')); return n > 1 ? `${n} jours` : 'Toute la journée'; }
  return `${evTime(e.start)} – ${evTime(e.end)}`;
}
function nextEvent() {
  const today = isoDate(new Date()), now = new Date().toISOString();
  return S.agenda.events.find(e => e.allDay ? e.end > today : e.end > now) || null;
}

// Ménage ---------------------------------------------------------------------

function choreStatus(c) {
  if (!c.last_done_at) return { d: 0, label: 'pas encore faite', due: true, late: false };
  const due = new Date(c.last_done_at); due.setDate(due.getDate() + c.every_days);
  const d = dayDiff(due, new Date());
  if (d > 1) return { d, label: `dans ${d} jours`, due: false, late: false };
  if (d === 1) return { d, label: 'demain', due: false, late: false };
  if (d === 0) return { d, label: "aujourd'hui", due: true, late: false };
  return { d, label: -d === 1 ? 'attend depuis hier' : `attend depuis ${pl(-d, 'jour', 'jours')}`, due: true, late: true };
}


// Mode calme ----------------------------------------------------------------------
// Quand trop de choses sont en retard, l'app passe d'elle-même en « une chose à la fois » :
// ce qui est vital d'abord, puis l'important, le reste peut attendre. On en sort quand plus rien
// de vital ou d'important n'attend et qu'il reste au plus 2 choses en retard.
const PRIO = { vital: 0, important: 1, normal: 2, later: 3 };
const PRIO_LABEL = { vital: 'Vitale', important: 'Importante', normal: 'Normale', later: 'Peut attendre' };
const VITAL_THEMES = { azami: ['litiere', 'croquettes', 'patee', 'gamelle', 'fontaine', 'veto', 'vaccinchat', 'antipuces', 'vermifuge'], sante: ['pharmacie', 'ordonnance', 'paracetamol', 'ibuprofene'], payer: ['facture', 'facture_qr', 'ebill', 'impots', 'lamal', 'serafe', 'fiduciaire', 'urgent'] };
const IMPORTANT_THEMES = ['poubelle', 'dechets', 'vaisselle', 'lavevaisselle', 'lessive', 'courses', 'medecin', 'sante', 'rdv', 'orp', 'travail', 'admin', 'identite', 'passeport', 'gerance', 'banque', 'virement', 'courrier', 'recommande'];
const themeChain = label => { const r = classify(label || '', S.hints); const out = []; let id = r && r.id !== 'hint' ? r.id : null; while (id && out.length < 4) { out.push(id); id = PARENT[id]; } return out; };
// Priorité d'un élément : choisie à la main, sinon devinée (et la raison, pour rassurer).
function prioOf(kind, row) {
  const late = kind === 'task' ? row.due_on && row.due_on < isoDate(new Date()) : choreStatus(row).late;
  if (row.priority) return { p: row.priority, why: row.priority === 'vital' ? 'vitale' : row.priority === 'important' ? (late ? 'date passée' : 'importante') : row.priority === 'later' ? 'peut attendre' : '' };
  const chain = themeChain(row.title);
  if (isAzami(row) && (chain.some(t => VITAL_THEMES.azami.includes(t)) || /liti[eè]re|croquette|p[aâ]t[eé]e|gamelle|eau|v[eé]to|m[eé]dic/i.test(row.title))) return { p: 'vital', why: 'pour Azami' };
  if (chain.some(t => VITAL_THEMES.azami.includes(t))) return { p: 'vital', why: 'pour Azami' };
  if (chain.some(t => VITAL_THEMES.sante.includes(t))) return { p: 'vital', why: 'santé' };
  if (chain.some(t => VITAL_THEMES.payer.includes(t))) return { p: 'vital', why: 'à payer ou à rendre' };
  if (kind === 'chore' && row.sorte && SORTES.some(x => x.id === row.sorte)) return descente(SORTES.find(x => x.id === row.sorte), row).possible ? { p: 'important', why: 'ça déborde vite' } : { p: 'later', why: 'pas le bon jour pour descendre' };
  if (kind === 'task' && late) return { p: 'important', why: 'date passée' };
  if (chain.some(t => IMPORTANT_THEMES.includes(t))) return { p: 'important', why: 'importante' };
  return { p: 'normal', why: (row.weight || 2) === 1 ? 'rapide' : '' };
}
const snoozed = row => row.snooze_until && row.snooze_until >= isoDate(new Date());
// Ce qui attend pour moi (ou pour nous deux), avec sa priorité et son retard en jours.
function myPending() {
  const today = isoDate(new Date()), out = [];
  for (const c of S.chores) {
    if (snoozed(c)) continue;
    const q = seqOf(c);
    if (q ? (q.personal ? c.turn !== S.me : false) : (c.turn && c.turn !== S.me)) continue;
    if (q && c.started_at) continue;              // machine en route : rien à faire pour l'instant
    const st = choreStatus(c); if (!st.due) continue;
    const pr = prioOf('chore', c);
    out.push({ kind: 'chore', row: c, late: st.late ? -st.d : 0, ...pr });
  }
  for (const t of S.tasks) {
    if (t.done || snoozed(t) || (t.assignee && t.assignee !== S.me)) continue;
    if (!t.due_on || t.due_on > today) { if (!t.priority || PRIO[t.priority] > 1) continue; }
    const pr = prioOf('task', t);
    out.push({ kind: 'task', row: t, late: t.due_on && t.due_on < today ? -dayDiff(new Date(t.due_on + 'T12:00'), new Date()) : 0, ...pr });
  }
  return out.sort((a, b) => PRIO[a.p] - PRIO[b.p] || (S.calmSkip.indexOf(a.row.id) - S.calmSkip.indexOf(b.row.id)) || rankOf(a.row) - rankOf(b.row) || b.late - a.late || (a.row.weight || 2) - (b.row.weight || 2));
}
// État de surcharge : on entre à 5 retards (ou 3 dont un de plus d'une semaine), on sort quand plus rien
// de vital ou d'important n'est en retard et qu'il en reste au plus 2.
function overload(list = myPending()) {
  const late = list.filter(x => x.late > 0);
  const urgent = late.filter(x => PRIO[x.p] <= 1);
  const sum = late.reduce((a, x) => a + Math.min(x.late, 14), 0);
  const enter = late.length >= 5 || (late.length >= 3 && late.some(x => x.late >= 7)) || sum >= 25;
  const canExit = urgent.length === 0 && late.length <= 2;
  return { late, urgent, enter, canExit };
}
const calmKey = () => `maison-calme-${S.me}`;
function calmState() { try { return JSON.parse(safeGet(calmKey()) || 'null') || {}; } catch { return {}; } }
function setCalm(st) { safeSet(calmKey(), JSON.stringify(st)); }
// Entrée et sortie automatiques. « Revenir à la vue normale » coupe l'entrée automatique jusqu'au lendemain.
function calmCheck() {
  const st = calmState(), o = overload(), today = isoDate(new Date());
  if (!st.on && o.enter && st.offDay !== today) { setCalm({ on: true, auto: true, since: Date.now(), start: o.late.length }); return 'enter'; }
  // Sortie automatique. Entré à la main : seulement quand plus rien de vital ou d'important n'attend du tout.
  const nothingUrgent = myPending().every(x => PRIO[x.p] > 1);
  if (st.on && o.canExit && (st.auto || nothingUrgent)) { setCalm({ on: false, exitedAt: Date.now(), offDay: st.offDay }); return 'exit'; }
  return null;
}
const PRIO_CHOICES = [['auto', 'Auto'], ['vital', 'Vitale'], ['important', 'Importante'], ['normal', 'Normale'], ['later', 'Peut attendre']];
const PRIO_TAG = { vital: 'Vital', important: 'Important', normal: '', later: 'Peut attendre' };
function calmBtn(x) {
  const r = x.row;
  if (x.kind === 'task') return `<button class="btn calm-do" data-action="task-toggle" data-id="${r.id}">C'est fait</button>`;
  const q = seqOf(r);
  if (q) return `<button class="btn calm-do" data-action="seq-step" data-id="${r.id}" data-i="0">${esc(q.steps[0].btn)}</button>`;
  return `<button class="btn calm-do" id="done-${r.id}" data-action="chore-done" data-id="${r.id}">C'est fait</button>`;
}
const calmLate = x => x.late > 0 ? (x.late === 1 ? 'attend depuis hier' : `attend depuis ${x.late} jours`) : x.kind === 'task' && x.row.due_on ? relDay(x.row.due_on) : "aujourd'hui";
const calmTitle = x => x.kind === 'chore' && /^vaisselle$/i.test(x.row.title.trim()) ? 'Vaisselle à la main' : x.row.title;
function helpPending(x) { return S.help.find(h => h.item_id === x.row.id && h.from_email === S.me && !isRappel(h) && (!h.status || h.status === 'ensemble') && Date.now() - new Date(h.created_at).getTime() < 2 * DAY); }
function calmSection() {
  const list = myPending(), o = overload(list), st = calmState();
  const todo0 = list.filter(x => x.p !== 'later');
  const todo = [...todo0.filter(x => !helpPending(x)), ...todo0.filter(x => helpPending(x))];   // ce qui est demandé à l'autre passe après
  const first = todo[0], next = todo.slice(1, 3), rest = [...todo.slice(3), ...list.filter(x => x.p === 'later')];
  const doneToday = S.wins.filter(w => w.done_by === S.me && isoDate(new Date(w.done_at)) === isoDate(new Date()) && w.kind !== 'shop').length;
  const vitals = todo.filter(x => x.p === 'vital').length, imps = todo.filter(x => x.p === 'important').length;
  const sub = !first ? 'Plus rien d’urgent. Tu peux souffler.'
    : vitals ? 'Commence par ce qui compte vraiment. Le reste peut attendre, ce n’est pas grave.'
    : imps ? 'Le vital est fait. Encore l’important, et tu pourras lever le pied.'
    : 'Le plus important est fait. Tu peux t’arrêter là, ou continuer doucement.';
  const o2 = other();
  const row = (x, big) => {
    const tag = PRIO_TAG[x.p], h = helpPending(x);
    const why = [tag, x.why].filter(Boolean).join(' · ');
    return `<div class="calm-item ${big ? 'big' : ''} p-${x.p}">${iconBtn(x.kind === 'task' ? 'tasks' : 'chores', x.row)}
      <div class="item-main"><div class="item-title">${esc(calmTitle(x))}</div>
      <div class="item-meta">${why ? `<span class="calm-tag">${esc(why)}</span> ` : ''}${esc(calmLate(x))}${h ? ` · <b>demandé à ${esc(nameOf(h.to_email))}</b>` : ''}</div></div>
      ${big ? '' : calmBtn(x)}
      ${big ? `<div class="calm-actions">${calmBtn(x)}${o2 ? `<button class="btn ghost" data-action="help-open" data-kind="${x.kind}" data-id="${x.row.id}">Demander à ${esc(nameOf(o2))}</button>` : ''}<button class="link" data-action="calm-skip" data-id="${x.row.id}">Pas maintenant</button></div>` : ''}</div>`;
  };
  const exitGoal = o.canExit ? '' : `<p class="calm-goal">Le mode calme s’arrête tout seul quand plus rien de vital ou d’important n’est en retard (encore ${o.urgent.length}) et qu’il reste 2 retards au plus (il y en a ${o.late.length}).${st.start ? ` <span class="calm-bar" style="--p:${Math.max(4, Math.min(100, Math.round((1 - o.late.length / Math.max(st.start, o.late.length)) * 100)))}%"></span>` : ''}</p>`;
  return `<section class="calm" aria-label="Mode calme">
    <div class="calm-head"><p class="calm-kicker">Mode calme</p>${doneToday ? `<p class="calm-done">Fait aujourd'hui : <b>${doneToday}</b></p>` : ''}</div>
    <h2 class="calm-title">${first ? 'Une chose à la fois.' : 'On souffle.'}</h2>
    <p class="calm-sub">${esc(sub)}</p>
    ${first ? `<p class="chip-label">Commence par ça</p>${row(first, true)}` : ''}
    ${next.length ? `<p class="chip-label">Ensuite</p>${next.map(x => row(x)).join('')}` : ''}
    ${rest.length ? `<details class="calm-rest" data-fold="calm-rest"><summary>Le reste peut attendre (${rest.length})</summary>${rest.map(x => row(x)).join('')}
      ${rest.some(x => x.p !== 'vital') ? `<button class="btn ghost small" data-action="calm-snooze">Repousser tout ça de 3 jours</button>` : ''}</details>` : ''}
    ${exitGoal}
    <div class="calm-foot">${o2 ? `<button class="btn ghost small" data-action="help-open" data-kind="" data-id="">J'ai besoin de souffler</button>` : ''}<button class="link" data-action="calm-off">Revenir à la vue normale</button></div>
  </section>`;
}
// Demandes d'aide reçues (et réponses à mes demandes) : en haut de la page Maison.
const HELP_ASK = { remplacer: 'Tu peux le faire à ma place ?', ensemble: 'On le fait ensemble ?', souffler: 'J’ai besoin de souffler un peu. Tu peux prendre le relais ?' };
const HELP_ANS = { pris: 's’en occupe', ensemble: 'est d’accord pour le faire ensemble', non: 'ne peut pas tout de suite' };
const RAPPEL_ANS = { pris: 's’en occupe', non: 'le fera un peu plus tard' };
const PENSER_ANS = { pris: 's’en occupe', ensemble: 'propose de le faire ensemble', non: 'y pensera un peu plus tard' };
// Rappel simple (« tu peux penser à… ») ou rappel pour vous deux (« il faudrait qu'on y pense »).
const isRappel = h => h.ask === 'rappel' || h.ask === 'penser';
const helpRow = h => h.item_kind === 'task' ? S.tasks.find(x => x.id === h.item_id) : h.item_kind === 'chore' ? S.chores.find(x => x.id === h.item_id) : null;
// Un rappel n'a plus lieu d'être quand la chose a été faite après son envoi.
function helpItemDone(h) {
  if (!h.item_id) return false;
  const r = helpRow(h); if (!r) return true;
  return h.item_kind === 'task' ? !!r.done : !!(r.last_done_at && new Date(r.last_done_at) > new Date(h.created_at));
}
function helpInbox() {
  const list = S.help.filter(h => h.to_email === S.me && !h.status && Date.now() - new Date(h.created_at).getTime() < 3 * DAY && !(isRappel(h) && helpItemDone(h)))
    .sort((x, y) => y.created_at.localeCompare(x.created_at));
  // Plusieurs rappels pour la même chose : on n'en montre qu'un, le plus récent.
  return list.filter((h, i) => !isRappel(h) || list.findIndex(x => isRappel(x) && x.item_id === h.item_id) === i);
}
const helpAnswers = () => S.help.filter(h => h.from_email === S.me && h.status && h.answered_at && Date.now() - new Date(h.answered_at).getTime() < 12 * 3600000 && !S.helpSeen.has(h.id));
const helpAnsText = h => (h.ask === 'penser' ? PENSER_ANS : h.ask === 'rappel' ? RAPPEL_ANS : HELP_ANS)[h.status] || 'a répondu';
function helpCards() {
  return helpInbox().map(h => h.ask === 'penser'
    ? `<section class="help-card rappel" id="help-${h.id}"><p class="calm-kicker">${esc(nameOf(h.from_email))} : il faudrait qu’on pense à</p>
      <p class="help-what">${esc(h.label || 'Une chose à faire')}</p>
      <div class="calm-actions"><button class="btn" data-action="help-answer" data-id="${h.id}" data-s="pris">Je m’en occupe</button><button class="btn ghost" data-action="help-answer" data-id="${h.id}" data-s="ensemble">On le fait ensemble</button><button class="btn ghost" data-action="help-answer" data-id="${h.id}" data-s="non">Plus tard</button></div></section>`
    : h.ask === 'rappel'
    ? `<section class="help-card rappel" id="help-${h.id}"><p class="calm-kicker">${esc(nameOf(h.from_email))} te fait penser à</p>
      <p class="help-what">${esc(h.label || 'Une chose à faire')}</p>
      <div class="calm-actions"><button class="btn" data-action="help-answer" data-id="${h.id}" data-s="pris">J’y vais</button><button class="btn ghost" data-action="help-answer" data-id="${h.id}" data-s="non">Plus tard</button></div></section>`
    : `<section class="help-card" id="help-${h.id}"><p class="calm-kicker">${esc(nameOf(h.from_email))} demande un coup de main</p>
      ${h.label ? `<p class="help-what">${esc(h.label)}</p>` : ''}<p class="help-ask">${esc(HELP_ASK[h.ask] || HELP_ASK.remplacer)}</p>
      <div class="calm-actions"><button class="btn" data-action="help-answer" data-id="${h.id}" data-s="${h.ask === 'ensemble' ? 'ensemble' : 'pris'}">${h.ask === 'ensemble' ? 'OK, ensemble' : h.ask === 'souffler' ? 'J’arrive' : 'Je m’en occupe'}</button><button class="btn ghost" data-action="help-answer" data-id="${h.id}" data-s="non">Pas maintenant</button></div></section>`).join('')
    + helpAnswers().map(h => `<section class="help-card answer ${h.status}" id="help-${h.id}"><p><b>${esc(nameOf(h.to_email))}</b> ${helpAnsText(h)}${h.label ? ` : ${esc(h.label)}` : ''}.</p><button class="link" data-action="help-seen" data-id="${h.id}">OK</button></section>`).join('');
}

// Rappeler à l'autre : un geste pour lui faire penser à une chose qui est à son tour (notification sur son téléphone).
const BELL = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 3.5a5 5 0 0 0-5 5v2.9c0 .9-.3 1.8-.9 2.5L5 15.3h14l-1.1-1.4a4 4 0 0 1-.9-2.5V8.5a5 5 0 0 0-5-5Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M10 18.2a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
const BELL_OK = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M5.5 12.5l4.2 4.2 8.8-9.2" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const nudgeOf = id => S.help.find(h => isRappel(h) && h.item_id === id && h.from_email === S.me && !h.status && !helpItemDone(h) && Date.now() - new Date(h.created_at).getTime() < 12 * 3600000);
// Une tâche pour vous deux : pas « tu dois le faire », plutôt « il faudrait qu'on y pense ».
const nudgeShared = (kind, row) => kind === 'task' && !row.assignee && !row.done;
const nudgeWho = (kind, row) => { const o = other(); if (!o) return null; if (nudgeShared(kind, row)) return o; const w = kind === 'chore' ? row.turn : row.assignee; return w === o ? o : null; };
function nudgeBtn(kind, row, due) {
  const o = nudgeWho(kind, row), shared = nudgeShared(kind, row); if (!o || (!due && !shared)) return '';
  const n = nudgeOf(row.id);
  const label = n ? `Rappel envoyé à ${esc(nameOf(o))} ${esc(ago(n.created_at))}` : shared ? `Faire penser ${esc(nameOf(o))} à cette tâche pour vous deux` : `Rappeler à ${esc(nameOf(o))}`;
  return `<button class="nudge ${n ? 'sent' : ''}" data-action="nudge" data-kind="${kind}" data-id="${row.id}" aria-label="${label}">${n ? `${BELL_OK}<span>Rappelé</span>` : `${BELL}<span>${shared ? 'On y pense ?' : 'Rappeler'}</span>`}</button>`;
}
const nudgeMenu = (kind, row) => { const o = nudgeWho(kind, row); return o ? `<button class="btn ghost small" data-action="nudge" data-kind="${kind}" data-id="${row.id}">${nudgeShared(kind, row) ? `On y pense ? Envoyer à ${esc(nameOf(o))}` : `Rappeler à ${esc(nameOf(o))}`}</button>` : ''; };

// Petites notifications dans l'app : à l'ouverture et en direct (rappel, demande d'aide, réponse, petit mot).
// Elles restent quelques secondes en haut ; un toucher ouvre le détail.
// Pile des notifications affichées (la plus récente en haut) ; repliée quand il y en a trop.
let popList = [], popExpanded = false, popHeld = false;
function popEvents() {
  const out = [], now = Date.now();
  const itemIcon = h => { const r = helpRow(h); return r ? iconHtml(displayIcon(h.item_kind === 'task' ? 'tasks' : 'chores', r)) : iconHtml(h.ask === 'souffler' ? 't:care_besoin' : 't:rappel'); };
  for (const h of helpInbox()) out.push({ id: 'h' + h.id, at: h.created_at, icon: itemIcon(h), title: h.ask === 'penser' ? `${nameOf(h.from_email)} : il faudrait qu’on y pense` : h.ask === 'rappel' ? `${nameOf(h.from_email)} te fait penser à` : `${nameOf(h.from_email)} demande un coup de main`, body: isRappel(h) ? (h.label || 'Une chose à faire') : [h.label, HELP_ASK[h.ask]].filter(Boolean).join(' · '), go: { view: 'maison', el: `help-${h.id}` } });
  for (const h of helpAnswers()) out.push({ id: 'a' + h.id, at: h.answered_at, icon: itemIcon(h), title: `${nameOf(h.to_email)} ${helpAnsText(h)}`, body: h.label || (isRappel(h) ? 'Ton rappel' : 'Ta demande d’aide'), go: { view: 'maison', el: `help-${h.id}` } });
  if (S.view !== 'nuit') for (const c of S.care.filter(c => c.recipient === S.me && !c.read_at && now - new Date(c.created_at).getTime() < 3 * DAY)) {
    const k = ['merci', 'besoin', 'poids', 'envie', 'tendresse'].includes(c.kind) ? c.kind : 'merci';
    out.push({ id: 'c' + c.id, at: c.created_at, icon: `<img class="ticon" src="icons/themes/care_${k}.webp" alt="" width="34" height="34">`, title: `${careKind(c.kind) || 'Un mot'} de ${nameOf(c.author)}`, body: 'Touche pour l’ouvrir', go: { view: 'nuit', letter: c.id } });
  }
  out.push(...pushEvents());
  return out.sort((x, y) => String(x.at).localeCompare(String(y.at)));
}
// Les notifications reçues sur le téléphone (rappels du jour, minuteurs, aliments…) sont gardées par le
// service worker : à l'ouverture, celles arrivées depuis la dernière fois réapparaissent ici.
let pushInbox = [];
async function loadInbox() {
  let list = [];
  try { const c = await caches.open('maison-inbox'); const r = await c.match('./__inbox'); list = r ? await r.json() : []; } catch { list = []; }
  // Et celles encore visibles dans le centre de notifications du téléphone (même reçues avant cette version).
  try {
    const reg = swReg || await navigator.serviceWorker?.getRegistration();
    const shown = reg?.getNotifications ? await reg.getNotifications() : [];
    for (const n of shown) if (!list.some(x => x.tag === n.tag && x.title === n.title && x.body === n.body)) list.push({ tag: n.tag, title: n.title, body: n.body, url: n.data?.url, at: n.timestamp || Date.now() });
  } catch { /* pas pris en charge */ }
  pushInbox = list;
  popCheck();
}
const VIEW_OF = u => { try { return new URL(u || './', location.href).searchParams.get('v') || 'maison'; } catch { return 'maison'; } };
// Identifiant stable (le même qu'elle vienne de la boîte du service worker ou du centre de notifications).
const pushId = n => { let h = 0; for (const ch of `${n.tag}|${n.title}|${n.body}`) h = (h * 31 + ch.charCodeAt(0)) | 0; return `p${n.tag || 'maison'}-${(h >>> 0).toString(36)}`; };
// Icône selon le contexte : la corvée concernée, le minuteur, le frigo…
function pushIcon(n) {
  const tag = n.tag || '';
  const seq = tag.startsWith('maison-seq-') && S.chores.find(c => c.id === tag.slice(11));
  if (seq) return iconHtml(displayIcon('chores', seq));
  if (tag === 'maison-rappel') {
    const first = (n.body || '').split(/ \(|,/)[0].trim();
    const c = S.chores.find(x => x.title === first), t = !c && S.tasks.find(x => x.title === first);
    if (c) return iconHtml(displayIcon('chores', c));
    if (t) return iconHtml(displayIcon('tasks', t));
  }
  const k = tag.startsWith('timer-') ? 'alarme' : tag === 'maison-frais' ? 'frigo' : /lave-vaisselle/i.test(n.title || '') ? 'lavevaisselle' : /lessive/i.test(n.title || '') ? 'lessive' : 'rappel';
  return iconHtml('t:' + k);
}
function pushEvents() {
  return pushInbox.filter(n => n && n.at && Date.now() - n.at < DAY && !/^(aide|rappel)-/.test(n.tag || ''))   // demandes et rappels : déjà montrés par leur carte
    .map(n => ({ id: pushId(n), at: new Date(n.at).toISOString(), icon: pushIcon(n), title: n.title || 'Maison', body: n.body || '', go: { view: ['maison', 'menage', 'recettes', 'courses', 'argent', 'nuit'].includes(VIEW_OF(n.url)) ? VIEW_OF(n.url) : 'maison' } }));
}
let inboxLoaded = false;
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.me) setTimeout(loadInbox, 600); });
function popCheck() {
  if (!S.me || !S.ready || S.recovery || document.getElementById('tour') || document.getElementById('cele')) return;
  if (!inboxLoaded) { inboxLoaded = true; loadInbox(); return; }
  const seen = new Set((safeGet('maison-pop-vu') || '').split(',').filter(Boolean));
  // Tout ce qui est arrivé depuis la dernière fois (chaque notification ne s'affiche qu'une fois).
  const fresh = popEvents().filter(e => !seen.has(e.id) && !popList.some(q => q.id === e.id));
  if (!fresh.length) return;
  fresh.forEach(e => seen.add(e.id)); safeSet('maison-pop-vu', [...seen].slice(-120).join(','));
  popList = [...popList, ...fresh];
  haptic(1); popRender(true);
}
function popBox() {
  let b = document.getElementById('pop'); if (b) return b;
  b = document.createElement('div'); b.id = 'pop'; b.setAttribute('role', 'status'); b.setAttribute('aria-live', 'polite');
  b.addEventListener('click', e => {
    const t = e.target.closest('[data-pop]'); if (!t) return;
    const k = t.dataset.pop, id = t.dataset.id;
    if (k === 'open') popOpen(id);
    else if (k === 'x') { popList = popList.filter(x => x.id !== id); popRender(); }
    else if (k === 'all') popClose();
    else if (k === 'more') { popExpanded = true; popHold(); popRender(); }
  });
  // Toucher la pile la garde ouverte (on lit tranquillement) ; glisser vers le haut la ferme.
  let y0 = null;
  b.addEventListener('touchstart', e => { popHold(); y0 = e.touches[0].clientY; }, { passive: true });
  b.addEventListener('touchmove', e => { if (!popExpanded && y0 != null && e.touches[0].clientY - y0 < -28) { y0 = null; popClose(); } }, { passive: true });
  b.addEventListener('pointerdown', popHold);
  document.body.appendChild(b); return b;
}
function popHold() { if (popHeld) return; popHeld = true; clearTimeout(popRender.t); document.getElementById('pop')?.classList.add('held'); }
function popClose() { popList = []; popRender(); }
function popRender(arm) {
  const b = popBox();
  clearTimeout(popRender.t);
  if (!popList.length) { b.classList.remove('on', 'held'); popExpanded = false; popHeld = false; return; }
  const list = [...popList].reverse();   // la plus récente en haut
  const MAX = 3, folded = !popExpanded && list.length > MAX;
  const shown = folded ? list.slice(0, MAX - 1) : list;
  const card = (e, i) => `<div class="pop-item" style="--i:${i}"><button class="pop-card" data-pop="open" data-id="${esc(e.id)}">${e.icon}<span class="pop-txt"><b>${esc(e.title)}</b><span>${esc(e.body)}</span></span><span class="pop-go" aria-hidden="true">›</span></button><button class="pop-x" data-pop="x" data-id="${esc(e.id)}" aria-label="Fermer">×</button></div>`;
  const d = list.length > 1 ? 10 : 7;
  b.style.setProperty('--d', `${d}s`);
  b.innerHTML = (list.length > 1 ? `<div class="pop-head"><span>${list.length} nouveautés</span><button data-pop="all">Tout fermer</button></div>` : '')
    + `<div class="pop-list">${shown.map(card).join('')}${folded ? `<button class="pop-more" data-pop="more">+ ${list.length - shown.length} autre${list.length - shown.length > 1 ? 's' : ''} · tout voir</button>` : ''}</div>`
    + (popHeld ? '' : '<span class="pop-bar"></span>');
  b.classList.toggle('expanded', popExpanded);
  if (!b.classList.contains('on')) { void b.offsetWidth; b.classList.add('on'); }
  if (!popHeld && (arm || !popRender.t)) popRender.t = setTimeout(popClose, d * 1000);
}
function popOpen(id) {
  const e = popList.find(x => x.id === id); if (!e) return;
  popList = popList.filter(x => x.id !== id); popRender();
  const g = e.go || {};
  closeTicket(); clearReaction();
  const from = S.view; S.view = g.view || 'maison'; S.open = null; S.recette = null; S.cook = null; if (S.view === 'recettes' && from !== 'recettes') cookRestore(); safeSet('maison-view', S.view === 'nuit' ? 'maison' : S.view);
  if (g.letter) { S.loisirTab = 'mots'; S.openLetter = g.letter; const c = S.care.find(x => x.id === g.letter); if (c && !c.read_at) { c.read_at = new Date().toISOString(); api.rpc('care_mark_read', { msg: c.id }).catch(console.error); } }
  render(); window.scrollTo(0, 0);
  const el = g.el && document.getElementById(g.el);
  if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
}

// ---------------------------------------------------------------------------------------------
// Visites d'Azami : de temps en temps, après des choses faites, Azami vient parler (blague, mot doux,
// question, devinettes, secret rare). Un dialogue en plusieurs tours, un choix à chaque tour.
// Le carnet est commun : ce que l'un découvre compte pour vous deux.
// Récompense imprévisible : plus on en fait dans la journée, plus elle a de chances de venir.
const VISIT_KIND = { blague: 'Une blague', mignon: 'Un mot doux', question: 'Une question', bravo: 'Bravo', secret: 'Secret rare', devinette: 'Devinettes', cuisine: 'En cuisine', cine: 'Ciné' };
const visitState = () => (S.tips && S.tips.azami) || { last: null, day: null, n: 0, pending: null };
function visitSave(st) { if (!S.tips) S.tips = {}; tipSave('azami', st); }
const parentOf = email => personOf(email) === 'mariana' ? 'maman' : personOf(email) === 'yatoni' ? 'papa' : null;
const visitFor = v => { const me = parentOf(S.me); return !v.for || v.for === 'both' || v.for === me; };
const turnsOf = v => v.turns || [{ lines: v.lines, choices: v.choices }];
const carnetHas = id => S.carnet?.has(id);
// Azami vous appelle par vos prénoms (pas « papa » ni « maman »).
function visitText(t) {
  const meP = parentOf(S.me);
  const nameOfP = p => { const m = S.members.find(x => parentOf(x.email) === p); return m ? nameOf(m.email) : p === 'papa' ? 'Yatoni' : 'Mariana'; };
  t = String(t);
  // Yatoni fait du son pour les films : quand c'est lui qui joue, « comme papa » devient « comme toi ».
  if (meP === 'papa') t = t.replace(/\bcomme papa\b/gi, 'comme toi');
  if (meP === 'maman') t = t.replace(/\bcomme maman\b/gi, 'comme toi');
  t = t.replace(/\{toi\}/g, nameOf(S.me) || 'toi').replace(/\{autre\}/g, other() ? nameOf(other()) : 'l’autre');
  // Les mamans souris et kangourous des blagues restent des mamans.
  return t.replace(/(\b(?:une|la|Une|La|qu'une)\s)?\b([Pp]apa|[Mm]aman)\b(?!\s(?:souris|kangourou))/g, (m, det, w) => det ? m : nameOfP(w.toLowerCase()));
}
function visitPick(doneToday, kind) {
  // D'abord ce que personne de vous deux n'a encore découvert.
  let pool = VISITES.filter(v => visitFor(v) && !carnetHas(v.id));
  if (!pool.length) pool = VISITES.filter(visitFor);   // tout découvert : on recommence le tour
  const by = k => pool.filter(v => v.kind === k);
  // Après avoir cuisiné : le plus souvent, Azami vient en toque parler cuisine.
  if (kind === 'cuisine' && by('cuisine').length && Math.random() < .75) { const l = by('cuisine'); return l[Math.floor(Math.random() * l.length)]; }
  // Après un film : Azami vient avec ses lunettes 3D parler cinéma.
  if (kind === 'cine' && by('cine').length && Math.random() < .75) { const l = by('cine'); return l[Math.floor(Math.random() * l.length)]; }
  pool = pool.filter(v => v.kind !== 'cuisine' && v.kind !== 'cine').length ? pool.filter(v => v.kind !== 'cuisine' && v.kind !== 'cine') : pool;
  const r = Math.random();
  const from = by('secret').length && r < .07 ? by('secret')
    : by('bravo').length && doneToday >= 4 && r < .35 ? by('bravo')
    : by('devinette').length && r > .82 ? by('devinette')
    : pool.filter(v => v.kind !== 'secret' && v.kind !== 'bravo');
  const list = from.length ? from : pool;
  return list[Math.floor(Math.random() * list.length)];
}
// Les visites récompensent l'effort, pas automatiquement mais à force, et c'est une mise en commun :
// tout ce que vous faites tous les deux depuis la dernière visite d'Azami (chez l'un ou chez l'autre)
// remplit la même réserve de points. Cuisiner une recette compte beaucoup, une corvée lourde plus
// qu'une légère, cocher un article presque rien ; quand vous y avez mis tous les deux, ça va plus vite.
const EFFORT = { cuisine: 4, cine: 2, shop: 2, settle: 1, task: 1, achat: 0 };
const effortOf = (kind, weight) => kind === 'chore' ? Math.max(1, Number(weight) || 2) : (EFFORT[kind] ?? 1);
// Dernière visite, pour vous deux : gardée dans le carnet commun (ligne « ~visite »).
const visitLastShared = () => [S.carnetInfo?.get('~visite')?.at, visitState().last].filter(Boolean).sort().pop() || null;
function effortPool(extra) {
  const since = visitLastShared(), t0 = since ? new Date(since).getTime() : Date.now() - DAY;
  const ws = S.wins.filter(w => new Date(w.done_at).getTime() > t0);
  if (extra && !ws.some(w => w.done_by === S.me && w.kind === extra.kind && Date.now() - new Date(w.done_at).getTime() < 15000)) ws.push({ done_by: S.me, kind: extra.kind, weight: extra.weight });
  const by = {}; let pts = 0;
  for (const w of ws) { const p = effortOf(w.kind, w.weight); pts += p; by[w.done_by] = (by[w.done_by] || 0) + p; }
  const both = Object.values(by).filter(p => p >= 1).length >= 2;
  return { pts: both ? pts * 1.25 : pts, both };
}
function visitMaybe(kind, weight = 1, tries = 0) {
  if (!S.me) return;
  if (!VISITES.length) { loadVisites().then(() => VISITES.length && visitMaybe(kind, weight, tries)); return; }
  if (azamiAway()) { if (tries < 8) setTimeout(() => visitMaybe(kind, weight, tries + 1), 15000); return; }
  if (document.getElementById('cele') || document.getElementById('tour') || document.getElementById('visite')) { if (tries < 40) setTimeout(() => visitMaybe(kind, weight, tries + 1), 1500); return; }
  const st = visitState(); const today = isoDate(new Date());
  const pts = effortOf(kind, weight);
  if (st.pending) { visitInvite(); return; }
  const n = st.day === today ? st.n || 0 : 0;
  // Un peu rare : 3 visites par jour au plus pour vous deux ensemble, et 1 h 30 entre deux, chez l'un ou chez l'autre.
  const nShared = [...(S.carnetInfo?.keys() || [])].filter(k => k.startsWith(`~jour-${today}-`)).length;
  if (nShared >= 3) return;
  const lastV = visitLastShared(); if (lastV && Date.now() - new Date(lastV).getTime() < 90 * 60000) return;
  const doneToday = S.wins.filter(w => w.done_by === S.me && isoDate(new Date(w.done_at)) === today).length || 1;
  const first = !st.last && !VISITES.some(v => carnetHas(v.id));   // la toute première fois, pour vous deux
  // environ une chance sur cinq après une recette seule ; il faut une vraie série d'efforts à deux pour qu'elle vienne souvent
  const pool = effortPool({ kind, weight });
  const p = first ? 1 : Math.min(.7, pool.pts / 18);
  if (!pts || Math.random() > p) return;
  const v = visitPick(doneToday, kind); if (!v) return;
  const now = new Date().toISOString();
  visitSave({ ...st, pending: v.id, day: today, n: n + 1, last: now });
  // la réserve commune repart de zéro, pour vous deux
  if (!S.carnetInfo) S.carnetInfo = new Map();
  S.carnetInfo.set('~visite', { by: S.me, at: now });
  api.upsert('azami_carnet', { id: '~visite', found_by: S.me, found_at: now }).catch(e => console.warn('carnet', e));
  const jour = `~jour-${today}-${nShared + 1}-${S.me}`;
  S.carnetInfo.set(jour, { by: S.me, at: now });
  api.upsert('azami_carnet', { id: jour, found_by: S.me, found_at: now }).catch(e => console.warn('carnet', e));
  for (const k of [...S.carnetInfo.keys()]) if (k.startsWith('~jour-') && k.slice(6, 16) < isoDate(new Date(Date.now() - 2 * DAY))) { S.carnetInfo.delete(k); api.remove('azami_carnet', { id: k }).catch(() => {}); }
  visitInvite(true);
}
// L'invitation reste là tant qu'on ne l'a pas ouverte : le temps d'appeler l'autre pour qu'il vienne voir.
function visitInvite(fresh) {
  if (!VISITES.length) { loadVisites().then(() => VISITES.length && visitInvite(fresh)); return; }
  if (azamiAway()) return;
  const st = visitState(); const v = VISITES.find(x => x.id === st.pending);
  let el = document.getElementById('visite-invite');
  if (!v) { el?.remove(); return; }
  if (document.getElementById('visite')) return;
  if (!el) {
    el = document.createElement('button'); el.id = 'visite-invite'; el.type = 'button';
    el.addEventListener('click', () => visitOpen(visitState().pending));
    document.body.appendChild(el);
  }
  const rare = v.kind === 'secret', quiz = v.kind === 'devinette';
  el.className = rare ? 'rare' : '';
  el.setAttribute('aria-label', 'Azami a quelque chose à te dire');
  el.innerHTML = `<img src="${azamiSrc('v44_visite_appel')}" alt="" width="96" height="96"><span class="vi-bubble"><b>${rare ? 'Psst… un secret !' : quiz ? 'Je te lance un défi !' : `Psst… ${esc(visitText('{toi}'))} !`}</b><span>${rare ? 'Un secret rare, rien que pour toi' : quiz ? 'Trois devinettes. Tu oses ?' : 'J’ai un truc à te dire'}</span></span>`;
  requestAnimationFrame(() => el.classList.add('on'));
  if (fresh) { haptic('heavy'); meow(true, .7, pick(['question', 'trille', 'chirp', 'mrrr', 'miaou2'])); }
}
let visitCur = null;
function visitOpen(id, replay = false) {
  if (!VISITES.length) { loadVisites().then(() => VISITES.length && visitOpen(id, replay)); return; }
  const v = VISITES.find(x => x.id === id); if (!v) return;
  document.getElementById('visite-invite')?.remove();
  clearReaction(); popClose();
  document.getElementById('visite')?.remove();
  const box = document.createElement('div'); box.id = 'visite';
  box.innerHTML = `<div class="visite-card ${v.kind === 'secret' ? 'rare' : ''}" role="dialog" aria-modal="true" aria-label="Azami te parle">
    <p class="visite-kind">${esc(VISIT_KIND[v.kind] || 'Azami')}${replay ? ' · dans votre carnet' : ''}</p><button class="visite-x" data-v="close" aria-label="${replay ? 'Fermer' : 'Plus tard'}">×</button>
    <img class="visite-azami" src="${azamiSrc('v44_visite_parle')}" alt="" width="200" height="200">
    <div class="visite-talk" aria-live="polite"></div>
    <div class="visite-foot"></div></div>`;
  document.body.appendChild(box);
  requestAnimationFrame(() => box.classList.add('on'));
  haptic('medium');
  visitCur = { v, replay, box, turn: 0, score: 0, turns: turnsOf(v) };
  visitFollow(box.querySelector('.visite-talk'));
  box.addEventListener('click', e => {
    if (e.target.closest('.visite-azami')) { if (!azamiPet(e.target.closest('.visite-azami'), true) && !visitCur?.hold) meow(true, .5, Math.random() < .5 ? pick(['ronron', 'ronronmrr']) : null); return; }
    const b = e.target.closest('[data-v]');
    if (!b) { if (visitCur?.typing) visitCur.skip = true; return; }
    if (b.dataset.v === 'choice') visitChoose(Number(b.dataset.i));
    if (b.dataset.v === 'close') visitClose();
    if (b.dataset.v === 'gacha') gachaOpen(box);
    // « Merci Azami » : une petite récompense, un carillon qui monte et son petit brrrt content
    if (b.dataset.v === 'merci') { sfx('merci'); if (SOUNDS) setTimeout(() => meow(true, .32, 'trille'), 380); haptic('medium'); burst('hearts', b, 10); setTimeout(visitClose, 260); }
  });
  visitTurn();
}
// Costume selon la visite : lunettes de psy pour les séances, nœud papillon pour les devinettes.
const visitTalkImg = v => v.kind === 'devinette' ? 'visite_quiz' : v.kind === 'cuisine' ? 'visite_chef_parle' : v.kind === 'cine' ? 'visite_cine_parle' : /^h/.test(v.id) ? 'visite_psy' : 'visite_parle';
const visitWaitImg = v => v.kind === 'devinette' ? 'visite_quiz' : v.kind === 'cuisine' ? 'visite_chef_ecoute' : v.kind === 'cine' ? 'visite_cine_ecoute' : /^h/.test(v.id) ? 'visite_psy' : 'visite_ecoute';
// Le fil suit toujours le dernier message, sauf si on remonte exprès pour relire (il reprend dès qu'on redescend).
function visitFollow(talk) {
  let follow = true, prog = false;
  const stick = () => { if (!follow) return; prog = true; talk.scrollTop = talk.scrollHeight; requestAnimationFrame(() => { prog = false; }); };
  talk.addEventListener('scroll', () => { if (prog) return; follow = talk.scrollHeight - talk.clientHeight - talk.scrollTop < 40; }, { passive: true });
  const ro = new ResizeObserver(stick); const mo = new MutationObserver(() => { stick(); requestAnimationFrame(stick); });
  mo.observe(talk, { childList: true, subtree: true, characterData: true });
  ro.observe(talk);
  talk.follow = () => { follow = true; stick(); };
}
function visitTurn() {
  const t = visitCur.turns[visitCur.turn];
  visitImg(visitTalkImg(visitCur.v));
  visitSay(t.lines, () => visitChoices());
}
const visitImg = name => { const img = visitCur?.box.querySelector('.visite-azami'); if (!img || visitCur.hold) return; img.src = ['visite_parle', 'visite_ecoute', 'visite_appel', 'visite_psy', 'visite_quiz', 'visite_chef_parle', 'visite_chef_ecoute', 'visite_cine_parle', 'visite_cine_ecoute'].includes(name) ? azamiSrc('v44_' + name) : (reducedMotion() ? `azami/v44/reactions/statiques/${name}_statique.svg` : `azami/v44/reactions/${name}_anime.svg?${Date.now()}`); };
// Les répliques s'écrivent lettre par lettre (toucher la carte pour aller plus vite).
function voixAzami(ch, up) {
  if (!SOUNDS || !audioCtx || audioCtx.state !== 'running' || document.hidden) return;
  try { parle(audioCtx, ch, .06, up); } catch {}
}
async function visitSay(lines, done, who = 'az') {
  const cur = visitCur; const talk = cur.box.querySelector('.visite-talk');
  // La conversation suit toute seule le texte qui s'écrit (comme une messagerie).
  const stick = () => talk.follow?.();
  for (const raw of lines || []) {
    const txt = visitText(raw);
    const p = document.createElement('p'); p.className = `bubble ${who}`; talk.appendChild(p); talk.follow?.();
    cur.typing = true; cur.skip = false;
    if (reducedMotion()) p.textContent = txt;
    else for (let i = 1, n = 0; i <= txt.length; i++) {
      if (cur.skip) { p.textContent = txt; stick(); break; }
      p.textContent = txt.slice(0, i); stick();
      const ch = txt[i - 1];
      // sa petite voix : un blip toutes les deux lettres, qui monte en fin de question
      if (who === 'az' && /\p{L}/u.test(ch) && n++ % 2 === 0) voixAzami(ch, /\?\s*$/.test(txt) && i > txt.length - 8 ? .14 : 0);
      await new Promise(r => setTimeout(r, /[.!?…]/.test(ch) ? 260 : /[,;:]/.test(ch) ? 140 : 26));
      if (visitCur !== cur) return;
    }
    cur.typing = false;
    stick();
    await new Promise(r => setTimeout(r, 420));
    if (visitCur !== cur) return;
  }
  done && done();
}
function visitChoices() {
  const { box, turns, turn } = visitCur; const t = turns[turn];
  visitImg(visitWaitImg(visitCur.v));
  const n = turns.length;
  box.querySelector('.visite-foot').innerHTML = `${n > 1 ? `<p class="visite-step">${visitCur.v.kind === 'devinette' ? `Devinette ${turn + 1} sur ${n}` : `${turn + 1} / ${n}`}</p>` : ''}<div class="visite-choices">${t.choices.map((c, i) => `<button class="btn ${i ? 'ghost' : ''}" data-v="choice" data-i="${i}">${esc(visitText(c.label))}</button>`).join('')}</div>`;
  const talk = box.querySelector('.visite-talk'); requestAnimationFrame(() => { talk.scrollTop = talk.scrollHeight; });
}
const SCORE_LINES = [
  ['Zéro sur trois.', 'Je ne dirai rien à {autre}. Enfin si. Je vais tout raconter.'],
  ['Un sur trois.', 'C’est un début. Un tout petit début. Comme une croquette.'],
  ['Deux sur trois !', 'Pas mal du tout. Je te laisse cinq centimètres de canapé.'],
  ['Trois sur trois !', 'Incroyable. Tu as gagné le droit de me gratter le menton. C’est un immense honneur.'],
];
function visitChoose(i) {
  const cur = visitCur; const { v, box, turns } = cur; const t = turns[cur.turn]; const c = t?.choices[i];
  if (!c || cur.typing || cur.busy) return;
  cur.busy = true; haptic(1);
  if (c.ok === true) cur.score++;
  box.querySelector('.visite-foot').innerHTML = '';
  const talk = box.querySelector('.visite-talk');
  const me = document.createElement('p'); me.className = `bubble me ${c.ok === true ? 'ok' : c.ok === false ? 'ko' : ''}`; me.textContent = visitText(c.label); talk.appendChild(me); talk.follow?.();
  requestAnimationFrame(() => { talk.scrollTop = talk.scrollHeight; });
  if (cur.turn >= 0 && talk.children.length > 3) box.querySelector('.visite-card')?.classList.add('long');   // plus de place pour la conversation
  let mood = ['rire', 'coeur', 'fier', 'malice'].includes(c.mood) ? c.mood : 'rire';
  if (c.ok === false || mood === 'malice') mood = Math.random() < .5 ? 'langue' : 'malice';   // de temps en temps, elle tire la langue
  if (c.ok === true) mood = 'fier';
  setTimeout(() => {
    if (visitCur !== cur) return;
    visitImg((visitCur.v.kind === 'cuisine' ? 'visite_chef_' : visitCur.v.kind === 'cine' && mood !== 'langue' ? 'visite_cine_' : 'visite_') + mood);
    meow(true, .55, pick({ rire: ['chirp', 'gazouille', 'mewmew'], coeur: ['ronron', 'ronronmrr', 'mrrr'], fier: ['long', 'miaou2'], malice: ['grogne', 'mrrr', 'eternue'], langue: ['mew', 'mewmew'] }[mood] || ['miaou']));
    visitSay(c.reply, () => {
      cur.busy = false;
      cur.turn++;
      if (cur.turn < turns.length) { setTimeout(() => { if (visitCur === cur) visitTurn(); }, 500); return; }
      const end = () => visitEnd();
      if (v.kind === 'devinette') { const sc = SCORE_LINES[Math.min(3, cur.score)]; setTimeout(() => { if (visitCur !== cur) return; visitImg(cur.score >= 2 ? 'visite_fier' : 'visite_malice'); visitSay(sc, end); }, 500); }
      else end();
    });
  }, 450);
}
function visitEnd() {
  const { v, box, replay } = visitCur;
  setTimeout(() => visitImg(visitWaitImg(v)), 600);
  let note = '';
  if (!replay) {
    const isNew = !carnetHas(v.id);
    const before = carnetCount();
    if (!S.carnet) S.carnet = new Set();
    if (!S.carnetInfo) S.carnetInfo = new Map();
    S.carnet.add(v.id);
    if (isNew) { S.carnetInfo.set(v.id, { by: S.me, at: new Date().toISOString() }); api.insert('azami_carnet', { id: v.id, found_by: S.me }).catch(e => console.warn('carnet', e)); }
    visitSave({ ...visitState(), pending: null });
    const total = VISITES.length, got = carnetCount();
    const pal = isNew && PALIERS.find(p => before < p[0] && got >= p[0]);
    if (isNew) {
      // Effet gacha : une capsule tombe, gigote, et on l'ouvre pour découvrir la carte.
      visitCur.gacha = { v, got, total, pal };
      box.querySelector('.visite-foot').innerHTML = gachaHtml(v);
      gachaDrop(box);
      return;
    }
    note = `<p class="visite-note">Déjà dans votre carnet · ${got} / ${total}</p>`;
  }
  box.querySelector('.visite-foot').innerHTML = `${note}<div class="visite-choices"><button class="btn" data-v="merci">Merci Azami</button></div>`;
}
// Gacha : rareté selon la famille (les secrets sont les plus rares), couleur de capsule assortie.
const RARETE = { blague: 1, mignon: 1, question: 1, devinette: 2, cuisine: 2, cine: 2, bravo: 2, secret: 3 };
const RARE_NAME = ['', 'Commune', 'Peu commune', 'Secrète'];
function gachaHtml(v) {
  const r = RARETE[v.kind] || 1;
  return `<div class="gacha r${r}" style="--k:${KIND_COL[v.kind]}">
    <button type="button" class="gacha-cap" data-v="gacha" aria-label="Ouvrir la capsule"><span class="cap-top"></span><span class="cap-bot"></span><span class="cap-shine"></span></button>
    <p class="gacha-hint">Une capsule pour votre carnet ! <b>Touche-la pour l’ouvrir.</b></p></div>`;
}
function gachaDrop(box) {
  if (SOUNDS && audioCtx?.state === 'running') scheduleBruits(audioCtx, [['manivelle', 0], ['capsule', .55]], audioCtx.currentTime + .02, .5);
  setTimeout(() => haptic('medium'), 560);
}
function gachaOpen(box) {
  const g = visitCur?.gacha; const el = box.querySelector('.gacha'); if (!g || !el || el.classList.contains('open')) return;
  const { v, got, total, pal } = g, r = RARETE[v.kind] || 1;
  el.classList.add('open'); haptic('heavy');
  if (SOUNDS && audioCtx?.state === 'running') scheduleBruits(audioCtx, [['pop_capsule', 0]], audioCtx.currentTime + .01, .55);
  setTimeout(() => {
    sfx(r >= 3 ? 'big' : r === 2 ? 'done' : 'merci');
    el.insertAdjacentHTML('beforeend', `<div class="gacha-card" style="--k:${KIND_COL[v.kind]}">
      <span class="gacha-stars" aria-label="${RARE_NAME[r]}">${'★'.repeat(r)}<small>${RARE_NAME[r]}</small></span>
      ${kindBadge(v.kind)}<b class="gacha-kind">${esc(VISIT_KIND[v.kind] || '')}</b>
      <span class="gacha-txt">${esc(visitText(turnsOf(v)[0].lines[0]))}</span>
      <span class="gacha-count">Nouvelle carte · ${got} / ${total}</span></div>`);
    const card = el.querySelector('.gacha-card');
    burst(r >= 3 ? 'confetti' : 'sparkle', card, r >= 3 ? 34 : r === 2 ? 18 : 10);
    if (r >= 3) setTimeout(() => meow(true, .4, 'chirp'), 500);
    const foot = box.querySelector('.visite-foot');
    setTimeout(() => {
      if (pal) { foot.insertAdjacentHTML('beforeend', `<p class="visite-palier"><b>Nouveau palier : ${esc(pal[1])}</b> ${esc(pal[2])}</p>`); setTimeout(() => { sfx('big'); burst('confetti', foot.querySelector('.visite-palier'), 30); haptic('heavy'); }, 250); }
      foot.insertAdjacentHTML('beforeend', `<div class="visite-choices"><button class="btn" data-v="merci">Merci Azami</button></div>`);
      visitCur && box.querySelector('.visite-talk')?.follow?.();
    }, 700);
  }, 380);
}
function visitClose() {
  const box = document.getElementById('visite'); if (!box) return;
  box.classList.remove('on'); setTimeout(() => { box.remove(); if (visitState().pending) visitInvite(); }, 320); visitCur = null; haptic(1);
  if (S.view === 'nuit') render();
}
// Pour essayer : ?azami=test ouvre tout de suite une visite au hasard (ou ?azami=devinette, secret, blague…).
let visitTestDone = false;
function visitTestHook() {
  if (!VISITES.length) { loadVisites().then(() => VISITES.length && visitTestHook()); return; }
  if (visitTestDone || !S.me || !S.ready || document.getElementById('tour')) return;
  const q = new URLSearchParams(location.search).get('azami'); if (!q) return;
  visitTestDone = true;
  const pool = VISITES.filter(v => visitFor(v) && (q === 'test' || v.kind === q || v.id === q));
  const v = pool[Math.floor(Math.random() * pool.length)]; if (!v) return;
  setTimeout(() => visitOpen(v.id, true), 600);
}
// Le carnet commun : tout ce qu'Azami vous a déjà dit, à vous deux, à relire ou à refaire écouter.
// Notre carnet d'Azami : un album commun. Les visites découvertes deviennent des cartes à collectionner,
// par famille (blagues, mots doux, devinettes, secrets…), avec des paliers à débloquer à deux.
const KIND_COL = { blague: '#F7C948', mignon: '#F48FA0', question: '#78C8F0', bravo: '#F2A65A', secret: '#E9B43A', devinette: '#A89BE8', cuisine: '#8CCB7E', cine: '#E7505A' };
const KIND_ICON = {
  blague: '<path d="M7 10.5q2-2.4 4 0M13 10.5q2-2.4 4 0" fill="none" stroke-width="2.2" stroke-linecap="round"/><path d="M6.5 14h11q-1.2 5-5.5 5t-5.5-5z" stroke-width="1.8" stroke-linejoin="round" fill="#fff"/>',
  mignon: '<path d="M12 19.5C5 15 3.5 11.5 5 8.6c1.4-2.7 5-2.8 7 .2 2-3 5.6-2.9 7-.2 1.5 2.9 0 6.4-7 10.9z" fill="#fff" stroke-width="2" stroke-linejoin="round"/>',
  question: '<path d="M5 6.5h14a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H11l-4 3.2V16.5H5A1.5 1.5 0 0 1 3.5 15V8A1.5 1.5 0 0 1 5 6.5z" fill="#fff" stroke-width="1.9" stroke-linejoin="round"/><circle cx="8.5" cy="11.5" r="1.2" stroke="none"/><circle cx="12" cy="11.5" r="1.2" stroke="none"/><circle cx="15.5" cy="11.5" r="1.2" stroke="none"/>',
  bravo: '<path d="M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4 7.2 18.9l.9-5.4L4.2 9.7l5.4-.8z" fill="#fff" stroke-width="1.9" stroke-linejoin="round"/>',
  secret: '<rect x="6" y="11" width="12" height="9" rx="2" fill="#fff" stroke-width="1.9"/><path d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11" fill="none" stroke-width="2"/><circle cx="12" cy="15.5" r="1.4" stroke="none"/>',
  devinette: '<path d="M9 9.2Q9 6 12 6t3 3c0 2.2-3 2.4-3 4.8" fill="none" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="17.8" r="1.5" stroke="none"/>',
  cine: '<path d="M4.5 10h15v9a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19z" fill="#fff" stroke-width="1.9" stroke-linejoin="round"/><path d="M4.2 9.6l14.5-3.9-.9-3.2L3.3 6.4z" fill="#fff" stroke-width="1.7" stroke-linejoin="round"/><path d="M7.6 5.3l2 3.1M11.6 4.2l2 3.1M15.5 3.2l2 3.1" stroke-width="1.6"/>',
  cuisine: '<path d="M7.5 13.5Q4 13 4.5 10q.5-2.6 3.3-2.2Q8.5 5 12 5t4.2 2.8q2.8-.4 3.3 2.2.5 3-3 3.5z" fill="#fff" stroke-width="1.9" stroke-linejoin="round"/><path d="M7.5 13.5h9V18h-9z" fill="#fff" stroke-width="1.9" stroke-linejoin="round"/>',
};
const kindBadge = (k, cls = '') => `<span class="kbadge ${cls}" style="--k:${KIND_COL[k] || '#ccc'}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="#2A1C15" stroke="#2A1C15">${KIND_ICON[k] || KIND_ICON.question}</svg></span>`;
const PALIERS_ = () => [[5, 'Premiers ronrons', 'Azami vous fait confiance.'], [15, 'Petits confidents', 'Elle vous raconte ses histoires.'], [40, 'Meilleurs amis', 'Vous êtes son public préféré.'],
  [80, 'Clan des moustaches', 'Vous parlez couramment le chat.'], [150, 'Famille Azami', 'Elle ne garde presque plus de secrets.'], [300, 'Légendes du canapé', 'On parlera de vous dans les coussins.'], [VISITES.length || 9999, 'Carnet complet', 'Vous avez tout entendu. Elle en est très fière.']];
const PALIERS = { find: f => PALIERS_().find(f), map: f => PALIERS_().map(f), [Symbol.iterator]: () => PALIERS_()[Symbol.iterator]() };
const carnetCount = () => VISITES.filter(v => carnetHas(v.id)).length;
const fmtDay = iso => new Date(iso).toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' });
function carnetSection() {
  if (!VISITES.length) { loadVisites().then(() => { if (VISITES.length && S.view === 'nuit') render(); }); return '<section class="carnet-box" id="carnet"><p class="hint">Le carnet d’Azami arrive…</p></section>'; }
  const total = VISITES.length, got = VISITES.filter(v => carnetHas(v.id)), n = got.length;
  const kinds = Object.keys(VISIT_KIND).map(k => [k, VISITES.filter(v => v.kind === k).length, got.filter(v => v.kind === k).length]).filter(x => x[1]);
  const sel = S.carnetKind || '';
  const next = PALIERS.find(p => n < p[0]), prevAt = [...PALIERS].reverse().find(p => n >= p[0])?.[0] || 0;
  const pct = Math.round(n / Math.max(1, total) * 100);
  const info = id => S.carnetInfo?.get(id);
  // Les plus récentes d'abord ; celles qu'on ne peut pas rejouer (pour l'autre) restent visibles, sans le bouton.
  const list = got.filter(v => !sel || v.kind === sel).sort((a, b) => String(info(b.id)?.at || '').localeCompare(String(info(a.id)?.at || '')));
  const shown = list.slice(0, 12 + 12 * (S.carnetMore || 0));
  const left = (sel ? VISITES.filter(v => v.kind === sel).length : total) - list.length;
  const card = (v, i) => {
    const x = info(v.id), fresh = x?.at && Date.now() - new Date(x.at).getTime() < DAY, mine = visitFor(v);
    const who = x?.by ? (x.by === S.me ? 'toi' : nameOf(x.by)) : '';
    return `<li style="--i:${i}"><button type="button" class="ccard ${v.kind === 'secret' ? 'rare' : ''}" style="--k:${KIND_COL[v.kind]}" ${mine ? `data-action="visite-replay" data-id="${v.id}"` : `data-action="carnet-other" data-id="${v.id}"`}>
      ${fresh ? '<span class="ccard-new">Nouveau</span>' : ''}${kindBadge(v.kind)}<span class="ccard-txt">${esc(visitText(turnsOf(v)[0].lines[0]))}</span>
      <span class="ccard-meta">${x?.at ? esc(fmtDay(x.at)) : ''}${who ? ` · racontée à ${esc(who)}` : ''}</span></button></li>`;
  };
  const lockedN = Math.min(left, shown.length < 12 ? Math.max(2, 4 - (shown.length % 2)) : 2);
  const locked = Array.from({ length: lockedN }, (_, i) => `<li style="--i:${shown.length + i}"><button type="button" class="ccard locked" data-action="carnet-locked"><span class="ccard-q" aria-hidden="true">?</span><span class="ccard-txt">À découvrir</span></button></li>`).join('');
  return `<section class="carnet-box" id="carnet">
    <div class="carnet-head">
      <div class="carnet-title"><h2>Le carnet d’Azami</h2><p>${n ? `<b>${n}</b> ${n > 1 ? 'visites découvertes' : 'visite découverte'} à deux, sur ${total}` : 'Ce qu’Azami vous raconte se range ici, pour vous deux.'}</p></div>
      <div class="carnet-ring" style="--p:${pct}" aria-label="${pct} %"><span>${pct}<small>%</small></span></div>
    </div>
    ${next ? `<div class="carnet-goal"><div class="carnet-goal-top"><span>Prochain palier : <b>${esc(next[1])}</b></span><span>${n} / ${next[0]}</span></div>
      <div class="carnet-bar" style="--p:${Math.round((n - prevAt) / Math.max(1, next[0] - prevAt) * 100)}%"><span></span></div>
      <p class="carnet-goal-sub">Encore ${next[0] - n} ${next[0] - n > 1 ? 'visites' : 'visite'} pour le débloquer.</p></div>` : '<p class="carnet-goal-sub">Carnet complet. Azami en ronronne encore.</p>'}
    ${(() => { const pool = effortPool(), lvl = Math.min(5, Math.round(pool.pts / 18 * 5)); return `<div class="carnet-energy"><span class="ce-paws" aria-label="${lvl} sur 5">${[0, 1, 2, 3, 4].map(k => `<svg class="${k < lvl ? 'on' : ''}" viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="15.5" rx="5" ry="4.2"/><circle cx="6.2" cy="10" r="2.2"/><circle cx="10" cy="6.6" r="2.2"/><circle cx="14" cy="6.6" r="2.2"/><circle cx="17.8" cy="10" r="2.2"/></svg>`).join('')}</span><p><b>Vos efforts à deux.</b> Tout ce que vous faites s’additionne : plus c’est plein, plus Azami a de chances de venir.${pool.both ? ' À deux, ça va plus vite.' : ''}</p></div>`; })()}
    <div class="carnet-stickers" role="list" aria-label="Paliers">${PALIERS.map(([at, name, txt]) => `<button type="button" role="listitem" class="sticker ${n >= at ? 'on' : ''}" data-action="carnet-palier" data-at="${at}" aria-label="${esc(name)} : ${n >= at ? 'débloqué' : `à ${at} visites`}"><span class="sticker-face">${n >= at ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19.5C5 15 3.5 11.5 5 8.6c1.4-2.7 5-2.8 7 .2 2-3 5.6-2.9 7-.2 1.5 2.9 0 6.4-7 10.9z" fill="#F48FA0" stroke="#2A1C15" stroke-width="1.8"/></svg>' : `<b>${at}</b>`}</span><span class="sticker-name">${esc(name)}</span></button>`).join('')}</div>
    <div class="carnet-tabs">
      <button type="button" data-action="carnet-kind" data-k="" aria-pressed="${!sel}">Tout <b>${n}/${total}</b></button>
      ${kinds.map(([k, t, g]) => `<button type="button" class="${k === 'secret' ? 'rare' : ''}" data-action="carnet-kind" data-k="${k}" aria-pressed="${sel === k}">${kindBadge(k, 'sm')}${esc(VISIT_KIND[k])} <b>${g}/${t}</b></button>`).join('')}
    </div>
    <ul class="carnet-grid">${shown.map(card).join('')}${locked}</ul>
    ${list.length > shown.length ? `<button type="button" class="link carnet-more" data-action="carnet-more">Voir ${Math.min(12, list.length - shown.length)} de plus</button>` : ''}
    ${left > lockedN ? `<p class="carnet-left">Encore ${left} ${sel ? `« ${esc(VISIT_KIND[sel].toLowerCase())} »` : 'visites'} à découvrir.</p>` : ''}
  </section>`;
}
function openHelp(kind, id) {
  const row = kind === 'task' ? S.tasks.find(t => t.id === id) : kind === 'chore' ? S.chores.find(c => c.id === id) : null;
  const o = other(); if (!o) return;
  const label = row ? (/^vaisselle$/i.test(row.title.trim()) ? 'Vaisselle à la main' : row.title) : '';
  const old = document.getElementById('ticket'); if (old) old.remove();
  const box = document.createElement('div'); box.id = 'ticket';
  const opts = row ? [['remplacer', 'Tu peux le faire à ma place ?'], ['ensemble', 'On le fait ensemble ?']] : [['souffler', 'J’ai besoin de souffler, tu peux prendre le relais ?']];
  box.innerHTML = `<div class="ticket-card help-sheet" role="dialog" aria-label="Demander de l'aide"><p class="ticket-title">Demander à ${esc(nameOf(o))}</p>${label ? `<p class="ticket-sub">${esc(label)}</p>` : ''}
    <div class="help-opts">${opts.map(([k, l]) => `<button class="btn ${k === opts[0][0] ? '' : 'ghost'}" data-action="help-send" data-kind="${kind || ''}" data-id="${id || ''}" data-ask="${k}">${esc(l)}</button>`).join('')}</div>
    <p class="hint">${esc(nameOf(o))} reçoit une notification et peut répondre en un geste.</p>
    <div class="form-actions"><button class="btn ghost small" data-action="sheet-close">Annuler</button></div></div>`;
  box.addEventListener('click', e => { if (e.target === box) closeTicket(); });
  document.body.appendChild(box); requestAnimationFrame(() => box.classList.add('on')); haptic(1);
}
async function pingHelp(id) {
  if (DEMO || !sb) return;
  try { await sb.functions.invoke('rappels', { body: { action: 'aide', id } }); } catch (e) { console.warn('aide', e); }
}

// Rendu ----------------------------------------------------------------------

const ICONS = {
  maison: '<path d="M4 10.5 12 4l8 6.5V20H4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 20v-5h4v5" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  menage: '<path d="M14 3 10.5 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M7 11h8l2 9H5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 15v5M13 15v5" stroke="currentColor" stroke-width="1.2"/>',
  courses: '<path d="M4 9h16l-1.6 10H5.6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.5 9 11 4M15.5 9 13 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  argent: '<rect x="3.5" y="6.5" width="17" height="11" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  recettes: '<path d="M6 3v7a3 3 0 0 0 6 0V3M9 3v18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M18 3c-2 2-3 5-3 8h3v10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  nuit: '<path d="M12 20s-7-4.4-7-9.6A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.4C19 15.6 12 20 12 20z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
};

function nav() {
  const openShop = S.shopping.filter(s => !s.checked).length;
  const unread = S.care.filter(c => c.recipient === S.me && !c.read_at).length;
  const items = [['maison', 'Maison'], ['menage', 'Ménage'], ['recettes', 'Recettes'], ['courses', 'Courses'], ['argent', 'Argent'], ['nuit', 'Loisirs']];
  return `<nav class="nav" aria-label="Sections"><ul>${items.map(([k, l]) => {
    let mark = '';
    if (k === 'courses' && openShop) mark = `<span class="badge" aria-hidden="true">${openShop}</span>`;
    if (k === 'nuit' && unread) mark = `<span class="dot" role="img" aria-label="Nouveau mot"></span>`;
    const label = k === 'courses' && openShop ? `aria-label="Courses, ${pl(openShop, 'article', 'articles')}"` : '';
    return `<li><button data-action="go" data-view="${k}" ${label} ${S.view === k ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>${l}${mark}</button></li>`;
  }).join('')}</ul></nav>`;
}

function demoBar() {
  if (S.offline) return `<div class="demo"><span>Hors-ligne, lecture seule. Dernière synchro ${esc(S.snapshotAt ? ago(new Date(S.snapshotAt).toISOString()) : 'inconnue')}.</span><button class="link" data-action="retry">Réessayer</button></div>`;
  if (!DEMO) return '';
  return `<div class="demo"><span>Démo : données sur cet appareil</span><button class="link" data-action="demo-swap">Voir comme ${esc(nameOf(other()))}</button></div>`;
}

// En-tête des écrans sans compte : Azami devant la porte (connexion) ou endormie près de la box (hors ligne).
const loginHd = (scene = 'v44_connexion', alt = 'Azami attend devant la porte') => `<div class="login-az">${azami(scene, alt)}</div><h1>Maison</h1>`;
function viewOffline() {
  return `<section class="login">${loginHd('v44_hors_ligne', 'Azami somnole en attendant le réseau')}
    <p>Impossible de joindre la maison pour le moment. Vérifie la connexion, puis réessaie.</p>
    <button class="btn" data-action="retry">Réessayer</button>
    <button class="link" data-action="logout">Se déconnecter</button></section>`;
}


// Mise à jour de l'écran sans tout reconstruire : on garde les éléments déjà affichés (images comprises)
// et on ne change que ce qui diffère. Évite que les icônes clignotent à chaque actualisation.
const nodeKey = n => n.nodeType === 1 ? (n.id || n.dataset?.id || n.dataset?.fold || n.dataset?.view || '') : '';
function sameNode(a, b) {
  if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) return false;
  return a.nodeType !== 1 || nodeKey(a) === nodeKey(b);
}
function morphAttrs(a, b) {
  for (const { name } of [...a.attributes]) {
    if (!b.hasAttribute(name) && !(name === 'open' && a.nodeName === 'DETAILS')) a.removeAttribute(name);
  }
  for (const { name, value } of [...b.attributes]) {
    if (name === 'open' && a.nodeName === 'DETAILS') continue;
    if (a.getAttribute(name) !== value) a.setAttribute(name, value);
  }
  if (a.nodeName === 'INPUT' || a.nodeName === 'TEXTAREA' || a.nodeName === 'SELECT') {
    if (a.type === 'checkbox' || a.type === 'radio') { if (a.checked !== b.checked) a.checked = b.checked; }
    else if (document.activeElement !== a && a.value !== b.value) a.value = b.value;
  }
}
function morphNode(a, b) {
  if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
  morphAttrs(a, b);
  if (a.nodeName === 'TEXTAREA') return;
  morphChildren(a, b);
}
function morphChildren(from, to) {
  let a = from.firstChild, b = to.firstChild;
  while (b) {
    const nb = b.nextSibling;
    // Azami déjà posé : on garde la même image si la scène n'a pas changé.
    if (a && b.nodeType === 1 && b.classList.contains('azami-slot') && a.nodeName === 'IMG' && a === azamiImgs[b.dataset.scene]) { a.alt = b.dataset.alt || ''; a = a.nextSibling; b = nb; continue; }
    if (!a) { from.appendChild(b); b = nb; continue; }
    if (sameNode(a, b)) { morphNode(a, b); a = a.nextSibling; b = nb; continue; }
    // Liste où un élément a été ajouté ou retiré : on cherche plus loin la même ligne.
    const k = nodeKey(b);
    if (k) {
      let f = a.nextSibling; while (f && !(f.nodeType === 1 && f.nodeName === b.nodeName && nodeKey(f) === k)) f = f.nextSibling;
      if (f) { from.insertBefore(f, a); morphNode(f, b); b = nb; continue; }
    }
    from.insertBefore(b, a); b = nb;
    // l'ancien nœud sera réutilisé plus loin s'il correspond, sinon retiré à la fin
  }
  while (a) { const n = a.nextSibling; if (!(a.nodeType === 1 && a.classList.contains('hap'))) from.removeChild(a); a = n; }
}
// ── Nos icônes : dessinées pour la maison (trait rond, chaud, un peu dodu), jamais d'émoji ──
// Toutes en 24×24, couleur héritée du texte, taille 1em : elles suivent la taille de police de leur bouton.
const IC = {
  non: '<path d="M7 7l10 10M17 7 7 17" stroke-width="2.6"/>',
  bof: '<path d="M4.6 10.2 5 4.2l4.3 3.1h5.4L19 4.2l.4 6c.7 1 1.1 2.2 1.1 3.5 0 3.9-3.8 6.8-8.5 6.8s-8.5-2.9-8.5-6.8c0-1.3.4-2.5 1.1-3.5z"/><path d="M8.3 12.6h2.2M13.5 12.6h2.2M10.6 16.2h2.8"/>',
  vu: '<path d="M2.6 12S6 5.8 12 5.8 21.4 12 21.4 12 18 18.2 12 18.2 2.6 12 2.6 12z"/><circle cx="12" cy="12" r="3.1" fill="currentColor" stroke="none"/><circle cx="13.2" cy="10.9" r="1" fill="var(--icn-bg, #2A1C15)" stroke="none"/>',
  tres: '<path d="M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.6l-5.1 2.7 1-5.7-4.1-4 5.7-.8z" fill="currentColor"/>',
  envie: '<path d="M12 20.2s-7.8-4.7-7.8-10.3A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.8 2.5c0 5.6-7.8 10.3-7.8 10.3z" fill="currentColor"/>',
  coeur: '<path d="M12 20.2s-7.8-4.7-7.8-10.3A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.8 2.5c0 5.6-7.8 10.3-7.8 10.3z"/>',
  flamme: '<path d="M12 21.2c-3.9 0-6.6-2.7-6.6-6.3 0-3.5 2.5-5.3 3.7-8.2.8 1.6 1.7 2.4 2.6 2.7.1-3 1.3-5.1 3.2-6.6-.3 2.7.9 4.5 2.3 6.3 1.1 1.4 1.7 3 1.7 5 0 4-2.7 7.1-6.9 7.1z"/><path d="M12 21.2c-1.7 0-2.9-1.1-2.9-2.7 0-1.7 1.4-2.5 2.1-4 1.4 1.1 3.6 2.4 3.6 4.2 0 1.5-1.2 2.5-2.8 2.5z" fill="currentColor" stroke="none"/>',
  de: '<rect x="4" y="4" width="16" height="16" rx="4.2"/><circle cx="8.6" cy="8.6" r="1.35" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none"/><circle cx="15.4" cy="15.4" r="1.35" fill="currentColor" stroke="none"/>',
  deux: '<path d="M9.6 20.4s-6.4-3.9-6.4-8.5A3.5 3.5 0 0 1 9.6 9.8a3.5 3.5 0 0 1 6.4 2.1c0 4.6-6.4 8.5-6.4 8.5z"/><path d="M16.6 11.2s-3.6-2.2-3.6-5A2 2 0 0 1 16.6 5a2 2 0 0 1 3.6 1.2c0 2.8-3.6 5-3.6 5z" fill="currentColor" stroke="none"/>',
  ticket: '<path d="M3.8 8A1.8 1.8 0 0 1 5.6 6.2h12.8A1.8 1.8 0 0 1 20.2 8v2.2a1.9 1.9 0 0 0 0 3.6V16a1.8 1.8 0 0 1-1.8 1.8H5.6A1.8 1.8 0 0 1 3.8 16v-2.2a1.9 1.9 0 0 0 0-3.6z"/><path d="M14.6 7.4v1.4M14.6 11.3v1.4M14.6 15.2v1.4"/>',
  cal: '<rect x="3.8" y="5.2" width="16.4" height="15" rx="3.2"/><path d="M3.8 10h16.4M8.2 3.2v3.6M15.8 3.2v3.6"/><circle cx="12" cy="15" r="1.4" fill="currentColor" stroke="none"/>',
  import: '<path d="M4 13.6h4.2l1.4 2.4h4.8l1.4-2.4H20"/><path d="M4 13.6V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4.4L17.8 7"/><path d="M6.2 7 4 13.6"/><path d="M12 3.4v8M9.2 8.8 12 11.6l2.8-2.8"/>',
  fiole: '<path d="M9.4 3.6h5.2M10.4 3.8v5L5.3 17.7a1.9 1.9 0 0 0 1.7 2.7h10a1.9 1.9 0 0 0 1.7-2.7L13.6 8.8v-5"/><path d="M7.4 14.4c1.6-.9 3.1-.9 4.6 0s3 .9 4.6 0"/>',
  balai: '<path d="M15.6 3.4 11.8 11"/><path d="M7.4 11.2h8.4l2 8.6H5.2z"/><path d="M9.6 15.2v4.4M13.4 15.2v4.4"/>',
  pepite: '<path d="M7.2 4.6h9.6l3.6 4.6L12 19.8 3.6 9.2z"/><path d="M3.6 9.2h16.8M9.4 4.6 8.2 9.2 12 19.8l3.8-10.6-1.2-4.6"/>',
  trophee: '<path d="M8 4h8v5.2a4 4 0 0 1-8 0z"/><path d="M8 6H5.2v1.2A2.8 2.8 0 0 0 8 10M16 6h2.8v1.2A2.8 2.8 0 0 1 16 10M12 13.2V17M8.6 20.2h6.8M9.8 17h4.4"/>',
  popcorn: '<path d="M5.8 10.2 7.4 20h9.2l1.6-9.8z"/><path d="M10.2 10.2l.4 9.8M13.8 10.2l-.4 9.8"/><path d="M5.8 10.2a2.4 2.4 0 0 1 1.6-4.3 2.7 2.7 0 0 1 4.6-1.4 2.7 2.7 0 0 1 4.6 1.4 2.4 2.4 0 0 1 1.6 4.3"/>',
  lettre: '<rect x="3.4" y="5.6" width="17.2" height="12.8" rx="2.8"/><path d="m4.2 7 7.8 6 7.8-6"/>',
  carnet: '<path d="M12 6.6C10 5.1 7 4.6 3.8 5v13.2c3.2-.4 6.2.1 8.2 1.6 2-1.5 5-2 8.2-1.6V5c-3.2-.4-6.2.1-8.2 1.6zM12 6.6v13.2"/>',
  livres: '<rect x="4" y="4.4" width="4.4" height="15.4" rx="1.2"/><rect x="9.8" y="6.4" width="4.4" height="13.4" rx="1.2"/><path d="m15.6 7.4 3.6-1 3 12.4-3.6 1z"/><path d="M4 8.4h4.4M9.8 9.8h4.4"/>',
  manette: '<path d="M7.6 8h8.8a4 4 0 0 1 4 4.4l-.4 3.7a2 2 0 0 1-3.4 1.2L15 15.6H9l-1.6 1.7A2 2 0 0 1 4 16.1l-.4-3.7A4 4 0 0 1 7.6 8z"/><path d="M8 10.6v3.2M6.4 12.2h3.2"/><circle cx="15.4" cy="11.4" r="1" fill="currentColor" stroke="none"/><circle cx="17.2" cy="13.2" r="1" fill="currentColor" stroke="none"/>',
  etincelle: '<path d="M11 3.4c.6 4.4 2.5 6.3 6.9 6.9-4.4.6-6.3 2.5-6.9 6.9-.6-4.4-2.5-6.3-6.9-6.9 4.4-.6 6.3-2.5 6.9-6.9z"/><path d="M18.4 15.4c.2 1.5.8 2.1 2.3 2.3-1.5.2-2.1.8-2.3 2.3-.2-1.5-.8-2.1-2.3-2.3 1.5-.2 2.1-.8 2.3-2.3z" fill="currentColor"/>',
  plus: '<path d="M10.6 19.6s-7-4.2-7-9.2a3.9 3.9 0 0 1 7-2.3 3.9 3.9 0 0 1 4.6-1.6"/><path d="M17.8 9.6v7M14.3 13.1h7"/>',
  jamais: '<circle cx="12" cy="12" r="8.4"/><path d="M6.1 6.1l11.8 11.8"/>',
  film: '<rect x="3.6" y="4.6" width="16.8" height="14.8" rx="2.8"/><path d="M7.8 4.6v14.8M16.2 4.6v14.8M3.6 9.6h4.2M3.6 14.4h4.2M16.2 9.6h4.2M16.2 14.4h4.2"/>',
  tele: '<rect x="3.2" y="6.6" width="17.6" height="12.6" rx="3"/><path d="m8.8 3.4 3.2 3.2 3.2-3.2"/>',
  groupe: '<circle cx="9" cy="8.6" r="3.2"/><path d="M3.4 19.4c.5-3.3 2.8-5.2 5.6-5.2s5.1 1.9 5.6 5.2"/><circle cx="16.6" cy="9.4" r="2.6"/><path d="M15.4 14.4c.4-.1.8-.2 1.2-.2 2.3 0 4.2 1.6 4.6 4.4"/>',
  lien: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  chat: '<path d="M4.6 10.2 5 4.2l4.3 3.1h5.4L19 4.2l.4 6c.7 1 1.1 2.2 1.1 3.5 0 3.9-3.8 6.8-8.5 6.8s-8.5-2.9-8.5-6.8c0-1.3.4-2.5 1.1-3.5z"/><path d="M8.6 13.2c.5-.8 1.5-.8 2 0M13.4 13.2c.5-.8 1.5-.8 2 0"/>',
};
const icn = (n, cls = '') => `<svg class="icn ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[n] || ''}</svg>`;
// ── Nos propres choix : menus, dates, heures et confirmations, dessinés par la maison (jamais les boîtes du téléphone) ──
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const PK_IC = {
  date: '<svg viewBox="0 0 24 24" width="18" height="18"><rect x="3.5" y="5" width="17" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  time: '<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
};
// Les champs date et heure des gabarits deviennent un bouton maison + la valeur cachée (même id, même name).
function deNative(html) {
  return html.replace(/<input\b([^>]*?)\btype="(date|time)"([^>]*)>/g, (m, a, t, b) => {
    const at = a + b, id = at.match(/\bid="([^"]+)"/)?.[1]; if (!id) return m;
    const req = /\srequired\b/.test(at);
    const rest = at.replace(/\srequired\b/, '').replace(/\sclass="[^"]*"/, '');
    return `<button type="button" class="field pickf" data-action="pk-open" data-for="${id}" data-pk="${t}"${req ? ' data-req="1"' : ''}><span class="pk-ic" aria-hidden="true">${PK_IC[t]}</span><span class="pk-v"></span></button><input type="text" hidden tabindex="-1" data-pk="${t}"${rest}>`;
  });
}
const pkDate = v => { const [y, m, d] = String(v).split('-').map(Number); return new Date(y, m - 1, d); };
function pkLabel(t, v) {
  if (!v) return t === 'date' ? 'Choisir une date' : 'Pas d’heure';
  if (t === 'time') { const [h, mi] = v.split(':'); return `${Number(h)} h ${mi}`; }
  const d = pkDate(v), now = new Date(), diff = Math.round((d - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5);
  const rel = diff === 0 ? 'Aujourd’hui · ' : diff === 1 ? 'Demain · ' : diff === -1 ? 'Hier · ' : '';
  const t2 = `${rel}${JOURS[d.getDay()].slice(0, rel ? 3 : 9)}${rel ? '.' : ''} ${d.getDate()} ${MOIS[d.getMonth()]}${d.getFullYear() !== now.getFullYear() ? ' ' + d.getFullYear() : ''}`;
  return t2[0].toUpperCase() + t2.slice(1);
}
function pickSync(root = document) {
  root.querySelectorAll('.pickf').forEach(b => {
    const inp = document.getElementById(b.dataset.for); if (!inp) return;
    const v = b.querySelector('.pk-v'), lab = pkLabel(b.dataset.pk, inp.value);
    if (v.textContent !== lab) v.textContent = lab;
    b.classList.toggle('empty', !inp.value);
  });
}
// Une feuille qui monte du bas (même famille que le ticket de caisse), sombre quand on est dans le ciné.
function uiSheet(html, { from, label = '', cls = '' } = {}) {
  uiClose(true);
  const box = document.createElement('div'); box.id = 'uisheet';
  if (from?.closest?.('.cine, .fsheet, #deck')) box.classList.add('dark');
  box.innerHTML = `<div class="ui-card ${cls}" role="dialog" aria-modal="true" aria-label="${esc(label)}"><div class="ui-grab" aria-hidden="true"></div>${html}</div>`;
  document.body.appendChild(box);
  box.addEventListener('click', e => { if (e.target === box) uiClose(); });
  requestAnimationFrame(() => box.classList.add('on'));
  haptic(1);
  return box;
}
function uiClose(now) {
  const b = document.getElementById('uisheet'); if (!b) return;
  b._done?.(false); b._done = null; b.id = '';
  if (now) { b.remove(); return; }
  b.classList.remove('on'); setTimeout(() => b.remove(), 280);
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && (document.getElementById('uisheet') || document.getElementById('uimenu'))) { e.preventDefault(); uiClose(); menuClose(); } });

function pickOpen(btn) {
  const inp = document.getElementById(btn.dataset.for); if (!inp) return;
  const t = btn.dataset.pk, req = !!btn.dataset.req;
  const title = document.querySelector(`label[for="${btn.dataset.for}"]`)?.textContent.replace(/\s*\(.*\)$/, '') || (t === 'date' ? 'Date' : 'Heure');
  const set = v => { inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); pickSync(); haptic(1); };
  if (t === 'date') return dateSheet(btn, title, inp.value, req, v => { set(v); uiClose(); });
  timeSheet(btn, title, inp.value, req, v => { set(v); uiClose(); });
}
function dateSheet(from, title, value, req, done) {
  const today = isoDate(new Date());
  let cur = value ? pkDate(value) : new Date(); cur = new Date(cur.getFullYear(), cur.getMonth(), 1);
  const box = uiSheet('<div class="ui-body"></div>', { from, label: title, cls: 'ui-cal' });
  const body = box.querySelector('.ui-body');
  const draw = () => {
    const y = cur.getFullYear(), m = cur.getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate();
    let cells = ''; for (let i = 0; i < first; i++) cells += '<span></span>';
    for (let d = 1; d <= n; d++) { const iso = isoDate(new Date(y, m, d)); cells += `<button type="button" data-d="${iso}" class="${iso === today ? 'today' : ''}" aria-pressed="${iso === value}">${d}</button>`; }
    const tmw = isoDate(new Date(Date.now() + 864e5));
    body.innerHTML = `<p class="ui-title">${esc(title)}</p>
      <div class="cal-head"><button type="button" class="cal-nav" data-m="-1" aria-label="Mois précédent"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button><b>${MOIS[m]} ${y}</b><button type="button" class="cal-nav" data-m="1" aria-label="Mois suivant"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>
      <div class="cal-dow" aria-hidden="true"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
      <div class="cal-days">${cells}</div>
      <div class="ui-quick"><button type="button" data-d="${today}">Aujourd’hui</button><button type="button" data-d="${tmw}">Demain</button>${req ? '' : '<button type="button" data-d="" class="ui-clear">Sans date</button>'}</div>`;
  };
  draw();
  body.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.m) { cur = new Date(cur.getFullYear(), cur.getMonth() + Number(b.dataset.m), 1); haptic(1); draw(); return; }
    if ('d' in b.dataset) done(b.dataset.d);
  });
  // glisser à gauche ou à droite pour changer de mois
  let sx = null; body.addEventListener('pointerdown', e => { sx = e.clientX; });
  body.addEventListener('pointerup', e => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) { cur = new Date(cur.getFullYear(), cur.getMonth() + (dx < 0 ? 1 : -1), 1); haptic(1); draw(); } });
}
function timeSheet(from, title, value, req, done) {
  let [h, mi] = value ? value.split(':').map(Number) : [20, 0];
  const box = uiSheet('<div class="ui-body"></div>', { from, label: title, cls: 'ui-time' });
  const body = box.querySelector('.ui-body');
  const two = n => String(n).padStart(2, '0');
  const draw = () => {
    body.innerHTML = `<p class="ui-title">${esc(title)}</p>
      <p class="tm-big"><b>${h}</b><span>h</span><b>${two(mi)}</b></p>
      <p class="chip-label">Heure</p><div class="tm-grid h">${Array.from({ length: 24 }, (_, i) => (i + 6) % 24).map(i => `<button type="button" data-h="${i}" aria-pressed="${i === h}">${i}</button>`).join('')}</div>
      <p class="chip-label">Minutes</p><div class="tm-grid m">${Array.from({ length: 12 }, (_, i) => i * 5).map(i => `<button type="button" data-mi="${i}" aria-pressed="${i === mi}">${two(i)}</button>`).join('')}</div>
      <div class="form-actions">${req ? '' : '<button type="button" class="btn ghost" data-x="1">Sans heure</button>'}<button type="button" class="btn" data-ok="1">C’est bon</button></div>`;
  };
  draw();
  body.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.h) { h = Number(b.dataset.h); haptic(1); draw(); }
    else if (b.dataset.mi) { mi = Number(b.dataset.mi); haptic(1); draw(); }
    else if (b.dataset.x) done('');
    else if (b.dataset.ok) done(`${two(h)}:${two(mi)}`);
  });
}
// Confirmer : une carte à nous, au centre. Renvoie une promesse (true si on confirme).
function uiAsk(text, { title = '', ok = 'Oui', cancel = 'Annuler', danger = false, from } = {}) {
  return new Promise(res => {
    const box = uiSheet(`${title ? `<p class="ui-title">${esc(title)}</p>` : ''}<p class="ui-text">${esc(text)}</p>
      <div class="form-actions"><button type="button" class="btn ghost" data-no="1">${esc(cancel)}</button><button type="button" class="btn ${danger ? 'danger' : ''}" data-yes="1">${esc(ok)}</button></div>`, { from: from || document.activeElement, label: title || text, cls: 'ui-ask' });
    box.classList.add('center');
    box._done = res;
    box.querySelector('.ui-card').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const yes = !!b.dataset.yes; if (!b.dataset.yes && !b.dataset.no) return;
      box._done = null; res(yes); uiClose();
    });
    setTimeout(() => box.querySelector('[data-yes]')?.focus({ preventScroll: true }), 60);
  });
}
// Menu déroulant maison, accroché sous le bouton qui l'ouvre.
function menuClose() { const m = document.getElementById('uimenu'); if (!m) return; m.id = ''; m.classList.remove('on'); setTimeout(() => m.remove(), 180); }
function uiMenu(anchor, items, cur, onPick, { title = '' } = {}) {
  menuClose();
  const wrap = document.createElement('div'); wrap.id = 'uimenu';
  if (anchor.closest('.cine')) wrap.classList.add('dark');
  const on = k => Array.isArray(cur) ? cur.includes(k) : k === cur;
  wrap.innerHTML = `<div class="ui-menu" role="menu" aria-label="${esc(title)}">${title ? `<p class="ui-menu-t">${esc(title)}</p>` : ''}${items.map(it => it.h ? `<p class="ui-menu-t">${esc(it.h)}</p>` : it).map(it => typeof it === 'string' ? it : (([k, lab]) => `<button type="button" role="menuitemradio" aria-checked="${on(k)}" data-k="${esc(k)}"><span class="um-check" aria-hidden="true">${on(k) ? '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}</span>${esc(lab)}</button>`)(it)).join('')}</div>`;
  document.body.appendChild(wrap);
  const menu = wrap.firstElementChild, r = anchor.getBoundingClientRect(), mw = Math.max(r.width, 190);
  menu.style.minWidth = mw + 'px';
  const left = Math.min(Math.max(12, r.right - mw), innerWidth - mw - 12);
  menu.style.left = left + 'px';
  const below = r.bottom + 6, h = menu.offsetHeight;
  menu.style.top = (below + h > innerHeight - 80 ? Math.max(12, r.top - h - 6) : below) + 'px';
  menu.style.transformOrigin = below + h > innerHeight - 80 ? 'bottom right' : 'top right';
  wrap.addEventListener('click', e => {
    const b = e.target.closest('button[data-k]');
    if (b) { haptic(1); onPick(b.dataset.k); }
    menuClose();
  });
  requestAnimationFrame(() => wrap.classList.add('on'));
  haptic(1);
  menu.querySelector('[aria-checked="true"]')?.focus({ preventScroll: true });
}
function morph(root, html) {
  const tpl = document.createElement('template'); tpl.innerHTML = html;
  if (!root.firstChild) { root.appendChild(tpl.content); return; }
  morphChildren(root, tpl.content);
}

// Toucher Azami : une caresse (trois variantes, jamais deux fois la même d'affilée), jouée à la place de la scène puis retour à la scène.
let lastCaresse = 0;
function caresse(img) {
  if (!img || img.dataset.caresse) return;
  let n; do { n = 1 + Math.floor(Math.random() * 3); } while (n === lastCaresse); lastCaresse = n;
  playOnImg(img, `caresse_${n}`, 2500);
}
// Trop de caresses : à force (8 touchers en 6 s), Azami donne un avertissement (coups de patte, griffure).
// Après un petit temps de grâce, si on la retouche : deuxième avertissement ; encore une fois et elle crache
// et part bouder. Si on la spamme juste après un avertissement, elle part directement. Si on la laisse
// tranquille quelques secondes, tout se calme. Elle revient quand on rouvre l'app, ou au bout d'une minute.
// Marche aussi pendant une visite.
let petTimes = [], angryLevel = 0, angryAt = 0, lastPet = 0, awayUntil = 0, awayTimer = null;
const GRACE = 1200, CALM = 5000;
const reactSrc = id => reducedMotion() ? `azami/v44/reactions/statiques/${id}_statique.svg` : `azami/v44/reactions/${id}_anime.svg?${Date.now()}`;
// Joue une réaction dans l'image d'Azami puis revient à sa scène (une seule à la fois : la dernière gagne).
function playOnImg(img, id, ms, then) {
  if (!img) return;
  const sc = Object.keys(azamiImgs).find(k => azamiImgs[k] === img);
  // scène à accessoires : la même réaction, mais avec son balai, sa toque, sa tirelire…
  if (sc && CUES[sc] && img === document.querySelector('.hd img.azami')) stopPropSounds();
  if (sc && PROP_SCENES[sc] && PROP_REACTIONS.includes(id)) id = `${PROP_SCENES[sc]}_${id}`;
  const back = sc ? azamiSrc(sc) : (img.dataset.back || img.src);
  if (!img.dataset.caresse) img.dataset.back = img.src;
  const tok = String(Math.random()); img.dataset.caresse = tok; img.src = reactSrc(id);
  setTimeout(() => { if (img.dataset.caresse !== tok) return; delete img.dataset.caresse; then ? then(back) : restoreScene(img, back); }, ms);
}
const azamiAway = () => Date.now() < awayUntil;

// Scènes à accessoires (balai, casserole, tirelire, sac, lettre). En arrivant sur la page, la scène repart
// du début, on entend un petit son de son accessoire, puis les bruitages suivent l'animation pendant un tour.
const PROP_SCENES = { v44_menage: 'menage', v44_cuisine: 'cuisine', v44_argent: 'argent', v44_courses: 'courses', v44_care: 'care', v44_cine: 'cine', v44_collection: 'collection' };
const PROP_REACTIONS = ['caresse_1', 'caresse_2', 'caresse_3', 'attaque', 'crache', 'retour'];
let propRun = null, lastHdScene = null;
function stopPropSounds() {
  if (!propRun) return;
  try { propRun.buses?.forEach(b => b.disconnect()); } catch {}
  propRun.io?.disconnect(); propRun.timers.forEach(clearTimeout); propRun = null;
}
function propEnter() {
  if (document.getElementById('deck')) return;   // pendant Cinder, Azami se tait
  const img = document.querySelector('.hd img.azami');
  const sc = img ? Object.keys(azamiImgs).find(k => azamiImgs[k] === img) : null;
  if (sc === lastHdScene) return;
  lastHdScene = sc; stopPropSounds();
  if (!sc || !CUES[sc] || reducedMotion() || img.dataset.caresse || document.body.classList.contains('azami-away')) return;
  propStart(img, sc, true);
}
// Après une réaction (caresse, coup de patte, retour) : la scène reprend du début, avec ses bruitages.
function restoreScene(img, back) {
  const sc = Object.keys(azamiImgs).find(k => azamiImgs[k] === img);
  if (sc && CUES[sc] && img === document.querySelector('.hd img.azami') && !reducedMotion()) { stopPropSounds(); lastHdScene = sc; propStart(img, sc, false); }
  else img.src = back;
}
// Scène qui repart du début, puis ses bruitages (balai, toilette, petits pas…) calés dessus, en boucle.
function propStart(img, sc, entry) {
  const run = propRun = { timers: [], buses: null, seen: 1, sc, img, entry, at: 0 };
  // Repartir du début : on charge la scène sous une nouvelle adresse, et on ne l'échange qu'une fois prête.
  const url = `${azamiSrc(sc)}?t=${Date.now()}`, pre = new Image(512, 512); pre.src = url;
  const go = () => {
    if (propRun !== run || lastHdScene !== sc || img.dataset.caresse) return;
    img.src = url; run.at = performance.now();
    propSound(run);
  };
  (pre.decode ? pre.decode() : Promise.resolve()).then(go, go);
}
// Lance les sons d'une scène déjà en cours (au départ, ou plus tard quand le son se débloque au premier
// toucher : on rejoint l'animation là où elle en est).
function propSound(run) {
  if (propRun !== run || run.buses || !run.at) return;
  if (!SOUNDS || document.hidden || !audioCtx || audioCtx.state !== 'running') return;
  const c = audioCtx, sc = run.sc, img = run.img, D = DUREE[sc];
  const late = (performance.now() - run.at) / 1000, t0 = c.currentTime + .03 - late;
  const meowAt = (at, kind) => run.timers.push(setTimeout(() => { if (propRun === run && run.seen > .3 && (MEOWS || kind === 'eternue')) meow(true, (kind === 'ronron' ? .25 : .2) * run.seen, kind); }, (at - c.currentTime) * 1000));
  // Sons qu'on n'a pas demandés : discrets. Celui de l'arrivée sur la page un peu plus présent que la suite.
  const VOL = [.4, .28];
  run.buses = [scheduleBruits(c, run.entry && late < 1 ? ENTREE[sc] || [] : [], c.currentTime + .03, VOL[0]), scheduleBruits(c, [], t0, VOL[1])];
  // Les bruitages suivent l'animation en boucle : chaque tour est programmé juste avant qu'il commence.
  const lap = k => {
    if (propRun !== run) return;
    scheduleBruits(c, CUES[sc], t0 + k * D, VOL[1], meowAt, run.buses[1]);
    run.timers.push(setTimeout(() => lap(k + 1), Math.max(0, (t0 + (k + 1) * D - c.currentTime - .6) * 1000)));
  };
  lap(Math.max(0, Math.floor(late / D)));
  // Les sons s'effacent quand on descend dans la page et qu'Azami sort de l'écran (et reviennent si on remonte).
  if ('IntersectionObserver' in window) {
    run.io = new IntersectionObserver(([e]) => {
      if (propRun !== run || !run.buses) return;
      run.seen = e.isIntersecting ? Math.min(1, e.intersectionRatio / .6) : 0;
      run.buses.forEach((b, i) => b.gain.setTargetAtTime(VOL[i] * run.seen, c.currentTime, .12));
    }, { threshold: [0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1] });
    run.io.observe(img);
  }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) { stopPropSounds(); lastHdScene = null; } });
function azamiWarn(img, inVisit) {
  angryLevel++; angryAt = Date.now();
  haptic('heavy'); meow(true, .7, angryLevel > 1 ? 'grogne' : pick(['grogne', 'mrrr']));
  setTimeout(() => scratchScreen(false), 380);
  if (inVisit && visitCur) visitCur.hold = true;
  playOnImg(img, 'attaque', 1750, back => { if (inVisit && visitCur) { visitCur.hold = false; visitImg(visitWaitImg(visitCur.v)); } else restoreScene(img, back); });
}
function azamiHiss(img, inVisit) {
  angryLevel = 0; angryAt = Date.now(); petTimes = [];
  haptic('heavy'); meow(true, .8, 'crache'); setTimeout(() => haptic('heavy'), 250);
  setTimeout(() => scratchScreen(true), 900);
  if (inVisit && visitCur) visitCur.hold = true;
  playOnImg(img, 'crache', 1950, back => {
    azamiLeave();   // d'abord cachée, ensuite seulement on remet sa scène (sinon elle réapparaît une image)
    requestAnimationFrame(() => requestAnimationFrame(() => { img.src = back; }));
    if (inVisit) { if (visitCur) visitCur.hold = false; visitClose(); }
  });
}
let petDecide = null;
function azamiPet(img, inVisit = false) {
  const now = Date.now();
  if (azamiAway()) { toast('Azami boude. Elle reviendra bientôt.'); return true; }
  if (angryLevel && now - lastPet > CALM) { angryLevel = 0; angryAt = 0; petTimes = []; }   // on l'a laissée tranquille : elle se calme
  lastPet = now;
  petTimes = petTimes.filter(t => now - t < 6000); petTimes.push(now);
  if (!angryLevel) {
    if (petTimes.filter(t => t > angryAt).length >= 8) { azamiWarn(img, inVisit); return true; }
    return false;
  }
  if (now - angryAt < GRACE) return true;   // petit temps de grâce juste après l'avertissement
  if (angryLevel >= 2) { clearTimeout(petDecide); petDecide = null; azamiHiss(img, inVisit); return true; }
  // Premier avertissement déjà donné : on attend un instant pour voir si c'est un toucher ou du spam.
  if (!petDecide) {
    const from = now;
    petDecide = setTimeout(() => {
      petDecide = null;
      if (azamiAway()) return;
      const n = petTimes.filter(t => t >= from).length;
      if (n >= 3) azamiHiss(img, inVisit); else azamiWarn(img, inVisit);
    }, 650);
  }
  return true;
}
// Griffure sur l'écran : des rayures sur le « verre » du téléphone, qui restent jusqu'à ce qu'on ferme l'app.
function scratchScreen(big = false) {
  let layer = document.getElementById('griffures');
  if (!layer) { layer = document.createElement('div'); layer.id = 'griffures'; layer.setAttribute('aria-hidden', 'true'); document.body.appendChild(layer); }
  while (layer.children.length >= 5) layer.firstChild.remove();
  const W = innerWidth, H = innerHeight, n = big ? 4 : 3, len = (big ? .55 : .38) * Math.min(W, H) * (0.85 + Math.random() * .3);
  const cx = W * (.25 + Math.random() * .5), cy = H * (.2 + Math.random() * .45), rot = -35 + Math.random() * 70;
  const gap = big ? 26 : 20, lines = [];
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * gap + (Math.random() - .5) * 6, l = len * (.8 + Math.random() * .25);
    const x0 = off, y0 = -l / 2, x1 = off + (Math.random() - .5) * 18, y1 = l / 2, bend = (Math.random() - .5) * 40;
    const d = `M${x0.toFixed(1)} ${y0.toFixed(1)} Q${(off + bend).toFixed(1)} 0 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    lines.push(`<g style="--d:${(i * .06).toFixed(2)}s"><path class="g-shadow" d="${d}"/><path class="g-cut" d="${d}"/><path class="g-shine" d="${d}"/></g>`);
  }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = `<g transform="translate(${cx.toFixed(0)} ${cy.toFixed(0)}) rotate(${rot.toFixed(0)})">${lines.join('')}</g>`;
  layer.appendChild(svg);
  meow(true, .6, 'griffe');
}
function azamiLeave() {
  awayUntil = Date.now() + 60000;
  document.body.classList.add('azami-away');
  toast('Azami est partie bouder.');
  clearTimeout(awayTimer); awayTimer = setTimeout(azamiBack, 60000);
}
function azamiBack() {
  if (!document.body.classList.contains('azami-away')) return;
  awayUntil = 0; clearTimeout(awayTimer);
  const img = document.querySelector('.hd img.azami');
  const show = () => document.body.classList.remove('azami-away');
  if (img) {
    // L'animation du retour commence hors champ : on la charge pendant qu'elle est encore cachée, puis on montre.
    playOnImg(img, 'retour', 1650);
    (img.decode ? img.decode() : Promise.resolve()).catch(() => {}).then(() => setTimeout(show, 30));
  } else show();
  meow(true, .5, pick(['mrrr', 'question']));
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && document.body.classList.contains('azami-away')) setTimeout(azamiBack, 400); });
// Ma demande d'aide a été prise par l'autre : Azami le montre une fois par réponse.
function helpAnswerCheck() {
  if (S.view !== 'maison' || !S.me || !S.help?.length) return;
  const seen = new Set((safeGet('maison-aide-vue') || '').split(',').filter(Boolean));
  const fresh = S.help.filter(h => h.from_email === S.me && (h.status === 'pris' || h.status === 'ensemble') && h.answered_at && !S.helpSeen.has(h.id) && !seen.has(h.id) && Date.now() - new Date(h.answered_at).getTime() < 12 * 3600000);
  if (!fresh.length) return;
  fresh.forEach(h => seen.add(h.id)); safeSet('maison-aide-vue', [...seen].slice(-30).join(','));
  setTimeout(() => react('pris_par_l_autre', document.querySelector('.help-card.answer') || document.querySelector('.hd .azami')), 700);
}
// Aliments à finir vite : Azami le signale une fois par jour en ouvrant les recettes.
function afvCheck() {
  if (S.view !== 'recettes' || S.recette || S.cook || !soonItems().length) return;
  const today = isoDate(new Date()); if (safeGet('maison-afv') === today) return;
  safeSet('maison-afv', today);
  setTimeout(() => react('a_finir_vite', document.querySelector('.fresh-item')), 500);
}

// Déplacer en appuyant longtemps : l'ordre choisi est gardé (colonne rank) et partagé entre vous deux.
// Ce qui a été placé à la main passe devant, dans l'ordre choisi ; le reste garde l'ordre automatique.
const rankOf = r => r.rank == null ? 1e9 : Number(r.rank);
const SORT_TABLE = { tasks: 'tasks', chores: 'chores' };
let drag = null, pressT = null;
const sortItem = el => el.closest?.('[data-sid]');
function dragStart(el, y) {
  const box = el.parentElement; if (!box?.dataset.sort) return;
  drag = { el, box, y0: y, h: el.getBoundingClientRect().height, moved: false };
  el.classList.add('dragging'); box.classList.add('sorting'); document.body.classList.add('no-scroll');
  haptic('medium'); sfx('tick');
}
function dragMove(y) {
  if (!drag) return;
  const { el, box } = drag; drag.moved = true;
  el.style.transform = `translateY(${y - drag.y0}px)`;
  const r = el.getBoundingClientRect(); const mid = r.top + r.height / 2;
  const sibs = [...box.querySelectorAll(':scope > [data-sid]')].filter(x => x !== el);
  const prev = el.previousElementSibling, next = el.nextElementSibling;
  if (next && next.dataset.sid && mid > next.getBoundingClientRect().top + next.getBoundingClientRect().height / 2) { box.insertBefore(next, el); drag.y0 += next.getBoundingClientRect().height + gapOf(box); el.style.transform = `translateY(${y - drag.y0}px)`; haptic(1); }
  else if (prev && prev.dataset.sid && mid < prev.getBoundingClientRect().top + prev.getBoundingClientRect().height / 2) { box.insertBefore(el, prev); drag.y0 -= prev.getBoundingClientRect().height + gapOf(box); el.style.transform = `translateY(${y - drag.y0}px)`; haptic(1); }
}
const gapOf = box => parseFloat(getComputedStyle(box).rowGap) || 0;
function dragEnd() {
  if (!drag) return;
  const { el, box, moved } = drag; drag = null;
  el.classList.remove('dragging'); el.style.transform = ''; box.classList.remove('sorting'); document.body.classList.remove('no-scroll');
  if (!moved) return;
  const t = SORT_TABLE[box.dataset.sort]; const rows = S[t];
  const order = [...box.querySelectorAll(':scope > [data-sid]')].map(x => rows.find(r => r.id === x.dataset.sid)).filter(Boolean);
  const idx = order.indexOf(rows.find(r => r.id === el.dataset.sid));
  const lastRanked = order.reduce((m, r, i) => r.rank != null ? i : m, -1);
  const upTo = Math.max(idx, lastRanked);
  const changes = [];
  order.forEach((r, i) => { if (i <= upTo && r.rank !== i) { changes.push([r.id, r.rank ?? null, i]); r.rank = i; } });
  render(); haptic('medium');
  if (!changes.length) return;
  react('deplacer', box.querySelector(`[data-sid="${el.dataset.sid}"]`) || el);
  undoable('ordre déplacé', changes.map(([id, rank]) => ({ t, id, row: { rank } })), async () => { for (const [id, , rank] of changes) await api.update(t, { id }, { rank }); }, null, 'sort');
}
document.addEventListener('pointerdown', e => {
  if (e.button && e.button !== 0) return;
  const el = sortItem(e.target); if (!el || !el.parentElement?.dataset.sort || el.classList.contains('editing')) return;
  if (e.target.closest('button, input, textarea, a, .item-actions, .picker')) return;
  clearTimeout(pressT);
  const y = e.clientY;
  pressT = setTimeout(() => { dragStart(el, y); }, 420);
});
document.addEventListener('pointermove', e => { if (drag) { dragMove(e.clientY); return; } if (pressT && Math.abs(e.movementY) + Math.abs(e.movementX) > 6) { clearTimeout(pressT); pressT = null; } });
document.addEventListener('pointerup', () => { clearTimeout(pressT); pressT = null; dragEnd(); });
document.addEventListener('pointercancel', () => { clearTimeout(pressT); pressT = null; dragEnd(); });
document.addEventListener('touchmove', e => { if (drag) e.preventDefault(); }, { passive: false });
document.addEventListener('contextmenu', e => { if (drag || (pressT && sortItem(e.target))) e.preventDefault(); });

// Guide ------------------------------------------------------------------------
// Tour d'accueil la première fois (gardé par compte, donc pas répété sur un autre téléphone),
// et le petit « ? » de chaque page qui réexplique tout ce qu'on peut y faire.
const tipSeen = k => !S.tips || S.tips.all || S.tips[k];
function tipSave(k, v = true) {
  if (!S.tips) return;
  S.tips = { ...S.tips, [k]: v };
  api.upsert('user_tips', { email: S.me, seen: S.tips, updated_at: new Date().toISOString() }).catch(e => console.warn('guide', e));
}
const guideKey = () => S.view === 'recettes' ? (S.cook ? 'cook' : S.recette ? 'fiche' : 'recettes') : S.view;
const guideBtn = () => GUIDE[guideKey()] ? `<button type="button" class="guide-q" data-action="guide-page" aria-label="Comment ça marche ici ?">?</button>` : '';
function openTour(i = 0) {
  const st = TOUR[i]; if (!st) return;
  let box = document.getElementById('tour');
  if (!box) { box = document.createElement('div'); box.id = 'tour'; document.body.appendChild(box); box.addEventListener('click', e => { const b = e.target.closest('[data-tour]'); if (!b) return; const a = b.dataset.tour; if (a === 'next') openTour(i2(box) + 1); else if (a === 'prev') openTour(i2(box) - 1); else if (a === 'notif') { actions.notif?.(); closeTour(); } else closeTour(); }); }
  box.dataset.i = i;
  const last = i === TOUR.length - 1;
  box.innerHTML = `<div class="tour-card" role="dialog" aria-modal="true" aria-label="${esc(st.title)}">
    <img class="tour-azami" src="${azamiSrc(st.scene)}" alt="" width="150" height="150">
    <p class="tour-step">${i + 1} / ${TOUR.length}</p>
    <h2 class="tour-title">${esc(st.title)}</h2>
    <ul class="tour-points">${st.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
    ${st.notif && !DEMO && !notifOn() ? `<button class="btn ghost" data-tour="notif">Activer les notifications</button>` : ''}
    <div class="tour-actions">${i ? '<button class="btn ghost" data-tour="prev">Retour</button>' : '<button class="link" data-tour="skip">Passer le guide</button>'}<button class="btn" data-tour="${last ? 'end' : 'next'}">${last ? 'C’est parti' : 'Suivant'}</button></div>
    <div class="tour-dots" aria-hidden="true">${TOUR.map((_, k) => `<span class="${k === i ? 'on' : ''}"></span>`).join('')}</div></div>`;
  requestAnimationFrame(() => box.classList.add('on')); haptic(1);
}
const i2 = box => Number(box.dataset.i) || 0;
function closeTour() { const b = document.getElementById('tour'); if (!b) return; b.classList.remove('on'); setTimeout(() => b.remove(), 250); tipSave('tour'); }
function openGuidePage(k = guideKey()) {
  const g = GUIDE[k]; if (!g) return;
  const old = document.getElementById('ticket'); if (old) old.remove();
  const box = document.createElement('div'); box.id = 'ticket';
  box.innerHTML = `<div class="ticket-card guide-card" role="dialog" aria-label="${esc(g.title)}"><p class="ticket-title">${esc(g.title)}</p>
    <dl class="guide-list">${g.items.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('')}</dl>
    <div class="form-actions"><button class="btn ghost small" data-action="guide-tour">Revoir la visite</button><button class="btn" data-action="sheet-close">Compris</button></div></div>`;
  box.addEventListener('click', e => { if (e.target === box) closeTicket(); });
  document.body.appendChild(box); requestAnimationFrame(() => box.classList.add('on')); haptic(1);
  tipSave('page:' + k); render();
}
// Première visite d'une page : une bulle discrète propose l'explication (une seule fois).
function guideHint() {
  const k = guideKey();
  if (!GUIDE[k] || tipSeen('page:' + k) || !tipSeen('tour')) return '';
  return `<div class="guide-hint"><span>Première fois ici ? Le <b>?</b> t’explique tout ce qu’on peut faire sur cette page.</span><button class="btn small" data-action="guide-page">Voir</button><button class="link" data-action="guide-hint-off" aria-label="Fermer">Non merci</button></div>`;
}

// Courses à deux --------------------------------------------------------------
// Chacun coche ce qu'il prend : c'est synchronisé en direct, on voit qui a pris quoi, et chacun
// termine son propre panier (« Courses faites » ne prend que ce que tu as coché).
const myCart = () => S.shopping.filter(s => s.checked && (!s.checked_by || s.checked_by === S.me));
S.presence = {};      // où est l'autre : { email: shopMode }
let presenceCh = null;
function presenceTrack() { try { presenceCh?.track({ email: S.me, shop: S.shopMode || null, at: Date.now() }); } catch {} }
function presenceJoin() {
  if (DEMO || !sb || presenceCh || !S.me) return;
  presenceCh = sb.channel('maison-courses', { config: { presence: { key: S.me } } });
  presenceCh.on('presence', { event: 'sync' }, () => {
    const st = presenceCh.presenceState(); const next = {};
    for (const [k, metas] of Object.entries(st)) if (k !== S.me) { const m = metas[metas.length - 1]; if (m?.shop) next[k] = m.shop; }
    const changed = JSON.stringify(next) !== JSON.stringify(S.presence);
    S.presence = next; if (changed && S.view === 'courses') render();
  }).subscribe(status => { if (status === 'SUBSCRIBED') presenceTrack(); });
}
function duoBanner(mode) {
  const o = other(); const where = o && S.presence[o];
  if (!where) return '';
  const label = SHOPS.find(x => x[0] === where)?.[1] || 'en courses';
  return `<div class="duo"><span class="duo-dot" aria-hidden="true"></span><p><b>${esc(nameOf(o))} fait les courses aussi</b> (${esc(label)}). Ce que chacun coche passe dans son panier et disparaît de la liste de l’autre.${mode && mode !== where ? '' : ''}</p></div>`;
}
// Ce que l'autre vient de prendre, quand on est soi-même au magasin.
let lastChecked = null;
function duoNotice() {
  const now = new Map(S.shopping.filter(s => s.checked && s.checked_by && s.checked_by !== S.me).map(s => [s.id, s]));
  if (lastChecked && S.shopMode) {
    const fresh = [...now.values()].filter(s => !lastChecked.has(s.id));
    if (fresh.length) { toast(`${nameOf(fresh[0].checked_by)} a pris : ${fresh.slice(0, 3).map(s => shopLabel(s.label)).join(', ')}${fresh.length > 3 ? '…' : ''}`); haptic(1); }
  }
  lastChecked = new Set(now.keys());
}

const FOLD_ON = new WeakSet();
// Écran de chargement : Azami suit sa pelote (le même que dans index.html, avant que le script tourne).
const BOOT = '<div class="boot" role="status" aria-label="Chargement"><picture><source srcset="azami/v44/statiques/azami_v44_chargement_statique.svg" media="(prefers-reduced-motion: reduce)"><img src="azami/v44/azami_v44_chargement_anime.svg" alt="" width="180" height="180"></picture></div>';
// Recette en cours : si on quitte la page (une notification, un autre onglet, l'app fermée), on la retrouve
// là où on en était en revenant sur Recettes (pendant 6 heures).
function cookSave() {
  if (S.view !== 'recettes') return;
  safeSet('maison-cook', S.cook || S.recette ? JSON.stringify({ cook: S.cook, recette: S.recette, persons: S.persons, at: Date.now() }) : '');
}
function cookRestore() {
  try {
    const x = JSON.parse(safeGet('maison-cook') || 'null');
    if (!x || Date.now() - x.at > 6 * 3600000) return;
    if (x.cook && !RID(x.cook.id)) return;
    if (x.recette && !RID(x.recette)) return;
    S.cook = x.cook; S.recette = x.recette; if (x.persons) S.persons = x.persons;
    if (S.cook) setTimeout(() => toast(S.cook.full ? 'On reprend la recette là où tu en étais.' : `On reprend à l’étape ${S.cook.step + 1}.`), 300);
  } catch {}
}
// Raccourcis (appui long sur l'icône, ou app Raccourcis de l'iPhone) : ./?do=ajout, soir, lavevaisselle, mot.
let deepDone = false;
function deepLink() {
  if (deepDone || !S.me) return; deepDone = true;
  const P = new URLSearchParams(location.search);
  const shared = P.get('url') || P.get('text') || P.get('title');
  const k = P.get('do') || (shared ? 'film' : null); if (!k) return;
  try { history.replaceState(null, '', location.pathname); } catch {}
  const go = v => { if (S.view !== v) { S.view = v; S.recette = null; S.cook = null; render(); } };
  setTimeout(() => {
    if (k === 'ajout') { go('courses'); document.getElementById('shop-label')?.focus(); }
    else if (k === 'soir') { go('recettes'); loadEtapes().then(() => { render(); rouletteOpen(); }).catch(() => {}); }
    else if (k === 'lavevaisselle') { go('menage'); const c = S.chores.find(x => x.sorte === 'lavevaisselle'); const el = c && document.querySelector(`[data-id="${c.id}"]`); el?.closest('li, section')?.scrollIntoView({ block: 'center' }); }
    else if (k === 'film') { S.loisirTab = 'cine'; go('nuit'); const q = P.get('q') || [P.get('url'), P.get('text'), P.get('title')].filter(Boolean).join(' ').match(/https?:\/\/\S+/)?.[0] || shared || ''; const f = document.getElementById('cine-q'); f?.scrollIntoView({ block: 'center' }); if (f && q) { f.value = q; cineSearch(q); } else f?.focus(); }
    else if (k === 'mot') { S.loisirTab = 'mots'; go('nuit'); const f = document.getElementById('care-body'); f?.scrollIntoView({ block: 'center' }); f?.focus(); }
  }, 300);
}
function render() {
  if (!render.restored && S.me) { render.restored = true; if (S.view === 'recettes' && !S.cook && !S.recette) cookRestore(); }
  if (drag) return;   // pas pendant un déplacement au doigt
  if (document.getElementById('deck') && S.me && S.ready) { render.later = true; return; }   // Cinder couvre l'écran : on redessinera en sortant
  if (!S.ready) { if (!$app.querySelector('.boot')) $app.innerHTML = BOOT; return; }
  if (S.offline && !S.members.length) { $app.innerHTML = viewOffline(); placeAzami(); return; }
  if (S.offline && S.view === 'nuit') S.view = 'maison';
  if (S.recovery) S.login.step = 'newpass';
  if (!S.me || S.recovery) { document.body.dataset.time = 'jour'; $app.innerHTML = viewLogin(); placeAzami(); return; }
  if (!S.members.some(m => m.email === S.me)) { $app.innerHTML = viewNotMember(); return; }

  // garder ce qui est en cours de saisie
  const kept = {};
  $app.querySelectorAll('[data-keep]').forEach(el => { kept[el.id] = el.type === 'checkbox' ? el.checked : el.value; });
  const focusId = document.activeElement?.id;
  const folds = new Set([...$app.querySelectorAll('details[data-fold][open]')].map(d => d.dataset.fold));
  const sel = typing() ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;

  document.body.dataset.time = 'jour';
  applyTheme();

  const views = { maison: viewMaison, menage: viewMenage, courses: viewCourses, recettes: viewRecettes, argent: viewArgent, nuit: viewNuit };
  if (render.view !== S.view || !$app.querySelector('.nav')) { $app.innerHTML = ''; render.view = S.view; }
  const page = (views[S.view] || viewMaison)().replace('</header>', `${guideBtn()}</header>${guideHint()}`);
  morph($app, deNative(demoBar() + page + timersBar() + nav()));
  placeAzami();
  cookSave();
  propEnter();
  deepLink();
  maybeCoucou();
  afvCheck();
  helpAnswerCheck();
  popCheck();
  if (S.me && S.ready && visitState().pending && !document.getElementById('visite-invite') && !document.getElementById('tour')) visitInvite();
  visitTestHook();
  if (!tipSeen('tour') && !document.getElementById('tour')) setTimeout(() => { if (!tipSeen('tour') && !document.getElementById('tour')) openTour(0); }, 700);
  armHaptics($app);

  folds.forEach(k => { const d = $app.querySelector(`details[data-fold="${k}"]`); if (d) d.open = true; });
  $app.querySelectorAll('details.dech-card[data-fold]').forEach(d => FOLD_ON.has(d) || (FOLD_ON.add(d), d.addEventListener('toggle', e => { S.folds[d.dataset.fold] = e.target.open; safeSet('maison-folds', JSON.stringify(S.folds)); })));
  if (S.popId) { const id = S.popId; S.popId = null; const row = (document.getElementById('tick-' + id) || document.getElementById('done-' + id))?.closest('.item, .chore'); pop(row); wiggle(row); }
  const wb = document.querySelector('.wins-big b');
  if (wb) { const to = Number(wb.textContent); if (S.weekShown != null && S.weekShown !== to) { wb.textContent = S.weekShown; countUp(wb, to); wiggle(wb.closest('.wins')); } S.weekShown = to; }
  for (const [id, v] of Object.entries(kept)) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.type === 'checkbox') el.checked = v; else el.value = v;
  }
  pickSync($app);
  if (focusId) {
    const el = document.getElementById(focusId);
    el?.focus({ preventScroll: true });
    if (el && sel && typeof el.setSelectionRange === 'function') { try { el.setSelectionRange(sel[0], sel[1]); } catch {} }
  }
}

// Connexion

function viewLogin() {
  const step = S.login.step;
  if (step === 'sent') {
    return `<section class="login">${loginHd()}
      <p>${esc(S.login.note)}</p>
      <button class="btn ghost" data-action="login-mode" data-mode="login">Retour à la connexion</button></section>`;
  }
  if (step === 'newpass') {
    return `<section class="login">${loginHd()}
      <p>Choisis un nouveau mot de passe, au moins 8 caractères.</p>
      <form data-form="newpass">
        <label class="sr" for="pass">Nouveau mot de passe</label>
        <input class="field" id="pass" name="pass" type="password" autocomplete="new-password" minlength="8" placeholder="Nouveau mot de passe" required>
        <button class="btn" type="submit">Enregistrer</button>
      </form>
      <button class="link" data-action="cancel-recovery">Annuler</button></section>`;
  }
  const signup = step === 'signup';
  return `<section class="login">
    ${loginHd()}
    <p>${signup ? 'Première fois ici : choisis ton mot de passe. Tu recevras un e-mail pour confirmer ton adresse.' : 'Connecte-toi avec ton adresse e-mail et ton mot de passe.'}</p>
    <form data-form="${signup ? 'signup' : 'login'}">
      <label class="sr" for="email">Adresse e-mail</label>
      <input class="field" id="email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="ton@adresse.ch" required value="${esc(S.login.email)}">
      <label class="sr" for="pass">Mot de passe</label>
      <input class="field" id="pass" name="pass" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" ${signup ? 'minlength="8"' : ''} placeholder="${signup ? 'Mot de passe, 8 caractères minimum' : 'Mot de passe'}" required>
      <button class="btn" type="submit">${signup ? 'Créer mon compte' : 'Se connecter'}</button>
    </form>
    ${signup
      ? '<button class="link" data-action="login-mode" data-mode="login">J\'ai déjà un compte</button>'
      : `<button class="link" data-action="login-mode" data-mode="signup">Première fois ? Créer mon compte</button>
         <button class="link" data-action="forgot">Mot de passe oublié</button>`}
  </section>`;
}

function viewNotMember() {
  return `<section class="login">${loginHd()}
    <p>L'adresse ${esc(S.me)} n'est pas membre de cette maison. Ajoute-la dans la table « members » de Supabase, ou connecte-toi avec une autre adresse.</p>
    <button class="btn ghost" data-action="logout">Se déconnecter</button></section>`;
}

// Maison : coup d'œil, fil récent, à faire, tableau

function recentEvents() {
  const ev = [];
  for (const l of S.choreLog) ev.push({ at: l.done_at, who: l.done_by, text: `a fait ${l.title || 'une corvée'}` });
  for (const t of S.tasks) {
    ev.push({ at: t.created_at, who: t.created_by, text: `a ajouté « ${t.title} »` });
    if (t.done && t.done_at) ev.push({ at: t.done_at, who: null, text: `« ${t.title} » est fait` });
  }
  for (const e of S.expenses) ev.push({ at: e.created_at, who: e.created_by, text: e.is_settlement ? `a remboursé ${chf(e.amount)}` : `a noté ${e.label}, ${chf(e.amount)}` });
  for (const n of S.board) ev.push({ at: n.created_at, who: n.author, text: 'a laissé un mot sur le tableau' });
  for (const s of S.shopping) ev.push({ at: s.created_at, who: s.added_by, text: `a ajouté ${s.label} aux courses` });
  return ev.filter(e => e.at).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);
}

const KIND_LABEL = { task: 'chose faite', chore: 'corvée', shop: 'courses', settle: 'comptes', dechet: 'déchets descendus' };
function winsCard() {
  const week = winsSince(WEEK), total = S.wins.length, st = streak();
  if (!total) return '';
  const o = other();
  const recent = S.wins.slice(0, 8);
  const line = w => `<li><span class="w-icon">${iconHtml(w.kind === 'settle' ? '💰' : w.kind === 'shop' ? (variantFor(personOf(w.done_by), 'courses') || 't:courses') : w.title ? displayIcon('wins', w) : (w.icon || '📌'))}</span><span class="w-text">${esc(w.title || KIND_LABEL[w.kind] || 'réussite')}</span><span class="w-who">${esc(w.done_by === S.me ? 'toi' : nameOf(w.done_by))}</span><span class="w-when">${esc(ago(w.done_at))}</span></li>`;
  return `<section class="wins" aria-label="Réussites">
    <div class="wins-top">
      <div><p class="bal-kicker">Réussites</p>
        <p class="wins-big"><b>${week.length}</b> cette semaine</p>
        <p class="wins-sub">${week.length ? 'À vous deux.' : 'La semaine commence.'}</p></div>
      <div class="wins-side">
        ${st >= 2 ? `<div class="wins-streak"><b>${st}</b><span>jours<br>de suite</span></div>` : ''}
        <div class="wins-total"><b>${total}</b><span>depuis<br>le début</span></div>
      </div>
    </div>
    <details class="fold" data-fold="wins"><summary>Les dernières</summary><ul class="wins-list">${recent.map(line).join('')}</ul></details>
  </section>`;
}

// Récap du dimanche : le dimanche dès 17 h et le lundi, une carte « Votre semaine à deux » (tout ce que
// vous avez fait ensemble, sans compter qui a fait quoi), un mot d'Azami et les nouvelles cartes du carnet.
const RECAP_MOTS = ['Je suis fière de vous. Ne le répétez pas.', 'La maison sent bon, le canapé est libre : vous avez gagné une sieste avec moi.', 'Vous formez une très bonne équipe. Après moi, évidemment.',
  'Je vous accorde officiellement le titre de meilleurs humains de la semaine.', 'Bravo. Pour fêter ça, je propose des croquettes. Pour moi.', 'Vous avez assuré. Moi aussi : j’ai dormi pour vous trois.'];
function recapWeek() {
  const now = new Date(), d = now.getDay(), h = now.getHours();
  if (!((d === 0 && h >= 17) || d === 1)) return null;
  const sunday = new Date(now); sunday.setDate(now.getDate() - (d === 1 ? 1 : 0)); sunday.setHours(23, 59, 59, 999);
  const t1 = sunday.getTime(), t0 = t1 - 7 * DAY;
  return { key: isoDate(sunday), t0, t1 };
}
function recapCard() {
  const wk = recapWeek(); if (!wk || safeGet('maison-recap-vu') === wk.key) return '';
  const ws = S.wins.filter(w => { const t = new Date(w.done_at).getTime(); return t > wk.t0 && t <= wk.t1; });
  if (!ws.length) return '';
  const c = k => ws.filter(w => w.kind === k).length;
  const parts = [[c('chore'), 'corvée', 'corvées'], [c('task'), 'tâche', 'tâches'], [c('shop'), 'courses', 'courses'], [c('cuisine'), 'recette', 'recettes'], [c('settle'), 'comptes à zéro', 'comptes à zéro']].filter(x => x[0]);
  const cartes = [...(S.carnetInfo?.entries() || [])].filter(([id, x]) => !id.startsWith('~') && x.at && new Date(x.at).getTime() > wk.t0).length;
  const mot = RECAP_MOTS[Math.abs([...wk.key].reduce((a, ch) => a + ch.charCodeAt(0), 0)) % RECAP_MOTS.length];
  return `<section class="recap-card"><img src="azami/v44/statiques/azami_v44_reussite_statique.svg" alt="" width="512" height="512">
    <p class="calm-kicker">Votre semaine à deux</p>
    <p class="recap-big"><b>${ws.length}</b> ${ws.length > 1 ? 'choses faites ensemble' : 'chose faite ensemble'}</p>
    <ul class="recap-parts">${parts.map(([n, a, b]) => `<li><b>${n}</b> ${n > 1 ? b : a}</li>`).join('')}${cartes ? `<li><b>${cartes}</b> ${cartes > 1 ? 'cartes d’Azami' : 'carte d’Azami'}</li>` : ''}${streak() >= 2 ? `<li><b>${streak()}</b> jours de suite</li>` : ''}</ul>
    <p class="recap-mot">« ${esc(mot)} »</p>
    <button class="btn small" data-action="recap-ok" data-k="${wk.key}">Merci Azami</button></section>`;
}
function viewMaison() {
  let [hello, scene] = greeting();
  const cc = calmCheck();
  if (cc === 'exit') { S.calmExit = true; setTimeout(() => celebrate({ title: 'Mode calme terminé', sub: 'Plus rien d’urgent. Respirez.', level: 'small', reaction: 'calme_termine' }), 300); }
  const calm = calmState().on;
  if (calm) scene = 'v44_calme';
  const calmExit = !calm && S.calmExit;
  const date = new Date().toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' });

  const myChores = S.chores.filter(c => c.turn === S.me && choreStatus(c).due);
  const lateChores = myChores.filter(c => choreStatus(c).late);
  const myTasks = S.tasks.filter(t => !t.done && (t.assignee === S.me || !t.assignee));
  const net = balances()[S.me] || 0;
  const shop = S.shopping.filter(s => !s.checked).length;

  const lines = [];
  lines.push(myChores.length
    ? [myChores.length > 1 ? 'Corvées pour toi' : myChores[0].title, myChores.length > 1 ? myChores.length : choreStatus(myChores[0]).label, 'menage', lateChores.length > 0]
    : ['Rien de ménage pour toi', '', 'menage', false]);
  lines.push([myTasks.length > 1 ? 'Choses à faire pour toi ou vous deux' : 'Chose à faire pour toi ou vous deux', myTasks.length, 'faire', false]);
  if (Math.abs(net) >= 0.01) lines.push([net > 0 ? `${nameOf(other())} te doit` : `Tu dois à ${nameOf(other())}`, `${chf(Math.abs(net))}`, 'argent', false]);
  else lines.push(['Vous êtes quittes', '0.00', 'argent', false]);
  const waste = S.chores.filter(c => SORTES.some(s => s.id === c.sorte));
  lines.push(['Déchets', dechetsResume(waste, new Date(), true), 'menage', waste.some(c => choreStatus(c).due && descente(SORTES.find(x => x.id === c.sorte), c).possible)]);
  lines.push([shop > 1 ? 'Articles sur la liste de courses' : 'Article sur la liste de courses', shop, 'courses', false]);
  const ne = S.agenda.configured ? nextEvent() : null;
  if (ne) lines.push([`${relDay(evDay(ne))} · ${ne.title}`, ne.allDay ? 'journée' : evTime(ne.start), 'agenda', false]);

  return `<header class="hd centered">
    <button class="azami-btn" data-action="meow" aria-label="Faire miauler Azami">${azami(scene, 'Azami vous accueille')}</button>
    <h1>${hello} ${esc(firstName())}</h1><p class="hd-kicker">${esc(date)}</p></header>
    ${recapCard()}${pushCard()}${helpCards()}
    ${calm ? calmSection() : `${calmExit ? `<section class="help-card answer pris calm-exit"><p><b>Vous êtes sortis du mode calme.</b> Plus rien d’urgent n’attend. Bien joué.</p><button class="link" data-action="calm-exit-seen">OK</button></section>` : ''}
    <div class="glance">${lines.map(([label, num, to, late]) =>
      `<button class="${late ? 'late' : ''}" data-action="glance" data-to="${to}"><span>${esc(label)}</span><span class="g-num ${String(num).length > 7 ? 'small' : ''}">${esc(num)}</span></button>`).join('')}</div>
    <p class="calm-link"><button class="link" data-action="calm-on">Trop de choses ? Une chose à la fois</button></p>
    ${winsCard()}`}
    <div class="seg" role="group" aria-label="Affichage">
      <button data-action="maison-tab" data-tab="faire" aria-pressed="${S.maisonTab === 'faire'}">À faire${S.tasks.filter(t => !t.done).length ? ` · ${S.tasks.filter(t => !t.done).length}` : ''}</button>
      <button data-action="maison-tab" data-tab="agenda" aria-pressed="${S.maisonTab === 'agenda'}">Agenda</button>
      <button data-action="maison-tab" data-tab="tableau" aria-pressed="${S.maisonTab === 'tableau'}">Tableau</button>
    </div>
    <div class="mtab">${S.maisonTab === 'faire' ? viewTasks() : S.maisonTab === 'agenda' ? viewAgenda() : viewBoard()}</div>
    ${recentEvents().length ? `<details class="fold" data-fold="recent"><summary>Récemment</summary><ul class="recent">${recentEvents().map(e =>
      `<li><span class="who">${esc(e.who === S.me ? 'Toi' : e.who ? nameOf(e.who) : '')}</span> ${esc(e.text)}<span class="when">${esc(ago(e.at))}</span></li>`).join('')}</ul></details>` : ''}
    <div class="theme-row"><span>Thème sur cet appareil</span><div class="seg" role="group" aria-label="Thème">
      <button data-action="theme" data-theme="ciel" aria-pressed="${THEME === 'ciel'}">Ciel</button>
      <button data-action="theme" data-theme="brun" aria-pressed="${THEME === 'brun'}">Brun</button></div></div>
    <div class="theme-row"><span>Sons de l'app</span><div class="seg" role="group" aria-label="Sons">
      <button data-action="sounds" data-on="1" aria-pressed="${SOUNDS}">Oui</button>
      <button data-action="sounds" data-on="0" aria-pressed="${!SOUNDS}">Non</button></div></div>
    <div class="theme-row"><span>Miaulements d'Azami</span><div class="seg" role="group" aria-label="Miaulements">
      <button data-action="meows" data-on="1" aria-pressed="${MEOWS}">Oui</button>
      <button data-action="meows" data-on="0" aria-pressed="${!MEOWS}">Non</button></div></div>
    ${DEMO ? '' : `<div class="theme-row"><span>Rappels en retard</span>${notifOn() ? '<span class="hint">Notifications activées</span>' : '<button class="btn ghost small" data-action="notif">Activer les notifications</button>'}</div>`}
    ${DEMO ? '' : `<div class="theme-row"><span>Mot de passe</span><button class="btn ghost small" data-action="change-pass">Changer mon mot de passe</button></div>`}
    <div class="theme-row"><span>Guide de l’app</span><button class="btn ghost small" data-action="guide-reset">Revoir le guide</button></div>
    <div class="foot">${DEMO ? '<button class="link" data-action="demo-reset">Remettre la démo à zéro</button>' : '<button class="link" data-action="logout">Se déconnecter</button>'}<span class="version">v189</span></div>`;
}

// Tâches datées et prochaine échéance de chaque corvée, à placer dans l'agenda de l'app.
// (Elles restent dans l'app : rien n'est écrit dans le calendrier iCloud.)
function houseItems() {
  const today = isoDate(new Date());
  const out = [];
  for (const t of S.tasks) {
    if (t.done || !t.due_on) continue;
    out.push({ kind: 'task', row: t, day: t.due_on < today ? today : t.due_on, late: t.due_on < today, time: t.due_time ? String(t.due_time).slice(0, 5) : '' });
  }
  for (const c of S.chores) {
    const q = seqOf(c);
    if (q) {
      if (q.personal && c.turn !== S.me) continue;
      const s = seqState(c);
      if (s.phase !== 'start' || s.st.due) out.push({ kind: 'seq', row: c, day: today, late: s.phase === 'start' && s.st.late, time: '' });
      else { const d = new Date(c.last_done_at); d.setDate(d.getDate() + c.every_days); out.push({ kind: 'seq', row: c, day: isoDate(d), late: false, time: '' }); }
      continue;
    }
    const st = choreStatus(c);
    let day = today;
    if (c.last_done_at && !st.due) { const d = new Date(c.last_done_at); d.setDate(d.getDate() + c.every_days); day = isoDate(d); }
    out.push({ kind: 'chore', row: c, day, late: st.late, time: '', st });
  }
  return out;
}
function houseItem(h) {
  if (h.kind === 'task') {
    const t = h.row;
    const who = t.assignee ? (t.assignee === S.me ? 'Pour toi' : `Pour ${nameOf(t.assignee)}`) : 'Pour vous deux';
    const meta = ['À faire', who, h.time ? `à ${h.time}` : '', h.late ? `prévu ${relDay(t.due_on)}` : ''].filter(Boolean).join(' · ');
    return `<li class="item house">
      <button class="tick" id="tick-${t.id}" role="checkbox" aria-checked="false" aria-label="Fait : ${esc(t.title)}" data-action="task-toggle" data-id="${t.id}"></button>
      ${iconHtml(displayIcon('tasks', t))}<div class="item-main"><div class="item-title">${esc(t.title)}</div><div class="item-meta ${h.late ? 'late' : ''}">${esc(meta)}</div>${nudgeBtn('task', t, h.late || (t.due_on && dayDiff(new Date(t.due_on + 'T12:00'), new Date()) <= 0))}</div></li>`;
  }
  if (h.kind === 'seq') {
    const c = h.row, q = seqOf(c), s = seqState(c);
    const meta = s.phase === 'timer' ? `Ménage · ${q.steps[s.i].doing.toLowerCase()}, prêt dans ${s.left} min` : s.phase === 'next' ? `Ménage · ${(q.steps[s.i].meta || q.steps[s.i].btn).toLowerCase()}` : `Ménage · ${s.st.due ? 'à lancer' : s.st.label}`;
    const btn = s.phase === 'timer' ? `<span class="dech-btn cycle">${esc(hhmm(s.ready))}</span>` : s.phase === 'next' ? `<button class="btn dech-btn due" data-action="seq-step" data-id="${c.id}" data-i="${s.i}">${esc(q.steps[s.i].btn)}</button>` : `<button class="btn dech-btn ${s.st.due ? 'due' : 'done'}" data-action="seq-step" data-id="${c.id}" data-i="0">${esc(q.steps[0].btn)}</button>`;
    return `<li class="item house">${iconHtml(displayIcon('chores', c))}<div class="item-main"><div class="item-title">${esc(q.label)}</div><div class="item-meta ${h.late ? 'late' : ''}">${esc(meta)}</div></div><div class="item-trail">${btn}</div></li>`;
  }
  const c = h.row;
  const who = !c.turn ? 'Qui veut' : c.turn === S.me ? 'À toi' : `À ${nameOf(c.turn)}`;
  const meta = c.sorte ? `Déchets · ${dechetMeta(c)}` : ['Ménage', who, h.late ? h.st.label : ''].filter(Boolean).join(' · ');
  return `<li class="item house">${iconHtml(displayIcon('chores', c))}<div class="item-main"><div class="item-title">${esc(c.title)}</div><div class="item-meta ${h.late ? 'late' : ''}">${esc(meta)}</div>${nudgeBtn('chore', c, choreStatus(c).due)}</div>
    <div class="item-trail">${choreBtn(c)}</div></li>`;
}
function viewAgenda() {
  const A = S.agenda;
  if (A.configured === false) {
    return `<h2 class="first">Calendrier partagé</h2>
    <p class="hint">L'app lit et écrit <b>un seul</b> calendrier iCloud, celui que vous partagez. Elle ne voit jamais vos autres calendriers : une fois « ${esc(chipVal('ag-name', 'Les quatre pattes'))} » trouvé, c'est la seule adresse qu'elle utilise.</p>
    <p class="hint">Il faut un <b>mot de passe d'application</b> Apple (pas ton mot de passe iCloud) : sur <b>account.apple.com</b> › Connexion et sécurité › Mots de passe d'application › Générer. Il est gardé sur le serveur, jamais sur les téléphones, et tu peux le révoquer n'importe quand depuis le même endroit.</p>
    <form class="form" data-form="agenda-setup" autocomplete="off">
      <label class="chip-label" for="ag-id">Identifiant Apple de qui partage le calendrier</label><input class="field" id="ag-id" name="apple_id" type="email" inputmode="email" placeholder="prenom@icloud.com" required>
      <label class="chip-label" for="ag-pw">Mot de passe d'application</label><input class="field" id="ag-pw" name="app_password" type="password" placeholder="xxxx-xxxx-xxxx-xxxx" required>
      <label class="chip-label" for="ag-name">Nom exact du calendrier</label><input class="field" id="ag-name" name="calendar_name" value="Les quatre pattes" required>
      <div class="form-actions"><button class="btn" type="submit">Relier le calendrier</button></div>
    </form>
    ${A.error ? `<p class="hint err">${esc(A.error)}</p>` : ''}`;
  }
  if (A.configured === null) return `<p class="empty">${A.error ? esc(A.error) : 'Lecture du calendrier…'}</p>`;
  const today = isoDate(new Date());
  const upcoming = A.events.filter(e => (e.allDay ? e.end > today : e.end > new Date().toISOString()));
  const days = new Map();
  const put = (k, x) => { if (!days.has(k)) days.set(k, []); days.get(k).push(x); };
  for (const e of upcoming) put(evDay(e) < today ? today : evDay(e), e);
  if (S.agendaHouse !== false) for (const h of houseItems()) put(h.day, h);
  const sortKey = x => x.kind ? (x.time ? `1${x.time}` : x.kind === 'task' ? '2' : '3') : (x.allDay ? '0' : `1${evTime(x.start)}`);
  for (const list of days.values()) list.sort((p, q) => sortKey(p).localeCompare(sortKey(q)));
  const sorted = new Map([...days.entries()].sort((p, q) => p[0].localeCompare(q[0])));
  const item = e => {
    if (e.kind) return houseItem(e);
    if (S.edit?.id === e.id) return `<li class="item editing">${editEvent(e)}</li>`;
    const ongoing = (e.allDay ? e.start < today : e.start < new Date().toISOString());
    return `<li class="item ev ${ongoing ? 'ongoing' : ''}">${iconHtml(iconFor(e.title, 'task', S.hints))}<div class="item-main"><div class="item-title">${esc(e.title)}</div><div class="item-meta">${esc(evWhen(e))}${e.place ? `, ${esc(e.place)}` : ''}${e.recurring ? ', se répète' : ''}</div></div>
      <button class="more" id="more-${esc(e.id)}" aria-label="Options" aria-expanded="${S.open === e.id}" data-action="more" data-id="${esc(e.id)}">⋯</button>
      ${S.open === e.id ? `<div class="item-actions">${e.recurring ? '<span class="hint">Les événements qui se répètent se modifient dans l\'app Calendrier.</span>' : `<button class="btn ghost small" data-action="ev-edit" data-id="${esc(e.id)}">Modifier</button><button class="btn ghost small" data-action="ev-delete" data-id="${esc(e.id)}">Supprimer</button>`}</div>` : ''}</li>`;
  };
  const dayLabel = k => { const d = new Date(k + 'T12:00'); const n = dayDiff(d, new Date()); const base = d.toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' }); return n === 0 ? `Aujourd'hui, ${base}` : n === 1 ? `Demain, ${base}` : base[0].toUpperCase() + base.slice(1); };
  const blocks = [...sorted.entries()].slice(0, 40).map(([k, list]) => `<h2 class="day-head ${k === today ? 'today' : ''}">${esc(dayLabel(k))}</h2><ul class="list">${list.map(item).join('')}</ul>`).join('');
  const defaultDate = isoDate(new Date());
  return `<div class="ag-head"><h2 class="first">${esc(A.calendar || 'Calendrier partagé')}</h2><button class="link" data-action="agenda-refresh">${A.loading ? 'Mise à jour…' : 'Actualiser'}</button></div>
    ${A.error ? `<p class="hint err">Dernière lecture impossible (${esc(A.error)}). Affichage de la copie d'il y a ${esc(ago(A.at || new Date().toISOString()))}.</p>` : ''}
    ${S.showEventForm ? `<form class="form add" data-form="agenda-add">
      <label class="sr" for="ev-title">Titre</label><input class="field" id="ev-title" data-keep name="title" placeholder="Quoi ?" autocomplete="off" required>
      <div class="row mt"><div class="grow"><label class="chip-label" for="ev-date">Date</label><input class="field" id="ev-date" data-keep name="date" type="date" value="${defaultDate}" required></div>
        <div class="w-110"><label class="chip-label" for="ev-time">Heure</label><input class="field" id="ev-time" data-keep name="time" type="time"></div></div>
      ${chipGroup('ev-dur', [['allday', 'Toute la journée'], ['30', '30 min'], ['60', '1 h'], ['120', '2 h'], ['180', '3 h']], '60', 'Durée')}
      <div class="row mt"><div class="grow"><label class="chip-label" for="ev-end">Jusqu'au (facultatif, pour plusieurs jours)</label><input class="field" id="ev-end" data-keep name="enddate" type="date"></div></div>
      <label class="sr" for="ev-place">Lieu</label><input class="field mt" id="ev-place" data-keep name="place" placeholder="Lieu (facultatif)" autocomplete="off">
      <div class="form-actions"><button type="button" class="btn ghost small" data-action="ev-form" data-show="0">Annuler</button><button class="btn" type="submit">Ajouter au calendrier</button></div>
    </form>` : `<button class="btn" data-action="ev-form" data-show="1">+ Ajouter un événement</button>`}
    <button class="link house-toggle" data-action="agenda-house" aria-pressed="${S.agendaHouse !== false}">${S.agendaHouse !== false ? 'Masquer' : 'Afficher'} le ménage et les choses à faire</button>
    ${blocks || emptyArt('vide_agenda', 'Rien de prévu dans les trois prochains mois.')}
    <details class="fold" data-fold="ag-settings"><summary>Connexion</summary><p class="hint">Relié à ${esc(A.calendar)} via ${esc(A.apple_id || 'iCloud')}${A.set_by ? `, par ${esc(nameOf(A.set_by))}` : ''}. L'app ne lit que ce calendrier.</p><button class="link" data-action="agenda-forget">Déconnecter le calendrier</button></details>`;
}
function editEvent(e) {
  const d = evDay(e); const t = e.allDay ? '' : evTime(e.start);
  const mins = e.allDay ? 'allday' : String(Math.round((new Date(e.end) - new Date(e.start)) / 60000));
  const endDate = e.allDay ? isoDate(new Date(new Date(e.end + 'T12:00').getTime() - DAY)) : isoDate(new Date(e.end));
  return `<form class="form edit" data-form="agenda-edit" data-id="${esc(e.id)}">
    <label class="sr" for="ee-title">Titre</label><input class="field" id="ee-title" name="title" value="${esc(e.title)}" required>
    <div class="row mt"><div class="grow"><label class="chip-label" for="ee-date">Date</label><input class="field" id="ee-date" name="date" type="date" value="${d}" required></div>
      <div class="w-110"><label class="chip-label" for="ee-time">Heure</label><input class="field" id="ee-time" name="time" type="time" value="${t}"></div></div>
    ${chipGroup('edit-dur', [['allday', 'Toute la journée'], ['30', '30 min'], ['60', '1 h'], ['120', '2 h'], ['180', '3 h']], ['allday', '30', '60', '120', '180'].includes(mins) ? mins : '60', 'Durée')}
    <div class="row mt"><div class="grow"><label class="chip-label" for="ee-end">Jusqu'au</label><input class="field" id="ee-end" name="enddate" type="date" value="${endDate !== d ? endDate : ''}"></div></div>
    <label class="sr" for="ee-place">Lieu</label><input class="field mt" id="ee-place" name="place" value="${esc(e.place || '')}" placeholder="Lieu">
    <div class="form-actions"><button type="button" class="btn ghost small" data-action="edit-cancel">Annuler</button><button class="btn small" type="submit">Enregistrer</button></div>
  </form>`;
}
// Construit début et fin à partir des champs d'un formulaire d'événement.
function eventFromForm(f, durGroup) {
  const title = f.title.value.trim(); if (!title) return { error: 'Donne un titre.' };
  const date = f.date.value; if (!date) return { error: 'Choisis une date.' };
  const dur = chipVal(durGroup, '60'); const time = f.time.value; const endDate = f.enddate?.value;
  const place = f.place?.value.trim() || undefined;
  if (dur === 'allday' || !time) {
    const last = endDate && endDate > date ? endDate : date;
    const end = isoDate(new Date(new Date(last + 'T12:00').getTime() + DAY));
    return { event: { title, start: date, end, allDay: true, place } };
  }
  const start = new Date(`${date}T${time}`);
  let end = new Date(start.getTime() + Number(dur) * 60000);
  if (endDate && endDate > date) end = new Date(`${endDate}T${time}`);
  return { event: { title, start: start.toISOString(), end: end.toISOString(), allDay: false, place } };
}

function viewTasks() {
  const open = S.tasks.filter(t => !t.done).sort((a, b) => rankOf(a) - rankOf(b) || (a.due_on || '9999').localeCompare(b.due_on || '9999') || a.created_at.localeCompare(b.created_at));
  const allDone = S.tasks.filter(t => t.done).sort((a, b) => (b.done_at || '').localeCompare(a.done_at || ''));
  const fresh = allDone.filter(t => t.done_at && Date.now() - new Date(t.done_at).getTime() < DAY);
  const done = allDone.filter(t => !fresh.includes(t)).slice(0, 15);
  const who = [['me', 'Moi'], ['other', nameOf(other())], ['nous', 'Nous deux']];
  const item = t => {
    const meta = [];
    if (t.done && t.done_at) meta.push(`Fait ${ago(t.done_at)}`);
    else meta.push(t.assignee ? (t.assignee === S.me ? 'Pour toi' : `Pour ${nameOf(t.assignee)}`) : 'Pour vous deux');
    if (t.due_on && !t.done) meta.push(relDay(t.due_on) + (t.due_time ? ` à ${String(t.due_time).slice(0, 5)}` : ''));
    const late = t.due_on && !t.done && dayDiff(new Date(t.due_on + 'T12:00'), new Date()) < 0;
    if (S.edit?.id === t.id) return `<li class="item editing">${editTask(t)}</li>`;
    return `<li class="item ${t.done ? (fresh.includes(t) ? 'done fresh' : 'done') : ''}" data-sid="${t.id}">
      <button class="tick" id="tick-${t.id}" role="checkbox" aria-checked="${t.done}" aria-label="Fait : ${esc(t.title)}" data-action="task-toggle" data-id="${t.id}"></button>
      ${iconBtn('tasks', t)}<div class="item-main"><div class="item-title">${esc(t.title)}</div><div class="item-meta ${late ? 'late' : ''}">${esc(meta.join(', '))}</div>${t.done ? '' : nudgeBtn('task', t, t.due_on && dayDiff(new Date(t.due_on + 'T12:00'), new Date()) <= 0)}</div>
      <button class="more" id="more-${t.id}" aria-label="Options" aria-expanded="${S.open === t.id}" data-action="more" data-id="${t.id}">⋯</button>
      ${iconPicker('tasks', t)}
      ${S.open === t.id ? `<div class="item-actions"><button class="btn ghost small" data-action="edit" data-type="tasks" data-id="${t.id}">Modifier</button>${t.done ? '' : nudgeMenu('task', t)}${t.done ? '' : calBtn(t)}${who.filter(w => w[0] !== 'other' || other()).map(([k, l]) => `<button class="btn ghost small" data-action="task-assign" data-id="${t.id}" data-who="${k}">Pour ${k === 'me' ? 'moi' : k === 'nous' ? 'nous deux' : esc(l)}</button>`).join('')}<button class="btn ghost small" data-action="task-delete" data-id="${t.id}">Supprimer</button></div>` : ''}
    </li>`;
  };
  return `<h2 class="list-head">À faire${open.length ? ` <span class="count">${open.length}</span>` : ''}</h2>
    ${open.length ? `<ul class="list" data-sort="tasks">${open.map(item).join('')}</ul>${open.length > 1 ? '<p class="hint sort-hint">Appuie et maintiens une ligne pour la déplacer.</p>' : ''}` : emptyArt('vide_taches', 'Plus rien à faire. Profitez-en.')}
    ${fresh.length ? `<h2 class="list-head done-head">Fait aujourd'hui <span class="count">${fresh.length}</span></h2><ul class="list">${fresh.map(item).join('')}</ul>` : ''}
    <form class="form add" data-form="task">
      <label class="sr" for="task-title">Nouvelle chose à faire</label>
      <input class="field" id="task-title" data-keep name="title" placeholder="Ajouter une chose à faire" autocomplete="off" required>
      ${chipGroup('task-who', who, 'nous', 'Pour qui')}
      <div class="row mt">
        <div class="grow"><label class="chip-label" for="task-due">Pour quand (facultatif)</label>
        <input class="field" id="task-due" data-keep name="due" type="date"></div>
        <button class="btn" type="submit">Ajouter</button>
      </div>
    </form>
    ${done.length ? `<details class="fold" data-fold="done"><summary>Faites récemment (${done.length})</summary><ul class="list">${done.map(item).join('')}</ul></details>` : ''}`;
}

// Formulaires de modification, affichés à la place de l'élément.

function editTask(t) {
  const who = [['me', 'Moi'], ['other', nameOf(other())], ['nous', 'Nous deux']].filter(w => w[0] !== 'other' || other());
  const cur = t.assignee === S.me ? 'me' : t.assignee ? 'other' : 'nous';
  return `<form class="form edit" data-form="edit-task" data-id="${t.id}">
    <label class="sr" for="et-title">Titre</label><input class="field" id="et-title" name="title" value="${esc(t.title)}" required>
    ${chipGroup('edit-who', who, cur, 'Pour qui')}
    ${chipGroup('edit-prio', PRIO_CHOICES, t.priority || 'auto', 'Priorité')}
    <div class="row mt">
      <div class="grow"><label class="chip-label" for="et-due">Date</label><input class="field" id="et-due" name="due" type="date" value="${esc(t.due_on || '')}"></div>
      <div class="w-110"><label class="chip-label" for="et-time">Heure</label><input class="field" id="et-time" name="time" type="time" value="${esc(t.due_time ? String(t.due_time).slice(0, 5) : '')}"></div>
    </div>
    <div class="form-actions"><button type="button" class="btn ghost small" data-action="edit-cancel">Annuler</button><button class="btn small" type="submit">Enregistrer</button></div>
  </form>`;
}
function editShop(s) {
  return `<form class="form edit row" data-form="edit-shop" data-id="${s.id}">
    <div class="grow"><label class="sr" for="es-label">Article</label><input class="field" id="es-label" name="label" value="${esc(s.label)}" required></div>
    <button type="button" class="btn ghost small" data-action="edit-cancel">Annuler</button><button class="btn small" type="submit">OK</button>
  </form>`;
}
function editChore(c) {
  const who = S.members.map(m => [m.email, m.email === S.me ? 'Moi' : m.name]);
  return `<form class="form edit" data-form="edit-chore" data-id="${c.id}">
    <label class="sr" for="ec-title">Nom</label><input class="field" id="ec-title" name="title" value="${esc(c.title)}" required>
    ${chipGroup('edit-freq', FREQS.map(([n, l]) => [String(n), l]), String(c.every_days), 'Fréquence')}
    ${chipGroup('edit-weight', WEIGHTS, String(c.weight || 2), 'Effort')}
    ${chipGroup('edit-prio', PRIO_CHOICES, c.priority || 'auto', 'Priorité')}
    ${c.sorte ? '' : chipGroup('edit-who', [['tour', 'À tour de rôle'], ['any', 'Qui veut'], ...who.map(([e, l]) => [e, `Toujours ${l === 'Moi' ? 'moi' : l}`])], c.fixed ? (c.turn || 'any') : 'tour', 'Qui')}
    ${!c.sorte && chipVal('edit-who', c.fixed ? (c.turn || 'any') : 'tour') === 'tour' ? chipGroup('edit-turn', who, c.turn || S.me, 'À qui le tour') : ''}
    ${seqOf(c) ? seqOf(c).steps.filter(s => s.minutes).map(s => `<div class="row mt"><div class="grow"><label class="chip-label" for="ec-min-${s.key}">${esc(s.doing)} : durée en minutes</label><input class="field" id="ec-min-${s.key}" name="min_${s.key}" type="number" inputmode="numeric" min="1" max="600" value="${seqMinutes(c, s)}"></div></div>`).join('') : ''}
    <div class="row mt"><div class="grow"><label class="chip-label" for="ec-last">Dernière fois faite le</label><input class="field" id="ec-last" name="last" type="date" value="${esc(c.last_done_at ? isoDate(new Date(c.last_done_at)) : '')}"></div></div>
    <div class="form-actions"><button type="button" class="btn ghost small" data-action="edit-cancel">Annuler</button><button class="btn small" type="submit">Enregistrer</button></div>
  </form>`;
}
function editExpense(e) {
  const share = Number(e.payer_share);
  const split = share === 0.5 ? 'half' : share === 0 ? 'other' : 'custom';
  const cur = chipVal('edit-split', split);
  return `<form class="form edit" data-form="edit-expense" data-id="${e.id}">
    <div class="row">
      <div class="w-118"><label class="sr" for="ee-amount">Montant</label><input class="field amount-input" id="ee-amount" name="amount" inputmode="decimal" value="${esc(chf(e.amount))}" required></div>
      <div class="grow"><label class="sr" for="ee-label">Pour quoi</label><input class="field" id="ee-label" name="label" value="${esc(e.label)}" required></div>
    </div>
    ${chipGroup('edit-payer', S.members.map(m => [m.email, m.email === S.me ? 'Moi' : m.name]), e.paid_by, 'Payé par')}
    ${chipGroup('edit-split', [['half', 'Moitié-moitié'], ['other', "Avance pour l'autre"], ['custom', 'Autre partage']], split, 'Partage')}
    ${cur === 'custom' ? `<div class="row mt"><div class="grow"><label class="chip-label" for="ee-pct">Part de celui ou celle qui paie, en %</label><input class="field" id="ee-pct" name="pct" inputmode="numeric" value="${Math.round(share * 100)}"></div></div>` : ''}
    ${chipGroup('edit-cat', CATS, e.category, 'Catégorie')}
    <div class="row mt"><div class="grow"><label class="chip-label" for="ee-date">Date</label><input class="field" id="ee-date" name="date" type="date" value="${esc(e.spent_on)}"></div></div>
    <div class="form-actions"><button type="button" class="btn ghost small" data-action="edit-cancel">Annuler</button><button class="btn small" type="submit">Enregistrer</button></div>
  </form>`;
}
function editNote(n) {
  return `<form class="form edit" data-form="edit-note" data-id="${n.id}">
    <label class="sr" for="en-body">Mot</label><textarea class="area" id="en-body" name="body" required>${esc(n.body)}</textarea>
    <label class="check"><input type="checkbox" id="en-important" name="important" ${n.important ? 'checked' : ''}> Important</label>
    <div class="form-actions"><button type="button" class="btn ghost small" data-action="edit-cancel">Annuler</button><button class="btn small" type="submit">Enregistrer</button></div>
  </form>`;
}

function viewBoard() {
  const notes = [...S.board].sort((a, b) => (b.pinned - a.pinned) || b.created_at.localeCompare(a.created_at));
  return `<form class="form" data-form="note">
      <label class="sr" for="note-body">Nouveau mot sur le tableau</label>
      <textarea class="area" id="note-body" data-keep name="body" placeholder="Une info pour la maison : un rendez-vous, un code, un rappel…" required></textarea>
      <label class="check"><input type="checkbox" id="note-important" data-keep name="important"> Important</label>
      <div class="form-actions"><button class="btn" type="submit">Afficher</button></div>
    </form>
    <div class="notes">${notes.length ? notes.map(n => S.edit?.id === n.id ? `<article class="note">${editNote(n)}</article>` : `
      <article class="note ${n.important ? 'important' : ''} ${n.pinned ? 'pinned' : ''}">
        <p>${esc(n.body)}</p>
        <div class="note-foot"><span>${esc(n.author === S.me ? 'Toi' : nameOf(n.author))}, ${esc(ago(n.created_at))}${n.pinned ? ', épinglé' : ''}</span>
          <span class="acts"><button class="link" data-action="edit" data-type="board" data-id="${n.id}">Modifier</button><button class="link" data-action="note-pin" data-id="${n.id}">${n.pinned ? 'Détacher' : 'Épingler'}</button><button class="link" data-action="note-delete" data-id="${n.id}">Retirer</button></span></div>
      </article>`).join('') : '<p class="empty">Le tableau est vide. Laisse un mot pour la maison.</p>'}</div>`;
}

// Ménage

// Déchets : ce qu'on peut descendre maintenant, d'après le calendrier de la gérance.
// Bouton « Fait » d'une corvée : rouge quand c'est le moment, vert quand c'est fait (jusqu'à la prochaine fois).
// Pour une sorte de déchet, grisé quand le calendrier de ramassage l'interdit.
function choreBtn(c, now = new Date()) {
  const st = choreStatus(c);
  const s = c.sorte && SORTES.find(x => x.id === c.sorte);
  const d = s ? descente(s, c, now) : null;
  // Hors calendrier, le bouton reste cliquable (le container est parfois là quand même), juste atténué.
  const off = d && !d.possible ? 'off' : '';
  return `<button class="btn dech-btn ${st.due ? 'due' : 'done'} ${off}" id="done-${c.id}" data-action="chore-done" data-id="${c.id}">${st.due ? 'À faire' : 'Fait ✓'}</button>`;
}
function dechetMeta(c, now = new Date()) {
  const s = SORTES.find(x => x.id === c.sorte);
  const st = choreStatus(c);
  const d = descente(s, c, now);
  // Une ligne, pour que les quatre blocs fassent la même hauteur.
  if (st.due && !d.possible) return `Ramassage, plutôt ${d.until}`;
  if (st.due) return d.state === 'route' ? 'Au bout du chemin' : st.late ? st.label[0].toUpperCase() + st.label.slice(1) : 'À descendre';
  const w = st.label[0].toUpperCase() + st.label.slice(1);
  return c.last_done_by ? `${w}, par ${c.last_done_by === S.me ? 'toi' : nameOf(c.last_done_by)}` : w;
}
const hhmm = ms => new Date(ms).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
// Carte d'une corvée en étapes.
// Ligne d'une corvée en étapes (dans une carte groupée) : titre, une ligne d'état, pastilles des étapes, bouton de l'étape.
function seqRow(c) {
  const q = seqOf(c);
  if (S.edit?.id === c.id) return `<li class="dech-row editing">${editChore(c)}</li>`;
  const s = seqState(c);
  let meta, btn;
  if (s.phase === 'start') {
    const st = s.st;
    meta = st.due ? (st.late ? cap(st.label) : 'À lancer') : `${cap(st.label)}${c.last_done_by && !q.personal ? `, par ${c.last_done_by === S.me ? 'toi' : nameOf(c.last_done_by)}` : ''}`;
    btn = `<button class="btn dech-btn ${st.due ? 'due' : 'done'}" id="done-${c.id}" data-action="seq-step" data-id="${c.id}" data-i="0">${esc(q.steps[0].btn)}${st.due ? '' : ' ✓'}</button>`;
  } else if (s.phase === 'timer') {
    meta = `Depuis ${hhmm(new Date(c.started_at).getTime())} · encore ${s.left} min`;
    btn = `<button type="button" class="dech-btn cycle" data-action="seq-adjust" data-id="${c.id}" aria-expanded="${S.adjust === c.id}" aria-label="Fini vers ${esc(hhmm(s.ready))}, changer la durée"><small class="cyc-k">fin</small>${esc(hhmm(s.ready))}</button>`;
  } else {
    const nx = q.steps[s.i];
    meta = nx.meta || `Prêt : ${nx.btn.toLowerCase()}`;
    btn = `<button class="btn dech-btn due" id="done-${c.id}" data-action="seq-step" data-id="${c.id}" data-i="${s.i}">${esc(nx.btn)}</button>`;
  }
  const dots = q.steps.map((st, k) => `<span class="dot ${s.phase === 'start' ? (k === 0 ? (s.st.due ? 'dot-non' : 'dot-ok') : 'off') : k < s.i ? 'dot-ok' : k === s.i ? (s.phase === 'timer' ? 'dot-route' : 'dot-non') : 'off'}"></span>`).join('');
  const st0 = q.steps[s.i];
  const adjust = S.adjust === c.id && s.phase === 'timer' ? `<div class="item-actions seq-adjust"><div class="chips">${[-10, -5, 5, 10].map(d => `<button type="button" data-action="seq-shift" data-id="${c.id}" data-key="${st0.key}" data-d="${d}">${d > 0 ? '+' : '−'}${Math.abs(d)} min</button>`).join('')}</div><p class="hint">${esc(st0.doing)} : ${seqMinutes(c, st0)} min. Gardé pour les prochaines fois, chez vous deux.</p></div>` : '';
  const actions = adjust || S.open === c.id ? adjust + (S.open !== c.id ? '' : `<div class="item-actions"><button class="btn ghost small" data-action="edit" data-type="chores" data-id="${c.id}">Modifier</button>${c.started_at ? `<button class="btn ghost small" data-action="seq-reset" data-id="${c.id}">Annuler le cycle</button>` : ''}</div>`) : '';
  const title = q.personal ? (c.turn === S.me ? 'La mienne' : nameOf(c.turn)) : q.label;
  // L'image suit l'étape en cours (sauf si on a choisi une icône à la main).
  const stepIcon = (!c.icon || c.icon === `t:${q.icon}`) && s.phase !== 'start' ? (STEP_ICONS[c.sorte] || {})[`${s.phase}:${q.steps[s.i]?.key}`] : null;
  return `<li class="dech-row">${iconBtn('chores', stepIcon ? { ...c, icon: `t:${stepIcon}` } : c)}<div class="item-main"><div class="item-title">${esc(title)}</div><div class="item-meta"><span class="dots-inline">${dots}</span>${esc(meta)}</div></div>
    <div class="item-trail">${btn}<button class="more" id="more-${c.id}" aria-label="Options" aria-expanded="${S.open === c.id}" data-action="more" data-id="${c.id}">⋯</button></div>
    ${iconPicker('chores', c)}${actions}</li>`;
}
const STEP_ICONS = {
  lessive: { 'timer:lavage': 'lessive_lancer', 'next:sechage': 'linge_mouille', 'timer:sechage': 'seche_linge', 'next:ranger': 'plier' },
};
// Ligne d'une corvée ordinaire placée dans une carte groupée (la vaisselle à la main).
function plainRow(c) {
  if (S.edit?.id === c.id) return `<li class="dech-row editing">${editChore(c)}</li>`;
  const st = choreStatus(c);
  const who = !c.turn ? 'Qui veut' : c.fixed ? (c.turn === S.me ? 'Toujours toi' : `Toujours ${nameOf(c.turn)}`) : (c.turn === S.me ? 'À toi' : `À ${nameOf(c.turn)}`);
  const title = /^vaisselle$/i.test(c.title.trim()) ? 'À la main' : c.title;
  return `<li class="dech-row">${iconBtn('chores', c)}<div class="item-main"><div class="item-title">${esc(title)}</div><div class="item-meta"><span class="dots-inline"><span class="dot ${st.due ? 'dot-non' : 'dot-ok'}"></span></span>${esc(who)}, ${esc(st.label)}</div>${nudgeBtn('chore', c, st.due)}</div>
    <div class="item-trail">${choreBtn(c)}<button class="more" id="more-${c.id}" aria-label="Options" aria-expanded="${S.open === c.id}" data-action="more" data-id="${c.id}">⋯</button></div>
    ${iconPicker('chores', c)}
    ${S.open === c.id ? `<div class="item-actions"><button class="btn ghost small" data-action="edit" data-type="chores" data-id="${c.id}">Modifier</button>${nudgeMenu('chore', c)}${c.fixed || !c.turn ? '' : `<button class="btn ghost small" data-action="chore-swap" data-id="${c.id}">Passer le tour</button>`}<button class="btn ghost small" data-action="chore-delete" data-id="${c.id}">Supprimer</button></div>` : ''}</li>`;
}
// Carte groupée : un en-tête repliable (icône, titre, résumé, pastilles) et ses lignes, même anatomie que Déchets.
function groupCard({ id, icon, title, summary, dots, rows }) {
  return `<details class="chore dech-card" data-fold="${id}" ${S.folds?.[id] === false ? '' : 'open'}><summary><img class="ticon" src="icons/themes/${icon}.webp" alt="" width="34" height="34"><div class="item-main"><div class="item-title">${esc(title)}</div><div class="item-meta">${esc(summary)}</div></div><div class="item-trail dots">${dots}</div></summary>
    <ul class="dech-list">${rows.join('')}</ul></details>`;
}
const dueDot = c => { const q = seqOf(c); if (q) { const s = seqState(c); return s.phase === 'timer' ? 'dot-route' : (s.phase === 'next' || s.st.due) ? 'dot-non' : 'dot-ok'; } return choreStatus(c).due ? 'dot-non' : 'dot-ok'; };
const isDue = c => { const q = seqOf(c); if (q) { const s = seqState(c); return s.phase === 'next' || (s.phase === 'start' && s.st.due); } return choreStatus(c).due; };
function dechetsCard(waste) {
  const now = new Date();
  const dots = waste.map(c => { const st = choreStatus(c); const d = descente(SORTES.find(x => x.id === c.sorte), c, now); return `<span class="dot ${st.due ? 'dot-non' : 'dot-ok'} ${d.possible ? '' : 'off'}" title="${esc(c.title)}"></span>`; }).join('');
  const rows = waste.map(c => {
    if (S.edit?.id === c.id) return `<li class="dech-row editing">${editChore(c)}</li>`;
    return `<li class="dech-row">${iconBtn('chores', c)}<div class="item-main"><div class="item-title">${esc(c.title)}</div><div class="item-meta">${esc(dechetMeta(c, now))}</div></div>
      <div class="item-trail">${choreBtn(c, now)}<button class="more" id="more-${c.id}" aria-label="Options" aria-expanded="${S.open === c.id}" data-action="more" data-id="${c.id}">⋯</button></div>
      ${iconPicker('chores', c)}
      ${S.open === c.id ? `<div class="item-actions"><button class="btn ghost small" data-action="edit" data-type="chores" data-id="${c.id}">Modifier</button></div>` : ''}</li>`;
  });
  return groupCard({ id: 'dechets', icon: 'dechets', title: 'Déchets', summary: dechetsResume(waste, now), dots, rows });
}
function vaisselleCard() {
  const main = S.chores.filter(c => !c.sorte && /vaisselle/i.test(c.title));
  const lv = S.chores.filter(c => c.sorte === 'lavevaisselle');
  const all = [...main, ...lv]; if (!all.length) return '';
  const n = all.filter(isDue).length;
  const summary = n ? (n === 1 ? '1 à faire' : `${n} à faire`) : 'Tout est propre';
  return groupCard({ id: 'vaisselle', icon: 'vaisselle', title: 'Vaisselle', summary, dots: all.map(c => `<span class="dot ${dueDot(c)}"></span>`).join(''), rows: [...main.map(plainRow), ...lv.map(seqRow)] });
}
// Azami : toutes les corvées qui la concernent (caisse, croquettes, véto…), groupées comme la vaisselle.
function azamiCard() {
  const rows = S.chores.filter(c => !c.sorte && isAzami(c)).sort((p, q) => choreStatus(p).d - choreStatus(q).d);
  if (!rows.length) return '';
  const n = rows.filter(isDue).length;
  return groupCard({ id: 'azami', icon: 'chat', title: 'Azami', summary: n ? (n === 1 ? '1 à faire' : `${n} à faire`) : 'Tout est fait', dots: rows.map(c => `<span class="dot ${dueDot(c)}"></span>`).join(''), rows: rows.map(plainRow) });
}
function lessiveCard() {
  const mine = S.chores.filter(c => c.sorte === 'lessive' && c.turn === S.me); if (!mine.length) return '';
  const c = mine[0]; const s = seqState(c);
  const summary = s.phase === 'timer' ? `${seqOf(c).steps[s.i].doing}, prêt dans ${s.left} min` : s.phase === 'next' ? 'Une étape à faire' : s.st.due ? 'À lancer' : cap(s.st.label);
  return groupCard({ id: 'lessive', icon: 'lessive', title: 'Lessive', summary, dots: mine.map(c => `<span class="dot ${dueDot(c)}"></span>`).join(''), rows: mine.map(seqRow) });
}

function pratiqueCard() {
  const P = PRATIQUE;
  const tel = t => `<a class="tel" href="tel:${t.replace(/\s/g, '')}">${esc(t)}</a>`;
  return `<details class="fold" data-fold="pratique"><summary>Infos pratiques de l'immeuble</summary>
    <div class="pratique">
      <h3>Gérance</h3><p><b>${esc(P.gerance.nom)}</b><br>${esc(P.gerance.adresse)}<br>${tel(P.gerance.tel)}<br><span class="hint">${esc(P.gerance.note)}</span></p>
      <h3>En cas de panne</h3><p class="hint">Du calme, réfléchir 15 secondes, puis appeler la gérance, même la nuit. Si ça n'aboutit pas :</p>
      <ul class="plain">${P.panne.map(p => `<li><b>${esc(p.quoi)}</b>${p.texte ? ` : ${esc(p.texte)}` : ''}${p.tel ? ` ${tel(p.tel)}` : ''}${p.note ? ` <span class="hint">${p.tel2 ? esc(p.note).replace(p.tel2, tel(p.tel2)) : esc(p.note)}</span>` : ''}</li>`).join('')}</ul>
      <h3>Déchèterie de Malley</h3><p><b>${esc(P.dechets.quoi)}</b> : ${esc(P.dechets.texte)}<br>${esc(P.dechets.lieu)}<br>${esc(P.dechets.horaires)}<br>${tel(P.dechets.tel)}<br><span class="hint">${esc(P.dechets.contact).replace(P.dechets.tel2, tel(P.dechets.tel2))}</span></p>
      <h3>Urgences</h3><p class="urgences">${P.urgences.map(([l, n]) => `<span><b>${esc(l)}</b> ${tel(n)}</span>`).join('')}</p>
      <h3>Comment lire cette page</h3>
      <p><b>Déchets</b> : le bouton devient rouge quand il est temps de descendre une sorte (poubelles et compost tous les 10 jours, papier et verre tous les 14), vert une fois fait. Il est grisé les jours de ramassage, quand le container n'est pas là : poubelles et papier sont ramassés mardi et vendredi, verre et compost le lundi. La veille du ramassage l'après-midi, le container est déjà au bout du chemin sur la route de Genève, y amener les sacs.</p>
    </div></details>`;
}

function viewMenage() {
  // Ordre : ce qu'on peut descendre maintenant, puis ce qui attend le ramassage, puis ce qui est fait (prochaine échéance la plus proche d'abord).
  const rank = c => { const st = choreStatus(c); const d = descente(SORTES.find(x => x.id === c.sorte), c); return st.due ? (d.possible ? 0 : 1) : 2; };
  const waste = SORTES.map(s => S.chores.find(c => c.sorte === s.id)).filter(Boolean).sort((a, b) => rank(a) - rank(b) || choreStatus(a).d - choreStatus(b).d);
  const chores = S.chores.filter(c => !c.sorte && !/vaisselle/i.test(c.title) && !isAzami(c)).sort((a, b) => rankOf(a) - rankOf(b) || choreStatus(a).d - choreStatus(b).d);
  const who = S.members.map(m => [m.email, m.email === S.me ? 'Moi' : m.name]);

  return `<header class="hd row"><div><p class="hd-kicker">Corvées et tournus</p><h1>Ménage</h1></div><button class="azami-btn" data-action="meow" aria-label="Faire miauler Azami">${azami('v44_menage', 'Azami passe le balai')}</button></header>
    <div class="groups">${dechetsCard(waste)}${vaisselleCard()}${lessiveCard()}${azamiCard()}</div>
    <h2 class="list-head">Corvées</h2>
    ${chores.length ? `<div class="chores" data-sort="chores">${chores.map(c => {
      const st = choreStatus(c);
      const mine = c.turn === S.me;
      if (S.edit?.id === c.id) return `<div class="chore editing">${editChore(c)}</div>`;
      return `<div class="chore ${mine ? 'mine' : ''} ${st.late ? 'late' : ''}" data-sid="${c.id}">
        ${iconBtn('chores', c)}<div class="item-main"><div class="c-title">${esc(c.title)}</div>
          <div class="c-meta">${!c.turn ? 'Qui veut' : c.fixed ? (mine ? 'Toujours toi' : `Toujours ${esc(nameOf(c.turn))}`) : (mine ? 'À toi' : `À ${esc(nameOf(c.turn))}`)}, <span class="c-when">${esc(st.label)}</span></div>
          <div class="c-meta">${esc(freqLabel(c.every_days))}${weightLabel(c.weight) ? `, ${weightLabel(c.weight)}` : ''}${c.last_done_by ? `, dernière fois par ${esc(c.last_done_by === S.me ? 'toi' : nameOf(c.last_done_by))}` : ''}</div>${nudgeBtn('chore', c, st.due)}</div>
        <div class="item-trail">
          ${choreBtn(c)}
          <button class="more" id="more-${c.id}" aria-label="Options" aria-expanded="${S.open === c.id}" data-action="more" data-id="${c.id}">⋯</button>
        </div>
        ${iconPicker('chores', c)}
        ${S.open === c.id ? `<div class="item-actions"><button class="btn ghost small" data-action="edit" data-type="chores" data-id="${c.id}">Modifier</button>${nudgeMenu('chore', c)}${c.fixed || !c.turn ? '' : `<button class="btn ghost small" data-action="chore-swap" data-id="${c.id}">Passer le tour à ${esc(nameOf(S.members.find(m => m.email !== c.turn)?.email))}</button>`}<button class="btn ghost small" data-action="chore-delete" data-id="${c.id}">Supprimer</button></div>` : ''}
      </div>`;
    }).join('')}</div>${chores.length > 1 ? '<p class="hint sort-hint">Appuie et maintiens une corvée pour la déplacer.</p>' : ''}` : '<p class="empty">Aucune corvée pour l\'instant. Ajoute la première ci-dessous.</p>'}

    ${S.showChoreForm ? `<h2>Nouvelle corvée</h2>
    <form class="form" data-form="chore">
      <label class="sr" for="chore-title">Nom de la corvée</label>
      <input class="field" id="chore-title" data-keep name="title" placeholder="Arroser les plantes" autocomplete="off" required>
      ${chipGroup('chore-freq', FREQS.map(([n, l]) => [String(n), l]), '7', 'Fréquence')}
      ${chipGroup('chore-weight', WEIGHTS, '2', 'Effort')}
      ${chipGroup('chore-who', [['tour', 'À tour de rôle'], ['any', 'Qui veut'], ...who.map(([e, l]) => [e, `Toujours ${l === 'Moi' ? 'moi' : l}`])], 'tour', 'Qui')}
      ${chipVal('chore-who', 'tour') === 'tour' ? chipGroup('chore-first', who, S.me, 'Qui commence') : ''}
      <div class="form-actions"><button type="button" class="btn ghost" data-action="chore-form" data-show="0">Annuler</button><button class="btn" type="submit">Ajouter</button></div>
    </form>` : `<button class="btn ghost wide" data-action="chore-form" data-show="1">+ Ajouter une corvée</button>`}

    ${pratiqueCard()}`;
}

// Courses

// Où acheter : rayon deviné d'après le thème de l'article, modifiable à la main.
const SHOPS = [
  ['super', 'Supermarché', 'Coop, Migros, Denner, Aldi'],
  ['asie', 'Épicerie asiatique', 'Uchitomi, Lee Fung'],
  ['maison', 'Maison & brico', 'Jumbo, Ikea, Brico'],
  ['pharma', 'Pharmacie & droguerie', 'Pharmacie, Müller'],
  ['azami', 'Animalerie', 'Qualipet, Fressnapf'],
  ['tech', 'Électronique', 'Digitec, Interdiscount, Fust'],
  ['autre', 'Divers', 'cadeaux, commandes, le reste'],
];
// Illustration au-dessus d'un état vide.
const emptyArt = (id, txt) => `<div class="empty-art"><img src="icons/themes/${id}.webp" alt="" width="120" height="120" decoding="async"><p class="empty">${txt}</p></div>`;
const SHOP_ICON = { super: 'rayon_super', asie: 'rayon_asie', maison: 'rayon_maison', pharma: 'rayon_pharma', azami: 'rayon_azami', tech: 'rayon_tech', autre: 'rayon_divers' };
const shopIc = (k, cls = 'shop-ic') => SHOP_ICON[k] ? `<img class="${cls}" src="icons/themes/${SHOP_ICON[k]}.webp" alt="" width="40" height="40" decoding="async">` : '';
const SHOP_OF_THEME = {
  asiatique: 'asie', nouilles: 'asie', sushi: 'asie', curry: 'asie', riz_sushi: 'asie,super', panko: 'asie,super', tofu: 'asie,super', tempeh: 'asie', sauce_soja: 'asie,super', miso: 'asie', mirin: 'asie', pate_gyoza: 'asie', feuilles_riz: 'asie', ramen: 'asie,super', udon: 'asie', soba: 'asie', nouilles_riz: 'asie,super', vermicelles: 'asie',
  vinaigre_riz: 'asie,super', huile_sesame: 'asie,super', sesame: 'asie,super', nori: 'asie,super', wakame: 'asie', dashi: 'asie', kimchi: 'asie', gochujang: 'asie', sriracha: 'asie,super', lait_coco: 'asie,super', pate_curry: 'asie,super', gyozas: 'asie', mochi: 'asie', matcha: 'asie,super', sauce_okonomi: 'asie', mayo_jp: 'asie', furikake: 'asie', edamame: 'asie,super', chou_chinois: 'asie,super', pak_choi: 'asie,super', shiitake: 'asie,super', mangue: 'super,asie', citron_vert: 'super,asie', yuzu: 'asie', kaki: 'super,asie', coriandre: 'super,asie',
  bricolage: 'maison', reparation: 'maison', lampe: 'maison', peinture: 'maison', mesures: 'maison',
  meubles: 'maison', deco: 'maison', tapis: 'maison', rideaux: 'maison', etagere: 'maison', futon: 'maison', rangement: 'maison', plantes: 'maison', jardin: 'maison', fleurs: 'maison', bougie: 'maison', textile: 'maison', lit: 'maison', serviettes: 'maison',
  pharmacie: 'pharma', premierssoins: 'pharma', malade: 'pharma', beaute: 'pharma', rasage: 'pharma', dents: 'pharma', regles: 'pharma', intime: 'pharma',
  // ce qu'on trouve à plusieurs endroits
  menage: 'super,maison', plumeau: 'super,maison', aspirateur: 'super,maison', poubelle: 'super,maison', lessive: 'super,maison', vaisselle: 'super,maison', papiertoilette: 'super,maison', hygiene: 'super,pharma', cuisine: 'super,maison', machinecafe: 'super,maison', frigo: 'super,maison',
  bouilloire: 'maison,tech', grille_pain: 'maison,tech', cuiseur_riz: 'maison,tech,asie', mixeur: 'maison,tech', micro_ondes: 'maison,tech', plaque_teppan: 'maison,tech', poele: 'maison,super',
  encre: 'tech', imprimer: 'tech', ampoule_e27: 'maison,super', ampoule_gu10: 'maison', pile_bouton: 'tech,super',
  silicone: 'maison', detecteur: 'maison,tech', scotch: 'maison,super', colle: 'maison,super', lampe_poche: 'maison,tech',
  cables: 'tech', piles: 'tech,super', telephone: 'tech', ordinateur: 'tech', audio: 'tech', tv: 'tech', photo: 'tech', jeux: 'tech', electricite: 'tech,maison', internet_sites: 'tech', telecom: 'tech',
  cadeau: 'autre', anniversaire: 'autre', noel: 'autre', amis: 'autre', famille: 'autre', fete: 'autre', mariage: 'autre',
  litiere: 'azami,super', croquettes: 'azami,super', patee: 'azami,super', friandises: 'azami,super',
  croquettes: 'azami', patee: 'azami', friandises: 'azami', litiere: 'azami', griffoir: 'azami', arbreachat: 'azami', jouetschat: 'azami', antipuces: 'azami', brossechat: 'azami', herbeachat: 'azami', fontaine: 'azami', gamelle: 'azami', caissetransport: 'azami', collierchat: 'azami', antipoils: 'azami', animalerie: 'azami', chat: 'azami',
};
function guessShop(label) { const r = classify(label, S.hints); return (r && (SHOP_OF_THEME[r.id] || SHOP_OF_THEME[PARENT[r.id]])) || 'super'; }
// Un article peut être dans plusieurs rayons (« super,maison ») : il apparaît dans chaque groupe.
const shopsOf = s => { const v = String(s.shop || '').split(',').filter(k => SHOPS.some(x => x[0] === k)); return v.length ? v : guessShop(s.label).split(','); };

// Rayons : la liste suit le tour du magasin (fruits et légumes d'abord, surgelés à la fin…).
const shopTheme = s => (String(s.icon || '').startsWith('t:') ? s.icon.slice(2) : null) || classify(s.label, S.hints)?.id || null;
const aisleFor = (shop, s) => aisleOf(shop, shopTheme(s), PARENT);
// Article inconnu : au supermarché, avec l'épicerie ; un objet connu mais hors rayons alimentaires, à la fin.
const aisleRank = (shop, s) => { const a = aisleFor(shop, s); return a ? a[0] : shop === 'super' && !shopTheme(s) ? 5.5 : 99; };
const byAisle = (shop, list) => [...list].sort((a, b) => aisleRank(shop, a) - aisleRank(shop, b) || a.created_at.localeCompare(b.created_at));
// Ce qui manque encore pour les recettes au menu (articles pas encore pris).
function menuMissing() {
  return (S.plans || []).map(p => ({ p, items: S.shopping.filter(x => !x.checked && pourList(x).includes(p.title)) })).filter(x => x.items.length);
}
const menuMissText = list => list.map(({ p, items }) => `${p.title} : ${items.slice(0, 4).map(x => shopLabel(x.label)).join(', ')}${items.length > 4 ? '…' : ''}`).join(' · ');

function aisleGroups(shop, list, item) {
  const groups = []; let cur = null;
  for (const s of byAisle(shop, list)) {
    const a = aisleFor(shop, s); const label = a ? a[1] : aisleRank(shop, s) === 5.5 ? 'Épicerie' : 'Autres';
    if (!cur || cur.label !== label) { cur = { label, items: [] }; groups.push(cur); }
    cur.items.push(s);
  }
  return groups.map(g => `<h3 class="aisle">${esc(g.label)}</h3><ul class="list">${g.items.map(item).join('')}</ul>`).join('');
}

function viewCourses() {
  const mode = SHOPS.find(x => x[0] === S.shopMode) ? S.shopMode : null;
  const todoAll = S.shopping.filter(s => !s.checked).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const todo = mode ? todoAll.filter(s => shopsOf(s).includes(mode)) : todoAll;
  const cart = myCart(), cartOther = S.shopping.filter(s => s.checked && !cart.includes(s));
  const modeLabel = mode ? SHOPS.find(x => x[0] === mode)[1] : '';
  const item = s => S.edit?.id === s.id ? `<li class="item editing">${editShop(s)}</li>` : `<li class="item"><button class="tick" id="tick-${s.id}" role="checkbox" aria-checked="${s.checked}" aria-label="${esc(s.label)}" data-action="shop-toggle" data-id="${s.id}"></button>
    ${iconBtn('shopping', s)}<div class="item-main"><div class="item-title">${esc(shopLabel(s.label))}</div>${shopMeta(s)}</div>
    <button class="more" id="more-${s.id}" aria-label="Options" aria-expanded="${S.open === s.id}" data-action="more" data-id="${s.id}">⋯</button>
    ${iconPicker('shopping', s)}
    ${S.open === s.id ? `<div class="item-actions"><button class="btn ghost small" data-action="edit" data-type="shopping" data-id="${s.id}">Modifier</button><button class="btn ghost small" data-action="shop-delete" data-id="${s.id}">Retirer</button></div>
      <div class="item-actions shops">${SHOPS.map(([k, l]) => `<button class="btn ghost small" data-action="shop-where" data-id="${s.id}" data-shop="${k}" aria-pressed="${shopsOf(s).includes(k)}">${esc(l)}</button>`).join('')}</div>` : ''}</li>`;
  return `<header class="hd row"><div><p class="hd-kicker">${mode ? `Je suis : ${esc(modeLabel)}` : todo.length ? pl(todo.length, 'article', 'articles') : 'Liste vide'}</p><h1>Courses</h1></div><button class="azami-btn" data-action="meow" aria-label="Faire miauler Azami">${azami('v44_courses', 'Azami fouille le panier')}</button></header>
    <form class="form row" data-form="shop">
      <div class="grow"><label class="sr" for="shop-label">Article</label>
      <input class="field" id="shop-label" data-keep name="label" placeholder="Ajouter un article" autocomplete="off" enterkeyhint="done" required></div>
      <button class="btn" type="submit">Ajouter</button>
    </form>
    ${duoBanner(mode)}
    ${(() => { const mm = menuMissing(); return mm.length ? `<div class="menu-miss"><b>Pour le menu</b> ${mm.map(({ p, items }) => `<span>${esc(p.title)} <em>${pl(items.length, 'à prendre', 'à prendre')}</em></span>`).join('')}</div>` : ''; })()}
    <div class="where">
      <button type="button" class="where-btn ${mode ? 'on' : ''}" data-action="where-open" aria-expanded="${!!S.whereOpen}" aria-haspopup="listbox"><span class="where-k">Je suis à…</span>${mode ? `${shopIc(mode, 'chip-ic')}<span class="where-v">${esc(modeLabel)}</span>` : '<span class="where-v none">Choisir un magasin</span>'}<span class="where-caret" aria-hidden="true"></span></button>
      ${S.whereOpen ? `<div class="where-menu" role="listbox" aria-label="Je suis à">${SHOPS.map(([k, l, ex]) => `<button type="button" class="where-opt" role="option" data-action="shop-pick" data-shop="${k}" aria-selected="${mode === k}">${shopIc(k, 'chip-ic')}<span><b>${esc(l)}</b>${ex ? `<small>${esc(ex)}</small>` : ''}</span></button>`).join('')}${mode ? '<button type="button" class="where-opt out" role="option" data-action="shop-pick" data-shop="" aria-selected="false"><span><b>Je ne suis pas en magasin</b></span></button>' : ''}</div>` : ''}
    </div>
    <div class="shop">${mode
      ? (todo.length ? `<h2 class="list-head shop-head">${shopIc(mode)}${esc(modeLabel)} <span class="hint-inline">${esc(SHOPS.find(x => x[0] === mode)[2])}</span></h2>${aisleGroups(mode, todo, item)}` : `<p class="empty">Rien à acheter ici${todoAll.length ? ', le reste de la liste est ailleurs' : ''}.</p>`)
      : (todo.length ? SHOPS.map(([k, l, ex]) => { const list = byAisle(k, todo.filter(s => shopsOf(s).includes(k))); return list.length ? `<h2 class="list-head shop-head">${shopIc(k)}${esc(l)}${ex ? ` <span class="hint-inline">${esc(ex)}</span>` : ''}</h2><ul class="list">${list.map(item).join('')}</ul>` : ''; }).join('') : emptyArt('vide_courses', 'Rien à acheter. Ajoute un article quand il manque quelque chose.'))}
    ${cart.length ? `<h2>${cartOther.length ? 'Dans ton panier' : 'Dans le panier'} <span class="count">${cart.length}</span></h2><ul class="list">${cart.map(item).join('')}</ul>` : ''}
    ${cartOther.length ? `<h2>Dans le panier de ${esc(nameOf(other()))} <span class="count">${cartOther.length}</span></h2><ul class="list other-cart">${cartOther.map(item).join('')}</ul>` : ''}
    ${mode ? `<div class="form-actions"><button class="btn ghost" data-action="shop-mode" data-shop="${mode}">Je ressors</button><button class="btn" data-action="shop-done" ${cart.length ? '' : 'disabled'}>Courses faites</button></div>`
      : cart.length ? `<div class="form-actions"><button class="btn ghost" data-action="shop-clear">Vider le panier</button></div>` : ''}</div>`;
}

// Argent

function optionsSummary() {
  const payer = chipVal('exp-payer', S.me) === S.me ? 'payé par moi' : `payé par ${nameOf(chipVal('exp-payer', S.me))}`;
  const split = { half: 'moitié-moitié', other: "avancé pour l'autre", custom: 'autre partage' }[chipVal('exp-split', 'half')];
  return `${catLabel(chipVal('exp-cat', 'courses'))}, ${payer}, ${split}`;
}

function balanceCard() {
  const net = balances()[S.me] || 0;
  const o = other();
  const d = balanceDetail();
  const me = d.by[S.me] || { paid: 0, part: 0 }, them = d.by[o] || { paid: 0, part: 0 };
  const quits = Math.abs(net) < 0.01;
  const sentence = quits
    ? 'Vous êtes quittes.'
    : net > 0 ? `${esc(nameOf(o))} te doit <span class="amt">${chf(net)}</span>` : `Tu dois <span class="amt">${chf(-net)}</span> à ${esc(nameOf(o))}`;
  const max = Math.max(me.paid, them.paid, me.part, them.part, 0.01);
  const row = (label, v) => `<div class="bal-row"><span>${esc(label)}</span>
      <div class="bal-bars"><div class="bal-bar paid" style="width:${Math.round(v.paid / max * 100)}%"></div><div class="bal-bar part" style="width:${Math.round(v.part / max * 100)}%"></div></div>
      <b>${chf(v.paid)}</b><i>${chf(v.part)}</i></div>`;
  const sinceLabel = d.lastSettle ? `depuis le remboursement du ${esc(new Date(d.lastSettle.created_at).toLocaleDateString('fr-CH', { day: 'numeric', month: 'long' }))}` : 'depuis le début';
  return `<section class="bal-card" aria-label="Solde">
    <p class="bal-kicker">Solde</p>
    <p class="balance">${sentence}</p>
    ${d.since.length ? `<p class="bal-sub">${pl(d.since.length, 'dépense', 'dépenses')} ${sinceLabel}, ${chf(d.total)} en tout.</p>
    <div class="bal-rows">
      <div class="bal-head"><span></span><span></span><b>a payé</b><i>sa part</i></div>
      ${row('Toi', me)}${row(nameOf(o), them)}
    </div>
    <p class="bal-explain">${quits ? 'Chacun a payé exactement sa part.' : net > 0 ? `Tu as payé ${chf(me.paid - me.part)} de plus que ta part.` : `${esc(nameOf(o))} a payé ${chf(them.paid - them.part)} de plus que sa part.`}</p>` : `<p class="bal-sub">Aucune dépense ${sinceLabel}.</p>`}
    ${quits ? '' : `<button class="btn small bal-btn" data-action="settle">${net < 0 ? `J'ai remboursé ${esc(nameOf(o))}` : `${esc(nameOf(o))} m'a remboursé`}</button>`}
  </section>`;
}

// Minuteurs de cuisine : lancés depuis une étape, gardés sur l'appareil, visibles sur toutes les pages.
function durations(text) {
  const out = [], seen = new Set();
  const re = /(\d+(?:[.,]\d+)?)\s*h(?:eures?)?\s*(\d{1,2})?(?!\w)|(\d+)\s*(?:à\s*(\d+)\s*)?min(?:utes?)?\b|(\d+)\s*s(?:ec(?:ondes?)?)?\b/gi;
  let m;
  while ((m = re.exec(text))) {
    let sec, label;
    if (m[1]) { const h = parseFloat(m[1].replace(',', '.')); const mn = Number(m[2] || 0); sec = Math.round(h * 3600 + mn * 60); label = `${m[1]} h${m[2] ? ' ' + m[2] : ''}`; }
    else if (m[3]) { const a = Number(m[3]), b = m[4] ? Number(m[4]) : null; sec = (b || a) * 60; label = `${b || a} min`; }
    else { sec = Number(m[5]); if (sec < 10) continue; label = sec >= 60 && sec % 60 === 0 ? `${sec / 60} min` : `${sec} s`; }
    if (!sec || sec > 6 * 3600 || seen.has(sec)) continue;
    seen.add(sec); out.push({ sec, label });
  }
  return out;
}
const loadTimers = () => { try { return JSON.parse(safeGet('maison-timers') || '[]'); } catch { return []; } };
const saveTimers = () => safeSet('maison-timers', JSON.stringify(S.timers));
const fmtLeft = ms => { const t = Math.max(0, Math.ceil(ms / 1000)); const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), sc = t % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(sc).padStart(2, '0')}` : `${m}:${String(sc).padStart(2, '0')}`; };
function timerBtns(text, recipe) {
  const d = durations(text); if (!d.length) return '';
  return `<div class="tbtns">${d.map(x => `<button type="button" class="btn ghost small tbtn" data-action="timer-start" data-sec="${x.sec}" data-label="${esc(recipe)}">⏱ ${esc(x.label)}</button>`).join('')}</div>`;
}
function timersBar() {
  if (!S.timers?.length) return '';
  const now = Date.now();
  return `<div aria-hidden="true" style="height:${S.timers.length * 54}px"></div><div class="timers" role="status">${S.timers.map(t => { const left = t.end - now; const done = left <= 0; return `<div class="timer ${done ? 'ring' : ''}" data-tid="${t.id}"><span class="tl">${esc(t.label)}</span><b data-timer="${t.id}">${done ? 'Fini !' : fmtLeft(left)}</b>${done ? '' : `<button class="link" data-action="timer-add" data-id="${t.id}" aria-label="Une minute de plus">+1′</button>`}<button class="tx" data-action="timer-stop" data-id="${t.id}" aria-label="${done ? 'OK' : 'Arrêter'}">${done ? 'OK' : '×'}</button></div>`; }).join('')}</div>`;
}
function timerRing(t) {
  haptic('heavy'); sfx('big'); setTimeout(() => sfx('big'), 1200); setTimeout(() => sfx('big'), 2400);
  if ('Notification' in window && Notification.permission === 'granted') show('Minuteur fini', t.label, 'timer-' + (t.sid || t.id));
  toast(`Minuteur fini : ${t.label}`);
  react('minuteur_fini', document.querySelector(`[data-timer="${t.id}"]`) || document.querySelector('.hd .azami'));
}
setInterval(() => {
  if (!S.timers?.length) return;
  const now = Date.now(); let changed = false;
  for (const t of S.timers) {
    const el = document.querySelector(`[data-timer="${t.id}"]`);
    if (t.end > now) { if (el) el.textContent = fmtLeft(t.end - now); continue; }
    if (!t.fired) { t.fired = true; changed = true; timerRing(t); }
  }
  if (changed) { saveTimers(); render(); }
}, 1000);

// Quantité utile en magasin : poids, volumes, et pièces au-delà d'une. Pas de cuillères ni de pincées.
function shopQty(x, n) {
  if (['g', 'kg', 'ml', 'l'].includes(x.u)) return ` (${qty(x, n)})`;
  if (x.u === 'pc') { const v = Math.ceil(x.q * n / 2 - 0.01); return v > 1 ? ` (×${v})` : ''; }
  return '';
}
// Articles déjà ajoutés depuis une recette avec une quantité inutile : on la cache à l'affichage.
const shopLabel = l => String(l).replace(/\s*\((?:[\d.,]+\s*(?:c\. à [sc]\.|pincée)|1|0\.\d+)\)\s*$/, '').replace(/\s*\((\d+(?:[.,]\d+)?)\)\s*$/, (_, v) => { const k = Math.ceil(parseFloat(v.replace(',', '.'))); return k > 1 ? ` (×${k})` : ''; });
// Additionne deux quantités de même unité : « Jambon (×2) » + « (×4) » → « Jambon (×6) ».
function addQty(label, extra) {
  const re = /\s*\((×)?([\d.,]+)\s*(g|kg|ml|l)?\)\s*$/;
  const a = String(label).match(re), b = String(extra).match(re);
  if (!b) return null;
  const unit = m => (m[1] ? 'x' : m[3] || 'x');
  if (!a) return null;
  if (unit(a) !== unit(b)) return null;
  const v = parseFloat(a[2].replace(',', '.')) + parseFloat(b[2].replace(',', '.'));
  const base = String(label).replace(re, '');
  return unit(a) === 'x' ? `${base} (×${Math.ceil(v)})` : `${base} (${Math.round(v * 10) / 10} ${a[3]})`;
}

// D'où vient un article : recette(s) prévue(s) et/ou qui l'a ajouté.
const pourList = s => String(s.pour || '').split('|').map(x => x.trim()).filter(Boolean);
function shopMeta(s) {
  const bits = [];
  const p = pourList(s); if (p.length) bits.push(`Pour : ${p.join(', ')}`);
  if (s.checked && s.checked_by) bits.push(s.checked_by === S.me ? 'Pris par toi' : `Pris par ${nameOf(s.checked_by)}`);
  else if (s.added_by !== S.me) bits.push(`Ajouté par ${nameOf(s.added_by)}`);
  return bits.length ? `<div class="item-meta${p.length ? ' pour' : ''}">${esc(bits.join(' · '))}</div>` : '';
}
// Au menu : recettes dont on a mis les ingrédients sur la liste, jusqu'à ce qu'on les cuisine.
function menuCard() {
  if (!S.plans?.length) return '';
  const missFor = t => S.shopping.filter(x => !x.checked && pourList(x).includes(t));
  const todoFor = t => missFor(t).length;
  return `<h2 class="first">Au menu</h2><ul class="list menu">${S.plans.map(p => { const n = todoFor(p.title); const r = RID(p.recipe);
    return `<li class="item ${n ? 'missing' : ''}">${r ? rThumb(r) : ''}<div class="item-main" data-action="r-open" data-id="${esc(p.recipe)}" role="button" tabindex="0"><div class="item-title">${esc(p.title)}</div><div class="item-meta">Pour ${p.persons}${p.created_by && p.created_by !== S.me ? ` · prévu par ${esc(nameOf(p.created_by))}` : ''}</div>${n ? `<div class="menu-need">⚠ Il manque encore ${esc(missFor(p.title).map(x => shopLabel(x.label)).slice(0, 5).join(', '))}${n > 5 ? '…' : ''}</div>` : '<div class="menu-ok">✓ Tout est acheté</div>'}</div>
      ${r ? `<button class="btn small" data-action="plan-cook" data-id="${p.id}">Cuisiner</button>` : ''}<button class="more" aria-label="Options" aria-expanded="${S.open === p.id}" data-action="more" data-id="${p.id}">⋯</button>
      ${S.open === p.id ? `<div class="item-actions"><button class="btn ghost small" data-action="plan-remove" data-id="${p.id}">Retirer du menu</button>${n ? `<button class="btn ghost small" data-action="plan-remove" data-id="${p.id}" data-shop="1">Retirer avec ses ${pl(n, 'article', 'articles')}</button>` : ''}</div>` : ''}</li>`; }).join('')}</ul>`;
}

// Illustrations des recettes : une image principale (le plat) et les ingrédients qui la caractérisent.
const RSTAPLE = new Set(['sel', 'poivre', 'huile_tournesol', 'huile_olive', 'huile', 'eau', 'sucre', 'epices', 'bouillon', 'farine', 'vinaigre', 'beurre', 'ail', 'oignon']);
const imgOf = s => { const r = classify(s); return r && THEME_IMG.has(r.id) ? r.id : null; };
const rArtCache = {};
function rArt(r) {
  if (rArtCache[r.id]) return rArtCache[r.id];
  const hero = HERO[r.base || r.id] || imgOf((r.base ? RID0(r.base) : r).titre);
  const ings = r.ing.map(x => imgOf(x.n));
  const key = [...new Set(ings.filter(x => x && !RSTAPLE.has(x) && x !== hero))].slice(0, 3);
  return (rArtCache[r.id] = { hero, ings, key });
}
const tImg = (id, cls) => id ? `<img class="${cls}" src="icons/themes/${id}.webp" alt="" loading="lazy" decoding="async">` : '';
const rThumb = r => { const a = rArt(r); return `<span class="rart" aria-hidden="true">${tImg(a.hero, 'rhero')}${a.key.slice(0, 2).map(k => tImg(k, 'rmini')).join('')}</span>`; };
function rPlate(r) {
  const a = rArt(r);
  return `<div class="rplate" aria-hidden="true">${a.key.map((k, i) => tImg(k, `rp-ing rp${i}`)).join('')}${tImg(a.hero, 'rp-hero')}</div>`;
}
// Ingrédients cités dans une étape (pour les montrer au-dessus du texte).
function stepIngs(r, text) {
  const t = ' ' + norm(text) + ' '; const a = rArt(r); const out = [];
  r.ing.forEach((x, j) => {
    const words = norm(x.n).split(' ').filter(w => w.length >= 3 && !['de', 'des', 'du', 'la', 'le', 'les', 'en', 'au', 'aux', 'pour', 'sec', 'frais', 'cuit'].includes(w));
    const hit = words.some(w => t.includes(' ' + w) || t.includes(' ' + w.replace(/s$/, '')));
    if (hit && a.ings[j] && !out.includes(a.ings[j])) out.push(a.ings[j]);
  });
  return out.slice(0, 5);
}

// Frais ----------------------------------------------------------------------
// À l'achat, chaque produit frais reçoit une date estimée ; deux jours avant, l'app prévient.
const DAYMS = 86400000;
function freshTheme(label, icon) {
  const r = classify(shopLabel(label), S.hints);
  const ids = [r?.id, icon?.startsWith('t:') ? icon.slice(2) : null].filter(Boolean);
  for (const id of ids) { if (SHELF[id]) return id; if (SHELF[PARENT[id]]) return PARENT[id]; }
  return null;
}
// Durée apprise : quand on corrige une date, on retient l'écart pour ce type de produit (sur cet appareil).
const shelfLearn = () => { try { return JSON.parse(safeGet('maison-shelf') || '{}'); } catch { return {}; } };
const shelfDays = theme => Math.max(1, shelfLearn()[theme] ?? SHELF[theme]);
async function stockFresh(items) {
  for (const s of items) {
    const theme = freshTheme(s.label, s.icon); if (!theme) continue;
    const row = { label: shopLabel(s.label).replace(/\s*\(.*\)$/, ''), icon: s.icon || `t:${theme}`, theme, expires_on: isoDate(new Date(Date.now() + shelfDays(theme) * DAYMS)), created_by: S.me };
    try { const r = await api.insert('pantry', row); S.pantry.push(r || row); } catch (e) { console.warn('frigo', e); }
  }
}
const daysLeft = x => Math.round((new Date(x.expires_on + 'T12:00').getTime() - new Date(isoDate(new Date()) + 'T12:00').getTime()) / DAYMS);
const soonItems = () => S.pantry.filter(x => !x.status && daysLeft(x) <= 2).sort((a, b) => daysLeft(a) - daysLeft(b));
// Recettes qui utilisent le plus de ce qui va périmer.
function rescueRecipes(items, n = 4) {
  const themes = new Set(items.map(x => x.theme));
  return RECETTES.map(r => { const hit = new Set(rArt(r).ings.filter(t => t && (themes.has(t) || themes.has(PARENT[t])))); return { r, n: hit.size }; })
    .filter(x => x.n).sort((a, b) => b.n - a.n || a.r.min - b.r.min).slice(0, n).map(x => x.r);
}
// « On mange quoi ce soir ? » : la machine à capsules d'Azami tire une recette. Elle suit les filtres
// choisis ; sans filtre, pas de gâteau ni de dessert. Ce qui va bientôt périmer pèse plus lourd.
function rouletteBtn() {
  return `<button type="button" class="roulette-btn" data-action="roulette"><img src="azami/v44/statiques/azami_v44_cuisine_statique.svg" alt="" width="512" height="512"><span><b>On mange quoi ce soir ?</b><small>Azami tire une recette au hasard pour vous</small></span><span class="roulette-cap" aria-hidden="true"></span></button>`;
}
let rouletteLast = [];
function roulettePick() {
  let pool = rFiltered();
  if (!S.rtype && !S.rq) pool = pool.filter(r => !r.tags.includes('sucre'));
  if (!pool.length) return null;
  const themes = new Set(soonItems().map(x => x.theme));
  const w = r => { const hit = rArt(r).ings.some(t => t && (themes.has(t) || themes.has(PARENT[t]))); return (hit ? 5 : 1) * (rouletteLast.includes(r.id) ? .05 : 1); };
  const tot = pool.reduce((a, r) => a + w(r), 0); let x = Math.random() * tot;
  for (const r of pool) { x -= w(r); if (x <= 0) return r; }
  return pool[pool.length - 1];
}
function rouletteOpen() {
  const old = document.getElementById('ticket'); if (old) old.remove();
  const box = document.createElement('div'); box.id = 'ticket';
  box.innerHTML = `<div class="ticket-card roulette" role="dialog" aria-label="On mange quoi ce soir ?"><p class="ticket-title">On mange quoi ce soir ?</p><div class="roulette-stage"></div></div>`;
  box.addEventListener('click', e => { if (e.target === box) closeTicket(); });
  document.body.appendChild(box); requestAnimationFrame(() => box.classList.add('on'));
  rouletteSpin(box);
}
function rouletteSpin(box) {
  const r = roulettePick(); const stage = box.querySelector('.roulette-stage');
  if (!r) { stage.innerHTML = '<p class="ticket-sub">Aucune recette avec ces filtres. Enlève un filtre et réessaie.</p><div class="form-actions"><button class="btn" data-action="sheet-close">OK</button></div>'; return; }
  rouletteLast = [r.id, ...rouletteLast].slice(0, 6);
  const k = KIND_COL.cuisine;
  stage.innerHTML = `<div class="gacha r1" style="--k:${r.tags.includes('sucre') ? KIND_COL.mignon : k}"><button type="button" class="gacha-cap" aria-label="Ouvrir la capsule"><span class="cap-top"></span><span class="cap-bot"></span><span class="cap-shine"></span></button><p class="gacha-hint">Touche la capsule !</p></div>`;
  if (SOUNDS && audioCtx?.state === 'running') scheduleBruits(audioCtx, [['manivelle', 0], ['capsule', .55]], audioCtx.currentTime + .02, .5);
  haptic('medium');
  const open = () => {
    const g = stage.querySelector('.gacha'); if (!g || g.classList.contains('open')) return;
    g.classList.add('open'); haptic('heavy');
    if (SOUNDS && audioCtx?.state === 'running') scheduleBruits(audioCtx, [['pop_capsule', 0]], audioCtx.currentTime + .01, .55);
    const themes = new Set(soonItems().map(x => x.theme));
    const rescue = S.pantry.filter(x => !x.status && daysLeft(x) <= 2 && rArt(r).ings.some(t => t && (t === x.theme || PARENT[t] === x.theme)));
    setTimeout(() => {
      sfx('done');
      g.insertAdjacentHTML('beforeend', `<div class="gacha-card roulette-card" style="--k:${KIND_COL.cuisine}">${rThumb(r)}<b class="gacha-txt">${esc(r.titre)}</b><span class="gacha-count">${esc(rDur(r.min))} · ${esc(CUISINES[r.cuisine] || '')}</span>
        ${rescue.length ? `<span class="roulette-why">Parfait pour finir ${esc(rescue.map(x => x.label).slice(0, 2).join(' et '))}</span>` : ''}</div>
        <div class="form-actions roulette-actions"><button class="btn" data-action="roulette-go" data-id="${r.id}">On fait ça !</button><button class="btn ghost" data-action="roulette-again">Une autre</button></div>
        <button class="link" data-action="r-panier" data-id="${r.id}">Ajouter ce qui manque à la liste</button>`);
      burst('sparkle', g.querySelector('.gacha-card'), 12);
    }, 380);
  };
  stage.querySelector('.gacha-cap').addEventListener('click', open);
}
function freshCard() {
  const soon = soonItems(); const all = S.pantry.filter(x => !x.status).sort((a, b) => daysLeft(a) - daysLeft(b));
  if (!all.length) return '';
  const row = x => { const d = daysLeft(x); return `<li class="fresh-item ${d < 0 ? 'late' : d <= 1 ? 'urgent' : ''}">${tImg(x.theme, 'fresh-ic')}<div class="item-main"><div class="item-title">${esc(x.label)}</div><div class="fresh-date"><button type="button" class="fd-btn" data-action="fresh-shift" data-id="${x.id}" data-d="-1" aria-label="Un jour de moins">−</button><span class="item-meta">${esc(dueText(d))}</span><button type="button" class="fd-btn" data-action="fresh-shift" data-id="${x.id}" data-d="1" aria-label="Un jour de plus">+</button></div></div>
    <button class="btn small fresh-ok" data-action="fresh-set" data-id="${x.id}" data-s="mange" aria-label="${esc(x.label)} : mangé">✓</button><button class="more" data-action="fresh-set" data-id="${x.id}" data-s="jete" aria-label="${esc(x.label)} : jeté">✕</button></li>`; };
  const ideas = soon.length ? rescueRecipes(soon) : [];
  const later = all.filter(x => daysLeft(x) > 2);
  return `${soon.length ? `<h2 class="first">À finir vite</h2><div class="fresh-card"><ul class="fresh-list">${soon.map(row).join('')}</ul>
      ${ideas.length ? `<p class="chip-label fresh-ideas">Pour les finir</p><ul class="list rlist">${rList(ideas)}</ul>` : ''}</div>` : ''}
    ${later.length ? `<details class="fold fresh-fold" data-fold="frigo"><summary>Au frigo (${later.length})</summary><ul class="fresh-list">${later.map(row).join('')}</ul></details>` : ''}`;
}

// Étapes : marqueurs {i:N} (quantité + ingrédient) et {q:N} (quantité seule), adaptés au nombre de personnes ;
// mots techniques touchables (lexique). Le texte brut sert aux minuteurs.
// « 100 ml de vin blanc », « 2 c. à s. d’huile » ; rien pour les pièces (« 2 oignons »).
const deOf = x => x.u && x.u !== 'pc' ? (/^[aeiouyàâéèêëîïôœùûh]/i.test(x.n) ? 'd’' : 'de ') : '';
const stepPlain = (r, text, n = S.persons || 2) => String(text).replace(/\{([iq]):(\d+)\}/g, (_, k, j) => { const x = r.ing[Number(j)]; if (!x) return ''; return k === 'i' ? `${qty(x, n)} ${deOf(x)}${x.n}` : qty(x, n); });
function stepHtml(r, text, n = S.persons || 2) {
  const parts = String(text).split(/(\{[iq]:\d+\})/);
  const seen = new Set(); let count = 0;
  const gloss = seg => {
    let html = esc(seg);
    for (const [key, re, , ] of GLOSS) {
      if (seen.has(key) || count >= 4) continue;
      const m = seg.match(re); if (!m) continue;
      const e = esc(m[0]); const idx = html.indexOf(e); if (idx < 0) continue;
      html = html.slice(0, idx) + `<button type="button" class="gl" data-action="gloss" data-k="${key}">${e}</button>` + html.slice(idx + e.length);
      seen.add(key); count++;
    }
    return html;
  };
  return parts.map(p => { const m = p.match(/^\{([iq]):(\d+)\}$/); if (!m) return gloss(p); const x = r.ing[Number(m[2])]; if (!x) return '';
    return m[1] === 'i' ? `<b class="sq">${esc(qty(x, n))}</b> ${esc(deOf(x) + x.n)}` : `<b class="sq">${esc(qty(x, n))}</b>`; }).join('');
}
// Ingrédients d'une étape : ceux des marqueurs, sinon ceux dont le nom apparaît.
function stepIngList(r, text) {
  const idx = [...String(text).matchAll(/\{[iq]:(\d+)\}/g)].map(m => Number(m[1])).filter(j => r.ing[j]);
  return [...new Set(idx)];
}
// Matériel particulier nécessaire pour une recette (et pas encore confirmé comme présent à la maison).
const gearCache = {};
function gearOf(r) {
  const k = r.id; if (gearCache[k]) return gearCache[k];
  const text = [r.titre, ...r.ing.map(x => x.n), ...r.etapes.map(e => stepPlain(r, e))].join(' \n ');
  return (gearCache[k] = GEAR.filter(([, , re]) => re.test(text)).map(([id, nom]) => ({ id, nom })));
}
const gearMissing = r => gearOf(r).filter(g => S.gear[g.id] !== true);
function openGloss(key) {
  const g = GLOSS.find(x => x[0] === key); if (!g) return;
  const old = document.getElementById('ticket'); if (old) old.remove();
  const box = document.createElement('div'); box.id = 'ticket';
  box.innerHTML = `<div class="ticket-card gloss-card" role="dialog" aria-label="${esc(g[2])}"><p class="ticket-title">${esc(g[2])}</p><p class="gloss-txt">${esc(g[3])}</p><div class="form-actions"><button class="btn" data-action="sheet-close">Compris</button></div></div>`;
  box.addEventListener('click', e => { if (e.target === box) closeTicket(); });
  document.body.appendChild(box); requestAnimationFrame(() => box.classList.add('on')); haptic(1);
}

// Recettes --------------------------------------------------------------------
const RID0 = id => RECETTES.find(r => r.id === id);
// Version végé : on remplace viande et poisson par un équivalent (le réglage est gardé sur ce téléphone).
const VSUB = [
  [/poulet ou tofu/i, 'tofu ferme'], [/^restes \(poulet/i, 'restes de légumes'], [/saumon cuit ou umeboshi/i, 'umeboshi'],
  [/bouillon de (poulet|bœuf)/i, 'bouillon de légumes'], [/sauce poisson/i, 'sauce soja'], [/sauce huître/i, 'sauce soja sucrée'],
  [/anchois/i, 'câpres'], [/bonite séchée/i, 'nori émietté'], [/^dashi( ou eau)?$/i, 'dashi de kombu'], [/gélatine/i, 'agar-agar'],
  [/cordons? bleus?/i, 'cordons bleus végé'], [/bâtonnets de poisson/i, 'nuggets végé'], [/viande séchée/i, 'tomates séchées'],
  [/^steaks? hachés?$|(bœuf|porc) haché/i, 'haché végétal'], [/^steaks?$/i, 'steaks végétaux'],
  [/lardons|guanciale|spam|poitrine de porc/i, 'tofu fumé'], [/jambon/i, 'jambon végé'],
  [/\bsaucisses?\b|cervelas/i, 'saucisses végé'], [/\bpoulet\b/i, 'émincé végétal'],
  [/\b(bœuf|porc|veau|côtelettes|escalopes)\b/i, 'émincé végétal'],
  [/\b(saumon|poisson|cabillaud|crevettes)\b/i, 'tofu ferme'], [/\bthon\b/i, 'pois chiches'], [/\bmoules\b/i, null],
];
const VWORDS = [[/\bpoulet\b/gi, 'émincé végé'], [/\bviande\b/gi, 'haché végétal'], [/\bbœuf\b/gi, 'émincé végé'], [/\bporc\b/gi, 'émincé végé'],
  [/\blardons\b/gi, 'tofu fumé'], [/\bguanciale\b/gi, 'tofu fumé'], [/\bspam\b/gi, 'tofu fumé'], [/\bjambon\b/gi, 'jambon végé'],
  [/\bsaucisses\b/gi, 'saucisses végé'], [/\bsaucisse\b/gi, 'saucisse végé'], [/\bcervelas\b/gi, 'saucisse végé'], [/\bsaumon\b/gi, 'tofu'],
  [/\bpoisson\b/gi, 'tofu'], [/\bcrevettes\b/gi, 'tofu'], [/\bthon\b/gi, 'pois chiches'], [/\bsteaks\b/gi, 'steaks végétaux'], [/\bcordons bleus\b/gi, 'cordons bleus végé'], [/sauce poisson/gi, 'sauce soja']];
const vegeCache = {};
function vegeOf(r) {
  if (!r || r.tags.includes('vege')) return null;
  if (r.id in vegeCache) return vegeCache[r.id];
  let changed = false, impossible = false;
  const ing = r.ing.map(x => { for (const [re, to] of VSUB) if (re.test(x.n)) { if (to === null) impossible = true; changed = true; return { ...x, n: to || x.n, u: /haché|émincé|tofu/.test(to || '') && x.u === 'pc' ? x.u : x.u }; } return x; });
  const etapes = r.etapes.map(e => VWORDS.reduce((t, [re, to]) => t.replace(re, to), e));
  return (vegeCache[r.id] = changed && !impossible ? { ...r, id: r.id + '~v', base: r.id, titre: `${r.titre} (végé)`, ing, etapes, tags: [...r.tags, 'vege'], desc: r.desc } : null);
}
const VEGE_ON = () => safeGet('maison-vege') === '1';
const RID = id => { const base = String(id).replace(/~v$/, ''); const r = RID0(base); return (VEGE_ON() || String(id).endsWith('~v')) && vegeOf(r) ? vegeOf(r) : r; };
const rDur = m => m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ' ' + String(m % 60).padStart(2, '0') : ''}`;
const rMeta = r => [CUISINES[r.cuisine], r.tags.includes('flemme') && 'flemme', r.tags.includes('vege') ? 'végé' : vegeOf(r) && 'végé possible', ...gearMissing(r).map(g => `⚠ ${g.nom.split(' (')[0].toLowerCase()}`)].filter(Boolean).join(' · ');
function viewRecettes() {
  if (!ETAPES_OK) {   // étapes détaillées pas encore là : on les attend un instant (une seule fois)
    loadEtapes().then(() => { for (const c of [vegeCache, gearCache, rArtCache]) for (const k in c) delete c[k]; if (S.view === 'recettes') render(); }).catch(() => {});
    return `<header class="hd row"><div><p class="hd-kicker">Un instant</p><h1>Recettes</h1></div><button class="azami-btn" data-action="meow" aria-label="Faire miauler Azami">${azami('v44_cuisine', 'Azami en cuisine')}</button></header><p class="hint">Azami sort les livres de cuisine…</p>`;
  }
  if (S.cook) return viewCuisiner();
  if (S.recette) return viewRecette(RID(S.recette));
  const list = rFiltered();
  const chip = (group, k, l) => `<button type="button" data-action="r-filter" data-g="${group}" data-k="${k}" aria-pressed="${rOn(group, k)}">${esc(l)}</button>`;
  const types = [['flemme', 'Flemme'], ['vege', 'Végé'], ['confort', 'Réconfort'], ['sucre', 'Sucré'], ...(RECETTES.some(r => r.tags.includes('gateau')) ? [['gateau', 'Gâteaux']] : [])];
  const ti = RTIME.indexOf(Number(S.rtime) || 0);
  const nf = [S.rtime, S.rcuisine, S.rtype].filter(Boolean).length;
  return `<header class="hd row"><div><p class="hd-kicker">${RECETTES.length} idées simples</p><h1>Recettes</h1></div><button class="azami-btn" data-action="meow" aria-label="Faire miauler Azami">${azami('v44_cuisine', 'Azami en cuisine')}</button></header>
    <div class="form row"><div class="grow"><label class="sr" for="rq">Chercher une recette</label>
      <input class="field" type="search" id="rq" data-keep value="${esc(S.rq)}" placeholder="Chercher : riz, poulet, oeufs…" autocomplete="off" enterkeyhint="search"></div></div>
    ${rouletteBtn()}
    ${freshCard()}
    ${menuCard()}
    <div class="rtime"><label for="rtime">Prêt en</label><input type="range" id="rtime" min="0" max="${RTIME.length - 1}" step="1" value="${ti < 0 ? 0 : ti}" style="--p:${(ti < 0 ? 0 : ti) / (RTIME.length - 1) * 100}%"><output id="rtime-txt">${rtimeText(S.rtime)}</output></div>
    <div class="rgroup"><p class="chip-label">Envie <span class="rg-hint">plusieurs possibles</span></p><div class="chips rchips r4">${types.map(([k, l]) => chip('rtype', k, l)).join('')}</div></div>
    <div class="rgroup"><p class="chip-label">Cuisine <span class="rg-hint">une seule</span></p><div class="chips rchips">${Object.entries(CUISINES).map(([k, l]) => chip('rcuisine', k, l)).join('')}</div></div>
    <p class="rcount" id="rcount">${rcountHtml(list.length)}</p>
    <ul class="list rlist" id="rlist">${rList(list)}</ul>`;
}
// Jauge du temps : 0 = peu importe, sinon « prêt en … max ».
const RTIME = [0, 10, 15, 20, 30, 45, 60, 90];
const rtimeText = m => { m = Number(m) || 0; return !m ? 'peu importe' : m < 60 ? `${m} min max` : m === 60 ? '1 h max' : '1 h 30 max'; };
// Envies cumulables (flemme + végé…), une seule cuisine à la fois.
const rTypes = () => String(S.rtype || '').split(',').filter(Boolean);
const rOn = (g, k) => g === 'rtype' ? rTypes().includes(k) : S[g] === k;
function rFiltered() {
  const q = norm(S.rq || '');
  const t = S.rtime, types = rTypes(), vg = types.includes('vege');
  return RECETTES.filter(r => (!S.rcuisine || r.cuisine === S.rcuisine)
    && types.every(k => r.tags.includes(k) || (k === 'vege' && vegeOf(r)))
    && (!t || r.min <= Number(t))
    && (!q || norm(`${r.titre} ${r.desc} ${CUISINES[r.cuisine]} ${r.ing.map(x => x.n).join(' ')}`).includes(q)))
    .sort((a, b) => (vg ? (b.tags.includes('vege') - a.tags.includes('vege')) : 0) || (t || types.includes('flemme') ? a.min - b.min : 0));
}
function rList(list) {
  if (!list.length) return `<li class="empty">Rien avec ça. Enlève un filtre ou essaie un ingrédient.</li>`;
  return list.map(r => `<li class="item rcard" data-action="r-open" data-id="${r.id}" role="button" tabindex="0">${rThumb(r)}<div class="item-main"><div class="item-title">${esc(r.titre)}</div><div class="item-meta">${esc(rMeta(r))}</div></div><span class="rmin">${r.min < 60 ? `${r.min}′` : `${Math.floor(r.min / 60)} h${r.min % 60 ? String(r.min % 60).padStart(2, '0') : ''}`}</span></li>`).join('');
}
const rcountHtml = n => `${pl(n, 'recette', 'recettes')}${S.rtime || S.rcuisine || S.rtype ? ` · <button class="link" data-action="r-reset">Tout effacer</button>` : ''}`;
// Filtre ou recherche : seule la liste change, le reste de la page reste où il est.
function rSearch(v) {
  S.rq = v; const el = document.getElementById('rlist'); if (!el) return;
  const list = rFiltered(); el.innerHTML = rList(list);
  el.classList.remove('rfade'); void el.offsetWidth; el.classList.add('rfade');
  const c = document.getElementById('rcount'); if (c) c.innerHTML = rcountHtml(list.length);
  // si on était descendu dans la liste, on remonte juste sous les filtres (et pas tout en haut)
  const f = document.querySelector('.rtime');
  if (f && f.getBoundingClientRect().top < 0) window.scrollTo({ top: window.scrollY + f.getBoundingClientRect().top - 12 });
}
function rSyncFilters() {
  document.querySelectorAll('[data-action="r-filter"]').forEach(b => b.setAttribute('aria-pressed', rOn(b.dataset.g, b.dataset.k)));
  const r = document.getElementById('rtime'); if (r) { const i = Math.max(0, RTIME.indexOf(Number(S.rtime) || 0)); r.value = i; r.style.setProperty('--p', `${i / (RTIME.length - 1) * 100}%`); }
  const o = document.getElementById('rtime-txt'); if (o) o.textContent = rtimeText(S.rtime);
}
function viewRecette(r) {
  const n = S.persons || 2;
  return `<header class="hd row"><div><button class="link back" data-action="r-back">‹ Recettes</button><p class="hd-kicker">${esc(rMeta(r))} · ${esc(rDur(r.min))}</p><h1>${esc(r.titre)}</h1></div><button class="azami-btn" data-action="meow" aria-label="Faire miauler Azami">${azami('v44_cuisine', 'Azami en cuisine')}</button></header>
    ${rPlate(r)}
    <p class="rdesc">${esc(r.desc)}</p>
    ${gearOf(r).length ? `<div class="gear-box"><p class="chip-label">Matériel particulier</p>${gearOf(r).map(g => `<div class="gear-row ${S.gear[g.id] === true ? 'ok' : S.gear[g.id] === false ? 'no' : ''}"><span class="gear-name">${S.gear[g.id] === true ? '✓' : '⚠'} ${esc(g.nom)}</span>${S.gear[g.id] === true ? '<span class="gear-st">On l’a</span>' : `<button type="button" class="btn ghost small" data-action="gear-set" data-id="${g.id}" data-has="1">On l’a</button>${S.gear[g.id] === false ? '' : `<button type="button" class="btn ghost small" data-action="gear-set" data-id="${g.id}" data-has="0">Pas chez nous</button>`}`}</div>`).join('')}</div>` : ''}
    ${r.base || vegeOf(r) ? `<button type="button" class="vege-toggle" data-action="r-vege" aria-pressed="${!!r.base}"><span class="vt-dot"></span>Version végé${r.base ? ' : viande et poisson remplacés' : ''}</button>` : ''}
    <div class="form-actions rcta"><button class="btn" data-action="r-cook" data-id="${r.id}">Faire la recette</button><button class="btn ghost" data-action="r-panier" data-id="${r.id}">Rajouter les aliments à la liste</button></div>
    <h2>Ingrédients <span class="muted">${r.parts ? esc(r.parts) : `pour ${n}`}</span></h2><p class="hint unit-hint">c. à s. = grande cuillère (à soupe) · c. à c. = petite cuillère (à café)</p>
    <ul class="list ring">${r.ing.map((x, j) => `<li>${tImg(rArt(r).ings[j], 'ring-ic') || '<span class="ring-ic"></span>'}<b>${esc(qty(x, n))}</b> <span>${esc(x.n)}</span></li>`).join('')}</ul>
    <h2>Recette</h2>
    <ol class="rsteps">${r.etapes.map(e => `<li>${stepHtml(r, e)}${timerBtns(stepPlain(r, e), r.titre)}</li>`).join('')}</ol>`;
}
function viewCuisiner() {
  const r = RID(S.cook.id), k = S.cook.step, last = k >= r.etapes.length - 1;
  const head = `<header class="hd row"><div><button class="link back" data-action="r-cook-stop">‹ ${esc(r.titre)}</button><p class="hd-kicker">${S.cook.full ? 'Recette entière' : `Étape ${k + 1} sur ${r.etapes.length}`}</p><h1>On cuisine</h1></div><button class="azami-btn" data-action="meow" aria-label="Faire miauler Azami">${azami('v44_cuisine', 'Azami en cuisine')}</button></header>`;
  if (S.cook.full) return head + `<ol class="rsteps big">${r.etapes.map((e, j) => `<li class="${j === k ? 'now' : ''}">${stepHtml(r, e)}${timerBtns(stepPlain(r, e), r.titre)}</li>`).join('')}</ol>
    <div class="form-actions rcta"><button class="btn" data-action="r-cook-steps">Reprendre étape par étape</button></div>`;
  return head + `<div class="rstep">${(() => { const ic = stepIngs(r, stepPlain(r, r.etapes[k])); return ic.length ? `<div class="rstep-ings" aria-hidden="true">${ic.map(i => tImg(i, 'rs-ic')).join('')}</div>` : ''; })()}<div class="rstep-n">${k + 1}</div><p class="rstep-txt">${stepHtml(r, r.etapes[k])}</p>${(() => { const li = stepIngList(r, r.etapes[k]); return li.length ? `<ul class="step-need">${li.map(j => `<li>${tImg(rArt(r).ings[j], 'sn-ic')}<b>${esc(qty(r.ing[j], S.persons || 2))}</b> ${esc(r.ing[j].n)}</li>`).join('')}</ul>` : ''; })()}${timerBtns(stepPlain(r, r.etapes[k]), r.titre)}
      <div class="dots-inline" aria-hidden="true">${r.etapes.map((_, j) => `<span class="dot ${j < k ? 'dot-ok' : j === k ? 'now' : 'off'}"></span>`).join('')}</div></div>
    <div class="form-actions rcta"><button class="btn ghost" data-action="r-prev" ${k ? '' : 'disabled'}>Précédent</button><button class="btn" data-action="${last ? 'r-done' : 'r-next'}">${last ? 'C\'est prêt !' : 'Suivant'}</button></div>
    <div class="form-actions"><button class="link" data-action="r-cook-full">Lire la recette en entier</button></div>
    <details class="fold mt" data-fold="r-ing"><summary>Ingrédients</summary><ul class="list ring">${r.ing.map((x, j) => `<li>${tImg(rArt(r).ings[j], 'ring-ic') || '<span class="ring-ic"></span>'}<b>${esc(qty(x, S.persons || 2))}</b> <span>${esc(x.n)}</span></li>`).join('')}</ul></details>`;
}
// Feuille « rajouter à la liste » : nombre de personnes, puis on coche ce qu'on a déjà.
function openPanier(id) {
  const r = RID(id); S.panier = { id, have: new Set() };
  const old = document.getElementById('ticket'); if (old) old.remove();
  const box = document.createElement('div'); box.id = 'ticket';
  const draw = () => {
    const n = S.persons || 2;
    const inList = new Set(S.shopping.filter(s => !s.checked).map(s => norm(s.label.replace(/\s*\(.*\)$/, ''))));
    box.innerHTML = `<div class="ticket-card panier" role="dialog" aria-label="Ajouter à la liste">
      <p class="ticket-title">${esc(r.titre)}</p>
      ${r.parts ? `<p class="ticket-sub">${esc(cap(r.parts))}</p>` : `<div class="persons"><button type="button" class="btn ghost small" data-p="-1" aria-label="Moins">−</button><span><b>${n}</b> ${n > 1 ? 'personnes' : 'personne'}</span><button type="button" class="btn ghost small" data-p="1" aria-label="Plus">+</button></div>`}
      <p class="ticket-sub">Coche ce que tu as déjà à la maison.</p>
      <ul class="list ring check">${r.ing.map((x, j) => { const dup = inList.has(norm(x.n)); const on = S.panier.have.has(j) || dup; return `<li><button type="button" class="tick" role="checkbox" aria-checked="${on}" data-j="${j}" aria-label="${esc(x.n)}"></button>${tImg(rArt(r).ings[j], 'ring-ic') || '<span class="ring-ic"></span>'}<span class="${on ? 'have' : ''}"><b>${esc(qty(x, n))}</b> ${esc(x.n)}${dup ? ' <em>déjà sur la liste</em>' : ''}</span></li>`; }).join('')}</ul>
      <div class="form-actions"><button class="btn ghost" data-action="sheet-close">Annuler</button><button class="btn" data-action="r-panier-ok">Ajouter ce qui manque</button></div></div>`;
    box.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => { S.persons = Math.min(12, Math.max(1, n + Number(b.dataset.p))); safeSet('maison-persons', String(S.persons)); haptic(1); draw(); }));
    box.querySelectorAll('[data-j]').forEach(b => b.addEventListener('click', () => { const j = Number(b.dataset.j); S.panier.have.has(j) ? S.panier.have.delete(j) : S.panier.have.add(j); haptic(1); draw(); }));
  };
  draw();
  document.body.appendChild(box);
  requestAnimationFrame(() => box.classList.add('on'));
  haptic(1);
}

function viewArgent() {
  const o = other();
  const lastSettle = balanceDetail().lastSettle;

  const sorted = [...S.expenses].sort((a, b) => b.spent_on.localeCompare(a.spent_on) || b.created_at.localeCompare(a.created_at));
  const months = new Map();
  for (const e of sorted) {
    const k = e.spent_on.slice(0, 7);
    if (!months.has(k)) months.set(k, []);
    months.get(k).push(e);
  }
  const share = chipVal('exp-split', 'half');

  const monthBlock = ([k, list]) => {
    const real = list.filter(e => !e.is_settlement);
    const total = real.reduce((s, e) => s + Number(e.amount), 0);
    const byCat = {};
    real.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount); });
    const label = new Date(k + '-15').toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' });
    const paidMe = real.filter(e => e.paid_by === S.me).reduce((s, e) => s + Number(e.amount), 0);
    return `<div class="month-head"><span>${esc(label[0].toUpperCase() + label.slice(1))}</span><b>${chf(total)}</b></div>
      <div class="cats"><span class="who">Toi ${chf(paidMe)} · ${esc(nameOf(o))} ${chf(total - paidMe)}</span>${Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => `<span>${esc(catLabel(c))} ${chf(v)}</span>`).join('')}</div>
      <ul class="list">${list.map(e => {
        const payer = e.paid_by === S.me ? 'toi' : nameOf(e.paid_by);
        if (e.is_settlement) {
          const to = S.members.find(m => m.email !== e.paid_by)?.email;
          return `<li class="item settle">
            <div class="item-main"><div class="money-row"><span class="item-title">${esc(e.paid_by === S.me ? `Tu as remboursé ${nameOf(to)}` : `${nameOf(e.paid_by)} t'a remboursé`)}</span><span class="amount">${chf(e.amount)}</span></div>
            <div class="item-meta">Solde remis à zéro, ${esc(relDay(e.spent_on))}</div></div>
            <button class="more" id="more-${e.id}" aria-label="Options" aria-expanded="${S.open === e.id}" data-action="more" data-id="${e.id}">⋯</button>
            ${S.open === e.id ? `<div class="item-actions"><button class="btn ghost small" data-action="settle-undo" data-id="${e.id}">Annuler ce remboursement</button></div>` : ''}</li>`;
        }
        const split = Number(e.payer_share) === 0.5 ? 'moitié-moitié' : Number(e.payer_share) === 0 ? `avancé pour ${e.paid_by === S.me ? nameOf(o) : 'toi'}` : `${Math.round(Number(e.payer_share) * 100)} % pour ${payer}`;
        const eff = expenseEffect(e);
        const settled = lastSettle && e.created_at <= lastSettle.created_at;
        const effect = Math.abs(eff) < 0.005 ? '' : settled ? `<span class="effect done">réglé</span>` : eff > 0 ? `<span class="effect pos">${esc(nameOf(o))} te doit ${chf(eff)}</span>` : `<span class="effect neg">Tu lui dois ${chf(-eff)}</span>`;
        if (S.edit?.id === e.id) return `<li class="item editing">${editExpense(e)}</li>`;
        return `<li class="item">
          ${iconBtn('expenses', e)}<div class="item-main"><div class="money-row"><span class="item-title">${esc(e.label)}</span><span class="amount">${chf(e.amount)}</span></div>
          <div class="item-meta money-row"><span>Payé par ${esc(payer)}, ${esc(split)}, ${esc(relDay(e.spent_on))}</span>${effect}</div></div>
          <button class="more" id="more-${e.id}" aria-label="Options" aria-expanded="${S.open === e.id}" data-action="more" data-id="${e.id}">⋯</button>
          ${iconPicker('expenses', e)}
          ${S.open === e.id ? `<div class="item-actions"><button class="btn ghost small" data-action="edit" data-type="expenses" data-id="${e.id}">Modifier</button><button class="btn ghost small" data-action="exp-delete" data-id="${e.id}">Supprimer</button></div>` : ''}</li>`;
      }).join('')}</ul>`;
  };
  const entries = [...months.entries()];
  const monthHtml = entries.slice(0, 6).map(monthBlock).join('') + (entries.length > 6
    ? `<details class="fold" data-fold="old-months"><summary>Mois précédents (${entries.length - 6})</summary>${entries.slice(6).map(monthBlock).join('')}</details>` : '');

  return `<header class="hd row"><div><p class="hd-kicker">Dépenses partagées</p><h1>Argent</h1></div><button class="azami-btn" data-action="meow" aria-label="Faire miauler Azami">${azami('v44_argent', 'Azami fait sauter une pièce')}</button></header>
    ${balanceCard()}

    <form class="form" data-form="expense">
      <div class="row">
        <div class="w-118"><label class="sr" for="exp-amount">Montant en francs</label>
          <input class="field amount-input" id="exp-amount" data-keep name="amount" inputmode="decimal" placeholder="0.00" autocomplete="off" required></div>
        <div class="grow"><label class="sr" for="exp-label">Pour quoi</label>
          <input class="field" id="exp-label" data-keep name="label" placeholder="Pour quoi" autocomplete="off" required enterkeyhint="done"></div>
        <button class="btn" type="submit">Ajouter</button>
      </div>
      <details class="fold" data-fold="exp-options"><summary>${esc(optionsSummary())}</summary>
      ${chipGroup('exp-payer', S.members.map(m => [m.email, m.email === S.me ? 'Moi' : m.name]), S.me, 'Payé par')}
      ${chipGroup('exp-split', [['half', 'Moitié-moitié'], ['other', "Avance pour l'autre"], ['custom', 'Autre partage']], 'half', 'Partage')}
      ${share === 'custom' ? `<div class="row mt"><div class="grow"><label class="chip-label" for="exp-pct">Part de celui ou celle qui paie, en %</label><input class="field" id="exp-pct" data-keep name="pct" inputmode="numeric" placeholder="60"></div></div>` : ''}
      ${chipGroup('exp-cat', CATS, 'courses', 'Catégorie')}
      <div class="row mt"><div class="grow"><label class="chip-label" for="exp-date">Date</label>
        <input class="field" id="exp-date" data-keep name="date" type="date" value="${isoDate(new Date())}"></div></div>
      </details>
    </form>
    ${monthHtml || '<p class="empty">Aucune dépense pour l\'instant.</p>'}`;
}

// Nuit : care

function viewNuit() {
  return `<header class="hd row"><div><p class="hd-kicker">Rien que pour vous deux</p><h1>Loisirs</h1></div><button class="azami-btn" data-action="meow" aria-label="Faire miauler Azami">${(S.loisirTab || 'cine') === 'cine' ? azami('v44_cine', 'Azami en lunettes 3D avec son pop-corn') : S.loisirTab === 'carnet' ? azami('v44_collection', 'Azami feuillette son album de cartes') : azami('v44_care', 'Azami tient une enveloppe')}</button></header>
    ${viewCare()}`;
}

// Ciné à deux -----------------------------------------------------------------------------------
// Une liste commune de films et de séries. Les infos (affiche, synopsis, où regarder en Suisse) viennent
// de TMDB par le serveur (fonction « films »), sinon de Wikipédia et TVmaze. Le match à deux : chacun
// glisse à droite ou à gauche sur des propositions ; quand vous avez tous les deux dit oui, c'est un match.
const FILM_DEMO = [
  { tmdb_id: 496243, media: 'movie', title: 'Parasite', year: 2019, poster: null, overview: 'Une famille pauvre s’infiltre peu à peu chez une famille très riche.', runtime: 132, genres: ['Thriller', 'Drame'], director: 'Bong Joon-ho', providers: [{ name: 'Netflix', kind: 'abo' }] },
  { tmdb_id: 4935, media: 'movie', title: 'Le Château ambulant', year: 2004, poster: null, overview: 'Sophie, changée en vieille dame par une sorcière, trouve refuge dans le château du magicien Hauru.', runtime: 119, genres: ['Animation', 'Fantastique'], director: 'Hayao Miyazaki', providers: [{ name: 'Netflix', kind: 'abo' }] },
  { tmdb_id: 1408, media: 'tv', title: 'Twin Peaks', year: 1990, poster: null, overview: 'Un agent du FBI enquête sur la mort de Laura Palmer dans une petite ville étrange.', seasons: 3, genres: ['Mystère', 'Drame'], director: 'David Lynch', providers: [] },
  { tmdb_id: 290098, media: 'movie', title: 'Mademoiselle', year: 2016, poster: null, overview: 'Dans la Corée des années 1930, une servante est engagée auprès d’une riche héritière.', runtime: 145, genres: ['Thriller', 'Romance'], director: 'Park Chan-wook', providers: [{ name: 'Mubi', kind: 'abo' }] },
  { tmdb_id: 95479, media: 'tv', title: 'Jujutsu Kaisen', year: 2020, poster: null, overview: 'Un lycéen avale un doigt maudit et rejoint une école d’exorcistes.', seasons: 2, genres: ['Animation', 'Action'], director: null, providers: [{ name: 'Crunchyroll', kind: 'abo' }] },
  { tmdb_id: 530385, media: 'movie', title: 'Midsommar', year: 2019, poster: null, overview: 'Un couple en crise part en Suède pour une fête du solstice très particulière.', runtime: 148, genres: ['Horreur', 'Drame'], director: 'Ari Aster', providers: [] },
];
// petite démo : des traits inventés mais plausibles, pour essayer le profil de goût sans réseau
FILM_DEMO.forEach((f, i) => { f.gids = [[53, 18], [16, 14], [9648, 18], [53, 10749], [16, 28], [27, 18]][i]; f.lang = ['ko', 'ja', 'en', 'ko', 'ja', 'en'][i]; f.note = [8.5, 8.4, 8.3, 8.1, 8.6, 7.1][i];
  f.traits = { dir: [{ id: 100 + i, name: f.director || 'Quelqu’un' }], cast: [], kw: [{ id: 900 + (i % 3), name: ['class', 'magic', 'dream'][i % 3] }], rt: f.runtime, bo: 'public' };
  f.presse = { mc: 70 + i * 4, mcN: 30, pop: 80 + i * 2, imdb: 7.6 + i / 10, imdbN: 50000, lb: 3.8 + i / 10, lbN: 9000, ...(i === 0 ? { oscar: 1 } : {}) }; });
async function filmsCall(body) {
  if (DEMO) {
    const inList = new Set(myKeys());
    if (body.action === 'status') return { tmdb: true };
    if (body.action === 'search') { const q = norm(body.q || ''); return { results: FILM_DEMO.filter(f => norm(f.title).includes(q)) }; }
    if (body.action === 'details') return FILM_DEMO.find(f => f.tmdb_id === body.tmdb_id) || {};
    if (body.action === 'deck') return { results: FILM_DEMO.filter(f => !inList.has(fkey(f))) };
    if (body.action === 'resolve') return { results: (body.items || []).map(x => FILM_DEMO.find(f => nt(f.title) === nt(x.title)) || null) };
  }
  const { data, error } = await sb.functions.invoke('films', { body });
  if (error) { let msg = error.message; try { const j = await error.context?.json(); if (j?.error) msg = j.error; } catch {} throw new Error(msg); }
  if (data?.error) throw new Error(data.error);
  return data;
}
const fkey = f => `${f.media}:${f.tmdb_id || norm(f.title)}`;
// les sources fines (palmarès, presse titre par titre, tons) : une autre fonction, appelée par petits lots
async function srcCall(body) {
  if (DEMO) return {};
  const { data, error } = await sb.functions.invoke('films-sources', { body });
  if (error) throw new Error(error.message);
  return data || {};
}
// Annuler (Cmd+Z ou le bouton) pour tout ce qu'on fait dans le ciné : on garde l'état d'avant du film.
const FILM_EMPTY = { votes: {}, ratings: {}, seen: {}, coeur: [] };
const filmBefore = (f, keys) => ({ t: 'films', id: f.id, row: Object.fromEntries(keys.map(k => [k, f[k] ?? FILM_EMPTY[k] ?? null])) });
function cineUndo(label, before, cap = [], after) { offerUndo(label, before, cap); if (UNDO) UNDO.after = after; }
const filmRow = f => Object.fromEntries(Object.entries(f).filter(([k]) => !k.startsWith('_')));
// Le goût de chacun, appris de ses avis (voir taste.js). Le calcul est lourd (des centaines de films) : chaque
// profil n'est refait que si les avis de CETTE personne ont changé, et la rareté des traits seulement quand la
// liste a nettement grandi. Pendant Cinder, on garde le goût d'avant et on le remet à jour quand le doigt se repose.
let tasteMemo = null, idfMemo = null;
const VCODE = { oui: 1, super: 2, non: 3, beurk: 4 };
function tasteSigs() {
  const ms = S.members.map(m => m.email), h = ms.map(() => 7);
  let c = 0;
  for (const f of S.films) {
    const d = (f.traits ? 1 : 0) + (f.presse ? 2 : 0) + (f.critiques ? 4 : 0) + (f.tons ? 8 : 0) + (f.palmares ? 16 : 0) + (f.status === 'vu' ? 32 : 0);
    c = (c * 31 + d) | 0;
    for (let i = 0; i < ms.length; i++) {
      const e = ms[i], r = f.ratings?.[e];
      h[i] = (h[i] * 31 + (VCODE[f.votes?.[e]] || 0) * 7 + (r?.note || 0) * 3 + ((f.coeur || []).includes(e) ? 11 : 0) + (f.hesite?.[e]?.ms || 0) % 997 + (f.raisons?.[e]?.length || 0) * 13 + (f.seen?.[e] ? 17 : 0) + d) | 0;
    }
  }
  return Object.fromEntries(ms.map((e, i) => [e, `${h[i]}:${c}:${S.films.length}:${JSON.stringify(gReg(e))}`]));
}
function tastesCompute() {
  const n = S.films.length;
  if (!idfMemo || !tasteMemo || Math.abs(n - idfMemo.n) > Math.max(20, n * .02)) { idfMemo = { n, fn: T.rarity(S.films) }; tasteMemo = null; }
  const idf = idfMemo.fn, sigs = tasteSigs(), old = tasteMemo?.by || {}, by = {};
  for (const m of S.members) {
    const k = sigs[m.email];
    if (old[m.email]?._sig === k) { by[m.email] = old[m.email]; continue; }
    const p = T.profile(S.films, m.email, idf, gReg(m.email)); p.self = m.email === S.me; p.name = nameOf(m.email); p._sig = k; by[m.email] = p;
  }
  const o = other(), csig = o ? `${sigs[S.me]}|${sigs[o]}` : '';
  const couple = !o ? null : tasteMemo?.couple?._sig === csig ? tasteMemo.couple : Object.assign(T.profile(S.films, S.me, idf, {}, f => T.coupleSignal(f, S.me, o)), { _sig: csig });
  const sig = Object.values(sigs).join('|');
  return (tasteMemo = { sig, by, me: by[S.me], other: by[o], couple, at: performance.now() });
}
// lazy : rendre le goût déjà calculé (même un peu ancien) et le refaire plus tard, au calme
function tastes(extra = [], lazy = false) {
  if (lazy && tasteMemo) {
    if (!tastes.soon) tastes.soon = setTimeout(function again() {
      const busy = deck && (performance.now() - (deck.act || 0) < 1200 || deck.drag);
      if (busy) { tastes.soon = setTimeout(again, 700); return; }
      tastes.soon = null;
      (window.requestIdleCallback || (f => setTimeout(f, 1)))(() => tastesCompute(), { timeout: 2000 });
    }, 900);
    return tasteMemo;
  }
  const sigs = tasteSigs(), sig = Object.values(sigs).join('|');
  if (tasteMemo?.sig === sig && idfMemo && Math.abs(S.films.length - idfMemo.n) <= Math.max(20, S.films.length * .02)) return tasteMemo;
  return tastesCompute();
}
const gReg = e => S.goutReg?.[e] || {};
// Ce que quelqu'un a déjà jugé : son avis, son « déjà vu », sa note, ou un film vu ou en cours à deux.
// Un film que seul l'autre connaît reste une découverte possible pour toi.
const judged = (f, e = S.me) => !!(fVotes(f)[e] || f.seen?.[e] || f.ratings?.[e]?.note || f.status === 'vu' || f.status === 'en_cours');
const myKeys = () => S.films.filter(f => judged(f)).map(fkey);
const fSeen = (f, e) => f.status === 'vu' || !!f.seen?.[e];
const fVotes = f => f.votes || {};
const fWanted = f => Object.values(fVotes(f)).some(T.wants);
const fMatch = f => S.members.length >= 2 && S.members.every(m => T.wants(fVotes(f)[m.email]));
const fMeta = f => [f.year, f.media === 'tv' ? (f.seasons ? pl(f.seasons, 'saison', 'saisons') : 'Série') : (f.runtime ? rDur(f.runtime) : 'Film'), (f.genres || []).slice(0, 2).join(', ')].filter(Boolean).join(' · ');
const POSTER_W = { fposter: 'w185', sposter: 'w92', iposter: 'w185', tposter: 'w342' };
const posterSrc = (u, cls) => POSTER_W[cls] ? String(u).replace('/t/p/w342/', `/t/p/${POSTER_W[cls]}/`) : u;
const fPoster = (f, cls = 'fposter') => f.poster ? `<img class="${cls}" src="${esc(posterSrc(f.poster, cls))}" alt="" ${cls === 'fposter' || cls === 'iposter' ? 'loading="lazy"' : ''} decoding="async" referrerpolicy="no-referrer" data-poster>` : `<span class="${cls} noposter" aria-hidden="true">${icn(f.media === 'tv' ? 'tele' : 'film')}</span>`;
const fProv = f => (f.providers || []).filter(p => p.kind !== 'location').slice(0, 3).map(p => p.name);
// Vos abonnements et les salles de Lausanne : où on peut le voir, nous, ce soir.
const SUBS = [['hbo', 'HBO Max', /hbo|^max$/i], ['disney', 'Disney+', /disney/i], ['apple', 'Apple TV+', /apple tv/i], ['crunchyroll', 'Crunchyroll', /crunchyroll/i], ['netflix', 'Netflix', /netflix/i],
  ['prime', 'Prime Video', /amazon prime|prime video/i], ['play', 'Play Suisse', /play suisse/i], ['mubi', 'Mubi', /mubi/i], ['sky', 'Sky', /sky/i], ['canal', 'Canal+', /canal/i]];
const subOf = name => SUBS.find(([, , re]) => re.test(name || ''))?.[0];
const nt = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/^(le|la|les|l|the|a|an|un|une) /, '').trim();
const salleKeys = t => { const s = String(t || '').replace(/\((19|20)\d{2}\)/, ''); return [s, ...s.split(/[()]/)].map(nt).filter(x => x.length > 1); };
function fSalles(f) {
  if (!S.salles?.length || f.media !== 'movie') return [];
  const mine = new Set([nt(f.title), nt(f.original)].filter(Boolean));
  return S.salles.filter(x => salleKeys(x.title).some(k => mine.has(k)) && (!x.year || !f.year || Math.abs(x.year - f.year) <= 1));
}
function fWhere(f) {
  const p = f.providers || [];
  const chez = [...new Set(p.filter(x => x.kind !== 'location' && S.subs.includes(subOf(x.name))).map(x => x.name))];
  const ailleurs = [...new Set(p.filter(x => x.kind !== 'location' && !S.subs.includes(subOf(x.name))).map(x => x.name))];
  const loc = [...new Set(p.filter(x => x.kind === 'location').map(x => x.name))];
  return { chez, ailleurs, loc, salles: fSalles(f) };
}
function fWhereLine(f) {
  const w = fWhere(f);
  if (w.salles.length) { const x = w.salles[0]; return `<span class="fwhere salle">${icn('ticket')} ${esc(x.where === 'Cinémathèque' ? `Cinémathèque, ${x.when || 'bientôt'}` : `${x.where}, ${x.when || 'en ce moment'}`)}</span>`; }
  if (w.chez.length) return `<span class="fwhere chez">✓ Chez vous sur ${esc(w.chez.slice(0, 2).join(', '))}</span>`;
  if (w.loc.length) return `<span class="fwhere">En location sur ${esc(w.loc.slice(0, 2).join(', '))}</span>`;
  if (w.ailleurs.length) return `<span class="fwhere">Sur ${esc(w.ailleurs.slice(0, 2).join(', '))}</span>`;
  return '';
}
const fDispo = f => { const w = fWhere(f); return w.chez.length > 0 || w.salles.length > 0; };
async function loadSalles() {
  if (loadSalles.p) return loadSalles.p;
  try { const c = JSON.parse(safeGet('maison-salles') || 'null'); if (c && Date.now() - c.at < 3 * 3600e3) { S.salles = c.list; return; } } catch {}
  loadSalles.p = (DEMO ? Promise.resolve({ salles: [{ title: 'Parasite', where: 'Cinémathèque', when: 'Ve 6 novembre à 20:30', url: 'https://live.cinematheque.ch/', year: 2019 }, { title: 'Hope', where: 'Pathé Flon', when: 'Aujourd’hui 20:40 VF', url: 'https://search.ch/cine/Lausanne/Pathe-Flon' }] }) : filmsCall({ action: 'salles' }))
    .then(r => { S.salles = r.salles || []; safeSet('maison-salles', JSON.stringify({ at: Date.now(), list: S.salles })); if (S.view === 'nuit' && (S.loisirTab || 'cine') === 'cine' && !document.querySelector('#ticket, #deck') && document.activeElement?.id !== 'cine-q') render(); })
    .catch(e => console.warn('salles', e)).finally(() => { loadSalles.p = null; });
  return loadSalles.p;
}
const fProg = f => f.media === 'tv' && f.status === 'en_cours' ? `S${f.season || 1} · É${f.episode || 1}` : '';
function cineSeeds(n = 4) {
  const all = [...S.films.filter(f => f.tmdb_id && S.members.some(m => T.signal(f, m.email) >= 1.2)).map(f => ({ tmdb_id: f.tmdb_id, media: f.media })),
    ...S.gouts.filter(g => g.seed_tmdb).map(g => ({ tmdb_id: g.seed_tmdb, media: g.seed_media }))];
  return all.sort(() => Math.random() - .5).slice(0, n);
}
function cineLists() {
  const o = other(), recent = (a, b) => String(b.created_at).localeCompare(String(a.created_at));
  const open = S.films.filter(f => f.status === 'a_voir');
  const mine = open.filter(f => T.wants(fVotes(f)[S.me])).sort((a, b) => (fMatch(b) - fMatch(a)) || recent(a, b));
  const theirs = o ? open.filter(f => T.wants(fVotes(f)[o])).sort((a, b) => (fMatch(b) - fMatch(a)) || recent(a, b)) : [];
  const nous = open.filter(fMatch).sort(recent);
  const enCours = S.films.filter(f => f.status === 'en_cours');
  const vus = S.films.filter(f => f.status === 'vu').sort((a, b) => String(b.seen_at || '').localeCompare(String(a.seen_at || '')));
  return { mine, theirs, nous, enCours, vus, aVoir: nous };
}
// Les compromis : dans la liste de l'un, ce que l'autre a de bonnes chances d'aimer ; et ce que l'un a adoré
// et que l'autre n'a jamais vu.
function cineCompromis() {
  const o = other(); if (!o) return [];
  const t = tastes(), L = cineLists(), out = [];
  for (const f of L.mine) if (!fMatch(f) && !fVotes(f)[o] && !fSeen(f, o)) out.push({ f, pour: o, s: T.score(t.other, f), why: 'De ta liste' });
  for (const f of L.theirs) if (!fMatch(f) && !fVotes(f)[S.me] && !fSeen(f, S.me)) out.push({ f, pour: S.me, s: T.score(t.me, f), why: `De la liste de ${nameOf(o)}` });
  for (const f of S.films) {
    if (f.status === 'vu' || fMatch(f)) continue;
    for (const [a, b] of [[S.me, o], [o, S.me]]) if (fSeen(f, a) && !fSeen(f, b) && ((f.ratings?.[a]?.note || 0) >= 4 || (f.coeur || []).includes(a)) && !['non', 'beurk'].includes(fVotes(f)[b]))
      out.push({ f, pour: b, s: T.score(t.by[b], f) + .5, why: `${a === S.me ? 'Tu l’as' : `${nameOf(a)} l’a`} adoré` });
  }
  const seen = new Set();
  return out.sort((a, b) => b.s - a.s).filter(x => !seen.has(x.f.id) && seen.add(x.f.id)).slice(0, 10);
}
function fWhereShort(f) {
  const w = fWhere(f);
  if (w.salles.length) return ['salle', 'Au ciné'];
  if (w.chez.length) return ['chez', w.chez[0].replace(/ Plus$/, '+')];
  if (w.loc.length) return ['loc', 'Location'];
  return null;
}
// L'affiche d'abord : une grille comme à l'entrée d'un cinéma.
function cineTile(f, space = 'moi') {
  const v = fVotes(f), o = other(), w = fWhereShort(f);
  const badge = fMatch(f) ? `<i class="tbadge match" title="Vous en avez envie tous les deux">${icn('deux')}</i>`
    : space === 'autre' ? (v[S.me] === 'beurk' ? '<i class="tbadge dim">Non pour toi</i>' : v[S.me] === 'non' ? '<i class="tbadge dim">Bof pour toi</i>' : fSeen(f, S.me) ? '<i class="tbadge dim">Déjà vu</i>' : '<i class="tbadge ask">Moi aussi ?</i>')
    : space === 'moi' && o && fSeen(f, S.me) ? '<i class="tbadge">Vu · à montrer</i>' : space === 'moi' && toutNeuf(f) ? '<i class="tbadge neuf">Nouveau</i>' : '';
  const sub = [f.year, f.media === 'tv' ? (f.seasons ? pl(f.seasons, 'saison', 'saisons') : 'Série') : (f.traits?.rt || f.runtime) ? rDur(f.traits?.rt || f.runtime) : ''].filter(Boolean).join(' · ');
  const star = S.members.some(m => v[m.email] === 'super') ? `<i class="tstar" title="Très envie">${icn('tres')}</i>` : '';
  return `<li><button type="button" class="ftile" data-action="cine-open" data-id="${f.id}" aria-label="${esc(f.title)}">
    <span class="ftile-p">${fPoster(f, 'tposter')}${badge}${star}${w ? `<i class="twhere ${w[0]}">${esc(w[1])}</i>` : ''}</span>
    <b>${esc(f.title)}</b><small>${esc(sub)}</small></button></li>`;
}
function cineCard(f) {
  const v = fVotes(f), o = other();
  const badge = fMatch(f) ? `<span class="fbadge match">${icn('deux')} Vous deux</span>` : o && T.wants(v[o]) && !v[S.me] ? `<span class="fbadge">Envie de ${esc(nameOf(o))}</span>` : '';
  const prov = fProv(f);
  const rate = f.status === 'vu' ? S.members.filter(m => f.ratings?.[m.email]?.note).map(m => `<span class="frate">${esc(m.email === S.me ? 'Toi' : nameOf(m.email))} ${'♥'.repeat(f.ratings[m.email].note)}</span>`).join('') : '';
  return `<li><div class="fcard" data-action="cine-open" data-id="${f.id}" role="button" tabindex="0">${fPoster(f)}<div class="fbody">
    <b class="ftitle">${esc(f.title)}</b><span class="fmeta">${esc(fMeta(f))}</span>
    ${f.status === 'vu' ? '' : badge + fWhereLine(f)}
    ${f.status === 'vu' ? `<span class="fstub">${f.seen_at ? `Vu le ${esc(fmtDay(f.seen_at))}` : 'Déjà vu'}</span>${rate ? `<span class="frates">${rate}</span>` : `<span class="fmeta">Pas encore noté</span>`}${S.members.filter(m => f.ratings?.[m.email]?.mot).slice(0, 1).map(m => `<i class="fmot">« ${esc(f.ratings[m.email].mot)} »</i>`).join('')}` : ''}
    ${fProg(f) ? `<span class="fprog"><b>${fProg(f)}</b><button type="button" class="btn small" data-action="cine-ep" data-id="${f.id}">+1 épisode</button></span>` : ''}</div></div></li>`;
}
const SPACE_KEY = 'maison-cine-space';
// Filtrer et trier une grille d'affiches ; on n'en montre que 30 à la fois.
const CF = [['', 'Tout'], ['chez', 'Chez vous'], ['court', 'Moins de 2 h']];
const CM = [['', 'Films et séries'], ['film', 'Films'], ['serie', 'Séries']];
const CS = [['envie', 'Envie'], ['recent', 'Récents'], ['note', 'Note'], ['duree', 'Durée']];
function cineFilter(list, who) {
  const fl = S.cineF || '', so = S.cineS || 'envie', t = tastes(), p = who === 'nous' ? null : t.by[who === 'moi' ? S.me : other()];
  const md = S.cineM || '';
  let l = list.filter(f => (!fl || (fl === 'chez' ? fDispo(f) : f.media === 'movie' && (f.traits?.rt || f.runtime || 999) <= 120)) && (!md || (md === 'film' ? f.media === 'movie' : f.media === 'tv')));
  const sc = f => (S.members.some(m => fVotes(f)[m.email] === 'super') ? 5 : 0) + (p ? T.score(p, f, .2) : t.other ? T.scoreBoth(t.me, t.other, f, t.couple, .2) : 0);   // dans vos listes : « vais-je l'aimer ? » compte le plus
  const by = { envie: (a, b) => sc(b) - sc(a), recent: (a, b) => String(b.created_at).localeCompare(String(a.created_at)), note: (a, b) => (b.note || 0) - (a.note || 0), duree: (a, b) => (a.traits?.rt || a.runtime || 999) - (b.traits?.rt || b.runtime || 999) };
  l = [...l].sort(by[so] || by.envie);
  return l;
}
// Ce que je viens d'ajouter (dans Cinder ou ailleurs) : en tête de ma liste pendant deux jours, avec « Nouveau »,
// sinon un film ajouté se perd au milieu des autres (la liste est triée par goût et n'en montre que 30).
const envieAt = f => Date.parse(f.hesite?.[S.me]?.at || (f.added_by === S.me ? f.created_at : '') || 0) || 0;
const toutNeuf = f => Date.now() - envieAt(f) < 2 * 864e5;
function cineGrid(list, who) {
  let l = cineFilter(list, who); const max = S.cineMore === who ? 400 : 30;
  if (who === 'moi' && (S.cineS || 'envie') === 'envie') { const r = l.filter(toutNeuf).sort((a, b) => envieAt(b) - envieAt(a)); l = [...r, ...l.filter(x => !r.includes(x))]; }
  const so = (CS.find(([k]) => k === (S.cineS || 'envie')) || CS[0])[1], md = CM.find(([k]) => k === (S.cineM || ''));
  const bar = list.length > 6 ? `<div class="cine-filt"><div class="cine-seg" role="group" aria-label="Filtrer">${CF.map(([k, lab]) => `<button type="button" data-action="cine-f" data-k="${k}" aria-pressed="${(S.cineF || '') === k}">${lab}</button>`).join('')}</div>
    <button type="button" class="cine-sortb${S.cineM ? ' on' : ''}" data-action="cine-sort" aria-haspopup="menu" aria-label="Afficher et trier : ${esc(S.cineM ? md[1] + ', ' : '')}${esc(so)}"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="16" cy="7" r="2.3" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="10" cy="17" r="2.3" fill="none" stroke="currentColor" stroke-width="2.2"/></svg><span>${esc(S.cineM ? md[1] : so)}</span></button></div>` : '';
  if (!l.length) return bar + '<p class="hint cine-empty">Rien avec ce filtre.</p>';
  return `${bar}<ul class="cine-grid">${l.slice(0, max).map(f => cineTile(f, who)).join('')}</ul>${l.length > max ? `<button class="btn ghost wide cine-more" data-action="cine-more" data-w="${who}">Voir les ${l.length - max} autres</button>` : ''}`;
}
function cineSection() {
  const L = cineLists(), o = other(), on = o ? nameOf(o) : 'l’autre';
  const space = S.cineSpace || safeGet(SPACE_KEY) || 'nous';
  const t = S.cineTab || 'a_voir';
  const res = S.cineRes;
  if (!S.cineIdeasAsked) { cineIdeas(); filmsResolve(); }
  if (!S.salles && !loadSalles.p) loadSalles();
  const pills = [['moi', 'Ma liste', L.mine.length], ['nous', 'À deux', L.nous.length], ['autre', `${on}`, L.theirs.length]];
  let body = '';
  if (space === 'moi') {
    const mt = S.cineMoi || 'envies', vus = mesVus();
    const tabs = `<div class="seg cine-tabs" role="group" aria-label="Ma liste"><button data-action="moi-tab" data-t="envies" aria-pressed="${mt === 'envies'}">Envies${L.mine.length ? ` · ${L.mine.length}` : ''}</button><button data-action="moi-tab" data-t="vus" aria-pressed="${mt === 'vus'}">Mes vus${vus.length ? ` · ${vus.length}` : ''}</button></div>`;
    body = mt === 'vus' ? tabs + mesVusHtml(vus) : `${tabs}${menageBanner()}${L.mine.length ? cineGrid(L.mine, 'moi') : '<p class="hint cine-empty">Ta liste est vide. Cherche un film plus haut, ou lance Cinder : chaque ♥ l’ajoute ici.</p>'}
      ${tasteCard(S.me)}${cineCoeurs(S.me)}${cineIdeasHtml('moi')}${cineGouts()}`;
  } else if (space === 'autre') {
    body = `${L.theirs.length ? `<p class="hint">Touche une affiche : « Moi aussi » et c’est un film pour vous deux.</p>${cineGrid(L.theirs, 'autre')}` : `<p class="hint cine-empty">${esc(on)} n’a encore rien mis dans sa liste.</p>`}
      ${tasteCard(o)}${cineCoeurs(o)}`;
  } else {
    const list = t === 'en_cours' ? L.enCours : t === 'vu' ? L.vus : L.nous;
    const empty = t === 'vu' ? 'Vos films vus à deux arriveront ici, avec vos notes : un vrai journal de vos soirées.' : t === 'en_cours' ? 'Rien en cours. « On le regarde » sur un film ou une série pour la mettre ici.' : `Pas encore de film en commun. Lancez Cinder chacun de votre côté : quand vous dites oui tous les deux, il arrive ici.`;
    body = `<div class="seg cine-tabs" role="group" aria-label="À deux">
      <button data-action="cine-tab" data-t="a_voir" aria-pressed="${t === 'a_voir'}">${icn('deux')} À voir${L.nous.length ? ` · ${L.nous.length}` : ''}</button>
      <button data-action="cine-tab" data-t="en_cours" aria-pressed="${t === 'en_cours'}">En cours${L.enCours.length ? ` · ${L.enCours.length}` : ''}</button>
      <button data-action="cine-tab" data-t="vu" aria-pressed="${t === 'vu'}">Vus${L.vus.length ? ` · ${L.vus.length}` : ''}</button>
      <button data-action="cine-tab" data-t="salles" aria-pressed="${t === 'salles'}">${icn('ticket')} Affiche</button></div>
      ${t === 'salles' ? cineSallesHtml() : !list.length ? `<p class="hint cine-empty">${empty}</p>` : t === 'a_voir' ? cineGrid(list, 'nous') : `${t === 'vu' ? journalStats() : ''}<ul class="cine-list ${t === 'vu' ? 'journal' : ''}">${list.map(cineCard).join('')}</ul>`}
      ${t === 'a_voir' ? compromisHtml() + cineIdeasHtml('nous') : ''}`;
  }
  return `<section class="cine" id="cine">
    <header class="cine-marquee"><span class="bulbs" aria-hidden="true"></span><h2>Ciné à deux</h2>
      <p>${[L.nous.length ? `${L.nous.length} ${icn('deux')} en commun` : '', L.vus.length ? `${L.vus.length} vus ensemble` : ''].filter(Boolean).join(' · ') || 'Votre salle à vous deux'}</p></header>
    <div class="cine-cta"><button class="btn cta-match" data-action="cine-deck">${icn('flamme')} Cinder</button><button class="btn cta-soir" data-action="cine-soir">${icn('de')} Ce soir ?</button></div>
    <button class="cine-inv" data-action="soiree">${icn('groupe')} Soirée avec des invités${S.soireeOn ? ' <b>en cours</b>' : ''}</button>
    <div class="cine-add"><span class="cine-loupe" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M15.5 15.5 L20 20" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg></span><label class="sr" for="cine-q">Ajouter un film ou une série à ta liste</label><input class="field" id="cine-q" type="search" data-keep value="${esc(S.cineQ || '')}" placeholder="Ajouter à ta liste : un film, un lien…" autocomplete="off" enterkeyhint="search">
      <div id="cine-res" class="cine-res">${res ? cineResHtml(res) : ''}</div></div>
    <div class="cine-spaces" role="tablist" aria-label="Listes">${pills.map(([k, l, n]) => `<button role="tab" data-action="cine-space" data-s="${k}" aria-selected="${space === k}" class="${k}"><span>${k === 'nous' ? icn('deux') + ' ' : ''}${esc(l)}</span><b>${n}</b></button>`).join('')}</div>
    ${body}
  </section>`;
}
// Importer Letterboxd : vus, notes, cœurs et watchlist arrivent d'un coup. Les titres sont retrouvés sur TMDB
// par lots, en arrière-plan ; on peut fermer la fenêtre, ça continue.
const lbNote = r => Math.min(5, Math.max(1, Math.round(r)));
function lbMerge(f, lb) {
  const me = S.me, p = {};
  if (lb.seen && !f.seen?.[me]) p.seen = { ...(f.seen || {}), [me]: true };
  if (lb.rating && !f.ratings?.[me]?.note) p.ratings = { ...(f.ratings || {}), [me]: { note: lbNote(lb.rating), lb: lb.rating, ...(lb.at ? { at: lb.at } : {}) } };
  if (lb.liked && !(f.coeur || []).includes(me)) p.coeur = [...(f.coeur || []), me];
  if (lb.want && !fVotes(f)[me]) p.votes = { ...fVotes(f), [me]: 'oui' };
  return p;
}
async function lbImport(file) {
  const box = document.createElement('div'); box.id = 'ticket';
  document.getElementById('ticket')?.remove();
  box.innerHTML = `<div class="ticket-card fsheet lbimp" role="dialog" aria-label="Import Letterboxd"><p class="ticket-title">${icn('import')} Import Letterboxd</p><p class="ticket-sub lb-msg">Lecture du fichier…</p>
    <div class="lb-bar"><span style="width:0%"></span></div><div class="form-actions"><button class="btn ghost" data-action="sheet-close">Fermer</button></div></div>`;
  box.addEventListener('click', e => { if (e.target === box) closeTicket(); });
  document.body.appendChild(box); requestAnimationFrame(() => box.classList.add('on'));
  const msg = t => { const m = document.querySelector('.lbimp .lb-msg'); if (m) m.innerHTML = t; }, bar = x => { const b = document.querySelector('.lbimp .lb-bar span'); if (b) b.style.width = Math.round(x * 100) + '%'; };
  let list;
  try { list = await LB.read(file); } catch (e) { msg(esc(e.message || 'Fichier illisible.')); return; }
  if (!list.length) { msg('Rien trouvé dans ce fichier. Choisis le ZIP de l’export Letterboxd (ou watched.csv, ratings.csv…).'); return; }
  const key = (t, y) => nt(t) + '|' + (y || ''), known = new Map();
  for (const f of S.films) { known.set(key(f.title, f.year), f); if (f.original) known.set(key(f.original, f.year), f); }
  const upd = [], todo = [];
  for (const lb of list) { const f = known.get(key(lb.title, lb.year)); if (f) { const p = lbMerge(f, lb); if (Object.keys(p).length) upd.push([f, p]); } else if (lb.seen || lb.want || lb.liked) todo.push(lb); }
  const stats = { vus: list.filter(x => x.seen).length, notes: list.filter(x => x.rating).length, coeurs: list.filter(x => x.liked).length, envies: list.filter(x => x.want).length };
  msg(`${list.length} films trouvés : ${stats.vus} vus, ${stats.notes} notés, ${stats.coeurs} coups de cœur, ${stats.envies} dans ta watchlist.<br>Azami les retrouve un par un…`);
  for (const [f, p] of upd) { Object.assign(f, p); api.update('films', { id: f.id }, p).catch(() => {}); }
  let done = 0, added = 0, lost = 0; const rows = [];
  const B = 25;
  for (let i = 0; i < todo.length; i += B) {
    const part = todo.slice(i, i + B);
    let res = [];
    try { res = (await filmsCall({ action: 'resolve', lite: true, items: part.map(x => ({ title: x.title, media: 'movie', year: x.year })) })).results || []; } catch (e) { console.warn('lb', e); }
    part.forEach((lb, j) => {
      const d = res[j]; if (!d?.tmdb_id) { lost++; return; }
      const ex = S.films.find(f => f.tmdb_id === d.tmdb_id && f.media === d.media) || rows.find(r => r.tmdb_id === d.tmdb_id && r.media === d.media);
      if (ex) { const p = lbMerge(ex, lb); Object.assign(ex, p); if (ex.id && Object.keys(p).length) api.update('films', { id: ex.id }, p).catch(() => {}); return; }
      const row = { tmdb_id: d.tmdb_id, media: d.media, title: d.title, original: d.original || null, year: d.year || lb.year || null, poster: d.poster || null, overview: d.overview || null,
        gids: d.gids || [], lang: d.lang || null, note: d.note || null, traits: d.traits || null, runtime: d.traits?.rt || null, director: d.traits?.dir?.map(p => p.name).join(', ') || null,
        status: 'a_voir', votes: {}, seen: {}, ratings: {}, coeur: [], providers: [], genres: [], added_by: S.me };
      Object.assign(row, lbMerge(row, lb)); rows.push(row);
    });
    done += part.length; bar(done / todo.length);
    msg(`${done} / ${todo.length} films retrouvés${lost ? ` (${lost} introuvables)` : ''}…`);
    if (rows.length >= 100 || i + B >= todo.length) {
      const chunk = rows.splice(0, rows.length);
      for (let k = 0; k < chunk.length; k += 100) { try { const r = await api.insertMany('films', chunk.slice(k, k + 100)); S.films.push(...r); added += r.length; } catch (e) { console.warn('lb insert', e); } }
    }
  }
  bar(1); tasteMemo = null; S.cineIdeasAsked = false; safeSet('maison-idees', '');
  msg(`C’est fait ! ${added} films ajoutés, ${upd.length} mis à jour${lost ? `, ${lost} introuvables` : ''}. Azami connaît maintenant ${tastes().me?.n || 0} de tes avis.`);
  sfx('done'); haptic('medium'); render();
}
function lbPick() {
  const box = document.createElement('div'); box.id = 'ticket';
  document.getElementById('ticket')?.remove();
  box.innerHTML = `<div class="ticket-card fsheet" role="dialog" aria-label="Import Letterboxd"><p class="ticket-title">${icn('import')} Importer Letterboxd</p>
    <p class="ticket-sub">Sur le site letterboxd.com (pas l’app) : <b>Settings → Data → Export your data</b>. Tu reçois un fichier ZIP : choisis-le ici, tel quel.</p>
    <p class="hint">Tes films vus, tes notes, tes cœurs et ta watchlist arrivent dans ton espace. Rien n’est envoyé ailleurs.</p>
    <div class="form-actions"><button class="btn ghost" data-action="sheet-close">Annuler</button><label class="btn lb-file">Choisir le fichier<input type="file" accept=".zip,.csv,application/zip,text/csv" hidden></label></div></div>`;
  box.addEventListener('click', e => { if (e.target === box) closeTicket(); });
  box.querySelector('input').addEventListener('change', e => { const f = e.target.files?.[0]; if (f) lbImport(f); });
  document.body.appendChild(box); requestAnimationFrame(() => box.classList.add('on'));
}
// Mesurer : le journal des cartes de Cinder (sur ce téléphone) et la précision d'Azami sur tes notes.
function cinderLog(v) { try { const l = JSON.parse(safeGet('maison-cinder-log') || '[]'); l.push([Date.now(), v]); safeSet('maison-cinder-log', JSON.stringify(l.slice(-400))); } catch {} }
function cinderRate() {
  let l = []; try { l = JSON.parse(safeGet('maison-cinder-log') || '[]'); } catch {}
  const rate = a => a.length ? a.filter(([, v]) => v === 'oui' || v === 'super').length / a.length : null;
  const last = l.slice(-50), before = l.slice(-100, -50);
  return l.length >= 15 ? { now: rate(last), before: before.length >= 15 ? rate(before) : null, n: l.length } : null;
}
let accMemo = null;
// Le test de justesse refait cinq profils : c'est le calcul le plus lourd de l'app. On le fait au calme, après
// l'affichage, et la carte se met à jour toute seule.
function tasteAccuracy() {
  const t = tastes(), sig = t.sig;
  if (accMemo?.sig !== sig && !tasteAccuracy.t) tasteAccuracy.t = setTimeout(() => (window.requestIdleCallback || (f => setTimeout(f, 1)))(() => {
    tasteAccuracy.t = null; const t2 = tastes();
    if (accMemo?.sig === t2.sig || !t2.me) return;
    accMemo = { sig: t2.sig, v: T.accuracy(S.films, S.me, t2.me.idf, gReg(S.me)) };
    if (!document.getElementById('deck') && S.view === 'nuit') render();
  }, { timeout: 3000 }), 600);
  return accMemo?.v || null;
}
// Le test de goût : 30 films très différents, pour qu'Azami comprenne vite (vu ou pas, on donne son avis).
const TEST_GOUT = [['Le Parrain', 1972], ['Pulp Fiction', 1994], ['Le Fabuleux Destin d’Amélie Poulain', 2001], ['Le Voyage de Chihiro', 2001], ['Titanic', 1997], ['The Dark Knight', 2008],
  ['La La Land', 2016], ['Parasite', 2019], ['Intouchables', 2011], ['Mad Max: Fury Road', 2015], ['Her', 2013], ['Eternal Sunshine of the Spotless Mind', 2004], ['Les Visiteurs', 1993],
  ['Get Out', 2017], ['The Grand Budapest Hotel', 2014], ['Interstellar', 2014], ['Amour', 2012], ['Barbie', 2023], ['Oppenheimer', 2023], ['Shrek', 2001], ['Mamma Mia!', 2008],
  ['N’oublie jamais', 2004], ['Old Boy', 2003], ['Portrait de la jeune fille en feu', 2019], ['Everything Everywhere All at Once', 2022], ['Joker', 2019], ['Le Silence des agneaux', 1991],
  ['Toy Story', 1995], ['2001 : L’Odyssée de l’espace', 1968], ['Le Diable s’habille en Prada', 2006]];
// Les règles à la main : « plus de ça » ou « jamais ça » sur une personne, un thème, un genre…
function setRule(k, kind, label) {
  const old = JSON.parse(JSON.stringify(gReg(S.me)));
  const r = { boost: { ...(old.boost || {}) }, ban: { ...(old.ban || {}) } };
  label = label || r.boost[k] || r.ban[k] || k;
  delete r.boost[k]; delete r.ban[k];
  if (kind) r[kind][k] = label;
  S.goutReg = { ...(S.goutReg || {}), [S.me]: r }; tasteMemo = null; haptic(1); closeTicket(); render();
  api.upsert('reglages', { cle: 'gout:' + S.me, valeur: r }).catch(() => toast('Pas enregistré.'));
  if (kind) toast(kind === 'ban' ? `Compris : jamais ${label}` : `Compris : plus de ${label}`);
  cineUndo(kind ? `règle « ${label} »` : 'règle retirée', [], [], () => { S.goutReg = { ...(S.goutReg || {}), [S.me]: old }; tasteMemo = null; api.upsert('reglages', { cle: 'gout:' + S.me, valeur: old }).catch(() => {}); render(); });
}
function tasteRule(k, label) {
  const r = gReg(S.me), cur = r.boost?.[k] ? 'boost' : r.ban?.[k] ? 'ban' : '';
  document.getElementById('ticket')?.remove();
  const box = document.createElement('div'); box.id = 'ticket';
  box.innerHTML = `<div class="ticket-card fsheet trule" role="dialog" aria-label="${esc(label)}"><p class="ticket-title">${esc(label)}</p><p class="ticket-sub">Dis à Azami ce que tu en penses. Une règle compte plus que vingt avis.</p>
    <div class="trule-btns"><button class="btn ${cur === 'boost' ? '' : 'ghost'}" data-kind="boost">${icn('plus')} Plus de ça</button><button class="btn ${cur === 'ban' ? '' : 'ghost'}" data-kind="ban">${icn('jamais')} Jamais ça</button></div>
    <div class="form-actions"><button class="link" data-kind="">${cur ? 'Retirer la règle' : 'Laisser Azami décider'}</button></div></div>`;
  box.addEventListener('click', e => { if (e.target === box) { closeTicket(); return; } const b = e.target.closest('[data-kind]'); if (b) setRule(k, b.dataset.kind || null, label); });
  document.body.appendChild(box); requestAnimationFrame(() => box.classList.add('on'));
}
// Prévoir une soirée : un événement dans votre calendrier commun.
function cineCal(id) {
  const f = S.films.find(x => x.id === id); if (!f) return;
  const d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));   // samedi prochain
  document.getElementById('ticket')?.remove();
  const box = document.createElement('div'); box.id = 'ticket';
  box.innerHTML = `<div class="ticket-card fsheet" role="dialog" aria-label="Prévoir une soirée"><p class="ticket-title">${icn('cal')} ${esc(f.title)}</p><p class="ticket-sub">Une soirée ciné dans votre calendrier${S.agenda?.calendar ? ` « ${esc(S.agenda.calendar)} »` : ''}.</p>
    <div class="row cal-row"><input class="field" type="date" id="cc-d" value="${isoDate(d)}" required><input class="field" type="time" id="cc-t" value="20:30" required></div>
    <div class="form-actions"><button class="btn ghost" data-action="sheet-close">Annuler</button><button class="btn" data-c="ok">Ajouter</button></div></div>`;
  box.innerHTML = deNative(box.innerHTML);
  box.addEventListener('click', e => {
    if (e.target === box) { closeTicket(); return; }
    if (!e.target.closest('[data-c]')) return;
    const day = box.querySelector('#cc-d').value, tm = box.querySelector('#cc-t').value || '20:30'; if (!day) return;
    const s0 = new Date(`${day}T${tm}`), dur = (f.runtime || f.traits?.rt || 120) + 15;
    const ev = { title: `Ciné : ${f.title}`, start: s0.toISOString(), end: new Date(s0.getTime() + dur * 60000).toISOString(), allDay: false, notes: `Soirée ciné à deux, depuis Maison.${fWhere(f).chez.length ? ` Sur ${fWhere(f).chez[0]}.` : ''}` };
    closeTicket();
    if (!S.agenda?.configured) { toast('Le calendrier n’est pas encore relié (onglet Maison, Agenda).'); return; }
    runAgenda(() => agendaCall({ action: 'create', event: ev }), `Soirée prévue le ${new Date(s0).toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' })}`).then(ok => ok && haptic('medium'));
  });
  document.body.appendChild(box); pickSync(box); requestAnimationFrame(() => box.classList.add('on'));
}
// ── Soirée avec des invités ──
// Un lien secret (24 h, révocable) que vos amis ouvrent sur leur téléphone, sans compte : ils votent dans un Cinder
// à eux, parmi vos films à deux et des propositions, et voient le classement. Rien d'autre de la maison ne leur
// est accessible : la page soiree.html ne parle qu'à la fonction « soiree », qui vérifie le lien à chaque fois.
// Ce que l'un de vous veut voir seul n'y figure pas (la surprise du match reste entière).
const soireeUrl = j => `${new URL('soiree.html', location.href.split('#')[0]).href}#${j}`;
let soireeDemo = null;
async function soireeCall(body) {
  if (DEMO) {
    if (body.action === 'ouverte') return { soiree: soireeDemo };
    if (body.action === 'couper') { soireeDemo = null; return { ok: true }; }
    if (body.action === 'creer') { const j = [...crypto.getRandomValues(new Uint8Array(43))].map(b => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"[b % 64]).join(""); soireeDemo = { id: '00000000-0000-0000-0000-000000000000', parMoi: true, expires_at: new Date(Date.now() + 864e5).toISOString(), par: nameOf(S.me), n: body.pool.length, classement: [], gens: [] }; return { id: soireeDemo.id, jeton: j, expires_at: soireeDemo.expires_at }; }
  }
  const { data, error } = await sb.functions.invoke('soiree', { body });
  if (error) { let msg = error.message; try { const j = await error.context?.json(); if (j?.error) msg = j.error; } catch {} throw new Error(msg); }
  if (data?.error) throw new Error(data.error);
  return data;
}
// La sélection de la soirée : vos films à deux d'abord (les plus à votre goût commun), puis des propositions que
// vous ne connaissez ni l'un ni l'autre, choisies pour plaire à vous deux.
async function soireePool() {
  const t = tastes([], true), sc = f => (t.me ? T.score(t.me, f) : 0) + (t.other ? T.score(t.other, f) : 0);
  const fiche = (f, liste) => ({ k: `${f.media === 'tv' ? 'tv' : 'movie'}:${f.tmdb_id}`, media: f.media, title: f.title, year: f.year, poster: f.poster || null, overview: f.overview || '', runtime: f.runtime || f.traits?.rt || null,
    genres: (f.genres || []).filter(g => typeof g === 'string').slice(0, 3), dir: f.director || f.traits?.dir?.[0]?.name || '', note: f.note || null, liste });
  const nous = cineLists().nous.filter(f => f.tmdb_id).sort((a, b) => sc(b) - sc(a)).slice(0, 25);
  let sug = [];
  try {
    const pm = t.me ? T.prefs(t.me) : {}, po = t.other ? T.prefs(t.other) : {};
    const prefs = { like: [...new Set([...(pm.like || []).slice(0, 2), ...(po.like || []).slice(0, 2)])], dislike: (pm.dislike || []).filter(g => (po.dislike || []).includes(g)), langs: pm.langs };
    sug = (await filmsCall({ action: 'deck', seeds: cineSeeds(4), mood: '', subs: S.subs, prefs, exclude: S.films.map(fkey) })).results || [];
  } catch (e) { console.warn('soirée', e); }
  const known = new Set(S.films.map(fkey));
  sug = sug.filter(f => f.tmdb_id && !known.has(fkey(f)) && !(t.me && T.banned(t.me, f)) && !(t.other && T.banned(t.other, f))).sort((a, b) => sc(b) - sc(a)).slice(0, Math.max(12, 36 - nous.length));
  return [...nous.map(f => fiche(f, true)), ...sug.map(f => fiche(f, false))];
}
async function soireeSheet() {
  document.getElementById('ticket')?.remove();
  const box = document.createElement('div'); box.id = 'ticket';
  box.innerHTML = '<div class="ticket-card fsheet soiree-sheet" role="dialog" aria-label="Soirée avec des invités"><p class="ticket-sub">Un instant…</p></div>';
  document.body.appendChild(box); requestAnimationFrame(() => box.classList.add('on'));
  const card = box.firstElementChild;
  let s = null;
  const draw = () => {
    S.soireeOn = !!s;
    if (!s) {
      card.innerHTML = `<p class="ticket-title">${icn('groupe')} Soirée avec des invités</p>
        <p class="ticket-sub">Un lien à envoyer à vos amis. Sur leur téléphone, sans compte ni app, ils votent dans Cinder parmi vos films à deux et des propositions pour vous tous, puis voient le classement.</p>
        <ul class="soiree-pts"><li>Ils ne voient rien d’autre de la maison : ni vos listes perso, ni vos notes, ni le reste de l’app.</li><li>Le lien marche 24 h, et vous pouvez le couper à tout moment.</li><li>Leurs votes ne changent rien à vos goûts ni à vos listes.</li></ul>
        <div class="form-actions"><button class="btn ghost" data-action="sheet-close">Annuler</button><button class="btn" data-s="creer">Créer le lien</button></div>`;
      return;
    }
    // la base ne garde pas le lien (seulement son empreinte) : il reste sur le téléphone qui l'a créé
    const loc = (() => { try { return JSON.parse(safeGet('maison-soiree') || 'null'); } catch { return null; } })();
    const jeton = loc?.id === s.id ? loc.jeton : '';
    const url = jeton ? soireeUrl(jeton) : '', fin = new Date(s.expires_at);
    const cl = (s.classement || []).slice(0, 5);
    card.innerHTML = `<p class="ticket-title">${icn('groupe')} Soirée en cours</p>
      <p class="ticket-sub">Lien valable jusqu’à ${esc(fin.toLocaleString('fr-CH', { weekday: 'long', hour: '2-digit', minute: '2-digit' }))}${s.par ? `, créé par ${esc(s.par)}` : ''}. ${s.n} films à départager.</p>
      ${url ? `<div class="soiree-link"><span>${icn('lien')}</span><input class="field" readonly value="${esc(url)}" aria-label="Lien de la soirée"></div>
      <div class="soiree-acts">${navigator.share ? '<button class="btn" data-s="share">Envoyer le lien</button>' : ''}<button class="btn ${navigator.share ? 'ghost' : ''}" data-s="copy">Copier</button><a class="btn ghost" data-s="vote" href="${esc(url)}&n=${encodeURIComponent(nameOf(S.me))}" target="_blank" rel="noopener">Voter moi aussi</a></div>`
        : `<p class="hint">Pour des raisons de sécurité, le lien n’est gardé que sur le téléphone qui l’a créé${s.par ? ` (celui de ${esc(s.par)})` : ''}. Demande-le, ou crée un nouveau lien : l’ancien sera coupé.</p><div class="soiree-acts"><button class="btn ghost" data-s="creer">Nouveau lien</button></div>`}
      <p class="chip-label">Le classement${s.gens?.length ? ` · ${s.gens.length} ${s.gens.length > 1 ? 'votants' : 'votant'}` : ''}</p>
      ${cl.length ? `<ol class="soiree-cl">${cl.map(f => `<li>${f.poster ? `<img src="${esc(f.poster)}" alt="" referrerpolicy="no-referrer">` : `<span class="noposter">${icn('film')}</span>`}<span><b>${esc(f.title)}</b><small>${esc(f.envies.map(e => e.nom + (e.super ? ' ★' : '')).join(', '))}</small></span></li>`).join('')}</ol>` : '<p class="hint">Personne n’a encore voté.</p>'}
      <div class="form-actions"><button class="btn ghost" data-s="maj">Actualiser</button><button class="btn ghost danger-t" data-s="couper">Couper le lien</button></div>`;
  };
  const load = async () => { try { s = (await soireeCall({ action: 'ouverte' })).soiree; draw(); } catch (e) { card.innerHTML = `<p class="ticket-sub">${esc(e.message || 'La soirée ne répond pas.')}</p><div class="form-actions"><button class="btn ghost" data-action="sheet-close">Fermer</button></div>`; } };
  box.addEventListener('click', async e => {
    if (e.target === box) { closeTicket(); return; }
    const b = e.target.closest('[data-s]'); if (!b) return;
    const k = b.dataset.s;
    if (k === 'vote') return;   // le lien s'ouvre dans le navigateur
    if (k === 'creer') {
      b.disabled = true; b.textContent = 'Azami prépare la sélection…';
      try { const pool = await soireePool(); if (pool.length < 2) throw new Error('Il faut au moins deux films dans votre liste à deux, ou TMDB pour proposer des films.'); const r = await soireeCall({ action: 'creer', pool }); safeSet('maison-soiree', JSON.stringify({ id: r.id, jeton: r.jeton })); haptic('medium'); await load(); }
      catch (err) { toast(err.message || 'La soirée n’a pas pu être créée.'); b.disabled = false; b.textContent = 'Créer le lien'; }
      return;
    }
    const lien = card.querySelector('.soiree-link input')?.value || '';
    if (k === 'share') { try { await navigator.share({ title: 'Soirée ciné', text: `${nameOf(S.me)} t’invite à choisir le film de la soirée`, url: lien }); } catch {} return; }
    if (k === 'copy') { try { await navigator.clipboard.writeText(lien); toast('Lien copié'); haptic(1); } catch { card.querySelector('.soiree-link input')?.select(); } return; }
    if (k === 'maj') { haptic(1); await load(); return; }
    if (k === 'couper') {
      if (!(await uiAsk('Les invités ne pourront plus ouvrir la soirée ni voter. Le lien est définitivement coupé.', { title: 'Couper le lien ?', ok: 'Couper', danger: true }))) return;
      try { await soireeCall({ action: 'couper', id: s.id }); s = null; draw(); toast('Lien coupé'); render(); } catch (err) { toast(err.message || 'Ça n’a pas marché.'); }
    }
  });
  await load();
}
// Quelqu'un d'autre a-t-il un avis sur ce film ? (alors il n'est pas à toi seul)
const othersOn = f => S.members.some(m => m.email !== S.me && (fVotes(f)[m.email] || f.ratings?.[m.email] || f.seen?.[m.email] || (f.coeur || []).includes(m.email) || f.pourquoi?.[m.email]));
// Le petit ménage : ce qui attend dans ta liste depuis plus de 6 mois.
const SIX_MOIS = 182 * 864e5;
const oldies = () => S.films.filter(f => f.status === 'a_voir' && T.wants(fVotes(f)[S.me]) && !fMatch(f) && Date.now() - Math.max(Date.parse(f.created_at || 0) || 0, Date.parse(f.garde?.[S.me] || 0) || 0) > SIX_MOIS);
function menageBanner() {
  const l = oldies(); if (l.length < 3) return '';
  return `<button class="menage-ban" data-action="cine-menage"><span>${icn('balai')} ${l.length} films t’attendent depuis plus de 6 mois. Toujours envie ?</span><b aria-hidden="true">›</b></button>`;
}
function menageOpen() {
  const l = oldies().slice(0, 20); if (!l.length) { closeTicket(); render(); return; }
  document.getElementById('ticket')?.remove();
  const box = document.createElement('div'); box.id = 'ticket';
  box.innerHTML = `<div class="ticket-card fsheet menage" role="dialog" aria-label="Toujours envie ?"><p class="ticket-title">Toujours envie ?</p><p class="ticket-sub">Ceux que tu gardes restent tranquilles six mois de plus.</p>
    <ul class="menage-l">${l.map(f => `<li>${fPoster(f, 'sposter')}<span><b>${esc(f.title)}</b><small>${esc([f.year, fMeta(f).split(' · ')[1]].filter(Boolean).join(' · '))}</small></span><button class="btn small" data-m="garde" data-id="${f.id}">Oui</button><button class="btn small ghost" data-m="non" data-id="${f.id}">Plus envie</button></li>`).join('')}</ul>
    <div class="form-actions"><button class="btn ghost" data-action="sheet-close">Fermer</button></div></div>`;
  box.addEventListener('click', e => {
    if (e.target === box) { closeTicket(); render(); return; }
    const b = e.target.closest('[data-m]'); if (!b) return;
    const f = S.films.find(x => x.id === b.dataset.id); if (!f) return;
    const patch = b.dataset.m === 'garde' ? { garde: { ...(f.garde || {}), [S.me]: new Date().toISOString() } } : { votes: { ...fVotes(f), [S.me]: 'non' } };
    Object.assign(f, patch); api.update('films', { id: f.id }, patch).catch(() => {}); haptic(1);
    b.closest('li').remove(); if (!box.querySelector('.menage-l li')) { closeTicket(); render(); }
  });
  document.body.appendChild(box); requestAnimationFrame(() => box.classList.add('on'));
}
// Le journal enrichi : votre bilan à deux.
// Mes vus : tout ce que j'ai vu, seul ou à deux, avec ma note (et celle de l'autre s'il l'a vu aussi).
const vuAt = f => f.ratings?.[S.me]?.at || f.seen_at || f.created_at || '';
const vuDay = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('fr-CH', { day: 'numeric', month: 'short', ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) }); };
function mesVus() { return S.films.filter(f => f.ratings?.[S.me]?.note || f.seen?.[S.me] || f.status === 'vu'); }
const NOTE_L = { 5: 'Adorés', 4: 'Aimés', 3: 'Moyens', 2: 'Pas aimés', 1: 'Détestés', 0: 'Pas encore notés' };
function mesVusHtml(list) {
  if (!list.length) return '<p class="hint cine-empty">Les films que tu as vus arriveront ici avec ta note : dis « Vu » dans Cinder, note un film, ou importe ton Letterboxd.</p>';
  const so = S.vusS || 'note', o = other(), max = S.vusMax || 40;
  const byDate = (a, b) => String(vuAt(b)).localeCompare(String(vuAt(a)));
  const l = [...list].sort(so === 'note' ? (a, b) => ((b.ratings?.[S.me]?.note || 0) - (a.ratings?.[S.me]?.note || 0)) || byDate(a, b) : byDate);
  const hearts = n => `<span class="hearts" aria-label="${n} sur 5">${'♥'.repeat(n)}<i>${'♥'.repeat(5 - n)}</i></span>`;
  const row = f => { const me = f.ratings?.[S.me]?.note || 0, ot = o && f.ratings?.[o]?.note;
    return `<li><button type="button" class="vurow" data-action="cine-open" data-id="${f.id}">${fPoster(f, 'sposter')}<span class="vu-t"><b>${esc(f.title)}</b><small>${esc([f.year, f.status === 'vu' ? 'vu à deux' : '', vuAt(f) ? vuDay(vuAt(f)) : ''].filter(Boolean).join(' · '))}</small></span><span class="vu-n">${me ? hearts(me) : '<small>à noter</small>'}${ot ? `<small>${esc(nameOf(o))} ${'♥'.repeat(ot)}</small>` : ''}</span></button></li>`; };
  let out = '', last = null;
  for (const f of l.slice(0, max)) {
    const n = f.ratings?.[S.me]?.note || 0;
    if (so === 'note' && n !== last) { out += `${last === null ? '' : '</ul>'}<p class="chip-label vu-h">${NOTE_L[n]} <small>${l.filter(x => (x.ratings?.[S.me]?.note || 0) === n).length}</small></p><ul class="vulist">`; last = n; }
    else if (so !== 'note' && last === null) { out += '<ul class="vulist">'; last = 1; }
    out += row(f);
  }
  out += '</ul>';
  const sortb = `<div class="vu-sort" role="group" aria-label="Trier"><button data-action="vus-sort" data-s="note" aria-pressed="${so === 'note'}">Par note</button><button data-action="vus-sort" data-s="date" aria-pressed="${so === 'date'}">Les plus récents</button></div>`;
  return sortb + out + (l.length > max ? `<button class="btn ghost wide cine-more" data-action="vus-more">Voir les ${l.length - max} autres</button>` : '');
}
function journalStats() {
  const vus = S.films.filter(f => f.status === 'vu'); if (vus.length < 3) return '';
  const o = other(), yr = new Date().getFullYear(), cette = vus.filter(f => String(f.seen_at || '').startsWith(String(yr)));
  const moy = e => { const n = vus.map(f => f.ratings?.[e]?.note).filter(Boolean); return n.length ? (n.reduce((a, b) => a + b, 0) / n.length).toFixed(1).replace('.', ',') : null; };
  const count = (get) => { const m = new Map(); for (const f of vus) for (const x of get(f)) m.set(x, (m.get(x) || 0) + 1); return [...m].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([x]) => x); };
  const dirs = count(f => (f.traits?.dir || []).map(p => p.name)), genres = count(f => (f.gids || []).map(g => T.GENRES[g]).filter(Boolean));
  const best = vus.filter(f => S.members.every(m => f.ratings?.[m.email]?.note)).sort((a, b) => S.members.reduce((s, m) => s + b.ratings[m.email].note, 0) - S.members.reduce((s, m) => s + a.ratings[m.email].note, 0))[0];
  const lines = [`<b>${vus.length}</b> films et séries vus ensemble${cette.length ? `, dont <b>${cette.length}</b> en ${yr}` : ''}.`,
    S.members.map(m => moy(m.email) ? `${esc(m.email === S.me ? 'Toi' : nameOf(m.email))} ♥ ${moy(m.email)}` : '').filter(Boolean).join(' · '),
    dirs.length ? `Vos réalisateurs : ${esc(dirs.join(', '))}.` : '', genres.length ? `Vous regardez surtout ${esc(genres.join(', '))}.` : '',
    best ? `Votre meilleure soirée : <b>${esc(best.title)}</b>.` : ''].filter(Boolean);
  return `<div class="jstats">${lines.map(l => `<p>${l}</p>`).join('')}</div>`;
}
// Ce qu'Azami a compris des goûts de quelqu'un : de quoi vérifier, et corriger en donnant plus d'avis.
function tasteCard(email) {
  if (!email) return '';
  const t = tastes(), p = t.by[email]; if (!p) return '';
  const self = email === S.me, who = self ? 'tes' : `les goûts de ${esc(nameOf(email))}`;
  const tools = self ? `<div class="taste-tools"><button class="btn small" data-action="taste-test">${icn('fiole')} Test de goût</button><button class="btn small ghost" data-action="lb-import">${icn('import')} Importer Letterboxd</button></div>` : '';
  if (p.n < 3) return `<div class="taste"><p class="taste-t">${self ? 'Azami apprend tes goûts' : `Azami ne connaît pas encore ${who}`}</p><p class="hint">Chaque avis compte : ♥ ou ✕ dans Cinder, une note sur un film déjà vu, un coup de cœur. Le plus rapide : le test de goût (2 minutes) ou ton export Letterboxd.</p>${tools}</div>`;
  const top = T.top(p, S.films), reg = gReg(email);
  const chips = (l, cls = '') => l.map(r => self ? `<button type="button" class="tchip ${cls}${reg.boost?.[r[0]] ? ' boost' : ''}" data-action="taste-rule" data-k="${esc(r[0])}" data-l="${esc(r[2])}">${esc(r[2])}</button>` : `<span class="tchip ${cls}">${esc(r[2])}</span>`).join('');
  const rules = [...Object.entries(reg.boost || {}).map(([k, l]) => [k, l, 'boost']), ...Object.entries(reg.ban || {}).map(([k, l]) => [k, l, 'ban'])];
  const lvl = p.n < 15 ? 'débute' : p.n < 40 ? 'commence à bien connaître' : p.n < 100 ? 'connaît bien' : 'connaît par cœur';
  return `<div class="taste"><p class="taste-t">Azami ${lvl} ${self ? 'tes goûts' : `les goûts de ${esc(nameOf(email))}`} <small>${p.n} avis</small></p>
    ${top.people.length ? `<p class="taste-k">Côté équipes</p><div class="tchips">${chips(top.people)}</div>` : ''}
    ${top.themes.length || top.genres.length || top.langs.length ? `<p class="taste-k">Ce qui ${self ? 'te' : 'lui'} plaît</p><div class="tchips">${chips([...top.genres, ...top.langs, ...top.themes].slice(0, 8))}</div>` : ''}
    ${p.src && p.src !== 'tmdb' && p.corr > .2 ? `<p class="taste-k">${self ? 'Ton' : 'Son'} public le plus proche</p><p class="taste-pub">${({ lb: 'Les cinéphiles de Letterboxd', imdb: 'Le grand public d’IMDb', presse: 'La presse (Metacritic, Rotten Tomatoes)', public: 'Les spectateurs de Rotten Tomatoes' })[p.src]} <small>Entre la presse, le grand public et les cinéphiles, c’est leur avis qui ressemble le plus ${self ? 'au tien' : 'au sien'}.</small></p>` : ''}
    ${(() => { const tw = T.twins(p), hi = tw.filter(([, c]) => c.adj > .22).slice(0, 4), lo = tw.filter(([, c]) => c.adj < .08 && c.n >= 30).slice(-2).reverse(); return hi.length ? `<p class="taste-k">${self ? 'Tes' : 'Ses'} jumeaux critiques</p><div class="tchips">${hi.map(([o]) => `<span class="tchip">${esc(o)}</span>`).join('')}</div>${lo.length ? `<p class="hint taste-lo">Moins proches : ${lo.map(([o]) => esc(o)).join(', ')}</p>` : ''}` : ''; })()}
    ${top.dislikes.length ? `<p class="taste-k">Moins ${self ? 'ton' : 'son'} truc</p><div class="tchips">${chips(top.dislikes, 'no')}</div>` : ''}
    ${rules.length ? `<p class="taste-k">${self ? 'Tes règles' : 'Ses règles'}</p><div class="tchips">${rules.map(([k, l, kind]) => `<span class="tchip rule ${kind}">${kind === 'ban' ? 'Jamais' : 'Plus de'} ${esc(l)}${self ? `<button type="button" data-action="taste-rule-del" data-k="${esc(k)}" aria-label="Retirer la règle">×</button>` : ''}</span>`).join('')}</div>` : ''}
    ${self ? (() => { const a = tasteAccuracy(), c = cinderRate(); return a || c ? `<div class="taste-meter">${a ? `<p><b>${Math.round(a.acc * 100)} %</b> Azami devine l’ordre de tes notes dans ${Math.round(a.acc * 100)} % des cas, testé sur ${a.n} films notés (50 % = au hasard).</p>` : ''}${c ? `<p><b>${Math.round(c.now * 100)} %</b> d’envie sur tes dernières cartes Cinder${c.before != null ? ` (${Math.round(c.before * 100)} % juste avant${c.now > c.before + .03 ? ', ça s’améliore' : ''})` : ''}.</p>` : ''}</div>` : ''; })() : ''}
    ${self ? '<p class="hint taste-tip">Touche une pastille pour dire « plus de ça » ou « jamais ça ».</p>' : ''}${tools}</div>`;
}
function compromisHtml() {
  const c = cineCompromis(); if (!c.length) return '';
  return `<p class="chip-label">Les compromis d’Azami</p><p class="hint">Pris dans vos listes ou vos films adorés, avec de bonnes chances de plaire à l’autre.</p>
    <div class="cine-ideas">${c.map(x => `<button type="button" class="idea" data-action="cine-open" data-id="${x.f.id}">${fPoster(x.f, 'iposter')}<span>${esc(x.f.title)}</span><small class="ichez">${x.pour === S.me ? 'pour toi' : `pour ${esc(nameOf(x.pour))}`}</small><small class="iwhy">${esc(x.why)}</small></button>`).join('')}</div>`;
}
function cineIdeasHtml(space) {
  if (!S.cineIdeas?.length) return '';
  const t = tastes(S.cineIdeas);
  const list = [...S.cineIdeas].map(f => ({ f, s: space === 'nous' && t.other ? T.scoreBoth(t.me, t.other, f, t.couple) : T.score(t.me, f) })).sort((a, b) => b.s - a.s).slice(0, 10);
  return `<div class="chip-row"><p class="chip-label">${space === 'nous' ? 'Les idées d’Azami pour vous deux' : 'Les idées d’Azami pour toi'}</p><button class="link small" data-action="cine-ideas-more" aria-label="D’autres idées">↻ D’autres</button></div>
    <div class="cine-ideas">${list.map(({ f }) => `<button type="button" class="idea" data-action="cine-idea" data-i="${S.cineIdeas.indexOf(f)}">${fPoster(f, 'iposter')}<span>${esc(f.title)}</span>${f.dispo ? '<small class="ichez">✓ chez vous</small>' : f.cinema ? `<small class="ichez">${icn('ticket')} au ciné</small>` : ''}${T.why(t.me, f, 1)[0] ? `<small class="iwhy">${esc(T.why(t.me, f, 1)[0])}</small>` : ''}<b aria-hidden="true">+</b></button>`).join('')}</div>`;
}
// À l'affiche à Lausanne : Pathé aujourd'hui, Cinémathèque les prochaines semaines.
function cineSallesHtml() {
  if (!S.salles) return '<p class="hint cine-empty">Azami regarde le programme des salles…</p>';
  if (!S.salles.length) return '<p class="hint cine-empty">Le programme des salles ne répond pas pour l’instant.</p>';
  // ce que l'app sait de chaque film à l'affiche : dans une liste, vu, ou juste un « bof » passé dans Cinder
  const known = new Map(); for (const f of S.films) for (const x of fSalles(f)) known.set(x, f);
  const o = other();
  const state = f => { const v = fVotes(f);
    if (f.status === 'vu' || fSeen(f, S.me)) return ['Vu', 'dim'];
    if (fMatch(f)) return ['Vous deux', 'hot'];
    if (f.status === 'en_cours') return ['En cours', 'hot'];
    if (T.wants(v[S.me])) return ['Dans ta liste', 'hot'];
    if (o && T.wants(v[o])) return [`Envie de ${nameOf(o)}`, 'hot'];
    if (v[S.me] === 'beurk') return ['Non pour toi', 'dim'];
    if (v[S.me] === 'non') return ['Bof pour toi', 'dim'];
    return null; };
  const have = new Map([...known].filter(([, f]) => state(f)?.[1] === 'hot'));
  const row = (x) => { const i = S.salles.indexOf(x), f = known.get(x), st = f && state(f);
    return `<li class="srow"><a href="${esc(x.url)}" target="_blank" rel="noopener"><b>${esc(x.title)}</b><span>${esc(x.when || '')}</span></a>${st ? `<button class="btn small ghost ${st[1] === 'dim' ? 'sdim' : ''}" data-action="cine-open" data-id="${f.id}">${esc(st[0])}</button>` : `<button class="btn small" data-action="salle-add" data-i="${i}" aria-label="Ajouter ${esc(x.title)}">+</button>`}</li>`; };
  const groups = ['Pathé Flon', 'Pathé Les Galeries', 'Cinémathèque'].map(w => [w, S.salles.filter(x => x.where === w)]).filter(([, l]) => l.length);
  const inList = S.salles.filter(x => have.has(x));
  return `${inList.length ? `<p class="chip-label">De votre liste, à l’affiche</p><ul class="srows hot">${inList.map(row).join('')}</ul>` : ''}
    ${groups.map(([w, l]) => `<details class="fold sgroup" data-fold="salle-${esc(w)}" ${w !== 'Cinémathèque' ? 'open' : ''}><summary>${esc(w)}${w === 'Cinémathèque' ? ' · prochaines séances' : ' · aujourd’hui'} <small>(${l.length})</small></summary>
      <ul class="srows">${(w === 'Cinémathèque' ? [...l].sort((a, b) => String(a.next).localeCompare(String(b.next))) : l).map(row).join('')}</ul></details>`).join('')}
    <p class="hint">Séances de search.ch et de la Cinémathèque suisse, mises à jour toutes les 3 h. Touche un titre pour voir les horaires et réserver.</p>`;
}
// Les coups de cœur de chacun : ce qu'on a adoré (seul ou avant), à faire découvrir à l'autre.
function cineCoeurs(only) {
  const rows = S.members.filter(m => !only || m.email === only).map(m => [m.email, S.films.filter(f => (f.coeur || []).includes(m.email))]).filter(([, l]) => l.length);
  if (!rows.length) return '';
  return rows.map(([e, l]) => `<p class="chip-label">${e === S.me ? 'Tes coups de cœur' : `Les coups de cœur de ${esc(nameOf(e))}`}</p>
    <div class="cine-ideas">${l.map(f => `<button type="button" class="idea" data-action="cine-open" data-id="${f.id}">${fPoster(f, 'iposter')}<span>${esc(f.title)}</span>${f.status === 'favori' && e !== S.me ? '<b aria-hidden="true">?</b>' : ''}</button>`).join('')}</div>`).join('');
}
const GOUT_KIND = { livre: `${icn('livres')} Livres et BD`, jeu: `${icn('manette')} Jeux vidéo`, autre: `${icn('etincelle')} Autres` };
function cineGouts() {
  const mine = S.gouts.filter(g => g.email === S.me), theirs = S.gouts.filter(g => g.email !== S.me);
  const chips = l => Object.keys(GOUT_KIND).filter(k => l.some(g => g.kind === k)).map(k => `<p class="gout-k">${GOUT_KIND[k]}</p><div class="gout-chips">${l.filter(g => g.kind === k).map(g => `<span class="gout">${esc(g.title)}${g.author ? ` <small>${esc(g.author)}</small>` : ''}${g.email === S.me ? `<button type="button" data-action="gout-del" data-id="${g.id}" aria-label="Retirer ${esc(g.title)}">×</button>` : ''}</span>`).join('')}</div>`).join('');
  return `<details class="fold gouts" data-fold="gouts"><summary>Vos abonnements et vos goûts</summary>
    <p class="chip-label">Vos abonnements</p><div class="chips subs">${SUBS.map(([k, l]) => `<button type="button" data-action="sub-toggle" data-k="${k}" aria-pressed="${S.subs.includes(k)}">${esc(l)}</button>`).join('')}</div>
    <p class="hint">Ce qui est inclus chez vous passe en premier dans le match, et « Dispo chez nous » dans la roulette.</p>
    <p class="chip-label">Vos goûts</p>
    <p class="hint">Ce que vous aimez en dehors des films. Quand un livre ou un jeu a été adapté, Azami s’en sert pour ses idées.</p>
    ${mine.length ? `<p class="chip-label">Toi</p>${chips(mine)}` : ''}${theirs.length ? `<p class="chip-label">${esc(nameOf(other()))}</p>${chips(theirs)}` : ''}
    <div class="chips mini gout-kinds" role="group" aria-label="Type">${Object.entries(GOUT_KIND).map(([k, l]) => `<button type="button" data-action="gout-kind" data-k="${k}" aria-pressed="${(S.goutKind || 'livre') === k}">${l}</button>`).join('')}</div>
    <div class="gout-add">
      <input class="field" id="gout-t" placeholder="Un livre, un jeu que tu adores…" autocomplete="off"><button class="btn small" data-action="gout-add">Ajouter</button></div></details>`;
}
function cineResHtml(res) {
  if (res === 'load') return '<p class="hint">Azami cherche…</p>';
  if (typeof res === 'string') return `<p class="hint">${esc(res)}</p>`;
  if (!res.length) return '<p class="hint">Rien trouvé. Essaie le titre original, ou colle un lien IMDb ou Letterboxd.</p>';
  const o = other(), st = f => { const x = S.films.find(y => fkey(y) === fkey(f)); if (!x) return '';
    const v = fVotes(x)[S.me]; return T.wants(v) ? 'déjà dans ta liste' : x.status === 'vu' ? 'vu ensemble' : x.status === 'en_cours' ? 'en cours' : x.seen?.[S.me] ? 'déjà vu' : o && T.wants(fVotes(x)[o]) ? `dans la liste de ${nameOf(o)}` : ''; };
  const mine = f => { const x = S.films.find(y => fkey(y) === fkey(f)); return x && (T.wants(fVotes(x)[S.me]) || x.status === 'vu' || x.status === 'en_cours'); };
  return `<ul class="cine-found">${res.map((f, i) => `<li><button type="button" data-action="cine-pick" data-i="${i}" ${mine(f) ? 'disabled' : ''}>${fPoster(f, 'sposter')}<span><b>${esc(f.title)}</b><small>${esc([f.year, f.media === 'tv' ? 'Série' : 'Film'].filter(Boolean).join(' · '))}${st(f) ? ` · ${esc(st(f))}` : ''}</small></span></button></li>`).join('')}</ul>`;
}
let cineT = null, cineSeq = 0;
function cineSearch(q) {
  S.cineQ = q; clearTimeout(cineT);
  const box = () => document.getElementById('cine-res');
  if (q.trim().length < 2) { S.cineRes = null; if (box()) box().innerHTML = ''; return; }
  cineT = setTimeout(async () => {
    const n = ++cineSeq; S.cineRes = 'load'; if (box()) box().innerHTML = cineResHtml('load');
    try { const r = await filmsCall({ action: 'search', q }); if (n !== cineSeq) return; S.cineRes = r.results || []; }
    catch (e) { if (n !== cineSeq) return; S.cineRes = 'La recherche ne marche pas pour l’instant. Réessaie dans un moment.'; console.warn('films', e); }
    if (box()) box().innerHTML = cineResHtml(S.cineRes);
  }, 380);
}
// Ajouter (ou voter) : on va chercher les détails (durée, où regarder, bande-annonce) une fois pour toutes.
async function filmEnrich(f) {
  if (!f.tmdb_id || f.media === undefined) return f;
  try { const d = await filmsCall({ action: 'details', tmdb_id: f.tmdb_id, media: f.media }); return { ...f, ...Object.fromEntries(Object.entries(d).filter(([k, v]) => v != null && [...(f.id ? [] : ['title']), 'original', 'year', 'poster', 'overview', 'runtime', 'seasons', 'genres', 'director', 'providers', 'trailer', 'gids', 'lang', 'note', 'traits', 'presse'].includes(k))) }; }
  catch { return f; }
}
// Un avis sur un film (envie, bof, ou déjà vu avec une note). Le film entre dans la base s'il n'y est pas :
// même un « bof » sert, il apprend à Azami ce qu'on n'aime pas.
async function filmVote(item, vote, enrich = true, seenNote = 0, meta = null) {
  const k = fkey(item), ex = S.films.find(f => fkey(f) === k);
  const label = `${item.title} : ${seenNote ? 'noté' : vote === 'oui' ? 'envie' : vote === 'super' ? 'très envie' : vote === 'beurk' ? 'non' : 'bof'}`;
  if (ex) {
    const back = filmBefore(ex, ['votes', 'seen', 'ratings']);
    const patch = vote ? { votes: { ...fVotes(ex), [S.me]: vote } } : {};
    if (meta) patch.hesite = { ...(ex.hesite || {}), [S.me]: meta };
    if (seenNote) { patch.seen = { ...(ex.seen || {}), [S.me]: true }; patch.ratings = { ...(ex.ratings || {}), [S.me]: { ...(ex.ratings?.[S.me] || {}), note: seenNote } }; }
    if (!ex.traits && item.traits) Object.assign(patch, { traits: item.traits, gids: item.gids || ex.gids || [], lang: item.lang || ex.lang, note: item.note || ex.note });
    if (!ex.presse && item.presse) patch.presse = item.presse;
    Object.assign(ex, patch); await api.update('films', { id: ex.id }, patch);
    filmVote.undo = [label, [back], []]; (filmVote.undoFor ||= new Map()).set(k, filmVote.undo);
    return ex;
  }
  const full = enrich ? await filmEnrich(item) : item;
  const row = { tmdb_id: full.tmdb_id || null, media: full.media === 'tv' ? 'tv' : 'movie', title: full.title, year: full.year || null, poster: full.poster || null, overview: full.overview || null,
    runtime: full.runtime || null, seasons: full.seasons || null, genres: full.genres || [], director: full.director || null, providers: full.providers || [], trailer: full.trailer || null, votes: vote ? { [S.me]: vote } : {}, status: 'a_voir', coeur: [], original: full.original || null, added_by: S.me,
    gids: full.gids || [], lang: full.lang || null, note: full.note || null, traits: full.traits || null, presse: full.presse || null, hesite: meta ? { [S.me]: meta } : null, seen: seenNote ? { [S.me]: true } : {}, ratings: seenNote ? { [S.me]: { note: seenNote } } : {} };
  const r = await api.insert('films', row);
  const saved = { ...row, ...(r || {}), status: 'a_voir', created_at: new Date().toISOString() };
  S.films.push(saved); filmVote.undo = [label, [], saved.id ? [['films', saved.id]] : []]; (filmVote.undoFor ||= new Map()).set(k, filmVote.undo); return saved;
}
function filmMatchParty(f, host) {
  sfx('big'); haptic('heavy'); setTimeout(() => meow(true, .45, 'chirp'), 400);
  const el = document.createElement('div'); el.className = 'fmatch';
  el.innerHTML = `<div class="fmatch-card">${fPoster(f, 'mposter')}<p class="fmatch-t">${icn('deux', 'big')} C’est un match !</p><p>Vous avez tous les deux envie de voir <b>${esc(f.title)}</b>.</p><button class="btn" data-x="1">Trop bien</button></div>`;
  (host || document.body).appendChild(el); burst('confetti', el.querySelector('.fmatch-card'), 36);
  el.addEventListener('click', e => { if (e.target.closest('[data-x]') || e.target === el) el.remove(); });
}
// Cinder : le Tinder du canapé. Une pile de cartes : à droite j'ai envie, à gauche bof, en haut déjà vu (avec
// une note). Chaque geste apprend quelque chose à Azami. Quand vous dites oui tous les deux, c'est un match.
let deck = null;
// Faux temps de réflexion : si tu n'étais plus sur ton téléphone (app en arrière-plan, ou aucun geste pendant un long
// moment), le temps de décision ne veut rien dire et n'est pas compté.
['pointerdown', 'pointermove', 'touchstart', 'keydown', 'wheel'].forEach(ev => document.addEventListener(ev, () => { if (!deck) return; const t = performance.now(); deck.gap = Math.max(deck.gap || 0, t - (deck.act || t)); deck.act = t; }, { passive: true, capture: true }));
document.addEventListener('scroll', () => { if (deck) deck.act = performance.now(); }, { passive: true, capture: true });
document.addEventListener('visibilitychange', () => { if (deck && document.hidden) deck.away = true; });
// Les cartes déjà passées sous tes yeux (même sans vote) ne reviennent pas avant trois semaines.
const shownKey = () => 'maison-cine-vus-' + (S.me || '');
function shownGet() { try { const o = JSON.parse(safeGet(shownKey()) || '{}'), lim = Date.now() - 21 * 864e5; for (const k in o) if (o[k] < lim) delete o[k]; return o; } catch { return {}; } }
function shownAdd(f) { const o = shownGet(); o[fkey(f)] = Date.now(); const ks = Object.keys(o); if (ks.length > 900) ks.sort((a, b) => o[a] - o[b]).slice(0, ks.length - 900).forEach(k => delete o[k]); safeSet(shownKey(), JSON.stringify(o)); }
const MOODS = [['', 'Tout'], ['pepites', `${icn('pepite')} Pépites`], ['classiques', 'Classiques'], ['nouveautes', 'Nouveautés'], ['court', 'Moins de 2 h'], ['cine', 'Au ciné'], ['leger', 'Léger'], ['frisson', 'Frisson'], ['romance', 'Romance'], ['animation', 'Animation'], ['sf', 'SF'], ['docu', 'Docu']];
async function deckOpen(mood = '') {
  document.getElementById('deck')?.remove();
  stopPropSounds(); lastHdScene = null;
  const box = document.createElement('div'); box.id = 'deck';
  box.innerHTML = `<div class="deck-top"><button class="link" data-d="close">Fermer</button><b class="cinder-logo">${icn('flamme')} Cinder</b><span class="deck-n"></span></div>
    <div class="deck-moods">${MOODS.map(([k, l]) => `<button data-mood="${k}" aria-pressed="${mood === k}">${l}</button>`).join('')}</div>
    <div class="deck-stack"><p class="hint">Azami mélange les cartes…</p></div>
    <div class="deck-btns"><button class="deck-no" data-d="beurk" aria-label="Non, je n’aime pas">${icn('non')}<small>Non !</small></button><button class="deck-bof" data-d="non" aria-label="Bof, pas intéressé">${icn('bof')}<small>Bof</small></button><button class="deck-seen" data-d="vu" aria-label="Déjà vu">${icn('vu')}<small>Vu</small></button><button class="deck-super" data-d="super" aria-label="Très envie">${icn('tres')}<small>Très</small></button><button class="deck-yes" data-d="oui" aria-label="J'ai envie">${icn('envie')}<small>Envie</small></button></div>
    <p class="deck-hint">→ envie · ← bof · ↓ non, j’aime pas · ↑ déjà vu</p>`;
  document.body.appendChild(box); requestAnimationFrame(() => box.classList.add('on')); haptic(1);
  box.addEventListener('click', e => {
    const n = e.target.closest('[data-note]'); if (n) { deckSeen(Number(n.dataset.note)); return; }
    const b = e.target.closest('[data-d], [data-mood]'); if (!b) return;
    if (b.dataset.mood !== undefined) { deckOpen(b.dataset.mood); return; }
    if (b.dataset.d === 'info') { deckInfo(); return; }
    if (b.dataset.d === 'info-close') { deckInfoClose(); return; }
    if (b.dataset.d === 'trailer') { deckTrailer(b); return; }
    deckInfoClose(true);
    if (b.dataset.d === 'close') { box.classList.remove('on'); setTimeout(() => { box.remove(); lastHdScene = null; render(); }, 250); return; }
    if (b.dataset.d === 'vu') { deckAskSeen(); return; }
    if (b.dataset.d !== 'skip') cinderLog(b.dataset.d);
    if (b.dataset.d === 'skip') { deck.asking = false; deckDraw(); return; }
    deckVote(b.dataset.d);
  });
  deck = { cards: [], i: 0, box, mood, keys: new Set(), loading: false };
  if (mood === 'test') box.querySelector('.deck-hint').textContent = 'Test de goût : vu ou pas, dis ce que tu en penses. Une trentaine de films, très différents.';
  await deckMore(true);
  deckDraw();
}
// Remplir la pile : d'abord ce que l'autre a envie de voir (sans le dire), puis les propositions, classées
// par le goût (le tien, et celui de l'autre pour viser les matchs), avec un peu de hasard pour apprendre.
async function deckMore(first = false) {
  if (!deck || deck.loading) return; deck.loading = true;
  if (deck.mood === 'test') {
    const have = new Set(S.films.filter(f => fVotes(f)[S.me] || f.ratings?.[S.me] || fSeen(f, S.me)).map(f => nt(f.title)));
    const items = TEST_GOUT.filter(([t]) => !have.has(nt(t)));
    let res = [];
    try { res = DEMO ? FILM_DEMO : (await filmsCall({ action: 'resolve', lite: true, items: items.map(([title, year]) => ({ title, media: 'movie', year })) })).results || []; } catch (e) { console.warn('test', e); }
    const cards = res.filter(f => f?.tmdb_id && !deck.keys.has(fkey(f)) && !S.films.some(x => fkey(x) === fkey(f) && (fVotes(x)[S.me] || x.ratings?.[S.me])));
    for (const f of cards) deck.keys.add(fkey(f));
    deck.cards.push(...cards); deck.mood = ''; deck.loading = false; deck.test = cards.length;
    return;
  }
  const o = other(), t0 = tastes([], true);
  // ce que l'autre veut voir (surtout « très envie ») ou a vu et aimé, et que tu n'as pas encore jugé : prioritaire, mais
  // pas systématique, et sans le dire (la surprise du match)
  if (!deck.prio) { const vus = shownGet(); deck.prio = o ? S.films.filter(f => !judged(f) && !vus[fkey(f)] && !deck.keys.has(fkey(f)) && (T.wants(fVotes(f)[o]) && f.status === 'a_voir' || (f.ratings?.[o]?.note || 0) >= 4 || (f.coeur || []).includes(o))) : []; }
  const pending = deck.prio.filter(f => !deck.keys.has(fkey(f)) && !judged(f));
  const pm = t0.me ? T.prefs(t0.me) : {}, po = t0.other ? T.prefs(t0.other) : {};
  const prefs = { like: [...new Set([...(pm.like || []), ...(po.like || []).slice(0, 1)])], dislike: (pm.dislike || []).filter(g => !(po.like || []).includes(g)), langs: pm.langs, people: [...(pm.people || []).slice(0, 3), ...(po.people || []).slice(0, 1)], kws: pm.kws, cos: pm.cos };
  let more = [];
  const shown = shownGet(), recent = Object.keys(shown).sort((a, b) => shown[b] - shown[a]).slice(0, 400);
  try { more = (await filmsCall({ action: 'deck', seeds: cineSeeds(4), mood: deck.mood, subs: S.subs, prefs, exclude: [...myKeys(), ...deck.keys, ...recent] })).results || []; } catch (e) { console.warn('deck', e); }
  more = more.filter(f => !shown[fkey(f)]);
  // si l'autre connaît déjà ce film, on reprend sa fiche complète (traits, plateformes) ; s'il est déjà jugé par toi, on l'écarte
  more = more.filter(f => !deck.keys.has(fkey(f))).map(f => S.films.find(x => fkey(x) === fkey(f)) || f).filter(f => !judged(f));
  const t = tastes(more, true);
  const sc = f => t.other && t.other.n >= 5 ? T.score(t.me, f) * .7 + T.score(t.other, f) * .3 : T.score(t.me, f);
  const ordered = T.order(more.filter(f => !T.banned(t.me, f)), sc);
  const pw = f => { const v = fVotes(f)[o], r = f.ratings?.[o]?.note || 0; return (v === 'super' ? 3 : T.wants(v) ? 2 : (f.coeur || []).includes(o) || r >= 5 ? 1.8 : 1.2) * Math.exp(Math.max(-1.5, Math.min(1.5, T.score(t.me, f) / 3))) * (.7 + Math.random() * .6); };
  const ps = pending.map(f => [f, pw(f)]).sort((x, y) => y[1] - x[1]).map(x => x[0]);
  // les films de l'autre passent en priorité, mais au hasard (environ une carte sur trois, jamais deux d'affilée) ;
  // le reste attend la pioche suivante
  const mix = [];
  while (ordered.length) { const last = mix[mix.length - 1]; if (ps.length && !ps.includes(last) && Math.random() < .34) mix.push(ps.shift()); else mix.push(ordered.shift()); }
  if (!mix.length && ps.length) mix.push(...ps.splice(0, 6));
  // la seconde chance : un film sur lequel tu avais hésité (Bof lent, ou fiche ouverte), il y a plus de deux mois et
  // demi, revient une fois, glissé de temps en temps parmi les nouvelles cartes
  if (first && !deck.mood) {
    const th = t.me?.st?.th, now = Date.now(), vus = shownGet();
    const again = S.films.filter(f => fVotes(f)[S.me] === 'non' && !fSeen(f, S.me) && !f.ratings?.[S.me] && f.hesite?.[S.me] && !f.hesite[S.me].relance && T.tempo(f.hesite[S.me], th) === 'hesite'
      && now - Date.parse(f.hesite[S.me].at || f.created_at || 0) > 75 * 864e5 && !deck.keys.has(fkey(f)) && !vus[fkey(f)])
      .sort((x, y) => T.score(t.me, y) - T.score(t.me, x)).slice(0, 3);
    again.forEach((f, i) => { f._relance = true; mix.splice(Math.min(mix.length, 4 + i * 9), 0, f); });
  }
  for (const f of mix) deck.keys.add(fkey(f));
  deck.cards.push(...mix); deck.loading = false;
}
// Dessiner la pile sans tout refaire : la carte d'en dessous (déjà affichée, affiche déjà décodée) monte et devient
// la carte du dessus, la suivante arrive derrière en fondu, et celle qu'on vient de juger finit de s'envoler par-dessus.
const deckFrag = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
function deckPreload() {
  // les affiches des prochaines cartes se chargent et se décodent en avance
  for (const f of deck.cards.slice(deck.i + 1, deck.i + 5)) {
    if (!f?.poster || deckPreload.done.has(f.poster)) continue;
    deckPreload.done.add(f.poster); const im = new Image(); im.referrerPolicy = 'no-referrer'; im.decoding = 'async'; im.src = posterSrc(f.poster, 'dposter'); im.decode?.().catch(() => {});
  }
}
deckPreload.done = new Set();
// la carte suivante, derrière : elle arrive en fondu
function deckDrawNext() {
  const st = deck?.box.querySelector('.deck-stack'), nxt = deck?.cards[deck.i + 1], top = st?.querySelector('.dcard.top:not(.gone)');
  if (!top || !deckDraw.card) return;
  const cur = st.querySelector('.dcard.next');
  if (!nxt) { cur?.remove(); return; }
  if (cur?.dataset.k === fkey(nxt)) return;
  cur?.remove();
  const n = deckFrag(deckDraw.card(nxt, 'next')); n.classList.add('enter'); st.insertBefore(n, top);
  requestAnimationFrame(() => requestAnimationFrame(() => n.classList.remove('enter')));
}
function deckDraw() {
  const st = deck?.box.querySelector('.deck-stack'); if (!st) return;
  const t = tastes(deck.cards, true), o = other();
  const n = deck.box.querySelector('.deck-n');
  if (n) { const fresh = (deck.voted || []).filter(x => x > (tasteMemo?.at || 0)).length; n.textContent = deck.test && deck.i < deck.test ? `Test ${deck.i + 1}/${deck.test}` : t.me?.n ? `${t.me.n + fresh} avis` : ''; }
  const cur = deck.cards[deck.i], nxt = deck.cards[deck.i + 1];
  if (cur && deck.shownAt !== deck.i) { deck.shownAt = deck.i; deck.t0 = deck.act = performance.now() + 220; deck.gap = 0; deck.away = document.hidden; deck.fiche = false; deck.lire = 0; const c0 = cur; setTimeout(() => shownAdd(c0), 400); }
  // plus que quelques cartes : on en cherche d'autres (une seule fois de suite si la pioche revient vide)
  if (deck.cards.length - deck.i < 6 && !deck.loading && !(deck.dry && deck.dry === deck.cards.length)) {
    const had = deck.cards.length;
    deckMore().then(() => { if (!deck) return; if (deck.cards.length === had) deck.dry = had; if (!deck.cards[deck.i] || !st.querySelector('.dcard:not(.gone)')) deckDraw(); else deckDrawNext(); });
  }
  const live = [...st.children].filter(c => !c.classList.contains('gone'));
  if (!cur) { live.forEach(c => c.remove()); st.insertAdjacentHTML('beforeend', deck.loading ? '<p class="hint">Azami cherche d’autres films…</p>' : `<p class="hint">${S.filmsTmdb === false ? 'Cinder a besoin de TMDB pour proposer des films.' : 'Plus de propositions pour l’instant. Change d’envie, ou reviens plus tard.'}</p>`); return; }
  const card = (f, cls) => {
    const why = cls === 'top' ? T.why(t.me, f, 2) : [], warn = cls === 'top' ? T.warn(t.me, f) : '';
    const sub = [f.year, f.media === 'tv' ? 'Série' : f.runtime ? rDur(f.runtime) : (f.traits?.rt ? rDur(f.traits.rt) : 'Film'), f.traits?.dir?.[0]?.name].filter(Boolean).join(' · ');
    return `<div class="dcard ${cls}" data-k="${esc(fkey(f))}">${fPoster(f, 'dposter')}<div class="dinfo">${cls === 'top' ? `<button type="button" class="dinfo-btn" data-d="info" aria-label="Plus d’infos sur ${esc(f.title)}"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 14l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : ''}<b>${esc(f.title)}</b><span>${esc(sub)}</span>
      <div class="dtags">${f.cinema || fSalles(f).length ? `<em class="dtag salle">${icn('ticket')} Au cinéma</em>` : f.dispo || fDispo(f) ? '<em class="dtag">✓ Chez vous</em>' : ''}${f.note ? `<em class="dtag note">★ ${String(f.note).replace('.', ',')}</em>` : ''}</div>
      ${why.length ? `<ul class="dwhy">${why.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}${warn ? `<p class="dwarn">${esc(warn)}</p>` : ''}
      <p>${esc(f.overview || '')}</p></div><span class="dstamp oui">ENVIE</span><span class="dstamp non">BOF</span><span class="dstamp beurk">NON !</span><span class="dstamp vu">DÉJÀ VU</span></div>`;
  };
  deckDraw.card = card;
  const ago = cur._relance ? Math.round((Date.now() - Date.parse(cur.hesite?.[S.me]?.at || cur.created_at || Date.now())) / (30 * 864e5)) : 0;
  // la carte qui était dessous monte (on garde l'élément et son affiche) ; sinon on la crée
  const kc = fkey(cur), up = live.find(c => c.classList.contains('next') && c.dataset.k === kc);
  live.forEach(c => { if (c !== up) c.remove(); });
  let el;
  if (up) { el = up; el.style.transform = el.style.opacity = ''; el.classList.replace('next', 'top'); const d = deckFrag(card(cur, 'top')); el.querySelector('.dinfo').replaceWith(d.querySelector('.dinfo')); }
  else { el = deckFrag(card(cur, 'top')); st.appendChild(el); }
  const gone = st.querySelector('.dcard.gone'); if (gone) st.appendChild(gone);   // elle finit de s'envoler par-dessus
  deckDrawNext();
  if (cur._relance && !deck.asking) st.insertAdjacentHTML('beforeend', `<p class="dtheirs relance">Seconde chance : tu avais hésité${ago >= 1 ? ` il y a ${ago} mois` : ''}</p>`);   // ce que l'autre veut voir ou a aimé reste secret ici : la surprise du match
  deckPreload();
  if (deck.asking) { deckAskSeen(true); return; }
  const nxF = () => st.querySelector('.dcard.next:not(.enter)');
  // le temps de décision part quand l'affiche est vraiment là, et la carte laisse un peu plus de temps s'il y a du texte à lire
  const img = el?.querySelector('img.dposter'), i0 = deck.i, go = () => { if (deck?.i === i0) deck.t0 = deck.act = Math.max(deck.act || 0, performance.now()); };
  if (img && !img.complete) { img.addEventListener('load', go, { once: true }); img.addEventListener('error', go, { once: true }); setTimeout(go, 1200); }
  deck.lire = Math.min(3000, ((el?.querySelector('.dinfo p')?.textContent.length || 0) + (el?.querySelector('.dwhy')?.textContent.length || 0)) * 8);
  // Glisser au doigt : la carte suit le doigt sans retard (une mise à jour par image), un geste vif suffit
  // (on regarde la vitesse, pas seulement la distance), et la carte suivante grandit pendant qu'on glisse.
  let x0 = null, y0 = 0, dx = 0, dy = 0, t0 = 0, raf = 0, hist = [];
  const paint = () => {
    raf = 0; const nx = nxF();
    const vert = Math.abs(dy) > Math.abs(dx) * 1.1, up = vert && dy < -50, down = vert && dy > 50;
    el.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${dx / 16}deg)`;
    el.classList.toggle('lean-vu', up); el.classList.toggle('lean-beurk', down); el.classList.toggle('lean-oui', !vert && dx > 40); el.classList.toggle('lean-non', !vert && dx < -40);
    if (nx) { const k = Math.min(1, Math.hypot(dx, dy) / 160); nx.style.transform = `scale(${.94 + .06 * k}) translateY(${10 - 10 * k}px)`; nx.style.opacity = String(.7 + .3 * k); }
  };
  el.addEventListener('pointerdown', e => {
    if (e.button > 0 || e.target.closest('a, button')) return;
    x0 = e.clientX; y0 = e.clientY; dx = dy = 0; t0 = performance.now(); hist = [[t0, 0, 0]]; deck.drag = true;
    const nx = nxF(); el.setPointerCapture(e.pointerId); el.style.transition = 'none'; if (nx) nx.style.transition = 'none';
  });
  el.addEventListener('pointermove', e => {
    if (x0 == null) return; e.preventDefault();
    dx = e.clientX - x0; dy = e.clientY - y0;
    const now = performance.now(); hist.push([now, dx, dy]); while (hist.length > 2 && now - hist[0][0] > 90) hist.shift();
    if (!raf) raf = requestAnimationFrame(paint);
  });
  const end = () => {
    if (x0 == null) return; x0 = null; cancelAnimationFrame(raf); raf = 0; if (deck) deck.drag = false; const nx = nxF();
    const [ta, xa, ya] = hist[0], dt = Math.max(16, performance.now() - ta), vx = (dx - xa) / dt, vy = (dy - ya) / dt;   // px par ms
    const vert = Math.abs(dy) > Math.abs(dx) * 1.1;
    const fx = Math.abs(dx) > 90 || (Math.abs(dx) > 35 && Math.abs(vx) > .45), fy = Math.abs(dy) > 90 || (Math.abs(dy) > 35 && Math.abs(vy) > .45);
    el.style.transition = ''; if (nx) nx.style.transition = '';
    // un simple toucher (sans glisser) : la carte se retourne et montre la fiche, comme sur Tinder
    if (Math.hypot(dx, dy) < 8 && performance.now() - t0 < 400) { el.style.transform = ''; if (nx) nx.style.transform = nx.style.opacity = ''; deckInfo(); return; }
    if (vert && fy && dy < 0) { el.style.transform = ''; el.classList.remove('lean-vu'); if (nx) nx.style.transform = nx.style.opacity = ''; deckAskSeen(); }
    else if (vert && fy && dy > 0) { cinderLog('beurk'); deckVote('beurk', { dx, dy }); }
    else if (!vert && fx) { cinderLog(dx > 0 ? 'oui' : 'non'); deckVote(dx > 0 ? 'oui' : 'non', { dx, dy }); }
    else { el.style.transform = ''; el.classList.remove('lean-oui', 'lean-non', 'lean-vu', 'lean-beurk'); if (nx) nx.style.transform = nx.style.opacity = ''; }
  };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('lostpointercapture', end);
}
const TMDB_G = { 28: 'Action', 12: 'Aventure', 16: 'Animation', 35: 'Comédie', 80: 'Policier', 99: 'Documentaire', 18: 'Drame', 10751: 'Familial', 14: 'Fantastique', 36: 'Histoire', 27: 'Horreur', 10402: 'Musique', 9648: 'Mystère', 10749: 'Romance', 878: 'Science-fiction', 53: 'Thriller', 10752: 'Guerre', 37: 'Western', 10759: 'Action', 10765: 'SF et fantastique', 10768: 'Guerre', 10762: 'Enfants', 10764: 'Téléréalité', 10766: 'Feuilleton', 10767: 'Talk-show', 10763: 'Actualités' };
// La fiche d'une carte : synopsis, bande-annonce, crédits, où le voir et pourquoi Azami le propose.
// Les détails (bande-annonce surtout) arrivent de TMDB à la première ouverture, puis restent sur la carte.
function deckInfo() {
  const f = deck?.cards[deck.i]; if (!f || deck.asking) return;
  deck.fiche = true;
  const st = deck.box.querySelector('.deck-stack'); st.querySelectorAll('.dmore').forEach(x => x.remove());
  st.insertAdjacentHTML('beforeend', `<div class="dmore" role="dialog" aria-label="Fiche de ${esc(f.title)}"><div class="dm-scroll">${deckInfoHtml(f)}</div>
    <button type="button" class="dm-close" data-d="info-close" aria-label="Revenir à la carte"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 10l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>`);
  const m = st.querySelector('.dmore'); requestAnimationFrame(() => m.classList.add('on')); haptic(1);
  // on peut aussi voter depuis la fiche ouverte : glisser de côté (envie / bof) ; faire défiler reste vertical
  let x0 = null, y0 = 0, dx = 0, horiz = false;
  m.addEventListener('pointerdown', e => { if (e.button > 0 || e.target.closest('a, button, iframe')) return; x0 = e.clientX; y0 = e.clientY; dx = 0; horiz = false; });
  m.addEventListener('pointermove', e => {
    if (x0 == null) return; dx = e.clientX - x0; const dy = e.clientY - y0;
    if (!horiz) { if (Math.abs(dx) < 12) return; if (Math.abs(dx) < Math.abs(dy) * 1.3) { x0 = null; return; } horiz = true; m.setPointerCapture?.(e.pointerId); }
    m.style.transition = 'none'; m.style.transform = `translate3d(${dx}px, 0, 0) rotate(${dx / 22}deg)`;
  });
  const end = () => { if (x0 == null) return; x0 = null; m.style.transition = '';
    if (horiz && Math.abs(dx) > 90) { const v = dx > 0 ? 'oui' : 'non'; cinderLog(v); m.remove(); deckVote(v); }
    else m.style.transform = ''; horiz = false; };
  m.addEventListener('pointerup', end); m.addEventListener('pointercancel', () => { if (!horiz) { x0 = null; return; } end(); });
  // sur téléphone, le toucher qui ouvre la fiche produit ensuite un « clic » qui tomberait sur la fiche : on l'ignore
  const opened = performance.now(), heroClose = () => { if (performance.now() - opened > 450) deckInfoClose(); };
  m.addEventListener('click', e => { if (performance.now() - opened < 450) { e.stopPropagation(); e.preventDefault(); } }, true);
  m.querySelector('.dm-hero')?.addEventListener('click', heroClose);
  if (!f._det && f.tmdb_id) {
    f._det = 'load';
    filmsCall({ action: 'details', tmdb_id: f.tmdb_id, media: f.media }).then(d => {
      for (const [k, v] of Object.entries(d || {})) if (v != null && v !== '' && !(Array.isArray(v) && !v.length) && !['title', 'id', 'tmdb_id', 'media'].includes(k) && (f[k] == null || ['trailer', 'providers', 'genres', 'traits', 'overview'].includes(k))) f[k] = v;
      f._det = 'ok';
    }).catch(() => { f._det = 'ko'; }).finally(() => {
      const sc = deck?.box.querySelector('.dmore .dm-scroll');
      if (sc && deck.cards[deck.i] === f) { const y = sc.scrollTop; sc.innerHTML = deckInfoHtml(f); sc.scrollTop = y; sc.querySelector('.dm-hero')?.addEventListener('click', () => { const mm = sc.closest('.dmore'); if (mm && !mm.classList.contains('closing')) deckInfoClose(); }); }
    });
  }
}
// Les notes de la presse et du public, en une ligne de pastilles (Metacritic ou Rotten Tomatoes pour la presse).
function presseRow(f) {
  const P = f.presse; if (!P || P.aucune) return '';
  const c = n => String(n).replace('.', ',');
  const pills = [
    P.mc != null ? ['Presse', `${Math.round(P.mc)}`, '/100', 'Metacritic'] : P.rt != null ? ['Presse', `${Math.round(P.rt)} %`, '', 'Rotten Tomatoes'] : null,
    P.pop != null ? ['Public', `${Math.round(P.pop)} %`, '', 'Rotten Tomatoes, spectateurs'] : null,
    P.imdb != null ? ['IMDb', c(P.imdb), '/10', ''] : null,
    P.lb != null ? ['Letterboxd', c(P.lb), '/5', ''] : null,
  ].filter(Boolean);
  if (!pills.length) return '';
  return `<div class="fnotes">${pills.map(([k, v, u, t]) => `<span${t ? ` title="${esc(t)}"` : ''}><small>${k}</small><b>${v}</b>${u ? `<i>${u}</i>` : ''}</span>`).join('')}${P.oscar ? `<span class="osc"><small>Prix</small><b>${icn('trophee')}</b><i>Oscar</i></span>` : (P.prix || 0) >= 10 ? `<span class="osc"><small>Prix</small><b>${P.prix}</b></span>` : ''}</div>`;
}
// Le palmarès en pastilles : top 10 des Cahiers, Sight and Sound, prix et sélections.
const PRIX_C = { palme: 'Palme d’or', lion: 'Lion d’or', ours: 'Ours d’or', leopard: 'Léopard d’or', oscar_film: 'Oscar du meilleur film', cesar: 'César du meilleur film', annecy: 'Cristal d’Annecy', oscar_inter: 'Oscar du film international', oscar_anim: 'Oscar du film d’animation', cannes_gp: 'Grand prix à Cannes' };
const SEL_C = { cannes: 'En compétition à Cannes', venise: 'En compétition à Venise', berlin: 'En compétition à Berlin', locarno: 'En compétition à Locarno' };
function palmaresRow(f) {
  const P = f.palmares; if (!P || P.aucun) return '';
  const b = [];
  if (P.cahiers) b.push(['cah', `Top 10 des Cahiers ${P.cahiers[1]}${P.cahiers[0] ? ` · ${P.cahiers[0] === 1 ? '1er' : P.cahiers[0] + 'e'}` : ''}`]);
  if (P.ss) b.push(['ss', `Sight and Sound${P.ss.c ? ` · critiques ${P.ss.c}e` : ''}${P.ss.d ? ` · cinéastes ${P.ss.d}e` : ''}`]);
  for (const p of P.prix || []) if (PRIX_C[p]) b.push(['prix', PRIX_C[p]]);
  const won = new Set((P.prix || []).map(p => ({ palme: 'cannes', lion: 'venise', ours: 'berlin', leopard: 'locarno' })[p]));
  for (const p of P.selec || []) if (SEL_C[p] && !won.has(p)) b.push(['sel', SEL_C[p]]);
  return b.length ? `<div class="fpalma">${b.map(([c, t]) => `<span class="${c}">${esc(t)}</span>`).join('')}</div>` : '';
}
function tonsRow(f) {
  const T0 = f.tons; if (!T0?.tons?.length) return '';
  return `<div class="ftons">${T0.tons.map(t => `<span>${esc(t)}</span>`).join('')}${T0.rythme ? `<span class="ry">rythme ${esc(T0.rythme)}</span>` : ''}${T0.intensite ? `<span class="ry">intensité ${esc(T0.intensite)}</span>` : ''}</div>`;
}
// La presse titre par titre (AlloCiné) : tes jumeaux critiques d'abord.
function critiquesRow(f) {
  const C = f.critiques; if (!C || C.aucune) return '';
  const tw = tastes([], true).me?.critics || new Map();
  const list = Object.entries(C).map(([o, v]) => [o, v, tw.get(o)?.adj ?? null]).sort((a, b) => (b[2] ?? -2) - (a[2] ?? -2) || b[1] - a[1]);
  const star = v => `${'★'.repeat(Math.floor(v))}${v % 1 ? '½' : ''}`;
  return `<details class="fcrit"><summary><span>La presse</span><small>${list.length} ${list.length > 1 ? 'journaux' : 'journal'}${list.some(x => x[2] > .22) ? ' · tes jumeaux en premier' : ''}</small></summary>
    <ul>${list.map(([o, v, r]) => `<li class="${r > .22 ? 'twin' : ''}"><span>${esc(o)}${r > .22 ? '<em>te ressemble</em>' : ''}</span><b aria-label="${String(v).replace('.', ',')} sur 5">${star(v)}<i>${'★'.repeat(5 - Math.ceil(v))}</i></b></li>`).join('')}</ul></details>`;
}
function deckInfoClose(now) {
  const m = deck?.box.querySelector('.dmore'); if (!m) return;
  if (now) { m.remove(); return; }
  m.classList.remove('on'); m.style.pointerEvents = 'none'; m.classList.add('closing'); setTimeout(() => m.remove(), 260); haptic(1);
}
function deckInfoHtml(f) {
  const t = tastes(deck.cards, true), why = T.why(t.me, f, 4), warn = T.warn(t.me, f), o = other();
  const tr = f.traits || {}, names = l => (l || []).map(p => p.name).filter(Boolean);
  const genres = (Array.isArray(f.genres) && f.genres.length && typeof f.genres[0] === 'string' ? f.genres : (f.gids || []).map(g => TMDB_G[g]).filter(Boolean)).slice(0, 3);
  const dur = f.media === 'tv' ? (f.seasons ? pl(f.seasons, 'saison', 'saisons') : 'Série') : (f.runtime || tr.rt) ? rDur(f.runtime || tr.rt) : '';
  const meta = [f.year, dur, genres.join(', ')].filter(Boolean).join(' · ');
  const cred = [[f.media === 'tv' ? 'Création' : 'Réalisation', names(tr.dir).join(', ') || f.director], ['Avec', names(tr.cast).slice(0, 4).join(', ')], ['Scénario', names(tr.wri).join(', ')], ['Musique', names(tr.comp).join(', ')], ['Image', names(tr.dop).join(', ')]].filter(([, v]) => v);
  const yt = f.trailer && String(f.trailer).match(/[?&]v=([\w-]{6,})/)?.[1];
  const where = fWhereLine(f);
  const theirs = o && T.wants(fVotes(f)[o]);
  return `<div class="dm-hero">${f.poster ? `<img class="dm-bg" src="${esc(f.poster)}" alt="" referrerpolicy="no-referrer">` : ''}${fPoster(f, 'dm-poster')}
      <div class="dm-head"><h3>${esc(f.title)}</h3>${f.original && nt(f.original) !== nt(f.title) ? `<p class="dm-orig">${esc(f.original)}</p>` : ''}<p class="dm-meta">${esc(meta)}</p>
      <div class="dtags">${f.note ? `<em class="dtag note">★ ${String(Math.round(f.note * 10) / 10).replace('.', ',')}</em>` : ''}${where ? '' : f.cinema || fSalles(f).length ? `<em class="dtag salle">${icn('ticket')} Au cinéma</em>` : f.dispo || fDispo(f) ? '<em class="dtag">✓ Chez vous</em>' : ''}</div></div></div>
    <div class="dm-body">
      ${yt ? `<button type="button" class="dm-trailer" data-d="trailer" data-yt="${esc(yt)}" aria-label="Lire la bande-annonce"><img src="https://i.ytimg.com/vi/${esc(yt)}/hqdefault.jpg" alt="" referrerpolicy="no-referrer"><span class="dm-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="30" height="30"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg></span><span class="dm-tl">Bande-annonce</span></button>`
        : f._det === 'load' ? '<div class="dm-trailer wait"><span>Azami cherche la bande-annonce…</span></div>' : ''}
      ${presseRow(f)}${palmaresRow(f)}${tonsRow(f)}
      ${f.overview ? `<p class="dm-syn">${esc(f.overview)}</p>` : f._det === 'load' ? '' : '<p class="dm-syn muted">Pas encore de synopsis en français.</p>'}
      ${where ? `<p class="dm-where">${where}</p>` : ''}
      ${critiquesRow(f)}
      ${cred.length ? `<dl class="dm-cred">${cred.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
      ${why.length || warn ? `<div class="dm-why"><p class="chip-label">Pourquoi Azami te le propose</p>${why.length ? `<ul>${why.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}${warn ? `<p class="dwarn">${esc(warn)}</p>` : ''}</div>` : ''}
      <p class="dm-links">${yt ? `<a href="https://www.youtube.com/watch?v=${esc(yt)}" target="_blank" rel="noopener">Ouvrir sur YouTube</a>` : ''}${f.tmdb_id ? `<a href="https://www.themoviedb.org/${f.media === 'tv' ? 'tv' : 'movie'}/${f.tmdb_id}" target="_blank" rel="noopener">Fiche complète</a>` : ''}</p>
    </div>`;
}
// Sur iPhone, une vidéo lancée automatiquement dans le lecteur YouTube démarre sans le son : on affiche le lecteur,
// et c'est le toucher sur son bouton lecture (dans la vidéo elle-même) qui la lance, avec le son.
function deckTrailer(b) {
  const id = b.dataset.yt; if (!id) return;
  const w = document.createElement('div'); w.className = 'dm-trailer playing';
  w.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?playsinline=1&rel=0&modestbranding=1" title="Bande-annonce" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  b.replaceWith(w); haptic(1);
}
// Déjà vu : une note rapide, qui en dit long (surtout quand on n'a pas aimé).
function deckWhyHide() { clearTimeout(deckWhy.t); deck?.box.querySelectorAll('.dwhyask').forEach(x => x.remove()); deckWhyReset(); }
function deckAskSeen(redraw = false) {
  const f = deck?.cards[deck.i]; if (!f) return;
  deckWhyHide();
  deck.asking = true; haptic(1);
  const st = deck.box.querySelector('.deck-stack');
  st.querySelector('.dseen')?.remove();
  st.insertAdjacentHTML('beforeend', `<div class="dseen" role="dialog" aria-label="Tu l’as vu"><p class="dseen-t">Tu as vu <b>${esc(f.title)}</b>. Alors ?</p>
    <div class="dseen-notes">${[[1, 'Détesté'], [2, 'Pas aimé'], [3, 'Moyen'], [4, 'Aimé'], [5, 'Adoré']].map(([n, l]) => `<button data-note="${n}"><span>${'♥'.repeat(n)}</span><small>${l}</small></button>`).join('')}</div>
    <button class="link" data-d="skip">Annuler</button></div>`);
}
async function deckSeen(note) {
  const f = deck?.cards[deck.i]; if (!f) return; cinderLog('vu');
  deck.asking = false; haptic(note >= 4 ? 'medium' : 1); sfx('tick');
  deckFly(deck.box.querySelector('.dcard.top:not(.gone)'), 'vu');
  deck.box.querySelector('.dseen')?.remove();
  (deck.voted ||= []).push(performance.now());
  deck.i++; deckDraw();
  try { const p = filmVote(f, fVotes(f)[S.me] || null, false, note); deckUndoNow(f, `${f.title} : noté`, p); await p; } catch (e) { console.warn('vu', e); toast('La note n’est pas passée.'); }
}
// Retour en arrière dans Cinder : la dernière carte revient, et l'avis est effacé.
// Annuler dans Cinder : proposé tout de suite (sans attendre le réseau), et toujours pour la DERNIÈRE carte jugée.
// La remise en état de la base attend que l'avis soit bien enregistré, puis défait exactement celui-là.
function deckUndoNow(f, label, p) {
  offerUndo(label, [], []);
  UNDO.wait = p.then(() => { const u = filmVote.undoFor?.get(fkey(f)); return u ? { before: u[1], cap: u[2] } : { before: [], cap: [] }; }).catch(() => ({ before: [], cap: [] }));
  UNDO.after = () => { if (deck && deck.cards[deck.i - 1] === f) { deck.i--; deck.asking = false; deckWhyHide(); deckInfoClose(true); deckDraw(); } };
}
function deckUndoOffer(f) {
  const [label, before, cap] = filmVote.undo || []; if (!label) return;
  cineUndo(label, before, cap, () => { if (deck && deck.cards[deck.i - 1] === f) { deck.i--; deck.asking = false; deckDraw(); } });
}
// La carte jugée s'envole dans la direction du geste, sans ralentir (elle part à la vitesse du doigt puis file),
// pendant que la suivante est déjà là et déjà jouable.
function deckFly(el, v, from) {
  if (!el) return;
  el.classList.remove('top'); el.classList.add('gone');
  const W = innerWidth + 260, x = from?.dx || 0, y = from?.dy || 0;
  const to = v === 'beurk' ? `translate3d(${x * .6}px, ${innerHeight}px, 0) rotate(${x / 30 + 6}deg)` : v === 'vu' || v === 'super' ? `translate3d(${x * .6}px, ${-innerHeight}px, 0) rotate(${x / 30 - 4}deg)${v === 'super' ? ' scale(.9)' : ''}`
    : `translate3d(${v === 'oui' ? W : -W}px, ${y * 1.6 + 40}px, 0) rotate(${v === 'oui' ? 28 : -28}deg)`;
  el.style.transition = 'transform .34s cubic-bezier(.25,.6,.45,1), opacity .34s ease-in';
  requestAnimationFrame(() => { el.style.transform = to; el.style.opacity = '0'; });
  setTimeout(() => el.remove(), 380);
}
async function deckVote(v, from) {
  const f = deck?.cards[deck.i]; if (!f || deck.asking) return;
  const tv = performance.now();
  deckWhyHide();
  const el = deck.box.querySelector('.dcard.top:not(.gone)');
  if (v === 'super' && el) burst('sparkle', el, 14);
  deckFly(el, v, from);
  haptic(T.wants(v) ? 'medium' : v === 'beurk' ? 'heavy' : 1); if (T.wants(v)) sfx(v === 'super' ? 'done' : 'tick');
  (deck.voted ||= []).push(tv);
  // le temps de décision : immédiat, le temps de lire le titre et l'affiche, ou une vraie hésitation
  const meta = { ms: Math.max(0, Math.round(tv - (deck.t0 || tv))), fiche: !!deck.fiche, lire: deck.lire || 0, at: new Date().toISOString() };
  if (f._relance) meta.relance = 1;   // une seule seconde chance
  if (deck.away || (deck.gap || 0) > (deck.fiche ? 40000 : 15000)) meta.absent = 1;
  deck.i++; deckDraw();
  try {
    const p = filmVote(f, v, T.wants(v), 0, meta);
    deckUndoNow(f, `${f.title} : ${v === 'oui' ? 'envie' : v === 'super' ? 'très envie' : v === 'beurk' ? 'non' : 'bof'}`, p);
    const saved = await p;
    // on ne demande pourquoi que quand tu as hésité (fiche ouverte ou longue réflexion) : un Bof immédiat se passe d'explication
    if (!deck) return;
    if ((v === 'non' || v === 'beurk') && saved?.id && !deck.asking && T.tempo(meta, tastes([], true).me?.st?.th) === 'hesite') deckWhyOffer(saved, v);
    if (T.wants(v) && fMatch(saved)) filmMatchParty(saved, deck.box);
  } catch (e) { console.warn('vote', e); toast('Le vote n’est pas passé. Réessaie.'); }
}
// Pourquoi ? Rien ne s'impose : après un Bof ou un Non!, un petit lien discret remplace l'aide en bas quelques
// secondes. Si on le touche, les pastilles s'ouvrent ; sinon, rien ne bouge (un Bof veut souvent dire « flemme »).
function deckWhyOffer(f, v) {
  const hint = deck?.box.querySelector('.deck-hint'); if (!hint) return;
  clearTimeout(deckWhyOffer.t);
  hint.dataset.txt = hint.dataset.txt || hint.textContent;
  hint.innerHTML = `<button type="button" class="dwhy-link">Pourquoi ${v === 'beurk' ? 'ce non' : 'ce bof'} pour ${esc(f.title)} ?</button>`;
  hint.querySelector('button').addEventListener('click', e => { e.stopPropagation(); deckWhyReset(); deckWhy(f, v); });
  deckWhyOffer.t = setTimeout(deckWhyReset, 3500);
}
function deckWhyReset() { clearTimeout(deckWhyOffer.t); const hint = deck?.box.querySelector('.deck-hint'); if (hint?.dataset.txt) { hint.textContent = hint.dataset.txt; delete hint.dataset.txt; } }
function deckWhy(f, v) {
  const host = deck?.box; if (!host) return;   // à côté de la pile (la pile est redessinée à chaque carte)
  host.querySelector('.dwhyask')?.remove(); clearTimeout(deckWhy.t);
  const el = document.createElement('div'); el.className = 'dwhyask'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', `Pourquoi ${v === 'beurk' ? 'non' : 'bof'} pour ${f.title}`);
  const mine = () => f.raisons?.[S.me] || [];
  const draw = () => { el.innerHTML = `<p>${v === 'beurk' ? 'Non !' : 'Bof'} pour <b>${esc(f.title)}</b>. Pourquoi ? <small>(facultatif)</small></p><div>${T.RAISONS.map(([k, l]) => `<button type="button" data-why="${k}" aria-pressed="${mine().includes(k)}">${l}</button>`).join('')}</div>`; };
  draw(); host.appendChild(el); requestAnimationFrame(() => el.classList.add('on'));
  const bye = (ms) => { clearTimeout(deckWhy.t); deckWhy.t = setTimeout(() => { el.classList.remove('on'); setTimeout(() => el.remove(), 250); }, ms); };
  bye(4000);   // ouvert exprès : le temps de choisir, puis ça s'en va
  el.addEventListener('pointerdown', e => e.stopPropagation());
  el.addEventListener('click', e => {
    e.stopPropagation();
    const b = e.target.closest('[data-why]'); if (!b) return;
    const k = b.dataset.why, cur = mine(), next = cur.includes(k) ? cur.filter(x => x !== k) : [...cur, k];
    f.raisons = { ...(f.raisons || {}), [S.me]: next }; haptic(1); draw(); bye(1800);
    api.update('films', { id: f.id }, { raisons: f.raisons }).catch(() => {});
  });
}
// La fiche d'un film : affiche, synopsis, où regarder, bande-annonce, et ce qu'on en fait.
async function cineOpen(id) {
  const f = S.films.find(x => x.id === id); if (!f) return;
  const draw = () => {
    const o = other(), v = fVotes(f);
    const prov = (f.providers || []);
    const acts = f.status === 'a_voir' ? (T.wants(v[S.me]) ? `<button class="btn" data-action="cine-watch" data-id="${f.id}">On le regarde</button>`
        : `<button class="btn" data-action="cine-want" data-id="${f.id}">${o && T.wants(v[o]) ? 'Moi aussi' : 'Je veux le voir'}</button><button class="btn ghost" data-action="cine-nope" data-id="${f.id}">Bof</button>`)
      + (!fSeen(f, S.me) ? `<button class="btn ghost small" data-action="cine-iseen" data-id="${f.id}">Déjà vu</button>` : '')
      : f.status === 'en_cours' ? `${f.media === 'tv' ? `<button class="btn" data-action="cine-ep" data-id="${f.id}">+1 épisode (${fProg(f)})</button>` : ''}<button class="btn ${f.media === 'tv' ? 'ghost' : ''}" data-action="cine-seen" data-id="${f.id}">${f.media === 'tv' ? 'Série finie' : 'On l’a vu'}</button>`
      : f.status === 'favori' ? `<button class="btn" data-action="cine-propose" data-id="${f.id}">${(f.coeur || []).includes(S.me) ? `Le proposer à ${esc(nameOf(o))}` : 'J’ai envie de le voir'}</button>`
      : `<button class="btn ghost" data-action="cine-seen" data-id="${f.id}">Changer ma note</button>`;
    const heart = `<button class="fheart" data-action="cine-coeur" data-id="${f.id}" aria-pressed="${(f.coeur || []).includes(S.me)}" aria-label="${(f.coeur || []).includes(S.me) ? 'Retirer de mes coups de cœur' : 'Mettre dans mes coups de cœur'}"><span aria-hidden="true">${(f.coeur || []).includes(S.me) ? '♥' : '♡'}</span><small>Coup de cœur</small></button>`;
    const rates = S.members.filter(m => f.ratings?.[m.email]?.note).map(m => `<li><b>${esc(m.email === S.me ? 'Toi' : nameOf(m.email))}</b> <span class="hearts">${'♥'.repeat(f.ratings[m.email].note)}${'♡'.repeat(5 - f.ratings[m.email].note)}</span>${f.ratings[m.email].mot ? `<br><i>« ${esc(f.ratings[m.email].mot)} »</i>` : ''}</li>`).join('');
    document.getElementById('ticket')?.remove();
    const box = document.createElement('div'); box.id = 'ticket';
    box.innerHTML = `<div class="ticket-card fsheet" role="dialog" aria-label="${esc(f.title)}"><button type="button" class="fsheet-x" data-action="sheet-close" aria-label="Fermer la fiche"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></button>${f.poster ? `<div class="fsheet-bg" style="background-image:url('${esc(f.poster)}')" aria-hidden="true"></div>` : ''}
      <div class="fsheet-top">${fPoster(f, 'bposter')}<div><p class="ticket-title">${esc(f.title)}</p><p class="ticket-sub">${esc(fMeta(f))}</p>${f.director ? `<p class="ticket-sub">${f.media === 'tv' ? 'Créée par' : 'De'} ${esc(f.director)}</p>` : ''}
        ${fMatch(f) ? `<span class="fbadge match">${icn('deux')} Vous deux</span>` : o && T.wants(v[o]) ? `<span class="fbadge">Envie de ${esc(nameOf(o))}</span>` : ''}</div></div>
      ${presseRow(f)}${palmaresRow(f)}${tonsRow(f)}
      ${f.overview ? `<p class="fsyn">${esc(f.overview)}</p>` : ''}
      ${critiquesRow(f)}
      ${(() => { const tr = f.traits || {}, ppl = [...(tr.dir || []).map(p => [p, f.media === 'tv' ? 'création' : 'réalisation']), ...(tr.wri || []).slice(0, 1).map(p => [p, 'scénario']), ...(tr.comp || []).map(p => [p, 'musique']), ...(tr.dop || []).map(p => [p, 'image']), ...(tr.cast || []).slice(0, 3).map(p => [p, ''])];
        const seen = new Set(); const l = ppl.filter(([p]) => !seen.has(p.id) && seen.add(p.id));
        return l.length ? `<p class="chip-label">L’équipe</p><div class="fteam">${l.map(([p, r]) => `<button type="button" data-action="taste-rule" data-k="p:${p.id}" data-l="${esc(p.name)}"><b>${esc(p.name)}</b>${r ? `<small>${r}</small>` : ''}</button>`).join('')}</div>` : ''; })()}
      ${(() => { const ss = fSalles(f); return ss.length ? `<p class="chip-label">Au cinéma à Lausanne</p><div class="fsalles">${ss.map(x => `<a class="fsalle" href="${esc(x.url)}" target="_blank" rel="noopener"><b>${esc(x.where)}</b><span>${esc(x.when || '')}</span><i aria-hidden="true">›</i></a>`).join('')}</div>` : f.cinema ? `<p class="chip-label">Au cinéma en Suisse</p><p><a class="link" href="https://search.ch/cine/Lausanne" target="_blank" rel="noopener">Voir les séances à Lausanne</a></p>` : ''; })()}
      ${prov.length ? `<p class="chip-label">Où regarder en Suisse</p><div class="fprovs">${[...prov].sort((a, b) => S.subs.includes(subOf(b.name)) - S.subs.includes(subOf(a.name))).map(p => `<span class="fp ${S.subs.includes(subOf(p.name)) && p.kind !== 'location' ? 'chez' : ''}">${p.logo ? `<img src="${esc(p.logo)}" alt="" referrerpolicy="no-referrer">` : ''}${esc(p.name)}${p.kind === 'location' ? ' <small>(location)</small>' : p.kind === 'gratuit' ? ' <small>(gratuit)</small>' : S.subs.includes(subOf(p.name)) ? ' <small>✓ chez vous</small>' : ''}</span>`).join('')}</div>` : f.tmdb_id ? '<p class="hint">Pas trouvé en streaming en Suisse pour l’instant.</p>' : ''}
      ${f.trailer ? `<p><a class="link" href="${esc(f.trailer)}" target="_blank" rel="noopener">▶ Voir la bande-annonce</a></p>` : ''}
      ${rates ? `<ul class="frates-big">${rates}</ul>` : ''}
      ${(f.coeur || []).filter(e => e !== S.me).length ? `<p class="fbadge">♥ Coup de cœur de ${esc(nameOf(f.coeur.find(e => e !== S.me)))}</p>` : ''}
      ${(() => { const t = tastes(), w = T.why(t.me, f, 2), x = o && t.other && !fSeen(f, o) ? T.score(t.other, f) : null; return w.length || x != null ? `<div class="fwhy">${w.map(s => `<span>${esc(s)}</span>`).join('')}${x != null && x > 1.2 ? `<span class="for">${esc(nameOf(o))} a de bonnes chances d’aimer</span>` : ''}</div>` : ''; })()}
      ${f.status !== 'vu' ? `<button class="btn ghost small fcal" data-action="cine-cal" data-id="${f.id}">${icn('cal')} Prévoir une soirée</button>` : ''}
      <label class="chip-label" for="f-pq">Pourquoi tu l’as ajouté</label><input class="field fpq" id="f-pq" data-id="${f.id}" value="${esc(f.pourquoi?.[S.me] || '')}" placeholder="Recommandé par…, vu dans une interview…" maxlength="140">
      ${Object.entries(f.pourquoi || {}).filter(([e, t]) => e !== S.me && t).map(([e, t]) => `<p class="fpq-o">« ${esc(t)} » <small>${esc(nameOf(e))}</small></p>`).join('')}
      <div class="form-actions fsheet-acts">${acts}${heart}</div>
      <div class="form-actions"><button class="btn ghost small" data-action="sheet-close">Fermer</button>${fVotes(f)[S.me] || !othersOn(f) ? `<button class="link" data-action="cine-del" data-id="${f.id}">${othersOn(f) ? 'Retirer de ma liste' : 'Retirer de la liste'}</button>` : ''}</div></div>`;
    box.addEventListener('click', e => { if (e.target === box) closeTicket(); });
    document.body.appendChild(box); requestAnimationFrame(() => box.classList.add('on'));
  };
  draw(); haptic(1);
  // fiche incomplète (ajoutée depuis le match) : on va chercher les détails, puis on redessine
  if (f.tmdb_id && f.runtime == null && f.seasons == null && !f._enriching) {
    f._enriching = true;
    const full = await filmEnrich(f);
    const patch = Object.fromEntries(['runtime', 'seasons', 'genres', 'director', 'providers', 'trailer', 'overview', 'poster'].filter(k => full[k] != null && JSON.stringify(full[k]) !== JSON.stringify(f[k])).map(k => [k, full[k]]));
    if (Object.keys(patch).length) { Object.assign(f, patch); api.update('films', { id: f.id }, patch).catch(() => {}); if (document.querySelector('.fsheet')) draw(); }
  }
}
function cineRate(id, solo = false) {
  const f = S.films.find(x => x.id === id); if (!f) return;
  const mine = f.ratings?.[S.me] || {}; let note = mine.note || 0;
  document.getElementById('ticket')?.remove();
  const box = document.createElement('div'); box.id = 'ticket';
  const draw = () => {
    box.innerHTML = `<div class="ticket-card fsheet frate-sheet" role="dialog" aria-label="Alors ?">${fPoster(f, 'rateposter')}<p class="ticket-title">Alors, ${esc(f.title)} ?</p><p class="ticket-sub">${solo ? 'Tu l’as déjà vu : ta note apprend à Azami ce que tu aimes, et ce que tu n’aimes pas.' : 'Ta note et un petit mot, pour votre journal à deux.'}</p>
      <div class="hearts-pick">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-n="${n}" aria-label="${n} sur 5" aria-pressed="${n <= note}">${n <= note ? '♥' : '♡'}</button>`).join('')}</div>
      <textarea class="area" id="f-mot" placeholder="Un petit mot (facultatif) : la scène préférée, ce qui t’a fait rire…">${esc(mine.mot || '')}</textarea>
      <div class="form-actions"><button class="btn ghost" data-action="sheet-close">Annuler</button><button class="btn" data-r="ok" ${note ? '' : 'disabled'}>Enregistrer</button></div></div>`;
  };
  draw();
  box.addEventListener('click', async e => {
    if (e.target === box) { closeTicket(); return; }
    const h = e.target.closest('[data-n]'); if (h) { const mot = box.querySelector('#f-mot')?.value; note = Number(h.dataset.n); haptic(1); draw(); box.querySelector('#f-mot').value = mot; return; }
    if (e.target.closest('[data-r="ok"]')) {
      const ratings = { ...(f.ratings || {}), [S.me]: { note, mot: box.querySelector('#f-mot').value.trim() } };
      const back = filmBefore(f, ['ratings', 'seen', 'status', 'seen_at']);
      if (solo) { const patch = { ratings, seen: { ...(f.seen || {}), [S.me]: true } }; Object.assign(f, patch); closeTicket(); run(() => api.update('films', { id: f.id }, patch), 'Noté, Azami s’en souviendra').then(ok => ok && cineUndo(`${f.title} : noté`, [back])); return; }
      const first = f.status !== 'vu';
      const patch = { ratings, status: 'vu', ...(first ? { seen_at: new Date().toISOString() } : {}) };
      Object.assign(f, patch); closeTicket();
      run(() => api.update('films', { id: f.id }, patch), first ? 'Dans votre journal du ciné' : 'Note enregistrée').then(ok => { if (ok) cineUndo(`${f.title} : vu`, [back]); if (ok && first) { sfx('done'); setTimeout(() => visitMaybe('cine', 2), 1500); } });
    }
  });
  document.body.appendChild(box); requestAnimationFrame(() => box.classList.add('on'));
}
// « On regarde quoi ce soir ? » : la machine à capsules, dans votre liste (les matchs pèsent plus lourd).
// Les humeurs du soir : on pioche dans les tons (lus par Azami), sinon dans les genres.
const HUMEURS = { leger: [['feel-good', 'drôle', 'lumineux', 'chaleureux', 'tendre'], [35, 10751, 16]], intense: [['haletant', 'nerveux', 'violent', 'déchirant', 'épique'], [53, 28, 80, 10752]],
  contemplatif: [['contemplatif', 'poétique', 'mélancolique', 'minimaliste', 'intimiste'], [18]], frisson: [['angoissant', 'glaçant', 'malaisant', 'mystérieux'], [27, 53, 9648]], rire: [['drôle', 'absurde', 'humour noir', 'satirique'], [35]] };
const humeurOk = (f, h) => { const H = HUMEURS[h]; if (!H) return true; return f.tons?.tons?.length ? f.tons.tons.some(t => H[0].includes(t)) || (h === 'contemplatif' && f.tons.rythme === 'lent') : (f.gids || []).some(g => H[1].includes(g)); };
function cineSoir(kind = S.soirKind || '', mood = S.soirMood || '') {
  S.soirKind = kind; S.soirMood = mood;
  const L = cineLists();
  let pool = [...L.nous, ...L.enCours.filter(f => f.media === 'tv')];
  if (pool.length < 3) pool.push(...cineCompromis().slice(0, 5).map(x => x.f).filter(f => !pool.includes(f)));
  if (mood) pool = pool.filter(f => humeurOk(f, mood));
  if (kind === 'court') pool = pool.filter(f => f.media === 'movie' && (!f.runtime || f.runtime <= 105));
  if (kind === 'film') pool = pool.filter(f => f.media === 'movie');
  if (kind === 'serie') pool = pool.filter(f => f.media === 'tv');
  if (kind === 'chez') pool = pool.filter(fDispo);
  document.getElementById('ticket')?.remove();
  const box = document.createElement('div'); box.id = 'ticket';
  box.innerHTML = `<div class="ticket-card roulette" role="dialog" aria-label="On regarde quoi ?"><p class="ticket-title">On regarde quoi ce soir ?</p>
    <div class="chips cine-kinds cine-moods">${[['', 'Toute humeur'], ['leger', 'Léger'], ['rire', 'Rire'], ['intense', 'Intense'], ['frisson', 'Frisson'], ['contemplatif', 'Contemplatif']].map(([k, l]) => `<button type="button" data-m="${k}" aria-pressed="${mood === k}">${l}</button>`).join('')}</div>
    <div class="chips cine-kinds">${[['', 'Peu importe'], ['chez', 'Dispo chez nous'], ['court', 'Un film court'], ['film', 'Un film'], ['serie', 'Une série']].map(([k, l]) => `<button type="button" data-k="${k}" aria-pressed="${kind === k}">${l}</button>`).join('')}</div><div class="roulette-stage"></div></div>`;
  box.addEventListener('click', e => { if (e.target === box) closeTicket(); const k = e.target.closest('[data-k]'); if (k) cineSoir(k.dataset.k, mood); const m = e.target.closest('[data-m]'); if (m) cineSoir(kind, m.dataset.m); });
  document.body.appendChild(box); requestAnimationFrame(() => box.classList.add('on'));
  const stage = box.querySelector('.roulette-stage');
  if (!pool.length) { stage.innerHTML = '<p class="ticket-sub">Rien en commun pour ça. Lancez Cinder chacun de votre côté pour trouver vos films à deux !</p>'; return; }
  const t = tastes();
  const w = f => (fMatch(f) ? 3 : 1) * (S.members.some(m => fVotes(f)[m.email] === 'super') ? 2 : 1) * (f.status === 'en_cours' ? 2 : 1) * (fDispo(f) ? 2 : 1) * (t.other ? Math.exp(Math.max(-1.5, Math.min(1.5, T.scoreBoth(t.me, t.other, f, t.couple, .2) / 3))) : 1);
  const tot = pool.reduce((a, f) => a + w(f), 0); let x = Math.random() * tot, pick = pool[0];
  for (const f of pool) { x -= w(f); if (x <= 0) { pick = f; break; } }
  stage.innerHTML = `<div class="gacha r1" style="--k:#E7505A"><button type="button" class="gacha-cap" aria-label="Ouvrir la capsule"><span class="cap-top"></span><span class="cap-bot"></span><span class="cap-shine"></span></button><p class="gacha-hint">Touche la capsule !</p></div>`;
  if (SOUNDS && audioCtx?.state === 'running') scheduleBruits(audioCtx, [['manivelle', 0], ['capsule', .55]], audioCtx.currentTime + .02, .5);
  stage.querySelector('.gacha-cap').addEventListener('click', () => {
    const g = stage.querySelector('.gacha'); if (g.classList.contains('open')) return;
    g.classList.add('open'); haptic('heavy');
    if (SOUNDS && audioCtx?.state === 'running') scheduleBruits(audioCtx, [['pop_capsule', 0]], audioCtx.currentTime + .01, .55);
    setTimeout(() => {
      sfx('done');
      g.insertAdjacentHTML('beforeend', `<div class="gacha-card roulette-card cine-pick" style="--k:#E7505A">${fPoster(pick, 'rposter')}<b class="gacha-txt">${esc(pick.title)}</b><span class="gacha-count">${esc(fMeta(pick))}${fProg(pick) ? ` · ${fProg(pick)}` : ''}</span>${fMatch(pick) ? `<span class="fbadge match">${icn('deux')} Vous deux</span>` : pick.status === 'a_voir' ? '<span class="fbadge">Un compromis</span>' : ''}${fWhereLine(pick)}</div>
        <div class="form-actions roulette-actions"><button class="btn" data-action="cine-watch" data-id="${pick.id}">On regarde ça !</button><button class="btn ghost" data-again="1">Un autre</button></div>`);
      g.querySelector('[data-again]').addEventListener('click', () => cineSoir(kind));
      burst('sparkle', g.querySelector('.gacha-card'), 12);
    }, 380);
  });
}
// Les titres ajoutés sans fiche (liste importée) : on cherche la bonne fiche TMDB, en douceur, quelques-uns à la fois.
async function filmsResolve() {
  if (filmsResolve.busy || DEMO) return; if (Date.now() - (filmsResolve.at || 0) < 5 * 60e3) return;
  filmsResolve.busy = true; filmsResolve.at = Date.now();
  try {
    const st = await filmsCall({ action: 'status' }); S.filmsTmdb = !!st.tmdb; if (!st.tmdb) return;
    const KEYS = ['original', 'year', 'poster', 'overview', 'runtime', 'seasons', 'genres', 'director', 'providers', 'trailer'];
    const todo = S.films.filter(f => !f.tmdb_id || !f.poster);
    for (let i = 0; i < todo.length; i += 20) {
      const part = todo.slice(i, i + 20);
      const r = (await filmsCall({ action: 'resolve', items: part.map(f => ({ title: f.title, media: f.media, year: f.year })) }).catch(() => ({}))).results || [];
      for (const [j, f] of part.entries()) {
        const d = r[j]; if (!d?.tmdb_id || !d.poster && f.tmdb_id) continue;
        if (S.films.some(x => x !== f && x.tmdb_id === d.tmdb_id && x.media === f.media)) continue;
        const patch = { tmdb_id: d.tmdb_id, ...(d.traits ? { traits: d.traits, gids: d.gids || [], lang: d.lang || null, note: d.note || null } : {}), ...Object.fromEntries(KEYS.filter(k => d[k] != null && (k === 'poster' || f[k] == null || (Array.isArray(f[k]) && !f[k].length))).map(k => [k, d[k]])) };
        Object.assign(f, patch); api.update('films', { id: f.id }, patch).catch(() => {});
      }
      if (S.view === 'nuit' && !document.querySelector('#ticket, #deck') && document.activeElement?.id !== 'cine-q') render();
    }
    const gs = S.gouts.filter(g => g.seed_q && !g.seed_tmdb);
    if (gs.length) {
      const r = (await filmsCall({ action: 'resolve', items: gs.map(g => ({ title: g.seed_q, media: g.seed_media, year: g.seed_year })) }).catch(() => ({}))).results || [];
      gs.forEach((g, j) => { if (r[j]?.tmdb_id) { g.seed_tmdb = r[j].tmdb_id; api.update('gouts', { id: g.id }, { seed_tmdb: g.seed_tmdb }).catch(() => {}); } });
    }
    // les notes presse et public (MDBList) des films qui n'en ont pas encore : un petit lot à chaque passage
    if (S.films.some(f => f.tmdb_id && !f.presse) && !(filmsResolve.quota < 150)) {
      const r = await filmsCall({ action: 'presse', n: 40 }).catch(() => null);
      if (r) { filmsResolve.quota = r.quota; if (r.faits || r.sans) { const rows = await api.list('films').catch(() => []); const by = new Map(rows.map(x => [x.id, x])); for (const f of S.films) if (!f.presse && by.get(f.id)?.presse) f.presse = by.get(f.id).presse; } }
    }
    // palmarès, presse titre par titre et tons : un petit lot de chaque à chaque passage
    const need = { palmares: S.films.some(f => f.tmdb_id && !f.palmares), critiques: S.films.some(f => f.media === 'movie' && f.palmares?.allo && !f.critiques), tons: S.films.some(f => f.palmares && !f.tons) };
    if (need.tons && filmsResolve.tons == null) filmsResolve.tons = !!(await srcCall({ action: 'status' }).catch(() => ({}))).tons;
    let got = false;
    for (const [action, n] of [['palmares', 200], ['critiques', 40], ['tons', 30]]) {
      if (!need[action] || (action === 'tons' && !filmsResolve.tons)) continue;
      const r = await srcCall({ action, n }).catch(() => null); if (r?.faits || r?.sans) got = true;
    }
    if (got) { const rows = await api.list('films').catch(() => []); const by = new Map(rows.map(x => [x.id, x])); for (const f of S.films) { const x = by.get(f.id); if (x) for (const k of ['palmares', 'critiques', 'tons']) if (!f[k] && x[k]) f[k] = x[k]; } }
    // les traits qui nourrissent le goût (équipe, thèmes, durée, succès, public) : une fois pour toutes
    const bare = S.films.filter(f => f.tmdb_id && !f.traits);
    for (let i = 0; i < bare.length; i += 4) {
      await Promise.all(bare.slice(i, i + 4).map(async f => { const d = await filmEnrich(f); if (!d.traits) return; const patch = { traits: d.traits, gids: d.gids || [], lang: d.lang || null, note: d.note || null, ...(f.original ? {} : { original: d.original || null }) }; Object.assign(f, patch); api.update('films', { id: f.id }, patch).catch(() => {}); }));
    }
    if (bare.length) tasteMemo = null;
    // de temps en temps, les plateformes changent : on rafraîchit les fiches de plus d'une semaine
    const old = S.films.filter(f => f.tmdb_id && f.status !== 'vu' && Date.now() - new Date(f.checked_at || f.created_at || 0).getTime() > 7 * 864e5).slice(0, 6);
    for (const f of old) { const d = await filmEnrich(f); const patch = { providers: d.providers || [], checked_at: new Date().toISOString() }; Object.assign(f, patch); api.update('films', { id: f.id }, patch).catch(() => {}); }
    if (!S.cineIdeas?.length) cineIdeas(true);
  } catch (e) { console.warn('films', e); } finally { filmsResolve.busy = false; }
}
// Les idées d'Azami : ce qui ressemble à ce que vous avez aimé. Gardées 12 h (sur ce téléphone), puis renouvelées ;
// et quand vous ajoutez ou notez des films, elles se rafraîchissent. Le bouton ↻ en demande d'autres tout de suite.
async function cineIdeas(force = false) {
  S.cineIdeasAsked = true;
  const sig = S.films.length + ':' + S.films.filter(f => (f.coeur || []).length || Object.keys(f.ratings || {}).length).length;
  if (!force) { try { const c = JSON.parse(safeGet('maison-idees') || 'null'); if (c && Date.now() - c.at < 12 * 3600e3 && c.sig === sig) {  const have = new Set(myKeys()); S.cineIdeas = c.items.filter(x => !have.has(fkey(x))); if (S.cineIdeas.length >= 4) return; } } catch {} }
  await new Promise(r => setTimeout(r, force ? 0 : 1200));
  const seeds = cineSeeds(5);
  if (!seeds.length && !S.films.some(f => f.traits)) return;
  try {
    const t0 = tastes(), pm = t0.me ? T.prefs(t0.me) : {};
    const r = await filmsCall({ action: 'deck', seeds, subs: S.subs, prefs: pm, exclude: [...myKeys(), ...(S.cineIdeasSeen || [])] });
    const items = r.results || [], t = tastes(items);
    S.cineIdeas = T.order(items.filter(f => !T.banned(t.me, f)), f => (t.other ? T.scoreBoth(t.me, t.other, f, t.couple) * .5 : 0) + T.score(t.me, f) * .5, 16);
    S.cineIdeasSeen = [...(S.cineIdeasSeen || []), ...S.cineIdeas.map(fkey)].slice(-80);
    safeSet('maison-idees', JSON.stringify({ at: Date.now(), sig, items: S.cineIdeas }));
    if (S.view === 'nuit' && !document.querySelector('#ticket, #deck') && document.activeElement?.id !== 'cine-q') render();
  } catch {}
}

function viewCare() {
  const o = other();
  const inbox = S.care.filter(c => c.recipient === S.me).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const unread = inbox.filter(c => !c.read_at);
  const read = inbox.filter(c => c.read_at);
  const sent = S.care.filter(c => c.author === S.me).sort((a, b) => b.created_at.localeCompare(a.created_at));

  const letter = c => {
    const opened = S.openLetter === c.id;
    const head = `<img class="l-icon" src="icons/themes/care_${esc(['merci', 'besoin', 'poids', 'envie', 'tendresse'].includes(c.kind) ? c.kind : 'merci')}.webp" alt="" width="40" height="40"><span class="l-from">${esc(careKind(c.kind) || 'Un mot')} de ${esc(nameOf(c.author))}</span><span class="l-meta">${esc(ago(c.created_at))}${c.read_at ? '' : ', pas encore ouvert'}</span>`;
    if (!opened) return `<button class="letter ${c.read_at ? '' : 'sealed'}" data-action="letter-open" data-id="${c.id}" aria-expanded="false">${head}</button>`;
    return `<div class="letter" aria-live="polite">${head}<div class="letter-body">${esc(c.body)}</div>
      ${c.wants_talk ? `<div class="talk">${esc(nameOf(c.author))} aimerait qu'on en parle.</div>` : ''}
      <div><button class="link" data-action="letter-close">Refermer</button></div></div>`;
  };

  const tab = S.loisirTab || 'cine';
  const tabs = `<div class="seg loisirs-tabs" role="tablist" aria-label="Loisirs">${[['cine', `${icn('popcorn')} Ciné`], ['mots', `${icn('lettre')} Petits mots`], ['carnet', `${icn('carnet')} Carnet d’Azami`]].map(([k, l]) => `<button role="tab" data-action="loisir-tab" data-t="${k}" aria-pressed="${tab === k}" aria-selected="${tab === k}">${l}${k === 'mots' && unread.length ? ` <b class="nb">${unread.length}</b>` : ''}</button>`).join('')}</div>`;
  const waiting = unread.length && tab !== 'mots' ? `<button class="mot-attend" data-action="loisir-tab" data-t="mots"><img src="icons/themes/care_${esc(['merci', 'besoin', 'poids', 'envie', 'tendresse'].includes(unread[0].kind) ? unread[0].kind : 'merci')}.webp" alt="" width="34" height="34"><span>${unread.length > 1 ? `${unread.length} mots t’attendent` : `Un mot de ${esc(nameOf(unread[0].author))} t’attend`}</span><b aria-hidden="true">›</b></button>` : '';
  if (tab === 'cine') return `${tabs}${waiting}${cineSection()}`;
  if (tab === 'carnet') return `${tabs}${waiting}${carnetSection()}`;
  return `${tabs}
    <section class="mots" id="mots"><h2 class="first">Ta boîte aux lettres</h2>
    ${unread.length ? `<div class="letters">${unread.map(letter).join('')}</div>` : emptyArt('vide_care', 'Aucun mot en attente.')}
    ${read.length ? `<details class="fold" data-fold="read" ${read.some(c => c.id === S.openLetter) ? 'open' : ''}><summary>Mots déjà lus (${read.length})</summary><div class="letters">${read.map(letter).join('')}</div></details>` : ''}

    <h2>Écrire à ${esc(nameOf(o))}</h2>
    <form class="form" data-form="care">
      ${chipGroup('care-kind', CARE_KINDS, 'merci')}
      <label class="sr" for="care-body">Ton mot</label>
      <textarea class="area mt" id="care-body" data-keep name="body" placeholder="Ce que tu n'oses pas dire en face…" required></textarea>
      <button type="button" class="link" data-action="care-help">Aide pour formuler</button>
      <label class="check"><input type="checkbox" id="care-talk" data-keep name="talk"> J'aimerais qu'on en parle</label>
      <div class="form-actions"><button class="btn" type="submit">Déposer dans sa boîte</button></div>
    </form>

    ${sent.length ? `<details class="fold" data-fold="sent"><summary>Tes mots envoyés (${sent.length})</summary><ul class="list sent">${sent.map(c => `
      <li class="item"><div class="item-main"><div class="item-title">${esc(c.body.length > 90 ? c.body.slice(0, 90) + '…' : c.body)}</div>
      <div class="item-meta">${esc(ago(c.created_at))}, ${c.read_at ? 'lu' : 'pas encore lu'}</div></div>
      <button class="link" data-action="care-delete" data-id="${c.id}">Retirer</button></li>`).join('')}</ul></details>` : ''}
    </section>`;
}


// Actions --------------------------------------------------------------------

const actions = {

  'guide-page': () => openGuidePage(),
  'guide-tour': () => { closeTicket(); openTour(0); },
  'guide-hint-off': () => { tipSave('page:' + guideKey()); render(); },
  'guide-reset': () => { S.tips = S.tips?.azami ? { azami: S.tips.azami } : {}; tipSave('tour', false); openTour(0); },

  'calm-on': () => { const o = overload(); setCalm({ on: true, auto: false, since: Date.now(), start: o.late.length }); S.calmExit = false; haptic(1); render(); window.scrollTo(0, 0); },
  'calm-off': () => { setCalm({ on: false, offDay: isoDate(new Date()) }); haptic(1); render(); },
  'calm-exit-seen': () => { S.calmExit = false; render(); },
  'calm-skip': el => { S.calmSkip = [...S.calmSkip.filter(x => x !== el.dataset.id), el.dataset.id]; haptic(1); render(); },
  'calm-snooze': () => {
    const list = myPending().filter(x => x.p !== 'later' ? false : true);
    const todo = myPending().filter(x => x.p !== 'later');
    const rest = [...todo.slice(3), ...list].filter(x => x.p !== 'vital');
    if (!rest.length) return;
    const until = isoDate(new Date(Date.now() + 3 * DAY));
    undoable(`${pl(rest.length, 'chose repoussée', 'choses repoussées')}`, rest.map(x => ({ t: x.kind === 'task' ? 'tasks' : 'chores', id: x.row.id, row: { snooze_until: x.row.snooze_until || null } })),
      async () => { for (const x of rest) await api.update(x.kind === 'task' ? 'tasks' : 'chores', { id: x.row.id }, { snooze_until: until }); }, 'Repoussé de 3 jours. On s’en occupe plus tard.');
  },
  'help-open': el => openHelp(el.dataset.kind, el.dataset.id),
  'visite-replay': el => visitOpen(el.dataset.id, true),
  'loisir-tab': el => { S.loisirTab = el.dataset.t; safeSet('maison-loisir', S.loisirTab); haptic(1); render();
    const bar = document.querySelector('.loisirs-tabs'); if (bar) { const top = bar.getBoundingClientRect().top + window.scrollY - 6; if (window.scrollY > top) window.scrollTo(0, top); } },
  'cine-coeur': el => { const f = S.films.find(x => x.id === el.dataset.id); if (!f) return; cineUndo(`${f.title} : coup de cœur`, [filmBefore(f, ['coeur'])]); const c = new Set(f.coeur || []); c.has(S.me) ? c.delete(S.me) : c.add(S.me); f.coeur = [...c]; haptic(1); if (c.has(S.me)) sfx('tick');
    api.update('films', { id: f.id }, { coeur: f.coeur }).catch(() => toast('Pas enregistré.')); cineOpen(f.id); render(); },
  'cine-propose': el => { const f = S.films.find(x => x.id === el.dataset.id); if (!f) return; closeTicket(); const back = filmBefore(f, ['status', 'votes']); const patch = { status: 'a_voir', votes: { ...fVotes(f), [S.me]: 'oui' } }; Object.assign(f, patch); S.cineTab = 'a_voir'; haptic('medium'); sfx('tick');
    run(() => api.update('films', { id: f.id }, patch), 'Dans ta liste').then(ok => { if (ok) cineUndo(`${f.title} : proposé`, [back]); if (fMatch(f)) filmMatchParty(f); }); },
  'gout-add': () => { const t = document.getElementById('gout-t'), k = S.goutKind || 'livre'; const title = t?.value.trim(); if (!title) { t?.focus(); return; }
    const row = { email: S.me, kind: k, title }; S.gouts.push({ ...row, id: 'tmp' + Date.now() }); t.value = ''; haptic(1); let nid = null; run(() => api.insert('gouts', row).then(r => { nid = r?.id; }), 'Ajouté à tes goûts').then(ok => ok && nid && cineUndo(`${title} ajouté`, [], [['gouts', nid]])); },
  'gout-del': el => { const g = S.gouts.find(x => x.id === el.dataset.id); S.gouts = S.gouts.filter(x => x !== g); run(() => api.remove('gouts', { id: el.dataset.id }), 'Retiré').then(ok => ok && g && cineUndo(`${g.title} retiré`, [{ t: 'gouts', gone: true, row: g }])); },
  'cine-ideas-more': () => { haptic(1); S.cineIdeas = []; render(); cineIdeas(true); },
  'sub-toggle': el => { const k = el.dataset.k; const old = [...S.subs]; cineUndo('abonnement changé', [], [], () => { S.subs = old; api.upsert('reglages', { cle: 'abonnements', valeur: old }).catch(() => {}); render(); }); S.subs = S.subs.includes(k) ? S.subs.filter(x => x !== k) : [...S.subs, k]; haptic(1); render(); api.upsert('reglages', { cle: 'abonnements', valeur: S.subs }).catch(() => toast('Pas enregistré.')); },
  'salle-add': async el => { const x = S.salles?.[Number(el.dataset.i)]; if (!x) return; el.disabled = true; haptic('medium');
    try { const t = x.title.replace(/\s*\((19|20)\d{2}\)\s*/, ' ').trim(); const r = DEMO ? { results: FILM_DEMO.filter(f => nt(f.title) === nt(t)) } : await filmsCall({ action: 'resolve', items: [{ title: t.split(' (')[0], media: 'movie', year: x.year }] }); const d = r.results?.[0];
      const saved = await filmVote(d?.tmdb_id ? d : { title: t, media: 'movie', year: x.year || null }, 'oui', false); toast(`${saved.title} : dans ta liste`); sfx('tick'); render(); if (fMatch(saved)) filmMatchParty(saved); } catch (e) { console.warn(e); toast('Pas réussi à l’ajouter.'); el.disabled = false; } },
  'taste-test': () => deckOpen('test'),
  'cine-sort': el => uiMenu(el, [{ h: 'Afficher' }, ...CM.map(([k, l]) => ['m:' + k, l]), { h: 'Trier par' }, ...CS.map(([k, l]) => ['s:' + k, l])], ['m:' + (S.cineM || ''), 's:' + (S.cineS || 'envie')], k => { const [g, v] = [k.slice(0, 1), k.slice(2)]; if (g === 'm') S.cineM = v; else S.cineS = v; S.cineMore = null; render(); }),
  'pk-open': el => pickOpen(el),
  'gout-kind': el => { S.goutKind = el.dataset.k; el.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === el)); haptic(1); document.getElementById('gout-t')?.focus(); },
  'cine-f': el => { S.cineF = el.dataset.k; S.cineMore = null; haptic(1); render(); },
  'cine-more': el => { S.cineMore = el.dataset.w; render(); },
  'cine-menage': () => menageOpen(),
  'cine-cal': el => cineCal(el.dataset.id),
  'soiree': () => soireeSheet(),
  'lb-import': () => lbPick(),
  'taste-rule': el => tasteRule(el.dataset.k, el.dataset.l),
  'taste-rule-del': el => setRule(el.dataset.k, null),
  'cine-space': el => { S.cineSpace = el.dataset.s; safeSet(SPACE_KEY, S.cineSpace); haptic(1); render(); },
  'cine-nope': el => { const f = S.films.find(x => x.id === el.dataset.id); if (!f) return; closeTicket(); filmVote(f, 'non', false).then(() => { toast('Noté : pas pour toi.'); render(); cineUndo(...(filmVote.undo || ['bof', [], []])); }); },
  'cine-iseen': el => cineRate(el.dataset.id, true),
  'moi-tab': el => { S.cineMoi = el.dataset.t; haptic(1); render(); },
  'vus-sort': el => { S.vusS = el.dataset.s; S.vusMax = 40; haptic(1); render(); },
  'vus-more': () => { S.vusMax = (S.vusMax || 40) + 60; render(); },
  'cine-tab': el => { S.cineTab = el.dataset.t; S.cineSpace = 'nous'; haptic(1); render(); },
  'cine-deck': () => deckOpen(),
  'cine-soir': () => cineSoir(),
  'cine-open': el => cineOpen(el.dataset.id),
  'cine-pick': async el => { const f = Array.isArray(S.cineRes) && S.cineRes[Number(el.dataset.i)]; if (!f) return; el.disabled = true; haptic('medium');
    try { const saved = await filmVote(f, 'oui'); cineUndo(...(filmVote.undo || ['ajout', [], []])); S.cineQ = ''; S.cineRes = null; const qi = document.getElementById('cine-q'); if (qi) qi.value = ''; S.cineSpace = 'moi'; toast(`${saved.title} : dans ta liste`); sfx('tick'); render(); if (fMatch(saved)) filmMatchParty(saved); } catch (e) { console.warn(e); toast('Pas réussi à l’ajouter. Réessaie.'); el.disabled = false; } },
  'cine-idea': async el => { const f = S.cineIdeas?.[Number(el.dataset.i)]; if (!f) return; haptic('medium'); S.cineIdeas = S.cineIdeas.filter(x => x !== f); try { const saved = await filmVote(f, 'oui'); toast(`${saved.title} : dans ta liste`); render(); cineUndo(...(filmVote.undo || ['ajout', [], []])); } catch { toast('Pas réussi à l’ajouter.'); } },
  'cine-want': async el => { const f = S.films.find(x => x.id === el.dataset.id); if (!f) return; closeTicket(); const saved = await filmVote(f, 'oui'); render(); cineUndo(...(filmVote.undo || ['envie', [], []])); if (fMatch(saved)) filmMatchParty(saved); else toast('Dans ta liste'); },
  'cine-watch': el => { const f = S.films.find(x => x.id === el.dataset.id); if (!f) return; closeTicket(); const back = filmBefore(f, ['status', 'season', 'episode']); const patch = { status: 'en_cours', ...(f.media === 'tv' && !f.season ? { season: 1, episode: 1 } : {}) }; Object.assign(f, patch); S.cineTab = 'en_cours'; S.cineSpace = 'nous'; haptic('medium'); sfx('tick'); run(() => api.update('films', { id: f.id }, patch), 'Bon film !').then(ok => ok && cineUndo(`${f.title} : on le regarde`, [back])); },
  'cine-ep': el => { const f = S.films.find(x => x.id === el.dataset.id); if (!f) return; let season = f.season || 1, episode = (f.episode || 1) + 1;
    const eps = f.episodes; if (Array.isArray(eps) && eps[season - 1] && episode > eps[season - 1]) { season++; episode = 1; }
    cineUndo(`${f.title} : S${season} · É${episode}`, [filmBefore(f, ['season', 'episode'])]);
    Object.assign(f, { season, episode }); haptic(1); sfx('tick'); closeTicket(); render(); api.update('films', { id: f.id }, { season, episode }).catch(() => {}); },
  'cine-seen': el => cineRate(el.dataset.id),
  'cine-del': el => {
    const f = S.films.find(x => x.id === el.dataset.id); if (!f) return; closeTicket();
    // un film que l'autre a aussi jugé (envie, note, coup de cœur…) reste à lui : on ne retire que ton avis
    if (othersOn(f)) { if (!fVotes(f)[S.me]) return; const before = filmBefore(f, ['votes']), votes = { ...fVotes(f) }; delete votes[S.me]; f.votes = votes; render();
      run(() => api.update('films', { id: f.id }, { votes }), 'Retiré de ta liste').then(ok => ok && cineUndo(`${f.title} retiré de ta liste`, [before])); return; }
    S.films = S.films.filter(x => x !== f); run(() => api.remove('films', { id: f.id }), 'Retiré').then(ok => ok && cineUndo(`${f.title} retiré`, [{ t: 'films', gone: true, row: filmRow(f) }])); },
  'recap-ok': el => { safeSet('maison-recap-vu', el.dataset.k); sfx('merci'); burst('hearts', el, 10); haptic('medium'); setTimeout(render, 350); },
  roulette: () => { haptic(1); rouletteOpen(); },
  'roulette-again': () => { const b = document.getElementById('ticket'); if (b) rouletteSpin(b); },
  'roulette-go': el => { closeTicket(); S.recette = el.dataset.id; S.cook = null; render(); window.scrollTo(0, 0); },
  'carnet-kind': el => { S.carnetKind = el.dataset.k || ''; S.carnetMore = 0; haptic(1); sfx('tick'); render(); },
  'carnet-more': () => { S.carnetMore = (S.carnetMore || 0) + 1; haptic(1); render(); },
  'carnet-locked': el => { haptic(1); el.classList.remove('wiggle'); void el.offsetWidth; el.classList.add('wiggle'); toast('Pas encore découverte. Azami viendra la raconter un jour.'); },
  'carnet-other': () => { haptic(1); toast(`Celle-ci, Azami l’a racontée à ${nameOf(other())}. Elle est dans votre carnet à deux.`); },
  'carnet-palier': el => { const p = PALIERS.find(x => String(x[0]) === el.dataset.at); if (!p) return; const n = carnetCount(); haptic(1); toast(n >= p[0] ? `${p[1]} : ${p[2]}` : `${p[1]} : à ${p[0]} visites (encore ${p[0] - n}).`); },
  nudge: el => {
    const kind = el.dataset.kind, id = el.dataset.id;
    const row = kind === 'task' ? S.tasks.find(t => t.id === id) : S.chores.find(c => c.id === id);
    const o = row && nudgeWho(kind, row); if (!o) return;
    const n = nudgeOf(id);
    if (n && Date.now() - new Date(n.created_at).getTime() < 3600000) { haptic(1); toast(`Déjà rappelé ${ago(n.created_at)}. ${nameOf(o)} a reçu la notification.`); return; }
    const label = /^vaisselle$/i.test(row.title.trim()) ? 'Vaisselle à la main' : row.title;
    haptic('medium'); S.open = null;
    const shared = nudgeShared(kind, row);
    run(async () => { const r = await api.insert('help_requests', { from_email: S.me, to_email: o, item_kind: kind, item_id: id, label, ask: shared ? 'penser' : 'rappel' }); await pingHelp(r?.id); },
      shared ? `C’est envoyé : ${nameOf(o)} va y penser avec toi.` : `Rappel envoyé à ${nameOf(o)}.`, 'nudge-' + id);
  },
  'help-send': el => {
    const kind = el.dataset.kind || null, id = el.dataset.id || null;
    const row = kind === 'task' ? S.tasks.find(t => t.id === id) : kind === 'chore' ? S.chores.find(c => c.id === id) : null;
    const label = row ? (/^vaisselle$/i.test(row.title.trim()) ? 'Vaisselle à la main' : row.title) : null;
    closeTicket(); haptic('medium');
    run(async () => { const r = await api.insert('help_requests', { from_email: S.me, to_email: other(), item_kind: kind, item_id: id, label, ask: el.dataset.ask }); await pingHelp(r?.id); },
      `Demandé à ${nameOf(other())}. Tu n’es pas seul·e.`).then(ok => { if (ok) react('coup_de_main', document.querySelector('.hd .azami')); });
  },
  'help-answer': el => {
    const h = S.help.find(x => x.id === el.dataset.id); if (!h) return;
    const status = el.dataset.s; haptic(status === 'non' ? 1 : 'medium');
    run(async () => {
      await api.update('help_requests', { id: h.id }, { status, answered_at: new Date().toISOString() });
      // « Je m'en occupe » : la chose passe à moi.
      if (status === 'pris' && h.item_id) {
        if (h.item_kind === 'task') await api.update('tasks', { id: h.item_id }, { assignee: S.me });
        if (h.item_kind === 'chore') { const c = S.chores.find(x => x.id === h.item_id); if (c && !seqOf(c)) await api.update('chores', { id: h.item_id }, { turn: S.me }); }   // le lave-vaisselle reste à vous deux (notification aux deux quand il est fini)
      }
      await pingHelp(h.id);
    }, status === 'non' ? 'Réponse envoyée.' : status === 'ensemble' ? 'Vous le ferez ensemble.' : 'Merci, c’est noté pour toi.').then(ok => { if (ok && status !== 'non') react('aide_acceptee', document.querySelector('.hd .azami')); });
  },
  'help-seen': el => { S.helpSeen.add(el.dataset.id); render(); },

  gloss: el => openGloss(el.dataset.k),
  'gear-set': el => { const has = el.dataset.has === '1'; S.gear[el.dataset.id] = has; haptic(1); render(); api.upsert('kitchen_gear', { id: el.dataset.id, has, updated_by: S.me }).catch(e => console.warn('matériel', e)); },

  'r-vege': () => { safeSet('maison-vege', VEGE_ON() ? '0' : '1'); haptic(1); render(); },

  'fresh-shift': el => {
    const x = S.pantry.find(p => p.id === el.dataset.id); if (!x) return;
    const d = new Date(x.expires_on + 'T12:00'); d.setDate(d.getDate() + Number(el.dataset.d)); x.expires_on = isoDate(d);
    // on retient la durée corrigée pour ce type de produit
    const total = Math.round((d.getTime() - new Date(isoDate(new Date(x.bought_at || Date.now())) + 'T12:00').getTime()) / DAYMS);
    if (x.theme && total >= 1) { const l = shelfLearn(); l[x.theme] = total; safeSet('maison-shelf', JSON.stringify(l)); }
    haptic(1); render();
    clearTimeout(actions.freshT); actions.freshT = setTimeout(() => api.update('pantry', { id: x.id }, { expires_on: x.expires_on, notified_at: null }).catch(e => console.warn('frigo', e)), 600);
  },

  'fresh-set': el => {
    const x = S.pantry.find(p => p.id === el.dataset.id); if (!x) return;
    x.status = el.dataset.s; S.pantry = S.pantry.filter(p => p !== x); haptic(1);
    if (el.dataset.s === 'mange') { sfx('tick'); pop(el.closest('li')); }
    undoable(`${x.label} ${el.dataset.s === 'mange' ? 'mangé' : 'jeté'}`, [{ t: 'pantry', id: x.id, row: { status: null } }], () => api.update('pantry', { id: x.id }, { status: el.dataset.s }), el.dataset.s === 'mange' ? 'Bien joué' : null);
  },

  'seq-adjust': el => { S.adjust = S.adjust === el.dataset.id ? null : el.dataset.id; haptic(1); render(); },
  'seq-shift': el => {
    const c = S.chores.find(x => x.id === el.dataset.id); const q = seqOf(c); if (!q) return;
    const st = q.steps.find(x => x.key === el.dataset.key);
    const v = Math.max(5, Math.min(600, seqMinutes(c, st) + Number(el.dataset.d)));
    haptic(1);
    run(() => saveSeqMinutes(c, { [st.key]: v }), null);
  },

  'plan-cook': el => { const p = S.plans.find(x => x.id === el.dataset.id); if (!p) return; S.persons = p.persons; S.cook = { id: p.recipe, step: 0, full: false, plan: p.id }; S.open = null; render(); window.scrollTo(0, 0); },
  'plan-remove': el => {
    const p = S.plans.find(x => x.id === el.dataset.id); if (!p) return; S.open = null;
    const withShop = el.dataset.shop === '1';
    run(async () => {
      await api.remove('meal_plans', { id: p.id });
      for (const x of S.shopping.filter(x => !x.checked && pourList(x).includes(p.title))) {
        const rest = pourList(x).filter(t => t !== p.title);
        if (withShop && !rest.length) await api.remove('shopping', { id: x.id });
        else await api.update('shopping', { id: x.id }, { pour: rest.join('|') || null });
      }
    }, withShop ? 'Retiré du menu et de la liste' : 'Retiré du menu');
  },

  'timer-start': el => {
    const sec = Number(el.dataset.sec);
    const t = { id: Date.now().toString(36), label: el.dataset.label, end: Date.now() + sec * 1000 };
    S.timers.push(t); saveTimers();
    haptic(1); sfx('tick');
    // Copie sur le serveur : il envoie la notification même si l'app est fermée.
    if (!DEMO) api.insert('kitchen_timers', { label: t.label, ends_at: new Date(t.end).toISOString() }).then(r => { if (r?.id) { t.sid = r.id; saveTimers(); } }).catch(e => console.warn('minuteur serveur', e));
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
    render();
  },
  'timer-add': el => { const t = S.timers.find(x => x.id === el.dataset.id); if (!t) return; t.end += 60000; saveTimers(); if (t.sid) api.update('kitchen_timers', { id: t.sid }, { ends_at: new Date(t.end).toISOString() }).catch(() => {}); render(); },
  'timer-stop': el => { const t = S.timers.find(x => x.id === el.dataset.id); if (t?.sid && !t.fired) api.remove('kitchen_timers', { id: t.sid }).catch(() => {}); S.timers = S.timers.filter(x => x.id !== el.dataset.id); saveTimers(); haptic(1); render(); },

  'r-open': el => { S.recette = el.dataset.id; render(); window.scrollTo(0, 0); },
  'r-back': () => { S.recette = null; render(); },
  'r-filter': el => { const g = el.dataset.g, k = el.dataset.k;
    if (g === 'rtype') { const t = rTypes(); S.rtype = (t.includes(k) ? t.filter(x => x !== k) : [...t, k]).join(','); }
    else S[g] = S[g] === k ? '' : k;
    haptic(1); rSyncFilters(); rSearch(S.rq); },
  'r-reset': () => { S.rtime = S.rcuisine = S.rtype = ''; haptic(1); rSyncFilters(); rSearch(S.rq); },
  'r-cook': el => { S.cook = { id: el.dataset.id, step: 0, full: false }; render(); window.scrollTo(0, 0); },
  'r-cook-stop': () => { S.cook = null; render(); },
  'r-cook-full': () => { S.cook.full = true; render(); },
  'r-cook-steps': () => { S.cook.full = false; render(); },
  'r-next': () => { S.cook.step++; haptic(1); render(); window.scrollTo(0, 0); react('etape_suivante', document.querySelector('.hd .azami')); },
  'r-prev': () => { S.cook.step = Math.max(0, S.cook.step - 1); render(); },
  'r-done': () => { const r = RID(S.cook.id); const plan = S.plans.find(p => p.id === S.cook.plan) || S.plans.find(p => p.recipe === (r.base || r.id) || p.recipe === r.id); S.cook = null; S.recette = null;
    if (plan) { S.plans = S.plans.filter(p => p !== plan); api.remove('meal_plans', { id: plan.id }).catch(e => console.warn('menu', e)); }
    { const used = new Set(rArt(r).ings.filter(Boolean)); for (const x of S.pantry.filter(p => !p.status && (used.has(p.theme) || [...used].some(t => PARENT[t] === p.theme)))) { x.status = 'mange'; api.update('pantry', { id: x.id }, { status: 'mange' }).catch(() => {}); } S.pantry = S.pantry.filter(p => !p.status); }
    render(); azamiJump(); win('cuisine', r.titre, 1, 'cuisine'); celebrate({ title: 'Bon appétit !', sub: r.titre, level: 'small', reaction: 'recette_reussie' }); },
  'r-panier': el => openPanier(el.dataset.id),
  'r-panier-ok': () => {
    const r = RID(S.panier.id), n = S.persons || 2;
    const open = S.shopping.filter(s => !s.checked);
    const key = l => norm(String(l).replace(/\s*\(.*\)$/, ''));
    const have = [...S.panier.have];
    closeTicket();
    run(async () => {
      const plan = await api.insert('meal_plans', { recipe: r.id, title: r.titre, persons: n, created_by: S.me });
      if (plan) S.plans.push(plan);
      let added = 0;
      for (const [j, x] of r.ing.entries()) {
        if (have.includes(j)) continue;
        const dup = open.find(s => key(s.label) === norm(x.n));
        if (dup) {
          const p = pourList(dup); if (p.includes(r.titre)) continue;
          const patch = { pour: [...p, r.titre].join('|') };
          const sum = addQty(dup.label, shopQty(x, n)); if (sum) patch.label = sum;
          await api.update('shopping', { id: dup.id }, patch); Object.assign(dup, patch); continue;
        }
        const label = `${x.n[0].toUpperCase()}${x.n.slice(1)}${shopQty(x, n)}`;
        await api.insert('shopping', { label, icon: iconFor(x.n, 'shopping', S.hints), shop: guessShop(x.n), pour: r.titre }); added++;
      }
      S.panierAdded = added;
    }, null).then(ok => { if (!ok) return; const a = S.panierAdded; toast(a ? `Au menu. ${pl(a, 'article ajouté', 'articles ajoutés')} à la liste` : 'Au menu. Tu as déjà tout'); react('courses_completees', document.querySelector('.hd .azami')); });
  },

  go: el => { clearReaction(); const from = S.view; S.view = el.dataset.view; S.open = null; S.recette = null; S.cook = null; if (S.view === 'recettes' && from !== 'recettes') cookRestore(); safeSet('maison-view', S.view === 'nuit' ? 'maison' : S.view); render(); window.scrollTo(0, 0); if (S.view === 'nuit') refresh(); },
  // Corvées en étapes : chaque bouton valide l'étape ; une étape minutée lance son minuteur, la dernière termine le cycle.
  'seq-step': el => {
    const c = S.chores.find(x => x.id === el.dataset.id); const q = seqOf(c); if (!q) return;
    const i = Number(el.dataset.i); const st = q.steps[i];
    if (st.minutes) {
      haptic('medium'); sfx('done'); burst('sparkle', el, 12); floatUp(el, `${seqMinutes(c, st)} min`); react('machine_lancee', el);
      undoable(`${q.label} : ${st.btn.toLowerCase()}`, [{ t: 'chores', id: c.id, row: { step: c.step || 0, started_at: c.started_at || null, notified_at: c.notified_at || null } }], () => api.update('chores', { id: c.id }, { step: i, started_at: new Date().toISOString(), notified_at: null }), i === 0 ? 'Lancé. Notification quand c\'est prêt.' : 'C\'est parti.');
      return;
    }
    meow(); haptic('heavy'); sfx('big'); el.classList.add('did'); el.textContent = '✓';
    burst('confetti', el, 24); floatUp(el, '+1');
    const first = !todayHasWin();
    undoable(q.done, [{ t: 'chores', id: c.id, row: { step: c.step || 0, started_at: c.started_at || null, last_done_at: c.last_done_at || null, last_done_by: c.last_done_by || null } }], async () => {
      await api.update('chores', { id: c.id }, { step: 0, started_at: null, last_done_at: new Date().toISOString(), last_done_by: S.me });
      await api.insert('chore_log', { chore_id: c.id, title: q.done, weight: 1 });
      await win('chore', q.done, 1, c.icon);
    }, null, c.id).then(ok => { if (!ok) return; azamiJump(); celebrate({ title: praise('chore'), sub: `Prochaine fois dans ${c.every_days} jours`, level: 'small', reaction: 'corvee_terminee' }); if (first) streakCheer(2600); });
  },
  'seq-reset': el => { S.open = null; run(() => api.update('chores', { id: el.dataset.id }, { step: 0, started_at: null }), 'Cycle annulé'); },
  'agenda-house': () => { S.agendaHouse = S.agendaHouse === false; safeSet('maison-agenda-house', S.agendaHouse ? '1' : '0'); render(); },
  sounds: el => { SOUNDS = el.dataset.on === '1'; safeSet('maison-sounds', SOUNDS ? '1' : '0'); haptic(1); render(); },
  meows: el => { MEOWS = el.dataset.on === '1'; safeSet('maison-meows', MEOWS ? '1' : '0'); haptic(1); render(); },
  theme: el => { THEME = el.dataset.theme; safeSet('maison-theme', THEME); haptic(1); sfx('tick'); render(); },
  glance: el => {
    const to = el.dataset.to;
    if (to === 'faire') { S.maisonTab = 'faire'; render(); document.querySelector('.list-head')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (to === 'agenda') { S.maisonTab = 'agenda'; render(); document.querySelector('.seg')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    actions.go({ dataset: { view: to } });
  },
  'maison-tab': el => { S.maisonTab = el.dataset.tab; render(); },
  more: el => { S.open = S.open === el.dataset.id ? null : el.dataset.id; S.pick = null; render(); },

  retry: () => refresh(),
  notif: () => enableNotifications(),
  'notif-later': () => { safeSet('maison-notif-later', String(Date.now())); haptic(1); render(); },
  'cancel-recovery': () => { S.recovery = false; try { sessionStorage.removeItem('maison-recovery'); } catch {} S.login.step = 'login'; refresh(); },
  'change-pass': () => { S.recovery = true; S.login.step = 'newpass'; render(); window.scrollTo(0, 0); },
  'task-toggle': el => {
    const t = S.tasks.find(x => x.id === el.dataset.id);
    if (!t) return refresh();
    if (t.done) { run(() => api.update('tasks', { id: t.id }, { done: false, done_at: null }), null, t.id); return; }
    meow();
    const last = !S.tasks.some(x => !x.done && x.id !== t.id), first = !todayHasWin();
    haptic(last ? 'heavy' : 'medium');
    ring(el); floatUp(el); burst(isAzami(t) ? 'paws' : 'sparkle', el, 12);
    sfx(last ? 'big' : 'done');
    S.popId = t.id;
    undoable(t.title, [{ t: 'tasks', id: t.id, row: { done: false, done_at: null } }], async () => { await api.update('tasks', { id: t.id }, { done: true, done_at: new Date().toISOString() }); await win('task', t.title, 1, t.icon); }, last ? null : praise('task'), t.id)
      .then(ok => { if (!ok) return; azamiJump(); if (last) celebrate({ title: 'Tout est fait !', sub: praise('all'), badge: variantBadge('tasks', t, S.me), reaction: 'objectif_commun' }); else react('tache_cochee', document.getElementById(`tick-${t.id}`)); if (first) streakCheer(last ? 3000 : 400); });
  },
  'task-assign': el => {
    const w = el.dataset.who;
    S.open = null;
    run(() => api.update('tasks', { id: el.dataset.id }, { assignee: w === 'me' ? S.me : w === 'other' ? other() : null }));
  },
  'task-delete': el => { S.open = null; run(() => api.remove('tasks', { id: el.dataset.id }), 'Supprimé'); },
  'shop-where': el => {
    const s = S.shopping.find(x => x.id === el.dataset.id); if (!s) return;
    const cur = shopsOf(s); const k = el.dataset.shop;
    const next = cur.includes(k) ? cur.filter(x => x !== k) : [...cur, k];
    if (!next.length) { toast('Garde au moins un endroit'); return; }
    s.shop = next.join(','); haptic(1);
    run(() => api.update('shopping', { id: s.id }, { shop: s.shop }));
  },
  'shop-delete': el => { S.open = null; run(() => api.remove('shopping', { id: el.dataset.id }), 'Retiré de la liste'); },
  edit: el => { S.edit = { type: el.dataset.type, id: el.dataset.id }; S.open = null; S.pick = null; S.chips = {}; render(); document.querySelector('.edit input, .edit textarea')?.focus(); },
  'edit-cancel': () => { S.edit = null; render(); },
  'ev-form': el => { S.showEventForm = el.dataset.show === '1'; render(); if (S.showEventForm) document.getElementById('ev-title')?.focus(); },
  'ev-edit': el => { S.edit = { type: 'event', id: el.dataset.id }; S.open = null; S.chips = {}; render(); document.getElementById('ee-title')?.focus(); },
  'ev-delete': async el => {
    const e = S.agenda.events.find(x => x.id === el.dataset.id); if (!e) return;
    if (!await uiAsk(`« ${e.title} » sera retiré du calendrier partagé.`, { title: 'Supprimer ?', ok: 'Supprimer', danger: true })) return;
    S.open = null;
    runAgenda(() => agendaCall({ action: 'delete', href: e.href }), 'Supprimé du calendrier');
  },
  'agenda-refresh': () => { loadAgenda(); render(); },
  'task-cal': el => { const t = S.tasks.find(x => x.id === el.dataset.id); if (!t?.due_on) return; S.open = null; runAgenda(() => agendaCall({ action: 'create', event: taskEvent(t) }), `Dans le calendrier « ${S.agenda.calendar} »`).then(ok => ok && haptic('medium')); },
  'agenda-forget': async () => { if (await uiAsk('Rien n’est effacé dans iCloud ; le mot de passe d’application est oublié.', { title: 'Déconnecter le calendrier ?', ok: 'Déconnecter', danger: true })) runAgenda(() => agendaCall({ action: 'forget' }), 'Calendrier déconnecté'); },
  pick: el => { S.pick = S.pick?.id === el.dataset.id ? null : { type: el.dataset.type, id: el.dataset.id }; S.open = null; render(); },
  'pick-set': el => {
    const { type, id, icon } = el.dataset;
    const row = S[{ tasks: 'tasks', shopping: 'shopping', expenses: 'expenses', chores: 'chores' }[type]].find(x => x.id === id);
    S.pick = null;
    if (!row) return refresh();
    const word = norm(labelOf(type, row));
    run(async () => {
      await api.update(type, { id }, { icon });
      if (word && !isVariant(icon)) await api.upsert('icon_hints', { word, icon, updated_by: S.me, updated_at: new Date().toISOString() });
    }, isVariant(icon) ? 'Illustration choisie' : 'Icône mémorisée pour la prochaine fois');
  },

  'note-pin': el => { const n = S.board.find(x => x.id === el.dataset.id); if (!n) return refresh(); run(() => api.update('board', { id: n.id }, { pinned: !n.pinned })); },
  'note-delete': async el => { if (await uiAsk('Il disparaît du tableau pour vous deux.', { title: 'Retirer ce mot ?', ok: 'Retirer', danger: true })) run(() => api.remove('board', { id: el.dataset.id }), 'Retiré du tableau'); },

  'chore-done': el => {
    const c = S.chores.find(x => x.id === el.dataset.id);
    if (!c) return refresh();
    if (c.last_done_at && Date.now() - new Date(c.last_done_at).getTime() < 60000) { toast('Déjà notée il y a un instant'); return; }
    // Le tour passe à l'autre que moi : si je fais la corvée de l'autre, il ou elle garde la suivante.
    const next = c.fixed ? c.turn : (S.members.find(m => m.email !== S.me)?.email || S.me);
    meow();
    const first = !todayHasWin();
    haptic('heavy'); el.classList.add('did'); el.textContent = '✓';
    sfx('big');
    floatUp(el, c.weight === 3 ? '+3' : c.weight === 1 ? '+1' : '+2');
    burst(isAzami(c) ? 'paws' : 'confetti', el, isAzami(c) ? 10 : 26);
    S.popId = c.id;
    undoable(c.title, [{ t: 'chores', id: c.id, row: { last_done_at: c.last_done_at || null, last_done_by: c.last_done_by || null, turn: c.turn || null } }], async () => {
      await api.update('chores', { id: c.id }, { last_done_at: new Date().toISOString(), last_done_by: S.me, turn: next });
      await api.insert('chore_log', { chore_id: c.id, title: c.title, weight: c.weight || 2 });
      await win('chore', c.title, c.weight || 2, c.icon);
    }, null, c.id).then(ok => { if (!ok) return; azamiJump(); celebrate({ title: praise('chore'), sub: !next ? `Prochaine fois dans ${c.every_days} jours` : c.fixed ? `Toujours ${next === S.me ? 'toi' : nameOf(next)}` : `Prochain tour : ${nameOf(next)}`, level: 'small', badge: variantBadge('chores', c, S.me), reaction: c.sorte ? 'dechets_descendus' : 'corvee_terminee' }); if (first) streakCheer(2600); });
  },
  'chore-swap': el => {
    const c = S.chores.find(x => x.id === el.dataset.id);
    if (!c) return refresh();
    const next = S.members.find(m => m.email !== c.turn)?.email;
    S.open = null;
    run(() => api.update('chores', { id: c.id }, { turn: next }), `C'est au tour de ${nameOf(next)}`);
  },
  'chore-delete': async el => { if (await uiAsk('Elle disparaît de la liste pour vous deux.', { title: 'Supprimer cette corvée ?', ok: 'Supprimer', danger: true })) { S.open = null; run(() => api.remove('chores', { id: el.dataset.id }), 'Corvée supprimée'); } },
  'chore-form': el => { S.showChoreForm = el.dataset.show === '1'; render(); if (S.showChoreForm) document.getElementById('chore-title')?.focus(); },

  'shop-toggle': el => {
    const s = S.shopping.find(x => x.id === el.dataset.id); if (!s) return refresh();
    if (s.checked) { run(() => api.update('shopping', { id: s.id }, { checked: false, checked_by: null, checked_at: null }), null, s.id); return; }
    meow();
    const last = !S.shopping.some(x => !x.checked && x.id !== s.id), first = !todayHasWin();
    haptic(last ? 'heavy' : 'light');
    ring(el); burst(isAzami(s) ? 'paws' : 'sparkle', el, isAzami(s) ? 6 : 9);
    sfx(last ? 'big' : 'tick');
    S.popId = s.id;
    undoable(s.label, [{ t: 'shopping', id: s.id, row: { checked: false, checked_by: null, checked_at: null } }], async () => { await api.update('shopping', { id: s.id }, { checked: true, checked_by: S.me, checked_at: new Date().toISOString() }); if (last) await win('shop', `Courses : ${S.shopping.length} articles`, 1); }, null, s.id)
      .then(ok => { if (ok && last) { azamiJump(); celebrate({ title: 'Panier complet !', sub: praise('basket'), badge: variantSrc(variantFor(personOf(S.me), 'courses') || ''), reaction: 'courses_completees' }); if (first) streakCheer(3000); } });
  },
  'shop-clear': el => actions['shop-done'](el),   // même chemin que « Courses faites » : historique + ticket de caisse
  'where-open': () => { S.whereOpen = !S.whereOpen; haptic(1); render(); },
  'shop-pick': el => { const k = el.dataset.shop || null; S.whereOpen = false; if (k === S.shopMode) { render(); return; } S.shopMode = k; safeSet('maison-shop-mode', S.shopMode || ''); haptic(1); sfx('tick'); presenceTrack(); render(); },
  'shop-mode': el => { S.shopMode = S.shopMode === el.dataset.shop ? null : el.dataset.shop; safeSet('maison-shop-mode', S.shopMode || ''); haptic(1); sfx('tick'); presenceTrack(); render(); },
  // Courses faites : ce qui est dans le panier sort de la liste, chaque article est gardé en mémoire (pour les pré-listes), et c'est une réussite.
  'shop-done': el => {
    const cart = myCart(); if (!cart.length) return;
    const where = SHOPS.find(x => x[0] === S.shopMode)?.[1] || 'Courses';
    haptic('heavy'); sfx('big'); burst('confetti', el, 26);
    const first = !todayHasWin();
    undoable('Courses faites', cart.map(s => ({ t: 'shopping', gone: true, row: { ...s } })), async () => {
      for (const s of cart) await win('achat', s.label, 0, [S.shopMode, s.icon].filter(Boolean).join('|'));
      await stockFresh(cart);
      for (const s of cart) await api.remove('shopping', { id: s.id });
      await win('shop', `${where} : ${pl(cart.length, 'article', 'articles')}`, 1, 't:courses');
    }).then(ok => { if (!ok) return; S.shopMode = null; safeSet('maison-shop-mode', ''); presenceTrack(); render(); azamiJump(); celebrate({ title: praise('shop'), sub: `${pl(cart.length, 'article acheté', 'articles achetés')}`, level: 'small', badge: variantBadge('shopping', { label: 'courses' }, S.me), reaction: 'courses_completees' }); if (first) streakCheer(2600);
      const mm = menuMissing().map(x => ({ ...x, items: x.items.filter(i => !i.checked) })).filter(x => x.items.length);
      setTimeout(() => openTicket({ where, n: cart.length, missing: mm.length ? menuMissText(mm) : '' }), first ? 5200 : 2300); });
  },
  // Fiche après les courses : combien, qui a payé → dépense partagée moitié-moitié, avec sa petite pluie de pièces.
  'ticket-pay': el => { S.ticket.payer = el.dataset.who; document.querySelectorAll('#ticket [data-action="ticket-pay"]').forEach(b => b.setAttribute('aria-pressed', b === el)); haptic(1); },
  'ticket-perso-who': el => { S.ticket.persoWho = el.dataset.who; document.querySelectorAll('#ticket [data-action="ticket-perso-who"]').forEach(b => b.setAttribute('aria-pressed', b === el)); haptic(1); const t = document.getElementById('ticket-perso-txt'); if (t) t.textContent = el.dataset.who === S.ticket.payer ? 'Ce montant est retiré du partage.' : `${nameOf(el.dataset.who)} devra ce montant en entier.`; },
  'sheet-close': () => closeTicket(),   // fermer une fenêtre (lexique, guide, aide…) sans message
  'ticket-skip': () => { closeTicket(); toast('Pas noté. Tu peux l\'ajouter dans Argent.'); },
  'ticket-ok': el => {
    const f = document.getElementById('ticket-amount');
    const amount = Number(String(f?.value || '').replace(/[’'\s]/g, '').replace(',', '.'));
    if (!(amount > 0)) { toast('Indique le montant du ticket'); f?.focus(); return; }
    const t = S.ticket;
    const share = (t.share ?? 50) / 100;
    const perso = Math.max(0, Number(String(document.getElementById('ticket-perso')?.value || '0').replace(/[’'\s]/g, '').replace(',', '.')) || 0);
    if (perso >= amount) { toast('Le montant perso dépasse le ticket'); return; }
    const today = isoDate(new Date());
    // Le partage porte sur le ticket moins les articles perso. Si les articles perso sont à l'autre, il ou elle les doit en entier.
    const rows = [{ amount: Math.round((amount - perso) * 100) / 100, label: `Courses ${t.where}${perso ? ` (sans ${chf(perso)} perso)` : ''}`, paid_by: t.payer, payer_share: share, category: 'courses', spent_on: today, icon: 't:courses' }];
    if (perso && t.persoWho !== t.payer) rows.push({ amount: Math.round(perso * 100) / 100, label: `Articles perso de ${nameOf(t.persoWho)}`, paid_by: t.payer, payer_share: 0, category: 'courses', spent_on: today, icon: 't:courses' });
    const owed = Math.round(rows.reduce((s, r) => s + r.amount * (1 - r.payer_share), 0) * 100) / 100;
    const row = rows[0];
    haptic('medium'); sfx('coin'); burst('coins', el, 12); floatUp(el, chf(amount));
    closeTicket();
    run(async () => { for (const r of rows) await api.insert('expenses', r); }, null).then(ok => { if (!ok) return; azamiJump(); celebrate({ title: `${chf(amount)} notés`, sub: owed === 0 ? 'Rien à partager' : row.paid_by === S.me ? `${nameOf(other())} te doit ${chf(owed)}` : `Tu dois ${chf(owed)} à ${nameOf(row.paid_by)}`, level: 'small', reaction: 'comptes_equilibres', badge: variantBadge('expenses', { label: 'courses', paid_by: row.paid_by }, row.paid_by) }); });
  },

  'settle-undo': async el => { if (await uiAsk('Le solde sera recalculé comme s’il n’avait pas eu lieu.', { title: 'Annuler ce remboursement ?', ok: 'Annuler le remboursement', cancel: 'Garder', danger: true })) { S.open = null; run(() => api.remove('expenses', { id: el.dataset.id }), 'Remboursement annulé'); } },
  'exp-delete': async el => { if (await uiAsk('Le solde sera recalculé sans elle.', { title: 'Supprimer cette dépense ?', ok: 'Supprimer', danger: true })) { S.open = null; run(() => api.remove('expenses', { id: el.dataset.id }), 'Dépense supprimée'); } },
  settle: async () => {
    const net = balances()[S.me] || 0;
    const o = other();
    const payer = net < 0 ? S.me : o;
    const amt = Math.round(Math.abs(net) * 100) / 100;
    if (pending.has('settle')) return;
    if (!await uiAsk('Le solde revient à zéro. Rien n’est effacé : les dépenses restent dans la liste et le remboursement peut être annulé après coup.', { title: `Remboursement de ${chf(amt)} francs ?`, ok: 'Enregistrer' })) return;
    if (pending.has('settle')) return;
    sfx('coin'); haptic('heavy');
    burst('coins', document.querySelector('[data-action="settle"]'), 22);
    run(async () => { await api.insert('expenses', { label: 'Remboursement', amount: amt, paid_by: payer, payer_share: 0, category: 'autre', spent_on: isoDate(new Date()), is_settlement: true }); await win('settle', 'Comptes à zéro', 1); }, null, 'settle')
      .then(ok => { if (ok) { azamiJump(); pop(document.querySelector('.bal-card')); celebrate({ title: 'Comptes à zéro', sub: praise('settle'), reaction: 'comptes_equilibres', badge: variantSrc(variantFor(personOf(S.me), 'budget') || '') }); } });
  },

  'letter-open': el => {
    const id = el.dataset.id;
    S.openLetter = id;
    render();
    const c = S.care.find(x => x.id === id);
    if (c && !c.read_at) { c.read_at = new Date().toISOString(); api.rpc('care_mark_read', { msg: id }).catch(console.error); }
  },
  'letter-close': () => { S.openLetter = null; render(); },
  'care-help': () => {
    const ta = document.getElementById('care-body');
    const scaffold = "Quand je remarque que…\nJe me sens…\nParce que j'ai besoin de…\nEst-ce que tu serais d'accord pour…";
    ta.value = ta.value ? ta.value + '\n\n' + scaffold : scaffold;
    ta.focus();
  },
  'care-delete': async el => { if (await uiAsk('Le mot quitte sa boîte.', { title: 'Retirer ce mot ?', ok: 'Retirer', danger: true })) run(() => api.remove('care_messages', { id: el.dataset.id }), 'Mot retiré'); },


  meow: el => { const img = el.querySelector('img.azami'); if (azamiPet(img)) return; meow(true, .6, Math.random() < .4 ? pick(['ronron', 'ronronmrr']) : null); caresse(img); },
  'login-mode': el => { S.login.email = document.getElementById('email')?.value || S.login.email; S.login.step = el.dataset.mode; render(); },
  forgot: async () => {
    const email = (document.getElementById('email')?.value || '').trim().toLowerCase();
    if (!email) { toast("Écris d'abord ton adresse e-mail"); document.getElementById('email')?.focus(); return; }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: appUrl() });
    if (error) { toast(authError(error)); return; }
    S.login = { step: 'sent', email, note: `Un lien pour changer ton mot de passe vient d'être envoyé à ${email}. Il s'ouvrira dans Safari ; choisis le nouveau mot de passe, puis reviens te connecter ici.` };
    render();
  },
  logout: async () => {
    if (sb) await sb.auth.signOut();
    Object.assign(S, { me: null, members: [], tasks: [], chores: [], choreLog: [], expenses: [], shopping: [], board: [], care: [], chips: {}, open: null, openLetter: null, offline: false, recovery: false, login: { step: 'login', email: '' } });
    render();
  },

  'demo-swap': async () => { S.me = other(); safeSet('maison-demo-me', S.me); S.openLetter = null; await refresh(); toast(`Tu vois l'app comme ${nameOf(S.me)}`); },
  'demo-reset': async () => { if (!await uiAsk('On efface les données de démo et on repart de l’exemple.', { title: 'Tout remettre à zéro ?', ok: 'Effacer', danger: true })) return; try { localStorage.removeItem('maison-demo-v1'); } catch {} api = tracked(demoApi()); await refresh(); },
};

const forms = {
  async login(f) {
    const email = f.email.value.trim().toLowerCase();
    S.login.email = email;
    const { error } = await sb.auth.signInWithPassword({ email, password: f.pass.value });
    if (error) { toast(authError(error)); console.error(error); }
  },
  async signup(f) {
    const email = f.email.value.trim().toLowerCase();
    const { data, error } = await sb.auth.signUp({ email, password: f.pass.value, options: { emailRedirectTo: appUrl() } });
    if (error) { toast(authError(error)); console.error(error); return; }
    if (data.session) return; // confirmation désactivée : déjà connecté
    S.login = { step: 'sent', email, note: `Presque fini : clique sur le lien envoyé à ${email} pour confirmer ton adresse, puis reviens ici te connecter. Si tu avais déjà un compte, utilise plutôt « Se connecter ».` };
    render();
  },
  async newpass(f) {
    const { error } = await sb.auth.updateUser({ password: f.pass.value });
    if (error) { toast(authError(error)); return; }
    S.recovery = false; try { sessionStorage.removeItem('maison-recovery'); } catch {}
    toast('Mot de passe changé. Sur l’app installée, connecte-toi avec ce nouveau mot de passe.');
    refresh();
  },
  task(f) {
    const w = chipVal('task-who', 'nous');
    if (!f.title.value.trim()) { toast('Écris d\'abord la chose à faire'); return; }
    const title = f.title.value.trim();
    const row = { title, assignee: w === 'me' ? S.me : w === 'other' ? other() : null, due_on: f.due.value || null, icon: iconFor(title, 'task', S.hints) };
    f.reset();
    sfx('tick'); haptic('light');
    burst('sparkle', f.querySelector('button[type="submit"]'), 6);
    run(() => api.insert('tasks', row));
  },
  note(f) {
    if (!f.body.value.trim()) { toast('Le mot est vide'); return; }
    const row = { body: f.body.value.trim(), important: f.important.checked };
    f.reset();
    run(() => api.insert('board', row), 'Affiché sur le tableau');
  },
  chore(f) {
    if (!f.title.value.trim()) { toast('Donne un nom à la corvée'); return; }
    const w = chipVal('chore-who', 'tour');
    const row = { title: f.title.value.trim(), every_days: Number(chipVal('chore-freq', '7')), weight: Number(chipVal('chore-weight', '2')), fixed: w !== 'tour', turn: w === 'tour' ? chipVal('chore-first', S.me) : w === 'any' ? null : w, icon: iconFor(f.title.value, 'chore', S.hints) };
    f.reset(); S.showChoreForm = false;
    run(() => api.insert('chores', row), 'Corvée ajoutée');
  },
  shop(f) {
    const have = new Set(S.shopping.filter(x => !x.checked).map(x => x.label.toLowerCase()));
    const labels = [...new Set(f.label.value.split(',').map(s => s.trim()).filter(Boolean).map(s => s[0].toUpperCase() + s.slice(1)))].filter(l => !have.has(l.toLowerCase()));
    f.reset();
    if (!labels.length) { toast('Déjà sur la liste'); return; }
    run(async () => { for (const label of labels) await api.insert('shopping', { label, icon: iconFor(label, 'shopping', S.hints), shop: guessShop(label) }); });
    setTimeout(() => document.getElementById('shop-label')?.focus(), 50);
  },
  expense(f) {
    const amount = Number(String(f.amount.value).replace(/[’'\s]/g, '').replace(',', '.'));
    if (!(amount > 0)) { toast('Indique un montant, par exemple 24.50'); return; }
    const split = chipVal('exp-split', 'half');
    let payer_share = 0.5;
    if (split === 'other') payer_share = 0;
    if (split === 'custom') {
      const p = Number(f.pct?.value);
      if (!(p >= 0 && p <= 100)) { toast('Indique un pourcentage entre 0 et 100'); return; }
      payer_share = p / 100;
    }
    if (!f.label.value.trim()) { toast('Indique pour quoi'); return; }
    const row = { amount: Math.round(amount * 100) / 100, label: f.label.value.trim(), paid_by: chipVal('exp-payer', S.me), payer_share, category: chipVal('exp-cat', 'courses'), spent_on: f.date.value || isoDate(new Date()), icon: iconFor(f.label.value, 'expense', S.hints) };
    f.reset();
    sfx('coin'); haptic('light');
    burst('coins', f.querySelector('button[type="submit"]'), 7);
    run(() => api.insert('expenses', row), praise('expense')).then(ok => { if (ok) pop(document.querySelector('.bal-card')); });
    setTimeout(() => document.getElementById('exp-amount')?.focus(), 50);
  },
  'edit-task'(f) {
    const title = f.title.value.trim(); if (!title) return toast('Le titre est vide');
    const w = chipVal('edit-who', 'nous');
    const old = S.tasks.find(t => t.id === f.dataset.id);
    const patch = { title, assignee: w === 'me' ? S.me : w === 'other' ? other() : null, due_on: f.due.value || null, due_time: f.time.value || null, priority: chipVal('edit-prio', old?.priority || 'auto') === 'auto' ? null : chipVal('edit-prio', old?.priority || 'auto') };
    if (old && old.title !== title && !S.hints[norm(title)]) patch.icon = iconFor(title, 'task', S.hints);
    S.edit = null;
    run(() => api.update('tasks', { id: f.dataset.id }, patch), 'Modifié');
  },
  'edit-shop'(f) {
    const label = f.label.value.trim(); if (!label) return toast('L\'article est vide');
    const patch = { label, icon: iconFor(label, 'shopping', S.hints) };
    S.edit = null;
    run(() => api.update('shopping', { id: f.dataset.id }, patch), 'Modifié');
  },
  'edit-chore'(f) {
    const title = f.title.value.trim(); if (!title) return toast('Le nom est vide');
    const c0 = S.chores.find(x => x.id === f.dataset.id) || {};
    const w = c0.sorte ? 'any' : chipVal('edit-who', c0.fixed ? (c0.turn || 'any') : 'tour');
    const patch = { title, every_days: Number(chipVal('edit-freq', '7')), weight: Number(chipVal('edit-weight', '2')), fixed: w !== 'tour', turn: c0.sorte ? (c0.turn || null) : w === 'tour' ? chipVal('edit-turn', c0.turn || S.me) : w === 'any' ? null : w, icon: c0.sorte ? c0.icon : iconFor(title, 'chore', S.hints), priority: chipVal('edit-prio', c0.priority || 'auto') === 'auto' ? null : chipVal('edit-prio', c0.priority || 'auto') };
    if (f.last.value) patch.last_done_at = new Date(f.last.value + 'T12:00').toISOString();
    let minutes = null;
    if (seqOf(c0)) { minutes = {}; for (const s of seqOf(c0).steps) if (s.minutes && f[`min_${s.key}`]?.value) minutes[s.key] = Number(f[`min_${s.key}`].value); patch.title = c0.title; }
    S.edit = null;
    run(async () => { await api.update('chores', { id: f.dataset.id }, patch); if (minutes) await saveSeqMinutes(c0, minutes); }, 'Modifié');
  },
  'edit-expense'(f) {
    const amount = Number(String(f.amount.value).replace(/[’'\s]/g, '').replace(',', '.'));
    if (!(amount > 0)) return toast('Indique un montant, par exemple 24.50');
    const label = f.label.value.trim(); if (!label) return toast('Indique pour quoi');
    const split = chipVal('edit-split', 'half');
    let payer_share = split === 'other' ? 0 : 0.5;
    if (split === 'custom') { const p = Number(f.pct?.value); if (!(p >= 0 && p <= 100)) return toast('Pourcentage entre 0 et 100'); payer_share = p / 100; }
    const patch = { amount: Math.round(amount * 100) / 100, label, paid_by: chipVal('edit-payer', S.me), payer_share, category: chipVal('edit-cat', 'courses'), spent_on: f.date.value || isoDate(new Date()), icon: iconFor(label, 'expense', S.hints) };
    S.edit = null;
    run(() => api.update('expenses', { id: f.dataset.id }, patch), 'Modifié');
  },
  'agenda-setup'(f) {
    const body = { action: 'setup', apple_id: f.apple_id.value, app_password: f.app_password.value, calendar_name: f.calendar_name.value };
    toast('Connexion à iCloud…');
    runAgenda(() => agendaCall(body), 'Calendrier relié').then(ok => { if (ok) { haptic('medium'); burst('sparkle', null, 14); } });
  },
  'agenda-add'(f) {
    const r = eventFromForm(f, 'ev-dur'); if (r.error) return toast(r.error);
    S.showEventForm = false; S.chips = {};
    sfx('tick'); haptic('light'); burst('sparkle', f.querySelector('button[type="submit"]'), 8);
    runAgenda(() => agendaCall({ action: 'create', event: r.event }), 'Ajouté au calendrier').then(ok => { if (!ok) { S.showEventForm = true; render(); } });
  },
  'agenda-edit'(f) {
    const e = S.agenda.events.find(x => x.id === f.dataset.id); if (!e) return;
    const r = eventFromForm(f, 'edit-dur'); if (r.error) return toast(r.error);
    S.edit = null; S.chips = {};
    runAgenda(() => agendaCall({ action: 'update', event: { ...e, ...r.event, notes: e.notes } }), 'Modifié dans le calendrier');
  },
  'edit-note'(f) {
    const body = f.body.value.trim(); if (!body) return toast('Le mot est vide');
    S.edit = null;
    run(() => api.update('board', { id: f.dataset.id }, { body, important: f.important.checked }), 'Modifié');
  },
  care(f) {
    const body = f.body.value.trim();
    if (!body) return;
    const row = { recipient: other(), kind: chipVal('care-kind', 'merci'), body, wants_talk: f.talk.checked };
    f.reset();
    sfx('heart'); haptic('medium');
    burst('hearts', f.querySelector('button[type="submit"]'), 12);
    run(() => api.insert('care_messages', row), `${praise('care')} ${nameOf(other())} le trouvera dans sa boîte.`).then(ok => { if (ok) react('mot_envoye', document.querySelector('[data-form="care"] button[type="submit"]') || document.querySelector('.hd .azami')); });
  },
};

document.addEventListener('click', e => {
  const c = e.target.closest('[data-chip]');
  if (c) {
    const g = c.closest('[data-group]');
    S.chips[g.dataset.group] = c.dataset.chip;
    g.querySelectorAll('[data-chip]').forEach(b => b.setAttribute('aria-pressed', b === c));
    if (['exp-split', 'edit-split', 'chore-who', 'edit-who'].includes(g.dataset.group)) render(); // affiche ou cache un champ qui dépend du choix
    else if (g.dataset.group.startsWith('exp-')) { const sum = document.querySelector('[data-fold="exp-options"] > summary'); if (sum) sum.textContent = optionsSummary(); }
    return;
  }
  // Toucher reçu par l'interrupteur haptique invisible : un bouton d'envoi doit quand même envoyer le formulaire.
  const hap = e.target.matches?.('input.hap') ? e.target : null;
  if (hap) { const host = hap.parentElement; if (host?.type === 'submit' && host.form) { host.form.requestSubmit(host); return; } }
  const a = e.target.closest('[data-action]');
  if (a && actions[a.dataset.action]) { if (!hap) e.preventDefault(); actions[a.dataset.action](a); }
});

// Gestes au doigt -----------------------------------------------------------------
// Glisser de côté : étape suivante / précédente en cuisinant, retour depuis une recette, onglets de
// l'accueil (À faire, Agenda, Tableau), cocher un article de courses, écarter une notification.
// Jamais dans un champ, une feuille, une visite, ni dans ce qui défile déjà de côté.
let sw = null;
const MTABS = ['faire', 'agenda', 'tableau'];
function hScrollable(el) {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (n.scrollWidth > n.clientWidth + 4) { const ox = getComputedStyle(n).overflowX; if (ox === 'auto' || ox === 'scroll') return true; }
  }
  return false;
}
// Ce que fait un glissement de page ici (null : rien).
function pageSwipe(tg) {
  if (S.view === 'recettes' && S.cook && !S.cook.full) return { kind: 'cook', el: document.querySelector('.rstep') };
  if (S.view === 'recettes' && S.recette && !S.cook) return { kind: 'recette', el: null, only: 1 };
  if (S.view === 'maison' && tg.closest('.mtab')) return { kind: 'mtab', el: document.querySelector('.mtab') };
  return null;
}
function slideIn(sel, from) {
  const el = document.querySelector(sel); if (!el || reducedMotion()) return;
  el.classList.remove('slide-l', 'slide-r'); void el.offsetWidth; el.classList.add(from > 0 ? 'slide-r' : 'slide-l');
}
document.addEventListener('touchstart', e => {
  sw = null;
  if (e.touches.length !== 1 || drag) return;
  const t = e.touches[0], tg = e.target;
  if (tg.closest('input:not(.hap), textarea, select, [contenteditable], .sheet, #ticket, #visite, #tour, #cele, .picker, .item-actions, .editing') || hScrollable(tg)) return;
  if (t.clientX < 18 || t.clientX > innerWidth - 18) return;   // le bord de l'écran reste au système (retour iOS)
  const pop = tg.closest('#pop .pop-item');
  const shop = !pop && S.view === 'courses' && tg.closest('li.item');
  sw = { x: t.clientX, y: t.clientY, t: Date.now(), dx: 0, dir: 0, pop, shop: shop && shop.querySelector('[data-action="shop-toggle"]') ? shop : null, page: pop || shop ? null : pageSwipe(tg) };
  if (!sw.pop && !sw.shop && !sw.page) sw = null;
}, { passive: true });
document.addEventListener('touchmove', e => {
  if (!sw) return;
  const t = e.touches[0], dx = t.clientX - sw.x, dy = t.clientY - sw.y;
  if (!sw.dir) {
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.5) { sw = null; return; }   // c'est un défilement vertical
    sw.dir = 1;
  }
  sw.dx = dx;
  const el = sw.pop || sw.shop || sw.page?.el;
  if (!el) return;
  el.style.transition = 'none';
  if (sw.shop) { const x = Math.max(0, dx) * .85; el.style.transform = `translateX(${x}px)`; el.classList.toggle('swipe-ok', dx > 80); }
  else if (sw.pop) { el.style.transform = `translateX(${dx}px)`; el.style.opacity = String(Math.max(.2, 1 - Math.abs(dx) / 240)); }
  else el.style.transform = `translateX(${dx * .35}px)`;
}, { passive: true });
function swipeReset(el) {
  if (!el) return;
  el.style.transition = 'transform .25s cubic-bezier(.2,.8,.3,1), opacity .25s'; el.style.transform = ''; el.style.opacity = '';
  el.classList.remove('swipe-ok');
  setTimeout(() => { el.style.transition = ''; }, 300);
}
document.addEventListener('touchend', () => {
  const g = sw; sw = null;
  if (!g || !g.dir) return;
  const dx = g.dx, fast = Date.now() - g.t < 350, far = Math.abs(dx) > 90 || (fast && Math.abs(dx) > 45);
  const el = g.pop || g.shop || g.page?.el;
  if (g.shop) { const ok = dx > 80; swipeReset(el); if (ok) { haptic(1); g.shop.querySelector('[data-action="shop-toggle"]').click(); } return; }
  if (g.pop) {
    if (far) { el.style.transition = 'transform .2s, opacity .2s'; el.style.transform = `translateX(${dx > 0 ? 420 : -420}px)`; el.style.opacity = '0'; const id = el.querySelector('[data-id]')?.dataset.id; setTimeout(() => { popList = popList.filter(x => x.id !== id); popRender(); }, 180); }
    else swipeReset(el);
    return;
  }
  swipeReset(el);
  if (!far) return;
  const p = g.page;
  if (p.kind === 'cook') {
    const r = RID(S.cook.id), last = S.cook.step >= r.etapes.length - 1;
    if (dx < 0 && !last) { actions['r-next'](); slideIn('.rstep', 1); }
    else if (dx > 0 && S.cook.step > 0) { actions['r-prev'](); haptic(1); slideIn('.rstep', -1); }
    else { haptic(1); const b = document.querySelector(dx < 0 ? '.rcta [data-action="r-done"]' : '.rcta [data-action="r-prev"]'); b?.classList.remove('bump'); void b?.offsetWidth; b?.classList.add('bump'); }
  } else if (p.kind === 'recette' && dx > 0) { haptic(1); actions['r-back'](); }
  else if (p.kind === 'mtab') {
    const i = MTABS.indexOf(S.maisonTab), j = i + (dx < 0 ? 1 : -1);
    if (j < 0 || j >= MTABS.length) { haptic(1); return; }
    haptic(1); S.maisonTab = MTABS[j]; render(); slideIn('.mtab', dx < 0 ? 1 : -1);
  }
}, { passive: true });
document.addEventListener('touchcancel', () => { if (sw) swipeReset(sw.pop || sw.shop || sw.page?.el); sw = null; }, { passive: true });

document.addEventListener('change', e => {
  const t = e.target;
  if (t.matches?.('[data-action-change="cine-s"]')) { S.cineS = t.value; S.cineMore = null; haptic(1); render(); }
  if (t.matches?.('.fpq')) { const f = S.films.find(x => x.id === t.dataset.id); if (!f) return; const pourquoi = { ...(f.pourquoi || {}), [S.me]: t.value.trim() }; f.pourquoi = pourquoi; api.update('films', { id: f.id }, { pourquoi }).then(() => toast('Noté')).catch(() => toast('Pas enregistré.')); }
});
document.addEventListener('input', e => {
  if (e.target.id === 'cine-q') cineSearch(e.target.value);
  if (e.target.id === 'rq') rSearch(e.target.value);
  if (e.target.id === 'rtime') {
    const i = Number(e.target.value); S.rtime = RTIME[i] || '';
    e.target.style.setProperty('--p', `${i / (RTIME.length - 1) * 100}%`);
    const o = document.getElementById('rtime-txt'); if (o) o.textContent = rtimeText(S.rtime);
    haptic(1); rSearch(S.rq);
  }
});


document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]');
  if (!f) return;
  e.preventDefault();
  forms[f.dataset.form]?.(f);
});

document.addEventListener('visibilitychange', () => { if (!document.hidden && S.me) refresh(); });
setInterval(() => { if (S.me && !S.offline && (S.view === 'nuit' || notifOn())) refresh(); }, 30000);
// Corvées en étapes : fin d'un minuteur pendant que l'app est ouverte → carte à jour et notification locale.
const seqNotified = new Set();
setInterval(() => {
  for (const c of S.chores) {
    const q = seqOf(c); if (!q || !c.started_at) continue;
    if (q.personal && c.turn !== S.me) continue;
    const s = seqState(c);
    if (s.phase === 'timer') { document.querySelectorAll(`.seq-card #done-${c.id}`); continue; }
    const key = `${c.id}|${c.started_at}`;
    if (seqNotified.has(key)) continue;
    seqNotified.add(key); render(); react('minuteur_fini', document.getElementById(`done-${c.id}`));
    if (notifOn()) show(`${q.label} : prêt`, q.steps[s.i]?.meta || `${q.steps[s.i]?.btn}`, 'maison-seq');
  }
}, 20000);

// Démarrage ------------------------------------------------------------------

async function boot() {
  if (DEMO) {
    api = tracked(demoApi());
    const members = await api.list('members');
    S.me = safeGet('maison-demo-me') || members[0].email;
    S.ready = true; preloadAzami();
    await refresh();
    return;
  }
  if ('serviceWorker' in navigator) {
    // Nouvelle version publiée : le service worker se remplace, la page se recharge une fois.
    let had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('message', e => { if (e.data?.type === 'push' && S.me) { scheduleRefresh(); loadInbox(); } });
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !typing() && !S.recovery && !/type=recovery/.test(location.hash)) location.reload(); had = true; });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => { swReg = r; r.update().catch(() => {}); if ('Notification' in window && Notification.permission === 'granted') setTimeout(() => { if (S.me && !DEMO) { safeSet('maison-notif', '1'); subscribePush(); } }, 4000); }).catch(e => console.warn('sw', e));   // permission déjà donnée : on (ré)inscrit ce téléphone
    document.addEventListener('visibilitychange', () => { if (!document.hidden) swReg?.update().catch(() => {}); });
  }
  // Lien « mot de passe oublié » : on le repère dans l'adresse avant que la connexion ne la lise.
  // (L'événement PASSWORD_RECOVERY part pendant getSession(), avant que l'écoute ci-dessous existe.)
  // Gardé aussi pour l'onglet : si la page se recharge (nouvelle version de l'app), l'adresse a perdu le lien.
  if (/type=recovery/.test(location.hash + location.search)) { try { sessionStorage.setItem('maison-recovery', String(Date.now())); } catch {} }
  const fromRecovery = (() => { try { return Date.now() - Number(sessionStorage.getItem('maison-recovery') || 0) < 3600000; } catch { return false; } })();
  const { createClient } = await import('./vendor/supabase-js-2.49.4.js');
  sb = createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  api = tracked(remoteApi(sb));

  const { data: { session } } = await sb.auth.getSession();
  S.me = session?.user?.email?.toLowerCase() || null;
  if (fromRecovery && S.me) { S.recovery = true; history.replaceState(null, '', appUrl()); }
  S.ready = true; preloadAzami();
  if (S.me) await refresh(); else render();

  let channel = null;
  const listen = () => {
    if (channel) return;
    channel = sb.channel('maison')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => { if (S.me) scheduleRefresh(); })
      .subscribe(status => { if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.warn('realtime', status); });
  };
  const unlisten = () => { if (channel) { sb.removeChannel(channel); channel = null; } };
  if (S.me) { listen(); presenceJoin(); }

  sb.auth.onAuthStateChange((evt, sess) => {
    if (evt === 'PASSWORD_RECOVERY') { S.recovery = true; S.me = sess?.user?.email?.toLowerCase() || S.me; render(); return; }
    const email = sess?.user?.email?.toLowerCase() || null;
    if (evt === 'SIGNED_OUT') unlisten();
    if (email === S.me) return;
    S.me = email;
    if (S.me) { listen(); presenceJoin(); refresh(); } else render();
  });
}

boot().catch(e => { console.error(e); $app.innerHTML = '<section class="login"><h1>Maison</h1><p>Impossible de démarrer. Vérifie ta connexion puis recharge la page.</p><button class="btn" onclick="location.reload()">Recharger</button></section>'; });

// Affiches : si une image ne charge pas (réseau lent), on réessaie une fois, puis on met le clap.
document.addEventListener('error', e => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || !img.hasAttribute('data-poster')) return;
  if (!img.dataset.retry) { img.dataset.retry = '1'; const src = img.src; setTimeout(() => { img.src = src + (src.includes('?') ? '&' : '?') + 'r=1'; }, 1200); return; }
  const ph = document.createElement('span'); ph.className = img.className + ' noposter'; ph.setAttribute('aria-hidden', 'true'); ph.innerHTML = icn('film'); img.replaceWith(ph);
}, true);
