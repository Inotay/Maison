// Petits bruitages des scènes à accessoires (balai, casserole, pièces, sac, lettre), synthétisés en Web Audio.
// Tout passe par un « bus » : on peut programmer une scène entière d'avance, et tout couper d'un coup
// (bus.disconnect()) quand on change de page.
const rnd = (a, b) => a + Math.random() * (b - a);

function noiseBuf(c, dur, shape) {
  const len = Math.max(1, Math.floor(c.sampleRate * dur)), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * shape(i / len, i);
  return buf;
}
// Bruit filtré : type de filtre, fréquence (ou [début, fin]), Q, gain.
function hiss(c, out, at, dur, { type = 'bandpass', f = 2000, q = 1, vol = .2, shape = x => Math.sin(Math.PI * x) }) {
  const n = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
  n.buffer = noiseBuf(c, dur, shape); fl.type = type; fl.Q.value = q;
  if (Array.isArray(f)) { fl.frequency.setValueAtTime(f[0], at); fl.frequency.exponentialRampToValueAtTime(f[1], at + dur); } else fl.frequency.value = f;
  g.gain.value = vol; n.connect(fl); fl.connect(g); g.connect(out); n.start(at);
}
// Note brève : fréquence (ou [début, fin]), durée, volume, forme d'onde.
function tone(c, out, at, dur, { f = 440, vol = .1, type = 'sine', attack = .004 }) {
  const o = c.createOscillator(), g = c.createGain(); o.type = type;
  if (Array.isArray(f)) { o.frequency.setValueAtTime(f[0], at); o.frequency.exponentialRampToValueAtTime(f[1], at + dur); } else o.frequency.value = f;
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + attack); g.gain.exponentialRampToValueAtTime(.0006, at + dur);
  o.connect(g); g.connect(out); o.start(at); o.stop(at + dur + .02);
}
// Petit « ding » de pièce, doux : partiels inharmoniques, sans les très aigus, passés dans un filtre.
function metal(c, out, at, f, dur, vol) {
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4200; lp.Q.value = .5; lp.connect(out);
  [[1, 1], [2.76, .3], [5.4, .08]].forEach(([m, v]) => { if (f * m < 7500) tone(c, lp, at, dur * (1.1 - m / 10), { f: f * m * rnd(.995, 1.005), vol: vol * v, type: 'sine', attack: .007 }); });
}

