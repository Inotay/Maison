# Maison

L'app de notre appartement : ménage et tournus, choses à faire, dépenses partagées, courses, tableau de la maison, et Care, une boîte aux lettres pour ce qu'on n'ose pas dire en face.

L'app est une page web statique (publiée par GitHub Pages) qui s'installe sur l'écran d'accueil de l'iPhone. Les données vivent dans une base Supabase privée : le code est public, les données ne le sont pas. Sans configuration, l'app tourne en mode démo avec des données d'exemple stockées sur l'appareil.

## Mise en route

### 1. Créer la base
1. Créer un compte et un projet gratuit sur [supabase.com](https://supabase.com) (région Europe, par exemple Zurich ou Francfort).
2. Dans **SQL Editor**, coller tout le contenu de `supabase/schema.sql` et lancer **Run**.
3. Toujours dans SQL Editor, ajouter les deux membres (adresses en minuscules) :
   ```sql
   insert into public.members (email, name) values
     ('adresse1@exemple.ch', 'Prénom 1'),
     ('adresse2@exemple.ch', 'Prénom 2');
   ```

### 2. Régler l'adresse de l'app
Dans **Authentication > URL Configuration**, mettre `https://inotay.github.io/Maison/` dans **Site URL**. C'est là que mènent les liens de confirmation et de changement de mot de passe.

On se connecte avec e-mail et mot de passe. La première fois, « Créer mon compte » envoie un e-mail de confirmation ; ensuite la connexion se fait directement, y compris dans l'app installée sur l'iPhone.

### 3. Relier l'app
Dans **Project Settings > API Keys**, copier l'URL du projet et la clé publishable (ou anon), puis les coller dans `config.js`. Ces deux valeurs sont faites pour être publiques : chaque table est protégée par des règles qui ne laissent passer que les adresses de `members`.

### 4. Installer sur l'iPhone
Ouvrir `https://inotay.github.io/Maison/` dans Safari, bouton Partager, puis **Sur l'écran d'accueil**.

### 5. Verrouiller les inscriptions
Une fois vos deux comptes créés, coller `supabase/02_durcissement.sql` dans SQL Editor et lancer Run : seules les adresses de `members` peuvent désormais créer un compte. Par sécurité, désactiver aussi « Allow new users to sign up » dans Authentication > Providers > Email.

### 6. Notifications
Dans Care, « Me prévenir quand un mot arrive » demande la permission. Sans serveur de push, l'app prévient quand elle est ouverte en arrière-plan (un mot care reçu). Pour recevoir des notifications app fermée, il faudra un petit serveur de push : sa clé publique VAPID va dans `config.js`, la table `push_subscriptions` est déjà prête.

## Au quotidien
- Tout se modifie après coup : bouton ⋯ puis « Modifier » sur une tâche (titre, pour qui, date, heure), une corvée, une dépense, un article ou un mot du tableau.
- Chaque chose reçoit une petite icône choisie d'après ce qu'on a écrit. Un tap sur l'icône permet d'en choisir une autre ; l'app s'en souvient pour les deux.
- Réussites : chaque chose faite (tâche, corvée, panier complet, comptes à zéro) est inscrite pour toujours dans la table `wins` ; l'accueil montre la semaine, la série de jours et le total depuis le début. Une tâche faite reste affichée dans sa liste pendant 24 h.
- Argent : la carte Solde dit qui doit quoi, ce que chacun a payé et sa part depuis le dernier remboursement ; chaque dépense indique son effet sur le solde.

## Hors-ligne
L'app s'ouvre sans réseau et montre le dernier état connu, en lecture seule (sans Care). Les polices et la librairie Supabase sont embarquées dans le dépôt : aucune ressource externe.

## Vie privée
- Care : un mot n'est visible que par la personne qui l'écrit et celle qui le reçoit.
- Care : l'auteur voit seulement si son mot a été lu, pas quand.

## Fichiers
- `index.html`, `styles.css`, `app.js` : l'app
- `people.js` et `icons/people/<prénom>/` : illustrations personnalisées (Mariana pour l'instant, 20 actions). Elles remplacent l'icône de thème seulement quand l'élément est à cette personne (tâche assignée, corvée dont c'est le tour, dépense qu'elle a payée, réussite qu'elle a faite), que l'action a une variante, et que l'icône n'a pas été choisie à la main. Le sélecteur d'icône les propose aussi.
- `themes.js` : reconnaissance de thème (mots-clés pondérés, probabilités) qui choisit l'icône d'une tâche, d'un article, d'une dépense ou d'une corvée ; les corrections faites à la main sont partagées via la table `icon_hints`
- `azami/` : pack d'animations V2 d'Azami (10 scènes SVG en boucle, six accueils selon l'heure) ; `azami/statiques/` : les versions éditables
- `sw.js` : hors-ligne et notifications
- `vendor/` : librairie Supabase 2.49.4 figée ; `fonts/` : polices (licence OFL)
- `config.js` : connexion à Supabase
- `icons/`, `manifest.webmanifest` : installation sur l'écran d'accueil
- `sounds/` : un enregistrement `azami.m4a` remplace le miaulement synthétique
- `supabase/schema.sql` : tables et règles d'accès ; `supabase/02_durcissement.sql` : à appliquer ensuite ; `supabase/03_retrait_libido.sql` : efface ce qui servait à l'ancienne partie Libido
