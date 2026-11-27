import type { Metadata } from "next";
import Ranking from "@/components/Ranking";

export const metadata: Metadata = {
  title: "Pasaport sıralaması",
  description:
    "199 pasaportun vizesiz, varışta vize veya ETA ile girebildiği ülke sayısına göre sıralaması. Henley'in resmi sıralaması değildir.",
  alternates: { canonical: "/ranking" },
};

export default function RankingPage() {
  return <Ranking />;
}
