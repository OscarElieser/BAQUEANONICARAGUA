// Funciones de Firebase Authentication que preparan cada sesión para Supabase.
// Supabase solo trata a un usuario como "autenticado" si su token trae el dato role: 'authenticated'.
// Requisito: Firebase con Identity Platform (las funciones "blocking" solo existen ahí).

import { beforeUserCreated, beforeUserSignedIn } from 'firebase-functions/v2/identity'; // Ganchos que se ejecutan antes de crear o iniciar sesión
import { HttpsError } from 'firebase-functions/v2/https'; // Error que Firebase muestra al usuario si bloqueamos el acceso

const SUPABASE_ROLE = { role: 'authenticated' } as const; // Dato que Supabase lee para dar permisos de usuario autenticado

// Se ejecuta justo antes de crear una cuenta nueva (correo o Google)
export const antesDeCrearUsuario = beforeUserCreated((event) => {
  const email = event.data?.email ?? ''; // Correo de la cuenta que se está creando (puede venir vacío)
  if (email.length > 254) {
    // Rechazamos correos imposibles para evitar cuentas basura
    throw new HttpsError('invalid-argument', 'El correo no es válido.');
  }
  return { customClaims: SUPABASE_ROLE }; // Guardamos el rol en el perfil de Firebase para todas las sesiones futuras
});

// Se ejecuta antes de cada inicio de sesión
export const antesDeIniciarSesion = beforeUserSignedIn((event) => {
  if (event.data?.disabled) {
    // Si la cuenta fue desactivada en Firebase, no la dejamos entrar
    throw new HttpsError('permission-denied', 'Esta cuenta está desactivada.');
  }
  return { sessionClaims: SUPABASE_ROLE }; // Aseguramos el rol en el token aunque la cuenta sea anterior a esta función
});
