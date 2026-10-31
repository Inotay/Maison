# Azami V4.4 : bibliothèque d'animation.
# Un seul dessin (rig V4.1, visage B), mouvement continu par transformations CSS, timing vif.
# Chaque élément a UNE piste ; les « gestes » ajoutent des points sur ces pistes.
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
PROPS = json.load(open(f'{HERE}/props/props.json'))
BBOX = json.load(open(f'{HERE}/props/bbox.json'))

SNAP = 'cubic-bezier(.34,1.56,.64,1)'   # arrivée vive avec léger dépassement
SOFT = 'cubic-bezier(.45,0,.55,1)'      # va-et-vient doux
ANT = 'cubic-bezier(.5,0,.75,0)'        # départ qui prend son élan
OUTQ = 'cubic-bezier(.2,.8,.3,1)'       # arrivée amortie
LIN = 'linear'
STEP = 'steps(1,end)'

ORIG = {
    'character': '255px 402px', 'core': '268px 330px', 'neck': '196px 300px', 'head': '178px 290px',
    'ear-left': '112px 170px', 'ear-right': '231px 170px', 'tail': '339px 296px', 'tail-tip': '377px 214px',
    'eye-l': '146px 211px', 'eye-r': '207px 211px', 'pupils-l': '146px 211px', 'pupils-r': '207px 211px',
    'mouth-open': '177px 262px', 'blush': '177px 245px', 'whiskers': '177px 262px',
    'front-near': '211px 312px', 'front-far': '210px 312px', 'back-near': '324px 316px', 'back-far': '320px 316px',
}

def decl(v, o=1):
    """v : dict x, y, r, sx, sy, o (opacité). Chaque image clé déclare transform ET opacité :
    sinon le navigateur interpole par-dessus les images qui n'en parlent pas (yeux mi-clos)."""
    v = v or {}
    s = v.get('s', 1)
    return (f"transform:translate({v.get('x', 0)}px,{v.get('y', 0)}px) rotate({v.get('r', 0)}deg) scale({v.get('sx', s)},{v.get('sy', s)})"
            f";opacity:{v.get('o', o)}")

