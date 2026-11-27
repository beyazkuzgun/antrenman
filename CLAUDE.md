# Antrenman — Claude için proje notu

Sesli ev antrenmanı sayacı (PWA). GitHub Pages: https://beyazkuzgun.github.io/antrenman/ · Kullanıcıyla Türkçe konuş.

## Yapı (derleme yok, düz HTML/JS)
- `program.js` — TÜM içerik: EQUIP, FLAGS, POSES (çöp adam pozları), EX (hareketler), DAYS (günler), TEMPLATES (programlar), DEFAULT_PROFILES. Yeni hareket/gün/ekipman = sadece bu dosya.
- `app.js` — motor: profiller, sayaç, ses, barfiks takibi, istatistik, yedek, sekmeler, bulut eşitleme bağlantısı.
- `sync.js` + `config.js` — Firebase (proje `antrenman-60c3b`, Auth Google + e-posta, Firestore `users/{uid}` = {snap}; fotoğraflar `users/{uid}/photos/{id}` = {t,p,th} + `.../full/img` = {img}).
- `firestore.rules` — güvenlik kuralları; değişince Firebase konsolu → Firestore → Kurallar'a yapıştırılıp yayınlanır.
- Giriş zorunlu (`#gate`). Cihazda başka hesabın verisi varsa (`antrenman.owner`) yeni hesaba girişte yerel veri silinir. Fotoğraflar cihaza ve yedeğe yazılmaz; tarayıcıda yeniden çizilerek EXIF/konum silinir.
- Zorluk geri bildirimi: `S.adj[hareket]` (-3..+4, seviye başı ~%15); ısınma, soğuma, ayak bileği, barfiks ve boks ayarlanmaz.
- `index.html` — görünüm; 4 sekme: antrenman, ilerleme, hareketler, ayarlar.
- `sw.js` — çevrimdışı; dosya değişince `VERSION`'u artır, yeni dosya eklenince `FILES`'a ekle.

## Pozlar
Nokta harfleri: H baş, N omuz, M sırt ortası, P kalça, E/W yakın dirsek/el, e/w uzak, K/F diz/ayak bileği, k/f uzak, T ayak ucu, B kettlebell. Alan 200×140, zemin y=128. Yeni pozu yayınlamadan önce PNG'ye çizip bak.

## Kurallar
- Baran: sağ ayak bileği sakatlığı → zıplama, derin squat, lunge yok (ekipman şablonu). Swing/goblet sadece `cleared` bayrağıyla.
- Nur: sadece mat şablonu.
- Public repo: kişisel sağlık detayı yazma, genel ifade kullan.

## Test ve yayın
- `tools/test.sh` — JS sözdizimi + sahte hesapla (`tools/fake-sync.js`) uçtan uca duman testi; hepsi OK olmadan yayınlama.
- `node tools/cdp.mjs URL [ms] [ekran.png]` — headless Chrome'da sayfayı açar, sonucu/hataları yazar, istenirse ekran görüntüsü alır.
- Commit yazarı: beyazkuzgun <wmbaram@gmail.com>. `main`'e push → Pages ~1 dk. `sw.js` VERSION'u her yayında artır.
- Ayrıntılı adımlar: `.claude/skills/antrenman-guncelle/SKILL.md`.

## Çalışma şekli
Kullanıcı Baran; teknik ekip yok. Türkçe konuş, sıradaki adımı sen öner. Firebase konsolu gibi giriş gerektiren adımlarda şifre girme; kullanıcıdan girişi yapmasını iste.
