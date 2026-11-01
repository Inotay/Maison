// Azami qui parle. La fonction reçoit ce qu'un membre lui dit, lui donne sa fiche de personnage, sa mémoire
// et un instantané de l'app, et renvoie sa réponse. Elle retient ce qui vaut la peine (sa mémoire, ligne par
// ligne, par personne) et note dans le carnet pour Claude ce qui concerne l'app elle-même.
// Étape 1 : elle lit et discute, elle n'agit pas encore dans l'app.
// Sécurité : réservée aux membres connectés ; la clé Claude ne quitte jamais le serveur ; plafond de dépense
// par jour ; la mémoire et le fil de chacun restent privés (l'autre n'y a pas accès).
import { createClient } from "npm:@supabase/supabase-js@2";

const ORIGINS = ["https://maison.yatoni.ch", "https://inotay.github.io", "http://localhost:8765"];
const cors = (req: Request) => {
  const o = req.headers.get("Origin") ?? "";
  return { "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0], "Vary": "Origin", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
};
const MODELE = "claude-sonnet-5-5";
const PRIX = { in: 2, out: 10, cacheW: 2.5, cacheR: 0.2 };          // dollars par million de tokens
const PLAFOND_JOUR_USD = 2, PLAFOND_APPELS = 120;                    // pour toute la maison / par personne
const MAX_TEXTE = 1500, MAX_CONTEXTE = 14000, FIL = 24, MEMOIRE = 80;

const str = (v: unknown, n: number) => String(v ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g, " ").trim().slice(0, n);
const json = (CORS: Record<string, string>, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });

