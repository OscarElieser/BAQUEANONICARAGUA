// Atiende cada mensaje a BAQÜI. Recibe sus dependencias (configuración y fetch) para probarlo en Node sin red.
// Pasos: 1) abre el turno en la base de datos con el token de la persona (comprueba sesión y límite diario);
// 2) arma el contexto solo con datos publicados, envueltos como DATOS; 3) llama a Gemini con la clave del servidor;
// 4) quita las cifras de dinero sin fuente; 5) guarda la respuesta con la clave de servicio y la devuelve.

import { checkGrounding, wrapUntrusted } from './guard.ts'; // Protecciones (copia exacta de packages/ai-core)
import { PROMPT_VERSION, SYSTEM_PROMPT } from './prompt.ts'; // Instrucciones de BAQÜI

/** Configuración (secretos de Supabase, nunca en web ni Android). */
export interface Config {
  geminiApiKey?: string; // Clave de Google Gemini (secreto GEMINI_API_KEY)
  geminiModel: string; // Modelo (secreto opcional GEMINI_MODEL)
  supabaseUrl?: string; // Dirección del proyecto (la pone Supabase)
  anonKey?: string; // Clave pública (la pone Supabase)
  serviceRoleKey?: string; // Clave de servicio (la pone Supabase)
  allowedOrigins: string[]; // Orígenes web permitidos
}

/** Dependencias reemplazables en las pruebas. */
export interface Deps {
  config: Config; // Configuración
  fetch: typeof fetch; // Peticiones HTTP
  nonce?: () => string; // Generador del delimitador de datos
}

type Turno = { conversation_id: string; history: Array<{ role: 'user' | 'assistant'; text: string }>; territories: Array<{ name: string; kind: string; capital: string | null; source: string | null }> }; // Lo que devuelve baqui_start

const IDIOMAS: Record<string, string> = { es: 'español', en: 'inglés', fr: 'francés', pt: 'portugués', de: 'alemán', it: 'italiano', ja: 'japonés', ko: 'coreano', ru: 'ruso', 'zh-Hans': 'chino simplificado' }; // Idioma de respuesta

/** Cabeceras CORS: solo los orígenes web permitidos (Android no envía origen). */
function cors(origin: string | null, allowed: string[]): Record<string, string> {
  const ok = origin !== null && (allowed.includes(origin) || allowed.includes('*')); // Si el origen está permitido
  return { 'Access-Control-Allow-Origin': ok ? origin! : allowed[0] ?? '', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' }; // Cabeceras
}

/** Nonce aleatorio de 24 caracteres para delimitar los datos. */
function nonceAleatorio(): string {
  const b = crypto.getRandomValues(new Uint8Array(18)); // 18 bytes al azar
  return Array.from(b, (x) => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[x % 62]).join('').slice(0, 24); // Letras y números
}

/** Quita de la respuesta las cifras de dinero que no tienen fuente (hoy ninguna la tiene). */
export function quitarCifrasSinFuente(texto: string): { texto: string; quitadas: string[] } {
  const { unsupported } = checkGrounding(texto, []); // Cifras sin respaldo
  let limpio = texto; // Copia
  for (const u of unsupported) limpio = limpio.replaceAll(u, '[por cotizar]'); // Reemplaza cada una
  return { texto: limpio, quitadas: unsupported }; // Resultado
}

/** Arma el pedido a Gemini: instrucciones, datos publicados envueltos e historial. */
export function pedidoGemini(turno: Turno, locale: string, nonce: string): unknown {
  const datos = turno.territories.map((t) => `- ${t.name} (${t.kind === 'autonomous_region' ? 'región autónoma' : 'departamento'}; ${t.kind === 'autonomous_region' ? 'sede' : 'cabecera'}: ${t.capital ?? 'sin confirmar'}; fuente: ${t.source ?? 'sin fuente'})`).join('\n'); // Territorios publicados
  const envuelto = wrapUntrusted(`Territorios publicados en BAQUEANO:\n${datos || '(ninguno)'}\nDestinos publicados: ninguno todavía.\nNegocios publicados: ninguno todavía.\nTarifas verificadas: ninguna todavía.`, 'base de datos de BAQUEANO (solo contenido publicado)', nonce); // Datos como DATOS
  const instrucciones = `${SYSTEM_PROMPT}\n\nResponde en ${IDIOMAS[locale] ?? 'español'}.\n\n${envuelto.text}`; // Instrucciones con los datos al final
  return {
    systemInstruction: { parts: [{ text: instrucciones }] }, // Instrucciones del sistema
    contents: turno.history.map((h) => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.text }] })), // Historial (incluye el mensaje nuevo)
    generationConfig: { temperature: 0.4, maxOutputTokens: 900 }, // Respuestas sobrias y cortas
  };
}

