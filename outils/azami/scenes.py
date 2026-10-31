# Scènes en boucle (accueil, pages, nouvelles scènes).
from lib import *

BALL = '<g id="Xball"><circle cx="78" cy="376" r="22" fill="#E7776B" stroke="#39201E" stroke-width="5"/><path d="M62 362 Q80 378 96 392" stroke="#F9C849" stroke-width="6" stroke-linecap="round" fill="none"/><circle cx="71" cy="366" r="5" fill="#FFF2D9"/></g>'
NOTE = '<g id="Xnote"><path d="M300 150 V112 L326 106 V142" stroke="#39201E" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="294" cy="152" rx="10" ry="8" fill="#39201E"/><ellipse cx="320" cy="144" rx="10" ry="8" fill="#39201E"/></g>'
NOTE2 = '<g id="Xnote2"><path d="M340 120 V92" stroke="#39201E" stroke-width="6" stroke-linecap="round"/><path d="M340 92 Q352 96 356 108" stroke="#39201E" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="334" cy="122" rx="9" ry="7" fill="#39201E"/></g>'
DOOR = '''<g id="Xdoor"><rect x="372" y="236" width="86" height="166" rx="10" fill="#C98B5E" stroke="#39201E" stroke-width="6"/><rect x="384" y="250" width="62" height="58" rx="6" fill="#B07345"/><rect x="384" y="318" width="62" height="70" rx="6" fill="#B07345"/>
<circle cx="440" cy="330" r="6" fill="#F9C849" stroke="#39201E" stroke-width="3"/><rect x="350" y="398" width="130" height="10" rx="5" fill="#E7776B"/></g>'''
ROUTER = '''<g id="Xrouter"><rect x="378" y="356" width="98" height="42" rx="12" fill="#FFF2D9" stroke="#172B42" stroke-width="6"/><circle cx="398" cy="377" r="5" fill="#E7776B"/><circle cx="414" cy="377" r="5" fill="#B3D6E5"/><circle cx="430" cy="377" r="5" fill="#B3D6E5"/>
<path d="M458 356 V322" stroke="#172B42" stroke-width="6" stroke-linecap="round"/><circle cx="458" cy="318" r="6" fill="#172B42"/></g>'''
ZZZ = '<g id="Xz1"><path d="M250 150 H268 L250 170 H268" stroke="#FFF2D9" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g><g id="Xz2"><path d="M276 116 H298 L276 140 H298" stroke="#FFF2D9" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>'
YARN = '''<g id="Xyarn"><circle cx="330" cy="376" r="24" fill="#A9D3EF" stroke="#39201E" stroke-width="5"/><path d="M312 366 Q330 382 348 364 M310 382 Q330 396 350 378 M322 354 Q334 376 326 398" stroke="#5B9CC9" stroke-width="4" fill="none" stroke-linecap="round"/></g>'''
SPARK = lambda i, x, y, s=1: f'<g id="Xs{i}"><path transform="translate({x} {y}) scale({s})" d="M0 -16 Q3 -3 16 0 Q3 3 0 16 Q-3 3 -16 0 Q-3 -3 0 -16Z" fill="#F9C849"/></g>'

def base_idle(a, blinks=(), ears=(), flicks=()):
    a.idle()
    for t in blinks: a.blink(t)
    for side, t, ang in ears: a.ear(side, t, ang)
    for t in flicks: a.flick(t)

