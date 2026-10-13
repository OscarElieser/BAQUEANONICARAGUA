// Atiende cada petición de "preparar-sesion". Recibe sus dependencias (configuración y fetch)
// para poder probarlo en Node con respuestas simuladas, sin tocar Google ni Supabase de verdad.

import {
  buildServiceAssertion, // Firma la aserción de la cuenta de servicio
  corsHeaders, // Cabeceras CORS para el navegador
  FIREBASE_JWKS_URL, // Dirección de las claves públicas de Google
  HttpError, // Error con código HTTP
  needsRole, // Decide si falta el rol en el token
  verifyFirebaseToken, // Verifica el token de Firebase
  type FirebaseClaims, // Datos del token verificado
  type Jwks, // Formato de las claves públicas
  type ServiceAccount, // Formato de la cuenta de servicio
} from './logic.ts';

/** Configuración que necesita la función (secretos de Supabase, nunca en web ni Android). */
export interface Config {
  firebaseProjectId?: string; // Proyecto de Firebase (secreto FIREBASE_PROJECT_ID)
  serviceAccountJson?: string; // Cuenta de servicio de Firebase en JSON (secreto FIREBASE_SERVICE_ACCOUNT)
  supabaseUrl?: string; // Dirección del proyecto de Supabase (la pone Supabase automáticamente)
  serviceRoleKey?: string; // Clave de servicio de Supabase (la pone Supabase automáticamente)
  allowedOrigins: string[]; // Orígenes web permitidos (secreto ALLOWED_ORIGINS, separados por comas)
}

/** Dependencias externas que se pueden reemplazar en las pruebas. */
export interface Deps {
  config: Config; // Configuración leída del entorno
  fetch: typeof fetch; // Función para hacer peticiones HTTP
  now?: () => number; // Hora actual en segundos (fija en pruebas)
}

/** Perfil que se devuelve al cliente (sin datos sensibles). */
interface Profile {
  id: string; // Identificador del perfil
  display_name: string | null; // Nombre visible
  username: string | null; // Nombre de usuario
  preferred_locale: string; // Idioma preferido
  status: 'active' | 'suspended' | 'deleted'; // Estado de la cuenta
  email_verified: boolean; // Si el correo está verificado
}

const PROFILE_COLUMNS = 'id,display_name,username,preferred_locale,status,email_verified'; // Columnas que se leen del perfil

