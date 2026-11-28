/* Antrenman motoru. Program verisi program.js içinde (window.PROGRAM). */
{
const P = window.PROGRAM, EX = P.EX;
const $ = id => document.getElementById(id);
const DAY = 864e5;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const read = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v) } catch (e) { return d } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} };
const drop = k => { try { localStorage.removeItem(k) } catch (e) {} };
const SY = window.SYNC || { enabled: false };
let syncing = false, lastSync = 0;
const vib = ms => { try { navigator.vibrate && navigator.vibrate(ms) } catch (e) {} };

/* ---------- profiller ---------- */
let PROFS = read('antrenman.profiles', null) || P.DEFAULT_PROFILES.map(x => ({ ...x }));
PROFS = PROFS.filter(x => P.TEMPLATES[x.tpl]); if (!PROFS.length) PROFS = P.DEFAULT_PROFILES.map(x => ({ ...x }));
const saveProfs = () => { write('antrenman.profiles', PROFS); cloud() };
const firstRun = read('antrenman.profile', null) == null;
let pid = read('antrenman.profile', PROFS[0].id); if (!PROFS.find(x => x.id === pid)) pid = PROFS[0].id;
const me = () => PROFS.find(x => x.id === pid);
let PR = P.TEMPLATES[me().tpl];
const KEY = () => 'antrenman.v2.' + pid, SKEY = () => 'antrenman.sess.' + pid;
saveProfs();

/* ---------- kayıt ---------- */
function defaults() {
  const eq = {}, flags = {};
  for (const k in P.EQUIP) eq[k] = PR.equip.includes(k) && (PR.eqOn ? PR.eqOn.includes(k) : P.EQUIP[k].on);
  for (const k in P.FLAGS) flags[k] = P.FLAGS[k].on;
  return { hist: [], off: 0, pull: { L: 0, fails: 0, best: 0 }, cfg: { eq, flags, kbw: P.EQUIP.kb.weight, voice: true, beep: true, prep: true, rem: { days: [1, 3, 5, 6], time: '19:00' } } };
}
function loadState() {
  let s = read(KEY(), null);
  if (!s && pid === 'baran') { s = read('antrenman.v2', null); if (!s) { s = defaults(); s.hist = read('ant_hist', []); s.off = read('ant_woff', 0) } }
  if (!s) s = defaults();
  const d = defaults(); s.cfg = Object.assign(d.cfg, s.cfg || {}); s.cfg.eq = Object.assign(d.cfg.eq, s.cfg.eq); s.cfg.flags = Object.assign(d.cfg.flags, s.cfg.flags); s.pull = Object.assign(d.pull, s.pull || {}); s.hist = s.hist || []; s.off = s.off || 0;
  for (const k in s.cfg.eq) if (!PR.equip.includes(k)) s.cfg.eq[k] = false;
  return s;
}
let S = loadState();
const save = () => { S.mod = Date.now(); write(KEY(), S); cloud() };
write(KEY(), S);
try { navigator.storage && navigator.storage.persist && navigator.storage.persist() } catch (e) {}

/* ---------- animasyon ---------- */
const parse = s => { const o = {}; s.replace(/([A-Za-z])(-?\d+),(-?\d+)/g, (m, k, x, y) => { o[k] = [+x, +y] }); for (const [u, l] of [['E', 'e'], ['W', 'w'], ['K', 'k'], ['F', 'f']]) if (o[u] && !o[l]) o[l] = [o[u][0] + 3, o[u][1]]; if (o.T && !o.t) o.t = [o.T[0] + 1, o.T[1]]; return o };
const mix = (a, b, f) => { const o = {}; for (const k in a) o[k] = b[k] ? [a[k][0] + (b[k][0] - a[k][0]) * f, a[k][1] + (b[k][1] - a[k][1]) * f] : a[k]; return o };
const POSES = {}; for (const k in P.POSES) POSES[k] = { ...P.POSES[k], p: P.POSES[k].p.map(parse) };
const G = 'stroke="var(--line)" stroke-width="2"';
const PROPS = {
  bar: '<line x1="58" y1="22" x2="142" y2="22" stroke="var(--mut)" stroke-width="4" stroke-linecap="round"/><line x1="58" y1="22" x2="58" y2="0" ' + G + '/><line x1="142" y1="22" x2="142" y2="0" ' + G + '/>',
  floor: '<rect x="30" y="130" width="160" height="4" rx="2" fill="var(--accsoft)"/><line x1="0" y1="131" x2="200" y2="131" ' + G + '/>',
  chair: '<line x1="0" y1="131" x2="200" y2="131" ' + G + '/><path d="M76 56V131M76 95H104M102 95V131" stroke="var(--mut)" stroke-width="3" fill="none"/><rect x="110" y="126" width="44" height="4" rx="2" fill="var(--acc)"/>',
  wall: '<line x1="0" y1="131" x2="200" y2="131" ' + G + '/><line x1="131" y1="0" x2="131" y2="131" stroke="var(--mut)" stroke-width="4"/>',
  wallL: '<line x1="0" y1="131" x2="200" y2="131" ' + G + '/><line x1="69" y1="0" x2="69" y2="131" stroke="var(--mut)" stroke-width="4"/>',
  bench: '<line x1="0" y1="131" x2="200" y2="131" ' + G + '/><rect x="78" y="94" width="90" height="6" rx="2" fill="var(--mut)"/><path d="M92 100V131M154 100V131" stroke="var(--mut)" stroke-width="3"/>',
  rings: '<line x1="0" y1="131" x2="200" y2="131" ' + G + '/><line x1="130" y1="0" x2="130" y2="62" stroke="var(--mut)" stroke-width="2"/><circle cx="130" cy="68" r="6" fill="none" stroke="var(--mut)" stroke-width="3"/>',
  dip: '<line x1="0" y1="131" x2="200" y2="131" ' + G + '/><line x1="64" y1="64" x2="136" y2="64" stroke="var(--mut)" stroke-width="4" stroke-linecap="round"/><path d="M70 64V131M130 64V131" stroke="var(--mut)" stroke-width="3"/>',
  bag: '<line x1="0" y1="131" x2="200" y2="131" ' + G + '/><line x1="162" y1="0" x2="162" y2="16" stroke="var(--mut)" stroke-width="2"/><rect x="152" y="16" width="20" height="82" rx="8" fill="var(--acc)" opacity=".85"/>'
};
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let cur = null, t0 = 0, raf = 0;
const L = (a, b, c) => a && b ? '<line x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '" stroke="' + (c || 'var(--ink)') + '" stroke-width="6" stroke-linecap="round"/>' : '';
function poseSvg(p, pr) {
  const M = p.M || [(p.N[0] + p.P[0]) / 2, (p.N[1] + p.P[1]) / 2], far = 'var(--far)';
  let kb = '';
  if (p.B) kb = '<circle cx="' + p.B[0].toFixed(1) + '" cy="' + (p.B[1] + 2).toFixed(1) + '" r="7" fill="var(--mut)"/><circle cx="' + p.B[0].toFixed(1) + '" cy="' + (p.B[1] - 6).toFixed(1) + '" r="3.5" fill="none" stroke="var(--mut)" stroke-width="2.5"/>';
  const db = (q, c) => q ? '<rect x="' + (q[0] - 9).toFixed(1) + '" y="' + (q[1] - 2).toFixed(1) + '" width="18" height="4" rx="2" fill="' + c + '"/><rect x="' + (q[0] - 10).toFixed(1) + '" y="' + (q[1] - 5).toFixed(1) + '" width="5" height="10" rx="1.5" fill="' + c + '"/><rect x="' + (q[0] + 5).toFixed(1) + '" y="' + (q[1] - 5).toFixed(1) + '" width="5" height="10" rx="1.5" fill="' + c + '"/>' : '';
  return (PROPS[pr] || PROPS.floor) + L(p.N, p.e, far) + L(p.e, p.w, far) + db(p.d, far) + L(p.P, p.k, far) + L(p.k, p.f, far) + L(p.f, p.t, far) + L(p.N, M) + L(M, p.P) + L(p.N, p.E) + L(p.E, p.W) + kb + db(p.D, 'var(--mut)') + L(p.P, p.K) + L(p.K, p.F) + L(p.F, p.T) + '<circle cx="' + p.H[0].toFixed(1) + '" cy="' + p.H[1].toFixed(1) + '" r="8.5" fill="var(--acc)"/>';
}
function frame(ts) {
  if (!cur) return;
  const n = cur.p.length, el = Math.max(0, ts - t0) / 1000 / cur.d, j = Math.floor(el) % n, f = el % 1, e = .5 - .5 * Math.cos(Math.PI * f);
  $('fig').innerHTML = poseSvg(mix(cur.p[j], cur.p[(j + 1) % n], e), cur.pr); raf = requestAnimationFrame(frame);
}
function anim(id) {
  const a = id && EX[id] && POSES[EX[id].anim];
  if (cur === a && a) return;
  cancelAnimationFrame(raf); cur = a || null;
  if (!a) { $('fig').innerHTML = PROPS.floor; return }
  t0 = performance.now();
  if (reduce) { $('fig').innerHTML = poseSvg(a.p[0], a.pr); return }
  raf = requestAnimationFrame(frame);
}

