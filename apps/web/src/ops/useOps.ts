'use client';

import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { api, ApiError } from '@/lib/api';
import { firebaseAuth, isFirebaseConfigured } from '@/lib/firebase';

export type OpsAuth =
  | { kind: 'not_configured' }
  | { kind: 'loading' }
  | { kind: 'signed_out' }
  | { kind: 'ready'; user: User };

export function useOpsAuth(): OpsAuth {
  const [state, setState] = useState<OpsAuth>(isFirebaseConfigured ? { kind: 'loading' } : { kind: 'not_configured' });
  useEffect(() => {
    const auth = firebaseAuth();
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => setState(u ? { kind: 'ready', user: u } : { kind: 'signed_out' }));
  }, []);
  return state;
}

/** Carga datos del Ops Center con estados de carga y error explícitos. */
export function useOpsData<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      setData(await api<T>(`/ops${path}`));
    } catch (e) {
      const err = e as ApiError;
      setError(err.status === 403 ? 'No tienes permiso para esta sección o falta la verificación en dos pasos.' : err.message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => { reload(); }, [reload]);
  return { data, error, loading, reload };
}

export async function opsAction(path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<void> {
  await api(`/ops${path}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
}
