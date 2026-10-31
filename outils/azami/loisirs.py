# Scènes de la page Loisirs : Azami au ciné (lunettes 3D, pop-corn) et Azami collectionneuse (son album de cartes).
from lib import *
from props2 import INK, SPARK, twinkle
from cine import G3D

def cine():
    D = 12.0
    bucket = f'''<g id="Xbucket">
      <path d="M40 330 L150 330 L138 398 L52 398 Z" fill="#FFFFFF" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M58 332 L66 397 M84 332 L87 397 M110 332 L108 397 M134 332 L128 397" stroke="#E7505A" stroke-width="12"/>
      <path d="M40 330 L150 330 L138 398 L52 398 Z" fill="none" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>
      <g id="Xheap">{''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#FFF4D6" stroke="{INK}" stroke-width="3.5"/>' for x, y, r in ((52, 326, 13), (72, 318, 15), (95, 314, 16), (118, 318, 15), (139, 325, 13), (84, 304, 12), (108, 302, 12), (96, 292, 10)))}
        {''.join(f'<circle cx="{x}" cy="{y}" r="3" fill="#F7C948"/>' for x, y in ((70, 312), (100, 306), (122, 316), (88, 298)))}</g>
      <rect x="62" y="356" width="66" height="22" rx="5" fill="#2A1C15"/><text x="95" y="372" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="14" fill="#F7C948" text-anchor="middle">POP</text></g>'''
    kern = lambda i: f'<g id="Xk{i}"><circle cx="95" cy="296" r="9" fill="#FFF4D6" stroke="{INK}" stroke-width="3"/><circle cx="98" cy="293" r="2.4" fill="#F7C948"/></g>'
    extra = bucket + ''.join(kern(i) for i in range(4)) + SPARK('Xglint', 128, 196, .7, '#FFFFFF') + SPARK('Xstar', 70, 268, .8)
    a = Anim('cine', D, title='Azami · Ciné', desc='Azami en lunettes 3D devant son pot de pop-corn : un grain saute, elle l’attrape au vol, croque, puis sursaute devant le film et rit.',
             head_extra=G3D, extra_svg=extra)
    a.origins.update({'g3d': '177px 213px', 'Xheap': '95px 330px', 'Xbucket': '95px 398px'})
    a.idle(breathe=3.0, tail=4.0)
    a.blink(.5); a.blink(10.8)
    # le tas de pop-corn frémit, des grains sautent
    def pop(i, t, dx, h, land=None):
        n = f'Xk{i}'; a.hidden.add(n); a.origins[n] = '95px 296px'
        a.at(n, t, {'o': 0, 's': .5}, STEP).at(n, t + .02, {'o': 1, 's': .9}, OUTQ)
        a.at(n, t + .3, {'o': 1, 'x': dx * .5, 'y': -h, 'r': 120}, SOFT)
        if land:
            lx, ly, tl = land
            a.at(n, t + .62, {'o': 1, 'x': lx, 'y': ly, 'r': 260, 's': .8}, ANT).at(n, tl, {'o': 0, 'x': lx, 'y': ly, 's': .2}, LIN)
        else:
            a.at(n, t + .62, {'o': 1, 'x': dx, 'y': 4, 'r': 240}, ANT).at(n, t + .8, {'o': 0, 'x': dx, 'y': 6}, LIN)
    for t in (.9, 4.6, 8.8):
        a.at('Xheap', t, {}, SNAP).at('Xheap', t + .1, {'sy': 1.06, 'y': -2}, SNAP).at('Xheap', t + .25, {}, OUTQ)
    pop(0, .95, -36, 60); pop(1, 1.5, 28, 54)
    # le grain qui saute jusqu'à sa bouche : elle le suit des yeux et l'attrape
    pop(2, 2.4, 60, 120, land=(82, -34, 3.1))
    a.look(2.4, -2, -6, .5)
    a.move('head', 2.5, {'r': -8, 'y': -4, 'x': -6}, dur=.3, hold=.25, back=.3, antic={'r': 2})
    a.hidden.add('mouth-open')
    a.at('mouth-open', 2.6, {'o': 0, 's': .3}, STEP).at('mouth-open', 2.65, {'o': 1, 's': .6}, SNAP).at('mouth-open', 2.95, {'o': 1, 's': 1}, SOFT).at('mouth-open', 3.05, {'o': 0, 's': .3}, LIN)
    a.at('mouth-smile', 2.6, {'o': 1}, STEP).at('mouth-smile', 2.62, {'o': 0}, STEP).at('mouth-smile', 3.05, {'o': 1}, LIN)
    # croc croc : joues qui bougent, yeux heureux
    a.happy(3.1, 4.3)
    for k in range(4):
        t = 3.15 + k * .25
        a.at('whiskers', t, {}, SNAP).at('whiskers', t + .1, {'y': 2.5, 'sx': 1.04}, OUTQ).at('whiskers', t + .22, {}, LIN)
        a.at('blush', t, {}, SNAP).at('blush', t + .1, {'s': 1.15}, OUTQ).at('blush', t + .22, {}, LIN)
    a.ear('l', 3.2, -8, .8); a.ear('r', 3.2, 8, .8)
    pop(3, 4.65, -30, 50)
    # elle regarde le film (l'écran est devant elle, en haut à gauche)
    a.look(4.6, -5, -3, 2.0)
    twinkle(a, 'Xglint', 128, 196, (5.0, 9.9), s=1.1)
    a.move('g3d', 5.3, {'y': -3, 'r': -2}, dur=.15, hold=.2, back=.2)
    # oh ! sursaut (oreilles en arrière, petit recul, queue gonflée), puis elle rit
    a.at('character', 6.6, {}, ANT).at('character', 6.7, {'x': 8, 'y': -6, 'sy': 1.05}, SNAP).at('character', 7.1, {'x': 8, 'y': -6, 'sy': 1.05}, SOFT).at('character', 7.4, {}, OUTQ)
    a.at('head', 6.6, {}, ANT).at('head', 6.7, {'r': 6, 'y': -4}, SNAP).at('head', 7.2, {'r': 6, 'y': -4}, SOFT).at('head', 7.5, {}, OUTQ)
    a.ear('l', 6.7, 14, .5); a.ear('r', 6.7, -14, .5)
    a.at('tail', 6.7, {}, SNAP).at('tail', 6.8, {'sx': 1.15, 'r': 6}, SNAP).at('tail', 7.4, {'sx': 1.1, 'r': 4}, SOFT).at('tail', 7.8, {}, LIN)
    for p in ('pupils-l', 'pupils-r'):
        a.at(p, 6.68, {}, STEP).at(p, 6.72, {'s': 1.14, 'y': -2}, SNAP).at(p, 7.2, {'s': 1.14, 'y': -2}, LIN).at(p, 7.4, {}, LIN)
    twinkle(a, 'Xstar', 70, 268, (6.75,), s=1.3)
    a.happy(7.7, 9.0)
    for k in range(4):
        t = 7.8 + k * .28
        a.at('character', t, {}, SOFT).at('character', t + .14, {'y': -3, 'sy': 1.02}, SOFT)
    a.at('character', 8.95, {}, LIN)
    a.at('tail-tip', 7.8, {}, SNAP).at('tail-tip', 8.1, {'r': -18}, SOFT).at('tail-tip', 9.2, {'r': -12}, OUTQ).at('tail-tip', 9.6, {}, LIN)
    a.look(9.4, -4, -2, 1.2)
    return a

