import data from "@/data/visa.json";

export type Category = "F" | "A" | "T" | "E" | "V" | "N" | "S";

export type Country = { iso3: string; iso2: string; en: string; tr: string };
export type Stat = { mobility: number; evisa: number; visa: number; rank: number };

export const countries = data.countries as Country[];
export const stats = data.stats as Record<string, Stat>;
const matrix = data.matrix as Record<string, Record<string, string>>;

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

// Pasaport -> hedef ülke kodu ("F90", "E", "V" ...) ; yoksa undefined
export function statusFor(passport: string, destination: string): string | undefined {
  return matrix[passport]?.[destination];
}

// geojson ADM0_A3 kodlarının veri setindeki karşılıkları
export const GEO_ALIAS: Record<string, string> = { SDS: "SSD", KOS: "XKX", PSX: "PSE" };
