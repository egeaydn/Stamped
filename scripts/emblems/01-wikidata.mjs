// Adım 1: Wikidata'dan her ülkenin arma/mühür dosya adlarını, resmi adlarını ve resmi dillerini çek.
// Çalıştır: node scripts/emblems/01-wikidata.mjs  ->  data/emblems/wikidata.json
import { mkdirSync, writeFileSync } from "node:fs";

const UA = "stamped-project/0.1 (personal hobby project; contact via GitHub)";

async function sparql(query) {
  const url = "https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(query);
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/sparql-results+json" } });
  if (!r.ok) throw new Error(`SPARQL ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return (await r.json()).results.bindings;
}

const arms = await sparql(`
SELECT ?iso3 ?arms ?seal ?flagitem WHERE {
  ?c wdt:P298 ?iso3 .
  OPTIONAL { ?c wdt:P94 ?arms }
  OPTIONAL { ?c wdt:P158 ?seal }
}`);

// Resmi adlar (P1448) ve resmi diller (P37 -> ISO 639-1 P218)
const names = await sparql(`
SELECT ?iso3 ?name ?lang WHERE {
  ?c wdt:P298 ?iso3 .
  ?c wdt:P1448 ?name .
  BIND(LANG(?name) AS ?lang)
}`);
const langs = await sparql(`
SELECT ?iso3 ?code WHERE {
  ?c wdt:P298 ?iso3 .
  ?c wdt:P37 ?l .
  ?l wdt:P218 ?code .
}`);

const out = {};
const slot = (iso3) => (out[iso3] ??= { arms: [], seal: [], names: {}, langs: [] });
for (const b of arms) {
  const s = slot(b.iso3.value);
  if (b.arms) s.arms.push(decodeURIComponent(b.arms.value.split("/Special:FilePath/")[1] ?? ""));
  if (b.seal) s.seal.push(decodeURIComponent(b.seal.value.split("/Special:FilePath/")[1] ?? ""));
}
for (const b of names) slot(b.iso3.value).names[b.lang.value] = b.name.value;
for (const b of langs) slot(b.iso3.value).langs.push(b.code.value);
for (const s of Object.values(out)) {
  s.arms = [...new Set(s.arms.filter(Boolean))];
  s.seal = [...new Set(s.seal.filter(Boolean))];
  s.langs = [...new Set(s.langs)];
}

mkdirSync("data/emblems", { recursive: true });
writeFileSync("data/emblems/wikidata.json", JSON.stringify(out, null, 1));
console.log(`${Object.keys(out).length} kayıt yazıldı.`);
