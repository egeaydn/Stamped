"use client";

import { motion } from "framer-motion";
import { stampDays, stampLabel, hash } from "@/lib/book";
import { groupOf } from "@/lib/visa";

const INK = { free: "#17704a", evisa: "#1c4f9c", visa: "#a8231b", self: "#555" } as const;

type Props = {
  iso3: string;
  name: string;
  status: string;
  index: number; // sayfadaki sıra (gecikme için)
  visible: boolean; // sayfa şu an görünüyor mu
  reduce: boolean;
  onPick: (iso3: string) => void;
};

// Damga şekilleri: 0 yuvarlak köşeli dikdörtgen, 1 elips, 2 sekizgen, 3 çift çizgili dikdörtgen
function Shape({ variant, color, dashed }: { variant: number; color: string; dashed: boolean }) {
  const p = { fill: "none", stroke: color, strokeWidth: 3, strokeDasharray: dashed ? "7 4" : undefined };
  const thin = { ...p, strokeWidth: 1.2, strokeDasharray: undefined };
  switch (variant) {
    case 1:
      return (
        <>
          <ellipse cx="70" cy="50" rx="64" ry="44" {...p} />
          <ellipse cx="70" cy="50" rx="57" ry="37" {...thin} />
        </>
      );
    case 2:
      return (
        <>
          <polygon points="26,6 114,6 134,26 134,74 114,94 26,94 6,74 6,26" {...p} />
          <polygon points="28,13 112,13 127,28 127,72 112,87 28,87 13,72 13,28" {...thin} />
        </>
      );
    case 3:
      return (
        <>
          <rect x="5" y="5" width="130" height="90" {...p} />
          <rect x="11" y="11" width="118" height="78" {...thin} />
        </>
      );
    default:
      return (
        <>
          <rect x="5" y="5" width="130" height="90" rx="14" {...p} />
          <rect x="12" y="12" width="116" height="76" rx="9" {...thin} />
        </>
      );
  }
}

export default function Stamp({ iso3, name, status, index, visible, reduce, onPick }: Props) {
  const h = hash(iso3);
  const variant = h % 4;
  const rot = ((h >> 3) % 19) - 9; // -9..9 derece
  const dx = ((h >> 8) % 9) - 4;
  const dy = ((h >> 12) % 9) - 4;
  const opacity = 0.88 + ((h >> 16) % 11) / 100;

  const group = groupOf(status);
  const color = INK[group];
  const label = stampLabel(status);
  const days = stampDays(status);
  const title = name.toLocaleUpperCase("tr");
  const nameSize = Math.min(15, 108 / (title.length * 0.62));
  const nameWidth = Math.min(title.length * 0.62 * nameSize, 104);
  const bottom = days ? `${days} GÜN · ${iso3}` : iso3;

  const ink = reduce ? 0 : 0.55 + index * 0.07; // sayfa çevrildikten sonra sırayla "vurulur"

  return (
    <div
      style={{
        transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`,
        mixBlendMode: "multiply",
      }}
    >
    <motion.button
      type="button"
      onClick={() => onPick(iso3)}
      aria-label={`${name}: ${label}${days ? `, ${days} gün` : ""}`}
      initial={reduce ? false : { scale: 1.45, opacity: 0 }}
      animate={visible ? { scale: 1, opacity } : reduce ? { opacity } : { scale: 1.45, opacity: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 22, delay: visible ? ink : 0 }}
      whileHover={{ scale: 1.08, opacity: 1, transition: { delay: 0, type: "spring", stiffness: 400, damping: 18 } }}
      whileFocus={{ scale: 1.08, opacity: 1 }}
      className="block cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      style={{
        width: "100%",
        aspectRatio: "140 / 100",
        padding: 0,
        background: "none",
        border: 0,
      }}
    >
      <svg viewBox="0 0 140 100" width="100%" height="100%" style={{ overflow: "visible" }}>
        <g filter="url(#stamp-ink)" fill={color} style={{ fontFamily: "ui-monospace, 'Courier New', monospace", fontWeight: 800 }}>
          <Shape variant={variant} color={color} dashed={group === "visa"} />
          <text x="70" y="29" textAnchor="middle" fontSize="9" letterSpacing="1.6">
            {label}
          </text>
          <line x1="26" y1="35" x2="114" y2="35" stroke={color} strokeWidth="0.9" />
          <text x="70" y="56" textAnchor="middle" fontSize={nameSize} textLength={nameWidth} lengthAdjust="spacingAndGlyphs">
            {title}
          </text>
          <line x1="26" y1="64" x2="114" y2="64" stroke={color} strokeWidth="0.9" />
          <text x="70" y="78" textAnchor="middle" fontSize="9.5" letterSpacing="1.2">
            {bottom}
          </text>
        </g>
      </svg>
    </motion.button>
    </div>
  );
}

// Mürekkep dokusu filtresi; sayfada bir kez tanımlanır
export function StampDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <defs>
        <filter id="stamp-ink" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="noise" />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.95"
            result="speckle"
          />
          <feComposite in="SourceGraphic" in2="speckle" operator="in" result="inked" />
          <feTurbulence type="turbulence" baseFrequency="0.035" numOctaves="2" seed="9" result="warp" />
          <feDisplacementMap in="inked" in2="warp" scale="2.4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