/* ---------- program kurulumu ---------- */
const avail = id => { const x = EX[id]; return x && (!x.eq || [].concat(x.eq).every(k => S.cfg.eq[k])) && (!x.flag || S.cfg.flags[x.flag]) };
const pick = it => it.alt && avail(it.alt) ? it.alt : it.ex;
function pullText(emom) {
  const l = S.pull.L;
  if (emom) return l === 0 ? '3 negatif' : l === 1 ? '1 tam + 2 negatif' : (l - 1) + '–' + l + ' tam';
  return l === 0 ? '5 negatif' : l < 5 ? l + ' tam + ' + (5 - l) + ' negatif' : l + ' tam';
}
/* zorluk geri bildirimi: S.adj[hareket] = seviye (-3..+4), her seviye ~%15 */
const FIXED = ['Isınma', 'Soğuma', 'Ayak bileği'];
const tunable = (id, grp) => !FIXED.includes(grp) && EX[id] && !EX[id].track && !['shadow', 'bag'].includes(id);
const lvl = id => (S.adj && S.adj[id]) || 0;
const scaleReps = (r, L) => !L || !/tekrar|dokunuş|sn tut|^\d+ \+ \d+$/.test(r) || /dinlen/.test(r) ? r : r.replace(/\d+/g, n => Math.max(1, Math.round(n * (1 + .15 * L))));
const scaleSec = (v, L) => L ? Math.max(10, Math.round(v * (1 + .15 * L) / 5) * 5) : v;
function mk(it, grp, emom, sw) {
  if (it.rest) return { k: 'rest', name: 'Dinlen', sec: it.rest, grp };
  let id = pick(it); if (!avail(id)) return null;
  for (let k = 0; k < 4 && sw && sw[id] && avail(sw[id]); k++) id = sw[id];
  const x = EX[id], kb = x.eq === 'kb' ? ' · ' + S.cfg.kbw + ' kg' : '';
  if (tunable(id, grp)) { const L = lvl(id); if (L) { it = { ...it }; if (it.reps) it.reps = scaleReps(it.reps, L); if (it.sec && !it.note) it.sec = scaleSec(it.sec, L) } }
  const s = { id, name: x.name + (it.side ? ' (' + it.side + ')' : ''), tip: x.tip, grp, side: it.side };
  if (emom) return { ...s, k: 'emom', sec: 60, det: (x.track === 'pull' ? pullText(true) : it.reps) + kb };
  if (it.sec) return { ...s, k: 'time', sec: it.sec, det: (it.note || it.sec + ' sn') + kb };
  const pt = x.track === 'pull' && PR.pull;
  return { ...s, k: 'work', det: (x.track === 'pull' ? pullText(false) : it.reps) + kb, ask: pt };
}
function build(dk, w, q, sw) {
  const half = n => q ? Math.max(1, Math.ceil(n / 2)) : n;
  const d = P.DAYS[dk]; let s = [];
  const add = (it, g, em) => { const x = mk(it, g, em, sw); if (x) s.push(x) };
  if (!d.noWarm) PR.warm.forEach(it => add(it, 'Isınma'));
  for (const b of d.blocks) {
    if (b.type === 'circuit') {
      const R = half(b.rounds(w)), rest = b.rest(w);
      for (let r = 1; r <= R; r++) { const g = (b.name || 'Devre') + ' ' + r + '/' + R; b.items.forEach(it => add(it, g)); if (r < R || b.restLast) add({ rest }, g) }
    } else if (b.type === 'emom') {
      const its = b.items.filter(it => avail(pick(it))), per = its.length, M0 = b.minutes(w), M = q ? Math.max(per, Math.round(M0 / 2 / per) * per) : M0;
      for (let i = 0; i < M; i++) add(its[i % per], 'Tur ' + (Math.floor(i / per) + 1) + '/' + Math.ceil(M / per) + ' · dk ' + (i + 1), true);
    } else if (b.type === 'rounds') {
      const R = half(b.rounds(w));
      for (let r = 1; r <= R; r++) { const g = 'Raund ' + r + '/' + R; s.push({ k: 'time', id: b.ex, name: EX[b.ex].name + ' · raund ' + r, tip: EX[b.ex].tip, sec: b.work, det: b.combos[(r - 1) % b.combos.length], grp: g }); if (r < R) add({ rest: b.rest }, g) }
    } else if (b.type === 'list') b.items.forEach(it => add(it, b.name || ''));
  }
  if (PR.ankle) P.ANKLE.forEach(it => add(it, 'Ayak bileği'));
  if (!d.noCool) P.COOL.forEach(it => add(q ? { ...it, sec: Math.min(it.sec, 20) } : it, 'Soğuma'));
  return s;
}

/* ---------- ilerleme ---------- */
const rot = () => PR.rotation(S.cfg.eq);
const isMain = h => !P.DAYS[h.d] || !P.DAYS[h.d].extra;
const mains = () => S.hist.filter(isMain);
const gapDays = () => { const m = mains()[0]; return m ? Math.floor((Date.now() - m.t) / DAY) : null };
const okCount = () => mains().filter(h => h.ok !== false).reduce((a, h) => a + (h.q ? .5 : 1), 0);
function autoWeek() { const ok = okCount(); let w = 1 + Math.floor(ok / rot().length); const g = gapDays(); if (g !== null && g > 10) w = Math.max(1, w - 1); return w }
const getWeek = () => Math.min(12, Math.max(1, autoWeek() + S.off));
const nextDay = () => { const r = rot(); return r[mains().length % r.length] };
const dayOk = k => { const d = P.DAYS[k]; return d && PR.days.includes(k) && (!d.needs || S.cfg.eq[d.needs]) };
const monday = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime() };

/* ---------- ses ---------- */
let ac = null, lock = null;
function beep(f, ms) { if (!S.cfg.beep) return; try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; o.connect(g); g.connect(ac.destination); g.gain.setValueAtTime(.25, ac.currentTime); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + ms / 1000); o.start(); o.stop(ac.currentTime + ms / 1000) } catch (e) {} }
function say(t) {
  if (!S.cfg.voice || !window.speechSynthesis) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'tr-TR'; u.rate = 1.05; const v = speechSynthesis.getVoices().find(v => /^tr/i.test(v.lang)); if (v) u.voice = v; speechSynthesis.speak(u) } catch (e) {}
}
const spoken = s => s.replace(/–/g, ' ile ').replace(/\+/g, ' artı ').replace(/·/g, ',');
async function wake(on) { try { if (on && !lock && navigator.wakeLock) lock = await navigator.wakeLock.request('screen'); if (!on && lock) { lock.release(); lock = null } } catch (e) {} }

/* ---------- oturum ---------- */
let short = false, lastT = 0, week = getWeek(), day = nextDay(), steps = [], i = -1, left = 0, total = 0, end = 0, remain = 0, timer = null, paused = false, skipped = new Set(), pulls = [], doneMsg = '', started = 0;
let prepUntil = 0, prepLeft = 0, prepRem = 0, swaps = {};
const PREP = 5;
const fmt = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
const running = () => i >= 0 && i < steps.length;
const dayName = d => P.DAYS[d].extra ? P.DAYS[d].title : d + ' günü';
/* süreli bir hareketten önce pozisyon almak için kısa hazırlık; dinlenmeden sonra ve EMOM dakikaları arasında gerekmez */
const needPrep = j => { const s = steps[j], p = steps[j - 1]; if (!S.cfg.prep || !s || s.k === 'rest' || s.k === 'work') return false; if (!p) return true; return p.k !== 'rest' && !(s.k === 'emom' && p.k === 'emom') };

