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
  for (const k in P.EQUIP) eq[k] = PR.equip.includes(k) && P.EQUIP[k].on;
  for (const k in P.FLAGS) flags[k] = P.FLAGS[k].on;
  return { hist: [], off: 0, pull: { L: 0, fails: 0, best: 0 }, cfg: { eq, flags, kbw: P.EQUIP.kb.weight, voice: true, beep: true, rem: { days: [1, 3, 5, 6], time: '19:00' } } };
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
  floor: '<rect x="30" y="130" width="160" height="4" rx="2" fill="var(--redsoft)"/><line x1="0" y1="131" x2="200" y2="131" ' + G + '/>',
  chair: '<line x1="0" y1="131" x2="200" y2="131" ' + G + '/><path d="M76 56V131M76 95H104M102 95V131" stroke="var(--mut)" stroke-width="3" fill="none"/><rect x="110" y="126" width="44" height="4" rx="2" fill="var(--red)"/>',
  wall: '<line x1="0" y1="131" x2="200" y2="131" ' + G + '/><line x1="131" y1="0" x2="131" y2="131" stroke="var(--mut)" stroke-width="4"/>',
  wallL: '<line x1="0" y1="131" x2="200" y2="131" ' + G + '/><line x1="69" y1="0" x2="69" y2="131" stroke="var(--mut)" stroke-width="4"/>',
  bag: '<line x1="0" y1="131" x2="200" y2="131" ' + G + '/><line x1="162" y1="0" x2="162" y2="16" stroke="var(--mut)" stroke-width="2"/><rect x="152" y="16" width="20" height="82" rx="8" fill="var(--red)" opacity=".85"/>'
};
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let cur = null, t0 = 0, raf = 0;
const L = (a, b, c) => a && b ? '<line x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '" stroke="' + (c || 'var(--ink)') + '" stroke-width="6" stroke-linecap="round"/>' : '';
function poseSvg(p, pr) {
  const M = p.M || [(p.N[0] + p.P[0]) / 2, (p.N[1] + p.P[1]) / 2], far = 'var(--far)';
  let kb = '';
  if (p.B) kb = '<circle cx="' + p.B[0].toFixed(1) + '" cy="' + (p.B[1] + 2).toFixed(1) + '" r="7" fill="var(--mut)"/><circle cx="' + p.B[0].toFixed(1) + '" cy="' + (p.B[1] - 6).toFixed(1) + '" r="3.5" fill="none" stroke="var(--mut)" stroke-width="2.5"/>';
  return (PROPS[pr] || PROPS.floor) + L(p.N, p.e, far) + L(p.e, p.w, far) + L(p.P, p.k, far) + L(p.k, p.f, far) + L(p.f, p.t, far) + L(p.N, M) + L(M, p.P) + L(p.N, p.E) + L(p.E, p.W) + kb + L(p.P, p.K) + L(p.K, p.F) + L(p.F, p.T) + '<circle cx="' + p.H[0].toFixed(1) + '" cy="' + p.H[1].toFixed(1) + '" r="8.5" fill="var(--red)"/>';
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
const avail = id => { const x = EX[id]; return x && (!x.eq || S.cfg.eq[x.eq]) && (!x.flag || S.cfg.flags[x.flag]) };
const pick = it => it.alt && avail(it.alt) ? it.alt : it.ex;
function pullText(emom) {
  const l = S.pull.L;
  if (emom) return l === 0 ? '3 negatif' : l === 1 ? '1 tam + 2 negatif' : (l - 1) + '–' + l + ' tam';
  return l === 0 ? '5 negatif' : l < 5 ? l + ' tam + ' + (5 - l) + ' negatif' : l + ' tam';
}
function mk(it, grp, emom) {
  if (it.rest) return { k: 'rest', name: 'Dinlen', sec: it.rest, grp };
  const id = pick(it); if (!avail(id)) return null;
  const x = EX[id], kb = x.eq === 'kb' ? ' · ' + S.cfg.kbw + ' kg' : '';
  const s = { id, name: x.name + (it.side ? ' (' + it.side + ')' : ''), tip: x.tip, grp };
  if (emom) return { ...s, k: 'emom', sec: 60, det: (x.track === 'pull' ? pullText(true) : it.reps) + kb };
  if (it.sec) return { ...s, k: 'time', sec: it.sec, det: (it.note || it.sec + ' sn') + kb };
  const pt = x.track === 'pull' && PR.pull;
  return { ...s, k: 'work', det: (x.track === 'pull' ? pullText(false) : it.reps) + kb, ask: pt };
}
function build(dk, w) {
  const d = P.DAYS[dk]; let s = [];
  const add = (it, g, em) => { const x = mk(it, g, em); if (x) s.push(x) };
  if (!d.noWarm) PR.warm.forEach(it => add(it, 'Isınma'));
  for (const b of d.blocks) {
    if (b.type === 'circuit') {
      const R = b.rounds(w), rest = b.rest(w);
      for (let r = 1; r <= R; r++) { const g = (b.name || 'Devre') + ' ' + r + '/' + R; b.items.forEach(it => add(it, g)); if (r < R || b.restLast) add({ rest }, g) }
    } else if (b.type === 'emom') {
      const its = b.items.filter(it => avail(pick(it))), M = b.minutes(w), per = its.length;
      for (let i = 0; i < M; i++) add(its[i % per], 'Tur ' + (Math.floor(i / per) + 1) + '/' + Math.ceil(M / per) + ' · dk ' + (i + 1), true);
    } else if (b.type === 'rounds') {
      const R = b.rounds(w);
      for (let r = 1; r <= R; r++) { const g = 'Raund ' + r + '/' + R; s.push({ k: 'time', id: b.ex, name: EX[b.ex].name + ' · raund ' + r, tip: EX[b.ex].tip, sec: b.work, det: b.combos[(r - 1) % b.combos.length], grp: g }); if (r < R) add({ rest: b.rest }, g) }
    } else if (b.type === 'list') b.items.forEach(it => add(it, b.name || ''));
  }
  if (PR.ankle) P.ANKLE.forEach(it => add(it, 'Ayak bileği'));
  if (!d.noCool) P.COOL.forEach(it => add(it, 'Soğuma'));
  return s;
}

/* ---------- ilerleme ---------- */
const rot = () => PR.rotation(S.cfg.eq);
const isMain = h => !P.DAYS[h.d] || !P.DAYS[h.d].extra;
const mains = () => S.hist.filter(isMain);
const gapDays = () => { const m = mains()[0]; return m ? Math.floor((Date.now() - m.t) / DAY) : null };
function autoWeek() { const ok = mains().filter(h => h.ok !== false).length; let w = 1 + Math.floor(ok / rot().length); const g = gapDays(); if (g !== null && g > 10) w = Math.max(1, w - 1); return w }
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
let week = getWeek(), day = nextDay(), steps = [], i = -1, left = 0, total = 0, end = 0, remain = 0, timer = null, paused = false, skipped = new Set(), pulls = [], doneMsg = '', started = 0;
const fmt = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
const running = () => i >= 0 && i < steps.length;

function header() {
  const nd = nextDay(), r = rot(), keys = [...new Set(r)].concat(PR.days.filter(k => P.DAYS[k].extra && !r.includes(k))).filter(dayOk);
  $('prof').innerHTML = PROFS.map(x => '<button data-p="' + esc(x.id) + '" aria-pressed="' + (x.id === pid) + '">' + esc(x.name) + '</button>').join('');
  $('notes').innerHTML = PR.notes.concat(['Hafta kendiliğinden ilerler: hareketlerin en fazla dörtte birini atladığın her ' + r.length + ' antrenman 1 hafta sayılır. 10 günden uzun ara verirsen hafta bir geri gelir.']).map(t => '<p>' + esc(t) + '</p>').join('');
  document.title = 'Antrenman · ' + me().name;
  $('tabs').innerHTML = keys.map(d => '<button data-d="' + d + '" aria-pressed="' + (d === day) + '">' + (P.DAYS[d].extra ? esc(P.DAYS[d].title) : d + ' günü') + '<span class="s">' + (P.DAYS[d].extra ? 'ek gün' : esc(P.DAYS[d].title)) + (d === nd ? ' · sıradaki' : '') + '</span></button>').join('');
  $('rotinfo').textContent = me().name + ' · sıra: ' + r.join(' – ') + ', haftada ' + r.length + ' gün.';
  $('wv').textContent = week;
  const ok = mains().filter(h => h.ok !== false).length;
  $('nextinfo').textContent = 'Sayılan antrenman: ' + ok + ' · sonraki haftaya ' + (r.length - ok % r.length) + ' kaldı' + (PR.pull ? ' · barfiks seviyesi: ' + pullText(false) : '') + (S.off ? ' · hafta elle ayarlı' : '');
  const g = gapDays(), last = mains()[0], msg = [];
  if (g !== null && g > 10) msg.push(g + ' gündür ara verdin, hafta bir geri alındı. Dinlenmeleri ihtiyacın kadar uzat.');
  else if (g !== null && g >= 4) msg.push(g + ' gündür ara verdin. Program kaldığın yerden, ' + nd + ' gününden devam ediyor.');
  if (last && last.sk && last.sk.length) msg.push('Son antrenmanda atladığın: ' + last.sk.join(', ') + '.' + (last.ok === false ? ' O antrenman haftaya sayılmadı.' : ''));
  $('alert').textContent = msg.join(' ');
}
function plan() {
  $('plan').innerHTML = steps.map((s, j) => '<li data-j="' + j + '" class="' + (s.k === 'rest' ? 'rs ' : '') + (j < i ? 'done' : j === i ? 'cur' : '') + '"><span class="n">' + (j + 1) + '</span><span>' + esc(s.name) + ' <span class="next">· ' + esc(s.grp) + '</span>' + (skipped.has(j) ? ' <span class="x">atlandı</span>' : '') + '</span><span class="v">' + esc(s.k === 'work' ? s.det : fmt(s.sec)) + '</span></li>').join('');
}
function load() { stop(); week = getWeek(); if (!dayOk(day)) day = nextDay(); steps = build(day, week); i = -1; paused = false; skipped = new Set(); pulls = []; doneMsg = ''; started = 0; hideAsk(); show(); header(); settings(); library(); stats(); resumeBar() }
function set(ph, cls, nm, dt, tp, af) { $('ph').textContent = ph; $('ph').className = 'phase' + (cls ? ' ' + cls : ''); $('nm').textContent = nm; $('dt').textContent = dt; $('tp').textContent = tp; $('af').textContent = af }
function show() {
  const s = steps[i]; $('pb').style.width = (i < 0 ? 0 : Math.min(100, i / steps.length * 100)) + '%';
  $('plus').hidden = !(s && s.k !== 'work');
  if (i >= steps.length) {
    const n = [...skipped].filter(j => steps[j].k !== 'rest').length;
    set('Bitti', '', 'Antrenman tamam', n ? n + ' hareket atlandı.' : 'Hiçbir hareketi atlamadın.', doneMsg, '');
    $('tv').textContent = '✓'; $('tl').textContent = ''; $('go').textContent = 'Baştan'; $('tag').textContent = ''; arc(1); anim('child'); plan(); return;
  }
  if (!s) {
    set('Hazır', '', (P.DAYS[day].extra ? P.DAYS[day].title : day + ' günü: ' + P.DAYS[day].title), steps.length + ' adım · yaklaşık ' + Math.round(est() / 60) + ' dk · hafta ' + week, 'iPhone\'da sessiz modu kapat, yoksa ses çıkmaz.', 'İlk hareket: ' + steps[0].name);
    $('tv').textContent = '0:00'; $('tl').textContent = ''; $('go').textContent = 'Başla'; $('tag').textContent = 'İlk hareket'; arc(0); anim(steps[0].id); plan(); return;
  }
  const n = steps[i + 1];
  set(s.k === 'rest' ? 'Dinlenme' : s.k === 'emom' ? 'EMOM' : s.grp, s.k === 'rest' ? 'rest' : '', s.name, s.k === 'rest' ? 'Nefes al, su iç.' : s.det + (s.k === 'emom' ? ' · ' + s.grp : ''), s.tip || '', n ? 'Sonra: ' + n.name + (n.k === 'work' ? ' (' + n.det + ')' : '') : 'Son adım');
  $('go').textContent = s.k === 'work' ? 'Tamam, sonraki' : 'Bitti, geç'; $('ps').textContent = paused ? 'Devam' : 'Duraklat';
  if (s.k === 'rest' && n) { $('tag').textContent = 'Sıradaki: ' + n.name; anim(n.id) } else { $('tag').textContent = ''; anim(s.id) }
  if (s.k === 'work') { const d = s.det.split(' '); $('tv').textContent = d[0]; $('tl').textContent = d.slice(1).join(' ') || 'tekrar'; arc(1) }
  else { $('tl').textContent = s.k === 'rest' ? 'dinlen' : 'kalan'; $('tv').textContent = fmt(left); arc(total ? left / total : 0) }
  plan();
}
const est = () => steps.reduce((a, s) => a + (s.sec || 45), 0);
function arc(f) { $('arc').style.strokeDashoffset = 326.7 * (1 - f) }
function stop() { clearInterval(timer); timer = null }
function tick() {
  if (paused) return;
  const r = Math.max(0, Math.ceil((end - Date.now()) / 1000));
  if (r === left) return;
  left = r; $('tv').textContent = fmt(left); arc(total ? left / total : 0);
  const s = steps[i];
  if (left === 10 && s && s.k === 'rest') say('On saniye');
  if (left <= 3 && left > 0) beep(660, 120);
  if (left <= 0) go(i + 1);
}
function announce(s) {
  const n = steps[i + 1];
  if (s.k === 'rest') say('Dinlen. ' + s.sec + ' saniye. Sıradaki ' + (n ? n.name : ''));
  else if (s.k === 'work') say(s.name + '. ' + spoken(s.det));
  else say(s.name + '. ' + (s.k === 'emom' ? spoken(s.det) : s.sec + ' saniye'));
}
const saveSess = () => write(SKEY(), { day, week, i, sk: [...skipped], pulls, started, at: Date.now() });
const clearSess = () => drop(SKEY());
function go(j) {
  stop(); hideAsk(); i = j;
  if (!started) started = Date.now();
  if (i >= steps.length) { finish(); show(); renderLog(); header(); stats(); return }
  const s = steps[i];
  if (s.k !== 'work') { left = total = s.sec; end = Date.now() + s.sec * 1000; beep(s.k === 'rest' ? 440 : 880, 250); timer = setInterval(tick, 200) }
  else beep(880, 150);
  vib(60); announce(s); show(); saveSess(); $('resume').hidden = true;
}
function finish() {
  const work = steps.filter(s => s.k !== 'rest').length, list = [...skipped].map(j => steps[j]).filter(x => x.k !== 'rest'), n = list.length;
  const sk = [...new Set(list.map(x => x.name))];
  doneMsg = '';
  if (pulls.length >= 3) {
    const tgt = S.pull.L === 0 ? 5 : S.pull.L, hits = pulls.filter(x => x >= tgt).length;
    if (S.pull.L > 0) S.pull.best = Math.max(S.pull.best, ...pulls);
    if (hits === pulls.length && S.pull.L < 12) { S.pull.L++; S.pull.fails = 0; doneMsg = 'Barfiks seviyesi yükseldi: artık ' + pullText(false) + '.' }
    else if (hits < pulls.length / 2) { S.pull.fails++; if (S.pull.fails >= 2 && S.pull.L > 0) { S.pull.L--; S.pull.fails = 0; doneMsg = 'Barfiks seviyesi bir indi, acele yok: ' + pullText(false) + '.' } else doneMsg = 'Barfikste hedef tutmadı, aynı seviyede devam.' }
    else doneMsg = 'Barfikste aynı seviyede devam: ' + pullText(false) + '.';
  }
  const min = Math.max(1, Math.round((Date.now() - (started || Date.now())) / 60000));
  S.hist.unshift({ d: day, w: week, t: Date.now(), min, sk, ns: n, ok: n / work <= .25, pu: pulls.length ? pulls : undefined, lv: PR.pull ? S.pull.L : undefined });
  S.hist = S.hist.slice(0, 500); save(); clearSess();
  doneMsg = (doneMsg ? doneMsg + ' ' : '') + min + ' dakika sürdü.';
  beep(880, 300); setTimeout(() => beep(1100, 500), 320); vib([80, 60, 160]); say('Antrenman tamam. Eline sağlık.'); wake(false);
}
function resumeBar() {
  const s = read(SKEY(), null);
  if (!s || Date.now() - s.at > 6 * 36e5 || !dayOk(s.day)) { if (s) clearSess(); $('resume').hidden = true; return }
  $('resmsg').textContent = 'Yarım kalan antrenman var: ' + (P.DAYS[s.day].extra ? P.DAYS[s.day].title : s.day + ' günü') + ', ' + (s.i + 1) + '. adım.';
  $('resume').hidden = false;
}
$('resgo').onclick = () => {
  const s = read(SKEY(), null); if (!s) return;
  day = s.day; stop(); week = s.week; steps = build(day, week); skipped = new Set(s.sk); pulls = s.pulls || []; started = s.started || Date.now(); doneMsg = ''; paused = false;
  header(); wake(true); go(Math.min(s.i, steps.length - 1));
};
$('resno').onclick = () => { clearSess(); $('resume').hidden = true };

/* ---------- geçmiş ve istatistik ---------- */
let delArm = -1;
function renderLog() {
  $('log').innerHTML = S.hist.length ? S.hist.slice(0, 30).map((h, k) => '<li><span>' + new Date(h.t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'short' }) + ' — ' + esc(P.DAYS[h.d] ? (P.DAYS[h.d].extra ? P.DAYS[h.d].title : h.d + ' günü') : h.d) + ', hafta ' + h.w + (h.min ? ', ' + h.min + ' dk' : '') + (h.pu ? ', barfiks: ' + h.pu.join('-') : '') + (h.ns ? ', ' + h.ns + ' hareket atlandı' : '') + (h.ok === false ? ' (haftaya sayılmadı)' : '') + '</span><button class="del" data-k="' + k + '">' + (delArm === k ? 'Silinsin mi?' : 'Sil') + '</button></li>').join('') : '<li><span>Henüz kayıt yok. İlk antrenmanı bitirince burada görünür.</span></li>';
}
$('log').addEventListener('click', e => {
  const b = e.target.closest('button.del'); if (!b) return; const k = +b.dataset.k;
  if (delArm !== k) { delArm = k; renderLog(); return }
  S.delT = (S.delT || []).concat(S.hist[k].t); S.hist.splice(k, 1); delArm = -1; save(); renderLog(); header(); stats();
});
function stats() {
  const r = rot(), now = Date.now(), wk = monday(now), weeks = [];
  for (let n = 7; n >= 0; n--) { const a = wk - n * 7 * DAY, b = a + 7 * DAY; weeks.push({ a, c: S.hist.filter(h => h.t >= a && h.t < b).length }) }
  const thisW = weeks[7].c, mins = S.hist.reduce((a, h) => a + (h.min || 0), 0), need = Math.max(1, r.length - 1);
  let streak = thisW >= need ? 1 : 0; for (let n = 6; n >= 0; n--) { if (weeks[n].c >= need) streak++; else break }
  const max = Math.max(r.length, ...weeks.map(x => x.c));
  $('kpi').innerHTML = [['Bu hafta', thisW + ' / ' + r.length], ['Toplam', S.hist.length + ' antrenman'], ['Süre', (mins >= 60 ? Math.floor(mins / 60) + ' sa ' : '') + (mins % 60) + ' dk'], ['Seri', streak + ' hafta']].concat(PR.pull ? [['Barfiks', pullText(false) + (S.pull.best ? ' · en iyi ' + S.pull.best : '')]] : []).map(x => '<div><span>' + x[0] + '</span><b>' + esc(x[1]) + '</b></div>').join('');
  $('weeks').innerHTML = weeks.map(x => '<div class="wkrow"><span>' + new Date(x.a).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + '</span><i><em style="width:' + (x.c / max * 100) + '%"></em></i><b>' + x.c + '</b></div>').join('');
}

