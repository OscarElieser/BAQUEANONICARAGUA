// Pruebas de la función "preparar-sesion" con Node (node --test), sin red:
// las claves de Google, Google OAuth, Firebase y Supabase se simulan.

import assert from 'node:assert/strict'; // Comprobaciones de las pruebas
import { test } from 'node:test'; // Corredor de pruebas de Node

import { createHandler, type Config } from '../preparar-sesion/handler.ts'; // Función a probar
import {
  buildServiceAssertion, // Aserción de la cuenta de servicio
  bytesToBase64Url, // Codificación Base64URL
  corsHeaders, // Cabeceras CORS
  FIREBASE_JWKS_URL, // Dirección de las claves públicas
  needsRole, // Decide si falta el rol
  verifyFirebaseToken, // Verificación del token
  type FirebaseClaims, // Datos del token
  type Jwks, // Claves públicas
} from '../preparar-sesion/logic.ts';

const PROJECT = 'nica-pruebas'; // Proyecto de Firebase de prueba (no existe)
const NOW = 1_800_000_000; // Hora fija para que las pruebas sean repetibles
const enc = new TextEncoder(); // Texto a bytes

const pair = (await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, // RSA de 2048 bits como Google
  true, // Exportable para armar el JWKS y el PEM
  ['sign', 'verify'], // Usos de las claves
)) as CryptoKeyPair; // Par de claves de prueba
const otherPair = (await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, // Otra clave para simular un falsificador
  true, // Exportable
  ['sign', 'verify'], // Usos
)) as CryptoKeyPair; // Par de claves ajeno
const jwks: Jwks = { keys: [{ ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid: 'k1' }] }; // JWKS con nuestra clave pública

/** Firma un token como lo haría Firebase, con datos que se pueden alterar en cada prueba. */
async function token(overrides: Partial<FirebaseClaims> = {}, key: CryptoKey = pair.privateKey, kid = 'k1'): Promise<string> {
  const header = bytesToBase64Url(enc.encode(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' }))); // Cabecera
  const claims: FirebaseClaims = {
    iss: `https://securetoken.google.com/${PROJECT}`, // Emisor correcto
    aud: PROJECT, // Proyecto correcto
    sub: 'uid-123', // Usuario de prueba
    iat: NOW - 10, // Emitido hace 10 segundos
    exp: NOW + 3600, // Vence en una hora
    name: 'Ana Prueba', // Nombre visible
    email_verified: true, // Correo verificado
    ...overrides, // Cambios de cada prueba
  };
  const body = bytesToBase64Url(enc.encode(JSON.stringify(claims))); // Datos codificados
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(`${header}.${body}`))); // Firma
  return `${header}.${body}.${bytesToBase64Url(sig)}`; // Token completo
}

/** Clave privada de prueba en formato PEM, como viene en el JSON de la cuenta de servicio. */
async function pem(): Promise<string> {
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey)); // Clave privada en bytes
  const b64 = btoa(String.fromCharCode(...der)); // A Base64
  return `-----BEGIN PRIVATE KEY-----\n${b64.match(/.{1,64}/g)!.join('\n')}\n-----END PRIVATE KEY-----\n`; // Formato PEM con saltos de línea
}

