// Cabeceras de seguridad de la web. Se calculan con las direcciones configuradas en el entorno,
// así la política solo permite los servicios que de verdad usamos.

/** Devuelve solo el origen (https://dominio) de una dirección, o null si está vacía o es inválida. */
function origin(url) {
  try {
    return url ? new URL(url).origin : null; // Origen de la dirección
  } catch {
    return null; // Dirección mal escrita: no se agrega
  }
}

/** Arma la política de seguridad de contenido (CSP) y el resto de cabeceras. */
export function securityHeaders(env = process.env, dev = env.NODE_ENV !== 'production') {
  const supabase = origin(env.NEXT_PUBLIC_SUPABASE_URL); // Proyecto de Supabase
  const api = origin(env.NEXT_PUBLIC_API_URL); // Nuestra API
  const mapStyle = origin(env.NEXT_PUBLIC_MAP_STYLE_URL); // Proveedor del estilo del mapa
  const authDomain = env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? `https://${env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}` : null; // Dominio de inicio de sesión de Firebase
  const extra = (env.CSP_EXTRA_CONNECT ?? '').split(/\s+/).filter((s) => s.startsWith('https://')); // Proveedores extra (por ejemplo, teselas del mapa)

  const connect = [
    "'self'", // Nuestra propia web
    supabase, // Datos y funciones de Supabase
    supabase && supabase.replace('https://', 'wss://'), // Tiempo real de Supabase
    api, // Nuestra API
    mapStyle, // Estilo del mapa
    'https://identitytoolkit.googleapis.com', // Inicio de sesión de Firebase
    'https://securetoken.googleapis.com', // Renovación del token de Firebase
    'https://firebaseinstallations.googleapis.com', // Registro para notificaciones
    'https://fcmregistrations.googleapis.com', // Notificaciones push
    ...extra, // Proveedores agregados por configuración
    ...(dev ? ['ws:', 'http://localhost:*', 'http://127.0.0.1:*'] : []), // Recarga en caliente solo en desarrollo
  ].filter(Boolean); // Quita los que no están configurados

  const frames = [
    authDomain, // Ventana de inicio de sesión de Firebase
    'https://accounts.google.com', // Selector de cuenta de Google
    'https://www.youtube-nocookie.com', // Reproductor oficial de YouTube sin cookies
    'https://www.youtube.com', // Reproductor oficial de YouTube
    'https://open.spotify.com', // Reproductor oficial de Spotify
    'https://w.soundcloud.com', // Reproductor oficial de SoundCloud
    'https://bandcamp.com', // Reproductor oficial de Bandcamp
    'https://archive.org', // Reproductor de Internet Archive
  ].filter(Boolean); // Quita los que no están configurados

  const csp = [
    "default-src 'self'", // Por defecto, solo nuestro dominio
    `script-src 'self' 'unsafe-inline' https://apis.google.com${dev ? " 'unsafe-eval'" : ''}`, // Scripts propios, los de arranque de Next y los de Google para iniciar sesión
    "style-src 'self' 'unsafe-inline'", // Estilos propios (el mapa usa estilos en línea)
    "img-src 'self' data: blob: https:", // Imágenes de nuestro almacenamiento y teselas del mapa
    "font-src 'self' data:", // Fuentes alojadas en nuestro dominio
    `connect-src ${connect.join(' ')}`, // Servicios a los que el navegador puede llamar
    `frame-src ${frames.join(' ')}`, // Ventanas incrustadas permitidas
    "worker-src 'self' blob:", // Trabajadores del mapa
    "manifest-src 'self'", // Manifiesto de la app instalable
    "media-src 'self' blob:" + (supabase ? ` ${supabase}` : ''), // Audio y video alojados con licencia
    "object-src 'none'", // Sin complementos antiguos (Flash y similares)
    "base-uri 'self'", // Nadie puede cambiar la base de las direcciones
    "form-action 'self'", // Los formularios solo se envían a nuestro dominio
    "frame-ancestors 'none'", // Nadie puede meter nuestra web en un marco (evita engaños de clic)
    ...(dev ? [] : ['upgrade-insecure-requests']), // En producción todo va cifrado
  ].join('; '); // Une las reglas

  return [
    { key: 'Content-Security-Policy', value: csp }, // Política de contenido
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }, // Siempre HTTPS durante 2 años
    { key: 'X-Content-Type-Options', value: 'nosniff' }, // El navegador no adivina tipos de archivo
    { key: 'X-Frame-Options', value: 'DENY' }, // Respaldo de frame-ancestors para navegadores antiguos
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }, // A otros sitios solo se envía el dominio, nunca la ruta completa
    { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self), payment=(), usb=(), interest-cohort=()' }, // Solo cámara (pruebas de denuncias) y ubicación (mapa) cuando la persona lo permite
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' }, // Aísla la ventana, pero deja funcionar la ventana de Google
  ];
}
