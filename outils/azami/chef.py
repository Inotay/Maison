# Visites « en cuisine » : les mêmes animations de visite, avec la toque de cheffe (celle de la scène Cuisine).
import copy, re
from lib import *
import visite, props2

def hat():
    c = props2.cuisine()
    m = re.search(r'<g id="hat">.*?</g></g>', c.head_extra, re.S)
    return m.group(0)

def anims():
    H = hat(); out = []
    for a in visite.anims():
        if a.name not in ('visite_parle', 'visite_ecoute', 'visite_rire', 'visite_coeur', 'visite_fier', 'visite_malice'): continue
        b = copy.deepcopy(a)
        b.name = a.name.replace('visite_', 'visite_chef_')
        b.head_extra = a.head_extra + H
        b.origins['hat'] = '174px 140px'
        b.title = a.title + ' (en toque)'
        out.append(b)
    return out

if __name__ == '__main__':
    for a in anims(): print(write(a, 'scene' if a.loop else 'reaction'))
