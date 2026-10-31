# Scènes de pages avec accessoires, refaites comme de petits films : Azami tient ou touche vraiment l'objet.
# L'accessoire tenu dans la patte suit exactement la patte (même pivot, même mouvement) ; ce qui est dans la
# gueule ou sur la tête est dessiné dans la tête. Les objets posés sont au sol, devant elle (à gauche).
from lib import *

INK = '#39201E'
LEG_O = '211px 312px'

class Held:
    """Patte avant (front-near) qui tient un objet : la patte a une pose de base `base`, l'objet est dessiné
    pour cette pose ; on anime des écarts (dr, dx, dy) appliqués aux deux pistes à la fois."""
    def __init__(self, a, prop, base):
        self.props = prop if isinstance(prop, tuple) else (prop,)
        self.a, self.base = a, base
        for p in self.props: a.origins[p] = LEG_O
        a.base['front-near'] = {'r': base}
        self.at(0, 0)
    def at(self, t, dr=0, dx=0, dy=0, ease=SOFT):
        self.a.at('front-near', t, {'r': self.base + dr, 'x': dx, 'y': dy}, ease)
        for p in self.props: self.a.at(p, t, {'r': dr, 'x': dx, 'y': dy}, ease)
        return self
    def end(self, D):
        self.at(D, 0, ease=LIN)

def steam(a, name, t0, t1, x0, y0, rise=60, sway=8):
    a.hidden.add(name); a.origins[name] = f'{x0}px {y0}px'
    a.at(name, t0, {'o': 0, 's': .6}, SOFT).at(name, t0 + .3, {'o': .9, 'y': -rise * .25, 'x': sway, 's': .9}, SOFT)
    a.at(name, (t0 + t1) / 2, {'o': .7, 'y': -rise * .6, 'x': -sway, 's': 1.05}, SOFT).at(name, t1, {'o': 0, 'y': -rise, 'x': sway * .5, 's': 1.2}, LIN)

def puff(a, name, t, x0, y0, dx=-22, dy=-16, dur=.9, s1=1.3):
    a.hidden.add(name); a.origins[name] = f'{x0}px {y0}px'
    a.at(name, t, {'o': 0, 's': .4}, STEP).at(name, t + .02, {'o': .85, 's': .5}, OUTQ)
    a.at(name, t + dur * .4, {'o': .7, 'x': dx * .5, 'y': dy * .5, 's': 1}, SOFT).at(name, t + dur, {'o': 0, 'x': dx, 'y': dy, 's': s1}, LIN)

def puffs_svg(n, x, y, col='#E9DCC6'):
    return ''.join(f'<g id="Xpuff{i}"><circle cx="{x}" cy="{y}" r="9" fill="{col}"/><circle cx="{x - 10}" cy="{y + 4}" r="6.5" fill="{col}"/><circle cx="{x + 9}" cy="{y + 3}" r="6" fill="{col}"/></g>' for i in range(n))

SPARK = lambda gid, x, y, s=1, col='#F9C849': f'<g id="{gid}"><path transform="translate({x} {y}) scale({s})" d="M0 -14 Q2.6 -2.6 14 0 Q2.6 2.6 0 14 Q-2.6 2.6 -14 0 Q-2.6 -2.6 0 -14Z" fill="{col}" stroke="{INK}" stroke-width="2.5"/></g>'

def twinkle(a, gid, x, y, times, s=1.25):
    a.hidden.add(gid); a.origins[gid] = f'{x}px {y}px'
    for t in times:
        a.at(gid, t, {'o': 0, 's': .2}, STEP).at(gid, t + .02, {'o': 1, 's': .3}, SNAP).at(gid, t + .22, {'o': 1, 's': s, 'r': 25}, OUTQ).at(gid, t + .55, {'o': 0, 's': .4, 'r': 60}, LIN)

