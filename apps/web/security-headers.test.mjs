// Pruebas de las cabeceras de seguridad (node --test apps/web/security-headers.test.mjs).
import assert from 'node:assert/strict'; // Comprobaciones
import { test } from 'node:test'; // Corredor de pruebas de Node
import { securityHeaders } from './security-headers.mjs'; // Función a probar

/** Devuelve el valor de una cabecera por su nombre. */
const get = (headers, key) => headers.find((h) => h.key === key)?.value ?? ''; // Busca la cabecera

test('producción: CSP estricta con los servicios configurados y sin eval', () => {
  const h = securityHeaders({ NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co/', NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'nica.firebaseapp.com' }, false); // Entorno de producción simulado
  const csp = get(h, 'Content-Security-Policy'); // Política de contenido
  assert.match(csp, /frame-ancestors 'none'/); // Nadie puede enmarcar la web
  assert.match(csp, /object-src 'none'/); // Sin complementos antiguos
  assert.match(csp, /connect-src [^;]*https:\/\/abc\.supabase\.co/); // Supabase permitido
  assert.match(csp, /connect-src [^;]*wss:\/\/abc\.supabase\.co/); // Tiempo real de Supabase permitido
  assert.match(csp, /frame-src [^;]*https:\/\/nica\.firebaseapp\.com/); // Ventana de inicio de sesión permitida
  assert.doesNotMatch(csp, /unsafe-eval/); // Nunca eval en producción
  assert.doesNotMatch(csp, /localhost/); // Nada local en producción
  assert.match(csp, /upgrade-insecure-requests/); // Todo cifrado
  assert.match(get(h, 'Strict-Transport-Security'), /max-age=63072000/); // HTTPS obligatorio
  assert.equal(get(h, 'X-Content-Type-Options'), 'nosniff'); // Sin adivinar tipos
  assert.match(get(h, 'Permissions-Policy'), /microphone=\(\)/); // Micrófono bloqueado
});

test('direcciones vacías o inválidas no abren la política', () => {
  const csp = get(securityHeaders({ NEXT_PUBLIC_API_URL: 'no es una url', CSP_EXTRA_CONNECT: 'http://inseguro.com https://teselas.ejemplo' }, false), 'Content-Security-Policy'); // Valores raros
  assert.doesNotMatch(csp, /no es una url/); // Dirección inválida ignorada
  assert.doesNotMatch(csp, /http:\/\/inseguro/); // Solo se aceptan extras con HTTPS
  assert.match(csp, /https:\/\/teselas\.ejemplo/); // Extra con HTTPS aceptado
});
