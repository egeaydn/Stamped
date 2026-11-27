import type { Metadata } from "next";
import Link from "next/link";
import sources from "@/data/cover-sources.json";
import meta from "@/data/meta.json";
import { byIso3 } from "@/lib/visa";

export const metadata: Metadata = {
  title: "Hakkında ve kaynaklar",
  description: "Stamped'in puanlama yöntemi, veri kaynakları ve görsel atıfları.",
  alternates: { canonical: "/about" },
};

type Src = { emblemFile: string | null; emblemPage: string | null; license: string | null; author: string | null };

// Atıf gerektiren armalar (public domain ve CC0 dışındakiler)
const credits = Object.entries(sources as Record<string, Src>)
  .filter(([, s]) => s.emblemFile && s.license && s.license !== "Public domain" && s.license !== "CC0")
  .map(([iso3, s]) => ({ iso3, name: byIso3.get(iso3)?.tr ?? iso3, ...s }))
  .sort((a, b) => a.name.localeCompare(b.name, "tr"));

const updated = new Date(meta.generatedAt).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" });

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xs uppercase tracking-[0.25em] text-sky-300">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky-300 underline-offset-2 hover:underline">
    {children}
  </a>
);

export default function AboutPage() {
  return (
    <main className="min-h-dvh w-full bg-[#050810] px-4 pb-24 pt-8 text-slate-100 sm:px-8">
      <article className="mx-auto max-w-2xl">
        <Link href="/" className="text-xs uppercase tracking-[0.25em] text-sky-300 hover:text-sky-200">
          ← Stamped
        </Link>
        <h1 className="mt-8 text-3xl font-semibold">Hakkında ve kaynaklar</h1>
        <p className="mt-3 text-sm text-slate-400">Veri son güncelleme: {updated}</p>

        <Section title="Puan nasıl hesaplanıyor">
          <p>
            <strong className="text-slate-100">Mobility Score</strong> = vizesiz + varışta vize + ETA ile girilebilen ülke
            sayısı. E-vize ayrı gösterilir ve puana katılmaz. Eşit puanlı pasaportlar aynı sırayı paylaşır.
          </p>
          <p>
            Bu puan Henley Passport Index&apos;in resmi sıralaması <strong className="text-slate-100">değildir</strong>.
            Veri setinde 199 hedef vardır ve vize süresi bilgisi yoktur; bu yüzden sayılar Henley&apos;inkinden farklı
            çıkar. Seyahat etmeden önce hedef ülkenin resmi kaynaklarını kontrol edin.
          </p>
        </Section>

        <Section title="Veri">
          <p>
            Vize verisi: <A href="https://github.com/imorte/passport-index-data">imorte/passport-index-data</A> (MIT).
            Bu veri passportindex.org&apos;dan derlenmiştir.
          </p>
          <p>
            Ülke sınırları: <A href="https://www.naturalearthdata.com/">Natural Earth</A> (public domain). Gece dünya
            dokusu: NASA Black Marble (public domain). Bayraklar:{" "}
            <A href="https://github.com/lipis/flag-icons">flag-icons</A> (MIT).
          </p>
          <p>
            Pasaport kapağı renkleri Wikipedia&apos;daki pasaport makalelerinin fotoğraflarından ölçülür; fotoğrafların
            kendisi kullanılmaz.
          </p>
        </Section>

        <Section title="Arma görselleri">
          <p>
            Armalar <A href="https://commons.wikimedia.org/">Wikimedia Commons</A>&apos;tan alınır ve yaldız efektiyle
            yeniden renklendirilir. Çoğu public domain; aşağıdakiler atıf gerektiren lisanslardadır.
          </p>
          <ul className="mt-4 divide-y divide-white/5 rounded-xl border border-white/10 bg-white/[0.03] text-xs">
            {credits.map((c) => (
              <li key={c.iso3} className="flex flex-wrap items-baseline gap-x-2 px-3 py-2">
                <span className="font-medium text-slate-200">{c.name}</span>
                <span className="text-slate-500">·</span>
                {c.emblemPage ? <A href={c.emblemPage}>{c.emblemFile}</A> : <span>{c.emblemFile}</span>}
                <span className="ml-auto text-slate-400">
                  {c.author ? `${c.author}, ` : ""}
                  {c.license}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Kod">
          <p>
            Stamped açık kaynaktır (<A href="https://github.com/egeaydn/Stamped">GitHub</A>, MIT). Kod lisansı üçüncü
            taraf veri ve görselleri kapsamaz; onlar yukarıdaki kendi lisanslarına tabidir.
          </p>
        </Section>
      </article>
    </main>
  );
}
