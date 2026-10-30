// Offline support: app files are cached on install; fonts and the image library are cached the first time they load.
// Bump VERSION whenever index.html changes so phones pick up the new build.
const VERSION = "v1";
const CACHE = "clockout-receipt-" + VERSION;
const APP_FILES = ["./", "index.html", "manifest.json", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // the page itself: network first so updates show up, cache when offline
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put("index.html", copy)); return res; })
        .catch(() => caches.match("index.html"))
    );
    return;
  }

  // everything else (icons, fonts, html2canvas): cache first
  const cacheable = url.origin === location.origin
    || url.hostname === "fonts.googleapis.com"
    || url.hostname === "fonts.gstatic.com"
    || url.hostname === "cdnjs.cloudflare.com";
  if (!cacheable) return;
  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
