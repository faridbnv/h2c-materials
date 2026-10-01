// GOALS steps 2/5: one witnessed own-product SDS; source admission precedes guarded identity correction.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { openTables, projectRoot } from '../data/table-io.mjs';
const migration = 'm248-batch-c02-insublend-sds';
const at = join(projectRoot, 'docs/audits/2026-09-30-coverage-expansion');
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const bytes = readFileSync(join(at, 'insublend-c02-packet.json'));
const hash = digest(bytes), review = JSON.parse(readFileSync(join(at, 'insublend-c02-review.json')));
if (hash !== 'a2a5016c5d521430f4afba71b561ac8f8d8426e273ad2a8041ca185bc2c349b1' || review.input_sha256 !== hash || review.overall_verdict !== 'APPROVE') throw Error(`${migration}: unreviewed packet`);
const packet = JSON.parse(bytes), t = openTables();
const agrees = (row, expected) => row && Object.entries(expected).every(([k, v]) => row[k] === v);
for (const grade of packet.ExpectedGrades) if (!agrees(t.get('grades', grade.GradeID), grade)) throw Error(`${migration}: ${grade.GradeID} moved`);
for (const doc of packet.Documents) {
  if (digest(readFileSync(join(at, 'ingest/proposals/c02', doc.File))) !== doc.ProposalSHA256) throw Error(`${migration}: proposal changed`);
  const registered = t.find('sources', doc.Source.SourceID);
  if (registered && !agrees(registered, doc.Source)) throw Error(`${migration}: source moved`);
  if (registered) for (const fact of doc.ProposedEvidence) {
    const row = t.rows('evidence').find((r) => r.SourceID === fact.row.SourceID && r.Locator === fact.row.Locator);
    if (!agrees(row, fact.row)) throw Error(`${migration}: previously applied evidence moved`);
  }
}
process.env.H2C_INGEST_ROOT = join(at, 'ingest');
process.env.H2C_PROPOSALS = join(at, 'ingest/proposals');
const { applyBatch } = await import('../ingest/apply.mjs');
const result = applyBatch('c02', { migration, date: '2026-09-30', dryRun: process.argv.includes('--dry-run') });
console.log(JSON.stringify({ migration, packet: hash, ...result }, null, 2));
