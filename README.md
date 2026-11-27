# Stamped

**Pasaportunla nereye gidebilirsin?** Bir pasaport seç; dönen 3D dünya hangi ülkelere vizesiz, e-vizeyle ya da vizeyle gidebildiğini renklerle göstersin, pasaportun da gerçek bir pasaport gibi açılıp sayfa sayfa damgalarını sana göstersin.

Mevcut pasaport/vize sitelerinin arayüzü eski ve sıkıcı. Stamped'in amacı aynı bilgiyi görsel olarak etkileyici ve dokunaklı bir deneyime çevirmek.

> Proje geliştirme aşamasında (bkz. [ROADMAP.md](ROADMAP.md)). Henüz yayında değil.

## Özellikler

- **Dönen 3D dünya** (`globe.gl`): ülkeler seçili pasaporta göre boyanır. Ülkeye tıklayınca o ülkenin pasaportuna geçilir.
- **Gezilebilir pasaport**: sağ altta kapak olarak durur, tıklayınca büyüyüp açılır. 3D sayfa çevirme, kimlik sayfası, bölümlere göre damga sayfaları (vizesiz, e-vize, vize gerekli), bölüm atlama, klavye desteği (← → Esc). Damgaya tıklayınca küre o ülkeye uçar. Mobilde tek sayfa kipi.
- **199 ülkenin pasaport kapağı**: kapak rengi gerçek pasaporttan ölçülür, üzerindeki arma Wikimedia Commons'tan gelir.
- **Mobility Score**: her pasaport için vizesiz + varışta vize + ETA hedef sayısı.

Renkler: 🟢 yeşil = vizesiz (varışta vize dahil) · 🔵 mavi = e-vize / ETA · 🔴 kırmızı = vize gerekli.

Planlananlar: 2–4 pasaportu yan yana karşılaştırma, dünya sıralaması, koyu/açık tema ve tasarım tokenları, küçük devletlerin haritada gösterilmesi. Ayrıntı için [ROADMAP.md](ROADMAP.md).

## Teknoloji

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · [globe.gl](https://globe.gl) · [framer-motion](https://motion.dev) · [flag-icons](https://github.com/lipis/flag-icons)

Veritabanı ve API yoktur; site statiktir. Veri `data/raw/*.csv` dosyalarından derleme sırasında JSON'a çevrilir.

## Başlarken

Node.js 20 veya üstü gerekir.

```bash
npm install
npm run dev
```

Ardından [http://localhost:3000](http://localhost:3000) adresini aç.

| Komut | Ne yapar |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu |
| `npm run build:data` | `data/raw/*.csv` → `src/data/meta.json` |
| `npm run build` | Üretim derlemesi |
| `npm run start` | Üretim derlemesini çalıştırır |
| `npm run lint` | ESLint |

Yayında `NEXT_PUBLIC_SITE_URL` ortam değişkenini sitenin adresine ayarla (ör. `https://stamped.vercel.app`). Paylaşım görselleri (OG) ve canonical linkler bu adresle üretilir.

## Proje yapısı

```
data/raw/            Ham vize CSV'leri (imorte/passport-index-data)
data/emblems/        Arma/renk toplama çıktıları ve atıf bilgisi
scripts/build-data.mjs   CSV -> meta.json + passports/*.json, puan ağırlıkları burada tanımlı
scripts/emblems/     Wikidata/Commons'tan arma ve kapak rengi üretim hattı
src/components/      Explorer (küre + arama) ve passport/ (kitap, sayfalar, damga)
src/lib/             Veri erişimi ve sayfa üretimi (book.ts)
src/data/            Üretilmiş JSON dosyaları
```

## Puanlama

Mobility Score = **vizesiz + varışta vize + ETA** ile gidilebilen hedef sayısı. E-vize ayrı gösterilir. Puan ağırlıkları yalnızca `scripts/build-data.mjs` içinde tanımlıdır.

Bu puan **Henley Passport Index'in resmi sıralaması değildir.** Veri setinde 199 hedef vardır ve vize süresi bilgisi yoktur, bu yüzden sayılar Henley'inkinden farklı çıkar. Arayüzde de bu not yer alır.

## Veri kaynakları ve atıf

- **Vize verisi:** [imorte/passport-index-data](https://github.com/imorte/passport-index-data) (MIT, Mart 2026). Bu veri passportindex.org'dan derlenmiştir; yayına almadan önce kaynağın kullanım koşulları doğrulanacaktır.
- **Armalar:** Wikidata üzerinden bulunup Wikimedia Commons'tan indirilir. Dosyaların çoğu public domain; bir kısmı CC BY-SA 3.0/4.0, CC BY ve benzeri lisanslardadır. Her dosyanın lisansı ve kaynak sayfası `data/emblems/attribution.json` ve `src/data/cover-sources.json` içinde tutulur.
- **Kapak renkleri:** Wikipedia'daki pasaport makalelerinin ana fotoğraflarından yalnızca baskın renk ölçülür; fotoğraflar kullanılmaz.
- **Ülke sınırları:** Natural Earth (public domain).

## Lisans

Kaynak kod [MIT lisansı](LICENSE) ile paylaşılır. Bu lisans yalnızca bu depodaki kodu kapsar; vize verisi, arma görselleri ve diğer üçüncü taraf içerikler yukarıdaki kendi lisanslarına tabidir.
