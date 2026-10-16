/* Saliou Évolution: app shell cache, versioned to retire old assets. */
const CACHE = 'saliou-evolution-vercel-v17';
const CORE = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/saliou-portrait.jpg', '/saliou-profile.jpg'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(CORE.map(path => cache.add(path)));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('saliou-evolution-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'CACHE_ASSETS' || !Array.isArray(event.data.urls)) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(event.data.urls.filter(url => {
      try { const u = new URL(url); return u.origin === self.location.origin && !u.pathname.startsWith('/api/'); }
      catch { return false; }
    }).map(url => cache.add(url)));
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request);
      if (response.ok && !response.headers.get('cache-control')?.includes('no-store')) cache.put(request, response.clone()).catch(() => {});
      return response;
    } catch (error) {
      const cached = await cache.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const shell = await cache.match('/');
        if (shell) return shell;
      }
      throw error;
    }
  })());
});
