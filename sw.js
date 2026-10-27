// Maison : service worker. L'app s'ouvre sans réseau (lecture) et reçoit des notifications.
const VERSION = 'maison-v69';
const SHELL = ['./', './index.html', './styles.css', './app.js', './themes.js', './fx.js', './people.js', './dechets.js', './recettes.js', './config.js', './manifest.webmanifest', './vendor/supabase-js-2.49.4.js',
  './azami/v41/azami_v41_etirement_anime.svg', './azami/v41/azami_v41_jeu_anime.svg', './azami/v41/azami_v41_toilette_anime.svg', './azami/v41/azami_v41_marche_anime.svg', './azami/v41/azami_v41_miaulement_anime.svg', './azami/v41/azami_v41_repos_anime.svg', './azami/azami_menage_anime.svg', './azami/azami_courses_anime.svg', './azami/azami_argent_anime.svg', './azami/azami_care_anime.svg', './azami/azami_reussite_anime.svg', './azami/reactions/tache_cochee_anime.svg', './azami/reactions/corvee_terminee_anime.svg', './azami/reactions/courses_completees_anime.svg', './azami/reactions/comptes_equilibres_anime.svg', './azami/reactions/mot_envoye_anime.svg', './azami/reactions/objectif_commun_anime.svg', './azami/reactions/surprise_coucou_anime.svg', './azami/reactions/fete_reussites_anime.svg',
  './icons/icon-192.png', './icons/icon-512.png',
  './fonts/nunito-latin-600-normal.woff2', './fonts/nunito-latin-700-normal.woff2', './fonts/nunito-latin-800-normal.woff2', './fonts/nunito-latin-900-normal.woff2',
  './fonts/hanken-grotesk-latin-400-normal.woff2', './fonts/hanken-grotesk-latin-500-normal.woff2',
  './fonts/hanken-grotesk-latin-700-normal.woff2', './fonts/hanken-grotesk-latin-800-normal.woff2',
  './fonts/shippori-mincho-latin-400-normal.woff2', './fonts/shippori-mincho-latin-600-normal.woff2'];

const THEME_ICONS = ['abonnement', 'abricot', 'admin', 'agrumes', 'ail', 'air', 'amandes', 'ananas', 'animalerie', 'antipoils', 'antipuces', 'apero', 'arbreachat', 'argent', 'asiatique', 'asperges', 'aspirateur', 'aubergine', 'avocat', 'avoine', 'bagels', 'baguette', 'bain', 'banane', 'banque', 'bar', 'basilic', 'beaute', 'beurre', 'beurre_cacahuete', 'biere', 'bijoux', 'biscuits', 'boeuf_hache', 'bonbons', 'bougie', 'bouillon', 'bretzels', 'bricolage', 'brocoli', 'brossechat', 'budget', 'bulles', 'burger', 'cabillaud', 'cables', 'cacahuetes', 'cadeau', 'cafe', 'caissetransport', 'cajou', 'cannelle', 'care_besoin', 'care_envie', 'care_merci', 'care_poids', 'care_tendresse', 'carotte', 'carte', 'cash', 'celeri', 'cereales', 'cerises', 'champignon', 'charcuterie', 'chat', 'chauffage', 'chaussures', 'cheesecake', 'chips', 'chocolat', 'chocolat_cuisine', 'chou_chinois', 'chou_fleur', 'ciboulette', 'citron', 'citron_vert', 'clementine', 'cles', 'coiffeur', 'colis', 'collierchat', 'concombre', 'cookies', 'coriandre', 'couple', 'courge', 'courgette', 'courrier', 'courses', 'couscous', 'crackers', 'creme', 'creme_cafe', 'creme_dessert', 'creme_fraiche', 'crevettes', 'croissant', 'croquettes', 'cuisine', 'cumin', 'curcuma', 'curry', 'danse', 'dashi', 'date', 'dechets', 'deco', 'demenagement', 'dents', 'donner', 'douche', 'eau', 'eau_gazeuse', 'echalote', 'edamame', 'electricite', 'epargne', 'epices', 'epinards', 'escalade', 'etagere', 'etendre', 'facture', 'farine', 'fecule', 'fenetres', 'fenouil', 'feta', 'feuilles_riz', 'figue', 'fleurs', 'fondue', 'fontaine', 'foot', 'fraises', 'framboises', 'friandises', 'frigo', 'fromage', 'fromage_rape', 'fruits', 'fruitsdemer', 'furikake', 'futon', 'galettes_riz', 'gamelle', 'gardechat', 'gateau', 'gerance', 'gingembre', 'glace', 'globe', 'gnocchis', 'gochujang', 'graines', 'grandmenage', 'granola', 'grenade', 'griffoir', 'gruyere', 'gyozas', 'haricots_rouges', 'haricots_verts', 'herbeachat', 'herbes', 'huile', 'huile_olive', 'huile_sesame', 'huile_tournesol', 'hygiene', 'identite', 'impots', 'imprimer', 'internet_sites', 'intime', 'jambon', 'jardin', 'jouetschat', 'jus', 'kaki', 'ketchup', 'kimchi', 'kiwi', 'lait', 'lait_avoine', 'lait_coco', 'lait_soja', 'laitier', 'lampe', 'lardons', 'lasagnes', 'lavabo', 'lavevaisselle', 'legumes', 'legumineuses', 'lentilles', 'lessive', 'levure', 'lit', 'litiere', 'livraison', 'lunettes', 'macarons', 'machinecafe', 'mais', 'mais_boite', 'malade', 'mangue', 'massage', 'matcha', 'mayo_jp', 'mayonnaise', 'melon', 'menage', 'menthe', 'mesures', 'meubles', 'mexicain', 'miel', 'mirin', 'miso', 'mochi', 'moutarde', 'mozzarella', 'muesli', 'musique', 'myrtilles', 'noisettes', 'noix', 'nori', 'nouilles', 'nouilles_riz', 'oeufs', 'oignon', 'orange', 'pain', 'pain_chocolat', 'pain_complet', 'pain_mie', 'pak_choi', 'pamplemousse', 'panko', 'papiertoilette', 'paprika', 'parmesan', 'pasteque', 'patate', 'patate_douce', 'pate_brisee', 'pate_charcuterie', 'pate_crepes', 'pate_curry', 'pate_feuilletee', 'pate_filo', 'pate_gyoza', 'pate_pain', 'pate_pizza', 'pate_sablee', 'pate_tartiner', 'patee', 'pates', 'pates_courtes', 'patisserie', 'peche', 'peinture', 'persil', 'pesee', 'petitdej', 'petits_pois', 'pharmacie', 'piles', 'piment', 'piscine', 'pizza', 'plantes', 'plomberie', 'plumeau', 'poire', 'poireau', 'pois_chiches', 'poisson', 'poivre', 'poivron', 'polenta', 'pomme', 'popcorn', 'porc', 'poubelle', 'poulet', 'poussiere', 'premierssoins', 'psy', 'puree', 'quinoa', 'raclette', 'radis', 'raisin', 'ramen', 'rangement', 'rappel', 'rasage', 'raviolis', 'recu', 'recyclage', 'reflexion', 'regles', 'remboursement', 'reparation', 'repas', 'repassage', 'restaurant', 'rideaux', 'riz', 'riz_sushi', 'romarin', 'roquette', 'rosti', 'salade', 'salaire', 'salledebain', 'sandwich', 'sante', 'sardines', 'sauce_okonomi', 'sauce_soja', 'sauce_tomate', 'saucisses', 'saumon', 'securite', 'seitan', 'sel', 'sere', 'serviettes', 'sesame', 'shichimi', 'shiitake', 'signature', 'skyr', 'snacks', 'soba', 'sols', 'sommeil', 'soupe', 'spa', 'spiritueux', 'sport', 'sriracha', 'steak', 'steak_vege', 'sucre', 'sucre_glace', 'surgeles', 'sushi', 'tapis', 'tarte', 'telecom', 'telephone', 'tempeh', 'textile', 'the', 'thon', 'thym', 'tofu', 'toilettes', 'tomate', 'tomates_boite', 'tomates_cerises', 'tortillas', 'tresse', 'udon', 'vaccinchat', 'vaisselle', 'vege', 'vermicelles', 'verre', 'vetements', 'veto', 'viande', 'viennoiserie', 'vin', 'vinaigre', 'vinaigre_riz', 'virement', 'voisins', 'volaille', 'voyage', 'wakame', 'yaourt', 'yaourt_fruits', 'yoga', 'yuzu'].map(id => `./icons/themes/${id}.webp`);

