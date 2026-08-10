// Service Worker — carnets de voyage (NYC / Andalousie / Ouest Américain)
// Stratégie : cache-first pour la coquille de l'app (HTML, CDN Tailwind/Fonts/Lucide),
// afin que le carnet reste consultable sans réseau une fois ouvert au moins une fois
// (typiquement avant de partir, en wifi). Les appels de synchro (Apps Script) restent
// en network-first : ils échouent proprement hors-ligne, sans casser l'affichage.

const CACHE_NAME = "carnets-voyage-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // ne jamais intercepter les POST (sauvegarde)

  const url = new URL(req.url);
  const isApiCall = url.hostname.includes("script.google.com");
  if (isApiCall) return; // laisser passer normalement (network-first natif du navigateur)

  // Coquille de page + ressources CDN : cache-first, avec mise à jour en arrière-plan
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);
      const networkFetch = fetch(req, { mode: req.mode === "navigate" ? "same-origin" : "no-cors" })
        .then((res) => {
          cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
