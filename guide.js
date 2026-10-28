// Guide de l'app : un tour d'accueil (une seule fois) et, pour chaque page, une explication complète
// qu'on retrouve à tout moment avec le petit « ? » en haut de la page.

// Tour d'accueil : une carte par page, puis les gestes cachés.
export const TOUR = [
  { scene: 'v41_jeu', title: 'Bienvenue dans Maison', points: [
    'C’est l’app de la maison, pour vous deux : les corvées, les choses à faire, les recettes, les courses, l’argent et des petits mots.',
    'Tout est partagé en direct : ce que tu coches, Yatoni le voit tout de suite, et l’inverse.',
    'Ce guide dure une minute. Tu peux le passer, et le revoir quand tu veux.',
  ] },
  { scene: 'v41_etirement', title: 'Maison : ta page d’accueil', points: [
    'En haut, un résumé : tes corvées, les choses à faire, l’argent, les déchets, les courses et le prochain rendez-vous. Touche une case pour aller à la bonne page.',
    'Dessous, trois onglets : À faire, Agenda (vos rendez-vous et ce qui tombe dans la semaine) et Tableau (les infos de la maison : un code, un rappel, un rendez-vous).',
    'Pour ajouter une chose à faire, écris-la, choisis pour qui (toi, Yatoni ou vous deux) et, si tu veux, une date.',
  ] },
  { scene: 'v41_menage', title: 'Ménage : les corvées tournent', points: [
    'Quand tu appuies sur « Fait », la corvée est notée et c’est au tour de Yatoni la prochaine fois. Certaines corvées sont toujours pour la même personne, ou pour « qui veut ».',
    'Les déchets indiquent quand on peut descendre la poubelle, le papier, le verre ou le compost, selon les jours de ramassage.',
    'Lave-vaisselle et lessive : appuie sur « Lancer », l’app compte le temps et te prévient quand c’est fini.',
  ] },
  { scene: 'v41_cuisine', title: 'Recettes : on te prend par la main', points: [
    'Plus de 250 recettes simples. Filtre par envie (Flemme, Végé, Réconfort, Sucré : tu peux en cocher plusieurs), par cuisine et par temps avec la jauge « Prêt en ».',
    'Dans une recette, choisis le nombre de personnes : toutes les quantités suivent. « Faire la recette » te guide étape par étape, avec les quantités et des minuteurs.',
    '« Rajouter les aliments à la liste » met ce qu’il faut dans les courses, et la recette reste « Au menu » pour plus tard.',
  ] },
  { scene: 'v41_courses', title: 'Courses : la liste qui se range seule', points: [
    'Écris un article : son icône et son rayon sont trouvés tout seuls.',
    'Au magasin, choisis où tu es (Supermarché, Épicerie asiatique, Maison & brico…) pour ne voir que ce qu’il y a à prendre là.',
    'Coche ce qui va dans le panier. À la fin, « Courses faites » vide le panier et te propose de noter le montant payé et le partage.',
  ] },
  { scene: 'v41_argent', title: 'Argent : qui doit quoi', points: [
    'Note une dépense : le montant, pour quoi, qui a payé. Par défaut c’est moitié-moitié ; tu peux aussi dire que c’était une avance pour l’autre.',
    'En haut, l’app calcule qui doit combien à qui. Quand vous remboursez, un bouton remet les comptes à zéro.',
  ] },
  { scene: 'v41_care', title: 'Care : rien que pour vous deux', points: [
    'Une boîte aux lettres pour vous deux : un merci, un besoin, un poids, une envie, de la tendresse. Ton mot arrive fermé dans la boîte de Yatoni.',
    'Tu peux cocher « J’aimerais qu’on en parle », et « Aide pour formuler » t’aide à trouver les mots.',
  ] },
  { scene: 'v41_miaulement', title: 'Les gestes cachés', points: [
    'Fait par erreur ? Un bouton « Annuler » apparaît en haut à droite pendant quelques secondes : il remet tout comme avant.',
    'Appuie longtemps sur une chose à faire ou une corvée, puis glisse-la : tu choisis l’ordre de la liste, Yatoni voit le même.',
    'Touche l’icône d’une ligne pour en choisir une autre : l’app retient ton choix pour les fois suivantes.',
    '« ⋯ » ouvre les options d’une ligne : modifier, dire pour qui c’est, passer le tour, supprimer.',
    'Trop de choses en retard ? Le mode calme te montre une seule chose à la fois, et tu peux demander un coup de main à Yatoni.',
    'Touche Azami : elle adore les caresses.',
  ] },
  { scene: 'v41_repos', title: 'Si tu oublies', points: [
    'Le petit « ? » en haut de chaque page réexplique tout ce qu’on peut faire sur cette page.',
    'Et « Revoir le guide », tout en bas de la page Maison, relance cette visite.',
  ], notif: true },
];