# ------------------------------------------------------------------------------------------------
def menage():
    D = 12.0
    broom = f'''<g id="Hbroom">
      <path d="M208 298 L114 380" stroke="{INK}" stroke-width="13" stroke-linecap="round"/><path d="M208 298 L114 380" stroke="#C98B5E" stroke-width="7" stroke-linecap="round"/>
      <path d="M205 302 L190 315" stroke="#E9B98C" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M100 366 L130 390 L112 402 L58 402 Z" fill="#F4C76B" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M108 376 L72 400 M114 381 L86 400 M120 386 L100 401" stroke="#D9A441" stroke-width="3" stroke-linecap="round"/>
      <path d="M98 364 L132 392" stroke="#E7776B" stroke-width="9" stroke-linecap="round"/><path d="M98 364 L132 392" stroke="{INK}" stroke-width="2" stroke-linecap="round" opacity=".35"/>
</g>
      <g id="Hgrip"><ellipse cx="152" cy="350" rx="19" ry="14" transform="rotate(-40 152 350)" fill="{INK}"/><path d="M144 356 L141 360 M154 359 L152 364" stroke="#F2C8A5" stroke-width="2" opacity=".56"/></g>'''
    sneeze = f'<g id="Xatch"><path d="M108 236 L88 226 M104 252 L80 254 M108 268 L88 280" stroke="#FFF2D9" stroke-width="5" stroke-linecap="round"/></g>'
    nosepuff = '<g id="Xnose"><circle cx="0" cy="0" r="7" fill="#E9DCC6"/><circle cx="-6" cy="3" r="4.5" fill="#E9DCC6"/><circle cx="6" cy="2" r="4" fill="#E9DCC6"/></g>'
    extra = puffs_svg(4, 70, 392) + f'<g id="Xnosewrap" transform="translate(80 382)">{nosepuff}</g>' + sneeze + SPARK('Xclean', 74, 388, .9) + SPARK('Xclean2', 104, 392, .6)
    a = Anim('menage', D, title='Azami · Ménage', desc='Azami tient son balai et balaie pour de vrai. La poussière lui chatouille le nez : atchoum ! Puis elle est fière du sol propre.', char_extra=broom, extra_svg=extra)
    a.idle(breathe=3.0, tail=4.0)
    h = Held(a, ('Hbroom', 'Hgrip'), 60)
    # balayage : la patte pousse et tire le balai le long du sol, le corps suit un peu
    strokes = [(0.8 + k * .5) for k in range(6)]
    for k, t in enumerate(strokes):
        h.at(t, 0, 0, 0, SOFT).at(t + .25, 5, -12, 2, SOFT)
        a.at('character', t, {}, SOFT).at('character', t + .25, {'x': -3, 'r': -1}, SOFT)
        a.at('head', t, {}, SOFT).at('head', t + .25, {'r': -3, 'y': 1}, SOFT)
        puff(a, f'Xpuff{k % 4}', t + .22, 70, 392)
    h.at(3.8, 0)
    a.at('character', 3.8, {}, SOFT); a.at('head', 3.8, {}, SOFT)
    a.look(1.0, -4, 5, 2.6)
    # la poussière monte jusqu'au nez : elle louche dessus
    a.hidden.add('Xnose'); a.origins['Xnose'] = '0px 0px'
    a.at('Xnose', 4.0, {'o': 0, 's': .4}, STEP).at('Xnose', 4.05, {'o': .9, 's': .7}, OUTQ).at('Xnose', 4.7, {'o': .9, 'x': 45, 'y': -70, 's': 1}, SOFT).at('Xnose', 5.15, {'o': .9, 'x': 88, 'y': -124, 's': .8}, SOFT).at('Xnose', 5.5, {'o': .9, 'x': 90, 'y': -126, 's': .8}, STEP).at('Xnose', 5.52, {'o': .9, 'x': 90, 'y': -126, 's': 1.2}, OUTQ).at('Xnose', 5.9, {'o': 0, 'x': 70, 'y': -140, 's': 2.4}, LIN)
    for p, dx in (('pupils-l', 5), ('pupils-r', -5)):
        a.at(p, 4.1, {}, SOFT).at(p, 4.6, {'x': -2, 'y': 5}, SOFT).at(p, 5.1, {'x': dx, 'y': 6}, SOFT).at(p, 5.3, {'x': dx, 'y': 6}, STEP).at(p, 5.32, {}, LIN)
    a.move('head', 5.0, {'r': -9, 'y': -7}, dur=.3, hold=.18, back=.02, ease_in=SOFT)   # inspire…
    a.happy(5.32, 6.0)
    a.at('mouth-smile', 5.0, {'o': 1}, STEP).at('mouth-smile', 5.02, {'o': 0}, STEP).at('mouth-smile', 5.75, {'o': 1}, LIN)
    a.hidden.add('mouth-open')
    a.at('mouth-open', 5.0, {'s': .3, 'o': 1}, SOFT).at('mouth-open', 5.45, {'sx': .9, 'sy': 1.05, 'o': 1}, STEP).at('mouth-open', 5.5, {'sx': 1.2, 'sy': .6, 'o': 1}, SNAP).at('mouth-open', 5.72, {'s': .3, 'o': 0}, LIN)
    a.at('head', 5.5, {'r': 9, 'y': 8, 'x': -4}, SNAP).at('head', 5.75, {}, OUTQ)            # …ATCHOUM
    a.at('character', 5.5, {'x': 7, 'sy': .94, 'sx': 1.04}, SNAP).at('character', 5.8, {}, OUTQ)
    h.at(5.45, 0).at(5.55, -9, 4, -2, SNAP).at(5.9, 0, ease=OUTQ)
    a.show('Xatch', 5.5, 5.95, v_to={'x': -6, 's': 1.2})
    a.ear('l', 5.5, -16); a.ear('r', 5.52, 16)
    a.shake('head', 6.1, amp=5, n=5, period=.07)
    # fière du sol propre
    a.move('character', 7.0, {'sy': 1.03, 'y': -3}, dur=.3, hold=1.5, back=.4, antic={'sy': .97})
    a.move('head', 7.0, {'r': -7, 'y': -4}, dur=.3, hold=1.5, back=.4)
    a.happy(7.2, 8.6)
    twinkle(a, 'Xclean', 74, 388, (7.3, 8.1)); twinkle(a, 'Xclean2', 104, 392, (7.6,))
    a.at('tail-tip', 7.0, {}, SNAP).at('tail-tip', 7.3, {'r': -18}, SOFT).at('tail-tip', 8.6, {'r': -14}, OUTQ).at('tail-tip', 9.0, {}, LIN)
    # deux petits coups de balai pour finir, puis repos
    for k, t in enumerate((9.4, 9.9)):
        h.at(t, 0).at(t + .25, 4, -10, 2)
        puff(a, f'Xpuff{k}', t + .22, 70, 392, dur=.7)
    h.at(10.4, 0)
    a.blink(11.0)
    h.end(D)
    return a

