const CACHE_NAME = 'corrida-chat-v4';
const ASSETS = ['./', './index.html', './styles.css', './mode.css', './app.js', './manifest.json', './icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const isAppAsset = [
    /\/app\.js$/,
    /\/styles\.css$/,
    /\/mode\.css$/,
    /\/index\.html$/,
    /\/manifest\.json$/
  ].some(pattern => pattern.test(event.request.url));

  if (isAppAsset) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});