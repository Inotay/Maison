# La vie d'Azami quand on ne fait rien : elle regarde par la fenêtre (les jardins, les oiseaux, les voisins),
# et elle fait sa toilette.
from lib import *
from reactions import blushy, tail_up

INK = '#39201E'

# la fenêtre, derrière elle : dessinée au trait, un ciel clair, une branche, un oiseau qui passe
# la fenêtre est devant son nez, à gauche (le dessin regarde à gauche), à hauteur de ses yeux
FENETRE = f'''<g id="Xfenetre">
  <rect x="-8" y="52" width="132" height="190" rx="10" fill="#CFE9F7" stroke="{INK}" stroke-width="7"/>
  <path d="M-8 140 H124 M58 52 V242" stroke="{INK}" stroke-width="6"/>
  <path d="M-2 214 C26 200 44 220 70 208 C88 200 104 212 118 204" stroke="#8DBF8A" stroke-width="16" stroke-linecap="round" fill="none"/>
  <path d="M70 82 C88 74 100 92 118 86" stroke="#7A5A40" stroke-width="5" stroke-linecap="round" fill="none"/>
  <circle cx="98" cy="80" r="8" fill="#8DBF8A"/><circle cx="114" cy="90" r="6" fill="#8DBF8A"/>
  <rect x="-16" y="238" width="152" height="14" rx="6" fill="#E8D3B4" stroke="{INK}" stroke-width="6"/>
</g>'''
OISEAU = f'<g id="Xoiseau"><path d="M0 0 q14 -14 28 0 q14 -14 28 0" stroke="{INK}" stroke-width="6" fill="none" stroke-linecap="round"/></g>'

def assise(a, D):
    """Assise : l'arrière-train posé, les pattes arrière repliées, la queue enroulée devant."""
    pose = {'back-near': {'r': 70, 'x': -10, 'y': -16}, 'back-far': {'r': 66, 'x': -8, 'y': -18}, 'core': {'r': -14, 'y': 6, 'x': 6},
            'character': {'y': 8}, 'tail': {'r': 64, 'y': 4}, 'tail-tip': {'r': -46}}
    for k, v in pose.items(): a.base[k] = v; a.at(k, 0, v, LIN).at(k, D, v, LIN)

