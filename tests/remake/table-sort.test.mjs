// WP-26: the table's order, ported (packages/engine/src/table.ts), is the old table's (app/js/ui/table.js sortRows), row for row. The order the
// page shows and the listing order the engine gives (the ties surface of the parity corpus) are one function; this holds the port equal to the
// old one for every column of both column sets, both directions, every template, Strict and Explore with estimates shown and hidden, and a goal.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { defaultTableState, sortRows } from '../../packages/engine/src/table.ts';

const root = fileURLToPath(new URL('../..', import.meta.url));
const old = (file) => import(pathToFileURL(join(root, file)).href);

let db, ctxBase, constraints, products, table, templates, indices;

before(async () => {
  const path = join(root, 'dist/db.json');
  if (!existsSync(path)) {
    const build = spawnSync('npm', ['run', 'build'], { cwd: root, encoding: 'utf8' });
    assert.equal(build.status, 0, `npm run build failed:\n${build.stderr}`);
  }
  db = JSON.parse(readFileSync(path, 'utf8'));
  [constraints, products, table, templates, indices] = await Promise.all([
    old('app/js/engine/constraints.js'), old('app/js/engine/products.js'), old('app/js/ui/table.js'), old('app/js/ui/templates.js'), old('app/js/engine/indices.js'),
  ]);
  const group = (rows, key) => { const m = new Map(); for (const r of rows) { if (!m.has(r[key])) m.set(r[key], []); m.get(r[key]).push(r); } return m; };
  ctxBase = {
    db, productsByMaterial: products.productsByMaterial(db), measurementsByMaterial: group(db.measurements, 'materialId'), evidenceByMaterial: group(db.evidence, 'materialId'),
    polymerEvidenceByMaterial: group(db.polymerEvidence ?? [], 'materialId'), coverageByMaterial: group(db.coverage, 'materialId'),
  };
});

const ids = (rows) => rows.map((r) => r.material.id).join(',');

function rowsFor(constraintList, policy, estimates) {
  const explore = policy === 'exploration';
  const ctx = { ...ctxBase, unknownPolicy: policy, useEstimates: explore && estimates, showEstimates: explore && estimates, anneal: false, annealMaxC: null, moisture: 'dry' };
  const candidates = db.materials.filter((m) => !m.familyEntry);
  const selection = constraints.runSelection(candidates, constraintList, ctx);
  const byId = new Map(candidates.map((m) => [m.id, m]));
  return { ctx, rows: selection.evaluations.map((evaluation) => ({ material: byId.get(evaluation.materialId), evaluation })) };
}

test('the ported sort gives the old table\'s order for every column of both column sets, both ways, on every template', () => {
  let compared = 0;
  const asked = [[]].concat(templates.TEMPLATES.map((t) => t.constraints.map((c) => ({ ...c }))));
  for (const constraintList of asked) {
    for (const [policy, estimates] of [['strict', false], ['exploration', false], ['exploration', true]]) {
      const { ctx, rows } = rowsFor(constraintList, policy, estimates);
      const scenario = { unknownPolicy: policy, constraints: constraintList, rankBy: null };
      const tested = constraintList.length > 0;
      for (const columnSet of Object.keys(table.COLUMN_SETS)) {
        for (const column of table.visibleColumns(columnSet, tested)) {
          for (const dir of ['asc', 'desc']) {
            const sort = { key: column.key, dir };
            const was = table.sortRows(rows, { scenario, sort, columnSet, ctx, sortOverride: false });
            const now = sortRows(rows, { ...defaultTableState(scenario, null, !!ctx.showEstimates), sort, columns: table.visibleColumns(columnSet, tested) });
            assert.equal(ids(now), ids(was), `${columnSet} by ${column.key} ${dir}, ${policy}${estimates ? ' with estimates' : ''}, ${constraintList.length} requirement(s)`);
            compared++;
          }
        }
      }
    }
  }
  assert.ok(compared > 300, 'the comparison ran');
});

test('ranked by a goal, the ports agree, and a column chosen after it takes the rows over while the goal stays', () => {
  const goal = indices.INDICES[0].id;
  const template = templates.TEMPLATES[4];
  const constraintList = template.constraints.map((c) => ({ ...c }));
  const { ctx, rows } = rowsFor(constraintList, 'strict', false);
  const scenario = { unknownPolicy: 'strict', constraints: constraintList, rankBy: goal };
  const columns = table.visibleColumns('properties', true);
  const ranks = table.rankOf(rows, { scenario, ctx });
  assert.ok(ranks && ranks.size > 0, 'the goal ranks some material');
  for (const sortOverride of [false, true]) {
    const sort = { key: 'density', dir: 'desc' };
    const was = table.sortRows(rows, { scenario, sort, columnSet: 'properties', ctx, sortOverride });
    const now = sortRows(rows, { scenario, sort, columns, ranks, showEstimates: false, sortOverride });
    assert.equal(ids(now), ids(was), sortOverride ? 'a column chosen after the goal' : 'ranked by the goal');
  }
});
