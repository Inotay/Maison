// Maison : l'app du foyer.
// Sans configuration Supabase, l'app tourne en mode démo (données locales).

import { iconFor, ICONS as THEME_ICONS, norm, iconView, valueOf, classify, FALLBACK } from './themes.js';
import { PACKS, ACTION_LABEL, EXPENSE_ACTIONS, personKey, actionFor, variantFor, variantSrc, isVariant } from './people.js';
import { SORTES, etat, descente, resume as dechetsResume, PRATIQUE } from './dechets.js';
import { burst, azamiJump, pop, praise, haptic, floatUp, ring, celebrate, wiggle, countUp, armHaptics } from './fx.js';

// Azami : pack d'animations V2 (azami/*.svg), une scène par page, six accueils selon l'heure.
function greeting(h = new Date().getHours()) {
  if (h >= 22 || h < 5) return ['Bonne nuit', 'accueil_nuit'];
  if (h < 9) return ['Bonjour', 'accueil_bonjour'];
  if (h < 11) return ['Bonne matinée', 'accueil_bonne_matinee'];
  if (h < 14) return ['Bon midi', 'accueil_bon_midi'];
  if (h < 18) return ['Bonne après-midi', 'accueil_bonne_apres_midi'];
  return ['Bonsoir', 'accueil_bonsoir'];
}
// Azami : une image par scène, chargée une fois au démarrage et déplacée dans la page
// à chaque rendu (jamais recréée), pour qu'elle apparaisse tout de suite.
const SCENES = ['accueil_bonjour', 'accueil_bonne_matinee', 'accueil_bon_midi', 'accueil_bonne_apres_midi', 'accueil_bonsoir', 'accueil_nuit', 'menage', 'courses', 'argent', 'nuit_care'];
const azamiImgs = {};
function azamiImg(scene) {
  if (!azamiImgs[scene]) {
    const img = new Image(512, 568);
    img.className = 'azami'; img.decoding = 'sync'; img.src = `azami/azami_${scene}_anime.svg`;
    azamiImgs[scene] = img;
  }
  return azamiImgs[scene];
}
const azami = (scene, alt) => `<span class="azami-slot" data-scene="${scene}" data-alt="${esc(alt)}"></span>`;
function placeAzami() {
  document.querySelectorAll('.azami-slot').forEach(slot => {
    const img = azamiImg(slot.dataset.scene); img.alt = slot.dataset.alt;
    slot.replaceWith(img);
  });
}
function preloadAzami() {
  const now = greeting(new Date().getHours()).scene;
  azamiImg(now);
  setTimeout(() => SCENES.forEach(azamiImg), 1500);
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
  tasks: [], chores: [], choreLog: [], expenses: [], shopping: [], board: [], care: [], wins: [],
  view: safeGet('maison-view') || 'maison',
  agendaHouse: safeGet('maison-agenda-house') !== '0',
  dechetsOpen: safeGet('maison-dechets-open') !== '0',
  maisonTab: 'faire',
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
const THEME_COLORS = { ciel: '#53A5C7', brun: '#2A1C15' };
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
const SILENT_WAV = 'data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';
let silentTrack = null;
function unlockAudio() {
  try {
    if (!silentTrack) {
      silentTrack = new Audio(SILENT_WAV);
      silentTrack.loop = true; silentTrack.volume = 0.01; silentTrack.setAttribute('playsinline', '');
    }
    silentTrack.play().catch(() => {});
    ctxAudio();
  } catch {}
}
['touchend', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, unlockAudio, { passive: true }));
document.addEventListener('visibilitychange', () => { if (document.hidden) silentTrack?.pause(); });

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
function sfx(kind) {
  try {
    if (sfxFile[kind]) { const a = new Audio(sfxFile[kind]); a.volume = .7; a.play().catch(() => {}); return; }
    const c = ctxAudio(), t = c.currentTime + .01;
    const N = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, D6: 1174.66, E6: 1318.5, G6: 1567.98, C7: 2093 };
    if (kind === 'tick') { note(c, N.G5, t, .12, .12, 'sine'); }
    else if (kind === 'done') { note(c, N.G5, t, .28, .22); note(c, N.C6, t + .11, .4, .22); shimmer(c, t + .11, .25, .05); }
    else if (kind === 'big') { [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => note(c, f, t + i * .085, .35, .2)); note(c, N.E6, t + .34, .7, .2); note(c, N.G6, t + .42, .8, .14); shimmer(c, t + .34, .5, .07); }
    else if (kind === 'coin') { note(c, N.D6, t, .18, .16, 'square'); note(c, N.A5 * 2, t + .07, .5, .14, 'sine'); shimmer(c, t, .12, .03); }
    else if (kind === 'heart') { note(c, N.C5, t, .9, .12, 'sine'); note(c, N.E5, t + .03, .9, .11, 'sine'); note(c, N.G5, t + .06, 1, .1, 'sine'); note(c, N.C6, t + .25, .9, .08, 'sine'); }
  } catch {}
}

