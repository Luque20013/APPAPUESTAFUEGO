// Service worker mínimo: red primero, y si no hay internet muestra la última versión guardada.
const CACHE = 'icefire-v2';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || !r.url.startsWith('http')) return;
  const u = new URL(r.url);
  // Firestore/Auth siempre en vivo
  if (u.hostname.includes('googleapis.com') && !u.hostname.includes('fonts')) return;
  if (u.hostname.includes('firebaseio') || u.hostname.includes('identitytoolkit')) return;
  e.respondWith(
    fetch(r).then((res) => { const c = res.clone(); caches.open(CACHE).then((x) => x.put(r, c)).catch(() => {}); return res; })
      .catch(() => caches.match(r).then((m) => m || caches.match('./')))
  );
});