/** Crea la función que atiende las peticiones. */
export function createHandler(deps: Deps): (req: Request) => Promise<Response> {
  const c = deps.config; // Configuración
  return async (req) => {
    const h = cors(req.headers.get('origin'), c.allowedOrigins); // Cabeceras CORS
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...h, 'Content-Type': 'application/json' } }); // Respuesta JSON
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h }); // Pregunta previa del navegador
    if (req.method !== 'POST') return json(405, { error: 'method' }); // Solo POST
    if (!c.geminiApiKey) return json(503, { error: 'not_configured' }); // Sin clave: lo dice, no simula respuestas
    if (!c.supabaseUrl || !c.anonKey || !c.serviceRoleKey) return json(503, { error: 'not_configured' }); // Sin Supabase
    const auth = req.headers.get('authorization') ?? ''; // Token de Firebase de la persona
    if (!/^Bearer\s+\S+$/.test(auth)) return json(401, { error: 'sign_in' }); // Sin sesión
    let body: { message?: unknown; locale?: unknown; conversation_id?: unknown }; // Cuerpo esperado
    try {
      body = await req.json(); // Lee el cuerpo
    } catch {
      return json(400, { error: 'bad_request' }); // JSON inválido
    }
    const locale = typeof body.locale === 'string' && body.locale in IDIOMAS ? body.locale : 'es'; // Idioma válido
    const inicio = await deps.fetch(`${c.supabaseUrl}/rest/v1/rpc/baqui_start`, { method: 'POST', headers: { apikey: c.anonKey, Authorization: auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_message: body.message, p_locale: locale, p_conversation: typeof body.conversation_id === 'string' ? body.conversation_id : null }) }); // Abre el turno con la sesión de la persona
    if (!inicio.ok) {
      const e = (await inicio.json().catch(() => ({}))) as { code?: string }; // Error de la base de datos
      if (e.code === '54000') return json(429, { error: 'limit' }); // Límite diario
      if (e.code === '42501' || inicio.status === 401) return json(401, { error: 'sign_in' }); // Sin sesión válida
      return json(400, { error: 'bad_request' }); // Mensaje inválido
    }
    const turno = (await inicio.json()) as Turno; // Conversación, historial y territorios
    const modelo = await deps.fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(c.geminiModel)}:generateContent`, { method: 'POST', headers: { 'x-goog-api-key': c.geminiApiKey, 'Content-Type': 'application/json' }, body: JSON.stringify(pedidoGemini(turno, locale, (deps.nonce ?? nonceAleatorio)())) }); // Llama a Gemini
    if (!modelo.ok) return json(502, { error: 'model' }); // El modelo no respondió
    const r = (await modelo.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } }; // Respuesta de Gemini
    const crudo = (r.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim(); // Texto
    if (!crudo) return json(502, { error: 'model' }); // Respuesta vacía (o bloqueada por seguridad)
    const { texto, quitadas } = quitarCifrasSinFuente(crudo); // Sin precios inventados
    await deps.fetch(`${c.supabaseUrl}/rest/v1/rpc/baqui_reply`, { method: 'POST', headers: { apikey: c.serviceRoleKey, Authorization: `Bearer ${c.serviceRoleKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_conversation: turno.conversation_id, p_text: texto, p_model: c.geminiModel, p_input_tokens: r.usageMetadata?.promptTokenCount ?? null, p_output_tokens: r.usageMetadata?.candidatesTokenCount ?? null, p_cited: [], p_redacted: quitadas }) }); // Guarda la respuesta (solo el servidor puede)
    return json(200, { conversation_id: turno.conversation_id, text: texto, prompt: PROMPT_VERSION, model: c.geminiModel }); // Devuelve la respuesta
  };
}
