// Genera evals/intent_golden.json con lo que la versión de TypeScript entiende de cada frase.
// Uso: node packages/ai-core/scripts/write-golden.ts  (después de cambiar intent.ts)
import { readFileSync, writeFileSync } from 'node:fs'; // Leer y escribir archivos
import { budgetBreakdown, parseTripIntent } from '../src/intent.ts'; // Interpretación de viajes

const inputs = JSON.parse(readFileSync(new URL('../evals/intent_inputs.json', import.meta.url), 'utf8')).inputs as string[]; // Frases de prueba
const cases = inputs.map((input) => ({ input, intent: parseTripIntent(input), budget: budgetBreakdown(parseTripIntent(input)) })); // Resultado de cada frase
writeFileSync(new URL('../evals/intent_golden.json', import.meta.url), JSON.stringify({ generated_by: 'packages/ai-core/scripts/write-golden.ts', cases }, null, 2) + '\n'); // Guarda el resultado esperado
console.log(`intent_golden.json: ${cases.length} casos`); // Informa cuántos casos se escribieron