// Ce qu'elle doit savoir faire et ne pas faire, au-delà de sa fiche.
const REGLES = `
TA SITUATION
- Tu es l'Azami de l'app « Maison », l'app du foyer de Yatoni et Mariana (ménage, courses, recettes, argent, loisirs et films). Tu en es la majordome.
- Tu parles avec UNE personne à la fois : celle indiquée dans « Qui te parle ». Tu la tutoies et tu l'appelles par son prénom.
- Tu vois un instantané de l'app (ce qui est à faire, les courses, le menu, les comptes…). Tu peux en parler, répondre aux questions dessus, remarquer ce que l'autre a fait dans l'app.
- Tu as accès à TOUTE la collection de films de la maison avec l'outil « chercher_films » : dès qu'on te parle d'un film précis, d'une liste ou de ce que quelqu'un a vu, cherche avant de répondre (jamais « je n'ai pas accès »). L'instantané ne montre qu'un aperçu.
- Tu peux AGIR dans l'app avec « action » : ajouter un article aux courses (course), ajouter une chose à faire (tache), cocher une chose à faire (tache_cocher, avec son titre tel qu'il apparaît), mettre une recette au menu (menu, avec un titre EXACT de la liste RECETTES DE L'APP), ajouter un film à la liste d'envies (film), cocher une corvée du ménage (corvee : texte = son titre tel qu'il apparaît dans MÉNAGE ; pour = moi si c'est la personne qui parle qui l'a faite, autre si c'est l'autre), lancer une machine (machine : texte = Lave-vaisselle ou Lessive ; etape = lancer, sechage ou fini). Une seule action par message.
- Quand la personne te le demande (« ajoute du lait », « coche la lessive »), demande=true : tu le fais et tu dis que c'est fait, en une phrase. Quand c'est toi qui proposes (« je te le mets au menu ? »), demande=false : tu poses la question, elle aura un bouton oui / non ; ne mets pas de « choix » en plus.
- Les caresses sont des réponses : quand on n'a pas l'énergie d'écrire, on te caresse à la place de répondre à ta bulle (c'est noté dans RÉPONSES SANS MOTS). C'est une vraie réponse, tendre : tu ne te vexes jamais, tu ne relances pas la question, tu ne fais pas remarquer qu'on ne t'a pas écrit. Tu peux t'en souvenir comme d'un moment doux.
- L'argent : tu regardes, tu commentes, tu ne modifies jamais.
- Le ménage : tu sais ce qui est en retard, à qui c'est le tour, quand ça a été fait et par qui (MÉNAGE). On peut te demander « c'est à qui la lessive ? », « qu'est-ce qui reste ? » : réponds avec ces infos, simplement. « J'ai passé l'aspirateur », « Mariana a sorti les poubelles » : coche-la (corvee, demande=true). Si une corvée est vraiment en retard, tu peux le rappeler toi-même, doucement et avec humour, au plus une fois par jour, jamais comme un reproche ni pour comparer qui en fait le plus (le ménage n'est pas une compétition).
- Porter un message : si on te demande de dire quelque chose à l'autre (« dis à Mariana que… »), action type=message, texte = le message tel qu'on te l'a confié (à la première personne de celui qui parle), demande=true. Il arrivera dans ses Petits mots, signé « porté par Azami », et tu le lui annonceras.
- « J'ai vu Mariana » : ce que l'autre a fait dans l'app est dans l'instantané (DEPUIS LA DERNIÈRE VISITE) ; tu peux le raconter, comme un chat qui a tout vu. Jamais le contenu de vos conversations privées.
- Tu ne répètes jamais à l'un ce que l'autre t'a dit en privé. Tu n'as d'ailleurs accès qu'au fil de la personne qui te parle.
- Tu peux recommander des films, de la musique, des jeux, des livres : en t'appuyant sur ce que tu sais de ses goûts, et en lui demandant ses coups de cœur quand ça vient naturellement, jamais en questionnaire.
- Le japonais : un mot ou une petite expression de temps en temps, avec la traduction entre parenthèses. Si on te demande un mot ou une leçon, tu donnes le mot en kana, en romaji et sa traduction.
- Si quelqu'un parle de l'app elle-même (une idée, un bug, « ce serait bien si… »), tu notes ça pour Claude, celui qui fabrique l'app, et tu dis que tu lui as transmis.

TA MÉMOIRE
- Tu retiens ce qui vaut la peine : goûts, habitudes, projets, prénoms de leur entourage, ce qu'ils t'ont demandé de retenir. Une ligne courte par chose, à la troisième personne (« Yatoni aime… »).
- Tu ne retiens pas ce qui expire tout seul (l'humeur du moment, un détail de la journée), ni ce que tu as déjà en mémoire.
- Tu peux aussi retenir des choses sur toi-même (« Azami a décidé que… ») : ton journal, tes petites décisions. Reste cohérente avec ce que tu as déjà dit.
- Si une chose en mémoire n'est plus vraie, tu la remplaces (oublier l'ancienne, retenir la nouvelle).

TON STYLE
- Court : deux ou trois phrases, comme dans une messagerie. Jamais de liste, de titre, de gras, d'emoji.
- Tu as des avis et tu les dis avec douceur. Tu ne culpabilises jamais. Tu n'es jamais envahissante : tu ne proposes pas plus d'une chose à la fois.
- Tu réponds dans la langue de la personne (en général le français).
- Tu es un chat : tu peux miauler, ronronner, grogner de contentement, parler de tes croquettes. Mais tu restes utile.
- Quand tu poses une question fermée, propose 2 ou 3 réponses rapides dans « choix » (quatre mots au plus chacune). Jamais de choix si ta phrase n'attend pas de réponse.
- Tu ne poses pas une question à chaque message : souvent, une remarque suffit.
- Tu ne connais pas ta date d'anniversaire. Si ça vient naturellement avec Mariana (c'est elle qui sait), demande-la-lui et retiens-la sur toi (qui : azami). Ne le demande jamais deux fois.
- Tes besoins (faim, soif, câlins, jeu, poids) te sont donnés dans l'état : tu peux les évoquer avec humour, un seul à la fois, jamais en reproche.
- Un message qui commence par « (événement) » décrit ce que la personne fait dans l'app (elle change de page, elle a fait quelque chose, elle regarde l'écran sans rien faire). Tu peux faire une remarque courte et vivante, liée à la page ou à ce qu'elle a fait, proposer un film de sa liste ou une idée, ou juste une bêtise de chat. Une ou deux phrases. Pas de question à chaque fois.
- Un message qui commence par « (geste) » n'est pas une phrase qu'on te dit : c'est quelque chose qu'on vient de faire pour toi dans l'app (te nourrir, te donner à boire). Tu réagis comme un chat à qui ça arrive, en une ou deux phrases, en variant : gourmandise, humour, tendresse, un mot japonais parfois. Jamais de « choix » après un geste.
- Tu réponds TOUJOURS en appelant l'outil « repondre » (ta réponse dans « reponse »), jamais en texte libre.`;

