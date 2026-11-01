# La dodo « habillée » pour chaque page à accessoires : elle dort à côté de son balai, de sa casserole,
# de son sac, de sa pièce, de sa lettre, avec ses lunettes 3D ou son album. Elle ne tient plus rien :
# le balai est posé au sol, la cuillère reste dans la casserole.
import copy, math
from lib import *
import props2, loisirs, propreact, tama

def dort():
    return next(a for a in tama.anims() if a.name == 'dort')

def habille(scene):
    r = dort()
    a = propreact.dress(r, scene)
    a.tracks['front-near'] = copy.deepcopy(r.tracks['front-near'])   # la patte reste repliée, pas de pose « tenir »
    a.base['front-near'] = r.base['front-near']
    if scene.name == 'menage':
        # le balai tombe au sol (même rotation autour des poils que pendant un coup de patte), la main qui le tenait disparaît
        th = math.radians(34); vx, vy = 86 - 211, 400 - 312
        dx = vx - (math.cos(th) * vx - math.sin(th) * vy); dy = vy - (math.sin(th) * vx + math.cos(th) * vy)
        down = {'r': 34, 'x': round(dx, 1), 'y': round(dy - 50, 1)}   # - 50 : elle est couchée, tout le personnage est descendu
        a.tracks['Hbroom'] = [(0, down, LIN), (a.D, down, LIN)]
        a.tracks['Hgrip'] = [(0, {'o': 0}, LIN), (a.D, {'o': 0}, LIN)]
        a.base['Hbroom'] = down; a.base['Hgrip'] = {'o': 0}
    if scene.name == 'cuisine':
        # la toque a glissé de travers pendant la sieste
        a.tracks['hat'] = [(0, {'y': 14, 'x': 6, 'r': 14}, LIN), (a.D, {'y': 14, 'x': 6, 'r': 14}, LIN)]; a.base['hat'] = {'y': 14, 'x': 6, 'r': 14}
    return a

def anims():
    return [habille(s) for s in props2.anims() + [loisirs.cine(), loisirs.collection()]]

if __name__ == '__main__':
    for a in anims(): print(write(a, 'reaction'))
