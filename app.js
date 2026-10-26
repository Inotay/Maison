// Maison : l'app du foyer.
// Sans configuration Supabase, l'app tourne en mode démo (données locales).

const CFG = window.MAISON_CONFIG || {};
const DEMO = !(CFG.supabaseUrl && CFG.supabaseKey);
const $app = document.getElementById('app');
const DAY = 86400000;

// État -----------------------------------------------------------------------

const S = {
  ready: false,
  me: null,            // e-mail de la personne connectée
  members: [],
  tasks: [], chores: [], choreLog: [], expenses: [], shopping: [], board: [], care: [],
  libido: null, match: false,
  view: safeGet('maison-view') || 'maison',
  maisonTab: 'faire',
  nuitTab: 'care',
  open: null,          // élément dont les actions sont dépliées
  openLetter: null,
  chips: {},           // sélections des groupes de puces
  login: { step: 'login', email: '' },
  recovery: false,     // arrivée par un lien « mot de passe oublié »
  showChoreForm: false,
  showExpenseForm: false,
};

let api = null;
let sb = null;

function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch {} }

// Outils ---------------------------------------------------------------------

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pl = (n, one, many) => `${n} ${n > 1 ? many : one}`;
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
const nameOf = email => S.members.find(m => m.email === email)?.name || (email ? email.split('@')[0] : 'Nous deux');
const other = () => S.members.find(m => m.email !== S.me)?.email;
const firstName = () => nameOf(S.me);

