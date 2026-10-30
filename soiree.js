// Soirée ciné : la page des invités. Pas de compte, pas d'accès à la maison : seulement la sélection de films
// de la soirée, Cinder pour voter, et le classement de tout le monde. Le lien secret est dans l'adresse
// (après le #, jamais envoyé au serveur de la page) ; il n'est transmis qu'à la fonction « soiree ».
// Tout ce qui vient des autres (prénoms, titres) est écrit comme du texte, jamais comme du HTML.
const URL_FN = (window.MAISON_CONFIG?.supabaseUrl || '') + '/functions/v1/soiree';
const $ = document.getElementById('s');
const jeton = (location.hash.match(/^#([A-Za-z0-9_-]{43})/) || [])[1] || '';
const nomHote = (() => { const m = location.hash.match(/[#&]n=([^&]+)/); if (!m) return ''; try { return decodeURIComponent(m[1]).slice(0, 24); } catch { return ''; } })();
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
let invite = store.get('soiree-invite');
if (!/^[a-f0-9]{32}$/.test(invite || '')) { invite = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join(''); store.set('soiree-invite', invite); }
let nom = store.get('soiree-nom') || nomHote;
let D = null, onglet = 'cinder', i = 0, ordre = [], poll = null, enCours = false;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const IC = {
  flamme: '<path d="M12 21.2c-3.9 0-6.6-2.7-6.6-6.3 0-3.5 2.5-5.3 3.7-8.2.8 1.6 1.7 2.4 2.6 2.7.1-3 1.3-5.1 3.2-6.6-.3 2.7.9 4.5 2.3 6.3 1.1 1.4 1.7 3 1.7 5 0 4-2.7 7.1-6.9 7.1z"/><path d="M12 21.2c-1.7 0-2.9-1.1-2.9-2.7 0-1.7 1.4-2.5 2.1-4 1.4 1.1 3.6 2.4 3.6 4.2 0 1.5-1.2 2.5-2.8 2.5z" fill="currentColor" stroke="none"/>',
  bof: '<path d="M4.6 10.2 5 4.2l4.3 3.1h5.4L19 4.2l.4 6c.7 1 1.1 2.2 1.1 3.5 0 3.9-3.8 6.8-8.5 6.8s-8.5-2.9-8.5-6.8c0-1.3.4-2.5 1.1-3.5z"/><path d="M8.3 12.6h2.2M13.5 12.6h2.2M10.6 16.2h2.8"/>',
  vu: '<path d="M2.6 12S6 5.8 12 5.8 21.4 12 21.4 12 18 18.2 12 18.2 2.6 12 2.6 12z"/><circle cx="12" cy="12" r="3.1" fill="currentColor" stroke="none"/>',
  tres: '<path d="M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.6l-5.1 2.7 1-5.7-4.1-4 5.7-.8z" fill="currentColor"/>',
  envie: '<path d="M12 20.2s-7.8-4.7-7.8-10.3A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.8 2.5c0 5.6-7.8 10.3-7.8 10.3z" fill="currentColor"/>',
  film: '<rect x="3.6" y="4.6" width="16.8" height="14.8" rx="2.8"/><path d="M7.8 4.6v14.8M16.2 4.6v14.8M3.6 9.6h4.2M3.6 14.4h4.2M16.2 9.6h4.2M16.2 14.4h4.2"/>',
  coupe: '<path d="M8 4h8v5.2a4 4 0 0 1-8 0z"/><path d="M8 6H5.2v1.2A2.8 2.8 0 0 0 8 10M16 6h2.8v1.2A2.8 2.8 0 0 1 16 10M12 13.2V17M8.6 20.2h6.8M9.8 17h4.4"/>',
};
const icn = n => `<svg class="icn" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[n]}</svg>`;
const poster = (f, cls) => f.poster ? `<img class="${cls}" src="${esc(f.poster)}" alt="" decoding="async" referrerpolicy="no-referrer">` : `<span class="${cls} nop">${icn('film')}</span>`;
const dur = m => m ? `${Math.floor(m / 60) ? Math.floor(m / 60) + ' h ' : ''}${String(m % 60).padStart(Math.floor(m / 60) ? 2 : 1, '0')}${Math.floor(m / 60) ? '' : ' min'}` : '';
const hotes = () => (D?.hotes || []).join(' et ') || 'vos hôtes';

async function call(body) {
  const r = await fetch(URL_FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, jeton, invite }), referrerPolicy: 'no-referrer', cache: 'no-store' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || 'Erreur'); e.fini = j.fini || r.status === 410 || r.status === 404; throw e; }
  return j;
}
function fin(msg) {
  clearInterval(poll);
  $.innerHTML = `<section class="s-fin">${icn('film')}<h1>Soirée ciné</h1><p></p></section>`;
  $.querySelector('p').textContent = msg;
}
async function charger() {
  if (!jeton) return fin('Ce lien n’est pas complet. Demande à tes hôtes de te le renvoyer.');
  try { D = await call({ action: 'voir' }); } catch (e) { return fin(e.fini ? 'Ce lien n’est plus valable : la soirée est terminée, ou il a été coupé.' : 'Impossible de joindre la soirée pour le moment. Réessaie dans un instant.'); }
  if (D.moi && !nom) nom = D.moi;
  // l'ordre des cartes : la liste des hôtes d'abord, puis les propositions ; ce que j'ai déjà jugé passe à la fin
  ordre = D.films.map(f => f.k).sort((a, b) => (!!D.mes[a] - !!D.mes[b]));
  i = ordre.findIndex(k => !D.mes[k]); if (i < 0) i = ordre.length;
  dessiner();
  clearInterval(poll); poll = setInterval(rafraichir, 8000);
}
async function rafraichir() {
  if (document.hidden || enCours || !D) return;
  try { const n = await call({ action: 'voir' }); D = n; if (onglet === 'liste') dessiner(); else entete(); } catch (e) { if (e.fini) fin('La soirée est terminée. Merci d’avoir voté !'); }
}

function entete() {
  const h = $.querySelector('.s-gens'); if (!h) return;
  const n = D.gens.length; h.textContent = n ? `${n} ${n > 1 ? 'personnes ont' : 'personne a'} voté : ${D.gens.join(', ')}` : 'Personne n’a encore voté.';
}
function dessiner() {
  if (!nom) return accueil();
  const fini = new Date(D.expires_at);
  $.innerHTML = `<header class="s-top"><b class="s-logo">${icn('flamme')} Cinder</b><span class="s-qui"></span></header>
    <p class="s-sous">Soirée ciné chez <b class="s-hotes"></b> · jusqu’à ${esc(fini.toLocaleString('fr-CH', { weekday: 'long', hour: '2-digit', minute: '2-digit' }))}</p>
    <div class="s-tabs" role="tablist"><button role="tab" data-t="cinder" aria-selected="${onglet === 'cinder'}">Voter</button><button role="tab" data-t="liste" aria-selected="${onglet === 'liste'}">Le classement</button></div>
    <section class="s-body"></section><p class="s-gens"></p>`;
  $.querySelector('.s-qui').textContent = nom; $.querySelector('.s-hotes').textContent = hotes();
  entete();
  onglet === 'cinder' ? pile() : liste();
}
function accueil() {
  $.innerHTML = `<section class="s-hello"><b class="s-logo big">${icn('flamme')} Cinder</b>
    <h1>Soirée ciné</h1><p><b class="s-hotes"></b> t’invitent à choisir le film de ce soir avec eux.</p>
    <p class="s-small">Balaie les films : à droite si tu as envie, à gauche si bof. Le film qui plaît au plus de monde gagne.</p>
    <label class="s-lab" for="s-nom">Ton prénom</label><input id="s-nom" maxlength="24" autocomplete="given-name" enterkeyhint="go">
    <button class="s-btn" data-go>C’est parti</button></section>`;
  $.querySelector('.s-hotes').textContent = hotes();
  const inp = $.querySelector('#s-nom'); inp.value = nom;
  const go = () => { const v = inp.value.replace(/\s+/g, ' ').trim().slice(0, 24); if (!v) { inp.focus(); return; } nom = v; store.set('soiree-nom', v); dessiner(); };
  $.querySelector('[data-go]').addEventListener('click', go);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
}

// ── Voter : une pile de cartes, comme dans Cinder ──
function carte(f, cls) {
  const sub = [f.year, f.media === 'tv' ? 'Série' : dur(f.runtime), f.dir].filter(Boolean).join(' · ');
  return `<article class="c ${cls}" data-k="${esc(f.k)}">${poster(f, 'c-img')}<div class="c-info">${f.liste ? `<em class="c-tag">Dans leur liste</em>` : ''}<b>${esc(f.title)}</b><span>${esc(sub)}</span>${f.genres?.length ? `<span class="c-g">${esc(f.genres.join(' · '))}</span>` : ''}<p>${esc(f.overview)}</p></div>
    <span class="c-st oui">ENVIE</span><span class="c-st non">BOF</span><span class="c-st vu">DÉJÀ VU</span></article>`;
}
function pile() {
  const b = $.querySelector('.s-body'), film = k => D.films.find(f => f.k === k);
  const cur = film(ordre[i]), nxt = film(ordre[i + 1]);
  if (!cur) {
    b.innerHTML = `<div class="s-vide">${icn('coupe')}<p>Tu as voté pour tous les films !</p><button class="s-btn" data-t="liste">Voir le classement</button></div>`;
    return;
  }
  b.innerHTML = `<div class="s-stack">${nxt ? carte(nxt, 'next') : ''}${carte(cur, 'top')}</div>
    <div class="s-btns"><button class="b-non" data-v="non" aria-label="Bof">${icn('bof')}<small>Bof</small></button><button class="b-vu" data-v="vu" aria-label="Déjà vu">${icn('vu')}<small>Vu</small></button><button class="b-super" data-v="super" aria-label="Très envie">${icn('tres')}<small>Très</small></button><button class="b-oui" data-v="oui" aria-label="Envie">${icn('envie')}<small>Envie</small></button></div>
    <p class="s-aide">${i + 1} sur ${ordre.length} · → envie · ← bof · ↑ déjà vu · touche l’affiche pour lire</p>`;
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
    if (!vert && (Math.abs(dx) > 90 || (fast && Math.abs(dx) > 40))) return voter(dx > 0 ? 'oui' : 'non', { dx, dy });
    if (vert && dy < 0 && (Math.abs(dy) > 90 || (fast && Math.abs(dy) > 40))) return voter('vu', { dx, dy });
    el.style.transform = ''; el.classList.remove('l-oui', 'l-non', 'l-vu'); if (nx) nx.style.transform = '';
  };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}
async function voter(v, from) {
  const k = ordre[i], el = $.querySelector('.c.top'); if (!k) return;
  if (el) {
    const W = innerWidth + 260, x = from?.dx || 0, y = from?.dy || 0;
    el.style.transition = 'transform .32s cubic-bezier(.25,.6,.45,1), opacity .32s ease-in';
    el.style.transform = v === 'vu' || v === 'super' ? `translate3d(${x * .6}px, ${-innerHeight}px, 0)` : `translate3d(${v === 'oui' ? W : -W}px, ${y * 1.6 + 40}px, 0) rotate(${v === 'oui' ? 28 : -28}deg)`;
    el.style.opacity = '0'; el.style.pointerEvents = 'none';
  }
  try { navigator.vibrate?.(v === 'oui' || v === 'super' ? 12 : 6); } catch {}
  D.mes[k] = v; i++;
  setTimeout(() => { if (onglet === 'cinder') pile(); }, 200);
  envoyer(k, v);
}
async function envoyer(k, v) {
  enCours = true;
  try { D = { ...(await call({ action: 'voter', film: k, vote: v, nom })), mes: { ...D.mes, [k]: v } }; entete(); }
  catch (e) { if (e.fini) return fin('La soirée est terminée. Merci d’avoir voté !'); toast(e.message || 'Le vote n’est pas passé.'); }
  finally { enCours = false; }
}

// ── Le classement : ce qui plaît au plus de monde, et mes votes à changer ──
function liste() {
  const b = $.querySelector('.s-body');
  const films = [...D.films].sort((a, b2) => b2.score - a.score || b2.envies.length - a.envies.length);
  const top = films[0]?.envies.length ? films[0] : null;
  b.innerHTML = `${top ? `<div class="s-lead">${poster(top, 'l-img')}<div><small>En tête pour ce soir</small><b></b><span></span></div></div>` : '<p class="s-small">Pas encore de favori : votez dans l’onglet Voter.</p>'}
    <ul class="s-list">${films.map(f => `<li data-k="${esc(f.k)}">${poster(f, 'r-img')}<div class="r-t"><b>${esc(f.title)}</b><span class="r-who"></span></div>
      <div class="r-me" role="group" aria-label="Mon avis"><button data-v="oui" aria-pressed="${D.mes[f.k] === 'oui' || D.mes[f.k] === 'super'}" aria-label="Envie">${icn('envie')}</button><button data-v="non" aria-pressed="${D.mes[f.k] === 'non'}" aria-label="Bof">${icn('bof')}</button></div></li>`).join('')}</ul>`;
  if (top) { b.querySelector('.s-lead b').textContent = top.title; b.querySelector('.s-lead span').textContent = top.envies.map(e => e.nom + (e.super ? ' ★' : '')).join(', '); }
  b.querySelectorAll('.s-list li').forEach(li => { const f = D.films.find(x => x.k === li.dataset.k); li.querySelector('.r-who').textContent = f.envies.length ? `${f.envies.length} envie${f.envies.length > 1 ? 's' : ''} : ${f.envies.map(e => e.nom + (e.super ? ' ★' : '')).join(', ')}` : f.vu.length ? `Déjà vu par ${f.vu.join(', ')}` : 'Pas encore d’envie'; });
}

let toastT;
function toast(m) { let t = document.getElementById('s-toast'); if (!t) { t = document.createElement('div'); t.id = 's-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }

$.addEventListener('click', e => {
  const t = e.target.closest('[data-t]'); if (t) { onglet = t.dataset.t; dessiner(); if (onglet === 'liste') rafraichir(); return; }
  const v = e.target.closest('.s-btns [data-v]'); if (v) { voter(v.dataset.v); return; }
  const m = e.target.closest('.r-me [data-v]');
  if (m) { const k = m.closest('li').dataset.k, cur = D.mes[k], nv = m.dataset.v === 'oui' ? (cur === 'oui' || cur === 'super' ? 'rien' : 'oui') : (cur === 'non' ? 'rien' : 'non');
    if (nv === 'rien') delete D.mes[k]; else D.mes[k] = nv;
    m.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(D.mes[k] && (x.dataset.v === 'oui' ? D.mes[k] === 'oui' || D.mes[k] === 'super' : D.mes[k] === 'non'))));
    envoyer(k, nv).then(() => onglet === 'liste' && liste()); }
});
document.addEventListener('keydown', e => { if (onglet !== 'cinder' || !nom || e.target.closest?.('input')) return; const v = { ArrowRight: 'oui', ArrowLeft: 'non', ArrowUp: 'vu' }[e.key]; if (v) { e.preventDefault(); voter(v); } });
document.addEventListener('visibilitychange', () => { if (!document.hidden) rafraichir(); });
addEventListener('hashchange', () => location.reload());
charger();
