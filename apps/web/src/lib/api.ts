'use client';

import { firebaseAuth } from './firebase';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Llama a la API con el ID token de Firebase del usuario. Errores en formato RFC 9457. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const user = firebaseAuth()?.currentUser;
  if (!user) throw new ApiError(401, 'Inicia sesión para continuar.');
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await user.getIdToken()}`,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const problem = await res.json().catch(() => null);
    throw new ApiError(res.status, problem?.detail ?? 'No se pudo completar la acción. Intenta de nuevo.');
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}
