// Azami, mascotte siamoise kawaii Bauhaus. Base fournie par Yatoni, déclinée en une pose par page.
// Formes simples, aplats, aucun effet raster. Les animations sont dans styles.css (.azami …).

const K = {
  choc: '#3A2627', creme: '#F5D8AE', cremeClair: '#F8E4C7', cremeCorps: '#EECFA5',
  blancOeil: '#FCF4E8', iris: '#7CD2F0', pupille: '#172D40', museau: '#5C3633',
  nez: '#E6A5A1', bouche: '#F4B5AE', moustache: '#F9E9D5', oreille: '#C77F79',
  jaune: '#F5BD36', bleu: '#3677A8', rouge: '#D95743', bois: '#B8864E', osier: '#D9B27A', piece: '#F5BD36', pieceBord: '#C7901E',
};

// Formes Bauhaus derrière Azami, en option.
function fond({ circle = K.jaune, dot = K.bleu, square = K.rouge } = {}) {
  return `<g class="fond">
    ${circle ? `<circle cx="405" cy="344" r="233" fill="${circle}"/>` : ''}
    ${dot ? `<circle cx="663" cy="206" r="51" fill="${dot}"/>` : ''}
    ${square ? `<rect x="132" y="587" width="123" height="110" fill="${square}"/>` : ''}
    <path d="M154 203 V461" fill="none" stroke="${K.choc}" stroke-width="8"/>
  </g>`;
}

const queue = (cls = '') => `<g class="queue ${cls}"><path d="M519 579 C596 531 658 550 650 617 C648 645 626 664 600 660" fill="none" stroke="${K.choc}" stroke-width="43" stroke-linecap="round"/></g>`;

const corps = () => `<g class="corps">
  <ellipse cx="410" cy="574" rx="137" ry="141" fill="${K.cremeCorps}"/>
  <ellipse cx="410" cy="581" rx="73" ry="102" fill="${K.cremeClair}"/>
  <rect x="332" y="609" width="58" height="78" rx="29" fill="${K.choc}"/>
  <rect x="430" y="609" width="58" height="78" rx="29" fill="${K.choc}"/>
  <ellipse cx="359" cy="680" rx="43" ry="24" fill="${K.choc}"/>
  <ellipse cx="460" cy="680" rx="43" ry="24" fill="${K.choc}"/>
</g>`;

// Yeux : look décale la pupille, lid 0..1 ferme la paupière, happy = œil fermé en arc de sourire.
function oeil(cx, { look = [0, 0], lid = 0, happy = false, brow = 0 } = {}) {
  const [lx, ly] = look;
  return `<g class="oeil" style="transform-origin:${cx}px 347px">
    <circle cx="${cx}" cy="347" r="45" fill="${K.blancOeil}"/>
    <g style="transform:translate(${lx}px,${ly}px)">
      <circle cx="${cx + 4}" cy="349" r="39" fill="${K.iris}"/>
      <circle cx="${cx + 14}" cy="349" r="23" fill="${K.pupille}"/>
      <circle cx="${cx + 16}" cy="335" r="11" fill="#FFFFFF"/>
      <circle cx="${cx - 5}" cy="363" r="5" fill="#FFFFFF"/>
    </g>
    ${happy ? `<circle cx="${cx}" cy="347" r="47" fill="${K.choc}"/><path d="M${cx - 30} 352 Q${cx} 386 ${cx + 30} 352" fill="none" stroke="${K.blancOeil}" stroke-width="9" stroke-linecap="round"/>` : ''}
    ${lid ? `<g style="transform-origin:${cx}px 300px;transform:scaleY(${lid})"><circle cx="${cx}" cy="347" r="47" fill="${K.choc}"/></g>` : ''}
    ${brow ? `<path d="M${cx - 44} ${300 - brow * 8} L${cx + 40} ${300 + brow * 12}" stroke="${K.choc}" stroke-width="14" stroke-linecap="round" transform="${brow < 0 ? `scale(-1 1) translate(${-2 * cx} 0)` : ''}"/>` : ''}
    ${happy ? '' : `<g class="paupiere" style="transform-origin:${cx}px 300px;transform:scaleY(0)"><circle cx="${cx}" cy="347" r="47" fill="${K.choc}"/></g>`}
  </g>`;
}

