// Lógica de la función "preparar-sesion" sin dependencias externas.
// Solo usa APIs web estándar (fetch, WebCrypto), así corre igual en Deno (Supabase) y en Node (pruebas).

/** Datos que nos interesan del token de Firebase ya verificado. */
export interface FirebaseClaims {
  sub: string; // Identificador del usuario en Firebase
  email?: string; // Correo de la cuenta
  email_verified?: boolean; // Si el correo está verificado
  name?: string; // Nombre visible
  role?: string; // Rol para Supabase (lo que esta función agrega)
  iss: string; // Emisor del token
  aud: string; // Proyecto al que va dirigido
  exp: number; // Fecha de vencimiento (segundos desde 1970)
  iat: number; // Fecha de emisión (segundos desde 1970)
}

/** Claves públicas de Google en formato JWK (las que firman los tokens de Firebase). */
export interface Jwks {
  keys: Array<JsonWebKey & { kid: string }>; // Lista de claves con su identificador
}

export const FIREBASE_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'; // Dirección oficial de las claves públicas

/** Convierte texto en Base64URL (el formato de los JWT) a bytes. */
export function base64UrlToBytes(input: string): Uint8Array<ArrayBuffer> {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/'); // Cambia los caracteres de Base64URL a Base64 normal
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4); // Completa el relleno que exige Base64
  const binary = atob(padded); // Decodifica a texto binario
  return Uint8Array.from(binary, (c) => c.charCodeAt(0)); // Convierte cada carácter en un byte
}

/** Convierte bytes a Base64URL. */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''; // Texto binario intermedio
  for (const b of bytes) binary += String.fromCharCode(b); // Agrega cada byte como carácter
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); // Base64 a Base64URL sin relleno
}

const encoder = new TextEncoder(); // Convierte texto a bytes UTF-8
const decoder = new TextDecoder(); // Convierte bytes UTF-8 a texto

/** Error con código HTTP para responder al cliente de forma clara. */
export class HttpError extends Error {
  status: number; // Código HTTP con el que se responde (401, 403, 503…)
  constructor(status: number, message: string) {
    super(message); // Guarda el mensaje legible
    this.status = status; // Guarda el código HTTP
  }
}

/** Lee una parte del JWT como JSON; si está dañada responde 401 en vez de un error interno. */
function readJsonPart(part: string): Record<string, unknown> {
  try {
    const value = JSON.parse(decoder.decode(base64UrlToBytes(part))); // Decodifica y convierte a objeto
    if (value === null || typeof value !== 'object') throw new Error('no es un objeto'); // Debe ser un objeto JSON
    return value as Record<string, unknown>; // Parte leída
  } catch {
    throw new HttpError(401, 'Token con formato inválido'); // Token dañado o inventado
  }
}

/**
 * Verifica un token de Firebase: firma RS256 con las claves de Google, emisor, proyecto,
 * vencimiento y que tenga usuario. Devuelve sus datos si es válido.
 */
