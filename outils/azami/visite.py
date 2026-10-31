# Visite d'Azami : appel (invitation), parle, écoute, et quatre humeurs de réponse.
from lib import *

def talk(a, t0, t1, syl=.19, big=1.0):
    """Bouche qui bouge en syllabes, jamais figée à moitié."""
    a.hidden.add('mouth-open')
    a.at('mouth-smile', t0, {'o': 1}, STEP).at('mouth-smile', t0 + .02, {'o': 0}, STEP).at('mouth-smile', t1 + .02, {'o': 1}, LIN)
    t = t0; k = 0
    while t + syl <= t1 + .001:
        s = big * (1.0 if k % 3 != 2 else .7)
        a.at('mouth-open', t, {'sx': .55, 'sy': .45, 'o': 1}, SOFT)
        a.at('mouth-open', t + syl * .45, {'sx': .9 * s, 'sy': 1.0 * s, 'o': 1}, SOFT)
        t += syl; k += 1
    a.at('mouth-open', t, {'sx': .5, 'sy': .4, 'o': 1}, STEP).at('mouth-open', t + .02, {'s': .3, 'o': 0}, LIN)
    a.at('mouth-open', 0, {'s': .3, 'o': 0}, STEP).at('mouth-open', t0 - .01 if t0 > .02 else 0, {'s': .3, 'o': 0}, STEP)