def anims():
    out = []
    # ---------- accueil -------------------------------------------------------
    a = Anim('etirement', 12, title='Azami · Étirement', desc='Bâillement, grand étirement des pattes avant, petite secousse de la tête.')
    a.idle(); a.blink(1.0); a.blink(10.6); a.ear('r', 9.3, 12); a.flick(11.2)
    a.move('head', 2.0, {'y': -6, 'r': -9, 'sx': 1.02, 'sy': 1.03}, dur=.35, hold=1.0, back=.3, antic={'y': 2, 'r': 2})
    a.happy(2.2, 3.5); a.mouth(2.25, 3.4, 1.35)
    a.at('ear-left', 2.1, {}, SOFT).at('ear-left', 2.45, {'r': -9}, SOFT).at('ear-left', 3.4, {'r': -9}, OUTQ).at('ear-left', 3.7, {}, LIN)
    a.at('ear-right', 2.1, {}, SOFT).at('ear-right', 2.45, {'r': 9}, SOFT).at('ear-right', 3.4, {'r': 9}, OUTQ).at('ear-right', 3.7, {}, LIN)
    # étirement : la patte avant pousse loin devant, le corps s'allonge
    a.move('front-near', 4.6, {'r': 32}, dur=.45, hold=1.1, back=.35, antic={'r': -6})
    a.move('front-far', 4.65, {'r': 26}, dur=.45, hold=1.05, back=.35, antic={'r': -5})
    a.move('character', 4.6, {'sx': 1.06, 'sy': .95, 'x': -4}, dur=.45, hold=1.1, back=.35, antic={'sy': .97})
    a.happy(4.8, 6.1)
    a.shake('head', 6.7, amp=6, n=5, period=.07)
    a.shake('ear-left', 6.72, amp=10, n=5, period=.07); a.shake('ear-right', 6.72, amp=10, n=5, period=.07)
    a.move('head', 7.6, {'r': 10, 'x': 2}, dur=.3, hold=1.2, back=.35, antic={'r': -2}); a.look(7.45, 3, -2, 1.5)
    out.append(a)

    a = Anim('jeu', 12, title='Azami · Jeu', desc='Elle guette la balle, se trémousse, bondit, puis fière d’elle.', extra_svg=BALL)
    a.origins['Xball'] = '78px 398px'
    a.idle(); a.blink(.8); a.blink(9.4)
    a.look(1.0, -4, 4, 2.6)
    a.move('head', 1.1, {'r': -7, 'y': 3}, dur=.3, hold=2.4, back=.3, antic={'r': 2})
    a.ear('l', 1.2, -10); a.ear('r', 1.25, 10)
    a.shake('character', 2.0, amp=2.2, n=10, period=.09)    # trémousse
    for k in range(4): a.flick(2.0 + k * .42, 14)
    a.hop(3.25, h=36, air=.34, tilt=-5)
    a.at('front-near', 3.3, {}, ANT).at('front-near', 3.5, {'r': 28}, SNAP).at('front-near', 3.9, {}, LIN)
    a.at('Xball', 3.6, {}, SNAP).at('Xball', 4.1, {'x': -26, 'r': -240}, OUTQ).at('Xball', 6.5, {'x': -26, 'r': -240}, SOFT).at('Xball', 7.6, {'r': 0}, OUTQ)
    a.happy(4.3, 5.4); a.at('blush', 4.3, {}, SNAP).at('blush', 4.5, {'s': 1.2}, SOFT).at('blush', 5.4, {'s': 1.2}, OUTQ).at('blush', 5.7, {}, LIN)
    a.look(6.4, -4, 3, 1.1)
    a.move('head', 8.0, {'r': 11, 'x': 2}, dur=.3, hold=1.0, back=.35, antic={'r': -2}); a.ear('r', 7.9, 13, .9)
    a.flick(10.6)
    out.append(a)

    a = Anim('toilette', 12, title='Azami · Toilette', desc='Elle lève la patte, se lèche, se frotte l’oreille.')
    a.idle(); a.blink(.9); a.blink(10.2)
    a.move('front-near', 1.8, {'r': 118, 'x': -6, 'y': -14}, dur=.4, hold=4.0, back=.4, antic={'r': -6})
    a.move('head', 2.0, {'r': 6, 'y': 6}, dur=.35, hold=1.8, back=.3)
    a.happy(2.3, 5.8)
    for k in range(5):
        t = 2.4 + k * .4
        a.at('mouth-open', t, {'s': .2, 'o': 0}, STEP).at('mouth-open', t + .02, {'sx': .8, 'sy': .7, 'o': 1}, SNAP).at('mouth-open', t + .18, {'sx': .6, 'sy': .5, 'o': 1}, STEP).at('mouth-open', t + .2, {'s': .2, 'o': 0}, LIN)
    a.at('mouth-smile', 2.4, {'o': 1}, STEP).at('mouth-smile', 2.42, {'o': 0}, STEP).at('mouth-smile', 4.25, {'o': 1}, LIN)
    a.move('head', 4.6, {'r': -12, 'x': -2, 'y': 2}, dur=.3, hold=1.0, back=.35, antic={'r': 2})
    a.at('ear-left', 4.65, {}, SOFT).at('ear-left', 4.9, {'r': -16}, SOFT).at('ear-left', 5.2, {'r': -6}, SOFT).at('ear-left', 5.5, {'r': -16}, SOFT).at('ear-left', 5.95, {}, SNAP)
    a.shake('head', 6.6, amp=5, n=4, period=.07)
    a.look(7.6, 4, -1, 1.4); a.ear('r', 7.4, 12, 1.2); a.flick(9.0)
    out.append(a)

    a = Anim('marche', 12, title='Azami · Petite marche', desc='Elle trottine sur place, fière, la queue haute.')
    a.idle()
    a.blink(.6); a.blink(9.1)
    step = .38
    for k in range(10):
        t = 1.0 + k * step
        legs = ('front-near', 'back-far') if k % 2 == 0 else ('front-far', 'back-near')
        for l in legs:
            a.at(l, t, {}, OUTQ).at(l, t + step * .45, {'r': 14 if 'front' in l else -12, 'y': -9}, SOFT).at(l, t + step * .9, {}, LIN)
        a.at('character', t, {}, SOFT).at('character', t + step * .45, {'y': -4, 'sy': 1.01}, SOFT).at('character', t + step * .9, {'sy': .99}, LIN)
        a.at('head', t, {}, SOFT).at('head', t + step * .5, {'r': 2 if k % 2 else -2, 'y': -2}, SOFT).at('head', t + step * .95, {}, LIN)
    a.at('tail-tip', 1.0, {}, SOFT).at('tail-tip', 1.4, {'r': -10}, SOFT).at('tail-tip', 4.6, {'r': -10}, SOFT).at('tail-tip', 5.0, {}, LIN)
    a.move('head', 5.6, {'r': 11, 'x': 2}, dur=.3, hold=1.2, back=.35, antic={'r': -2}); a.look(5.45, 4, -1, 1.5); a.ear('r', 5.3, 12, 1.2)
    a.happy(7.6, 8.5)
    a.flick(10.5)
    out.append(a)

    a = Anim('miaulement', 12, title='Azami · Miaulement', desc='Deux miaulements, une petite note, puis elle écoute.', extra_svg=NOTE + NOTE2)
    a.origins['Xnote'] = '310px 150px'; a.origins['Xnote2'] = '340px 120px'
    a.idle(); a.blink(.7); a.blink(8.9)
    for t0, big in ((1.6, 1.2), (4.3, 1.45)):
        a.move('head', t0 - .1, {'r': -8, 'y': -5, 'sx': 1.02, 'sy': 1.04}, dur=.25, hold=.55, back=.3, antic={'y': 3, 'r': 2})
        a.mouth(t0 + .05, t0 + .75, big)
        a.ear('l', t0, -8); a.ear('r', t0, 8)
    a.show('Xnote', 1.75, 2.9, v_to={'y': -14, 'r': 8})
    a.show('Xnote2', 4.45, 5.7, v_to={'y': -18, 'r': -10})
    a.happy(6.2, 7.0)
    a.move('head', 7.6, {'r': 12, 'x': 2}, dur=.3, hold=1.1, back=.35, antic={'r': -2}); a.ear('r', 7.45, 14, 1.0); a.look(7.5, 4, -2, 1.3)
    a.flick(10.4)
    out.append(a)

    # ---------- pages ------------------------------------------------------------
    a = Anim('menage', 12.8, props=['prop-broom', 'prop-dust'], title='Azami · Ménage', desc='Elle balaie, la poussière lui chatouille le nez, elle éternue, fière.')
    a.idle(); a.blink(.8); a.blink(10.9)
    for k in range(6):
        t = 1.0 + k * .45
        a.at('Pbroom', t, {}, SOFT).at('Pbroom', t + .22, {'r': -12 if k % 2 == 0 else 8}, SOFT).at('Pbroom', t + .45, {}, LIN)
        a.at('front-near', t, {}, SOFT).at('front-near', t + .22, {'r': -6 if k % 2 == 0 else 5}, SOFT).at('front-near', t + .45, {}, LIN)
    a.show('Pdust', 1.2, 4.2, v_from={'y': 6}, v_to={'y': -10, 'x': 6})
    a.look(2.0, 4, 3, 1.4)
    # éternuement
    a.happy(4.6, 5.6)
    a.move('head', 4.6, {'r': -9, 'y': -6}, dur=.45, hold=.2, back=.1, ease_in=SOFT, ease_out=SNAP)
    a.at('character', 5.35, {}, SNAP).at('character', 5.45, {'sx': 1.06, 'sy': .92, 'y': 2}, SNAP).at('character', 5.7, {}, LIN)
    a.ear('l', 5.35, -14); a.ear('r', 5.35, 14)
    a.at('whiskers', 5.35, {}, SNAP).at('whiskers', 5.45, {'sx': 1.12, 'y': -3}, SNAP).at('whiskers', 5.8, {}, LIN)
    a.shake('head', 5.9, amp=5, n=4, period=.07)
    # fière
    a.move('character', 7.4, {'sy': 1.03, 'y': -3}, dur=.3, hold=1.4, back=.4, antic={'sy': .97})
    a.happy(7.6, 8.9)
    a.at('tail-tip', 7.4, {}, SNAP).at('tail-tip', 7.7, {'r': -16}, SOFT).at('tail-tip', 9.0, {'r': -12}, OUTQ).at('tail-tip', 9.4, {}, LIN)
    a.move('head', 10.0, {'r': 10, 'x': 2}, dur=.3, hold=.9, back=.35, antic={'r': -2})
    out.append(a)

    a = Anim('courses', 13.4, props=['prop-bag', 'prop-leek', 'prop-leaf-spark'], title='Azami · Courses', desc='Elle fouille le sac, le poireau gigote, elle est ravie.')
    a.idle(); a.blink(.9); a.blink(11.6)
    a.look(1.2, 5, 3, 1.4)
    a.move('head', 1.4, {'r': 12, 'x': 6, 'y': 4}, dur=.35, hold=2.2, back=.35, antic={'r': -3})
    a.ear('r', 1.6, 12, 1.8)
    for k in range(4):
        t = 2.0 + k * .4
        a.at('Pleek', t, {}, SOFT).at('Pleek', t + .2, {'r': 7 if k % 2 == 0 else -6, 'y': -4}, SOFT).at('Pleek', t + .4, {}, LIN)
    a.at('Pleek', 4.2, {}, ANT).at('Pleek', 4.35, {'y': -26, 'r': -5}, SNAP).at('Pleek', 5.2, {'y': -26, 'r': -5}, OUTQ).at('Pleek', 5.6, {}, LIN)
    a.show('Pleaf-spark', 4.3, 5.4, v_to={'s': 1.2})
    a.hop(4.3, h=14, air=.22)
    a.happy(4.5, 5.6)
    a.at('blush', 4.5, {}, SNAP).at('blush', 4.7, {'s': 1.2}, SOFT).at('blush', 5.6, {'s': 1.2}, OUTQ).at('blush', 5.9, {}, LIN)
    a.flick(6.2)
    a.move('head', 8.0, {'r': -10, 'x': -2}, dur=.3, hold=1.1, back=.35, antic={'r': 2}); a.look(7.9, -3, 1, 1.3)
    a.ear('l', 10.2, -10)
    out.append(a)

    a = Anim('argent', 11.8, props=['prop-coin', 'prop-coin-spark'], title='Azami · Argent', desc='Elle pousse une pièce du bout de la patte, la regarde rouler, la rattrape.')
    a.origins['Pcoin'] = '333px 359px'
    a.idle(); a.blink(.7); a.blink(10.2)
    a.look(1.0, 4, 4, 1.0)
    a.move('head', 1.1, {'r': 8, 'y': 4}, dur=.3, hold=4.2, back=.35, antic={'r': -2})
    for k in range(2):
        t = 2.0 + k * .7
        a.at('front-near', t, {}, ANT).at('front-near', t + .12, {'r': -14}, SNAP).at('front-near', t + .3, {}, LIN)
        a.at('Pcoin', t + .1, {}, SNAP).at('Pcoin', t + .25, {'x': 6 + k * 6, 'r': 40 + k * 40}, OUTQ).at('Pcoin', t + .6, {'x': 6 + k * 6, 'r': 40 + k * 40}, LIN)
    a.at('Pcoin', 3.5, {'x': 12, 'r': 80}, OUTQ).at('Pcoin', 4.3, {'x': 44, 'r': 400}, OUTQ)
    a.look(3.6, 5, 4, 1.2)
    a.hop(4.6, h=20, air=.26, tilt=4)
    a.at('Pcoin', 4.95, {'x': 44, 'r': 400}, SNAP).at('Pcoin', 5.6, {'x': 0, 'r': 720}, OUTQ)
    a.show('Pcoin-spark', 5.4, 6.6, v_to={'s': 1.25})
    a.happy(5.6, 6.8)
    a.flick(7.2)
    a.move('head', 8.2, {'r': -10, 'x': -2}, dur=.3, hold=1.0, back=.35, antic={'r': 2}); a.ear('l', 8.1, -11, .9)
    out.append(a)

    a = Anim('care', 12.2, props=['prop-envelope', 'prop-heart'], title='Azami · Care', desc='Elle garde une lettre, un petit cœur s’envole, clignement lent amoureux.')
    a.idle(depth=1.1); a.blink(.8); a.blink(10.6)
    a.look(1.2, 4, 4, 1.2)
    a.move('head', 1.3, {'r': 9, 'y': 4}, dur=.35, hold=1.4, back=.35, antic={'r': -2})
    a.at('Penvelope', 2.4, {}, ANT).at('Penvelope', 2.55, {'y': -6, 'r': -4}, SNAP).at('Penvelope', 2.9, {}, LIN)
    a.show('Pheart', 2.7, 4.6, v_from={'y': 0}, v_to={'y': -40, 'x': 6, 's': 1.15})
    a.look(2.9, 5, -3, 1.4)
    a.happy(5.0, 6.6)
    a.move('head', 5.0, {'r': -8, 'y': 2}, dur=.5, hold=1.0, back=.5, ease_in=SOFT, ease_out=SOFT)
    a.at('blush', 5.0, {}, SOFT).at('blush', 5.5, {'s': 1.25}, SOFT).at('blush', 6.6, {'s': 1.25}, SOFT).at('blush', 7.1, {}, LIN)
    a.ear('l', 5.1, -10, 1.2); a.ear('r', 5.1, 10, 1.2)
    a.flick(7.6); a.move('head', 8.6, {'r': 10, 'x': 2}, dur=.3, hold=.9, back=.35, antic={'r': -2})
    out.append(a)

    a = Anim('reussite', 10.2, props=['prop-trophy', 'prop-glory'], title='Azami · Réussite', desc='Fière, poitrail bombé, le trophée brille.')
    a.idle(); a.blink(.6); a.blink(8.7)
    a.move('character', 1.2, {'sy': 1.04, 'y': -4}, dur=.35, hold=2.0, back=.4, antic={'sy': .96, 'sx': 1.03})
    a.move('head', 1.2, {'r': -7, 'y': -6}, dur=.35, hold=2.0, back=.4)
    a.happy(1.4, 3.3)
    a.at('tail-tip', 1.2, {}, SNAP).at('tail-tip', 1.5, {'r': -18}, SOFT).at('tail-tip', 3.4, {'r': -14}, OUTQ).at('tail-tip', 3.8, {}, LIN)
    for k, t in enumerate((1.4, 2.4, 5.2, 7.4)):
        a.at('Pglory', t, {}, SNAP).at('Pglory', t + .2, {'s': 1.25, 'r': 8}, OUTQ).at('Pglory', t + .55, {}, LIN)
    a.at('Ptrophy', 4.6, {}, SOFT).at('Ptrophy', 4.8, {'r': -4}, SOFT).at('Ptrophy', 5.0, {'r': 4}, SOFT).at('Ptrophy', 5.2, {}, LIN)
    a.look(4.4, 5, 4, 1.4); a.move('head', 4.5, {'r': 9, 'y': 3}, dur=.3, hold=1.2, back=.35, antic={'r': -2})
    a.hop(6.6, h=18, air=.24)
    a.happy(6.8, 7.6)
    out.append(a)

    a = Anim('cuisine', 14.4, props=['prop-pan', 'prop-steam', 'prop-spoon'], title='Azami · Cuisine', desc='Elle renifle la casserole qui fume, se lèche les babines, suit la cuillère des yeux.')
    a.idle(); a.blink(.9); a.blink(12.6)
    for k in range(3):
        t = 1.0 + k * 4.4
        a.show('Psteam', t, t + 2.6, v_from={'y': 6, 's': .8}, v_to={'y': -18, 's': 1.15})
    a.look(1.6, 5, 2, 1.0)
    a.move('head', 1.8, {'r': 10, 'x': 5, 'y': 3}, dur=.35, hold=1.6, back=.35, antic={'r': -2})
    for k in range(4):   # reniflements : moustaches et museau
        t = 2.2 + k * .3
        a.at('whiskers', t, {}, SNAP).at('whiskers', t + .1, {'y': -2.5, 'sx': 1.05}, OUTQ).at('whiskers', t + .25, {}, LIN)
    a.happy(4.2, 5.4)
    for k in range(2):   # se lèche les babines
        t = 4.4 + k * .45
        a.at('mouth-open', t, {'s': .2, 'o': 0}, STEP).at('mouth-open', t + .02, {'sx': .8, 'sy': .7, 'o': 1}, SNAP).at('mouth-open', t + .2, {'sx': .6, 'sy': .5, 'o': 1}, STEP).at('mouth-open', t + .22, {'s': .2, 'o': 0}, LIN)
    a.at('mouth-smile', 4.4, {'o': 1}, STEP).at('mouth-smile', 4.42, {'o': 0}, STEP).at('mouth-smile', 5.1, {'o': 1}, LIN)
    for k in range(3):   # la cuillère remue, les yeux la suivent
        t = 6.4 + k * .8
        a.at('Pspoon', t, {}, SOFT).at('Pspoon', t + .4, {'r': -14}, SOFT).at('Pspoon', t + .8, {}, LIN)
    a.look(6.4, 5, -5, .3); a.look(6.85, 3, -1, .3); a.look(7.25, 5, -5, .3); a.look(7.65, 3, -1, .3); a.look(8.05, 5, -5, .4)
    a.move('head', 6.4, {'r': 6, 'y': -3}, dur=.3, hold=2.0, back=.4)
    a.hop(9.4, h=12, air=.2)
    a.flick(10.6); a.ear('l', 11.4, -10)
    out.append(a)

    # ---------- nouvelles scènes -----------------------------------------------------
    a = Anim('calme', 12, title='Azami · Calme', desc='Respiration lente, clignements lents amoureux, la queue ondule doucement.')
    a.idle(breathe=4.0, tail=6.0, depth=1.5)
    a.happy(1.0, 3.2); a.happy(5.8, 8.6); a.blink(10.5)
    a.move('head', 1.0, {'r': -5, 'y': 2}, dur=.8, hold=1.4, back=.8, ease_in=SOFT, ease_out=SOFT)
    a.move('head', 5.8, {'r': 5, 'y': 2}, dur=.8, hold=2.0, back=.8, ease_in=SOFT, ease_out=SOFT)
    a.at('blush', 1.0, {}, SOFT).at('blush', 1.8, {'s': 1.15}, SOFT).at('blush', 3.2, {'s': 1.15}, SOFT).at('blush', 4.0, {}, LIN)
    a.ear('r', 4.6, 8)
    out.append(a)

    a = Anim('connexion', 10, title='Azami · Connexion', desc='Assise devant la porte, elle attend qu’on rentre, sautille de joie.', under_svg=DOOR)
    a.idle(); a.blink(.8); a.blink(5.4); a.blink(8.9)
    a.look(1.4, 5, -2, 1.2)
    a.move('head', 1.5, {'r': 10, 'x': 3}, dur=.3, hold=1.0, back=.35, antic={'r': -2}); a.ear('r', 1.35, 13, 1.0)
    a.hop(3.6, h=16, air=.22); a.hop(4.2, h=12, air=.2)
    a.happy(3.8, 4.8)
    a.at('tail-tip', 3.6, {}, SNAP).at('tail-tip', 3.9, {'r': -16}, SOFT).at('tail-tip', 5.0, {}, LIN)
    a.move('head', 6.4, {'r': -9}, dur=.3, hold=1.0, back=.35, antic={'r': 2}); a.ear('l', 6.3, -11, .9)
    out.append(a)

    a = Anim('hors_ligne', 12, title='Azami · Hors ligne', desc='Elle somnole à côté de la box, des petits « z » montent.', under_svg=ROUTER, extra_svg=ZZZ)
    a.origins['Xz1'] = '259px 160px'; a.origins['Xz2'] = '287px 128px'
    a.idle(breathe=4.0, tail=6.0, depth=1.4)
    a.happy(0.3, 11.6)
    a.move('head', 0.0, {'r': -4, 'y': 5}, dur=1.0, hold=10.2, back=.6, ease_in=SOFT, ease_out=SOFT)
    for k in range(3):
        t = 1.0 + k * 3.6
        a.show('Xz1', t, t + 2.2, v_from={'y': 4}, v_to={'y': -16, 'x': 6})
        a.show('Xz2', t + .9, t + 3.1, v_from={'y': 4}, v_to={'y': -18, 'x': 8})
    a.ear('l', 6.0, -10)
    out.append(a)

    a = Anim('chargement', 3.6, title='Azami · Chargement', desc='Elle suit des yeux une pelote qui roule.', extra_svg=YARN)
    a.origins['Xyarn'] = '330px 376px'
    a.idle(breathe=1.8, tail=3.6)
    a.at('Xyarn', 0, {}, SOFT).at('Xyarn', 1.8, {'x': 70, 'r': 300}, SOFT).at('Xyarn', 3.6, {}, LIN)
    for p in ('pupils-l', 'pupils-r'):
        a.at(p, 0, {'x': 2, 'y': 3}, SOFT).at(p, 1.8, {'x': 5, 'y': 3}, SOFT).at(p, 3.6, {'x': 2, 'y': 3}, LIN)
    a.at('head', 0, {'r': 4, 'y': 2}, SOFT).at('head', 1.8, {'r': 9, 'x': 3, 'y': 2}, SOFT).at('head', 3.6, {'r': 4, 'y': 2}, LIN)
    a.blink(2.6)
    out.append(a)

    a = Anim('guide', 10, title='Azami · Guide', desc='Patte levée vers l’avant, elle montre quelque chose puis nous regarde.')
    a.idle(); a.blink(1.6); a.blink(7.6)
    a.at('front-near', 0, {}, ANT).at('front-near', .25, {'r': 6}, SNAP).at('front-near', .6, {'r': 72, 'x': -4, 'y': -12}, OUTQ)
    for k in range(4):
        t = 1.0 + k * 2.2
        a.at('front-near', t, {'r': 72, 'x': -4, 'y': -12}, SOFT).at('front-near', t + .3, {'r': 80, 'x': -4, 'y': -14}, SOFT).at('front-near', t + .6, {'r': 72, 'x': -4, 'y': -12}, LIN)
    a.at('front-near', 9.4, {'r': 72, 'x': -4, 'y': -12}, ANT).at('front-near', 9.85, {}, SNAP)
    a.look(2.2, -5, 1, 1.0); a.look(5.4, -5, 1, 1.0)
    a.move('head', 2.3, {'r': -8, 'x': -3}, dur=.3, hold=.8, back=.3, antic={'r': 2})
    a.move('head', 5.5, {'r': -8, 'x': -3}, dur=.3, hold=.8, back=.3, antic={'r': -2})
    a.at('tail-tip', .2, {}, SNAP).at('tail-tip', .6, {'r': -18}, SOFT).at('tail-tip', 9.3, {'r': -14}, SOFT).at('tail-tip', 9.8, {}, LIN)
    a.happy(4.0, 4.7); a.hop(7.0, h=10, air=.18)
    out.append(a)
    return out

if __name__ == '__main__':
    for a in anims(): print(write(a, 'scene'))
