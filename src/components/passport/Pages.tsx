"use client";

import type { CSSProperties } from "react";
import type { Face } from "@/lib/book";
import { COLORS, byIso3, stats } from "@/lib/visa";
import Stamp from "./Stamp";

type Common = {
  passport: string;
  visible: boolean;
  reduce: boolean;
  side: "left" | "right";
  onPick: (iso3: string) => void;
};

// Kâğıt dokusu: krem zemin + güvenlik deseni (guilloche benzeri halkalar) + ince çizgiler
const PAPER: CSSProperties = {
  backgroundColor: "#efe4c4",
  backgroundImage: [
    "radial-gradient(ellipse at 18% 8%, rgba(255,255,255,.55), transparent 45%)",
    "repeating-radial-gradient(circle at 30% 120%, transparent 0 9px, rgba(70,110,140,.075) 9px 10px)",
    "repeating-radial-gradient(circle at 80% -20%, transparent 0 11px, rgba(150,90,60,.06) 11px 12px)",
    "repeating-linear-gradient(0deg, rgba(120,95,50,.035) 0 1px, transparent 1px 5px)",
  ].join(","),
};

function Spine({ side }: { side: "left" | "right" }) {
  // Cilt yerindeki gölge; sol sayfada sağ kenar, sağ sayfada sol kenar
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 w-[14%]"
      style={{
        [side === "left" ? "right" : "left"]: 0,
        background: `linear-gradient(to ${side === "left" ? "left" : "right"}, rgba(60,40,10,.28), rgba(60,40,10,.06) 55%, transparent)`,
      }}
    />
  );
}

function Watermark() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className="pointer-events-none absolute left-1/2 top-1/2 w-[62%] -translate-x-1/2 -translate-y-1/2"
      style={{ opacity: 0.07 }}
      fill="none"
      stroke="#3b5a73"
      strokeWidth="0.6"
    >
      <circle cx="50" cy="50" r="46" />
      <ellipse cx="50" cy="50" rx="46" ry="18" />
      <ellipse cx="50" cy="50" rx="46" ry="34" />
      <ellipse cx="50" cy="50" rx="18" ry="46" />
      <ellipse cx="50" cy="50" rx="34" ry="46" />
      <line x1="4" y1="50" x2="96" y2="50" />
      <line x1="50" y1="4" x2="50" y2="96" />
    </svg>
  );
}

