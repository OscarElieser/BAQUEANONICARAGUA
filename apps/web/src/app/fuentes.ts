// Letras propias de cada sección ("mundos"). Next.js las descarga al compilar y las sirve desde el propio sitio:
// el navegador del visitante no se conecta a Google. Cada página solo carga la suya.
import { Anybody, Bricolage_Grotesque, Caprasimo } from 'next/font/google'; // Familias de Google Fonts (licencia abierta OFL)

/** Cultura: rotunda, de cartel popular, como el barro pintado de San Juan de Oriente. */
export const letraCultura = Caprasimo({ weight: '400', subsets: ['latin'], variable: '--font-caprasimo', display: 'swap' });

/** Comunidad: grotesca cálida y humana, para las voces de quienes reciben. */
export const letraComunidad = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-bricolage', display: 'swap' });

/** Mi aventura: ancho variable, como los rótulos de los buses pintados; se estira al llegar. */
export const letraAventura = Anybody({ subsets: ['latin'], axes: ['wdth'], variable: '--font-anybody', display: 'swap' });
