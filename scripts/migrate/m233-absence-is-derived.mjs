#!/usr/bin/env node
// Migration m233 (2026-09-30): the coverage page says the same thing for the same records (D114; the check of
// docs/audits/2026-09-30-coverage-check/).
//
// 1. The build now derives a domain's absence as it has derived its evidence since D74: a Gap where the records show
//    nothing, and for price, "Limited comparability" where a material is priced only from foreign listings (D113). So
//    the 63 stored Gap rows that said nothing but the workbook's template ("Insufficient grade-specific evidence in
//    sampled sources. Shared family notes may be available; no numerical substitution.") in a domain the build
//    derives leave through the removal ledger (D72), as m48's templated "Evidence recorded" rows did. They stood on
//    some of the first workbook's materials, so the same absence read "Gap" there and blank elsewhere; and 11 of the 25
//    on price read "Gap" beside a converted price. Each is kept verbatim in the audit folder.
//    The rarely published properties' 82 Gap rows go the same way: one templated list, which on five materials named
//    six properties measured since; the build derives each material's list from its own measurements.
// 2. CA0069, a Bambu Lab PLA Pure listing filed under ABS and quarantined on 2026-09-13 "pending a verified PLA Pure grade
//    identity", is filed under that grade, G001-183, which the price pass priced from its own listings. It is not in the
//    sample: the same shop's 2026-09-30 listing of the product is. C01110, the quarantine's coverage row, which showed
//    ABS's price as a conflict beside ABS's own listings, is superseded by a row saying so.
//
// A second run writes nothing.
//
//   node scripts/migrate/m233-absence-is-derived.mjs
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { csvText } from '../../build/src/csv.js';
import { openTables, projectRoot, nextId } from '../data/table-io.mjs';

const migration = 'm233-absence-is-derived';
const date = '2026-09-30';
const TEMPLATE = 'Insufficient grade-specific evidence in sampled sources. Shared family notes may be available; no numerical substitution.';
const DERIVED = new Set(['Identity', 'H2C status', 'Print setup', 'Mechanical', 'Thermal', 'Moisture / environmental', 'Canadian price']);
const ARCHIVE = 'docs/audits/2026-09-30-coverage-check/removed-templated-gaps.csv';
const SPARSE_ARCHIVE = 'docs/audits/2026-09-30-coverage-check/removed-sparse-gaps.csv';
const t = openTables();
let changed = 0;

// 1. The templated Gap rows of the derived domains.
const templated = t.rows('coverage').filter((c) => c.Status === 'Gap' && c.Finding === TEMPLATE && DERIVED.has(c.Domain));
if (templated.length) {
  const path = join(projectRoot, ARCHIVE);
  mkdirSync(join(projectRoot, 'docs/audits/2026-09-30-coverage-check'), { recursive: true });
  if (!existsSync(path)) writeFileSync(path, csvText(t.header('coverage'), templated.map((r) => ({ ...r }))));
  for (const r of [...templated]) {
    t.remove('coverage', r.CoverageID, { migration, where: `${ARCHIVE}; the build derives this pair from the material's own records (D114)` });
    changed++;
  }
}

// 1b. The rarely published properties' Gap rows: one templated list on 82 materials of the first workbook, naming six
// properties measured since (the fatigue life of ASA, PC, PA12 and PC-ABS, the thermal conductivity of PC and PC-PBT);
// the build derives each material's list from its own measurements now.
const sparse = t.rows('coverage').filter((c) => c.Domain === 'Sparse properties' && c.Status === 'Gap' && c.Finding.startsWith('Not published in sampled selected-grade evidence:'));
if (sparse.length) {
  const path = join(projectRoot, SPARSE_ARCHIVE);
  if (!existsSync(path)) writeFileSync(path, csvText(t.header('coverage'), sparse.map((r) => ({ ...r }))));
  for (const r of [...sparse]) {
    t.remove('coverage', r.CoverageID, { migration, where: `${SPARSE_ARCHIVE}; the build derives this pair from the material's own measurements (D114)` });
    changed++;
  }
}

// 2. CA0069 to its product, and the quarantine's coverage row.
const listing = t.get('prices', 'CA0069');
if (listing.GradeID === 'G027-01') {
  t.set('prices', 'CA0069', 'MaterialID', 'M001', { expect: 'M027' });
  t.set('prices', 'CA0069', 'GradeID', 'G001-183', { expect: 'G027-01' });
  t.set('prices', 'CA0069', 'Quarantined', 'FALSE', { expect: 'TRUE' });
  t.set('prices', 'CA0069', 'Regular price basis', 'Not in the sample: the same shop\'s 2026-09-30 listing of this product (CA0294) is', { expect: 'Quarantined: listing is Bambu PLA Pure, not ABS; exact-grade mapping unresolved' });
  t.set('prices', 'CA0069', 'Notes', `${listing.Notes} Filed under Bambu Lab PLA Pure (G001-183) since ${migration}, once that grade had listings of its own; its page names PLA Pure.`, { expect: listing.Notes });
  changed += 5;
}
const old = t.get('coverage', 'C01110');
if (old.Status === 'Quarantined') {
  const id = nextId('coverage', t.rows('coverage').map((c) => c.CoverageID));
  t.append('coverage', { CoverageID: id, MaterialID: 'M027', GradeID: 'G027-01', Domain: 'Canadian price', Status: 'Resolved', 'Manufacturer count': 'Not applicable',
    Finding: `CA0069, a Bambu Lab PLA Pure listing once filed under ABS, is filed under PLA Pure (G001-183) since ${migration}; ABS's price rests on its own listings.` });
  t.set('coverage', 'C01110', 'Finding', `Superseded by ${id} (${date}; was "Quarantined"): ${old.Finding}`, { expect: old.Finding });
  t.set('coverage', 'C01110', 'Status', 'Superseded', { expect: 'Quarantined' });
  changed += 3;
}
t.save();
console.log(`${migration}: ${changed} change(s)`);
