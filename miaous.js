// Miaulements d'Azami, synthétisés (Web Audio) : une petite famille de sons, chacun avec un peu de hasard
// (hauteur, durée) pour qu'aucun ne soit tout à fait pareil. Un vrai enregistrement sounds/azami_<type>.m4a
// remplace le son synthétique de ce type.
export const MEOW_KINDS = {
  miaou: 'Miaou',
  mew: 'Petit mew',
  question: 'Mrrp ? (question)',
  trille: 'Brrrt (trille)',
  long: 'Miaaaou (long)',
  chirp: 'Ek ek (excitée)',
  grogne: 'Mrrrow (sassy)',
  ronron: 'Ronron',
  mrrr: 'Mrrr (bonjour roulé)',
  miaou2: 'Mi-aou (deux syllabes)',
  triste: 'Miaaah (plaintif)',
  baille: 'Bâillement',
  gazouille: 'Ek-ek-ek (aux oiseaux)',
  mewmew: 'Mew mew',
  eternue: 'Atchi !',
  ronronmrr: 'Ronron puis mrr',
  crache: 'Crache (hiss)',
  griffe: 'Griffe (sur l’écran)',
};

const rnd = (a, b) => a + Math.random() * (b - a);

// Une voix de chat : source riche (dent de scie + triangle), formant qui glisse (« i-a-ou »), souffle au début.
function voice(c, out, t, { pts, dur, vol = .16, form = [2100, 1300, 750], q = 4, am = 0, amDepth = 0, breath = .04, vib = 0 }) {
  const k = rnd(.93, 1.08);   // chaque miaou un peu différent
  const o1 = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), env = c.createGain();
  const bp = c.createBiquadFilter(), lp = c.createBiquadFilter();
  o1.type = 'sawtooth'; o2.type = 'triangle';
  for (const o of [o1, o2]) {
    o.frequency.setValueAtTime(pts[0][1] * k, t);
    for (const [at, f] of pts.slice(1)) o.frequency.exponentialRampToValueAtTime(f * k * rnd(.96, 1.04), t + at * dur);
  }
  o2.detune.value = 6;
  if (vib) { const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5.5; lg.gain.value = vib; lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency); lfo.start(t); lfo.stop(t + dur + .05); }
  bp.type = 'bandpass'; bp.Q.value = q;
  const fk = rnd(.9, 1.1); form = form.map(x => x * fk);
  bp.frequency.setValueAtTime(form[0], t); bp.frequency.linearRampToValueAtTime(form[1], t + dur * .45); bp.frequency.linearRampToValueAtTime(form[2], t + dur);
  lp.type = 'lowpass'; lp.frequency.value = 3600;
  env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(vol, t + Math.min(.06, dur * .2));
  env.gain.setValueAtTime(vol, t + dur * .7); env.gain.exponentialRampToValueAtTime(.0008, t + dur);
  o1.connect(bp); o2.connect(bp); bp.connect(lp); lp.connect(g); g.connect(env); env.connect(out);
  if (am) {   // trille ou grognement : la voix vibre en petites rafales
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = am; lg.gain.value = amDepth;
    g.gain.value = 1 - amDepth; lfo.connect(lg); lg.connect(g.gain); lfo.start(t); lfo.stop(t + dur + .05);
  }
  if (breath) {   // petit souffle d'attaque
    const len = Math.floor(c.sampleRate * .12), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const n = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain();
    n.buffer = buf; nf.type = 'bandpass'; nf.frequency.value = 3000; nf.Q.value = 1; ng.gain.value = breath;
    n.connect(nf); nf.connect(ng); ng.connect(out); n.start(t);
  }
  o1.start(t); o2.start(t); o1.stop(t + dur + .05); o2.stop(t + dur + .05);
  return t + dur;
}