# ------------------------------------------------------------------------------------------------
def cuisine():
    D = 13.0
    hat = f'''<g id="hat"><g transform="rotate(-7 174 130)"><path d="M138 132 Q128 104 150 98 Q156 76 178 80 Q198 74 206 96 Q228 102 214 132 Z" fill="#FFFFFF" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>
      <rect x="138" y="124" width="76" height="20" rx="6" fill="#FFFFFF" stroke="{INK}" stroke-width="5"/><path d="M160 104 Q162 116 158 124 M188 100 Q190 114 188 124" stroke="#D8D2C8" stroke-width="3" fill="none" stroke-linecap="round"/></g></g>'''
    tongue = '<g id="tongue"><path d="M168 266 Q168 284 177 285 Q186 284 186 266 Z" fill="#F48FA0" stroke="#8F4357" stroke-width="3" stroke-linejoin="round"/></g>'
    spoon = f'''<g id="Hspoon"><path d="M166 312 L112 348" stroke="{INK}" stroke-width="10" stroke-linecap="round"/><path d="M166 312 L112 348" stroke="#D9A066" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="104" cy="354" rx="12" ry="8" transform="rotate(-34 104 354)" fill="#D9A066" stroke="{INK}" stroke-width="4"/>
      <g id="Hdrop"><circle cx="100" cy="364" r="4" fill="#F2A65A" stroke="{INK}" stroke-width="2"/></g></g>'''
    pot = f'''<g id="Xpot"><path d="M18 350 L48 352" stroke="{INK}" stroke-width="11" stroke-linecap="round"/><path d="M18 350 L48 352" stroke="#5A3A31" stroke-width="5" stroke-linecap="round"/>
      <path d="M50 342 L152 342 L146 386 Q144 398 130 398 L72 398 Q58 398 56 386 Z" fill="#E7776B" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M62 360 L140 360" stroke="#F49A8F" stroke-width="5" stroke-linecap="round" opacity=".8"/>
      <ellipse cx="101" cy="342" rx="53" ry="10" fill="#C95A50" stroke="{INK}" stroke-width="5"/>
      <ellipse cx="101" cy="343" rx="44" ry="6" fill="#F2A65A"/>
      <g id="Xswirl"><path d="M80 343 Q92 339 102 343 Q112 347 122 342" stroke="#FFD08A" stroke-width="3" fill="none" stroke-linecap="round"/></g></g>'''
    steamsvg = ''.join(f'<g id="Xst{i}"><path d="M{x} 330 Q{x - 9} 318 {x} 306 Q{x + 9} 294 {x} 282" stroke="#FFFFFF" stroke-width="6" fill="none" stroke-linecap="round" opacity=".85"/></g>' for i, x in enumerate((82, 101, 120)))
    heart = f'<g id="Xheart"><path d="M101 300 C89 288 74 300 88 314 L101 326 L114 314 C128 300 113 288 101 300Z" fill="#FFFFFF" opacity=".9"/></g>'
    bubble = f'<g id="Xblop"><circle cx="116" cy="338" r="9" fill="#FFD08A" stroke="{INK}" stroke-width="3"/><circle cx="113" cy="335" r="2.5" fill="#FFFFFF"/></g>'
    ring = f'<g id="Xring"><circle cx="116" cy="334" r="14" fill="none" stroke="#FFFFFF" stroke-width="3"/></g>'
    a = Anim('cuisine', D, title='Azami · Cuisine', desc='Azami en toque de chef remue sa casserole, goûte la sauce (mmh), sursaute quand une bulle fait blop, et la vapeur dessine un cœur.',
             head_extra=hat + tongue, char_extra=spoon, extra_svg=pot + steamsvg + heart + bubble + ring)
    a.origins.update({'hat': '174px 140px', 'tongue': '177px 266px', 'Xswirl': '101px 343px', 'Hdrop': '100px 364px'})
    a.idle(breathe=3.0, tail=4.2)
    h = Held(a, 'Hspoon', 75)
    # vapeur en continu
    for k in range(5):
        t = .2 + k * 2.5
        for i in range(3): steam(a, f'Xst{i}' if k % 2 == 0 else f'Xst{i}', t + i * .55, t + i * .55 + 2.0, (82, 101, 120)[i], 330, rise=48)
    # touiller (petits cercles), la sauce tourne
    def stir(t0, n):
        for k in range(n):
            t = t0 + k * .6
            h.at(t, 0, 0, 0).at(t + .15, 4, -6, 2).at(t + .3, 0, -8, 4).at(t + .45, -4, -2, 2)
            a.at('Xswirl', t, {}, SOFT).at('Xswirl', t + .3, {'x': -7}, SOFT)
            a.at('Xswirl', t + .6, {}, SOFT)
        h.at(t0 + n * .6, 0)
    stir(.8, 5)
    a.look(.9, -4, 5, 2.6)
    a.move('head', .9, {'r': -5, 'y': 3}, dur=.4, hold=2.3, back=.4, ease_in=SOFT, ease_out=SOFT)
    # goûter : la cuillère monte jusqu'à la bouche, la tête vient à sa rencontre
    h.at(4.0, 0).at(4.55, 42, 18, -6, SOFT).at(5.6, 42, 18, -6, SOFT).at(6.0, 0, ease=OUTQ)
    a.at('Hdrop', 4.0, {}, LIN).at('Hdrop', 4.5, {'o': 1}, LIN).at('Hdrop', 4.7, {'y': 26, 'o': 0}, ANT).at('Hdrop', 4.71, {'o': 0}, STEP).at('Hdrop', 6.0, {'o': 0}, STEP).at('Hdrop', 6.02, {'o': 1}, LIN)
    a.at('head', 4.3, {}, SOFT).at('head', 4.6, {'x': -14, 'y': 6, 'r': 7}, SOFT).at('head', 5.5, {'x': -14, 'y': 6, 'r': 7}, SOFT).at('head', 5.9, {}, OUTQ)
    a.happy(4.75, 5.9)
    a.hidden.add('tongue')
    for k in range(2):
        t = 4.8 + k * .42
        a.at('tongue', t, {'o': 0, 'sy': .2}, STEP).at('tongue', t + .02, {'o': 1, 'sy': .4}, SNAP).at('tongue', t + .16, {'o': 1, 'sy': 1.2, 'sx': 1.1}, SOFT).at('tongue', t + .3, {'o': 1, 'sy': .3}, STEP).at('tongue', t + .32, {'o': 0}, LIN)
    a.at('mouth-smile', 4.8, {'o': 1}, STEP).at('mouth-smile', 4.82, {'o': 0}, STEP).at('mouth-smile', 5.55, {'o': 1}, LIN)
    a.at('blush', 4.8, {}, SNAP).at('blush', 5.0, {'s': 1.3}, SOFT).at('blush', 5.9, {'s': 1.3}, OUTQ).at('blush', 6.2, {}, LIN)
    # BLOP ! elle sursaute, la toque saute
    a.hidden.update({'Xblop', 'Xring'}); a.origins.update({'Xblop': '116px 344px', 'Xring': '116px 334px'})
    a.at('Xblop', 6.3, {'o': 0, 's': .2}, STEP).at('Xblop', 6.32, {'o': 1, 's': .3}, OUTQ).at('Xblop', 6.8, {'o': 1, 's': 1.15, 'y': -4}, SOFT).at('Xblop', 6.86, {'o': 0, 's': 1.4, 'y': -4}, LIN)
    a.at('Xring', 6.86, {'o': 0, 's': .5}, STEP).at('Xring', 6.88, {'o': 1, 's': .6}, OUTQ).at('Xring', 7.2, {'o': 0, 's': 1.8}, LIN)
    a.look(6.4, -5, 6, .45)
    a.at('character', 6.86, {}, ANT).at('character', 6.92, {'sx': 1.05, 'sy': .92}, SNAP).at('character', 7.1, {'y': -22, 'sx': .96, 'sy': 1.06}, SOFT).at('character', 7.32, {'sx': 1.05, 'sy': .93}, SNAP).at('character', 7.5, {}, LIN)
    a.at('hat', 6.9, {}, ANT).at('hat', 7.1, {'y': -26, 'r': 14}, SOFT).at('hat', 7.32, {'y': 0, 'r': -6}, SNAP).at('hat', 7.6, {}, OUTQ)
    a.ear('l', 6.88, -16, .4); a.ear('r', 6.9, 16, .4)
    for p in ('pupils-l', 'pupils-r'): a.at(p, 6.86, {'x': -5, 'y': 6}, SNAP).at(p, 6.95, {'s': 1.12}, SNAP).at(p, 7.5, {'s': 1.12}, OUTQ).at(p, 7.7, {}, LIN)
    a.happy(7.9, 8.6); a.mouth(7.9, 8.4, .9)
    # elle reprend, et la vapeur dessine un cœur
    stir(8.9, 3)
    a.hidden.add('Xheart'); a.origins['Xheart'] = '101px 326px'
    a.at('Xheart', 9.6, {'o': 0, 's': .3}, STEP).at('Xheart', 9.62, {'o': .9, 's': .5}, OUTQ).at('Xheart', 10.4, {'o': .9, 'y': -40, 's': 1.1}, SOFT).at('Xheart', 10.6, {'o': .9, 'y': -46, 's': 1.2}, SOFT).at('Xheart', 10.8, {'o': .9, 'y': -50, 's': 1.05}, SOFT).at('Xheart', 11.4, {'o': 0, 'y': -70, 's': 1.3}, LIN)
    a.look(9.7, -4, -3, 1.4)
    a.happy(10.6, 11.4); a.at('blush', 10.6, {}, SOFT).at('blush', 10.9, {'s': 1.2}, SOFT).at('blush', 11.4, {}, LIN)
    a.at('hat', 12.0, {}, SOFT).at('hat', 12.2, {'r': 6}, SOFT).at('hat', 12.45, {'r': -3}, SOFT).at('hat', 12.7, {}, LIN)
    a.blink(12.3)
    h.end(D)
    return a

