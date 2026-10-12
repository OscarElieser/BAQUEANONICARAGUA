/**
 * Herramientas del asistente (sección 9). Tres niveles:
 *  - read:    responde/recomienda con datos aprobados; sin efectos.
 *  - propose: prepara un borrador visible para el usuario; sin efectos hasta que acepte.
 *  - act:     modifica datos privados, envía mensajes o publica: exige confirmación explícita
 *             del usuario para ESA llamada concreta y sesión iniciada.
 * La IA nunca recibe herramientas para escribir en contenido publicado, políticas o código.
 */

export type ToolLevel = 'read' | 'propose' | 'act';

export interface ToolDef {
  name: string;
  description: string;
  level: ToolLevel;
  requiresLogin: boolean;
  input: Record<string, unknown>; // JSON Schema
}

const obj = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: 'object', additionalProperties: false, properties, required,
});

export const TOOLS: ToolDef[] = [
  { name: 'search_destinations', level: 'read', requiresLogin: false,
    description: 'Busca destinos PUBLICADOS y verificados del catálogo por texto, territorio o categoría.',
    input: obj({ q: { type: 'string', maxLength: 80 }, department: { type: 'integer', minimum: 1, maximum: 17 }, category: { type: 'string' } }) },
  { name: 'search_businesses', level: 'read', requiresLogin: false,
    description: 'Busca emprendimientos publicados (sin patrocinados) por texto, territorio o categoría.',
    input: obj({ q: { type: 'string', maxLength: 80 }, department: { type: 'integer', minimum: 1, maximum: 17 }, category: { type: 'string' } }) },
  { name: 'get_territory', level: 'read', requiresLogin: false,
    description: 'Devuelve la información editorial aprobada de un territorio.',
    input: obj({ slug: { type: 'string' } }, ['slug']) },
  { name: 'get_weather', level: 'read', requiresLogin: false,
    description: 'Pronóstico del proveedor meteorológico con licencia, con fuente y hora de actualización.',
    input: obj({ lat: { type: 'number' }, lng: { type: 'number' } }, ['lat', 'lng']) },
  { name: 'get_route', level: 'read', requiresLogin: false,
    description: 'Distancia y duración entre dos puntos desde el proveedor de rutas. Única fuente válida de tiempos de traslado.',
    input: obj({ from: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 }, to: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 }, mode: { enum: ['car', 'walk', 'bus'] } }, ['from', 'to']) },
  { name: 'get_safety_advice', level: 'read', requiresLogin: false,
    description: 'Recomendaciones de seguridad y restricciones confirmadas para un destino.',
    input: obj({ destination_id: { type: 'string' } }, ['destination_id']) },
  { name: 'calculate_budget', level: 'read', requiresLogin: false,
    description: 'Calcula totales separando precios confirmados, estimaciones y partidas por cotizar.',
    input: obj({ items: { type: 'array' }, travelers: { type: 'integer', minimum: 1 } }, ['items', 'travelers']) },
  { name: 'show_map', level: 'read', requiresLogin: false,
    description: 'Muestra en el mapa los lugares mencionados (solo ubicaciones públicas).',
    input: obj({ ids: { type: 'array', items: { type: 'string' }, maxItems: 30 } }, ['ids']) },
  { name: 'draft_itinerary', level: 'propose', requiresLogin: false,
    description: 'Arma un borrador de itinerario editable; no se guarda hasta que el usuario lo acepte.',
    input: obj({ days: { type: 'integer', minimum: 1, maximum: 30 }, travelers: { type: 'integer', minimum: 1 }, interests: { type: 'array' } }, ['days']) },
  { name: 'draft_incident_report', level: 'propose', requiresLogin: true,
    description: 'Prepara un borrador de denuncia; el usuario lo revisa y decide si lo envía.',
    input: obj({ category: { type: 'string' }, description: { type: 'string', maxLength: 8000 } }, ['category', 'description']) },
  { name: 'propose_correction', level: 'propose', requiresLogin: false,
    description: 'Propone corregir un dato que parece incorrecto. Va a revisión humana; no cambia nada publicado.',
    input: obj({ entity_table: { type: 'string' }, entity_id: { type: 'string' }, field: { type: 'string' }, proposed_value: {}, rationale: { type: 'string' }, evidence: { type: 'array' } }, ['entity_table', 'entity_id', 'field', 'proposed_value', 'rationale']) },
  { name: 'save_trip', level: 'act', requiresLogin: true,
    description: 'Guarda el itinerario en "Mi aventura" del usuario.',
    input: obj({ itinerary: { type: 'object' } }, ['itinerary']) },
  { name: 'request_contact', level: 'act', requiresLogin: true,
    description: 'Envía una consulta al negocio por la mensajería de la plataforma, con el texto que el usuario aprobó.',
    input: obj({ business_id: { type: 'string' }, message: { type: 'string', maxLength: 8000 } }, ['business_id', 'message']) },
  { name: 'remember_preference', level: 'act', requiresLogin: true,
    description: 'Guarda una preferencia en la memoria persistente, solo con consentimiento.',
    input: obj({ kind: { enum: ['preference', 'constraint', 'accessibility', 'interest'] }, content: { type: 'string', maxLength: 500 } }, ['kind', 'content']) },
];

