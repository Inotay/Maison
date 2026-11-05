// Ciné Azami : la page des amis de la maison. Un lien à vie (le jeton est après le #, jamais envoyé au serveur
// de la page ; il n'est transmis qu'à la fonction « amis ») ; seulement le cinéma : Cinder sur la collection de
// la maison, ses films (envies, vus et notés), et la comparaison avec Yatoni, Mariana et les autres amis.
// Tout ce qui vient des autres (prénoms, titres) est écrit comme du texte, jamais comme du HTML.
const URL_FN = (window.MAISON_CONFIG?.supabaseUrl || '') + '/functions/v1/amis';
const $ = document.getElementById('s');
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const deHash = (location.hash.match(/^#([A-Za-z0-9_-]{43})/) || [])[1] || '';
if (deHash) store.set('ami-jeton', deHash);
const jeton = deHash || store.get('ami-jeton') || '';
// le lien reste dans l'adresse : l'ajouter à l'écran d'accueil ou en favori garde l'accès
if (!deHash && jeton) try { history.replaceState(null, '', `#${jeton}`); } catch {}

let LIENS = null, P = null, onglet = store.get('ami-onglet') || 'cinder', pileF = [], vusK = new Set(), MES = new Map(), CMP = null, filtre = 'oui', enCharge = false, recherche = [];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const IC = {
  flamme: '<path d="M12 21.2c-3.9 0-6.6-2.7-6.6-6.3 0-3.5 2.5-5.3 3.7-8.2.8 1.6 1.7 2.4 2.6 2.7.1-3 1.3-5.1 3.2-6.6-.3 2.7.9 4.5 2.3 6.3 1.1 1.4 1.7 3 1.7 5 0 4-2.7 7.1-6.9 7.1z"/><path d="M12 21.2c-1.7 0-2.9-1.1-2.9-2.7 0-1.7 1.4-2.5 2.1-4 1.4 1.1 3.6 2.4 3.6 4.2 0 1.5-1.2 2.5-2.8 2.5z" fill="currentColor" stroke="none"/>',
  bof: '<path d="M4.6 10.2 5 4.2l4.3 3.1h5.4L19 4.2l.4 6c.7 1 1.1 2.2 1.1 3.5 0 3.9-3.8 6.8-8.5 6.8s-8.5-2.9-8.5-6.8c0-1.3.4-2.5 1.1-3.5z"/><path d="M8.3 12.6h2.2M13.5 12.6h2.2M10.6 16.2h2.8"/>',
  vu: '<path d="M2.6 12S6 5.8 12 5.8 21.4 12 21.4 12 18 18.2 12 18.2 2.6 12 2.6 12z"/><circle cx="12" cy="12" r="3.1" fill="currentColor" stroke="none"/>',
  tres: '<path d="M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.6l-5.1 2.7 1-5.7-4.1-4 5.7-.8z" fill="currentColor"/>',
  envie: '<path d="M12 20.2s-7.8-4.7-7.8-10.3A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.8 2.5c0 5.6-7.8 10.3-7.8 10.3z" fill="currentColor"/>',
  film: '<rect x="3.6" y="4.6" width="16.8" height="14.8" rx="2.8"/><path d="M7.8 4.6v14.8M16.2 4.6v14.8M3.6 9.6h4.2M3.6 14.4h4.2M16.2 9.6h4.2M16.2 14.4h4.2"/>',
  deux: '<circle cx="8.5" cy="8.6" r="3"/><circle cx="16" cy="9.6" r="2.5"/><path d="M3.4 19c.6-3.3 2.6-5.1 5.1-5.1s4.5 1.8 5.1 5.1M13.6 14.6c.8-.5 1.6-.7 2.4-.7 2 0 3.6 1.5 4.1 4.3"/>',
  loupe: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 20 20"/>',
  de: '<rect x="4" y="4" width="16" height="16" rx="3.4"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/>',
  coupe: '<path d="M8 4h8v5.2a4 4 0 0 1-8 0z"/><path d="M8 6H5.2v1.2A2.8 2.8 0 0 0 8 10M16 6h2.8v1.2A2.8 2.8 0 0 1 16 10M12 13.2V17M8.6 20.2h6.8M9.8 17h4.4"/>',
};
const icn = n => `<svg class="icn" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[n]}</svg>`;
const poster = (f, cls) => f?.poster ? `<img class="${cls}" src="${esc(f.poster)}" alt="" decoding="async" loading="lazy" referrerpolicy="no-referrer">` : `<span class="${cls} nop">${icn('film')}</span>`;
const dur = m => m ? `${Math.floor(m / 60) ? Math.floor(m / 60) + ' h ' : ''}${String(m % 60).padStart(Math.floor(m / 60) ? 2 : 1, '0')}${Math.floor(m / 60) ? '' : ' min'}` : '';
const note = n => String(Math.round(n * 10) / 10).replace('.', ',');
const hotes = () => (P?.hotes || []).join(' et ') || 'vos hôtes';
const avisMot = a => !a ? '' : a.note ? `vu · ${note(a.note)}/5` : a.vote === 'super' ? 'très envie' : a.vote === 'oui' ? 'envie' : a.vote === 'non' ? 'bof' : 'vu';

async function call(action, body = {}) {
  const r = await fetch(URL_FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, action, jeton }), referrerPolicy: 'no-referrer', cache: 'no-store' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || 'Erreur'); e.fini = j.fini || r.status === 410 || r.status === 404; throw e; }
  return j;
}
function fin(msg) {
  $.innerHTML = `<section class="s-fin">${icn('film')}<h1>Ciné Azami</h1><p></p></section>`;
  $.querySelector('p').textContent = msg;
}
let toastT;
function toast(m) { let t = document.getElementById('s-toast'); if (!t) { t = document.createElement('div'); t.id = 's-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }

async function charger() {
  if (!jeton) return fin('Ce lien n’est pas complet. Demande à Yatoni ou Mariana de te le renvoyer.');
  try { P = await call('moi'); } catch (e) { return fin(e.fini ? 'Ce lien n’est plus valable. Demande-leur un nouveau lien.' : 'Le ciné ne répond pas pour le moment. Réessaie dans un instant.'); }
  if (!P.nom) return accueil();
  if (!P.tuto) return tuto(0);
  await chargerMes();
  dessiner();
}
async function chargerMes() { try { const r = await call('mes'); MES = new Map(r.avis.map(a => [a.k, a])); } catch {} }

// ── La première fois : le prénom, puis le tutoriel ──
function accueil() {
  $.innerHTML = `<section class="s-hello"><b class="s-logo big">${icn('flamme')} Ciné Azami</b>
    <h1>Bienvenue</h1><p>Espace cinéma partagé avec <b class="s-hotes"></b>.</p>
    <p class="s-small">Indique ton prénom, il sera visible des autres.</p>
    <label class="s-lab" for="s-nom">Ton prénom</label><input id="s-nom" maxlength="24" autocomplete="given-name" enterkeyhint="go">
    <button class="s-btn" data-go>Continuer</button></section>`;
  $.querySelector('.s-hotes').textContent = hotes();
  const inp = $.querySelector('#s-nom'); inp.value = P?.nom || '';
  const go = async () => {
    const v = inp.value.replace(/\s+/g, ' ').trim().slice(0, 24); if (!v) { inp.focus(); return; }
    try { await call('profil', { nom: v }); P.nom = v; } catch (e) { toast(e.message); return; }
    P.tuto ? (await chargerMes(), dessiner()) : tuto(0);
  };
  $.querySelector('[data-go]').addEventListener('click', go);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
}
const TUTO = [
  { ic: 'film', t: () => 'Bienvenue', p: () => `Cet espace est dédié au cinéma. Tu indiques tes goûts, et tu vois ce que tu as en commun avec ${hotes()} et les autres invités.` },
  { ic: 'flamme', t: () => 'Cinder', p: () => 'Dans Cinder, des affiches défilent. Glisse à droite pour un film qui te tente, à gauche s’il ne t’intéresse pas, vers le haut si tu l’as déjà vu (tu peux alors lui donner une note). Touche l’affiche pour lire le résumé.' },
  { ic: 'deux', t: () => 'Les points communs', p: () => `L’onglet « Matchs » montre ton accord avec ${hotes()} et les autres invités, les films que vous avez envie de voir ensemble, et leurs coups de cœur que tu n’as pas encore vus.` },
  { ic: 'loupe', t: () => 'Tes films', p: () => 'Tu peux chercher n’importe quel film pour le noter ou l’ajouter à tes envies. Tout reste modifiable dans « Mes films ».' },
  { ic: 'coupe', t: () => 'Ton lien', p: () => 'Ce lien est personnel et reste valable. Tu peux l’utiliser sur tous tes appareils ou ajouter cette page à ton écran d’accueil. Évite de le partager.' },
];
function tuto(n) {
  const s = TUTO[n];
  $.innerHTML = `<section class="a-tuto"><div class="a-tuto-ic">${icn(s.ic)}</div><h1></h1><p></p>
    <div class="a-dots">${TUTO.map((_, k) => `<i class="${k === n ? 'on' : ''}"></i>`).join('')}</div>
    <div class="a-tuto-btns">${n < TUTO.length - 1 ? '<button class="s-btn ghost" data-skip>Passer</button>' : ''}<button class="s-btn" data-next>${n < TUTO.length - 1 ? 'Suivant' : 'Commencer'}</button></div></section>`;
  $.querySelector('h1').textContent = s.t(); $.querySelector('p').textContent = s.p();
  const finir = async () => { try { await call('profil', { tuto: true }); P.tuto = true; } catch {} await chargerMes(); onglet = 'cinder'; dessiner(); };
  $.querySelector('[data-next]').addEventListener('click', () => n < TUTO.length - 1 ? tuto(n + 1) : finir());
  $.querySelector('[data-skip]')?.addEventListener('click', finir);
}

// ── L'écran : quatre onglets ──
const ONGLETS = [['cinder', 'Cinder'], ['matchs', 'Matchs'], ['mes', 'Mes films'], ['chercher', 'Chercher']];
function dessiner() {
  $.innerHTML = `<header class="s-top"><b class="s-logo">${icn('flamme')} Ciné Azami</b><button class="a-qui" data-nom aria-label="Changer mon prénom"></button></header>
    <p class="s-sous">Chez <b class="s-hotes"></b></p>
    <div class="s-tabs a-tabs" role="tablist">${ONGLETS.map(([k, l]) => `<button role="tab" data-t="${k}" aria-selected="${onglet === k}">${l}${k === 'matchs' && P.demandes ? ` <span class="a-badge" aria-label="${P.demandes} demande${P.demandes > 1 ? 's' : ''}">${P.demandes}</span>` : ''}</button>`).join('')}</div>
    <section class="s-body"></section>`;
  $.querySelector('.a-qui').textContent = P.nom; $.querySelector('.s-hotes').textContent = hotes();
  ({ cinder: pile, matchs, mes, chercher })[onglet]?.();
}

// ── Cinder ──
async function remplir() {
  if (enCharge) return; enCharge = true;
  try { const r = await call('deck', { n: 25 }); for (const f of r.films) if (!vusK.has(f.k) && !MES.has(f.k)) { vusK.add(f.k); pileF.push(f); } }
  catch (e) { if (e.fini) return fin('Ce lien n’est plus valable.'); toast('Chargement impossible. Réessaie.'); }
  finally { enCharge = false; }
}
function carte(f, cls) {
  const sub = [f.year, f.media === 'tv' ? 'Série' : dur(f.runtime), f.dir].filter(Boolean).join(' · ');
  const tags = (f.hotes || []).map(h => h.note ? `${esc(h.nom)} : ${h.note >= 4.5 ? 'adoré' : h.note >= 3.5 ? 'aimé' : 'bof'} (${note(h.note)})` : h.envie ? `${esc(h.nom)} en a envie` : '').filter(Boolean);
  return `<article class="c ${cls}" data-k="${esc(f.k)}">${poster(f, 'c-img')}<div class="c-info">${tags.map(t => `<em class="c-tag">${t}</em>`).join('')}<b>${esc(f.title)}</b><span>${esc(sub)}</span>${f.genres?.length ? `<span class="c-g">${esc(f.genres.join(' · '))}</span>` : ''}<p>${esc(f.overview)}</p></div>
    <span class="c-st oui">ENVIE</span><span class="c-st non">BOF</span><span class="c-st vu">DÉJÀ VU</span></article>`;
}
async function pile() {
  const b = $.querySelector('.s-body');
  if (pileF.length < 4) { if (!pileF.length) b.innerHTML = '<p class="s-wait">La pioche arrive…</p>'; await remplir(); if (onglet !== 'cinder') return; }
  const cur = pileF[0], nxt = pileF[1];
  if (!cur) { b.innerHTML = `<div class="s-vide">${icn('coupe')}<p>Il n’y a plus de films à proposer pour le moment.</p></div>`; return; }
  b.innerHTML = `<div class="s-stack">${nxt ? carte(nxt, 'next') : ''}${carte(cur, 'top')}</div>
    <div class="s-btns"><button class="b-non" data-v="non" aria-label="Bof">${icn('bof')}<small>Bof</small></button><button class="b-vu" data-v="vu" aria-label="Déjà vu">${icn('vu')}<small>Vu</small></button><button class="b-super" data-v="super" aria-label="Très envie">${icn('tres')}<small>Très</small></button><button class="b-oui" data-v="oui" aria-label="Envie">${icn('envie')}<small>Envie</small></button></div>
    <p class="s-aide">${MES.size} avis donnés · → envie · ← bof · ↑ déjà vu · touche l’affiche pour lire</p>`;
  (nxt?.poster) && (new Image().src = nxt.poster);
  const el = b.querySelector('.c.top'), nx = b.querySelector('.c.next');
  let x0 = null, y0 = 0, dx = 0, dy = 0, t0 = 0, raf = 0;
  const paint = () => { raf = 0; const vert = Math.abs(dy) > Math.abs(dx) * 1.1;
    el.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${dx / 16}deg)`;
    el.classList.toggle('l-oui', !vert && dx > 40); el.classList.toggle('l-non', !vert && dx < -40); el.classList.toggle('l-vu', vert && dy < -50);
    if (nx) { const k = Math.min(1, Math.hypot(dx, dy) / 160); nx.style.transform = `scale(${.94 + .06 * k}) translateY(${10 - 10 * k}px)`; } };
  el.addEventListener('pointerdown', e => { if (e.button > 0) return; x0 = e.clientX; y0 = e.clientY; dx = dy = 0; t0 = performance.now(); el.setPointerCapture(e.pointerId); el.style.transition = 'none'; if (nx) nx.style.transition = 'none'; });
  el.addEventListener('pointermove', e => { if (x0 == null) return; e.preventDefault(); dx = e.clientX - x0; dy = e.clientY - y0; if (!raf) raf = requestAnimationFrame(paint); });
  const end = () => {
    if (x0 == null) return; x0 = null; cancelAnimationFrame(raf); el.style.transition = ''; if (nx) nx.style.transition = '';
    const vert = Math.abs(dy) > Math.abs(dx) * 1.1, fast = (performance.now() - t0) < 300;
    if (Math.hypot(dx, dy) < 8) { el.style.transform = ''; el.classList.toggle('lit'); return; }
    if (!vert && (Math.abs(dx) > 90 || (fast && Math.abs(dx) > 40))) return glisser(dx > 0 ? 'oui' : 'non', { dx, dy });
    if (vert && dy < 0 && (Math.abs(dy) > 90 || (fast && Math.abs(dy) > 40))) return glisser('vu', { dx, dy });
    el.style.transform = ''; el.classList.remove('l-oui', 'l-non', 'l-vu'); if (nx) nx.style.transform = '';
  };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}
async function glisser(v, from) {
  const f = pileF[0], el = $.querySelector('.c.top'); if (!f) return;
  if (v === 'vu') { const n = await demanderNote(f); if (n === undefined) { if (el) { el.style.transform = ''; el.classList.remove('l-vu'); } return; } return partir(f, el, 'vu', n, from); }
  partir(f, el, v, null, from);
}
function partir(f, el, v, n, from) {
  if (el) {
    const W = innerWidth + 260, x = from?.dx || 0, y = from?.dy || 0;
    el.style.transition = 'transform .32s cubic-bezier(.25,.6,.45,1), opacity .32s ease-in';
    el.style.transform = v === 'vu' || v === 'super' ? `translate3d(${x * .6}px, ${-innerHeight}px, 0)` : `translate3d(${v === 'oui' ? W : -W}px, ${y * 1.6 + 40}px, 0) rotate(${v === 'oui' ? 28 : -28}deg)`;
    el.style.opacity = '0'; el.style.pointerEvents = 'none';
  }
  try { navigator.vibrate?.(v === 'oui' || v === 'super' ? 12 : 6); } catch {}
  pileF.shift();
  donner(f, v, n);
  setTimeout(() => { if (onglet === 'cinder') pile(); }, 200);
}
async function donner(f, v, n = null) {
  const avant = MES.get(f.k);
  if (v === 'rien') MES.delete(f.k); else MES.set(f.k, { k: f.k, title: f.title, year: f.year, poster: f.poster, media: f.media, vote: n ? 'vu' : v, note: n, at: new Date().toISOString() });
  CMP = null;
  try { await call('avis', { k: f.k, vote: v, note: n, title: f.title, year: f.year, poster: f.poster }); }
  catch (e) { if (avant) MES.set(f.k, avant); else MES.delete(f.k); if (e.fini) return fin('Ce lien n’est plus valable.'); toast(e.message || 'L’avis n’est pas passé.'); }
}
// Une note sur 5 (par demi-points) : undefined si on annule, null si « vu, sans note »
function demanderNote(f, actuelle = 4) {
  return new Promise(res => {
    const box = document.createElement('div'); box.className = 'a-note';
    box.innerHTML = `<div class="a-note-c" role="dialog" aria-label="Ta note"><p class="a-note-t"></p><b class="a-note-v">${note(actuelle)}</b>
      <input type="range" min="0.5" max="5" step="0.5" value="${actuelle}" aria-label="Note sur 5"><div class="a-note-mots"><span>Détesté</span><span>Moyen</span><span>Chef-d’œuvre</span></div>
      <div class="a-note-btns"><button class="s-btn ghost" data-x>Annuler</button><button class="s-btn ghost" data-sans>Vu, sans note</button><button class="s-btn" data-ok>Noter</button></div></div>`;
    box.querySelector('.a-note-t').textContent = f.title;
    document.body.appendChild(box);
    const r = box.querySelector('input'), v = box.querySelector('.a-note-v');
    r.addEventListener('input', () => { v.textContent = note(Number(r.value)); });
    const close = x => { box.remove(); res(x); };
    box.querySelector('[data-x]').onclick = () => close(undefined);
    box.querySelector('[data-sans]').onclick = () => close(null);
    box.querySelector('[data-ok]').onclick = () => close(Number(r.value));
    box.addEventListener('click', e => { if (e.target === box) close(undefined); });
  });
}

// ── Matchs : moi et chacun d'eux ──
const rangee = (l, vide) => l.length ? `<div class="a-row">${l.map(f => `<button class="a-mini" data-film="${esc(f.k)}">${poster(f, 'a-mini-img')}<span>${esc(f.title)}</span>${f.note ? `<small>${note(f.note)}/5</small>` : f.super ? '<small>★ très envie</small>' : ''}</button>`).join('')}</div>` : `<p class="a-vide">${vide}</p>`;
async function matchs() {
  const b = $.querySelector('.s-body');
  if (!CMP) { b.innerHTML = '<p class="s-wait">Comparaison en cours…</p>'; try { [CMP, LIENS] = await Promise.all([call('comparer'), call('liens').then(r => r.amis).catch(() => [])]); } catch (e) { if (e.fini) return fin('Ce lien n’est plus valable.'); b.innerHTML = '<p class="a-vide">La comparaison ne répond pas. Réessaie.</p>'; return; } if (onglet !== 'matchs') return; }
  const C = CMP, filmsDe = new Map();
  for (const p of C.personnes) for (const l of [p.matches, p.pourMoi, p.adores, p.desaccords]) for (const f of l) filmsDe.set(f.k, f);
  for (const f of C.ensemble) filmsDe.set(f.k, f);
  matchs.films = filmsDe;
  const peu = C.nAvis < 15;
  b.innerHTML = `${peu ? `<div class="a-conseil">${icn('flamme')}<p>Plus tu donnes d’avis dans Cinder, plus les matchs sont justes. (${C.nAvis} pour l’instant)</p></div>` : ''}
    ${C.ensemble.length ? `<section class="a-bloc a-ens"><h2>${icn('deux')} Une soirée tous ensemble</h2><p class="a-sub">Ce que vous avez tous envie de voir : toi, ${esc(hotes())}.</p>${rangee(C.ensemble, '')}<button class="s-btn a-hasard" data-hasard>${icn('de')} Un film au hasard pour ce soir</button></section>` : ''}
    ${C.personnes.map((p, i) => `${!p.hote && (i === 0 || C.personnes[i - 1].hote) ? '<p class="a-sep">Tes amis liés</p>' : ''}<section class="a-bloc ${p.hote ? 'hote' : ''}"><div class="a-p-top"><h2></h2><span class="a-compat">${p.compat == null ? `<small>${p.communs ? `${p.communs} film${p.communs > 1 ? 's' : ''} en commun` : 'pas encore de film en commun'}</small>` : `<b>${p.compat} %</b><small>d’accord sur ${p.communs} films</small>`}</span></div>
      <h3>${icn('envie')} Envie tous les deux${p.nMatches ? ` · ${p.nMatches}` : ''}</h3>${rangee(p.matches, 'Pas encore d’envie en commun.')}
      ${p.pourMoi.length ? `<h3>${icn('tres')} Ses coups de cœur, pas encore vus par toi</h3>${rangee(p.pourMoi, '')}` : ''}
      ${p.adores.length ? `<h3>${icn('coupe')} Adorés tous les deux</h3>${rangee(p.adores, '')}` : ''}
      ${p.desaccords.length ? `<h3>${icn('bof')} Vos grands désaccords</h3><ul class="a-desac">${p.desaccords.map(f => `<li><span></span><b>toi ${note(f.moi)} · <i></i> ${note(f.lui)}</b></li>`).join('')}</ul>` : ''}</section>`).join('')}
    ${C.cachés?.length ? `<p class="a-vide">${esc(C.cachés.join(' et '))} ne partage${C.cachés.length > 1 ? 'nt' : ''} pas ses goûts pour l’instant.</p>` : ''}
    ${lienBloc()}`;
  b.querySelectorAll('.a-lien b[data-i]').forEach(x => { x.textContent = LIENS[Number(x.dataset.i)]?.nom || ''; });
  b.querySelectorAll('.a-bloc:not(.a-ens)').forEach((s, i) => { s.querySelector('h2').textContent = C.personnes[i].nom; s.querySelectorAll('.a-desac i').forEach(x => { x.textContent = C.personnes[i].nom; }); });
  b.querySelectorAll('.a-desac li').forEach((li, i) => { const all = C.personnes.flatMap(p => p.desaccords); li.querySelector('span').textContent = all[i]?.title || ''; });
}

// Les autres amis : se lier, comme une demande d'ami. Une fois que l'autre accepte, vous voyez vos films en commun.
const LIEN_MOT = { rien: '', envoye: 'Demande envoyée', recu: 'veut se lier avec toi', lie: 'Liés' };
function lienBloc() {
  const l = LIENS || []; if (!l.length) return '';
  const recus = l.filter(a => a.etat === 'recu').length;
  return `<section class="a-bloc a-liens"><h2>${icn('deux')} Les autres amis</h2><p class="a-sub">Liez-vous pour voir vos films en commun. Il faut que vous acceptiez tous les deux ; chacun peut défaire le lien quand il veut.</p>
    <ul class="a-lien-l">${l.map((a, i) => `<li class="a-lien ${a.etat}"><div><b data-i="${i}"></b>${LIEN_MOT[a.etat] ? `<small>${LIEN_MOT[a.etat]}</small>` : ''}</div><div class="a-lien-b">${
      a.etat === 'rien' ? `<button class="s-btn" data-lier="${a.id}">Se lier</button>`
      : a.etat === 'recu' ? `<button class="s-btn" data-lier="${a.id}">Accepter</button><button class="s-btn ghost" data-delier="${a.id}">Refuser</button>`
      : a.etat === 'envoye' ? `<button class="s-btn ghost" data-delier="${a.id}">Annuler</button>`
      : `<button class="s-btn ghost" data-delier="${a.id}" data-defaire>Défaire</button>`}</div></li>`).join('')}</ul>${recus ? '' : ''}</section>`;
}
async function lienAgir(id, action, btn) {
  btn.disabled = true;
  try {
    const r = await call(action, { id });
    const a = LIENS.find(x => x.id === id); const avant = a?.etat; if (a) a.etat = r.etat;
    if (avant === 'recu') P.demandes = Math.max(0, (P.demandes || 1) - 1);
    toast(r.etat === 'lie' ? `Lié avec ${a?.nom || 'ton ami'}` : r.etat === 'envoye' ? 'Demande envoyée' : avant === 'lie' ? 'Lien défait' : avant === 'recu' ? 'Demande refusée' : 'Demande annulée');
    CMP = null; dessiner();
  } catch (e) { if (e.fini) return fin('Ce lien n’est plus valable.'); toast(e.message || 'Pas réussi.'); btn.disabled = false; }
}

// ── Une fiche : changer d'avis ──
function fichePop(f) {
  const a = MES.get(f.k);
  const box = document.createElement('div'); box.className = 'a-note';
  box.innerHTML = `<div class="a-note-c a-fiche" role="dialog">${poster(f, 'a-fiche-img')}<p class="a-note-t"></p><p class="a-sub">${esc([f.year, f.media === 'tv' ? 'Série' : 'Film'].filter(Boolean).join(' · '))}${a ? ` · ton avis : ${esc(avisMot(a))}` : ''}</p>
    <div class="a-choix"><button data-v="oui" aria-pressed="${a?.vote === 'oui'}">${icn('envie')} Envie</button><button data-v="super" aria-pressed="${a?.vote === 'super'}">${icn('tres')} Très envie</button><button data-v="vu" aria-pressed="${!!a?.note || a?.vote === 'vu'}">${icn('vu')} Vu…</button><button data-v="non" aria-pressed="${a?.vote === 'non'}">${icn('bof')} Bof</button></div>
    <div class="a-note-btns">${a ? '<button class="s-btn ghost" data-v="rien">Retirer mon avis</button>' : ''}<button class="s-btn ghost" data-x>Fermer</button></div></div>`;
  box.querySelector('.a-note-t').textContent = f.title;
  document.body.appendChild(box);
  box.addEventListener('click', async e => {
    if (e.target === box || e.target.closest('[data-x]')) { box.remove(); return; }
    const v = e.target.closest('[data-v]')?.dataset.v; if (!v) return;
    box.remove();
    if (v === 'vu') { const n = await demanderNote(f, a?.note || 4); if (n === undefined) return; await donner(f, 'vu', n); }
    else await donner(f, v);
    toast(v === 'rien' ? 'Avis retiré' : 'Enregistré'); dessiner();
  });
}

// ── Mes films ──
function mes() {
  const b = $.querySelector('.s-body'), l = [...MES.values()];
  const groupes = { oui: l.filter(a => !a.note && (a.vote === 'oui' || a.vote === 'super')), vu: l.filter(a => a.note || a.vote === 'vu').sort((x, y) => (y.note || 0) - (x.note || 0)), non: l.filter(a => !a.note && a.vote === 'non') };
  const sel = groupes[filtre];
  b.innerHTML = `<div class="a-filtres">${[['oui', 'Envies'], ['vu', 'Vus'], ['non', 'Bof']].map(([k, t]) => `<button data-f="${k}" aria-pressed="${filtre === k}">${t} · ${groupes[k].length}</button>`).join('')}</div>
    ${sel.length ? `<ul class="s-list a-liste">${sel.map(a => `<li><button class="a-li" data-film="${esc(a.k)}">${poster(a, 'r-img')}<div class="r-t"><b></b><span class="r-who">${esc([a.year, avisMot(a)].filter(Boolean).join(' · '))}</span></div></button></li>`).join('')}</ul>` : `<p class="a-vide">${filtre === 'oui' ? 'Pas encore d’envie : glisse des films à droite dans Cinder.' : filtre === 'vu' ? 'Pas encore de film vu : glisse vers le haut dans Cinder, ou cherche-le.' : 'Rien ici.'}</p>`}`;
  b.querySelectorAll('.a-liste .r-t b').forEach((x, i) => { x.textContent = sel[i].title; });
}

// ── Chercher ──
function chercher() {
  const b = $.querySelector('.s-body');
  b.innerHTML = `<div class="a-search">${icn('loupe')}<input id="a-q" placeholder="Un film, une série…" autocomplete="off" enterkeyhint="search"></div><ul class="s-list a-liste a-res"></ul>`;
  const q = b.querySelector('#a-q'); let t = null;
  const dessinerRes = () => {
    const ul = b.querySelector('.a-res');
    ul.innerHTML = recherche.map(f => `<li><button class="a-li" data-film="${esc(f.k)}">${poster(f, 'r-img')}<div class="r-t"><b></b><span class="r-who">${esc([f.year, f.media === 'tv' ? 'Série' : 'Film', MES.get(f.k) ? 'ton avis : ' + avisMot(MES.get(f.k)) : ''].filter(Boolean).join(' · '))}</span></div></button></li>`).join('');
    ul.querySelectorAll('.r-t b').forEach((x, i) => { x.textContent = recherche[i].title; });
  };
  q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(async () => { if (q.value.trim().length < 2) { recherche = []; dessinerRes(); return; } try { recherche = (await call('chercher', { q: q.value })).films; dessinerRes(); } catch (e) { toast(e.message); } }, 350); });
  dessinerRes(); q.focus();
}

$.addEventListener('click', async e => {
  const t = e.target.closest('[data-t]'); if (t) { onglet = t.dataset.t; store.set('ami-onglet', onglet); dessiner(); return; }
  const v = e.target.closest('.s-btns [data-v]'); if (v) { glisser(v.dataset.v); return; }
  const fl = e.target.closest('[data-f]'); if (fl) { filtre = fl.dataset.f; mes(); return; }
  if (e.target.closest('[data-nom]')) { accueil(); return; }
  const li = e.target.closest('[data-lier]'); if (li) { lienAgir(li.dataset.lier, 'lier', li); return; }
  const de = e.target.closest('[data-delier]'); if (de) { if (de.hasAttribute('data-defaire') && !confirm('Défaire le lien ? Vous ne verrez plus vos films en commun.')) return; lienAgir(de.dataset.delier, 'delier', de); return; }
  if (e.target.closest('[data-hasard]')) { const l = CMP?.ensemble || []; if (!l.length) return; const f = l[Math.floor(Math.random() * l.length)]; toast(`À voir : ${f.title}${f.year ? ` (${f.year})` : ''}`); fichePop(f); return; }
  const fm = e.target.closest('[data-film]');
  if (fm) { const k = fm.dataset.film; const f = MES.get(k) || recherche.find(x => x.k === k) || matchs.films?.get(k); if (f) fichePop(f); }
});
document.addEventListener('keydown', e => { if (onglet !== 'cinder' || e.target.closest?.('input') || document.querySelector('.a-note')) return; const v = { ArrowRight: 'oui', ArrowLeft: 'non', ArrowUp: 'vu' }[e.key]; if (v) { e.preventDefault(); glisser(v); } });
addEventListener('hashchange', () => location.reload());
charger();
