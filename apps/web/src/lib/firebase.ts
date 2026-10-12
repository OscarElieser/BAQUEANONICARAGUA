'use client'; // Este módulo se usa solo en el navegador

import { getApps, initializeApp, type FirebaseApp } from 'firebase/app'; // Inicialización de la app de Firebase
import { getAuth, type Auth } from 'firebase/auth'; // Servicio de autenticación

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY, // Clave pública del proyecto (no es secreta)
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, // Dominio que muestra la ventana de inicio de sesión
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, // Identificador del proyecto de Firebase
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID, // Identificador de esta app web dentro del proyecto
};

/** true solo cuando el proyecto Firebase está configurado para este entorno. */
export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId); // Exige los tres datos mínimos

let app: FirebaseApp | undefined; // Guarda la app ya inicializada para no repetirla
export function firebaseAuth(): Auth | null {
  if (!isFirebaseConfigured) return null; // Sin configuración devolvemos null y cada pantalla lo explica
  app = getApps()[0] ?? initializeApp(config); // Reutiliza la app si ya existe; si no, la crea
  return getAuth(app); // Devuelve el servicio de autenticación
}
