const CACHE_NAME = "pipa-combat-live-v3";
const ARQUIVOS = [
    "/",
    "/index.html",
    "/manifest.json",
    "/icon.svg"
];

self.addEventListener("install", (evento) => {
    self.skipWaiting();

    evento.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ARQUIVOS))
    );
});

self.addEventListener("activate", (evento) => {
    evento.waitUntil(
        caches.keys()
            .then((chaves) => Promise.all(
                chaves
                    .filter((chave) => chave !== CACHE_NAME)
                    .map((chave) => caches.delete(chave))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (evento) => {
    if (evento.request.url.includes("/socket")) {
        return;
    }

    const opcoes =
        evento.request.mode === "navigate"
            ? { cache: "no-store" }
            : {};

    evento.respondWith(
        fetch(evento.request, opcoes)
            .then((resposta) => {
                const copia = resposta.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(evento.request, copia);
                });
                return resposta;
            })
            .catch(() => caches.match(evento.request))
    );
});
