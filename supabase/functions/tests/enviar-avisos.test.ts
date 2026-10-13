// Pruebas de la función "enviar-avisos" con Node (node --test), sin red: Google, FCM y Supabase se simulan.

import assert from 'node:assert/strict'; // Comprobaciones
import { test } from 'node:test'; // Corredor de pruebas de Node

import { clasificar, createHandler, mensajeFcm, rutaDe, textoDe, type Config, type Pendiente } from '../enviar-avisos/handler.ts'; // Función a probar
import { SCOPE_AVISOS } from '../preparar-sesion/logic.ts'; // Permiso esperado

const NOW = 1_800_000_000; // Hora fija

const pair = (await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, // RSA como Google
  true, // Exportable para armar el PEM
  ['sign', 'verify'], // Usos
)) as CryptoKeyPair; // Par de claves de prueba

/** Clave privada de prueba en PEM, como viene en el JSON de la cuenta de servicio. */
async function pem(): Promise<string> {
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey)); // Bytes de la clave
  const b64 = btoa(String.fromCharCode(...der)); // A Base64
  return `-----BEGIN PRIVATE KEY-----\n${b64.match(/.{1,64}/g)!.join('\n')}\n-----END PRIVATE KEY-----\n`; // Formato PEM
}

/** Configuración completa de prueba. */
async function config(): Promise<Config> {
  return {
    firebaseProjectId: 'nica-pruebas', // Proyecto de prueba
    serviceAccountJson: JSON.stringify({ client_email: 'sa@nica-pruebas.iam.gserviceaccount.com', private_key: await pem() }), // Cuenta de prueba
    supabaseUrl: 'https://supabase.prueba', // Supabase simulado
    serviceRoleKey: 'clave-de-prueba', // Clave simulada
    sitioUrl: 'https://web.prueba', // Web simulada
  };
}

/** Simula Supabase, Google y FCM; anota cada llamada. */
function servicios(opts: { avisos?: Pendiente[]; fcm?: Record<string, { status: number; body?: string }>; googleFalla?: boolean } = {}) {
  const calls: Array<{ url: string; body: string; headers: Record<string, string> }> = []; // Registro
  const fake = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input); // Dirección
    const body = String(init.body ?? ''); // Cuerpo
    calls.push({ url, body, headers: (init.headers ?? {}) as Record<string, string> }); // Anota
    const reply = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status }); // Respuesta JSON
    if (url.endsWith('/rest/v1/rpc/push_claim')) return reply(opts.avisos ?? []); // Avisos reservados
    if (url.endsWith('/rest/v1/rpc/push_report')) return new Response(null, { status: 204 }); // Resultado anotado
    if (url === 'https://oauth2.googleapis.com/token') return opts.googleFalla ? reply({ error: 'invalid_grant' }, 400) : reply({ access_token: 'ya29.prueba', expires_in: 3600 }); // Token de Google
    if (url.startsWith('https://fcm.googleapis.com/')) {
      const token = (JSON.parse(body) as { message: { token: string } }).message.token; // Dispositivo
      const r = opts.fcm?.[token] ?? { status: 200 }; // Respuesta simulada para ese dispositivo
      return new Response(r.body ?? JSON.stringify({ name: 'projects/x/messages/1' }), { status: r.status }); // Respuesta de FCM
    }
    return new Response('no simulado', { status: 500 }); // Error de la prueba
  }) as typeof fetch;
  return { fake, calls }; // Servicios simulados
}

