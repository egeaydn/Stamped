"use client";

import { useState, type CSSProperties } from "react";
import { coverFor, hasEmblemImage } from "@/lib/covers";

// Yazı boyutu, metin uzunluğuna göre kapak genişliğinin yüzdesi (cqw) olarak ayarlanır.
function lineSize(text: string, base: number) {
  const n = [...text].length;
  if (n <= 14) return base;
  if (n <= 24) return base * 0.8;
  if (n <= 36) return base * 0.64;
  return base * 0.5;
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "").match(/\w\w/g)!.map((h) => parseInt(h, 16) / 255);
  return [m[0], m[1], m[2]];
}

// Gri tonlu armayı yaldıza boyayan filtre: koyu bölgeler koyu yaldız, açık bölgeler parlak yaldız
function FoilFilter({ id, foil }: { id: string; foil: string }) {
  const [r, g, b] = hexToRgb(foil);
  // Gri tonlu görüntüde R=G=B; çıktı = yaldız rengi * (0.4 + 0.62 * parlaklık)
  const k = 0.62;
  const c = 0.4;
  const row = (v: number) => `${k * v} 0 0 0 ${c * v}`;
  const values = [row(r), row(g), row(b), "0 0 0 1 0"].join("  ");
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <filter id={id} colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values={values} />
      </filter>
    </svg>
  );
}

// Türkiye: ay yıldız (resmi bayrak çizimiyle aynı ölçüler)
function TurkeyEmblem({ foil }: { foil: string }) {
  return (
    <svg viewBox="70 118 380 292" className="h-full w-full" style={{ filter: "drop-shadow(1px 1px 0 rgba(0,0,0,.5))" }}>
      <defs>
        <mask id="tr-crescent">
          <circle cx="218.7" cy="264" r="129.5" fill="#fff" />
          <circle cx="251.2" cy="264" r="102.3" fill="#000" />
        </mask>
      </defs>
      <circle cx="218.7" cy="264" r="129.5" fill={foil} mask="url(#tr-crescent)" />
      <path fill={foil} d="m374.1 204.2-1 47.3-44.2 12 43.5 15.5-1 43.3 28.3-33.8 42.9 14.8-24.8-36.3 30.2-36.1-46.4 12.8z" />
    </svg>
  );
}

function FallbackEmblem({ foil }: { foil: string }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" fill="none" stroke={foil} strokeWidth="1.6" style={{ filter: "drop-shadow(1px 1px 0 rgba(0,0,0,.45))" }}>
      <circle cx="50" cy="50" r="42" />
      <ellipse cx="50" cy="50" rx="42" ry="16" strokeWidth="0.9" />
      <ellipse cx="50" cy="50" rx="16" ry="42" strokeWidth="0.9" />
      <path d="M50 24 L54 46 L76 50 L54 54 L50 76 L46 54 L24 50 L46 46 Z" fill={foil} stroke="none" opacity=".9" />
    </svg>
  );
}

export default function Cover({ passport }: { passport: string }) {
  const c = coverFor(passport);
  const t = c.theme;
  const [imgFailed, setImgFailed] = useState(false);
  const filterId = `foil-${passport}`;
  const foilText: CSSProperties = {
    color: t.foil,
    textShadow: "1px 1px 0 rgba(0,0,0,.5), -.5px -.5px 0 rgba(255,255,255,.25)",
    fontFamily: "var(--font-cover), 'Noto Serif', 'Times New Roman', serif",
    direction: c.rtl ? "rtl" : "ltr",
    textAlign: "center",
    lineHeight: 1.25,
  };

  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-r-[10px] rounded-l-[3px]"
      style={{
        containerType: "inline-size",
        background: `radial-gradient(ellipse at 30% 20%, ${t.base}, ${t.dark} 115%)`,
        boxShadow: "inset 0 0 0 2px rgba(0,0,0,.25), inset 6px 0 10px rgba(0,0,0,.35), inset -1px 0 0 rgba(255,255,255,.12)",
      }}
    >
      {/* deri dokusu */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity: 0.32, mixBlendMode: "overlay" }}>
        <filter id={`leather-${passport}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" seed="2" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#leather-${passport})`} />
      </svg>
      {/* cilt yeri parlaması */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[7%]" style={{ background: "linear-gradient(to right, rgba(0,0,0,.45), rgba(255,255,255,.08) 60%, transparent)" }} />

      {/* üst yazı: ülkenin resmi adı */}
      <div className="absolute left-[9%] right-[9%] top-[9%]" style={foilText}>
        {c.top.map((line, i) => (
          <div key={i} style={{ fontSize: `${lineSize(line, i === 0 ? 6.4 : 4.2)}cqw`, fontWeight: i === 0 ? 700 : 500, letterSpacing: i === 0 ? ".08em" : ".12em", marginTop: i ? "1.6cqw" : 0, opacity: i ? 0.88 : 1 }}>
            {line}
          </div>
        ))}
      </div>

      {/* arma */}
      <div className="absolute left-1/2 top-[47%] h-[34%] w-[56%] -translate-x-1/2 -translate-y-1/2">
        {passport === "TUR" ? (
          <TurkeyEmblem foil={t.foil} />
        ) : c.emblem && hasEmblemImage(passport) && !imgFailed ? (
          <>
            <FoilFilter id={filterId} foil={t.foil} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/emblems/${passport}.webp`}
              alt=""
              draggable={false}
              onError={() => setImgFailed(true)}
              className="h-full w-full object-contain"
              style={{ filter: `url(#${filterId}) drop-shadow(1px 1px 0 rgba(0,0,0,.55))` }}
            />
          </>
        ) : (
          <FallbackEmblem foil={t.foil} />
        )}
      </div>

      {/* alt yazı: "pasaport" */}
      <div className="absolute inset-x-[9%] bottom-[11%]" style={foilText}>
        {c.bottom.map((line, i) => (
          <div key={i} style={{ fontSize: `${lineSize(line, i === 0 ? 6 : 4.6)}cqw`, fontWeight: i === 0 ? 700 : 500, letterSpacing: ".28em", marginTop: i ? "1.4cqw" : 0, opacity: i ? 0.88 : 1 }}>
            {line}
          </div>
        ))}
        <svg viewBox="0 0 40 28" className="mx-auto mt-[4cqw] w-[11cqw]" fill="none" stroke={t.foil} strokeWidth="1.4">
          <rect x="2" y="2" width="36" height="24" rx="4" />
          <circle cx="20" cy="14" r="5.5" />
          <line x1="2" y1="14" x2="14.5" y2="14" />
          <line x1="25.5" y1="14" x2="38" y2="14" />
        </svg>
      </div>
    </div>
  );
}
