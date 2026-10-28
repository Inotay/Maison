// Combien de jours un aliment frais se garde après l'achat (au frigo pour ce qui s'y range, emballage fermé).
// Estimation pour un produit emballé et fermé : sert à prévenir deux jours avant, pas à jeter quoi que ce soit.
// La date sur l'emballage fait foi ; une correction faite dans l'app est retenue pour ce type de produit.
// Ce qui ne figure pas ici (riz, pâtes, conserves, épices, sauces…) n'est pas suivi.

export const SHELF = {
  // Légumes et salades (entiers, au frigo)
  salade: 6, roquette: 4, epinards: 4, pak_choi: 5, chou_chinois: 10, herbes: 6, basilic: 5, coriandre: 6, persil: 7, menthe: 6, ciboulette: 6, thym: 14, romarin: 14,
  tomate: 7, tomates_cerises: 7, concombre: 8, courgette: 8, aubergine: 7, poivron: 9, brocoli: 6, chou_fleur: 8, champignon: 5, shiitake: 6,
  asperges: 4, haricots_verts: 6, petits_pois: 4, mais: 5, poireau: 12, celeri: 18, fenouil: 9, radis: 7, carotte: 28, courge: 60,
  avocat: 5, legumes: 7, gingembre: 28, echalote: 45, oignon: 45, ail: 60, patate: 45, patate_douce: 28,
  // Fruits
  fraises: 4, framboises: 3, myrtilles: 7, cerises: 6, raisin: 7, banane: 6, peche: 5, abricot: 5, figue: 4, mangue: 7, kiwi: 14, ananas: 6,
  melon: 6, pasteque: 6, kaki: 7, poire: 12, pomme: 35, orange: 21, clementine: 18, pamplemousse: 21, citron: 28, citron_vert: 18, yuzu: 14, agrumes: 21, grenade: 21, fruits: 7,
  // Produits laitiers et œufs (emballage fermé)
  lait: 10, lait_avoine: 10, lait_soja: 10, laitier: 10, yaourt: 24, yaourt_fruits: 24, skyr: 21, sere: 14, creme: 12, creme_fraiche: 21, creme_cafe: 60,
  beurre: 60, fromage: 30, fromage_rape: 21, mozzarella: 12, feta: 30, parmesan: 90, gruyere: 45, raclette: 30, fondue: 30, oeufs: 21,
  // Viandes, poissons, tofu (emballés)
  poulet: 4, volaille: 4, boeuf_hache: 2, steak: 4, porc: 4, viande: 4, saucisses: 8, jambon: 8, lardons: 14, charcuterie: 10,
  saumon: 3, poisson: 3, cabillaud: 3, crevettes: 3, fruitsdemer: 2, tofu: 21, tempeh: 21, seitan: 14, steak_vege: 10,
  // Pains et frais du traiteur
  pain: 3, baguette: 2, pain_complet: 5, pain_mie: 10, tresse: 3, croissant: 2, pain_chocolat: 2, viennoiserie: 2, bagels: 5, tortillas: 21,
  gnocchis: 21, raviolis: 10, lasagnes: 5, pate_feuilletee: 14, pate_brisee: 14, pate_sablee: 14, pate_pizza: 7, pate_gyoza: 14, gyozas: 4,
  houmous: 7, kimchi: 60, jus_orange: 10, gateau: 3, tarte: 3, cheesecake: 4, creme_dessert: 21, sushi: 1, sandwich: 1,
};

// Libellé court pour « dans 2 jours », « demain », « aujourd'hui », « depuis hier ».
export function dueText(days) {
  if (days < -1) return `périmé depuis ${-days} j`;
  if (days === -1) return 'périmé depuis hier';
  if (days === 0) return "à finir aujourd'hui";
  if (days === 1) return 'à finir demain';
  return `encore ${days} jours`;
}
