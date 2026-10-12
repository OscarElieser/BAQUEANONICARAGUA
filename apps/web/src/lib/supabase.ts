import { createClient } from '@supabase/supabase-js';
import { getAuth } from 'firebase/auth';

/**
 * Cliente Supabase que envía el ID token de Firebase (Third-Party Auth).
 * Solo clave publicable: los permisos los decide RLS.
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    accessToken: async () => {
      const user = getAuth().currentUser;
      return user ? await user.getIdToken(false) : null;
    },
  },
);