// Guide complet par page (le « ? »). Chaque entrée : [titre, explication].
export const PAGE = {
  maison: { title: 'La page Maison', items: [
    ['Le résumé', 'Les cases du haut résument ce qui t’attend. Une case rouge signale un retard. Touche une case pour aller directement à la bonne page.'],
    ['Réussites', 'Tout ce que vous faites compte : la carte Réussites montre ce que vous avez fait cette semaine à deux, et combien de jours de suite.'],
    ['Ajouter une chose à faire', 'Écris-la dans « Ajouter une chose à faire », choisis pour qui (Moi, Yatoni, Nous deux) et une date si besoin, puis « Ajouter ». L’icône est choisie toute seule.'],
    ['Cocher', 'Touche le carré à gauche quand c’est fait. Ce qui a été fait aujourd’hui reste visible dans « Fait aujourd’hui ».'],
    ['Changer l’ordre', 'Appuie longtemps sur une ligne (une demi-seconde), puis glisse-la vers le haut ou le bas. Ce que tu places à la main passe devant. Yatoni voit le même ordre.'],
    ['Options d’une ligne', '« ⋯ » à droite : Modifier (titre, date, heure, priorité), dire pour qui c’est, ou supprimer.'],
    ['Priorité', 'Dans Modifier, tu peux dire si une chose est vitale, importante, normale ou si elle peut attendre. Sur « Auto », l’app devine (ce qui concerne Azami, la santé et les factures passe devant).'],
    ['Changer une icône', 'Touche l’icône d’une ligne pour en choisir une autre. L’app retient ton choix pour les choses qui portent le même nom.'],
    ['Agenda', 'L’onglet Agenda montre vos rendez-vous et ce qui tombe dans la semaine (tâches datées, corvées).'],
    ['Tableau', 'L’onglet Tableau garde les infos de la maison : un code, un rappel, un rendez-vous. On peut épingler un mot pour qu’il reste en haut.'],
    ['Mode calme', 'Quand beaucoup de choses sont en retard, l’app passe en mode calme : une seule chose à la fois, la plus importante d’abord, et « Demander à Yatoni » pour un coup de main. Il s’arrête tout seul quand c’est rattrapé. Tu peux aussi l’ouvrir toi-même avec « Trop de choses ? Une chose à la fois ».'],
    ['Annuler', 'Après « Fait », un bouton « Annuler » apparaît en haut à droite pendant 10 secondes.'],
    ['Réglages', 'Tout en bas : le thème (Ciel ou Brun), les sons, les miaulements d’Azami et les notifications. Les notifications te préviennent quand la lessive est finie, quand Yatoni te demande un coup de main ou quand un aliment va périmer.'],
  ] },
  menage: { title: 'La page Ménage', items: [
    ['Fait', 'Appuie sur « Fait » quand une corvée est faite. Si elle est à tour de rôle, c’est ensuite au tour de Yatoni. Si tu fais la corvée de Yatoni, il garde la suivante.'],
    ['Qui s’en occupe', 'Une corvée peut être à tour de rôle, toujours pour la même personne, ou « qui veut ». Ça se change dans « ⋯ » puis Modifier, avec la fréquence et l’effort.'],
    ['Passer le tour', '« ⋯ » puis « Passer le tour » donne la corvée à l’autre sans la marquer faite.'],
    ['Déchets', 'La carte Déchets indique pour la poubelle, le papier, le verre et le compost si on peut descendre maintenant, selon les jours de ramassage.'],
    ['Lave-vaisselle', '« Lancer » démarre le minuteur ; « FIN » affiche l’heure où ce sera prêt. Touche cette heure pour ajouter ou enlever 5 ou 10 minutes : la durée est retenue pour vous deux. Quand c’est fini, « Sortie » note la vaisselle rangée.'],
    ['Lessive', 'Chacun a la sienne : « Lancer », puis « Au séchage » quand le lavage est fini, puis « Rangée ». Tu reçois une notification à chaque étape.'],
    ['Azami', 'Toutes les corvées d’Azami (litière, croquettes, véto…) sont regroupées dans sa carte.'],
    ['Ajouter une corvée', 'En bas : son nom, sa fréquence, l’effort et qui s’en occupe.'],
    ['Changer l’ordre', 'Appuie longtemps sur une corvée puis glisse-la pour la mettre en avant.'],
    ['Icônes', 'Touche l’icône d’une corvée pour en choisir une autre ; certaines montrent Yatoni ou toi en train de la faire.'],
  ] },
  recettes: { title: 'La page Recettes', items: [
    ['Chercher', 'Écris un plat ou un ingrédient (« riz », « poulet », « œufs ») : la liste se filtre au fur et à mesure.'],
    ['Prêt en', 'Glisse la jauge pour ne garder que les recettes prêtes en 10, 15, 20 minutes…'],
    ['Envie', 'Flemme, Végé, Réconfort, Sucré : tu peux en cocher plusieurs, elles se cumulent. Végé montre aussi les recettes qui ont une version végé.'],
    ['Cuisine', 'Une seule cuisine à la fois : Italien, Japonais, Coréen… « Tout effacer » enlève tous les filtres.'],
    ['À finir vite', 'Quand des aliments achetés vont bientôt périmer, une carte les montre avec des recettes pour les utiliser. ✓ si c’est mangé, ✕ si c’est jeté, − et + pour corriger la date.'],
    ['Au menu', 'Les recettes que tu as prévues (avec « Rajouter les aliments à la liste ») restent ici jusqu’à ce que tu les cuisines.'],
    ['⚠ Matériel', 'Un ⚠ signale qu’une recette demande un appareil particulier (raclette, mixeur…). Dans la recette, dis si vous l’avez : le ⚠ disparaît partout.'],
  ] },
  fiche: { title: 'Une recette', items: [
    ['Nombre de personnes', 'Les boutons − et + changent le nombre de personnes : toutes les quantités suivent, dans la liste et dans les étapes.'],
    ['Version végé', 'Pour un plat avec viande ou poisson, « Version végé » remplace par du tofu, des légumineuses ou un substitut.'],
    ['Matériel particulier', 'Si la recette demande un appareil, réponds « On l’a » ou « Pas chez nous ».'],
    ['Faire la recette', 'Te guide une étape à la fois, en grand, avec ce qu’il faut prendre pour cette étape. « Lire la recette en entier » montre tout d’un coup.'],
    ['Rajouter les aliments à la liste', 'Choisis ce que vous avez déjà ; le reste part dans les courses, avec le nom de la recette. Elle reste « Au menu ».'],
    ['Cuillères', 'c. à s. = la grande cuillère (à soupe), c. à c. = la petite (à café).'],
  ] },
  cook: { title: 'Pendant la recette', items: [
    ['Une étape à la fois', '« Suivant » et « Précédent » pour avancer. Chaque étape dit quoi faire, sur quel feu, combien de temps, et comment savoir que c’est prêt.'],
    ['Mots soulignés', 'Les mots soulignés en pointillés (« faire revenir », « al dente », « feu moyen »…) s’expliquent quand tu les touches.'],
    ['Minuteurs', 'Les boutons ⏱ lancent un minuteur. Il continue même si tu changes de page ou verrouilles le téléphone, et tu es prévenue à la fin.'],
    ['Feu', 'Doux = 3, moyen = 5 à 6, vif = 7 à 8 sur la plaque à induction.'],
    ['Fini', '« C’est prêt ! » à la fin : la recette sort du menu et les aliments utilisés sortent de « À finir vite ».'],
  ] },
  courses: { title: 'La page Courses', items: [
    ['Ajouter', 'Écris l’article : l’icône et le rayon sont trouvés tout seuls. Si la recette l’a ajouté, tu vois « Pour : » avec le nom du plat.'],
    ['Je suis au magasin', 'Touche l’endroit où tu es (Supermarché, Épicerie asiatique, Maison & brico…) : seuls les articles à prendre là restent. « Je ressors » pour revenir à toute la liste.'],
    ['Panier', 'Coche un article quand il est dans le panier. Un deuxième toucher le remet dans la liste.'],
    ['Courses faites', 'Vide le panier, garde les articles en mémoire et te propose un ticket : le montant payé et comment le partager. Ça va directement dans Argent.'],
    ['Produits frais', 'Après les courses, l’app estime quand les produits frais périment (selon Aldi, Coop ou Migros) et te prévient deux jours avant.'],
    ['Options', '« ⋯ » sur un article : le modifier, choisir un autre magasin, le supprimer.'],
  ] },
  argent: { title: 'La page Argent', items: [
    ['Le solde', 'En haut : qui doit combien à qui, en tenant compte de toutes les dépenses.'],
    ['Ajouter une dépense', 'Le montant, pour quoi, qui a payé, et le partage : moitié-moitié, avance pour l’autre (l’autre doit tout) ou un autre pourcentage.'],
    ['Rembourser', 'Le bouton sous le solde note un remboursement et remet les comptes à zéro. On peut l’annuler dans « ⋯ » si c’était une erreur.'],
    ['Par mois', 'Les dépenses sont groupées par mois, avec le total, ce que chacun a payé et les catégories.'],
    ['Modifier', '« ⋯ » sur une dépense pour la modifier ou la supprimer.'],
  ] },
  nuit: { title: 'La page Care', items: [
    ['Ta boîte aux lettres', 'Les mots de Yatoni arrivent fermés. Touche-en un pour l’ouvrir ; il passe ensuite dans « Mots déjà lus ».'],
    ['Écrire', 'Choisis le genre de mot (merci, besoin, poids, envie, tendresse), écris, puis « Déposer dans sa boîte ».'],
    ['En parler', 'Coche « J’aimerais qu’on en parle » si tu veux en discuter de vive voix.'],
    ['Aide pour formuler', 'Ajoute des débuts de phrase (« Quand je remarque que… », « Je me sens… ») quand les mots ne viennent pas.'],
    ['Tes mots envoyés', 'Tu vois s’ils ont été lus, et tu peux en retirer un.'],
  ] },
};
