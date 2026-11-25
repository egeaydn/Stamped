import data from "@/data/meta.json";

export type Category = "F" | "A" | "T" | "E" | "V" | "N" | "S";

export type Country = { iso3: string; iso2: string; en: string; tr: string };
export type Stat = { mobility: number; evisa: number; visa: number; rank: number };

export const countries = data.countries as Country[];
export const stats = data.stats as Record<string, Stat>;
// iso3'ten ülkeye
export const byIso3 = new Map(countries.map((c) => [c.iso3, c]));

// Kullanıcıya gösterilen renk grupları
export const COLORS = {
  free: "#34d399", // vizesiz + varışta vize + ETA
  evisa: "#60a5fa",
  visa: "#f87171",
  self: "#fbbf24",
} as const;

export type Group = keyof typeof COLORS;

export function groupOf(code: string): Group {
  const c = code[0] as Category;
  if (c === "F" || c === "A" || c === "T") return "free";
  if (c === "E") return "evisa";
  if (c === "S") return "self";
  return "visa";
}

// Bir pasaportun satırı: hedef ülke iso3 -> kod ("F90", "E", "V" ...)
export type Row = Record<string, string>;

const rowCache = new Map<string, Promise<Row>>();

// Pasaport başına parçalanmış veri; tamamı istemciye gitmez, ilk istekte çekilir ve önbelleğe alınır
export function loadRow(passport: string): Promise<Row> {
  let p = rowCache.get(passport);
  if (!p) {
    p = fetch(`/data/passports/${passport}.json`).then((r) => {
      if (!r.ok) throw new Error(`Pasaport verisi yüklenemedi: ${passport}`);
      return r.json() as Promise<Row>;
    });
    p.catch(() => rowCache.delete(passport));
    rowCache.set(passport, p);
  }
  return p;
}

// geojson ADM0_A3 kodlarının veri setindeki karşılıkları
export const GEO_ALIAS: Record<string, string> = { SDS: "SSD", KOS: "XKX", PSX: "PSE" };
