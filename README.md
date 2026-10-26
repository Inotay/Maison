# Maison

L'app de notre appartement : ménage et tournus, choses à faire, dépenses partagées, courses, tableau de la maison, et une partie Nuit avec une boîte aux lettres care et un switch libido à l'aveugle.

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

## Vie privée
- Care : un mot n'est visible que par la personne qui l'écrit et celle qui le reçoit.
- Care : l'auteur voit quand son mot a été ouvert.
- Libido : chacun ne peut lire que sa propre ligne. Limite assumée : allumer son switch, c'est aussi poser la question, puisqu'on apprend alors si l'autre a allumé. La base répond seulement « match » ou « pas de match », et uniquement à quelqu'un dont le switch est allumé. Le switch s'éteint seul à l'heure choisie et aucun historique n'est conservé.

## Fichiers
- `index.html`, `styles.css`, `app.js` : l'app
- `azami.js` : Azami, une pose par page
- `config.js` : connexion à Supabase
- `icons/`, `manifest.webmanifest` : installation sur l'écran d'accueil
- `sounds/` : un enregistrement `azami.m4a` remplace le miaulement synthétique
- `supabase/schema.sql` : tables et règles d'accès ; `supabase/02_durcissement.sql` : à appliquer ensuite