export const BRUITS = {
  // accueil : toilette, jeu, petite marche
  lechouille: (c, o, t) => { hiss(c, o, t, rnd(.07, .09), { f: [rnd(1800, 2200), rnd(3200, 3800)], q: 2.2, vol: .1, shape: x => Math.sin(Math.PI * x) }); tone(c, o, t + .01, .05, { f: [rnd(380, 450), rnd(650, 750)], vol: .03 }); },
  frotte: (c, o, t) => hiss(c, o, t, .32, { type: 'lowpass', f: 1400, q: .7, vol: .12, shape: (x, i) => Math.sin(Math.PI * x) * (.55 + .45 * Math.sin(i / 700)) }),
  secoue: (c, o, t) => { for (let i = 0; i < 5; i++) hiss(c, o, t + i * .07, .05, { f: rnd(900, 1300), q: 1, vol: .09, shape: x => Math.sin(Math.PI * x) }); },
  saut: (c, o, t) => hiss(c, o, t, .2, { f: [700, 1600], q: 1, vol: .06 }),
  atterrit: (c, o, t) => hiss(c, o, t, .07, { type: 'lowpass', f: 500, vol: .16, shape: x => Math.pow(1 - x, 3) }),
  balle: (c, o, t) => { tone(c, o, t, .09, { f: [520, 380], vol: .08, type: 'triangle' }); hiss(c, o, t, .03, { f: 2500, q: 1, vol: .04 }); },
  roulade: (c, o, t) => hiss(c, o, t, .55, { type: 'lowpass', f: [900, 400], q: 3, vol: .1, shape: (x, i) => (1 - x) * (.6 + .4 * Math.sin(i / 300)) }),
  patte: (c, o, t) => hiss(c, o, t, .05, { type: 'lowpass', f: rnd(380, 480), vol: .14, shape: x => Math.pow(1 - x, 2.5) }),

  // balai : un « fchhh » qui glisse sur le sol
  balai: (c, o, t) => hiss(c, o, t, rnd(.22, .3), { f: [rnd(2400, 2800), rnd(1200, 1500)], q: .9, vol: .17, shape: x => Math.pow(Math.sin(Math.PI * Math.min(1, x * 1.3)), 1.5) }),
  etincelle: (c, o, t) => { [2637, 3520, 4186].forEach((f, i) => tone(c, o, t + i * .06, .35, { f, vol: .035 })); hiss(c, o, t, .3, { type: 'highpass', f: 7000, vol: .03, shape: x => Math.pow(1 - x, 3) }); },
  // casserole
  touille: (c, o, t) => hiss(c, o, t, .5, { type: 'lowpass', f: [700, 380], q: 4, vol: .17, shape: (x, i) => Math.sin(Math.PI * x) * (.6 + .4 * Math.sin(i / 260)) }),
  blop: (c, o, t) => { tone(c, o, t, .12, { f: [rnd(240, 280), rnd(780, 900)], vol: .13 }); tone(c, o, t + .02, .08, { f: [500, 1200], vol: .05, type: 'triangle' }); },
  lape: (c, o, t) => { tone(c, o, t, .06, { f: [900, 1500], vol: .05 }); hiss(c, o, t, .06, { f: 3000, q: 2, vol: .05 }); },
  // pièces
  tapote: (c, o, t) => metal(c, o, t, 1400, .16, .04),
  roule: (c, o, t) => { for (let i = 0; i < 9; i++) metal(c, o, t + i * .065 + rnd(0, .015), rnd(1600, 1800), .05, .022); hiss(c, o, t, .6, { f: 1800, q: 1.5, vol: .03 }); },
  boum: (c, o, t) => { tone(c, o, t, .16, { f: [280, 120], vol: .13 }); hiss(c, o, t, .06, { type: 'lowpass', f: 900, vol: .08, shape: x => Math.pow(1 - x, 3) }); },
  tchiing: (c, o, t) => { metal(c, o, t, 1318.5, .8, .05); metal(c, o, t + .09, 1760, 1.0, .045); hiss(c, o, t + .09, .4, { type: 'bandpass', f: 5000, q: .7, vol: .01, shape: x => Math.pow(1 - x, 3) }); },
  tombe: (c, o, t) => tone(c, o, t, .45, { f: [2200, 900], vol: .02 }),
  rebond: (c, o, t, v = 1) => metal(c, o, t, rnd(1650, 1850), .2, .04 * v),
  tourne: (c, o, t) => {   // la pièce tourne sur la tranche : des petits clics de plus en plus rapprochés, puis à plat
    let at = t, gap = .14;
    for (let i = 0; i < 14 && at < t + 1.3; i++) { metal(c, o, at, rnd(1900, 2100), .06, .014 + i * .0015); at += gap; gap *= .86; }
    hiss(c, o, t, 1.3, { f: [1200, 2400], q: 3, vol: .012, shape: x => x });
  },
  aplat: (c, o, t) => metal(c, o, t, 1750, .3, .045),
  pose: (c, o, t) => tone(c, o, t, .1, { f: [340, 190], vol: .07 }),
  // sac de courses : papier kraft qui froisse
  froisse: (c, o, t, dur = .5) => {
    for (let at = t; at < t + dur; at += rnd(.03, .07)) hiss(c, o, at, rnd(.02, .05), { f: rnd(2500, 5500), q: rnd(1, 3), vol: rnd(.07, .15), shape: x => Math.pow(1 - x, 2) });
  },
  renifle: (c, o, t) => hiss(c, o, t, .09, { f: [2500, 4200], q: 1.2, vol: .08 }),
  pop: (c, o, t) => tone(c, o, t, .08, { f: [500, 1100], vol: .1 }),
  gloup: (c, o, t) => { tone(c, o, t, .16, { f: [420, 130], vol: .16, type: 'triangle' }); tone(c, o, t + .12, .1, { f: [300, 520], vol: .05 }); },
  ploc: (c, o, t) => { hiss(c, o, t, .1, { type: 'lowpass', f: 600, vol: .2, shape: x => Math.pow(1 - x, 3) }); tone(c, o, t, .08, { f: [160, 90], vol: .08 }); },
  // lettre
  papier: (c, o, t) => hiss(c, o, t, .14, { type: 'highpass', f: 2200, vol: .08, shape: x => Math.sin(Math.PI * x) * (.7 + .3 * Math.random()) }),
  glisse: (c, o, t) => hiss(c, o, t, .25, { f: [1800, 3200], q: .8, vol: .07 }),
  ouvre: (c, o, t) => { hiss(c, o, t, .1, { f: 3000, q: 1, vol: .06 }); tone(c, o, t + .04, .14, { f: [600, 1000], vol: .06 }); },
  carillon: (c, o, t) => [1046.5, 1318.5, 1568, 2093].forEach((f, i) => tone(c, o, t + i * .09, .7, { f, vol: .05, type: 'triangle' })),
  battement: (c, o, t) => { tone(c, o, t, .14, { f: [200, 110], vol: .12 }); tone(c, o, t + .16, .12, { f: [180, 100], vol: .09 }); },
  eclat: (c, o, t) => { [1568, 2093, 2637, 3136, 2349].forEach((f, i) => tone(c, o, t + i * .045, .3, { f, vol: .035 })); hiss(c, o, t, .35, { type: 'highpass', f: 6000, vol: .03, shape: x => Math.pow(1 - x, 3) }); },
};

// Le petit son qu'on entend en arrivant sur une page, lié à son accessoire.
export const ENTREE = {
  v44_menage: [['balai', 0], ['balai', .28]],
  v44_cuisine: [['blop', 0], ['blop', .16]],
  v44_argent: [['tchiing', 0]],
  v44_courses: [['froisse', 0, .35]],
  v44_care: [['papier', 0], ['carillon', .12]],
};