const PEOPLE_ICONS = ['./icons/people/yatoni/portrait.webp', './icons/people/yatoni/ordinateur.webp', './icons/people/yatoni/musique.webp', './icons/people/yatoni/nouilles.webp', './icons/people/yatoni/courses.webp', './icons/people/yatoni/cuisine.webp', './icons/people/yatoni/nettoyer.webp', './icons/people/yatoni/lessive.webp', './icons/people/yatoni/aspirateur.webp', './icons/people/yatoni/colis.webp', './icons/people/yatoni/lire.webp', './icons/people/yatoni/jeux.webp', './icons/people/yatoni/tablette.webp', './icons/people/yatoni/muscu.webp', './icons/people/yatoni/velo.webp', './icons/people/yatoni/rando.webp', './icons/people/yatoni/verre.webp', './icons/people/yatoni/bisou.webp', './icons/people/yatoni/bain.webp', './icons/people/yatoni/dormir.webp', './icons/people/mariana/portrait.webp', './icons/people/mariana/ordinateur.webp', './icons/people/mariana/lire.webp', './icons/people/mariana/cafe.webp', './icons/people/mariana/courses.webp', './icons/people/mariana/cuisine.webp', './icons/people/mariana/nettoyer.webp', './icons/people/mariana/linge.webp', './icons/people/mariana/lessive.webp', './icons/people/mariana/plantes.webp', './icons/people/mariana/meditation.webp', './icons/people/mariana/maquillage.webp', './icons/people/mariana/note.webp', './icons/people/mariana/travail.webp', './icons/people/mariana/etirements.webp', './icons/people/mariana/rando.webp', './icons/people/mariana/verre.webp', './icons/people/mariana/bisou.webp', './icons/people/mariana/bain.webp', './icons/people/mariana/dormir.webp'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL).then(() => c.addAll(THEME_ICONS.concat(PEOPLE_ICONS)).catch(() => {}))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Fichiers de l'app : réseau d'abord, cache en secours.
// Les appels à la base ne passent jamais par le cache.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname.endsWith('supabase.co')) return;
  if (url.origin !== location.origin) return;
  // Toujours revalider auprès du serveur (GitHub Pages garde sinon une copie 10 minutes) :
  // la nouvelle version arrive dès qu'elle est publiée.
  e.respondWith(
    fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});

// Notification poussée par un serveur (quand il y en aura un) : { title, body, url }.
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = { body: e.data?.text() }; }
  e.waitUntil(self.registration.showNotification(data.title || 'Maison', {
    body: data.body || '', icon: './icons/icon-192.png', badge: './icons/icon-192.png', tag: data.tag || 'maison', data: { url: data.url || './' },
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL(e.notification.data?.url || './', location.href).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const open = list.find(c => c.url.startsWith(location.origin));
    if (open) { open.navigate ? open.navigate(target) : null; return open.focus(); }
    return self.clients.openWindow(target);
  }));
});
