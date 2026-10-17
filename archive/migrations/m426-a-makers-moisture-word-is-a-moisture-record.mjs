#!/usr/bin/env node
// Migration m426 (2026-10-17): a maker's own statement on moisture sensitivity is a moisture record of the material's
// own sources (D143; data review fixes, item 5; read by Claude Opus).
//
// The reviewers saw PCTG-GF's coverage say "No exposure, solubility or moisture record from its own sources" beside
// FormFutura's AthenaX GF10 sheet (S-PET-TDS-AthenaX-GF10, p. 2, Q04715): "PCTG is moderately hygroscopic and therefore it
// is recommended to pre-dry the filament at 75°C for approximately 24 hours before usage for optimal results." The row
// is derived (D114), and the rule that derives it counted environmental evidence only (a storage note under
// Environmental counted; the same note as a maker's know-how did not), so 48 materials whose makers say how their
// filament takes up water read as if nobody had. The rule now counts a material's own know-how statements on moisture
// sensitivity (build/src/coverage-rules.js); they still decide nothing. Two stored rows said Gap on the same ground and
// now contradict the records (COVERAGE-UNTRUE): each is superseded by a row naming the statements.
// - M069 PPA, C00746: Q03935 (S-PPA-TDS, "excellent moisture and creep-resistant"), Q03944 and Q03950 (Siraya Tech
//   Fibreheart PPA's sheet: "Superior Moisture Resistance ..." and "If moisture contamination occurs ... Dry in ...").
// - M074 PPS-GF, C00797: Q04110 (Fiberon PPS-GF20's sheet: "should always be stored and used under dry conditions
//   (relative humidity below 20% ...").
// A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m426-a-makers-moisture-word-is-a-moisture-record.mjs
import { openTables, nextId } from '../../scripts/data/table-io.mjs';
import { onCachedSheet } from '../../scripts/lib/read-proposals-apply.mjs';

const MIGRATION = 'm426';
const DATE = '2026-10-17';
const DOMAIN = 'Moisture / environmental';
const t = openTables();
// The statements the superseding rows name, each checked as recorded and on its sheet.
const STATEMENTS = {
  M069: [['Q03935', 'excellent moisture and creep-resistant'], ['Q03944', 'Superior Moisture Resistance'], ['Q03950', 'If moisture contamination occurs']],
  M074: [['Q04110', 'should always be stored and used under dry conditions']],
};
let n = 0;
for (const [oldId, materialId] of [['C00746', 'M069'], ['C00797', 'M074']]) {
  const old = t.get('coverage', oldId);
  if (old.Status === 'Superseded') continue;
  if (old.MaterialID !== materialId || old.Domain !== DOMAIN || old.Status !== 'Gap') throw new Error(`${MIGRATION}: ${oldId} is not ${materialId}'s ${DOMAIN} Gap; the data moved`);
  const named = [];
  for (const [eid, quote] of STATEMENTS[materialId]) {
    const e = t.get('evidence', eid);
    if (e.MaterialID !== materialId || e.Topic !== 'Moisture sensitivity') throw new Error(`${MIGRATION}: ${eid} is not ${materialId}'s statement on moisture sensitivity`);
    if (!e.Finding.includes(quote)) throw new Error(`${MIGRATION}: ${eid} no longer reads "${quote}"`);
    onCachedSheet(t, e.SourceID, quote, MIGRATION);
    named.push(`${eid} (${e.SourceID}, ${e.Locator}): "${quote}"`);
  }
  const id = nextId('coverage', t.rows('coverage').map((c) => c.CoverageID));
  t.append('coverage', {
    CoverageID: id, MaterialID: materialId, GradeID: 'Not applicable', Domain: DOMAIN, Status: 'Evidence recorded', 'Manufacturer count': 'Not applicable',
    Finding: `${named.length} statement(s) on moisture sensitivity from its makers' own sheets: ${named.join('; ')}. Recorded ${DATE} (${MIGRATION}, D143): a maker's statement on how its product takes up water is a moisture record of its own sources; it decides nothing.`,
  });
  t.set('coverage', oldId, 'Finding', `Superseded by ${id} (${DATE}; was "Gap"): ${old.Finding}`, { expect: old.Finding, migration: MIGRATION });
  t.set('coverage', oldId, 'Status', 'Superseded', { expect: 'Gap', migration: MIGRATION });
  n++;
}
if (n) t.save();
console.log(`${MIGRATION}: ${n} stored moisture Gap row(s) superseded by the statements their makers print`);