def collection():
    D = 12.0
    def card(x, y, col, ico):
        return f'<rect x="{x}" y="{y}" width="26" height="34" rx="4" fill="{col}" stroke="{INK}" stroke-width="3"/><circle cx="{x + 13}" cy="{y + 15}" r="6.5" fill="#FFFFFF" stroke="{INK}" stroke-width="2.2"/>{ico.format(x=x + 13, y=y + 15)}'
    heart = '<path d="M{x} {y}" />'
    left = card(28, 352, '#F48FA0', '') + card(58, 350, '#F7C948', '')
    right = card(110, 350, '#78C8F0', '') + card(140, 352, '#8CCB7E', '')
    album = f'''<g id="Xalbum">
      <path d="M14 344 Q60 332 98 344 L98 400 Q60 390 14 400 Z" fill="#FFF8EA" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M98 344 Q136 332 182 344 L182 400 Q136 390 98 400 Z" fill="#FFF8EA" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M10 348 L10 404 Q56 394 98 406 Q140 394 186 404 L186 348" fill="none" stroke="#C0463F" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>
      {left}{right}
      <path d="M98 344 L98 404" stroke="{INK}" stroke-width="4"/></g>'''
    page = f'''<g id="Xpage"><path d="M98 344 Q136 332 182 344 L182 400 Q136 390 98 400 Z" fill="#FFFDF6" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M112 356 L166 356 M112 368 L160 368 M112 380 L150 380" stroke="#E5D5BA" stroke-width="4" stroke-linecap="round"/></g>'''
    newcard = f'''<g id="Xnew"><g transform="translate(-52 -16)"><rect x="82" y="276" width="40" height="52" rx="7" fill="#A89BE8" stroke="{INK}" stroke-width="4"/>
      <rect x="88" y="282" width="28" height="40" rx="4" fill="none" stroke="#FFFFFF" stroke-width="2.5" opacity=".7"/>
      <path d="M102 290 l3.6 7.4 8.1 1.2 -5.9 5.7 1.4 8.1 -7.2 -3.8 -7.2 3.8 1.4 -8.1 -5.9 -5.7 8.1 -1.2z" fill="#F7C948" stroke="{INK}" stroke-width="2.2" stroke-linejoin="round"/></g></g>'''
    extra = album + page + newcard + SPARK('Xsp1', 20, 262, .8) + SPARK('Xsp2', 90, 246, .65) + SPARK('Xsp3', 58, 228, .5, '#FFFFFF')
    a = Anim('collection', D, title='Azami · Le carnet', desc='Azami feuillette son album de cartes, tourne une page, et une nouvelle carte brillante en sort : elle est ravie.',
             extra_svg=extra)
    a.origins.update({'Xpage': '98px 372px', 'Xnew': '50px 286px', 'Xalbum': '98px 400px'})
    a.idle(breathe=3.0, tail=4.2)
    a.blink(.6); a.blink(11.0)
    a.look(.8, -5, 6, 2.4)
    a.move('head', .8, {'r': -8, 'y': 5, 'x': -4}, dur=.4, hold=2.2, back=.4, ease_in=SOFT, ease_out=SOFT)
    # elle tourne une page avec la patte
    for t0 in (1.4, 5.6):
        a.at('front-near', t0, {}, SOFT).at('front-near', t0 + .3, {'r': 26, 'x': -8, 'y': -10}, SOFT).at('front-near', t0 + .55, {'r': 34, 'x': -14, 'y': -6}, SOFT).at('front-near', t0 + .9, {}, OUTQ)
        a.at('Xpage', t0 + .35, {'o': 0}, STEP).at('Xpage', t0 + .37, {'o': 1, 'sx': 1}, SOFT).at('Xpage', t0 + .75, {'o': 1, 'sx': .05, 'y': -6}, SOFT).at('Xpage', t0 + 1.1, {'o': 1, 'sx': -1}, OUTQ).at('Xpage', t0 + 1.15, {'o': 0, 'sx': -1}, STEP)
        a.at('Xalbum', t0 + .5, {}, SOFT).at('Xalbum', t0 + .65, {'sy': .97}, SOFT).at('Xalbum', t0 + .85, {}, OUTQ)
    a.hidden.add('Xpage')
    # une carte brillante sort de l'album
    a.hidden.add('Xnew')
    a.at('Xnew', 2.6, {'o': 0, 's': .3, 'y': 50}, STEP).at('Xnew', 2.62, {'o': 1, 's': .5, 'y': 50}, SNAP).at('Xnew', 3.1, {'o': 1, 's': 1.05, 'y': -6, 'r': -8}, SNAP)
    for k in range(3):
        t = 3.3 + k * .6
        a.at('Xnew', t, {'o': 1, 's': 1.05, 'y': -6, 'r': -8}, SOFT).at('Xnew', t + .3, {'o': 1, 's': 1.05, 'y': -12, 'r': 6}, SOFT)
    a.at('Xnew', 5.1, {'o': 1, 's': 1.05, 'y': -6, 'r': -4}, SOFT).at('Xnew', 5.5, {'o': 0, 's': .4, 'y': 50, 'r': 0}, ANT)
    twinkle(a, 'Xsp1', 20, 262, (3.1, 4.2)); twinkle(a, 'Xsp2', 90, 246, (3.4, 4.6)); twinkle(a, 'Xsp3', 58, 228, (3.7,), s=1.1)
    a.look(2.8, -4, -2, 2.0)
    a.move('head', 2.9, {'r': 6, 'y': -2}, dur=.3, hold=1.6, back=.4, antic={'r': -2})
    a.happy(3.2, 4.8)
    a.at('blush', 3.2, {}, SOFT).at('blush', 3.6, {'s': 1.25}, SOFT).at('blush', 4.6, {'s': 1.25}, SOFT).at('blush', 5.0, {}, LIN)
    a.ear('l', 3.2, -10, 1.0); a.ear('r', 3.2, 10, 1.0)
    a.at('tail-tip', 3.2, {}, SNAP).at('tail-tip', 3.5, {'r': -18}, SOFT).at('tail-tip', 4.8, {'r': -14}, OUTQ).at('tail-tip', 5.2, {}, LIN)
    a.hop(5.0, h=10, air=.2)
    # elle relit, ronronne
    a.look(6.8, -5, 6, 2.4)
    a.move('head', 6.8, {'r': -8, 'y': 5, 'x': -4}, dur=.4, hold=2.0, back=.4, ease_in=SOFT, ease_out=SOFT)
    a.move('head', 9.6, {'r': 9, 'x': 2}, dur=.3, hold=.8, back=.35, antic={'r': -2})
    a.flick(10.2)
    return a

if __name__ == '__main__':
    for x in (cine(), collection()): print(write(x, 'scene'))