// Les bruitages calés sur chaque scène (secondes depuis le début de l'animation, un seul tour de boucle).
const strokes = [0, 1, 2, 3, 4, 5].map(k => ['balai', .85 + k * .5]);
export const CUES = {
  // accueil (les noms « m:… » sont des miaulements de miaous.js)
  v44_etirement: [['m:baille', 2.25], ['m:mrrr', 4.75], ['secoue', 6.7]],
  v44_jeu: [...[0, 1, 2, 3].map(k => ['patte', 2.05 + k * .42]), ['saut', 3.37], ['balle', 3.52], ['atterrit', 3.71], ['roulade', 3.6], ['m:chirp', 4.35]],
  v44_toilette: [...[0, 1, 2, 3, 4].map(k => ['lechouille', 2.42 + k * .4]), ['frotte', 4.7], ['frotte', 5.3], ['secoue', 6.6]],
  v44_marche: [...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => ['patte', 1.17 + k * .38]), ['m:trille', 7.6]],
  v44_miaulement: [['m:miaou', 1.65], ['m:miaou2', 4.35]],
  v44_repos: [['m:baille', 6.2]],
  v44_calme: [['m:ronron', 1.1]],

  v44_menage: [...strokes, ['m:eternue', 5.5], ['etincelle', 7.3], ['etincelle', 8.1], ['balai', 9.45], ['balai', 9.95]],
  v44_cuisine: [...[0, 1, 2, 3, 4].map(k => ['touille', .8 + k * .6]), ['lape', 4.82], ['lape', 5.24], ['blop', 6.84], ['boum', 7.32], ...[0, 1, 2].map(k => ['touille', 8.9 + k * .6]), ['carillon', 9.62]],
  v44_argent: [['tapote', 1.32], ['roule', 2.34], ['boum', 2.96], ['tchiing', 3.64], ['tombe', 6.02], ['rebond', 6.5], ['rebond', 6.8, .6], ['rebond', 6.96, .3], ['tourne', 7.1], ['aplat', 8.58], ['pose', 8.9]],
  v44_courses: [...[0, 1, 2, 3].map(k => ['renifle', .72 + k * .28]), ['froisse', 1.5, .5], ['froisse', 2.4, 1.7], ['pop', 4.22], ['gloup', 6.45], ['froisse', 8.1, 1.25], ['pop', 9.42], ['ploc', 10.75]],
  v44_care: [['papier', 2.72], ['glisse', 3.45], ['ouvre', 4.6], ['carillon', 4.64], ['battement', 5.6], ['battement', 6.1], ['eclat', 6.95], ['papier', 8.9], ['papier', 9.8]],
};

// Programme une liste de bruitages à partir de l'instant t0 (temps de l'AudioContext). Renvoie le bus,
// à déconnecter pour tout couper.
// Durée d'un tour de chaque scène (les bruitages repartent à chaque tour, comme l'animation).
export const DUREE = { v44_etirement: 12, v44_jeu: 12, v44_toilette: 12, v44_marche: 12, v44_miaulement: 12, v44_repos: 12, v44_calme: 12, v44_menage: 12, v44_cuisine: 13, v44_argent: 12, v44_courses: 12.5, v44_care: 12 };

export function schedule(c, list, t0, vol = 1, meow = null, bus = null) {
  if (!bus) { bus = c.createGain(); bus.gain.value = vol; bus.connect(c.destination); }
  for (const [kind, at, arg] of list) {
    if (t0 + at < c.currentTime - .02) continue;   // déjà passé (on a rejoint l'animation en cours de route)
    if (kind.startsWith('m:')) { if (meow) meow(t0 + at, kind.slice(2)); continue; }
    const f = BRUITS[kind]; if (f) try { f(c, bus, t0 + at, arg); } catch {}
  }
  return bus;
}

// Voix d'Azami quand elle « parle » dans les visites : un petit blip par syllabe, à la Animal Crossing.
// Hauteur et timbre dépendent de la lettre (les voyelles donnent la couleur), voix aiguë de petite chatte.
const FORMANT = { a: 1150, à: 1150, â: 1150, e: 1700, é: 2100, è: 1800, ê: 1800, i: 2500, î: 2500, o: 850, ô: 850, u: 1900, ù: 1900, y: 2400 };
export function parle(c, ch, vol = .05, up = 0) {
  const l = ch.toLowerCase(), t = c.currentTime + .005, code = l.charCodeAt(0);
  const f = 640 * (1 + ((code % 7) - 3) * .035) * (1 + up) * rnd(.98, 1.02), dur = rnd(.045, .06);
  const o = c.createOscillator(), bp = c.createBiquadFilter(), lp = c.createBiquadFilter(), g = c.createGain();
  o.type = 'square'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * .9, t + dur);
  bp.type = 'bandpass'; bp.Q.value = 2.5; bp.frequency.value = FORMANT[l] || 1400 + (code % 5) * 120;
  lp.type = 'lowpass'; lp.frequency.value = 3200;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .006); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
  o.connect(bp); bp.connect(lp); lp.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + .02);
}
