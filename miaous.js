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
    for (const [at, f] of pts.slice(1)) o.frequency.exponentialRampToValueAtTime(f * k, t + at * dur);
  }
  o2.detune.value = 6;
  if (vib) { const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5.5; lg.gain.value = vib; lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency); lfo.start(t); lfo.stop(t + dur + .05); }
  bp.type = 'bandpass'; bp.Q.value = q;
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

function purr(c, out, t, vol = .5) {
  const dur = rnd(1.2, 1.7), len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  const rate = rnd(24, 29);
  for (let i = 0; i < len; i++) {
    const ph = (i / c.sampleRate) * rate % 1, inhale = Math.sin(Math.PI * (i / len)) ** .5;
    d[i] = (Math.random() * 2 - 1) * Math.pow(Math.sin(Math.PI * ph), 6) * inhale;
  }
  const s = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain();
  s.buffer = buf; lp.type = 'lowpass'; lp.frequency.value = 1100; g.gain.value = vol * .55;
  // Un peu de grave pour la chaleur, et du médium pour qu'on l'entende sur un haut-parleur de téléphone.
  const pk = c.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 650; pk.Q.value = .8; pk.gain.value = 6;
  s.connect(lp); lp.connect(pk); pk.connect(g); g.connect(out); s.start(t);
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
    case 'ronron': return purr(c, out, t, volume);
    default: return voice(c, out, t, { pts: [[0, 520], [.3, 760], [1, 430]], dur: rnd(.55, .7), vol: .16 });
  }
}

// Au hasard, pour quand on caresse Azami ou qu'elle miaule d'elle-même.
export function randomMeow() {
  const r = Math.random();
  return r < .3 ? 'miaou' : r < .48 ? 'mew' : r < .64 ? 'question' : r < .78 ? 'trille' : r < .88 ? 'chirp' : r < .95 ? 'long' : 'grogne';
}
