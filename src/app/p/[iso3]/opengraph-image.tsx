import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { byIso3, countries, stats } from "@/lib/visa";

export const alt = "Stamped pasaport özeti";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateImageStaticParams() {
  return countries.map((c) => ({ iso3: c.iso3 }));
}

const COLORS = { free: "#34d399", evisa: "#60a5fa", visa: "#f87171" };

function flagDataUri(iso2: string): string | null {
  try {
    const svg = readFileSync(join(process.cwd(), "node_modules/flag-icons/flags/4x3", `${iso2.toLowerCase()}.svg`));
    return `data:image/svg+xml;base64,${svg.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ iso3: string }> }) {
  const { iso3 } = await params;
  const c = byIso3.get(iso3)!;
  const s = stats[iso3];
  const total = s.mobility + s.evisa + s.visa;
  const flag = flagDataUri(c.iso2);
  const parts = [
    { key: "free", n: s.mobility, label: "Vizesiz / varışta vize / ETA" },
    { key: "evisa", n: s.evisa, label: "E-vize" },
    { key: "visa", n: s.visa, label: "Vize gerekli" },
  ] as const;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #050810 0%, #0b1730 100%)",
          color: "#f1f5f9",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 8, color: "#7dd3fc" }}>STAMPED</div>

        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          {flag && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={flag} width={168} height={126} alt="" style={{ borderRadius: 12 }} />
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>{c.tr}</div>
            <div style={{ display: "flex", fontSize: 32, color: "#94a3b8", marginTop: 8 }}>pasaportu</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginLeft: "auto" }}>
            <div style={{ display: "flex", fontSize: 150, fontWeight: 800, lineHeight: 1 }}>{s.mobility}</div>
            <div style={{ display: "flex", fontSize: 28, color: "#94a3b8" }}>{`ülkeye vizesiz · #${s.rank}`}</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", height: 22, borderRadius: 11, overflow: "hidden", background: "#1e293b" }}>
            {parts.map((p) => (
              <div key={p.key} style={{ display: "flex", width: `${(p.n / total) * 100}%`, background: COLORS[p.key] }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 40, fontSize: 26, color: "#cbd5e1" }}>
            {parts.map((p) => (
              <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", width: 18, height: 18, borderRadius: 9, background: COLORS[p.key] }} />
                <div style={{ display: "flex" }}>{`${p.n} ${p.label}`}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size
  );
}
