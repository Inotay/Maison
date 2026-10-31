# Trop de caresses : Azami attaque de la patte, puis crache, part bouder, et revient.
from lib import *

FLASH = '<g id="Xswipe"><path d="M118 300 Q92 330 104 368 M134 296 Q110 334 124 372 M150 294 Q130 332 144 370" stroke="#FFF2D9" stroke-width="6" fill="none" stroke-linecap="round"/></g>'
HISS = '<g id="Xhiss"><path d="M92 246 L64 238 M90 262 L58 264 M94 278 L66 292" stroke="#FFF2D9" stroke-width="6" stroke-linecap="round"/></g>'
ANGRY = '<g id="Xbrow"><path d="M124 186 L160 198 M230 186 L194 198" stroke="#2A1C15" stroke-width="7" stroke-linecap="round"/></g>'

def anims():
    out = []
    a = Anim('attaque', 1.8, loop=False, title='Azami attaque', desc='Trop de caresses : Azami donne deux petits coups de patte, oreilles en arrière.', extra_svg=FLASH, head_extra=ANGRY)
    a.origins['Xswipe'] = '130px 334px'; a.origins['Xbrow'] = '177px 192px'
    a.idle(breathe=.9, tail=1.8)
    a.hidden.add('Xbrow')
    a.at('Xbrow', 0, {'o': 0}, STEP).at('Xbrow', .05, {'o': 1, 'y': -4}, SNAP).at('Xbrow', .2, {'o': 1}, LIN).at('Xbrow', 1.4, {'o': 1}, ANT).at('Xbrow', 1.55, {'o': 0}, LIN)
    for e, r in (('ear-left', 26), ('ear-right', -24)):
        a.at(e, 0, {}, SNAP).at(e, .12, {'r': r}, OUTQ).at(e, 1.4, {'r': r}, SOFT).at(e, 1.7, {}, LIN)
    a.at('character', 0, {}, ANT).at('character', .18, {'sx': 1.05, 'sy': .93, 'x': 4}, SNAP)
    for k, t in enumerate((.3, .72)):
        a.at('front-near', t, {'r': -8}, ANT).at('front-near', t + .08, {'r': 118, 'x': -18, 'y': -30}, SNAP).at('front-near', t + .26, {'r': 20}, OUTQ)
        a.at('character', t, {'sx': 1.05, 'sy': .93, 'x': 4}, ANT).at('character', t + .08, {'x': -10, 'r': -3}, SNAP).at('character', t + .3, {'sx': 1.03, 'sy': .96}, OUTQ)
        a.show('Xswipe', t + .06, t + .3, v_from={'r': -10}, v_to={'r': 6, 's': 1.1})
    a.at('front-near', .98, {'r': 20}, SOFT).at('front-near', 1.3, {}, LIN)
    a.at('character', 1.02, {'sx': 1.03, 'sy': .96}, SOFT).at('character', 1.35, {}, LIN)
    a.mouth(.28, .9, 1.0)
    a.at('tail-tip', 0, {}, SNAP).at('tail-tip', .2, {'r': -26}, SOFT)
    for k in range(5): a.at('tail-tip', .3 + k * .2, {'r': -26 if k % 2 else -14}, SOFT)
    a.at('tail-tip', 1.6, {}, LIN)
    out.append(a)

    a = Anim('crache', 2.0, loop=False, title='Azami crache', desc='Azami fait le gros dos, crache, puis s’en va bouder hors de l’écran.', extra_svg=HISS, head_extra=ANGRY)
    a.origins['Xhiss'] = '80px 264px'; a.origins['Xbrow'] = '177px 192px'
    a.idle(breathe=1.0, tail=2.0)
    a.hidden.add('Xbrow')
    a.at('Xbrow', 0, {'o': 0}, STEP).at('Xbrow', .05, {'o': 1, 'y': -5}, SNAP).at('Xbrow', 1.1, {'o': 1}, LIN).at('Xbrow', 1.2, {'o': 0}, LIN)
    for e, r in (('ear-left', 38), ('ear-right', -36)):
        a.at(e, 0, {}, SNAP).at(e, .1, {'r': r}, OUTQ).at(e, 1.1, {'r': r}, SOFT).at(e, 1.3, {}, LIN)
    # gros dos, poils hérissés
    a.at('core', 0, {}, ANT).at('core', .15, {'sy': 1.14, 'sx': 1.04, 'y': -10}, SNAP).at('core', 1.05, {'sy': 1.12, 'sx': 1.04, 'y': -9}, SOFT).at('core', 1.2, {}, LIN)
    a.at('character', 0, {}, ANT).at('character', .15, {'sy': 1.05, 'x': 6}, SNAP)
    a.shake('head', .25, amp=3, n=8, period=.09, key='r')
    a.at('mouth-smile', .15, {'o': 1}, STEP).at('mouth-smile', .17, {'o': 0}, STEP).at('mouth-smile', 1.05, {'o': 1}, LIN)
    a.hidden.add('mouth-open')
    a.at('mouth-open', .15, {'s': .3, 'o': 1}, SNAP).at('mouth-open', .3, {'sx': 1.4, 'sy': 1.6, 'o': 1}, SOFT).at('mouth-open', 1.0, {'sx': 1.4, 'sy': 1.5, 'o': 1}, STEP).at('mouth-open', 1.02, {'s': .3, 'o': 0}, LIN)
    a.show('Xhiss', .2, 1.0, v_to={'x': -6, 's': 1.15})
    a.at('tail', 0, {}, SNAP).at('tail', .2, {'r': -18}, SOFT).at('tail', 1.1, {'r': -16}, SOFT).at('tail', 1.25, {}, LIN)
    a.at('tail-tip', .1, {}, SNAP).at('tail-tip', .25, {'r': -34}, SOFT)
    for k in range(4): a.at('tail-tip', .45 + k * .15, {'r': -30 if k % 2 else -38}, SOFT)
    # demi-tour et départ à droite
    a.at('character', 1.15, {'sy': 1.05, 'x': 6}, ANT).at('character', 1.3, {'sx': -1, 'x': 0}, SNAP).at('character', 1.45, {'sx': -1, 'y': -14, 'x': 60}, SOFT).at('character', 2.0, {'sx': -1, 'x': 420, 'o': 0}, LIN)
    a.at('ground-shadow', 1.3, {}, SOFT).at('ground-shadow', 2.0, {'x': 420, 'o': 0}, LIN)
    out.append(a)

    a = Anim('retour', 1.6, loop=False, title='Azami revient', desc='Azami revient en trottinant, l’air de rien.')
    a.idle(breathe=.8, tail=1.6)
    a.at('character', 0, {'x': 420, 'o': 0}, LIN).at('character', .05, {'x': 400, 'o': 1}, OUTQ).at('character', .7, {'x': 0, 'y': 0}, SNAP).at('character', .82, {'sx': 1.05, 'sy': .93}, SNAP).at('character', 1.0, {}, LIN)
    a.at('ground-shadow', 0, {'x': 420, 'o': 0}, LIN).at('ground-shadow', .05, {'x': 400, 'o': 1}, OUTQ).at('ground-shadow', .7, {}, SNAP)
    a.move('head', 1.0, {'r': -10, 'y': -4}, dur=.2, hold=.3, back=.25)   # le menton en l'air, l'air de rien
    a.happy(1.05, 1.5)
    out.append(a)
    return out

if __name__ == '__main__':
    for a in anims(): print(write(a, 'reaction'))
