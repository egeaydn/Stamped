// Adım 4: Her ülkenin pasaport kapak rengini, Wikipedia'daki pasaport makalesinin ana fotoğrafından ölç.
// Fotoğraf sitede KULLANILMAZ; yalnızca baskın renk okunur. Sonuç: data/emblems/colors.json (elle gözden geçirilir).
// Çalıştır: node scripts/emblems/04-colors.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const UA = "stamped-project/0.1 (personal hobby project; contact via GitHub)";
const visa = JSON.parse(readFileSync("src/data/meta.json", "utf8"));
const OUT = "data/emblems/colors.json";
const out = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};

const API = "https://en.wikipedia.org/w/api.php";
async function api(params, tries = 4) {
  const url = API + "?format=json&origin=*&" + new URLSearchParams(params);
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
      if (r.ok) return r.json();
      // Hız sınırında Retry-After'a uy (en fazla 2 dk), yoksa giderek uzayan bekleme
      const wait = Math.min((Number(r.headers.get("retry-after")) || 4 * (i + 1)) * 1000, 120000);
      console.log(`API ${r.status}, ${Math.round(wait / 1000)} sn bekleniyor`);
      await new Promise((res) => setTimeout(res, wait));
    } catch {
      await new Promise((res) => setTimeout(res, 3000));
    }
  }
  throw new Error("API başarısız");
}

// Küçük görsel indirirken de aynı nezaket ve zaman aşımı
async function getImage(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(25000) });
      if (r.ok) return Buffer.from(await r.arrayBuffer());
      const wait = Math.min((Number(r.headers.get("retry-after")) || 6 * (i + 1)) * 1000, 120000);
      console.log(`görsel ${r.status}, ${Math.round(wait / 1000)} sn bekleniyor`);
      await new Promise((res) => setTimeout(res, wait));
    } catch {
      await new Promise((res) => setTimeout(res, 3000));
    }
  }
  return null;
}

// Arama için daha iyi sonuç veren adlar
const SEARCH_NAME = { TUR: "Turkish", USA: "United States", GBR: "British", ARE: "Emirati", CZE: "Czech", COD: "Democratic Republic of the Congo", COG: "Republic of the Congo", MKD: "North Macedonia", XKX: "Kosovo", PSE: "Palestinian", TWN: "Taiwan", HKG: "Hong Kong", MAC: "Macau" };

function rgb2hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx];
}

async function dominant(buf) {
  const { data, info } = await sharp(buf).resize(72, 72, { fit: "inside" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const buckets = new Map();
  for (let i = 0; i < data.length; i += 3) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const [h, s, v] = rgb2hsv(r, g, b);
    if (v > 0.86 && s < 0.22) continue; // beyaz zemin
    if (s < 0.14 && v > 0.45) continue; // gri/gümüş zemin ve yansımalar
    const hb = s < 0.18 ? -1 : Math.floor(h / 24);
    const vb = v < 0.28 ? 0 : v < 0.6 ? 1 : 2;
    const key = hb + ":" + vb;
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += r; e.g += g; e.b += b;
    buckets.set(key, e);
  }
  const total = info.width * info.height;
  const best = [...buckets.values()].sort((a, b) => b.n - a.n)[0];
  if (!best) return null;
  return { r: Math.round(best.r / best.n), g: Math.round(best.g / best.n), b: Math.round(best.b / best.n), share: +(best.n / total).toFixed(2) };
}

async function one(c) {
  const name = SEARCH_NAME[c.iso3] ?? c.en;
  const s = await api({ action: 'query', list: 'search', srsearch: `${name} passport`, srnamespace: '0', srlimit: '8' });
  const hits = (s.query?.search ?? []).filter((x) => /passport/i.test(x.title) && !/index|visa|policy|requirements|history|booklet/i.test(x.title)).slice(0, 3);
  if (!hits.length) return { error: 'makale yok' };
  let lastTitle = hits[0].title;
  let reason = 'fotoğraf yok';
  // İlk makalede fotoğraf yoksa sıradaki makaleleri dene
  for (const hit of hits) {
    lastTitle = hit.title;
    const p = await api({ action: 'query', prop: 'pageimages', piprop: 'thumbnail', pilicense: 'any', pithumbsize: '420', titles: hit.title });
    const page = Object.values(p.query.pages)[0];
    const thumb = page.thumbnail?.source;
    if (!thumb) { reason = 'fotoğraf yok'; continue; }
    const buf = await getImage(thumb);
    if (!buf) { reason = 'indirme başarısız'; continue; }
    const col = await dominant(buf);
    if (col) return { title: hit.title, ...col };
    reason = 'renk yok';
  }
  return { title: lastTitle, error: reason };
}

const queue = visa.countries.filter((c) => !out[c.iso3] || out[c.iso3].error);
async function worker() {
  while (queue.length) {
    const c = queue.shift();
    try { out[c.iso3] = await one(c); } catch (e) { out[c.iso3] = { error: String(e.message) }; }
    await new Promise((res) => setTimeout(res, 700));
    writeFileSync(OUT, JSON.stringify(out, null, 1));
    const done = Object.values(out).filter((v) => !v.error).length;
    if (done % 10 === 0) console.log(`${done} ülkede renk hazır, kalan sıra: ${queue.length}`);
  }
}
await Promise.all(Array.from({ length: 1 }, worker));
writeFileSync(OUT, JSON.stringify(out, null, 1));
const errs = Object.entries(out).filter(([, v]) => v.error);
console.log(`${Object.keys(out).length - errs.length} ülkede renk bulundu, ${errs.length} hata:`, errs.map(([k, v]) => k + ":" + v.error).join(" "));
