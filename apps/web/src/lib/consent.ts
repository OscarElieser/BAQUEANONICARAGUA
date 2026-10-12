'use client'; // Lee y escribe cookies del navegador

/** Elección de la persona sobre cookies opcionales. Las necesarias no se pueden apagar porque sin ellas no funciona la página. */
export interface Consent {
  v: 1; // Versión del formato (si cambian las categorías, se vuelve a preguntar)
  medicion: boolean; // Si acepta la medición anónima de navegación
  fecha: string; // Cuándo eligió (para poder demostrarlo)
}

export const CONSENT_COOKIE = 'nica_consentimiento'; // Nombre de la cookie (el mismo que dice la página de cookies)
const MAX_AGE = 60 * 60 * 24 * 365; // Dura 12 meses; después se vuelve a preguntar
export const CONSENT_EVENT = 'nica:consentimiento'; // Aviso interno cuando cambia la elección
export const OPEN_EVENT = 'nica:abrir-cookies'; // Aviso interno para abrir el panel de preferencias

/** Lee la elección guardada; null si la persona aún no ha elegido o el formato cambió. */
export function readConsent(): Consent | null {
  try {
    const raw = document.cookie.split('; ').find((c) => c.startsWith(`${CONSENT_COOKIE}=`)); // Busca la cookie
    if (!raw) return null; // Todavía no eligió
    const value = JSON.parse(decodeURIComponent(raw.slice(CONSENT_COOKIE.length + 1))) as Consent; // Lee su contenido
    return value.v === 1 && typeof value.medicion === 'boolean' ? value : null; // Solo si el formato es el actual
  } catch {
    return null; // Cookie dañada o bloqueada: se vuelve a preguntar
  }
}

/** Guarda la elección y avisa al resto de la página. */
export function saveConsent(medicion: boolean): Consent {
  const value: Consent = { v: 1, medicion, fecha: new Date().toISOString() }; // Nueva elección
  const secure = location.protocol === 'https:' ? '; Secure' : ''; // Solo por conexión cifrada cuando hay HTTPS
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(value))}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${secure}`; // Escribe la cookie
  if (!medicion) {
    // Si retira la medición, borramos el código de visita al momento
    try {
      sessionStorage.removeItem('nica_visita'); // Borra el código de la pestaña
    } catch {
      // Almacenamiento bloqueado: no había nada guardado
    }
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value })); // Avisa a quien esté escuchando
  return value; // Devuelve lo guardado
}

/** Si el navegador envía la señal "Global Privacy Control", la respetamos como un no a la medición. */
export function browserOptsOut(): boolean {
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true; // Señal de privacidad del navegador
}

/** Pide abrir el panel de preferencias (lo usa el botón del pie de página). */
export function openConsentPanel(): void {
  window.dispatchEvent(new Event(OPEN_EVENT)); // El aviso de cookies escucha este evento
}
