# Réactions habillées pour les scènes Loisirs (ciné : lunettes 3D + pop-corn ; collection : l'album).
from lib import *
import propreact, reactions, colere, loisirs
src = {x.name: x for x in reactions.anims() + colere.anims() + [propreact.caresse_1()] if x.name in propreact.IDS}
for s in (loisirs.cine(), loisirs.collection()):
    for i in propreact.IDS:
        print(write(propreact.dress(src[i], s), 'reaction'))
