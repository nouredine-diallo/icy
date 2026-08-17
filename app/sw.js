// Cache minimal du shell -- la Console doit se charger en moins d'une
// seconde meme hors ligne (dernier etat en cache). Rien d'autre : pas de
// mise en cache des reponses du gateway, qui doivent toujours etre fraiches.

const CACHE = "icy-shell-v1";
const SHELL = ["/", "/index.html", "/app.js", "/manifest.json", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // jamais le gateway
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