export function DataPage({ passport, side }: { passport: string; side: "left" | "right" }) {
  const me = byIso3.get(passport)!;
  const st = stats[passport];
  const total = st.mobility + st.evisa + st.visa;
  const pct = (n: number) => `${(n / total) * 100}%`;
  const asciiName = me.en.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z]/g, "<");
  const mrz1 = `P<${passport}${asciiName}`.padEnd(30, "<").slice(0, 30);
  const mrz2 = `${passport}<STAMPED<${String(st.mobility).padStart(3, "0")}<${String(st.rank).padStart(3, "0")}`.padEnd(30, "<").slice(0, 30);

  return (
    <div className="absolute inset-0 flex flex-col p-[8%] text-[#2a2a24]" style={PAPER}>
      <Watermark />
      <Spine side={side} />
      <div className="relative flex items-center justify-between text-[clamp(.45rem,1.1vw,.6rem)] font-semibold tracking-[.3em] text-[#6b5b3a]">
        <span>KİMLİK SAYFASI</span>
        <span>STAMPED</span>
      </div>

      <div className="relative mt-[6%] flex items-center gap-[5%]">
        <span
          className={`fi fis fi-${me.iso2.toLowerCase()} shrink-0 rounded-md`}
          style={{ fontSize: "clamp(2rem,5.4vw,3.4rem)", boxShadow: "0 0 0 2px rgba(0,0,0,.18)" }}
        />
        <div className="min-w-0">
          <div className="text-[clamp(.45rem,1.1vw,.6rem)] tracking-[.25em] text-[#6b5b3a]">PASAPORT ÜLKESİ</div>
          <div className="truncate text-[clamp(.95rem,2.8vw,1.5rem)] font-bold leading-tight">{me.tr}</div>
        </div>
      </div>

      <div className="relative mt-[7%] grid grid-cols-2 gap-[4%]">
        <div>
          <div className="text-[clamp(1.6rem,6vw,3rem)] font-extrabold leading-none tabular-nums">{st.mobility}</div>
          <div className="mt-1 text-[clamp(.5rem,1.2vw,.68rem)] leading-tight text-[#6b5b3a]">vizesiz erişim</div>
        </div>
        <div>
          <div className="text-[clamp(1.6rem,6vw,3rem)] font-extrabold leading-none tabular-nums">#{st.rank}</div>
          <div className="mt-1 text-[clamp(.5rem,1.2vw,.68rem)] leading-tight text-[#6b5b3a]">dünya sırası</div>
        </div>
      </div>

      <div className="relative mt-[7%]">
        <div className="flex h-[.7rem] overflow-hidden rounded-full" style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,.2)" }}>
          <i style={{ width: pct(st.mobility), background: COLORS.free }} />
          <i style={{ width: pct(st.evisa), background: COLORS.evisa }} />
          <i style={{ width: pct(st.visa), background: COLORS.visa }} />
        </div>
        <ul className="mt-[4%] space-y-[2.5%] text-[clamp(.5rem,1.25vw,.7rem)]">
          {[
            ["Vizesiz / varışta vize / ETA", st.mobility, COLORS.free],
            ["E-vize", st.evisa, COLORS.evisa],
            ["Vize gerekli", st.visa, COLORS.visa],
          ].map(([label, n, c]) => (
            <li key={label as string} className="flex items-center justify-between py-[1.5%]">
              <span className="flex items-center gap-2">
                <i className="h-2 w-2 rounded-full" style={{ background: c as string }} />
                {label}
              </span>
              <b className="tabular-nums">{n}</b>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative mt-auto text-[clamp(.4rem,1vw,.55rem)] leading-snug text-[#6b5b3a]">
        Resmi bir sıralama değildir. Sayı, vizesiz + varışta vize + ETA hedeflerinin toplamıdır.
        Damgaya tıklarsan küre o ülkeye döner. Sayfaları üstteki oklarla ya da klavyedeki ← → tuşlarıyla çevir.
      </p>
      <div className="relative mt-[4%] break-all font-mono text-[clamp(.42rem,1.15vw,.62rem)] leading-tight tracking-[.08em] text-[#3a3a30]">
        <div>{mrz1}</div>
        <div>{mrz2}</div>
      </div>
    </div>
  );
}

export function StampsPage({
  face,
  passport,
  visible,
  reduce,
  side,
  onPick,
}: { face: Extract<Face, { type: "stamps" }> } & Common) {
  void passport;
  return (
    <div className="absolute inset-0 flex flex-col p-[7%] text-[#2a2a24]" style={PAPER}>
      <Watermark />
      <Spine side={side} />
      <div className="relative text-[clamp(.45rem,1.1vw,.6rem)] font-semibold tracking-[.28em] text-[#6b5b3a]">
        {face.title}
        {face.first ? "" : " · DEVAM"}
      </div>
      <div className="relative mt-[3%] grid flex-1 grid-cols-2 content-around gap-x-[4%] gap-y-[1%]">
        {face.items.map((it, i) => (
          <Stamp key={it.iso3} {...it} index={i} visible={visible} reduce={reduce} onPick={onPick} />
        ))}
      </div>
      <div className="relative mt-[2%] text-center text-[clamp(.42rem,1vw,.58rem)] tracking-[.3em] text-[#8a7a58]">
        — {face.no} —
      </div>
    </div>
  );
}

export function BlankPage({ side }: { side: "left" | "right" }) {
  return (
    <div className="absolute inset-0" style={PAPER}>
      <Watermark />
      <Spine side={side} />
    </div>
  );
}