test('acepta un token válido y rechaza emisor, proyecto, vencimiento y firma incorrectos', async () => {
  const ok = await verifyFirebaseToken(await token(), PROJECT, jwks, NOW); // Token correcto
  assert.equal(ok.sub, 'uid-123'); // Devuelve el usuario
  await assert.rejects(verifyFirebaseToken(await token({ iss: 'https://otro' }), PROJECT, jwks, NOW), /Emisor/); // Emisor ajeno
  await assert.rejects(verifyFirebaseToken(await token({ aud: 'otro' }), PROJECT, jwks, NOW), /Proyecto/); // Proyecto ajeno
  await assert.rejects(verifyFirebaseToken(await token({ exp: NOW - 1 }), PROJECT, jwks, NOW), /vencida/); // Token vencido
  await assert.rejects(verifyFirebaseToken(await token({ iat: NOW + 1000 }), PROJECT, jwks, NOW), /futuro/); // Emitido en el futuro
  await assert.rejects(verifyFirebaseToken(await token({ sub: '' }), PROJECT, jwks, NOW), /sin usuario/); // Sin usuario
  await assert.rejects(verifyFirebaseToken(await token({}, otherPair.privateKey), PROJECT, jwks, NOW), /Firma inválida/); // Firmado por otro
  await assert.rejects(verifyFirebaseToken(await token({}, pair.privateKey, 'k9'), PROJECT, jwks, NOW), /desconocida/); // Clave desconocida
  await assert.rejects(verifyFirebaseToken('a.b', PROJECT, jwks, NOW), /formato/); // No es un JWT
  await assert.rejects(verifyFirebaseToken('%%%.###.$$$', PROJECT, jwks, NOW), /formato/); // JWT dañado
});

test('la aserción de la cuenta de servicio tiene el formato y permiso correctos', async () => {
  const jwt = await buildServiceAssertion({ client_email: 'sa@nica-pruebas.iam.gserviceaccount.com', private_key: await pem() }, NOW); // Firma la aserción
  const [h, p, s] = jwt.split('.'); // Partes del JWT
  const payload = JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/'))); // Datos de la aserción
  assert.equal(JSON.parse(atob(h)).alg, 'RS256'); // Algoritmo RS256
  assert.equal(payload.scope, 'https://www.googleapis.com/auth/identitytoolkit'); // Solo permiso sobre cuentas de Firebase
  assert.equal(payload.aud, 'https://oauth2.googleapis.com/token'); // Va al servicio de tokens de Google
  assert.equal(payload.exp - payload.iat, 600); // Dura 10 minutos
  assert.ok(s.length > 100); // Trae firma
});

test('needsRole y CORS', () => {
  assert.equal(needsRole({ role: 'authenticated' } as FirebaseClaims), false); // Ya tiene el rol
  assert.equal(needsRole({} as FirebaseClaims), true); // Le falta el rol
  assert.equal(corsHeaders('https://a.ni', ['https://a.ni'])['Access-Control-Allow-Origin'], 'https://a.ni'); // Origen permitido
  assert.equal(corsHeaders('https://malo.com', ['https://a.ni'])['Access-Control-Allow-Origin'], 'https://a.ni'); // Origen ajeno no se refleja
});

/** Simula Google y Supabase y anota cada llamada para revisarla después. */
function fakeServices(opts: { status?: string; existing?: boolean; attributes?: string; rpcFails?: boolean } = {}) {
  const calls: Array<{ url: string; method: string; body: string }> = []; // Registro de llamadas
  let created = opts.existing ?? false; // Si el perfil ya existe
  const profile = () => ({ id: 'p-1', display_name: 'Ana Prueba', username: null, preferred_locale: 'es', status: opts.status ?? 'active', email_verified: false }); // Perfil simulado
  const fake = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input); // Dirección pedida
    const method = init.method ?? 'GET'; // Método usado
    calls.push({ url, method, body: String(init.body ?? '') }); // Anota la llamada
    const reply = (body: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status: 200, headers }); // Respuesta JSON
    if (url === FIREBASE_JWKS_URL) return reply(jwks, { 'cache-control': 'public, max-age=600' }); // Claves públicas
    if (url.includes('/rest/v1/profiles?firebase_uid')) return reply(created ? [profile()] : []); // Búsqueda de perfil
    if (url.includes('/rest/v1/profiles?on_conflict')) {
      created = true; // Se crea el perfil
      return new Response(null, { status: 201 }); // Creado
    }
    if (url.endsWith('/rest/v1/rpc/session_bootstrap_superadmin')) return opts.rpcFails ? new Response('caída', { status: 500 }) : reply(false); // Revisión del superadmin inicial (o una falla simulada)
    if (url.includes('/rest/v1/')) return new Response(null, { status: 204 }); // Otras escrituras en Supabase
    if (url === 'https://oauth2.googleapis.com/token') return reply({ access_token: 'ya29.prueba', expires_in: 3600 }); // Token de Google
    if (url.endsWith('accounts:lookup')) return reply({ users: [{ customAttributes: opts.attributes }] }); // Cuenta de Firebase
    if (url.endsWith('accounts:update')) return reply({ localId: 'uid-123' }); // Actualización de la cuenta
    return new Response('no simulado', { status: 500 }); // Cualquier otra dirección es un error de la prueba
  }) as typeof fetch;
  return { fake, calls }; // Servicios simulados y su registro
}

