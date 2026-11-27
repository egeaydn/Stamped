"use client";

import "flag-icons/css/flag-icons.min.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GlobeInstance } from "globe.gl";
import PassportBook, { useBookLayout } from "./passport/PassportBook";
import ComparePanel from "./ComparePanel";
import { MAX_COMPARE, PASSPORT_COLORS, compareColor } from "@/lib/compare";
import {
  COLORS,
  GEO_ALIAS,
  byIso3,
  countries,
  groupOf,
  stats,
  loadRow,
  type Group,
  type Row,
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

export default function Explorer({ initialPassport = "TUR" }: { initialPassport?: string }) {
  const [passport, setPassport] = useState(initialPassport);
  const [copied, setCopied] = useState(false);
  const [compare, setCompare] = useState(false);
  const [extra, setExtra] = useState<string[]>([]); // karşılaştırmadaki ek pasaportlar (ilk pasaport = seçili)
  const [rowsMap, setRowsMap] = useState<Record<string, Row>>({});
  const [query, setQuery] = useState("");
  const [hover, setHover] = useState<string | null>(null);
  const [bookOpen, setBookOpen] = useState(false);
  const [focusIso, setFocusIso] = useState<string | null>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
  const centroids = useRef<Map<string, { lat: number; lng: number }>>(new Map());
  const rowRef = useRef<Row | null>(null);
  const compareRef = useRef(false);
  const pickRef = useRef<(iso3: string) => void>(() => {});
  const focusTimer = useRef<number | undefined>(undefined);
  const { wide, pw } = useBookLayout();

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
          if (byIso3.has(iso)) pickRef.current(iso);
        });
      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.5;

      // Kutu boyutu değişince (defter açılınca) küreyi yeniden boyutlandır
      const ro = new ResizeObserver(() => globe.width(el.clientWidth).height(el.clientHeight));
      ro.observe(el);
      globeRef.current = globe;
      applyColors(globe, rowRef.current);
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

  const list = useMemo(() => [passport, ...extra.filter((p) => p !== passport)].slice(0, MAX_COMPARE), [passport, extra]);

  // Gerekli pasaport satırlarını çek
  useEffect(() => {
    let stale = false;
    const need = compare ? list : [passport];
    Promise.all(need.map((p) => loadRow(p).then((r) => [p, r] as const))).then((pairs) => {
      if (stale) return;
      setRowsMap((m) => ({ ...m, ...Object.fromEntries(pairs) }));
    });
    return () => {
      stale = true;
    };
  }, [passport, list, compare]);

  // Seçili pasaportun satırı ve küre renkleri
  const row = rowsMap[passport] ?? null;
  useEffect(() => {
    rowRef.current = row;
  }, [row]);

  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const rows = list.map((p) => rowsMap[p]);
    if (compare && rows.length > 1 && rows.every(Boolean)) applyCompareColors(g, rows);
    else if (rowsMap[passport]) applyColors(g, rowsMap[passport]);
  }, [rowsMap, passport, list, compare]);

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

  // Adres çubuğu seçili pasaportu yansıtsın (paylaşılabilir link); sayfa yeniden yüklenmez
  useEffect(() => {
    window.history.replaceState(null, "", `/p/${passport}`);
    const c = byIso3.get(passport);
    if (c) document.title = `${c.tr} pasaportu: ${stats[passport].mobility} ülkeye vizesiz | Stamped`;
  }, [passport]);

  const share = useCallback(async () => {
    const url = `${window.location.origin}/p/${passport}`;
    const name = byIso3.get(passport)?.tr ?? passport;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${name} pasaportu`, url });
        return;
      } catch {
        // kullanıcı vazgeçti; panoya kopyalamaya düş
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [passport]);

  const pickPassport = useCallback((iso: string) => {
    if (compareRef.current) setExtra((e) => (e.includes(iso) || e.length >= MAX_COMPARE - 1 ? e : [...e, iso]));
    else setPassport(iso);
  }, []);
  useEffect(() => {
    pickRef.current = pickPassport;
    compareRef.current = compare;
  }, [pickPassport, compare]);

  const removeCompare = useCallback(
    (iso: string) => {
      if (iso === passport) {
        // Seçili pasaport çıkarılırsa sıradaki yerini alır
        const [next, ...rest] = extra;
        if (next) {
          setPassport(next);
          setExtra(rest);
        }
      } else setExtra((e) => e.filter((p) => p !== iso));
    },
    [passport, extra]
  );

  const grouped = useMemo(() => {
    const out: Record<Group, string[]> = { free: [], evisa: [], visa: [], self: [] };
    if (!row) return out;
    for (const c of countries) {
      const s = row[c.iso3];
      if (s) out[groupOf(s)].push(c.iso3);
    }
    return out;
  }, [row]);

  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    if (!q) return [];
    return countries
      .filter((c) => c.tr.toLocaleLowerCase("tr").includes(q) || c.en.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query]);

  const hovered = hover ? byIso3.get(hover) : null;
  const hoveredStatus = hover && row ? row[hover] : undefined;
  const comparing = compare && list.length > 1;

  // Defter açıkken küre kalan alana yerleşir (geniş ekranda)
  const globeRight = compare && wide ? 400 : bookOpen && wide ? pw * 2 + 32 : 0;
  const globeLeft = bookOpen && wide && !compare ? 368 : 0; // sol panelin genişliği kadar

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
          <a href="/ranking" className="group" title="Tüm sıralamayı gör">
            <div className="text-2xl font-semibold tabular-nums group-hover:text-sky-300">#{st.rank}</div>
            <div className="text-xs text-slate-400 group-hover:text-sky-300">dünya sırası →</div>
          </a>
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
                      pickPassport(c.iso3);
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
        <button
          onClick={() => {
            setCompare((c) => !c);
            setBookOpen(false);
          }}
          aria-pressed={compare}
          className={`mt-5 w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            compare
              ? "border-sky-400 bg-sky-400/15 text-sky-200"
              : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
          }`}
        >
          {compare ? "Karşılaştırmayı kapat" : "Pasaport karşılaştır"}
        </button>
        <button
          onClick={share}
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
        >
          {copied ? "Bağlantı kopyalandı ✓" : "Bu pasaportu paylaş"}
        </button>
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
          {comparing && hover ? (
            <span className="ml-3 inline-flex items-center gap-1.5">
              {list.map((p, i) => {
                const s = rowsMap[p]?.[hover];
                const free = s ? groupOf(s) === "free" : false;
                return (
                  <i
                    key={p}
                    title={`${byIso3.get(p)?.tr}: ${s ? LABELS[groupOf(s)] : "-"}`}
                    className="h-3 w-3 rounded-full"
                    style={{
                      background: free ? PASSPORT_COLORS[i] : "transparent",
                      boxShadow: `inset 0 0 0 2px ${PASSPORT_COLORS[i]}`,
                      opacity: free ? 1 : 0.5,
                    }}
                  />
                );
              })}
            </span>
          ) : (
            hoveredStatus && (
            <span className="ml-3" style={{ color: COLORS[groupOf(hoveredStatus)] }}>
              {LABELS[groupOf(hoveredStatus)]}
              {/^[FAT]\d+$/.test(hoveredStatus) ? ` · ${hoveredStatus.slice(1)} gün` : ""}
            </span>
            )
          )}
        </div>
      )}

      {compare ? (
        <ComparePanel
          passports={list}
          rows={rowsMap}
          onRemove={removeCompare}
          onFocus={focusCountry}
          onClose={() => setCompare(false)}
        />
      ) : (
        <PassportBook passport={passport} row={row} open={bookOpen} onOpenChange={setBookOpen} onPick={focusCountry} />
      )}
    </main>
  );
}

function isoOf(f: GeoFeature) {
  return GEO_ALIAS[f.properties.ADM0_A3] ?? f.properties.ADM0_A3;
}

function applyColors(globe: GlobeInstance, row: Row | null) {
  globe.polygonCapColor((f: object) => {
    const iso = isoOf(f as GeoFeature);
    const s = row?.[iso];
    return s ? COLORS[groupOf(s)] + "cc" : "rgba(100,116,139,0.5)";
  });
}

// Karşılaştırma modunda renkler pasaportlara göre
function applyCompareColors(globe: GlobeInstance, rows: Row[]) {
  globe.polygonCapColor((f: object) => compareColor(rows, isoOf(f as GeoFeature)));
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
