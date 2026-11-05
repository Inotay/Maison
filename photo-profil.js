// La photo de profil : on choisit une image sur son téléphone, elle est recadrée au carré (le centre), réduite
// à 256 px et réenregistrée en JPEG (quelques dizaines de Ko), puis rendue en data URL. Rien ne part ailleurs.
// Sans photo : l'ombre d'Azami, la même pour tout le monde, dans les couleurs de l'app.
export const CHAT = '<i class="av-ombre" aria-hidden="true"></i>';   // l'ombre d'Azami assise (masque CSS sur son dessin)
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