// Ronron : un souffle doux et continu, à peine pulsé (expiration puis inspiration), pas des coups réguliers.
function purr(c, out, t, vol = .5) {
  const sr = c.sampleRate, dur = rnd(1.6, 2.2), len = Math.floor(sr * dur), buf = c.createBuffer(1, len, sr), d = buf.getChannelData(0);
  const breaths = [[0, .52, rnd(25, 27), 1], [.55, 1, rnd(21, 23), .6]];   // expiration plus forte, inspiration plus douce
  let ph = 0, lp = 0;
  for (let i = 0; i < len; i++) {
    const x = i / len, b = x < .53 ? breaths[0] : breaths[1];
    const local = (x - b[0]) / (b[1] - b[0]);
    const shape = local < 0 || local > 1 ? 0 : Math.sin(Math.PI * local) ** .8;   // chaque souffle monte et redescend
    ph += (b[2] * (1 + (Math.random() - .5) * .08)) / sr;                           // petit flottement, jamais métronomique
    const pulse = .55 + .45 * Math.sin(2 * Math.PI * ph) ** 2;                     // modulation douce
    lp += ((Math.random() * 2 - 1) - lp) * .08;                                     // bruit déjà adouci
    d[i] = lp * pulse * shape * b[3];
  }
  const s = c.createBufferSource(), f = c.createBiquadFilter(), body = c.createBiquadFilter(), g = c.createGain();
  s.buffer = buf; f.type = 'lowpass'; f.frequency.value = 700; f.Q.value = .5;
  body.type = 'peaking'; body.frequency.value = 380; body.Q.value = .9; body.gain.value = 4;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * .9, t + .15); g.gain.setValueAtTime(vol * .9, t + dur - .3); g.gain.linearRampToValueAtTime(0, t + dur);
  s.connect(f); f.connect(body); body.connect(g); g.connect(out); s.start(t);
  return t + dur;
}