function header() {
  const nd = nextDay(), r = rot(), keys = [...new Set(r)].concat(PR.days.filter(k => P.DAYS[k].extra && !r.includes(k))).filter(dayOk);
  $('prof').innerHTML = PROFS.map(x => '<button data-p="' + esc(x.id) + '" aria-pressed="' + (x.id === pid) + '">' + esc(x.name) + '</button>').join('');
  $('notes').innerHTML = PR.notes.concat(['Hafta kendiliğinden ilerler: hareketlerin en fazla dörtte birini atladığın her ' + r.length + ' antrenman 1 hafta sayılır. 10 günden uzun ara verirsen hafta bir geri gelir.', "Vaktim az: devre ve dakika sayısı yarıya iner, ısınma" + (PR.ankle ? ' ve ayak bileği rutini' : '') + " aynı kalır, soğuma kısalır. Sırayı ilerletir, haftaya yarım sayılır."]).map(t => '<p>' + esc(t) + '</p>').join('');
  document.title = 'Antrenman · ' + me().name;
  $('tabs').innerHTML = keys.map(d => '<button data-d="' + d + '" aria-pressed="' + (d === day) + '">' + (P.DAYS[d].extra ? esc(P.DAYS[d].title) : d + ' günü') + '<span class="s">' + (P.DAYS[d].extra ? 'ek gün' : esc(P.DAYS[d].title)) + (d === nd ? ' · sıradaki' : '') + '</span></button>').join('');
  $('rotinfo').textContent = me().name + ' · sıra: ' + r.join(' – ') + ', haftada ' + r.length + ' gün.';
  $('wv').textContent = week; $('qk').setAttribute('aria-pressed', short);
  const ok = okCount();
  $('nextinfo').textContent = 'Sayılan antrenman: ' + ok + ' · sonraki haftaya ' + Math.ceil(r.length - ok % r.length) + ' kaldı' + (PR.pull ? ' · barfiks seviyesi: ' + pullText(false) : '') + (S.off ? ' · hafta elle ayarlı' : '');
  const g = gapDays(), last = mains()[0], msg = [];
  if (g !== null && g > 10) msg.push(g + ' gündür ara verdin, hafta bir geri alındı. Dinlenmeleri ihtiyacın kadar uzat.');
  else if (g !== null && g >= 4) msg.push(g + ' gündür ara verdin. Program kaldığın yerden, ' + nd + ' gününden devam ediyor.');
  if (last && last.sk && last.sk.length) msg.push('Son antrenmanda atladığın: ' + last.sk.join(', ') + '.' + (last.ok === false ? ' O antrenman haftaya sayılmadı.' : ''));
  const pk = mains().filter(h => h.pn != null).slice(0, 2);
  if (pk.length === 2 && pk.every(h => h.pn >= 6)) msg.push('Son iki antrenmanda rahatsızlık 6/10 ve üstü. Bu hafta yükü artırma, zorlanınca Kolaylaştır\'a bas; geçmezse doktora danış.');
  $('alert').textContent = msg.join(' ');
}
function plan() {
  $('plan').innerHTML = steps.map((s, j) => '<li data-j="' + j + '" class="' + (s.k === 'rest' ? 'rs ' : '') + (j < i ? 'done' : j === i ? 'cur' : '') + '"><span class="n">' + (j + 1) + '</span><span>' + esc(s.name) + ' <span class="next">· ' + esc(s.grp) + '</span>' + (skipped.has(j) ? ' <span class="x">atlandı</span>' : '') + '</span><span class="v">' + esc(s.k === 'work' ? s.det : fmt(s.sec)) + '</span></li>').join('');
}
function load() { stop(); week = getWeek(); if (!dayOk(day)) day = nextDay(); swaps = {}; steps = build(day, week, short); i = -1; paused = false; skipped = new Set(); pulls = []; doneMsg = ''; started = 0; hideAsk(); $('after').hidden = true; achInit(); show(); header(); settings(); library(); stats(); resumeBar(); weekSum() }
function set(ph, cls, nm, dt, tp, af) { $('ph').textContent = ph; $('ph').className = 'phase' + (cls ? ' ' + cls : ''); $('nm').textContent = nm; $('dt').textContent = dt; $('tp').textContent = tp; $('af').textContent = af }
function show() {
  const s = steps[i]; $('tv').style.fontSize = ''; $('pb').style.width = (i < 0 ? 0 : Math.min(100, i / steps.length * 100)) + '%';
  $('plus').hidden = !(s && s.k !== 'work');
  /* antrenman sürerken gün/hafta seçimi gizlenir, sayaç ve düğmeler tek ekrana sığar */
  document.documentElement.classList.toggle('run', running());
  $('bk').hidden = $('ps').hidden = $('sk').hidden = !running();
  const ez = s && s.k !== 'rest' && EX[s.id] && EX[s.id].easy; $('ez').hidden = !(running() && ez && avail(ez));
  if (i >= steps.length) {
    const n = [...skipped].filter(j => steps[j].k !== 'rest').length;
    set('Bitti', '', 'Antrenman tamam', n ? n + ' hareket atlandı.' : 'Hiçbir hareketi atlamadın.', doneMsg, '');
    $('tv').textContent = '✓'; $('tl').textContent = ''; $('go').textContent = 'Sıradaki: ' + dayName(nextDay()); $('tag').textContent = ''; arc(1); anim('child'); plan(); return;
  }
  if (!s) {
    set('Hazır', '', (P.DAYS[day].extra ? P.DAYS[day].title : day + ' günü: ' + P.DAYS[day].title), steps.length + ' adım · yaklaşık ' + Math.round(est() / 60) + ' dk · hafta ' + week + (short ? ' · kısa' : ''), 'iPhone\'da sessiz modu kapat, yoksa ses çıkmaz.', 'İlk hareket: ' + steps[0].name);
    $('tv').textContent = '0:00'; $('tl').textContent = ''; $('go').textContent = 'Başla'; $('tag').textContent = 'İlk hareket'; arc(0); anim(steps[0].id); plan(); return;
  }
  const n = steps[i + 1];
  set(s.k === 'rest' ? 'Dinlenme' : s.k === 'emom' ? 'EMOM' : s.grp, s.k === 'rest' ? 'rest' : '', s.name, s.k === 'rest' ? 'Nefes al, su iç.' : s.det + (s.k === 'emom' ? ' · ' + s.grp : ''), s.tip || '', n ? 'Sonra: ' + n.name + (n.k === 'work' ? ' (' + n.det + ')' : '') : 'Son adım');
  $('go').textContent = s.k === 'work' ? 'Tamam, sonraki' : 'Bitti, geç'; $('ps').textContent = paused ? 'Devam' : 'Duraklat';
  if (s.k === 'rest' && n) { $('tag').textContent = 'Sıradaki: ' + n.name; anim(n.id) } else { $('tag').textContent = ''; anim(s.id) }
  if (s.k === 'work') { const d = s.det.split(' '); $('tv').textContent = d[0]; if (d[0].length > 3) $('tv').style.fontSize = '.7em'; $('tl').textContent = d.slice(1).join(' ') || 'tekrar'; arc(1) }
  else if (prepUntil) { $('ph').textContent = 'Hazırlan'; $('tl').textContent = 'hazırlan'; $('tv').textContent = prepLeft; arc(prepLeft / PREP) }
  else { $('tl').textContent = s.k === 'rest' ? 'dinlen' : 'kalan'; $('tv').textContent = fmt(left); arc(total ? left / total : 0) }
  plan();
}
const est = () => steps.reduce((a, s, j) => a + (s.sec || 45) + (needPrep(j) ? PREP : 0), 0);
function arc(f) { $('arc').style.strokeDashoffset = 326.7 * (1 - f) }
function stop() { clearInterval(timer); timer = null; prepUntil = 0; prepLeft = 0 }
function tick() {
  if (paused) return;
  if (prepUntil) {
    const p = Math.ceil((prepUntil - Date.now()) / 1000);
    if (p > 0) { if (p !== prepLeft) { prepLeft = p; if (p <= 3) beep(520, 90); show() } return }
    prepUntil = 0; prepLeft = 0; beep(880, 250); vib(60); if (end - Date.now() > 2000) say('Başla'); show();
  }
  const r = Math.max(0, Math.ceil((end - Date.now()) / 1000));
  if (r === left) return;
  left = r; $('tv').textContent = fmt(left); arc(total ? left / total : 0);
  const s = steps[i];
  if (left === 10 && s && s.k === 'rest') say('On saniye');
  else if (s && s.k === 'time' && total >= 20 && left === Math.floor(total / 2)) say('Yarısı geçti');
  if (left <= 3 && left > 0) { beep(660, 120); say(['', 'Bir', 'İki', 'Üç'][left]) }
  if (left <= 0) catchUp();
}
/* Ekran kilitliyken süreli adımlar geçtiyse aradaki adımları atla değil, tamamlanmış say ve doğru yerden devam et. */
function catchUp() {
  let over = Math.max(0, Date.now() - end), j = i + 1;
  while (j < steps.length && steps[j].k !== 'work' && over >= steps[j].sec * 1000) { over -= steps[j].sec * 1000; j++ }
  go(j, over);
}
function announce(s) {
  const n = steps[i + 1];
  const p = steps[i - 1], sw = p && p.id === s.id && p.side && s.side && p.side !== s.side ? 'Taraf değiştir. ' : '';
  if (s.k === 'rest') say('Dinlen. ' + s.sec + ' saniye.' + (n ? ' Sıradaki ' + n.name + (n.k === 'work' ? ', ' + spoken(n.det) : '') + '.' : ''));
  else if (s.k === 'work') say(sw + s.name + '. ' + spoken(s.det));
  else say(sw + (prepUntil && !sw ? 'Hazırlan. ' : '') + s.name + '. ' + (s.k === 'emom' ? spoken(s.det) : s.sec + ' saniye'));
}
const saveSess = () => write(SKEY(), { day, week, q: short, i, sk: [...skipped], pulls, started, sw: swaps, at: Date.now() });
const clearSess = () => drop(SKEY());
function go(j, over) {
  stop(); hideAsk(); i = j;
  if (!started) started = Date.now();
  if (i >= steps.length) { finish(); show(); renderLog(); header(); stats(); return }
  const s = steps[i];
  if (s.k !== 'work') {
    /* süre kendiliğinden bitince birkaç yüz ms gecikme olur; bu hazırlığı engellemesin. Ekran kilitliyken uzun gecikmede hazırlık atlanır. */
    const late = over || 0, pr = late < 1500 && needPrep(i) ? PREP : 0, now = Date.now();
    total = s.sec; end = now + (s.sec + pr) * 1000 - (pr ? 0 : late); prepUntil = pr ? now + pr * 1000 : 0; prepLeft = pr;
    left = pr ? s.sec : Math.max(0, Math.ceil((end - now) / 1000)); beep(s.k === 'rest' ? 440 : pr ? 520 : 880, 250); timer = setInterval(tick, 200)
  }
  else beep(880, 150);
  vib(60); announce(s); show(); saveSess(); $('resume').hidden = true;
}
function finish() {
  const work = steps.filter(s => s.k !== 'rest').length, list = [...skipped].map(j => steps[j]).filter(x => x.k !== 'rest'), n = list.length;
  const sk = [...new Set(list.map(x => x.name))];
  doneMsg = '';
  const best0 = S.pull.best || 0;
  if (pulls.length >= 3) {
    const tgt = S.pull.L === 0 ? 5 : S.pull.L, hits = pulls.filter(x => x >= tgt).length;
    if (S.pull.L > 0) S.pull.best = Math.max(S.pull.best, ...pulls);
    if (hits === pulls.length && S.pull.L < 12) { S.pull.L++; S.pull.fails = 0; doneMsg = 'Barfiks seviyesi yükseldi: artık ' + pullText(false) + '.' }
    else if (hits < pulls.length / 2) { S.pull.fails++; if (S.pull.fails >= 2 && S.pull.L > 0) { S.pull.L--; S.pull.fails = 0; doneMsg = 'Barfiks seviyesi bir indi, acele yok: ' + pullText(false) + '.' } else doneMsg = 'Barfikste hedef tutmadı, aynı seviyede devam.' }
    else doneMsg = 'Barfikste aynı seviyede devam: ' + pullText(false) + '.';
  }
  const min = Math.max(1, Math.round((Date.now() - (started || Date.now())) / 60000)), ez = Object.keys(swaps).filter(k => avail(swaps[k])).map(k => EX[k].name + ' → ' + EX[swaps[k]].name);
  S.hist.unshift({ d: day, w: week, q: short || undefined, t: Date.now(), min, sk, ns: n, ok: n / work <= .25, pu: pulls.length ? pulls : undefined, lv: PR.pull ? S.pull.L : undefined, ez: ez.length ? ez : undefined });
  S.hist = S.hist.slice(0, 500); const won = achCheck(); if (S.pull.L > 0 && best0 && S.pull.best > best0) won.unshift(['Yeni barfiks rekoru', S.pull.best + ' tam tekrar']); save(); clearSess();
  lastT = S.hist[0].t; cele(won); afterCard([...new Set(steps.filter((x, j) => !skipped.has(j) && x.k !== 'rest' && tunable(x.id, x.grp)).map(x => x.id))]);
  doneMsg = (doneMsg ? doneMsg + ' ' : '') + min + ' dakika sürdü.';
  beep(880, 300); setTimeout(() => beep(1100, 500), 320); vib([80, 60, 160]); say('Antrenman tamam. Eline sağlık.' + (won.length ? ' Tebrikler, ' + won[0][0] + '!' : '')); wake(false);
}
function resumeBar() {
  const s = read(SKEY(), null);
  if (!s || Date.now() - s.at > 6 * 36e5 || !dayOk(s.day)) { if (s) clearSess(); $('resume').hidden = true; return }
  $('resmsg').textContent = 'Yarım kalan antrenman var: ' + (P.DAYS[s.day].extra ? P.DAYS[s.day].title : s.day + ' günü') + (s.q ? ' (kısa)' : '') + ', ' + (s.i + 1) + '. adım.';
  $('resume').hidden = false;
}
$('resgo').onclick = () => {
  const s = read(SKEY(), null); if (!s) return;
  day = s.day; stop(); week = s.week; short = !!s.q; swaps = s.sw || {}; steps = build(day, week, short, swaps); skipped = new Set(s.sk); pulls = s.pulls || []; started = s.started || Date.now(); doneMsg = ''; paused = false;
  header(); wake(true); go(Math.min(s.i, steps.length - 1)); $('clock').scrollIntoView({ block: 'start', behavior: 'smooth' });
};
$('resno').onclick = () => { clearSess(); $('resume').hidden = true };
$('wsumx').onclick = () => { S.sumSeen = monday(Date.now()); save(); $('wsum').hidden = true };