# ------------------------------------------------------------------------------------------------
def argent():
    D = 12.0
    pig = f'''<g id="Xpig"><g id="Xpigbody">
      <path d="M28 352 Q14 344 20 334 Q26 328 30 338" stroke="{INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <rect x="44" y="378" width="14" height="20" rx="5" fill="#F2A5AF" stroke="{INK}" stroke-width="4"/><rect x="98" y="378" width="14" height="20" rx="5" fill="#F2A5AF" stroke="{INK}" stroke-width="4"/>
      <ellipse cx="78" cy="358" rx="50" ry="34" fill="#F7B8C0" stroke="{INK}" stroke-width="5"/>
      <path d="M54 330 L62 312 L72 328 Z" fill="#F2A5AF" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>
      <ellipse cx="128" cy="360" rx="12" ry="10" fill="#F2A5AF" stroke="{INK}" stroke-width="4"/><circle cx="124" cy="359" r="2.2" fill="{INK}"/><circle cx="131" cy="359" r="2.2" fill="{INK}"/>
      <circle cx="106" cy="348" r="3.6" fill="{INK}"/><ellipse cx="102" cy="368" rx="7" ry="4" fill="#F48FA0" opacity=".7"/>
      <rect x="66" y="326" width="28" height="7" rx="3.5" fill="{INK}"/>
      <path d="M48 350 Q52 338 62 336" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/></g></g>'''
    coin = f'''<g id="Xcoin"><g id="Xcoinspin"><circle cx="172" cy="384" r="15" fill="#F9C849" stroke="{INK}" stroke-width="4"/><circle cx="172" cy="384" r="9" fill="none" stroke="#E0A42A" stroke-width="3"/>
      <path d="M168 378 Q166 384 170 390" stroke="#FFF4C8" stroke-width="2.5" fill="none" stroke-linecap="round"/></g></g>'''
    coin2 = f'<g id="Xcoin2"><g id="Xcoin2spin"><circle cx="172" cy="384" r="15" fill="#F9C849" stroke="{INK}" stroke-width="4"/><circle cx="172" cy="384" r="9" fill="none" stroke="#E0A42A" stroke-width="3"/></g></g>'
    tings = SPARK('Xting1', 70, 312, .9) + SPARK('Xting2', 98, 304, .7) + SPARK('Xting3', 178, 366, .7)
    a = Anim('argent', D, title='Azami · Argent', desc='Azami pousse une pièce du bout de la patte : elle roule, saute dans la tirelire (tchiing !). Puis une autre tombe du ciel, tourne sur elle-même, et Azami pose la patte dessus : à moi.',
             extra_svg=pig + coin + coin2 + tings)
    a.origins.update({'Xpig': '78px 398px', 'Xpigbody': '78px 398px', 'Xcoin': '172px 384px', 'Xcoinspin': '172px 384px', 'Xcoin2': '172px 384px', 'Xcoin2spin': '172px 384px'})
    a.idle(breathe=3.0, tail=4.0)
    # elle repère la pièce
    a.look(.4, -4, 6, 1.6)
    a.move('head', .4, {'r': -8, 'y': 5}, dur=.4, hold=1.2, back=.4, ease_in=SOFT, ease_out=SOFT)
    a.ear('l', .5, -8)
    # petit tapotement : la pièce vacille
    a.at('front-near', 1.2, {}, ANT).at('front-near', 1.32, {'r': 26}, SNAP).at('front-near', 1.5, {}, OUTQ)
    a.at('Xcoinspin', 1.32, {}, SNAP).at('Xcoinspin', 1.42, {'r': -12}, SOFT).at('Xcoinspin', 1.55, {'r': 9}, SOFT).at('Xcoinspin', 1.7, {'r': -5}, SOFT).at('Xcoinspin', 1.85, {}, LIN)
    # vrai coup de patte : elle roule jusqu'à la tirelire, cogne, saute et tombe dans la fente
    a.at('front-near', 2.2, {}, ANT).at('front-near', 2.32, {'r': 34, 'x': -4}, SNAP).at('front-near', 2.6, {}, OUTQ)
    a.at('Xcoin', 2.32, {}, OUTQ).at('Xcoin', 2.85, {'x': -26}, SOFT).at('Xcoin', 3.0, {'x': -28}, SOFT)
    a.at('Xcoinspin', 2.32, {}, OUTQ).at('Xcoinspin', 2.85, {'r': -200}, SOFT).at('Xcoinspin', 3.0, {'r': -215}, SOFT)
    a.at('Xpigbody', 2.95, {}, SNAP).at('Xpigbody', 3.05, {'r': -5, 'sx': .97}, SNAP).at('Xpigbody', 3.2, {'r': 3}, SOFT).at('Xpigbody', 3.35, {}, LIN)
    a.at('Xcoin', 3.0, {'x': -28}, 'cubic-bezier(.2,.6,.4,1)').at('Xcoin', 3.35, {'x': -60, 'y': -92}, 'cubic-bezier(.5,0,.8,.4)').at('Xcoin', 3.62, {'x': -92, 'y': -54, 's': .9}, LIN)
    a.at('Xcoinspin', 3.0, {'r': -215}, LIN).at('Xcoinspin', 3.62, {'r': -440, 'sx': .25}, LIN)
    a.hidden.add('Xcoin')
    a.at('Xcoin', 0, {'o': 1}, LIN).at('Xcoin', 3.62, {'x': -92, 'y': -54, 's': .9, 'o': 1}, STEP).at('Xcoin', 3.64, {'x': -92, 'y': -54, 's': .9, 'o': 0}, STEP).at('Xcoin', D - .25, {'o': 0, 's': .3}, STEP).at('Xcoin', D - .22, {'o': 1, 's': .5}, SNAP).at('Xcoin', D, {'o': 1}, LIN)
    for k in range(3):   # regard qui suit la pièce
        pass
    a.look(2.4, -6, 6, .45); a.look(3.0, -6, -3, .4); a.look(3.5, -6, 2, .6)
    twinkle(a, 'Xting1', 70, 312, (3.66,)); twinkle(a, 'Xting2', 98, 304, (3.76,))
    a.at('Xpigbody', 3.64, {}, SNAP).at('Xpigbody', 3.74, {'sy': .9, 'sx': 1.05}, SNAP).at('Xpigbody', 3.95, {'sy': 1.04, 'r': 3}, SOFT).at('Xpigbody', 4.15, {'r': -3}, SOFT).at('Xpigbody', 4.35, {}, LIN)
    a.hop(3.8, h=18, air=.24); a.happy(3.9, 5.0); a.mouth(3.95, 4.5, .9)
    a.at('tail-tip', 3.8, {}, SNAP).at('tail-tip', 4.1, {'r': -18}, SOFT).at('tail-tip', 5.0, {'r': -12}, OUTQ).at('tail-tip', 5.4, {}, LIN)
    # une deuxième pièce tombe du ciel, rebondit, tourne sur la tranche
    a.hidden.add('Xcoin2')
    a.at('Xcoin2', 0, {'o': 0}, STEP).at('Xcoin2', 6.0, {'o': 0, 'y': -420}, STEP).at('Xcoin2', 6.02, {'o': 1, 'y': -420}, 'cubic-bezier(.5,0,1,1)').at('Xcoin2', 6.5, {'o': 1, 'y': 0}, 'cubic-bezier(0,0,.4,1)')
    a.at('Xcoin2', 6.65, {'o': 1, 'y': -34}, 'cubic-bezier(.6,0,1,1)').at('Xcoin2', 6.8, {'o': 1, 'y': 0}, 'cubic-bezier(0,0,.4,1)').at('Xcoin2', 6.88, {'o': 1, 'y': -9}, 'cubic-bezier(.6,0,1,1)').at('Xcoin2', 6.96, {'o': 1}, LIN)
    a.look(6.0, -4, -6, .2); a.look(6.3, -4, 0, .2); a.look(6.6, -4, 6, 3.5)
    a.at('head', 6.0, {}, SOFT).at('head', 6.3, {'r': -6, 'y': -4}, SOFT).at('head', 6.7, {'r': -8, 'y': 5}, SOFT)
    twinkle(a, 'Xting3', 178, 366, (6.52,), s=1.0)
    spins = [(7.1, .14), (7.24, .14), (7.38, .15), (7.53, .17), (7.7, .2), (7.9, .24), (8.14, .3)]
    for t, d in spins:
        a.at('Xcoin2spin', t, {'sx': 1}, SOFT).at('Xcoin2spin', t + d / 2, {'sx': .12}, SOFT)
    a.at('Xcoin2spin', 8.44, {'sx': 1}, SOFT).at('Xcoin2spin', 8.6, {'sx': 1.15, 'sy': .35, 'y': 10}, SNAP)   # elle tombe à plat : ting
    a.at('Xcoin2spin', D - .3, {'sx': 1.15, 'sy': .35, 'y': 10}, STEP).at('Xcoin2spin', D - .28, {}, LIN)
    for p in ('pupils-l', 'pupils-r'):
        a.at(p, 7.1, {'x': -4, 'y': 6}, SOFT)
        for k, (t, d) in enumerate(spins): a.at(p, t + d / 2, {'x': -2 if k % 2 else -6, 'y': 6}, SOFT)
        a.at(p, 8.6, {'x': -4, 'y': 6}, SOFT)
    # la patte se pose dessus : à moi
    a.at('front-near', 8.7, {}, ANT).at('front-near', 8.9, {'r': 30, 'y': 4}, SNAP).at('front-near', 10.6, {'r': 30, 'y': 4}, SOFT).at('front-near', 11.0, {}, OUTQ)
    a.move('head', 9.0, {'r': 9, 'x': 2}, dur=.3, hold=1.3, back=.4, antic={'r': -2})
    a.look(9.0, 1, -1, 1.4); a.happy(9.4, 10.4)
    a.at('blush', 9.4, {}, SNAP).at('blush', 9.6, {'s': 1.2}, SOFT).at('blush', 10.4, {'s': 1.2}, OUTQ).at('blush', 10.7, {}, LIN)
    a.at('Xcoin2', D - .3, {'o': 1}, STEP).at('Xcoin2', D - .28, {'o': 0}, LIN)
    a.blink(11.4)
    return a

