# Réactions (jouées une fois, finissent sur la pose neutre pour rendre la main à la scène).
from lib import *

TRASH = '''<g id="Xtrash"><path d="M326 330 Q318 360 330 392 H398 Q410 360 402 330Z" fill="#4A5A6A" stroke="#172B42" stroke-width="5" stroke-linejoin="round"/>
<path d="M340 330 Q352 316 364 326 Q376 314 388 330" stroke="#172B42" stroke-width="5" fill="#4A5A6A" stroke-linejoin="round"/><path d="M342 352 Q352 368 344 384" stroke="#7D8C9A" stroke-width="4" fill="none" stroke-linecap="round"/></g>'''
DUSTOFF = '<g id="Xpuff"><circle cx="232" cy="398" r="9" fill="#FFF2D9" opacity=".9"/><circle cx="252" cy="404" r="6" fill="#FFF2D9" opacity=".8"/><circle cx="214" cy="404" r="6" fill="#FFF2D9" opacity=".8"/></g>'
ARROWS = '<g id="Xarrows"><path d="M120 330 L100 344 L120 358 M380 330 L400 344 L380 358" stroke="#FFF2D9" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>'
CHEV = '<g id="Xchev"><path d="M330 300 L354 324 L330 348" stroke="#F9C849" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M360 300 L384 324 L360 348" stroke="#F9C849" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/></g>'

def center(a, prop):
    x, y, w, h = BBOX[prop]
    a.origins['P' + prop[5:]] = f'{x + w / 2}px {y + h / 2}px'

def blushy(a, t0, t1, s=1.25):
    a.at('blush', t0, {}, SNAP).at('blush', t0 + .2, {'s': s}, SOFT).at('blush', t1, {'s': s}, OUTQ).at('blush', t1 + .3, {}, LIN)

def tail_up(a, t0, t1, r=-16):
    a.at('tail-tip', t0, {}, SNAP).at('tail-tip', t0 + .3, {'r': r}, SOFT).at('tail-tip', t1, {'r': r * .8}, OUTQ).at('tail-tip', t1 + .35, {}, LIN)

