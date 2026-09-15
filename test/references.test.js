// Code that relies on a property by name declares it, and every declared name, and every material or grade
// the estimate model names, must exist in the data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTables, snapshotDate } from '../build/src/load.js';
import { compile } from '../build/src/compile.js';
import { CODE_PROPERTY_NAMES, codeReferenceIssues } from '../build/src/property-references.js';
import { ESTIMATE_MODEL } from '../build/src/estimate/model.js';
import { modelReferenceIssues } from '../build/src/estimate/validate.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const wb = loadTables(join(root, 'data'));
const registered = wb['Property registry'].rows.map((p) => p.Property);

test('every registered property name used as a string in code is declared', () => {
  const files = [
    ...readdirSync(join(root, 'build/src')).filter((f) => f.endsWith('.js') && f !== 'property-references.js').map((f) => `build/src/${f}`),
    ...readdirSync(join(root, 'build/src/normalize')).map((f) => `build/src/normalize/${f}`),
    ...readdirSync(join(root, 'build/src/estimate')).map((f) => `build/src/estimate/${f}`),
    ...['engine', 'ui'].flatMap((d) => readdirSync(join(root, 'app/js', d)).map((f) => `app/js/${d}/${f}`)),
  ];
  const undeclared = [];
  for (const f of files) {
    const text = readFileSync(join(root, f), 'utf8');
    for (const name of registered) {
      if ((text.includes(`'${name}'`) || text.includes(`"${name}"`)) && !CODE_PROPERTY_NAMES[name]) undeclared.push(`${f}: ${name}`);
    }
  }
  assert.deepEqual(undeclared, []);
});

test('every declared name and every model reference resolves, and a rename is caught', () => {
  const { db } = compile(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'test' });
  const referenceIssues = (a) => [...codeReferenceIssues(a.registry), ...modelReferenceIssues(a)];
  assert.deepEqual(referenceIssues({ registry: db.registry, materials: db.materials, grades: db.grades, model: ESTIMATE_MODEL }), []);
  const renamed = structuredClone(db.registry);
  renamed.properties.find((p) => p.name === 'Flexural modulus').name = 'Flexural modulus (chord)';
  const model = { ...ESTIMATE_MODEL, variants: { silk: ['PLA Silk', 'PLA Silky'] } };
  const codes = referenceIssues({ registry: renamed, materials: db.materials, grades: db.grades, model }).map((i) => `${i.code}: ${i.message.slice(0, 60)}`);
  assert.deepEqual(codes, ['REGISTRY-CODE-REFERENCE: Code relies on property "Flexural modulus" (estimate/ (modul', 'EST-MODEL-REFERENCE: variants.silk names "PLA Silky", which is not a material']);
});
