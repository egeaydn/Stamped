// Adım 5: Her ülke için kapak verisini üret -> src/data/covers.json
//  - metinler: resmi ülke adı (yerel dil) + İngilizce + "PASAPORT" kelimesi (yerel dil)
//  - renk: 04'te ölçülen renk (varsa), yoksa elle tablo
//  - yaldız rengi: kapak açıklığına göre
// Çalıştır: node scripts/emblems/05-covers.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const visa = JSON.parse(readFileSync("src/data/meta.json", "utf8"));
const wd = JSON.parse(readFileSync("data/emblems/wikidata.json", "utf8"));
const colors = existsSync("data/emblems/colors.json") ? JSON.parse(readFileSync("data/emblems/colors.json", "utf8")) : {};
const emblems = existsSync("src/data/emblems.json") ? JSON.parse(readFileSync("src/data/emblems.json", "utf8")) : {};
const manual = existsSync("data/emblems/manual.json") ? JSON.parse(readFileSync("data/emblems/manual.json", "utf8")) : {};

// "Pasaport" kelimesi (ISO 639-1). Emin olmadığım diller bilerek yok: onlarda yalnızca İngilizce yazılır.
const PASSPORT_WORD = {
  en: "PASSPORT", tr: "PASAPORT", de: "REISEPASS", fr: "PASSEPORT", es: "PASAPORTE", pt: "PASSAPORTE", it: "PASSAPORTO",
  nl: "PASPOORT", sv: "PASS", da: "PAS", nb: "PASS", nn: "PASS", no: "PASS", fi: "PASSI", is: "VEGABRÉF", pl: "PASZPORT",
  cs: "CESTOVNÍ PAS", sk: "CESTOVNÝ PAS", hu: "ÚTLEVÉL", ro: "PAȘAPORT", bg: "ПАСПОРТ", ru: "ПАСПОРТ", uk: "ПАСПОРТ",
  be: "ПАСПАРТ", sr: "ПАСОШ", hr: "PUTOVNICA", sl: "POTNI LIST", bs: "PUTOVNICA", mk: "ПАСОШ", sq: "PASAPORTË",
  el: "ΔΙΑΒΑΤΗΡΙΟ", lt: "PASAS", lv: "PASE", et: "REISIPASS", mt: "PASSAPORT", ga: "PAS", cy: "PASBORT",
  ar: "جواز سفر", he: "דרכון", fa: "گذرنامه", ur: "پاسپورٹ", hi: "पासपोर्ट", bn: "পাসপোর্ট", ne: "राहदानी",
  th: "หนังสือเดินทาง", vi: "HỘ CHIẾU", id: "PASPOR", ms: "PASPORT", ko: "여권", ja: "旅券", zh: "护照",
  km: "លិខិតឆ្លងដែន", lo: "ໜັງສືຜ່ານແດນ", my: "ပတ်စပို့", mn: "ПАСПОРТ", kk: "ПАСПОРТ", uz: "PASPORT", ky: "ПАСПОРТ",
  tk: "PASPORT", az: "PASPORT", hy: "ԱՆՁՆԱԳԻՐ", ka: "პასპორტი", am: "ፓስፖርት", sw: "PASIPOTI", af: "PASPOORT",
  mg: "PASIPORA", tl: "PASAPORTE", lb: "REESEPASS",
};
const RTL = new Set(["ar", "he", "fa", "ur", "dv"]);
// Bu bölgelerde geleneksel Çince
const TRADITIONAL = new Set(["HKG", "TWN", "MAC"]);

// Yerel adın dili: önce resmi diller, sonra ad kaydı olanlar
function pickNative(iso3) {
  const w = wd[iso3];
  if (!w) return null;
  const order = [...w.langs, ...Object.keys(w.names)];
  for (const l of order) if (w.names[l]) return { lang: l, name: w.names[l] };
  return null;
}

const cap = (s) => s.toLocaleUpperCase();
const clean = (s) => s.replace(/^the\s+/i, "").trim();

// Elle kapak rengi (ölçüm başarısızsa): [taban, koyu]
const FALLBACK = {
  burgundy: ["#7a1f35", "#4a1020"], blue: ["#1d3a6e", "#0f2147"], green: ["#1d5b43", "#0e3326"], black: ["#1c1c22", "#0b0b0e"],
};

function toHex(r, g, b) {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}
function lum(r, g, b) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function themeFor(iso3) {
  if (manual[iso3]?.base) {
    const [r, g, b] = manual[iso3].base.match(/\w\w/g).map((h) => parseInt(h, 16));
    return build(r, g, b);
  }
  const c = colors[iso3];
  if (c && !c.error) return build(c.r, c.g, c.b);
  return null;
}
function build(r, g, b) {
  // Fotoğraftan gelen renk çoğu zaman soluk/parlak; pasaport kapağı tonuna çek (doygunluğu koru, parlaklığı sınırla)
  const L = lum(r, g, b);
  const k = L > 0.34 ? 0.34 / L : 1;
  const [R, G, B] = [r * k, g * k, b * k];
  const base = toHex(R, G, B);
  const dark = toHex(R * 0.55, G * 0.55, B * 0.55);
  const foil = lum(R, G, B) > 0.3 ? "#f1dd9a" : "#e3c36a";
  return { base, dark, foil };
}