def anims():
    out = []
    R = lambda name, D, props=(), **k: Anim(name, D, loop=False, props=props, **k)

    a = R('tache_cochee', 4.4, ['prop-check'], title='Azami · Tâche cochée', desc='Une coche apparaît, petit bond de joie.')
    center(a, 'prop-check'); a.idle(breathe=2.2, tail=4.4)
    a.look(.2, 5, 3, .5); a.ear('r', .2, 12)
    a.show('Pcheck', .4, 3.9, v_to={'s': 1})
    a.at('Pcheck', .72, {'o': 1}, SNAP).at('Pcheck', .9, {'s': 1.18, 'r': -6, 'o': 1}, OUTQ).at('Pcheck', 1.15, {'o': 1}, LIN)
    a.hop(1.0, h=24, air=.26)
    a.happy(1.2, 2.6); blushy(a, 1.2, 2.5); tail_up(a, 1.1, 2.6)
    a.flick(3.1); a.blink(3.7)
    out.append(a)

    a = R('corvee_terminee', 4.8, ['prop-sparkle'], title='Azami · Corvée terminée', desc='Tout brille, elle bombe le torse, fière.')
    center(a, 'prop-sparkle'); a.idle(breathe=2.4, tail=4.8)
    a.show('Psparkle', .3, 3.6)
    for t in (.8, 1.6, 2.4): a.at('Psparkle', t, {'o': 1}, SNAP).at('Psparkle', t + .2, {'s': 1.15, 'r': 6, 'o': 1}, OUTQ).at('Psparkle', t + .5, {'o': 1}, LIN)
    a.look(.4, 5, 2, .8)
    a.move('character', 1.4, {'sy': 1.04, 'y': -4}, dur=.3, hold=1.4, back=.4, antic={'sy': .96, 'sx': 1.03})
    a.move('head', 1.4, {'r': -7, 'y': -6}, dur=.3, hold=1.4, back=.4)
    a.happy(1.6, 3.1); tail_up(a, 1.4, 3.2, -18)
    a.flick(3.8)
    out.append(a)

    a = R('courses_completees', 4.3, ['prop-basket', 'prop-veg'], title='Azami · Courses complètes', desc='Le panier est plein, un légume saute, elle sautille.')
    center(a, 'prop-veg'); a.idle(breathe=2.15, tail=4.3)
    a.look(.2, 5, 3, 1.0); a.move('head', .2, {'r': 8, 'y': 3}, dur=.3, hold=.7, back=.3, antic={'r': -2})
    a.at('Pveg', .7, {}, ANT).at('Pveg', .85, {'y': -30, 'r': -15}, SNAP).at('Pveg', 1.3, {'y': -30, 'r': 10}, ANT).at('Pveg', 1.55, {}, SNAP).at('Pveg', 1.8, {}, LIN)
    a.at('Pbasket', 1.55, {}, SNAP).at('Pbasket', 1.65, {'sy': .94, 'sx': 1.04}, OUTQ).at('Pbasket', 1.9, {}, LIN)
    a.hop(1.8, h=20, air=.24); a.hop(2.45, h=12, air=.2)
    a.happy(1.9, 3.2); blushy(a, 1.9, 3.1); tail_up(a, 1.8, 3.2)
    a.blink(3.8)
    out.append(a)

    a = R('comptes_equilibres', 4.7, ['prop-scale'], title='Azami · Comptes équilibrés', desc='La balance hésite puis s’équilibre, elle hoche la tête.')
    x, y, w, h = BBOX['prop-scale']; a.origins['Pscale'] = f'{x + w / 2}px {y + h}px'
    a.idle(breathe=2.35, tail=4.7)
    a.look(.2, 5, 2, 2.2)
    a.at('Pscale', .4, {}, SOFT).at('Pscale', .85, {'r': -9}, SOFT).at('Pscale', 1.3, {'r': 7}, SOFT).at('Pscale', 1.7, {'r': -3}, SOFT).at('Pscale', 2.0, {}, SNAP)
    for t, r in ((.4, -4), (.85, 4), (1.3, -3), (1.7, 2)): a.at('head', t, {'r': r}, SOFT)
    a.at('head', 0, {}, SOFT).at('head', 2.0, {}, LIN)
    a.move('head', 2.3, {'r': -3, 'y': 6}, dur=.18, hold=.05, back=.2)   # hochement
    a.move('head', 2.8, {'r': -3, 'y': 6}, dur=.18, hold=.05, back=.2)
    a.happy(2.4, 3.8); blushy(a, 2.4, 3.6, 1.15)
    a.flick(4.0)
    out.append(a)

    a = R('mot_envoye', 4.2, ['prop-mail', 'prop-heart'], title='Azami · Mot envoyé', desc='Elle pousse la lettre, qui file avec un petit cœur.')
    center(a, 'prop-heart'); a.idle(breathe=2.1, tail=4.2)
    a.hidden.add('Pmail')
    a.at('Pmail', 0, {'o': 1}, LIN).at('Pmail', .7, {'o': 1}, ANT).at('Pmail', .8, {'x': -6, 'o': 1}, ANT).at('Pmail', 1.4, {'x': 120, 'y': -70, 'r': -14, 's': .6, 'o': 0}, LIN)
    a.at('Pmail', 3.6, {'s': .3, 'o': 0}, STEP).at('Pmail', 3.62, {'s': .5, 'o': 1}, SNAP).at('Pmail', 3.9, {'o': 1}, LIN)
    a.at('front-near', .6, {}, ANT).at('front-near', .75, {'r': -16}, SNAP).at('front-near', 1.0, {}, LIN)
    a.look(.3, 5, 3, .5); a.look(.95, 6, -5, .9)
    a.move('head', .95, {'r': 8, 'y': -3}, dur=.3, hold=.6, back=.3)
    a.show('Pheart', 1.5, 3.2, v_from={'y': 0}, v_to={'y': -40, 's': 1.1})
    a.happy(1.7, 3.0); blushy(a, 1.7, 2.9)
    a.blink(3.7)
    out.append(a)

    a = R('objectif_commun', 5.0, ['prop-heart'], title='Azami · Objectif commun', desc='Un grand cœur grandit, elle saute deux fois de joie.')
    center(a, 'prop-heart'); a.idle(breathe=2.5, tail=5.0)
    a.show('Pheart', .3, 4.4)
    a.at('Pheart', .6, {'o': 1}, SNAP).at('Pheart', .9, {'s': 1.45, 'y': -20, 'o': 1}, SOFT).at('Pheart', 1.25, {'s': 1.3, 'y': -20, 'o': 1}, SOFT)
    for t in (1.6, 2.4, 3.2): a.at('Pheart', t, {'s': 1.42, 'y': -20, 'o': 1}, SOFT).at('Pheart', t + .2, {'s': 1.3, 'y': -20, 'o': 1}, SOFT)
    a.at('Pheart', 4.2, {'s': 1.3, 'y': -20, 'o': 1}, ANT)
    a.look(.3, 5, -2, .9)
    a.hop(1.3, h=26, air=.26, tilt=-3); a.hop(2.05, h=18, air=.22)
    a.happy(1.4, 3.6); blushy(a, 1.4, 3.6, 1.3); a.mouth(1.5, 2.3, 1.0); tail_up(a, 1.3, 3.6, -18)
    a.blink(4.4)
    out.append(a)

    a = R('surprise_coucou', 4.6, [], title='Azami · Coucou', desc='Oreilles dressées, elle fait coucou de la patte.')
    a.idle(breathe=2.3, tail=4.6)
    a.ear('l', .1, -14, .6); a.ear('r', .1, 14, .6)
    a.at('character', .1, {}, ANT).at('character', .2, {'sy': 1.05, 'y': -6}, SNAP).at('character', .6, {}, OUTQ).at('character', .8, {}, LIN)
    for p in ('pupils-l', 'pupils-r'): a.at(p, .1, {}, SNAP).at(p, .2, {'s': 1.1}, OUTQ).at(p, .9, {'s': 1.1}, OUTQ).at(p, 1.1, {}, LIN)
    a.at('front-near', 1.0, {}, ANT).at('front-near', 1.25, {'r': 92, 'x': -6, 'y': -8}, SNAP)
    for k in range(4):
        t = 1.25 + k * .36
        a.at('front-near', t, {'r': 92, 'x': -6, 'y': -8}, SOFT).at('front-near', t + .18, {'r': 72, 'x': -6, 'y': -12}, SOFT)
    a.at('front-near', 2.7, {'r': 92, 'x': -6, 'y': -8}, ANT).at('front-near', 3.0, {}, SNAP).at('front-near', 3.2, {}, LIN)
    a.happy(1.4, 2.8); a.mouth(1.4, 2.0, .9); blushy(a, 1.4, 2.7)
    a.move('head', 1.3, {'r': -6}, dur=.3, hold=1.2, back=.3)
    a.flick(3.5); a.blink(4.0)
    out.append(a)

    a = R('fete_reussites', 5.2, ['prop-confetti', 'prop-star'], title='Azami · Fête', desc='Confettis, étoile qui tourne, elle saute de joie trois fois.')
    center(a, 'prop-star'); a.idle(breathe=2.6, tail=5.2)
    a.show('Pconfetti', .2, 4.4, v_from={'y': -60}, v_to={'y': 20})
    a.show('Pstar', .5, 4.2)
    a.at('Pstar', .8, {'o': 1}, LIN).at('Pstar', 2.4, {'r': 360, 's': 1.15, 'o': 1}, SOFT).at('Pstar', 3.9, {'r': 360, 'o': 1}, ANT)
    a.hop(.6, h=26, air=.26); a.hop(1.3, h=20, air=.24, tilt=-3); a.hop(2.0, h=14, air=.2)
    a.happy(.8, 3.2); a.mouth(.8, 1.8, 1.2); blushy(a, .8, 3.2, 1.3); tail_up(a, .6, 3.3, -20)
    a.ear('l', .7, -12, 1.8); a.ear('r', .7, 12, 1.8)
    a.blink(4.5)
    out.append(a)

    a = R('annuler', 3.0, ['prop-oops'], title='Azami · Annulé', desc='Oups : elle penche la tête, oreilles de côté, puis ça repart.')
    a.idle(breathe=1.5, tail=3.0)
    a.show('Poops', .15, 1.8)
    a.move('head', .1, {'r': -12, 'x': -2, 'y': 3}, dur=.3, hold=1.0, back=.35, antic={'r': 2})
    a.at('ear-left', .1, {}, SNAP).at('ear-left', .35, {'r': 18}, OUTQ).at('ear-left', 1.35, {'r': 18}, SOFT).at('ear-left', 1.7, {}, LIN)
    a.at('ear-right', .1, {}, SNAP).at('ear-right', .35, {'r': -14}, OUTQ).at('ear-right', 1.35, {'r': -14}, SOFT).at('ear-right', 1.7, {}, LIN)
    a.look(.15, -3, 3, 1.0)
    a.at('character', .1, {}, SNAP).at('character', .3, {'sy': .97, 'sx': 1.02}, OUTQ).at('character', 1.3, {'sy': .97, 'sx': 1.02}, SOFT).at('character', 1.6, {}, LIN)
    a.blink(1.9); a.happy(2.2, 2.7)
    out.append(a)

    a = R('minuteur_fini', 3.0, ['prop-timer'], title='Azami · Minuteur fini', desc='Le minuteur sonne, ses oreilles se dressent, elle sautille.')
    center(a, 'prop-timer'); a.idle(breathe=1.5, tail=3.0)
    a.shake('Ptimer', .1, amp=9, n=10, period=.07)
    a.at('Ptimer', .9, {}, LIN)
    a.ear('l', .1, -14, .5); a.ear('r', .12, 14, .5)
    a.look(.15, 5, 3, 1.2)
    a.move('head', .2, {'r': 9, 'x': 3}, dur=.25, hold=.7, back=.3, antic={'r': -2})
    a.hop(1.4, h=18, air=.22)
    a.happy(1.5, 2.4); a.flick(2.4)
    out.append(a)

    a = R('machine_lancee', 3.0, ['prop-washer', 'prop-drum'], title='Azami · Machine lancée', desc='Le tambour tourne, elle le suit des yeux, toute contente.')
    center(a, 'prop-drum'); a.idle(breathe=1.5, tail=3.0)
    a.at('Pdrum', .2, {}, ANT).at('Pdrum', 2.6, {'r': 720}, OUTQ)
    a.at('Pwasher', .2, {}, LIN)
    for k in range(6): a.at('Pwasher', .25 + k * .25, {'x': 1.5 if k % 2 == 0 else -1.5}, SOFT)
    a.at('Pwasher', 1.85, {}, LIN)
    pts = [(5, 6), (6, 3), (5, 0), (3, 3), (5, 6), (6, 3)]
    for p in ('pupils-l', 'pupils-r'):
        a.at(p, .2, {}, SOFT)
        for k, (dx, dy) in enumerate(pts): a.at(p, .4 + k * .22, {'x': dx, 'y': dy}, SOFT)
        a.at(p, 1.9, {}, LIN)
    a.move('head', .3, {'r': 8, 'y': 3}, dur=.3, hold=1.2, back=.3)
    a.happy(2.0, 2.7); a.flick(2.2)
    out.append(a)

    a = R('recette_reussie', 4.0, ['prop-plate', 'prop-purr'], title='Azami · Recette réussie', desc='Elle renifle l’assiette, se lèche les babines, ronronne.')
    a.idle(breathe=2.0, tail=4.0)
    a.look(.2, 5, 4, .8)
    a.move('head', .2, {'r': 10, 'x': 5, 'y': 4}, dur=.3, hold=1.0, back=.35, antic={'r': -2})
    for k in range(3):
        t = .5 + k * .28
        a.at('whiskers', t, {}, SNAP).at('whiskers', t + .1, {'y': -2.5, 'sx': 1.05}, OUTQ).at('whiskers', t + .24, {}, LIN)
    a.happy(1.5, 3.2)
    for k in range(2):
        t = 1.6 + k * .42
        a.at('mouth-open', t, {'s': .2, 'o': 0}, STEP).at('mouth-open', t + .02, {'sx': .8, 'sy': .7, 'o': 1}, SNAP).at('mouth-open', t + .2, {'sx': .6, 'sy': .5, 'o': 1}, STEP).at('mouth-open', t + .22, {'s': .2, 'o': 0}, LIN)
    a.at('mouth-smile', 1.6, {'o': 1}, STEP).at('mouth-smile', 1.62, {'o': 0}, STEP).at('mouth-smile', 2.25, {'o': 1}, LIN)
    a.hidden.add('mouth-open')
    a.show('Ppurr', 2.0, 3.5, v_to={'y': -10})
    blushy(a, 2.0, 3.2); tail_up(a, 2.0, 3.2, -12)
    a.blink(3.7)
    out.append(a)

    a = R('a_finir_vite', 3.0, ['prop-food', 'prop-alert'], title='Azami · À finir vite', desc='Petit point d’exclamation : elle regarde la nourriture, l’air de dire « vite ».')
    center(a, 'prop-alert'); a.idle(breathe=1.5, tail=3.0)
    a.show('Palert', .1, 2.4)
    for t in (.4, 1.0, 1.6): a.at('Palert', t, {'o': 1}, SNAP).at('Palert', t + .12, {'s': 1.2, 'o': 1}, OUTQ).at('Palert', t + .4, {'o': 1}, LIN)
    a.ear('l', .1, -12, .9); a.ear('r', .1, 12, .9)
    a.look(.2, 5, 4, 1.1)
    a.move('head', .25, {'r': 9, 'y': 4}, dur=.25, hold=.9, back=.3, antic={'r': -2})
    a.flick(.6, 26); a.flick(1.3, 26)
    a.at('front-near', 1.5, {}, ANT).at('front-near', 1.62, {'r': -12}, SNAP).at('front-near', 1.85, {}, LIN)
    a.blink(2.3)
    out.append(a)

    a = R('caresse_2', 2.5, ['prop-spark'], title='Azami · Caresse 2', desc='Elle penche la tête dans la caresse, yeux heureux, une étincelle.')
    center(a, 'prop-spark'); a.idle(breathe=1.25, tail=2.5)
    a.move('head', .05, {'r': -11, 'x': -3, 'y': 3}, dur=.3, hold=1.2, back=.4, antic={'r': 2}, ease_in=OUTQ)
    a.happy(.12, 1.6); blushy(a, .12, 1.5, 1.3)
    a.ear('l', .1, -10, 1.0)
    a.show('Pspark', .3, 1.6); a.at('Pspark', .6, {'o': 1}, LIN).at('Pspark', 1.3, {'r': 45, 'o': 1}, LIN)
    tail_up(a, .2, 1.5, -12); a.blink(2.1)
    out.append(a)

    a = R('caresse_3', 2.5, ['prop-purr'], title='Azami · Caresse 3', desc='Elle ronronne et se blottit, la queue s’enroule.')
    a.idle(breathe=1.25, tail=2.5)
    a.move('character', .05, {'sy': .96, 'sx': 1.03, 'x': 3}, dur=.4, hold=1.0, back=.4, ease_in=SOFT, ease_out=SOFT)
    a.move('head', .05, {'r': 8, 'y': 4}, dur=.35, hold=1.1, back=.4, ease_in=SOFT, ease_out=SOFT)
    a.happy(.1, 1.7); blushy(a, .1, 1.6, 1.3)
    a.show('Ppurr', .3, 1.8, v_to={'y': -12})
    for k in range(4): a.at('whiskers', .4 + k * .3, {}, SOFT).at('whiskers', .55 + k * .3, {'y': -1.5}, SOFT)
    a.at('whiskers', 1.7, {}, LIN)
    a.at('tail-tip', .2, {}, SOFT).at('tail-tip', .6, {'r': 24}, SOFT).at('tail-tip', 1.5, {'r': 20}, SOFT).at('tail-tip', 1.9, {}, LIN)
    a.blink(2.15)
    out.append(a)

    # ---------- nouvelles réactions -------------------------------------------------
    a = R('coup_de_main', 3.5, ['prop-heart'], title='Azami · Coup de main', desc='Elle tend la patte, un petit cœur : « je t’aide ».')
    center(a, 'prop-heart'); a.idle(breathe=1.75, tail=3.5)
    a.look(.1, -4, 0, .6)
    a.at('front-near', .3, {}, ANT).at('front-near', .55, {'r': 70, 'x': -6, 'y': -12}, SNAP).at('front-near', 1.9, {'r': 74, 'x': -6, 'y': -13}, ANT).at('front-near', 2.2, {}, SNAP).at('front-near', 2.4, {}, LIN)
    a.move('head', .4, {'r': -7, 'y': 2}, dur=.3, hold=1.3, back=.35)
    a.show('Pheart', .7, 2.4, v_from={'x': -205, 'y': -20}, v_to={'x': -240, 'y': -45, 's': 1.1})
    a.happy(.8, 2.0); blushy(a, .8, 2.0); a.flick(2.6); a.blink(3.0)
    out.append(a)

    a = R('aide_acceptee', 3.5, ['prop-heart'], title='Azami · Aide acceptée', desc='Le cœur grandit, elle bondit, soulagée et heureuse.')
    center(a, 'prop-heart'); a.idle(breathe=1.75, tail=3.5)
    a.show('Pheart', .2, 2.9)
    a.at('Pheart', .5, {'o': 1}, SNAP).at('Pheart', .75, {'s': 1.4, 'y': -14, 'o': 1}, OUTQ).at('Pheart', 2.7, {'s': 1.35, 'y': -22, 'o': 1}, ANT)
    a.ear('l', .2, -10); a.ear('r', .2, 10)
    a.hop(.8, h=24, air=.26)
    a.happy(1.0, 2.4); a.mouth(1.0, 1.7, 1.0); blushy(a, 1.0, 2.3, 1.3); tail_up(a, .8, 2.4)
    a.blink(3.0)
    out.append(a)

    a = R('calme_termine', 4.5, ['prop-sparkle'], title='Azami · Calme terminé', desc='Un grand soupir de soulagement, un petit étirement, tout brille.')
    center(a, 'prop-sparkle'); a.idle(breathe=2.25, tail=4.5)
    a.move('core', .2, {'sy': 1.06, 'sx': 1.03, 'y': -3}, dur=.7, hold=.2, back=.9, ease_in=SOFT, ease_out=SOFT)   # inspire, expire
    a.move('head', .2, {'r': -6, 'y': -4}, dur=.7, hold=.2, back=.9, ease_in=SOFT, ease_out=SOFT)
    a.happy(.5, 2.2)
    a.move('front-near', 2.3, {'r': 28}, dur=.4, hold=.5, back=.35, antic={'r': -4})
    a.move('front-far', 2.35, {'r': 22}, dur=.4, hold=.45, back=.35)
    a.show('Psparkle', 2.4, 4.0)
    a.happy(2.5, 3.4); blushy(a, 2.5, 3.4, 1.15); a.flick(3.7)
    out.append(a)

    a = R('pris_par_l_autre', 2.5, ['prop-check'], title='Azami · Pris par l’autre', desc='Une coche : l’autre s’en occupe, elle hoche la tête, rassurée.')
    center(a, 'prop-check'); a.idle(breathe=1.25, tail=2.5)
    a.look(.1, 5, 3, .5); a.ear('r', .1, 13, .4)
    a.show('Pcheck', .2, 2.0)
    a.move('head', .8, {'y': 6, 'r': -3}, dur=.16, hold=.04, back=.2); a.move('head', 1.2, {'y': 6, 'r': -3}, dur=.16, hold=.04, back=.2)
    a.happy(.9, 1.7); a.flick(1.8)
    out.append(a)

    a = R('deplacer', 2.0, title='Azami · Déplacer', desc='Elle se décale d’un pas sur le côté, puis revient.', extra_svg=ARROWS)
    a.idle(breathe=1.0, tail=2.0)
    a.show('Xarrows', .05, 1.4)
    a.at('character', 0, {}, ANT).at('character', .15, {'x': -4, 'sx': 1.03, 'sy': .97}, SNAP).at('character', .45, {'x': -18, 'r': -2}, OUTQ).at('character', .7, {'x': -18}, SOFT)
    a.at('character', 1.05, {'x': 10, 'r': 2}, SOFT).at('character', 1.45, {}, SNAP).at('character', 1.7, {}, LIN)
    a.look(.1, -5, 1, .5); a.look(.8, 5, 1, .4)
    a.happy(1.5, 1.85)
    out.append(a)

    a = R('dechets_descendus', 3.5, title='Azami · Déchets descendus', desc='Le sac poubelle part, elle s’époussette les pattes, fière.', extra_svg=TRASH + DUSTOFF)
    a.origins['Xtrash'] = '364px 392px'; a.origins['Xpuff'] = '232px 404px'
    a.idle(breathe=1.75, tail=3.5)
    a.hidden.add('Xtrash')
    a.at('Xtrash', 0, {'o': 1}, LIN).at('Xtrash', .3, {'o': 1}, ANT).at('Xtrash', .45, {'y': 4, 'sy': .92, 'o': 1}, SNAP).at('Xtrash', .9, {'x': 140, 'y': -20, 'r': 24, 's': .7, 'o': 0}, LIN)
    a.at('front-near', .25, {}, ANT).at('front-near', .4, {'r': -18}, SNAP).at('front-near', .65, {}, LIN)
    a.look(.4, 6, -3, .6)
    for k in range(3):
        t = 1.2 + k * .3
        a.at('front-near', t, {}, SOFT).at('front-near', t + .15, {'r': 8, 'y': -6}, SOFT).at('front-near', t + .3, {}, LIN)
    a.show('Xpuff', 1.3, 2.2, v_to={'y': -8, 's': 1.2})
    a.move('character', 2.2, {'sy': 1.04, 'y': -3}, dur=.3, hold=.6, back=.35, antic={'sy': .96})
    a.happy(2.3, 3.0); tail_up(a, 2.2, 3.0)
    out.append(a)

    a = R('etape_suivante', 1.8, title='Azami · Étape suivante', desc='Petit hochement et un bond : on passe à la suite.', extra_svg=CHEV)
    a.origins['Xchev'] = '357px 324px'
    a.idle(breathe=.9, tail=1.8)
    a.show('Xchev', .1, 1.3, v_from={'x': -10}, v_to={'x': 14})
    a.move('head', .1, {'y': 6, 'r': -3}, dur=.14, hold=.04, back=.18)
    a.hop(.5, h=14, air=.2)
    a.happy(.6, 1.2); a.flick(1.1)
    out.append(a)
    return out

if __name__ == '__main__':
    for a in anims(): print(write(a, 'reaction'))