/* ---------- geçmiş ve istatistik ---------- */
let delArm = -1;
function renderLog() {
  $('log').innerHTML = S.hist.length ? S.hist.slice(0, 30).map((h, k) => '<li><span>' + new Date(h.t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'short' }) + ' — ' + esc(P.DAYS[h.d] ? (P.DAYS[h.d].extra ? P.DAYS[h.d].title : h.d + ' günü') : h.d) + ', hafta ' + h.w + (h.q ? ', kısa' : '') + (h.min ? ', ' + h.min + ' dk' : '') + (h.pu ? ', barfiks: ' + h.pu.join('-') : '') + (h.ns ? ', ' + h.ns + ' hareket atlandı' : '') + (h.ez ? ', kolaylaştırıldı: ' + h.ez.join(', ') : '') + (h.pn != null ? ', rahatsızlık ' + h.pn + '/10' : '') + (h.ph ? ', 📷' : '') + (h.ok === false ? ' (haftaya sayılmadı)' : '') + '</span><button class="del" data-k="' + k + '">' + (delArm === k ? 'Silinsin mi?' : 'Sil') + '</button></li>').join('') : '<li><span>Henüz kayıt yok. İlk antrenmanı bitirince burada görünür.</span></li>';
}
$('log').addEventListener('click', e => {
  const b = e.target.closest('button.del'); if (!b) return; const k = +b.dataset.k;
  if (delArm !== k) { delArm = k; renderLog(); return }
  S.delT = (S.delT || []).concat(S.hist[k].t); S.hist.splice(k, 1); delArm = -1; save(); renderLog(); header(); stats();
});
/* seri: haftada en az (gün sayısı - 1) antrenman yapılan ardışık haftalar; bu hafta henüz dolmadıysa bozmaz */
function streakW() {
  const wk = monday(Date.now()), need = Math.max(1, rot().length - 1), c = n => { const a = wk - n * 7 * DAY; return S.hist.filter(h => h.t >= a && h.t < a + 7 * DAY).length };
  let st = c(0) >= need ? 1 : 0; for (let n = 1; n < 104; n++) { if (c(n) >= need) st++; else break } return st;
}
const totalMin = () => S.hist.reduce((a, h) => a + (h.min || 0), 0);
function stats() {
  const r = rot(), now = Date.now(), wk = monday(now), weeks = [];
  for (let n = 7; n >= 0; n--) { const a = wk - n * 7 * DAY, b = a + 7 * DAY; weeks.push({ a, c: S.hist.filter(h => h.t >= a && h.t < b).length }) }
  const thisW = weeks[7].c, mins = totalMin(), streak = streakW();
  const max = Math.max(r.length, ...weeks.map(x => x.c));
  $('kpi').innerHTML = [['Bu hafta', thisW + ' / ' + r.length], ['Toplam', S.hist.length + ' antrenman'], ['Süre', (mins >= 60 ? Math.floor(mins / 60) + ' sa ' : '') + (mins % 60) + ' dk'], ['Seri', streak + ' hafta']].concat(PR.pull ? [['Barfiks', pullText(false) + (S.pull.best ? ' · en iyi ' + S.pull.best : '')]] : []).map(x => '<div><span>' + x[0] + '</span><b>' + esc(x[1]) + '</b></div>').join('');
  $('weeks').innerHTML = weeks.map(x => '<div class="wkrow"><span>' + new Date(x.a).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + '</span><i><em style="width:' + (x.c / max * 100) + '%"></em></i><b>' + x.c + '</b></div>').join('');
  /* barfiks geçmişi: son 10 antrenmanın setleri, çubuk = toplam tekrar */
  const ph = PR.pull ? S.hist.filter(h => h.pu && h.pu.length).slice(0, 10) : [], pm = Math.max(1, ...ph.map(h => h.pu.reduce((a, b) => a + b, 0)));
  $('pullw').hidden = !ph.length;
  $('pullh').innerHTML = ph.map(h => { const t = h.pu.reduce((a, b) => a + b, 0); return '<div class="wkrow pr"><span>' + new Date(h.t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + '</span><i><em style="width:' + (t / pm * 100) + '%"></em></i><b>' + t + '</b><small>setler: ' + h.pu.join(' · ') + '</small></div>' }).join('');
  heat(); painChart(); badges();
}
/* ısı haritası: son 13 haftanın her günü bir kare, renk o günkü antrenman sayısı */
function heat() {
  const end = monday(Date.now()) + 7 * DAY, st = end - 13 * 7 * DAY, cnt = {}, td = new Date().setHours(0, 0, 0, 0);
  S.hist.forEach(h => { if (h.t >= st) { const d = new Date(h.t).setHours(0, 0, 0, 0); cnt[d] = (cnt[d] || 0) + 1 } });
  let html = '', n = 0;
  for (let t = st; t < end; t += DAY) { const d = new Date(t).setHours(0, 0, 0, 0), c = cnt[d] || 0; if (c) n++; html += '<i class="' + (d > td ? 'f' : c > 1 ? 'c2' : c ? 'c1' : '') + (d === td ? ' td' : '') + '" title="' + new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) + (c ? ': ' + c + ' antrenman' : '') + '"></i>' }
  $('heat').innerHTML = html; $('heatmsg').textContent = 'Son 3 ayda ' + n + ' gün antrenman.';
}
/* rahatsızlık (0–10): antrenman sonunda sorulur, son 12 kayıt gösterilir */
const painLv = v => v >= 7 ? 'hi' : v >= 4 ? 'md' : 'lo';
function painChart() {
  const ps = S.hist.filter(h => h.pn != null).slice(0, 12);
  $('painw').hidden = !ps.length; if (!ps.length) return;
  $('painh').innerHTML = ps.map(h => '<div class="wkrow"><span>' + new Date(h.t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + '</span><i><em class="' + painLv(h.pn) + '" style="width:' + Math.max(4, h.pn * 10) + '%"></em></i><b>' + h.pn + '</b></div>').join('');
  const avg = a => a.reduce((x, h) => x + h.pn, 0) / a.length, a = ps.slice(0, 3), b = ps.slice(3, 6);
  $('painmsg').textContent = avg(a) <= 2.5 ? 'Son üç antrenmanda düşük, iyi gidiyor.' : !b.length ? '' : avg(a) > avg(b) + .5 ? 'Son üç antrenmanda artıyor; yükü artırma, gerekirse Kolaylaştır\'a bas.' : avg(a) < avg(b) - .5 ? 'Son üç antrenmanda azalıyor.' : 'Son üç antrenmanda aynı seviyede.';
}
/* rozetler: ilk kez olan anlar; bir kez kazanılır */
const ACH = [
  ['n1', 'İlk antrenman', () => S.hist.length >= 1], ['n5', '5 antrenman', () => S.hist.length >= 5], ['n10', '10 antrenman', () => S.hist.length >= 10],
  ['n25', '25 antrenman', () => S.hist.length >= 25], ['n50', '50 antrenman', () => S.hist.length >= 50], ['n100', '100 antrenman', () => S.hist.length >= 100],
  ['s2', '2 hafta seri', () => streakW() >= 2], ['s4', '4 hafta seri', () => streakW() >= 4], ['s8', '8 hafta seri', () => streakW() >= 8], ['s12', '12 hafta seri', () => streakW() >= 12],
  ['h5', '5 saat antrenman', () => totalMin() >= 300], ['h20', '20 saat antrenman', () => totalMin() >= 1200],
  ['p1', 'İlk tam barfiks', () => PR.pull && S.pull.L >= 1], ['p5', '5 tam barfiks', () => PR.pull && S.pull.L >= 5], ['p10', '10 tam barfiks', () => PR.pull && S.pull.L >= 10]
];
function achCheck() { S.ach = S.ach || {}; const won = []; ACH.forEach(([k, t, f]) => { if (!S.ach[k] && f()) { S.ach[k] = Date.now(); won.push([t, '']) } }); return won }
/* güncellemeden önce kazanılmış olanlar kutlanmadan eklenir */
function achInit() { if (S.ach) return; S.ach = {}; ACH.forEach(([k, t, f]) => { if (f()) S.ach[k] = 1 }); save() }
function badges() {
  const list = ACH.filter(([k, , f]) => PR.pull || k[0] !== 'p');
  $('ach').innerHTML = list.map(([k, t]) => { const v = S.ach && S.ach[k]; return '<div class="' + (v ? 'on' : '') + '"><span aria-hidden="true">' + (v ? '★' : '☆') + '</span><b>' + esc(t) + '</b><small>' + (v ? (v > 1 ? new Date(v).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'kazanıldı') : 'henüz değil') + '</small></div>' }).join('');
  $('achmsg').textContent = (S.ach ? Object.keys(S.ach).filter(k => list.some(x => x[0] === k)).length : 0) + ' / ' + list.length + ' rozet.';
}
function cele(won) {
  $('cele').hidden = !won.length; if (!won.length) return;
  $('celet').textContent = won.length > 1 ? won.length + ' yeni başarı' : won[0][0];
  $('celel').innerHTML = won.map(w => '<li>' + esc(w[0]) + (w[1] ? ' · ' + esc(w[1]) : '') + '</li>').join('');
  $('cele').classList.remove('go'); void $('cele').offsetWidth; $('cele').classList.add('go');
}
/* haftalık özet: yeni haftanın ilk açılışında geçen hafta */
function weekSum() {
  const mw = monday(Date.now()), pw = mw - 7 * DAY, ppw = pw - 7 * DAY, h = S.hist.filter(x => x.t >= pw && x.t < mw), hp = S.hist.filter(x => x.t >= ppw && x.t < pw);
  if (!h.length || S.sumSeen === mw) { $('wsum').hidden = true; return }
  const m = h.reduce((a, x) => a + (x.min || 0), 0), pn = h.filter(x => x.pn != null), d = h.length - hp.length, last = h.find(x => x.lv != null);
  $('wsumt').textContent = 'Geçen hafta: ' + h.length + ' / ' + rot().length + ' antrenman' + (hp.length ? ' (' + (d > 0 ? '+' + d : d === 0 ? 'aynı' : d) + ')' : '') + ' · ' + m + ' dk'
    + (pn.length ? ' · rahatsızlık ort. ' + (pn.reduce((a, x) => a + x.pn, 0) / pn.length).toFixed(1) : '')
    + (PR.pull && last ? ' · barfiks: ' + (last.lv === 0 ? 'negatif' : last.lv + ' tam') : '') + '. ' + (h.length >= rot().length ? 'Hedef tamam, eline sağlık.' : h.length >= rot().length - 1 ? 'Seri devam ediyor.' : 'Bu hafta bir gün daha eklemeyi dene.');
  $('wsum').hidden = false;
}

/* ---------- hareket kütüphanesi ---------- */
function library() {
  const ids = new Set(); PR.days.filter(dayOk).forEach(d => build(d, week).forEach(s => s.id && ids.add(s.id)));
  $('lib').innerHTML = [...ids].map(id => { const a = POSES[EX[id].anim]; return '<button data-id="' + id + '"><svg viewBox="0 0 200 140" aria-hidden="true">' + (a ? poseSvg(a.p[a.p.length > 1 ? 1 : 0], a.pr) : '') + '</svg><span>' + esc(EX[id].name) + '</span></button>' }).join('');
}
/* hareket kartı: sekme değiştirmeden animasyon, ipucu ve hangi günlerde olduğu */
let lxRaf = 0;
function lxOpen(id) {
  const a = POSES[EX[id].anim], ds = PR.days.filter(dayOk).filter(d => build(d, week).some(s => s.id === id && !['Isınma', 'Soğuma'].includes(s.grp)));
  const grp = PR.days.filter(dayOk).map(d => build(d, week).find(s => s.id === id)).find(Boolean);
  $('lxn').textContent = EX[id].name; $('lxt').textContent = EX[id].tip;
  $('lxd').textContent = (ds.length ? 'Günler: ' + ds.map(dayName).join(', ') : grp ? grp.grp + ' bölümünde' : '') + (lvl(id) ? ' · zorluk ayarı ' + (lvl(id) > 0 ? '+' : '') + lvl(id) : '');
  $('lx').hidden = false; cancelAnimationFrame(lxRaf);
  if (!a) { $('lxfig').innerHTML = PROPS.floor; return }
  const st = performance.now(), n = a.p.length;
  const f = ts => { if ($('lx').hidden) return; const el = Math.max(0, ts - st) / 1000 / a.d, j = Math.floor(el) % n, e = .5 - .5 * Math.cos(Math.PI * (el % 1)); $('lxfig').innerHTML = poseSvg(mix(a.p[j], a.p[(j + 1) % n], e), a.pr); lxRaf = requestAnimationFrame(f) };
  $('lxfig').innerHTML = poseSvg(a.p[0], a.pr); if (!reduce) lxRaf = requestAnimationFrame(f);
}
const lxClose = () => { $('lx').hidden = true; cancelAnimationFrame(lxRaf) };
$('lib').addEventListener('click', e => { const b = e.target.closest('button'); if (b) lxOpen(b.dataset.id) });
$('lxx').onclick = lxClose;
$('lx').addEventListener('click', e => { if (e.target === $('lx')) lxClose() });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('lx').hidden) lxClose() });