const post = () => new Request('https://supabase.prueba/functions/v1/enviar-avisos', { method: 'POST', body: '{}' }); // Llamada de pg_cron
const muerto = JSON.stringify({ error: { code: 404, status: 'NOT_FOUND', details: [{ '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode: 'UNREGISTERED' }] } }); // Token que ya no existe

test('textos traducidos, con respaldo en español y tipo genérico', () => {
  assert.deepEqual(textoDe('new_message', 'es'), { title: 'Mensaje nuevo', body: 'Alguien te escribió en BAQUEANO. Toca para leerlo.' }); // Español
  assert.equal(textoDe('new_message', 'en').title, 'New message'); // Inglés
  assert.equal(textoDe('trip_update', 'es').body, 'Tienes un aviso nuevo.'); // Tipo sin texto propio: genérico
  assert.equal(textoDe('new_message', 'xx').title, 'Mensaje nuevo'); // Idioma desconocido: español
  assert.equal(rutaDe('new_message', 'fr'), '/fr/mensajes'); // Página del tipo en su idioma
  assert.equal(rutaDe('system', 'es'), '/es'); // Sin página propia: portada
  assert.equal(rutaDe('incident_update', 'xx'), '/es/denunciar'); // Idioma desconocido: español
});

test('el mensaje de FCM lleva texto sin datos personales y la página que abre', () => {
  const m = mensajeFcm('tok-123', { id: 1, kind: 'post_comment', attempts: 1, locale: 'pt', tokens: ['tok-123'] }, 'https://web.prueba') as { message: Record<string, any> }; // Mensaje armado
  assert.equal(m.message.token, 'tok-123'); // Dispositivo
  assert.equal(m.message.notification.title, 'Novo comentário'); // Título en portugués
  assert.equal(m.message.webpush.fcm_options.link, 'https://web.prueba/pt/comunidad'); // Abre la comunidad
  assert.deepEqual(m.message.data, { kind: 'post_comment', ruta: '/pt/comunidad' }); // Datos para la app
});

test('clasifica las respuestas de FCM', () => {
  assert.equal(clasificar(200, ''), 'ok'); // Entregado
  assert.equal(clasificar(404, muerto), 'token_muerto'); // Dispositivo dado de baja
  assert.equal(clasificar(403, '{"error":{"details":[{"errorCode":"SENDER_ID_MISMATCH"}]}}'), 'token_muerto'); // Token de otro proyecto
  assert.equal(clasificar(429, '{"error":{"details":[{"errorCode":"QUOTA_EXCEEDED"}]}}'), 'pasajero'); // Límite de Firebase
  assert.equal(clasificar(503, ''), 'pasajero'); // Firebase caído
  assert.equal(clasificar(401, '{"error":{"details":[{"errorCode":"THIRD_PARTY_AUTH_ERROR"}]}}'), 'pasajero'); // Configuración: se reintenta
  assert.equal(clasificar(400, '{"error":{"details":[{"errorCode":"INVALID_ARGUMENT"}]}}'), 'fallo'); // Mensaje inválido: no borra el token
});

test('sin cuenta de servicio responde 503 y no toca los avisos', async () => {
  const { fake, calls } = servicios(); // Servicios simulados
  const res = await createHandler({ config: { ...(await config()), serviceAccountJson: undefined }, fetch: fake, now: () => NOW })(post()); // Sin secreto
  assert.equal(res.status, 503); // No disponible
  assert.equal(calls.length, 0); // Ni siquiera reserva avisos
  const mal = await createHandler({ config: { ...(await config()), serviceAccountJson: '{no es json' }, fetch: fake, now: () => NOW })(post()); // Secreto mal pegado
  assert.equal(mal.status, 503); // No disponible
  assert.equal((await createHandler({ config: await config(), fetch: fake, now: () => NOW })(new Request('https://x/', { method: 'GET' }))).status, 405); // Solo POST
});

test('sin avisos pendientes no pide permiso a Google', async () => {
  const { fake, calls } = servicios({ avisos: [] }); // Nada pendiente
  const res = await createHandler({ config: await config(), fetch: fake, now: () => NOW })(post()); // Vuelta del minuto
  assert.equal(res.status, 200); // Correcto
  assert.deepEqual(await res.json(), { avisos: 0 }); // Nada enviado
  assert.ok(!calls.some((c) => c.url.includes('googleapis.com'))); // Sin llamadas a Google
});

test('envía, borra tokens muertos y anota el resultado real de cada aviso', async () => {
  const avisos: Pendiente[] = [
    { id: 1, kind: 'new_message', attempts: 1, locale: 'es', tokens: ['vivo-1', 'muerto-1'] }, // Uno llega y otro ya no existe
    { id: 2, kind: 'comment_reply', attempts: 1, locale: 'en', tokens: ['caido-1'] }, // Firebase falla un momento
    { id: 3, kind: 'incident_update', attempts: 1, locale: 'es', tokens: ['muerto-2'] }, // Su único dispositivo ya no existe
    { id: 4, kind: 'system', attempts: 1, locale: 'es', tokens: ['malo-1'] }, // Mensaje rechazado
  ];
  const { fake, calls } = servicios({ avisos, fcm: { 'muerto-1': { status: 404, body: muerto }, 'caido-1': { status: 503 }, 'muerto-2': { status: 404, body: muerto }, 'malo-1': { status: 400, body: '{"error":{"details":[{"errorCode":"INVALID_ARGUMENT"}]}}' } } }); // Respuestas simuladas
  const res = await createHandler({ config: await config(), fetch: fake, now: () => NOW })(post()); // Vuelta del minuto
  assert.equal(res.status, 200); // Correcto
  assert.deepEqual(await res.json(), { avisos: 4, enviados: 1, fallidos: 1, omitidos: 1, reintentos: 1, tokens_borrados: 2 }); // Resumen honesto
  const reportes = calls.filter((c) => c.url.endsWith('push_report')).map((c) => JSON.parse(c.body)); // Lo anotado en la base
  assert.deepEqual(reportes, [
    { p_id: 1, p_status: 'sent', p_invalid_tokens: ['muerto-1'] }, // Enviado y token muerto borrado
    { p_id: 2, p_status: 'retry', p_invalid_tokens: [] }, // Se reintenta
    { p_id: 3, p_status: 'skipped', p_invalid_tokens: ['muerto-2'] }, // Sin dispositivos: omitido
    { p_id: 4, p_status: 'failed', p_invalid_tokens: [] }, // Fallido sin borrar el token
  ]);
  const envio = calls.find((c) => c.url.startsWith('https://fcm.googleapis.com/'))!; // Primer envío a FCM
  assert.equal(envio.url, 'https://fcm.googleapis.com/v1/projects/nica-pruebas/messages:send'); // API v1 del proyecto
  assert.equal(envio.headers.Authorization, 'Bearer ya29.prueba'); // Con el token de Google
  const google = calls.find((c) => c.url === 'https://oauth2.googleapis.com/token')!; // Pedido del token
  const asercion = new URLSearchParams(google.body).get('assertion')!; // Aserción firmada
  const datos = JSON.parse(Buffer.from(asercion.split('.')[1], 'base64url').toString()); // Datos de la aserción
  assert.equal(datos.scope, SCOPE_AVISOS); // Solo permiso para avisos
  assert.equal(calls.filter((c) => c.url === 'https://oauth2.googleapis.com/token').length, 1); // Un solo token para toda la vuelta
});

test('si Google rechaza la cuenta de servicio, los avisos quedan para reintentar', async () => {
  const avisos: Pendiente[] = [{ id: 7, kind: 'new_message', attempts: 1, locale: 'es', tokens: ['t-1'] }]; // Un aviso
  const { fake, calls } = servicios({ avisos, googleFalla: true }); // Google dice que no
  const errores: unknown[] = []; // Registros capturados
  const original = console.error; // Salida real
  console.error = (...a: unknown[]) => { errores.push(a); }; // La captura
  try {
    const res = await createHandler({ config: await config(), fetch: fake, now: () => NOW })(post()); // Vuelta del minuto
    assert.equal(res.status, 503); // No disponible
  } finally {
    console.error = original; // Restaura
  }
  assert.deepEqual(calls.filter((c) => c.url.endsWith('push_report')).map((c) => JSON.parse(c.body)), [{ p_id: 7, p_status: 'retry' }]); // Queda para reintentar
  assert.ok(!calls.some((c) => c.url.startsWith('https://fcm.googleapis.com/'))); // No se envió nada
  assert.equal(errores.length, 1); // Quedó en los registros
});
