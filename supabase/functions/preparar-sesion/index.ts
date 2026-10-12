// Función de Supabase "preparar-sesion" (reemplaza las funciones de Firebase).
// La web y Android la llaman justo después de iniciar sesión en Firebase:
//   1. verifica el token de Firebase con las claves públicas de Google;
//   2. crea o actualiza el perfil y el rol base "user" (bloquea cuentas suspendidas);
//   3. si el token no trae role=authenticated, lo agrega a la cuenta de Firebase y pide renovar el token.
// Secretos que se configuran en Supabase (nunca en web ni Android):
//   FIREBASE_PROJECT_ID, FIREBASE_SERVICE_ACCOUNT (JSON) y ALLOWED_ORIGINS (separados por comas).
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los pone Supabase automáticamente.

import { createHandler } from './handler.ts'; // Lógica que atiende cada petición

const handler = createHandler({
  config: {
    firebaseProjectId: Deno.env.get('FIREBASE_PROJECT_ID'), // Proyecto de Firebase
    serviceAccountJson: Deno.env.get('FIREBASE_SERVICE_ACCOUNT'), // Cuenta de servicio de Firebase (JSON)
    supabaseUrl: Deno.env.get('SUPABASE_URL'), // Dirección del proyecto de Supabase
    serviceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), // Clave de servicio de Supabase
    allowedOrigins: (Deno.env.get('ALLOWED_ORIGINS') ?? '') // Orígenes web permitidos
      .split(',') // Separa por comas
      .map((o) => o.trim()) // Quita espacios
      .filter(Boolean), // Descarta vacíos
  },
  fetch, // fetch real de Deno
});

Deno.serve(handler); // Atiende las peticiones