const chf = n => new Intl.NumberFormat('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function dayDiff(a, b) { return Math.round((startOfDay(a) - startOfDay(b)) / DAY); }
function isoDate(d) { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; }

function relDay(dateStr) {
  const d = dayDiff(new Date(dateStr + 'T12:00'), new Date());
  if (d === 0) return "aujourd'hui";
  if (d === 1) return 'demain';
  if (d === -1) return 'hier';
  if (d < 0) return `il y a ${pl(-d, 'jour', 'jours')}`;
  if (d < 7) return new Date(dateStr + 'T12:00').toLocaleDateString('fr-CH', { weekday: 'long' });
  return new Date(dateStr + 'T12:00').toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' });
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
function meow(force) {
  if (!force && Math.random() > 0.18) return;
  try {
    if (meowFile) { const a = new Audio(meowFile); a.volume = .6; a.play().catch(() => {}); return; }
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const c = audioCtx, t = c.currentTime;
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

const FREQS = [[1, 'Chaque jour'], [2, 'Tous les 2 jours'], [3, 'Tous les 3 jours'], [7, 'Chaque semaine'], [14, 'Toutes les 2 semaines'], [30, 'Chaque mois']];
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
  if (!db) db = demoSeed();
  const save = () => safeSet(KEY, JSON.stringify(db));
  const owners = { tasks: 'created_by', chores: 'created_by', chore_log: 'done_by', expenses: 'created_by', shopping: 'added_by', board: 'author', care_messages: 'author', libido: 'email' };
  const visible = (t, r) => t === 'care_messages' ? (r.author === S.me || r.recipient === S.me) : t === 'libido' ? r.email === S.me : true;
  const matches = (r, m) => Object.entries(m).every(([k, v]) => r[k] === v);
  const live = r => r && r.is_on && (!r.until || new Date(r.until) > new Date());
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
      const r = { ...row, email: row.email || S.me };
      db[t] = (db[t] || []).filter(x => x.email !== r.email); db[t].push(r); save();
    },
    async remove(t, m) { db[t] = (db[t] || []).filter(r => !matches(r, m)); save(); },
    async rpc(n, a) {
      if (n === 'libido_match') {
        const mine = db.libido.find(r => r.email === S.me);
        const theirs = db.libido.find(r => r.email !== S.me);
        return live(mine) && live(theirs);
      }
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
      { id: uid(), title: 'Sortir les poubelles', every_days: 7, turn: Y, last_done_at: iso(8), last_done_by: M, created_by: Y, created_at: iso(30) },
      { id: uid(), title: "Litière d'Azami", every_days: 2, turn: M, last_done_at: iso(1), last_done_by: Y, created_by: M, created_at: iso(30) },
      { id: uid(), title: 'Aspirateur', every_days: 7, turn: M, last_done_at: iso(3), last_done_by: Y, created_by: Y, created_at: iso(30) },
      { id: uid(), title: 'Salle de bain', every_days: 14, turn: Y, last_done_at: iso(10), last_done_by: M, created_by: Y, created_at: iso(30) },
      { id: uid(), title: 'Changer les draps', every_days: 14, turn: M, last_done_at: null, last_done_by: null, created_by: M, created_at: iso(30) },
    ],
    chore_log: [
      ...[1, 5, 9, 12, 17, 20].map(d => ({ id: uid(), title: '', done_by: Y, done_at: iso(d) })),
      ...[3, 8, 10, 15, 22].map(d => ({ id: uid(), title: '', done_by: M, done_at: iso(d) })),
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
    libido: [{ email: M, is_on: true, until: new Date(now + 6 * 3600000).toISOString(), updated_at: iso(0) }],
  };
}

// Chargement -----------------------------------------------------------------

async function loadAll() {
  const since = new Date(Date.now() - 30 * DAY).toISOString();
  const [members, tasks, chores, choreLog, expenses, shopping, board, care, lib] = await Promise.all([
    api.list('members'), api.list('tasks'), api.list('chores'), api.list('chore_log', { gte: ['done_at', since] }),
    api.list('expenses'), api.list('shopping'), api.list('board'), api.list('care_messages'), api.list('libido'),
  ]);
  Object.assign(S, { members, tasks, chores, choreLog, expenses, shopping, board, care });
  S.libido = lib.find(r => r.email === S.me) || null;
  S.match = !!(await api.rpc('libido_match'));
}

async function refresh() {
  try { await loadAll(); render(); } catch (e) { console.error(e); toast('Connexion impossible pour le moment.'); }
}

let refreshTimer = null;
function scheduleRefresh() { clearTimeout(refreshTimer); refreshTimer = setTimeout(refresh, 400); }

async function run(fn, okMsg) {
  try { await fn(); if (okMsg) toast(okMsg); await loadAll(); render(); }
  catch (e) { console.error(e); toast("Ça n'a pas marché. Vérifie la connexion et réessaie."); }
}

// Libido ---------------------------------------------------------------------

function libidoLive() {
  const r = S.libido;
  return !!(r && r.is_on && (!r.until || new Date(r.until) > new Date()));
}
function untilFor(choice) {
  const now = new Date();
  if (choice === '1h') return new Date(now.getTime() + 3600000);
  if (choice === '24h') return new Date(now.getTime() + DAY);
  const t = new Date(now); t.setHours(4, 0, 0, 0);
  if (t <= now) t.setDate(t.getDate() + 1);
  return t; // « ce soir » : jusqu'à 4 h du matin
}

// Argent ---------------------------------------------------------------------

function balances() {
  const net = Object.fromEntries(S.members.map(m => [m.email, 0]));
  for (const e of S.expenses) {
    const o = S.members.find(m => m.email !== e.paid_by)?.email;
    if (!o) continue;
    const owed = Number(e.amount) * (1 - Number(e.payer_share));
    net[e.paid_by] += owed;
    net[o] -= owed;
  }
  return net;
}

// Ménage ---------------------------------------------------------------------

function choreStatus(c) {
  if (!c.last_done_at) return { d: 0, label: 'jamais faite', due: true, late: false };
  const due = new Date(c.last_done_at); due.setDate(due.getDate() + c.every_days);
  const d = dayDiff(due, new Date());
  if (d > 1) return { d, label: `dans ${d} jours`, due: false, late: false };
  if (d === 1) return { d, label: 'demain', due: false, late: false };
  if (d === 0) return { d, label: "aujourd'hui", due: true, late: false };
  return { d, label: `en retard de ${pl(-d, 'jour', 'jours')}`, due: true, late: true };
}

// Rendu ----------------------------------------------------------------------

const ICONS = {
  maison: '<path d="M4 10.5 12 4l8 6.5V20H4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 20v-5h4v5" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  menage: '<path d="M14 3 10.5 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M7 11h8l2 9H5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 15v5M13 15v5" stroke="currentColor" stroke-width="1.2"/>',
  courses: '<path d="M4 9h16l-1.6 10H5.6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.5 9 11 4M15.5 9 13 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  argent: '<rect x="3.5" y="6.5" width="17" height="11" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  nuit: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
};

const FACE = `<svg class="face" viewBox="0 0 300 250" aria-hidden="true">
  <g class="ear"><path d="M58 120 L40 20 L120 70 Z" fill="#1C120C"/><path d="M66 104 L56 46 L104 76 Z" fill="#3A2A20"/></g>
  <g class="ear r"><path d="M242 120 L260 20 L180 70 Z" fill="#1C120C"/><path d="M234 104 L244 46 L196 76 Z" fill="#3A2A20"/></g>
  <ellipse cx="150" cy="150" rx="118" ry="96" fill="#F3EBDF"/>
  <ellipse cx="150" cy="150" rx="78" ry="70" fill="#1C120C"/>
  <g><circle cx="112" cy="140" r="30" fill="#F3EBDF"/><g class="iris"><circle cx="112" cy="140" r="22" fill="#9CC4E4"/><circle cx="112" cy="140" r="12" fill="#120C08"/><circle cx="119" cy="132" r="5" fill="#fff"/></g><rect class="lid" x="80" y="108" width="64" height="64" rx="32" fill="#1C120C"/></g>
  <g><circle cx="188" cy="140" r="30" fill="#F3EBDF"/><g class="iris"><circle cx="188" cy="140" r="22" fill="#9CC4E4"/><circle cx="188" cy="140" r="12" fill="#120C08"/><circle cx="195" cy="132" r="5" fill="#fff"/></g><rect class="lid" x="156" y="108" width="64" height="64" rx="32" fill="#1C120C"/></g>
  <path d="M142 178 L158 178 L150 188 Z" fill="#E8907A"/>
  <path d="M150 188 Q150 198 140 198 M150 188 Q150 198 160 198" fill="none" stroke="#F3EBDF" stroke-width="3" stroke-linecap="round"/>
  <g stroke="#F3EBDF" stroke-width="2" stroke-linecap="round" opacity=".8"><path d="M96 184 L50 176 M98 192 L52 196 M204 184 L250 176 M202 192 L248 196"/></g>
</svg>`;

function nav() {
  const openShop = S.shopping.filter(s => !s.checked).length;
  const unread = S.care.filter(c => c.recipient === S.me && !c.read_at).length;
  const items = [['maison', 'Maison'], ['menage', 'Ménage'], ['courses', 'Courses'], ['argent', 'Argent'], ['nuit', 'Nuit']];
  return `<nav class="nav" aria-label="Sections"><ul>${items.map(([k, l]) => {
    let mark = '';
    if (k === 'courses' && openShop) mark = `<span class="badge">${openShop}</span>`;
    if (k === 'nuit' && (unread || S.match)) mark = `<span class="dot" aria-label="Nouveau"></span>`;
    return `<li><button data-action="go" data-view="${k}" ${S.view === k ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>${l}${mark}</button></li>`;
  }).join('')}</ul></nav>`;
}

function demoBar() {
  if (!DEMO) return '';
  return `<div class="demo"><span>Démo : données sur cet appareil</span><button class="link" data-action="demo-swap">Voir comme ${esc(nameOf(other()))}</button></div>`;
}

function render() {
  if (!S.ready) { $app.innerHTML = ''; return; }
  if (S.recovery) S.login.step = 'newpass';
  if (!S.me || S.recovery) { document.body.dataset.time = 'jour'; $app.innerHTML = viewLogin(); return; }
  if (!S.members.some(m => m.email === S.me)) { $app.innerHTML = viewNotMember(); return; }

  // garder ce qui est en cours de saisie
  const kept = {};
  $app.querySelectorAll('[data-keep]').forEach(el => { kept[el.id] = el.type === 'checkbox' ? el.checked : el.value; });
  const focusId = document.activeElement?.id;

  document.body.dataset.time = S.view === 'nuit' ? 'nuit' : 'jour';
  document.querySelector('meta[name="theme-color"]').content = S.view === 'nuit' ? '#1B1C1E' : '#DCDBD6';

  const views = { maison: viewMaison, menage: viewMenage, courses: viewCourses, argent: viewArgent, nuit: viewNuit };
  $app.innerHTML = demoBar() + (views[S.view] || viewMaison)() + nav();

  for (const [id, v] of Object.entries(kept)) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.type === 'checkbox') el.checked = v; else el.value = v;
  }
  if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
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
      </form></section>`;
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

// Maison : coup d'œil, à faire, tableau

function viewMaison() {
  const h = new Date().getHours();
  const hello = h < 5 ? 'Bonne nuit' : h < 18 ? 'Bonjour' : 'Bonsoir';
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
  lines.push([shop > 1 ? 'Articles sur la liste de courses' : 'Article sur la liste de courses', shop, 'courses', false]);

  return `<header class="hd centered">
    <button class="face-btn" data-action="meow" aria-label="Azami">${FACE}</button>
    <h1>${hello} ${esc(firstName())}</h1><p class="hd-kicker">${esc(date)}</p></header>
    <div class="glance">${lines.map(([label, num, to, late]) =>
      `<button class="${late ? 'late' : ''}" data-action="glance" data-to="${to}"><span>${esc(label)}</span><span class="g-num">${esc(num)}</span></button>`).join('')}</div>
    <div class="seg" role="group" aria-label="Affichage">
      <button data-action="maison-tab" data-tab="faire" aria-pressed="${S.maisonTab === 'faire'}">À faire</button>
      <button data-action="maison-tab" data-tab="tableau" aria-pressed="${S.maisonTab === 'tableau'}">Tableau</button>
    </div>
    ${S.maisonTab === 'faire' ? viewTasks() : viewBoard()}
    <div class="foot">${DEMO ? '<button class="link" data-action="demo-reset">Remettre la démo à zéro</button>' : '<button class="link" data-action="logout">Se déconnecter</button>'}</div>`;
}

function viewTasks() {
  const open = S.tasks.filter(t => !t.done).sort((a, b) => (a.due_on || '9999') .localeCompare(b.due_on || '9999') || a.created_at.localeCompare(b.created_at));
  const done = S.tasks.filter(t => t.done).sort((a, b) => (b.done_at || '').localeCompare(a.done_at || '')).slice(0, 15);
  const who = [['me', 'Moi'], ['other', nameOf(other())], ['nous', 'Nous deux']];
  const item = t => {
    const meta = [];
    meta.push(t.assignee ? (t.assignee === S.me ? 'Pour toi' : `Pour ${nameOf(t.assignee)}`) : 'Pour vous deux');
    if (t.due_on && !t.done) meta.push(relDay(t.due_on));
    const late = t.due_on && !t.done && dayDiff(new Date(t.due_on + 'T12:00'), new Date()) < 0;
    return `<li class="item ${t.done ? 'done' : ''}">
      <button class="tick" role="checkbox" aria-checked="${t.done}" aria-label="Fait : ${esc(t.title)}" data-action="task-toggle" data-id="${t.id}"></button>
      <div class="item-main"><div class="item-title">${esc(t.title)}</div><div class="item-meta" ${late ? 'style="color:var(--bleu);font-weight:700"' : ''}>${esc(meta.join(', '))}</div></div>
      <button class="more" aria-label="Options" aria-expanded="${S.open === t.id}" data-action="more" data-id="${t.id}">⋯</button>
      ${S.open === t.id ? `<div class="item-actions">${who.filter(w => w[0] !== 'other' || other()).map(([k, l]) => `<button class="btn ghost small" data-action="task-assign" data-id="${t.id}" data-who="${k}">Pour ${k === 'me' ? 'moi' : k === 'nous' ? 'nous deux' : esc(l)}</button>`).join('')}<button class="btn ghost small" data-action="task-delete" data-id="${t.id}">Supprimer</button></div>` : ''}
    </li>`;
  };
  return `<form class="form" data-form="task">
      <label class="sr" for="task-title">Nouvelle chose à faire</label>
      <input class="field" id="task-title" data-keep name="title" placeholder="Ajouter une chose à faire" autocomplete="off" required>
      ${chipGroup('task-who', who, 'nous', 'Pour qui')}
      <div class="row" style="margin-top:12px">
        <div class="grow"><label class="chip-label" for="task-due" style="display:block;margin:0">Pour quand (facultatif)</label>
        <input class="field" id="task-due" data-keep name="due" type="date"></div>
        <button class="btn" type="submit">Ajouter</button>
      </div>
    </form>
    ${open.length ? `<ul class="list">${open.map(item).join('')}</ul>` : '<p class="empty">Plus rien à faire. Profitez-en.</p>'}
    ${done.length ? `<details class="fold"><summary>Faites récemment (${done.length})</summary><ul class="list">${done.map(item).join('')}</ul></details>` : ''}`;
}

function viewBoard() {
  const notes = [...S.board].sort((a, b) => (b.pinned - a.pinned) || b.created_at.localeCompare(a.created_at));
  return `<form class="form" data-form="note">
      <label class="sr" for="note-body">Nouveau mot sur le tableau</label>
      <textarea class="area" id="note-body" data-keep name="body" placeholder="Une info pour la maison : un rendez-vous, un code, un rappel…" required></textarea>
      <label class="check"><input type="checkbox" id="note-important" data-keep name="important"> Important</label>
      <div class="form-actions"><button class="btn" type="submit">Afficher</button></div>
    </form>
    <div class="notes">${notes.length ? notes.map(n => `
      <article class="note ${n.important ? 'important' : ''} ${n.pinned ? 'pinned' : ''}">
        <p>${esc(n.body)}</p>
        <div class="note-foot"><span>${esc(n.author === S.me ? 'Toi' : nameOf(n.author))}, ${esc(ago(n.created_at))}${n.pinned ? ', épinglé' : ''}</span>
          <span class="acts"><button class="link" data-action="note-pin" data-id="${n.id}">${n.pinned ? 'Détacher' : 'Épingler'}</button><button class="link" data-action="note-delete" data-id="${n.id}">Retirer</button></span></div>
      </article>`).join('') : '<p class="empty">Le tableau est vide. Laisse un mot pour la maison.</p>'}</div>`;
}

// Ménage

function viewMenage() {
  const chores = [...S.chores].sort((a, b) => choreStatus(a).d - choreStatus(b).d);
  const since = Date.now() - 30 * DAY;
  const counts = S.members.map(m => [m, S.choreLog.filter(l => l.done_by === m.email && new Date(l.done_at).getTime() >= since).length]);
  const max = Math.max(1, ...counts.map(c => c[1]));
  const who = S.members.map(m => [m.email, m.email === S.me ? 'Moi' : m.name]);

  return `<header class="hd"><p class="hd-kicker">Corvées et tournus</p><h1>Ménage</h1></header>
    ${chores.length ? `<div>${chores.map(c => {
      const st = choreStatus(c);
      const mine = c.turn === S.me;
      return `<div class="chore ${mine ? 'mine' : ''} ${st.late ? 'late' : ''}">
        <div><div class="c-title">${esc(c.title)}</div>
          <div class="c-meta">${mine ? 'À toi' : `À ${esc(nameOf(c.turn))}`}, <span class="c-when">${esc(st.label)}</span></div>
          <div class="c-meta">${esc(freqLabel(c.every_days))}${c.last_done_by ? `, dernière fois par ${esc(c.last_done_by === S.me ? 'toi' : nameOf(c.last_done_by))}` : ''}</div></div>
        <div style="display:flex;align-items:center;gap:4px">
          <button class="btn ${st.due ? '' : 'ghost'} small" data-action="chore-done" data-id="${c.id}">Fait</button>
          <button class="more" aria-label="Options" aria-expanded="${S.open === c.id}" data-action="more" data-id="${c.id}">⋯</button>
        </div>
        ${S.open === c.id ? `<div class="item-actions"><button class="btn ghost small" data-action="chore-swap" data-id="${c.id}">Passer le tour à ${esc(nameOf(S.members.find(m => m.email !== c.turn)?.email))}</button><button class="btn ghost small" data-action="chore-delete" data-id="${c.id}">Supprimer</button></div>` : ''}
      </div>`;
    }).join('')}</div>` : '<p class="empty">Aucune corvée pour l\'instant. Ajoute la première ci-dessous.</p>'}

    ${S.showChoreForm ? `<h2>Nouvelle corvée</h2>
    <form class="form" data-form="chore">
      <label class="sr" for="chore-title">Nom de la corvée</label>
      <input class="field" id="chore-title" data-keep name="title" placeholder="Arroser les plantes" autocomplete="off" required>
      ${chipGroup('chore-freq', FREQS.map(([n, l]) => [String(n), l]), '7', 'Fréquence')}
      ${chipGroup('chore-first', who, S.me, 'Qui commence')}
      <div class="form-actions"><button type="button" class="btn ghost" data-action="chore-form" data-show="0">Annuler</button><button class="btn" type="submit">Ajouter</button></div>
    </form>` : `<div class="form-actions"><button class="btn ghost" data-action="chore-form" data-show="1">Ajouter une corvée</button></div>`}

    <h2>Ces 30 derniers jours</h2>
    <div class="fair">${counts.map(([m, n]) => `<div class="fair-row"><span>${esc(m.email === S.me ? 'Toi' : m.name)}</span><div class="fair-bar"><span style="width:${(n / max) * 100}%"></span></div><b>${n}</b></div>`).join('')}</div>`;
}

// Courses

function viewCourses() {
  const todo = S.shopping.filter(s => !s.checked).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const cart = S.shopping.filter(s => s.checked);
  const item = s => `<li class="item"><button class="tick" role="checkbox" aria-checked="${s.checked}" aria-label="${esc(s.label)}" data-action="shop-toggle" data-id="${s.id}"></button>
    <div class="item-main"><div class="item-title">${esc(s.label)}</div>${s.added_by !== S.me ? `<div class="item-meta">Ajouté par ${esc(nameOf(s.added_by))}</div>` : ''}</div></li>`;
  return `<header class="hd"><p class="hd-kicker">${todo.length ? pl(todo.length, 'article', 'articles') : 'Liste vide'}</p><h1>Courses</h1></header>
    <form class="form row" data-form="shop">
      <div class="grow"><label class="sr" for="shop-label">Article</label>
      <input class="field" id="shop-label" data-keep name="label" placeholder="Ajouter (sépare par des virgules)" autocomplete="off" enterkeyhint="done" required></div>
      <button class="btn" type="submit">Ajouter</button>
    </form>
    <div class="shop">${todo.length ? `<ul class="list">${todo.map(item).join('')}</ul>` : '<p class="empty">Rien à acheter. Ajoute un article quand il manque quelque chose.</p>'}
    ${cart.length ? `<h2>Dans le panier</h2><ul class="list">${cart.map(item).join('')}</ul>
      <div class="form-actions"><button class="btn ghost" data-action="shop-clear">Vider le panier</button></div>` : ''}</div>`;
}

// Argent

function viewArgent() {
  const net = balances()[S.me] || 0;
  const o = other();
  const sentence = Math.abs(net) < 0.01
    ? 'Vous êtes quittes.'
    : net > 0 ? `${esc(nameOf(o))} te doit <span class="amt">${chf(net)} francs.</span>` : `Tu dois <span class="amt">${chf(-net)} francs</span> à ${esc(nameOf(o))}.`;

  const sorted = [...S.expenses].sort((a, b) => b.spent_on.localeCompare(a.spent_on) || b.created_at.localeCompare(a.created_at));
  const months = new Map();
  for (const e of sorted) {
    const k = e.spent_on.slice(0, 7);
    if (!months.has(k)) months.set(k, []);
    months.get(k).push(e);
  }
  const share = chipVal('exp-split', 'half');

  const monthHtml = [...months.entries()].slice(0, 6).map(([k, list]) => {
    const real = list.filter(e => !e.is_settlement);
    const total = real.reduce((s, e) => s + Number(e.amount), 0);
    const byCat = {};
    real.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount); });
    const label = new Date(k + '-15').toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' });
    return `<div class="month-head"><span>${esc(label[0].toUpperCase() + label.slice(1))}</span><b>${chf(total)}</b></div>
      <div class="cats">${Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => `<span>${esc(catLabel(c))} ${chf(v)}</span>`).join('')}</div>
      <ul class="list">${list.map(e => {
        const payer = e.paid_by === S.me ? 'toi' : nameOf(e.paid_by);
        if (e.is_settlement) {
          const to = S.members.find(m => m.email !== e.paid_by)?.email;
          return `<li class="item settle" style="grid-template-columns:1fr auto">
            <div class="item-main money-row"><span class="item-title">${esc(e.paid_by === S.me ? 'Tu as remboursé' : `${nameOf(e.paid_by)} a remboursé`)} ${esc(to === S.me ? 'toi' : nameOf(to))}</span><span class="amount">${chf(e.amount)}</span></div>
            <button class="more" aria-label="Options" data-action="more" data-id="${e.id}">⋯</button>
            ${S.open === e.id ? `<div class="item-actions"><button class="btn ghost small" data-action="exp-delete" data-id="${e.id}">Supprimer</button></div>` : ''}</li>`;
        }
        const split = Number(e.payer_share) === 0.5 ? 'moitié-moitié' : Number(e.payer_share) === 0 ? `avancé pour ${e.paid_by === S.me ? nameOf(o) : 'toi'}` : `${Math.round(Number(e.payer_share) * 100)} % pour ${payer}`;
        return `<li class="item" style="grid-template-columns:1fr auto">
          <div class="item-main"><div class="money-row"><span class="item-title">${esc(e.label)}</span><span class="amount">${chf(e.amount)}</span></div>
          <div class="item-meta">Payé par ${esc(payer)}, ${esc(split)}, ${esc(catLabel(e.category).toLowerCase())}, ${esc(relDay(e.spent_on))}</div></div>
          <button class="more" aria-label="Options" data-action="more" data-id="${e.id}">⋯</button>
          ${S.open === e.id ? `<div class="item-actions"><button class="btn ghost small" data-action="exp-delete" data-id="${e.id}">Supprimer</button></div>` : ''}</li>`;
      }).join('')}</ul>`;
  }).join('');

  return `<header class="hd"><p class="hd-kicker">Dépenses partagées</p><h1>Argent</h1></header>
    <p class="balance">${sentence}</p>
    ${Math.abs(net) >= 0.01 ? `<button class="link" data-action="settle">${net < 0 ? `J'ai remboursé ${esc(nameOf(o))}` : `${esc(nameOf(o))} m'a remboursé`}</button>` : ''}

    ${S.showExpenseForm ? `<h2>Nouvelle dépense</h2>
    <form class="form" data-form="expense">
      <label class="sr" for="exp-amount">Montant en francs</label>
      <input class="field amount-input" id="exp-amount" data-keep name="amount" inputmode="decimal" placeholder="0.00" autocomplete="off" required>
      <label class="sr" for="exp-label">Pour quoi</label>
      <input class="field" id="exp-label" data-keep name="label" placeholder="Pour quoi" autocomplete="off" required>
      ${chipGroup('exp-payer', S.members.map(m => [m.email, m.email === S.me ? 'Moi' : m.name]), S.me, 'Payé par')}
      ${chipGroup('exp-split', [['half', 'Moitié-moitié'], ['other', "Avance pour l'autre"], ['custom', 'Autre partage']], 'half', 'Partage')}
      ${share === 'custom' ? `<div class="row" style="margin-top:8px"><div class="grow"><label class="chip-label" for="exp-pct" style="display:block;margin:0">Part de celui ou celle qui paie, en %</label><input class="field" id="exp-pct" data-keep name="pct" inputmode="numeric" placeholder="60"></div></div>` : ''}
      ${chipGroup('exp-cat', CATS, 'courses', 'Catégorie')}
      <div class="row" style="margin-top:12px"><div class="grow"><label class="chip-label" for="exp-date" style="display:block;margin:0">Date</label>
        <input class="field" id="exp-date" data-keep name="date" type="date" value="${isoDate(new Date())}"></div></div>
      <div class="form-actions"><button type="button" class="btn ghost" data-action="exp-form" data-show="0">Annuler</button><button class="btn" type="submit">Enregistrer</button></div>
    </form>` : `<div class="form-actions"><button class="btn" data-action="exp-form" data-show="1">Ajouter une dépense</button></div>`}
    ${monthHtml || '<p class="empty">Aucune dépense pour l\'instant.</p>'}`;
}

// Nuit : care et libido

function viewNuit() {
  return `<header class="hd"><p class="hd-kicker">Rien que pour vous deux</p><h1>Nuit</h1></header>
    <div class="seg" role="group" aria-label="Affichage">
      <button data-action="nuit-tab" data-tab="care" aria-pressed="${S.nuitTab === 'care'}">Care</button>
      <button data-action="nuit-tab" data-tab="libido" aria-pressed="${S.nuitTab === 'libido'}">Libido</button>
    </div>
    ${S.nuitTab === 'care' ? viewCare() : viewLibido()}`;
}

function viewCare() {
  const o = other();
  const inbox = S.care.filter(c => c.recipient === S.me).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const unread = inbox.filter(c => !c.read_at);
  const read = inbox.filter(c => c.read_at);
  const sent = S.care.filter(c => c.author === S.me).sort((a, b) => b.created_at.localeCompare(a.created_at));

  const letter = c => {
    const opened = S.openLetter === c.id;
    const head = `<span class="l-from">${esc(careKind(c.kind) || 'Un mot')} de ${esc(nameOf(c.author))}</span><span class="l-meta">${esc(ago(c.created_at))}${c.read_at ? '' : ', pas encore ouvert'}</span>`;
    if (!opened) return `<button class="letter ${c.read_at ? '' : 'sealed'}" data-action="letter-open" data-id="${c.id}" aria-expanded="false">${head}</button>`;
    return `<div class="letter" aria-live="polite">${head}<div class="letter-body">${esc(c.body)}</div>
      ${c.wants_talk ? `<div class="talk">${esc(nameOf(c.author))} aimerait qu'on en parle.</div>` : ''}
      <div><button class="link" data-action="letter-close">Refermer</button></div></div>`;
  };

  return `<h2 style="margin-top:4px">Ta boîte aux lettres</h2>
    ${unread.length ? `<div class="letters">${unread.map(letter).join('')}</div>` : '<p class="empty">Aucun mot en attente.</p>'}
    ${read.length ? `<details class="fold" ${read.some(c => c.id === S.openLetter) ? 'open' : ''}><summary>Mots déjà lus (${read.length})</summary><div class="letters">${read.map(letter).join('')}</div></details>` : ''}

    <h2>Écrire à ${esc(nameOf(o))}</h2>
    <form class="form" data-form="care">
      ${chipGroup('care-kind', CARE_KINDS, 'merci')}
      <label class="sr" for="care-body">Ton mot</label>
      <textarea class="area" id="care-body" data-keep name="body" style="margin-top:12px" placeholder="Ce que tu n'oses pas dire en face…" required></textarea>
      <button type="button" class="link" data-action="care-help">Aide pour formuler</button>
      <label class="check"><input type="checkbox" id="care-talk" data-keep name="talk"> J'aimerais qu'on en parle</label>
      <div class="form-actions"><button class="btn" type="submit">Déposer dans sa boîte</button></div>
    </form>

    ${sent.length ? `<details class="fold"><summary>Tes mots envoyés (${sent.length})</summary><ul class="list sent">${sent.map(c => `
      <li class="item" style="grid-template-columns:1fr auto"><div class="item-main"><div class="item-title">${esc(c.body.length > 90 ? c.body.slice(0, 90) + '…' : c.body)}</div>
      <div class="item-meta">${esc(ago(c.created_at))}, ${c.read_at ? `lu ${esc(ago(c.read_at))}` : 'pas encore lu'}</div></div>
      <button class="link" data-action="care-delete" data-id="${c.id}">Retirer</button></li>`).join('')}</ul></details>` : ''}`;
}

function viewLibido() {
  const on = libidoLive();
  const o = nameOf(other());
  const until = on && S.libido.until ? new Date(S.libido.until) : null;
  const untilTxt = until ? (dayDiff(until, new Date()) === 0 ? `jusqu'à ${until.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}` : `jusqu'à demain ${until.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}`) : '';

  let state, sub;
  if (S.match) { state = 'Vous en avez envie tous les deux.'; sub = `Ton switch reste allumé ${untilTxt}.`; }
  else if (on) { state = 'Ton envie est posée.'; sub = `Allumé ${untilTxt}. Rien n'est révélé à ${o} tant que son switch reste éteint.`; }
  else { state = 'Ton switch est éteint.'; sub = 'Personne ne voit rien.'; }

  const lampState = S.match ? 'match' : on ? 'mine' : '';
  return `<div class="lamp-wrap ${lampState}"><div class="lamp ${lampState}" role="img" aria-label="${S.match ? 'Lampe allumée : match' : on ? 'Lampe en veille' : 'Lampe éteinte'}"></div></div>
    <p class="lib-state" aria-live="polite">${state}</p>
    <p class="lib-sub">${esc(sub)}</p>
    ${on ? '' : chipGroup('lib-dur', [['1h', 'Une heure'], ['soir', 'Ce soir'], ['24h', '24 heures']], 'soir', 'Garder allumé')}
    <div style="margin-top:16px"><button class="switch" role="switch" aria-checked="${on}" data-action="libido-toggle"><span>J'ai envie</span><span class="knob" aria-hidden="true"></span></button></div>
    <p class="lib-note">${esc(o)} ne voit jamais ton switch. L'app signale seulement le moment où vous êtes deux à l'avoir allumé, puis il s'éteint tout seul. Aucun historique n'est gardé.</p>`;
}

