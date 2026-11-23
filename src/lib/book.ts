import { byIso3, countries, groupOf, statusFor, type Group } from "./visa";

export type StampItem = { iso3: string; name: string; status: string };

export type Face =
  | { type: "cover" }
  | { type: "data" }
  | {
      type: "stamps";
      group: Group;
      title: string;
      first: boolean; // bölümün ilk sayfası mı
      items: StampItem[];
      no: number; // damga sayfası numarası (1'den)
    }
  | { type: "blank" };

export const STAMPS_PER_PAGE = 8;

export const SECTION_TITLES: Record<Group, string> = {
  free: "VİZESİZ ERİŞİM",
  evisa: "E-VİZE",
  visa: "VİZE GEREKLİ",
  self: "",
};

// Damga üzerinde yazan kısa etiket
export function stampLabel(status: string): string {
  switch (status[0]) {
    case "F":
      return "VİZESİZ";
    case "A":
      return "VARIŞTA VİZE";
    case "T":
      return "ETA";
    case "E":
      return "E-VİZE";
    case "N":
      return "GİRİŞ YOK";
    default:
      return "VİZE GEREKLİ";
  }
}

// Vizesiz kalış süresi (gün) varsa döner
export function stampDays(status: string): number | null {
  return /^F\d+$/.test(status) ? Number(status.slice(1)) : null;
}

const ORDER: Group[] = ["free", "evisa", "visa"];

export function buildStampPages(passport: string): Extract<Face, { type: "stamps" }>[] {
  const buckets: Record<Group, StampItem[]> = { free: [], evisa: [], visa: [], self: [] };
  for (const c of countries) {
    if (c.iso3 === passport) continue;
    const status = statusFor(passport, c.iso3);
    if (!status) continue;
    buckets[groupOf(status)].push({ iso3: c.iso3, name: c.tr, status });
  }
  const pages: Extract<Face, { type: "stamps" }>[] = [];
  for (const g of ORDER) {
    const items = buckets[g].sort((a, b) => a.name.localeCompare(b.name, "tr"));
    for (let i = 0; i < items.length; i += STAMPS_PER_PAGE) {
      pages.push({
        type: "stamps",
        group: g,
        title: SECTION_TITLES[g],
        first: i === 0,
        items: items.slice(i, i + STAMPS_PER_PAGE),
        no: pages.length + 1,
      });
    }
  }
  return pages;
}

// Kapak, kimlik sayfası, damga sayfaları (+ gerekirse boş sayfa ile çifte tamamlanır)
export function buildFaces(passport: string): Face[] {
  const faces: Face[] = [{ type: "cover" }, { type: "data" }, ...buildStampPages(passport)];
  if (faces.length % 2 === 1) faces.push({ type: "blank" });
  return faces;
}

// Her bölümün ilk damga sayfasının face indeksi
export function sectionStarts(faces: Face[]): Partial<Record<Group, number>> {
  const out: Partial<Record<Group, number>> = {};
  faces.forEach((f, i) => {
    if (f.type === "stamps" && f.first) out[f.group] = i;
  });
  return out;
}

// Pasaport kapağı rengi: bilinen pasaport renkleri, kalanlar için sabit tohumlu seçim
const BURGUNDY = "AUT BEL BGR HRV CYP CZE DNK EST FIN FRA DEU GRC HUN IRL ITA LVA LTU LUX MLT NLD POL PRT ROU SVK SVN ESP SWE TUR GEO ARM ALB MNE SRB MKD BIH MDA UKR RUS CHN KGZ TJK".split(" ");
const BLUE = "USA CAN AUS NZL GBR JPN BRA ARG CHL COL PER VEN URY PRY ECU BOL CHE NOR ISL SGP KOR PHL THA TWN IND".split(" ");
const GREEN = "SAU PAK BGD MAR DZA TUN LBY NGA IDN MYS EGY IRQ SYR JOR LBN KWT QAT BHR OMN ARE YEM SDN SOM NER MLI SEN".split(" ");

export type CoverTheme = { base: string; dark: string; foil: string };

export function coverTheme(passport: string): CoverTheme {
  if (BURGUNDY.includes(passport)) return { base: "#7a1f35", dark: "#4a1020", foil: "#e3c36a" };
  if (BLUE.includes(passport)) return { base: "#1d3a6e", dark: "#0f2147", foil: "#e3c36a" };
  if (GREEN.includes(passport)) return { base: "#1d5b43", dark: "#0e3326", foil: "#e8d28a" };
  return { base: "#1c1c22", dark: "#0b0b0e", foil: "#d9b45a" };
}

export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Kapakta kullanılacak, ülkeye ait olmayan genel amblem yok; ülke adı için kısaltma
export function passportName(passport: string): string {
  return (byIso3.get(passport)?.tr ?? passport).toLocaleUpperCase("tr");
}
