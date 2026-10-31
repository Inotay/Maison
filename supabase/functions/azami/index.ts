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
const MAX_TEXTE = 1500, MAX_CONTEXTE = 4000, FIL = 24, MEMOIRE = 80;

const str = (v: unknown, n: number) => String(v ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g, " ").trim().slice(0, n);
const json = (CORS: Record<string, string>, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });

// Ce qu'elle doit savoir faire et ne pas faire, au-delà de sa fiche.
const REGLES = `
TA SITUATION
- Tu es l'Azami de l'app « Maison », l'app du foyer de Yatoni et Mariana (ménage, courses, recettes, argent, loisirs et films). Tu en es la majordome.
- Tu parles avec UNE personne à la fois : celle indiquée dans « Qui te parle ». Tu la tutoies et tu l'appelles par son prénom.
- Tu vois un instantané de l'app (ce qui est à faire, les courses, le menu, les comptes…). Tu peux en parler, répondre aux questions dessus, remarquer ce que l'autre a fait dans l'app.
- Pour l'instant tu ne peux rien modifier dans l'app. Si on te demande d'ajouter, cocher, changer quelque chose : dis gentiment que tes pattes n'y arrivent pas encore, mais que ça vient bientôt.
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
    },
    required: ["reponse", "humeur"],
  },
};

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

  const texte = str(body.texte, MAX_TEXTE);
  if (!texte) return json(CORS, { error: "Rien à dire ?" }, 400);
  const key = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  if (!key) return json(CORS, { error: "Azami n'a pas encore sa clé.", code: "cle" }, 503);

  // ── Le plafond du jour ──
  const jour = new Date().toISOString().slice(0, 10);
  const { data: usage } = await db.from("azami_usage").select("qui, appels, cout_usd").eq("jour", jour);
  const depense = (usage ?? []).reduce((a, u) => a + Number(u.cout_usd), 0);
  const mesAppels = (usage ?? []).find(u => u.qui === me)?.appels ?? 0;
  if (depense >= PLAFOND_JOUR_USD || mesAppels >= PLAFOND_APPELS) return json(CORS, { error: "Azami a assez parlé pour aujourd'hui. Elle fait la sieste jusqu'à demain.", code: "plafond" }, 429);

  // ── Ce qu'elle sait ──
  const [{ data: fiche }, { data: mem }, { data: memAz }, { data: fil }] = await Promise.all([
    db.from("reglages").select("valeur").eq("cle", "azami:fiche").maybeSingle(),
    db.from("azami_memoire").select("id, texte, genre").eq("qui", me).order("created_at").limit(MEMOIRE),
    db.from("azami_memoire").select("id, texte, genre").eq("qui", "azami").order("created_at", { ascending: false }).limit(30),
    db.from("azami_messages").select("role, texte").eq("qui", me).order("at", { ascending: false }).limit(FIL),
  ]);
  const heure = Number(body.heure), fofolle = (heure >= 7 && heure < 8) || (heure >= 22 && heure < 24);
  const contexte = str(body.contexte, MAX_CONTEXTE);
  const lignes = (l: { id: string; texte: string }[] | null) => (l ?? []).map(x => `- [${x.id}] ${x.texte}`).join("\n") || "- (rien encore)";
  const systeme = [
    { type: "text", text: `Tu es Azami. Voici qui tu es :\n${(fiche?.valeur as { texte?: string })?.texte ?? ""}\n${REGLES}`, cache_control: { type: "ephemeral" } },
    { type: "text", text: `QUI TE PARLE : ${moi.name} (${autre ? `l'autre membre de la maison est ${autre.name}` : "seul membre"}).
MAINTENANT : ${str(body.date, 80) || jour}, ${Number.isFinite(heure) ? `${heure} h` : "heure inconnue"}.${fofolle ? " C'est une de tes heures de folie : tu es plus vive, tu as envie de jouer, tu mordilles un peu (gentiment)." : ""}
PAGE OÙ EST ${moi.name.toUpperCase()} : ${str(body.page, 40) || "accueil"}.

CE QUE TU SAIS DE ${moi.name.toUpperCase()} (identifiants entre crochets, pour « oublier ») :
${lignes(mem)}

CE QUE TU SAIS DE TOI (tes propres notes) :
${lignes([...(memAz ?? [])].reverse())}

L'APP EN CE MOMENT :
${contexte || "(pas d'instantané)"}` },
  ];
  const messages = [...(fil ?? [])].reverse().map(m => ({ role: m.role === "moi" ? "user" : "assistant", content: m.texte }));
  // deux messages de même rôle à la suite se fondent (l'API veut une alternance)
  const fondu: { role: string; content: string }[] = [];
  for (const m of [...messages, { role: "user", content: texte }]) { const d = fondu[fondu.length - 1]; if (d && d.role === m.role) d.content += "\n" + m.content; else fondu.push({ ...m }); }
  if (fondu[0]?.role !== "user") fondu.shift();

  let r: Response;
  try {
    r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODELE, max_tokens: 600, system: systeme, messages: fondu, tools: [OUTIL], tool_choice: { type: "auto" } }),
    });
  } catch (e) { console.error(e); return json(CORS, { error: "Azami n'entend rien (réseau)." }, 502); }
  const j = await r.json();
  if (!r.ok) { console.error(j); return json(CORS, { error: j?.error?.message ? `Azami est perdue : ${str(j.error.message, 160)}` : "Azami est perdue." }, 502); }
  const outil = (j.content ?? []).find((c: { type: string }) => c.type === "tool_use");
  const rep = outil?.input ?? {};
  const reponse = str(rep.reponse, 2000) || str((j.content ?? []).find((c: { type: string }) => c.type === "text")?.text, 2000) || "Mrrr… (elle s'est endormie en plein milieu)";

  // ── Ce qu'elle garde ──
  const u = j.usage ?? {};
  const cout = ((u.input_tokens ?? 0) * PRIX.in + (u.output_tokens ?? 0) * PRIX.out + (u.cache_creation_input_tokens ?? 0) * PRIX.cacheW + (u.cache_read_input_tokens ?? 0) * PRIX.cacheR) / 1e6;
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
  return json(CORS, { reponse, humeur: str(rep.humeur, 20) || "calme", retenu, notes, cout: Math.round(cout * 1e4) / 1e4 });
});
