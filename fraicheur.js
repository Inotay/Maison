// Combien de jours un aliment frais se garde après l'achat (au frigo pour ce qui s'y range, emballage fermé).
// Estimation prudente : sert à prévenir deux jours avant, pas à jeter quoi que ce soit.
// Ce qui ne figure pas ici (riz, pâtes, conserves, épices, sauces…) n'est pas suivi.

export const SHELF = {
  // Légumes et salades
  salade: 4, roquette: 3, epinards: 3, pak_choi: 4, chou_chinois: 7, herbes: 5, basilic: 5, coriandre: 5, persil: 6, menthe: 5, ciboulette: 5, thym: 10, romarin: 14,
  tomate: 6, tomates_cerises: 6, concombre: 7, courgette: 7, aubergine: 6, poivron: 7, brocoli: 5, chou_fleur: 7, champignon: 4, shiitake: 5,
  asperges: 3, haricots_verts: 5, petits_pois: 3, mais: 4, poireau: 10, celeri: 14, fenouil: 7, radis: 6, carotte: 21, courge: 30,
  avocat: 4, legumes: 6, gingembre: 21, echalote: 30, oignon: 30, ail: 45, patate: 30, patate_douce: 21,
  // Fruits
  fraises: 3, framboises: 3, myrtilles: 6, cerises: 5, raisin: 6, banane: 6, peche: 5, abricot: 5, figue: 4, mangue: 6, kiwi: 10, ananas: 5,
  melon: 5, pasteque: 5, kaki: 6, poire: 10, pomme: 21, orange: 18, clementine: 14, pamplemousse: 18, citron: 21, citron_vert: 14, yuzu: 14, agrumes: 18, grenade: 14, fruits: 6,
  // Produits laitiers et œufs
  lait: 7, lait_avoine: 7, lait_soja: 7, laitier: 7, yaourt: 14, yaourt_fruits: 14, skyr: 14, sere: 7, creme: 7, creme_fraiche: 10, creme_cafe: 30,
  beurre: 30, fromage: 21, fromage_rape: 10, mozzarella: 5, feta: 14, parmesan: 60, gruyere: 30, raclette: 21, fondue: 21, oeufs: 21,
  // Viandes, poissons, tofu
  poulet: 2, volaille: 2, boeuf_hache: 1, steak: 3, porc: 3, viande: 3, saucisses: 5, jambon: 5, lardons: 7, charcuterie: 7,
  saumon: 2, poisson: 2, cabillaud: 2, crevettes: 2, fruitsdemer: 2, tofu: 7, tempeh: 10, seitan: 10, steak_vege: 7,
  // Pains et frais du traiteur
  pain: 3, baguette: 2, pain_complet: 4, pain_mie: 7, tresse: 3, croissant: 2, pain_chocolat: 2, viennoiserie: 2, bagels: 4, tortillas: 10,
  gnocchis: 10, raviolis: 4, lasagnes: 4, pate_feuilletee: 10, pate_brisee: 10, pate_sablee: 10, pate_pizza: 5, pate_gyoza: 7, gyozas: 3,
  houmous: 6, kimchi: 30, jus_orange: 7, gateau: 3, tarte: 3, cheesecake: 4, creme_dessert: 10, sushi: 1, sandwich: 1,
};

// Libellé court pour « dans 2 jours », « demain », « aujourd'hui », « depuis hier ».
export function dueText(days) {
  if (days < -1) return `périmé depuis ${-days} j`;
  if (days === -1) return 'périmé depuis hier';
  if (days === 0) return "à finir aujourd'hui";
  if (days === 1) return 'à finir demain';
  return `encore ${days} jours`;
}