class Anim:
    def __init__(self, name, D, loop=True, title='', desc='', props=(), extra_svg='', extra_defs='', under_svg='', head_extra='', char_extra=''):
        self.under_svg = under_svg; self.head_extra = head_extra; self.char_extra = char_extra
        self.name, self.D, self.loop, self.title, self.desc = name, D, loop, title, desc
        self.tracks = {}       # piste -> [(t, valeurs, easing)]
        self.cycles = []       # boucles indépendantes : (sélecteur, durée, points)
        self.props = list(props)
        self.extra_svg, self.extra_defs = extra_svg, extra_defs
        self.origins = dict(ORIG)
        self.base = {}         # piste -> pose de repos (transform seul), utile pour les statiques
        self.hidden = {'eyes-blink', 'eyes-happy', 'mouth-open'}    # éléments cachés au repos (opacity 0)
        for p in self.props:
            x, y, w, h = BBOX[p]
            self.origins['P' + p[5:]] = f'{x + w / 2}px {y + h}px'

    # --- pistes -------------------------------------------------------------
    def at(self, track, t, v=None, ease=LIN):
        self.tracks.setdefault(track, []).append((round(t, 3), v or {}, ease))
        return self

    def move(self, track, t, to, dur=.3, hold=.6, back=.3, antic=None, ease_in=SNAP, ease_out=OUTQ, neutral=None):
        """Va vers « to » (avec élan facultatif), tient, revient au neutre."""
        n = neutral or {}
        self.at(track, t, n, ANT if antic else ease_in)
        t1 = t
        if antic:
            self.at(track, t + .1, antic, ease_in); t1 = t + .1
        self.at(track, t1 + dur, to, LIN if hold else ease_out)
        if hold is None: return t1 + dur
        if hold:
            self.at(track, t1 + dur + hold, to, ANT)
        self.at(track, t1 + dur + hold + back, n, LIN)
        return t1 + dur + hold + back

    def cycle(self, sel, dur, pts):
        self.cycles.append((sel, dur, pts))

    # --- gestes ---------------------------------------------------------------
    def blink(self, t, fast=True):
        for e in ('eye-l', 'eye-r'):
            self.at(e, t, {'o': 1}, ANT).at(e, t + .05, {'sy': .3, 'sx': 1.04, 'o': 1}, STEP).at(e, t + .06, {'sy': .12, 'sx': 1.04, 'o': 0}, STEP)
            self.at(e, t + .13, {'sy': .4, 'sx': 1.04, 'o': 1}, SNAP).at(e, t + .22, {'o': 1}, LIN)
        self.at('eyes-blink', t, {'o': 0}, STEP).at('eyes-blink', t + .06, {'o': 1}, STEP).at('eyes-blink', t + .13, {'o': 0}, STEP)
        self.hidden.add('eyes-blink')

    def happy(self, t0, t1):
        """Yeux fermés en arc heureux de t0 à t1."""
        for e in ('eye-l', 'eye-r'):
            self.at(e, t0 - .04, {'o': 1}, ANT).at(e, t0, {'sy': .3, 'sx': 1.03, 'o': 1}, STEP).at(e, t0 + .02, {'sy': .1, 'sx': 1.03, 'o': 0}, LIN)
            self.at(e, t1, {'sy': .1, 'sx': 1.03, 'o': 0}, STEP).at(e, t1 + .02, {'sy': .4, 'sx': 1.04, 'o': 1}, SNAP).at(e, t1 + .14, {'o': 1}, LIN)
        self.at('eyes-happy', t0, {'o': 0}, STEP).at('eyes-happy', t0 + .02, {'o': 1}, STEP).at('eyes-happy', t1 + .02, {'o': 0}, STEP)
        self.hidden.add('eyes-happy')

    def look(self, t, dx, dy, hold=1.0):
        for p in ('pupils-l', 'pupils-r'):
            self.at(p, t, {}, OUTQ).at(p, t + .1, {'x': dx, 'y': dy}, LIN).at(p, t + .1 + hold, {'x': dx, 'y': dy}, OUTQ).at(p, t + .22 + hold, {}, LIN)

    def mouth(self, t0, t1, big=1.0, smile_back=True):
        s = big
        self.at('mouth-open', t0, {'s': .2, 'o': 0}, STEP).at('mouth-open', t0 + .02, {'s': .35, 'o': 1}, SNAP)
        self.at('mouth-open', t0 + .25, {'sx': 1.1 * s, 'sy': 1.2 * s, 'o': 1}, SOFT).at('mouth-open', t1 - .12, {'sx': s, 'sy': 1.1 * s, 'o': 1}, ANT)
        self.at('mouth-open', t1, {'s': .2, 'o': 1}, STEP).at('mouth-open', t1 + .02, {'s': .2, 'o': 0}, LIN)
        self.at('mouth-smile', t0, {'o': 1}, STEP).at('mouth-smile', t0 + .02, {'o': 0}, STEP).at('mouth-smile', t1 + .01, {'o': 1}, LIN)
        self.hidden.add('mouth-open')

    def hop(self, t, h=26, air=.24, tilt=0):
        c = 'character'
        self.at(c, t, {}, ANT).at(c, t + .12, {'sx': 1.06, 'sy': .9}, SNAP)
        self.at(c, t + .12 + air * .5, {'y': -h, 'sx': .95, 'sy': 1.07, 'r': tilt}, 'cubic-bezier(.3,0,.7,1)')
        self.at(c, t + .12 + air, {'y': 0, 'sx': 1.08, 'sy': .9}, SNAP).at(c, t + .12 + air + .2, {}, LIN)
        return t + .12 + air + .2

    def ear(self, side, t, a=12, hold=0):
        e = 'ear-left' if side == 'l' else 'ear-right'
        self.at(e, t, {}, ANT).at(e, t + .07, {'r': -a * .35}, SNAP).at(e, t + .17, {'r': a}, OUTQ)
        if hold: self.at(e, t + .17 + hold, {'r': a}, OUTQ)
        self.at(e, t + .17 + hold + .18, {}, LIN)

    def flick(self, t, a=20):
        self.at('tail-tip', t, {}, ANT).at('tail-tip', t + .1, {'r': -a}, SNAP).at('tail-tip', t + .3, {'r': a * .5}, OUTQ).at('tail-tip', t + .6, {}, LIN)

    def shake(self, track, t, amp=4, n=4, period=.08, key='r'):
        self.at(track, t, {}, LIN)
        for k in range(n):
            self.at(track, t + (k + 1) * period, {key: amp if k % 2 == 0 else -amp}, SOFT)
        self.at(track, t + (n + 1) * period, {}, LIN)

    def show(self, track, t0, t1, pop=True, v_from=None, v_to=None):
        """Fait apparaître un accessoire de t0 à t1 (petit « pop »)."""
        self.hidden.add(track)
        self.at(track, t0, dict({'s': .3, 'o': 0}, **(v_from or {})), STEP).at(track, t0 + .02, dict({'s': .4, 'o': 1}, **(v_from or {})), SNAP)
        self.at(track, t0 + .3, dict({'o': 1}, **(v_to or {})), LIN).at(track, t1 - .2, dict({'o': 1}, **(v_to or {})), ANT).at(track, t1, dict({'s': .5, 'o': 0}, **(v_to or {})), LIN)

    # --- vie de fond (scènes) -----------------------------------------------------
    def idle(self, breathe=3.0, tail=4.0, depth=1.0):
        d = depth
        self.cycle('core', breathe, [(0, {}, SOFT), (breathe * .47, {'y': -1.5 * d, 'sx': 1 + .018 * d, 'sy': 1 + .03 * d}, SOFT), (breathe, {}, SOFT)])
        self.cycle('neck', breathe, [(0, {}, SOFT), (breathe * .47, {'y': -1.8 * d}, SOFT), (breathe, {}, SOFT)])
        self.cycle('tail', tail, [(0, {}, SOFT), (tail * .28, {'r': -7}, SOFT), (tail * .58, {'r': 5}, SOFT), (tail * .8, {'r': -2}, SOFT), (tail, {}, SOFT)])

    # --- rendu -------------------------------------------------------------------
    def kf(self, name, D, pts, o=1):
        pts = sorted(pts, key=lambda p: p[0])
        if not pts or pts[0][0] > 0: pts.insert(0, (0, {}, LIN))
        if pts[-1][0] < D: pts.append((D, {}, LIN))
        out = []
        for t, v, e in pts:
            d = decl(v, o)
            out.append(f"{round(t / D * 100, 3)}%{{{d};animation-timing-function:{e}}}")
        return f"@keyframes {name}{{{''.join(out)}}}"

    def css(self):
        it = 'infinite' if self.loop else '1'
        rules = []
        for tr, pts in self.tracks.items():
            n = f'k-{tr}'
            # les éléments cachés au repos : opacité 0 par défaut aux bornes
            if tr in self.hidden:
                pts = [(t, v if 'o' in v else dict(v, o=0), e) for t, v, e in pts]
                if not any(p[0] == 0 for p in pts): pts.append((0, {'o': 0}, LIN))
                if not any(p[0] == self.D for p in pts): pts.append((self.D, {'o': 0}, LIN))
            rules.append(f"#{tr}{{animation:{n} {self.D}s {it}}}")
            rules.append(self.kf(n, self.D, pts, 0 if tr in self.hidden else 1))
        for sel, dur, pts in self.cycles:
            if sel in self.tracks: continue
            n = f'c-{sel}'
            reps = 'infinite' if self.loop else max(1, round(self.D / dur))
            rules.append(f"#{sel}{{animation:{n} {dur}s {reps}}}")
            rules.append(self.kf(n, dur, pts))
        return '\n'.join(rules)

    def svg(self, animated=True):
        origins = dict(self.origins)
        base = '*{animation-fill-mode:both}\n' + ''.join(f'#{k}{{transform-box:view-box;transform-origin:{v}}}' for k, v in origins.items())
        hidden = ''.join(f'#{h}{{opacity:0}}' for h in sorted(self.hidden))
        hidden += ''.join('#%s{%s}' % (k, decl(v).split(';opacity')[0]) for k, v in self.base.items())
        style = base + '\n' + hidden + '\n'
        if animated:
            style += self.css() + '\n@media(prefers-reduced-motion:reduce){*{animation:none!important}}'
        props = ''.join(f'<g id="P{p[5:]}">{PROPS[p]["svg"]}</g>' for p in self.props)
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="{self.title}">
<title>{self.title}</title><desc>{self.desc}</desc>
<style><![CDATA[
{style}
]]></style>
{('<defs>' + self.extra_defs + '</defs>') if self.extra_defs else ''}
{self.under_svg}
{drawing(self.head_extra, self.char_extra)}
{props}
{self.extra_svg}
</svg>
'''

def drawing(head_extra='', char_extra=''):
    eye = lambda cx, side: f'''<g id="eye-{side}"><g transform="translate({cx} 211)"><g id="pupils-{side}"><ellipse rx="23" ry="26" fill="#78C8F0"/><ellipse cx="1" cy="4" rx="16" ry="19" fill="#163C5C"/>
      <ellipse cx="0" cy="12" rx="12" ry="6" fill="#4E9FCF" opacity=".55"/><circle cx="-6" cy="-9" r="8" fill="#FFFFFF"/><circle cx="8" cy="8" r="3.6" fill="#FFFFFF"/><circle cx="-11" cy="5" r="1.8" fill="#FFFFFF" opacity=".9"/></g></g></g>'''
    return f'''<g id="ground-shadow"><ellipse cx="252" cy="402" rx="140" ry="16" fill="#39201E" opacity=".12"/></g>
