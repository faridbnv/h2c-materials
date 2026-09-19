#!/usr/bin/env node
// Migration m65 (2026-09-19): SUNLU's library, batch b08.
//
// One thing the batch cannot say for itself: PVA held a coverage row saying its mechanical evidence was a gap,
// and SUNLU's PVA sheet fills part of it. A coverage row that no longer states the truth is superseded rather
// than edited (D72, the m37 pattern), so the old row keeps its wording and says which row replaced it.
//
//   node scripts/migrate/m65-batch-b08-sunlu.mjs

import { applyBatch, Refusal } from '../ingest/apply.mjs';
import { openTables, nextId } from '../data/table-io.mjs';

const DATE = '2026-09-19';

const supersedePva = () => {
  const t = openTables();
  const old = t.rows('coverage').find((c) => c.CoverageID === 'C00805' && c.Status !== 'Superseded');
  if (!old) return null;
  const id = nextId('coverage', t.rows('coverage').map((c) => c.CoverageID));
  t.append('coverage', {
    CoverageID: id,
    MaterialID: old.MaterialID,
    Domain: old.Domain,
    Status: 'Evidence recorded',
    'Manufacturer count': 'Not applicable',
    Finding: `Recorded ${DATE} (m65). SUNLU's PVA sheet publishes a tensile strength and an elongation at break on printed specimens in both directions, so the material is no longer without mechanical evidence of its own. What it still lacks is a modulus and an impact strength: no sheet in the register publishes either for a PVA.`,
  });
  t.set('coverage', old.CoverageID, 'Finding', `Superseded by ${id} (${DATE}; was "${old.Status}"): ${old.Finding}`, { expect: old.Finding });
  t.set('coverage', old.CoverageID, 'Status', 'Superseded', { expect: old.Status });
  t.save();
  return { id, old: { ...old } };
};

const undo = (change) => {
  if (!change) return;
  const t = openTables();
  t.set('coverage', change.old.CoverageID, 'Status', change.old.Status, { expect: 'Superseded' });
  t.set('coverage', change.old.CoverageID, 'Finding', change.old.Finding);
  t.save();
};

// The coverage row goes first: the applier validates the whole database before it writes anything, and a row
// saying PVA has no mechanical evidence is untrue the moment this batch's PVA sheet is in it. If the batch is
// refused, the row goes back to what it said.
const change = supersedePva();
if (change) console.log(`coverage ${change.id} (supersedes ${change.old.CoverageID})`);

try {
  const { log } = applyBatch('b08-sunlu', { migration: 'm65-batch-b08-sunlu', date: DATE });
  console.log(`${log.length} record(s) written`);
  for (const line of log) console.log(`  ${line}`);
} catch (error) {
  undo(change);
  if (!(error instanceof Refusal)) throw error;
  console.error(error.message);
  process.exit(1);
}