/** Herramientas que la IA nunca debe tener (cualquier intento se rechaza y registra). */
export const FORBIDDEN_TOOL_PATTERNS = [/publish/i, /approve/i, /delete/i, /sql/i, /policy/i, /deploy/i, /role/i, /moderate/i];

export interface ToolCallContext {
  authenticated: boolean;
  /** Ids de llamadas que el usuario confirmó explícitamente en la interfaz. */
  confirmedCallIds: ReadonlySet<string>;
}

export type Authorization =
  | { status: 'allowed' }
  | { status: 'needs_login'; message: string }
  | { status: 'needs_confirmation'; message: string }
  | { status: 'denied'; message: string };

export function authorizeToolCall(name: string, callId: string, ctx: ToolCallContext): Authorization {
  // Solo existen las herramientas registradas; cualquier otra (p. ej. "publish_*", "run_sql") se rechaza.
  const def = TOOLS.find((t) => t.name === name);
  if (!def) {
    return { status: 'denied', message: `Herramienta no permitida: ${name}` };
  }
  if (def.requiresLogin && !ctx.authenticated) {
    return { status: 'needs_login', message: 'Para eso necesitas iniciar sesión.' };
  }
  if (def.level === 'act' && !ctx.confirmedCallIds.has(callId)) {
    return { status: 'needs_confirmation', message: `Confirma antes de continuar: ${def.description}` };
  }
  return { status: 'allowed' };
}

/** Validación mínima del input contra el esquema (tipos, requeridos, sin campos extra). */
export function validateToolInput(name: string, input: unknown): string[] {
  const def = TOOLS.find((t) => t.name === name);
  if (!def) return ['herramienta desconocida'];
  const schema = def.input as { properties: Record<string, { type?: string; maxLength?: number; minimum?: number; maximum?: number; enum?: unknown[] }>; required: string[] };
  const errors: string[] = [];
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return ['la entrada debe ser un objeto'];
  const rec = input as Record<string, unknown>;
  for (const r of schema.required) if (!(r in rec)) errors.push(`falta ${r}`);
  for (const [k, v] of Object.entries(rec)) {
    const p = schema.properties[k];
    if (!p) { errors.push(`campo no permitido: ${k}`); continue; }
    if (p.enum && !p.enum.includes(v)) errors.push(`${k}: valor no permitido`);
    if (p.type === 'string' && typeof v !== 'string') errors.push(`${k}: debe ser texto`);
    if (p.type === 'string' && typeof v === 'string' && p.maxLength && v.length > p.maxLength) errors.push(`${k}: demasiado largo`);
    if ((p.type === 'integer' || p.type === 'number') && typeof v !== 'number') errors.push(`${k}: debe ser número`);
    if (p.type === 'integer' && typeof v === 'number' && !Number.isInteger(v)) errors.push(`${k}: debe ser entero`);
    if (typeof v === 'number' && p.minimum != null && v < p.minimum) errors.push(`${k}: menor que ${p.minimum}`);
    if (typeof v === 'number' && p.maximum != null && v > p.maximum) errors.push(`${k}: mayor que ${p.maximum}`);
    if (p.type === 'array' && !Array.isArray(v)) errors.push(`${k}: debe ser lista`);
  }
  return errors;
}
