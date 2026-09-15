// Code that relies on a property by name declares it, and every declared name must exist in the data. The estimate
// model's configuration names no material, grade or polymer: those are tables.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTables, snapshotDate } from '../build/src/load.js';
import { compile } from '../build/src/compile.js';
import { CODE_PROPERTY_NAMES, codeReferenceIssues } from '../build/src/property-references.js';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { ESTIMATE_MODEL, loadEstimateModel } from '../build/src/estimate/model.js';

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

test('every declared name resolves, a rename is caught, and the model configuration holds no records', () => {
  const { db } = compile(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'test' });
  assert.deepEqual(codeReferenceIssues(db.registry), []);
  const renamed = structuredClone(db.registry);
  renamed.properties.find((p) => p.name === 'Flexural modulus').name = 'Flexural modulus (chord)';
  const codes = codeReferenceIssues(renamed).map((i) => `${i.code}: ${i.message.slice(0, 60)}`);
  assert.deepEqual(codes, ['REGISTRY-CODE-REFERENCE: Code relies on property "Flexural modulus" (estimate/ (modul']);
  // Polymers, variant classes and hardness are tables (m28, m29), not configuration keyed by name or ID.
  for (const k of ['identities', 'variants', 'hardness', 'impliedBounds']) assert.equal(ESTIMATE_MODEL[k], undefined, `estimate-model.json holds ${k}`);
});

test('the estimate model configuration is checked against its schema when it loads', () => {
  const broken = structuredClone(ESTIMATE_MODEL);
  broken.screening.maxWrongRat = 0.1;
  delete broken.calibration.folds;
  broken.properties.density.floors.we = 0;
  const path = join(mkdtempSync(join(tmpdir(), 'h2c-model-')), 'estimate-model.json');
  writeFileSync(path, JSON.stringify(broken));
  assert.throws(() => loadEstimateModel(path), (e) => /floors\/we must be > 0/.test(e.message) && /required property 'folds'/.test(e.message) && /"maxWrongRat"/.test(e.message));
});

