"use client";

import { useMemo, useState } from "react";
import { BOTH_COLOR, MAX_COMPARE, PASSPORT_COLORS, summarize } from "@/lib/compare";
import { byIso3, stats, type Row } from "@/lib/visa";

type Props = {
  passports: string[];
  rows: Record<string, Row>;
  onRemove: (iso3: string) => void;
  onFocus: (iso3: string) => void;
  onClose: () => void;
};

function Flag({ iso2 }: { iso2: string }) {
  return <span className={`fi fis fi-${iso2.toLowerCase()} rounded-[3px] align-[-2px]`} />;
}

const PREVIEW = 18;

function Group({
  title,
  color,
  items,
  onFocus,
}: {
  title: string;
  color: string;
  items: string[];
  onFocus: (iso3: string) => void;
}) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, PREVIEW);
  return (
    <section className="mt-4">
      <h3 className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-slate-300">
        <span className="flex items-center gap-2">
          <i className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
          {title}
        </span>
        <span className="tabular-nums text-slate-400">{items.length}</span>
      </h3>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">Yok</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {shown.map((iso) => {
            const c = byIso3.get(iso);
            if (!c) return null;
            return (
              <li key={iso}>
                <button
                  onClick={() => onFocus(iso)}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/15"
                >
                  <Flag iso2={c.iso2} />
                  {c.tr}
                </button>
              </li>
            );
          })}
          {!all && items.length > PREVIEW && (
            <li>
              <button
                onClick={() => setAll(true)}
                className="rounded-full px-2 py-1 text-xs text-sky-300 hover:underline"
              >
                +{items.length - PREVIEW} daha
              </button>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

export default function ComparePanel({ passports, rows, onRemove, onFocus, onClose }: Props) {
  const ready = passports.every((p) => rows[p]);
  const summary = useMemo(
    () => (ready && passports.length > 1 ? summarize(passports, passports.map((p) => rows[p])) : null),
    [ready, passports, rows]
  );
  const maxScore = Math.max(...passports.map((p) => stats[p].mobility));

  return (
    <aside
      aria-label="Pasaport karşılaştırma"
      className="absolute bottom-0 right-0 z-10 max-h-[42dvh] w-full overflow-y-auto rounded-t-2xl border border-white/10 bg-slate-950/80 p-5 backdrop-blur md:bottom-auto md:right-4 md:top-4 md:max-h-[calc(100dvh-2rem)] md:w-[24rem] md:rounded-2xl"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-[0.25em] text-sky-300">Karşılaştırma</h2>
        <button onClick={onClose} className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-white/10 hover:text-white">
          Kapat ✕
        </button>
      </div>

      <ul className="mt-4 space-y-3">
        {passports.map((p, i) => {
          const c = byIso3.get(p)!;
          const s = stats[p];
          return (
            <li key={p}>
              <div className="flex items-center gap-2 text-sm">
                <i className="h-3 w-3 shrink-0 rounded-full" style={{ background: PASSPORT_COLORS[i] }} />
                <Flag iso2={c.iso2} />
                <span className="flex-1 truncate font-medium">{c.tr}</span>
                <span className="tabular-nums text-slate-300">{s.mobility}</span>
                <span className="w-10 text-right text-xs tabular-nums text-slate-500">#{s.rank}</span>
                {passports.length > 1 && (
                  <button
                    aria-label={`${c.tr} pasaportunu çıkar`}
                    onClick={() => onRemove(p)}
                    className="rounded px-1 text-slate-500 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${(s.mobility / maxScore) * 100}%`, background: PASSPORT_COLORS[i] }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {passports.length < MAX_COMPARE && (
        <p className="mt-4 text-xs text-slate-400">
          Arama yaparak veya küreden bir ülkeye tıklayarak pasaport ekle (en fazla {MAX_COMPARE}).
        </p>
      )}

      {!summary ? (
        <p className="mt-6 text-sm text-slate-400">
          {passports.length < 2 ? "Karşılaştırmak için ikinci bir pasaport ekle." : "Yükleniyor…"}
        </p>
      ) : (
        <>
          <Group title="Hepsi vizesiz" color={BOTH_COLOR} items={summary.all} onFocus={onFocus} />
          {passports.map((p, i) => (
            <Group
              key={p}
              title={`Yalnızca ${byIso3.get(p)!.tr}`}
              color={PASSPORT_COLORS[i]}
              items={summary.only[i]}
              onFocus={onFocus}
            />
          ))}
          <p className="mt-5 text-[11px] leading-relaxed text-slate-500">
            &ldquo;Vizesiz&rdquo; = vizesiz + varışta vize + ETA. Kısmi gruplar (3+ pasaportta) küre üzerinde turuncu tonlarında görünür.
          </p>
        </>
      )}
    </aside>
  );
}
