/* Çevrimdışı çalışma. Dosyaları değiştirdiğinde VERSION'u bir artır. */
const VERSION = 'antrenman-v9';
const FILES = ['./', 'index.html', 'app.js', 'program.js', 'config.js', 'sync.js', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES))); self.skipWaiting() });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))); self.clients.claim() });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.origin === location.origin) {
    // önce ağ (güncel sürüm), ağ yoksa önbellek
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); return r }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
  } else if (/fonts\.(googleapis|gstatic)\.com/.test(u.host) || (u.host === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/'))) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(n => { const c = n.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); return n })));
  }
});