// Actions --------------------------------------------------------------------

const actions = {
  go: el => { S.view = el.dataset.view; S.open = null; safeSet('maison-view', S.view); render(); window.scrollTo(0, 0); if (S.view === 'nuit') refresh(); },
  glance: el => {
    const to = el.dataset.to;
    if (to === 'faire') { S.maisonTab = 'faire'; render(); document.getElementById('task-title')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    actions.go({ dataset: { view: to } });
  },
  'maison-tab': el => { S.maisonTab = el.dataset.tab; render(); },
  'nuit-tab': el => { S.nuitTab = el.dataset.tab; render(); },
  more: el => { S.open = S.open === el.dataset.id ? null : el.dataset.id; render(); },

  'task-toggle': el => {
    const t = S.tasks.find(x => x.id === el.dataset.id);
    if (!t.done) meow();
    run(() => api.update('tasks', { id: t.id }, { done: !t.done, done_at: t.done ? null : new Date().toISOString() }));
  },
  'task-assign': el => {
    const w = el.dataset.who;
    S.open = null;
    run(() => api.update('tasks', { id: el.dataset.id }, { assignee: w === 'me' ? S.me : w === 'other' ? other() : null }));
  },
  'task-delete': el => { S.open = null; run(() => api.remove('tasks', { id: el.dataset.id }), 'Supprimé'); },

  'note-pin': el => { const n = S.board.find(x => x.id === el.dataset.id); run(() => api.update('board', { id: n.id }, { pinned: !n.pinned })); },
  'note-delete': el => { if (confirm('Retirer ce mot du tableau ?')) run(() => api.remove('board', { id: el.dataset.id }), 'Retiré du tableau'); },

  'chore-done': el => {
    const c = S.chores.find(x => x.id === el.dataset.id);
    const next = S.members.find(m => m.email !== S.me)?.email || S.me;
    meow();
    run(async () => {
      await api.update('chores', { id: c.id }, { last_done_at: new Date().toISOString(), last_done_by: S.me, turn: next });
      await api.insert('chore_log', { chore_id: c.id, title: c.title });
    }, `Merci ! Prochain tour : ${nameOf(next)}`);
  },
  'chore-swap': el => {
    const c = S.chores.find(x => x.id === el.dataset.id);
    const next = S.members.find(m => m.email !== c.turn)?.email;
    S.open = null;
    run(() => api.update('chores', { id: c.id }, { turn: next }), `C'est au tour de ${nameOf(next)}`);
  },
  'chore-delete': el => { if (confirm('Supprimer cette corvée ?')) { S.open = null; run(() => api.remove('chores', { id: el.dataset.id }), 'Corvée supprimée'); } },
  'chore-form': el => { S.showChoreForm = el.dataset.show === '1'; render(); if (S.showChoreForm) document.getElementById('chore-title')?.focus(); },

  'shop-toggle': el => { const s = S.shopping.find(x => x.id === el.dataset.id); if (!s.checked) meow(); run(() => api.update('shopping', { id: s.id }, { checked: !s.checked })); },
  'shop-clear': () => run(() => api.remove('shopping', { checked: true }), 'Panier vidé'),

  'exp-form': el => { S.showExpenseForm = el.dataset.show === '1'; render(); if (S.showExpenseForm) document.getElementById('exp-amount')?.focus(); },
  'exp-delete': el => { if (confirm('Supprimer cette dépense ?')) { S.open = null; run(() => api.remove('expenses', { id: el.dataset.id }), 'Dépense supprimée'); } },
  settle: () => {
    const net = balances()[S.me] || 0;
    const o = other();
    const payer = net < 0 ? S.me : o;
    const amt = Math.round(Math.abs(net) * 100) / 100;
    if (!confirm(`Enregistrer un remboursement de ${chf(amt)} francs ? Le solde reviendra à zéro.`)) return;
    run(() => api.insert('expenses', { label: 'Remboursement', amount: amt, paid_by: payer, payer_share: 0, category: 'autre', spent_on: isoDate(new Date()), is_settlement: true }), 'Vous êtes quittes');
  },

  'letter-open': el => {
    const id = el.dataset.id;
    S.openLetter = id;
    const c = S.care.find(x => x.id === id);
    if (c && !c.read_at) run(() => api.rpc('care_mark_read', { msg: id })); else render();
  },
  'letter-close': () => { S.openLetter = null; render(); },
  'care-help': () => {
    const ta = document.getElementById('care-body');
    const scaffold = "Quand je remarque que…\nJe me sens…\nParce que j'ai besoin de…\nEst-ce que tu serais d'accord pour…";
    ta.value = ta.value ? ta.value + '\n\n' + scaffold : scaffold;
    ta.focus();
  },
  'care-delete': el => { if (confirm('Retirer ce mot de sa boîte ?')) run(() => api.remove('care_messages', { id: el.dataset.id }), 'Mot retiré'); },

  'libido-toggle': () => {
    const on = libidoLive();
    const until = on ? null : untilFor(chipVal('lib-dur', 'soir')).toISOString();
    run(() => api.upsert('libido', { email: S.me, is_on: !on, until, updated_at: new Date().toISOString() }));
  },

  meow: () => meow(true),
  'login-mode': el => { S.login.email = document.getElementById('email')?.value || S.login.email; S.login.step = el.dataset.mode; render(); },
  forgot: async () => {
    const email = (document.getElementById('email')?.value || '').trim().toLowerCase();
    if (!email) { toast("Écris d'abord ton adresse e-mail"); document.getElementById('email')?.focus(); return; }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: appUrl() });
    if (error) { toast(authError(error)); return; }
    S.login = { step: 'sent', email, note: `Un lien pour changer ton mot de passe vient d'être envoyé à ${email}. Ouvre-le sur ce téléphone.` };
    render();
  },
  logout: async () => { if (sb) await sb.auth.signOut(); S.me = null; S.login = { step: 'login', email: '' }; render(); },

  'demo-swap': async () => { S.me = other(); safeSet('maison-demo-me', S.me); S.openLetter = null; await refresh(); toast(`Tu vois l'app comme ${nameOf(S.me)}`); },
  'demo-reset': async () => { if (!confirm('Effacer les données de démo et repartir de l\'exemple ?')) return; localStorage.removeItem('maison-demo-v1'); api = demoApi(); await refresh(); },
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
    S.login = { step: 'sent', email, note: `Presque fini : clique sur le lien envoyé à ${email} pour confirmer ton adresse, puis reviens ici te connecter.` };
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
    const row = { title: f.title.value.trim(), assignee: w === 'me' ? S.me : w === 'other' ? other() : null, due_on: f.due.value || null };
    f.reset();
    run(() => api.insert('tasks', row));
  },
  note(f) {
    const row = { body: f.body.value.trim(), important: f.important.checked };
    f.reset();
    run(() => api.insert('board', row), 'Affiché sur le tableau');
  },
  chore(f) {
    const row = { title: f.title.value.trim(), every_days: Number(chipVal('chore-freq', '7')), turn: chipVal('chore-first', S.me) };
    f.reset(); S.showChoreForm = false;
    run(() => api.insert('chores', row), 'Corvée ajoutée');
  },
  shop(f) {
    const labels = f.label.value.split(',').map(s => s.trim()).filter(Boolean);
    f.reset();
    run(async () => { for (const label of labels) await api.insert('shopping', { label }); });
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
    const row = { amount: Math.round(amount * 100) / 100, label: f.label.value.trim(), paid_by: chipVal('exp-payer', S.me), payer_share, category: chipVal('exp-cat', 'courses'), spent_on: f.date.value || isoDate(new Date()) };
    f.reset(); S.showExpenseForm = false;
    run(() => api.insert('expenses', row), 'Dépense enregistrée');
  },
  care(f) {
    const body = f.body.value.trim();
    if (!body) return;
    const row = { recipient: other(), kind: chipVal('care-kind', 'merci'), body, wants_talk: f.talk.checked };
    f.reset();
    run(() => api.insert('care_messages', row), `Déposé dans la boîte de ${nameOf(other())}`);
  },
};