export async function verifyFirebaseToken(
  token: string, // Token recibido del cliente
  projectId: string, // Proyecto de Firebase esperado
  jwks: Jwks, // Claves públicas de Google
  nowSeconds: number = Math.floor(Date.now() / 1000), // Hora actual (se puede fijar en pruebas)
): Promise<FirebaseClaims> {
  const parts = token.split('.'); // Un JWT tiene tres partes: cabecera, datos y firma
  if (parts.length !== 3) throw new HttpError(401, 'Token con formato inválido'); // Rechaza lo que no parece un JWT
  const header = readJsonPart(parts[0]) as { alg?: string; kid?: string }; // Lee la cabecera
  if (header.alg !== 'RS256' || !header.kid) throw new HttpError(401, 'Algoritmo de firma no permitido'); // Solo aceptamos RS256 con identificador de clave
  const jwk = jwks.keys.find((k) => k.kid === header.kid); // Busca la clave pública que firmó el token
  if (!jwk) throw new HttpError(401, 'Clave de firma desconocida'); // Sin clave conocida no se puede confiar
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']); // Importa la clave para verificar
  let signature: Uint8Array<ArrayBuffer>; // Bytes de la firma
  try {
    signature = base64UrlToBytes(parts[2]); // Decodifica la firma
  } catch {
    throw new HttpError(401, 'Token con formato inválido'); // Firma ilegible
  }
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5', // Algoritmo RS256
    key, // Clave pública de Google
    signature, // Firma del token
    encoder.encode(`${parts[0]}.${parts[1]}`), // Contenido firmado
  );
  if (!valid) throw new HttpError(401, 'Firma inválida'); // La firma no corresponde: token falsificado o alterado
  const claims = readJsonPart(parts[1]) as unknown as FirebaseClaims; // Lee los datos del token
  if (claims.iss !== `https://securetoken.google.com/${projectId}`) throw new HttpError(401, 'Emisor no válido'); // Debe venir de nuestro proyecto
  if (claims.aud !== projectId) throw new HttpError(401, 'Proyecto no válido'); // Debe ir dirigido a nuestro proyecto
  if (typeof claims.exp !== 'number' || claims.exp <= nowSeconds) throw new HttpError(401, 'Sesión vencida'); // No aceptamos tokens vencidos
  if (typeof claims.iat !== 'number' || claims.iat > nowSeconds + 300) throw new HttpError(401, 'Token emitido en el futuro'); // Margen de 5 minutos por diferencias de reloj
  if (!claims.sub) throw new HttpError(401, 'Token sin usuario'); // Debe identificar a un usuario
  return claims; // Token válido
}

/** Cuenta de servicio de Firebase (archivo JSON que se descarga en la consola de Firebase). */
export interface ServiceAccount {
  client_email: string; // Correo de la cuenta de servicio
  private_key: string; // Clave privada en formato PEM
}

/** Convierte una clave privada PEM (PKCS#8) en bytes. */
export function pemToBytes(pem: string): Uint8Array<ArrayBuffer> {
  const body = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, ''); // Quita encabezados y saltos de línea
  return Uint8Array.from(atob(body), (c) => c.charCodeAt(0)); // Decodifica el Base64 a bytes
}

/** Crea la "aserción" firmada con la cuenta de servicio para pedir un token de acceso a Google. */
export async function buildServiceAssertion(sa: ServiceAccount, nowSeconds: number = Math.floor(Date.now() / 1000)): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' }; // Cabecera del JWT
  const payload = {
    iss: sa.client_email, // Quién firma: la cuenta de servicio
    scope: 'https://www.googleapis.com/auth/identitytoolkit', // Permiso para administrar cuentas de Firebase Auth
    aud: 'https://oauth2.googleapis.com/token', // Servicio de Google que recibe la aserción
    iat: nowSeconds, // Momento de emisión
    exp: nowSeconds + 600, // Válida por 10 minutos
  };
  const unsigned = `${bytesToBase64Url(encoder.encode(JSON.stringify(header)))}.${bytesToBase64Url(encoder.encode(JSON.stringify(payload)))}`; // Cabecera y datos codificados
  const key = await crypto.subtle.importKey('pkcs8', pemToBytes(sa.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']); // Importa la clave privada
  const signature = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(unsigned))); // Firma el contenido
  return `${unsigned}.${bytesToBase64Url(signature)}`; // JWT completo
}

/** Decide si hay que asignar el rol: solo si el token todavía no lo trae. */
export function needsRole(claims: FirebaseClaims): boolean {
  return claims.role !== 'authenticated'; // Si ya lo tiene, no tocamos la cuenta
}

/** Cabeceras CORS para que la web pueda llamar a la función desde el navegador. */
export function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  const ok = origin !== null && (allowed.includes(origin) || allowed.includes('*')); // Si el origen está permitido
  return {
    'Access-Control-Allow-Origin': ok ? origin! : allowed[0] ?? '', // Devuelve el origen permitido
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', // Cabeceras que puede enviar el cliente
    'Access-Control-Allow-Methods': 'POST, OPTIONS', // Métodos permitidos
    Vary: 'Origin', // Las respuestas dependen del origen (importante para cachés)
  };
}
