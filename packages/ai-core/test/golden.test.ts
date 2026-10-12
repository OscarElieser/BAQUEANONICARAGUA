// Comprueba que intent_golden.json coincide con la versión actual de TypeScript.
// Android (Dart) compara su propia versión contra el mismo archivo: así ambas plataformas entienden igual cada viaje.
import assert from 'node:assert/strict'; // Comprobaciones
import { readFileSync } from 'node:fs'; // Leer archivos
import { test } from 'node:test'; // Corredor de pruebas
import { budgetBreakdown, parseTripIntent } from '../src/intent.ts'; // Interpretación de viajes

const golden = JSON.parse(readFileSync(new URL('../evals/intent_golden.json', import.meta.url), 'utf8')); // Resultado esperado
const inputs = JSON.parse(readFileSync(new URL('../evals/intent_inputs.json', import.meta.url), 'utf8')).inputs as string[]; // Frases

test('el archivo de referencia está al día (si falla: node packages/ai-core/scripts/write-golden.ts)', () => {
  assert.deepEqual(golden.cases.map((c: { input: string }) => c.input), inputs); // Mismas frases y en el mismo orden
  for (const c of golden.cases) {
    // Cada caso debe dar lo mismo que la versión actual
    assert.deepEqual(parseTripIntent(c.input), c.intent, c.input); // Interpretación
    assert.deepEqual(budgetBreakdown(parseTripIntent(c.input)), c.budget, c.input); // Presupuesto desglosado
  }
});
