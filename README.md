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

### 2. Recevoir un code plutôt qu'un lien
Sur iPhone, un lien de connexion s'ouvre dans Safari et non dans l'app installée. On se connecte donc avec un code.

Dans **Authentication > Emails > Magic Link**, remplacer le contenu du modèle par :
```html
<h2>Ton code pour Maison</h2>
<p style="font-size:28px;letter-spacing:6px"><b>{{ .Token }}</b></p>
```

Dans **Authentication > URL Configuration**, mettre l'adresse de l'app dans **Site URL** : `https://inotay.github.io/Maison/`.

### 3. Relier l'app
Dans **Project Settings > API Keys**, copier l'URL du projet et la clé publishable (ou anon), puis les coller dans `config.js`. Ces deux valeurs sont faites pour être publiques : chaque table est protégée par des règles qui ne laissent passer que les adresses de `members`.

### 4. Installer sur l'iPhone
Ouvrir `https://inotay.github.io/Maison/` dans Safari, bouton Partager, puis **Sur l'écran d'accueil**.

## Vie privée
- Care : un mot n'est visible que par la personne qui l'écrit et celle qui le reçoit.
- Libido : chacun ne peut lire que sa propre ligne. La base répond seulement « match » ou « pas de match », et uniquement à quelqu'un dont le switch est allumé. Le switch s'éteint seul à l'heure choisie et aucun historique n'est conservé.

## Fichiers
- `index.html`, `styles.css`, `app.js` : l'app
- `config.js` : connexion à Supabase
- `supabase/schema.sql` : tables et règles d'accès
