---
name: antrenman-guncelle
description: Antrenman uygulamasına yeni hareket, gün, ekipman ya da özellik eklerken, hata düzeltirken ve GitHub Pages'e yayınlarken kullan.
---

# Antrenman uygulamasını güncelle

Canlı: https://beyazkuzgun.github.io/antrenman/ · Derleme yok, düz HTML/JS PWA. Kullanıcıyla Türkçe konuş; rutin işi bitirip kısaca özetle.

## 1. Nereye dokunacağını seç (önce CLAUDE.md)
- Yeni hareket / gün / ekipman / program → sadece `program.js` (POSES, EX, DAYS, EQUIP, TEMPLATES).
- Davranış / ekran → `app.js` ve `index.html`.
- Hesap / eşitleme / fotoğraf → `sync.js`, `config.js`, `firestore.rules`.
- Dosyaları baştan sona okuma; `grep -n` ile ilgili bölümü bul, sadece onu oku.

## 2. Kurallar
- Baran (ekipman şablonu): zıplama, derin squat, lunge yok; swing/goblet sadece `cleared` bayrağıyla. Nur: sadece mat.
- Public repo: kişisel sağlık detayı yazma, genel ifade kullan.
- Giriş zorunlu kalsın; fotoğraflar cihaza/yedeğe yazılmasın, başka hesaba karışmasın.
- `firestore.rules` değişirse kod yetmez: Firebase konsolu → Firestore → Kurallar'a yapıştırılıp **Yayınla**'ya basılmalı. Yayınlanmadan yeni Firestore yolunu kullanan kodu yayınlama; kullanıcıya hangi adımı yapacağını söyle.

## 3. Test
- `tools/test.sh` → JS sözdizimi + sahte hesapla uçtan uca duman testi (giriş, antrenman sonu, zorluk, fotoğraf, galeri, Vaktim az, çıkış). Hepsi `OK` olmalı.
- Yeni özellik eklediysen `tools/smoke.html`'e bir kontrol satırı ekle.
- Görünüm: `node tools/cdp.mjs URL 4000 ekran.png` ile 390x844 ekran görüntüsü al ve bak.
- Yeni poz: iki pozu SVG olarak çizip `rsvg-convert` ile PNG'ye çevir, yan yana bak.

## 4. Yayınla
- `sw.js` içindeki `VERSION`'u bir artır; yeni dosya eklendiyse `FILES`'a ekle.
- Commit yazarı: `beyazkuzgun <wmbaram@gmail.com>`; `main`'e push et.
- ~1 dk sonra canlı `sw.js`'de yeni VERSION'u kontrol et.
- Kullanıcıya kısa özet: ne değişti, telefonda "Yeni sürüm hazır → Yenile".
