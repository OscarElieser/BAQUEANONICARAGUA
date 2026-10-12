import { createClient } from '@supabase/supabase-js'; // Cliente oficial de Supabase
import { getAuth } from 'firebase/auth'; // Servicio de autenticación de Firebase

// Dirección del proyecto de Supabase (con valor oficial por defecto del proyecto)
// Panel de control: https://supabase.com/dashboard/project/nupjhqrvxjrngtpslfjq/
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nupjhqrvxjrngtpslfjq.supabase.co'; // Dirección de la base de datos
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''; // Clave pública segura para clientes

/**
 * Cliente Supabase que envía el ID token de Firebase (Third-Party Auth).
 * Solo clave publicable: los permisos los decide RLS.
 */
export const supabase = createClient(
  supabaseUrl, // Conexión a la instancia de base de datos de Supabase
  supabasePublishableKey, // Clave pública anónima
  {
    accessToken: async () => {
      const user = getAuth().currentUser; // Obtiene el usuario autenticado actualmente
      return user ? await user.getIdToken(false) : null; // Token de identidad enviado a PostgreSQL
    },
  },
);
