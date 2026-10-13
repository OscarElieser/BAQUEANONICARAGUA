// Envía los avisos push pendientes con Firebase Cloud Messaging (FCM, API v1).
// La despierta pg_cron cada minuto solo cuando hay avisos pendientes; no recibe datos de afuera:
// toma los avisos de la base con push_claim y anota el resultado real con push_report.
// Recibe sus dependencias (configuración y fetch) para probarla en Node sin red.

import { buildServiceAssertion, SCOPE_AVISOS, type ServiceAccount } from '../preparar-sesion/logic.ts'; // Firma con la cuenta de servicio (solo permiso de avisos)
import { TEXTOS } from './textos.ts'; // Textos de los avisos en 10 idiomas (generados desde content/i18n)

/** Configuración (secretos de Supabase, nunca en web ni Android). */
export interface Config {
  firebaseProjectId?: string; // Proyecto de Firebase (secreto FIREBASE_PROJECT_ID)
  serviceAccountJson?: string; // Cuenta de servicio de Firebase en JSON (secreto FIREBASE_SERVICE_ACCOUNT)
  supabaseUrl?: string; // Dirección del proyecto (la pone Supabase)
  serviceRoleKey?: string; // Clave de servicio (la pone Supabase)
  sitioUrl: string; // Dirección pública de la web, para abrir la página al tocar el aviso
}

/** Dependencias reemplazables en las pruebas. */
export interface Deps {
  config: Config; // Configuración
  fetch: typeof fetch; // Peticiones HTTP
  now?: () => number; // Hora actual en segundos (fija en pruebas)
}

/** Aviso reservado por push_claim. */
export interface Pendiente {
  id: number; // Aviso
  kind: string; // Tipo
  attempts: number; // Intento número
  locale: string; // Idioma de la persona
  tokens: string[]; // Sus dispositivos
}

type Resultado = 'sent' | 'failed' | 'skipped' | 'retry'; // Lo que se anota en la base

const TIPOS = ['new_message', 'post_comment', 'comment_reply', 'incident_update']; // Tipos con texto propio
const RUTAS: Record<string, string> = { new_message: 'mensajes', post_comment: 'comunidad', comment_reply: 'comunidad', incident_update: 'denunciar' }; // Página que abre cada tipo

/** Título y texto del aviso en el idioma de la persona (español si falta). */
export function textoDe(kind: string, locale: string): { title: string; body: string } {
  const clave = TIPOS.includes(kind) ? kind : 'generic'; // Tipo conocido o genérico
  const t = TEXTOS[locale] ?? TEXTOS.es; // Textos del idioma
  return { title: t[`push.${clave}.title`] ?? TEXTOS.es[`push.${clave}.title`], body: t[`push.${clave}.body`] ?? TEXTOS.es[`push.${clave}.body`] }; // Con respaldo en español
}

/** Ruta de la web que abre el aviso (por ejemplo /es/mensajes). */
export function rutaDe(kind: string, locale: string): string {
  const idioma = Object.hasOwn(TEXTOS, locale) ? locale : 'es'; // Idioma válido
  return RUTAS[kind] ? `/${idioma}/${RUTAS[kind]}` : `/${idioma}`; // Página del tipo o portada
}

/** Mensaje de FCM para un dispositivo: texto sin datos personales y la página que abre. */
export function mensajeFcm(token: string, n: Pendiente, sitioUrl: string): unknown {
  const { title, body } = textoDe(n.kind, n.locale); // Texto traducido
  const ruta = rutaDe(n.kind, n.locale); // Página que abre
  return {
    message: {
      token, // Dispositivo
      notification: { title, body }, // Lo que se ve en la notificación
      data: { kind: n.kind, ruta }, // Para que la app sepa qué abrir
      webpush: { fcm_options: { link: `${sitioUrl}${ruta}` }, notification: { icon: `${sitioUrl}/icono-192.png`, badge: `${sitioUrl}/icono-192.png` } }, // Navegador: página e ícono
      android: { priority: 'normal', notification: { tag: n.kind } }, // Android: agrupa por tipo
    },
  };
}

/** Clasifica la respuesta de FCM: entregado, token muerto, falla pasajera o falla del mensaje. */
export function clasificar(status: number, cuerpo: string): 'ok' | 'token_muerto' | 'pasajero' | 'fallo' {
  if (status >= 200 && status < 300) return 'ok'; // Entregado a Firebase
  const codigo = /"errorCode"\s*:\s*"([A-Z_]+)"/.exec(cuerpo)?.[1] ?? ''; // Código de error de FCM
  if (codigo === 'UNREGISTERED' || codigo === 'SENDER_ID_MISMATCH' || status === 404) return 'token_muerto'; // El dispositivo ya no existe o es de otro proyecto
  if (status === 429 || status >= 500 || codigo === 'QUOTA_EXCEEDED' || codigo === 'UNAVAILABLE' || codigo === 'INTERNAL') return 'pasajero'; // Se puede reintentar
  if (status === 401 || status === 403 || codigo === 'THIRD_PARTY_AUTH_ERROR') return 'pasajero'; // Problema de configuración: se reintenta hasta 3 veces
  return 'fallo'; // Mensaje inválido: no se reintenta (no se borra el token por si el problema es del mensaje)
}

