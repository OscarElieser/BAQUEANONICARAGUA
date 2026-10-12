'use client'; // Este módulo solo funciona en el navegador (usa la sesión de Firebase)

import {
  createUserWithEmailAndPassword, // Crea una cuenta con correo y contraseña
  getRedirectResult, // Lee el resultado al volver de la página de Google
  GoogleAuthProvider, // Proveedor para entrar con una cuenta de Google
  sendEmailVerification, // Envía el correo para confirmar la dirección
  sendPasswordResetEmail, // Envía el correo para cambiar la contraseña
  signInWithEmailAndPassword, // Inicia sesión con correo y contraseña
  signInWithPopup, // Abre la ventana de Google para iniciar sesión
  signInWithRedirect, // Alternativa a la ventana cuando el navegador la bloquea
  signOut, // Cierra la sesión
  updateProfile, // Guarda el nombre visible en la cuenta
  type User, // Tipo que describe al usuario con sesión
} from 'firebase/auth';
import { firebaseAuth } from './firebase'; // Instancia de Firebase Auth (o null si no está configurado)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL; // Dirección del proyecto de Supabase
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; // Clave pública de Supabase (no es secreta)

/** Traduce los códigos de error de Firebase a mensajes claros en español. */
export function authErrorMessage(error: unknown): string {
  if (error instanceof CuentaBloqueada) return error.message; // Cuenta suspendida: se muestra tal cual
  const code = (error as { code?: string })?.code ?? ''; // Código del error, por ejemplo "auth/wrong-password"
  const messages: Record<string, string> = {
    // Tabla de códigos conocidos y su mensaje
    'auth/invalid-email': 'El correo no tiene un formato válido.',
    'auth/missing-password': 'Escribe tu contraseña.',
    'auth/invalid-credential': 'El correo o la contraseña no coinciden.',
    'auth/wrong-password': 'El correo o la contraseña no coinciden.',
    'auth/user-not-found': 'El correo o la contraseña no coinciden.',
    'auth/user-disabled': 'Esta cuenta está desactivada. Escribe a soporte si crees que es un error.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.',
    'auth/weak-password': 'La contraseña debe tener al menos 8 caracteres.',
    'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos y vuelve a intentar.',
    'auth/network-request-failed': 'Sin conexión. Revisa tu internet e intenta de nuevo.',
    'auth/popup-closed-by-user': 'Cerraste la ventana de Google antes de terminar.',
    'auth/cancelled-popup-request': 'Cerraste la ventana de Google antes de terminar.',
  };
  return messages[code] ?? 'No se pudo completar. Intenta de nuevo.'; // Mensaje genérico si el código no está en la tabla
}

/** Devuelve la instancia de Auth o lanza un error claro si Firebase no está configurado. */
function requireAuth() {
  const auth = firebaseAuth(); // Intenta obtener Firebase Auth
  if (!auth) throw new Error('El inicio de sesión aún no está disponible.'); // Sin configuración, avisamos sin fallar en silencio
  return auth; // Devuelve la instancia lista para usar
}

/** Error que se muestra cuando la cuenta está suspendida o eliminada (la sesión se cierra). */
export class CuentaBloqueada extends Error {}

/**
 * Prepara la sesión en nuestra plataforma con la función de Supabase "preparar-sesion":
 * 1. la función verifica el token, crea el perfil si es la primera vez y asegura el rol base;
 * 2. si el token aún no trae el rol que Supabase necesita, la función lo agrega y aquí pedimos un token nuevo.
 */
