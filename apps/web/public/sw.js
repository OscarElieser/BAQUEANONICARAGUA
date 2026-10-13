// Trabajador de BAQUEANO: guarda las páginas públicas que la persona ya visitó para poder verlas sin conexión
// y muestra los avisos push que llegan por Firebase Cloud Messaging (también con la web cerrada).
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

// Avisos push: Firebase los entrega aquí y este trabajador los muestra. El texto lo arma el servidor sin datos personales.
self.addEventListener('push', (e) => {
  let datos = {}; // Contenido del aviso
  try {
    datos = e.data ? e.data.json() : {}; // Formato de Firebase: notification, data y fcmOptions
  } catch {
    datos = {}; // Si no es JSON, se muestra un aviso genérico
  }
  const n = datos.notification || {}; // Título y texto
  const enlace = (datos.fcmOptions && datos.fcmOptions.link) || (datos.data && datos.data.ruta) || '/'; // Página que abre al tocarlo
  e.waitUntil(
    self.registration.showNotification(n.title || 'BAQUEANO', {
      body: n.body || '', // Texto del aviso
      icon: '/icono-192.png', // Ícono de la marca
      badge: '/icono-192.png', // Ícono pequeño (Android)
      tag: (datos.data && datos.data.kind) || 'baqueano', // Los del mismo tipo se reemplazan en vez de amontonarse
      data: { enlace }, // Se usa al tocarlo
    }),
  );
});

// Al tocar un aviso: abre la página en BAQUEANO (usa una pestaña abierta si hay; si no, abre una nueva)
self.addEventListener('notificationclick', (e) => {
  e.notification.close(); // Cierra el aviso
  const pedido = new URL((e.notification.data && e.notification.data.enlace) || '/', self.location.origin); // Dirección del aviso
  const destino = new URL(pedido.pathname, self.location.origin).href; // Siempre en este mismo sitio (nunca abre otros dominios)
  e.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true }); // Pestañas de BAQUEANO abiertas
      for (const v of ventanas) {
        try {
          await v.navigate(destino); // Lleva esa pestaña a la página del aviso
          return v.focus(); // Y la trae al frente
        } catch {
          // Esa pestaña no se puede mover: prueba con la siguiente
        }
      }
      return self.clients.openWindow(destino); // Ninguna sirvió: abre una nueva
    })(),
  );
});
