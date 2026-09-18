// The data source: the CSV tables under data/tables/, read into the row objects the compiler consumes,
// with each file's SHA-256 for the audit record.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadTables, loadReference, TABLES, tablePath } from './load.js';

const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

export function readSource(projectRoot) {
  const dataDir = join(projectRoot, 'data');
  const files = [...TABLES.map((t) => t.file), 'reference', 'reference_envelopes'].map((f) => tablePath(dataDir, f));
  return {
    wb: loadTables(dataDir),
    referenceRows: loadReference(dataDir),
    referenceWhere: 'data/tables/reference.csv',
    inputs: files.map((p) => ({ file: p.slice(projectRoot.length + 1), sha256: sha256(p) })),
  };
}