def anims():
    out = []

    # ── fenêtre (boucle) : assise, le nez levé vers la vitre ; ses yeux suivent un oiseau, ses oreilles pivotent ;
    # quand l'oiseau passe tout près, sa mâchoire claque (le petit « cacardage » des chats devant les oiseaux).
    D = 6.0
    a = Anim('fenetre', D, loop=True, title='Azami · À la fenêtre', desc='Assise devant la fenêtre, elle suit un oiseau des yeux, les oreilles qui pivotent, et claque des dents quand il passe.', under_svg=FENETRE, extra_svg=OISEAU)
    a.hidden.add('Xoiseau'); a.origins['Xoiseau'] = '0px 0px'
    assise(a, D)
    a.idle(breathe=3.6, tail=60, depth=.6)
    a.at('head', 0, {'r': -18, 'x': -20, 'y': -12}, SOFT).at('head', 1.8, {'r': -18, 'x': -20, 'y': -12}, SOFT).at('head', 2.6, {'r': -24, 'x': -24, 'y': -16}, SOFT).at('head', 3.6, {'r': -12, 'x': -18, 'y': -10}, SOFT).at('head', D, {'r': -18, 'x': -20, 'y': -12}, LIN)
    a.at('neck', 0, {'r': 6, 'y': -6}, LIN).at('neck', D, {'r': 6, 'y': -6}, LIN)
    # l'oiseau traverse le ciel de droite à gauche
    a.at('Xoiseau', 0, {'o': 0, 'x': 110, 'y': 70}, STEP).at('Xoiseau', 1.6, {'o': 0, 'x': 110, 'y': 70}, STEP).at('Xoiseau', 1.62, {'o': 1, 'x': 100, 'y': 70}, LIN)
    a.at('Xoiseau', 2.6, {'o': 1, 'x': 40, 'y': 108, 's': 1.1}, LIN).at('Xoiseau', 3.6, {'o': 1, 'x': -40, 'y': 76}, LIN).at('Xoiseau', 3.62, {'o': 0, 'x': -40, 'y': 76}, STEP)
    a.cycle('Xoiseau', .3, [(0, {}, SOFT), (.15, {'sy': .5}, SOFT), (.3, {}, SOFT)]) if False else None
    for p in ('pupils-l', 'pupils-r'):
        a.at(p, 0, {'x': -6, 'y': -6}, SOFT).at(p, 1.6, {'x': -6, 'y': -6}, SOFT).at(p, 1.7, {'x': -2, 'y': -8}, SOFT).at(p, 2.6, {'x': -8, 'y': -4, 's': 1.12}, SOFT).at(p, 3.6, {'x': -12, 'y': -7}, SOFT).at(p, 4.2, {'x': -6, 'y': -6}, SOFT).at(p, D, {'x': -6, 'y': -6}, LIN)
    # la mâchoire qui claque quand il passe devant elle
    for t in (2.5, 2.66, 2.82, 2.98):
        a.at('mouth-open', t, {'s': .2, 'o': 0}, STEP).at('mouth-open', t + .02, {'s': .5, 'o': 1}, SNAP).at('mouth-open', t + .1, {'s': .2, 'o': 1}, STEP).at('mouth-open', t + .12, {'s': .2, 'o': 0}, LIN)
    a.hidden.add('mouth-open')
    a.ear('r', 1.7, 16, .4); a.ear('l', 3.4, 14, .3); a.ear('r', 4.8, 10)
    a.flick(2.7, 30); a.flick(4.9, 18)
    a.blink(5.2)
    out.append(a)

    # ── toilette (une fois) : elle lève la patte, la lèche, puis se la passe sur la tête et derrière l'oreille.
    D = 4.4
    a = Anim('toilette_patte', D, loop=False, title='Azami · Toilette', desc='Elle lèche sa patte, puis se la passe sur la tête et derrière l’oreille, les yeux mi-clos.')
    assise(a, D)
    a.idle(breathe=3.0, tail=60, depth=.5)
    fn = 'front-near'
    # la patte monte vers la bouche, petits coups de langue, puis elle frotte la tête
    a.at(fn, 0, {}, ANT).at(fn, .35, {'r': -78, 'x': 10, 'y': -36}, OUTQ).at(fn, 1.9, {'r': -78, 'x': 10, 'y': -36}, SOFT)
    a.at(fn, 2.2, {'r': -118, 'x': 2, 'y': -84}, SOFT).at(fn, 2.6, {'r': -104, 'x': 8, 'y': -74}, SOFT).at(fn, 3.0, {'r': -124, 'x': 0, 'y': -92}, SOFT).at(fn, 3.4, {'r': -104, 'x': 8, 'y': -74}, SOFT).at(fn, 3.9, {}, OUTQ).at(fn, D, {}, LIN)
    a.at('head', 0, {}, SOFT).at('head', .35, {'r': 16, 'y': 10, 'x': 8}, SOFT).at('head', 1.9, {'r': 16, 'y': 10, 'x': 8}, SOFT).at('head', 2.2, {'r': 30, 'y': 22, 'x': 10}, SOFT)
    a.at('head', 2.6, {'r': 24, 'y': 18, 'x': 8}, SOFT).at('head', 3.0, {'r': 32, 'y': 24, 'x': 10}, SOFT).at('head', 3.4, {'r': 24, 'y': 18, 'x': 8}, SOFT).at('head', 3.9, {}, OUTQ).at('head', D, {}, LIN)
    t = .5
    while t < 1.8:
        a.at('mouth-open', t, {'s': .2, 'o': 0}, STEP).at('mouth-open', t + .02, {'s': .45, 'o': 1}, SNAP).at('mouth-open', t + .14, {'s': .2, 'o': 1}, STEP).at('mouth-open', t + .16, {'s': .2, 'o': 0}, LIN)
        t += .28
    a.hidden.add('mouth-open')
    a.happy(.4, 3.8)
    a.at('ear-left', 2.2, {}, SOFT).at('ear-left', 2.4, {'r': -26}, SOFT).at('ear-left', 3.4, {'r': -26}, SOFT).at('ear-left', 3.8, {}, LIN)
    a.flick(1.0, 16)
    out.append(a)
    return out

if __name__ == '__main__':
    for a in anims(): print(write(a, 'reaction'))
