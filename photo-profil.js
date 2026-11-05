// La photo de profil : on choisit une image sur son téléphone, elle est recadrée au carré (le centre), réduite
// à 256 px et réenregistrée en JPEG (quelques dizaines de Ko), puis rendue en data URL. Rien ne part ailleurs.
// Sans photo : une silhouette de chat, la même pour tout le monde, dans les bleus de l'app.
export const CHAT = '<svg class="av-chat" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 41c-12.5 0-22 7.5-22 23h44c0-15.5-9.5-23-22-23z"/><path d="M19.6 30.2c0-2 .4-3.9 1.1-5.6L19.4 9.8l10.1 7.4a14 14 0 0 1 5 0l10.1-7.4-1.3 14.8c.7 1.7 1.1 3.6 1.1 5.6 0 8.2-5.6 13.8-12.4 13.8S19.6 38.4 19.6 30.2z"/></svg>';
const MAX = 70000;
export function choisirPhoto() {
  return new Promise(resolve => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.addEventListener('change', async () => {
      const f = inp.files?.[0]; if (!f) return resolve(null);
      try { resolve(await recadrer(f)); } catch (e) { console.warn('photo', e); resolve(undefined); }
    });
    inp.click();
  });
}
async function recadrer(f) {
  const url = URL.createObjectURL(f);
  try {
    const img = new Image(); img.decoding = 'async'; img.src = url; await img.decode();
    const c = Math.min(img.naturalWidth, img.naturalHeight); if (!c) throw new Error('image vide');
    const can = document.createElement('canvas'); can.width = can.height = 256;
    const g = can.getContext('2d'); g.imageSmoothingQuality = 'high';
    g.drawImage(img, (img.naturalWidth - c) / 2, (img.naturalHeight - c) / 2, c, c, 0, 0, 256, 256);
    for (const q of [.85, .75, .62, .5]) { const d = can.toDataURL('image/jpeg', q); if (d.length <= MAX) return d; }
    throw new Error('trop lourde');
  } finally { URL.revokeObjectURL(url); }
}