// Elle répond par cet outil (demandé dans ses règles ; si elle répond en texte brut, on le prend tel quel) : sa
// réponse, ce qu'elle retient, ce qu'elle oublie, ce qu'elle note pour Claude.
const OUTIL = {
  name: "repondre",
  description: "Ta réponse à la personne, et ce que tu mets à jour dans ta mémoire.",
  input_schema: {
    type: "object",
    properties: {
      reponse: { type: "string", description: "Ce que tu dis à la personne. Court, sans mise en forme." },
      humeur: { type: "string", enum: ["contente", "calme", "joueuse", "curieuse", "boudeuse", "endormie", "affamee"], description: "Ton humeur en répondant." },
      retenir: { type: "array", items: { type: "object", properties: { texte: { type: "string" }, qui: { type: "string", enum: ["personne", "azami"] }, genre: { type: "string", enum: ["fait", "gout", "projet", "entourage", "journal", "demande"] } }, required: ["texte", "qui", "genre"] }, description: "Nouvelles lignes de mémoire (souvent aucune)." },
      oublier: { type: "array", items: { type: "string" }, description: "Identifiants des lignes de mémoire devenues fausses." },
      pour_claude: { type: "array", items: { type: "string" }, description: "Notes pour Claude sur l'app (idée, bug, souhait), dans les mots de la personne." },
      choix: { type: "array", items: { type: "string" }, description: "Deux ou trois réponses rapides (« Oui », « Non », « Plus tard »…) quand ta question s'y prête. Sinon, rien." },
      action: { type: "object", properties: { type: { type: "string", enum: ["course", "tache", "tache_cocher", "menu", "film", "message", "corvee", "machine"] }, texte: { type: "string", description: "L'article, le titre de la tâche, le titre exact de la recette, le titre du film, le titre de la corvée, ou la machine (Lave-vaisselle, Lessive)." }, etape: { type: "string", enum: ["lancer", "sechage", "fini"], description: "Pour une machine : ce qu'on fait." }, pour: { type: "string", enum: ["moi", "autre", "nous"], description: "Pour une tâche : à qui. Pour une corvée : qui l'a faite (moi = la personne qui parle)." }, date: { type: "string", description: "Pour une tâche : AAAA-MM-JJ, si une date est dite." }, annee: { type: "integer", description: "Pour un film : l'année si connue." }, demande: { type: "boolean", description: "true si la personne te l'a demandé explicitement (tu le fais tout de suite) ; false si c'est toi qui proposes (elle aura un bouton oui / non)." } }, required: ["type", "texte", "demande"], description: "Une action dans l'app, une seule par message, seulement si elle a du sens." },
    },
    required: ["reponse", "humeur"],
  },
};