/* ---------- barfiks sorusu ---------- */
function askPull() {
  const neg = S.pull.L === 0, max = neg ? 6 : Math.max(8, S.pull.L + 3);
  $('askq').textContent = neg ? 'Kaç negatif yaptın?' : 'Kaç tam barfiks çektin? (negatifler hariç)';
  $('askb').innerHTML = Array.from({ length: max + 1 }, (_, n) => '<button data-n="' + n + '">' + n + '</button>').join('');
  $('ask').hidden = false; say(neg ? 'Kaç negatif yaptın?' : 'Kaç tam çektin?');
}
function hideAsk() { $('ask').hidden = true }
$('askb').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; pulls.push(+b.dataset.n); go(i + 1) });

/* ---------- ayarlar ---------- */
const WD = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
let rmArm = '';
function settings() {
  const c = S.cfg;
  $('eq').innerHTML = PR.equip.map(k => '<label class="chk"><input type="checkbox" data-eq="' + k + '"' + (c.eq[k] ? ' checked' : '') + '> ' + esc(P.EQUIP[k].name) + '</label>' + (k === 'kb' && c.eq.kb ? '<label class="chk">Ağırlık <select id="kbw">' + P.EQUIP.kb.weights.map(w => '<option' + (w === c.kbw ? ' selected' : '') + '>' + w + '</option>').join('') + '</select> kg</label>' : '')).join('')
    + PR.flags.map(k => '<label class="chk"><input type="checkbox" data-fl="' + k + '"' + (c.flags[k] ? ' checked' : '') + '> ' + esc(P.FLAGS[k].name) + '</label>').join('')
    + '<label class="chk"><input type="checkbox" data-c="voice"' + (c.voice ? ' checked' : '') + '> Sesli koç</label><label class="chk"><input type="checkbox" data-c="beep"' + (c.beep ? ' checked' : '') + '> Bip sesleri</label>'
    + '<label class="chk"><input type="checkbox" data-c="prep"' + (c.prep ? ' checked' : '') + '> Süreli hareketten önce ' + PREP + ' sn hazırlan</label>'
    + (PR.pull ? '<label class="chk">Barfiks seviyesi <select id="pl">' + Array.from({ length: 13 }, (_, n) => '<option value="' + n + '"' + (n === S.pull.L ? ' selected' : '') + '>' + (n === 0 ? 'sadece negatif' : n + ' tam') + '</option>').join('') + '</select></label>' : '');
  $('remdays').innerHTML = WD.map((d, k) => '<label class="pill"><input type="checkbox" data-wd="' + (k + 1) + '"' + (c.rem.days.includes(k + 1) ? ' checked' : '') + '>' + d + '</label>').join('');
  $('remtime').value = c.rem.time;
  $('profs').innerHTML = PROFS.map(x => '<div class="prow"><input aria-label="Profil adı" data-ren="' + esc(x.id) + '" value="' + esc(x.name) + '" maxlength="20"><select data-tpl="' + esc(x.id) + '" aria-label="Program">' + Object.keys(P.TEMPLATES).map(t => '<option value="' + t + '"' + (t === x.tpl ? ' selected' : '') + '>' + esc(P.TEMPLATES[t].name) + '</option>').join('') + '</select>' + (PROFS.length > 1 ? '<button data-rm="' + esc(x.id) + '">' + (rmArm === x.id ? 'Silinsin mi?' : 'Sil') + '</button>' : '') + '</div>').join('');
  $('newtpl').innerHTML = Object.keys(P.TEMPLATES).map(t => '<option value="' + t + '">' + esc(P.TEMPLATES[t].name) + '</option>').join('');
}
$('eq').addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.eq) S.cfg.eq[t.dataset.eq] = t.checked;
  else if (t.dataset.fl) S.cfg.flags[t.dataset.fl] = t.checked;
  else if (t.dataset.c) S.cfg[t.dataset.c] = t.checked;
  else if (t.id === 'kbw') S.cfg.kbw = +t.value;
  else if (t.id === 'pl') { S.pull.L = +t.value; S.pull.fails = 0 }
  save(); if (!running()) load(); else { header(); settings() }
});
$('remdays').addEventListener('change', e => { const d = +e.target.dataset.wd; const a = new Set(S.cfg.rem.days); e.target.checked ? a.add(d) : a.delete(d); S.cfg.rem.days = [...a].sort(); save() });
$('remtime').onchange = e => { S.cfg.rem.time = e.target.value || '19:00'; save() };
$('remgo').onclick = () => {
  const days = S.cfg.rem.days; if (!days.length) { $('remmsg').textContent = 'En az bir gün seç.'; return }
  const [hh, mm] = S.cfg.rem.time.split(':').map(Number), now = new Date(), st = new Date(now);
  st.setHours(hh, mm, 0, 0); while (!days.includes((st.getDay() + 6) % 7 + 1) || st <= now) st.setDate(st.getDate() + 1);
  const p2 = n => String(n).padStart(2, '0'), ds = st.getFullYear() + p2(st.getMonth() + 1) + p2(st.getDate()) + 'T' + p2(hh) + p2(mm) + '00';
  const by = days.map(d => ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'][d - 1]).join(',');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//antrenman//TR', 'BEGIN:VEVENT', 'UID:antrenman-' + pid + '-' + Date.now() + '@antrenman', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z', 'DTSTART:' + ds, 'DURATION:PT45M', 'RRULE:FREQ=WEEKLY;BYDAY=' + by, 'SUMMARY:Antrenman · ' + me().name, 'DESCRIPTION:' + location.href.split('#')[0], 'BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', 'DESCRIPTION:Antrenman vakti', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  try { const a = document.createElement('a'); a.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics); a.download = 'antrenman-' + pid + '.ics'; document.body.appendChild(a); a.click(); a.remove(); $('remmsg').textContent = 'Takvim dosyası açıldı. Takvim uygulamasında Ekle\'ye bas.' } catch (e) { $('remmsg').textContent = 'Takvim dosyası burada açılamadı.' }
};

/* ---------- profil yönetimi ---------- */
function switchTo(id) { stop(); wake(false); pid = id; gal = null; PR = P.TEMPLATES[me().tpl]; write('antrenman.profile', pid); S = loadState(); write(KEY(), S); day = nextDay(); renderLog(); load() }
let swArm = 0; function confirmSwitch() { if (Date.now() - swArm < 4000) return true; swArm = Date.now(); $('alert').textContent = 'Antrenman sürüyor. Değiştirmek için tekrar bas, yarım kalan antrenman kaydedildi.'; return false }
$('prof').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.dataset.p === pid) return; if (running() && !confirmSwitch()) return; switchTo(b.dataset.p) });
$('profs').addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.ren) { const x = PROFS.find(p => p.id === t.dataset.ren); x.name = t.value.trim().slice(0, 20) || x.name; saveProfs(); header() }
  if (t.dataset.tpl) { const x = PROFS.find(p => p.id === t.dataset.tpl); x.tpl = t.value; saveProfs(); if (x.id === pid) switchTo(pid); else settings() }
});
$('profs').addEventListener('click', e => {
  const b = e.target.closest('button[data-rm]'); if (!b) return; const id = b.dataset.rm;
  if (rmArm !== id) { rmArm = id; settings(); return }
  rmArm = ''; write('antrenman.delp', read('antrenman.delp', []).concat(id)); PROFS = PROFS.filter(p => p.id !== id); saveProfs(); if (SY.enabled && SY.user()) SY.wipePhotos(id).catch(() => {}); drop('antrenman.v2.' + id); drop('antrenman.sess.' + id);
  if (pid === id) switchTo(PROFS[0].id); else { header(); settings() }
});
function addProfile(name, tpl) { const id = 'p' + Date.now().toString(36); PROFS.push({ id, name: name.trim().slice(0, 20), tpl }); saveProfs(); switchTo(id) }
$('newgo').onclick = () => { const n = $('newname').value; if (!n.trim()) { $('newname').focus(); return } addProfile(n, $('newtpl').value); $('newname').value = '' };
function who() {
  $('whob').innerHTML = PROFS.map(x => '<button data-p="' + esc(x.id) + '">' + esc(x.name) + '</button>').join('');
  $('whotpl').innerHTML = Object.keys(P.TEMPLATES).map(t => '<option value="' + t + '">' + esc(P.TEMPLATES[t].name) + '</option>').join('');
  $('who').hidden = false;
}
$('whob').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $('who').hidden = true; switchTo(b.dataset.p) });
$('whogo').onclick = () => { const n = $('whoname').value; if (!n.trim()) { $('whoname').focus(); return } $('who').hidden = true; addProfile(n, $('whotpl').value) };

