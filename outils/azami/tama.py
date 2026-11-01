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
    # trois petits tas (Xk0, Xk1, Xk2) qui disparaissent l'un après l'autre pendant qu'elle mange
    tas = [[], [], []]
    for i, (dx, dy) in enumerate(pts): tas[i % 3].append(f'<ellipse cx="{x + dx}" cy="{y + dy}" rx="6" ry="4" fill="#C98B5E" stroke="{INK}" stroke-width="2"/>')
    return ''.join(f'<g id="Xk{i}">{"".join(t)}</g>' for i, t in enumerate(tas))
def sauce(x=118, y=386):
    return f'<ellipse cx="{x}" cy="{y}" rx="40" ry="8" fill="#D9742F"/><ellipse cx="{x - 10}" cy="{y - 1}" rx="9" ry="5" fill="#8E4A1E"/><ellipse cx="{x + 14}" cy="{y + 1}" rx="7" ry="4" fill="#8E4A1E"/>'
def eau(x=118, y=386):
    return f'<ellipse cx="{x}" cy="{y}" rx="40" ry="8" fill="#9AD3F2"/><ellipse cx="{x - 8}" cy="{y - 2}" rx="12" ry="3" fill="#FFFFFF" opacity=".6"/>'

HD = {'r': 38, 'x': -20, 'y': 52}   # la tête dans la gamelle
def head_down(a, t0, t1, deep=1.0):
    """Elle baisse la tête jusque dans la gamelle de t0 à t1 (le corps s'appuie un peu sur les pattes avant)."""
    h = {k: v * deep for k, v in HD.items()}
    a.at('head', t0, {}, ANT).at('head', t0 + .35, h, OUTQ)
    a.at('head', t1, h, ANT).at('head', t1 + .4, {}, LIN)
    a.at('neck', t0, {}, ANT).at('neck', t0 + .35, {'r': 16 * deep, 'y': 16 * deep}, OUTQ).at('neck', t1, {'r': 16 * deep, 'y': 16 * deep}, ANT).at('neck', t1 + .4, {}, LIN)
    a.at('core', t0, {}, ANT).at('core', t0 + .35, {'r': 4 * deep, 'x': -4 * deep, 'y': 4 * deep}, OUTQ).at('core', t1, {'r': 4 * deep, 'x': -4 * deep, 'y': 4 * deep}, ANT).at('core', t1 + .4, {}, LIN)

def chew(a, t0, t1, period=.22):
    t = t0
    while t < t1:
        a.mouth(t, t + period * .6, big=.55)
        a.at('head', t + period * .3, {'r': HD['r'], 'x': HD['x'], 'y': HD['y'] - 4}, SOFT)   # petit à-coup de mastication
        a.at('head', t + period * .6, HD, SOFT)
        t += period

def lap(a, t0, t1, period=.3):
    t = t0
    while t < t1:
        a.mouth(t, t + .14, big=.4); t += period

