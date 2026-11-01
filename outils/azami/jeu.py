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
    # (départ = la pose de « guette », pour qu'il n'y ait pas de saut d'image entre les deux)
    a.at(c, 0, {'sy': .86, 'sx': 1.06, 'y': 24}, ANT).at(c, .18, {'sy': .8, 'sx': 1.1, 'y': 26}, SNAP)
    a.at(c, .42, {'y': -62, 'x': -18, 'r': -12, 'sx': .94, 'sy': 1.08}, 'cubic-bezier(.3,0,.7,1)')
    a.at(c, .7, {'y': 0, 'x': -10, 'sx': 1.1, 'sy': .88}, SNAP).at(c, .9, {'x': -10}, OUTQ).at(c, 1.5, {}, LIN)
    a.at('front-near', 0, {'r': 18, 'y': -6}, ANT).at('front-near', .2, {'r': 10}, SNAP).at('front-near', .38, {'r': -95, 'y': -20}, OUTQ).at('front-near', .58, {'r': -60, 'y': -12}, SOFT).at('front-near', .8, {}, LIN)
    a.at('front-far', 0, {'r': 14, 'y': -6}, ANT).at('front-far', .2, {}, SNAP).at('front-far', .4, {'r': -40}, OUTQ).at('front-far', .75, {}, LIN)
    a.at('head', 0, {'r': 10, 'x': -16, 'y': 22}, SNAP).at('head', .4, {'r': -14}, OUTQ).at('head', .9, {}, LIN)
    a.at('neck', 0, {'r': 8, 'y': 12, 'x': -4}, ANT).at('neck', .3, {}, OUTQ)
    a.mouth(.35, .65, big=.8)
    a.at('ground-shadow', 0, {'sx': 1.04}, ANT).at('ground-shadow', .18, {'sx': 1.08}, SNAP).at('ground-shadow', .42, {'sx': .62, 'sy': .62}, 'cubic-bezier(.3,0,.7,1)').at('ground-shadow', .7, {'sx': 1.08}, SNAP).at('ground-shadow', .9, {}, OUTQ)
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
    # ── rate (une fois) : elle retombe dans le vide, cherche autour d'elle, secoue la tête, un peu vexée ──
    a = Anim('rate', 1.4, loop=False, title='Azami · Raté', desc='Elle retombe sans rien : regarde à gauche, à droite, cligne, secoue la tête, la queue fouette.')
    c = 'character'
    a.at(c, 0, {'y': -52, 'x': -17, 'r': -11, 'sx': .95, 'sy': 1.06}, 'cubic-bezier(.5,0,1,1)').at(c, .14, {'y': 0, 'x': -10, 'sx': 1.12, 'sy': .86}, SNAP).at(c, .32, {}, OUTQ).at(c, 1.4, {}, LIN)
    a.at('front-near', 0, {'r': -82, 'y': -17}, SOFT).at('front-near', .26, {}, OUTQ)
    a.at('front-far', 0, {'r': -30}, SOFT).at('front-far', .26, {}, OUTQ)
    a.look(.35, -12, 0, .25); a.look(.75, 12, 0, .2)
    a.at('head', 0, {'r': -14}, SOFT).at('head', .3, {}, SOFT).at('head', .45, {'r': -8}, SOFT).at('head', .8, {'r': 8}, SOFT).at('head', 1.0, {}, SOFT)
    a.blink(1.02); a.shake('head', 1.08, amp=7, n=4, period=.06)
    for e, r in (('ear-left', -14), ('ear-right', 14)): a.at(e, .15, {}, SNAP).at(e, .3, {'r': r}, OUTQ).at(e, 1.2, {'r': r}, ANT).at(e, 1.4, {}, LIN)
    a.flick(.4, 30); a.flick(.9, 24)
    out.append(a)

    # ── emporte (boucle) : elle court la tête haute, la plume dans la gueule (la plume est dessinée dans sa bouche) ──
    plume = f'<g id="Xplume" transform="translate(158 266) rotate(62) scale(1.55)"><path d="M0 0 C-14 14 -18 40 -10 70 C-6 60 -2 52 0 46 C2 52 6 60 10 70 C18 40 14 14 0 0Z" fill="#E7776B" stroke="{INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M0 4 V66 M0 22 l-8 7 M0 36 l-9 8 M0 22 l8 7 M0 36 l9 8" fill="none" stroke="{INK}" stroke-width="2.2" stroke-linecap="round"/></g>'
    a = Anim('emporte', .36, loop=True, title='Azami · Emporte la plume', desc='Elle file, fière, la plume arrachée dans la gueule.', head_extra=plume)
    P = .18
    a.cycle('front-near', P, [(0, {'r': 26}, SOFT), (P / 2, {'r': -26}, SOFT), (P, {'r': 26}, SOFT)])
    a.cycle('front-far', P, [(0, {'r': -26}, SOFT), (P / 2, {'r': 26}, SOFT), (P, {'r': -26}, SOFT)])
    a.cycle('back-near', P, [(0, {'r': -24}, SOFT), (P / 2, {'r': 24}, SOFT), (P, {'r': -24}, SOFT)])
    a.cycle('back-far', P, [(0, {'r': 24}, SOFT), (P / 2, {'r': -24}, SOFT), (P, {'r': 24}, SOFT)])
    a.cycle('core', P, [(0, {'y': 0}, SOFT), (P / 2, {'y': -7}, SOFT), (P, {'y': 0}, SOFT)])
    a.at('head', 0, {'r': -8, 'y': -4}, LIN).at('head', .36, {'r': -8, 'y': -4}, LIN)
    for e, r in (('ear-left', 10), ('ear-right', -10)): a.at(e, 0, {'r': r}, LIN).at(e, .36, {'r': r}, LIN)
    a.at('tail', 0, {'r': -24}, LIN).at('tail', .36, {'r': -24}, LIN)
    for e in ('eye-l', 'eye-r'): a.base[e] = {'o': 0}; a.at(e, 0, {'o': 0}, LIN).at(e, .36, {'o': 0}, LIN)
    a.base['eyes-happy'] = {'o': 1}; a.at('eyes-happy', 0, {'o': 1}, LIN).at('eyes-happy', .36, {'o': 1}, LIN); a.hidden.discard('eyes-happy')
    out.append(a)
    out = [x for x in out if x.name not in ('guette', 'court')]

    # ── guette (boucle) : la préparation au saut. Aplatie, la tête basse et tendue, les fesses qui frétillent de plus
    # en plus vite, les pattes arrière qui piétinent, la queue qui fouette, les pupilles énormes.
    GD = .66
    a = Anim('guette', GD, loop=True, title='Azami · Prête à bondir', desc='Aplatie, les fesses qui frétillent, les pattes arrière qui piétinent : elle va bondir.')
    base = {'character': {'sy': .86, 'sx': 1.06, 'y': 24}, 'head': {'r': 10, 'x': -16, 'y': 22}, 'neck': {'r': 8, 'y': 12, 'x': -4},
            'ear-left': {'r': 14}, 'ear-right': {'r': -6}, 'front-near': {'r': 18, 'y': -6}, 'front-far': {'r': 14, 'y': -6}}
    for k, v in base.items(): a.base[k] = v; a.at(k, 0, v, LIN).at(k, GD, v, LIN)
    for p_ in ('pupils-l', 'pupils-r'): a.at(p_, 0, {'x': -6, 'y': -1, 's': 1.06}, LIN).at(p_, GD, {'x': -6, 'y': -1, 's': 1.12}, LIN)
    # le frétillement : lent puis de plus en plus vite (le bassin et les pattes arrière)
    pts_core, pts_bn, pts_bf = [], [], []
    t, per, k = 0, .2, 0
    while t < GD - 1e-6:
        sgn = 1 if k % 2 == 0 else -1
        pts_core.append((round(t, 3), {'r': 2.8 * sgn, 'x': 2 * sgn}, SOFT)); pts_bn.append((round(t, 3), {'x': 5 * sgn, 'r': -6 * sgn}, SOFT)); pts_bf.append((round(t, 3), {'x': 5 * sgn, 'r': 6 * sgn}, SOFT))
        t += per; per = max(.07, per * .74); k += 1
    for tr, pts in (('core', pts_core), ('back-near', pts_bn), ('back-far', pts_bf)):
        for (tt, v, e) in pts: a.at(tr, tt, v, e)
        a.at(tr, GD, pts[0][1], LIN)
    a.cycle('tail', .33, [(0, {'r': -10}, SOFT), (.165, {'r': 14}, SOFT), (.33, {'r': -10}, SOFT)])
    a.flick(.15, 28); a.flick(.45, 30)
    out.append(a)

    # ── court (boucle) : le galop. Pattes avant ensemble, pattes arrière ensemble (un peu décalées, proche/loin) ;
    # le corps s'étire en l'air, se ramasse au sol ; la tête compense ; la queue ondule.
    D = .42
    a = Anim('court', D, loop=True, title='Azami · Galop', desc='Elle galope : le corps s’étire en l’air et se ramasse au sol, les oreilles en arrière, la queue qui ondule.')
    def g(tr, pts): a.cycle(tr, D, pts + [(D, pts[0][1], SOFT)])
    g('front-near', [(0, {'r': 38}, SOFT), (.16, {'r': 10}, SOFT), (.27, {'r': -30}, SOFT)])
    g('front-far', [(0, {'r': 30}, SOFT), (.19, {'r': 4}, SOFT), (.3, {'r': -34}, SOFT)])
    g('back-near', [(0, {'r': -38}, SOFT), (.14, {'r': -10}, SOFT), (.26, {'r': 32}, SOFT)])
    g('back-far', [(0, {'r': -32}, SOFT), (.17, {'r': -4}, SOFT), (.29, {'r': 36}, SOFT)])
    g('core', [(0, {'sx': 1.09, 'sy': .95, 'y': -4}, SOFT), (.13, {'sx': 1.02, 'y': -9}, SOFT), (.27, {'sx': .93, 'sy': 1.05, 'y': 1, 'r': -3}, SOFT)])
    g('character', [(0, {'y': -10}, SOFT), (.12, {'y': -16}, SOFT), (.27, {'y': 0}, SOFT)])
    g('head', [(0, {'x': -8, 'y': 4}, SOFT), (.13, {'x': -8, 'y': 0}, SOFT), (.27, {'x': -4, 'y': 8, 'r': 4}, SOFT)])
    g('neck', [(0, {'x': -4}, SOFT), (.27, {'x': -2, 'y': 4}, SOFT)])
    g('tail', [(0, {'r': 40}, SOFT), (.21, {'r': 28}, SOFT)])
    g('tail-tip', [(0, {'r': -14}, SOFT), (.21, {'r': 16}, SOFT)])
    for e, r in (('ear-left', 28), ('ear-right', -28)): a.base[e] = {'r': r}; a.at(e, 0, {'r': r}, LIN).at(e, D, {'r': r}, LIN)
    for p_ in ('pupils-l', 'pupils-r'): a.at(p_, 0, {'x': -6, 'y': -1}, LIN).at(p_, D, {'x': -6, 'y': -1}, LIN)
    out.append(a)

    # ── marche (boucle) : elle s'approche à pas de velours, pattes en diagonale, la tête basse et attentive.
    D = .9
    a = Anim('marche', D, loop=True, title='Azami · Marche', desc='Elle s’approche à pas de velours, la tête basse, les yeux sur la plume.')
    def m(tr, amp, phase=0):
        q = D / 2
        pts = [(0, {'r': amp if phase == 0 else -amp}, SOFT), (q, {'r': -amp if phase == 0 else amp}, SOFT)]
        a.cycle(tr, D, pts + [(D, pts[0][1], SOFT)])
    m('front-near', 18, 0); m('back-far', 16, 1); m('front-far', 18, 1); m('back-near', 16, 0)
    a.cycle('core', D / 2, [(0, {'y': 0}, SOFT), (D / 4, {'y': -2.5}, SOFT), (D / 2, {'y': 0}, SOFT)])
    a.cycle('head', D / 2, [(0, {'x': -8, 'y': 10, 'r': 6}, SOFT), (D / 4, {'x': -8, 'y': 7, 'r': 4}, SOFT), (D / 2, {'x': -8, 'y': 10, 'r': 6}, SOFT)])
    a.cycle('tail', D, [(0, {'r': -6}, SOFT), (D / 2, {'r': 8}, SOFT), (D, {'r': -6}, SOFT)])
    for e, r in (('ear-left', 10), ('ear-right', -4)): a.base[e] = {'r': r}; a.at(e, 0, {'r': r}, LIN).at(e, D, {'r': r}, LIN)
    for p_ in ('pupils-l', 'pupils-r'): a.at(p_, 0, {'x': -6, 'y': 0}, LIN).at(p_, D, {'x': -6, 'y': 0}, LIN)
    out.append(a)
    return out

if __name__ == '__main__':
    for a in anims(): print(write(a, 'reaction'))
