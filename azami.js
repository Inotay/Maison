// Azami en pied, une pose par page. Dessin vectoriel seal point, yeux bleus.
// Les parties (tête, yeux, museau) sont partagées ; le corps et l'accessoire changent.

const C = { seal: '#1C120C', seal2: '#3A2A20', creme: '#F3EBDF', ombre: '#DCCFBB', bleu: '#9CC4E4', bleuF: '#4E7FAE', nez: '#D98A7A', langue: '#E07A80', blanc: '#FFFFFF', fauve: '#B8A48F', bois: '#8E6A45' };

const DEFS = `<defs>
  <radialGradient id="mask" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${C.seal}"/><stop offset=".7" stop-color="${C.seal}"/><stop offset="1" stop-color="${C.seal}" stop-opacity="0"/></radialGradient>
  <radialGradient id="iris" cx="40%" cy="35%" r="65%"><stop offset="0" stop-color="#D9EBF8"/><stop offset=".5" stop-color="${C.bleu}"/><stop offset="1" stop-color="${C.bleuF}"/></radialGradient>
  <linearGradient id="point" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.creme}"/><stop offset="1" stop-color="${C.seal}"/></linearGradient>
</defs>`;

// Tête, repère local : centre du crâne en (0,0), largeur ~150. Oreilles orientables.
function head({ earL = 0, earR = 0, open = 1, lookX = 0, lookY = 0, happy = false, lid = 0, mouth = 'smile', brows = false } = {}) {
  const eye = (cx) => `
    <circle cx="${cx}" cy="4" r="17" fill="${C.creme}"/>
    <g style="transform:translate(${lookX}px,${lookY}px)">
      <circle cx="${cx}" cy="4" r="12.5" fill="url(#iris)"/><circle cx="${cx}" cy="4.5" r="6.5" fill="#120C08"/>
      <circle cx="${cx + 4}" cy="-1" r="3" fill="${C.blanc}"/><circle cx="${cx - 4}" cy="8" r="1.5" fill="${C.blanc}" opacity=".7"/>
    </g>
    ${happy ? `<circle cx="${cx}" cy="4" r="18" fill="${C.seal}"/><path d="M${cx - 13} 2 Q${cx} 16 ${cx + 13} 2" fill="none" stroke="${C.creme}" stroke-width="3" stroke-linecap="round"/>` : ''}
    <g style="transform-origin:${cx}px -14px;transform:scaleY(${happy ? 0 : lid})"><circle cx="${cx}" cy="4" r="18" fill="${C.seal}"/></g>
    ${happy ? '' : `<g class="blink" style="transform-origin:${cx}px -14px;transform:scaleY(0)"><circle cx="${cx}" cy="4" r="18" fill="${C.seal}"/></g>`}`;
  const mouths = {
    smile: `<path d="M0 31 Q0 37 -6 37 M0 31 Q0 37 6 37 M-11 37 Q0 46 11 37" fill="none" stroke="${C.creme}" stroke-width="2" stroke-linecap="round"/>`,
    hmm:   `<path d="M0 31 Q0 37 -6 37 M0 31 Q0 37 6 37 M-8 41 Q0 39 9 42" fill="none" stroke="${C.creme}" stroke-width="2" stroke-linecap="round"/>`,
    hungry:`<path d="M0 31 Q0 37 -6 37 M0 31 Q0 37 6 37" fill="none" stroke="${C.creme}" stroke-width="2" stroke-linecap="round"/><path d="M1 38 Q6 48 0 49 Q-5 49 -4 41" fill="${C.langue}" stroke="${C.creme}" stroke-width="1"/>`,
    yawn:  `<ellipse cx="0" cy="40" rx="8" ry="9" fill="${C.seal2}" stroke="${C.creme}" stroke-width="1.6"/><path d="M-4 45 Q0 50 4 45 Z" fill="${C.langue}"/>`,
    meow:  `<path d="M0 31 Q0 36 -5 36 M0 31 Q0 36 5 36" fill="none" stroke="${C.creme}" stroke-width="2" stroke-linecap="round"/><ellipse cx="0" cy="42" rx="6" ry="5.5" fill="${C.seal2}" stroke="${C.creme}" stroke-width="1.6"/>`,
  };
  return `<g class="head">
    <g class="ear" style="transform-origin:-36px -22px;--r:${earL}deg;transform:rotate(${earL}deg)"><path d="M-62 -10 C-70 -34 -70 -58 -64 -78 C-48 -64 -32 -52 -18 -36 Z" fill="${C.seal}"/><path d="M-54 -16 C-58 -34 -58 -50 -56 -64 C-46 -54 -36 -44 -28 -34 Z" fill="${C.seal2}"/></g>
    <g class="ear" style="transform-origin:36px -22px;--r:${earR}deg;transform:rotate(${earR}deg)"><path d="M62 -10 C70 -34 70 -58 64 -78 C48 -64 32 -52 18 -36 Z" fill="${C.seal}"/><path d="M54 -16 C58 -34 58 -50 56 -64 C46 -54 36 -44 28 -34 Z" fill="${C.seal2}"/></g>
    <path d="M0 -56 C30 -56 54 -40 62 -16 C68 6 62 30 48 46 C36 58 18 64 0 64 C-18 64 -36 58 -48 46 C-62 30 -68 6 -62 -16 C-54 -40 -30 -56 0 -56 Z" fill="${C.creme}"/>
    <path d="M-48 46 C-52 52 -56 56 -60 62 M48 46 C52 52 56 56 60 62 M-26 62 C-28 68 -29 72 -29 76 M26 62 C28 68 29 72 29 76" stroke="${C.creme}" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="0" cy="12" rx="52" ry="46" fill="url(#mask)"/>
    <path d="M0 -50 C10 -50 18 -42 20 -32 C12 -36 6 -37 0 -37 C-6 -37 -12 -36 -20 -32 C-18 -42 -10 -50 0 -50 Z" fill="${C.seal}" opacity=".9"/>
    ${brows ? `<path d="M-42 -20 L-16 -10 M42 -20 L16 -10" stroke="${C.seal}" stroke-width="3.5" stroke-linecap="round"/>` : ''}
    ${eye(-23)}${eye(23)}
    <path d="M-6 25 L6 25 L0 31 Z" fill="${C.nez}"/><path d="M-6 25 Q0 21 6 25" fill="none" stroke="${C.nez}" stroke-width="2" stroke-linecap="round"/>
    ${mouths[mouth] || mouths.smile}
    <g stroke="${C.creme}" stroke-width="1.4" stroke-linecap="round" opacity=".85" fill="none"><path d="M-18 28 C-34 24 -48 24 -64 26 M-18 34 C-34 34 -48 38 -64 44 M-16 40 C-32 44 -44 50 -56 58 M18 28 C34 24 48 24 64 26 M18 34 C34 34 48 38 64 44 M16 40 C32 44 44 50 56 58"/></g>
  </g>`;
}

