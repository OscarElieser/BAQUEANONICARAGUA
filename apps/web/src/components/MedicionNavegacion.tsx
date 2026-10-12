'use client'; // Escucha los cambios de página en el navegador

import publica from '@/config/publica.json'; // Valores públicos del proyecto oficial (el entorno puede cambiarlos)
import { usePathname } from 'next/navigation'; // Ruta actual
import { useEffect, useState } from 'react'; // Efectos y estado
import { browserOptsOut, CONSENT_EVENT, readConsent } from '@/lib/consent'; // Consentimiento

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || publica.supabaseUrl; // Dirección de Supabase
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || publica.supabasePublishableKey; // Clave pública (no secreta)
const PRIVATE = /^\/[^/]+\/(cuenta|ops|mensajes|mi-aventura)(\/|$)/; // Zonas privadas que nunca se miden

/** Ruta limpia: sin parámetros ni fragmentos y solo con caracteres seguros (así nunca viaja un dato personal). */
export function cleanPath(pathname: string): string {
  const path = pathname.split(/[?#]/)[0]; // Quita parámetros y fragmento
  return ('/' + path.replace(/^\/+/, '')).replace(/[^A-Za-z0-9/_-]/g, '-').slice(0, 200); // Reemplaza lo no permitido y recorta
}

/** Código al azar de esta pestaña; desaparece al cerrarla. */
function visitId(): string | null {
  try {
    let id = sessionStorage.getItem('nica_visita'); // Busca el código existente
    if (!id) {
      id = crypto.randomUUID(); // Crea uno nuevo al azar
      sessionStorage.setItem('nica_visita', id); // Lo guarda solo para esta pestaña
    }
    return id; // Devuelve el código
  } catch {
    return null; // Almacenamiento bloqueado: no se mide
  }
}

/** Solo el dominio de procedencia si viene de otro sitio (nunca la dirección completa). */
function referrerHost(): string | null {
  try {
    const host = document.referrer ? new URL(document.referrer).hostname : ''; // Dominio de la página anterior
    return host && host !== location.hostname ? host : null; // Solo si es externo
  } catch {
    return null; // Dirección ilegible
  }
}

/** Registra cada página vista, únicamente con consentimiento de medición. No pinta nada. */
export function MedicionNavegacion({ locale }: { locale: string }) {
  const pathname = usePathname(); // Ruta actual
  const [allowed, setAllowed] = useState(false); // Si hay consentimiento

  useEffect(() => {
    const update = () => setAllowed(readConsent()?.medicion === true && !browserOptsOut()); // Recalcula el permiso
    update(); // Al cargar
    window.addEventListener(CONSENT_EVENT, update); // Cuando la persona cambia su elección
    return () => window.removeEventListener(CONSENT_EVENT, update); // Deja de escuchar al desmontar
  }, []); // Solo una vez

  useEffect(() => {
    if (!allowed || !SUPABASE_URL || !SUPABASE_KEY || !pathname || PRIVATE.test(pathname)) return; // Sin permiso, sin configuración o zona privada
    const id = visitId(); // Código de la pestaña
    if (!id) return; // Sin almacenamiento no medimos
    fetch(`${SUPABASE_URL}/rest/v1/rpc/track_navigation`, {
      method: 'POST', // Llama a la función de la base de datos
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' }, // Como visitante anónimo, aunque haya sesión
      body: JSON.stringify({ p_visit: id, p_path: cleanPath(pathname), p_locale: locale, p_referrer_host: referrerHost(), p_platform: 'web' }), // Datos mínimos
      keepalive: true, // Se envía aunque la persona cambie de página enseguida
    }).catch(() => undefined); // Si falla la medición, la navegación sigue normal
  }, [allowed, pathname, locale]); // Cada cambio de página

  return null; // No muestra nada
}
