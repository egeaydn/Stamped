"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "framer-motion";
import { buildFaces, sectionStarts, type Face } from "@/lib/book";
import { COLORS, type Group } from "@/lib/visa";
import Cover from "./Cover";
import { BlankPage, DataPage, StampsPage } from "./Pages";
import { StampDefs } from "./Stamp";

const RATIO = 125 / 176; // gerçek pasaport sayfası oranı (genişlik / yükseklik)
const EASE = [0.645, 0.045, 0.355, 1] as const;

// --- görünüm boyutu (SSR güvenli) ---
function useViewport() {
  const sub = (cb: () => void) => {
    window.addEventListener("resize", cb);
    return () => window.removeEventListener("resize", cb);
  };
  const w = useSyncExternalStore(sub, () => window.innerWidth, () => 1280);
  const h = useSyncExternalStore(sub, () => window.innerHeight, () => 800);
  return { w, h };
}

export function useBookLayout() {
  const { w, h } = useViewport();
  const wide = w >= 980;
  const pw = wide
    ? Math.max(220, Math.min((w - 440) / 2, (h - 104) * RATIO, 400))
    : Math.max(200, Math.min(w - 32, (h - 130) * RATIO));
  return { wide, pw, ph: pw / RATIO, vw: w };
}

type Props = {
  passport: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (iso3: string) => void;
};

export default function PassportBook({ passport, open, onOpenChange, onPick }: Props) {
  const { wide, pw, ph, vw } = useBookLayout();
  const reduce = !!useReducedMotion();

  // Pasaport değişince defter sıfırdan kurulur (yeni kapak, yeni damgalar)
  return (
    <motion.div
      className="fixed bottom-4 right-4 z-20"
      style={{ width: wide ? pw * 2 : pw, height: ph, transformOrigin: "bottom right" }}
      initial={false}
      animate={{
        scale: open ? 1 : wide ? 0.26 : 0.3,
        x: open && !wide ? -(vw - pw - 32) / 2 : 0,
      }}
      whileHover={open ? undefined : { scale: wide ? 0.29 : 0.33, rotate: -2 }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 160, damping: 22 }}
      onClick={open ? undefined : () => onOpenChange(true)}
      role={open ? undefined : "button"}
      tabIndex={open ? undefined : 0}
      aria-label={open ? undefined : "Pasaport defterini aç"}
      onKeyDown={open ? undefined : (e) => (e.key === "Enter" || e.key === " ") && onOpenChange(true)}
    >
      <Book
        key={passport}
        passport={passport}
        open={open}
        onOpenChange={onOpenChange}
        onPick={onPick}
        wide={wide}
        pw={pw}
        ph={ph}
        reduce={reduce}
      />
    </motion.div>
  );
}

type BookProps = {
  passport: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (iso3: string) => void;
  wide: boolean;
  pw: number;
  ph: number;
  reduce: boolean;
};

