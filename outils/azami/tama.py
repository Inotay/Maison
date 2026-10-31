# Le tamagotchi : ce qu'elle fait quand on s'occupe d'elle, et quand on ne s'en occupe pas.
# Réactions jouées une fois (mange, ragoût, friandise, boit, zoomies) ou en boucle (faim, boude, dort).
from lib import *
from reactions import blushy, tail_up

INK = '#39201E'
def bowl(gid, x=118, y=396, fill='#E7776B', contenu=''):
    return f'''<g id="{gid}"><ellipse cx="{x}" cy="{y + 6}" rx="52" ry="11" fill="{INK}" opacity=".12"/>
<path d="M{x - 48} {y - 10} Q{x - 44} {y + 10} {x - 30} {y + 12} H{x + 30} Q{x + 44} {y + 10} {x + 48} {y - 10} Z" fill="{fill}" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>
<ellipse cx="{x}" cy="{y - 10}" rx="48" ry="11" fill="{fill}" stroke="{INK}" stroke-width="5"/>{contenu}</g>'''
def croquettes(x=118, y=386, n=7):
    pts = [(-26, 0), (-12, -3), (2, 1), (16, -2), (28, 1), (-6, 4), (10, 5)][:n]
    return ''.join(f'<ellipse cx="{x + dx}" cy="{y + dy}" rx="6" ry="4" fill="#C98B5E" stroke="{INK}" stroke-width="2"/>' for dx, dy in pts)
def sauce(x=118, y=386):
    return f'<ellipse cx="{x}" cy="{y}" rx="40" ry="8" fill="#D9742F"/><ellipse cx="{x - 10}" cy="{y - 1}" rx="9" ry="5" fill="#8E4A1E"/><ellipse cx="{x + 14}" cy="{y + 1}" rx="7" ry="4" fill="#8E4A1E"/>'
def eau(x=118, y=386):
    return f'<ellipse cx="{x}" cy="{y}" rx="40" ry="8" fill="#9AD3F2"/><ellipse cx="{x - 8}" cy="{y - 2}" rx="12" ry="3" fill="#FFFFFF" opacity=".6"/>'

def head_down(a, t0, t1, deep=1.0):
    """Elle baisse la tête vers la gamelle de t0 à t1."""
    a.at('head', t0, {}, ANT).at('head', t0 + .35, {'r': 26 * deep, 'x': -14 * deep, 'y': 26 * deep}, OUTQ)
    a.at('head', t1, {'r': 26 * deep, 'x': -14 * deep, 'y': 26 * deep}, ANT).at('head', t1 + .4, {}, LIN)
    a.at('neck', t0, {}, ANT).at('neck', t0 + .35, {'r': 10 * deep, 'y': 6 * deep}, OUTQ).at('neck', t1, {'r': 10 * deep, 'y': 6 * deep}, ANT).at('neck', t1 + .4, {}, LIN)

def chew(a, t0, t1, period=.22):
    t = t0
    while t < t1:
        a.mouth(t, t + period * .6, big=.55)
        a.at('head', t + period * .3, {'r': 26, 'x': -14, 'y': 24}, SOFT)   # petit à-coup de mastication
        t += period

def lap(a, t0, t1, period=.3):
    t = t0
    while t < t1:
        a.mouth(t, t + .14, big=.4); t += period

