// CSV (imorte/passport-index-data, MIT) -> src/data/visa.json
// Çalıştır: npm run build:data
//
// Puanlama (Henley tanımına yakın): Mobility Score = vizesiz + varışta vize + ETA hedef sayısı.
// E-vize ayrı sayılır (Henley e-vizeyi vize sayar; Passport Index sadece <=3 günde çıkanları sayar,
// bu veri setinde süre bilgisi yok).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const read = (f) => readFileSync(f, "utf8").trim().split(/\r?\n/).slice(1).map((l) => l.split(","));
const rows3 = read("data/raw/imorte-tidy-iso3.csv");
const rows2 = read("data/raw/imorte-tidy-iso2.csv");
if (rows3.length !== rows2.length || rows3.some((r, i) => r[2] !== rows2[i][2])) {
  throw new Error("iso3 ve iso2 dosyaları satır satır eşleşmiyor");
}

// iso3 -> iso2
const iso2 = {};
rows3.forEach((r, i) => {
  iso2[r[0]] = rows2[i][0];
});

// c: free (vizesiz), voa, eta, evisa, visa, none, self
function classify(v) {
  const s = v.trim().toLowerCase();
  if (s === "-1") return { c: "self" };
  if (/^\d+$/.test(s)) return { c: "free", d: Number(s) };
  if (s === "visa free") return { c: "free" };
  if (s === "visa on arrival") return { c: "voa" };
  if (s === "eta") return { c: "eta" };
  if (s === "e-visa") return { c: "evisa" };
  if (s === "visa required") return { c: "visa" };
  if (s === "no admission") return { c: "none" };
  throw new Error(`Bilinmeyen değer: ${v}`);
}

const CODE = { free: "F", voa: "A", eta: "T", evisa: "E", visa: "V", none: "N", self: "S" };
const MOBILITY = new Set(["F", "A", "T"]);

const matrix = {};
for (const [p, d, r] of rows3) {
  const { c, d: days } = classify(r);
  (matrix[p] ??= {})[d] = days ? `${CODE[c]}${days}` : CODE[c];
}

const nameEn = new Intl.DisplayNames(["en"], { type: "region" });
const nameTr = new Intl.DisplayNames(["tr"], { type: "region" });
const countries = Object.keys(matrix)
  .sort()
  .map((iso3) => ({ iso3, iso2: iso2[iso3], en: nameEn.of(iso2[iso3]), tr: nameTr.of(iso2[iso3]) }));

// Skorlar
const stats = {};
for (const p of Object.keys(matrix)) {
  let mobility = 0, evisa = 0, visa = 0;
  for (const [d, v] of Object.entries(matrix[p])) {
    if (d === p) continue;
    if (MOBILITY.has(v[0])) mobility++;
    else if (v[0] === "E") evisa++;
    else visa++;
  }
  stats[p] = { mobility, evisa, visa };
}
// Sıralama: eşit skorlar aynı sırayı paylaşır (1224 yöntemi)
const sorted = Object.entries(stats).sort((a, b) => b[1].mobility - a[1].mobility);
sorted.forEach(([p, s], i) => {
  s.rank = i > 0 && sorted[i - 1][1].mobility === s.mobility ? sorted[i - 1][1].rank : i + 1;
});

mkdirSync("src/data", { recursive: true });
writeFileSync(
  "src/data/visa.json",
  JSON.stringify({ generatedAt: new Date().toISOString(), countries, matrix, stats })
);
console.log(`${countries.length} ülke, ${rows3.length} satır işlendi.`);
console.log("İlk 8:", sorted.slice(0, 8).map(([p, s]) => `${p}:${s.mobility}(#${s.rank})`).join(" "));
