# Antrenman

Barfiks demiri, yoga matı, kettlebell ve boks torbası için sesli antrenman sayacı. Telefonda ana ekrana eklenince uygulama gibi açılır ve internetsiz çalışır.

## Dosyalar

| Dosya | Ne işe yarar |
|---|---|
| `program.js` | Hareketler, günler, ekipmanlar, animasyon pozları. **Yeni bir şey eklerken sadece bunu düzenle.** |
| `app.js` | Sayaç, ses, ilerleme, barfiks takibi, yedek. |
| `index.html` | Sayfa ve görünüm. |
| `sw.js` | İnternetsiz çalışma. Dosyaları değiştirince içindeki `VERSION`'u bir artır. |
| `manifest.webmanifest`, `icon*` | Ana ekran simgesi ve adı. |

## Yeni hareket eklemek

1. `program.js` içinde `POSES`'a iki poz ekle (başlangıç ve bitiş). Noktalar: `H` baş, `N` omuz, `P` kalça, `E/W` dirsek/el, `K/F` diz/ayak bileği, `T` ayak ucu, `B` kettlebell. Küçük harfler uzak taraftaki kol/bacak. Alan 200×140, zemin y=128.
2. `EX`'e hareketi ekle: `yeni: { name: 'Ad', tip: 'İpucu', anim: 'pozAdı', eq: 'kb' }`.
3. İstediğin günün `items` listesine koy: `{ ex: 'yeni', reps: '10 tekrar' }` ya da `{ ex: 'yeni', sec: 30 }`.

## Yeni ekipman eklemek

`EQUIP`'e ekle (`direnc: { name: 'Direnç bandı', on: false }`), hareketlere `eq: 'direnc'` yaz. Ayarlar'da açma/kapama düğmesi kendiliğinden çıkar.

## Yeni gün eklemek

`DAYS`'e ekle. Blok türleri: `circuit` (devre), `emom`, `rounds` (raund), `list` (sıralı). Haftaya göre değişen sayılar için `byWeek({1: 5, 3: 6})`. Sıraya girmesi için `rotation` fonksiyonunu düzenle; ek gün olacaksa `extra: true` yaz.

## Yayın

GitHub Pages: Settings → Pages → Branch: `main`, klasör `/ (root)`. Adres: `https://<kullanıcı>.github.io/antrenman/`. iPhone'da Safari'de aç → Paylaş → Ana Ekrana Ekle.

## Kayıtlar

Geçmiş ve ayarlar cihazdaki tarayıcıda tutulur. Uygulama içinde Ayarlar → Yedek al ile dosya ya da metin olarak yedeklenir, aynı yerden geri yüklenir.