function bouche(kind = 'smile') {
  const m = {
    smile: `<path d="M407 417 V425 M407 425 Q396 438 385 426 M407 425 Q418 438 429 426" fill="none" stroke="${K.bouche}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    hmm:   `<path d="M407 417 V425 M392 432 Q407 428 424 434" fill="none" stroke="${K.bouche}" stroke-width="4.5" stroke-linecap="round"/>`,
    tongue:`<path d="M407 417 V425 M407 425 Q396 438 385 426 M407 425 Q418 438 429 426" fill="none" stroke="${K.bouche}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M398 432 Q407 456 418 432 Z" fill="${K.nez}"/>`,
    open:  `<ellipse cx="407" cy="436" rx="14" ry="17" fill="${K.museau}" stroke="${K.bouche}" stroke-width="4"/><path d="M398 444 Q407 456 416 444 Z" fill="${K.nez}"/>`,
    yawn:  `<ellipse cx="407" cy="438" rx="18" ry="22" fill="${K.museau}" stroke="${K.bouche}" stroke-width="4"/><path d="M396 448 Q407 462 418 448 Z" fill="${K.nez}"/>`,
    small: `<path d="M407 417 V424 M400 428 Q407 432 414 428" fill="none" stroke="${K.bouche}" stroke-width="4.5" stroke-linecap="round"/>`,
  };
  return m[kind] || m.smile;
}

function tete({ tilt = -5, look, lid, happy, brows = 0, mouth = 'smile', extra = '' } = {}) {
  return `<g class="tete-mobile"><g transform="rotate(${tilt} 406 363)">
    <path d="M274 282 L245 143 Q242 125 262 135 L356 220 Z" fill="${K.choc}"/>
    <path d="M449 222 L552 132 Q571 122 572 143 L548 288 Z" fill="${K.choc}"/>
    <path d="M277 253 L266 173 L324 231 Z" fill="${K.oreille}"/>
    <path d="M485 234 L549 172 L534 258 Z" fill="${K.oreille}"/>
    <ellipse cx="405" cy="350" rx="183" ry="171" fill="${K.creme}"/>
    <path d="M270 327 C271 270 327 256 403 261 C481 252 536 276 539 327 C547 408 492 466 408 467 C313 470 264 417 270 327 Z" fill="${K.choc}"/>
    ${oeil(341, { look, lid, happy, brow: brows })}
    ${oeil(467, { look, lid, happy, brow: -brows })}
    <ellipse cx="380" cy="416" rx="36" ry="22" fill="${K.museau}"/>
    <ellipse cx="434" cy="416" rx="36" ry="22" fill="${K.museau}"/>
    <path d="M392 405 Q406 398 420 405 L407 417 Z" fill="${K.nez}"/>
    ${bouche(mouth)}
    <path d="M316 418 L264 405 M317 429 L266 435 M498 418 L550 405 M498 429 L548 435" fill="none" stroke="${K.moustache}" stroke-width="4.5" stroke-linecap="round"/>
    ${extra}
  </g></g>`;
}

const svg = (inner, vb = '110 100 580 620') => `<svg class="azami" viewBox="${vb}" aria-hidden="true">${inner}</svg>`;

export const AZAMI = {
  // Accueil : la base, telle quelle. Queue qui remue, tête qui s'incline, clignements.
  maison: () => svg(fond() + queue() + corps() + tete()),

  // Ménage : balai dans la patte, sourcils froncés, bouche décidée.
  menage: () => svg(
    fond({ circle: K.jaune }) + queue() + corps()
    + `<g class="balai" style="transform-origin:560px 560px"><path d="M560 300 V640" stroke="${K.bois}" stroke-width="16" stroke-linecap="round"/><path d="M520 630 L600 630 L620 720 L500 720 Z" fill="${K.osier}"/><path d="M522 650 L512 716 M540 636 L536 718 M560 634 L560 718 M580 636 L584 718 M598 650 L608 716" stroke="${K.bois}" stroke-width="4"/><rect x="536" y="612" width="48" height="22" rx="6" fill="${K.choc}"/></g>
       <rect x="500" y="520" width="58" height="78" rx="29" fill="${K.choc}" transform="rotate(-40 529 559)"/>`
    + tete({ tilt: 3, look: [6, -4], brows: 1, mouth: 'hmm' })
  ),

  // Courses : dans un cabas en osier, une sardine, la langue sortie, yeux ravis.
  courses: () => svg(
    fond({ square: null }) + queue()
    + `<path d="M250 560 C250 500 570 500 570 560" fill="none" stroke="${K.bois}" stroke-width="18" stroke-linecap="round"/>`
    + corps()
    + `<path d="M232 600 L588 600 L566 740 L254 740 Z" fill="${K.osier}"/>
       <g stroke="${K.bois}" stroke-width="4" opacity=".8"><path d="M240 634 H580 M246 668 H574 M252 702 H568"/><path d="M300 600 L306 740 M380 600 L382 740 M460 600 L458 740 M540 600 L534 740"/></g>
       <g class="poisson" style="transform-origin:590px 580px"><path d="M560 580 C590 548 640 548 670 580 C640 612 590 612 560 580 Z" fill="${K.bleu}"/><path d="M670 580 L706 556 L694 580 L706 604 Z" fill="${K.bleu}"/><circle cx="590" cy="574" r="6" fill="${K.choc}"/></g>`
    + tete({ tilt: -8, happy: true, mouth: 'tongue' })
  ),

  // Argent : lunettes rondes, pièces empilées, une pièce entre les pattes, regard vers le bas.
  argent: () => svg(
    fond({ circle: K.jaune, square: null }) + queue() + corps()
    + `<rect x="150" y="640" width="520" height="22" rx="6" fill="${K.bois}"/>
       <g fill="${K.piece}" stroke="${K.pieceBord}" stroke-width="4"><rect x="176" y="616" width="90" height="22" rx="11"/><rect x="180" y="594" width="90" height="22" rx="11"/><rect x="176" y="572" width="90" height="22" rx="11"/><rect x="560" y="616" width="90" height="22" rx="11"/><rect x="556" y="594" width="90" height="22" rx="11"/></g>
       <g class="piece" style="transform-origin:410px 600px"><circle cx="410" cy="600" r="42" fill="${K.piece}" stroke="${K.pieceBord}" stroke-width="5"/><text x="410" y="614" text-anchor="middle" font-family="Hanken Grotesk, Arial, sans-serif" font-size="40" font-weight="800" fill="${K.pieceBord}">1</text></g>
       <rect x="332" y="560" width="58" height="78" rx="29" fill="${K.choc}" transform="rotate(35 361 599)"/><rect x="430" y="560" width="58" height="78" rx="29" fill="${K.choc}" transform="rotate(-35 459 599)"/>`
    + tete({ tilt: -3, look: [0, 12], lid: .22, mouth: 'small', extra: `<g fill="none" stroke="${K.choc}" stroke-width="9"><circle cx="341" cy="347" r="56"/><circle cx="467" cy="347" r="56"/><path d="M397 347 H411 M285 340 L240 320 M523 340 L568 320"/></g>` })
  ),

  // Nuit : yeux fermés, bâillement, croissant de lune et petits Z.
  nuit: () => svg(
    fond({ circle: '#2E4C64', dot: K.jaune, square: null }) + queue() + corps()
    + tete({ tilt: 8, lid: .92, mouth: 'yawn' })
    + `<g class="zz"><path d="M600 300 H650 L600 350 H650" fill="none" stroke="${K.jaune}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></g><g class="zz z2"><path d="M650 220 H684 L650 254 H684" fill="none" stroke="${K.jaune}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></g>`
  ),

  // Miaulement : bouche grande ouverte, yeux fermés de plaisir.
  meow: () => svg(fond() + queue('vite') + corps() + tete({ tilt: -10, happy: true, mouth: 'open' })),

  // Icône : tête seule sur le cercle jaune.
  icon: () => svg(`<rect x="130" y="100" width="550" height="550" fill="#2A1C15"/><circle cx="405" cy="344" r="233" fill="${K.jaune}"/>` + tete({ tilt: -5 }), '130 100 550 550'),
};
