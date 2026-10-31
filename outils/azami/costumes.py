# Visites : Azami en costume (psy, jeu télé) et Azami qui tire la langue.
from lib import *
from visite import talk

GLASSES = '''<g id="glasses"><circle cx="146" cy="212" r="31" fill="#FFFFFF" fill-opacity=".12" stroke="#2A1C15" stroke-width="6"/><circle cx="207" cy="212" r="31" fill="#FFFFFF" fill-opacity=".12" stroke="#2A1C15" stroke-width="6"/>
<path d="M177 209 Q176.5 202 176 209" stroke="#2A1C15" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M115 206 L104 200 M238 206 L250 199" stroke="#2A1C15" stroke-width="6" stroke-linecap="round"/>
<path d="M128 194 Q138 188 148 192" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity=".7" fill="none"/></g>'''
NOTEBOOK = '''<g id="Xnote"><g transform="rotate(-10 236 344)"><rect x="210" y="314" width="52" height="64" rx="6" fill="#FFF6DC" stroke="#2A1C15" stroke-width="5"/>
<path d="M219 330 H252 M219 342 H248 M219 354 H252" stroke="#B9A88A" stroke-width="3.5" stroke-linecap="round"/><rect x="210" y="314" width="52" height="11" rx="5" fill="#E7776B" stroke="#2A1C15" stroke-width="5"/></g>
<g id="Xpen"><path d="M266 300 L247 352" stroke="#2A1C15" stroke-width="7" stroke-linecap="round"/><path d="M266 300 L262 312" stroke="#F9C849" stroke-width="7" stroke-linecap="round"/></g></g>'''
TONGUE = '<g id="tongue"><path d="M166 266 Q166 292 177 294 Q188 292 188 266 Z" fill="#F48FA0" stroke="#8F4357" stroke-width="3.5" stroke-linejoin="round"/><path d="M177 270 V285" stroke="#D9667E" stroke-width="3" stroke-linecap="round"/></g>'
BOWTIE = '<g id="bowtie"><g transform="translate(177 300) scale(1.45) translate(-177 -300)"><path d="M177 300 L150 286 Q144 300 150 314 Z M177 300 L204 286 Q210 300 204 314 Z" fill="#E7776B" stroke="#2A1C15" stroke-width="5" stroke-linejoin="round"/><circle cx="177" cy="300" r="8" fill="#F9C849" stroke="#2A1C15" stroke-width="4"/></g></g>'
QMARK = '<g id="Xq"><circle cx="300" cy="150" r="34" fill="#F9C849" stroke="#2A1C15" stroke-width="5"/><path d="M288 140 Q288 126 301 126 Q314 126 314 139 Q314 148 303 152 V160" stroke="#2A1C15" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="303" cy="171" r="4.5" fill="#2A1C15"/></g>'

def anims():
    out = []
    a = Anim('visite_psy', 3.4, title='Azami psy', desc='Azami en lunettes de psy, son carnet, elle hoche la tête et prend des notes.', head_extra=GLASSES, extra_svg=NOTEBOOK)
    a.origins['Xpen'] = '247px 352px'; a.origins['glasses'] = '177px 212px'
    a.idle(breathe=1.7, tail=3.4)
    talk(a, .1, 1.1, syl=.2, big=.9)
    a.move('head', 1.2, {'y': 6, 'r': -3}, dur=.18, hold=.05, back=.2); a.move('head', 1.65, {'y': 6, 'r': -3}, dur=.18, hold=.05, back=.2)   # « mmh, mmh »
    for k in range(6): a.at('Xpen', 2.1 + k * .14, {'r': 8 if k % 2 == 0 else -6, 'x': k * 1.5}, SOFT)
    a.at('Xpen', 0, {}, SOFT).at('Xpen', 2.0, {}, SOFT).at('Xpen', 3.0, {}, SOFT)
    a.look(2.05, -2, 4, .9)
    a.at('glasses', 2.9, {}, ANT).at('glasses', 3.0, {'y': -4}, SNAP).at('glasses', 3.25, {}, OUTQ)   # elle remonte ses lunettes
    a.ear('r', .6, 10)
    out.append(a)

    a = Anim('visite_langue', 2.6, loop=False, title='Azami tire la langue', desc='Azami tire la langue, l’air très insolente.', head_extra=TONGUE)
    a.origins['tongue'] = '177px 266px'
    a.idle(breathe=1.3, tail=2.6)
    a.hidden.add('tongue')
    a.at('mouth-smile', .15, {'o': 1}, STEP).at('mouth-smile', .17, {'o': 0}, STEP).at('mouth-smile', 1.75, {'o': 1}, LIN)
    a.at('tongue', .15, {'sx': .6, 'sy': .25, 'o': 1}, SNAP).at('tongue', .35, {'s': 1.4, 'o': 1}, SOFT)
    for k in range(4): a.at('tongue', .5 + k * .25, {'sx': 1.45, 'sy': 1.25 if k % 2 else 1.45, 'o': 1}, SOFT)
    a.at('tongue', 1.55, {'o': 1}, ANT).at('tongue', 1.72, {'sx': .5, 'sy': .2, 'o': 1}, STEP).at('tongue', 1.74, {'s': .3, 'o': 0}, LIN)
    a.happy(.15, 1.75)
    a.move('head', .1, {'r': -12, 'x': -2}, dur=.2, hold=1.4, back=.35, antic={'r': 3})
    a.shake('head', .45, amp=4, n=6, period=.1)
    a.at('blush', .15, {}, SNAP).at('blush', .3, {'s': 1.2}, SOFT).at('blush', 1.6, {'s': 1.2}, OUTQ).at('blush', 1.9, {}, LIN)
    a.flick(1.9, 26)
    out.append(a)

    a = Anim('visite_quiz', 3.0, title='Azami animatrice', desc='Azami en nœud papillon, un grand point d’interrogation qui sautille.', head_extra=BOWTIE, extra_svg=QMARK)
    a.origins['Xq'] = '300px 184px'; a.origins['bowtie'] = '177px 300px'
    a.idle(breathe=1.5, tail=3.0)
    talk(a, .1, 1.2, syl=.18); talk(a, 1.6, 2.6, syl=.18)
    a.at('Xq', 0, {}, SOFT).at('Xq', .75, {'y': -10, 'r': 8}, SOFT).at('Xq', 1.5, {}, SOFT).at('Xq', 2.25, {'y': -10, 'r': -8}, SOFT).at('Xq', 3.0, {}, SOFT)
    a.at('bowtie', 1.3, {}, ANT).at('bowtie', 1.4, {'r': 10}, SNAP).at('bowtie', 1.6, {'r': -6}, OUTQ).at('bowtie', 1.8, {}, LIN)
    a.at('head', 0, {}, SOFT).at('head', .7, {'r': -5, 'y': -2}, SOFT).at('head', 1.5, {'r': 4}, SOFT).at('head', 2.3, {'r': -4}, SOFT).at('head', 3.0, {}, SOFT)
    a.look(1.35, 3, -3, .4); a.blink(2.75)
    out.append(a)
    return out

if __name__ == '__main__':
    for a in anims(): print(write(a, 'scene' if a.loop else 'reaction'))