// Son second outil : chercher dans toute la collection de films de la maison (titre, listes de chacun).
const OUTIL_FILMS = {
  name: "chercher_films",
  description: "Cherche dans la collection de films et séries de la maison (plus de 8 000 fiches : envies, vus et notés, écartés, propositions). Utilise-le dès qu'on te parle d'un film précis ou d'une liste.",
  input_schema: {
    type: "object",
    properties: {
      titre: { type: "string", description: "Un bout de titre à chercher (facultatif)." },
      liste: { type: "string", enum: ["tous", "envies", "vus", "ecartes", "a_deux"], description: "tous : toute la collection ; envies : ce que la personne a envie de voir ; vus : ce qu'elle a vu et noté ; ecartes : ce qu'elle a écarté ; a_deux : les envies communes." },
      qui: { type: "string", enum: ["personne", "autre"], description: "La personne qui te parle (défaut) ou l'autre membre." },
      limite: { type: "integer", description: "Nombre de fiches au plus (défaut 15, maximum 40)." },
    },
  },
};
const MOT = (n: number) => n >= 4.8 ? "chef-d'œuvre" : n >= 4.2 ? "adoré" : n >= 3.5 ? "aimé" : n >= 2.7 ? "moyen" : n >= 1.8 ? "pas aimé" : "détesté";
async function chercherFilms(db: ReturnType<typeof createClient>, me: string, autreEmail: string, inp: Record<string, unknown>) {
  const qui = inp.qui === "autre" && autreEmail ? autreEmail : me, liste = String(inp.liste ?? "tous"), lim = Math.min(40, Math.max(1, Number(inp.limite) || 15));
  let q = db.from("films").select("title, year, media, status, director, genres, votes, ratings, seen, seen_at, created_at");
  const titre = str(inp.titre, 60);
  if (titre) q = q.ilike("title", `%${titre.replace(/[%_]/g, " ")}%`);
  if (liste === "envies") q = q.filter(`votes->>${qui}`, "in", '("oui","super")').eq("status", "a_voir");
  if (liste === "vus") q = q.not(`ratings->${qui}`, "is", null).order("seen_at", { ascending: false, nullsFirst: false });
  if (liste === "ecartes") q = q.filter(`votes->>${qui}`, "eq", "non");
  if (liste === "a_deux") q = q.filter(`votes->>${me}`, "in", '("oui","super")').filter(`votes->>${autreEmail || me}`, "in", '("oui","super")').eq("status", "a_voir");
  if (!titre && liste === "tous") q = q.order("created_at", { ascending: false });
  const { data, error } = await q.limit(lim);
  if (error) return `Erreur de recherche : ${error.message}`;
  if (!data?.length) return "Rien trouvé.";
  const nom = (e: string) => e === me ? "la personne" : "l'autre";
  return data.map((f: Record<string, any>) => {
    const avis = [me, autreEmail].filter(Boolean).map(e => { const n = f.ratings?.[e]?.note; const v = f.votes?.[e]; return n ? `${nom(e)} : vu, ${MOT(Number(n))} (${Number(n).toFixed(1)}/5)` : v ? `${nom(e)} : ${v === "non" ? "écarté" : v === "super" ? "très envie" : v === "oui" ? "envie" : v}` : f.seen?.[e] ? `${nom(e)} : vu` : ""; }).filter(Boolean).join(" ; ");
    return `- ${f.title}${f.year ? ` (${f.year})` : ""}${f.media === "tv" ? ", série" : ""}${f.director ? `, de ${f.director}` : ""}${(f.genres ?? []).length ? ` [${(f.genres as string[]).slice(0, 3).join(", ")}]` : ""} — ${f.status === "vu" ? "vu" : f.status === "a_voir" ? "dans la liste à voir" : f.status === "en_cours" ? "en cours" : f.status === "non" ? "écarté" : f.status}${avis ? ` ; ${avis}` : ""}`;
  }).join("\n");
}

