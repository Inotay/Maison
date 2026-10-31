# Azami, tamagotchi — ce qu'on construit (étape 4)

Principe : les jauges existent (comme dans les Sims) mais on ne les voit jamais. C'est Azami qui le dit, par ses
bulles, ses sons et ses animations. Rien ne bloque jamais l'app, rien ne culpabilise. Un seul chat pour vous deux.
Tout ce qui touche au tamagotchi est sur l'accueil (sa barre, ses crottes, sa gamelle).

## Les jauges (cachées), de 0 à 100
- faim : baisse de ~4 par heure (éveillée), plus vite à ses heures de folie. Une ration = +35, une friandise = +8.
- propreté : baisse d'un cran à chaque crotte. Une crotte toutes les ~6 à 10 h, jamais plus de 4 sur l'écran.
- soif : baisse de ~3 par heure ; l'eau de la gamelle = +40 (elle préfère la casserole sale, elle le dira).
- câlins : baisse de ~3 par heure ; une caresse = +6 (les caresses sur elle comptent, sur toutes les pages).
- jeu / fenêtre : baisse de ~2 par heure ; une partie = +25, regarder par la fenêtre avec elle = +15.
- poids : monte avec les friandises, redescend avec le jeu. Jamais de pénalité : elle parle juste de son bide.
- forme (fatigue) : elle dort de minuit à 7 h (aucune initiative) et fait des siestes ; de 22 h à minuit et de 7 h à 8 h,
  c'est la folie : elle court, elle embête, elle parle deux fois plus. On ne la gère pas, ça donne son humeur.
- humeur = combinaison des quatre + ce qu'on lui a dit. Elle l'exprime, on ne l'affiche pas.

Serveur : une ligne `azami_etat` (jsonb) partagée : jauges, dernière mise à jour, crottes (positions), journal.
Le calcul se fait à l'ouverture et à chaque action (pas de tâche planifiée). Azami reçoit l'état dans son
contexte quand on lui parle (« tu as faim, 23/100 ») pour en parler elle-même.

## Comment elle le dit
- faim : son ventre gargouille (nouveau son, « gargouille »), elle regarde sa gamelle, bulle « je mangerais bien ».
- crottes : elle se tient à distance, air gêné, bulle « c'est pas moi ». Au-delà de 3 : elle boude un peu.
- câlins : elle vient se frotter à l'écran, ronronne quand on la touche ; sinon bulle « tu me grattes le menton ? ».
- rien de tout ça : rien. Elle vit sa vie (fenêtre, sieste, bêtises).
- oubli de plusieurs jours : faim → boude → balade (cachée sur une autre page, à retrouver) → au 4e jour, grève
  (plus de suggestions ni de japonais, friandise pour se réconcilier).

## La barre (accueil seulement), dessinée au feutre
Parler · Nourrir · Boire · Jouer · Souvenirs. La gamelle (croquettes et eau) n'est que sur l'accueil. Nourrir ouvre un petit choix dessiné : croquettes au poisson, ragoût,
friandise. Jouer : une balle / plumeau qu'on fait bouger au doigt, elle le suit.

## Les crottes
- Apparaissent n'importe où dans l'app (toutes les pages), jamais sur ce qu'on touche (boutons, champs, listes) :
  dans les marges, les coins, sous un titre. Elles s'accumulent tant qu'on ne nettoie pas (jusqu'à 6).
- Dessinées au feutre (petites, un peu drôles, pas dégoûtantes), trois variantes.
- On en prend une au doigt : la poubelle apparaît (dessinée), son couvercle s'ouvre ; on la glisse dedans, le
  couvercle se referme, petit son, et propreté +1. Haptique au ramassage et au dépôt.
- Si on relâche ailleurs, la crotte retombe où elle était.

## Les animations à produire (fabrique outils/azami)
- mange (gamelle, croquettes qui tombent, elle mastique), ragoût, friandise attrapée au vol
- faim (regarde la gamelle vide, ventre qui gargouille : petites ondes)
- gênée près des crottes ; soulagée quand c'est propre
- câline (se frotte, ronron), joue (balle, plumeau)
- boude (dos tourné, queue qui bat), balade (silhouette qui part), grève (assise, dos tourné, oreilles plates),
  retrouvailles (saut, cœurs)
- dort (nuit), sieste (bâillement, roulée en boule)
- boit (gamelle d'eau, et la casserole sale en bonus), fenêtre (assise, regarde dehors, oreilles qui suivent), toilette (se lèche)
- les objets : gamelle pleine / vide, gamelle d'eau, sachet de croquettes, boîte de ragoût, friandise, poubelle fermée /
  ouverte, crotte (3 variantes), balle, plumeau

## Sons
- gargouille (ventre), croquettes (crounch), ragoût (slurp), poubelle (couvercle, « plop »), ronron déjà là,
  grognement de contentement (siamois) déjà là.

## Ordre de fabrication
1. L'état partagé + les jauges + ce qu'elle en dit dans ses bulles (sans nouvelle animation).
2. Nourrir : la gamelle, le choix dessiné, l'animation « mange », le gargouillis.
3. Les crottes et la poubelle (glisser-déposer).
4. Jouer, câlins, sieste et nuit.
5. Boude, balade, grève, retrouvailles.

## Plus tard
- Anniversaire : Azami ne le connaît pas ; c'est elle qui le demande à Mariana, au détour d'une conversation, et le retient. Le jour venu : fête, cadeau.
- Cadeaux : elle ramène de balade des petits objets (une plume, un bouton, une feuille, un mot japonais) qui se collectionnent dans ses souvenirs.
- Fenêtre : de temps en temps elle regarde dehors (animation) et commente les voisins.
- Toilette : elle se lèche, juste pour le plaisir de la voir faire.
