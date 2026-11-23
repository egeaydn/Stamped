import covers from "@/data/covers.json";
import emblemInfo from "@/data/emblems.json";
import { coverTheme, type CoverTheme } from "./book";

export type CoverData = {
  top: string[];
  bottom: string[];
  rtl: boolean;
  lang: string;
  theme: CoverTheme;
  measured: boolean;
  emblem: boolean;
};

const data = covers as Record<string, CoverData>;
const info = emblemInfo as Record<string, { w: number; h: number }>;

export function coverFor(iso3: string): CoverData {
  const c = data[iso3];
  if (!c) {
    return { top: [iso3], bottom: ["PASSPORT"], rtl: false, lang: "en", theme: coverTheme(iso3), measured: false, emblem: false };
  }
  // Fotoğraftan ölçülen renk yoksa elle tablodaki renge dön
  return c.measured ? c : { ...c, theme: coverTheme(iso3) };
}

// public/emblems/<ISO3>.webp işlenmiş mi?
export function hasEmblemImage(iso3: string): boolean {
  return iso3 in info;
}

export function emblemAspect(iso3: string): number {
  const i = info[iso3];
  return i ? i.w / i.h : 1;
}
