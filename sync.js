/* Bulut eşitleme (Firebase Auth + Firestore). config.js içindeki FIREBASE_CONFIG boşsa devre dışı kalır.
   Veri: users/{uid} belgesi = { snap: JSON metni, at: zaman }. Kurallar: herkes sadece kendi belgesini okur/yazar. */
window.SYNC = (() => {
  const cfg = window.FIREBASE_CONFIG;
  if (!cfg || !cfg.apiKey) return { enabled: false };
  const V = '10.12.2', base = 'https://www.gstatic.com/firebasejs/' + V + '/';
  const load = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s) });
  let auth = null, db = null, user = null, ready = null, timer = null, listeners = [];
  const emit = () => listeners.forEach(f => { try { f(user) } catch (e) {} });
  function init() {
    if (ready) return ready;
    ready = load(base + 'firebase-app-compat.js').then(() => Promise.all([load(base + 'firebase-auth-compat.js'), load(base + 'firebase-firestore-compat.js')])).then(() => {
      firebase.initializeApp(cfg); auth = firebase.auth(); db = firebase.firestore();
      auth.languageCode = 'tr';
      return auth.getRedirectResult().catch(() => null).then(() => new Promise(ok => { let first = true; auth.onAuthStateChanged(u => { user = u; emit(); if (first) { first = false; ok() } }) }));
    });
    return ready;
  }
  const TR = {
    'auth/invalid-email': 'E-posta adresi geçersiz.', 'auth/missing-password': 'Şifre yaz.', 'auth/weak-password': 'Şifre en az 6 karakter olmalı.',
    'auth/email-already-in-use': 'Bu e-postayla zaten hesap var, Giriş yap\'a bas.', 'auth/invalid-credential': 'E-posta ya da şifre yanlış.', 'auth/wrong-password': 'E-posta ya da şifre yanlış.',
    'auth/user-not-found': 'Bu e-postayla hesap yok, Hesap aç\'a bas.', 'auth/too-many-requests': 'Çok fazla deneme oldu, biraz sonra tekrar dene.', 'auth/network-request-failed': 'İnternet bağlantısı yok.',
    'auth/popup-blocked': 'Açılır pencere engellendi. E-posta ile giriş yap.', 'auth/popup-closed-by-user': 'Giriş penceresi kapandı.', 'auth/unauthorized-domain': 'Bu adres Firebase\'de izinli değil.'
  };
  const msg = e => TR[e && e.code] || (e && e.message) || 'Bir hata oldu.';
  return {
    enabled: true,
    init,
    onUser(f) { listeners.push(f) },
    user: () => user,
    msg,
    async google() { await init(); const p = new firebase.auth.GoogleAuthProvider(); const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone; try { return await auth.signInWithPopup(p) } catch (e) { if (standalone && e.code === 'auth/popup-blocked') return auth.signInWithRedirect(p); throw e } },
    async login(email, pass) { await init(); return auth.signInWithEmailAndPassword(email.trim(), pass) },
    async signup(email, pass) { await init(); return auth.createUserWithEmailAndPassword(email.trim(), pass) },
    async reset(email) { await init(); auth.languageCode = 'tr'; return auth.sendPasswordResetEmail(email.trim()) },
    async logout() { await init(); return auth.signOut() },
    async remove() { await init(); if (!user) return; await db.collection('users').doc(user.uid).delete(); return user.delete() },
    async pull() { await init(); if (!user) return null; const d = await db.collection('users').doc(user.uid).get(); if (!d.exists) return null; try { return JSON.parse(d.data().snap) } catch (e) { return null } },
    async pushNow(snap) { await init(); if (!user) return; await db.collection('users').doc(user.uid).set({ snap: JSON.stringify(snap), at: firebase.firestore.FieldValue.serverTimestamp(), email: user.email || '' }) },
    push(getSnap, cb) { if (!user) return; clearTimeout(timer); timer = setTimeout(() => this.pushNow(getSnap()).then(() => cb && cb(null)).catch(e => cb && cb(e)), 1500) }
  };
})();
