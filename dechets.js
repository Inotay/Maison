// Calendrier de ramassage de la gérance (Landel, Chemin de Boston) : quand on peut descendre quoi.
// Par demi-journée (matin 0h–12h, après-midi 12h–24h), pour chaque sorte de déchet :
//   ok     : vert, le container est près des garages, on peut descendre
//   route  : jaune, le container est déjà au bout du chemin sur la route de Genève, y amener les sacs
//   non    : rouge, jour de ramassage, on garde chez soi
// Jours : 0 = lundi … 6 = dimanche ; chaque jour a [matin, après-midi].

const O = 'ok', R = 'route', N = 'non';
export const SORTES = [
  { id: 'poubelles', label: 'Poubelles', icon: 'poubelle', week: [[O, R], [N, N], [O, O], [O, R], [N, N], [O, O], [O, O]] },
  { id: 'papier', label: 'Papier & carton', icon: 'recyclage', week: [[O, R], [N, N], [O, O], [O, R], [N, N], [O, O], [O, O]] },
  { id: 'verre', label: 'Verre', icon: 'bulles', week: [[N, N], [O, O], [O, O], [O, O], [O, R], [R, R], [R, R]] },
  { id: 'compost', label: 'Compost', icon: 'legumes', week: [[N, N], [O, O], [O, O], [O, O], [O, R], [R, R], [R, R]] },
];

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const slotOf = d => (d.getDay() + 6) % 7 * 2 + (d.getHours() >= 12 ? 1 : 0);   // 0..13
const stateAt = (s, slot) => s.week[Math.floor(slot / 2)][slot % 2];

// Libellé d'un créneau relatif à maintenant : « lundi midi », « demain matin »…
function slotLabel(slot, nowSlot) {
  const day = Math.floor(slot / 2), half = slot % 2;
  const today = Math.floor(nowSlot / 2);
  const diff = (day - today + 7) % 7;
  const when = diff === 0 ? "aujourd'hui" : diff === 1 ? 'demain' : JOURS[day];
  return `${when} ${half ? 'midi' : 'matin'}`;
}

// État d'une sorte maintenant, et jusqu'à quand ça dure (prochain changement d'état).
export function etat(s, now = new Date()) {
  const slot = slotOf(now);
  const state = stateAt(s, slot);
  let k = 1;
  while (k < 14 && stateAt(s, (slot + k) % 14) === state) k++;
  const next = (slot + k) % 14;
  const nextState = stateAt(s, next);
  return { state, until: slotLabel(next, slot), nextState };
}

export const ETAT_TEXTE = {
  ok: 'Peut descendre',
  route: 'Container au bout du chemin, sur la route de Genève',
  non: 'Ramassage : on garde chez soi',
};

// Résumé d'une ligne pour la tuile d'accueil.
export function resume(now = new Date()) {
  const ok = SORTES.filter(s => etat(s, now).state === 'ok').map(s => s.label.toLowerCase().replace(' & carton', ''));
  if (ok.length === SORTES.length) return 'Tout peut descendre';
  if (!ok.length) return 'Rien ne descend pour le moment';
  return ok.join(', ')[0].toUpperCase() + ok.join(', ').slice(1);
}

// Fiche pratique de l'immeuble : gérance, pannes, déchèterie, urgences.
export const PRATIQUE = {
  gerance: { nom: 'Gérance Landel (Landry)', adresse: 'Av. de Morges 23, 1004 Lausanne', tel: '021 625 17 17', note: 'Numéro général, même la nuit. Aussi pour le chauffage et les serrures.' },
  panne: [
    { quoi: 'Électricité, d\'abord', texte: 'Vérifier l\'ampoule, le disjoncteur dans l\'appartement, puis le fusible à la cave.' },
    { quoi: 'Électricité 2020 Sàrl', tel: '021 711 20 20', note: 'ou M. Barille 076 564 87 81', tel2: '076 564 87 81' },
    { quoi: 'Services industriels, urgence électricité', tel: '021 315 85 15', note: 'Frs 87.–/heure, déplacement compris' },
    { quoi: 'Services industriels, urgence gaz', tel: '021 315 93 95' },
  ],
  dechets: { quoi: 'Encombrants, sapins, meubles, cartons', texte: 'À amener à la déchèterie de Malley avec la carte d\'accès de la commune.', lieu: 'Chemin de l\'Usine-à-Gaz 20, 1020 Renens', tel: '021 315 79 79', horaires: 'Lundi à vendredi 8h–19h, samedi 8h–17h', contact: 'Bertrand Landry 079 550 25 75 (questions, transport)', tel2: '079 550 25 75' },
  urgences: [['Police', '117'], ['Pompiers', '118'], ['Ambulance', '144'], ['Intoxications', '145']],
};