// Corps assis de face : poitrail crème, pattes avant seal, queue seal.
function sitBody({ tail = 'left' } = {}) {
  const t = tail === 'left'
    ? `<path d="M-58 150 C-100 150 -120 120 -112 92 C-108 78 -96 72 -88 78" fill="none" stroke="${C.seal}" stroke-width="16" stroke-linecap="round"/>`
    : `<path d="M58 150 C100 150 120 120 112 92 C108 78 96 72 88 78" fill="none" stroke="${C.seal}" stroke-width="16" stroke-linecap="round"/>`;
  return `<g class="body">
    ${t}
    <path d="M0 40 C44 40 76 70 78 112 C80 134 70 152 56 158 L-56 158 C-70 152 -80 134 -78 112 C-76 70 -44 40 0 40 Z" fill="${C.creme}"/>
    <path d="M-70 128 C-70 140 -64 152 -56 158 L-28 158 C-30 146 -36 134 -46 126 Z M70 128 C70 140 64 152 56 158 L28 158 C30 146 36 134 46 126 Z" fill="${C.ombre}"/>
    <path d="M-40 100 C-40 130 -40 150 -38 158 L-18 158 C-16 146 -18 128 -22 104 Z" fill="url(#point)"/>
    <path d="M40 100 C40 130 40 150 38 158 L18 158 C16 146 18 128 22 104 Z" fill="url(#point)"/>
    <ellipse cx="-29" cy="158" rx="13" ry="7" fill="${C.seal}"/><ellipse cx="29" cy="158" rx="13" ry="7" fill="${C.seal}"/>
    <g fill="${C.seal2}"><circle cx="-36" cy="157" r="2"/><circle cx="-29" cy="155" r="2"/><circle cx="-22" cy="157" r="2"/><circle cx="22" cy="157" r="2"/><circle cx="29" cy="155" r="2"/><circle cx="36" cy="157" r="2"/></g>
  </g>`;
}