/* ---------- yedek ---------- */
const dump = () => JSON.stringify({ app: 'antrenman', v: 3, profile: me(), at: new Date().toISOString(), data: S });
function restore(txt) {
  try { const o = JSON.parse(txt), d = o.data || o; if (!d.hist) throw 0; S = d; const df = defaults(); S.cfg = Object.assign(df.cfg, S.cfg || {}); S.pull = Object.assign(df.pull, S.pull || {}); save(); renderLog(); load(); $('bmsg').textContent = 'Yedek ' + me().name + ' profiline yüklendi: ' + S.hist.length + ' kayıt.' }
  catch (e) { $('bmsg').textContent = 'Bu metin geçerli bir yedek değil.' }
}
$('bdl').onclick = () => { try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([dump()], { type: 'application/json' })); a.download = 'antrenman-' + me().name + '-yedek-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); a.remove(); $('bmsg').textContent = 'Yedek dosyası indirildi. İnmediyse Kopyala\'yı kullan.' } catch (e) { $('bmsg').textContent = 'İndirme burada çalışmıyor, Kopyala\'yı kullan.' } };
$('bcp').onclick = async () => { try { await navigator.clipboard.writeText(dump()); $('bmsg').textContent = 'Yedek panoya kopyalandı. Notlar\'a ya da kendine e-postaya yapıştır.' } catch (e) { $('btx').value = dump(); $('bmsg').textContent = 'Kopyalanamadı. Yedek aşağıdaki kutuda, elle seçip kopyala.' } };
$('bfile').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(restore) };
$('bld').onclick = () => restore($('btx').value);