def anims():
    out = []
    R = lambda name, D, loop=False, **k: Anim(name, D, loop=loop, **k)

    # ── mange (croquettes) ──
    a = R('mange', 5.2, title='Azami · Mange', desc='Elle plonge le museau dans sa gamelle de croquettes, mastique, et relève la tête, ravie.', extra_svg=bowl('Xbol', contenu=croquettes()))
    a.idle(breathe=2.6, tail=3.4); a.look(.1, -8, 6, 1.0); a.ear('l', .1, 10)
    head_down(a, .4, 3.4); chew(a, .9, 3.3)
    a.cycle('tail', 1.2, [(0, {}, SOFT), (.6, {'r': 9}, SOFT), (1.2, {}, SOFT)])
    a.happy(3.9, 5.0); blushy(a, 3.9, 5.0); tail_up(a, 3.9, 5.0); a.blink(4.9)
    out.append(a)

    # ── ragoût ──
    a = R('ragout', 5.6, title='Azami · Ragoût', desc='Du ragoût ! Elle y plonge le museau, ressort avec de la sauce sur les moustaches, et ronronne.', extra_svg=bowl('Xbol', fill='#F4C76B', contenu=sauce()) + f'<g id="Xsauce"><ellipse cx="166" cy="266" rx="9" ry="5" fill="#D9742F"/><ellipse cx="190" cy="270" rx="6" ry="4" fill="#D9742F"/></g>')
    a.hidden.add('Xsauce'); a.origins['Xsauce'] = '178px 268px'
    a.idle(breathe=2.8, tail=3.6); a.look(.1, -8, 6, .8); a.hop(.3, h=14, air=.2)
    head_down(a, .8, 3.8); lap(a, 1.2, 3.7, .26)
    a.at('Xsauce', 3.8, {'o': 0}, STEP).at('Xsauce', 3.82, {'o': 1}, STEP).at('Xsauce', 5.6, {'o': 1}, LIN)
    a.happy(4.3, 5.4); blushy(a, 4.3, 5.4, 1.4); tail_up(a, 4.2, 5.4, -20)
    out.append(a)

    # ── friandise attrapée au vol ──
    treat = f'<g id="Xtreat"><path d="M0 -9 L8 0 L0 9 L-8 0 Z" fill="#E7776B" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/><circle cx="0" cy="0" r="2" fill="#FFF2D9"/></g>'
    a = R('friandise', 3.6, title='Azami · Friandise', desc='Une friandise vole, elle saute et l’attrape au vol.', extra_svg=f'<g id="Xtreatwrap" transform="translate(90 120)">{treat}</g>')
    a.hidden.add('Xtreatwrap'); a.origins['Xtreatwrap'] = '90px 120px'
    a.idle(breathe=2.2, tail=3.6)
    a.at('Xtreatwrap', 0, {'o': 0, 'x': -40, 'y': 40, 's': .6}, STEP).at('Xtreatwrap', .05, {'o': 1, 'x': -40, 'y': 40, 's': .8}, LIN)
    a.at('Xtreatwrap', .9, {'o': 1, 'x': 60, 'y': 110, 'r': 180, 's': 1}, 'cubic-bezier(.3,0,.7,1)').at('Xtreatwrap', 1.1, {'o': 1, 'x': 80, 'y': 150, 'r': 220, 's': .6}, LIN).at('Xtreatwrap', 1.12, {'o': 0, 'x': 80, 'y': 150}, STEP)
    a.look(.2, -6, -8, .8); a.ear('r', .3, 14)
    a.hop(.7, h=34, air=.3, tilt=-8); a.mouth(.95, 1.25, big=.9)
    a.happy(1.5, 2.8); blushy(a, 1.5, 2.8); tail_up(a, 1.4, 2.9); a.blink(3.3)
    out.append(a)

    # ── boit ──
    a = R('boit', 4.6, title='Azami · Boit', desc='Elle lape l’eau de sa gamelle, la langue qui claque, puis secoue la tête.', extra_svg=bowl('Xbol', fill='#78C8F0', contenu=eau()))
    a.idle(breathe=2.8, tail=4.6); a.look(.1, -8, 6, .6)
    head_down(a, .4, 3.2, .9); lap(a, .8, 3.1, .28)
    a.shake('head', 3.7, amp=6, n=4, period=.07); a.blink(4.3)
    out.append(a)

    # ── faim (boucle) : elle regarde la gamelle vide, le ventre gargouille ──
    ondes = ''.join(f'<path id="Xonde{i}" d="M{300 + i * 14} 318 q8 -8 16 0 q8 8 16 0" stroke="{INK}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>' for i in range(2))
    a = R('faim', 4.0, loop=True, title='Azami · Faim', desc='La gamelle est vide. Elle la fixe, le ventre gargouille, les oreilles tombent.', extra_svg=bowl('Xbol') + ondes)
    for i in range(2): a.hidden.add(f'Xonde{i}'); a.origins[f'Xonde{i}'] = f'{316 + i * 14}px 318px'
    a.idle(breathe=3.2, tail=5.0, depth=.6)
    a.look(.2, -9, 7, 1.4); a.at('head', 0, {}, SOFT).at('head', .5, {'r': 12, 'x': -6, 'y': 10}, SOFT).at('head', 2.2, {'r': 12, 'x': -6, 'y': 10}, SOFT).at('head', 3.0, {}, SOFT).at('head', 4.0, {}, LIN)
    for e in ('ear-left', 'ear-right'): a.at(e, 0, {}, SOFT).at(e, .6, {'r': -14 if e == 'ear-left' else 14}, SOFT).at(e, 3.2, {'r': -14 if e == 'ear-left' else 14}, SOFT).at(e, 4.0, {}, LIN)
    # le gargouillis : le ventre tremble et deux petites ondes montent
    a.at('core', 1.3, {}, LIN)
    for k in range(5): a.at('core', 1.3 + k * .09, {'sx': 1.03 if k % 2 == 0 else .98, 'sy': .98 if k % 2 == 0 else 1.03}, SOFT)
    a.at('core', 1.8, {}, LIN)
    for i in range(2):
        t = 1.35 + i * .25
        a.at(f'Xonde{i}', t, {'o': 0, 'y': 0}, STEP).at(f'Xonde{i}', t + .05, {'o': .7, 'y': -4}, OUTQ).at(f'Xonde{i}', t + .7, {'o': 0, 'y': -28}, LIN)
    a.blink(2.6)
    out.append(a)

    # ── zoomies : elle traverse en courant (une fois) ──
    a = R('zoomies', 2.4, title='Azami · Zoomies', desc='Elle traverse l’écran en courant, les oreilles en arrière, et revient de l’autre côté.')
    a.cycle('front-near', .18, [(0, {'r': 24}, SOFT), (.09, {'r': -24}, SOFT), (.18, {'r': 24}, SOFT)])
    a.cycle('front-far', .18, [(0, {'r': -24}, SOFT), (.09, {'r': 24}, SOFT), (.18, {'r': -24}, SOFT)])
    a.cycle('back-near', .18, [(0, {'r': -22}, SOFT), (.09, {'r': 22}, SOFT), (.18, {'r': -22}, SOFT)])
    a.cycle('back-far', .18, [(0, {'r': 22}, SOFT), (.09, {'r': -22}, SOFT), (.18, {'r': 22}, SOFT)])
    a.cycle('core', .18, [(0, {'y': 0}, SOFT), (.09, {'y': -6}, SOFT), (.18, {'y': 0}, SOFT)])
    for e in ('ear-left', 'ear-right'): a.at(e, 0, {'r': 30 if e == 'ear-left' else -30}, LIN).at(e, 2.4, {'r': 30 if e == 'ear-left' else -30}, LIN)
    a.at('tail', 0, {'r': 20}, LIN).at('tail', 2.4, {'r': 20}, LIN)
    c = 'character'
    a.at(c, 0, {'x': 0, 'r': -6}, 'cubic-bezier(.4,0,.6,1)').at(c, .9, {'x': -620, 'r': -6}, STEP)       # file à gauche
    a.at(c, .92, {'x': 620, 'r': 6, 'sx': -1}, 'cubic-bezier(.4,0,.6,1)').at(c, 1.9, {'x': 0, 'r': 6, 'sx': -1}, STEP)   # revient par la droite, à l'envers
    a.at(c, 1.92, {'sx': 1, 'r': 0}, OUTQ).at(c, 2.4, {}, LIN)
    out.append(a)

    # ── boude (boucle) : elle tourne le dos, la queue bat, un coup d'œil par-dessus l'épaule ──
    a = R('boude', 5.0, loop=True, title='Azami · Boude', desc='Elle tourne le dos, la queue bat le sol, et jette un coup d’œil par-dessus l’épaule de temps en temps.')
    a.base['character'] = {'sx': -1}
    a.at('character', 0, {'sx': -1}, LIN).at('character', 5.0, {'sx': -1}, LIN)
    a.idle(breathe=3.4, tail=1.0, depth=.7)
    a.cycle('tail', 1.0, [(0, {'r': -14}, SOFT), (.5, {'r': 12}, SOFT), (1.0, {'r': -14}, SOFT)])
    for e in ('ear-left', 'ear-right'): a.at(e, 0, {'r': -10 if e == 'ear-left' else 10}, LIN).at(e, 5.0, {'r': -10 if e == 'ear-left' else 10}, LIN)
    a.at('head', 0, {'r': 6}, SOFT).at('head', 2.4, {'r': 6}, ANT).at('head', 2.8, {'r': -16, 'x': 10}, OUTQ).at('head', 3.6, {'r': -16, 'x': 10}, ANT).at('head', 4.0, {'r': 6}, SOFT).at('head', 5.0, {'r': 6}, LIN)
    a.look(2.8, 10, -2, .8); a.blink(1.5)
    out.append(a)

    # ── dort (boucle) : roulée, les yeux fermés, des z qui montent ──
    zz = ''.join(f'<text id="Xz{i}" x="{250 + i * 26}" y="{200 - i * 18}" font-family="Nunito, sans-serif" font-weight="900" font-size="{22 + i * 8}" fill="{INK}" opacity=".7">z</text>' for i in range(3))
    a = R('dort', 6.0, loop=True, title='Azami · Dort', desc='Roulée en boule, les yeux fermés, elle respire lentement ; des z s’envolent.', extra_svg=zz)
    for i in range(3): a.hidden.add(f'Xz{i}'); a.origins[f'Xz{i}'] = f'{250 + i * 26}px {200 - i * 18}px'
    a.idle(breathe=4.8, tail=9.0, depth=.9)
    a.at('head', 0, {'r': 14, 'y': 18, 'x': -4}, LIN).at('head', 6.0, {'r': 14, 'y': 18, 'x': -4}, LIN)
    a.at('neck', 0, {'r': 6, 'y': 8}, LIN).at('neck', 6.0, {'r': 6, 'y': 8}, LIN)
    a.at('character', 0, {'sy': .94, 'y': 10}, LIN).at('character', 6.0, {'sy': .94, 'y': 10}, LIN)
    a.happy(0, 6.0)
    for i in range(3):
        t = i * 1.3
        a.at(f'Xz{i}', t, {'o': 0, 'y': 10, 's': .6}, STEP).at(f'Xz{i}', t + .1, {'o': .8, 'y': 0, 's': .8}, OUTQ).at(f'Xz{i}', t + 2.6, {'o': 0, 'y': -40, 'x': 10, 's': 1.1}, LIN)
    out.append(a)
    return out

if __name__ == '__main__':
    for a in anims(): print(write(a, 'reaction'))