function meow(force) {
  if (!force && Math.random() > 0.18) return;
  try {
    if (meowFile) { const a = new Audio(meowFile); a.volume = .6; a.play().catch(() => {}); return; }
    const c = ctxAudio();
    const t = c.currentTime;
    const osc = c.createOscillator(), osc2 = c.createOscillator();
    const f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), g = c.createGain();
    osc.type = 'sawtooth'; osc2.type = 'triangle';
    osc.frequency.setValueAtTime(520, t); osc.frequency.linearRampToValueAtTime(760, t + .18); osc.frequency.exponentialRampToValueAtTime(430, t + .62);
    osc2.frequency.setValueAtTime(521, t); osc2.frequency.linearRampToValueAtTime(764, t + .18); osc2.frequency.exponentialRampToValueAtTime(433, t + .62);
    f1.type = 'bandpass'; f1.Q.value = 5; f1.frequency.setValueAtTime(900, t); f1.frequency.linearRampToValueAtTime(1900, t + .2); f1.frequency.linearRampToValueAtTime(1100, t + .6);
    f2.type = 'lowpass'; f2.frequency.value = 3200;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.16, t + .06); g.gain.setValueAtTime(.16, t + .4); g.gain.exponentialRampToValueAtTime(.001, t + .7);
    osc.connect(f1); osc2.connect(f1); f1.connect(f2); f2.connect(g); g.connect(c.destination);
    osc.start(t); osc2.start(t); osc.stop(t + .72); osc2.stop(t + .72);
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
    async list(t, o = {}) {
      let q = client.from(t).select('*');
      if (o.gte) q = q.gte(o.gte[0], o.gte[1]);
      if (o.order) q = q.order(o.order[0], { ascending: o.order[1] });
      if (o.limit) q = q.limit(o.limit);
      return ok(await q) || [];
    },
    async insert(t, row) { return ok(await client.from(t).insert(row).select().single()); },
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
    async upsert(t, row) {
      const key = t === 'icon_hints' ? 'word' : t === 'push_subscriptions' ? 'endpoint' : 'email';
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
      { id: uid(), title: "Litière d'Azami", every_days: 2, turn: M, last_done_at: iso(1), last_done_by: Y, created_by: M, created_at: iso(30) },
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
  try {
    if (swReg && CFG.vapidPublicKey && sb) {
      const sub = await swReg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey(CFG.vapidPublicKey) });
      await api.upsert('push_subscriptions', { endpoint: sub.endpoint, email: S.me, sub: sub.toJSON() });
    }
  } catch (e) { console.warn('push', e); }
  toast('Notifications activées');
  render();
}
function vapidKey(b64) {
  const pad = '='.repeat((4 - b64.length % 4) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
const notifOn = () => 'Notification' in window && Notification.permission === 'granted' && safeGet('maison-notif') === '1';

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
const iconOf = (type, row) => row.icon || iconFor(labelOf(type, row), ctxOf[type], S.hints);

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
  if (isVariant(row.icon)) return row.icon;
  const theme = autoTheme(labelOf(type, row) || '', row.icon, ctxOf[type]);
  const action = actionFor(theme);
  if (type === 'expenses' && !EXPENSE_ACTIONS.has(action)) return base;
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
  const [members, tasks, chores, choreLog, expenses, shopping, board, care, hints, wins] = await Promise.all([
    api.list('members'), api.list('tasks'), api.list('chores'), api.list('chore_log', { gte: ['done_at', since] }),
    api.list('expenses', { order: ['spent_on', false], limit: 500 }), api.list('shopping'), api.list('board'), api.list('care_messages'),
    api.list('icon_hints').catch(() => []), api.list('wins', { order: ['done_at', false], limit: 2000 }).catch(() => []),
  ]);
  wins.sort((a, b) => String(b.done_at).localeCompare(String(a.done_at)));
  loadAgenda();
  Object.assign(S, { members, tasks, chores, choreLog, expenses, shopping, board, care, wins, hints: hintsFrom(hints) });
  await ensureDechets();
  notifyNew();
  if (!DEMO) safeSet('maison-snapshot', JSON.stringify({ me: S.me, at: Date.now(), members, tasks, chores: S.chores, choreLog, expenses, shopping, board, wins }));
}

// Les quatre sortes de déchets existent toujours comme corvées (sans tour, liées au calendrier de ramassage).
async function ensureDechets() {
  for (const s of SORTES) {
    if (S.chores.some(c => c.sorte === s.id)) continue;
    const row = { title: s.label, every_days: s.every, weight: 1, fixed: true, turn: null, sorte: s.id, icon: `t:${s.icon}` };
    try { const r = await api.insert('chores', row); S.chores.push(r || row); } catch (e) { console.warn('déchets', e); }
  }
}

// Sans réseau : on affiche le dernier instantané (lecture seule, sans Care).
function loadSnapshot() {
  try {
    const snap = JSON.parse(safeGet('maison-snapshot') || 'null');
    if (!snap || snap.me !== S.me) return false;
    Object.assign(S, { members: snap.members, tasks: snap.tasks, chores: snap.chores, choreLog: snap.choreLog, expenses: snap.expenses, shopping: snap.shopping, board: snap.board, wins: snap.wins || [], care: [], snapshotAt: snap.at });
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
function scheduleRefresh() { clearTimeout(refreshTimer); refreshTimer = setTimeout(refresh, 400); }

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
function win(kind, title, weight = 1, icon = null) {
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
  setTimeout(() => { haptic('heavy'); celebrate({ title: `Jour ${n} de suite`, sub: n >= 7 ? 'Une semaine entière. Azami est fière.' : 'Ensemble, chaque jour.' }); }, delay);
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

// Rendu ----------------------------------------------------------------------

const ICONS = {
  maison: '<path d="M4 10.5 12 4l8 6.5V20H4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 20v-5h4v5" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  menage: '<path d="M14 3 10.5 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M7 11h8l2 9H5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 15v5M13 15v5" stroke="currentColor" stroke-width="1.2"/>',
  courses: '<path d="M4 9h16l-1.6 10H5.6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.5 9 11 4M15.5 9 13 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  argent: '<rect x="3.5" y="6.5" width="17" height="11" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  nuit: '<path d="M12 20s-7-4.4-7-9.6A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.4C19 15.6 12 20 12 20z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
};

function nav() {
  const openShop = S.shopping.filter(s => !s.checked).length;
  const unread = S.care.filter(c => c.recipient === S.me && !c.read_at).length;
  const items = [['maison', 'Maison'], ['menage', 'Ménage'], ['courses', 'Courses'], ['argent', 'Argent'], ['nuit', 'Care']];
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

function viewOffline() {
  return `<section class="login"><h1>Maison</h1>
    <p>Impossible de joindre la maison pour le moment. Vérifie la connexion, puis réessaie.</p>
    <button class="btn" data-action="retry">Réessayer</button>
    <button class="link" data-action="logout">Se déconnecter</button></section>`;
}

function render() {
  if (!S.ready) { $app.innerHTML = ''; return; }
  if (S.offline && !S.members.length) { $app.innerHTML = viewOffline(); return; }
  if (S.offline && S.view === 'nuit') S.view = 'maison';
  if (S.recovery) S.login.step = 'newpass';
  if (!S.me || S.recovery) { document.body.dataset.time = 'jour'; $app.innerHTML = viewLogin(); return; }
  if (!S.members.some(m => m.email === S.me)) { $app.innerHTML = viewNotMember(); return; }

  // garder ce qui est en cours de saisie
  const kept = {};
  $app.querySelectorAll('[data-keep]').forEach(el => { kept[el.id] = el.type === 'checkbox' ? el.checked : el.value; });
  const focusId = document.activeElement?.id;
  const folds = new Set([...$app.querySelectorAll('details[data-fold][open]')].map(d => d.dataset.fold));
  const sel = typing() ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;

  document.body.dataset.time = 'jour';
  applyTheme();

  const views = { maison: viewMaison, menage: viewMenage, courses: viewCourses, argent: viewArgent, nuit: viewNuit };
  $app.innerHTML = demoBar() + (views[S.view] || viewMaison)() + nav();
  placeAzami();
  armHaptics($app);

  folds.forEach(k => { const d = $app.querySelector(`details[data-fold="${k}"]`); if (d) d.open = true; });
  $app.querySelector('details[data-fold="dechets"]')?.addEventListener('toggle', e => { S.dechetsOpen = e.target.open; safeSet('maison-dechets-open', e.target.open ? '1' : '0'); });
  if (S.popId) { const id = S.popId; S.popId = null; const row = (document.getElementById('tick-' + id) || document.getElementById('done-' + id))?.closest('.item, .chore'); pop(row); wiggle(row); }
  const wb = document.querySelector('.wins-big b');
  if (wb) { const to = Number(wb.textContent); if (S.weekShown != null && S.weekShown !== to) { wb.textContent = S.weekShown; countUp(wb, to); wiggle(wb.closest('.wins')); } S.weekShown = to; }
  for (const [id, v] of Object.entries(kept)) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.type === 'checkbox') el.checked = v; else el.value = v;
  }
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
    return `<section class="login"><h1>Maison</h1>
      <p>${esc(S.login.note)}</p>
      <button class="btn ghost" data-action="login-mode" data-mode="login">Retour à la connexion</button></section>`;
  }
  if (step === 'newpass') {
    return `<section class="login"><h1>Maison</h1>
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
    <h1>Maison</h1>
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
  return `<section class="login"><h1>Maison</h1>
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

function viewMaison() {
  const [hello, scene] = greeting();
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
  const waste = S.chores.filter(c => c.sorte);
  lines.push(['Déchets', dechetsResume(waste), 'menage', waste.some(c => choreStatus(c).due && descente(SORTES.find(x => x.id === c.sorte), c).possible)]);
  lines.push([shop > 1 ? 'Articles sur la liste de courses' : 'Article sur la liste de courses', shop, 'courses', false]);
  const ne = S.agenda.configured ? nextEvent() : null;
  if (ne) lines.push([`${relDay(evDay(ne))} · ${ne.title}`, ne.allDay ? 'journée' : evTime(ne.start), 'agenda', false]);

  return `<header class="hd centered">
    <button class="azami-btn" data-action="meow" aria-label="Faire miauler Azami">${azami(scene, 'Azami vous accueille')}</button>
    <h1>${hello} ${esc(firstName())}</h1><p class="hd-kicker">${esc(date)}</p></header>
    <div class="glance">${lines.map(([label, num, to, late]) =>
      `<button class="${late ? 'late' : ''}" data-action="glance" data-to="${to}"><span>${esc(label)}</span><span class="g-num ${String(num).length > 7 ? 'small' : ''}">${esc(num)}</span></button>`).join('')}</div>
    ${winsCard()}
    <div class="seg" role="group" aria-label="Affichage">
      <button data-action="maison-tab" data-tab="faire" aria-pressed="${S.maisonTab === 'faire'}">À faire${S.tasks.filter(t => !t.done).length ? ` · ${S.tasks.filter(t => !t.done).length}` : ''}</button>
      <button data-action="maison-tab" data-tab="agenda" aria-pressed="${S.maisonTab === 'agenda'}">Agenda</button>
      <button data-action="maison-tab" data-tab="tableau" aria-pressed="${S.maisonTab === 'tableau'}">Tableau</button>
    </div>
    ${S.maisonTab === 'faire' ? viewTasks() : S.maisonTab === 'agenda' ? viewAgenda() : viewBoard()}
    ${recentEvents().length ? `<details class="fold" data-fold="recent"><summary>Récemment</summary><ul class="recent">${recentEvents().map(e =>
      `<li><span class="who">${esc(e.who === S.me ? 'Toi' : e.who ? nameOf(e.who) : '')}</span> ${esc(e.text)}<span class="when">${esc(ago(e.at))}</span></li>`).join('')}</ul></details>` : ''}
    <div class="theme-row"><span>Thème sur cet appareil</span><div class="seg" role="group" aria-label="Thème">
      <button data-action="theme" data-theme="ciel" aria-pressed="${THEME === 'ciel'}">Ciel</button>
      <button data-action="theme" data-theme="brun" aria-pressed="${THEME === 'brun'}">Brun</button></div></div>
    <div class="foot">${DEMO ? '<button class="link" data-action="demo-reset">Remettre la démo à zéro</button>' : '<button class="link" data-action="logout">Se déconnecter</button>'}<span class="version">v37</span></div>`;
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
      ${iconHtml(displayIcon('tasks', t))}<div class="item-main"><div class="item-title">${esc(t.title)}</div><div class="item-meta ${h.late ? 'late' : ''}">${esc(meta)}</div></div></li>`;
  }
  const c = h.row;
  const who = !c.turn ? 'Qui veut' : c.turn === S.me ? 'À toi' : `À ${nameOf(c.turn)}`;
  const meta = c.sorte ? `Déchets · ${dechetMeta(c)}` : ['Ménage', who, h.late ? h.st.label : ''].filter(Boolean).join(' · ');
  return `<li class="item house">${iconHtml(displayIcon('chores', c))}<div class="item-main"><div class="item-title">${esc(c.title)}</div><div class="item-meta ${h.late ? 'late' : ''}">${esc(meta)}</div></div>
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
    ${blocks || '<p class="empty">Rien de prévu dans les trois prochains mois.</p>'}
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
  const open = S.tasks.filter(t => !t.done).sort((a, b) => (a.due_on || '9999') .localeCompare(b.due_on || '9999') || a.created_at.localeCompare(b.created_at));
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
    return `<li class="item ${t.done ? (fresh.includes(t) ? 'done fresh' : 'done') : ''}">
      <button class="tick" id="tick-${t.id}" role="checkbox" aria-checked="${t.done}" aria-label="Fait : ${esc(t.title)}" data-action="task-toggle" data-id="${t.id}"></button>
      ${iconBtn('tasks', t)}<div class="item-main"><div class="item-title">${esc(t.title)}</div><div class="item-meta ${late ? 'late' : ''}">${esc(meta.join(', '))}</div></div>
      <button class="more" id="more-${t.id}" aria-label="Options" aria-expanded="${S.open === t.id}" data-action="more" data-id="${t.id}">⋯</button>
      ${iconPicker('tasks', t)}
      ${S.open === t.id ? `<div class="item-actions"><button class="btn ghost small" data-action="edit" data-type="tasks" data-id="${t.id}">Modifier</button>${who.filter(w => w[0] !== 'other' || other()).map(([k, l]) => `<button class="btn ghost small" data-action="task-assign" data-id="${t.id}" data-who="${k}">Pour ${k === 'me' ? 'moi' : k === 'nous' ? 'nous deux' : esc(l)}</button>`).join('')}<button class="btn ghost small" data-action="task-delete" data-id="${t.id}">Supprimer</button></div>` : ''}
    </li>`;
  };
  return `<h2 class="list-head">À faire${open.length ? ` <span class="count">${open.length}</span>` : ''}</h2>
    ${open.length ? `<ul class="list">${open.map(item).join('')}</ul>` : '<p class="empty">Plus rien à faire. Profitez-en.</p>'}
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
    ${c.sorte ? '' : chipGroup('edit-who', [['tour', 'À tour de rôle'], ['any', 'Qui veut'], ...who.map(([e, l]) => [e, `Toujours ${l === 'Moi' ? 'moi' : l}`])], c.fixed ? (c.turn || 'any') : 'tour', 'Qui')}
    ${!c.sorte && chipVal('edit-who', c.fixed ? (c.turn || 'any') : 'tour') === 'tour' ? chipGroup('edit-turn', who, c.turn || S.me, 'À qui le tour') : ''}
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
  return `<button class="btn dech-btn ${st.due ? 'due' : 'done'} ${off}" id="done-${c.id}" data-action="chore-done" data-id="${c.id}">Fait</button>`;
}
function dechetMeta(c, now = new Date()) {
  const s = SORTES.find(x => x.id === c.sorte);
  const st = choreStatus(c);
  const d = descente(s, c, now);
  if (st.due && !d.possible) return `À descendre, normalement dès ${d.until} (ramassage)`;
  if (st.due) return d.state === 'route' ? 'À descendre, au bout du chemin sur la route de Genève' : (st.late ? `À descendre, ${st.label}` : 'À descendre');
  return `Prochaine fois ${st.label}${c.last_done_by ? `, par ${c.last_done_by === S.me ? 'toi' : nameOf(c.last_done_by)}` : ''}`;
}
function dechetsCard(waste) {
  const now = new Date();
  const dots = waste.map(c => { const st = choreStatus(c); const d = descente(SORTES.find(x => x.id === c.sorte), c, now); return `<span class="dot ${st.due ? 'dot-non' : 'dot-ok'} ${d.possible ? '' : 'off'}" title="${esc(c.title)}"></span>`; }).join('');
  const rows = waste.map(c => {
    if (S.edit?.id === c.id) return `<li class="dech-row editing">${editChore(c)}</li>`;
    return `<li class="dech-row">${iconBtn('chores', c)}<div class="item-main"><div class="item-title">${esc(c.title)}</div><div class="item-meta">${esc(dechetMeta(c, now))}</div></div>
      <div class="item-trail">${choreBtn(c, now)}<button class="more" id="more-${c.id}" aria-label="Options" aria-expanded="${S.open === c.id}" data-action="more" data-id="${c.id}">⋯</button></div>
      ${iconPicker('chores', c)}
      ${S.open === c.id ? `<div class="item-actions"><button class="btn ghost small" data-action="edit" data-type="chores" data-id="${c.id}">Modifier</button></div>` : ''}</li>`;
  }).join('');
  return `<details class="chore dech-card" data-fold="dechets" ${S.dechetsOpen === false ? '' : 'open'}><summary><img class="ticon" src="icons/themes/poubelle.webp" alt="" width="34" height="34"><div class="item-main"><div class="item-title">Déchets</div><div class="item-meta">${esc(dechetsResume(waste, now))}</div></div><div class="item-trail dots">${dots}</div></summary>
    <ul class="dech-list">${rows}</ul></details>`;
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
  const chores = S.chores.filter(c => !c.sorte).sort((a, b) => choreStatus(a).d - choreStatus(b).d);
  const who = S.members.map(m => [m.email, m.email === S.me ? 'Moi' : m.name]);

  return `<header class="hd row"><div><p class="hd-kicker">Corvées et tournus</p><h1>Ménage</h1></div><button class="azami-btn" data-action="meow" aria-label="Faire miauler Azami">${azami('menage', 'Azami passe le balai')}</button></header>
    ${dechetsCard(waste)}
    <h2 class="list-head">Corvées</h2>
    ${chores.length ? `<div class="chores">${chores.map(c => {
      const st = choreStatus(c);
      const mine = c.turn === S.me;
      if (S.edit?.id === c.id) return `<div class="chore editing">${editChore(c)}</div>`;
      return `<div class="chore ${mine ? 'mine' : ''} ${st.late ? 'late' : ''}">
        ${iconBtn('chores', c)}<div class="item-main"><div class="c-title">${esc(c.title)}</div>
          <div class="c-meta">${!c.turn ? 'Qui veut' : c.fixed ? (mine ? 'Toujours toi' : `Toujours ${esc(nameOf(c.turn))}`) : (mine ? 'À toi' : `À ${esc(nameOf(c.turn))}`)}, <span class="c-when">${esc(st.label)}</span></div>
          <div class="c-meta">${esc(freqLabel(c.every_days))}${weightLabel(c.weight) ? `, ${weightLabel(c.weight)}` : ''}${c.last_done_by ? `, dernière fois par ${esc(c.last_done_by === S.me ? 'toi' : nameOf(c.last_done_by))}` : ''}</div></div>
        <div class="item-trail">
          ${choreBtn(c)}
          <button class="more" id="more-${c.id}" aria-label="Options" aria-expanded="${S.open === c.id}" data-action="more" data-id="${c.id}">⋯</button>
        </div>
        ${iconPicker('chores', c)}
        ${S.open === c.id ? `<div class="item-actions"><button class="btn ghost small" data-action="edit" data-type="chores" data-id="${c.id}">Modifier</button>${c.fixed || !c.turn ? '' : `<button class="btn ghost small" data-action="chore-swap" data-id="${c.id}">Passer le tour à ${esc(nameOf(S.members.find(m => m.email !== c.turn)?.email))}</button>`}<button class="btn ghost small" data-action="chore-delete" data-id="${c.id}">Supprimer</button></div>` : ''}
      </div>`;
    }).join('')}</div>` : '<p class="empty">Aucune corvée pour l\'instant. Ajoute la première ci-dessous.</p>'}

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
  ['autre', 'Autre', ''],
];
const SHOP_OF_THEME = {
  asiatique: 'asie', nouilles: 'asie', sushi: 'asie', curry: 'asie',
  bricolage: 'maison', reparation: 'maison', lampe: 'maison', electricite: 'maison', cables: 'maison', piles: 'maison', peinture: 'maison', mesures: 'maison',
  meubles: 'maison', deco: 'maison', tapis: 'maison', rideaux: 'maison', etagere: 'maison', futon: 'maison', rangement: 'maison', plantes: 'maison', jardin: 'maison', fleurs: 'maison', bougie: 'maison', textile: 'maison', lit: 'maison', serviettes: 'maison',
  pharmacie: 'pharma', premierssoins: 'pharma', malade: 'pharma', beaute: 'pharma', rasage: 'pharma', dents: 'pharma', regles: 'pharma', intime: 'pharma',
  // ce qu'on trouve à plusieurs endroits
  menage: 'super,maison', plumeau: 'super,maison', aspirateur: 'super,maison', poubelle: 'super,maison', lessive: 'super,maison', vaisselle: 'super,maison', papiertoilette: 'super,maison', hygiene: 'super,pharma', cuisine: 'super,maison', machinecafe: 'super,maison', frigo: 'super,maison',
  litiere: 'azami,super', croquettes: 'azami,super', patee: 'azami,super', friandises: 'azami,super',
  croquettes: 'azami', patee: 'azami', friandises: 'azami', litiere: 'azami', griffoir: 'azami', arbreachat: 'azami', jouetschat: 'azami', antipuces: 'azami', brossechat: 'azami', herbeachat: 'azami', fontaine: 'azami', gamelle: 'azami', caissetransport: 'azami', collierchat: 'azami', antipoils: 'azami', animalerie: 'azami', chat: 'azami',
};
function guessShop(label) { const r = classify(label, S.hints); return (r && SHOP_OF_THEME[r.id]) || 'super'; }
// Un article peut être dans plusieurs rayons (« super,maison ») : il apparaît dans chaque groupe.
const shopsOf = s => { const v = String(s.shop || '').split(',').filter(k => SHOPS.some(x => x[0] === k)); return v.length ? v : guessShop(s.label).split(','); };

function viewCourses() {
  const todo = S.shopping.filter(s => !s.checked).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const cart = S.shopping.filter(s => s.checked);
  const item = s => S.edit?.id === s.id ? `<li class="item editing">${editShop(s)}</li>` : `<li class="item"><button class="tick" id="tick-${s.id}" role="checkbox" aria-checked="${s.checked}" aria-label="${esc(s.label)}" data-action="shop-toggle" data-id="${s.id}"></button>
    ${iconBtn('shopping', s)}<div class="item-main"><div class="item-title">${esc(s.label)}</div>${s.added_by !== S.me ? `<div class="item-meta">Ajouté par ${esc(nameOf(s.added_by))}</div>` : ''}</div>
    <button class="more" id="more-${s.id}" aria-label="Options" aria-expanded="${S.open === s.id}" data-action="more" data-id="${s.id}">⋯</button>
    ${iconPicker('shopping', s)}
    ${S.open === s.id ? `<div class="item-actions"><button class="btn ghost small" data-action="edit" data-type="shopping" data-id="${s.id}">Modifier</button><button class="btn ghost small" data-action="shop-delete" data-id="${s.id}">Retirer</button></div>
      <div class="item-actions shops">${SHOPS.map(([k, l]) => `<button class="btn ghost small" data-action="shop-where" data-id="${s.id}" data-shop="${k}" aria-pressed="${shopsOf(s).includes(k)}">${esc(l)}</button>`).join('')}</div>` : ''}</li>`;
  return `<header class="hd row"><div><p class="hd-kicker">${todo.length ? pl(todo.length, 'article', 'articles') : 'Liste vide'}</p><h1>Courses</h1></div><button class="azami-btn" data-action="meow" aria-label="Faire miauler Azami">${azami('courses', 'Azami fouille le panier')}</button></header>
    <form class="form row" data-form="shop">
      <div class="grow"><label class="sr" for="shop-label">Article</label>
      <input class="field" id="shop-label" data-keep name="label" placeholder="Ajouter (sépare par des virgules)" autocomplete="off" enterkeyhint="done" required></div>
      <button class="btn" type="submit">Ajouter</button>
    </form>
    <div class="shop">${todo.length ? SHOPS.map(([k, l, ex]) => { const list = todo.filter(s => shopsOf(s).includes(k)); return list.length ? `<h2 class="list-head shop-head">${esc(l)}${ex ? ` <span class="hint-inline">${esc(ex)}</span>` : ''}</h2><ul class="list">${list.map(item).join('')}</ul>` : ''; }).join('') : '<p class="empty">Rien à acheter. Ajoute un article quand il manque quelque chose.</p>'}
    ${cart.length ? `<h2>Dans le panier</h2><ul class="list">${cart.map(item).join('')}</ul>
      <div class="form-actions"><button class="btn ghost" data-action="shop-clear">Vider le panier</button></div>` : ''}</div>`;
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

  return `<header class="hd row"><div><p class="hd-kicker">Dépenses partagées</p><h1>Argent</h1></div><button class="azami-btn" data-action="meow" aria-label="Faire miauler Azami">${azami('argent', 'Azami fait sauter une pièce')}</button></header>
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
  return `<header class="hd row"><div><p class="hd-kicker">Rien que pour vous deux</p><h1>Care</h1></div><button class="azami-btn" data-action="meow" aria-label="Faire miauler Azami">${azami('nuit_care', 'Azami tient une enveloppe')}</button></header>
    ${viewCare()}`;
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

  return `<h2 class="first">Ta boîte aux lettres</h2>
    ${unread.length ? `<div class="letters">${unread.map(letter).join('')}</div>` : '<p class="empty">Aucun mot en attente.</p>'}
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
      <button class="link" data-action="care-delete" data-id="${c.id}">Retirer</button></li>`).join('')}</ul></details>` : ''}`;
}


// Actions --------------------------------------------------------------------

const actions = {
  go: el => { S.view = el.dataset.view; S.open = null; safeSet('maison-view', S.view === 'nuit' ? 'maison' : S.view); render(); window.scrollTo(0, 0); if (S.view === 'nuit') refresh(); },
  'agenda-house': () => { S.agendaHouse = S.agendaHouse === false; safeSet('maison-agenda-house', S.agendaHouse ? '1' : '0'); render(); },
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
  'cancel-recovery': () => { S.recovery = false; S.login.step = 'login'; refresh(); },
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
    run(async () => { await api.update('tasks', { id: t.id }, { done: true, done_at: new Date().toISOString() }); await win('task', t.title, 1, t.icon); }, last ? null : praise('task'), t.id)
      .then(ok => { if (!ok) return; azamiJump(); if (last) celebrate({ title: 'Tout est fait !', sub: praise('all'), badge: variantBadge('tasks', t, S.me) }); if (first) streakCheer(last ? 2300 : 400); });
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
  'ev-delete': el => {
    const e = S.agenda.events.find(x => x.id === el.dataset.id); if (!e) return;
    if (!confirm(`Supprimer « ${e.title} » du calendrier partagé ?`)) return;
    S.open = null;
    runAgenda(() => agendaCall({ action: 'delete', href: e.href }), 'Supprimé du calendrier');
  },
  'agenda-refresh': () => { loadAgenda(); render(); },
  'agenda-forget': () => { if (confirm('Déconnecter le calendrier ? Rien n\'est effacé dans iCloud ; le mot de passe d\'application est oublié.')) runAgenda(() => agendaCall({ action: 'forget' }), 'Calendrier déconnecté'); },
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
  'note-delete': el => { if (confirm('Retirer ce mot du tableau ?')) run(() => api.remove('board', { id: el.dataset.id }), 'Retiré du tableau'); },

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
    run(async () => {
      await api.update('chores', { id: c.id }, { last_done_at: new Date().toISOString(), last_done_by: S.me, turn: next });
      await api.insert('chore_log', { chore_id: c.id, title: c.title, weight: c.weight || 2 });
      await win('chore', c.title, c.weight || 2, c.icon);
    }, null, c.id).then(ok => { if (!ok) return; azamiJump(); celebrate({ title: praise('chore'), sub: !next ? `Prochaine fois dans ${c.every_days} jours` : c.fixed ? `Toujours ${next === S.me ? 'toi' : nameOf(next)}` : `Prochain tour : ${nameOf(next)}`, level: 'small', badge: variantBadge('chores', c, S.me) }); if (first) streakCheer(1800); });
  },
  'chore-swap': el => {
    const c = S.chores.find(x => x.id === el.dataset.id);
    if (!c) return refresh();
    const next = S.members.find(m => m.email !== c.turn)?.email;
    S.open = null;
    run(() => api.update('chores', { id: c.id }, { turn: next }), `C'est au tour de ${nameOf(next)}`);
  },
  'chore-delete': el => { if (confirm('Supprimer cette corvée ?')) { S.open = null; run(() => api.remove('chores', { id: el.dataset.id }), 'Corvée supprimée'); } },
  'chore-form': el => { S.showChoreForm = el.dataset.show === '1'; render(); if (S.showChoreForm) document.getElementById('chore-title')?.focus(); },

  'shop-toggle': el => {
    const s = S.shopping.find(x => x.id === el.dataset.id); if (!s) return refresh();
    if (s.checked) { run(() => api.update('shopping', { id: s.id }, { checked: false }), null, s.id); return; }
    meow();
    const last = !S.shopping.some(x => !x.checked && x.id !== s.id), first = !todayHasWin();
    haptic(last ? 'heavy' : 'light');
    ring(el); burst(isAzami(s) ? 'paws' : 'sparkle', el, isAzami(s) ? 6 : 9);
    sfx(last ? 'big' : 'tick');
    S.popId = s.id;
    run(async () => { await api.update('shopping', { id: s.id }, { checked: true }); if (last) await win('shop', `Courses : ${S.shopping.length} articles`, 1); }, null, s.id)
      .then(ok => { if (ok && last) { azamiJump(); celebrate({ title: 'Panier complet !', sub: praise('basket'), badge: variantSrc(variantFor(personOf(S.me), 'courses') || '') }); if (first) streakCheer(2300); } });
  },
  'shop-clear': () => run(() => api.remove('shopping', { checked: true }), 'Panier vidé'),

  'settle-undo': el => { if (confirm('Annuler ce remboursement ? Le solde sera recalculé comme s\'il n\'avait pas eu lieu.')) { S.open = null; run(() => api.remove('expenses', { id: el.dataset.id }), 'Remboursement annulé'); } },
  'exp-delete': el => { if (confirm('Supprimer cette dépense ?')) { S.open = null; run(() => api.remove('expenses', { id: el.dataset.id }), 'Dépense supprimée'); } },
  settle: () => {
    const net = balances()[S.me] || 0;
    const o = other();
    const payer = net < 0 ? S.me : o;
    const amt = Math.round(Math.abs(net) * 100) / 100;
    if (pending.has('settle')) return;
    if (!confirm(`Enregistrer un remboursement de ${chf(amt)} francs ? Le solde revient à zéro. Rien n'est effacé : les dépenses restent dans la liste et le remboursement peut être annulé après coup.`)) return;
    sfx('coin'); haptic('heavy');
    burst('coins', document.querySelector('[data-action="settle"]'), 22);
    run(async () => { await api.insert('expenses', { label: 'Remboursement', amount: amt, paid_by: payer, payer_share: 0, category: 'autre', spent_on: isoDate(new Date()), is_settlement: true }); await win('settle', 'Comptes à zéro', 1); }, null, 'settle')
      .then(ok => { if (ok) { azamiJump(); pop(document.querySelector('.bal-card')); celebrate({ title: 'Comptes à zéro', sub: praise('settle'), badge: variantSrc(variantFor(personOf(S.me), 'budget') || '') }); } });
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
  'care-delete': el => { if (confirm('Retirer ce mot de sa boîte ?')) run(() => api.remove('care_messages', { id: el.dataset.id }), 'Mot retiré'); },


  meow: () => meow(true),
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
  'demo-reset': async () => { if (!confirm('Effacer les données de démo et repartir de l\'exemple ?')) return; try { localStorage.removeItem('maison-demo-v1'); } catch {} api = demoApi(); await refresh(); },
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
    S.recovery = false;
    toast('Mot de passe changé');
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
    const patch = { title, assignee: w === 'me' ? S.me : w === 'other' ? other() : null, due_on: f.due.value || null, due_time: f.time.value || null };
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
    const patch = { title, every_days: Number(chipVal('edit-freq', '7')), weight: Number(chipVal('edit-weight', '2')), fixed: w !== 'tour', turn: w === 'tour' ? chipVal('edit-turn', c0.turn || S.me) : w === 'any' ? null : w, icon: c0.sorte ? c0.icon : iconFor(title, 'chore', S.hints) };
    if (f.last.value) patch.last_done_at = new Date(f.last.value + 'T12:00').toISOString();
    S.edit = null;
    run(() => api.update('chores', { id: f.dataset.id }, patch), 'Modifié');
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
    run(() => api.insert('care_messages', row), `${praise('care')} ${nameOf(other())} le trouvera dans sa boîte.`);
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

document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]');
  if (!f) return;
  e.preventDefault();
  forms[f.dataset.form]?.(f);
});

