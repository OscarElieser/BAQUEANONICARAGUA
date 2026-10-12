'use client'; // Este módulo se usa solo en el navegador

// Import the functions you need from the SDKs you need
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app'; // Inicialización de la app de Firebase
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics'; // Métrica y analítica de Firebase
import { getAuth, type Auth } from 'firebase/auth'; // Servicio de autenticación
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyB9Qe0XfaS54ew1IakQSZC_kxg398Lrfrc', // Clave pública del proyecto (no es secreta)
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'baqueanonicaragua-95755.firebaseapp.com', // Dominio que muestra la ventana de inicio de sesión
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'baqueanonicaragua-95755', // Identificador del proyecto de Firebase
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'baqueanonicaragua-95755.firebasestorage.app', // Depósito de almacenamiento de archivos
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '680635942850', // Identificador del remitente de mensajería
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:680635942850:web:4e95398ea13e8990e2785b', // Identificador de esta app web dentro del proyecto
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-EQ5NPPS80B', // Identificador de métricas y analítica
};

const config = firebaseConfig; // Alias para compatibilidad con código existente

/** true solo cuando el proyecto Firebase está configurado para este entorno. */
export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId); // Exige los tres datos mínimos

// Initialize Firebase
let appInstance: FirebaseApp | undefined; // Guarda la app ya inicializada para no repetirla

/** Devuelve la instancia de la aplicación Firebase o la inicializa si aún no existe */
export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null; // Sin configuración mínima devolvemos null
  if (!appInstance) {
    appInstance = getApps()[0] ?? initializeApp(firebaseConfig); // Reutiliza la app si ya existe; si no, la crea
  }
  return appInstance; // Retorna la instancia de Firebase
}

let analyticsInstance: Analytics | null = null; // Guarda la instancia de analítica

/**
 * Obtiene o inicializa Firebase Analytics respetando soporte del entorno del navegador.
 * Solo con consentimiento: quien la llame debe pasar la elección de "Medición" del aviso de cookies.
 * Además, la política de seguridad (CSP) no permite todavía los dominios de Google Analytics: hay que agregarlos a propósito.
 */
export async function getFirebaseAnalytics(consentimiento: boolean): Promise<Analytics | null> {
  if (!consentimiento) return null; // Sin consentimiento no hay analítica (regla de privacidad del proyecto)
  if (typeof window === 'undefined') return null; // En el servidor no se ejecuta analítica
  const app = getFirebaseApp(); // Obtiene la aplicación de Firebase
  if (!app) return null; // Si no hay app configurada no se inicializa analítica
  if (analyticsInstance) return analyticsInstance; // Reutiliza la instancia existente
  const supported = await isSupported(); // Comprueba si el navegador actual soporta Analytics
  if (!supported) return null; // Si el entorno no soporta analítica devolvemos null
  analyticsInstance = getAnalytics(app); // Inicializa Analytics con la app de Firebase
  return analyticsInstance; // Retorna la instancia de analítica
}

export function firebaseAuth(): Auth | null {
  if (!isFirebaseConfigured) return null; // Sin configuración devolvemos null y cada pantalla lo explica
  const app = getFirebaseApp(); // Obtiene la app inicializada
  if (!app) return null; // Sin app no hay servicio de autenticación
  return getAuth(app); // Devuelve el servicio de autenticación
}
