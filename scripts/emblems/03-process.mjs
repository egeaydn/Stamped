// Adım 3: Ham armaları (SVG/PNG) kırp, gri tonlamaya çevir, şeffaf WebP olarak public/emblems/ altına yaz.
// Gri ton + alfa, çalışma anında SVG filtresiyle altın/gümüş yaldıza boyanır (kapak rengine göre).
// Çalıştır: node scripts/emblems/03-process.mjs
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const SIZE = 560;
mkdirSync("public/emblems", { recursive: true });
const prev = existsSync("src/data/emblems.json") ? JSON.parse(readFileSync("src/data/emblems.json", "utf8")) : {};
const info = {};
const problems = [];

for (const file of readdirSync("data/emblems/raw").sort()) {
  const iso3 = file.split(".")[0];
  const isSvg = file.endsWith(".svg");
  if (!process.argv.includes("--force") && existsSync(`public/emblems/${iso3}.webp`) && prev[iso3]) { info[iso3] = prev[iso3]; continue; }
  try {
    const buf = readFileSync(`data/emblems/raw/${file}`);
    // SVG'yi yüksek yoğunlukta çiz, sonra içeriğe göre kırp
    let img = sharp(buf, isSvg ? { density: 220, limitInputPixels: false } : { limitInputPixels: false });
    const rendered = await img.ensureAlpha().png().toBuffer();
    const trimmed = await sharp(rendered).trim({ threshold: 5 }).toBuffer({ resolveWithObject: true });
    let pipe = sharp(trimmed.data)
      .resize(SIZE, SIZE, { fit: "inside", withoutEnlargement: false, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .greyscale();

    // Ortalama parlaklık (yalnızca bilgi için)
    const probe = await pipe.clone().raw().toBuffer({ resolveWithObject: true });
    const ch = probe.info.channels;
    let sum = 0, n = 0;
    for (let i = 0; i < probe.data.length; i += ch) {
      const a = ch === 2 ? probe.data[i + 1] : 255;
      if (a > 128) { sum += probe.data[i]; n++; }
    }
    const mean = n ? sum / n / 255 : 0.5;
    const inverted = false; // ters çevirme yok: koyu bölgeler koyu yaldız tonuna eşlenir
    pipe = pipe.normalise().linear(1.15, -12);

    const out = await pipe.webp({ quality: 84, alphaQuality: 95 }).toBuffer({ resolveWithObject: true });
    writeFileSync(`public/emblems/${iso3}.webp`, out.data);
    info[iso3] = { w: out.info.width, h: out.info.height, mean: +mean.toFixed(2), inverted, kb: Math.round(out.data.length / 1024) };
  } catch (e) {
    problems.push([iso3, file, String(e.message).slice(0, 100)]);
  }
}

mkdirSync("src/data", { recursive: true });
writeFileSync("src/data/emblems.json", JSON.stringify(info));
const total = Object.values(info).reduce((s, v) => s + v.kb, 0);
console.log(`${Object.keys(info).length} amblem işlendi (${total} KB toplam), ${problems.length} sorun`);
if (problems.length) console.log(problems);