const EU = new Set('AUT BEL BGR HRV CYP CZE DNK EST FIN FRA DEU GRC HUN IRL ITA LVA LTU LUX MLT NLD POL PRT ROU SVK SVN ESP SWE'.split(' '));
const LANG_FIX = { mo: 'ro' };
const isLatin = (str) => /^[\p{Script=Latin}\p{P}\p{Z}\p{N}]+$/u.test(str);
// Elle düzeltmeler: ülke -> { top, bottom }
const TEXT_OVERRIDE = {
  TUR: { top: ['TÜRKİYE CUMHURİYETİ', 'REPUBLIC OF TÜRKİYE'], bottom: ['PASAPORT', 'PASSPORT'] },
  USA: { top: ['UNITED STATES OF AMERICA'], bottom: ['PASSPORT'] },
  HKG: { top: ['香港特別行政區', 'HONG KONG SPECIAL ADMINISTRATIVE REGION'], bottom: ['護照', 'PASSPORT'] },
  MAC: { top: ['中華人民共和國澳門特別行政區', 'MACAO SPECIAL ADMINISTRATIVE REGION'], bottom: ['護照', 'PASSPORT'] },
  TWN: { top: ['中華民國', 'REPUBLIC OF CHINA (TAIWAN)'], bottom: ['護照', 'PASSPORT'] },
};

const out = {};
const noColor = [];
const noNative = [];
for (const c of visa.countries) {
  const iso3 = c.iso3;
  const native = pickNative(iso3);
  let lang = (native?.lang ?? 'en').split('-')[0];
  lang = LANG_FIX[lang] ?? lang;
  const upper = (str) => str.toLocaleUpperCase(lang === 'tr' || lang === 'az' ? lang : undefined);
  const englishRaw = wd[iso3]?.names?.en ? clean(wd[iso3].names.en) : c.en;
  const nativeName = native ? clean(native.name) : englishRaw;

  // Üst yazı: yerel ad; yazı Latin değilse okunabilirlik için İngilizce ad da eklenir
  const top = [upper(nativeName)];
  if (lang !== 'en' && !isLatin(nativeName)) top.push(englishRaw.toLocaleUpperCase('en'));

  // Alt yazı: yerel 'pasaport' kelimesi + PASSPORT (AB pasaportlarında yalnızca yerel kelime)
  let word = PASSPORT_WORD[lang];
  if (lang === 'zh' && TRADITIONAL.has(iso3)) word = '護照';
  const bottom = [];
  if (word && lang !== 'en') bottom.push(word);
  if (!(EU.has(iso3) && word)) bottom.push('PASSPORT');
  if (!word && lang !== 'en') noNative.push(iso3 + ':' + lang);

  const theme = themeFor(iso3);
  if (!theme) noColor.push(iso3);
  out[iso3] = {
    ...(TEXT_OVERRIDE[iso3] ?? { top, bottom }),
    rtl: RTL.has(lang),
    lang,
    theme: theme ?? { base: FALLBACK.black[0], dark: FALLBACK.black[1], foil: '#d9b45a' },
    measured: !!theme,
    emblem: !!emblems[iso3] || iso3 === 'TUR',
  };
}
writeFileSync("src/data/covers.json", JSON.stringify(out));
// Denetim sayfası (/covers) için kaynak bilgisi
const attribution = existsSync('data/emblems/attribution.json') ? JSON.parse(readFileSync('data/emblems/attribution.json', 'utf8')) : {};
const sources = {};
for (const c of visa.countries) {
  const a = attribution[c.iso3];
  sources[c.iso3] = {
    emblemFile: a?.file ?? null,
    emblemPage: a?.page ?? null,
    license: a?.license ?? null,
    author: (a?.author ?? '').slice(0, 80) || null,
    colorFrom: out[c.iso3].measured ? (manual[c.iso3]?.base ? 'manual' : 'measured') : 'table',
    colorTitle: colors[c.iso3]?.title ?? null,
    colorError: colors[c.iso3]?.error ?? null,
  };
}
writeFileSync('src/data/cover-sources.json', JSON.stringify(sources));

console.log(`${Object.keys(out).length} kapak üretildi. Renk bulunamayan: ${noColor.length} (${noColor.join(" ")})`);
console.log("Yerel 'pasaport' kelimesi eksik diller:", [...new Set(noNative)].join(" "));
