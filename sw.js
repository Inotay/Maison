// Maison : service worker. L'app s'ouvre sans réseau (lecture) et reçoit des notifications.
const VERSION = 'maison-v30';
const SHELL = ['./', './index.html', './styles.css', './app.js', './themes.js', './fx.js', './people.js', './dechets.js', './config.js', './manifest.webmanifest', './vendor/supabase-js-2.49.4.js',
  './azami/azami_accueil_bonjour_anime.svg', './azami/azami_accueil_bonne_matinee_anime.svg', './azami/azami_accueil_bon_midi_anime.svg', './azami/azami_accueil_bonne_apres_midi_anime.svg', './azami/azami_accueil_bonsoir_anime.svg', './azami/azami_accueil_nuit_anime.svg', './azami/azami_menage_anime.svg', './azami/azami_courses_anime.svg', './azami/azami_argent_anime.svg', './azami/azami_nuit_care_anime.svg',
  './icons/icon-192.png', './icons/icon-512.png',
  './fonts/nunito-latin-600-normal.woff2', './fonts/nunito-latin-700-normal.woff2', './fonts/nunito-latin-800-normal.woff2', './fonts/nunito-latin-900-normal.woff2',
  './fonts/hanken-grotesk-latin-400-normal.woff2', './fonts/hanken-grotesk-latin-500-normal.woff2',
  './fonts/hanken-grotesk-latin-700-normal.woff2', './fonts/hanken-grotesk-latin-800-normal.woff2',
  './fonts/shippori-mincho-latin-400-normal.woff2', './fonts/shippori-mincho-latin-600-normal.woff2'];

const THEME_ICONS = ['abonnement', 'admin', 'agrumes', 'air', 'animalerie', 'antipoils', 'antipuces', 'apero', 'arbreachat', 'argent', 'asiatique', 'aspirateur', 'avocat', 'bain', 'banque', 'bar', 'beaute', 'biere', 'bijoux', 'biscuits', 'bonbons', 'bougie', 'bricolage', 'brossechat', 'budget', 'bulles', 'burger', 'cables', 'cadeau', 'cafe', 'caissetransport', 'care_besoin', 'care_envie', 'care_merci', 'care_poids', 'care_tendresse', 'carte', 'cash', 'cereales', 'champignon', 'charcuterie', 'chat', 'chauffage', 'chaussures', 'cles', 'coiffeur', 'colis', 'collierchat', 'couple', 'courrier', 'courses', 'croquettes', 'cuisine', 'curry', 'danse', 'date', 'deco', 'demenagement', 'dents', 'donner', 'douche', 'eau', 'electricite', 'epargne', 'epices', 'escalade', 'etagere', 'etendre', 'facture', 'fenetres', 'fleurs', 'fontaine', 'foot', 'friandises', 'frigo', 'fromage', 'fruits', 'fruitsdemer', 'futon', 'gamelle', 'gardechat', 'gerance', 'glace', 'globe', 'grandmenage', 'griffoir', 'herbeachat', 'herbes', 'huile', 'hygiene', 'identite', 'impots', 'imprimer', 'internet_sites', 'intime', 'jardin', 'jouetschat', 'jus', 'laitier', 'lampe', 'lavabo', 'lavevaisselle', 'legumes', 'legumineuses', 'lessive', 'lit', 'litiere', 'livraison', 'lunettes', 'machinecafe', 'malade', 'massage', 'menage', 'mesures', 'meubles', 'mexicain', 'miel', 'musique', 'noix', 'nouilles', 'oeufs', 'oignon', 'pain', 'papiertoilette', 'patate', 'patee', 'pates', 'patisserie', 'peinture', 'pesee', 'petitdej', 'pharmacie', 'piles', 'piscine', 'pizza', 'plantes', 'plomberie', 'plumeau', 'poisson', 'poubelle', 'poussiere', 'premierssoins', 'psy', 'rangement', 'rappel', 'rasage', 'recu', 'recyclage', 'reflexion', 'regles', 'remboursement', 'reparation', 'repas', 'repassage', 'restaurant', 'rideaux', 'salade', 'salaire', 'salledebain', 'sandwich', 'sante', 'securite', 'serviettes', 'signature', 'snacks', 'sols', 'sommeil', 'soupe', 'spa', 'spiritueux', 'sport', 'sucre', 'surgeles', 'sushi', 'tapis', 'telecom', 'telephone', 'textile', 'the', 'toilettes', 'tomate', 'vaccinchat', 'vaisselle', 'vege', 'vetements', 'veto', 'viande', 'viennoiserie', 'vin', 'virement', 'voisins', 'volaille', 'voyage', 'yoga'].map(id => `./icons/themes/${id}.webp`);

const PEOPLE_ICONS = ['aspirateur', 'azami_brossage', 'azami_repas', 'budget', 'cafe', 'colis', 'courses', 'cuisine', 'factures', 'lettre', 'linge', 'lit', 'plantes', 'reparation', 'repos', 'toilettes', 'travail', 'vaisselle', 'velo', 'vitres'].map(a => `./icons/people/mariana/${a}.webp`);

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
