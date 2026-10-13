'use client';
// Formulario para publicar una crónica con la cuenta. Va directo a Supabase (posts): RLS exige que la autora sea quien tiene la sesión,
// la base de datos limita a 10 publicaciones por hora y la comunidad puede reportarla para moderación.
import { useState } from 'react'; // Estado del formulario
import Link from 'next/link'; // Enlace a iniciar sesión
import { useSession } from '@/lib/useSession'; // Sesión de Firebase
import { supabase } from '@/lib/supabase'; // Cliente con el token de Firebase
import { ID_TERRITORIO } from '@/lib/idsTerritorio'; // Número de cada territorio
import { territorios } from '@/lib/portadas'; // Nombres de los 17
import { t } from '@/i18n/t'; // Textos traducidos

export function PublicarCronica({ locale }: { locale: string }) {
  const sesion = useSession(); // Estado de la sesión
  const [estado, setEstado] = useState<'idle' | 'sending' | 'sent' | 'error' | 'limit'>('idle'); // Paso del envío

  return (
    <section id="publicar" aria-labelledby="publicar-t" className="legal-tarjeta mt-10 scroll-mt-24">
      <h2 id="publicar-t" className="terr-grupo m-0">{t(locale, 'chron.publish')}</h2> {/* "Publicar mi crónica" */}
      <p className="m-0 mt-1 text-[15px] text-ink-muted">{t(locale, 'chron.form_intro')}</p> {/* Reglas en una línea */}
      {sesion.status === 'not_configured' && <p className="mt-4 font-bold">{t(locale, 'plans.unavailable')}</p>} {/* Sin inicio de sesión en este entorno */}
      {(sesion.status === 'signed_out' || sesion.status === 'loading') && (
        <p className="mt-4">
          <Link href={`/${locale}/cuenta`} className="font-bold text-accent">{t(locale, 'session.sign_in')}</Link> {t(locale, 'chron.sign_in')} {/* Invita a entrar */}
        </p>
      )}
      {sesion.status === 'signed_in' && (
        <form
          className="mt-4 grid gap-4" // Campos en columna
          onSubmit={async (e) => {
            e.preventDefault(); // Sin recargar
            const f = new FormData(e.currentTarget); // Datos escritos
            const form = e.currentTarget; // Para limpiarlo al terminar
            setEstado('sending'); // Enviando
            const { data: yo } = await supabase.rpc('my_profile_id'); // Perfil de la autora o autor
            const terr = String(f.get('territorio') ?? ''); // Territorio elegido (puede ir vacío)
            const { error } = await supabase.from('posts').insert({
              author_id: yo, // Quién la escribe (RLS lo comprueba)
              kind: 'chronicle', // Es una crónica
              title: String(f.get('titulo') ?? '').trim().slice(0, 160) || null, // Título
              body_md: String(f.get('texto') ?? '').trim(), // Relato
              locale, // Idioma en que se escribió
              department_id: terr ? ID_TERRITORIO[terr] : null, // Territorio (opcional)
              is_promotional: f.get('promo') === 'on', // Publicidad identificada si promociona un negocio propio
            }); // Inserta
            if (error) {
              setEstado(error.code === '54000' ? 'limit' : 'error'); // Límite de 10 por hora (código de la base de datos) u otro error
              return; // No sigue
            }
            form.reset(); // Limpia el formulario
            setEstado('sent'); // Publicada
          }}
        >
          <label className="login-etiqueta">
            {t(locale, 'chron.f_title')} {/* "Título" */}
            <input name="titulo" maxLength={160} required className="h-[48px] rounded-m border border-control-border bg-ground px-3 text-[16px] font-normal text-ink" /> {/* Título de la crónica */}
          </label>
          <label className="login-etiqueta">
            {t(locale, 'chron.f_body')} {/* "Tu relato" */}
            <textarea name="texto" required minLength={40} maxLength={20000} rows={7} className="rounded-m border border-control-border bg-ground p-3 text-[16px] font-normal leading-6 text-ink" /> {/* Relato */}
          </label>
          <label className="login-etiqueta">
            {t(locale, 'chron.f_territory')} {/* "Territorio (opcional)" */}
            <select name="territorio" defaultValue="" className="h-[48px] rounded-m border border-control-border bg-ground px-3 text-[16px] font-normal text-ink">
              <option value="">{t(locale, 'chron.no_territory')}</option> {/* Sin territorio */}
              {territorios.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)} {/* Los 17 */}
            </select>
          </label>
          <label className="flex items-start gap-3 text-[15px]">
            <input type="checkbox" name="promo" className="mt-1 h-5 w-5 accent-[var(--accent)]" /> {/* Publicidad propia */}
            <span>{t(locale, 'chron.f_promo')}</span> {/* Explica cuándo marcarlo */}
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={estado === 'sending'} className="boton-marca disabled:opacity-60">{t(locale, 'chron.f_submit')}</button> {/* Publicar */}
            <p role="status" className="m-0 text-[15px]">
              {estado === 'sent' && <span className="text-status-verified">{t(locale, 'chron.sent')}</span>} {/* Publicada */}
              {estado === 'limit' && <span className="text-status-alert">{t(locale, 'chron.limit')}</span>} {/* Límite por hora */}
              {estado === 'error' && <span className="text-status-alert">{t(locale, 'trips.error')}</span>} {/* Error */}
            </p>
          </div>
        </form>
      )}
    </section>
  );
}
