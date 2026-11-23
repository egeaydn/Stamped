"use client";

import "flag-icons/css/flag-icons.min.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GlobeInstance } from "globe.gl";
import PassportBook, { useBookLayout } from "./passport/PassportBook";
import {
  COLORS,
  GEO_ALIAS,
  byIso3,
  countries,
  groupOf,
  stats,
  statusFor,
  type Group,
} from "@/lib/visa";

type GeoFeature = {
  properties: { ADM0_A3: string; NAME: string };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
};

const LABELS: Record<Group, string> = {
  free: "Vizesiz / varışta vize / ETA",
  evisa: "E-vize",
  visa: "Vize gerekli",
  self: "Kendi ülken",
};

function Flag({ iso2, className = "" }: { iso2: string; className?: string }) {
  return <span className={`fi fis fi-${iso2.toLowerCase()} rounded-[3px] align-[-2px] ${className}`} />;
}

export default function Explorer() {
  const [passport, setPassport] = useState("TUR");
  const [query, setQuery] = useState("");
  const [hover, setHover] = useState<string | null>(null);
  const [bookOpen, setBookOpen] = useState(false);
  const [focusIso, setFocusIso] = useState<string | null>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
  const centroids = useRef<Map<string, { lat: number; lng: number }>>(new Map());
  const passportRef = useRef(passport);
  const focusTimer = useRef<number | undefined>(undefined);
  const { wide, pw } = useBookLayout();

  useEffect(() => {
    passportRef.current = passport;
  }, [passport]);

  const me = byIso3.get(passport)!;
  const st = stats[passport];

  // Küreyi bir kez kur
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      const [{ default: Globe }, geo] = await Promise.all([
        import("globe.gl"),
        fetch("/data/countries.geojson").then((r) => r.json()),
      ]);
      if (disposed || !mountRef.current) return;
      for (const f of geo.features as GeoFeature[]) {
        const c = centroidOf(f);
        if (c) centroids.current.set(isoOf(f), c);
      }
      const el = mountRef.current;
      const globe = new Globe(el)
        .backgroundColor("rgba(0,0,0,0)")
        .globeImageUrl("/earth-night.jpg")
        .atmosphereColor("#7dd3fc")
        .polygonsData(geo.features)
        .polygonAltitude(0.012)
        .polygonSideColor(() => "rgba(0,0,0,0.15)")
        .polygonStrokeColor(() => "#0b1220")
        .polygonLabel(() => "")
        .ringColor(() => (t: number) => `rgba(255,255,255,${1 - t})`)
        .ringMaxRadius(5)
        .ringPropagationSpeed(2.2)
        .ringRepeatPeriod(900)
        .onPolygonHover((f: object | null) => setHover(f ? isoOf(f as GeoFeature) : null))
        .onPolygonClick((f: object) => {
          const iso = isoOf(f as GeoFeature);
          if (byIso3.has(iso)) setPassport(iso);
        });
      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.5;

      // Kutu boyutu değişince (defter açılınca) küreyi yeniden boyutlandır
      const ro = new ResizeObserver(() => globe.width(el.clientWidth).height(el.clientHeight));
      ro.observe(el);
      globeRef.current = globe;
      applyColors(globe, passportRef.current);
      cleanup = () => {
        ro.disconnect();
        globe._destructor?.();
      };
    })();
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  // Pasaport değişince renkleri güncelle
  useEffect(() => {
    if (globeRef.current) applyColors(globeRef.current, passport);
  }, [passport]);

  // Defter açıkken küre dönmesin; seçili ülke biraz yükselsin
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    g.controls().autoRotate = !bookOpen;
  }, [bookOpen]);

  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    g.polygonAltitude((f: object) => (focusIso && isoOf(f as GeoFeature) === focusIso ? 0.07 : 0.012));
  }, [focusIso]);

  // Damgaya tıklayınca: küre ülkeye uçar, halka yanıp söner
  const focusCountry = useCallback((iso: string) => {
    const g = globeRef.current;
    const c = centroids.current.get(iso);
    setFocusIso(iso);
    window.clearTimeout(focusTimer.current);
    focusTimer.current = window.setTimeout(() => {
      setFocusIso(null);
      globeRef.current?.ringsData([]);
    }, 6000);
    if (!g || !c) return; // küçük devletler 110m haritada yok
    g.pointOfView({ lat: c.lat, lng: c.lng, altitude: 1.7 }, 1300);
    g.ringsData([{ lat: c.lat, lng: c.lng }]);
  }, []);

  useEffect(() => () => window.clearTimeout(focusTimer.current), []);

  const grouped = useMemo(() => {
    const out: Record<Group, string[]> = { free: [], evisa: [], visa: [], self: [] };
    for (const c of countries) {
      const s = statusFor(passport, c.iso3);
      if (s) out[groupOf(s)].push(c.iso3);
    }
    return out;
  }, [passport]);

  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    if (!q) return [];
    return countries
      .filter((c) => c.tr.toLocaleLowerCase("tr").includes(q) || c.en.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query]);

  const hovered = hover ? byIso3.get(hover) : null;
  const hoveredStatus = hover ? statusFor(passport, hover) : undefined;

  // Defter açıkken küre kalan alana yerleşir (geniş ekranda)
  const globeRight = bookOpen && wide ? pw * 2 + 32 : 0;
  const globeLeft = bookOpen && wide ? 368 : 0; // sol panelin genişliği kadar

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#050810] text-slate-100">
      <div ref={mountRef} className="absolute inset-y-0" style={{ left: globeLeft, right: globeRight }} />

      <aside
        className={`absolute left-4 top-4 z-10 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-slate-950/70 p-5 backdrop-blur ${
          bookOpen ? "max-[979px]:hidden" : ""
        }`}
      >
        <p className="text-xs uppercase tracking-[0.25em] text-sky-300">Stamped</p>
        <h1 className="mt-3 flex items-center gap-2 text-2xl font-semibold">
          <Flag iso2={me.iso2} className="text-[1.5rem]" /> {me.tr}
        </h1>
        <div className="mt-4 flex items-end gap-6">
          <div>
            <div className="text-5xl font-bold tabular-nums">{st.mobility}</div>
            <div className="text-xs text-slate-400">vizesiz erişim</div>
          </div>
          <div>
            <div className="text-2xl font-semibold tabular-nums">#{st.rank}</div>
            <div className="text-xs text-slate-400">dünya sırası</div>
          </div>
        </div>

        <div className="relative mt-5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pasaport ara…"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-sky-400"
          />
          {results.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-white/10 bg-slate-900">
              {results.map((c) => (
                <li key={c.iso3}>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/10"
                    onClick={() => {
                      setPassport(c.iso3);
                      setQuery("");
                    }}
                  >
                    <Flag iso2={c.iso2} />
                    {c.tr}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <ul className="mt-5 space-y-2 text-sm">
          {(Object.keys(LABELS) as Group[])
            .filter((g) => g !== "self")
            .map((g) => (
              <li key={g} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <i className="h-3 w-3 rounded-full" style={{ background: COLORS[g] }} />
                  {LABELS[g]}
                </span>
                <span className="tabular-nums text-slate-300">{grouped[g].length}</span>
              </li>
            ))}
        </ul>
        <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
          Sayı = vizesiz + varışta vize + ETA (Henley yöntemine yakın). E-vize ayrı sayılır. Resmi bir sıralama değildir.
        </p>
      </aside>

      {hovered && (
        <div
          className="pointer-events-none absolute bottom-6 z-10 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-950/80 px-4 py-2 text-sm backdrop-blur"
          style={{ left: `calc(50% + ${(globeLeft - globeRight) / 2}px)` }}
        >
          <Flag iso2={hovered.iso2} /> {hovered.tr}
          {hoveredStatus && (
            <span className="ml-3" style={{ color: COLORS[groupOf(hoveredStatus)] }}>
              {LABELS[groupOf(hoveredStatus)]}
              {/^[FAT]\d+$/.test(hoveredStatus) ? ` · ${hoveredStatus.slice(1)} gün` : ""}
            </span>
          )}
        </div>
      )}

      <PassportBook passport={passport} open={bookOpen} onOpenChange={setBookOpen} onPick={focusCountry} />
    </main>
  );
}

function isoOf(f: GeoFeature) {
  return GEO_ALIAS[f.properties.ADM0_A3] ?? f.properties.ADM0_A3;
}

function applyColors(globe: GlobeInstance, passport: string) {
  globe.polygonCapColor((f: object) => {
    const iso = isoOf(f as GeoFeature);
    const s = statusFor(passport, iso);
    return s ? COLORS[groupOf(s)] + "cc" : "rgba(100,116,139,0.5)";
  });
}

// En büyük halkanın sınır kutusunun merkezi (kameranın bakacağı yer için yeterli)
function centroidOf(f: GeoFeature): { lat: number; lng: number } | null {
  const rings: number[][][] =
    f.geometry.type === "Polygon"
      ? [(f.geometry.coordinates as number[][][])[0]]
      : (f.geometry.coordinates as number[][][][]).map((p) => p[0]);
  let best: { area: number; lat: number; lng: number } | null = null;
  for (const ring of rings) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of ring) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const area = (maxX - minX) * (maxY - minY);
    if (!best || area > best.area) best = { area, lng: (minX + maxX) / 2, lat: (minY + maxY) / 2 };
  }
  return best ? { lat: best.lat, lng: best.lng } : null;
}
