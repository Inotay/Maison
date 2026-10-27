// Agenda : lit et écrit UN seul calendrier iCloud partagé (« Les quatre pattes ») par CalDAV.
// L'identifiant Apple et le mot de passe d'application restent sur le serveur, dans une table
// que les comptes de l'app ne peuvent pas lire. Le code ne touche jamais aux autres calendriers :
// une fois l'adresse du calendrier trouvée, c'est la seule qui est utilisée.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import ICAL from "npm:ical.js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });

type Cfg = { apple_id: string; app_password: string; calendar_name: string; calendar_href: string };
type Ev = { id: string; href: string; etag: string; title: string; start: string; end: string; allDay: boolean; place?: string; notes?: string; recurring: boolean };

const ICLOUD = "https://caldav.icloud.com";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const unesc = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#13;/g, "\r").replace(/&#10;/g, "\n");

async function dav(cfg: { apple_id: string; app_password: string }, method: string, url: string, body?: string, headers: Record<string, string> = {}) {
  const r = await fetch(url, {
    method, body,
    headers: { Authorization: "Basic " + btoa(`${cfg.apple_id}:${cfg.app_password}`), "Content-Type": "application/xml; charset=utf-8", ...headers },
  });
  const text = await r.text();
  if (r.status === 401) throw new Error("Identifiant Apple ou mot de passe d'application refusé.");
  if (r.status >= 400) throw new Error(`iCloud a répondu ${r.status} (${method}).`);
  return { status: r.status, text, headers: r.headers };
}
const abs = (base: string, href: string) => new URL(href, base).toString();

// Trouve l'adresse du calendrier nommé, et rien d'autre.
async function discover(cfg: { apple_id: string; app_password: string }, name: string) {
  const p1 = await dav(cfg, "PROPFIND", ICLOUD + "/", `<d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>`, { Depth: "0" });
  const principal = /<d:current-user-principal>\s*<d:href>([^<]+)<\/d:href>/i.exec(p1.text)?.[1] ?? /current-user-principal[\s\S]*?href[^>]*>([^<]+)</i.exec(p1.text)?.[1];
  if (!principal) throw new Error("Impossible de trouver le compte iCloud (principal).");
  const p2 = await dav(cfg, "PROPFIND", abs(ICLOUD, principal), `<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><c:calendar-home-set/></d:prop></d:propfind>`, { Depth: "0" });
  const home = /calendar-home-set[\s\S]*?href[^>]*>([^<]+)</i.exec(p2.text)?.[1];
  if (!home) throw new Error("Impossible de trouver la liste des calendriers.");
  const homeUrl = abs(ICLOUD, home);
  const p3 = await dav(cfg, "PROPFIND", homeUrl, `<d:propfind xmlns:d="DAV:"><d:prop><d:displayname/><d:resourcetype/></d:prop></d:propfind>`, { Depth: "1" });
  const responses = p3.text.split(/<\/?d:response>|<\/?response>/i);
  const want = name.trim().toLowerCase();
  const names: string[] = [];
  for (const r of responses) {
    const href = /href[^>]*>([^<]+)</i.exec(r)?.[1];
    const dn = /displayname[^>]*>([^<]*)</i.exec(r)?.[1];
    if (!href || dn == null || !/calendar\b/i.test(r) || !/resourcetype/i.test(r)) continue;
    if (!/<[a-z]*:?calendar\s*\/?>/i.test(r)) continue;
    names.push(unesc(dn));
    if (unesc(dn).trim().toLowerCase() === want) return { href: abs(homeUrl, href), name: unesc(dn) };
  }
  throw new Error(`Aucun calendrier nommé « ${name} ». Calendriers vus : ${names.join(", ") || "aucun"}.`);
}

const fmtUtc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const fmtDate = (s: string) => s.slice(0, 10).replace(/-/g, "");

function parseEvents(xml: string, calHref: string, from: Date, to: Date): Ev[] {
  const out: Ev[] = [];
  const f = ICAL.Time.fromJSDate(from, true), t = ICAL.Time.fromJSDate(to, true);
  for (const block of xml.split(/<\/?d:response>|<\/?response>/i)) {
    const href = /href[^>]*>([^<]+)</i.exec(block)?.[1];
    const etag = /getetag[^>]*>([^<]*)</i.exec(block)?.[1]?.replace(/&quot;/g, '"') ?? "";
    const data = /calendar-data[^>]*>([\s\S]*?)<\/[a-z]*:?calendar-data>/i.exec(block)?.[1];
    if (!href || !data) continue;
    let comp: ICAL.Component;
    try { comp = new ICAL.Component(ICAL.parse(unesc(data))); } catch { continue; }
    for (const tz of comp.getAllSubcomponents("vtimezone")) {
      const z = new ICAL.Timezone({ component: tz, tzid: tz.getFirstPropertyValue("tzid") });
      if (!ICAL.TimezoneService.has(z.tzid)) ICAL.TimezoneService.register(z.tzid, z);
    }
    const vevents = comp.getAllSubcomponents("vevent");
    const overrides = new Map<string, ICAL.Component>();
    for (const v of vevents) { const rid = v.getFirstProperty("recurrence-id"); if (rid) overrides.set(String(rid.getFirstValue().toUnixTime()), v); }
    const push = (ev: ICAL.Event, start: ICAL.Time, end: ICAL.Time, key: string, recurring: boolean) => {
      if (end.compare(f) < 0 || start.compare(t) > 0) return;
      if (ev.component.getFirstPropertyValue("status") === "CANCELLED") return;
      const allDay = start.isDate;
      out.push({
        id: key, href: abs(calHref, href), etag, recurring,
        title: String(ev.summary || "(sans titre)"),
        start: allDay ? start.toString() : start.toJSDate().toISOString(),
        end: allDay ? end.toString() : end.toJSDate().toISOString(),
        allDay, place: ev.location ? String(ev.location) : undefined,
        notes: ev.description ? String(ev.description) : undefined,
      });
    };
    for (const v of vevents) {
      if (v.getFirstProperty("recurrence-id")) continue;
      const ev = new ICAL.Event(v);
      const uid = String(ev.uid);
      if (!ev.isRecurring()) { push(ev, ev.startDate, ev.endDate, uid, false); continue; }
      const it = ev.iterator(); let next: ICAL.Time | null; let n = 0;
      while ((next = it.next()) && n++ < 400) {
        if (next.compare(t) > 0) break;
        const o = overrides.get(String(next.toUnixTime()));
        if (o) { const oe = new ICAL.Event(o); push(oe, oe.startDate, oe.endDate, `${uid}|${next.toUnixTime()}`, true); continue; }
        const d = ev.getOccurrenceDetails(next);
        push(ev, d.startDate, d.endDate, `${uid}|${next.toUnixTime()}`, true);
      }
    }
  }
  return out;
}

