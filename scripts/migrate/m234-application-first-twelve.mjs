#!/usr/bin/env node
// GOALS steps 2/5, C3/C6/C10/C13: recover five manual Application judgements from
// existing exact-product treatment evidence. No values, product states or verdicts change.
// Both readers reread registered originals; independent review is AI, not human.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { openTables, nextId, projectRoot } from '../data/table-io.mjs';
import { locate } from '../data/source-store.mjs';

const audit = join(projectRoot, 'docs/audits/2026-09-30-coverage-expansion');
const bytes = readFileSync(join(audit, 'first-12-packet.json'));
const digest = createHash('sha256').update(bytes).digest('hex');
const review = JSON.parse(readFileSync(join(audit, 'first-12-review.json')));
if (digest !== '7f3c7d4a141eb6e434847f858b90cb646a39cef5278616e439cf567cd4214aa9'
  || review.input_sha256 !== digest || review.verdict !== 'APPROVE' || review.approved_operations !== 5) {
  throw new Error('m234: the independently reviewed packet changed');
}
const packet = JSON.parse(bytes);
const t = openTables();
let appended = 0;
for (const operation of packet.Operations) {
  const finding = packet.Findings.find((f) => f.FindingID === operation.FindingID);
  const basis = t.get('evidence', finding.ExistingEvidence.EvidenceID);
  for (const [field, expected] of Object.entries(finding.ExistingEvidence)) {
    if (basis[field] !== expected) throw new Error(`m234: ${basis.EvidenceID} ${field} moved`);
  }
  const source = t.get('sources', basis.SourceID);
  if (source.SHA256 !== finding.Source.SHA256 || locate(source.SHA256, source.SourceID).bytes !== 'present') {
    throw new Error(`m234: ${source.SourceID}'s reviewed original is unavailable or changed`);
  }
  const existing = t.rows('coverage').find((r) => r.MaterialID === operation.append.MaterialID
    && r.GradeID === operation.append.GradeID && r.Domain === operation.append.Domain
    && r.Finding === operation.append.Finding);
  if (existing) {
    for (const [field, expected] of Object.entries(operation.append)) {
      if (existing[field] !== expected) throw new Error(`m234: ${existing.CoverageID} ${field} moved`);
    }
    for (const old of operation.supersede) {
      const row = t.get('coverage', old.CoverageID);
      if (row.Status !== 'Superseded' || row.Finding !== `Superseded by ${existing.CoverageID}: ${old.Finding}`) {
        throw new Error(`m234: ${old.CoverageID}'s supersession moved`);
      }
    }
    continue;
  }
  for (const old of operation.supersede) {
    const row = t.get('coverage', old.CoverageID);
    for (const [field, expected] of Object.entries(old)) {
      if (row[field] !== expected) throw new Error(`m234: ${old.CoverageID} ${field} moved`);
    }
  }
  const id = nextId('coverage', t.rows('coverage').map((r) => r.CoverageID));
  t.append('coverage', { CoverageID: id, ...operation.append });
  for (const old of operation.supersede) {
    t.set('coverage', old.CoverageID, 'Status', 'Superseded', { expect: old.Status });
    t.set('coverage', old.CoverageID, 'Finding', `Superseded by ${id}: ${old.Finding}`, { expect: old.Finding });
  }
  appended++;
}
t.save();
console.log(`m234: ${appended} Application judgements appended; existing evidence reused`);
