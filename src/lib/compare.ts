import { countries, groupOf, type Row } from "./visa";

export const MAX_COMPARE = 4;

// Her pasaporta sabit bir vurgu rengi (yeşil/mavi/kırmızı durum renkleriyle karışmasın diye mor, pembe, turuncu, camgöbeği)
export const PASSPORT_COLORS = ["#a78bfa", "#f472b6", "#fb923c", "#22d3ee"] as const;
export const BOTH_COLOR = "#34d399"; // herkes vizesiz giriyor
export const NONE_COLOR = "#475569"; // kimse vizesiz giremiyor

const isFree = (s: string | undefined) => !!s && groupOf(s) === "free";

// Bir hedef için, hangi pasaportlar (indeks) vizesiz giriyor
export function freeSet(rows: Row[], iso3: string): number[] {
  const out: number[] = [];
  rows.forEach((r, i) => {
    if (isFree(r[iso3])) out.push(i);
  });
  return out;
}

// Küre rengi: hepsi -> yeşil, hiçbiri -> gri, 2 pasaportta tek taraf -> o pasaportun rengi,
// 3+ pasaportta kısmi -> kaç pasaportun girebildiğine göre sarı-turuncu tonu
export function compareColor(rows: Row[], iso3: string): string {
  if (rows.every((r) => r[iso3] === undefined)) return "rgba(100,116,139,0.5)";
  const free = freeSet(rows, iso3);
  if (free.length === rows.length) return BOTH_COLOR;
  if (free.length === 0) return NONE_COLOR;
  if (rows.length === 2) return PASSPORT_COLORS[free[0]];
  const t = free.length / rows.length;
  return `hsl(${Math.round(20 + t * 40)}, 90%, ${Math.round(45 + t * 10)}%)`;
}

export type Summary = {
  all: string[]; // herkesin vizesiz girdiği
  only: string[][]; // pasaport i'nin tek başına vizesiz girdiği (diğerlerinin giremediği)
  none: string[];
};

export function summarize(passports: string[], rows: Row[]): Summary {
  const out: Summary = { all: [], only: passports.map(() => []), none: [] };
  for (const c of countries) {
    if (passports.includes(c.iso3)) continue;
    const free = freeSet(rows, c.iso3);
    if (free.length === rows.length) out.all.push(c.iso3);
    else if (free.length === 0) out.none.push(c.iso3);
    else if (free.length === 1) out.only[free[0]].push(c.iso3);
  }
  return out;
}