async function listEvents(cfg: Cfg, from: Date, to: Date) {
  const body = `<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><d:getetag/><c:calendar-data/></d:prop>
  <c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT">
    <c:time-range start="${fmtUtc(from)}" end="${fmtUtc(to)}"/>
  </c:comp-filter></c:comp-filter></c:filter></c:calendar-query>`;
  const r = await dav(cfg, "REPORT", cfg.calendar_href, body, { Depth: "1" });
  return parseEvents(r.text, cfg.calendar_href, from, to).sort((a, b) => a.start.localeCompare(b.start));
}

function buildIcs(uid: string, e: { title: string; start: string; end: string; allDay: boolean; place?: string; notes?: string }) {
  const fold = (s: string) => s.replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Maison//Agenda//FR", "BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${fmtUtc(new Date())}`];
  if (e.allDay) lines.push(`DTSTART;VALUE=DATE:${fmtDate(e.start)}`, `DTEND;VALUE=DATE:${fmtDate(e.end)}`);
  else lines.push(`DTSTART:${fmtUtc(new Date(e.start))}`, `DTEND:${fmtUtc(new Date(e.end))}`);
  lines.push(`SUMMARY:${fold(e.title)}`);
  if (e.place) lines.push(`LOCATION:${fold(e.place)}`);
  if (e.notes) lines.push(`DESCRIPTION:${fold(e.notes)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const auth = req.headers.get("Authorization") ?? "";
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // Qui appelle : l'adresse du jeton, qui doit être l'un des deux membres.
  const { data: { user: who } } = await admin.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
  const me = (who?.email ?? "").toLowerCase();
  const { data: member } = me ? await admin.from("members").select("email").eq("email", me).maybeSingle() : { data: null };
  if (!member) return json({ error: "Pas membre de la maison." }, 401);

  let body: Record<string, unknown> = {};
  if (req.method === "POST") { try { body = await req.json(); } catch { body = {}; } }
  const action = String(body.action ?? "list");

  try {
    if (action === "setup") {
      const apple_id = String(body.apple_id ?? "").trim().toLowerCase(), app_password = String(body.app_password ?? "").trim(), calendar_name = String(body.calendar_name ?? "").trim();
      if (!apple_id || !app_password || !calendar_name) return json({ error: "Il manque l'identifiant Apple, le mot de passe d'application ou le nom du calendrier." }, 400);
      const found = await discover({ apple_id, app_password }, calendar_name);
      const { error } = await admin.from("caldav_config").upsert({ id: 1, apple_id, app_password, calendar_name: found.name, calendar_href: found.href, set_by: me, updated_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
      return json({ ok: true, calendar: found.name });
    }
    if (action === "forget") {
      await admin.from("caldav_config").delete().eq("id", 1);
      return json({ ok: true });
    }
    const { data: cfg } = await admin.from("caldav_config").select("*").eq("id", 1).maybeSingle();
    if (!cfg) return json({ configured: false, events: [] });
    const safe = { configured: true, calendar: cfg.calendar_name, apple_id: cfg.apple_id.replace(/(.).+(@.+)/, "$1…$2"), set_by: cfg.set_by };

    if (action === "list") {
      const now = Date.now();
      const events = await listEvents(cfg, new Date(now - 7 * 86400000), new Date(now + 90 * 86400000));
      return json({ ...safe, events, at: new Date().toISOString() });
    }
    if (action === "create" || action === "update") {
      const e = body.event as Ev;
      if (!e?.title || !e?.start || !e?.end) return json({ error: "Titre, début et fin sont nécessaires." }, 400);
      if (action === "update" && e.recurring) return json({ error: "Les événements qui se répètent se modifient depuis l'app Calendrier." }, 400);
      const uid = action === "create" ? crypto.randomUUID() : String(e.id);
      const href = action === "create" ? cfg.calendar_href.replace(/\/?$/, "/") + uid + ".ics" : String(e.href);
      if (!href.startsWith(cfg.calendar_href)) return json({ error: "Hors du calendrier partagé." }, 403);
      const headers: Record<string, string> = { "Content-Type": "text/calendar; charset=utf-8" };
      if (action === "create") headers["If-None-Match"] = "*";
      await dav(cfg, "PUT", href, buildIcs(uid, e), headers);
      return json({ ok: true, id: uid, href });
    }
    if (action === "delete") {
      const href = String(body.href ?? "");
      if (!href.startsWith(cfg.calendar_href)) return json({ error: "Hors du calendrier partagé." }, 403);
      await dav(cfg, "DELETE", href, undefined, { "Content-Type": "text/calendar" });
      return json({ ok: true });
    }
    return json({ error: "Action inconnue." }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
