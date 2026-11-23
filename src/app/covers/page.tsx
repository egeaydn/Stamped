"use client";

import { useState } from "react";
import Cover from "@/components/passport/Cover";
import { coverFor, hasEmblemImage } from "@/lib/covers";
import { countries } from "@/lib/visa";
import sources from "@/data/cover-sources.json";

type Src = {
  emblemFile: string | null;
  emblemPage: string | null;
  license: string | null;
  author: string | null;
  colorFrom: "measured" | "manual" | "table";
  colorTitle: string | null;
  colorError: string | null;
};
const S = sources as Record<string, Src>;

// Geliştirme aracı: her pasaport kapağının veri durumunu gösterir
export default function CoversGallery() {
  const [filter, setFilter] = useState<"all" | "problems">("all");
  const rows = countries.map((c) => {
    const cov = coverFor(c.iso3);
    const src = S[c.iso3];
    const emblem: "real" | "custom" | "fallback" =
      c.iso3 === "TUR" ? "custom" : cov.emblem && hasEmblemImage(c.iso3) ? "real" : "fallback";
    const color = src?.colorFrom ?? "table";
    const word = cov.lang === "en" || cov.bottom.length > 1 || cov.bottom[0] !== "PASSPORT";
    return { c, cov, src, emblem, color, word, ok: emblem !== "fallback" && color !== "table" };
  });

  const total = rows.length;
  const emblemOk = rows.filter((r) => r.emblem !== "fallback").length;
  const colorOk = rows.filter((r) => r.color !== "table").length;
  const allOk = rows.filter((r) => r.ok).length;
  const shown = filter === "problems" ? rows.filter((r) => !r.ok) : rows;

  return (
    <main className="min-h-dvh bg-[#050810] p-6 text-slate-100">
      <h1 className="text-xl font-semibold">Kapak denetimi</h1>

      <section className="mt-3 grid max-w-4xl gap-3 text-sm sm:grid-cols-4">
        <Stat label="Tamamlanan kapak" value={`${allOk} / ${total}`} good={allOk === total} />
        <Stat label="Gerçek arma" value={`${emblemOk} / ${total}`} good={emblemOk === total} />
        <Stat label="Ölçülen renk" value={`${colorOk} / ${total}`} good={colorOk === total} />
        <Stat label="Sorunlu" value={String(total - allOk)} good={allOk === total} />
      </section>

      <section className="mt-4 max-w-4xl rounded-xl border border-white/10 bg-white/5 p-4 text-[13px] leading-relaxed text-slate-300">
        <p className="font-medium text-slate-100">Veriler nereden geliyor?</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <b>Arma:</b> Wikidata&apos;daki “coat of arms image” kaydı, görsel Wikimedia Commons&apos;tan iner. Her kartın altındaki
            “kaynak” bağlantısı dosyanın Commons sayfasını, yazarını ve lisansını gösterir.
          </li>
          <li>
            <b>Renk:</b> Wikipedia&apos;daki “… passport” makalesinin ana fotoğrafından yalnızca baskın renk ölçülür. Fotoğraf sitede kullanılmaz.
          </li>
          <li>
            <b>Yazı:</b> Resmi ülke adı Wikidata&apos;dan, “pasaport” kelimesi dile göre elle hazırlanmış tablodan gelir.
          </li>
        </ul>
        <p className="mt-2 text-slate-400">
          Rozetler: <Badge kind="ok">yeşil</Badge> hazır, <Badge kind="warn">sarı</Badge> yedek kullanılıyor (genel pusula ya da elle tablo rengi),
          <Badge kind="info">mavi</Badge> elle çizim.
        </p>
      </section>

      <nav className="mt-4 flex gap-2 text-sm">
        <button type="button" onClick={() => setFilter("all")} className={`rounded-full border px-3 py-1 ${filter !== "problems" ? "border-sky-400 text-sky-300" : "border-white/10 text-slate-400"}`}>
          Hepsi ({total})
        </button>
        <button type="button" onClick={() => setFilter("problems")} className={`rounded-full border px-3 py-1 ${filter === "problems" ? "border-amber-400 text-amber-300" : "border-white/10 text-slate-400"}`}>
          Sadece sorunlular ({total - allOk})
        </button>
      </nav>

      <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-5">
        {shown.map(({ c, src, emblem, color, ok }) => (
          <div key={c.iso3} className={`rounded-lg p-1.5 ${ok ? "" : "bg-amber-400/5 ring-1 ring-amber-400/30"}`}>
            <div className="relative aspect-[125/176] w-full">
              <Cover passport={c.iso3} />
            </div>
            <div className="mt-1.5 text-center text-xs text-slate-300">
              {c.iso3} · {c.tr}
            </div>
            <div className="mt-1 flex flex-wrap justify-center gap-1">
              {emblem === "real" && <Badge kind="ok">arma ✓</Badge>}
              {emblem === "custom" && <Badge kind="info">arma (elle çizim)</Badge>}
              {emblem === "fallback" && <Badge kind="warn">arma yok</Badge>}
              {color === "measured" && <Badge kind="ok">renk ✓</Badge>}
              {color === "manual" && <Badge kind="info">renk (elle)</Badge>}
              {color === "table" && <Badge kind="warn">renk: tablo</Badge>}
            </div>
            <div className="mt-1 space-y-0.5 text-center text-[10px] text-slate-500">
              {src?.emblemPage && (
                <a href={src.emblemPage} target="_blank" rel="noreferrer" className="underline hover:text-slate-300">
                  kaynak{src.license ? ` · ${src.license}` : ""}
                </a>
              )}
              {src?.colorTitle && <div>renk: “{src.colorTitle}”</div>}
              {src?.colorError && <div className="text-amber-400/80">renk hatası: {src.colorError}</div>}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function Stat({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${good ? "border-emerald-400/30 bg-emerald-400/5" : "border-white/10 bg-white/5"}`}>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-0.5 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Badge({ kind, children }: { kind: "ok" | "warn" | "info"; children: React.ReactNode }) {
  const cls =
    kind === "ok"
      ? "bg-emerald-400/15 text-emerald-300"
      : kind === "warn"
        ? "bg-amber-400/15 text-amber-300"
        : "bg-sky-400/15 text-sky-300";
  return <span className={`mx-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>{children}</span>;
}
