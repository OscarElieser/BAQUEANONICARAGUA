import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseTripIntent } from '../src/intent.ts';
import { authorizeToolCall } from '../src/tools.ts';

const cases = JSON.parse(readFileSync(new URL('../evals/cases.json', import.meta.url), 'utf8'));

test('suite intent de evals/cases.json', () => {
  for (const c of cases.suites.intent) {
    const r = parseTripIntent(c.input);
    if (c.expect.days != null) assert.equal(r.days, c.expect.days, c.id);
    if (c.expect.travelers != null) assert.equal(r.travelers, c.expect.travelers, c.id);
    if (c.expect.budget) assert.deepEqual(r.budget, c.expect.budget, c.id);
    for (const m of c.expect.missing_includes ?? []) assert.ok(r.missing.includes(m), `${c.id}: falta ${m}`);
  }
});

test('suite actions de evals/cases.json (parte determinista)', () => {
  for (const c of cases.suites.actions) {
    if (!c.expect_authorization) continue;
    const r = authorizeToolCall(c.expect_authorization.tool, 'eval', { authenticated: true, confirmedCallIds: new Set() });
    assert.equal(r.status, c.expect_authorization.status, c.id);
  }
});

test('el prompt v1 incluye las reglas críticas', () => {
  const prompt = readFileSync(new URL('../prompts/assistant.system.v1.md', import.meta.url), 'utf8');
  for (const rule of ['por cotizar', 'get_route', '<<DATOS', 'confirmación', 'propose_correction', 'patrocinado']) {
    assert.ok(prompt.includes(rule), `el prompt no menciona: ${rule}`);
  }
});
