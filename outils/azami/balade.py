# Quand on l'oublie plusieurs jours : elle part se balader (part), se cache ailleurs dans l'app,
# fait grève si ça dure (greve), et saute de joie quand on la retrouve (retrouvailles).
from lib import *
from reactions import blushy, tail_up
from jeu import coeur

def marche(a, period=.42, amp=16):
    a.cycle('front-near', period, [(0, {'r': amp}, SOFT), (period / 2, {'r': -amp}, SOFT), (period, {'r': amp}, SOFT)])
    a.cycle('front-far', period, [(0, {'r': -amp}, SOFT), (period / 2, {'r': amp}, SOFT), (period, {'r': -amp}, SOFT)])
    a.cycle('back-near', period, [(0, {'r': -amp}, SOFT), (period / 2, {'r': amp}, SOFT), (period, {'r': -amp}, SOFT)])
    a.cycle('back-far', period, [(0, {'r': amp}, SOFT), (period / 2, {'r': -amp}, SOFT), (period, {'r': amp}, SOFT)])
    a.cycle('core', period, [(0, {'y': 0}, SOFT), (period / 4, {'y': -3}, SOFT), (period / 2, {'y': 0}, SOFT), (period * .75, {'y': -3}, SOFT), (period, {'y': 0}, SOFT)])

def anims():
    out = []

    # ── part (une fois) : elle se retourne, jette un dernier regard, et s'en va par la droite ──
    a = Anim('part', 3.0, loop=False, title='Azami · Part en balade', desc='Elle se retourne, jette un regard par-dessus l’épaule, et s’en va tranquillement par la droite.')
    marche(a)
    c = 'character'
    # elle marche sur place : dans l'app, c'est l'image entière qui s'en va vers la droite (rien ne la coupe)
    a.at(c, 0, {'sx': -1}, LIN).at(c, 3.0, {'sx': -1}, LIN)
    a.at('head', 0, {}, SOFT).at('head', .3, {'r': -14, 'x': 10}, OUTQ).at('head', 1.0, {'r': -14, 'x': 10}, ANT).at('head', 1.3, {}, SOFT).at('head', 3.0, {}, LIN)
    a.look(.3, 8, 0, .7); a.blink(1.6)
    a.at('tail', 0, {'r': -18}, LIN).at('tail', 3.0, {'r': -18}, LIN)
    out.append(a)

    # ── grève (boucle) : assise, dos tourné, oreilles plates, rien ne bouge sauf le bout de la queue ──
    a = Anim('greve', 4.0, loop=True, title='Azami · Grève', desc='Assise, le dos tourné, les oreilles plaquées : elle fait grève. Seul le bout de sa queue bat.')
    a.base['character'] = {'sx': -1}
    a.at('character', 0, {'sx': -1, 'sy': .96, 'y': 6}, LIN).at('character', 4.0, {'sx': -1, 'sy': .96, 'y': 6}, LIN)
    a.idle(breathe=4.0, tail=40, depth=.5)
    for e, r in (('ear-left', -30), ('ear-right', 30)): a.at(e, 0, {'r': r}, LIN).at(e, 4.0, {'r': r}, LIN)
    # on la voit de face : elle ferme les yeux et lève le menton, « pff »
    a.at('head', 0, {'r': 12, 'x': 4, 'y': -6}, LIN).at('head', 4.0, {'r': 12, 'x': 4, 'y': -6}, LIN)
    for k, v in (('eye-l', {'o': 0}), ('eye-r', {'o': 0}), ('eyes-blink', {'o': 1})): a.base[k] = v; a.at(k, 0, v, LIN).at(k, 4.0, v, LIN)
    a.hidden.discard('eyes-blink')
    a.at('mouth-smile', 0, {'o': 0}, LIN).at('mouth-smile', 4.0, {'o': 0}, LIN)
    a.at('tail', 0, {'r': 14}, LIN).at('tail', 4.0, {'r': 14}, LIN)
    a.flick(.8, 26); a.flick(2.6, 20)
    out.append(a)

    # ── retrouvailles (une fois) : deux sauts de joie, les yeux fermés, des cœurs ──
    coeurs = coeur(0, 230, 160, 3) + coeur(1, 300, 110, 2.4) + coeur(2, 160, 105, 2.2)
    a = Anim('retrouvailles', 2.6, loop=False, title='Azami · Retrouvailles', desc='Elle saute deux fois de joie, les yeux fermés, la queue en l’air ; des cœurs montent.', extra_svg=coeurs)
    for i, (x, y) in enumerate(((230, 160), (300, 110), (160, 105))): a.hidden.add(f'Xc{i}'); a.origins[f'Xc{i}'] = f'{x}px {y}px'
    a.idle(breathe=1.4, tail=2.6, depth=.6)
    a.hop(.05, h=40, air=.32, tilt=-6); a.hop(.75, h=28, air=.26, tilt=5)
    a.mouth(.2, .55, big=.8)
    a.happy(.6, 2.3); blushy(a, .4, 2.3, 1.4); tail_up(a, .1, 2.3, -26)
    for e in ('ear-left', 'ear-right'): a.at(e, 0, {}, SNAP).at(e, .2, {'r': -10 if e == 'ear-left' else 10}, OUTQ).at(e, 2.2, {'r': -6 if e == 'ear-left' else 6}, SOFT).at(e, 2.6, {}, LIN)
    for i, t in enumerate((.3, .7, 1.1)):
        a.at(f'Xc{i}', t, {'o': 0, 's': .4}, STEP).at(f'Xc{i}', t + .05, {'o': 1, 's': .6}, OUTQ).at(f'Xc{i}', t + .3, {'o': 1, 'y': -14, 's': 1}, SOFT).at(f'Xc{i}', t + .9, {'o': 1, 'y': -40, 'x': 6, 's': 1}, SOFT).at(f'Xc{i}', t + 1.3, {'o': 0, 'y': -60, 'x': 8, 's': 1.05}, LIN)
    out.append(a)
    return out

if __name__ == '__main__':
    for a in anims(): print(write(a, 'reaction'))
