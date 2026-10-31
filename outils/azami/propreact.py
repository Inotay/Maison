# Réactions « habillées » pour les scènes à accessoires : la même caresse / attaque / crache / retour,
# mais avec le décor et les accessoires de la scène (balai en main, toque, casserole, tirelire, sac, lettre).
# L'objet tenu suit la patte : chaque image clé de front-near est décalée de la pose de base, et recopiée
# sur l'objet (même pivot), comme dans Held.
import copy, math
from lib import *
import props2, reactions, colere

IDS = ('caresse_1', 'caresse_2', 'caresse_3', 'attaque', 'crache', 'retour')
HELD = {'menage': (('Hbroom', 'Hgrip'), 60), 'cuisine': (('Hspoon',), 75)}

HEARTS = """<g id="Xh1"><path d="M0 8 C-18 -12 -40 8 0 36 C40 8 18 -12 0 8Z" fill="#F48FA0" transform="translate(300 150)"/></g>
<g id="Xh2"><path d="M0 6 C-12 -8 -28 6 0 24 C28 6 12 -8 0 6Z" fill="#F9C849" transform="translate(262 116)"/></g>
<g id="Xh3"><path d="M0 6 C-14 -10 -32 6 0 28 C32 6 14 -10 0 6Z" fill="#F48FA0" transform="translate(332 190)"/></g>"""

def caresse_1():
    """La caresse 1 d'origine (build.py), refaite avec Anim pour pouvoir l'habiller."""
    D = 2.5
    a = Anim('caresse_1', D, loop=False, title='Azami · Caresse', desc='La tête pousse contre une main invisible, yeux heureux, ronronnement, cœurs.', extra_svg=HEARTS)
    T = lambda x=0, y=0, r=0, sx=1, sy=1: {'x': x, 'y': y, 'r': r, 'sx': sx, 'sy': sy}
    for t, v, e in [(0, T(), ANT), (.14, T(0, 3, -3, 1.02, .97), SNAP), (.42, T(7, -4, 13, .97, 1.03), OUTQ), (.62, T(9, -3, 15, 1.06, .95), SOFT), (.9, T(6, -5, 11, 1.03, .98), SOFT),
                    (1.2, T(9, -3, 15, 1.06, .95), SOFT), (1.5, T(7, -4, 12, 1.03, .98), SOFT), (1.85, T(8, -3, 14, 1.05, .96), ANT), (2.05, T(-1, 1, -3, .98, 1.02), SNAP), (2.3, T(0, 0, 1), OUTQ), (2.5, T(), LIN)]:
        a.at('head', t, v, e)
    a.at('neck', 0, {}, ANT).at('neck', .42, T(4, -3, 5), SOFT).at('neck', 1.85, T(4, -3, 5), SNAP).at('neck', 2.2, {}, LIN)
    a.at('core', 0, {}, ANT).at('core', .14, T(0, 2, 0, 1.02, .97), SNAP).at('core', .5, T(2, -2, 2, .99, 1.02), SOFT).at('core', 1.85, T(2, -2, 2, .99, 1.02), SNAP).at('core', 2.2, {}, LIN)
    a.at('character', 0, {}, LIN).at('character', .6, {}, LIN)
    t, k = .6, 0
    while t < 1.8:
        t = round(t + .05, 3); k += 1; a.at('character', t, {'r': .9 if k % 2 else -.9}, LIN)
    a.at('character', 1.85, {}, LIN)
    a.happy(.14, 1.97)
    a.at('blush', 0, {}, OUTQ).at('blush', .5, {'s': 1.25}, SOFT).at('blush', 1.9, {'s': 1.25}, OUTQ).at('blush', 2.5, {}, LIN)
    for e, s in (('ear-left', -1), ('ear-right', 1)):
        a.at(e, 0, {}, ANT).at(e, .4, {'r': 16 * s}, SOFT).at(e, 1.85, {'r': 14 * s}, ANT).at(e, 2.0, {'r': -6 * s}, SNAP).at(e, 2.25, {'r': 2 * s}, OUTQ).at(e, 2.5, {}, LIN)
    a.at('tail', 0, {}, ANT).at('tail', .45, {'r': -9}, SOFT).at('tail', 1.9, {'r': -9}, SNAP).at('tail', 2.3, {'r': 2}, OUTQ)
    a.at('tail-tip', 0, {}, LIN).at('tail-tip', .5, {'r': -6}, LIN)
    t, k = .5, 0
    while t < 1.75:
        t = round(t + .08, 3); k += 1; a.at('tail-tip', t, {'r': -12 if k % 2 else -2}, SOFT)
    a.at('tail-tip', 1.9, {'r': -8}, SNAP).at('tail-tip', 2.3, {'r': 4}, OUTQ)
    a.at('whiskers', 0, {}, SOFT).at('whiskers', .5, {'y': -1.5, 'sx': 1.05}, SOFT).at('whiskers', 1.9, {'y': -1.5, 'sx': 1.05}, SOFT).at('whiskers', 2.3, {}, LIN)
    for i, (t0, dx) in enumerate([(.45, 8), (.8, -6), (1.15, 10)], 1):
        g = f'Xh{i}'; a.hidden.add(g); a.origins[g] = '300px 160px'
        a.at(g, 0, {'o': 0, 's': .2}, STEP).at(g, t0, {'o': 0, 's': .2}, SNAP).at(g, t0 + .25, {'o': 1, 'x': dx / 2, 'y': -14}, SOFT).at(g, t0 + .9, {'o': 0, 'x': dx, 'y': -46, 's': .8}, LIN)
    return a

