// Maison : service worker. L'app s'ouvre sans réseau (lecture) et reçoit des notifications.
const VERSION = 'maison-v12';
const SHELL = ['./', './index.html', './styles.css', './app.js', './themes.js', './fx.js', './config.js', './manifest.webmanifest', './vendor/supabase-js-2.49.4.js',
  './azami/azami_accueil_bonjour_anime.svg', './azami/azami_accueil_bonne_matinee_anime.svg', './azami/azami_accueil_bon_midi_anime.svg', './azami/azami_accueil_bonne_apres_midi_anime.svg', './azami/azami_accueil_bonsoir_anime.svg', './azami/azami_accueil_nuit_anime.svg', './azami/azami_menage_anime.svg', './azami/azami_courses_anime.svg', './azami/azami_argent_anime.svg', './azami/azami_nuit_care_anime.svg',
  './icons/icon-192.png', './icons/icon-512.png',
  './fonts/nunito-latin-600-normal.woff2', './fonts/nunito-latin-700-normal.woff2', './fonts/nunito-latin-800-normal.woff2', './fonts/nunito-latin-900-normal.woff2',
  './fonts/hanken-grotesk-latin-400-normal.woff2', './fonts/hanken-grotesk-latin-500-normal.woff2',
  './fonts/hanken-grotesk-latin-700-normal.woff2', './fonts/hanken-grotesk-latin-800-normal.woff2',
  './fonts/shippori-mincho-latin-400-normal.woff2', './fonts/shippori-mincho-latin-600-normal.woff2'];

const THEME_ICONS = ['admin', 'agrumes', 'air', 'amis', 'anniversaire', 'antipoils', 'antipuces', 'apero', 'arbreachat', 'art', 'audio', 'avion', 'avocat', 'bar', 'beaute', 'bebe', 'biere', 'bijoux', 'biscuits', 'bonbons', 'brossechat', 'bulles', 'burger', 'bus', 'caissetransport', 'cereales', 'champignon', 'charcuterie', 'chat', 'chauffage', 'chaussures', 'cinema', 'coiffeur', 'collierchat', 'concert', 'confiture', 'courrier', 'croquettes', 'cuisine', 'curry', 'danse', 'demenagement', 'dents', 'donner', 'eau', 'ecologie', 'electricite', 'escalade', 'essence', 'etudes', 'famille', 'fete', 'fleurs', 'fontaine', 'foot', 'friandises', 'fromage', 'fruitsdemer', 'gamelle', 'gardechat', 'glace', 'grandmenage', 'griffoir', 'herbeachat', 'herbes', 'huile', 'identite', 'imprimer', 'internet_sites', 'jardin', 'jeux', 'jeuxsociete', 'jouetschat', 'lac', 'legumineuses', 'liste', 'livres', 'lunettes', 'malade', 'mariage', 'meteo', 'mexicain', 'miel', 'montagne', 'noel', 'noix', 'nouilles', 'oignon', 'ordinateur', 'papeterie', 'parking', 'patate', 'patee', 'pesee', 'petitdej', 'pharmacie', 'photo', 'piles', 'piscine', 'pizza', 'plomberie', 'plumeau', 'premierssoins', 'psy', 'rappel', 'rasage', 'reflexion', 'regles', 'repas', 'repassage', 'restaurant', 'sac', 'salade', 'salaire', 'sandwich', 'signature', 'soupe', 'spa', 'spiritueux', 'sport', 'studio', 'sucre', 'sushi', 'textile', 'theatre', 'tomate', 'train', 'travail', 'tv', 'urgent', 'vaccinchat', 'vege', 'velo', 'vetements', 'veto', 'viennoiserie', 'voisins', 'voiture', 'volaille', 'vote', 'yoga'].map(id => `./icons/themes/${id}.webp`);

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL).then(() => c.addAll(THEME_ICONS).catch(() => {}))).then(() => self.skipWaiting()));
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
  e.respondWith(
    fetch(e.request).then(res => {
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
