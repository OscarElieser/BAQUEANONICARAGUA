// Función de Supabase "enviar-avisos": envía los avisos push pendientes (web y Android) con Firebase Cloud Messaging.
// La despierta pg_cron cada minuto, solo si hay avisos pendientes (migración avisos_push). No recibe datos de afuera.
// Secretos que se configuran en Supabase (nunca en web ni Android):
//   FIREBASE_SERVICE_ACCOUNT (JSON, el mismo de preparar-sesion) y, si cambia, FIREBASE_PROJECT_ID y SITIO_URL.
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los pone Supabase automáticamente.

import { createHandler } from './handler.ts'; // Lógica del envío

const handler = createHandler({
  config: {
    firebaseProjectId: Deno.env.get('FIREBASE_PROJECT_ID') || 'baqueanonicaragua-95755', // Proyecto de Firebase (público)
    serviceAccountJson: Deno.env.get('FIREBASE_SERVICE_ACCOUNT'), // Cuenta de servicio (si falta, responde 503 y no toca los avisos)
    supabaseUrl: Deno.env.get('SUPABASE_URL'), // Dirección del proyecto
    serviceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), // Clave de servicio
    sitioUrl: (Deno.env.get('SITIO_URL') || 'https://baqueanonicaragua.com').replace(/\/$/, ''), // Web que se abre al tocar el aviso
  },
  fetch, // fetch real de Deno
});

Deno.serve(handler); // Atiende las peticiones
