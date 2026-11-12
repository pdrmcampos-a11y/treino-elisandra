// Rede primeiro, cache como reserva: atualizações chegam sozinhas e o app abre offline na academia.
const V = "treino-eli";
const FILES = ["./", "index.html", "logic.js", "timer.js", "manifest.webmanifest", "icon-180.png", "icon-512.png"];
self.addEventListener("install", (e) => e.waitUntil(
  caches.open(V).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // "no-cache" revalida no servidor: evita pegar cópia velha do cache HTTP do GitHub Pages (~10 min).
  e.respondWith(fetch(e.request.url, { cache: "no-cache" })
    .then((r) => { if (r.ok) { const c = r.clone(); caches.open(V).then((x) => x.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request)));
});
