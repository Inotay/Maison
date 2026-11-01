# La micro-vie d'Azami : de petits gestes de moins d'une seconde, tirés au hasard quand on ne fait rien (une
# oreille qui pivote vers un bruit, la queue qui claque, un clignement lent « bisou de chat », un éternuement),
# l'écoute quand on lui écrit, et l'œil qui s'entrouvre quand on ouvre l'app pendant qu'elle dort.
from lib import *

DORT = {
    'character': {'y': 50},
    'front-near': {'r': 84, 'x': -6, 'y': -6}, 'front-far': {'r': 80, 'x': -2, 'y': -10},
    'back-near': {'r': 78, 'x': -4, 'y': -8}, 'back-far': {'r': 74, 'y': -10},
    'head': {'r': 7, 'x': 6, 'y': 16}, 'neck': {'r': 4, 'y': 8},
    'tail': {'r': 68, 'y': 6}, 'tail-tip': {'r': -40},
    'ear-left': {'r': -18}, 'ear-right': {'r': 16},
    'ground-shadow': {'sx': 1.08},
}

def tient(a, k, v, D):
    a.base[k] = v; a.at(k, 0, v, LIN).at(k, D, v, LIN)

def anims():
    out = []

    # ── l'œil qui s'entrouvre : elle dort, on ouvre l'app, elle nous a vus sans se réveiller ──
    D = 2.4
    a = Anim('dort_oeil', D, loop=False, title='Azami · Un œil', desc='Elle dort ; les yeux s’entrouvrent à peine, une oreille pivote vers nous, puis elle se rendort.')
    for k, v in DORT.items(): tient(a, k, v, D)
    a.cycle('core', 2.4, [(0, {}, SOFT), (1.2, {'y': -2, 'sx': 1.02, 'sy': 1.04}, SOFT), (2.4, {}, SOFT)])
    # yeux : fermés (le trait), puis deux fentes, puis refermés
    for e in ('eye-l', 'eye-r'):
        a.at(e, 0, {'o': 0}, LIN).at(e, .55, {'o': 0}, STEP).at(e, .57, {'o': 1, 'sy': .12}, SOFT).at(e, .85, {'o': 1, 'sy': .38}, SOFT).at(e, 1.5, {'o': 1, 'sy': .34}, SOFT).at(e, 1.8, {'o': 1, 'sy': .1}, STEP).at(e, 1.82, {'o': 0}, LIN).at(e, D, {'o': 0}, LIN)
    a.at('eyes-blink', 0, {'o': 1}, LIN).at('eyes-blink', .55, {'o': 1}, STEP).at('eyes-blink', .57, {'o': 0}, STEP).at('eyes-blink', 1.8, {'o': 0}, STEP).at('eyes-blink', 1.82, {'o': 1}, LIN).at('eyes-blink', D, {'o': 1}, LIN)
    a.hidden.discard('eyes-blink'); a.base['eyes-blink'] = {'o': 1}
    for p in ('pupils-l', 'pupils-r'): a.at(p, 0, {'x': 4, 'y': 2}, LIN).at(p, D, {'x': 4, 'y': 2}, LIN)
    a.at('ear-right', .4, {'r': 16}, ANT).at('ear-right', .55, {'r': 30}, SNAP).at('ear-right', 1.6, {'r': 28}, SOFT).at('ear-right', 2.0, {'r': 16}, SOFT)
    a.at('head', .5, {'r': 7, 'x': 6, 'y': 16}, SOFT).at('head', .9, {'r': 3, 'x': 7, 'y': 14}, SOFT).at('head', 1.9, {'r': 7, 'x': 6, 'y': 16}, SOFT)
    out.append(a)

    # ── écoute (boucle) : quand on lui écrit, elle tend l'oreille vers la bulle, la tête penchée ──
    D = 3.2
    a = Anim('ecoute', D, loop=True, title='Azami · Écoute', desc='Les oreilles tournées vers la bulle, la tête un peu penchée, elle écoute ce qu’on lui écrit.')
    a.idle(breathe=3.2, tail=3.2, depth=.6)
    tient(a, 'head', {'r': -9, 'x': -6, 'y': -2}, D)
    a.at('head', 0, {'r': -9, 'x': -6, 'y': -2}, SOFT).at('head', 1.6, {'r': -13, 'x': -7, 'y': -3}, SOFT).at('head', D, {'r': -9, 'x': -6, 'y': -2}, LIN)
    for p in ('pupils-l', 'pupils-r'): a.at(p, 0, {'x': -9, 'y': -3}, SOFT).at(p, 1.2, {'x': -10, 'y': -1}, SOFT).at(p, 2.4, {'x': -8, 'y': -3}, SOFT).at(p, D, {'x': -9, 'y': -3}, LIN)
    tient(a, 'ear-left', {'r': -8}, D); a.at('ear-right', 0, {'r': -16}, LIN).at('ear-right', D, {'r': -16}, LIN); a.base['ear-right'] = {'r': -16}
    a.ear('l', 1.0, -18, .2); a.blink(2.3)
    out.append(a)

    # ── une oreille vers un bruit, un regard, puis rien ──
    a = Anim('micro_oreille', 1.1, loop=False, title='Azami · Une oreille', desc='Une oreille pivote vers un bruit, un coup d’œil, puis rien.')
    a.idle(breathe=2.2, tail=2.2, depth=.5)
    a.at('ear-right', 0, {}, ANT).at('ear-right', .08, {'r': 22}, SNAP).at('ear-right', .7, {'r': 20}, SOFT).at('ear-right', 1.0, {}, OUTQ)
    a.look(.12, 10, -3, .5)
    out.append(a)

    # ── la queue qui claque une fois (agacement de principe) ──
    a = Anim('micro_queue', .9, loop=False, title='Azami · La queue', desc='La queue claque une fois, par principe.')
    a.idle(breathe=2.2, tail=2.2, depth=.5)
    a.at('tail', 0, {}, ANT).at('tail', .12, {'r': 22}, SNAP).at('tail', .3, {'r': -12}, OUTQ).at('tail', .6, {}, SOFT)
    a.flick(.1, 34)
    out.append(a)

    # ── le clignement lent : chez les chats, ça veut dire « je t'aime » ──
    a = Anim('clin_lent', 1.8, loop=False, title='Azami · Clignement lent', desc='Elle ferme les yeux lentement, les garde fermés un instant, et les rouvre : un bisou de chat.')
    a.idle(breathe=2.4, tail=2.4, depth=.5)
    for e in ('eye-l', 'eye-r'):
        a.at(e, 0, {'o': 1}, SOFT).at(e, .45, {'o': 1, 'sy': .15}, STEP).at(e, .47, {'o': 0}, STEP).at(e, 1.05, {'o': 0}, STEP).at(e, 1.07, {'o': 1, 'sy': .15}, SOFT).at(e, 1.5, {'o': 1}, LIN)
    a.at('eyes-blink', 0, {'o': 0}, STEP).at('eyes-blink', .46, {'o': 1}, STEP).at('eyes-blink', 1.06, {'o': 0}, STEP); a.hidden.add('eyes-blink')
    a.at('head', 0, {}, SOFT).at('head', .5, {'r': -5, 'y': 3}, SOFT).at('head', 1.1, {'r': -5, 'y': 3}, SOFT).at('head', 1.6, {}, SOFT)
    out.append(a)

    # ── un éternuement : la tête part en arrière, puis « atchoum » vers l'avant, tout le corps suit ──
    a = Anim('eternue', 1.3, loop=False, title='Azami · Atchoum', desc='Elle prend son élan, éternue, secoue la tête, un peu surprise.')
    a.idle(breathe=2.2, tail=2.2, depth=.5)
    a.at('head', 0, {}, ANT).at('head', .35, {'r': 12, 'y': -8}, SOFT).at('head', .42, {'r': -16, 'y': 10, 'x': -6}, SNAP).at('head', .7, {}, OUTQ)
    a.at('character', .38, {}, ANT).at('character', .44, {'sx': 1.06, 'sy': .92}, SNAP).at('character', .7, {}, OUTQ)
    for e in ('eye-l', 'eye-r'): a.at(e, .3, {'o': 1}, STEP).at(e, .32, {'o': 0}, STEP).at(e, .62, {'o': 0}, STEP).at(e, .64, {'o': 1}, LIN)
    a.at('eyes-blink', .3, {'o': 0}, STEP).at('eyes-blink', .32, {'o': 1}, STEP).at('eyes-blink', .63, {'o': 0}, STEP); a.hidden.add('eyes-blink')
    a.mouth(.4, .55, big=.6); a.shake('head', .85, amp=5, n=3, period=.06)
    for s_ in ('ear-left', 'ear-right'): a.at(s_, .4, {}, SNAP).at(s_, .46, {'r': -14 if s_ == 'ear-left' else 14}, OUTQ).at(s_, .9, {}, SOFT)
    out.append(a)
    return out

if __name__ == '__main__':
    for a in anims(): print(write(a, 'reaction'))