def dress(r, scene):
    a = copy.deepcopy(r)
    a.name = f'{scene.name}_{r.name}'
    a.under_svg = scene.under_svg + r.under_svg
    a.extra_svg = scene.extra_svg + r.extra_svg
    a.head_extra = scene.head_extra + r.head_extra
    a.char_extra = scene.char_extra + r.char_extra
    a.extra_defs = scene.extra_defs + r.extra_defs
    for k, v in scene.origins.items(): a.origins.setdefault(k, v)
    a.hidden |= scene.hidden
    for k, v in scene.base.items(): a.base.setdefault(k, v)
    if scene.name == 'argent': a.hidden.discard('Xcoin')   # la pièce au sol, comme au début de la scène
    if scene.name == 'cuisine':
        # on la caresse : elle lâche la cuillère, qui reste plantée dans la casserole (hors du personnage)
        a.char_extra = r.char_extra
        a.extra_svg = scene.char_extra + a.extra_svg
        a.base.pop('front-near', None)
        return a
    if scene.name == 'courses':
        # pas de plongeon pendant une caresse : tout le sac passe derrière elle, pour qu'on voie sa tête
        a.under_svg = scene.under_svg + scene.extra_svg + r.under_svg
        a.extra_svg = r.extra_svg
    held = HELD.get(scene.name)
    if held:
        props, base = held
        fn = a.tracks.get('front-near', [])
        a.tracks['front-near'] = [(t, dict(v, r=v.get('r', 0) + base), e) for t, v, e in fn]
        if fn and r.name == 'attaque':
            # pour donner des coups de patte, elle lâche ce qu'elle tient : la cuillère reste dans la casserole,
            # le balai tombe au sol (rotation autour des poils), puis elle le ramasse
            if scene.name == 'menage':
                th = math.radians(34); vx, vy = 86 - 211, 400 - 312
                dx = vx - (math.cos(th) * vx - math.sin(th) * vy); dy = vy - (math.sin(th) * vx + math.cos(th) * vy)
                down = {'r': 34, 'x': round(dx, 1), 'y': round(dy, 1)}
                for g in props[1:]: a.tracks[g] = [(t, dict(v), e) for t, v, e in fn]
                a.tracks[props[0]] = [(0, {}, LIN), (.2, {}, 'cubic-bezier(.5,0,1,1)'), (.42, down, SNAP), (.5, dict(down, r=31), OUTQ), (.6, down, LIN), (1.35, down, SOFT), (1.68, {}, OUTQ)]
        elif fn:
            for g in props: a.tracks[g] = [(t, dict(v), e) for t, v, e in fn]
        # les bornes à 0 et D doivent aussi tenir la pose de base
        if fn:
            if fn[0][0] > 0: a.tracks['front-near'].insert(0, (0, {'r': base}, LIN))
            if max(t for t, _, _ in fn) < a.D: a.tracks['front-near'].append((a.D, {'r': base}, LIN))
    return a

def anims():
    scenes = props2.anims()
    src = {x.name: x for x in reactions.anims() + colere.anims() + [caresse_1()] if x.name in IDS}
    out = []
    for s in scenes:
        for i in IDS: out.append(dress(src[i], s))
    return out

if __name__ == '__main__':
    for a in anims(): print(write(a, 'reaction'))
