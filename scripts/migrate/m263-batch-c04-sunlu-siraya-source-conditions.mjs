// GOALS steps 2/5: three witnessed originals, bounded application examples and unresolved processing/chemical claims.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { openTables, projectRoot } from '../data/table-io.mjs';
const migration = 'm263-batch-c04-sunlu-siraya-source-conditions';
const at = join(projectRoot, 'docs/audits/2026-09-30-coverage-expansion');
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const bytes = readFileSync(join(at, 'sunlu-siraya-c04-packet.json'));
const hash = digest(bytes), review = JSON.parse(readFileSync(join(at, 'sunlu-siraya-c04-review.json')));
if (hash !== '110b995f046cc5e10ca193b4782e8b918eb512ce95d99e3437a0375898572aac' || review.input_sha256 !== hash || review.overall_verdict !== 'APPROVE') throw Error(`${migration}: unreviewed packet`);
const packet = JSON.parse(bytes), t = openTables();
const agrees = (row, expected) => row && Object.entries(expected).every(([k, v]) => row[k] === v);
for (const grade of packet.ExpectedGrades) if (!agrees(t.get('grades', grade.GradeID), grade)) throw Error(`${migration}: ${grade.GradeID} moved`);
for (const doc of packet.Documents) {
  if (digest(readFileSync(join(at, 'ingest/proposals/c04', doc.File))) !== doc.ProposalSHA256) throw Error(`${migration}: proposal changed`);
  const ext = doc.Extension;
  if (digest(readFileSync(join(projectRoot, '.cache/sources/by-sha', `${doc.OriginalSHA256}.${ext}`))) !== doc.OriginalSHA256) throw Error(`${migration}: original changed`);
  const registered = t.find('sources', doc.Source.SourceID);
  if (registered && !agrees(registered, doc.Source)) throw Error(`${migration}: source moved`);
  if (registered) for (const fact of [...doc.ProposedEvidence,...doc.ProposedMeasurements]) {
    const row = t.rows(fact.row.Property ? 'measurements' : 'evidence').find((r) => r.SourceID === fact.row.SourceID && r.Locator === fact.row.Locator);
    const expected = fact.row.Property ? { ...fact.row, Notes: `Added 2026-10-01 (${migration}): re-read from the source document, page ${/^p\.\s*(\d+)\s*:/.exec(fact.row.Locator)?.[1] ?? '?'} (SHA-256 recorded in sources.csv). ${fact.row.Notes}` } : fact.row;
    if (!agrees(row, expected)) throw Error(`${migration}: previously applied evidence moved`);
  }
}
process.env.H2C_INGEST_ROOT = join(at, 'ingest');
process.env.H2C_PROPOSALS = join(at, 'ingest/proposals');
const { applyBatch } = await import('../ingest/apply.mjs');
const result = applyBatch('c04', { migration, date: '2026-10-01', dryRun: process.argv.includes('--dry-run') });
console.log(JSON.stringify({ migration, packet: hash, ...result }, null, 2));
