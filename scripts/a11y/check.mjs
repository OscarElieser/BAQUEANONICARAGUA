// Revisa la accesibilidad de las páginas principales con axe (reglas WCAG 2.2 A y AA).
// Uso: BASE_URL=http://127.0.0.1:3000 node scripts/a11y/check.mjs
import AxeBuilder from '@axe-core/playwright'; // Motor de revisión de accesibilidad
import { chromium } from 'playwright'; // Navegador automático

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3000'; // Dirección de la web en ejecución
const PAGES = ['/es', '/es/mapa', '/es/comunidad', '/es/cultura', '/es/cuenta', '/es/denunciar', '/es/mi-aventura', '/es/privacidad', '/es/cookies', '/es/terminos', '/es/sobre-nosotros', '/es/accesibilidad', '/es/contacto']; // Páginas revisadas

const browser = await chromium.launch(); // Abre el navegador sin ventana
let failures = 0; // Cantidad de problemas graves
for (const theme of ['light', 'dark']) {
  // Revisa los dos temas, porque el contraste cambia
  const context = await browser.newContext({ colorScheme: theme, reducedMotion: 'reduce' }); // Tema y movimiento reducido
  const page = await context.newPage(); // Pestaña nueva
  for (const path of PAGES) {
    // Cada página
    await page.goto(BASE + path, { waitUntil: 'networkidle' }); // Abre la página y espera a que termine de cargar
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze(); // Revisión WCAG
    const serious = result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'); // Solo lo grave
    for (const v of serious) {
      // Publica cada problema como anotación de GitHub
      const where = v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | '); // Primeros elementos afectados
      console.log(`::error title=Accesibilidad ${path} (${theme})::${v.id}: ${v.help} -> ${where}`); // Anotación visible en CI
    }
    console.log(`${serious.length === 0 ? 'OK ' : 'MAL'} ${theme.padEnd(5)} ${path} (${result.violations.length} avisos en total)`); // Resumen por página
    failures += serious.length; // Suma los graves
  }
  await context.close(); // Cierra el tema
}
await browser.close(); // Cierra el navegador
process.exit(failures === 0 ? 0 : 1); // Falla CI si hubo problemas graves
