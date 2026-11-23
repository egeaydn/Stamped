// Adım 2: Seçilen arma dosyalarını Commons'tan indir + yazar/lisans bilgisini kaydet.
// Çalıştır: node scripts/emblems/02-download.mjs
//   -> data/emblems/raw/<ISO3>.<uzantı>, data/emblems/attribution.json
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const UA = "stamped-project/0.1 (personal hobby project; contact via GitHub)";
const wd = JSON.parse(readFileSync("data/emblems/wikidata.json", "utf8"));
const visa = JSON.parse(readFileSync("src/data/visa.json", "utf8"));
const codes = visa.countries.map((c) => c.iso3);

// Wikidata'da eksik/yanlış olanlar için elle seçimler (Commons dosya adı).
// null = elle çizilen amblem kullanılacak (bkz. src/components/passport/emblems)
const OVERRIDE = {
  XKX: "Coat of arms of Kosovo.svg",
  TUR: null,
};

function pick(iso3) {
  if (iso3 in OVERRIDE) return OVERRIDE[iso3];
  const w = wd[iso3];
  const list = [...(w?.arms ?? []), ...(w?.seal ?? [])];
  if (!list.length) return undefined;
  const score = (f) => {
    let s = 0;
    if (/\.svg$/i.test(f)) s += 10;
    if (/^coat of arms of/i.test(f)) s += 5;
    if (/greater|lesser|alternative|old|former|historical|variant/i.test(f)) s -= 4;
    return s - f.length / 1000;
  };
  return list.sort((a, b) => score(b) - score(a))[0];
}

const chosen = {};
for (const c of codes) chosen[c] = pick(c);

// Lisans/yazar bilgisi (50'şerli gruplar)
const files = [...new Set(Object.values(chosen).filter(Boolean))];
const meta = {};
for (let i = 0; i < files.length; i += 40) {
  const titles = files.slice(i, i + 40).map((f) => "File:" + f).join("|");
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata|url|size|mime&titles=" +
    encodeURIComponent(titles);
  const j = await (await fetch(url, { headers: { "User-Agent": UA } })).json();
  const norm = Object.fromEntries((j.query.normalized ?? []).map((n) => [n.to, n.from]));
  for (const p of Object.values(j.query.pages)) {
    const ii = p.imageinfo?.[0];
    if (!ii) continue;
    const em = ii.extmetadata ?? {};
    const plain = (s) => (s?.value ?? "").replace(/<[^>]+>/g, "").trim();
    const name = (norm[p.title] ?? p.title).replace(/^File:/, "");
    meta[name] = {
      url: ii.url,
      mime: ii.mime,
      bytes: ii.size,
      license: plain(em.LicenseShortName),
      licenseUrl: plain(em.LicenseUrl),
      author: plain(em.Artist),
      credit: plain(em.Credit).slice(0, 200),
      page: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, "_"))}`,
    };
  }
}

mkdirSync("data/emblems/raw", { recursive: true });
// --cooldown <sn>: Wikimedia hız sınırı cezası bitene kadar bekle
const cd = process.argv.indexOf("--cooldown");
if (cd > -1) {
  const sec = Number(process.argv[cd + 1]) || 600;
  console.log(`${sec} sn soğuma bekleniyor...`);
  await new Promise((res) => setTimeout(res, sec * 1000));
}
const attribution = {};
let done = 0, failed = [];
const queue = codes.filter((c) => chosen[c]);

async function worker() {
  while (queue.length) {
    const iso3 = queue.shift();
    const file = chosen[iso3];
    const m = meta[file];
    if (!m) { failed.push([iso3, file, "metadata yok"]); continue; }
    // Daha önce indirilmiş (SVG ya da PNG) varsa atla
    const existing = ["svg", "png", "jpeg", "webp"].find((e) => existsSync(`data/emblems/raw/${iso3}.${e}`));
    attribution[iso3] = { file, ext: existing ?? "png", ...m };
    if (existing) { done++; continue; }
    // Orijinal dosya yerine 800px önizleme (PNG) iner: çok daha küçük ve Wikimedia'nın ayrı, daha rahat sınırı var
    const dest = `data/emblems/raw/${iso3}.png`;
    const thumbUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=800`;
    for (let attempt = 0; attempt < 6; attempt++) {
      const r = await fetch(thumbUrl, { headers: { "User-Agent": UA } });
      if (r.ok) {
        writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
        done++;
        break;
      }
      if (r.status === 429 || r.status >= 500) {
        // Retry-After varsa ona uy, yoksa giderek uzayan bekleme
        const wait = Number(r.headers.get("retry-after")) * 1000 || 8000 * (attempt + 1);
        console.log(`429/5xx ${iso3}: ${Math.round(wait / 1000)} sn bekleniyor`);
        await new Promise((res) => setTimeout(res, Math.min(wait, 900000)));
      } else { failed.push([iso3, file, r.status]); break; }
      if (attempt === 5) failed.push([iso3, file, r.status]);
    }
    await new Promise((res) => setTimeout(res, 2500)); // istekler arası nezaket aralığı
  }
}
await Promise.all(Array.from({ length: 1 }, worker));

writeFileSync("data/emblems/attribution.json", JSON.stringify(attribution, null, 1));
writeFileSync("data/emblems/chosen.json", JSON.stringify(chosen, null, 1));
console.log(`${done} dosya hazır, ${failed.length} hata`, failed);
