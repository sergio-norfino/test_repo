const CACHE = "measurelab-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./formulas.js",
  "./guides.js",
  "./manifest.webmanifest",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./guides/tape-neck.svg",
  "./guides/tape-chest.svg",
  "./guides/tape-waist.svg",
  "./guides/tape-hips.svg",
  "./guides/tape-arm.svg",
  "./guides/tape-thigh.svg",
  "./guides/skin-chest.svg",
  "./guides/skin-midaxillary.svg",
  "./guides/skin-triceps.svg",
  "./guides/skin-subscapular.svg",
  "./guides/skin-abdomen.svg",
  "./guides/skin-suprailiac.svg",
  "./guides/skin-thigh.svg",
  "./guides/map-front.svg",
  "./guides/map-back.svg",
  "./guides/map-side.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  );
});
