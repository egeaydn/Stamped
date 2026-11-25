# Stamped

Pasaport seçtiğin an o pasaportun hangi ülkelere vizesiz / e-vize / vizeli gidebildiğini gösteren, pasaporta puan veren web sitesi. Kişisel proje (Ege). Dil: Türkçe iletişim, kod ve dosya adları İngilizce.

## Neden var
Mevcut sitelerin arayüzü eski ve sıkıcı. Amaç: görsel olarak etkileyici, dokunaklı bir deneyim. Başarı ölçütü: ilk açılışta "vay" dedirtmesi ve karşılaştırmanın kolay olması.

## Kararlar (değiştirmeden önce Ege'ye sor)
- **Veritabanı ve API yok.** Veri `data/raw/*.csv` içinde, `npm run build:data` ile `src/data/meta.json` (ülkeler + skorlar) ve `public/data/passports/{ISO3}.json` (pasaport başına satır) üretilir. Site statik.
- **Veri kaynağı:** imorte/passport-index-data (MIT, Mart 2026). passportindex.org'dan kazıdığı için yayına almadan önce kaynağın kullanım koşullarını kontrol et. Eski alternatif: ilyankou/passport-index-dataset (Ocak 2025'ten beri veri güncellenmemiş).
- **Puan:** Mobility Score = vizesiz + varışta vize + ETA sayısı (bkz. ROADMAP.md "Puanlama"). Henley'in resmi sıralaması değildir, arayüzde belirt.
- Next.js 16: `node_modules/next/dist/docs/` okunmadan yeni API varsayma (AGENTS.md).
- **Stack:** Next.js (App Router) + TypeScript + Tailwind, `globe.gl` (3D küre), `framer-motion` (sayfa çevirme).
- **Renkler:** yeşil = vizesiz (varışta vize dahil), mavi = e-vize/ETA, kırmızı = vize gerekli.

## Arayüz fikirleri (Ege'nin isteği)
- Dönen 3D dünya, ülkeler duruma göre renkli.
- Seçilen pasaportun görseli gelir; ülkeler pasaport sayfaları gibi çevrilerek listelenir (damga estetiği). Klasik tablo/liste kullanma.
- Birden fazla pasaportu yan yana karşılaştırma.
- UI/UX özenli ve tutarlı olmalı: tasarım tokenları, koyu/açık tema, mobil öncelikli.

## Komutlar
- `npm run dev` geliştirme sunucusu
- `npm run build:data` CSV -> JSON
- `npm run build` üretim derlemesi

## Kurallar
- Veri şeması değişirse `scripts/build-data.mjs` ve `ROADMAP.md` birlikte güncellenir.
- Puan ağırlıkları tek yerde tanımlı (`scripts/build-data.mjs`), arayüzde tekrar hesaplama.
- Büyük JSON'u istemciye tamamını yollama; pasaport başına parçala (performans).