document.addEventListener('click', e => {
  const c = e.target.closest('[data-chip]');
  if (c) {
    const g = c.closest('[data-group]');
    S.chips[g.dataset.group] = c.dataset.chip;
    g.querySelectorAll('[data-chip]').forEach(b => b.setAttribute('aria-pressed', b === c));
    if (g.dataset.group === 'exp-split') render(); // affiche ou cache le champ %
    return;
  }
  const a = e.target.closest('[data-action]');
  if (a && actions[a.dataset.action]) { e.preventDefault(); actions[a.dataset.action](a); }
});

document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]');
  if (!f) return;
  e.preventDefault();
  forms[f.dataset.form]?.(f);
});

document.addEventListener('visibilitychange', () => { if (!document.hidden && S.me) refresh(); });
setInterval(() => { if (!document.hidden && S.me && S.view === 'nuit') refresh(); }, 30000);

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
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  sb = createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  api = remoteApi(sb);

  const { data: { session } } = await sb.auth.getSession();
  S.me = session?.user?.email?.toLowerCase() || null;
  S.ready = true;
  if (S.me) await refresh(); else render();

  sb.auth.onAuthStateChange((evt, sess) => {
    if (evt === 'PASSWORD_RECOVERY') { S.recovery = true; S.me = sess?.user?.email?.toLowerCase() || S.me; render(); return; }
    const email = sess?.user?.email?.toLowerCase() || null;
    if (email === S.me) return;
    S.me = email;
    if (S.me) refresh(); else render();
  });

  sb.channel('maison')
    .on('postgres_changes', { event: '*', schema: 'public' }, () => { if (S.me) scheduleRefresh(); })
    .subscribe();
}

boot().catch(e => { console.error(e); $app.innerHTML = '<section class="login"><h1>Maison</h1><p>Impossible de démarrer. Vérifie ta connexion puis recharge la page.</p></section>'; });
