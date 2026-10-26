<<<<<<< HEAD
const VERSION = "serma-shell-v9";
const VIEW_FILES = [
  "login.html",
  "layout.html",
  "inicio.html",
  "estudiantes.html",
  "planes.html",
  "seguimiento.html",
  "configuracion.html",
  "usuarios.html",
  "componentes.html",
];
self.addEventListener("install", (event) => {
  const base = self.registration.scope;
  const paths = [
    "",
    "index.html",
    "assets/css/app.css",
    "assets/js/app.js",
    "manifest.webmanifest",
    "public/image/serma-icon-192.png?v=2",
    "public/image/serma-icon-512.png?v=2",
    ...VIEW_FILES.map((name) => `views/${name}`),
  ];
  const shell = paths.map((path) => new URL(path || ".", base).href);
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(shell))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("serma-shell-") && key !== VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.includes("/api/") || url.pathname.endsWith(".php")) return;
  const base = self.registration.scope;
  const cachedPaths = new Set([
    "",
    "index.html",
    "assets/css/app.css",
    "assets/js/app.js",
    "manifest.webmanifest",
    "public/image/serma-icon-192.png",
    "public/image/serma-icon-512.png",
    ...VIEW_FILES.map((name) => `views/${name}`),
  ]);
  const scopePath = new URL(base).pathname;
  const relative = url.pathname.startsWith(scopePath)
    ? url.pathname.slice(scopePath.length)
    : null;
  if (relative !== null && cachedPaths.has(relative))
    event.respondWith(
      caches
        .open(VERSION)
        .then(async (cache) => (await cache.match(request)) || fetch(request)),
    );
=======
const VERSION = 'serma-shell-v7';
self.addEventListener('install', event => {
  const base = self.registration.scope;
  const shell = [base, new URL('index.html',base).href, new URL('app.css',base).href, new URL('app.js',base).href, new URL('manifest.webmanifest',base).href, new URL('public/image/serma-icon-192.png',base).href, new URL('public/image/serma-icon-512.png',base).href];
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(shell)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('serma-shell-') && key !== VERSION).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.includes('/api/') || url.pathname.endsWith('.php')) return; // Las respuestas con datos académicos nunca se guardan en caché.
  const base = self.registration.scope;
  const cachedPaths = new Set(['', 'index.html', 'app.css', 'app.js', 'manifest.webmanifest', 'public/image/serma-icon-192.png', 'public/image/serma-icon-512.png']);
  const relative = url.pathname.startsWith(new URL(base).pathname) ? url.pathname.slice(new URL(base).pathname.length) : null;
  if (relative !== null && cachedPaths.has(relative)) {
    event.respondWith(caches.open(VERSION).then(async cache => (await cache.match(request)) || fetch(request)));
  }
>>>>>>> 77025a8413dea2717fa46a566ab5b187434a2a70
});
