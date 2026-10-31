# Fabrique d'Azami

Les scripts qui dessinent et animent Azami (SVG animés et leurs versions fixes) :

- `lib.py` : le personnage, le moteur d'animation (`Anim`) et l'écriture des fichiers dans `azami/v44/`.
- `scenes.py`, `props2.py`, `loisirs.py`, `cine.py`, `chef.py`, `visite.py` : les scènes de chaque page.
- `reactions.py`, `colere.py`, `propreact.py`, `loisreact.py` : les réactions (caresses, coups de patte, retour…), y compris
  « habillées » avec les accessoires de la page.
- `props/` : les accessoires dessinés.

Pour régénérer, par exemple les réactions des Loisirs : `cd outils/azami && python3 loisreact.py`.
Gardés ici pour ne jamais les perdre : ils servent à créer les nouvelles animations.