/* ---------- hareket kütüphanesi ---------- */
function library() {
  const ids = new Set(); PR.days.filter(dayOk).forEach(d => build(d, week).forEach(s => s.id && ids.add(s.id)));
  $('lib').innerHTML = [...ids].map(id => { const a = POSES[EX[id].anim]; return '<button data-id="' + id + '"><svg viewBox="0 0 200 140" aria-hidden="true">' + (a ? poseSvg(a.p[a.p.length > 1 ? 1 : 0], a.pr) : '') + '</svg><span>' + esc(EX[id].name) + '</span></button>' }).join('');
}
$('lib').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; const id = b.dataset.id;
  if (running()) { $('libmsg').textContent = 'Antrenman sürerken önizleme kapalı.'; return }

  showView('antrenman', true); anim(id); set('Önizleme', '', EX[id].name, '', EX[id].tip, 'Başla\'ya basınca günün antrenmanı başlar.'); $('tag').textContent = 'Önizleme'; $('libmsg').textContent = '';
});

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
function switchTo(id) { stop(); wake(false); pid = id; PR = P.TEMPLATES[me().tpl]; write('antrenman.profile', pid); S = loadState(); write(KEY(), S); day = nextDay(); renderLog(); load() }
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
  rmArm = ''; write('antrenman.delp', read('antrenman.delp', []).concat(id)); PROFS = PROFS.filter(p => p.id !== id); saveProfs(); drop('antrenman.v2.' + id); drop('antrenman.sess.' + id);
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