document.addEventListener('visibilitychange', () => { if (!document.hidden && S.me) refresh(); });
setInterval(() => { if (S.me && !S.offline && (S.view === 'nuit' || notifOn())) refresh(); }, 30000);

// Démarrage ------------------------------------------------------------------

async function boot() {
  if (DEMO) {
    api = demoApi();
    const members = await api.list('members');
    S.me = safeGet('maison-demo-me') || members[0].email;
    S.ready = true;
    await refresh();
    return;
  }
  if ('serviceWorker' in navigator) {
    // Nouvelle version publiée : le service worker se remplace, la page se recharge une fois.
    let had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !typing()) location.reload(); had = true; });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => { swReg = r; r.update().catch(() => {}); }).catch(e => console.warn('sw', e));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) swReg?.update().catch(() => {}); });
  }
  const { createClient } = await import('./vendor/supabase-js-2.49.4.js');
  sb = createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  api = remoteApi(sb);

  const { data: { session } } = await sb.auth.getSession();
  S.me = session?.user?.email?.toLowerCase() || null;
  S.ready = true;
  if (S.me) await refresh(); else render();

  let channel = null;
  const listen = () => {
    if (channel) return;
    channel = sb.channel('maison')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => { if (S.me) scheduleRefresh(); })
      .subscribe(status => { if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.warn('realtime', status); });
  };
  const unlisten = () => { if (channel) { sb.removeChannel(channel); channel = null; } };
  if (S.me) listen();

  sb.auth.onAuthStateChange((evt, sess) => {
    if (evt === 'PASSWORD_RECOVERY') { S.recovery = true; S.me = sess?.user?.email?.toLowerCase() || S.me; render(); return; }
    const email = sess?.user?.email?.toLowerCase() || null;
    if (evt === 'SIGNED_OUT') unlisten();
    if (email === S.me) return;
    S.me = email;
    if (S.me) { listen(); refresh(); } else render();
  });
}

boot().catch(e => { console.error(e); $app.innerHTML = '<section class="login"><h1>Maison</h1><p>Impossible de démarrer. Vérifie ta connexion puis recharge la page.</p><button class="btn" onclick="location.reload()">Recharger</button></section>'; });
