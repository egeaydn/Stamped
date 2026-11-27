"use client";

import "flag-icons/css/flag-icons.min.css";
import Link from "next/link";
import { useMemo, useState } from "react";
import Cover from "./passport/Cover";
import { COLORS, countries, stats } from "@/lib/visa";

type Tier = { rank: number; score: number; members: string[] };

function Flag({ iso2, className = "" }: { iso2: string; className?: string }) {
  return <span className={`fi fis fi-${iso2.toLowerCase()} rounded-[3px] align-[-2px] ${className}`} />;
}

const byIso = new Map(countries.map((c) => [c.iso3, c]));

// Aynı skoru paylaşan pasaportlar tek kademe (aynı sıra)
const TIERS: Tier[] = (() => {
  const map = new Map<number, Tier>();
  for (const c of countries) {
    const s = stats[c.iso3];
    const t = map.get(s.rank) ?? { rank: s.rank, score: s.mobility, members: [] };
    t.members.push(c.iso3);
    map.set(s.rank, t);
  }
  const out = [...map.values()].sort((a, b) => a.rank - b.rank);
  for (const t of out) t.members.sort((a, b) => byIso.get(a)!.tr.localeCompare(byIso.get(b)!.tr, "tr"));
  return out;
})();
const MAX = TIERS[0].score;

function Podium() {
  // İlk üç kademeden birer temsilci değil, ilk üç pasaportu (sıraya göre) göster
  const top = TIERS.flatMap((t) => t.members).slice(0, 3);
  const order = [top[1], top[0], top[2]]; // ortada birinci
  return (
    <div className="mx-auto mt-10 grid max-w-xl grid-cols-3 items-end gap-4 sm:gap-8">
      {order.map((iso) => {
        const c = byIso.get(iso)!;
        const s = stats[iso];
        return (
          <Link key={iso} href={`/p/${iso}`} className="group flex flex-col items-center text-center">
            <div className="relative aspect-[125/176] w-full max-w-[9rem] drop-shadow-[0_18px_30px_rgba(0,0,0,.55)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:-rotate-2">
              <Cover passport={iso} />
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-sm font-medium">
              <Flag iso2={c.iso2} /> <span className="truncate">{c.tr}</span>
            </div>
            <div className={`mt-3 flex w-full flex-col items-center justify-start rounded-t-xl border border-white/10 bg-white/5 pt-3 ${s.rank === 1 ? "h-36" : s.rank === 2 ? "h-28" : "h-20"}`}>
              <span className="text-3xl font-bold tabular-nums">{s.mobility}</span>
              <span className="text-xs text-slate-400">#{s.rank}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default function Ranking() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLocaleLowerCase("tr");
  const match = (iso: string) => {
    const c = byIso.get(iso)!;
    return c.tr.toLocaleLowerCase("tr").includes(q) || c.en.toLowerCase().includes(q) || iso.toLowerCase() === q;
  };
  const tiers = useMemo(
    () => (q ? TIERS.map((t) => ({ ...t, members: t.members.filter(match) })).filter((t) => t.members.length) : TIERS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q]
  );

  return (
    <main className="min-h-dvh w-full bg-[#050810] px-4 pb-24 pt-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <nav className="flex items-center justify-between text-sm">
          <Link href="/" className="text-xs uppercase tracking-[0.25em] text-sky-300 hover:text-sky-200">
            ← Stamped
          </Link>
        </nav>

        <header className="mt-8 text-center">
          <h1 className="text-3xl font-semibold sm:text-4xl">Pasaport sıralaması</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
            Vizesiz, varışta vize veya ETA ile girilebilen ülke sayısı. Eşit skorlar aynı sırayı paylaşır. Henley&apos;in
            resmi sıralaması değildir.
          </p>
        </header>

        {!q && <Podium />}

        <div className="sticky top-0 z-10 -mx-4 mt-10 bg-[#050810]/85 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pasaport ara…"
            aria-label="Pasaport ara"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-sky-400"
          />
        </div>

        <ol className="mt-4 space-y-3">
          {tiers.map((t) => (
            <li key={t.rank} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex items-center gap-4">
                <span className="w-12 shrink-0 text-xl font-semibold tabular-nums text-slate-300">#{t.rank}</span>
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(t.score / MAX) * 100}%`, background: COLORS.free }}
                    />
                  </div>
                </div>
                <span className="w-12 shrink-0 text-right text-xl font-bold tabular-nums">{t.score}</span>
              </div>
              <ul className="mt-3 flex flex-wrap gap-1.5 pl-16">
                {t.members.map((iso) => {
                  const c = byIso.get(iso)!;
                  return (
                    <li key={iso}>
                      <Link
                        href={`/p/${iso}`}
                        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs hover:bg-white/15"
                      >
                        <Flag iso2={c.iso2} />
                        {c.tr}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
          {tiers.length === 0 && <li className="py-10 text-center text-sm text-slate-500">Sonuç yok</li>}
        </ol>
      </div>
    </main>
  );
}
