# Azami, tamagotchi — ce qu'on construit (étape 4)

Principe : les jauges existent (comme dans les Sims) mais on ne les voit jamais. C'est Azami qui le dit, par ses
bulles, ses sons et ses animations. Rien ne bloque jamais l'app, rien ne culpabilise. Un seul chat pour vous deux.
Tout ce qui touche au tamagotchi est sur l'accueil (sa barre, ses crottes, sa gamelle).

## Les jauges (cachées), de 0 à 100
- faim : baisse de ~4 par heure (éveillée), plus vite à ses heures de folie. Une ration = +35, une friandise = +8.
- propreté : baisse d'un cran à chaque crotte. Une crotte arrive surtout dans la demi-heure qui suit un repas, ou juste
  avant ses zoomies (22 h, 7 h) ; sinon au hasard toutes les ~8 à 12 h. Jamais plus de 6 à l'écran.
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
- zoomies (elle traverse l'écran en courant, à ses heures de folie), boude (dos tourné, queue qui bat), balade (silhouette qui part), grève (assise, dos tourné, oreilles plates),
  retrouvailles (saut, cœurs)
- dort (nuit), sieste (bâillement, roulée en boule)
- boit (gamelle d'eau, et la casserole sale en bonus), fenêtre (assise, regarde dehors, oreilles qui suivent), toilette (se lèche)
- les objets : gamelle pleine / vide, gamelle d'eau, sachet de croquettes, boîte de ragoût, friandise, poubelle fermée /
  ouverte, crotte (3 variantes), balle, plumeau

## Sons
- gargouille (ventre), croquettes (crounch), ragoût (slurp), poubelle (couvercle, « plop »), ronron déjà là,
  grognement de contentement (siamois) déjà là.

## Ce qui est branché (v228)
- Nourrir / Boire jouent mange, ragoût, friandise, boit. Quand elle dit qu'elle a faim : faim quelques secondes.
- Sur l'accueil, son état remplace sa scène : dort (minuit à 7 h, et en sieste : 20 min après un ragoût, ou parfois
  l'après-midi), boude (faim sous 12, ou 4 crottes et plus), faim (faim sous 25). Un geste la réveille, sauf le ragoût.
- Aux heures de folie, elle traverse parfois l'écran en courant (zoomies), au plus toutes les 90 s.
- Pour essayer en démo : ?azami=tama:dort (boude, faim, zoomies).

## Jouer et sons (v231)
- Jouer : un plumeau dessiné qu'on promène au doigt sur l'accueil. Elle guette (accroupie, le derrière qui frétille),
  bondit quand il passe devant elle. Cinq bonds = partie gagnée (jeu +25, bide un peu plus fin). Sans mouvement 10 s,
  ou en changeant de page, la partie s'arrête. La nuit, elle refuse. Animations : guette, bondit (outils/azami/jeu.py).
- Câlin : une caresse sur sept environ (accueil), elle frotte sa joue contre l'écran, petits cœurs (calin).
- Sons synthétisés : crounch (croquettes), slurp (ragoût), lape (eau), swish (friandise, bond), gargouille (faim),
  couvercle et plop (poubelle).

## Balade, grève, retrouvailles, dodo (v232)
- Oubli = aucun geste de personne (nourrir, boire, jouer, caresser). Au bout de 2 jours : elle part (animation part)
  et se cache sur une autre page ; on ne voit dépasser que sa tête derrière l'en-tête ; la toucher = retrouvailles.
- Au bout de 4 jours : elle revient d'elle-même et fait grève (de dos sur l'accueil, yeux fermés, menton levé ;
  plus d'initiatives, de mot du jour ni de besoins). Une friandise y met fin (retrouvailles). Jamais déclenché la nuit.
- dort refait : couchée en boule de pain, pattes repliées, tête posée, queue à plat, une oreille qui frémit.
- Sieste de l'après-midi : un tirage par jour (une fois sur deux), 25 min à une heure prise au hasard avant 18 h.
- Pour essayer en démo : ?azami=tama:balade, ?azami=tama:greve.

## Dodo partout (v233)
- La nuit et pendant la sieste, elle dort sur toutes les pages ; sur les pages à accessoires, la dodo est habillée
  (balai au sol, casserole et toque de travers, sac, tirelire, lettre, lunettes 3D et pop-corn, album) : dortprops.py.
- Gros Z tracés à l'encre (contour clair), qui montent en grossissant.

## Le mot du soir (v235)
- Fonction rappels, tournée de 18 h 30 : au plus une notification Azami par jour et par personne, seulement en mode
  Bavarde (réglage recopié dans reglages 'azami:mode:<e-mail>'), seulement si elle a quelque chose à dire
  (grève, balade, faim, crottes, soif, câlins ; sinon un mot doux une fois sur quatre). Jauges recalculées côté
  serveur comme dans l'app. Déjà envoyé : reglages 'azami:notifs'. Réglages → « Un mot d'Azami le soir » → Essayer.

## Le ménage (v244)
- Azami voit chaque corvée (tour, faite quand et par qui, retard, machines en route), répond « c'est à qui ? »,
  coche une corvée (corvee, faite par moi ou par l'autre : le tour passe), lance le lave-vaisselle ou la lessive
  (machine : lancer, séchage, fini), et peut rappeler doucement un vrai retard, au plus une fois par jour.

## Le mini-jeu (v248)
- Pendant la partie, Azami quitte son coin et poursuit le plumeau partout sur l'écran (animation court en boucle,
  l'image entière se déplace et se retourne), se met à l'affût de près, bondit ; le plumeau s'échappe ensuite à
  l'autre bout de l'écran. 8 bonds pour gagner ; la partie s'arrête après 12 s sans toucher au plumeau ou 1 minute.

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
