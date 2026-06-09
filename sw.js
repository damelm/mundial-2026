/* sw.js — Service Worker · Mundial 2026 (offline + caché). */
const VERSION = "v1";
const SHELL = "shell-" + VERSION;
const RUNTIME = "runtime-" + VERSION;

// App shell (rutas relativas al scope /mundial-2026/)
const SHELL_ASSETS = [
  "./", "index.html", "styles.css", "app.js", "i18n.js", "i18n-content.js", "themes.js",
  "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Datos del fixture → network-first (datos frescos), cae a caché si no hay red.
  if (url.pathname.endsWith("/data/fixture.json")) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(RUNTIME).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // APIs externas en vivo (geo) → solo red, sin cachear.
  if (url.hostname === "ipapi.co") { return; }

  // Banderas y fuentes → cache-first (inmutables).
  if (url.hostname === "flagcdn.com" || url.hostname === "fonts.gstatic.com" || url.hostname === "fonts.googleapis.com") {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(RUNTIME).then((c) => c.put(req, copy));
        return res;
      }).catch(() => hit))
    );
    return;
  }

  // App shell mismo-origen → cache-first con actualización en segundo plano.
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then((hit) => {
        const net = fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(req, copy));
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
