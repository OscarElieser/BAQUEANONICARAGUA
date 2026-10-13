'use client';
// Conversación con BAQÜI. Llama a la función de Supabase "baqui" con el token de Firebase de la persona;
// la clave de Gemini vive solo en el servidor. Si el asistente no está activado, lo dice sin simular respuestas.
// BAQÜI acompaña la conversación en persona: su escenario a un lado y su cara en cada mensaje
// (inclina la cabeza mientras piensa y se mueve al responder; nada se mueve con "reducir movimiento").
import { useRef, useState, type ReactNode } from 'react'; // Estado, referencia a la lista y tipo del contenido
import Link from 'next/link'; // Enlace a iniciar sesión
import { getAuth } from 'firebase/auth'; // Token de la sesión
import publica from '@/config/publica.json'; // Dirección pública de Supabase
import { useSession } from '@/lib/useSession'; // Estado de la sesión
import { t, type MessageKey } from '@/i18n/t'; // Textos traducidos
import { BaquiEscenario } from './BaquiEscenario'; // BAQÜI en persona

type Linea = { quien: 'yo' | 'baqui'; texto: string }; // Un mensaje de la conversación

const URL_FN = `${process.env.NEXT_PUBLIC_SUPABASE_URL || publica.supabaseUrl}/functions/v1/baqui`; // Función del asistente

/** Fila de BAQÜI: su cara al lado del mensaje; "animo" decide si piensa, habla o está quieto. */
function FilaBaqui({ children, animo = 'quieto', extra = '' }: { children: ReactNode; animo?: 'quieto' | 'pensando' | 'hablando'; extra?: string }) {
  return (
    <li className="chat-fila" data-quien="baqui">
      <img src="/baqui/cara.webp" alt="" width={40} height={40} className="chat-avatar" data-animo={animo} decoding="async" /> {/* Cara de BAQÜI (decorativa) */}
      <div className={`chat-burbuja ${extra}`} data-quien="baqui">{children}</div> {/* Mensaje */}
    </li>
  );
}

export function ChatBaqui({ locale }: { locale: string }) {
  const sesion = useSession(); // Sesión
  const [lineas, setLineas] = useState<Linea[]>([]); // Conversación en pantalla
  const [conv, setConv] = useState<string | null>(null); // Conversación guardada
  const [aviso, setAviso] = useState<MessageKey | null>(null); // Aviso de estado (no activado, límite, error)
  const [enviando, setEnviando] = useState(false); // Si hay un mensaje en camino
  const [respuestas, setRespuestas] = useState(0); // Respuestas recibidas (BAQÜI señala cada una)
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
        setRespuestas((n) => n + 1); // BAQÜI señala la respuesta
      } else setAviso(res.status === 503 ? 'baqui.off' : res.status === 429 ? 'baqui.limit' : res.status === 401 ? 'baqui.sign_in' : 'baqui.error'); // Aviso según el caso
    } catch {
      setAviso('baqui.error'); // Sin conexión u otro fallo
    } finally {
      setEnviando(false); // Ya no espera
      requestAnimationFrame(() => lista.current?.lastElementChild?.scrollIntoView({ block: 'nearest' })); // Baja al último
    }
  }

  let contenido: ReactNode; // Lo que va al lado de BAQÜI
  if (sesion.status === 'not_configured') {
    contenido = <p className="legal-tarjeta m-0">{t(locale, 'baqui.off')}</p>; // Sin inicio de sesión en este entorno
  } else if (sesion.status !== 'signed_in') {
    contenido = (
      <ol className="chat-lista m-0 list-none p-0">
        <FilaBaqui>{t(locale, 'baqui.hello')}</FilaBaqui> {/* Saludo fijo (no lo genera el modelo) */}
        <FilaBaqui>
          <Link href={`/${locale}/cuenta`} className="font-bold text-accent">{t(locale, 'session.sign_in')}</Link> {t(locale, 'baqui.sign_in_cta')} {/* Invita a entrar */}
        </FilaBaqui>
      </ol>
    );
  } else {
    const sugerencias: MessageKey[] = ['baqui.s1', 'baqui.s2', 'baqui.s3']; // Ideas para empezar
    const ultimaDeBaqui = lineas.map((l) => l.quien).lastIndexOf('baqui'); // Índice de la respuesta más nueva
    contenido = (
      <div className="chat-baqui">
        <ol ref={lista} className="chat-lista m-0 list-none p-0" aria-live="polite">
          <FilaBaqui>{t(locale, 'baqui.hello')}</FilaBaqui> {/* Saludo fijo (no lo genera el modelo) */}
          {lineas.map((l, i) =>
            l.quien === 'baqui' ? (
              <FilaBaqui key={i} animo={i === ultimaDeBaqui ? 'hablando' : 'quieto'} extra="whitespace-pre-line">{l.texto}</FilaBaqui> // Respuesta (la más nueva "habla")
            ) : (
              <li key={i} className="chat-fila" data-quien="yo"><div className="chat-burbuja whitespace-pre-line" data-quien="yo">{l.texto}</div></li> // Mensaje de la persona
            ),
          )}
          {enviando && <FilaBaqui animo="pensando">{t(locale, 'baqui.thinking')}</FilaBaqui>} {/* Esperando: BAQÜI piensa */}
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

  return (
    <div className="baqui-sala">
      <BaquiEscenario locale={locale} respuestas={respuestas} /> {/* BAQÜI en persona */}
      <div className="min-w-0">{contenido}</div> {/* Conversación o invitación a entrar */}
    </div>
  );
}