async function prepararSesion(user: User): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return; // Si Supabase no está configurado en este entorno, no hay perfil que crear
  const token = await user.getIdToken(); // Token actual de Firebase
  const res = await fetch(`${SUPABASE_URL}/functions/v1/preparar-sesion`, {
    // Llama a la función de Supabase
    method: 'POST', // Es una acción que escribe datos
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY }, // Token de Firebase y clave pública de Supabase
  });
  if (res.status === 403) {
    // Cuenta suspendida o eliminada
    await signOut(requireAuth()); // Cerramos la sesión para no dejarla a medias
    throw new CuentaBloqueada('Esta cuenta está suspendida. Escribe a soporte si crees que es un error.'); // Mensaje claro
  }
  if (!res.ok) throw new Error('Tu sesión se abrió, pero no pudimos preparar tu perfil. Intenta de nuevo en un momento.'); // Error real, no se oculta
  const body = (await res.json()) as { needs_refresh?: boolean }; // Respuesta de la función
  if (body.needs_refresh) await user.getIdToken(true); // El rol se acaba de agregar: pedimos un token que ya lo traiga
}

/** Inicia sesión con correo y contraseña. */
export async function iniciarSesion(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(requireAuth(), email.trim(), password); // Comprueba correo y contraseña en Firebase
  await prepararSesion(cred.user); // Prepara rol y perfil
  return cred.user; // Devuelve el usuario con sesión
}

/** Crea una cuenta nueva, guarda el nombre y envía el correo de verificación. */
export async function crearCuenta(nombre: string, email: string, password: string): Promise<User> {
  if (password.length < 8) throw Object.assign(new Error(), { code: 'auth/weak-password' }); // Exigimos 8 caracteres o más
  const cred = await createUserWithEmailAndPassword(requireAuth(), email.trim(), password); // Crea la cuenta en Firebase
  await updateProfile(cred.user, { displayName: nombre.trim().slice(0, 80) }); // Guarda el nombre visible (máximo 80 caracteres)
  await sendEmailVerification(cred.user); // Envía el correo para confirmar la dirección
  await prepararSesion(cred.user); // Prepara rol y perfil
  return cred.user; // Devuelve el usuario recién creado
}

/** Inicia sesión con Google; si el navegador bloquea la ventana, usa redirección. */
export async function iniciarConGoogle(): Promise<User | null> {
  const auth = requireAuth(); // Instancia de Firebase Auth
  const provider = new GoogleAuthProvider(); // Configuración para iniciar con Google
  provider.setCustomParameters({ prompt: 'select_account' }); // Siempre deja elegir la cuenta de Google
  try {
    const cred = await signInWithPopup(auth, provider); // Abre la ventana de Google
    await prepararSesion(cred.user); // Prepara rol y perfil
    return cred.user; // Devuelve el usuario con sesión
  } catch (error) {
    if ((error as { code?: string }).code === 'auth/popup-blocked') {
      // El navegador bloqueó la ventana emergente
      await signInWithRedirect(auth, provider); // Redirige a Google y vuelve a esta página al terminar
      return null; // La sesión se completa al volver
    }
    throw error; // Cualquier otro error se muestra al usuario
  }
}

/** Al volver de la página de Google (cuando el navegador bloqueó la ventana), prepara rol y perfil. */
export async function completarRedireccion(): Promise<void> {
  const cred = await getRedirectResult(requireAuth()); // Resultado de la redirección (null si no se venía de Google)
  if (cred) await prepararSesion(cred.user); // Solo si de verdad se inició sesión así
}

/** Envía el correo para recuperar la contraseña. */
export async function recuperarContrasena(email: string): Promise<void> {
  await sendPasswordResetEmail(requireAuth(), email.trim()); // Firebase envía el enlace para cambiar la contraseña
}

/** Vuelve a enviar el correo de verificación. */
export async function reenviarVerificacion(): Promise<void> {
  const user = requireAuth().currentUser; // Usuario con la sesión abierta
  if (!user) throw new Error('Inicia sesión primero.'); // Sin sesión no hay a quién enviarlo
  await sendEmailVerification(user); // Envía de nuevo el correo de verificación
}

/** Cierra la sesión en este navegador. */
export async function cerrarSesion(): Promise<void> {
  await signOut(requireAuth()); // Borra la sesión guardada en el navegador
}
