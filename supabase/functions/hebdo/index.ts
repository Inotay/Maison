// Récap du dimanche : une notification à vous deux, « Votre semaine à deux ». Tout ce que vous avez fait
// ensemble les 7 derniers jours, sans compter qui a fait quoi. Lancée par le planificateur le dimanche
// (deux heures UTC possibles, heure d'été ou d'hiver : seule celle de 18 h à Zurich passe).
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const DAY = 86400000;
const MOTS = ["Je suis fière de vous. Ne le répétez pas.", "Vous formez une très bonne équipe. Après moi, évidemment.", "Le canapé est libre : vous avez gagné une sieste avec moi.", "Bravo. Pour fêter ça, je propose des croquettes. Pour moi."];

Deno.serve(async (req) => {
  let body: Record<string, unknown> = {};
  if (req.method === "POST") { try { body = await req.json(); } catch { body = {}; } }
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Zurich", weekday: "short", hour: "numeric", hour12: false }).formatToParts(new Date());
  const wd = parts.find(p => p.type === "weekday")!.value, h = Number(parts.find(p => p.type === "hour")!.value) % 24;
  if (wd !== "Sun" || h !== Number(body.heure ?? 18)) return json({ skipped: `${wd} ${h} h à Zurich` });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // une seule fois par dimanche
  const today = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Zurich" }).format(new Date());
  const { data: last } = await db.from("app_secrets").select("value").eq("name", "recap_sent").maybeSingle();
  if (last?.value === today) return json({ skipped: "déjà envoyé" });
  await db.from("app_secrets").upsert({ name: "recap_sent", value: today });
  const since = new Date(Date.now() - 7 * DAY).toISOString();
  const [{ data: wins }, { data: subs }, { data: keysRows }] = await Promise.all([
    db.from("wins").select("kind").gt("done_at", since).neq("kind", "achat"),
    db.from("push_subscriptions").select("endpoint, sub"),
    db.from("app_secrets").select("name, value").in("name", ["vapid_public", "vapid_private", "vapid_subject"]),
  ]);
  const n = (wins ?? []).length;
  if (!n || !(subs ?? []).length) return json({ sent: 0, wins: n });
  const c = (k: string) => (wins ?? []).filter((w: { kind: string }) => w.kind === k).length;
  const pl = (x: number, a: string, b: string) => `${x} ${x > 1 ? b : a}`;
  const bits = [[c("chore"), "corvée", "corvées"], [c("task"), "tâche", "tâches"], [c("cuisine"), "recette", "recettes"], [c("shop"), "courses", "courses"]]
    .filter(x => x[0]).map(([x, a, b]) => pl(x as number, a as string, b as string));
  const k = Object.fromEntries((keysRows ?? []).map((r: { name: string; value: string }) => [r.name, r.value]));
  if (!k.vapid_public || !k.vapid_private) return json({ error: "clés VAPID absentes" }, 500);
  webpush.setVapidDetails(k.vapid_subject || "mailto:maison@inotay.github.io", k.vapid_public, k.vapid_private);
  const payload = JSON.stringify({ title: `Votre semaine à deux : ${pl(n, "chose faite", "choses faites")}`, body: `${bits.join(", ")}. Azami : « ${MOTS[Math.floor(Math.random() * MOTS.length)]} »`, tag: "maison-recap", url: "./?v=maison" });
  let sent = 0; const dead: string[] = [];
  for (const s of subs ?? []) {
    try { await webpush.sendNotification(s.sub, payload, { TTL: 12 * 3600 }); sent++; }
    catch (e) { const st = (e as { statusCode?: number }).statusCode; if (st === 404 || st === 410) dead.push(s.endpoint); }
  }
  if (dead.length) await db.from("push_subscriptions").delete().in("endpoint", dead);
  return json({ sent, wins: n });
});
