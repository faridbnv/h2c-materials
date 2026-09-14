// The data source: which files the build reads, and their hashes for the release record.
//
// The CSV tables under data/tables/ are the source of truth. `--source=xlsx` still reads the retired
// workbooks through the legacy extractor, only so the conversion can be proven equivalent (dual run).

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadTables, loadReference, TABLES, tablePath } from './load.js';

const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

export async function readSource(projectRoot, source = 'csv') {
  const dataDir = join(projectRoot, 'data');
  if (source === 'xlsx') {
    const { extractWorkbook, extractReference } = await import('./extract.js');
    const wbPath = join(dataDir, 'H2C_FDM_Material_Database.xlsx');
    const refPath = join(dataDir, 'Generic_Materials_Reference.xlsx');
    return {
      source,
      wb: extractWorkbook(wbPath),
      referenceRows: extractReference(refPath),
      referenceWhere: 'Generic_Materials_Reference.xlsx',
      inputs: [wbPath, refPath].map((p) => ({ file: p.slice(projectRoot.length + 1), sha256: sha256(p) })),
    };
  }
  if (source !== 'csv') throw new Error(`Unknown source "${source}"; expected csv or xlsx`);
  const files = [...TABLES.map((t) => t.file), 'reference'].map((f) => tablePath(dataDir, f));
  return {
    source,
    wb: loadTables(dataDir),
    referenceRows: loadReference(dataDir),
    referenceWhere: 'data/tables/reference.csv',
    inputs: files.map((p) => ({ file: p.slice(projectRoot.length + 1), sha256: sha256(p) })),
  };
}

export function sourceArg(argv = process.argv) {
  return argv.find((a) => a.startsWith('--source='))?.slice('--source='.length) ?? 'csv';
}
