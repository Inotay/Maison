// Aldi d'abord, Coop ou Migros pour le reste.
// Aldi Suisse n'a qu'environ 1800 articles (Coop et Migros en ont des dizaines de milliers) : l'essentiel y est
// (fruits et légumes courants, pain, laitages, viande, poisson, tofu, pâtes, riz, riz pour sushis, nouilles,
// sauce soja, lait de coco, pâtes de curry, épices de base, surgelés, boissons, hygiène et ménage de base,
// croquettes et litière). Ce qui suit n'y est pas ou presque jamais : on l'envoie à la Coop ou à la Migros.
// Relevé sur l'assortiment en ligne d'Aldi Suisse (novembre 2026) ; un article mal rangé se corrige d'un toucher
// (« Où l'acheter »), et ce choix reste.

// thèmes d'icônes absents chez Aldi
export const PAS_ALDI = new Set((
  // fruits, légumes et herbes moins courants
  'shiitake pak_choi yuzu coriandre menthe ' +
  // traiteur et frais spéciaux
  'tempeh seitan pate_filo pate_gyoza gyozas kimchi sushi ' +
  // épicerie du monde, condiments rares
  'udon soba feuilles_riz panko huile_sesame curcuma vinaigre_riz mayo_jp miso mirin dashi gochujang ' +
  'sriracha shichimi furikake sauce_okonomi nori wakame matcha mochi edamame ' +
  // boissons
  'kombucha sake ' +
  // ménage, maison
  'sacs_taxes sacs_compost ampoule_gu10 ' +
  // beauté, soins plus pointus
  'beaute demaquillant ' +
  // pour Azami : le plus pointu
  'gamelle fontaine filtre_fontaine jouetschat herbeachat cataire antipuces vermifuge brossechat sacs_litiere pelle_litiere'
).split(/\s+/).filter(Boolean));

// mots qui trahissent un article qu'Aldi n'a pas, même quand l'icône est générique (« sauce hoisin » → sauce)
const MOTS_PAS_ALDI = /(?<!\p{L})(hoisin|ponzu|tahin[ie]?|tahini|harissa|nuoc|sauce poisson|fish sauce|tamari|sambal|galanga|citronnelle|combava|kaffir|lemongrass|sumac|za'?atar|garam|ras el hanout|curcuma|fenugrec|cardamome|badiane|anis étoilé|safran|levure (maltée|nutritionnelle)|tapioca|sarrasin|millet|farine de (riz|pois|sarrasin|coco)|lait de riz|burrata|halloumi|tofu soyeux|tempeh|seitan|natto|edamame|okara|panko|nori|wakame|kombu|bonite|katsuobushi|miso|mirin|saké|sake|yuzu|matcha|mochi|kimchi|gochu|udon|soba|shirataki|feuilles? de riz|vermicelles? de riz|pâte filo|filo|brick|pak ?cho[iy]|shiitake|enoki|pleurotes?|coriandre|menthe fraîche|aneth frais|estragon|cerfeuil|topinambour|panais|rutabaga|salsifis|chou kale|kale|cavolo|physalis|fruit de la passion|maracuja|litchis?|papaye|goyave|pitaya|ramboutan|durian|kumquat|kombucha|kéfir|kefir|dolce gusto|tassimo|sacs? taxés?|sacs? compost)(?!\p{L})/iu;

// Aldi ou Coop/Migros pour un article de supermarché : son thème d'icône, puis les mots de son libellé.
export function aldiOuCoop(label, themeId, parent = {}) {
  let id = themeId, guard = 0;
  while (id && guard++ < 4) { if (PAS_ALDI.has(id)) return 'coop'; id = parent[id]; }
  return MOTS_PAS_ALDI.test(String(label || '')) ? 'coop' : 'aldi';
}