/** Crea la función que atiende las peticiones. Guarda en memoria las claves y el token de Google mientras sigan vigentes. */
export function createHandler(deps: Deps): (req: Request) => Promise<Response> {
  const now = deps.now ?? (() => Math.floor(Date.now() / 1000)); // Reloj (real o de prueba)
  let jwksCache: { jwks: Jwks; expires: number } | null = null; // Claves públicas guardadas y su vencimiento
  let googleToken: { token: string; expires: number } | null = null; // Token de acceso a Google guardado y su vencimiento

  /** Descarga las claves públicas de Google (o usa las guardadas si siguen vigentes). */
  async function getJwks(force: boolean): Promise<Jwks> {
    if (!force && jwksCache && jwksCache.expires > now()) return jwksCache.jwks; // Usa la copia guardada si sirve
    const res = await deps.fetch(FIREBASE_JWKS_URL); // Pide las claves a Google
    if (!res.ok) throw new HttpError(503, 'No se pudieron obtener las claves de Google'); // Google no respondió bien
    const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get('cache-control') ?? '')?.[1] ?? 3600); // Cuánto tiempo indica Google que valen
    jwksCache = { jwks: (await res.json()) as Jwks, expires: now() + maxAge }; // Guarda las claves con su vencimiento
    return jwksCache.jwks; // Devuelve las claves
  }

  /** Verifica el token; si la clave no se conoce, vuelve a descargar las claves una vez (Google las rota). */
  async function verify(token: string, projectId: string): Promise<FirebaseClaims> {
    try {
      return await verifyFirebaseToken(token, projectId, await getJwks(false), now()); // Intento con las claves guardadas
    } catch (e) {
      if (e instanceof HttpError && e.message === 'Clave de firma desconocida') {
        // Puede ser una clave nueva de Google
        return await verifyFirebaseToken(token, projectId, await getJwks(true), now()); // Reintento con claves recién descargadas
      }
      throw e; // Cualquier otro problema se informa tal cual
    }
  }

  /** Llama a la Data API de Supabase con la clave de servicio (solo desde aquí, en el servidor). */
  async function rest(path: string, init: RequestInit = {}): Promise<Response> {
    const { supabaseUrl, serviceRoleKey } = deps.config; // Datos de conexión
    const res = await deps.fetch(`${supabaseUrl}/rest/v1/${path}`, {
      ...init, // Método y cuerpo de la petición
      headers: {
        apikey: serviceRoleKey!, // Clave de servicio
        Authorization: `Bearer ${serviceRoleKey}`, // Misma clave como autorización
        'Content-Type': 'application/json', // Enviamos JSON
        ...(init.headers as Record<string, string> | undefined), // Cabeceras extra de cada llamada
      },
    });
    if (!res.ok) throw new HttpError(502, 'La base de datos no respondió como se esperaba'); // Error real, no se oculta
    return res; // Respuesta correcta
  }

  /** Busca el perfil por su identificador de Firebase. */
  async function findProfile(uid: string): Promise<Profile | null> {
    const res = await rest(`profiles?firebase_uid=eq.${encodeURIComponent(uid)}&select=${PROFILE_COLUMNS}`); // Consulta filtrada por usuario
    const rows = (await res.json()) as Profile[]; // Filas encontradas (0 o 1)
    return rows[0] ?? null; // El perfil o null si no existe
  }

  /** Crea el perfil si no existe y lo mantiene al día; asegura el rol base "user". */
  async function ensureProfile(claims: FirebaseClaims): Promise<Profile> {
    let profile = await findProfile(claims.sub); // Busca si ya existe
    if (!profile) {
      // Primera vez: se crea
      const name = (claims.name ?? '').trim().slice(0, 80); // Nombre visible recortado a 80 caracteres
      await rest('profiles?on_conflict=firebase_uid', {
        method: 'POST', // Inserta
        headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, // Si otra petición lo creó a la vez, no falla
        body: JSON.stringify({ firebase_uid: claims.sub, display_name: name || null, email_verified: claims.email_verified === true }), // Datos iniciales
      });
      profile = await findProfile(claims.sub); // Lee el perfil ya creado
      if (!profile) throw new HttpError(502, 'No se pudo crear el perfil'); // No debería pasar; si pasa, se informa
    } else if (claims.email_verified === true && !profile.email_verified) {
      // El correo se verificó después de crear el perfil
      await rest(`profiles?id=eq.${profile.id}`, { method: 'PATCH', body: JSON.stringify({ email_verified: true }) }); // Actualiza la marca
      profile = { ...profile, email_verified: true }; // Refleja el cambio en la respuesta
    }
    if (profile.status !== 'active') throw new HttpError(403, 'Esta cuenta está suspendida o eliminada. Escribe a soporte si crees que es un error.'); // Cuenta bloqueada
    await rest('user_roles?on_conflict=profile_id,role_key', {
      method: 'POST', // Inserta el rol base
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, // Si ya lo tiene, no hace nada
      body: JSON.stringify({ profile_id: profile.id, role_key: 'user' }), // Rol "user"
    });
    return profile; // Perfil listo
  }

  /**
   * Superadministrador inicial: si el correo verificado es el del dueño y todavía no hay ningún superadmin,
   * la base de datos le da el rol una sola vez y lo anota en la auditoría (la regla vive en la base, no aquí).
   * Nunca impide el inicio de sesión: si algo falla, queda en los registros y la persona entra igual.
   */
  async function bootstrapSuperadmin(claims: FirebaseClaims): Promise<void> {
    if (claims.email_verified !== true || !claims.email) return; // Solo se revisan correos verificados por Firebase
    try {
      await rest('rpc/session_bootstrap_superadmin', {
        method: 'POST', // Llama a la función de la base
        body: JSON.stringify({ p_firebase_uid: claims.sub, p_email: claims.email, p_email_verified: true }), // Datos del token ya verificado
      });
    } catch (e) {
      console.error('preparar-sesion: no se pudo revisar el superadmin inicial', e); // Queda en los registros de Supabase; el inicio de sesión sigue
    }
  }

  /** Obtiene un token de acceso de Google con la cuenta de servicio (o usa el guardado). */
  async function getGoogleToken(sa: ServiceAccount): Promise<string> {
    if (googleToken && googleToken.expires > now() + 60) return googleToken.token; // Sirve si le queda más de un minuto
    const res = await deps.fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', // Pide el token
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, // Formato que exige Google
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', // Tipo de intercambio: aserción firmada
        assertion: await buildServiceAssertion(sa, now()), // Aserción firmada con la clave privada
      }).toString(),
    });
    if (!res.ok) throw new HttpError(503, 'Google rechazó la cuenta de servicio'); // Cuenta mal configurada o revocada
    const body = (await res.json()) as { access_token: string; expires_in: number }; // Token y su duración
    googleToken = { token: body.access_token, expires: now() + body.expires_in }; // Lo guarda para siguientes peticiones
    return body.access_token; // Devuelve el token
  }

  /** Agrega role=authenticated a la cuenta de Firebase sin borrar otros atributos que ya tenga. */
  async function assignRole(uid: string, projectId: string, sa: ServiceAccount): Promise<void> {
    const token = await getGoogleToken(sa); // Token de acceso a Google
    const base = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}`; // Servicio de cuentas de Firebase
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }; // Cabeceras comunes
    const lookup = await deps.fetch(`${base}/accounts:lookup`, { method: 'POST', headers, body: JSON.stringify({ localId: [uid] }) }); // Lee la cuenta
    if (!lookup.ok) throw new HttpError(503, 'No se pudo leer la cuenta en Firebase'); // Error de Google
    const found = (await lookup.json()) as { users?: Array<{ customAttributes?: string }> }; // Datos de la cuenta
    const current = JSON.parse(found.users?.[0]?.customAttributes ?? '{}') as Record<string, unknown>; // Atributos que ya tenga
    const update = await deps.fetch(`${base}/accounts:update`, {
      method: 'POST', // Actualiza la cuenta
      headers, // Mismas cabeceras
      body: JSON.stringify({ localId: uid, customAttributes: JSON.stringify({ ...current, role: 'authenticated' }) }), // Conserva lo anterior y agrega el rol
    });
    if (!update.ok) throw new HttpError(503, 'No se pudo asignar el rol en Firebase'); // Error de Google
  }

  return async function handle(req: Request): Promise<Response> {
    const cors = corsHeaders(req.headers.get('origin'), deps.config.allowedOrigins); // Cabeceras CORS de esta petición
    const json = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } }); // Respuesta JSON con CORS
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors }); // Consulta previa del navegador
    if (req.method !== 'POST') return json(405, { error: 'Usa POST' }); // Solo se acepta POST

    try {
      const { firebaseProjectId, supabaseUrl, serviceRoleKey, serviceAccountJson } = deps.config; // Configuración
      if (!firebaseProjectId || !supabaseUrl || !serviceRoleKey) throw new HttpError(503, 'El inicio de sesión aún no está configurado en el servidor'); // Faltan secretos
      const auth = req.headers.get('authorization') ?? ''; // Cabecera con el token
      const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''; // Extrae el token
      if (!token) throw new HttpError(401, 'Falta el token de sesión'); // Sin token no hay a quién preparar

      const claims = await verify(token, firebaseProjectId); // Comprueba que el token es auténtico
      const profile = await ensureProfile(claims); // Crea o actualiza el perfil (y bloquea cuentas suspendidas)
      await bootstrapSuperadmin(claims); // Si es la cuenta del dueño, la base le da superadmin la primera vez

      let needsRefresh = false; // Si el cliente debe pedir un token nuevo
      if (needsRole(claims)) {
        // El token todavía no trae el rol que Supabase exige
        if (!serviceAccountJson) throw new HttpError(503, 'La asignación de rol aún no está configurada en el servidor'); // Falta la cuenta de servicio
        await assignRole(claims.sub, firebaseProjectId, JSON.parse(serviceAccountJson) as ServiceAccount); // Agrega el rol en Firebase
        needsRefresh = true; // El próximo token ya lo traerá
      }
      return json(200, { needs_refresh: needsRefresh, profile }); // Todo listo
    } catch (e) {
      if (e instanceof HttpError) return json(e.status, { error: e.message }); // Error conocido con su código
      console.error('preparar-sesion', e); // Error inesperado: queda en los registros de Supabase
      return json(500, { error: 'Error inesperado al preparar la sesión' }); // Mensaje genérico al cliente
    }
  };
}
