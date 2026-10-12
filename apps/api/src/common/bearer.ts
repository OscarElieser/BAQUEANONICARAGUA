import type { AuthedRequest } from '../auth/firebase-auth.guard';

/** ID token de Firebase ya verificado por FirebaseAuthGuard, para actuar como el usuario en Supabase. */
export function bearer(req: AuthedRequest): string {
  return (req.headers['authorization'] ?? '').replace(/^Bearer\s+/, '');
}
