// Centro de ayuda: guías hacia las páginas que ya funcionan y preguntas frecuentes con respuestas verdaderas.
// Las preguntas se abren y cierran con <details>, así funcionan sin JavaScript y con el teclado.
import Link from 'next/link'; // Enlaces internos
import type { Metadata } from 'next'; // Tipo de los metadatos
import { CreditoFoto } from '@/components/CreditoFoto'; // Crédito de la foto del encabezado
import { fotoDe, srcsetDe } from '@/lib/fotos'; // Fotos reales con licencia libre
import { letraFirma, letraMarca } from '@/app/fuentes'; // Letras de la marca y de la firma
import { pageMetadata } from '@/lib/seo'; // Canónica y versiones por idioma
import { t, type MessageKey } from '@/i18n/t'; // Textos traducidos

/** Metadatos de la página en su idioma. */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params; // Idioma
  return pageMetadata(locale, '/ayuda', t(locale, 'help.title'), t(locale, 'help.intro')); // Título y descripción
}

// Guías: cada una lleva a una página real
const guias: Array<{ t: MessageKey; d: MessageKey; l: MessageKey; ruta: string }> = [
  { t: 'help.g1_t', d: 'help.g1_d', l: 'help.g1_l', ruta: 'mapa' }, // Explorar en el mapa
  { t: 'help.g2_t', d: 'help.g2_d', l: 'help.g2_l', ruta: 'mi-aventura' }, // Planificar
  { t: 'help.g3_t', d: 'help.g3_d', l: 'help.g3_l', ruta: 'mensajes' }, // Hablar con un negocio
];

// Preguntas agrupadas por tema, con la página donde se resuelve cada una (si la hay)
const grupos: Array<{ titulo: MessageKey; preguntas: Array<{ q: MessageKey; a: MessageKey; ruta?: string }> }> = [
  { titulo: 'help.grp_trip', preguntas: [{ q: 'help.q1', a: 'help.a1', ruta: 'terminos' }, { q: 'help.q2', a: 'help.a2' }, { q: 'help.q3', a: 'help.a3', ruta: 'creditos' }] }, // Viajes y datos
  { titulo: 'help.grp_account', preguntas: [{ q: 'help.q4', a: 'help.a4', ruta: 'cuenta' }, { q: 'help.q5', a: 'help.a5', ruta: 'denunciar' }, { q: 'help.q6', a: 'help.a6', ruta: 'cookies' }, { q: 'help.q9', a: 'help.a9' }] }, // Cuenta y comunidad
  { titulo: 'help.grp_business', preguntas: [{ q: 'help.q7', a: 'help.a7', ruta: 'comunidad/registrar' }, { q: 'help.q8', a: 'help.a8' }] }, // Negocios
];

export default async function Ayuda({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; // Idioma
  const foto = fotoDe('granada'); // Foto real del encabezado (catedral de Granada)
  return (
    <main className={`${letraMarca.variable} ${letraFirma.variable} mx-auto max-w-[1280px] px-4 pb-16 pt-4 sm:px-12`}>
      <header className="terr-portada legal-portada tema-noche">
        {foto && <img src={foto.imagen_movil} srcSet={srcsetDe(foto)} sizes="100vw" alt={foto.lugar} decoding="async" className="terr-portada-foto" />} {/* Foto real de fondo */}
        <div className="terr-portada-texto max-w-[68ch]">
          <h1 className="terr-titulo m-0">{t(locale, 'help.title')}</h1> {/* "¿En qué te ayudamos?" */}
          <p className="mt-3 text-[18px] leading-[28px]">{t(locale, 'help.intro')}</p> {/* Qué hay en esta página */}
          {foto && <CreditoFoto locale={locale} foto={foto} className="mt-4 block" />} {/* Crédito de la foto */}
        </div>
        <p aria-hidden="true" className="cron-sello">{t(locale, 'help.stamp')}</p> {/* Sello escrito a mano (decoración) */}
      </header>

      <section aria-labelledby="ayuda-guias" className="pt-10">
        <h2 id="ayuda-guias" className="terr-grupo m-0 mb-5">{t(locale, 'help.start')}</h2> {/* "Empieza por aquí" */}
        <ul className="ayuda-guias m-0 list-none p-0">
          {guias.map((g) => (
            <li key={g.ruta} className="legal-tarjeta">
              <h3 className="m-0 text-[19px] font-bold">{t(locale, g.t)}</h3> {/* Nombre de la guía */}
              <p className="m-0 mt-1 text-[15px] leading-6 text-ink-muted">{t(locale, g.d)}</p> {/* Qué se hace ahí */}
              <Link href={`/${locale}/${g.ruta}`} className="mt-3 inline-block font-bold text-accent">{t(locale, g.l)}</Link> {/* Enlace real */}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="ayuda-faq" className="pt-12">
        <h2 id="ayuda-faq" className="terr-grupo m-0 mb-5">{t(locale, 'help.faq')}</h2> {/* "Preguntas frecuentes" */}
        <div className="ayuda-grupos">
          {grupos.map((g) => (
            <div key={g.titulo} className="legal-tarjeta">
              <h3 className="m-0 mb-2 text-[19px] font-bold">{t(locale, g.titulo)}</h3> {/* Tema */}
              {g.preguntas.map((p) => (
                <details key={p.q} className="ayuda-pregunta">
                  <summary>{t(locale, p.q)}</summary> {/* La pregunta: al tocarla se abre la respuesta */}
                  <p className="m-0 pb-3 text-[15px] leading-6 text-ink-muted">
                    {t(locale, p.a)} {/* Respuesta */}
                    {p.ruta && <> <Link href={`/${locale}/${p.ruta}`} className="font-bold text-accent">{t(locale, 'help.go')}</Link></>} {/* Dónde resolverlo */}
                  </p>
                </details>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="ayuda-mas" className="ayuda-mas tema-noche mt-12">
        <div>
          <h2 id="ayuda-mas" className="m-0 text-[26px] font-bold">{t(locale, 'help.more_title')}</h2> {/* "¿Todavía tienes dudas?" */}
          <p className="m-0 mt-1">{t(locale, 'help.more_text')}</p> {/* Dónde escribir */}
        </div>
        <Link href={`/${locale}/contacto`} className="boton-marca">{t(locale, 'help.more_cta')}</Link> {/* Página de contacto */}
      </section>
    </main>
  );
}
