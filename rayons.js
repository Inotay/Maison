// Ordre des rayons dans chaque type de magasin, dans le sens où l'on fait le tour.
// Supermarché suisse (Aldi, Coop, Migros, Denner) : fruits et légumes à l'entrée, pain, frais le long
// du mur, épicerie au centre, boissons, surgelés en dernier (pour que ça reste froid), puis droguerie.
// Chaque rayon liste des thèmes d'icônes ; un thème absent est cherché par son parent.

export const AISLES = {
  super: [
    ['fruits', 'Fruits et légumes', 'fruits legumes agrumes herbes salade roquette tomate tomates_cerises oignon ail echalote patate patate_douce champignon shiitake avocat gingembre courge courgette carotte poivron concombre aubergine brocoli chou_fleur chou_chinois poireau epinards fenouil celeri radis asperges haricots_verts petits_pois mais pak_choi pomme poire banane orange citron citron_vert clementine pamplemousse fraises framboises myrtilles raisin kiwi mangue ananas melon pasteque peche abricot cerises figue grenade kaki yuzu basilic coriandre persil menthe ciboulette thym romarin fleurs'],
    ['pain', 'Pain et boulangerie', 'pain baguette pain_complet pain_mie tresse croissant pain_chocolat viennoiserie bagels patisserie gateau tarte macarons cheesecake'],
    ['frais', 'Produits laitiers, fromage, œufs', 'laitier lait lait_avoine lait_soja yaourt yaourt_fruits sere skyr beurre creme creme_fraiche creme_cafe creme_dessert fromage fromage_rape mozzarella parmesan feta gruyere raclette fondue oeufs'],
    ['viande', 'Viande, charcuterie, poisson', 'viande volaille poulet boeuf_hache steak porc lardons charcuterie jambon saucisses pate_charcuterie poisson saumon cabillaud fruitsdemer crevettes'],
    ['traiteur', 'Traiteur, tofu, pâtes fraîches', 'vege tofu tempeh seitan steak_vege gnocchis raviolis lasagnes pate_feuilletee pate_brisee pate_sablee pate_pizza pate_pain pate_filo pate_gyoza gyozas kimchi sushi sandwich'],
    ['epicerie', 'Pâtes, riz, conserves', 'pates pates_courtes riz riz_sushi nouilles ramen udon soba nouilles_riz vermicelles cereales couscous quinoa polenta farine levure fecule legumineuses pois_chiches lentilles haricots_rouges tomates_boite sauce_tomate mais_boite thon sardines lait_coco bouillon soupe puree rosti tortillas mexicain feuilles_riz panko chocolat_cuisine sucre sucre_glace'],
    ['condiments', 'Huiles, épices, sauces', 'huile huile_olive huile_tournesol huile_sesame epices sel poivre paprika cumin curcuma cannelle piment vinaigre vinaigre_riz moutarde ketchup mayonnaise mayo_jp asiatique sauce_soja miso mirin dashi gochujang sriracha shichimi furikake sauce_okonomi curry pate_curry sesame nori wakame'],
    ['petitdej', 'Petit-déj, café, thé', 'petitdej muesli granola avoine pate_crepes miel pate_tartiner beurre_cacahuete cafe cafe_grains capsules the the_vert tisane matcha'],
    ['sucre', 'Biscuits, chocolat, snacks', 'biscuits cookies chocolat bonbons snacks chips crackers galettes_riz popcorn bretzels noix amandes cajou noisettes cacahuetes graines mochi'],
    ['boissons', 'Boissons', 'eau eau_gazeuse jus jus_orange jus_pomme the_froid sirop kombucha biere vin vin_rouge vin_blanc champagne spiritueux sake gin'],
    ['surgeles', 'Surgelés', 'surgeles glacons legumes_surgeles pizza_surgelee pizza frites pois_surgeles fruits_surgeles glace edamame'],
    ['hygiene', 'Hygiène et soins', 'hygiene shampooing apres_shampooing gel_douche savon deodorant creme_mains creme_solaire cotons coton_tiges dents dentifrice brosse_dents fil_dentaire rasage rasoir mousse_raser beaute demaquillant regles pharmacie premierssoins pansements paracetamol ibuprofene mouchoirs'],
    ['menage', 'Ménage, lessive, papier', 'menage spray_multi javel vinaigre_menager bicarbonate eponges microfibre gants serpilliere sols fenetres spray_vitres salledebain detartrant lessive lessive_liquide adoucissant detachant vaisselle liquide_vaisselle lavevaisselle pastilles_lv sel_lv rincage poubelle sacs_poubelle sacs_taxes sacs_compost papiertoilette essuie_tout cuisine alu film papier_cuisson sacs_congel piles piles_aa lampe ampoule_e27 ampoule_gu10 bougie'],
    ['animaux', 'Animaux', 'chat croquettes patee sachets friandises gamelle fontaine filtre_fontaine litiere sable_litiere sacs_litiere pelle_litiere jouetschat herbeachat cataire antipuces vermifuge brossechat'],
  ],
  asie: [
    ['frais', 'Frais : légumes, tofu', 'legumes pak_choi chou_chinois gingembre herbes coriandre shiitake champignon tofu tempeh kimchi'],
    ['riz', 'Riz et nouilles', 'riz riz_sushi nouilles ramen udon soba nouilles_riz vermicelles feuilles_riz pate_gyoza panko'],
    ['sauces', 'Sauces et condiments', 'asiatique sauce_soja miso mirin vinaigre_riz huile_sesame dashi gochujang sriracha shichimi furikake sauce_okonomi mayo_jp curry pate_curry lait_coco sesame nori wakame epices'],
    ['sucre', 'Snacks et douceurs', 'snacks mochi bonbons biscuits chips crackers galettes_riz'],
    ['boissons', 'Thé et boissons', 'the the_vert matcha the_froid jus sake spiritueux biere'],
    ['surgeles', 'Surgelés', 'surgeles gyozas edamame glace'],
  ],
  maison: [
    ['menage', 'Ménage et rangement', 'menage rangement boites eponges microfibre serpilliere poubelle'],
    ['cuisine', 'Cuisine', 'cuisine vaisselle poele casserole couteaux planche tupperware bouilloire grille_pain cuiseur_riz mixeur micro_ondes'],
    ['textile', 'Linge, lit, salle de bain', 'lit housse oreiller plaid serviettes textile rideaux tapis salledebain futon tatami'],
    ['deco', 'Déco', 'deco cadre pateres coussin bougie lampe_washi'],
    ['lumiere', 'Lampes et électricité', 'lampe ampoule_e27 ampoule_gu10 electricite multiprise rallonge piles'],
    ['brico', 'Bricolage', 'bricolage tournevis marteau perceuse vis crochet scotch colle niveau escabeau peinture silicone mesures reparation'],
    ['jardin', 'Plantes et jardin', 'plantes jardin terreau engrais pot rempoter vaporisateur fleurs'],
  ],
  pharma: [
    ['medicaments', 'Médicaments', 'pharmacie ordonnance paracetamol ibuprofene spray_nasal gorge vitamines sante'],
    ['soins', 'Premiers soins', 'premierssoins pansements thermometre'],
    ['hygiene', 'Hygiène', 'hygiene dents dentifrice brosse_dents fil_dentaire savon gel_douche deodorant shampooing apres_shampooing cotons coton_tiges regles rasage'],
    ['beaute', 'Beauté et soins', 'beaute creme_mains creme_solaire demaquillant lunettes lentilles_contact'],
  ],
  azami: [
    ['nourriture', 'Nourriture', 'croquettes patee sachets friandises gamelle fontaine filtre_fontaine'],
    ['litiere', 'Litière', 'litiere sable_litiere sacs_litiere pelle_litiere tapis_litiere'],
    ['soins', 'Soins', 'brossechat coupe_griffes gant_toilettage antipuces vermifuge antipoils'],
    ['jouets', 'Jouets et griffoirs', 'jouetschat souris balle_grelot laser tunnel griffoir griffoir_carton arbreachat herbeachat cataire'],
    ['transport', 'Panier et transport', 'panier_chat caissetransport collierchat'],
  ],
  tech: [
    ['cables', 'Câbles et chargeurs', 'cables cable_usbc hdmi chargeur multiprise rallonge prise_usbc prise_usba adaptateur powerbank'],
    ['piles', 'Piles', 'piles piles_aa pile_bouton'],
    ['ordi', 'Ordinateur', 'ordinateur clavier souris_pc ecran disque_dur cle_usb carte_sd imprimer encre'],
    ['audio', 'Son et image', 'audio ecouteurs casque enceinte tv telecommande jeux console manette photo'],
    ['tel', 'Téléphone', 'telephone coque verre_trempe routeur telecom'],
  ],
};

// Index : magasin → thème → [position, libellé du rayon].
const INDEX = Object.fromEntries(Object.entries(AISLES).map(([shop, list]) => [shop, Object.fromEntries(list.flatMap(([, label, ids], i) => ids.split(' ').map(id => [id, [i, label]])))]));

// Rayon d'un thème dans un magasin (en remontant aux parents si besoin) ; null si inconnu.
export function aisleOf(shop, themeId, parent = {}) {
  const idx = INDEX[shop]; if (!idx) return null;
  let id = themeId, guard = 0;
  while (id && guard++ < 5) { if (idx[id]) return idx[id]; id = parent[id]; }
  return null;
}
