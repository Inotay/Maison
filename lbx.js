// Lire l'export Letterboxd (le ZIP tel quel, ou un fichier CSV) directement sur le téléphone.
// Le ZIP est ouvert à la main (pas de bibliothèque) : on lit le répertoire central, puis chaque fichier,
// décompressé par le navigateur (DecompressionStream « deflate-raw »).

async function inflate(bytes) {
  const ds = new DecompressionStream('deflate-raw');
  const out = new Response(new Blob([bytes]).stream().pipeThrough(ds));
  return new Uint8Array(await out.arrayBuffer());
}
export async function unzip(buf) {
  const v = new DataView(buf), u8 = new Uint8Array(buf), files = {};
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 70000); i--) if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Ce fichier n’est pas un ZIP.');
  const n = v.getUint16(eocd + 10, true); let p = v.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  for (let k = 0; k < n; k++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const method = v.getUint16(p + 10, true), csize = v.getUint32(p + 20, true);
    const nl = v.getUint16(p + 28, true), el = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), off = v.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nl));
    p += 46 + nl + el + cl;
    if (!/\.csv$/i.test(name)) continue;
    const lnl = v.getUint16(off + 26, true), lel = v.getUint16(off + 28, true), start = off + 30 + lnl + lel;
    const data = u8.subarray(start, start + csize);
    files[name.replace(/^.*?(likes\/)?([^/]+)$/, (m, a, b) => (a || '') + b).toLowerCase()] = dec.decode(method === 8 ? await inflate(data) : data);
  }
  return files;
}
export function csv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = (rows.shift() || []).map(h => h.trim().toLowerCase());
  return rows.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
}
// Tout ce qu'on sait de chaque film : vu, note (sur 5, par demi-étoiles), aimé, à voir, et quand.
export function films(files) {
  const by = new Map();
  const get = r => { const k = r['letterboxd uri'] || `${r.name}|${r.year}`; if (!by.has(k)) by.set(k, { title: r.name, year: Number(r.year) || null, uri: r['letterboxd uri'] || '' }); return by.get(k); };
  const pick = re => Object.entries(files).find(([n]) => re.test(n))?.[1];
  for (const r of csv(pick(/(^|\/)watched\.csv$/) || '')) { const f = get(r); f.seen = true; f.at = f.at || r.date; }
  for (const r of csv(pick(/(^|\/)diary\.csv$/) || '')) { const f = get(r); f.seen = true; f.at = r['watched date'] || r.date || f.at; if (r.rating) f.rating = Number(r.rating); }
  for (const r of csv(pick(/(^|\/)ratings\.csv$/) || '')) { const f = get(r); f.seen = true; if (r.rating) f.rating = Number(r.rating); f.at = f.at || r.date; }
  for (const r of csv(pick(/^likes\/films\.csv$|(^|\/)films\.csv$/) || '')) { const f = get(r); f.liked = true; }
  for (const r of csv(pick(/(^|\/)watchlist\.csv$/) || '')) { const f = get(r); if (!f.seen) f.want = true; }
  return [...by.values()].filter(f => f.title);
}
export async function read(file) {
  const buf = await file.arrayBuffer();
  if (/\.zip$/i.test(file.name) || new DataView(buf).getUint32(0, true) === 0x04034b50) return films(await unzip(buf));
  const text = new TextDecoder().decode(buf);
  // un seul CSV : on devine lequel d'après son nom
  const n = file.name.toLowerCase();
  return films({ [/watchlist/.test(n) ? 'watchlist.csv' : /diary/.test(n) ? 'diary.csv' : /rating/.test(n) ? 'ratings.csv' : /like|films/.test(n) ? 'likes/films.csv' : 'watched.csv']: text });
}
