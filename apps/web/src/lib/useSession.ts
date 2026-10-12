'use client'; // Hook que solo funciona en el navegador

import { useEffect, useState } from 'react'; // Estado y efectos de React
import { onAuthStateChanged, type User } from 'firebase/auth'; // Escuchar cambios de sesión
import { completarRedireccion } from './auth'; // Termina un inicio con Google que volvió por redirección
import { firebaseAuth, isFirebaseConfigured } from './firebase'; // Instancia de Firebase y si está configurado

/** Estado de la sesión: sin configurar, cargando, sin sesión o con usuario. */
export type Session =
  | { status: 'not_configured' } // Firebase no está configurado en este entorno
  | { status: 'loading' } // Todavía estamos comprobando si hay sesión
  | { status: 'signed_out' } // Nadie ha iniciado sesión
  | { status: 'signed_in'; user: User }; // Hay un usuario con sesión

/** Devuelve la sesión actual y se actualiza sola al entrar o salir. */
export function useSession(): Session {
  const [session, setSession] = useState<Session>(
    isFirebaseConfigured ? { status: 'loading' } : { status: 'not_configured' }, // Estado inicial según la configuración
  );

  useEffect(() => {
    const auth = firebaseAuth(); // Instancia de Firebase Auth
    if (!auth) return; // Sin Firebase no hay nada que escuchar
    completarRedireccion().catch((e) => console.error('No se pudo completar el inicio con Google', e)); // Prepara el perfil si se volvió de Google (el error queda registrado)
    return onAuthStateChanged(auth, (user) => {
      // Se ejecuta cada vez que alguien entra o sale
      setSession(user ? { status: 'signed_in', user } : { status: 'signed_out' }); // Actualiza el estado visible
    }); // Devolvemos la función que deja de escuchar al desmontar
  }, []); // Solo se configura una vez

  return session; // Estado actual de la sesión
}
