// Variantes personnalisées : une illustration de la personne en train de faire l'action.
// Elles remplacent l'icône de thème seulement quand l'élément est attribué à cette personne,
// que l'action a une variante, et que l'icône n'a pas été choisie à la main.
// Chara design validé (oct. 2026) : Yatoni et Mariana, 20 situations chacun, planches 4×5 de ChatGPT.

// Actions disponibles par personne (fichiers icons/people/<personne>/<action>.webp).
export const PACKS = {
  yatoni: ["portrait", "ordinateur", "musique", "nouilles", "courses", "cuisine", "nettoyer", "lessive", "aspirateur", "colis", "lire", "jeux", "tablette", "muscu", "velo", "rando", "verre", "bisou", "bain", "dormir", "vaisselle_main"],
  mariana: ["portrait", "ordinateur", "lire", "cafe", "courses", "cuisine", "nettoyer", "linge", "lessive", "plantes", "meditation", "maquillage", "note", "travail", "etirements", "rando", "verre", "bisou", "bain", "dormir", "vaisselle_main"],
};

export const ACTION_LABEL = {
  'portrait': 'Portrait',
  'ordinateur': "À l'ordinateur",
  'musique': 'Musique au casque',
  'nouilles': 'Manger des nouilles',
  'courses': 'Faire les courses',
  'cuisine': 'Cuisiner',
  'nettoyer': 'Nettoyer les surfaces',
  'lessive': 'Faire une lessive',
  'aspirateur': "Passer l'aspirateur",
  'colis': 'Recevoir un colis',
  'lire': 'Lire',
  'jeux': 'Jeux vidéo',
  'tablette': 'Travailler sur tablette',
  'muscu': 'Musculation',
  'velo': 'Aller à vélo',
  'rando': 'Randonnée',
  'verre': 'Boire un verre',
  'bisou': 'Bisou',
  'bain': 'Prendre un bain',
  'dormir': 'Dormir',
  'cafe': 'Boire un café',
  'linge': 'Plier le linge',
  'plantes': 'Arroser les plantes',
  'meditation': 'Méditation',
  'maquillage': 'Maquillage',
  'note': 'Écrire un mot',
  'travail': 'Travailler',
  'etirements': 'Étirements',
  'vaisselle_main': 'Vaisselle à la main'
};

// Thème reconnu → action illustrée. Les thèmes absents gardent leur icône générique.
const THEME_TO_ACTION = {
  courses: 'courses',
  vaisselle: 'vaisselle_main',   // à la main ; le lave-vaisselle (machine) garde son icône
  lessive: 'lessive', etendre: 'lessive',
  repassage: 'linge', textile: 'linge',
  menage: 'nettoyer', poussiere: 'nettoyer', grandmenage: 'nettoyer', sols: 'nettoyer', salledebain: 'nettoyer', lavabo: 'nettoyer', fenetres: 'nettoyer', cuisine: 'nettoyer', toilettes: 'nettoyer', douche: 'nettoyer',
  aspirateur: 'aspirateur',
  colis: 'colis', livraison: 'colis',
  velo: 'velo',
  plantes: 'plantes', jardin: 'plantes', fleurs: 'plantes',
  repas: 'cuisine', soupe: 'cuisine', curry: 'cuisine',
  cafe: 'cafe', machinecafe: 'cafe', petitdej: 'cafe', the: 'cafe',
  nouilles: 'nouilles', asiatique: 'nouilles', sushi: 'nouilles', restaurant: 'nouilles',
  ordinateur: 'ordinateur', internet_sites: 'ordinateur',
  travail: 'travail', etudes: 'travail', admin: 'travail',
  livres: 'lire',
  musique: 'musique', audio: 'musique', concert: 'musique', studio: 'musique',
  jeux: 'jeux',
  sport: 'muscu', yoga: 'etirements', spa: 'meditation',
  montagne: 'rando', lac: 'rando',
  apero: 'verre', biere: 'verre', vin: 'verre', bar: 'verre', bulles: 'verre', spiritueux: 'verre',
  bain: 'bain',
  sommeil: 'dormir',
  couple: 'bisou', date: 'bisou',
  beaute: 'maquillage',
  courrier: 'note', papeterie: 'note', liste: 'note',
};
// Quand une personne n'a pas l'action exacte mais une très proche.
const ALIAS = { yatoni: { travail: 'tablette', cafe: null }, mariana: {} };

// Une dépense n'illustre que des gestes d'argent : payer la lampe, ce n'est pas la réparer.
export const EXPENSE_ACTIONS = new Set(['courses', 'colis', 'verre', 'cafe', 'nouilles']);

// Prénom d'un membre → clé de pack (minuscules, sans accents).
export const personKey = name => String(name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim().split(/\s+/)[0];

// Valeur d'icône stockée (« t:id », emoji) ou id de thème → action, si elle existe.
export function actionFor(themeId) { return THEME_TO_ACTION[themeId] || null; }

// Valeur à afficher pour une personne et une action, ou null.
export function variantFor(person, action) {
  if (!person || !action || !PACKS[person]) return null;
  const a = PACKS[person].includes(action) ? action : ALIAS[person]?.[action];
  return a && PACKS[person].includes(a) ? `p:${person}:${a}` : null;
}

// « p:mariana:courses » → chemin de l'image.
export function variantSrc(v) {
  const [, person, action] = String(v).split(':');
  return PACKS[person]?.includes(action) ? `icons/people/${person}/${action}.webp` : null;
}
export const isVariant = v => typeof v === 'string' && v.startsWith('p:');
