# Visites « ciné » : les animations de visite, avec des lunettes 3D en carton (rouge et bleu).
import copy
from lib import *
import visite

G3D = '''<g id="g3d"><path d="M108 196 Q108 186 118 186 L236 186 Q246 186 246 196 L246 230 Q246 240 236 240 L196 240 Q186 240 182 230 L177 220 L172 230 Q168 240 158 240 L118 240 Q108 240 108 230 Z" fill="#FFFFFF" stroke="#2A1C15" stroke-width="5" stroke-linejoin="round"/>
<path d="M120 196 L166 196 L166 230 L158 230 Q154 230 150 226 L124 226 Q120 226 120 222 Z" fill="#E7505A" fill-opacity=".82"/>
<path d="M188 196 L234 196 L234 222 Q234 226 230 226 L204 226 Q200 230 196 230 L188 230 Z" fill="#3FA9E0" fill-opacity=".82"/>
<path d="M126 202 Q134 199 142 201" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" fill="none" opacity=".8"/><path d="M194 202 Q202 199 210 201" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" fill="none" opacity=".8"/>
<path d="M108 204 L92 198 M246 204 L262 198" stroke="#2A1C15" stroke-width="5" stroke-linecap="round"/></g>'''

def anims():
    out = []
    for a in visite.anims():
        if a.name not in ('visite_parle', 'visite_ecoute', 'visite_rire', 'visite_coeur', 'visite_fier', 'visite_malice'): continue
        b = copy.deepcopy(a)
        b.name = a.name.replace('visite_', 'visite_cine_')
        b.head_extra = a.head_extra + G3D
        b.origins['g3d'] = '177px 213px'
        b.title = a.title + ' (lunettes 3D)'
        out.append(b)
    return out

if __name__ == '__main__':
    for a in anims(): print(write(a, 'scene' if a.loop else 'reaction'))
