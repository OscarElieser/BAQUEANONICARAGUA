// Trabajador de BAQUEANO: guarda las páginas públicas que la persona ya visitó para poder verlas sin conexión.
// Nunca guarda zonas privadas (cuenta, mensajes, Ops Center, denuncias) ni respuestas de otros sitios (Supabase, Firebase).
const VERSION = 'baqueano-v1'; // Cambia este nombre para borrar las copias viejas
const IDIOMAS = ['es', 'en', 'fr', 'pt', 'de', 'it', 'ja', 'ko', 'ru', 'zh-Hans']; // Los 10 idiomas del sitio
const PRIVADAS = /^\/[^/]+\/(cuenta|mensajes|ops|denunciar)(\/|$)/; // Rutas que jamás se guardan
const PRECARGA = [...IDIOMAS.map((l) => `/${l}/sin-conexion`), '/icono.svg', '/icono-192.png', '/manifest.webmanifest']; // Lo que se guarda al instalar

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECARGA)).then(() => self.skipWaiting())); // Guarda la página sin conexión y activa enseguida
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()), // Borra versiones viejas y toma el control
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request; // Petición del navegador
  if (req.method !== 'GET') return; // Solo lecturas: los envíos siempre van a la red
  const url = new URL(req.url); // Dirección pedida
  if (url.origin !== self.location.origin) return; // Otros sitios (Supabase, Firebase, mapas) nunca se guardan
  if (PRIVADAS.test(url.pathname)) return; // Zonas privadas: siempre a la red

  if (req.mode === 'navigate') {
    // Páginas: primero la red (datos frescos); si no hay conexión, la copia guardada o la página sin conexión
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone())); // Guarda la versión nueva
          return res; // Muestra la de la red
        })
        .catch(async () => {
          const copia = await caches.match(req); // ¿Ya la había visitado?
          if (copia) return copia; // Sí: la muestra
          const idioma = IDIOMAS.find((l) => url.pathname.startsWith(`/${l}`)) ?? 'es'; // Idioma de la página pedida
          return (await caches.match(`/${idioma}/sin-conexion`)) ?? Response.error(); // Aviso honesto de que no hay conexión
        }),
    );
    return; // Ya respondió
  }

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/fotos/') || /\.(svg|png|webp|woff2)$/.test(url.pathname)) {
    // Archivos que no cambian (llevan su huella en el nombre o son fotos): primero la copia, si no la red
    e.respondWith(
      caches.match(req).then(
        (copia) =>
          copia ??
          fetch(req).then((res) => {
            if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone())); // Guarda para la próxima vez
            return res; // Muestra el archivo
          }),
      ),
    );
  }
});
