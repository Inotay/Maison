# Jouer et câliner : ce qu'elle fait quand on agite le plumeau, et quand on la gratouille longtemps.
# guette (boucle) : accroupie, le derrière qui frétille, les yeux rivés sur le jouet.
# bondit (une fois) : elle s'écrase, saute et donne un coup de patte en l'air.
# calin (une fois) : elle frotte sa joue contre l'écran, les yeux fermés, petits cœurs.
from lib import *
from reactions import blushy, tail_up

INK = '#39201E'

def coeur(i, x, y, s=1):
    return f'<path id="Xc{i}" d="M{x} {y + 6 * s} c{-10 * s} {-8 * s} {-14 * s} {-16 * s} {-6 * s} {-20 * s} c{4 * s} {-2 * s} {6 * s} 0 {6 * s} {3 * s} c0 {-3 * s} {2 * s} {-5 * s} {6 * s} {-3 * s} c{8 * s} {4 * s} {4 * s} {12 * s} {-6 * s} {20 * s} z" fill="#E7776B" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round"/>'

def anims():
    out = []

    # ── guette (boucle) ──
    a = Anim('guette', 1.6, loop=True, title='Azami · Guette', desc='Accroupie, le derrière qui frétille, les yeux rivés sur le jouet : elle va bondir.')
    a.at('character', 0, {'sy': .9, 'sx': 1.04, 'y': 16}, LIN).at('character', 1.6, {'sy': .9, 'sx': 1.04, 'y': 16}, LIN)
    a.at('head', 0, {'r': 8, 'x': -10, 'y': 14}, LIN).at('head', 1.6, {'r': 8, 'x': -10, 'y': 14}, LIN)
    a.at('neck', 0, {'r': 6, 'y': 8}, LIN).at('neck', 1.6, {'r': 6, 'y': 8}, LIN)
    for e, r in (('ear-left', 8), ('ear-right', -8)): a.at(e, 0, {'r': r}, LIN).at(e, 1.6, {'r': r}, LIN)
    # le frétillement : le derrière part de gauche à droite, vite
    for leg in ('back-near', 'back-far'):
        a.cycle(leg, .24, [(0, {'x': -3}, SOFT), (.12, {'x': 3}, SOFT), (.24, {'x': -3}, SOFT)])
    a.cycle('core', .24, [(0, {'r': -1.5}, SOFT), (.12, {'r': 1.5}, SOFT), (.24, {'r': -1.5}, SOFT)])
    a.cycle('tail', .8, [(0, {'r': -6}, SOFT), (.4, {'r': 10}, SOFT), (.8, {'r': -6}, SOFT)])
    a.flick(.3, 24); a.flick(1.1, 18)
    for p in ('pupils-l', 'pupils-r'): a.at(p, 0, {'x': -9, 'y': -4, 's': 1.15}, LIN).at(p, 1.6, {'x': -9, 'y': -4, 's': 1.15}, LIN)
    out.append(a)

    # ── bondit (une fois) ──
    a = Anim('bondit', 1.5, loop=False, title='Azami · Bondit', desc='Elle s’écrase, saute et donne un grand coup de patte en l’air, puis retombe, fière.')
    c = 'character'
    a.at(c, 0, {'sy': .9, 'sx': 1.04, 'y': 16}, ANT).at(c, .18, {'sy': .82, 'sx': 1.1, 'y': 22}, SNAP)
    a.at(c, .42, {'y': -62, 'x': -18, 'r': -12, 'sx': .94, 'sy': 1.08}, 'cubic-bezier(.3,0,.7,1)')
    a.at(c, .7, {'y': 0, 'x': -10, 'sx': 1.1, 'sy': .88}, SNAP).at(c, .9, {'x': -10}, OUTQ).at(c, 1.5, {}, LIN)
    a.at('front-near', 0, {}, ANT).at('front-near', .2, {'r': 10}, SNAP).at('front-near', .38, {'r': -95, 'y': -20}, OUTQ).at('front-near', .58, {'r': -60, 'y': -12}, SOFT).at('front-near', .8, {}, LIN)
    a.at('front-far', .2, {}, SNAP).at('front-far', .4, {'r': -40}, OUTQ).at('front-far', .75, {}, LIN)
    a.at('head', 0, {'r': 8, 'x': -10, 'y': 14}, SNAP).at('head', .4, {'r': -14}, OUTQ).at('head', .9, {}, LIN)
    a.mouth(.35, .65, big=.8)
    for e in ('ear-left', 'ear-right'): a.at(e, .3, {}, SNAP).at(e, .45, {'r': 16 if e == 'ear-left' else -16}, OUTQ).at(e, .9, {}, LIN)
    a.happy(.95, 1.4); tail_up(a, .9, 1.4)
    out.append(a)

    # ── câlin (une fois) ──
    coeurs = coeur(0, 230, 160, 3) + coeur(1, 290, 120, 2.4) + coeur(2, 170, 110, 2.2)
    a = Anim('calin', 3.4, loop=False, title='Azami · Câlin', desc='Elle frotte sa joue contre l’écran, les yeux fermés, ronronne ; de petits cœurs montent.', extra_svg=coeurs)
    for i, (x, y) in enumerate(((230, 160), (290, 120), (170, 110))): a.hidden.add(f'Xc{i}'); a.origins[f'Xc{i}'] = f'{x}px {y}px'
    a.idle(breathe=1.2, tail=3.4, depth=.6)   # respiration rapide : le ronron
    a.happy(.25, 3.0); blushy(a, .3, 3.0, 1.4); tail_up(a, .3, 3.0, -22)
    # la tête frotte : penchée, va-et-vient contre la vitre
    h = 'head'
    a.at(h, 0, {}, SOFT).at(h, .35, {'r': -16, 'x': -12, 'y': 4}, SOFT)
    for k in range(4):
        t = .35 + k * .6
        a.at(h, t + .3, {'r': -6, 'x': -20, 'y': 2}, SOFT).at(h, t + .6, {'r': -18, 'x': -10, 'y': 6}, SOFT)
    a.at(h, 3.0, {'r': -10, 'x': -8, 'y': 4}, SOFT).at(h, 3.4, {}, LIN)
    a.at('neck', 0, {}, SOFT).at('neck', .35, {'r': -6, 'x': -4}, SOFT).at('neck', 3.0, {'r': -6, 'x': -4}, SOFT).at('neck', 3.4, {}, LIN)
    for e, r in (('ear-left', -10), ('ear-right', 6)): a.at(e, .3, {}, SOFT).at(e, .6, {'r': r}, SOFT).at(e, 3.0, {'r': r}, SOFT).at(e, 3.3, {}, LIN)
    for i, t in enumerate((.6, 1.3, 2.0)):
        a.at(f'Xc{i}', t, {'o': 0, 's': .4}, STEP).at(f'Xc{i}', t + .05, {'o': 1, 's': .6}, OUTQ).at(f'Xc{i}', t + .3, {'o': 1, 'y': -14, 's': 1}, SOFT).at(f'Xc{i}', t + .9, {'o': 1, 'y': -40, 'x': 6, 's': 1}, SOFT).at(f'Xc{i}', t + 1.3, {'o': 0, 'y': -60, 'x': 8, 's': 1.05}, LIN)
    out.append(a)
    # ── court (boucle) : elle court sur place (dans l'app, c'est l'image qui se déplace vers le plumeau) ──
    a = Anim('court', .36, loop=True, title='Azami · Court', desc='Elle court, les oreilles en arrière, la queue tendue : elle file vers le plumeau.')
    P = .18
    a.cycle('front-near', P, [(0, {'r': 26}, SOFT), (P / 2, {'r': -26}, SOFT), (P, {'r': 26}, SOFT)])
    a.cycle('front-far', P, [(0, {'r': -26}, SOFT), (P / 2, {'r': 26}, SOFT), (P, {'r': -26}, SOFT)])
    a.cycle('back-near', P, [(0, {'r': -24}, SOFT), (P / 2, {'r': 24}, SOFT), (P, {'r': -24}, SOFT)])
    a.cycle('back-far', P, [(0, {'r': 24}, SOFT), (P / 2, {'r': -24}, SOFT), (P, {'r': 24}, SOFT)])
    a.cycle('core', P, [(0, {'y': 0, 'r': -2}, SOFT), (P / 2, {'y': -7, 'r': 1}, SOFT), (P, {'y': 0, 'r': -2}, SOFT)])
    a.cycle('head', P, [(0, {'y': 2, 'x': -4}, SOFT), (P / 2, {'y': -4, 'x': -4}, SOFT), (P, {'y': 2, 'x': -4}, SOFT)])
    for e, r in (('ear-left', 26), ('ear-right', -26)): a.at(e, 0, {'r': r}, LIN).at(e, .36, {'r': r}, LIN)
    a.at('tail', 0, {'r': 34}, LIN).at('tail', .36, {'r': 34}, LIN)
    for p in ('pupils-l', 'pupils-r'): a.at(p, 0, {'x': -9, 'y': -2, 's': 1.1}, LIN).at(p, .36, {'x': -9, 'y': -2, 's': 1.1}, LIN)
    out.append(a)
    return out

if __name__ == '__main__':
    for a in anims(): print(write(a, 'reaction'))