/* ---------- düğmeler ---------- */
$('tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (running() && !confirmSwitch()) return; day = b.dataset.d; load() });
$('wm').onclick = () => { if (getWeek() > 1) { S.off--; save(); load() } };
$('wp').onclick = () => { if (getWeek() < 12) { S.off++; save(); load() } };
$('go').onclick = () => {
  if (i >= steps.length) { load(); return }
  if (i < 0) { wake(true); if (window.speechSynthesis) speechSynthesis.getVoices() }
  paused = false;
  if (steps[i] && steps[i].ask && $('ask').hidden) { askPull(); return }
  go(i + 1);
};
$('sk').onclick = () => { if (!running()) return; skipped.add(i); paused = false; go(i + 1) };
$('bk').onclick = () => { if (i > 0) { skipped.delete(i - 1); if (steps[i - 1].ask && pulls.length) pulls.pop(); paused = false; go(i - 1) } };
$('ps').onclick = () => {
  if (!running()) return;
  paused = !paused;
  if (paused) remain = end - Date.now(); else end = Date.now() + remain;
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
  document.querySelectorAll('#tabbar button').forEach(b => b.dataset.v === v ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  if (push && location.hash !== '#' + v) history.replaceState(null, '', '#' + v);
  write('antrenman.view', v); window.scrollTo(0, 0);
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
  if (!running()) { PR = P.TEMPLATES[me().tpl]; write('antrenman.profile', pid); S = loadState(); day = nextDay(); renderLog(); load() } else { const st = m.states[pid]; if (st) S.hist = st.hist; header() }
}
function cloud() { if (!SY.enabled || syncing || !SY.user()) return; acct('Kaydediliyor…'); SY.push(snapshot, e => { if (e) acct('Buluta yazılamadı: ' + SY.msg(e)); else { lastSync = Date.now(); acct() } }) }
async function fullSync() {
  if (!SY.user()) return; syncing = true; acct('Eşitleniyor…');
  try { const r = await SY.pull(), m = merge(snapshot(), r); applySnap(m); await SY.pushNow(m); lastSync = Date.now(); acct() }
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
if (SY.enabled) {
  SY.onUser(u => { acct(); if (u) fullSync() });
  SY.init().catch(() => acct('Hesap servisine ulaşılamadı. İnternet bağlantını kontrol et.'));
  const em = () => $('acmail').value, pw = () => $('acpass').value, run = (f, ok) => { acct('Bekle…'); f().then(() => ok && acct(ok)).catch(e => acct(SY.msg(e))) };
  $('acg').onclick = () => run(() => SY.google());
  $('aclogin').onclick = () => run(() => SY.login(em(), pw()));
  $('acsign').onclick = () => run(() => SY.signup(em(), pw()), 'Hesap açıldı.');
  $('acreset').onclick = () => { if (!em().trim()) { acct('Önce e-postanı yaz.'); return } run(() => SY.reset(em()), 'Şifre sıfırlama bağlantısı e-postana gönderildi.') };
  $('aclogout').onclick = () => run(() => SY.logout(), 'Çıkış yapıldı. Kayıtlar bu cihazda kalmaya devam ediyor.');
  $('acsyncnow').onclick = () => fullSync();
  let rmA = 0; $('acdel').onclick = () => { if (Date.now() - rmA > 4000) { rmA = Date.now(); $('acdel').textContent = 'Emin misin? Tekrar bas'; return } run(() => SY.remove(), 'Hesap ve buluttaki kayıtlar silindi. Bu cihazdaki kayıtlar duruyor.'); $('acdel').textContent = 'Hesabı sil' };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && SY.user() && !running() && Date.now() - lastSync > 60e3) fullSync() });
}
acct();

renderLog(); load(); if (firstRun) who();
try {
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !/claude|claudeusercontent/.test(location.host)) navigator.serviceWorker.register('sw.js').then(reg => {
    reg.addEventListener('updatefound', () => { const n = reg.installing; n && n.addEventListener('statechange', () => { if (n.state === 'activated' && navigator.serviceWorker.controller) $('upd').hidden = false }) });
    setInterval(() => reg.update().catch(() => {}), 30 * 60e3);
  });
} catch (e) {}
}