def anims():
    out = []
    R = lambda name, D, loop=False, **k: Anim(name, D, loop=loop, **k)

    # ── mange (croquettes) ──
    a = R('mange', 5.2, title='Azami · Mange', desc='Elle plonge le museau dans sa gamelle de croquettes, mastique, et relève la tête, ravie.', extra_svg=bowl('Xbol', x=150, y=394, contenu=croquettes(150, 384)))
    a.idle(breathe=2.6, tail=3.4); a.look(.1, -8, 6, 1.0); a.ear('l', .1, 10)
    head_down(a, .4, 3.4); chew(a, .9, 3.3)
    for i, t in enumerate((1.5, 2.3, 3.1)): a.at(f'Xk{i}', 0, {'o': 1}, LIN).at(f'Xk{i}', t, {'o': 1}, STEP).at(f'Xk{i}', t + .02, {'o': 0}, STEP).at(f'Xk{i}', 5.2, {'o': 0}, LIN)
    a.cycle('tail', 1.2, [(0, {}, SOFT), (.6, {'r': 9}, SOFT), (1.2, {}, SOFT)])
    a.happy(3.9, 5.0); blushy(a, 3.9, 5.0); tail_up(a, 3.9, 5.0); a.blink(4.9)
    out.append(a)

    # ── ragoût ──
    a = R('ragout', 5.6, title='Azami · Ragoût', desc='Du ragoût ! Elle y plonge le museau, ressort avec de la sauce sur les moustaches, et ronronne.', extra_svg=bowl('Xbol', x=150, y=394, fill='#F4C76B', contenu=sauce(150, 384)) + f'<g id="Xsauce"><ellipse cx="166" cy="266" rx="9" ry="5" fill="#D9742F"/><ellipse cx="190" cy="270" rx="6" ry="4" fill="#D9742F"/></g>')
    a.hidden.add('Xsauce'); a.origins['Xsauce'] = '178px 268px'
    a.idle(breathe=2.8, tail=3.6); a.look(.1, -8, 6, .8); a.hop(.3, h=14, air=.2)
    head_down(a, .8, 3.8); lap(a, 1.2, 3.7, .26)
    a.at('Xsauce', 3.8, {'o': 0}, STEP).at('Xsauce', 3.82, {'o': 1}, STEP).at('Xsauce', 5.6, {'o': 1}, LIN)
    a.happy(4.3, 5.4); blushy(a, 4.3, 5.4, 1.4); tail_up(a, 4.2, 5.4, -20)
    out.append(a)

    # ── friandise attrapée au vol ──
    treat = f'<g id="Xtreat"><path d="M0 -9 L8 0 L0 9 L-8 0 Z" fill="#E7776B" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/><circle cx="0" cy="0" r="2" fill="#FFF2D9"/></g>'
    a = R('friandise', 3.6, title='Azami · Friandise', desc='Une friandise vole en arc, elle saute et l’attrape au vol dans la gueule : crounch.', extra_svg=f'<g id="Xtreatwrap" transform="translate(90 120)"><g transform="scale(2.4)">{treat}</g></g>')
    a.hidden.add('Xtreatwrap'); a.origins['Xtreatwrap'] = '0px 0px'   # (l'animation remplace le translate de départ : positions absolues)
    a.idle(breathe=2.2, tail=3.6)
    # elle monte en arc depuis la gauche, redescend vers sa gueule, et disparaît dedans au moment où elle la ferme
    a.at('Xtreatwrap', 0, {'o': 0, 'x': 20, 'y': 300, 's': .7}, STEP).at('Xtreatwrap', .05, {'o': 1, 'x': 20, 'y': 300, 's': .8}, OUTQ)
    a.at('Xtreatwrap', .5, {'o': 1, 'x': 96, 'y': 96, 'r': 160, 's': 1}, 'cubic-bezier(.2,.6,.4,1)')
    a.at('Xtreatwrap', .9, {'o': 1, 'x': 170, 'y': 214, 'r': 300, 's': .9}, 'cubic-bezier(.5,0,.8,.6)').at('Xtreatwrap', 1.0, {'o': 1, 'x': 177, 'y': 234, 'r': 320, 's': .3}, LIN).at('Xtreatwrap', 1.02, {'o': 0, 'x': 177, 'y': 234, 's': .2}, STEP)
    a.at('head', 1.0, {}, LIN).at('head', 1.06, {'sx': 1.06, 'sy': .94}, SNAP).at('head', 1.25, {}, OUTQ)   # crounch
    a.look(.2, -6, -8, .8); a.ear('r', .3, 14)
    a.hop(.7, h=34, air=.3, tilt=-8); a.mouth(.95, 1.25, big=.9)
    a.happy(1.5, 2.8); blushy(a, 1.5, 2.8); tail_up(a, 1.4, 2.9); a.blink(3.3)
    out.append(a)

    # ── boit ──
    a = R('boit', 4.6, title='Azami · Boit', desc='Elle lape l’eau de sa gamelle, la langue qui claque, puis secoue la tête.', extra_svg=bowl('Xbol', x=150, y=394, fill='#78C8F0', contenu=eau(150, 384)))
    a.idle(breathe=2.8, tail=4.6); a.look(.1, -8, 6, .6)
    head_down(a, .4, 3.2, .9); lap(a, .8, 3.1, .28)
    a.shake('head', 3.7, amp=6, n=4, period=.07); a.blink(4.3)
    out.append(a)

    # ── faim (boucle) : elle regarde la gamelle vide, le ventre gargouille ──
    ondes = ''.join(f'<path id="Xonde{i}" d="M{246 + i * 30} 336 q12 -12 24 0 q12 12 24 0" stroke="{INK}" stroke-width="4.5" fill="none" stroke-linecap="round" opacity=".7"/>' for i in range(2))
    a = R('faim', 4.0, loop=True, title='Azami · Faim', desc='La gamelle est vide. Elle la fixe, le ventre gargouille, les oreilles tombent.', extra_svg=bowl('Xbol') + ondes)
    for i in range(2): a.hidden.add(f'Xonde{i}'); a.origins[f'Xonde{i}'] = f'{270 + i * 30}px 336px'
    a.idle(breathe=3.2, tail=5.0, depth=.6)
    # les yeux sur la gamelle tout le long, la tête basse, les oreilles tombées, plus de sourire
    for p in ('pupils-l', 'pupils-r'): a.base[p] = {'x': -8, 'y': 8}; a.at(p, 0, {'x': -8, 'y': 8}, LIN).at(p, 4.0, {'x': -8, 'y': 8}, LIN)
    a.base['head'] = {'r': 18, 'x': -8, 'y': 18}
    a.at('head', 0, {'r': 18, 'x': -8, 'y': 18}, SOFT).at('head', 2.0, {'r': 20, 'x': -9, 'y': 20}, SOFT).at('head', 4.0, {'r': 18, 'x': -8, 'y': 18}, LIN)
    for e in ('ear-left', 'ear-right'): r = -25 if e == 'ear-left' else 25; a.base[e] = {'r': r}; a.at(e, 0, {'r': r}, LIN).at(e, 4.0, {'r': r}, LIN)
    a.base['mouth-smile'] = {'o': 0}; a.at('mouth-smile', 0, {'o': 0}, LIN).at('mouth-smile', 4.0, {'o': 0}, LIN)
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
    # elle court sur place : c'est l'image entière qui traverse l'écran (dans l'app), pour que rien ne la coupe
    c = 'character'
    # (les demi-tours passent par un « tassé » de 80 ms au lieu d'une coupure d'une image à l'autre)
    a.at(c, 0, {'r': -6}, LIN).at(c, .86, {'r': -6}, SOFT).at(c, .9, {'sx': .12, 'sy': 1.05}, LIN)   # file à gauche
    a.at(c, .94, {'r': 6, 'sx': -1}, OUTQ).at(c, 1.84, {'r': 6, 'sx': -1}, SOFT).at(c, 1.88, {'sx': -.12, 'sy': 1.05}, LIN)   # revient par la droite, à l'envers
    a.at(c, 1.92, {'sx': 1.08, 'sy': .95, 'r': 4}, OUTQ).at(c, 2.1, {'sx': 1, 'r': 0}, OUTQ).at(c, 2.4, {}, LIN)   # petit dérapage à l'arrivée
    out.append(a)

    # ── boude (boucle) : elle tourne le dos, la queue bat, un coup d'œil par-dessus l'épaule ──
    a = R('boude', 5.0, loop=True, title='Azami · Boude', desc='Elle tourne le dos, la queue bat le sol, et jette un coup d’œil par-dessus l’épaule de temps en temps.')
    a.base['character'] = {'sx': -1}
    a.at('character', 0, {'sx': -1}, LIN).at('character', 5.0, {'sx': -1}, LIN)
    a.idle(breathe=3.4, tail=1.0, depth=.7)
    a.cycle('tail', 1.0, [(0, {'r': -14}, SOFT), (.5, {'r': 12}, SOFT), (1.0, {'r': -14}, SOFT)])
    for e in ('ear-left', 'ear-right'): a.at(e, 0, {'r': -28 if e == 'ear-left' else 28}, LIN).at(e, 5.0, {'r': -28 if e == 'ear-left' else 28}, LIN)
    # menton levé, yeux fermés (« pff ») ; un coup d'œil par-dessus l'épaule, puis elle referme les yeux
    a.at('head', 0, {'r': 12, 'x': 4, 'y': -6}, SOFT).at('head', 2.4, {'r': 12, 'x': 4, 'y': -6}, ANT).at('head', 2.8, {'r': -14, 'x': 10}, OUTQ).at('head', 3.6, {'r': -14, 'x': 10}, ANT).at('head', 4.0, {'r': 12, 'x': 4, 'y': -6}, SOFT).at('head', 5.0, {'r': 12, 'x': 4, 'y': -6}, LIN)
    for k, ferme, ouvert in (('eye-l', {'o': 0}, {'o': 1}), ('eye-r', {'o': 0}, {'o': 1}), ('eyes-blink', {'o': 1}, {'o': 0})):
        a.base[k] = ferme; a.at(k, 0, ferme, LIN).at(k, 2.7, ferme, STEP).at(k, 2.72, ouvert, STEP).at(k, 3.6, ouvert, STEP).at(k, 3.62, ferme, STEP).at(k, 5.0, ferme, LIN)
    a.hidden.discard('eyes-blink')
    a.base['mouth-smile'] = {'o': 0}; a.at('mouth-smile', 0, {'o': 0}, LIN).at('mouth-smile', 5.0, {'o': 0}, LIN)
    a.look(2.8, 10, -2, .8)
    out.append(a)

    # ── dort (boucle) : couchée en boule de pain, pattes repliées, tête posée, les yeux clos ; des z montent ──
    # des gros Z dessinés (tracés, pas du texte : même rendu partout), qui montent en grossissant
    Zi = lambda i, x, y, h: f'<g id="Xz{i}"><path d="M{x - h * .42} {y - h / 2} H{x + h * .42} L{x - h * .42} {y + h / 2} H{x + h * .42}" fill="none" stroke="#FFFDF8" stroke-width="{h * .22 + 7}" stroke-linecap="round" stroke-linejoin="round"/><path d="M{x - h * .42} {y - h / 2} H{x + h * .42} L{x - h * .42} {y + h / 2} H{x + h * .42}" fill="none" stroke="{INK}" stroke-width="{h * .22}" stroke-linecap="round" stroke-linejoin="round"/></g>'
    ZPOS = ((232, 214, 34), (214, 150, 48), (184, 74, 64))
    MUSEAU = (196, 318)
    zz = ''.join(Zi(i, x, y, h) for i, (x, y, h) in enumerate(ZPOS))
    a = R('dort', 6.0, loop=True, title='Azami · Dort', desc='Couchée en boule, les pattes repliées sous elle, la tête posée, les yeux clos ; elle respire lentement et des z s’envolent.', extra_svg=zz)
    for i, (x, y, h) in enumerate(ZPOS): a.hidden.add(f'Xz{i}'); a.origins[f'Xz{i}'] = f'{x}px {y}px'
    pose = {
        'character': {'y': 50},
        'front-near': {'r': 84, 'x': -6, 'y': -6}, 'front-far': {'r': 80, 'x': -2, 'y': -10},
        'back-near': {'r': 78, 'x': -4, 'y': -8}, 'back-far': {'r': 74, 'y': -10},
        'head': {'r': 7, 'x': 6, 'y': 16}, 'neck': {'r': 4, 'y': 8},
        'tail': {'r': 68, 'y': 6}, 'tail-tip': {'r': -40},
        'ear-left': {'r': -18}, 'ear-right': {'r': 16},
        'eye-l': {'o': 0}, 'eye-r': {'o': 0}, 'eyes-blink': {'o': 1},
        'ground-shadow': {'sx': 1.08},
    }
    for k, v in pose.items():
        a.base[k] = v; a.at(k, 0, v, LIN).at(k, 6.0, v, LIN)
    a.hidden.discard('eyes-blink')
    # respiration lente : le ventre se soulève, la tête suit à peine
    a.cycle('core', 3.0, [(0, {}, SOFT), (1.4, {'y': -2.5, 'sx': 1.02, 'sy': 1.045}, SOFT), (3.0, {}, SOFT)])
    a.cycle('whiskers', 3.0, [(0, {}, SOFT), (1.4, {'y': -1.5}, SOFT), (3.0, {}, SOFT)])
    # une oreille qui frémit dans son sommeil, le bout de la queue qui bouge une fois
    a.at('ear-right', 3.6, {'r': 16}, ANT).at('ear-right', 3.7, {'r': 28}, SNAP).at('ear-right', 3.85, {'r': 14}, OUTQ).at('ear-right', 4.0, {'r': 16}, LIN)
    a.at('tail-tip', 2.0, {'r': -40}, SOFT).at('tail-tip', 2.5, {'r': -58}, SOFT).at('tail-tip', 3.1, {'r': -40}, SOFT)
    for i in range(3):
        t = i * 1.4
        x, y, h = ZPOS[i]; dx, dy = MUSEAU[0] - x, MUSEAU[1] - y   # chaque Z naît au museau et monte à sa place
        a.at(f'Xz{i}', t, {'o': 0, 'x': dx, 'y': dy, 's': .3, 'r': -8}, STEP).at(f'Xz{i}', t + .12, {'o': 1, 'x': dx * .8, 'y': dy * .8, 's': .45, 'r': -6}, OUTQ).at(f'Xz{i}', t + 1.6, {'o': 1, 'x': 0, 'y': 0, 's': 1, 'r': 4}, SOFT).at(f'Xz{i}', t + 2.6, {'o': 0, 'x': -6, 'y': -18, 's': 1.1, 'r': 8}, LIN)
    out.append(a)
    return out

if __name__ == '__main__':
    for a in anims(): print(write(a, 'reaction'))
