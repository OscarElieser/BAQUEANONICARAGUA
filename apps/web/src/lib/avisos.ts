'use client'; // Solo en el navegador: usa permisos, trabajador y sesión

// Avisos push en este navegador con Firebase Cloud Messaging.
// La clave VAPID es pública (va en la web); el token del navegador se guarda con push_register (función de la base
// que exige sesión). El envío lo hace la función de Supabase "enviar-avisos" con la cuenta de servicio, nunca la web.
import { deleteToken, getMessaging, getToken, isSupported } from 'firebase/messaging'; // Mensajería de Firebase
import publica from '@/config/publica.json'; // Clave VAPID pública del proyecto
import { getFirebaseApp } from './firebase'; // App de Firebase
import { supabase } from './supabase'; // Base de datos con la sesión de la persona

const VAPID = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || publica.firebaseVapidKey; // Clave pública de avisos web
const GUARDADO = 'baqueano:aviso-token'; // Dónde recuerda este navegador su token (para poder apagarlo)

export type EstadoAvisos = 'no_soportado' | 'bloqueado' | 'apagado' | 'activado'; // Estados que ve la persona

/** Lee el token recordado (o null si no hay o el navegador no deja guardar). */
function leer(): string | null {
  try {
    return localStorage.getItem(GUARDADO); // Token guardado
  } catch {
    return null; // Navegación privada u otro bloqueo
  }
}

/** Recuerda o borra el token de este navegador. */
function recordar(token: string | null): void {
  try {
    if (token) localStorage.setItem(GUARDADO, token); // Guarda
    else localStorage.removeItem(GUARDADO); // Borra
  } catch {
    // Si el navegador no deja guardar, los avisos igual funcionan; solo no se podrán apagar desde aquí
  }
}

/** Si este navegador puede recibir avisos (HTTPS, trabajador, notificaciones y soporte de Firebase). */
async function soportado(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator) || !VAPID) return false; // Faltan piezas del navegador o la clave
  if (!getFirebaseApp()) return false; // Firebase no está configurado en este entorno
  return isSupported().catch(() => false); // Firebase revisa el resto (push e IndexedDB)
}

/** Estado actual de los avisos en este navegador. */
export async function estadoAvisos(): Promise<EstadoAvisos> {
  if (!(await soportado())) return 'no_soportado'; // No se puede aquí
  if (Notification.permission === 'denied') return 'bloqueado'; // La persona los bloqueó en el navegador
  return Notification.permission === 'granted' && leer() ? 'activado' : 'apagado'; // Activado solo con permiso y token guardado
}

/** Pide permiso, obtiene el token de este navegador y lo guarda en la cuenta. */
export async function activarAvisos(): Promise<EstadoAvisos> {
  if (!(await soportado())) return 'no_soportado'; // No se puede aquí
  const permiso = await Notification.requestPermission(); // Pregunta del navegador
  if (permiso === 'denied') return 'bloqueado'; // Dijo que no
  if (permiso !== 'granted') return 'apagado'; // Cerró la pregunta sin elegir
  const registro = await navigator.serviceWorker.register('/sw.js', { scope: '/' }); // El mismo trabajador de la web muestra los avisos
  await navigator.serviceWorker.ready; // Espera a que esté activo
  const token = await getToken(getMessaging(getFirebaseApp()!), { vapidKey: VAPID, serviceWorkerRegistration: registro }); // Token de este navegador
  const { error } = await supabase.rpc('push_register', { p_token: token, p_platform: 'web' }); // Lo guarda en la cuenta (la base exige sesión)
  if (error) throw new Error(error.message); // Error claro
  recordar(token); // Lo recuerda para poder apagarlo
  return 'activado'; // Listo
}

/** Apaga los avisos de este navegador: borra el token en Firebase y en la cuenta. */
export async function apagarAvisos(): Promise<EstadoAvisos> {
  const token = leer(); // Token recordado
  if (token) {
    await supabase.from('push_tokens').delete().eq('token', token); // Lo quita de la cuenta (RLS: solo los propios)
  }
  if (await soportado()) await deleteToken(getMessaging(getFirebaseApp()!)).catch(() => false); // Lo invalida en Firebase
  recordar(null); // Olvida el token
  return (await estadoAvisos()) === 'bloqueado' ? 'bloqueado' : 'apagado'; // Estado final
}

/** Al cerrar sesión: este navegador deja de recibir los avisos de esa cuenta (útil en computadoras compartidas). */
export async function quitarAvisosAlSalir(): Promise<void> {
  if (!leer()) return; // No había avisos activados aquí
  await apagarAvisos().catch(() => {}); // Si falla, la sesión se cierra igual
}