# ------------------------------------------------------------------------------------------------
def courses():
    D = 12.5
    back = f'''<g transform="translate(78 398) scale(1.25) translate(-86 -398)"><g id="Xbagback"><path d="M34 260 L44 250 L54 262 L64 250 L74 262 L84 250 L94 262 L104 250 L114 262 L124 250 L134 260 L142 398 L30 398 Z" fill="#B97E45" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>
      <g id="Xleek"><path d="M58 258 Q50 214 40 196 M62 258 Q62 210 70 188 M66 258 Q74 218 88 204" stroke="#5DA35A" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M58 258 Q50 214 40 196 M62 258 Q62 210 70 188 M66 258 Q74 218 88 204" stroke="{INK}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".5"/></g>
      <g id="Xbread"><path d="M104 262 L128 196" stroke="{INK}" stroke-width="22" stroke-linecap="round"/><path d="M104 262 L128 196" stroke="#E2A55E" stroke-width="15" stroke-linecap="round"/><path d="M112 236 L122 240 M116 224 L126 228 M120 212 L130 216" stroke="#B9783A" stroke-width="3" stroke-linecap="round"/></g></g></g>'''
    front = f'''<g transform="translate(78 398) scale(1.25) translate(-86 -398)"><g id="Xbagfront"><path d="M30 272 L142 272 L148 398 L24 398 Z" fill="#D9A066" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M30 272 L142 272" stroke="#C48A50" stroke-width="7"/><path d="M50 300 L52 380 M120 300 L118 380" stroke="#C48A50" stroke-width="3" stroke-linecap="round" opacity=".7"/>
      <circle cx="86" cy="334" r="15" fill="#F7EFE3" stroke="{INK}" stroke-width="3.5"/><path d="M79 334 L84 340 L94 328" stroke="#5DA35A" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></g>'''
    fish = f'''<g id="fish"><path d="M206 270 L226 258 L224 284 Z" fill="#8FB7CF" stroke="{INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <ellipse cx="172" cy="271" rx="38" ry="13" fill="#B3D6E5" stroke="{INK}" stroke-width="4"/><circle cx="145" cy="268" r="3.2" fill="{INK}"/><path d="M158 264 Q164 272 158 280 M174 263 Q180 271 174 279" stroke="#8FB7CF" stroke-width="2.5" fill="none"/></g>'''
    sock = f'<g id="sock"><path d="M160 262 L188 262 L188 284 Q206 286 206 296 Q206 306 190 306 L166 306 Q156 306 158 292 Z" fill="#E7776B" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/><path d="M160 270 L188 270" stroke="#FFF2D9" stroke-width="4"/></g>'
    floorsock = f'<g id="Xsock"><g transform="translate(0 92)"><path d="M160 262 L188 262 L188 284 Q206 286 206 296 Q206 306 190 306 L166 306 Q156 306 158 292 Z" fill="#E7776B" stroke="{INK}" stroke-width="4" stroke-linejoin="round" transform="rotate(80 182 284)"/></g></g>'
    a = Anim('courses', D, title='Azami · Courses', desc='Azami renifle le sac de courses, plonge la tête dedans et ressort avec un poisson. Elle le gobe, puis replonge et ressort… une chaussette.',
             under_svg=back, extra_svg=front + floorsock, head_extra=fish + sock)
    a.origins.update({'Xbagfront': '86px 398px', 'Xbagback': '86px 398px', 'Xleek': '62px 258px', 'Xbread': '104px 262px', 'fish': '177px 268px', 'sock': '180px 270px', 'Xsock': '180px 380px'})
    a.idle(breathe=3.0, tail=4.0)
    a.hidden.update({'fish', 'sock', 'Xsock'})
    # elle renifle le sac
    a.look(.3, -6, 2, 1.6)
    a.move('head', .4, {'r': -7, 'x': -6}, dur=.4, hold=1.2, back=.3, ease_in=SOFT)
    for k in range(4):
        t = .7 + k * .28
        a.at('whiskers', t, {}, SNAP).at('whiskers', t + .1, {'y': -2.5, 'sx': 1.06}, OUTQ).at('whiskers', t + .24, {}, LIN)
    # le sac bouge tout seul
    for tr in ('Xbagfront', 'Xbagback'): a.at(tr, 1.5, {}, SOFT).at(tr, 1.62, {'r': -2.5}, SOFT).at(tr, 1.74, {'r': 2}, SOFT).at(tr, 1.86, {'r': -1}, SOFT).at(tr, 2.0, {}, LIN)
    a.at('Xleek', 1.5, {}, SOFT).at('Xleek', 1.7, {'r': -8}, SOFT).at('Xleek', 1.9, {'r': 5}, SOFT).at('Xleek', 2.1, {}, LIN)
    a.ear('l', 1.55, -12); a.ear('r', 1.6, 12)
    # la tête plonge dans le sac (le devant du sac passe devant elle), la patte s'appuie sur le bord
    def dive(t0, t1):
        a.at('head', t0, {}, ANT).at('head', t0 + .45, {'x': -68, 'y': 76, 'r': -30}, SNAP)
        for k in range(int((t1 - t0 - .6) / .32)):
            t = t0 + .5 + k * .32
            a.at('head', t, {'x': -68, 'y': 76, 'r': -30}, SOFT).at('head', t + .16, {'x': -64, 'y': 82, 'r': -24}, SOFT)
        a.at('head', t1, {'x': -68, 'y': 76, 'r': -30}, ANT).at('head', t1 + .3, {'r': -6, 'y': -6}, SNAP).at('head', t1 + .55, {}, OUTQ)
        a.at('neck', t0, {}, ANT).at('neck', t0 + .45, {'x': -34, 'y': 18, 'r': -10}, SNAP).at('neck', t1, {'x': -34, 'y': 18, 'r': -10}, ANT).at('neck', t1 + .4, {}, OUTQ)
        a.at('front-near', t0, {}, ANT).at('front-near', t0 + .4, {'r': 62, 'x': -4}, SNAP).at('front-near', t1, {'r': 62, 'x': -4}, ANT).at('front-near', t1 + .35, {}, OUTQ)
        a.at('character', t0, {}, ANT).at('character', t0 + .45, {'x': -6, 'r': -3}, SNAP).at('character', t1, {'x': -6, 'r': -3}, ANT).at('character', t1 + .4, {}, OUTQ)
        for tr in ('Xbagfront', 'Xbagback'):
            for k in range(int((t1 - t0 - .6) / .32)):
                t = t0 + .5 + k * .32
                a.at(tr, t, {}, SOFT).at(tr, t + .16, {'r': 2 if k % 2 else -2, 'sx': 1.02}, SOFT)
            a.at(tr, t1, {}, LIN)
    dive(2.3, 4.2)
    a.at('Xleek', 3.0, {}, SOFT).at('Xleek', 3.2, {'y': -16, 'r': -10}, SNAP).at('Xleek', 3.5, {}, OUTQ)
    a.at('Xbread', 3.4, {}, SOFT).at('Xbread', 3.6, {'y': -12, 'r': 6}, SNAP).at('Xbread', 3.9, {}, OUTQ)
    # elle ressort avec un poisson !
    a.at('fish', 4.2, {'o': 0}, STEP).at('fish', 4.22, {'o': 1, 'r': -8}, SNAP).at('fish', 4.6, {'o': 1}, SOFT)
    for k in range(4): a.at('fish', 4.8 + k * .3, {'o': 1, 'r': 6 if k % 2 else -6}, SOFT)   # le poisson gigote
    a.at('fish', 6.0, {'o': 1}, SOFT)
    a.happy(4.6, 6.0); a.at('blush', 4.6, {}, SNAP).at('blush', 4.8, {'s': 1.2}, SOFT).at('blush', 6.0, {'s': 1.2}, OUTQ).at('blush', 6.3, {}, LIN)
    a.hop(5.0, h=14, air=.22)
    a.at('tail-tip', 4.7, {}, SNAP).at('tail-tip', 5.0, {'r': -20}, SOFT).at('tail-tip', 6.2, {'r': -14}, OUTQ).at('tail-tip', 6.6, {}, LIN)
    # elle le gobe (gloup) et se lèche les babines
    a.at('fish', 6.3, {'o': 1}, ANT).at('fish', 6.5, {'o': 1, 'sx': .3, 'x': 10}, SNAP).at('fish', 6.52, {'o': 0}, LIN)
    a.at('head', 6.3, {}, ANT).at('head', 6.45, {'y': 5, 'sy': .96}, SNAP).at('head', 6.7, {}, OUTQ)
    a.mouth(6.8, 7.15, .7); a.happy(6.8, 7.6)
    # replonge… et ressort avec une chaussette, qu'elle laisse tomber
    dive(8.0, 9.4)
    a.at('sock', 9.4, {'o': 0}, STEP).at('sock', 9.42, {'o': 1, 'r': 10}, SNAP).at('sock', 10.4, {'o': 1, 'r': -6}, SOFT).at('sock', 10.42, {'o': 0}, STEP)
    a.look(9.9, 2, -1, .8)
    a.move('head', 9.9, {'r': 10, 'x': 3}, dur=.3, hold=.4, back=.3, antic={'r': -2})
    a.at('Xsock', 10.4, {'o': 0, 'y': -90, 'r': 10}, STEP).at('Xsock', 10.42, {'o': 1, 'y': -90, 'r': 10}, 'cubic-bezier(.5,0,1,1)').at('Xsock', 10.75, {'o': 1, 'r': 0}, SNAP).at('Xsock', D - .35, {'o': 1}, ANT).at('Xsock', D - .05, {'o': 0, 's': .6}, LIN)
    a.flick(10.9, 24); a.happy(11.2, 11.8)
    return a