/** Crea la función que atiende las peticiones. */
export function createHandler(deps: Deps): (req: Request) => Promise<Response> {
  const c = deps.config; // Configuración
  const now = deps.now ?? (() => Math.floor(Date.now() / 1000)); // Reloj
  let google: { token: string; vence: number } | null = null; // Token de Google guardado mientras siga vigente

  /** Llama a la base con la clave de servicio. */
  async function rpc(nombre: string, cuerpo: unknown): Promise<Response> {
    return deps.fetch(`${c.supabaseUrl}/rest/v1/rpc/${nombre}`, { method: 'POST', headers: { apikey: c.serviceRoleKey!, Authorization: `Bearer ${c.serviceRoleKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }); // Función de la base
  }

  /** Token de acceso de Google solo con permiso para enviar avisos. */
  async function tokenGoogle(sa: ServiceAccount): Promise<string> {
    if (google && google.vence > now() + 60) return google.token; // Sirve si le queda más de un minuto
    const res = await deps.fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', // Pide el token
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, // Formato que exige Google
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: await buildServiceAssertion(sa, now(), SCOPE_AVISOS) }).toString(), // Aserción firmada
    });
    if (!res.ok) throw new Error(`Google rechazó la cuenta de servicio (${res.status})`); // Cuenta mal configurada
    const b = (await res.json()) as { access_token: string; expires_in: number }; // Token y duración
    google = { token: b.access_token, vence: now() + b.expires_in }; // Lo guarda
    return b.access_token; // Token
  }

  return async (req) => {
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }); // Respuesta JSON
    if (req.method !== 'POST') return json(405, { error: 'method' }); // Solo POST (la llama pg_cron)
    if (!c.firebaseProjectId || !c.serviceAccountJson || !c.supabaseUrl || !c.serviceRoleKey) return json(503, { error: 'not_configured' }); // Sin secretos no envía ni toca los avisos

    let sa: ServiceAccount; // Cuenta de servicio
    try {
      sa = JSON.parse(c.serviceAccountJson) as ServiceAccount; // Lee el JSON del secreto
    } catch {
      return json(503, { error: 'not_configured' }); // Secreto mal pegado
    }

    const reserva = await rpc('push_claim', { p_limit: 50 }); // Toma hasta 50 avisos pendientes
    if (!reserva.ok) return json(502, { error: 'db' }); // La base no respondió
    const avisos = (await reserva.json()) as Pendiente[]; // Avisos reservados
    if (avisos.length === 0) return json(200, { avisos: 0 }); // Nada que enviar

    let acceso: string; // Token de Google
    try {
      acceso = await tokenGoogle(sa); // Permiso para enviar
    } catch (e) {
      console.error('enviar-avisos', e); // Queda en los registros
      for (const a of avisos) await rpc('push_report', { p_id: a.id, p_status: 'retry' }); // Se reintentan después (máximo 3 veces)
      return json(503, { error: 'google' }); // Problema con la cuenta de servicio
    }

    const resumen = { avisos: avisos.length, enviados: 0, fallidos: 0, omitidos: 0, reintentos: 0, tokens_borrados: 0 }; // Lo que pasó en esta vuelta
    for (const a of avisos) {
      let entregados = 0; // Dispositivos que recibieron el aviso
      let pasajeros = 0; // Fallas que se pueden reintentar
      const muertos: string[] = []; // Tokens que ya no existen
      for (const token of a.tokens) {
        const res = await deps.fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(c.firebaseProjectId)}/messages:send`, { method: 'POST', headers: { Authorization: `Bearer ${acceso}`, 'Content-Type': 'application/json' }, body: JSON.stringify(mensajeFcm(token, a, c.sitioUrl)) }); // Envía a ese dispositivo
        const tipo = clasificar(res.status, res.ok ? '' : await res.text()); // Qué pasó
        if (tipo === 'ok') entregados++; // Entregado
        else if (tipo === 'token_muerto') muertos.push(token); // Se borrará
        else if (tipo === 'pasajero') pasajeros++; // Se reintentará
      }
      const resultado: Resultado = entregados > 0 ? 'sent' : muertos.length === a.tokens.length ? 'skipped' : pasajeros > 0 ? 'retry' : 'failed'; // Resultado honesto del aviso
      await rpc('push_report', { p_id: a.id, p_status: resultado, p_invalid_tokens: muertos }); // Lo anota en la base
      resumen.tokens_borrados += muertos.length; // Cuenta los tokens borrados
      if (resultado === 'sent') resumen.enviados++; // Cuenta enviados
      else if (resultado === 'skipped') resumen.omitidos++; // Cuenta omitidos
      else if (resultado === 'retry') resumen.reintentos++; // Cuenta reintentos
      else resumen.fallidos++; // Cuenta fallidos
    }
    return json(200, resumen); // Resumen (sin datos personales)
  };
}