export function playMeow(c, kind = 'miaou', volume = .6) {
  const out = c.createGain(); out.gain.value = Math.min(1, volume / .6); out.connect(c.destination);
  const t = c.currentTime + .02;
  switch (kind) {
    case 'mew': return voice(c, out, t, { pts: [[0, 820], [.35, 1050], [1, 720]], dur: rnd(.22, .3), vol: .13, form: [2600, 1900, 1300] });
    case 'question': return voice(c, out, t, { pts: [[0, 430], [.5, 470], [1, 860]], dur: rnd(.32, .42), vol: .15, form: [900, 1200, 2200], am: 26, amDepth: .35, breath: .02 });
    case 'trille': return voice(c, out, t, { pts: [[0, 380], [.6, 520], [1, 470]], dur: rnd(.38, .5), vol: .15, form: [800, 1100, 900], q: 3, am: 30, amDepth: .75, breath: .01 });
    case 'long': return voice(c, out, t, { pts: [[0, 470], [.25, 720], [.7, 680], [1, 360]], dur: rnd(.95, 1.2), vol: .15, form: [2000, 1250, 650], vib: 12 });
    case 'chirp': {
      let at = t; const n = Math.random() < .5 ? 2 : 3;
      for (let i = 0; i < n; i++) at = voice(c, out, at, { pts: [[0, 900], [.6, 1350], [1, 1100]], dur: rnd(.07, .1), vol: .12, form: [2400, 2800, 2200], breath: 0 }) + rnd(.05, .09);
      return at;
    }
    case 'grogne': return voice(c, out, t, { pts: [[0, 330], [.4, 520], [1, 300]], dur: rnd(.6, .8), vol: .15, form: [1400, 1000, 600], q: 3, am: 42, amDepth: .4, breath: .03 });
    case 'ronron': return purr(c, out, t, .4);
    case 'ronronmrr': { const e = purr(c, out, t, .38); return voice(c, out, e - .1, { pts: [[0, 320], [1, 380]], dur: .3, vol: .1, form: [900, 1000, 800], am: 22, amDepth: .55, breath: 0 }); }
    case 'mrrr': return voice(c, out, t, { pts: [[0, 300], [.5, 360], [1, 340]], dur: rnd(.3, .45), vol: .18, form: [800, 950, 850], q: 3, am: rnd(20, 26), amDepth: .6, breath: .015 });
    case 'miaou2': { const e = voice(c, out, t, { pts: [[0, 600], [1, 700]], dur: rnd(.14, .2), vol: .14, form: [2400, 2200, 1900] }); return voice(c, out, e + rnd(.04, .08), { pts: [[0, 720], [.3, 760], [1, 420]], dur: rnd(.4, .55), vol: .15, form: [1500, 1000, 650] }); }
    case 'triste': return voice(c, out, t, { pts: [[0, 640], [.2, 700], [1, 380]], dur: rnd(.8, 1.05), vol: .14, form: [2200, 1500, 900], vib: 9 });
    case 'baille': return voice(c, out, t, { pts: [[0, 420], [.25, 560], [1, 260]], dur: rnd(.9, 1.2), vol: .11, form: [1200, 900, 500], q: 2, breath: .07 });
    case 'gazouille': { let at = t; const n = 4 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) at = voice(c, out, at, { pts: [[0, rnd(850, 1000)], [1, rnd(1150, 1400)]], dur: rnd(.05, .075), vol: .13, form: [2600, 2900, 2500], breath: 0 }) + rnd(.03, .06); return at; }
    case 'mewmew': { const e = voice(c, out, t, { pts: [[0, 880], [.4, 1080], [1, 760]], dur: rnd(.18, .24), vol: .12, form: [2700, 2000, 1400] }); return voice(c, out, e + rnd(.1, .18), { pts: [[0, 820], [.4, 1000], [1, 700]], dur: rnd(.2, .28), vol: .12, form: [2600, 1900, 1300] }); }
    case 'crache': {   // petit « k » puis un long souffle aigu
      const mk = (dur, f, q, v, at, shape = 2) => { const len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) { const x = i / len; d[i] = (Math.random() * 2 - 1) * Math.min(1, x * 25) * Math.pow(1 - x, shape); }
        const n = c.createBufferSource(), bp = c.createBiquadFilter(), hp = c.createBiquadFilter(), g = c.createGain(); n.buffer = buf;
        bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; hp.type = 'highpass'; hp.frequency.value = 1800; g.gain.value = v;
        n.connect(bp); bp.connect(hp); hp.connect(g); g.connect(out); n.start(at); };
      mk(.03, 3000, .6, .5, t, 4);
      mk(rnd(.6, .8), rnd(4200, 5200), .7, .35, t + .04, 1.2);
      return t + .85;
    }
    case 'griffe': {   // trois petits « scritch » rapides
      for (let i = 0; i < 3; i++) {
        const at = t + i * rnd(.05, .07), dur = rnd(.07, .1), len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
        for (let j = 0; j < len; j++) { const x = j / len; d[j] = (Math.random() * 2 - 1) * Math.sin(Math.PI * x) * (.6 + .4 * Math.sin(j / 9)); }
        const n = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(); n.buffer = buf;
        bp.type = 'bandpass'; bp.Q.value = 2; bp.frequency.setValueAtTime(rnd(2500, 3200), at); bp.frequency.linearRampToValueAtTime(rnd(5000, 6500), at + dur);
        g.gain.value = .3; n.connect(bp); bp.connect(g); g.connect(out); n.start(at);
      }
      return t + .3;
    }
    case 'eternue': {
      const len = Math.floor(c.sampleRate * .16), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.5);
      const n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); n.buffer = buf; f.type = 'bandpass'; f.frequency.value = 4200; f.Q.value = .8; g.gain.value = .22;
      n.connect(f); f.connect(g); g.connect(out); n.start(t + .12);
      voice(c, out, t, { pts: [[0, 700], [1, 900]], dur: .1, vol: .07, form: [2500, 2600, 2600], breath: .05 });
      return t + .3;
    }
    default: return voice(c, out, t, { pts: [[0, 520], [.3, 760], [1, 430]], dur: rnd(.55, .7), vol: .16 });
  }
}

// Au hasard, pour quand on caresse Azami ou qu'elle miaule d'elle-même.
export function randomMeow() {
  const bag = ['miaou', 'miaou', 'mew', 'question', 'trille', 'long', 'chirp', 'grogne', 'mrrr', 'mrrr', 'miaou2', 'triste', 'baille', 'gazouille', 'mewmew', 'eternue'];
  return bag[Math.floor(Math.random() * bag.length)];
}
// Un son au hasard parmi une famille (pour les humeurs).
export const pick = list => list[Math.floor(Math.random() * list.length)];