function Book({ passport, open, onOpenChange, onPick, wide, pw, ph, reduce }: BookProps) {
  const faces = useMemo(() => buildFaces(passport), [passport]);
  const starts = useMemo(() => sectionStarts(faces), [faces]);
  const single = !wide;
  const L = single ? faces.length : faces.length / 2; // yaprak sayısı
  const maxT = single ? L - 1 : L; // ulaşılabilecek en son durum

  const [t, setT] = useState(open ? 1 : 0); // kaç yaprak çevrildi
  const [flipping, setFlipping] = useState<number | null>(null);
  const timers = useRef<number[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const tRef = useRef(t);
  const go = useCallback(
    (target: number) => {
      const cur = tRef.current;
      const next = Math.max(0, Math.min(maxT, target));
      if (next === cur) return;
      tRef.current = next;
      // Hareket eden yaprak çevrilirken en öne alınır
      setFlipping(next > cur ? cur : next);
      later(() => setFlipping(null), reduce ? 0 : 1000);
      setT(next);
    },
    [maxT, later, reduce]
  );

  // Defter dock'tan açılınca kapağı biraz sonra çevir
  const wasOpen = useRef(open);
  useEffect(() => {
    if (open && !wasOpen.current) later(() => go(tRef.current === 0 ? 1 : tRef.current), reduce ? 0 : 520);
    wasOpen.current = open;
  }, [open, later, reduce, go]);

  const close = useCallback(() => {
    go(0);
    later(() => onOpenChange(false), reduce ? 0 : 950);
  }, [go, later, onOpenChange, reduce]);

  // Klavye: ok tuşları ve Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight") go(t + 1);
      else if (e.key === "ArrowLeft") go(t - 1);
      else if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, t, go, close]);

  // Bir face hangi t değerinde görünür?
  const tFor = (faceIdx: number) => (single ? faceIdx : Math.ceil(faceIdx / 2));
  const jump = (g: Group) => {
    const idx = starts[g];
    if (idx !== undefined) go(tFor(idx));
  };

  // Kitap kutusu: kapalıyken tek sayfa ortalanır
  const shift = wide ? (t === 0 ? -pw / 2 : t >= L ? pw / 2 : 0) : 0;
  const boxW = wide ? pw * 2 : pw;

  return (
    <div className="relative h-full w-full" style={{ pointerEvents: open ? "auto" : "none" }}>
      <StampDefs />

      {/* Kontrol çubuğu */}
      {open && (
        <div
          className="absolute -top-12 left-0 right-0 flex items-center justify-between gap-2 text-slate-200"
          style={{ width: boxW }}
        >
          <div className="flex items-center gap-1">
            <NavBtn label="Önceki sayfa" disabled={t <= 0} onClick={() => go(t - 1)}>‹</NavBtn>
            <span className="min-w-14 text-center text-xs tabular-nums text-slate-400">
              {t === 0 ? "Kapak" : `${t} / ${maxT}`}
            </span>
            <NavBtn label="Sonraki sayfa" disabled={t >= maxT} onClick={() => go(t + 1)}>›</NavBtn>
          </div>
          <div className="flex items-center gap-1.5">
            {(["free", "evisa", "visa"] as Group[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => jump(g)}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/70 px-2.5 py-1 text-[11px] backdrop-blur hover:bg-white/10"
              >
                <i className="h-2 w-2 rounded-full" style={{ background: COLORS[g] }} />
                <span className="max-sm:hidden">{g === "free" ? "Vizesiz" : g === "evisa" ? "E-vize" : "Vize"}</span>
              </button>
            ))}
            <NavBtn label="Defteri kapat" onClick={close}>✕</NavBtn>
          </div>
        </div>
      )}

      {/* Defterin kendisi */}
      <motion.div
        className="relative h-full"
        style={{ width: boxW, perspective: 2600 }}
        initial={false}
        animate={{ x: shift }}
        transition={reduce ? { duration: 0 } : { duration: 0.95, ease: EASE }}
      >
        {/* masa gölgesi */}
        <div
          aria-hidden
          className="absolute -bottom-3 left-[6%] right-[6%] h-6 rounded-[50%] bg-black/60 blur-xl"
          style={{ opacity: open ? 1 : 0.5 }}
        />
        {Array.from({ length: L }, (_, i) => {
          if (Math.abs(i - t) > 2) return null; // yalnızca yakın yapraklar çizilir
          return (
            <Leaf
              key={i}
              i={i}
              t={t}
              L={L}
              single={single}
              pw={pw}
              ph={ph}
              faces={faces}
              passport={passport}
              flipping={flipping}
              reduce={reduce}
              onPick={onPick}
              interactive={open}
              onCoverClick={() => go(1)}
            />
          );
        })}
      </motion.div>
    </div>
  );
}

