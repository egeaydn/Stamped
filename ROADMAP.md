# Stamped Yol Haritası

## Puanlama (araştırıldı, Kasım 2026)
Hazır bir puan/sıralama API'si bulunamadı. Henley (IATA Timatic verisi, kapalı) ve passportindex.org kendi sıralamasını yayımlıyor, açık veri setlerinde puan yok.
- **Henley:** vizesiz + varışta vize + ETA sayısı; e-vize "vize" sayılır. 227 hedef (bölgeler dahil). Temmuz 2026: Singapur 192, Japonya/Güney Kore/BAE 188.
- **Passport Index (Mobility Score):** vizesiz + varışta vize + ETA + 3 günde çıkan e-vize. Bu yüzden BAE birinci çıkıyor.
- **Bizim yöntem:** Mobility Score = vizesiz + varışta vize + ETA hedef sayısı (Henley'e yakın). E-vize ayrı gösterilir. Sıralamada eşit skorlar aynı sırayı paylaşır.
- Veri setinde 199 hedef var ve süre bilgisi yok, bu yüzden sayılarımız Henley'inkinden farklı çıkar (BAE 169, Singapur 163). Arayüzde "Henley'in resmi sıralaması değildir" notu olmalı.

## Aşamalar
1. **Veri (bitti):** imorte/passport-index-data (Mart 2026) kullanılıyor; ilyankou setinin son veri güncellemesi Ocak 2025 olduğu için eskisi bırakıldı. ISO2 ve TR/EN ülke adları üretiliyor. Pasaport başına JSON parçalama bitti: `src/data/meta.json` + `public/data/passports/*.json`, istemci `loadRow()` ile ilk kullanımda çeker.
2. **İskelet (yarım):** pasaport arama + bilgi paneli var. Kalan: tasarım tokenları, tema, mobil düzen.
3. **Küre (ilk sürüm çalışıyor):** dönen dünya, pasaporta göre renkler, ülkeye tıklayınca pasaport değişir. Poligonu olmayan 31 küçük devlet (Singapur, Malta, Maldivler, Bahreyn, Monako vb.) `src/lib/small-states.ts` koordinatlarıyla nokta olarak çiziliyor; renk, hover, tıklama ve damgadan uçuş bunlarda da çalışıyor. Detay paneli, seçili ülkeye kamera odaklama.
   - Bilinen sorun: Windows'ta bayrak emojileri harf olarak görünüyor, bayrak görselleriyle (ör. SVG seti) değiştirilecek.
4. **Pasaport deneyimi (ilk sürüm bitti):** sağ altta kapak olarak duruyor, tıklayınca büyüyüp açılıyor. 3D sayfa çevirme, kimlik sayfası, bölümlere göre damga sayfaları (vizesiz, e-vize, vize gerekli), bölüm atlama, klavye (← → Esc), damgaya tıklayınca küre ülkeye uçar. Mobilde tek sayfa kipi. Kod: `src/components/passport/`, sayfa üretimi `src/lib/book.ts`.
   - Kalan: sayfa kenarından tıklayıp/sürükleyerek çevirme (swipe), kapak renklerini gerçek pasaport renklerine göre doğrulama, damga sesi/titreşimi (isteğe bağlı).
5. **Karşılaştırma (ilk sürüm bitti):** 2-4 pasaport; küre pasaport renkleriyle boyanır (hepsi vizesiz = yeşil, 2 pasaportta tek taraf = o pasaportun rengi, 3+ pasaportta kısmi = turuncu ton), sağ panelde skor çubukları ve "yalnızca X" listeleri. Kod: `src/components/ComparePanel.tsx`, `src/lib/compare.ts`.
6. **Puan ve sıralama (bitti):** `/ranking` sayfası: ilk üç için kapaklı podyum, eşit skorlu pasaportlar aynı kademede, arama; sol paneldeki "dünya sırası" buraya gider.
7. **Paylaşım (bitti):** her pasaport için `/p/{ISO3}` statik sayfası, dinamik OG görseli (`src/app/p/[iso3]/opengraph-image.tsx`), "Bu pasaportu paylaş" düğmesi, adres çubuğu seçili pasaportu izler.
8. **Cila:** SEO bitti (`lang="tr"`, `sitemap.xml`, `robots.txt`, sayfa başına meta). Kalan: açık tema, performans (Lighthouse), erişilebilirlik denetimi, mobil ince ayar.
9. **Yayın:** Vercel (ücretsiz), `NEXT_PUBLIC_SITE_URL` ayarlanmalı. Kaynak/lisans atıfı sayfası bitti (`/about`).

## Açık sorular
- Veri güncelliği: ne sıklıkla güncellenecek? (öneri: elle, ayda bir)
- Kaynak koşulları yayından önce doğrulanacak.