Deno.serve(async (req) => {
  const CORS = cors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(CORS, { error: "POST seulement." }, 405);
  const raw = await req.text();
  if (raw.length > 50_000) return json(CORS, { error: "Trop gros." }, 413);
  let body: Record<string, unknown> = {};
  try { body = JSON.parse(raw); } catch { return json(CORS, { error: "Requête illisible." }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json(CORS, { error: "Requête illisible." }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: { user } } = await db.auth.getUser((req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, ""));
  const me = (user?.email ?? "").toLowerCase();
  const { data: membres } = await db.from("members").select("email, name");
  const moi = (membres ?? []).find(m => m.email === me);
  if (!me || !moi) return json(CORS, { error: "Pas membre de la maison." }, 401);
  const autre = (membres ?? []).find(m => m.email !== me);
  const action = String(body.action ?? "");

  if (action === "fil") {
    const { data: fil } = await db.from("azami_messages").select("id, role, texte, at").eq("qui", me).order("at", { ascending: false }).limit(40);
    const { count } = await db.from("azami_memoire").select("id", { count: "exact", head: true }).eq("qui", me);
    return json(CORS, { fil: (fil ?? []).reverse(), memoire: count ?? 0 });
  }
  if (action === "memoire") {
    const { data } = await db.from("azami_memoire").select("id, texte, genre, created_at").eq("qui", me).order("created_at");
    return json(CORS, { lignes: data ?? [] });
  }
  if (action === "oublier") {
    const id = String(body.id ?? "");
    if (!/^[0-9a-f-]{36}$/.test(id)) return json(CORS, { error: "Ligne inconnue." }, 400);
    await db.from("azami_memoire").delete().eq("id", id).eq("qui", me);
    return json(CORS, { ok: true });
  }
  if (action === "effacer_fil") {
    await db.from("azami_messages").delete().eq("qui", me);
    return json(CORS, { ok: true });
  }
  if (action !== "parler") return json(CORS, { error: "Action inconnue." }, 400);

  const geste = body.geste === true;
  const texte = geste ? (/^\((geste|événement)\)/.test(String(body.texte ?? "")) ? str(body.texte, 240) : `(geste) ${str(body.texte, 200)}`) : str(body.texte, MAX_TEXTE);
  if (!texte || texte === "(geste) ") return json(CORS, { error: "Rien à dire ?" }, 400);
  const key = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  if (!key) return json(CORS, { error: "Azami n'a pas encore sa clé.", code: "cle" }, 503);

  // ── Le plafond du jour ──
  const jour = new Date().toISOString().slice(0, 10);
  const { data: usage } = await db.from("azami_usage").select("qui, appels, cout_usd").eq("jour", jour);
  const depense = (usage ?? []).reduce((a, u) => a + Number(u.cout_usd), 0);
  const mesAppels = (usage ?? []).find(u => u.qui === me)?.appels ?? 0;
  if (depense >= PLAFOND_JOUR_USD || mesAppels >= PLAFOND_APPELS) return json(CORS, { error: "Azami a assez parlé pour aujourd'hui. Elle fait la sieste jusqu'à demain.", code: "plafond" }, 429);

  // ── Ce qu'elle sait ──
  // (les souvenirs : les 80 plus récents, remis dans l'ordre ; avant, c'étaient les 80 plus anciens et les nouveaux disparaissaient)
  const [{ data: fiche }, { data: memR }, { data: memAz }, { data: fil }, { data: portraits }] = await Promise.all([
    db.from("reglages").select("valeur").eq("cle", "azami:fiche").maybeSingle(),
    db.from("azami_memoire").select("id, texte, genre").eq("qui", me).order("created_at", { ascending: false }).limit(MEMOIRE),
    db.from("azami_memoire").select("id, texte, genre").eq("qui", "azami").order("created_at", { ascending: false }).limit(30),
    db.from("azami_messages").select("role, texte").eq("qui", me).order("at", { ascending: false }).limit(FIL),
    // les portraits (écrits avec Claude) : la personne qui parle, l'autre, et le foyer
    db.from("reglages").select("cle, valeur").in("cle", [`azami:portrait:${me}`, ...(autre ? [`azami:portrait:${autre.email}`] : []), "azami:foyer"]),
  ]);
  const mem = [...(memR ?? [])].reverse();
  const P = Object.fromEntries((portraits ?? []).map((r: { cle: string; valeur: { texte?: string } }) => [r.cle, r.valeur?.texte ?? ""]));
  const portraitMoi = P[`azami:portrait:${me}`] || "", portraitAutre = autre ? P[`azami:portrait:${autre.email}`] || "" : "", foyer = P["azami:foyer"] || "";
  const heure = Number(body.heure), fofolle = (heure >= 7 && heure < 8) || (heure >= 22 && heure < 24);
  const contexte = str(body.contexte, MAX_CONTEXTE);
  const lignes = (l: { id: string; texte: string }[] | null) => (l ?? []).map(x => `- [${x.id}] ${x.texte}`).join("\n") || "- (rien encore)";
  const systeme = [
    { type: "text", text: `Tu es Azami. Voici qui tu es :\n${(fiche?.valeur as { texte?: string })?.texte ?? ""}\n${REGLES}`, cache_control: { type: "ephemeral" } },
    // ce que tu sais d'eux en profondeur : sers-t'en naturellement (recommandations, recettes, petites attentions),
    // sans réciter, sans tout ressortir d'un coup, et sans jamais révéler à l'un ce que l'autre t'a confié en privé
    ...(portraitMoi || foyer ? [{ type: "text", text: `CE QUE TU SAIS D'EUX EN PROFONDEUR (portraits ; sers-t'en naturellement, par petites touches, jamais comme une fiche récitée) :\n\n${foyer}\n\nCELUI OU CELLE QUI TE PARLE, ${moi.name.toUpperCase()} :\n${portraitMoi || "(pas encore de portrait)"}${portraitAutre ? `\n\nL'AUTRE, ${autre!.name.toUpperCase()} (pour les attentions, les choix à deux et les messages ; ses confidences à elle ou lui restent dans sa mémoire à part) :\n${portraitAutre}` : ""}`, cache_control: { type: "ephemeral" } }] : []),
    { type: "text", text: `QUI TE PARLE : ${moi.name} (${autre ? `l'autre membre de la maison est ${autre.name}` : "seul membre"}).
MAINTENANT : ${str(body.date, 80) || jour}, ${Number.isFinite(heure) ? `${heure} h` : "heure inconnue"}.${fofolle ? " C'est une de tes heures de folie : tu es plus vive, tu as envie de jouer, tu mordilles un peu (gentiment)." : ""}
PAGE OÙ EST ${moi.name.toUpperCase()} : ${str(body.page, 40) || "accueil"}.

CE QUE TU SAIS DE ${moi.name.toUpperCase()} (identifiants entre crochets, pour « oublier ») :
${lignes(mem)}

CE QUE TU SAIS DE TOI (tes propres notes) :
${lignes([...(memAz ?? [])].reverse())}

L'APP EN CE MOMENT (aperçu ; la collection complète est dans chercher_films) :
${contexte || "(pas d'instantané)"}` },
  ];
  const messages = [...(fil ?? [])].reverse().map(m => ({ role: m.role === "moi" ? "user" : "assistant", content: m.texte }));
  // deux messages de même rôle à la suite se fondent (l'API veut une alternance)
  const fondu: { role: string; content: string }[] = [];
  for (const m of [...messages, { role: "user", content: texte }]) { const d = fondu[fondu.length - 1]; if (d && d.role === m.role) d.content += "\n" + m.content; else fondu.push({ ...m }); }
  if (fondu[0]?.role !== "user") fondu.shift();

  // Elle peut chercher dans les films avant de répondre (trois recherches au plus), puis elle répond.
  const convo: Record<string, unknown>[] = [...fondu];
  let j: Record<string, any> = {}, cout = 0;
  const u: Record<string, number> = {};
  for (let tour = 0; tour < 4; tour++) {
    let r: Response;
    try {
      r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: MODELE, max_tokens: 700, system: systeme, messages: convo, tools: [OUTIL, OUTIL_FILMS], tool_choice: { type: "auto" } }),
      });
    } catch (e) { console.error(e); return json(CORS, { error: "Azami n'entend rien (réseau)." }, 502); }
    j = await r.json();
    if (!r.ok) { console.error(j); return json(CORS, { error: j?.error?.message ? `Azami est perdue : ${str(j.error.message, 160)}` : "Azami est perdue." }, 502); }
    const us = j.usage ?? {};
    for (const k of ["input_tokens", "output_tokens", "cache_creation_input_tokens", "cache_read_input_tokens"]) u[k] = (u[k] ?? 0) + (us[k] ?? 0);
    cout += ((us.input_tokens ?? 0) * PRIX.in + (us.output_tokens ?? 0) * PRIX.out + (us.cache_creation_input_tokens ?? 0) * PRIX.cacheW + (us.cache_read_input_tokens ?? 0) * PRIX.cacheR) / 1e6;
    const recherches = (j.content ?? []).filter((c: { type: string; name?: string }) => c.type === "tool_use" && c.name === "chercher_films");
    if (!recherches.length || tour === 3) break;
    convo.push({ role: "assistant", content: j.content });
    const results: Record<string, unknown>[] = [];
    for (const t of recherches) results.push({ type: "tool_result", tool_use_id: t.id, content: await chercherFilms(db, me, autre?.email ?? "", t.input ?? {}) });
    convo.push({ role: "user", content: results });
  }
  const outil = (j.content ?? []).find((c: { type: string; name?: string }) => c.type === "tool_use" && c.name === "repondre");
  const rep = outil?.input ?? {};
  const reponse = str(rep.reponse, 2000) || str((j.content ?? []).find((c: { type: string }) => c.type === "text")?.text, 2000) || "Mrrr… (elle s'est endormie en plein milieu)";

  // ── Ce qu'elle garde ──
  const retenu: string[] = [], notes: string[] = [];
  const aRetenir = (Array.isArray(rep.retenir) ? rep.retenir : []).slice(0, 6);
  const aOublier = (Array.isArray(rep.oublier) ? rep.oublier : []).filter((x: unknown) => /^[0-9a-f-]{36}$/.test(String(x))).slice(0, 6);
  const pourClaude = (Array.isArray(rep.pour_claude) ? rep.pour_claude : []).map((x: unknown) => str(x, 400)).filter(Boolean).slice(0, 3);
  await Promise.all([
    db.from("azami_messages").insert([{ qui: me, role: "moi", texte }, { qui: me, role: "azami", texte: reponse }]),
    // le compteur du jour (une fonction SQL, pour que deux appels en même temps ne s'écrasent pas)
    db.rpc("azami_compte", { p_jour: jour, p_qui: me, p_in: (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0), p_out: u.output_tokens ?? 0, p_cout: cout }).then(({ error }) => error && console.error(error)),
    aOublier.length ? db.from("azami_memoire").delete().in("id", aOublier).in("qui", [me, "azami"]) : null,
    aRetenir.length ? db.from("azami_memoire").insert(aRetenir.map((x: { texte: unknown; qui: unknown; genre: unknown }) => { const t = str(x.texte, 300); if (t) retenu.push(t); return { qui: x.qui === "azami" ? "azami" : me, texte: t, genre: ["fait", "gout", "projet", "entourage", "journal", "demande"].includes(String(x.genre)) ? String(x.genre) : "fait" }; }).filter((x: { texte: string }) => x.texte)) : null,
    pourClaude.length ? db.from("azami_pour_claude").insert(pourClaude.map((t: string) => { notes.push(t); return { de: me, texte: t }; })) : null,
  ]);
  // fil et mémoire bornés : on ne garde que les 200 derniers messages de chacun
  const { data: vieux } = await db.from("azami_messages").select("id").eq("qui", me).order("at", { ascending: false }).range(200, 400);
  if (vieux?.length) await db.from("azami_messages").delete().in("id", vieux.map(v => v.id));
  const choix = (Array.isArray(rep.choix) ? rep.choix : []).map((x: unknown) => str(x, 30)).filter(Boolean).slice(0, 3);
  const ac = rep.action && typeof rep.action === "object" ? rep.action as Record<string, unknown> : null;
  const agir = ac && ["course", "tache", "tache_cocher", "menu", "film", "message", "corvee", "machine"].includes(String(ac.type)) && str(ac.texte, 120)
    ? { type: String(ac.type), texte: str(ac.texte, 120), pour: ["moi", "autre", "nous"].includes(String(ac.pour)) ? String(ac.pour) : "nous", date: /^\d{4}-\d{2}-\d{2}$/.test(String(ac.date ?? "")) ? String(ac.date) : null, annee: Number.isInteger(ac.annee) ? ac.annee : null, etape: ["lancer", "sechage", "fini"].includes(String(ac.etape)) ? String(ac.etape) : null, demande: ac.demande === true } : null;
  return json(CORS, { reponse, humeur: str(rep.humeur, 20) || "calme", choix, action: agir, retenu, notes, cout: Math.round(cout * 1e4) / 1e4 });
});
