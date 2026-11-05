// Ciné Azami : la page des amis de la maison. Un lien à vie (le jeton est après le #, jamais envoyé au serveur
// de la page ; il n'est transmis qu'à la fonction « amis ») ; seulement le cinéma : Cinder sur la collection de
// la maison, ses films (envies, vus et notés), et la comparaison avec Yatoni, Mariana et les autres amis.
// Tout ce qui vient des autres (prénoms, titres) est écrit comme du texte, jamais comme du HTML.
import * as JEU from './jeu-cine.js';
import { haptic, armer as armerHaptique } from './haptique.js';
const URL_FN = (window.MAISON_CONFIG?.supabaseUrl || '') + '/functions/v1/amis';
const $ = document.getElementById('s');
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const deHash = (location.hash.match(/^#([A-Za-z0-9_-]{43})/) || [])[1] || '';
const resetT = (location.hash.match(/^#reset=([A-Za-z0-9_-]{43})/) || [])[1] || '';
if (deHash) store.set('ami-jeton', deHash);
let jeton = deHash || store.get('ami-jeton') || '';
// avec un compte : une session (gardée sur l'appareil) remplace le lien
let session = store.get('ami-session') || '';
const del = k => { try { localStorage.removeItem(k); } catch {} };
// le lien reste dans l'adresse : l'ajouter à l'écran d'accueil ou en favori garde l'accès
if (!deHash && jeton) try { history.replaceState(null, '', `#${jeton}`); } catch {}

let JE = JEU.neuf(), jeuT = 0, LIENS = null, P = null, onglet = store.get('ami-onglet') || 'cinder', pileF = [], vusK = new Set(), MES = new Map(), CMP = null, filtre = 'oui', enCharge = false, recherche = [];

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
  groupe: '<circle cx="9" cy="8.6" r="3.2"/><path d="M3.4 19.4c.5-3.3 2.8-5.2 5.6-5.2s5.1 1.9 5.6 5.2"/><circle cx="16.6" cy="9.4" r="2.6"/><path d="M15.4 14.4c.4-.1.8-.2 1.2-.2 2.3 0 4.2 1.6 4.6 4.4"/>',
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
  const auth = session && !deHash ? { session } : { jeton };
  const r = await fetch(URL_FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, action, ...auth }), referrerPolicy: 'no-referrer', cache: 'no-store' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (j.session) { session = ''; del('ami-session'); if (!jeton) { connexion(j.error); throw Object.assign(new Error(j.error), { gere: true }); } }
    const e = new Error(j.error || 'Erreur'); e.fini = j.fini || r.status === 410 || r.status === 404; throw e;
  }
  return j;
}
function fin(msg) {
  $.innerHTML = `<section class="s-fin">${icn('film')}<h1>Ciné Azami</h1><p></p></section>`;
  $.querySelector('p').textContent = msg;
}
let toastT;
function toast(m) { let t = document.getElementById('s-toast'); if (!t) { t = document.createElement('div'); t.id = 's-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }

async function charger() {
  if (resetT) return reinit();
  if (!jeton && !session) return connexion();
  try { P = await call('moi'); } catch (e) { if (e.gere) return; return fin(e.fini ? (session && !jeton ? 'Ce compte a été coupé.' : 'Ce lien n’est plus valable. Demande-leur un nouveau lien.') : 'Le ciné ne répond pas pour le moment. Réessaie dans un instant.'); }
  try { JE = JEU.fusion(JEU.propre(JSON.parse(store.get('ami-jeu') || 'null')), P.jeu); } catch { JE = JEU.propre(P.jeu); }
  if (!P.nom) return accueil();
  if (!P.tuto) return tuto(0);
  await chargerMes();
  dessiner();
  // la deuxième visite par le lien : proposer un compte (une fois par jour au plus, si on dit « plus tard »)
  if (installAProposer()) setTimeout(installPop, 900);
  else if (!P.compte && Date.now() - Number(store.get('ami-compte-plus-tard') || 0) > 864e5) setTimeout(() => comptePop(true), 900);
}

// ── Le compte : pseudo, e-mail (pour retrouver le mot de passe), mot de passe ──
function pop(html) {
  document.querySelector('.a-note')?.remove();
  const box = document.createElement('div'); box.className = 'a-note'; box.innerHTML = `<div class="a-note-c a-pop" role="dialog">${html}</div>`;
  document.body.appendChild(box);
  box.addEventListener('click', e => { if (e.target === box || e.target.closest('[data-fermer]')) box.remove(); });
  return box;
}
function comptePop(propose) {
  const c = P.compte;
  const box = pop(`<p class="a-note-t">${c ? 'Mon compte' : propose ? 'Crée ton compte' : 'Créer un compte'}</p>
    <p class="a-sub">${c ? 'Tu te connectes avec ton pseudo (ou ton e-mail) et ton mot de passe, sur n’importe quel appareil.' : 'La prochaine fois, connecte-toi sans le lien, sur n’importe quel appareil. Ton lien continue de marcher.'}</p>
    <form class="a-form" autocomplete="on">
      <label class="s-lab" for="c-p">Pseudo</label><input id="c-p" name="pseudo" maxlength="24" autocomplete="username" autocapitalize="none" required>
      <label class="s-lab" for="c-e">E-mail <small>(pour retrouver ton mot de passe)</small></label><input id="c-e" name="email" type="email" maxlength="140" autocomplete="email" required>
      <label class="s-lab" for="c-m">${c ? 'Nouveau mot de passe <small>(laisse vide pour le garder)</small>' : 'Mot de passe <small>(8 caractères au moins)</small>'}</label><input id="c-m" name="mdp" type="password" minlength="8" maxlength="200" autocomplete="new-password" ${c ? '' : 'required'}>
      <div class="a-note-btns"><button type="button" class="s-btn ghost" data-fermer ${propose ? 'data-plustard' : ''}>${propose ? 'Plus tard' : 'Fermer'}</button><button class="s-btn">${c ? 'Enregistrer' : 'Créer mon compte'}</button></div>
    </form>`);
  const f = box.querySelector('form');
  f.pseudo.value = c?.pseudo || (P.nom || '').replace(/\s+/g, '').slice(0, 24); f.email.value = c?.email || '';
  box.querySelector('[data-plustard]')?.addEventListener('click', () => store.set('ami-compte-plus-tard', String(Date.now())));
  f.addEventListener('submit', async e => {
    e.preventDefault(); const b = f.querySelector('button:not([type])'); b.disabled = true;
    try {
      const r = await call('compte', { pseudo: f.pseudo.value.trim(), email: f.email.value.trim(), mdp: f.mdp.value });
      if (r.session) { session = r.session; store.set('ami-session', session); }
      P.compte = { pseudo: f.pseudo.value.trim(), email: f.email.value.trim().toLowerCase() };
      box.remove(); toast(c ? 'Compte mis à jour' : 'Compte créé : tu peux te connecter partout');
    } catch (err) { if (!err.gere) toast(err.message); b.disabled = false; }
  });
}
// sans lien : se connecter avec son compte
function connexion(msg) {
  $.innerHTML = `<section class="s-hello"><b class="s-logo big">${icn('flamme')} Ciné Azami</b>
    <h1>Connexion</h1><p class="s-small">${esc(msg || 'Avec ton pseudo (ou ton e-mail) et ton mot de passe.')}</p>
    <form class="a-form" autocomplete="on">
      <label class="s-lab" for="l-q">Pseudo ou e-mail</label><input id="l-q" name="qui" maxlength="140" autocomplete="username" autocapitalize="none" required>
      <label class="s-lab" for="l-m">Mot de passe</label><input id="l-m" name="mdp" type="password" maxlength="200" autocomplete="current-password" required>
      <button class="s-btn">Se connecter</button>
    </form>
    <button class="s-lien" data-oubli>Mot de passe oublié ?</button>
    <p class="s-small">Pas encore de compte ? Ouvre le lien qu’on t’a envoyé, puis crée ton compte depuis ton prénom, en haut à droite.</p>
    <a class="s-lien" href="cine.html">Yatoni ou Mariana ? C’est par ici</a></section>`;
  const f = $.querySelector('form');
  f.addEventListener('submit', async e => {
    e.preventDefault(); const b = f.querySelector('button'); b.disabled = true;
    try { const r = await call('connexion', { qui: f.qui.value.trim(), mdp: f.mdp.value }); session = r.session; store.set('ami-session', session); jeton = ''; await charger(); }
    catch (err) { toast(err.message); b.disabled = false; }
  });
  $.querySelector('[data-oubli]').addEventListener('click', async () => {
    const qui = f.qui.value.trim(); if (!qui) { toast('Écris d’abord ton pseudo ou ton e-mail'); f.qui.focus(); return; }
    try { const r = await call('oubli', { qui }); toast(r.sansMail ? 'La récupération par e-mail n’est pas encore active : demande un nouveau lien à tes hôtes.' : 'Si ce compte a un e-mail, un lien vient de partir (valable 30 minutes).'); }
    catch (err) { toast(err.message); }
  });
}
// le lien reçu par e-mail : choisir un nouveau mot de passe
function reinit() {
  $.innerHTML = `<section class="s-hello"><b class="s-logo big">${icn('flamme')} Ciné Azami</b><h1>Nouveau mot de passe</h1>
    <form class="a-form"><label class="s-lab" for="r-m">Nouveau mot de passe <small>(8 caractères au moins)</small></label><input id="r-m" name="mdp" type="password" minlength="8" maxlength="200" autocomplete="new-password" required>
    <button class="s-btn">Enregistrer</button></form></section>`;
  const f = $.querySelector('form');
  f.addEventListener('submit', async e => {
    e.preventDefault(); const b = f.querySelector('button'); b.disabled = true;
    try { const r = await call('reinit', { token: resetT, mdp: f.mdp.value }); session = r.session; store.set('ami-session', session); try { history.replaceState(null, '', location.pathname); } catch {} location.reload(); }
    catch (err) { toast(err.message); b.disabled = false; }
  });
}
// le menu sous son prénom : prénom, compte, inviter quelqu'un, se déconnecter
function moiPop() {
  const box = pop(`<p class="a-note-t"></p><div class="a-menu">
    <button class="s-btn ghost" data-m="nom">Changer mon prénom</button>
    <button class="s-btn ghost" data-m="compte">${P.compte ? 'Mon compte' : 'Créer un compte'}</button>
    <button class="s-btn" data-m="inviter">Inviter quelqu’un</button>
    <button class="s-btn ghost" data-m="azami">Parler à Azami</button>
    ${AUTONOME ? '' : '<button class="s-btn ghost" data-m="installer">Mettre sur l’écran d’accueil</button>'}
    ${session && !deHash ? '<button class="s-btn ghost" data-m="sortir">Se déconnecter</button>' : ''}
    <button class="s-btn ghost" data-fermer>Fermer</button></div>`);
  box.querySelector('.a-note-t').textContent = P.nom + (P.compte ? ` · @${P.compte.pseudo}` : '');
  box.addEventListener('click', async e => {
    const m = e.target.closest('[data-m]')?.dataset.m; if (!m) return;
    if (m === 'nom') { box.remove(); accueil(); }
    if (m === 'compte') comptePop(false);
    if (m === 'inviter') invitePop();
    if (m === 'azami') azamiPop();
    if (m === 'installer') installPop();
    if (m === 'sortir') { try { await call('deconnexion'); } catch {} session = ''; del('ami-session'); box.remove(); connexion('À bientôt.'); }
  });
}
function invitePop() {
  const box = pop(`<p class="a-note-t">Inviter quelqu’un</p><p class="a-sub">Cette personne reçoit son propre lien vers le ciné, et vous êtes liés d’office (vous voyez vos films en commun).</p>
    <form class="a-form"><label class="s-lab" for="i-n">Son prénom</label><input id="i-n" name="nom" maxlength="24" autocomplete="off"><div class="a-note-btns"><button type="button" class="s-btn ghost" data-fermer>Fermer</button><button class="s-btn">Créer son lien</button></div></form>`);
  const f = box.querySelector('form');
  f.addEventListener('submit', async e => {
    e.preventDefault(); const b = f.querySelector('button:not([type])'); b.disabled = true;
    try {
      const r = await call('inviter', { nom: f.nom.value.trim() });
      const nom = f.nom.value.trim();
      box.querySelector('.a-form').outerHTML = `<p class="a-sub">Le lien ${nom ? `de <b></b>` : ''} (il marche à vie, ne le donne qu’à cette personne) :</p><input class="a-lien-in" readonly><div class="a-note-btns">${navigator.share ? '<button class="s-btn" data-partager>Envoyer</button>' : ''}<button class="s-btn ${navigator.share ? 'ghost' : ''}" data-copier>Copier</button><button class="s-btn ghost" data-fermer>Fermer</button></div>`;
      if (nom) box.querySelector('.a-sub b').textContent = nom;
      const inp = box.querySelector('.a-lien-in'); inp.value = r.lien;
      box.querySelector('[data-partager]')?.addEventListener('click', () => navigator.share({ title: 'Ciné Azami', text: `${P.nom} t’invite sur Ciné Azami`, url: r.lien }).catch(() => {}));
      box.querySelector('[data-copier]').addEventListener('click', async () => { try { await navigator.clipboard.writeText(r.lien); toast('Lien copié'); } catch { inp.select(); } });
      LIENS = null; CMP = null;
    } catch (err) { if (!err.gere) toast(err.message); b.disabled = false; }
  });
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
  const finir = async () => { try { await call('profil', { tuto: true }); P.tuto = true; } catch {} await chargerMes(); onglet = 'cinder'; dessiner(); if (installAProposer()) setTimeout(installPop, 700); };
  $.querySelector('[data-next]').addEventListener('click', () => n < TUTO.length - 1 ? tuto(n + 1) : finir());
  $.querySelector('[data-skip]')?.addEventListener('click', finir);
}

// ── L'écran : quatre onglets ──
const ONGLETS = [['cinder', 'Cinder'], ['matchs', 'Amis'], ['mes', 'Mes films'], ['chercher', 'Chercher']];
function dessiner() {
  document.querySelectorAll('.a-combo, .a-vol').forEach(x => x.remove());
  $.innerHTML = `<header class="s-top"><b class="s-logo">${icn('flamme')} Ciné Azami</b><button class="a-qui" data-nom aria-label="Mon menu"></button></header>
    <div class="a-hud">${hud()}</div>
    ${onglet === 'cinder' ? `<button class="a-scene" data-azami aria-label="Parler à Azami"><img src="azami/v44/${reduit() ? 'statiques/azami_v44_cinebleu_statique' : 'azami_v44_cinebleu_anime'}.svg" alt=""><p class="a-bulle"></p></button><div class="a-obj-h">${objectif()}</div>` : ''}
    ${onglet === 'cinder' ? '' : '<p class="s-sous">Chez <b class="s-hotes"></b></p>'}
    <div class="s-tabs a-tabs" role="tablist">${ONGLETS.map(([k, l]) => `<button role="tab" data-t="${k}" aria-selected="${onglet === k}">${l}${k === 'matchs' && P.demandes ? ` <span class="a-badge" aria-label="${P.demandes} demande${P.demandes > 1 ? 's' : ''}">${P.demandes}</span>` : ''}</button>`).join('')}</div>
    <section class="s-body"></section>`;
  $.querySelector('.a-qui').textContent = P.nom; const sh = $.querySelector('.s-hotes'); if (sh) sh.textContent = hotes();
  const bu = $.querySelector('.a-bulle'); if (bu) bu.textContent = bulle(); styler($);
  ({ cinder: pile, matchs, mes, chercher })[onglet]?.();
}

// ── Mettre Ciné Azami sur l'écran d'accueil (iPhone surtout) : une fois au début, puis depuis le menu ──
const IOS = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const AUTONOME = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
const PARTAGE = '<svg class="icn" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8a1.5 1.5 0 0 0-1.5-1.5H16"/></svg>';
const PLUSCARRE = '<svg class="icn" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/></svg>';
function installPop() {
  const box = pop(`<p class="a-note-t">Ciné Azami sur ton écran d’accueil</p>
    <p class="a-sub">Il s’ouvre alors comme une app, en plein écran, en un geste.</p>
    ${IOS ? `<ol class="a-inst">
      <li><span class="a-inst-n">1</span><span>Dans <b>Safari</b>, touche le bouton <b>Partager</b> ${PARTAGE}, en bas de l’écran (ou en haut sur iPad).</span></li>
      <li><span class="a-inst-n">2</span><span>Fais défiler et choisis <b>Sur l’écran d’accueil</b> ${PLUSCARRE}.</span></li>
      <li><span class="a-inst-n">3</span><span>Touche <b>Ajouter</b>, en haut à droite. Azami t’attend sur ton écran d’accueil.</span></li></ol>`
    : `<ol class="a-inst">
      <li><span class="a-inst-n">1</span><span>Ouvre le menu du navigateur (les trois points ⋮).</span></li>
      <li><span class="a-inst-n">2</span><span>Choisis <b>Ajouter à l’écran d’accueil</b> ou <b>Installer l’application</b>.</span></li></ol>`}
    <p class="a-sub">${P?.compte ? 'Dans l’app, connecte-toi une fois avec ton pseudo et ton mot de passe.' : 'Fais-le depuis ce lien : il reste dans l’app.'}</p>
    <div class="a-note-btns"><button class="s-btn" data-fermer>C’est fait</button><button class="s-btn ghost" data-fermer data-tard>Plus tard</button></div>`);
  box.querySelector('[data-tard]')?.addEventListener('click', () => store.set('ami-install-plus-tard', String(Date.now())));
  box.querySelector('.s-btn:not([data-tard])').addEventListener('click', () => store.set('ami-install', '1'));
}
const installAProposer = () => !AUTONOME && !store.get('ami-install') && Date.now() - Number(store.get('ami-install-plus-tard') || 0) > 3 * 864e5;

// ── Parler à Azami : un petit crédit par ami et par jour (elle ne parle que cinéma, elle ne sait rien de la maison) ──
let FIL = [], AZ_RESTE = null;
function azamiPop() {
  const box = pop(`<div class="a-az"><img class="a-az-img" src="azami/v44/statiques/azami_v44_cinebleu_statique.svg" alt=""><div><p class="a-note-t">Azami</p><p class="a-sub">Elle parle ciné : un conseil, une idée pour ce soir, un avis sur un film.</p></div></div>
    <div class="a-fil" aria-live="polite"></div>
    <form class="a-az-form"><input name="texte" maxlength="500" autocomplete="off" placeholder="Dis-lui…" aria-label="Ton message"><button class="s-btn" aria-label="Envoyer">${icn('flamme')}</button></form>
    <p class="a-az-reste"></p><div class="a-note-btns"><button type="button" class="s-btn ghost" data-fermer>Fermer</button></div>`);
  const fil = box.querySelector('.a-fil'), f = box.querySelector('form'), reste = box.querySelector('.a-az-reste');
  const peindre = () => {
    fil.innerHTML = FIL.length ? FIL.map(m => `<p class="a-msg ${m.role}"></p>`).join('') : '<p class="a-msg assistant"></p>';
    const ps = fil.querySelectorAll('.a-msg'); if (!FIL.length) ps[0].textContent = `Miaou ${P.nom || ''}. Tu cherches quoi à regarder ?`; else FIL.forEach((m, i) => { ps[i].textContent = m.texte; });
    reste.textContent = AZ_RESTE == null ? '' : AZ_RESTE > 0 ? `Encore ${AZ_RESTE} message${AZ_RESTE > 1 ? 's' : ''} aujourd’hui.` : 'Azami fait la sieste : à demain !';
    fil.scrollTop = fil.scrollHeight;
  };
  peindre();
  f.addEventListener('submit', async e => {
    e.preventDefault(); const texte = f.texte.value.trim(); if (!texte) return;
    const film = pileF[0] ? { title: pileF[0].title, year: pileF[0].year } : null;
    const avant = FIL.slice(-6); FIL.push({ role: 'user', texte }); f.texte.value = ''; f.querySelector('button').disabled = true;
    const att = document.createElement('p'); att.className = 'a-msg assistant att'; att.textContent = '…'; peindre(); fil.appendChild(att); fil.scrollTop = fil.scrollHeight;
    try { const r = await call('azami', { texte, fil: avant, film }); FIL.push({ role: 'assistant', texte: r.reponse }); AZ_RESTE = r.reste; }
    catch (err) { if (!err.gere) { FIL.push({ role: 'assistant', texte: err.message }); if (/sieste|plafond/i.test(err.message)) AZ_RESTE = 0; } }
    f.querySelector('button').disabled = false; peindre(); if (AZ_RESTE !== 0) f.texte.focus();
  });
  if (AZ_RESTE !== 0) setTimeout(() => f.texte.focus(), 300);
}

// ── Le jeu : série, points, niveau, objectif du jour, combos, fêtes (jeu-cine.js) ──
const reduit = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const GEM = '<svg class="gem" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10l4 6-9 12L3 9z"/></svg>';
function hud() {
  const sr = JEU.serieDuJour(JE), pr = JEU.progres(JE.xp);
  return `<span class="a-pill ${sr ? '' : 'off'}" title="Jours de suite">${icn('flamme')}${sr}</span><span class="a-pill" title="Points">${GEM}${JE.xp.toLocaleString('fr-CH')}</span><span class="a-lvl">${pr.titre}<span class="a-ring" data-p="${pr.pct}" title="Encore ${pr.reste} points pour le niveau suivant"><b>${pr.n}</b></span></span>`;
}
function objectif() {
  const n = JEU.aujourdhui(JE), fait = n >= JEU.OBJECTIF;
  return `<div class="a-obj ${fait ? 'fait' : ''}"><span>${fait ? 'Objectif atteint' : 'Objectif du jour'}</span><span class="barre"><i data-w="${Math.min(100, Math.round(100 * n / JEU.OBJECTIF))}"></i></span><span>${fait ? '✓' : `${n}/${JEU.OBJECTIF}`}</span><span class="coffre"><svg viewBox="0 0 24 24"><rect x="3" y="9" width="18" height="11" rx="2"/><path d="M3 9.5a9 4.5 0 0 1 18 0" opacity=".6"/></svg></span></div>`;
}
function bulle() {
  const n = JEU.aujourdhui(JE), sr = JEU.serieDuJour(JE);
  if (n >= JEU.OBJECTIF) return 'Objectif atteint ! Tout ce que tu tries maintenant, c’est du bonus.';
  if (!n && sr) return `${sr} jour${sr > 1 ? 's' : ''} de suite : ne casse pas la série !`;
  if (!n) return `${JEU.OBJECTIF} films aujourd’hui et je t’ouvre le coffre.`;
  return `Encore ${JEU.OBJECTIF - n} pour le coffre. Enchaîne pour les combos !`;
}
function jeuSauver() {
  store.set('ami-jeu', JSON.stringify(JE));
  clearTimeout(jeuT); jeuT = setTimeout(() => call('jeu', { jeu: JE }).catch(() => {}), 1500);
}
// la page interdit les styles écrits dans le HTML (sécurité) : largeurs et anneaux se posent ici
function styler(r = document) { r.querySelectorAll('[data-w]').forEach(x => { x.style.width = `${x.dataset.w}%`; }); r.querySelectorAll('[data-p]').forEach(x => { x.style.setProperty('--p', `${x.dataset.p}%`); }); }
function jeuMaj() {
  const h = $.querySelector('.a-hud'); if (h) h.innerHTML = hud();
  const o = $.querySelector('.a-obj-h'); if (o) o.innerHTML = objectif();
  const b = $.querySelector('.a-bulle'); if (b) b.textContent = bulle();
  styler($);
}
function flotte(txt, cls = '') { const el = document.createElement('div'); el.className = `a-vol ${cls}`; el.textContent = txt; document.body.appendChild(el); setTimeout(() => el.remove(), 1100); }
function confettis(n = 40) {
  if (reduit()) return;
  const C = ['#FFC93C', '#48D98A', '#B98CFF', '#62D8FF', '#FFFFFF'];
  for (let i = 0; i < n; i++) { const c = document.createElement('i'); c.className = 'conf'; c.style.left = `${Math.random() * 100}vw`; c.style.background = C[i % C.length]; c.style.setProperty('--dx', `${(Math.random() - .5) * 120}px`); c.style.setProperty('--r', `${(Math.random() - .5) * 900}deg`); c.style.animationDelay = `${Math.random() * .35}s`; document.body.appendChild(c); setTimeout(() => c.remove(), 2400); }
}
// une fête plein écran : un match, le coffre, un niveau
const FETES = [];
function fete(x) { FETES.push(x); if (!document.querySelector('.a-fete')) feteSuivante(); }
function feteSuivante() {
  const x = FETES.shift(); if (!x) return;
  const { titre, html, gain, film } = x;
  const box = document.createElement('div'); box.className = 'a-fete'; box.setAttribute('role', 'dialog');
  box.innerHTML = `<div><h2></h2>${html || ''}${film?.poster ? `<img class="aff" src="${esc(film.poster)}" alt="" referrerpolicy="no-referrer">` : ''}<img class="az" src="azami/v44/reactions/${reduit() ? 'statiques/fete_reussites_statique' : 'fete_reussites_anime'}.svg" alt="">${gain ? `<span class="gain">+${gain}</span><br>` : ''}<button class="s-btn">Trop bien</button></div>`;
  box.querySelector('h2').textContent = titre;
  document.body.appendChild(box); confettis();
  haptic('heavy');
  box.addEventListener('click', e => { if (e.target.closest('button') || e.target === box) { box.remove(); setTimeout(feteSuivante, 250); } });
}
function jeuAvis(f, v) {
  // un match : tu as envie d'un film dont un hôte a envie aussi
  const avec = (v === 'oui' || v === 'super') ? (f.hotes || []).filter(h => h.envie).map(h => h.nom) : [];
  const { e, f: r } = JEU.avis(JE, v === 'vu' ? 'vu' : v, { match: avec.length > 0 }); JE = e; jeuSauver(); jeuMaj();
  flotte(`+${r.gain - (r.coffre ? JEU.COFFRE : 0) - (r.match ? JEU.MATCH : 0)}`);
  if (r.combo >= 3) { document.querySelector('.a-combo')?.remove(); const c = document.createElement('div'); c.className = 'a-combo'; c.textContent = `Combo ×${r.combo}`; document.body.appendChild(c); setTimeout(() => c.remove(), 2600); }
  if (r.serie > 1) toast(`${r.serie} jours de suite !`);
  if (r.match) setTimeout(() => fete({ titre: 'C’est un match !', html: `<p>${esc(avec.join(' et '))} et toi voulez voir<br><b>${esc(f.title)}</b></p>`, gain: JEU.MATCH, film: f }), 350);
  if (r.coffre) setTimeout(() => fete({ titre: 'Objectif du jour !', html: `<p>${JEU.OBJECTIF} films triés : le coffre s’ouvre.</p>`, gain: JEU.COFFRE }), 360);
  if (r.niveau) setTimeout(() => fete({ titre: `Niveau ${r.niveau}`, html: `<p>Te voilà <b>${esc(JEU.titre(r.niveau))}</b>.</p>` }), 370);
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
// La pile se dessine une fois ; ensuite, à chaque avis, la carte de dessous (déjà affichée, affiche déjà décodée)
// monte, et la suivante arrive derrière en fondu, une fois son affiche prête : rien ne se redessine, rien ne clignote.
const frag = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
async function pile() {
  const b = $.querySelector('.s-body');
  if (pileF.length < 4) { if (!pileF.length) b.innerHTML = '<p class="s-wait">La pioche arrive…</p>'; await remplir(); if (onglet !== 'cinder') return; }
  const cur = pileF[0];
  if (!cur) { b.innerHTML = `<div class="s-vide">${icn('coupe')}<p>Il n’y a plus de films à proposer pour le moment.</p></div>`; return; }
  b.innerHTML = `<div class="s-stack">${carte(cur, 'top')}</div>
    <div class="s-btns"><button class="b-non" data-v="non" aria-label="Bof">${icn('bof')}<small>Bof</small></button><button class="b-vu" data-v="vu" aria-label="Déjà vu">${icn('vu')}<small>Vu</small></button><button class="b-super" data-v="super" aria-label="Très envie">${icn('tres')}<small>Très</small></button><button class="b-oui" data-v="oui" aria-label="Envie">${icn('envie')}<small>Envie</small></button></div>
    <p class="s-aide"></p>`;
  aide();
  armer(b.querySelector('.c.top'));
  dessous();
}
const aide = () => { const a = $.querySelector('.s-aide'); if (a) a.textContent = `${MES.size} avis donnés · → envie · ← bof · ↑ déjà vu · touche l’affiche pour lire`; };
// la carte suivante, derrière : elle n'apparaît qu'une fois son affiche décodée
function dessous() {
  const st = $.querySelector('.s-stack'), nxt = pileF[1]; if (!st) return;
  st.querySelector('.c.next')?.remove();
  if (!nxt) return;
  const n = frag(carte(nxt, 'next')); n.classList.add('enter'); st.insertBefore(n, st.firstChild);
  const im = n.querySelector('img'); let vu = false;
  const montre = () => { if (vu) return; vu = true; requestAnimationFrame(() => requestAnimationFrame(() => n.classList.remove('enter'))); };
  if (im?.decode) { im.decode().then(montre, montre); setTimeout(montre, 1500); } else montre();
  for (const f of pileF.slice(2, 5)) if (f?.poster) { const i = new Image(); i.decoding = 'async'; i.referrerPolicy = 'no-referrer'; i.src = f.poster; }
}
// le doigt sur la carte du dessus
function armer(el) {
  if (!el) return;
  let x0 = null, y0 = 0, dx = 0, dy = 0, t0 = 0, raf = 0;
  const nx = () => el.parentElement?.querySelector('.c.next:not(.enter)');
  const paint = () => { raf = 0; const vert = Math.abs(dy) > Math.abs(dx) * 1.1, n = nx();
    el.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${dx / 16}deg)`;
    el.classList.toggle('l-oui', !vert && dx > 40); el.classList.toggle('l-non', !vert && dx < -40); el.classList.toggle('l-vu', vert && dy < -50);
    if (n) { const k = Math.min(1, Math.hypot(dx, dy) / 160); n.style.transform = `scale(${.94 + .06 * k}) translateY(${10 - 10 * k}px)`; } };
  el.addEventListener('pointerdown', e => { if (e.button > 0 || !el.classList.contains('top')) return; x0 = e.clientX; y0 = e.clientY; dx = dy = 0; t0 = performance.now(); el.setPointerCapture(e.pointerId); el.style.transition = 'none'; const n = nx(); if (n) n.style.transition = 'none'; });
  el.addEventListener('pointermove', e => { if (x0 == null) return; e.preventDefault(); dx = e.clientX - x0; dy = e.clientY - y0; if (!raf) raf = requestAnimationFrame(paint); });
  const end = () => {
    if (x0 == null) return; x0 = null; cancelAnimationFrame(raf); el.style.transition = ''; const n = nx(); if (n) n.style.transition = '';
    const vert = Math.abs(dy) > Math.abs(dx) * 1.1, fast = (performance.now() - t0) < 300;
    if (Math.hypot(dx, dy) < 8) { el.style.transform = ''; el.classList.toggle('lit'); return; }
    if (!vert && (Math.abs(dx) > 90 || (fast && Math.abs(dx) > 40))) return glisser(dx > 0 ? 'oui' : 'non', { dx, dy });
    if (vert && dy < 0 && (Math.abs(dy) > 90 || (fast && Math.abs(dy) > 40))) return glisser('vu', { dx, dy });
    el.style.transform = ''; el.classList.remove('l-oui', 'l-non', 'l-vu'); if (n) n.style.transform = '';
  };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}
async function glisser(v, from) {
  const f = pileF[0], el = $.querySelector('.c.top'); if (!f || !el || el.classList.contains('part')) return;
  if (v === 'vu') { const n = await demanderNote(f); if (n === undefined) { el.style.transform = ''; el.classList.remove('l-vu'); return; } return partir(f, el, 'vu', n, from); }
  partir(f, el, v, null, from);
}
function partir(f, el, v, n, from) {
  if (el) {
    const W = innerWidth + 260, x = from?.dx || 0, y = from?.dy || 0;
    el.classList.add('part'); el.classList.remove('top');
    el.style.transition = 'transform .32s cubic-bezier(.25,.6,.45,1), opacity .32s ease-in';
    requestAnimationFrame(() => { el.style.transform = v === 'vu' || v === 'super' ? `translate3d(${x * .6}px, ${-innerHeight}px, 0)` : `translate3d(${v === 'oui' ? W : -W}px, ${y * 1.6 + 40}px, 0) rotate(${v === 'oui' ? 28 : -28}deg)`; el.style.opacity = '0'; });
    el.style.pointerEvents = 'none'; setTimeout(() => el.remove(), 360);
  }
  haptic(v === 'super' ? 'medium' : v === 'oui' ? 'medium' : 'light');
  pileF.shift();
  jeuAvis(f, v);
  donner(f, v, n).then(aide);
  // la carte de dessous monte tout de suite
  const st = $.querySelector('.s-stack'), up = st?.querySelector('.c.next');
  if (st && up && pileF[0] && up.dataset.k === pileF[0].k) {
    up.classList.remove('enter'); up.style.transform = ''; up.classList.replace('next', 'top'); st.appendChild(up); armer(up); dessous();
    if (pileF.length < 6) remplir().then(() => { if (onglet === 'cinder' && !$.querySelector('.c.next')) dessous(); });
  } else setTimeout(() => { if (onglet === 'cinder') pile(); }, 200);
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
let FILA = null;   // le fil et les gens, vus par cet ami
const teinte = nom => { let h = 7; for (const c of String(nom || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return `hsl(${h % 360} 58% 46%)`; };
const avatar = (p, cls = '') => `<span class="av ${cls} ${p.hote ? 'hote' : ''}" data-teinte="${teinte(p.nom)}">${esc((p.nom || '?').trim().charAt(0).toUpperCase() || '?')}</span>`;
const avisMot2 = a => a.note ? `a vu <i></i> · ${note(a.note)}/5` : a.vote === 'vu' ? 'a vu <i></i>' : a.vote === 'super' ? 'a très envie de voir <i></i>' : a.vote === 'oui' ? 'a envie de voir <i></i>' : 'n’est pas tenté par <i></i>';
async function matchs() {
  const b = $.querySelector('.s-body');
  if (!CMP) { b.innerHTML = '<p class="s-wait">Un instant…</p>'; try { [CMP, LIENS, FILA] = await Promise.all([call('comparer'), call('liens').then(r => r.amis).catch(() => []), call('fil_ami').catch(() => ({ fil: [], gens: [] }))]); } catch (e) { if (e.fini) return fin('Ce lien n’est plus valable.'); b.innerHTML = '<p class="a-vide">Les amis ne répondent pas. Réessaie.</p>'; return; } if (onglet !== 'matchs') return; }
  const C = CMP, filmsDe = new Map();
  for (const p of C.personnes) for (const l of [p.matches, p.pourMoi, p.adores, p.desaccords]) for (const f of l) filmsDe.set(f.k, f);
  for (const f of C.ensemble) filmsDe.set(f.k, f);
  for (const f of FILA?.fil || []) filmsDe.set(f.k, f);
  matchs.films = filmsDe;
  const peu = C.nAvis < 15;
  const demande = (LIENS || []).some(x => x.etat === 'recu');
  const gens = [...(FILA?.gens || []), { qui: 'moi', nom: P.nom, moi: true }];
  const fil = (FILA?.fil || []), max = matchs.plus ? 60 : 12;
  b.innerHTML = `<div class="gens" role="list">${gens.map(p => `<button type="button" role="listitem" class="gen" data-profil="${esc(p.qui)}" aria-label="${esc(p.nom)}">${avatar(p)}<span></span></button>`).join('')}<button type="button" class="gen" data-inviter aria-label="Inviter quelqu’un"><span class="av plus">+</span><span>Inviter</span></button></div>
    ${demande ? lienBloc() : ''}${peu ? `<div class="a-conseil">${icn('flamme')}<p>Plus tu donnes d’avis dans Cinder, plus les matchs sont justes. (${C.nAvis} pour l’instant)</p></div>` : ''}
    ${C.ensemble.length ? `<section class="a-bloc a-ens"><h2>${icn('deux')} Une soirée tous ensemble</h2><p class="a-sub">Ce que vous avez tous envie de voir : toi, ${esc(hotes())}.</p>${rangee(C.ensemble, '')}<button class="s-btn a-hasard" data-hasard>${icn('de')} Un film au hasard pour ce soir</button></section>` : ''}
    ${fil.length ? `<section class="fil"><h3 class="fil-t">${icn('groupe')} Le fil</h3><ul class="fil-l">${fil.slice(0, max).map((x, i) => `<li class="fil-i"><button type="button" class="fil-av" data-profil="${esc(x.qui)}">${avatar(x)}</button><div class="fil-c"><p><b></b> ${avisMot2(x)}</p><small>${esc(ago(x.at))}</small></div><button type="button" class="fil-aff" data-film="${esc(x.k)}">${x.poster ? `<img src="${esc(x.poster)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="nop">${icn('film')}</span>`}</button></li>`).join('')}</ul>${fil.length > max ? '<button class="s-btn ghost" data-fil-plus>Voir plus</button>' : ''}</section>` : ''}
    ${C.cachés?.length ? `<p class="a-vide">${esc(C.cachés.join(' et '))} ne partage${C.cachés.length > 1 ? 'nt' : ''} pas ses goûts pour l’instant.</p>` : ''}
    ${demande ? '' : lienBloc()}`;
  b.querySelectorAll('.gen[data-profil] span:last-child').forEach((x, i) => { x.textContent = gens[i].moi ? 'Toi' : gens[i].nom; });
  b.querySelectorAll('.fil-i').forEach((li, i) => { const x = fil[i]; li.querySelector('.fil-c b').textContent = x.nom; li.querySelector('.fil-c i').textContent = x.title; });
  b.querySelectorAll('.a-lien b[data-i]').forEach(x => { x.textContent = LIENS[Number(x.dataset.i)]?.nom || ''; });
  b.querySelectorAll('[data-teinte]').forEach(x => { x.style.setProperty('--c', x.dataset.teinte); });
}
const ago = iso => { const d = (Date.now() - Date.parse(iso)) / 60e3; if (!(d >= 0)) return ''; if (d < 60) return 'à l’instant'; if (d < 1440) return `il y a ${Math.round(d / 60)} h`; const j = Math.round(d / 1440); return j === 1 ? 'hier' : j < 30 ? `il y a ${j} jours` : j < 365 ? `il y a ${Math.round(j / 30)} mois` : 'il y a longtemps'; };
// le profil de quelqu'un (un hôte, un ami lié, ou soi) : ses chiffres, ce que vous avez en commun, ses films
const PROFILS = {};
async function profilPop(qui) {
  const moi = qui === 'moi';
  const box = pop(`<p class="s-wait">Un instant…</p>`);
  let r;
  if (moi) r = { nom: P.nom, hote: false, avis: [...MES.values()].sort((x, y) => String(y.at || '').localeCompare(String(x.at || ''))) };
  else try { r = PROFILS[qui] ||= await call('profil_de', { qui }); } catch (e) { box.querySelector('.a-note-c').innerHTML = `<p class="a-sub">${esc(e.message)}</p><div class="a-note-btns"><button class="s-btn ghost" data-fermer>Fermer</button></div>`; return; }
  const avis = r.avis || [], vus = avis.filter(a => a.vote === 'vu' || a.note), envies = avis.filter(a => !a.note && (a.vote === 'oui' || a.vote === 'super')), notes = vus.filter(a => a.note);
  const moy = notes.length ? notes.reduce((s, a) => s + a.note, 0) / notes.length : 0;
  const cmp = moi ? null : (CMP?.personnes || []).find(p => p.nom === r.nom);
  const coeurs = [...vus].filter(a => a.note >= 4.5).sort((x, y) => y.note - x.note);
  const grilles = { coeurs: ['Coups de cœur', coeurs], super: ['Très envie', envies.filter(a => a.vote === 'super')], envies: ['Envies', envies], vus: ['Vus', [...vus].sort((x, y) => (y.note || 0) - (x.note || 0))] };
  let F = 'coeurs';
  for (const a of avis) matchs.films?.set(a.k, a);
  const draw = () => {
    const [gl, sel] = grilles[F];
    box.querySelector('.a-note-c').innerHTML = `<header class="pf-tete">${avatar({ nom: r.nom, hote: r.hote }, 'big')}<div><p class="a-note-t"></p><p class="a-sub pf-sub">${moi ? 'Toi' : r.hote ? 'De la maison' : 'Ami lié'}</p></div></header>
      <ul class="pf-stats"><li><b>${avis.length}</b><span>avis</span></li><li><b>${vus.length}</b><span>vus</span></li><li><b>${envies.length}</b><span>envies</span></li><li><b>${moy ? note(moy) : '–'}</b><span>note moy.</span></li>${cmp ? `<li class="${cmp.compat != null ? 'ok' : ''}"><b>${cmp.compat != null ? cmp.compat + ' %' : '–'}</b><span>d’accord</span></li>` : ''}</ul>
      ${cmp?.matches?.length ? `<h3>${icn('envie')} Envie tous les deux · ${cmp.nMatches || cmp.matches.length}</h3>${rangee(cmp.matches, '')}` : ''}
      ${cmp?.pourMoi?.length ? `<h3>${icn('tres')} Ses coups de cœur, pas encore vus par toi</h3>${rangee(cmp.pourMoi, '')}` : ''}
      ${cmp?.adores?.length ? `<h3>${icn('coupe')} Adorés tous les deux</h3>${rangee(cmp.adores, '')}` : ''}
      ${avis.filter(a => a.at).length ? `<h3>Ses derniers avis</h3><ul class="fil-l pf-fil">${avis.filter(a => a.at).slice(0, 8).map(x => `<li class="fil-i"><button type="button" class="fil-aff" data-film="${esc(x.k)}">${x.poster ? `<img src="${esc(x.poster)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="nop">${icn('film')}</span>`}</button><div class="fil-c"><p>${avisMot2(x).replace(/^a /, moi ? 'Tu as ' : 'A ').replace(/^n’est/, moi ? 'Tu n’es' : 'N’est')}</p><small>${esc(ago(x.at))}</small></div></li>`).join('')}</ul>` : '<p class="a-vide">Pas encore d’avis.</p>'}
      <div class="a-filtres pf-chips">${Object.entries(grilles).map(([k, [lb, l]]) => `<button type="button" data-pf="${k}" aria-pressed="${k === F}">${lb} · ${l.length}</button>`).join('')}</div>
      ${sel.length ? `<div class="a-grille">${sel.slice(0, 120).map(a => `<button class="a-mini" data-film="${esc(a.k)}">${poster(a, 'a-mini-img')}<span></span>${a.note ? `<small>${note(a.note)}/5</small>` : ''}</button>`).join('')}</div>` : '<p class="a-vide">Rien ici pour l’instant.</p>'}
      <div class="a-note-btns"><button class="s-btn ghost" data-fermer>Fermer</button></div>`;
    box.querySelector('.a-note-t').textContent = moi ? `${r.nom} (toi)` : r.nom;
    box.querySelectorAll('.a-grille .a-mini').forEach((x, i) => { x.querySelector('span:not(.a-mini-img)').textContent = sel[i].title; });
    box.querySelectorAll('.pf-fil .fil-c i').forEach((x, i) => { x.textContent = avis.filter(a => a.at)[i].title; });
    box.querySelectorAll('[data-teinte]').forEach(x => { x.style.setProperty('--c', x.dataset.teinte); });
  };
  draw();
  box.addEventListener('click', e => { const f = e.target.closest('[data-pf]'); if (f) { F = f.dataset.pf; haptic('light'); draw(); } const fm = e.target.closest('[data-film]'); if (fm) { const x = matchs.films?.get(fm.dataset.film) || MES.get(fm.dataset.film); if (x) { box.remove(); fichePop(x); } } });
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

// l'haptique au toucher : un interrupteur natif posé sur chaque bouton, à chaque nouveau rendu
new MutationObserver(() => armerHaptique(document)).observe(document.body, { childList: true, subtree: true });
document.addEventListener('click', e => {
  // un interrupteur haptique dans un bouton « envoyer » : il faut soumettre le formulaire à sa place
  if (e.target.matches?.('input.hap')) { const host = e.target.parentElement; if (host?.tagName === 'BUTTON' && host.type === 'submit' && host.form) { e.preventDefault(); host.form.requestSubmit(host); } }
}, true);
$.addEventListener('click', async e => {
  const t = e.target.closest('[data-t]'); if (t) { haptic('light'); onglet = t.dataset.t; store.set('ami-onglet', onglet); dessiner(); return; }
  const v = e.target.closest('.s-btns [data-v]'); if (v) { glisser(v.dataset.v); return; }
  const fl = e.target.closest('[data-f]'); if (fl) { filtre = fl.dataset.f; mes(); return; }
  if (e.target.closest('[data-nom]')) { moiPop(); return; }
  if (e.target.closest('[data-azami]')) { azamiPop(); return; }
  const li = e.target.closest('[data-lier]'); if (li) { lienAgir(li.dataset.lier, 'lier', li); return; }
  const de = e.target.closest('[data-delier]'); if (de) { if (de.hasAttribute('data-defaire') && !confirm('Défaire le lien ? Vous ne verrez plus vos films en commun.')) return; lienAgir(de.dataset.delier, 'delier', de); return; }
  if (e.target.closest('[data-hasard]')) { const l = CMP?.ensemble || []; if (!l.length) return; const f = l[Math.floor(Math.random() * l.length)]; toast(`À voir : ${f.title}${f.year ? ` (${f.year})` : ''}`); fichePop(f); return; }
  const pr = e.target.closest('[data-profil]'); if (pr) { haptic('light'); profilPop(pr.dataset.profil); return; }
  if (e.target.closest('[data-inviter]')) { invitePop(); return; }
  if (e.target.closest('[data-fil-plus]')) { matchs.plus = true; matchs(); return; }
  const fm = e.target.closest('[data-film]');
  if (fm) { const k = fm.dataset.film; const f = MES.get(k) || recherche.find(x => x.k === k) || matchs.films?.get(k); if (f) fichePop(f); }
});
document.addEventListener('keydown', e => { if (onglet !== 'cinder' || e.target.closest?.('input') || document.querySelector('.a-note')) return; const v = { ArrowRight: 'oui', ArrowLeft: 'non', ArrowUp: 'vu' }[e.key]; if (v) { e.preventDefault(); glisser(v); } });
addEventListener('hashchange', () => location.reload());
try { screen.orientation?.lock?.('portrait').catch(() => {}); } catch {}
charger();
