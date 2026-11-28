/* BESLENME + KİŞİSEL KOÇ
   Veri her profilin durumunda S.nut altında durur ve bulutla eşitlenir:
     prof {kg, cm, age, sex:'e'|'k', goal:'kas'|'koru'|'yag'}, adj (koçun kalori düzeltmesi), rev (son haftalık değerlendirme),
     days {'YYYY-MM-DD': {it:[{f, q}], wa (bardak su), sl (uyku saati), mod}}, w [{d, kg}] (tartı), log [{t, m}] (koçun yaptığı değişiklikler),
     custom [{id, n, k, pr}] (kullanıcının eklediği yiyecekler).
   Koç kural tabanlıdır: her açılışta bugünkü kayıtlara, son 7 güne, antrenman geçmişine bakıp öneri verir;
   haftada bir kilo gidişatına ve kalori uyumuna bakıp günlük kalori hedefini kendisi ayarlar (kendini geliştirme). */
window.COACH = (() => {
let A = null, cur = null, bound = false;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DAY = 864e5;
const dk = t => new Date(t).toLocaleDateString('sv-SE');
const today = () => dk(Date.now());
const shift = (k, n) => { const d = new Date(k + 'T12:00:00'); d.setDate(d.getDate() + n); return dk(d) };

/* Yaklaşık değerler: [kimlik, grup, ad, porsiyon, kcal, protein g] */
const FOODS = [
  ['egg', 'pro', 'Yumurta', '1 adet', 75, 6.5], ['chick', 'pro', 'Tavuk göğüs', '150 g pişmiş', 250, 46], ['kofte', 'pro', 'Köfte / kıyma', '150 g', 380, 30],
  ['meat', 'pro', 'Kırmızı et', '150 g pişmiş', 330, 40], ['fish', 'pro', 'Balık', '200 g ızgara', 300, 40], ['tuna', 'pro', 'Ton balığı', '1 kutu süzülmüş', 140, 30],
  ['legume', 'pro', 'Kuru fasulye / nohut', '1 tabak', 300, 15], ['lentil', 'pro', 'Mercimek çorbası', '1 kase', 180, 9], ['whey', 'pro', 'Protein tozu', '1 ölçek', 120, 24],
  ['yog', 'sut', 'Yoğurt', '200 g', 125, 7], ['suzme', 'sut', 'Süzme yoğurt', '200 g', 190, 18], ['milk', 'sut', 'Süt', '1 bardak', 155, 8],
  ['beyaz', 'sut', 'Beyaz peynir', '50 g', 140, 8], ['kasar', 'sut', 'Kaşar', '30 g', 110, 8], ['lor', 'sut', 'Lor peyniri', '100 g', 90, 11], ['ayran', 'sut', 'Ayran', '1 bardak', 75, 4],
  ['bread', 'kar', 'Ekmek', '1 dilim', 80, 3], ['rice', 'kar', 'Pilav', '1 tabak', 250, 4], ['pasta', 'kar', 'Makarna', '1 tabak', 300, 11], ['bulgur', 'kar', 'Bulgur pilavı', '1 tabak', 200, 6],
  ['potato', 'kar', 'Patates', '1 orta', 130, 3], ['oat', 'kar', 'Yulaf', '50 g', 190, 7], ['simit', 'kar', 'Simit', '1 adet', 300, 9],
  ['banana', 'mey', 'Muz', '1 adet', 105, 1.3], ['fruit', 'mey', 'Meyve', '1 adet / 1 kase', 80, 0.5], ['veg', 'mey', 'Sebze yemeği', '1 tabak', 180, 4], ['salad', 'mey', 'Salata', '1 kase', 60, 2],
  ['nuts', 'atis', 'Kuruyemiş', '1 avuç', 180, 6], ['pb', 'atis', 'Fıstık ezmesi', '1 yemek kaşığı', 95, 4], ['choc', 'atis', 'Çikolata / gofret', '1 adet', 230, 3],
  ['cookie', 'atis', 'Kek / kurabiye', '1 adet', 150, 2], ['dessert', 'atis', 'Tatlı', '1 porsiyon', 350, 5], ['borek', 'atis', 'Börek / poğaça', '1 dilim', 350, 10],
  ['doner', 'dis', 'Döner dürüm', '1 adet', 600, 30], ['lahmacun', 'dis', 'Lahmacun', '1 adet', 250, 11], ['burger', 'dis', 'Hamburger', '1 adet', 550, 28], ['pizza', 'dis', 'Pizza', '2 dilim', 550, 22],
  ['cola', 'ic', 'Kola / şekerli içecek', '1 kutu', 140, 0], ['juice', 'ic', 'Meyve suyu', '1 bardak', 110, 0.5], ['tea', 'ic', 'Şekerli çay', '1 bardak', 25, 0], ['latte', 'ic', 'Sütlü kahve', '1 bardak', 120, 6]
];
const GR = { pro: 'Protein', sut: 'Süt ürünleri', kar: 'Karbonhidrat', mey: 'Meyve ve sebze', atis: 'Atıştırmalık ve tatlı', dis: 'Dışarıda / hazır', ic: 'İçecek' };
const F = {}; FOODS.forEach(([id, g, n, p, k, pr]) => { F[id] = { id, g, n, p, k, pr } });
const GOALS = { kas: 'Kas kazanmak', koru: 'Formu korumak', yag: 'Yağ yakmak' };

function N() {
  const S = A.S(); S.nut = S.nut || {}; const n = S.nut;
  n.days = n.days || {}; n.w = n.w || []; n.log = n.log || []; n.custom = n.custom || []; n.adj = n.adj || 0; return n;
}
const food = id => F[id] || N().custom.find(x => x.id === id);
const day = k => N().days[k] || { it: [] };
function put(k, d) { d.mod = Date.now(); N().days[k] = d; A.save() }
function sums(d) { let k = 0, pr = 0; (d.it || []).forEach(x => { const f = food(x.f); if (f) { k += f.k * x.q; pr += f.pr * x.q } }); return { k: Math.round(k), pr: Math.round(pr) } }
const logged = d => d && d.it && d.it.length > 0;

/* ---------- hedefler ---------- */
function targets() {
  const p = N().prof; if (!p || !(p.kg > 0) || !(p.cm > 0) || !(p.age > 0)) return null;
  const bmr = 10 * p.kg + 6.25 * p.cm - 5 * p.age + (p.sex === 'k' ? -161 : 5);
  const wk = A.perWeek(), act = wk >= 5 ? 1.55 : wk >= 4 ? 1.46 : wk >= 3 ? 1.38 : 1.3, g = p.goal || 'kas';
  const base = bmr * act + (g === 'kas' ? 300 : g === 'yag' ? -400 : 0);
  return {
    kcal: Math.round(Math.max(bmr * 1.1, base + N().adj) / 10) * 10,
    pr: Math.round(p.kg * (g === 'yag' ? 2 : g === 'kas' ? 1.8 : 1.6)),
    wa: Math.max(8, Math.round(p.kg * 35 / 250)), sl: 7.5, bmr: Math.round(bmr), tdee: Math.round(bmr * act), g
  };
}

/* son n günün özeti (bugün hariç) */
function recent(n) {
  const o = { days: 0, k: 0, pr: 0, sweets: 0, sl: [], cnt: {} };
  for (let i = 1; i <= n; i++) {
    const d = day(shift(today(), -i));
    if (d.sl) o.sl.push(d.sl);
    if (!logged(d)) continue;
    const s = sums(d); o.days++; o.k += s.k; o.pr += s.pr;
    d.it.forEach(x => { const f = food(x.f); if (f && (f.g === 'atis' || x.f === 'cola')) o.sweets += x.q });
  }
  o.ak = o.days ? o.k / o.days : 0; o.apr = o.days ? o.pr / o.days : 0;
  o.asl = o.sl.length ? o.sl.reduce((a, b) => a + b, 0) / o.sl.length : 0; return o;
}
/* hangi yiyecekleri sık giriyor (son 30 gün) */
function freq() {
  const c = {};
  for (let i = 0; i < 30; i++) (day(shift(today(), -i)).it || []).forEach(x => { c[x.f] = (c[x.f] || 0) + 1 });
  return Object.keys(c).filter(food).sort((a, b) => c[b] - c[a]);
}
/* kilo gidişatı: son 7 günün ortalaması − önceki 7 günün ortalaması */
function trend() {
  const w = N().w, now = Date.now(), avg = a => a.length ? a.reduce((x, y) => x + y.kg, 0) / a.length : null;
  const age = x => (now - new Date(x.d + 'T12:00:00')) / DAY;
  const a = avg(w.filter(x => age(x) < 7.5)), b = avg(w.filter(x => age(x) >= 7.5 && age(x) < 14.5));
  return a != null && b != null ? a - b : null;
}

/* ---------- haftalık değerlendirme: koç hedefi kendisi ayarlar ---------- */
function review() {
  const n = N(), t = targets(); if (!t) return;
  if (!n.rev) { n.rev = Date.now(); A.save(); return }
  if (Date.now() - n.rev < 7 * DAY) return;
  const r = recent(7), d = trend();
  if (r.days < 4 || d == null) return;   // yeterli veri yok, bir sonraki açılışta yine bakar
  const adh = r.ak / t.kcal, old = n.adj; let m = '';
  if (t.g === 'kas') {
    if (d < 0.1 && adh >= 0.9) { n.adj += 150; m = 'Bir haftada kilo neredeyse artmadı (' + fmt(d) + ' kg). Günlük kalori hedefini 150 kcal artırdım.' }
    else if (d > 0.6) { n.adj -= 100; m = 'Kilo haftada ' + fmt(d) + ' kg arttı; bu kadarı daha çok yağ demek. Günlük hedefi 100 kcal azalttım.' }
    else if (d >= 0.1) m = 'Kilo haftada ' + fmt(d) + ' kg arttı, kas için ideal aralıkta. Hedef aynı kaldı.';
  } else if (t.g === 'yag') {
    if (d > -0.15 && adh <= 1.1 && adh >= 0.85) { n.adj -= 150; m = 'Bir haftada kilo neredeyse düşmedi (' + fmt(d) + ' kg). Günlük hedefi 150 kcal azalttım.' }
    else if (d < -0.9) { n.adj += 100; m = 'Kilo çok hızlı düşüyor (' + fmt(d) + ' kg). Kas kaybetmemek için hedefi 100 kcal artırdım.' }
    else if (d <= -0.15) m = 'Kilo haftada ' + fmt(d) + ' kg düştü, sağlıklı aralıkta. Hedef aynı kaldı.';
  } else {
    if (d > 0.4) { n.adj -= 100; m = 'Kilo ' + fmt(d) + ' kg arttı. Korumak için hedefi 100 kcal azalttım.' }
    else if (d < -0.4) { n.adj += 100; m = 'Kilo ' + fmt(d) + ' kg düştü. Korumak için hedefi 100 kcal artırdım.' }
  }
  if (adh < 0.85 && t.g !== 'yag' && n.adj === old) m = 'Geçen hafta hedefin ancak %' + Math.round(adh * 100) + '\'ini yedin. Hedefi değiştirmedim; önce hedefe ulaşmaya çalış.';
  n.adj = Math.max(-600, Math.min(800, n.adj)); n.rev = Date.now();
  if (m) n.log.unshift({ t: Date.now(), m }); n.log = n.log.slice(0, 30); A.save();
}
const fmt = x => (x > 0 ? '+' : '') + x.toFixed(1).replace('.', ',');

/* ---------- koçun mesajları ---------- */
function proteinIdea(rem) {
  const fav = freq().filter(id => { const f = food(id); return f && f.pr >= 6 && f.pr / Math.max(f.k, 1) >= 0.05 });
  const pool = [...new Set([...fav, 'suzme', 'egg', 'tuna', 'chick', 'lor', 'milk'])].map(food).filter(Boolean);
  const pick = []; let left = rem;
  for (const f of pool) { if (left <= 0 || pick.length >= 3) break; const q = f.id === 'egg' ? Math.min(3, Math.ceil(left / f.pr)) : 1; pick.push(q > 1 ? q + ' ' + f.n.toLowerCase() : f.n + ' (' + f.p + ')'); left -= f.pr * q }
  return pick.join(', ');
}
function messages() {
  const t = targets(), out = [], add = (k, m, p) => out.push({ k, m, p: p || 0 });
  const hr = new Date().getHours(), td = day(today()), s = sums(td), r = recent(7), mains = A.mains();
  const last = mains[0], gap = last ? Math.floor((Date.now() - last.t) / DAY) : null, trainedToday = last && dk(last.t) === today();
  if (!t) add('info', 'Koçu kur: Beslenme sekmesinde kilonu, boyunu, yaşını ve hedefini gir. Kalori ve protein hedefini ona göre hesaplarım.', 9);
  if (trainedToday) add('good', 'Bugün antrenman yaptın. 2 saat içinde 30–40 g protein al, gece de iyi uyu.', 6);
  else if (gap != null && gap >= 3) add('warn', gap + ' gündür antrenman yok. Bugün ' + A.next() + ' var; 20 dakikalık kısa versiyon bile sayılır.', 8, 'gap');
  if (t) {
    const rem = t.pr - s.pr;
    if (rem <= 0) add('good', 'Bugünkü protein hedefi tamam (' + s.pr + ' g).', 3);
    else if (hr >= 11) add(rem > t.pr / 2 && hr >= 17 ? 'warn' : 'info', 'Bugün ' + rem + ' g protein daha lazım. Örneğin: ' + proteinIdea(rem) + '.', 7);
    if (r.days >= 3 && r.apr < t.pr * 0.8) add('warn', 'Son 7 günde ortalama ' + Math.round(r.apr) + ' g protein yedin, hedef ' + t.pr + ' g. Kas yapmak için en önemli eksik bu.', 7);
    const y = day(shift(today(), -1));
    if (logged(y) && t.g === 'kas' && sums(y).k < t.kcal * 0.8) add('warn', 'Dün hedefin %' + Math.round(sums(y).k / t.kcal * 100) + '\'ini yedin. Kas için kalori fazlası gerekir; ara öğün ekle (yoğurt, kuruyemiş, muz).', 5);
    if (hr >= 15 && (td.wa || 0) < t.wa / 2) add('info', 'Bugün ' + (td.wa || 0) + ' bardak su içtin, hedef ' + t.wa + '.', 2);
  }
  if (r.sl.length >= 3 && r.asl < 7) add('warn', 'Son günlerde ortalama ' + r.asl.toFixed(1).replace('.', ',') + ' saat uyudun. Kas uykuda gelişir; her gece aynı saatte yat, 7–8 saati hedefle.', 8);
  else if (r.sl.length >= 3 && r.asl >= 7.5) add('good', 'Uyku düzenin iyi: ortalama ' + r.asl.toFixed(1).replace('.', ',') + ' saat.', 1);
  if (!td.sl && hr >= 6) add('info', 'Dün gece kaç saat uyuduğunu gir.', 2);
  if (r.sweets >= 7) add('warn', 'Son 7 günde ' + r.sweets + ' porsiyon tatlı, atıştırmalık ya da şekerli içecek. Yarıya indir; yerine meyve, yoğurt ya da kuruyemiş.', 6);
  const hist = A.hist().filter(h => h.pn != null).slice(0, 3);
  if (hist.length === 3 && hist.reduce((a, h) => a + h.pn, 0) / 3 >= 4) add('warn', 'Son 3 antrenmanda rahatsızlık puanın yüksek. Kolay versiyonları kullan; geçmezse doktora danış.', 9);
  if (t && !N().w.some(x => (Date.now() - new Date(x.d + 'T12:00:00')) / DAY < 7)) add('info', 'Bu hafta tartılmadın. Sabah aç karnına tartıl ve kilonu gir; koç hedefini buna göre ayarlar.', 4);
  const lg = N().log[0]; if (lg && Date.now() - lg.t < 3 * DAY) add('info', 'Koç: ' + lg.m, 5);
  if (r.days >= 5) add('good', 'Son 7 günün ' + r.days + ' gününde beslenmeni girdin. Böyle devam.', 0);
  const rank = { warn: 2, info: 1, good: 0 };
  return out.sort((a, b) => rank[b.k] - rank[a.k] || b.p - a.p);
}

/* ---------- çizim ---------- */
const bar = (label, v, max, unit) => '<div class="wkrow nrow"><span>' + label + '</span><i><em style="width:' + Math.min(100, max ? v / max * 100 : 0).toFixed(0) + '%"></em></i><b>' + v + (max ? ' / ' + max : '') + (unit || '') + '</b></div>';
const msgHtml = ms => ms.map(x => '<p class="cm ' + x.k + '">' + esc(x.m) + '</p>').join('');
function banner() {
  const b = $('coachb'); if (!b) return; const ms = messages().filter(x => x.id !== 'gap' && (x.k !== 'good' || x.p >= 3)).slice(0, 2);
  b.hidden = !ms.length; $('coacht').innerHTML = msgHtml(ms);
}
function render() {
  if (!A) return; review(); banner();
  const root = $('nut'); if (!root || root.closest('.view').hidden) return;
  cur = cur || today(); const n = N(), t = targets(), d = day(cur), s = sums(d), isT = cur === today(), p = n.prof || {};
  const lbl = isT ? 'Bugün' : cur === shift(today(), -1) ? 'Dün' : new Date(cur + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'short' });
  const fav = freq().slice(0, 8);
  let h = '<div class="note coach">' + msgHtml(messages().slice(0, 5)) + '</div>';
  h += '<div class="row dnav"><button data-a="prev" aria-label="Önceki gün">‹</button><b>' + lbl + '</b><button data-a="next" aria-label="Sonraki gün"' + (isT ? ' disabled' : '') + '>›</button></div>';
  h += '<div class="weeks">' + bar('Kalori', s.k, t && t.kcal, '') + bar('Protein', s.pr, t && t.pr, ' g') + bar('Su', d.wa || 0, t ? t.wa : 10, ' bardak') + bar('Uyku', d.sl || 0, 8, ' sa') + '</div>';
  h += '<div class="row nqs"><span>Su</span><button data-a="wa-">−</button><b>' + (d.wa || 0) + '</b><button data-a="wa+">+</button><span>bardak</span></div><div class="row nqs"><span>Önceki gece uyku</span><select data-a="sl" aria-label="Uyku saati"><option value="">–</option>' + [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(v => '<option value="' + v + '"' + (d.sl === v ? ' selected' : '') + '>' + String(v).replace('.', ',') + ' sa</option>').join('') + '</select></div>';
  h += '<h2>' + (isT ? 'Bugün yediklerin' : lbl + ' yediklerin') + '</h2>';
  h += '<ul class="log nlog">' + (d.it.length ? d.it.map((x, i) => { const f = food(x.f) || { n: '?', k: 0, pr: 0, p: '' }; return '<li><span><b>' + esc(f.n) + '</b> ×' + String(x.q).replace('.', ',') + ' · ' + Math.round(f.k * x.q) + ' kcal · ' + Math.round(f.pr * x.q) + ' g</span><span class="row"><button data-a="q-" data-i="' + i + '" aria-label="Azalt">−</button><button data-a="q+" data-i="' + i + '" aria-label="Artır">+</button></span></li>' }).join('') : '<li><span>Henüz bir şey girilmedi. Aşağıdan dokunarak ekle.</span></li>') + '</ul>';
  h += '<h2>Ekle</h2><p class="next">Dokununca 1 porsiyon eklenir. Değerler yaklaşıktır.</p>';
  if (fav.length) h += '<p class="next"><b>Sık yediklerin</b></p><div class="fgrid">' + fav.map(fb).join('') + '</div>';
  for (const g in GR) h += '<details class="fg"><summary>' + GR[g] + '</summary><div class="fgrid">' + FOODS.filter(f => f[1] === g).map(f => fb(f[0])).join('') + '</div></details>';
  h += '<details class="fg"><summary>Kendi yiyeceğin</summary>' + (n.custom.length ? '<div class="fgrid">' + n.custom.map(c => fb(c.id)).join('') + '</div>' : '') + '<div class="prow cus"><input id="cn" placeholder="Ad (ör. ev yemeği)" maxlength="30"><input id="ck" type="number" inputmode="numeric" placeholder="kcal"><input id="cp" type="number" inputmode="numeric" placeholder="Protein g"><button data-a="cadd">Ekle</button></div></details>';
  h += '<h2>Kilo</h2><div class="row nqs"><input id="wkg" type="number" inputmode="decimal" step="0.1" placeholder="kg" aria-label="Kilo"><button data-a="wsave">Kaydet</button></div>';
  const ws = n.w.slice(-8); if (ws.length) { const mn = Math.min(...ws.map(x => x.kg)) - 1, mx = Math.max(...ws.map(x => x.kg)) + .5; h += '<div class="weeks">' + ws.slice().reverse().map(x => '<div class="wkrow"><span>' + new Date(x.d + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + '</span><i><em style="width:' + ((x.kg - mn) / (mx - mn) * 100).toFixed(0) + '%"></em></i><b>' + String(x.kg).replace('.', ',') + '</b></div>').join('') + '</div>'; const tr = trend(); if (tr != null) h += '<p class="next">Haftalık değişim: ' + fmt(tr) + ' kg</p>' }
  h += '<details class="fg"' + (t ? '' : ' open') + '><summary>Bilgilerin ve hedefler</summary><div class="pgrid">'
    + '<label>Kilo (kg)<input id="pkg" type="number" inputmode="decimal" step="0.1" value="' + (p.kg || '') + '"></label>'
    + '<label>Boy (cm)<input id="pcm" type="number" inputmode="numeric" value="' + (p.cm || '') + '"></label>'
    + '<label>Yaş<input id="page" type="number" inputmode="numeric" value="' + (p.age || '') + '"></label>'
    + '<label>Cinsiyet<select id="psex"><option value="e"' + (p.sex !== 'k' ? ' selected' : '') + '>Erkek</option><option value="k"' + (p.sex === 'k' ? ' selected' : '') + '>Kadın</option></select></label>'
    + '<label>Hedef<select id="pgoal">' + Object.keys(GOALS).map(g => '<option value="' + g + '"' + ((p.goal || 'kas') === g ? ' selected' : '') + '>' + GOALS[g] + '</option>').join('') + '</select></label>'
    + '</div><button class="wide" data-a="psave">Kaydet</button>';
  if (t) h += '<p class="next">Günlük hedef: <b>' + t.kcal + ' kcal</b>, <b>' + t.pr + ' g protein</b>, ' + t.wa + ' bardak su, 7–8 saat uyku. Hesap: dinlenme ' + t.bmr + ' kcal, haftada ' + A.perWeek() + ' antrenmanla ' + t.tdee + ' kcal' + (t.g === 'kas' ? ' + 300 kas için' : t.g === 'yag' ? ' − 400 yağ yakmak için' : '') + (n.adj ? ', koç düzeltmesi ' + (n.adj > 0 ? '+' : '') + n.adj : '') + '.</p>';
  h += '<p class="next">Koç her hafta kilo gidişatına ve ne kadar yediğine bakıp kalori hedefini kendisi ayarlar. Protein önerilerini en sık yediklerinden seçer.</p>';
  if (n.log.length) h += '<p class="next"><b>Koçun değişiklikleri</b></p><ul class="log">' + n.log.slice(0, 8).map(x => '<li><span>' + new Date(x.t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + ' — ' + esc(x.m) + '</span></li>').join('') + '</ul>';
  h += '</details>';
  root.innerHTML = h;
}
function fb(id) { const f = food(id); return f ? '<button data-a="add" data-f="' + esc(id) + '"><b>' + esc(f.n) + '</b><small>' + esc(f.p || '1 porsiyon') + ' · ' + f.k + ' kcal · ' + f.pr + ' g</small></button>' : '' }

function onClick(e) {
  const b = e.target.closest('[data-a]'); if (!b || b.tagName === 'SELECT') return;
  const a = b.dataset.a, d = day(cur); d.it = d.it || [];
  if (a === 'prev') { cur = shift(cur, -1); return render() }
  if (a === 'next') { if (cur < today()) cur = shift(cur, 1); return render() }
  if (a === 'add') { const x = d.it.find(y => y.f === b.dataset.f); if (x) x.q += 1; else d.it.push({ f: b.dataset.f, q: 1 }); put(cur, d); flash(food(b.dataset.f).n + ' eklendi'); return render() }
  if (a === 'q+' || a === 'q-') { const x = d.it[+b.dataset.i]; if (!x) return; x.q += a === 'q+' ? (x.q < 1 ? .5 : 1) : (x.q <= 1 ? -.5 : -1); if (x.q <= 0) d.it.splice(+b.dataset.i, 1); put(cur, d); return render() }
  if (a === 'wa+' || a === 'wa-') { d.wa = Math.max(0, (d.wa || 0) + (a === 'wa+' ? 1 : -1)); put(cur, d); return render() }
  if (a === 'cadd') { const nm = $('cn').value.trim(), k = +$('ck').value, pr = +$('cp').value || 0; if (!nm || !(k > 0)) return flash('Ad ve kalori gir'); const id = 'c' + Date.now().toString(36); N().custom.push({ id, n: nm.slice(0, 30), p: '1 porsiyon', k: Math.round(k), pr: Math.round(pr), g: 'cus' }); d.it.push({ f: id, q: 1 }); put(cur, d); return render() }
  if (a === 'wsave') { const kg = +String($('wkg').value).replace(',', '.'); if (!(kg > 30 && kg < 250)) return flash('Geçerli bir kilo gir'); const n = N(); n.w = n.w.filter(x => x.d !== cur); n.w.push({ d: cur, kg: Math.round(kg * 10) / 10 }); n.w.sort((x, y) => x.d < y.d ? -1 : 1); n.w = n.w.slice(-120); if (n.prof && cur === today()) n.prof.kg = Math.round(kg * 10) / 10; A.save(); return render() }
  if (a === 'psave') { const n = N(), was = !n.prof; n.prof = { kg: +String($('pkg').value).replace(',', '.') || 0, cm: +$('pcm').value || 0, age: +$('page').value || 0, sex: $('psex').value, goal: $('pgoal').value }; if (!targets()) return flash('Kilo, boy ve yaşı doldur'); if (was || !n.rev) n.rev = Date.now(); if (n.prof.kg && !n.w.some(x => x.d === today())) n.w.push({ d: today(), kg: n.prof.kg }); A.save(); flash('Kaydedildi'); return render() }
}
function onChange(e) {
  if (e.target.dataset.a !== 'sl') return; const d = day(cur); d.it = d.it || []; d.sl = e.target.value ? +e.target.value : undefined; put(cur, d); render();
}
let ft = 0; function flash(m) { const el = $('nflash'); if (!el) return; el.textContent = m; el.hidden = false; clearTimeout(ft); ft = setTimeout(() => el.hidden = true, 1600) }

/* iki cihazın kayıtlarını birleştir: gün gün en yenisi, tartılar tarih tarih */
function merge(a, b, n) {
  if (!a) return b; if (!b) return a; const days = { ...a.days };
  for (const k in (b.days || {})) if (!days[k] || (b.days[k].mod || 0) > (days[k].mod || 0)) days[k] = b.days[k];
  const w = {}; [...(a.w || []), ...(b.w || [])].forEach(x => { w[x.d] = x });
  const cus = {}; [...(a.custom || []), ...(b.custom || [])].forEach(x => { cus[x.id] = x });
  return { ...(n || a), days, w: Object.values(w).sort((x, y) => x.d < y.d ? -1 : 1).slice(-120), custom: Object.values(cus) };
}

function init(api) {
  A = api; cur = today();
  if (!bound && $('nut')) { bound = true; $('nut').addEventListener('click', onClick); $('nut').addEventListener('change', onChange); const g = $('coachb'); g && g.addEventListener('click', () => A.go('beslenme')); g && g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); A.go('beslenme') } }) }
}
return { init, render, merge, targets, messages, FOODS };
})();
