'use client';

import publica from '@/config/publica.json'; // Valores públicos del proyecto oficial (el entorno puede cambiarlos)
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { api } from '@/lib/api';
import { firebaseAuth, isFirebaseConfigured } from '@/lib/firebase';
import { t } from '@/i18n/t'; // Textos traducidos

type Thread = { conversation_id: string; business_name: string | null; last_message_at: string | null; last_message: string | null; unread: number };
type Message = { id: string; sender_id: string; body: string | null; created_at: string };

/**
 * Bandeja de mensajes. Tiempo real con Supabase Realtime (la suscripción usa el token del
 * usuario, así RLS solo entrega mensajes de sus conversaciones).
 */
export function Bandeja({ locale, initial }: { locale: string; initial?: string }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<string | undefined>(initial);
  const [messages, setMessages] = useState<Message[]>([]);
  const [me, setMe] = useState<string>();
  const [error, setError] = useState<string>();
  const db = useRef<SupabaseClient | null>(null);

  useEffect(() => {
    const auth = firebaseAuth();
    if (!auth) return;
    return onAuthStateChanged(auth, setUser);
  }, []);

  const loadThreads = useCallback(async () => {
    try { setThreads(await api<Thread[]>('/conversations')); } catch (e) { setError((e as Error).message); }
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    try {
      setMessages(await api<Message[]>(`/conversations/${id}/messages`));
      await api(`/conversations/${id}/read`, { method: 'POST' });
      loadThreads();
    } catch (e) { setError((e as Error).message); }
  }, [loadThreads]);

  useEffect(() => {
    if (!user) return;
    db.current = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || publica.supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || publica.supabasePublishableKey, {
      accessToken: async () => (await user.getIdToken()) ?? null,
    });
    db.current.rpc('my_profile_id').then(({ data }) => setMe(data as string));
    loadThreads();
    const channel = db.current
      .channel('mensajes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const m = payload.new as Message & { conversation_id: string };
        setActive((current) => {
          if (current === m.conversation_id) setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          return current;
        });
        loadThreads();
      })
      .subscribe();
    return () => { db.current?.removeChannel(channel); };
  }, [user, loadThreads]);

  useEffect(() => { if (user && active) loadMessages(active); }, [user, active, loadMessages]);

  if (!isFirebaseConfigured) return <p className="rounded-m bg-ground-raised p-5 font-bold">{t(locale, 'messages.off')}</p>; // Sin inicio de sesión configurado
  if (user === undefined) return <p className="text-ink-muted">{t(locale, 'common.loading')}…</p>; // Comprobando la sesión
  if (user === null) return <p>{t(locale, 'messages.sign_in')} <a href={`/${locale}/cuenta`}>{t(locale, 'session.sign_in')}</a></p>; // Sin sesión

  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!active) return;
    const form = e.currentTarget;
    const body = String(new FormData(form).get('body') ?? '').trim();
    if (!body) return;
    try {
      await api(`/conversations/${active}/messages`, { method: 'POST', body: JSON.stringify({ body }) });
      form.reset();
      loadMessages(active);
    } catch (err) { setError((err as Error).message); }
  }

  return (
    <div className="flex flex-wrap gap-6">
      <nav aria-label={t(locale, 'messages.list_aria')} className="min-w-0 flex-[1_1_280px]">
        {threads.length === 0 && <p className="text-ink-muted">{t(locale, 'messages.empty_inbox')}</p>}
        <ul className="m-0 list-none p-0">
          {threads.map((th) => (
            <li key={th.conversation_id}>
              <button type="button" onClick={() => setActive(th.conversation_id)} aria-current={active === th.conversation_id ? 'true' : undefined}
                className={`flex w-full items-start justify-between gap-3 border-b border-line px-2 py-3 text-left ${active === th.conversation_id ? 'bg-ground-raised' : ''}`}>
                <span className="min-w-0">
                  <span className="block font-bold">{th.business_name ?? t(locale, 'messages.conversation')}</span>
                  <span className="block truncate text-sm text-ink-muted">{th.last_message ?? ''}</span>
                </span>
                {th.unread > 0 && (
                  <span className="rounded-pill bg-oro px-2 text-sm font-bold text-on-oro" aria-label={t(locale, 'messages.unread', { n: th.unread })}>{th.unread}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <section aria-label={t(locale, 'messages.title')} className="min-w-0 flex-[2_1_420px]">
        {!active ? (
          <p className="text-ink-muted">{t(locale, 'messages.choose')}</p>
        ) : (
          <>
            <ol className="m-0 flex max-h-[60vh] list-none flex-col gap-2 overflow-y-auto p-0" aria-live="polite">
              {messages.map((m) => (
                <li key={m.id} className={`max-w-[80%] rounded-m px-4 py-2 ${m.sender_id === me ? 'self-end bg-oro text-on-oro' : 'self-start bg-ground-raised'}`}>
                  {m.body ?? <em className="text-ink-muted">{t(locale, 'messages.deleted')}</em>}
                </li>
              ))}
            </ol>
            <form onSubmit={send} className="mt-4 flex gap-2">
              <label htmlFor="body" className="visually-hidden">{t(locale, 'messages.write')}</label>
              <input id="body" name="body" maxLength={8000} autoComplete="off"
                className="h-[52px] min-w-0 flex-1 rounded-pill border border-control-border bg-ground-raised px-5 text-base text-ink" />
              <button type="submit" className="h-[52px] rounded-pill bg-oro px-6 font-bold text-on-oro">{t(locale, 'messages.send')}</button>
            </form>
          </>
        )}
        {error && <p role="alert" className="mt-3 text-status-alert">{error}</p>}
      </section>
    </div>
  );
}