<g id="character">
  <g id="tail">
    <path d="M334 302 C363 286 384 250 377 212" stroke="#39201E" stroke-width="27" stroke-linecap="round" fill="none"/>
    <path d="M336 302 C365 279 379 251 374 226" stroke="#6B403A" stroke-width="4" stroke-linecap="round" fill="none" opacity=".28"/>
    <g id="tail-tip"><path d="M377 213 C370 180 401 171 414 195" stroke="#39201E" stroke-width="27" stroke-linecap="round" fill="none"/></g>
  </g>
  <g id="back-far"><path d="M320 313 Q314 343 322 376" stroke="#DFC49F" stroke-width="26" fill="none" stroke-linecap="round"/><ellipse cx="324" cy="384" rx="19" ry="14" fill="#39201E"/></g>
  <g id="front-far"><path d="M210 309 Q198 344 205 377" stroke="#E6CCA7" stroke-width="27" fill="none" stroke-linecap="round"/><ellipse cx="205" cy="385" rx="19" ry="13" fill="#39201E"/></g>
  <g id="core">
    <ellipse cx="267" cy="297" rx="96" ry="61" fill="#F4DBB4"/>
    <ellipse cx="252" cy="322" rx="71" ry="31" fill="#FFF2D9" opacity=".78"/>
    <ellipse cx="206" cy="296" rx="37" ry="51" transform="rotate(-12 206 296)" fill="#F4DBB4"/>
    <path d="M308 246 Q328 274 332 300" stroke="#F9E4C3" stroke-width="6" opacity=".8" stroke-linecap="round"/>
  </g>
  <g id="back-near"><path d="M324 313 Q332 342 335 377" stroke="#F4DBB4" stroke-width="29" fill="none" stroke-linecap="round"/><ellipse cx="337" cy="384" rx="21" ry="15" fill="#39201E"/></g>
  <g id="neck"><ellipse cx="196" cy="276" rx="39" ry="51" transform="rotate(-10 196 276)" fill="#F4DBB4"/></g>
  <g id="head">
    <g id="ear-left"><path d="M130 178 Q102 124 89 110 Q78 99 81 127 L92 206Z" fill="#39201E"/><path d="M112 175 Q98 145 92 135 L98 181Z" fill="#F2A5AF"/></g>
    <g id="ear-right"><path d="M206 177 Q219 129 239 108 Q250 100 248 131 L253 196Z" fill="#39201E"/><path d="M220 174 Q235 146 241 133 L242 176Z" fill="#F2A5AF"/></g>
    <ellipse cx="176" cy="220" rx="85" ry="87" fill="#F4DBB4"/>
    <path d="M107 220 Q110 184 147 181 Q166 179 174 182 Q194 175 213 183 Q245 190 244 226 Q241 276 179 280 Q114 280 107 237 Q106 229 107 220Z" fill="#5A3A31"/>
    <g id="blush"><ellipse cx="124" cy="246" rx="13" ry="7.5" fill="#F48FA0" opacity=".55"/><ellipse cx="230" cy="246" rx="13" ry="7.5" fill="#F48FA0" opacity=".55"/></g>
    {eye(146, 'l')}
    {eye(207, 'r')}
    <g id="eyes-blink"><path d="M126 213 Q146 219 166 213 M187 213 Q207 219 228 213" stroke="#FFF2D9" stroke-width="7" stroke-linecap="round" fill="none"/></g>
    <g id="eyes-happy"><path d="M127 218 Q146 194 165 218 M188 218 Q207 194 226 218" stroke="#FFF2D9" stroke-width="7.5" stroke-linecap="round" fill="none"/></g>
    <ellipse cx="177" cy="257" rx="28" ry="17" fill="#66403B"/>
    <path d="M167 248 Q177 241 187 248 Q184 256 177 258 Q170 256 167 248Z" fill="#F2A5AF"/>
    <g id="mouth-smile" stroke="#F2A5AF" stroke-width="3.8" stroke-linecap="round" fill="none"><path d="M177 257 V262 M177 262 Q169 272 161 264 M177 262 Q185 272 193 264"/></g>
    <g id="mouth-open"><ellipse cx="177" cy="268" rx="11" ry="13" fill="#8F4357"/><path d="M170 274 Q177 266 184 274 Q177 281 170 274Z" fill="#F6A2B0"/></g>
    <g id="whiskers" stroke="#FFF2D9" stroke-width="4" stroke-linecap="round" fill="none"><path d="M131 260 Q109 251 86 250 M134 270 Q111 268 91 278 M223 261 Q242 250 263 249 M221 271 Q241 270 263 279"/></g>
    {head_extra}
  </g>
  <g id="front-near"><path d="M211 309 Q203 343 215 375" stroke="#DFC49F" stroke-width="35" fill="none" stroke-linecap="round"/><path d="M211 309 Q203 343 215 375" stroke="#F4DBB4" stroke-width="29" fill="none" stroke-linecap="round"/><ellipse cx="215" cy="385" rx="21" ry="16" fill="#39201E"/><path d="M209 389 L209 394 M220 389 L220 394" stroke="#F2C8A5" stroke-width="2" opacity=".56"/></g>
  {char_extra}
</g>'''

def write(a, kind):
    out = '/home/claude/maison/azami/v44' + ('' if kind == 'scene' else '/reactions')
    os.makedirs(out + '/statiques', exist_ok=True)
    stem = f'azami_v44_{a.name}' if kind == 'scene' else a.name
    open(f'{out}/{stem}_anime.svg', 'w').write(a.svg(True))
    open(f'{out}/statiques/{stem}_statique.svg', 'w').write(a.svg(False))
    return f'{out}/{stem}_anime.svg'
