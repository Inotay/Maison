// Variantes personnalisées : une illustration de la personne en train de faire l'action.
// Elles remplacent l'icône de thème seulement quand l'élément est attribué à cette personne,
// que l'action a une variante, et que l'icône n'a pas été choisie à la main.
// Une personne sans pack (Yatoni pour l'instant) garde les icônes génériques.

// Actions disponibles par personne (fichiers icons/people/<personne>/<action>.webp).
export const PACKS = {
  mariana: ['courses', 'vaisselle', 'toilettes', 'aspirateur', 'velo', 'plantes', 'lit', 'linge', 'vitres', 'reparation',
    'azami_repas', 'azami_brossage', 'factures', 'budget', 'travail', 'colis', 'cuisine', 'cafe', 'lettre', 'repos'],
};

export const ACTION_LABEL = {
  courses: 'Faire les courses', vaisselle: 'Faire la vaisselle', toilettes: 'Nettoyer les toilettes', aspirateur: "Passer l'aspirateur",
  velo: 'Aller à vélo', plantes: 'Arroser les plantes', lit: 'Faire le lit', linge: 'Plier le linge', vitres: 'Nettoyer les vitres',
  reparation: 'Réparer', azami_repas: 'Nourrir Azami', azami_brossage: 'Brosser Azami', factures: 'Payer une facture',
  budget: 'Gérer le budget', travail: 'Travailler', colis: 'Recevoir un colis', cuisine: 'Cuisiner', cafe: 'Préparer le café',
  lettre: 'Écrire un mot tendre', repos: 'Se détendre',
};

// Thème reconnu → action illustrée. Les thèmes absents gardent leur icône générique.
const THEME_TO_ACTION = {
  courses: 'courses',
  vaisselle: 'vaisselle', lavevaisselle: 'vaisselle',
  toilettes: 'toilettes',
  aspirateur: 'aspirateur',
  velo: 'velo',
  plantes: 'plantes', jardin: 'plantes',
  lit: 'lit',
  lessive: 'linge', etendre: 'linge', repassage: 'linge',
  fenetres: 'vitres',
  reparation: 'reparation', bricolage: 'reparation', globe: 'reparation',
  croquettes: 'azami_repas', gamelle: 'azami_repas', patee: 'azami_repas', friandises: 'azami_repas', fontaine: 'azami_repas',
  brossechat: 'azami_brossage', antipoils: 'azami_brossage',
  facture: 'factures', abonnement: 'factures', impots: 'factures', gerance: 'factures', assurance: 'factures', telecom: 'factures',
  budget: 'budget', epargne: 'budget',
  travail: 'travail', ordinateur: 'travail',
  colis: 'colis', livraison: 'colis',
  repas: 'cuisine', soupe: 'cuisine', curry: 'cuisine',
  cafe: 'cafe', machinecafe: 'cafe', petitdej: 'cafe',
  sommeil: 'repos',
};

// Une dépense n'illustre que des gestes d'argent : payer la lampe, ce n'est pas la réparer.
export const EXPENSE_ACTIONS = new Set(['courses', 'factures', 'budget', 'colis']);

// Prénom d'un membre → clé de pack (minuscules, sans accents).
export const personKey = name => String(name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim().split(/\s+/)[0];

// Valeur d'icône stockée (« t:id », emoji) ou id de thème → action, si elle existe.
export function actionFor(themeId) { return THEME_TO_ACTION[themeId] || null; }

// Valeur à afficher pour une personne et une action, ou null.
export function variantFor(person, action) {
  if (!person || !action) return null;
  return PACKS[person]?.includes(action) ? `p:${person}:${action}` : null;
}

// « p:mariana:courses » → chemin de l'image.
export function variantSrc(v) {
  const [, person, action] = String(v).split(':');
  return PACKS[person]?.includes(action) ? `icons/people/${person}/${action}.webp` : null;
}
export const isVariant = v => typeof v === 'string' && v.startsWith('p:');
