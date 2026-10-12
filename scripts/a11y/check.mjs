// Revisa la accesibilidad de las páginas principales con axe (reglas WCAG 2.2 A y AA).
// Uso: BASE_URL=http://127.0.0.1:3000 node scripts/a11y/check.mjs
import AxeBuilder from '@axe-core/playwright'; // Motor de revisión de accesibilidad
import { chromium } from 'playwright'; // Navegador automático

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3000'; // Dirección de la web en ejecución
const PAGES = ['/es', '/es/mapa', '/es/comunidad', '/es/cultura', '/es/cuenta', '/es/denunciar', '/es/mi-aventura', '/es/privacidad', '/es/cookies', '/es/terminos', '/es/sobre-nosotros', '/es/accesibilidad', '/es/contacto', '/en/mi-aventura', '/ja', '/ru/privacidad', '/zh-Hans/comunidad']; // Páginas revisadas (también en otros idiomas y escrituras)

const browser = await chromium.launch(); // Abre el navegador sin ventana
let failures = 0; // Cantidad de problemas graves
const byRule = new Map(); // Problemas agrupados por regla (una anotación por regla; GitHub muestra pocas por paso)
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
      // Agrupa cada problema por regla
      const entry = byRule.get(v.id) ?? { help: v.help, pages: new Set(), examples: new Set() }; // Registro de la regla
      entry.pages.add(`${path} (${theme})`); // Página y tema donde aparece
      for (const n of v.nodes.slice(0, 2)) entry.examples.add(`${n.target.join(' ')}: ${(n.failureSummary ?? '').replace(/\s+/g, ' ').slice(0, 220)}`); // Elemento y explicación (incluye el contraste medido)
      byRule.set(v.id, entry); // Guarda
      console.log(`  ${v.id} en ${path} (${theme}): ${v.nodes.map((n) => n.target.join(' ')).slice(0, 5).join(' | ')}`); // Detalle en el registro
    }
    console.log(`${serious.length === 0 ? 'OK ' : 'MAL'} ${theme.padEnd(5)} ${path} (${result.violations.length} avisos en total)`); // Resumen por página
    failures += serious.length; // Suma los graves
  }
  await context.close(); // Cierra el tema
}
await browser.close(); // Cierra el navegador
for (const [id, e] of byRule) {
  // Una anotación por regla con páginas y ejemplos
  console.log(`::error title=Accesibilidad: ${id}::${e.help}. Páginas: ${[...e.pages].slice(0, 8).join(', ')}. Ejemplos: ${[...e.examples].slice(0, 3).join(' || ')}`); // Anotación visible en CI
}
process.exit(failures === 0 ? 0 : 1); // Falla CI si hubo problemas graves
