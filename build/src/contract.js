// The runtime contract: dist/db.json and dist/reference.json must match schema/db.schema.json and
// schema/reference.schema.json (JSON Schema 2020-12). The app reads these files and nothing else, so a
// field the compiler renamed, dropped or retyped is a build error here rather than a blank in the
// interface. Adding a field is a deliberate change to the schema in the same commit.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const schemaDir = join(dirname(fileURLToPath(import.meta.url)), '../../schema');
let validators;

function compileValidators() {
  const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
  const load = (f) => JSON.parse(readFileSync(join(schemaDir, f), 'utf8'));
  return { db: ajv.compile(load('db.schema.json')), reference: ajv.compile(load('reference.schema.json')) };
}

/** Issues in the build's { level, where, message } shape; at most `limit` per file. */
export function contractIssues({ db, reference }, { limit = 20 } = {}) {
  validators ??= compileValidators();
  const issues = [];
  for (const [name, data, file] of [['db', db, 'dist/db.json'], ['reference', reference, 'dist/reference.json']]) {
    if (validators[name](data)) continue;
    // A oneOf failure reports every branch. Per record, the deepest error is the specific one: a headline
    // missing its unit, not "must have priceIds" from the price branch it was never meant to match.
    const byRecord = new Map();
    for (const e of validators[name].errors) {
      if (e.keyword === 'oneOf' || e.keyword === 'anyOf') continue;
      const record = e.instancePath.split('/').slice(0, 5).join('/');
      const depth = e.instancePath.split('/').length + (e.keyword === 'const' ? -10 : 0);
      if (!byRecord.has(record) || depth > byRecord.get(record).depth) byRecord.set(record, { e, depth });
    }
    for (const { e } of [...byRecord.values()].slice(0, limit)) {
      issues.push({ level: 'error', code: 'CONTRACT', where: `${file}${e.instancePath || '/'}`, message: `${e.message}${e.params?.additionalProperty ? ` ("${e.params.additionalProperty}")` : ''} (schema/${name}.schema.json ${e.schemaPath})` });
    }
  }
  return issues;
}
