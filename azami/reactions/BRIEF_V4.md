# Prochaine étape : Azami V4 — character animation

## Ambition validée
Faire d'Azami un personnage félin vivant et imprévisible, élégant et extrêmement cute, **pas un pictogramme qui flotte**. La référence émotionnelle est celle d'un court film d'animation : anticipation, action, réaction, pauses et timing asymétrique.

## Rig nécessaire (nouvelle réalisation, pas fourni par la V3)
- Torse / bassin, tête et cou reliés; oreilles sur pivots anatomiques derrière le masque du visage.
- 4 pattes articulées : épaules, coudes/poignets, hanches, genoux/tarses, pieds. Remplacer les petits ovales fixes par des éléments animables.
- Queue en 2–3 segments, avec suivi et décalage, sans décrochement.
- Visage : yeux, paupières, pupilles, sourcils stylisés, truffe, joues, mâchoire, langue; animation de miaulement et léchouille.
- Accessoires sur ancrages physiques de patte : panier, balai, lettre, pièce, jouets.
- Silhouette lisible à ~120–180px et source réellement vectorielle modifiable.

## Acting et banques de poses
Assise, debout, quatre pattes, en train de marcher, en train de trottiner, allongée (loaf), accroupie avant un bond, étirée, patte levée, toilette (patte/visage), bâillement, miaulement, câlin, regard latéral, petite marche de recul.

## Rythme
Boucles principales 7–20s mais chorégraphies non linéaires : calme -> curiosité -> sursaut -> action -> réaction -> récupération. Les mouvements ne doivent pas tous être cycliques ni au même tempo. Ajouter des scènes spéciales en one-shot (2–6s) aux événements de réussite.

## Production technique
Livrer pour chaque scène :
1. SVG statique modifiable ;
2. SVG animé transparent, structuré en groupes et avec pivots précis ;
3. pour les gestes impossibles en CSS seul, un contrôleur JS/SVG documenté plutôt que prétendre qu'un fichier SVG isolé fait de l'IK ;
4. manifest référençant scène/gestes/durée/ancrages/son optionnel ;
5. capture sur les deux thèmes bleu et brun à plusieurs moments de l'animation.

## UX
Respecter `prefers-reduced-motion`, stopper animations hors écran, sons désactivés par défaut et rares miaulements uniquement après consentement. Les réussites sont encouragées sans pénalisation ni pression de séries quotidiennes.

**État : brief de V4 uniquement. Aucun SVG V4 articulé n'est livré dans le pack V3 Réactions.**
