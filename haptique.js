// Retour haptique, pour la page des amis (même recette que fx.js dans Maison). Android : vibration.
// iPhone : Safari n'a pas l'API vibration, mais un interrupteur natif (<input type="checkbox" switch>)
// déclenche le moteur haptique quand on le bascule dans un geste de l'utilisateur ; on en cache un et on le bascule.
let sw = null;
function interrupteur() {
  if (!sw) {
    const lab = document.createElement('label'); lab.className = 'hap-lab'; lab.setAttribute('aria-hidden', 'true');
    const inp = document.createElement('input'); inp.type = 'checkbox'; inp.setAttribute('switch', ''); inp.tabIndex = -1;
    lab.appendChild(inp); document.body.appendChild(lab); sw = inp;
  }
  return sw;
}
export function haptic(level = 'light') {
  const pattern = { light: [10], medium: [18, 40, 18], heavy: [30, 50, 30, 50, 60] }[level] || [10];
  try { if (navigator.vibrate && navigator.vibrate(pattern)) return; } catch {}
  try { const s = interrupteur(), n = { light: 1, medium: 2, heavy: 3 }[level] || 1; s.click(); for (let i = 1; i < n; i++) setTimeout(() => s.click(), i * 90); } catch {}
}
// Haptique au toucher réel (iOS 17.4 à 26.4) : un interrupteur transparent posé sur le bouton reçoit le doigt
// lui-même, iOS joue sa vibration, et le clic remonte au bouton comme d'habitude.
export function armer(root = document, sel = '.s-btn, .s-btns button, .s-tabs button, .a-filtres button, .a-choix button, .a-li, .ami-mini, .a-mini, .a-qui, .a-scene') {
  root.querySelectorAll(sel).forEach(el => {
    if (el.querySelector(':scope > input.hap')) return;
    const t = document.createElement('input'); t.type = 'checkbox'; t.setAttribute('switch', ''); t.className = 'hap'; t.tabIndex = -1; t.setAttribute('aria-hidden', 'true');
    el.appendChild(t);
  });
}
