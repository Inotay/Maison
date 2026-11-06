// Les plateformes de streaming en Suisse, telles que TMDB les nomme (région CH). Chacun coche les siennes :
// dans la maison, « chez vous » = ce que l'un de vous deux a ; avec un ami, ce que l'un de vous deux a aussi.
// Même liste dans l'app (app.js), sur la page des amis (ami.js) et côté serveur (fonctions films et amis :
// garder les identifiants et les motifs en phase).
// [id, nom affiché, motif sur le nom TMDB, couleur de la pastille]
export const PLATEFORMES = [
  ['netflix', 'Netflix', /netflix/i, '#E50914'],
  ['prime', 'Prime Video', /amazon prime|prime video/i, '#1399FF'],
  ['disney', 'Disney+', /disney/i, '#113CCF'],
  ['apple', 'Apple TV+', /^apple tv( ?\+| plus)?$/i, '#1D1D1F'],
  ['hbo', 'HBO Max', /hbo|^max$/i, '#5822B4'],
  ['sky', 'Sky Show', /^sky( show)?$/i, '#0072C9'],
  ['paramount', 'Paramount+', /paramount/i, '#0064FF'],
  ['blue', 'blue TV', /^blue (tv|video)$|^blue\+$/i, '#0E5FD8'],
  ['play', 'Play Suisse', /play suisse/i, '#E3000F'],
  ['mubi', 'Mubi', /mubi/i, '#111111'],
  ['filmingo', 'filmingo', /filmingo/i, '#E4572E'],
  ['cinu', 'Cinu', /^cinu$/i, '#F15A24'],
  ['crunchyroll', 'Crunchyroll', /crunchyroll/i, '#F47521'],
  ['canal', 'Canal+', /canal/i, '#000000'],
];
export const PLATEFORME_IDS = PLATEFORMES.map(p => p[0]);
export const plateformeDe = nom => PLATEFORMES.find(([, , re]) => re.test(nom || ''))?.[0];
export const nomPlateforme = id => PLATEFORMES.find(p => p[0] === id)?.[1] || id;
// une liste propre : seulement des identifiants connus, sans doublon, dans l'ordre de la liste
export const abosPropres = l => PLATEFORME_IDS.filter(k => Array.isArray(l) && l.includes(k));