const svg = (inner, vb = '-150 -90 300 270') => `<svg class="azami" viewBox="${vb}" aria-hidden="true">${DEFS}${inner}</svg>`;

export const AZAMI = {
  // Accueil : assise bien droite, queue enroulée, contente de vous voir.
  maison: () => svg(sitBody({ tail: 'left' }) + head({ mouth: 'smile', lookX: 0, lookY: 0 })),

  // Ménage : debout sur ses pattes arrière, balai dans les pattes, sourcils froncés.
  menage: () => svg(`
    <g class="body">
      <path d="M46 170 C70 170 86 140 82 100 C78 70 48 56 24 62 L-24 62 C-48 56 -78 70 -82 100 C-86 140 -70 170 -46 170 Z" fill="${C.creme}"/>
      <path d="M-30 110 C-32 140 -30 160 -26 170 L-6 170 C-4 150 -8 126 -14 108 Z M30 110 C32 140 30 160 26 170 L6 170 C4 150 8 126 14 108 Z" fill="url(#point)"/>
      <ellipse cx="-18" cy="170" rx="14" ry="7" fill="${C.seal}"/><ellipse cx="18" cy="170" rx="14" ry="7" fill="${C.seal}"/>
      <path d="M-70 168 C-110 160 -124 130 -112 104" fill="none" stroke="${C.seal}" stroke-width="14" stroke-linecap="round"/>
      <g class="broom" style="transform-origin:62px 84px"><path d="M62 -60 L62 150" stroke="${C.bois}" stroke-width="6" stroke-linecap="round"/><path d="M44 148 L80 148 L90 178 L34 178 Z" fill="${C.fauve}"/><g stroke="${C.seal2}" stroke-width="1.6"><path d="M44 156 L40 176 M52 150 L50 178 M62 150 L62 178 M72 150 L74 178 M80 156 L84 176"/></g><rect x="52" y="140" width="20" height="9" rx="2" fill="${C.seal2}"/></g>
      <path d="M-44 80 C-62 90 -66 106 -56 120" fill="none" stroke="${C.creme}" stroke-width="15" stroke-linecap="round"/><ellipse cx="-56" cy="122" rx="9" ry="8" fill="${C.seal}"/>
      <path d="M44 76 C56 80 62 86 62 96" fill="none" stroke="${C.creme}" stroke-width="15" stroke-linecap="round"/><ellipse cx="62" cy="100" rx="9" ry="8" fill="${C.seal}"/>
    </g>
    ${head({ earL: -10, earR: 10, lid: .25, lookX: 2, mouth: 'hmm', brows: true })}`),

  // Courses : assise dans un cabas en osier, une sardine dans la patte, la langue sortie.
  courses: () => svg(`
    <path d="M-100 90 L100 90 L88 176 L-88 176 Z" fill="${C.fauve}"/>
    <g stroke="${C.seal2}" stroke-width="1.5" opacity=".6"><path d="M-96 108 L96 108 M-94 126 L94 126 M-92 144 L92 144 M-90 162 L90 162"/><path d="M-70 90 L-64 176 M-40 90 L-36 176 M-10 90 L-8 176 M20 90 L18 176 M50 90 L46 176 M80 90 L74 176"/></g>
    <path d="M-60 90 C-60 50 60 50 60 90" fill="none" stroke="${C.bois}" stroke-width="7" stroke-linecap="round"/>
    <g style="transform:translate(0,-10px) scale(.92)">
      ${sitBody({ tail: 'right' })}
    </g>
    <g class="fish" style="transform-origin:90px 80px"><path d="M66 80 C80 64 102 64 116 80 C102 96 80 96 66 80 Z" fill="${C.bleu}"/><path d="M116 80 L132 70 L126 80 L132 90 Z" fill="${C.bleu}"/><circle cx="78" cy="77" r="2.5" fill="${C.seal}"/><path d="M96 72 C104 80 104 84 98 90" fill="none" stroke="${C.bleuF}" stroke-width="1.5"/></g>
    <path d="M-100 90 L100 90 L96 118 L-96 118 Z" fill="${C.fauve}"/>
    <path d="M-96 108 L96 108" stroke="${C.seal2}" stroke-width="1.5" opacity=".6"/>
    ${head({ earL: 4, earR: -4, happy: true, mouth: 'hungry' })}`),

  // Argent : à sa petite table, lunettes, piles de pièces, une pièce entre les coussinets.
  argent: () => svg(`
    ${sitBody({ tail: 'left' })}
    <rect x="-120" y="118" width="240" height="12" rx="3" fill="${C.bois}"/><rect x="-108" y="130" width="10" height="46" fill="${C.bois}"/><rect x="98" y="130" width="10" height="46" fill="${C.bois}"/>
    <g class="coins"><g fill="#E6C25A" stroke="#B8923A" stroke-width="2"><rect x="-100" y="106" width="36" height="7" rx="3"/><rect x="-100" y="98" width="36" height="7" rx="3"/><rect x="-100" y="90" width="36" height="7" rx="3"/><rect x="-100" y="82" width="36" height="7" rx="3"/><rect x="60" y="106" width="36" height="7" rx="3"/><rect x="60" y="98" width="36" height="7" rx="3"/><rect x="66" y="90" width="24" height="7" rx="3"/></g>
    <g class="coin" style="transform-origin:0px 100px"><circle cx="0" cy="100" r="17" fill="#E6C25A" stroke="#B8923A" stroke-width="2.5"/><text x="0" y="106" text-anchor="middle" font-family="Hanken Grotesk, sans-serif" font-size="15" font-weight="800" fill="#8A6A20">1</text></g></g>
    <path d="M-34 96 C-30 106 -22 112 -12 112 M34 96 C30 106 22 112 12 112" fill="none" stroke="${C.seal}" stroke-width="14" stroke-linecap="round"/>
    ${head({ lookY: 7, lid: .18, mouth: 'hmm' })}
    <g fill="none" stroke="${C.fauve}" stroke-width="2.5"><circle cx="-23" cy="4" r="21"/><circle cx="23" cy="4" r="21"/><path d="M-2 4 L2 4 M-44 2 L-60 -6 M44 2 L60 -6"/></g>`),

  // Nuit : roulée en boule, queue sur le nez, petit ronflement.
  nuit: () => svg(`
    <ellipse cx="0" cy="120" rx="118" ry="58" fill="${C.creme}"/>
    <path d="M-60 150 C-40 174 20 176 60 160" fill="none" stroke="${C.ombre}" stroke-width="10" stroke-linecap="round"/>
    <path d="M110 120 C130 100 110 70 70 80 C40 88 20 100 0 106" fill="none" stroke="${C.seal}" stroke-width="16" stroke-linecap="round"/>
    <ellipse cx="-78" cy="158" rx="16" ry="8" fill="${C.seal}"/><ellipse cx="-50" cy="164" rx="16" ry="8" fill="${C.seal}"/>
    <g style="transform:translate(-30px,88px) rotate(-12deg) scale(.9)">${head({ earL: 10, earR: -6, lid: .9, lookY: 4, mouth: 'smile' })}</g>
    <path class="zz" d="M70 10 L88 10 L70 28 L88 28" fill="none" stroke="${C.bleu}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="zz z2" d="M96 -18 L108 -18 L96 -6 L108 -6" fill="none" stroke="${C.bleu}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`),

  // Miaulement : debout, bouche ouverte, utilisée un instant quand Azami miaule.
  meow: () => svg(sitBody({ tail: 'right' }) + head({ earL: -4, earR: 4, happy: true, mouth: 'meow' })),

  // Icône : tête seule, cadrée serré.
  icon: () => svg(head({ mouth: 'smile' }), '-85 -95 170 170'),
};
