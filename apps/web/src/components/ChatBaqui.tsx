'use client';
// Conversación con BAQÜI. Llama a la función de Supabase "baqui" con el token de Firebase de la persona;
// la clave de Gemini vive solo en el servidor. Si el asistente no está activado, lo dice sin simular respuestas.
import { useRef, useState } from 'react'; // Estado y referencia a la lista
import Link from 'next/link'; // Enlace a iniciar sesión
import { getAuth } from 'firebase/auth'; // Token de la sesión
import publica from '@/config/publica.json'; // Dirección pública de Supabase
import { useSession } from '@/lib/useSession'; // Estado de la sesión
import { t, type MessageKey } from '@/i18n/t'; // Textos traducidos

type Linea = { quien: 'yo' | 'baqui'; texto: string }; // Un mensaje de la conversación

const URL_FN = `${process.env.NEXT_PUBLIC_SUPABASE_URL || publica.supabaseUrl}/functions/v1/baqui`; // Función del asistente

export function ChatBaqui({ locale }: { locale: string }) {
  const sesion = useSession(); // Sesión
  const [lineas, setLineas] = useState<Linea[]>([]); // Conversación en pantalla
  const [conv, setConv] = useState<string | null>(null); // Conversación guardada
  const [aviso, setAviso] = useState<MessageKey | null>(null); // Aviso de estado (no activado, límite, error)
  const [enviando, setEnviando] = useState(false); // Si hay un mensaje en camino
  const lista = useRef<HTMLOListElement>(null); // Para bajar al último mensaje

  async function enviar(texto: string) {
    const user = getAuth().currentUser; // Persona con sesión
    if (!user || !texto.trim()) return; // Sin sesión o vacío
    setLineas((l) => [...l, { quien: 'yo', texto }]); // Muestra lo que escribió
    setEnviando(true); // Esperando
    setAviso(null); // Limpia avisos
    try {
      const res = await fetch(URL_FN, { method: 'POST', headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: texto, locale, conversation_id: conv }) }); // Pregunta a BAQÜI
      const body = (await res.json().catch(() => ({}))) as { text?: string; conversation_id?: string }; // Respuesta
      if (res.ok && body.text) {
        setLineas((l) => [...l, { quien: 'baqui', texto: body.text! }]); // Muestra la respuesta
        setConv(body.conversation_id ?? conv); // Recuerda la conversación
      } else setAviso(res.status === 503 ? 'baqui.off' : res.status === 429 ? 'baqui.limit' : res.status === 401 ? 'baqui.sign_in' : 'baqui.error'); // Aviso según el caso
    } catch {
      setAviso('baqui.error'); // Sin conexión u otro fallo
    } finally {
      setEnviando(false); // Ya no espera
      requestAnimationFrame(() => lista.current?.lastElementChild?.scrollIntoView({ block: 'nearest' })); // Baja al último
    }
  }

  if (sesion.status === 'not_configured') return <p className="legal-tarjeta">{t(locale, 'baqui.off')}</p>; // Sin inicio de sesión en este entorno
  if (sesion.status !== 'signed_in')
    return (
      <p className="legal-tarjeta">
        <Link href={`/${locale}/cuenta`} className="font-bold text-accent">{t(locale, 'session.sign_in')}</Link> {t(locale, 'baqui.sign_in_cta')} {/* Invita a entrar */}
      </p>
    );

  const sugerencias: MessageKey[] = ['baqui.s1', 'baqui.s2', 'baqui.s3']; // Ideas para empezar
  return (
    <div className="chat-baqui">
      <ol ref={lista} className="chat-lista m-0 list-none p-0" aria-live="polite">
        <li className="chat-burbuja" data-quien="baqui">{t(locale, 'baqui.hello')}</li> {/* Saludo fijo (no lo genera el modelo) */}
        {lineas.map((l, i) => (
          <li key={i} className="chat-burbuja whitespace-pre-line" data-quien={l.quien}>{l.texto}</li> // Cada mensaje
        ))}
        {enviando && <li className="chat-burbuja" data-quien="baqui">{t(locale, 'baqui.thinking')}</li>} {/* Esperando la respuesta */}
      </ol>
      {aviso && <p role="alert" className="mt-3 font-bold text-status-alert">{t(locale, aviso)}</p>} {/* Aviso claro */}
      {lineas.length === 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {sugerencias.map((s) => <button key={s} type="button" onClick={() => enviar(t(locale, s))} className="cron-chip w-auto px-4">{t(locale, s)}</button>)} {/* Sugerencias para empezar */}
        </div>
      )}
      <form
        className="buscador-terr mt-4 max-w-none" // Campo en píldora
        onSubmit={(e) => {
          e.preventDefault(); // Sin recargar
          const f = e.currentTarget; // Formulario
          const v = String(new FormData(f).get('m') ?? ''); // Texto escrito
          f.reset(); // Limpia
          enviar(v); // Envía
        }}
      >
        <label htmlFor="m" className="visually-hidden">{t(locale, 'baqui.placeholder')}</label> {/* Nombre del campo */}
        <input id="m" name="m" maxLength={2000} required autoComplete="off" placeholder={t(locale, 'baqui.placeholder')} /> {/* Mensaje */}
        <button type="submit" disabled={enviando} className="boton-marca min-h-[42px] px-5 disabled:opacity-60">{t(locale, 'baqui.send')}</button> {/* Enviar */}
      </form>
      <p className="mt-3 text-[13px] text-ink-muted">{t(locale, 'baqui.note')}</p> {/* Qué puede y qué no */}
    </div>
  );
}
