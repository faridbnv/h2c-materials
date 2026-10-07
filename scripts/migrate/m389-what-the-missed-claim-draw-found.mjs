#!/usr/bin/env node
// Migration m389 (2026-10-06): what the impact round's missed-claim draw found (D133).
//
// Twenty products that publish an impact value and carry no "sold as toughened" mark were drawn at random, and a Claude
// Sonnet reader copied every sentence of their documents about toughness or impact
// (docs/audits/2026-10-06-impact-round/blind-draw/negative.csv). Claude Opus judged each against the rule
// (schema/vocab/product-claims.csv): one meets it. colorFabb's page for PET HIGH SPEED PRO heads the product "High-speed
// filament with increased toughness" and says it "offers increased flexibility and impact resistance": more than its
// standard form, as colorFabb says of PLA High Speed PRO (marked by m386). The sentence was not held, so it enters as a
// maker's statement first, then the claim points at it. Its notched Charpy is 1.2 kJ/m², the lowest of its material's:
// the mark is the maker's claim, shown beside the number. The other 19 hold nothing the rule admits (BigRep says PLA "is
// somewhat stronger and resistant to impact" than its PRO HT; 3D-Fuel compares its PCTG with PETG, another polymer).
//
// The quote is checked on the cached page. A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m389-what-the-missed-claim-draw-found.mjs
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';

const MIGRATION = 'm389';
const GRADE = 'G066-03';
const SOURCE = 'D-COLORFABB-PET-HIGH-SPEED-PRO-CLEAR-PAGE';
const QUOTE = 'PET HIGH SPEED PRO offers increased flexibility and impact resistance , allowing printed parts to withstand bending, deformation and sudden mechanical loads more effectively.';
const CLAIM = 'Toughened or impact-modified';
const t = openTables();

onCachedSheet(t, SOURCE, QUOTE, MIGRATION);
let changed = 0;
let statement = t.rows('evidence').find((r) => r.GradeID === GRADE && r.SourceID === SOURCE && r.Finding === QUOTE);
if (!statement) {
  const id = t.nextId('evidence');
  t.append('evidence', {
    EvidenceID: id, MaterialID: t.get('grades', GRADE).MaterialID, GradeID: GRADE, Domain: "Makers' know-how", Topic: 'Benefits', Finding: QUOTE,
    'Exposure / conditions': `Read ${'2026-10-06'} by a Claude Sonnet reader on the cached page (impact round's missed-claim draw, ${MIGRATION}); the page heads the product "High-speed filament with increased toughness".`,
    'Rating 1–5': 'Not published', RubricID: 'Not applicable', 'Evidence type': 'Manufacturer statement', SourceID: SOURCE, Locator: 'p. 1',
  });
  statement = t.get('evidence', id);
  changed++;
}
const held = t.rows('product_claims').find((r) => r.GradeID === GRADE && r.Claim === CLAIM);
if (held) {
  if (held.EvidenceID !== statement.EvidenceID) throw new Error(`${MIGRATION}: ${GRADE}'s claim points at ${held.EvidenceID}; the data moved`);
} else {
  t.append('product_claims', { GradeID: GRADE, Claim: CLAIM, EvidenceID: statement.EvidenceID,
    Reason: 'more impact resistance and toughness than the standard form: "offers increased flexibility and impact resistance", under the heading "High-speed filament with increased toughness".',
    'Reviewed by': `Claude Opus 5.5, 2026-10-06, on the statement's words (${MIGRATION})` });
  changed++;
}
if (changed) t.save();
console.log(`${MIGRATION}: ${changed} change(s): colorFabb PET HIGH SPEED PRO's statement and its claim`);