/** Configuración completa de prueba. */
async function config(): Promise<Config> {
  return {
    firebaseProjectId: PROJECT, // Proyecto de prueba
    serviceAccountJson: JSON.stringify({ client_email: 'sa@nica-pruebas.iam.gserviceaccount.com', private_key: await pem() }), // Cuenta de servicio de prueba
    supabaseUrl: 'https://supabase.prueba', // Supabase simulado
    serviceRoleKey: 'clave-de-prueba', // Clave simulada
    allowedOrigins: ['https://web.prueba'], // Origen permitido
  };
}

/** Petición POST con el token en la cabecera. */
const post = (t?: string) =>
  new Request('https://supabase.prueba/functions/v1/preparar-sesion', {
    method: 'POST', // Método aceptado
    headers: { origin: 'https://web.prueba', ...(t ? { authorization: `Bearer ${t}` } : {}) }, // Origen y token
  });

test('primer inicio: crea el perfil, el rol "user" y agrega el rol sin borrar atributos anteriores', async () => {
  const { fake, calls } = fakeServices({ attributes: '{"plan":"x"}' }); // Cuenta con un atributo previo
  const res = await createHandler({ config: await config(), fetch: fake, now: () => NOW })(post(await token())); // Llama a la función
  assert.equal(res.status, 200); // Respuesta correcta
  const body = await res.json(); // Cuerpo de la respuesta
  assert.equal(body.needs_refresh, true); // Pide renovar el token
  assert.equal(body.profile.id, 'p-1'); // Devuelve el perfil
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://web.prueba'); // CORS para la web
  const insert = calls.find((c) => c.url.includes('profiles?on_conflict'))!; // Inserción del perfil
  assert.deepEqual(JSON.parse(insert.body), { firebase_uid: 'uid-123', display_name: 'Ana Prueba', email_verified: true }); // Datos del perfil
  assert.ok(calls.some((c) => c.url.includes('user_roles') && c.body.includes('"role_key":"user"'))); // Rol base
  const update = calls.find((c) => c.url.endsWith('accounts:update'))!; // Actualización en Firebase
  assert.deepEqual(JSON.parse(JSON.parse(update.body).customAttributes), { plan: 'x', role: 'authenticated' }); // Conserva lo anterior y agrega el rol
});

test('si el token ya trae el rol no toca Firebase', async () => {
  const { fake, calls } = fakeServices({ existing: true }); // Perfil ya creado
  const res = await createHandler({ config: await config(), fetch: fake, now: () => NOW })(post(await token({ role: 'authenticated' }))); // Token con rol
  assert.equal(res.status, 200); // Correcto
  assert.equal((await res.json()).needs_refresh, false); // No hace falta renovar
  assert.ok(!calls.some((c) => c.url.includes('googleapis.com/token') || c.url.includes('identitytoolkit'))); // Ninguna llamada a Google
  assert.ok(calls.some((c) => c.method === 'PATCH' && c.body.includes('email_verified'))); // Actualiza la verificación del correo
});

test('cuenta suspendida: 403 y no recibe el rol', async () => {
  const { fake, calls } = fakeServices({ existing: true, status: 'suspended' }); // Perfil suspendido
  const res = await createHandler({ config: await config(), fetch: fake, now: () => NOW })(post(await token())); // Llama a la función
  assert.equal(res.status, 403); // Prohibido
  assert.ok(!calls.some((c) => c.url.includes('identitytoolkit'))); // No se le asigna el rol
});

