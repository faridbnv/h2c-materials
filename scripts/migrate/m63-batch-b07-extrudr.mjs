#!/usr/bin/env node
// Migration m63 (2026-09-19): Extrudr's library, batch b07.
//
// Two things the batch cannot say for itself, both recorded here:
//
// 1. Extrudr publishes one Additional Information Sheet for the whole range, and section 4 of it says the test
//    specimens "are manufactured through injection moulding and are tested afterwards". So every value on every
//    Extrudr sheet is a raw material value (D55), which no single sheet states and the reader could not know.
//    The review set Specimen type on all 233 accepted rows and named the document in their Notes; the document
//    itself is registered here, as corroboration: nothing is transcribed from it, and it explains what the rows
//    that cite the sheets are.
//
// 2. Ruling R045: the PLA Basic CF sheet reprints the PLA Basic table value for value, so the product and its
//    sheet are registered and none of its numbers is. A coverage row on the carbon fibre material says so, since
//    a material with a grade and no measurement is otherwise a gap nobody explained.
//
//   node scripts/migrate/m63-batch-b07-extrudr.mjs

import { applyBatch, Refusal } from '../ingest/apply.mjs';
import { openTables, nextId } from '../data/table-io.mjs';

const AIS = {
  SourceID: 'R-EXTRUDR-AIS',
  Publisher: 'Extrudr',
  Title: 'Additional Information Sheet',
  Revision: 'Not published',
  'Publication date': '2024-09-04',
  'Access date': '2026-09-19',
  'Source class': 'Manufacturer product page or guide',
  'Source note': "One sheet for Extrudr's whole range: colours and FDA compliance, spool information, certifications, and how the values on every technical data sheet were measured.",
  'Citation role': 'corroboration',
  URL: 'https://s3.extrudr.com/extrudr-media/datasheets/ais/extrudr-AIS-en.pdf',
  Locator: 'Section 4, Test values and test specimen',
  'Applicable grades': 'Not applicable',
  'Access state': 'retrieved',
  'Access note': 'Not applicable',
  SHA256: '624c091354123f45fef74b52e18ee77542e17f061f6e17b8fb305c4f6fcb2085',
};

try {
  const { log } = applyBatch('b07-extrudr', { migration: 'm63-batch-b07-extrudr', date: '2026-09-19' });
  console.log(`${log.length} record(s) written`);
  for (const line of log) console.log(`  ${line}`);

  const t = openTables();
  const after = [];
  if (!t.rows('sources').some((s) => s.SourceID === AIS.SourceID)) {
    const grades = t.rows('grades').filter((g) => g.Manufacturer === 'Extrudr').map((g) => `${g.MaterialID} / ${g.GradeID}`);
    t.append('sources', { ...AIS, 'Applicable grades': grades.join('; ') || 'Not applicable' });
    after.push(`sources ${AIS.SourceID} (${grades.length} grade(s))`);
  }

  const cf = t.rows('grades').find((g) => g.Manufacturer === 'Extrudr' && g['Product name'] === 'PLA BASIC CF');
  if (cf && !t.rows('coverage').some((c) => c.Finding.includes('PLA BASIC CF'))) {
    const id = nextId('coverage', t.rows('coverage').map((c) => c.CoverageID));
    t.append('coverage', {
      CoverageID: id,
      MaterialID: cf.MaterialID,
      Domain: 'Source conflict',
      Status: 'Reviewed with limitations',
      'Manufacturer count': 'Not applicable',
      Finding: `Reviewed 2026-09-19 (ruling R045). Extrudr's PLA BASIC CF sheet of 04.05.2026 reprints the PLA Basic table value for value: modulus, strength, stress at break, elongation, impact, HDT, melting, shrinkage and density are identical to the unfilled sheet of 16.07.2025 and only the hardened-nozzle recommendation differs, while the sheet's own prose claims significantly higher rigidity. The product and its sheet are registered; none of its numbers is recorded here, because each of them is the unfilled material's measurement. ${cf.GradeID} therefore has no measurement of its own until Extrudr publishes one.`,
    });
    after.push(`coverage ${id} (${cf.GradeID})`);
  }
  if (after.length) {
    t.save();
    for (const line of after) console.log(`  ${line}`);
  }
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error(error.message);
  process.exit(1);
}
