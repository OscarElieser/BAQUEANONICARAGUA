// Función de Supabase "baqui": el asistente de BAQUEANO con Google Gemini.
// Secretos que se configuran en Supabase (nunca en web ni Android):
//   GEMINI_API_KEY (obligatorio), GEMINI_MODEL (opcional) y ALLOWED_ORIGINS (separados por comas).
// SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY los pone Supabase automáticamente.

import { createHandler } from './handler.ts'; // Lógica que atiende cada mensaje

const handler = createHandler({
  config: {
    geminiApiKey: Deno.env.get('GEMINI_API_KEY'), // Clave de Gemini (si falta, responde 503 y lo dice)
    geminiModel: Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash', // Modelo de Gemini
    supabaseUrl: Deno.env.get('SUPABASE_URL'), // Dirección del proyecto
    anonKey: Deno.env.get('SUPABASE_ANON_KEY'), // Clave pública
    serviceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), // Clave de servicio
    allowedOrigins: (Deno.env.get('ALLOWED_ORIGINS') || 'http://localhost:3000').split(',').map((o) => o.trim()).filter(Boolean), // Orígenes web permitidos
  },
  fetch, // fetch real de Deno
});

Deno.serve(handler); // Atiende las peticiones
