/**
 * Garantiza que la definición de recursos de la interfaz (apps/web/src/ops/resources.ts)
 * coincide con la lista blanca de la base de datos (app.admin_resources, migración 0014).
 * Si alguien agrega un campo en un lado y no en el otro, CI falla.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RESOURCES } from '../apps/web/src/ops/resources.ts';

const sql = readFileSync(new URL('../supabase/migrations/20261012000014_ops_admin.sql', import.meta.url), 'utf8');
const block = sql.slice(sql.indexOf('insert into app.admin_resources'), sql.indexOf('create or replace function app.resource('));

function dbWhitelist(): Map<string, { editable: string[]; editorial: string | null }> {
  const out = new Map<string, { editable: string[]; editorial: string | null }>();
  const re = /\('([a-z_]+)',\s*'([a-z_]+)',\s*array\[([^\]]*)\],\s*(null|'[a-z_]+')/gs;
  for (const m of block.matchAll(re)) {
    const editable = [...m[3].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
    out.set(m[1], { editable, editorial: m[4] === 'null' ? null : m[4].replace(/'/g, '') });
  }
  return out;
}

test('cada recurso de la interfaz existe en la base de datos con los mismos campos', () => {
  const db = dbWhitelist();
  assert.ok(db.size >= 11, `se esperaban al menos 11 recursos en la BD, hay ${db.size}`);
  for (const r of RESOURCES) {
    const d = db.get(r.key);
    assert.ok(d, `el recurso ${r.key} no está en app.admin_resources`);
    const ui = r.fields.map((f) => f.key).sort();
    assert.deepEqual(ui, [...d.editable].sort(), `campos distintos en ${r.key}`);
    assert.equal(r.editorial, d.editorial, `columna editorial distinta en ${r.key}`);
  }
});

test('no hay recursos en la base de datos sin definición en la interfaz', () => {
  const ui = new Set(RESOURCES.map((r) => r.key));
  for (const key of dbWhitelist().keys()) assert.ok(ui.has(key), `falta definir ${key} en resources.ts`);
});

test('los ajustes de Configuración coinciden con la lista blanca de admin_set_setting', () => {
  const dbKeys = [...(sql.match(/p_key not in \(([^)]*)\)/)?.[1] ?? '').matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
  const page = readFileSync(new URL('../apps/web/src/app/[locale]/ops/configuracion/page.tsx', import.meta.url), 'utf8');
  const uiKeys = [...page.matchAll(/key: '([a-z_]+)'/g)].map((m) => m[1]).sort();
  assert.ok(dbKeys.length > 0);
  assert.deepEqual(uiKeys, dbKeys);
});

test('ningún formulario expone campos protegidos', () => {
  const forbidden = ['editorial', 'review_state', 'listing_tier', 'verified_scope', 'is_sponsored', 'organization_id', 'archived_at', 'created_by'];
  for (const r of RESOURCES) for (const f of r.fields) assert.ok(!forbidden.includes(f.key), `${r.key}.${f.key} es un campo protegido`);
});