test('errores claros: sin token, token falso, método, preflight y servidor sin configurar', async () => {
  const { fake } = fakeServices(); // Servicios simulados
  const handler = createHandler({ config: await config(), fetch: fake, now: () => NOW }); // Función configurada
  assert.equal((await handler(post())).status, 401); // Sin token
  assert.equal((await handler(post(await token({}, otherPair.privateKey)))).status, 401); // Token falsificado
  assert.equal((await handler(new Request('https://x/', { method: 'GET' }))).status, 405); // Método no permitido
  assert.equal((await handler(new Request('https://x/', { method: 'OPTIONS' }))).status, 204); // Consulta previa del navegador
  const sinConfig = createHandler({ config: { allowedOrigins: [] }, fetch: fake, now: () => NOW }); // Sin secretos
  assert.equal((await sinConfig(post(await token()))).status, 503); // Servidor sin configurar
  const sinCuenta = createHandler({ config: { ...(await config()), serviceAccountJson: undefined }, fetch: fake, now: () => NOW }); // Sin cuenta de servicio
  assert.equal((await sinCuenta(post(await token()))).status, 503); // No puede asignar el rol
});

test('correo verificado: pide a la base revisar el superadmin inicial con los datos del token ya verificado', async () => {
  const { fake, calls } = fakeServices({ existing: true }); // Perfil ya creado
  const res = await createHandler({ config: await config(), fetch: fake, now: () => NOW })(post(await token({ role: 'authenticated', email: 'Dueno@Example.com' }))); // Token con correo verificado
  assert.equal(res.status, 200); // Entra normal
  const rpc = calls.find((c) => c.url.endsWith('/rest/v1/rpc/session_bootstrap_superadmin')); // Llamada a la función de la base
  assert.ok(rpc); // Se hizo la revisión
  assert.equal(rpc.method, 'POST'); // Por POST, como pide la Data API
  assert.deepEqual(JSON.parse(rpc.body), { p_firebase_uid: 'uid-123', p_email: 'Dueno@Example.com', p_email_verified: true }); // Datos del token, sin cambios
});

test('sin correo o con correo sin verificar no se pregunta por el superadmin', async () => {
  const { fake, calls } = fakeServices({ existing: true }); // Perfil ya creado
  const handler = createHandler({ config: await config(), fetch: fake, now: () => NOW }); // Función configurada
  assert.equal((await handler(post(await token({ role: 'authenticated' })))).status, 200); // Token sin correo
  assert.equal((await handler(post(await token({ role: 'authenticated', email: 'dueno@example.com', email_verified: false })))).status, 200); // Correo sin verificar
  assert.ok(!calls.some((c) => c.url.includes('session_bootstrap_superadmin'))); // Ninguna revisión
});

test('si la revisión del superadmin falla, la persona entra igual', async () => {
  const { fake, calls } = fakeServices({ existing: true, rpcFails: true }); // La base falla en esa función
  const errores: unknown[] = []; // Mensajes que irían a los registros
  const original = console.error; // Guarda la salida de errores real
  console.error = (...args: unknown[]) => { errores.push(args); }; // La captura para revisarla
  try {
    const res = await createHandler({ config: await config(), fetch: fake, now: () => NOW })(post(await token({ role: 'authenticated', email: 'dueno@example.com' }))); // Inicio de sesión
    assert.equal(res.status, 200); // No se bloquea el inicio de sesión
    assert.equal((await res.json()).profile.id, 'p-1'); // Devuelve el perfil
  } finally {
    console.error = original; // Restaura la salida de errores
  }
  assert.ok(calls.some((c) => c.url.includes('session_bootstrap_superadmin'))); // Sí intentó la revisión
  assert.equal(errores.length, 1); // Y dejó constancia de la falla
});