# ------------------------------------------------------------------------------------------------
def care():
    D = 12.0
    held = f'''<g id="letter"><g transform="rotate(-10 166 276)"><rect x="132" y="258" width="66" height="44" rx="5" fill="#FFF6DC" stroke="{INK}" stroke-width="4"/>
      <path d="M132 260 L165 284 L198 260" stroke="{INK}" stroke-width="4" fill="none" stroke-linejoin="round"/><path d="M165 280 C160 274 152 278 157 284 L165 291 L173 284 C178 278 170 274 165 280Z" fill="#E7776B" stroke="{INK}" stroke-width="2"/></g></g>'''
    floor = f'''<g id="Xletter"><rect x="62" y="356" width="84" height="44" rx="6" fill="#FFF6DC" stroke="{INK}" stroke-width="5"/>
      <path d="M62 358 L104 382 L146 358" stroke="#E8D9B8" stroke-width="3" fill="none"/>
      <g id="Xflap"><path d="M64 358 L104 384 L144 358 Z" fill="#FFEFC8" stroke="{INK}" stroke-width="4.5" stroke-linejoin="round"/>
      <path d="M104 378 C98 371 89 376 95 383 L104 391 L113 383 C119 376 110 371 104 378Z" fill="#E7776B" stroke="{INK}" stroke-width="2.5"/></g></g>'''
    big = f'<g id="Xbigheart"><path d="M104 330 C88 312 64 326 80 348 L104 370 L128 348 C144 326 120 312 104 330Z" fill="#F48FA0" stroke="{INK}" stroke-width="4"/><path d="M84 330 Q88 322 96 322" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/></g>'
    minis = ''.join(f'<g id="Xmh{i}"><path d="M104 300 C99 294 91 298 96 305 L104 312 L112 305 C117 298 109 294 104 300Z" fill="#F48FA0" stroke="{INK}" stroke-width="2"/></g>' for i in range(5))
    a = Anim('care', D, title='Azami · Care', desc='Azami apporte une lettre dans sa gueule, la pose et la pousse du nez. L’enveloppe s’ouvre, un cœur s’envole et éclate en petits cœurs. Clignement lent.',
             head_extra=held, extra_svg=floor + big + minis)
    a.origins.update({'letter': '166px 276px', 'Xletter': '104px 400px', 'Xflap': '104px 358px', 'Xbigheart': '104px 370px'})
    for i in range(5): a.origins[f'Xmh{i}'] = '104px 312px'
    a.idle(breathe=3.2, tail=4.4, depth=1.1)
    a.hidden.update({'Xletter', 'Xbigheart'} | {f'Xmh{i}' for i in range(5)})
    a.base['letter'] = {}
    # elle tient la lettre, timide
    a.at('letter', 0, {'o': 1}, LIN)
    a.happy(.6, 1.6); a.at('blush', .5, {}, SOFT).at('blush', 1.0, {'s': 1.2}, SOFT).at('blush', 1.8, {}, LIN)
    a.at('tail-tip', .2, {}, SOFT).at('tail-tip', .7, {'r': 14}, SOFT).at('tail-tip', 1.6, {'r': -10}, SOFT).at('tail-tip', 2.0, {}, LIN)
    # elle se penche et la pose au sol
    a.at('head', 2.0, {}, ANT).at('head', 2.5, {'x': -58, 'y': 66, 'r': 14}, SOFT).at('head', 2.9, {'x': -58, 'y': 66, 'r': 14}, SOFT)
    a.at('neck', 2.0, {}, ANT).at('neck', 2.5, {'x': -24, 'y': 26, 'r': 8}, SOFT).at('neck', 2.9, {'x': -24, 'y': 26, 'r': 8}, SOFT)
    a.at('letter', 2.7, {'o': 1}, STEP).at('letter', 2.72, {'o': 0}, STEP).at('letter', 9.8, {'o': 0}, STEP).at('letter', 9.82, {'o': 1}, LIN)
    a.at('Xletter', 2.7, {'o': 0, 'r': -14, 'y': -14}, STEP).at('Xletter', 2.72, {'o': 1, 'r': -14, 'y': -14}, SOFT).at('Xletter', 3.0, {'o': 1}, SNAP)
    # coup de nez : elle la pousse vers nous
    a.at('head', 3.3, {'x': -52, 'y': 60, 'r': 10}, ANT).at('head', 3.45, {'x': -66, 'y': 70, 'r': 12}, SNAP).at('head', 3.7, {'x': -52, 'y': 60, 'r': 10}, OUTQ).at('head', 4.1, {}, SOFT)
    a.at('neck', 3.7, {'x': -24, 'y': 26, 'r': 8}, SOFT).at('neck', 4.1, {}, SOFT)
    a.at('Xletter', 3.45, {'o': 1}, SNAP).at('Xletter', 3.65, {'o': 1, 'x': -14, 'r': -4}, OUTQ).at('Xletter', 4.0, {'o': 1, 'x': -14}, SOFT)
    # elle s'ouvre, un cœur sort et s'envole
    a.at('Xflap', 4.3, {}, ANT).at('Xflap', 4.6, {'sy': -1}, SNAP)
    a.at('Xflap', 8.6, {'sy': -1}, SOFT).at('Xflap', 8.9, {}, SNAP)
    a.at('Xbigheart', 4.6, {'o': 0, 's': .2, 'x': -14}, STEP).at('Xbigheart', 4.62, {'o': 1, 's': .3, 'x': -14}, SNAP).at('Xbigheart', 5.3, {'o': 1, 's': 1, 'x': -10, 'y': -90}, SOFT)
    for k in range(2): a.at('Xbigheart', 5.6 + k * .5, {'o': 1, 's': 1.14, 'x': -10, 'y': -96}, SOFT).at('Xbigheart', 5.85 + k * .5, {'o': 1, 's': 1, 'x': -10, 'y': -98}, SOFT)
    a.at('Xbigheart', 6.8, {'o': 1, 's': 1.05, 'x': -10, 'y': -102}, ANT).at('Xbigheart', 6.95, {'o': 0, 's': 1.5, 'x': -10, 'y': -102}, LIN)
    dirs = [(-48, -40), (-20, -66), (20, -70), (52, -42), (0, -30)]
    for i, (dx, dy) in enumerate(dirs):
        n = f'Xmh{i}'
        a.at(n, 6.92, {'o': 0, 'y': -100, 'x': -10, 's': .3}, STEP).at(n, 6.95, {'o': 1, 'y': -100, 'x': -10, 's': .5}, OUTQ).at(n, 7.7, {'o': 1, 'x': -10 + dx, 'y': -100 + dy, 's': 1, 'r': dx / 3}, SOFT).at(n, 8.3, {'o': 0, 'x': -10 + dx * 1.2, 'y': -110 + dy * 1.3, 's': .8}, LIN)
    a.look(4.6, -4, 4, .5); a.look(5.2, -4, -4, 1.5)
    a.mouth(5.0, 5.6, .8)
    a.happy(7.0, 8.3); a.at('blush', 6.9, {}, SOFT).at('blush', 7.3, {'s': 1.3}, SOFT).at('blush', 8.3, {'s': 1.3}, SOFT).at('blush', 8.8, {}, LIN)
    a.move('head', 7.0, {'r': -6, 'y': 2}, dur=.5, hold=.9, back=.5, ease_in=SOFT, ease_out=SOFT)
    # elle la reprend dans sa gueule
    a.at('head', 9.2, {}, ANT).at('head', 9.7, {'x': -58, 'y': 66, 'r': 14}, SOFT).at('head', 9.85, {'x': -58, 'y': 66, 'r': 14}, SOFT).at('head', 10.4, {}, SOFT)
    a.at('neck', 9.2, {}, ANT).at('neck', 9.7, {'x': -24, 'y': 26, 'r': 8}, SOFT).at('neck', 9.85, {'x': -24, 'y': 26, 'r': 8}, SOFT).at('neck', 10.4, {}, SOFT)
    a.at('Xletter', 9.8, {'o': 1, 'x': -14}, STEP).at('Xletter', 9.82, {'o': 0}, LIN)
    a.flick(10.8); a.blink(11.3)
    return a

def anims():
    return [menage(), cuisine(), argent(), courses(), care()]

if __name__ == '__main__':
    for a in anims(): print(write(a, 'scene'))
