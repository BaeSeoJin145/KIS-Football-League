// ============================================
// KFL Service Worker (PWA Offline & Caching)
// ============================================

const CACHE_NAME = 'kfl-app-v1';
const STATIC_ASSETS = [
  './',
  'index.html',
  'matches.html',
  'match-detail.html',
  'standings.html',
  'players.html',
  'highlights.html',
  'admin.html',
  'manifest.json',
  'css/variables.css',
  'css/base.css',
  'css/layout.css',
  'css/components.css',
  'css/pages.css',
  'css/animations.css',
  'js/config.js',
  'js/mock-data.js',
  'js/supabase.js',
  'js/utils.js',
  'js/components.js',
  'js/realtime.js',
  'js/notifications.js',
  'js/home.js',
  'js/matches.js',
  'js/match-detail.js',
  'js/standings.js',
  'js/players.js',
  'js/highlights.js',
  'js/admin.js',
  'assets/icons/icon-192.svg',
  'assets/icons/icon-512.svg'
];

// Install: Cache critical static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network First for API / CDN, Cache First for local static files
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Supabase API or CDN: Network first, fall back to offline if failed
  if (url.hostname.includes('supabase.co') || url.hostname.includes('jsdelivr.net') || url.hostname.includes('googleapis.com')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Local assets: Stale-while-revalidate / Cache First
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch and update cache in background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        return networkResponse;
      });
    })
  );
});
