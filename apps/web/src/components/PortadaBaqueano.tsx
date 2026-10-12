// Portada de BAQUEANO: una ventana pintada a brochazos que deja ver el paisaje de una zona del país,
// el eslogan en dos pesos que la pisa por abajo y la firma "Nicaragua" a mano.
// Se dibuja en el servidor; ControlPortada solo cambia la escena y agrega el paralaje.
import Link from 'next/link'; // Enlaces internos
import { t } from '@/i18n/t'; // Textos traducidos
import { pinceladas } from '@/lib/pincel'; // Trazos de pincel con semilla fija
import { EscenaCaribe, EscenaFoto, EscenaNorte, EscenaPacifico } from './EscenasPortada'; // Paisajes ilustrados y con foto real
import { fotoDe } from '@/lib/fotos'; // Fotos reales con licencia libre
import type { Zona } from '@/lib/portadas'; // Zonas de paisaje
import { ControlPortada } from './ControlPortada'; // Cambio de escena y paralaje

const VENTANA = pinceladas(1979); // Bandas de la ventana (siempre las mismas)

export function PortadaBaqueano({ locale }: { locale: string }) {
  const zonas: Zona[] = ['pacifico', 'norte', 'caribe']; // Escenas, de oeste a este
  const fotos = Object.fromEntries(zonas.map((z) => [z, fotoDe(`portada-${z}`)])); // Foto real de cada escena (si existe)
  const creditos = Object.fromEntries(zonas.map((z) => [z, fotos[z] ? { lugar: fotos[z]!.lugar, texto: t(locale, 'photo.credit', { author: fotos[z]!.autor, license: fotos[z]!.licencia }), pagina: fotos[z]!.pagina } : null])) as Record<Zona, { lugar: string; texto: string; pagina: string } | null>; // Créditos para el pie
  const ilustracion = { pacifico: EscenaPacifico, norte: EscenaNorte, caribe: EscenaCaribe }; // Ilustración de respaldo
  return (
    <section id="portada" data-escena="pacifico" aria-labelledby="eslogan" className="portada-baqueano relative">
      <span aria-hidden="true" className="portada-vertical">{t(locale, 'brand.name')}</span> {/* Marca en vertical, al borde */}
      <div className="relative">
        <svg viewBox="0 0 1200 560" className="block h-auto w-full" aria-hidden="true" focusable="false">
          <defs>
            <radialGradient id="pb-desvanecer" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0.55" stopColor="black" stopOpacity="1" /> {/* En el centro del óvalo la escena desaparece del todo */}
              <stop offset="1" stopColor="black" stopOpacity="0" /> {/* y hacia afuera vuelve poco a poco */}
            </radialGradient>
            <mask id="pb-ventana" maskUnits="userSpaceOnUse" x="0" y="0" width="1200" height="560">
              {VENTANA.map((b, i) => (
                <path key={i} d={b.d} className="trazo-pincel" style={{ fill: 'white', ['--i' as string]: i }} /> // Cada banda se pinta de izquierda a derecha al cargar
              ))}
              <ellipse cx="330" cy="640" rx="700" ry="300" fill="url(#pb-desvanecer)" /> {/* Abajo a la izquierda la pintura se desvanece: ahí se apoya el eslogan sobre fondo liso */}
            </mask>
          </defs>
          <g mask="url(#pb-ventana)">
            {zonas.map((z, i) => {
              const f = fotos[z]; // Foto real de la escena
              const Ilustracion = ilustracion[z]; // Dibujo si no hay foto
              return (
                <g key={z} className="escena" data-id={z}>
                  {f ? <EscenaFoto href={f.imagen} diferida={i > 0} palabra={t(locale, `hero.word_${z}` as const)} /> : <Ilustracion palabra={t(locale, `hero.word_${z}` as const)} />} {/* Foto real o ilustración */}
                </g>
              );
            })}
          </g>
        </svg>

        <div className="portada-titular">
          <h1 id="eslogan" className="portada-eslogan">
            <span className="linea-1">{t(locale, 'brand.slogan_1')}</span> {/* Primera parte, gruesa */}
            <span className="linea-2">{t(locale, 'brand.slogan_2')}</span> {/* Segunda parte, ligera y turquesa */}
          </h1>
        </div>
        <span aria-hidden="true" className="portada-firma">Nicaragua</span> {/* Firma a mano (decorativa: el país ya se nombra en la presentación y en los botones) */}
      </div>

      <div className="portada-pie">
        <ControlPortada locale={locale} portada="portada" creditos={creditos} /> {/* Qué escena se ve y barras para cambiarla */}
        <p className="m-0 mt-5 max-w-[56ch] text-[17px] leading-[27px] text-ink-muted">{t(locale, 'home.intro')}</p> {/* Presentación breve */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a href="#territorios" className="boton-marca">{t(locale, 'hero.cta_explore')}</a> {/* Baja a los 17 territorios */}
          <Link href={`/${locale}/mi-aventura`} className="boton-contorno">{t(locale, 'hero.cta_trip')}</Link> {/* Abre el planificador */}
        </div>
        <form role="search" action={`/${locale}/mapa`} className="mt-5 flex max-w-[620px] flex-wrap gap-2">
          <label htmlFor="buscar" className="visually-hidden">{t(locale, 'home.search_label')}</label> {/* Nombre accesible del buscador */}
          <input
            id="buscar" // Campo de búsqueda
            name="q" // Parámetro que lee el mapa
            type="search" // Teclado de búsqueda en el teléfono
            autoComplete="off" // Sin sugerencias del navegador (las búsquedas no son datos personales que recordar)
            placeholder={t(locale, 'home.search_placeholder')} // Ejemplos de búsqueda
            className="h-[52px] min-w-0 flex-[1_1_240px] rounded-pill border border-control-border bg-ground-raised px-[22px] text-base text-ink placeholder:text-ink-muted"
          />
          <button type="submit" className="h-[52px] rounded-pill bg-oro px-[26px] text-base font-bold text-on-oro">
            {t(locale, 'home.search_button')} {/* Busca en el mapa */}
          </button>
        </form>
      </div>
    </section>
  );
}
