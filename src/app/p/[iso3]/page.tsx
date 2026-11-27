import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Explorer from "@/components/Explorer";
import { byIso3, countries, stats } from "@/lib/visa";

export function generateStaticParams() {
  return countries.map((c) => ({ iso3: c.iso3 }));
}

export async function generateMetadata({ params }: PageProps<"/p/[iso3]">): Promise<Metadata> {
  const { iso3 } = await params;
  const c = byIso3.get(iso3);
  if (!c) return {};
  const s = stats[iso3];
  const title = `${c.tr} pasaportu: ${s.mobility} ülkeye vizesiz`;
  const description = `${c.tr} pasaportuyla ${s.mobility} ülkeye vizesiz, varışta vize veya ETA ile gidilebiliyor, ${s.evisa} ülke e-vize istiyor. Dünya sırası #${s.rank}.`;
  return {
    title,
    description,
    alternates: { canonical: `/p/${iso3}` },
    openGraph: { title, description, type: "website", locale: "tr_TR" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PassportPage({ params }: PageProps<"/p/[iso3]">) {
  const { iso3 } = await params;
  if (!byIso3.has(iso3)) notFound();
  return <Explorer initialPassport={iso3} />;
}