function NavBtn({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-slate-950/70 text-base leading-none backdrop-blur transition hover:bg-white/10 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

type LeafProps = {
  i: number;
  t: number;
  L: number;
  single: boolean;
  pw: number;
  ph: number;
  faces: Face[];
  passport: string;
  flipping: number | null;
  reduce: boolean;
  onPick: (iso3: string) => void;
  interactive: boolean;
  onCoverClick: () => void;
};

function Leaf({ i, t, L, single, pw, ph, faces, passport, flipping, reduce, onPick, interactive, onCoverClick }: LeafProps) {
  const flipped = i < t;
  const rot = useMotionValue(flipped ? -180 : 0);

  useEffect(() => {
    const c = animate(rot, flipped ? -180 : 0, { duration: reduce ? 0 : 0.95, ease: EASE });
    return () => c.stop();
  }, [flipped, rot, reduce]);

  // Çevrilirken ortada kararan ışık
  const shade = useTransform(rot, [-180, -90, 0], [0, 0.4, 0]);
  const z = flipping === i ? 1000 : flipped ? i : L - i;

  const front: Face = single ? faces[i] : faces[2 * i];
  const back: Face = single ? { type: "blank" } : (faces[2 * i + 1] ?? { type: "blank" });

  // Yaprağın şu an görünen yüzü
  const frontVisible = i === t;
  const backVisible = !single && i === t - 1;

  return (
    <motion.div
      className="absolute top-0"
      style={{
        left: single ? 0 : pw,
        width: pw,
        height: ph,
        transformOrigin: "left center",
        transformStyle: "preserve-3d",
        rotateY: rot,
        zIndex: z,
        // tek sayfa kipinde çevrilen yaprak soldaki boşluğa düşmesin
        opacity: single && flipped && flipping !== i ? 0 : 1,
      }}
    >
      <FaceBox side="right" interactive={interactive && frontVisible} shade={shade} rotated={false} radius="right">
        <FaceContent face={front} passport={passport} visible={frontVisible && interactive} reduce={reduce} side="right" onPick={onPick} onCoverClick={onCoverClick} />
      </FaceBox>
      <FaceBox side="left" interactive={interactive && backVisible} shade={shade} rotated radius="left">
        <FaceContent face={back} passport={passport} visible={backVisible && interactive} reduce={reduce} side="left" onPick={onPick} onCoverClick={onCoverClick} />
      </FaceBox>
    </motion.div>
  );
}

function FaceBox({
  children,
  interactive,
  shade,
  rotated,
  radius,
}: {
  children: React.ReactNode;
  side: "left" | "right";
  interactive: boolean;
  shade: MotionValue<number>;
  rotated: boolean;
  radius: "left" | "right";
}) {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: rotated ? "rotateY(180deg)" : undefined,
        pointerEvents: interactive ? "auto" : "none",
        borderRadius: radius === "right" ? "2px 8px 8px 2px" : "8px 2px 2px 8px",
        boxShadow: "0 1px 0 rgba(0,0,0,.25), 0 6px 18px rgba(0,0,0,.35)",
      }}
    >
      {children}
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: shade }} />
    </div>
  );
}

function FaceContent({
  face,
  passport,
  visible,
  reduce,
  side,
  onPick,
  onCoverClick,
}: {
  face: Face;
  passport: string;
  visible: boolean;
  reduce: boolean;
  side: "left" | "right";
  onPick: (iso3: string) => void;
  onCoverClick: () => void;
}) {
  switch (face.type) {
    case "cover":
      return (
        <div className="absolute inset-0" onClick={onCoverClick} style={{ cursor: "pointer" }}>
          <Cover passport={passport} />
        </div>
      );
    case "data":
      return <DataPage passport={passport} side={side} />;
    case "stamps":
      return <StampsPage face={face} passport={passport} visible={visible} reduce={reduce} side={side} onPick={onPick} />;
    default:
      return <BlankPage side={side} />;
  }
}
