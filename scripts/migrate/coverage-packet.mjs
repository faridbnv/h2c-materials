// The coverage campaign's reviewed record packets. A packet is data, never executable code.
// Preflight every expected row and verified original before allocating IDs or saving.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { openTables, nextId, projectRoot } from '../data/table-io.mjs';
import { locate } from '../data/source-store.mjs';
import { reviewedClause } from './coverage-clause.mjs';

export function applyCoveragePacket(name, digest, migration) {
  const at = join(projectRoot, 'docs/audits/2026-09-30-coverage-expansion');
  const bytes = readFileSync(join(at, `${name}-packet.json`));
  const hash = createHash('sha256').update(bytes).digest('hex');
  const review = JSON.parse(readFileSync(join(at, `${name}-review.json`)));
  if (hash !== digest || review.input_sha256 !== hash || review.overall_verdict !== 'APPROVE') {
    throw new Error(`${migration}: reviewed packet changed or was not approved`);
  }
  const packet = JSON.parse(bytes), t = openTables();
  const keys = { evidence: 'EvidenceID', sources: 'SourceID' };
  const agrees = (row, expected) => row && Object.entries(expected).every(([k, v]) => row[k] === v);
  const assertRow = (row, expected, what) => {
    if (!agrees(row, expected)) throw new Error(`${migration}: ${what} moved`);
  };
  const work = [];
  for (const op of packet.Operations) {
    const key = keys[op.Table];
    if (!key || !['append', 'edit'].includes(op.Kind)) throw new Error(`${migration}: unknown operation`);
    if (op.ExpectedGrade) assertRow(t.get('grades', op.ExpectedGrade.GradeID), op.ExpectedGrade, op.ExpectedGrade.GradeID);
    if (op.ExpectedKeeper) assertRow(t.get('evidence', op.ExpectedKeeper.EvidenceID), op.ExpectedKeeper, op.ExpectedKeeper.EvidenceID);
    const s = op.Source.RegisteredSource;
    const current = t.get('sources', s.SourceID);
    const changedSource = packet.Operations.find((other) => other.Table === 'sources' && other.Kind === 'edit' && other.Proposed.SourceID === s.SourceID);
    if (!agrees(current, s) && !(changedSource && agrees(current, changedSource.Proposed))) throw new Error(`${migration}: source ${s.SourceID} moved`);
    const original = locate(s.SHA256, s.SourceID);
    if (original.bytes !== 'present' || createHash('sha256').update(readFileSync(original.path)).digest('hex') !== s.SHA256) {
      throw new Error(`${migration}: ${s.SourceID}'s reviewed original is missing or changed`);
    }
    if (op.Kind === 'edit') {
      const row = t.get(op.Table, op.Expected[key]);
      if (agrees(row, op.Proposed)) continue;
      assertRow(row, op.Expected, op.Expected[key]);
      work.push(op);
    } else {
      const row = reviewedClause(t.rows(op.Table), op.Proposed, packet.Operations, op.Table, key, migration);
      if (row) { assertRow(row, op.Proposed, row[key]); continue; }
      work.push(op);
    }
  }
  const receipt = [];
  for (const op of work) {
    const key = keys[op.Table];
    if (op.Kind === 'edit') {
      for (const [field, value] of Object.entries(op.Proposed)) {
        if (field !== key && value !== op.Expected[field]) t.set(op.Table, op.Expected[key], field, value, { expect: op.Expected[field] });
      }
      receipt.push({ operation: op.OperationID, table: op.Table, id: op.Expected[key], kind: 'edit' });
    } else {
      const id = nextId(op.Table, t.rows(op.Table).map((r) => r[key]));
      t.append(op.Table, { [key]: id, ...op.Proposed });
      receipt.push({ operation: op.OperationID, table: op.Table, id, kind: 'append' });
    }
  }
  t.save();
  console.log(JSON.stringify({ migration, packet: hash, written: receipt.length, records: receipt }, null, 2));
  return receipt;
}