/* ---------- antrenman sonu: zorluk + fotoğraf ---------- */
let fbBase = {}, pick1 = null;
const FB = [[1, 'Kolay'], [0, 'İyi'], [-1, 'Zor']];
const nextVal = id => { const st = build(day, week, false, swaps).find(x => x.id === id && tunable(x.id, x.grp)); return st ? (st.k === 'work' || st.k === 'emom' ? st.det : fmt(st.sec)) : '' };
function afterCard(ids) {
  fbBase = {}; ids.forEach(id => fbBase[id] = lvl(id)); pick1 = null;
  $('fbl').innerHTML = ids.map(id => '<li data-id="' + id + '"><span><b>' + esc(EX[id].name) + '</b><small></small></span><span class="row">' + FB.map(([d, t]) => '<button data-d="' + d + '" aria-pressed="false">' + t + '</button>').join('') + '</span></li>').join('');
  $('fbw').hidden = !ids.length; fbRefresh();
  $('pnq').textContent = PR.ankle ? 'Ayak bileğin nasıl?' : 'Ağrı ya da rahatsızlık var mı?'; $('pnmsg').textContent = '';
  $('pn').innerHTML = Array.from({ length: 11 }, (_, n) => '<button data-n="' + n + '" class="' + painLv(n) + '" aria-pressed="false">' + n + '</button>').join('');
  $('phprev').hidden = true; $('phsave').hidden = true; $('phmsg').textContent = ''; $('phin').value = '';
  $('phbox').hidden = !SY.enabled;
  $('after').hidden = false;
}
function fbRefresh() { $('fbl').querySelectorAll('li').forEach(li => { const id = li.dataset.id, d = lvl(id) - fbBase[id]; li.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.d === d && (d !== 0 || li.dataset.set === '1'))); li.querySelector('small').textContent = 'Sonraki sefer: ' + nextVal(id) }) }
$('fbl').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; const li = b.closest('li'), id = li.dataset.id;
  S.adj = S.adj || {}; const v = Math.max(-3, Math.min(4, fbBase[id] + +b.dataset.d)); if (v) S.adj[id] = v; else delete S.adj[id];
  li.dataset.set = '1'; save(); fbRefresh();
});
/* fotoğraf: tarayıcıda yeniden çizilir (konum ve cihaz bilgisi gibi gizli veriler silinir), küçültülür */
function shrink(file, edge, max) {
  return new Promise((ok, no) => {
    const u = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      URL.revokeObjectURL(u); const k = Math.min(1, edge / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
      c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      for (let q = .82; q > .3; q -= .1) { const d = c.toDataURL('image/jpeg', q); if (d.length < max) return ok(d) }
      no(new Error('Fotoğraf çok büyük.'));
    };
    im.onerror = () => { URL.revokeObjectURL(u); no(new Error('Bu dosya açılamadı.')) }; im.src = u;
  });
}
$('phin').onchange = async () => {
  const f = $('phin').files[0]; if (!f) return; $('phmsg').textContent = 'Hazırlanıyor…';
  try { pick1 = { full: await shrink(f, 1280, 850000), th: await shrink(f, 320, 70000) }; $('phprev').src = pick1.th; $('phprev').hidden = false; $('phsave').hidden = false; $('phmsg').textContent = 'Kaydedince sadece sen görebilirsin.' }
  catch (e) { pick1 = null; $('phmsg').textContent = e.message }
};
$('phsave').onclick = async () => {
  if (!pick1) return; if (!SY.user()) { $('phmsg').textContent = 'Fotoğraf için giriş yapman gerekiyor.'; return }
  $('phsave').disabled = true; $('phmsg').textContent = 'Kaydediliyor…'; const slow = setTimeout(() => $('phmsg').textContent = 'İnternet bekleniyor, uygulamayı kapatma…', 15000);
  try { await SY.addPhoto(lastT, pid, pick1.th, pick1.full); const h = S.hist.find(x => x.t === lastT); if (h) { h.ph = true; save(); renderLog() } pick1 = null; gal = null; $('phsave').hidden = true; $('phmsg').textContent = 'Fotoğraf kaydedildi. İlerleme sekmesinde görürsün.' }
  catch (e) { $('phmsg').textContent = 'Kaydedilemedi: ' + SY.msg(e) }
  clearTimeout(slow); $('phsave').disabled = false;
};
$('afterx').onclick = () => { $('after').hidden = true };
$('pn').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; const n = +b.dataset.n, h = S.hist.find(x => x.t === lastT); if (!h) return;
  h.pn = n; save(); renderLog(); header(); stats();
  $('pn').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
  $('pnmsg').textContent = n >= 7 ? 'Yüksek. Keskin ağrı ya da bir gecede inmeyen şişlik olursa o hareketleri bırak ve doktora sor.' : n >= 4 ? 'Orta. Sonraki antrenmanda zorlanan harekette Kolaylaştır\'a bas.' : 'Kaydedildi.';
});

/* galeri (İlerleme sekmesi) — fotoğraflar cihaza kaydedilmez, açılınca hesaptan okunur */
let gal = null, galShow = 12, pvId = '', pvArm = 0;
async function gallery() {
  if (!SY.enabled) { $('galw').hidden = true; return }
  $('galw').hidden = false;
  if (!SY.user()) { $('gal').innerHTML = ''; $('galmsg').textContent = 'Giriş yapınca fotoğrafların burada görünür.'; return }
  if (!gal) { $('galmsg').textContent = 'Yükleniyor…'; try { gal = await SY.listPhotos(pid) } catch (e) { $('galmsg').textContent = 'Fotoğraflar açılamadı: ' + SY.msg(e); return } }
  const day = t => new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: '2-digit' });
  $('gal').innerHTML = gal.slice(0, galShow).map(x => '<button data-id="' + esc(x.id) + '"><img alt="" src="' + esc(x.th) + '"><span>' + day(x.t) + '</span></button>').join('');
  $('galmsg').textContent = gal.length ? (gal.length > galShow ? '' : gal.length + ' fotoğraf.') : 'Henüz fotoğraf yok. Antrenman bitince ekleyebilirsin.';
  $('galmore').hidden = gal.length <= galShow;
}
$('galmore').onclick = () => { galShow += 12; gallery() };
$('gal').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return; const x = gal.find(g => g.id === b.dataset.id); if (!x) return;
  pvId = x.id; pvArm = 0; $('pvdel').textContent = 'Sil'; $('pvimg').src = x.th; $('pvt').textContent = new Date(x.t).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' }); $('pv').hidden = false;
  try { const full = await SY.fullPhoto(x.id); if (full && pvId === x.id) $('pvimg').src = full } catch (e) {}
});
const pvClose = () => { $('pv').hidden = true; $('pvimg').removeAttribute('src'); pvId = '' };
$('pvx').onclick = pvClose;
$('pvdel').onclick = async () => {
  if (Date.now() - pvArm > 4000) { pvArm = Date.now(); $('pvdel').textContent = 'Kalıcı silinsin mi? Tekrar bas'; return }
  const id = pvId, x = gal.find(g => g.id === id); $('pvdel').textContent = 'Siliniyor…';
  try { await SY.delPhoto(id); gal = gal.filter(g => g.id !== id); if (x && !gal.some(g => g.t === x.t)) { const h = S.hist.find(h => h.t === x.t); if (h) { delete h.ph; save(); renderLog() } } pvClose(); gallery() }
  catch (e) { $('pvdel').textContent = 'Silinemedi: ' + SY.msg(e) }
};

/* ---------- düğmeler ---------- */
$('tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (running() && !confirmSwitch()) return; day = b.dataset.d; load() });
$('qk').onclick = () => { if (running() && !confirmSwitch()) return; short = !short; load() };
$('wm').onclick = () => { if (getWeek() > 1) { S.off--; save(); load() } };
$('wp').onclick = () => { if (getWeek() < 12) { S.off++; save(); load() } };
$('go').onclick = () => {
  if (i >= steps.length) { day = nextDay(); load(); window.scrollTo(0, 0); return }
  if (i < 0) { wake(true); if (window.speechSynthesis) speechSynthesis.getVoices(); $('after').hidden = true }
  paused = false;
  if (steps[i] && steps[i].ask && $('ask').hidden) { askPull(); return }
  go(i + 1); if (i === 0) $('clock').scrollIntoView({ block: 'start', behavior: 'smooth' });
};
$('ez').onclick = () => {
  if (!running()) return; const id = steps[i].id, e = EX[id] && EX[id].easy; if (!e || !avail(e)) return;
  swaps[id] = e; steps = build(day, week, short, swaps); paused = false; go(i);
  $('alert').textContent = EX[id].name + ' bu antrenman boyunca ' + EX[e].name + ' ile değişti.';
};
$('sk').onclick = () => { if (!running()) return; skipped.add(i); paused = false; go(i + 1) };
$('bk').onclick = () => { if (i > 0) { skipped.delete(i - 1); if (steps[i - 1].ask && pulls.length) pulls.pop(); paused = false; go(i - 1) } };
$('ps').onclick = () => {
  if (!running()) return;
  paused = !paused;
  const now = Date.now();
  if (paused) { remain = end - now; prepRem = prepUntil ? prepUntil - now : 0 } else { end = now + remain; if (prepUntil) prepUntil = now + prepRem }
  $('ps').textContent = paused ? 'Devam' : 'Duraklat';
};
$('plus').onclick = () => { if (!running() || steps[i].k === 'work') return; if (paused) remain += 15000; else end += 15000; total += 15; left += 15; $('tv').textContent = fmt(left) };
$('plan').addEventListener('click', e => {
  const li = e.target.closest('li'); if (!li) return; const j = +li.dataset.j;
  if (i < 0) wake(true);
  if (j > i) { for (let x = Math.max(i, 0); x < j; x++) if (steps[x].k !== 'rest') skipped.add(x) } else for (let x = j; x <= i; x++) skipped.delete(x);
  paused = false; go(j); window.scrollTo({ top: 0, behavior: 'smooth' });
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && running()) { wake(true); tick() } });
$('updgo').onclick = () => location.reload();

