// Toma capturas de la web en ejecución (Chromium): computadora y teléfono, tema claro y oscuro, varios idiomas.
// Uso: BASE_URL=http://127.0.0.1:3000 OUT=capturas node scripts/capturas/capturar.mjs
import { mkdirSync } from 'node:fs'; // Crear la carpeta de salida
import { chromium } from 'playwright'; // Navegador automático (desde scripts/a11y/node_modules)

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3000'; // Web en ejecución
const OUT = process.env.OUT ?? 'capturas'; // Carpeta de las imágenes
mkdirSync(OUT, { recursive: true }); // Crea la carpeta

const shots = [
  { name: '01-inicio-computadora-oscuro', path: '/es', device: 'desktop', theme: 'dark', banner: true }, // Portada con el aviso de cookies
  { name: '02-inicio-computadora-claro', path: '/es', device: 'desktop', theme: 'light' }, // Portada en tema claro
  { name: '03-inicio-telefono', path: '/es', device: 'phone', theme: 'dark', full: true }, // Portada en el teléfono (completa)
  { name: '04-mi-aventura-en-ingles', path: '/en/mi-aventura', device: 'desktop', theme: 'dark', example: 'Try an example' }, // Planificador en inglés con el ejemplo
  { name: '05-mi-aventura-telefono', path: '/es/mi-aventura', device: 'phone', theme: 'light', example: 'Probar con un ejemplo', full: true }, // Planificador en el teléfono
  { name: '06-comunidad-japones', path: '/ja/comunidad', device: 'desktop', theme: 'dark' }, // Comunidad en japonés
  { name: '07-mapa', path: '/es/mapa', device: 'desktop', theme: 'light' }, // Mapa y búsqueda
  { name: '08-cultura-ruso', path: '/ru/cultura', device: 'desktop', theme: 'dark' }, // Cultura en ruso
  { name: '09-privacidad', path: '/es/privacidad', device: 'desktop', theme: 'light', full: true }, // Aviso de privacidad (completo)
  { name: '10-cuenta-telefono', path: '/es/cuenta', device: 'phone', theme: 'dark' }, // Inicio de sesión en el teléfono
  { name: '11-mapa-territorios', path: '/es', device: 'desktop', theme: 'dark', hover: 'Rivas' }, // Mapa ilustrado con un territorio resaltado
  { name: '14-compartir-granada', path: '/es/territorios/granada/opengraph-image', device: 'og', theme: 'dark' }, // Imagen al compartir un territorio
  { name: '15-compartir-sitio', path: '/es/opengraph-image', device: 'og', theme: 'dark' }, // Imagen al compartir el sitio
  { name: '13-pagina-404', path: '/es/territorios/no-existe', device: 'desktop', theme: 'dark' }, // "Te perdiste en la neblina"
  { name: '12-mapa-territorios-claro', path: '/es', device: 'desktop', theme: 'light', hover: 'Matagalpa' }, // El mismo mapa en tema claro
];

const devices = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, // Computadora
  og: { viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 }, // Tamaño de la imagen para compartir
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, // Teléfono (tamaño de un Android o iPhone común)
};

const browser = await chromium.launch(); // Abre Chromium sin ventana
for (const s of shots) {
  // Cada captura
  const context = await browser.newContext({ ...devices[s.device], colorScheme: s.theme, locale: s.path.split('/')[1] }); // Dispositivo, tema e idioma
  if (!s.banner) {
    // Sin aviso de cookies: simula que la persona ya eligió "solo las necesarias"
    await context.addCookies([{ name: 'nica_consentimiento', value: encodeURIComponent(JSON.stringify({ v: 1, medicion: false, fecha: '2026-10-12T00:00:00Z' })), url: BASE }]);
  }
  const page = await context.newPage(); // Pestaña nueva
  await page.goto(BASE + s.path, { waitUntil: 'networkidle' }); // Abre la página y espera la carga
  if (s.example) {
    // Pulsa "Probar con un ejemplo" para mostrar el resultado del planificador
    await page.getByRole('button', { name: s.example }).click();
  }
  if (s.hover) {
    // Baja hasta el mapa y pasa el cursor por un territorio
    const ter = page.getByRole('img', { name: new RegExp(`^${s.hover}:`) }).or(page.getByRole('link', { name: new RegExp(`^${s.hover}:`) })).first(); // El territorio (pendiente o publicado)
    await page.evaluate(() => document.getElementById('territorios')?.scrollIntoView({ block: 'start' })); // Título del mapa arriba
    await ter.dispatchEvent('mouseover'); // Resalta el territorio (como el cursor encima, sin depender de su centro geométrico)
  }
  await page.waitForTimeout(1500); // Deja que termine la animación del relieve 3D
  await page.screenshot({ path: `${OUT}/${s.name}.png`, fullPage: Boolean(s.full) }); // Guarda la imagen
  console.log(`listo ${s.name}`); // Avance en el registro
  await context.close(); // Cierra el contexto
}
await browser.close(); // Cierra el navegador
