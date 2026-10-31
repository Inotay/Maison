// Le japonais d'Azami (étape 5) : des mots du quotidien liés aux pages de l'app, et les hiragana.
export const MOTS = [
  // maison, quotidien
  { k: 'おはよう', r: 'ohayō', f: 'bonjour (le matin)', p: 'maison' }, { k: 'こんにちは', r: 'konnichiwa', f: 'bonjour', p: 'maison' }, { k: 'こんばんは', r: 'konbanwa', f: 'bonsoir', p: 'maison' },
  { k: 'おやすみ', r: 'oyasumi', f: 'bonne nuit', p: 'maison' }, { k: 'ありがとう', r: 'arigatō', f: 'merci', p: 'maison' }, { k: 'ただいま', r: 'tadaima', f: 'je suis rentré', p: 'maison' },
  { k: 'おかえり', r: 'okaeri', f: 'bon retour à la maison', p: 'maison' }, { k: 'いえ', r: 'ie', f: 'la maison', p: 'maison' }, { k: 'ねこ', r: 'neko', f: 'le chat', p: 'maison' },
  { k: 'かわいい', r: 'kawaii', f: 'mignon', p: 'maison' }, { k: 'ねむい', r: 'nemui', f: 'j’ai sommeil', p: 'maison' }, { k: 'げんき', r: 'genki', f: 'en forme', p: 'maison' },
  { k: 'だいすき', r: 'daisuki', f: 'j’adore', p: 'maison' }, { k: 'すごい', r: 'sugoi', f: 'génial', p: 'maison' }, { k: 'よし', r: 'yoshi', f: 'allez, c’est parti', p: 'maison' },
  // ménage
  { k: 'そうじ', r: 'sōji', f: 'le ménage', p: 'menage' }, { k: 'ほうき', r: 'hōki', f: 'le balai', p: 'menage' }, { k: 'せんたく', r: 'sentaku', f: 'la lessive', p: 'menage' },
  { k: 'ごみ', r: 'gomi', f: 'les déchets', p: 'menage' }, { k: 'きれい', r: 'kirei', f: 'propre, joli', p: 'menage' }, { k: 'きたない', r: 'kitanai', f: 'sale', p: 'menage' },
  // courses
  { k: 'かいもの', r: 'kaimono', f: 'les courses', p: 'courses' }, { k: 'たまご', r: 'tamago', f: 'l’œuf', p: 'courses' }, { k: 'ぎゅうにゅう', r: 'gyūnyū', f: 'le lait', p: 'courses' },
  { k: 'パン', r: 'pan', f: 'le pain', p: 'courses' }, { k: 'りんご', r: 'ringo', f: 'la pomme', p: 'courses' }, { k: 'さかな', r: 'sakana', f: 'le poisson', p: 'courses' },
  { k: 'やさい', r: 'yasai', f: 'les légumes', p: 'courses' }, { k: 'みず', r: 'mizu', f: 'l’eau', p: 'courses' }, { k: 'いくら', r: 'ikura', f: 'combien ça coûte ?', p: 'courses' },
  // recettes
  { k: 'おいしい', r: 'oishii', f: 'délicieux', p: 'recettes' }, { k: 'いただきます', r: 'itadakimasu', f: 'bon appétit (avant de manger)', p: 'recettes' }, { k: 'ごちそうさま', r: 'gochisōsama', f: 'merci pour ce repas', p: 'recettes' },
  { k: 'ごはん', r: 'gohan', f: 'le riz, le repas', p: 'recettes' }, { k: 'りょうり', r: 'ryōri', f: 'la cuisine (le fait de cuisiner)', p: 'recettes' }, { k: 'あつい', r: 'atsui', f: 'chaud', p: 'recettes' },
  { k: 'おなかすいた', r: 'onaka suita', f: 'j’ai faim', p: 'recettes' }, { k: 'おちゃ', r: 'ocha', f: 'le thé', p: 'recettes' },
  // argent
  { k: 'おかね', r: 'okane', f: 'l’argent', p: 'argent' }, { k: 'たかい', r: 'takai', f: 'cher', p: 'argent' }, { k: 'やすい', r: 'yasui', f: 'pas cher', p: 'argent' },
  { k: 'えん', r: 'en', f: 'le yen', p: 'argent' }, { k: 'はんぶん', r: 'hanbun', f: 'la moitié', p: 'argent' },
  // loisirs
  { k: 'えいが', r: 'eiga', f: 'le film', p: 'nuit' }, { k: 'おもしろい', r: 'omoshiroi', f: 'intéressant, drôle', p: 'nuit' }, { k: 'こわい', r: 'kowai', f: 'effrayant', p: 'nuit' },
  { k: 'いっしょに', r: 'issho ni', f: 'ensemble', p: 'nuit' }, { k: 'たのしい', r: 'tanoshii', f: 'amusant', p: 'nuit' }, { k: 'よる', r: 'yoru', f: 'la nuit', p: 'nuit' },
  { k: 'あいしてる', r: 'aishiteru', f: 'je t’aime', p: 'nuit' },
];
// Les hiragana, par rangée (trois nouveaux par semaine, dans cet ordre).
export const HIRA = [
  ['あ', 'a'], ['い', 'i'], ['う', 'u'], ['え', 'e'], ['お', 'o'],
  ['か', 'ka'], ['き', 'ki'], ['く', 'ku'], ['け', 'ke'], ['こ', 'ko'],
  ['さ', 'sa'], ['し', 'shi'], ['す', 'su'], ['せ', 'se'], ['そ', 'so'],
  ['た', 'ta'], ['ち', 'chi'], ['つ', 'tsu'], ['て', 'te'], ['と', 'to'],
  ['な', 'na'], ['に', 'ni'], ['ぬ', 'nu'], ['ね', 'ne'], ['の', 'no'],
  ['は', 'ha'], ['ひ', 'hi'], ['ふ', 'fu'], ['へ', 'he'], ['ほ', 'ho'],
  ['ま', 'ma'], ['み', 'mi'], ['む', 'mu'], ['め', 'me'], ['も', 'mo'],
  ['や', 'ya'], ['ゆ', 'yu'], ['よ', 'yo'],
  ['ら', 'ra'], ['り', 'ri'], ['る', 'ru'], ['れ', 're'], ['ろ', 'ro'],
  ['わ', 'wa'], ['を', 'wo'], ['ん', 'n'],
];
// Un mot qui contient ce hiragana, pour l'exemple.
export const exemple = h => MOTS.find(m => m.k.includes(h)) || null;