def anims():
    out = []
    # Invitation : elle surgit, fait coucou, sautille sur place, en boucle.
    a = Anim('visite_appel', 3.2, title='Azami · Psst !', desc='Azami fait coucou de la patte et sautille : elle a quelque chose à dire.')
    a.idle(breathe=1.6, tail=3.2)
    a.hop(0.0, h=16, air=.22)
    a.at('front-near', .45, {}, ANT).at('front-near', .65, {'r': 92, 'x': -6, 'y': -8}, SNAP)
    for k in range(4):
        t = .65 + k * .3
        a.at('front-near', t, {'r': 92, 'x': -6, 'y': -8}, SOFT).at('front-near', t + .15, {'r': 72, 'x': -6, 'y': -12}, SOFT)
    a.at('front-near', 1.85, {'r': 92, 'x': -6, 'y': -8}, ANT).at('front-near', 2.1, {}, SNAP)
    a.happy(.6, 1.5); a.mouth(.7, 1.3, .9)
    a.at('blush', .6, {}, SNAP).at('blush', .8, {'s': 1.25}, SOFT).at('blush', 1.7, {'s': 1.25}, OUTQ).at('blush', 2.0, {}, LIN)
    a.ear('l', 1.9, -12); a.ear('r', 1.95, 12)
    a.move('head', 2.2, {'r': -9, 'x': -2}, dur=.25, hold=.5, back=.25, antic={'r': 2})
    a.flick(2.6, 24)
    out.append(a)

    # Parle : bouche en syllabes, petits hochements, sourcils d'oreilles expressifs.
    a = Anim('visite_parle', 3.0, title='Azami parle', desc='Azami raconte quelque chose, la tête qui dodeline.')
    a.idle(breathe=1.5, tail=3.0)
    talk(a, .05, 1.25); talk(a, 1.55, 2.75)
    a.at('head', 0, {}, SOFT).at('head', .6, {'r': -5, 'y': -2}, SOFT).at('head', 1.3, {'r': 3}, SOFT).at('head', 2.1, {'r': -4, 'y': -1}, SOFT).at('head', 3.0, {}, SOFT)
    a.ear('l', .3, -9); a.ear('r', 1.7, 10)
    a.blink(1.38)
    a.look(2.0, 2, -2, .6)
    out.append(a)

    # Écoute : elle attend la réponse, tête penchée, oreilles curieuses.
    a = Anim('visite_ecoute', 4.0, title='Azami écoute', desc='Azami attend ta réponse, la tête penchée.')
    a.idle(breathe=2.0, tail=4.0)
    a.at('head', 0, {'r': 7, 'x': 2}, SOFT).at('head', 2.0, {'r': 9, 'x': 2, 'y': 1}, SOFT).at('head', 4.0, {'r': 7, 'x': 2}, SOFT)
    for p in ('pupils-l', 'pupils-r'):
        a.at(p, 0, {'x': 1, 'y': -1}, SOFT).at(p, 4.0, {'x': 1, 'y': -1}, SOFT)
    a.ear('r', .8, 12, .5); a.blink(2.4); a.flick(3.2, 16)
    out.append(a)

    # Humeurs de réponse (une fois, finissent sur la pose de repos).
    a = Anim('visite_rire', 2.6, loop=False, title='Azami rit', desc='Azami éclate de rire, les yeux plissés.')
    a.idle(breathe=1.3, tail=2.6)
    a.happy(.1, 1.9); talk(a, .1, 1.7, syl=.15, big=1.25)
    a.shake('character', .15, amp=2.5, n=10, period=.12, key='r')
    a.move('head', .1, {'r': -10, 'y': -5}, dur=.25, hold=1.2, back=.35)
    a.at('blush', .1, {}, SNAP).at('blush', .3, {'s': 1.3}, SOFT).at('blush', 1.8, {'s': 1.3}, OUTQ).at('blush', 2.1, {}, LIN)
    a.hop(1.9, h=10, air=.18)
    out.append(a)

    a = Anim('visite_coeur', 2.6, loop=False, props=['prop-heart'], title='Azami fond', desc='Azami cligne lentement des yeux, un cœur s’envole.')
    x, y, w, h = BBOX['prop-heart']; a.origins['Pheart'] = f'{x + w / 2}px {y + h / 2}px'
    a.idle(breathe=1.3, tail=2.6)
    a.happy(.1, 1.9); talk(a, .15, 1.15, syl=.22, big=.8)
    a.move('head', .1, {'r': 8, 'y': 3}, dur=.4, hold=1.2, back=.4, ease_in=SOFT, ease_out=SOFT)
    a.show('Pheart', .3, 2.2, v_from={'x': -50, 'y': -160}, v_to={'x': -40, 'y': -225, 's': 1.3})
    a.at('blush', .1, {}, SOFT).at('blush', .5, {'s': 1.35}, SOFT).at('blush', 1.9, {'s': 1.35}, SOFT).at('blush', 2.3, {}, LIN)
    a.at('tail-tip', .2, {}, SOFT).at('tail-tip', .6, {'r': 22}, SOFT).at('tail-tip', 1.8, {'r': 18}, SOFT).at('tail-tip', 2.2, {}, LIN)
    out.append(a)

    a = Anim('visite_fier', 2.6, loop=False, props=['prop-glory'], title='Azami est fière', desc='Azami bombe le torse, ça brille.')
    x, y, w, h = BBOX['prop-glory']; a.origins['Pglory'] = f'{x + w / 2}px {y + h / 2}px'
    a.idle(breathe=1.3, tail=2.6)
    a.move('character', .1, {'sy': 1.05, 'y': -5}, dur=.3, hold=1.4, back=.4, antic={'sy': .95, 'sx': 1.03})
    a.move('head', .1, {'r': -8, 'y': -7}, dur=.3, hold=1.4, back=.4)
    a.happy(.3, 1.8); talk(a, .3, 1.5, syl=.2)
    a.show('Pglory', .3, 2.1)
    a.at('Pglory', .6, {'o': 1}, SNAP).at('Pglory', .8, {'s': 1.2, 'r': 8, 'o': 1}, OUTQ).at('Pglory', 1.1, {'o': 1}, SNAP).at('Pglory', 1.3, {'s': 1.2, 'r': -6, 'o': 1}, OUTQ).at('Pglory', 1.6, {'o': 1}, LIN)
    a.at('tail-tip', .1, {}, SNAP).at('tail-tip', .4, {'r': -20}, SOFT).at('tail-tip', 1.8, {'r': -16}, OUTQ).at('tail-tip', 2.2, {}, LIN)
    out.append(a)

    a = Anim('visite_malice', 2.6, loop=False, props=['prop-spark'], title='Azami malicieuse', desc='Azami regarde de côté, l’air très contente d’elle.')
    x, y, w, h = BBOX['prop-spark']; a.origins['Pspark'] = f'{x + w / 2}px {y + h / 2}px'
    a.idle(breathe=1.3, tail=2.6)
    a.look(.1, -5, -1, 1.1)
    a.move('head', .1, {'r': -11, 'x': -3}, dur=.25, hold=1.1, back=.35, antic={'r': 3})
    talk(a, .25, 1.25, syl=.18)
    a.ear('l', .1, 14, .9); a.ear('r', .12, 6, .9)
    a.show('Pspark', .35, 1.6, v_from={'x': -100, 'y': -175}, v_to={'x': -98, 'y': -184, 'r': 40})
    a.flick(.5, 26); a.flick(1.2, 26)
    a.happy(1.6, 2.2)
    out.append(a)
    return out

if __name__ == '__main__':
    for a in anims(): print(write(a, 'scene' if a.loop else 'reaction'))
