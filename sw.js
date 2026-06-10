/* sw.js — Service Worker · Mundial 2026
 * Estrategia: NETWORK-FIRST para la app (siempre lo último si hay internet),
 * con caché solo como respaldo OFFLINE. Banderas/fuentes cache-first.
 * Así el mantenimiento se ve al instante y no queda pegada una versión vieja.
 */
const VERSION = "v3";
const SHELL = "shell-" + VERSION;
const RUNTIME = "runtime-" + VERSION;

const SHELL_ASSETS = [
  "./", "index.html", "styles.css", "app.js", "i18n.js", "i18n-content.js", "themes.js",
  "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => { if (e.data === "skip-waiting") self.skipWaiting(); });

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // APIs en vivo (geolocalización) → solo red, sin cachear.
  if (url.hostname === "ipapi.co") return;

  // Banderas y fuentes → cache-first (recursos inmutables, ahorra datos).
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

  // Mismo origen (HTML/CSS/JS/JSON) → NETWORK-FIRST: siempre lo último online,
  // y se actualiza la caché; si no hay red, sirve la caché (offline).
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(SHELL).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match("./")))
    );
  }
});