/* ---------- sekmeler ---------- */
const VIEWS = ['antrenman', 'ilerleme', 'hareketler', 'ayarlar'];
function showView(v, push) {
  if (!VIEWS.includes(v)) v = 'antrenman';
  document.querySelectorAll('.view').forEach(x => x.hidden = x.dataset.v !== v);
  $('ttl').textContent = { antrenman: 'Antrenman', ilerleme: 'İlerleme', hareketler: 'Hareketler', ayarlar: 'Ayarlar' }[v];
  document.querySelectorAll('#tabbar button').forEach(b => b.dataset.v === v ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  if (push && location.hash !== '#' + v) history.replaceState(null, '', '#' + v);
  write('antrenman.view', v); window.scrollTo(0, 0); if (v === 'ilerleme') gallery();
}
$('tabbar').addEventListener('click', e => { const b = e.target.closest('button'); if (b) showView(b.dataset.v, true) });
window.addEventListener('hashchange', () => showView(location.hash.slice(1)));
showView(location.hash.slice(1) || read('antrenman.view', 'antrenman'));

/* ---------- hesap ve bulut eşitleme ---------- */
function snapshot() { const st = {}; PROFS.forEach(x => { const v = read('antrenman.v2.' + x.id, null); if (v) st[x.id] = v }); return { v: 1, profiles: PROFS, delp: read('antrenman.delp', []), states: st } }
function mergeState(a, b) {
  if (!a) return b; if (!b) return a;
  const n = (a.mod || 0) >= (b.mod || 0) ? a : b, o = n === a ? b : a, del = new Set([...(a.delT || []), ...(b.delT || [])]), seen = new Map();
  [...a.hist, ...b.hist].forEach(h => { if (!del.has(h.t) && !seen.has(h.t)) seen.set(h.t, h) });
  return { ...n, hist: [...seen.values()].sort((x, y) => y.t - x.t).slice(0, 500), delT: [...del].slice(-500), pull: { ...n.pull, best: Math.max(a.pull ? a.pull.best || 0 : 0, b.pull ? b.pull.best || 0 : 0) } };
}
function merge(l, r) {
  if (!r) return l;
  const delp = [...new Set([...(l.delp || []), ...(r.delp || [])])], profs = [];
  [...(r.profiles || []), ...l.profiles].forEach(x => { if (!delp.includes(x.id) && !profs.find(y => y.id === x.id) && P.TEMPLATES[x.tpl]) profs.push(x) });
  const states = {}; profs.forEach(x => { const m = mergeState(l.states[x.id], (r.states || {})[x.id]); if (m) states[x.id] = m });
  return { v: 1, profiles: profs.length ? profs : l.profiles, delp, states };
}
function applySnap(m) {
  write('antrenman.delp', m.delp); PROFS = m.profiles; write('antrenman.profiles', PROFS);
  for (const id in m.states) write('antrenman.v2.' + id, m.states[id]);
  if (!PROFS.find(x => x.id === pid)) pid = PROFS[0].id;
  if (!running() && $('after').hidden) { PR = P.TEMPLATES[me().tpl]; write('antrenman.profile', pid); S = loadState(); day = nextDay(); renderLog(); load() } else { const st = m.states[pid]; if (st) S.hist = st.hist; header() }
}
function cloud() { if (!SY.enabled || syncing || !SY.user()) return; acct('Kaydediliyor…'); SY.push(snapshot, e => { if (e) acct('Buluta yazılamadı: ' + SY.msg(e)); else { lastSync = Date.now(); acct() } }) }
async function fullSync() {
  if (!SY.user()) return; syncing = true; acct('Eşitleniyor…');
  try { const r = await SY.pull(), fresh = read('antrenman.fresh', false), m = fresh && r ? merge({ ...r, delp: r.delp || [], states: r.states || {} }, null) : merge(snapshot(), r); drop('antrenman.fresh'); applySnap(m); await SY.pushNow(m); lastSync = Date.now(); acct() }
  catch (e) { acct('Eşitleme olmadı: ' + SY.msg(e)) }
  syncing = false;
}
function acct(status) {
  if (!SY.enabled) { $('acct').hidden = true; return }
  $('acct').hidden = false; const u = SY.user();
  $('acout').hidden = !!u; $('acin').hidden = !u;
  if (u) $('acwho').textContent = (u.email || 'Google hesabı') + ' ile giriş yapıldı.';
  $('acstat').textContent = status || (u ? (lastSync ? 'Son eşitleme ' + new Date(lastSync).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) + '. Kayıtlar bu hesaba bağlı her cihazda.' : '') : 'Giriş yapınca kayıtların buluta yedeklenir ve diğer cihazlarla eşitlenir.');
  $('acbadge').textContent = u ? '☁ ' + (u.email || 'bulut') : 'Giriş yapılmadı';
}
/* zorunlu giriş: hesap yoksa uygulama açılmaz. Cihazda başka bir hesabın kayıtları varsa yeni hesaba karışmaz, silinir. */
const gate = on => { $('gate').hidden = !on; document.documentElement.classList.toggle('lock', on); if (on) $('who').hidden = true };
const gmsg = t => { $('gmsg').textContent = t || '' };
function wipeLocal() { try { Object.keys(localStorage).filter(k => /^(antrenman\.|ant_)/.test(k)).forEach(k => localStorage.removeItem(k)) } catch (e) {} }
let whoDone = false;
if (!SY.enabled) document.documentElement.classList.remove('lock');
if (SY.enabled) {
  if (!read('antrenman.uid', null)) { gate(true); gmsg('Bağlanıyor…') }
  SY.onUser(u => {
    if (u) {
      const own = read('antrenman.owner', null);
      if (own && own !== u.uid) { wipeLocal(); write('antrenman.owner', u.uid); write('antrenman.uid', u.uid); write('antrenman.fresh', true); location.reload(); return }
      write('antrenman.owner', u.uid); write('antrenman.uid', u.uid); gate(false); gmsg();
      if (firstRun && !whoDone) { whoDone = true; who() }
      fullSync();
    } else { drop('antrenman.uid'); gal = null; pvClose(); gate(true); gmsg() }
    acct();
  });
  SY.init().catch(() => { acct('Hesap servisine ulaşılamadı. İnternet bağlantını kontrol et.'); gmsg(read('antrenman.uid', null) ? '' : 'İlk giriş için internet bağlantısı gerekiyor.') });
  const gm = () => $('gmail').value, gp = () => $('gpass').value, runG = (f, ok) => { gmsg('Bekle…'); f().then(() => ok && gmsg(ok)).catch(e => gmsg(SY.msg(e))) };
  $('gg').onclick = () => runG(() => SY.google());
  $('glogin').onclick = () => runG(() => SY.login(gm(), gp()));
  $('gsign').onclick = () => runG(() => SY.signup(gm(), gp()));
  $('greset').onclick = () => { if (!gm().trim()) { gmsg('Önce e-postanı yaz.'); return } runG(() => SY.reset(gm()), 'Şifre sıfırlama bağlantısı e-postana gönderildi.') };
  const em = () => $('acmail').value, pw = () => $('acpass').value, run = (f, ok) => { acct('Bekle…'); f().then(() => ok && acct(ok)).catch(e => acct(SY.msg(e))) };
  $('acg').onclick = () => run(() => SY.google());
  $('aclogin').onclick = () => run(() => SY.login(em(), pw()));
  $('acsign').onclick = () => run(() => SY.signup(em(), pw()), 'Hesap açıldı.');
  $('acreset').onclick = () => { if (!em().trim()) { acct('Önce e-postanı yaz.'); return } run(() => SY.reset(em()), 'Şifre sıfırlama bağlantısı e-postana gönderildi.') };
  $('aclogout').onclick = () => run(async () => { try { await SY.pushNow(snapshot()) } catch (e) {} return SY.logout() }, 'Çıkış yapıldı.');
  $('acsyncnow').onclick = () => fullSync();
  let rmA = 0; $('acdel').onclick = () => { if (Date.now() - rmA > 4000) { rmA = Date.now(); $('acdel').textContent = 'Emin misin? Tekrar bas'; return } run(() => SY.remove(), 'Hesap ve buluttaki kayıtlar silindi. Bu cihazdaki kayıtlar duruyor.'); $('acdel').textContent = 'Hesabı sil' };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && SY.user() && !running() && Date.now() - lastSync > 60e3) fullSync() });
}
acct();

renderLog(); load(); if (firstRun && (!SY.enabled || read('antrenman.uid', null))) { whoDone = true; who() }
try {
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !/claude|claudeusercontent/.test(location.host)) navigator.serviceWorker.register('sw.js').then(reg => {
    reg.addEventListener('updatefound', () => { const n = reg.installing; n && n.addEventListener('statechange', () => { if (n.state === 'activated' && navigator.serviceWorker.controller) $('upd').hidden = false }) });
    setInterval(() => reg.update().catch(() => {}), 30 * 60e3);
  });
} catch (e) {}
}
