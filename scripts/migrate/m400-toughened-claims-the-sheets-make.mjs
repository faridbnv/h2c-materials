#!/usr/bin/env node
// Migration m400 (2026-10-07): products whose own documents present them as toughened, which carried no mark (quality
// round 2026-10-07, item 11; D133, D134).
//
// The round searched the documents of every product that publishes an impact value and carries no "sold as toughened"
// mark for sentences about toughness, impact, brittleness or modifiers (274 sentences, TARGETS-11.csv). Claude Opus judged
// each against the rule (schema/vocab/product-claims.csv). Eight products meet it:
//   - Bambu Lab PLA-CF: "a custom-blended tough PLA" (calls it a tough grade of its polymer);
//   - Polymaker PolyMax PETG: "a modified PETG with enhanced fracture toughness" (says it is modified for toughness);
//   - Extrudr DuraPro PC/PBT CF: "impact resistance improve over the standard blend" (more than its own standard grade);
//   - colorFabb PLA Color On Demand: "impact modified to improve toughness" (says it is impact-modified);
//   - FormFutura Pegasus PP: "various impact modifiers" (names what toughens it);
//   - Recreus PLA: "less brittle than conventional PLA" (tougher than the standard form of its polymer);
//   - Extrudr GreenTEC: "optimised for high impact resistance" (designed for impact resistance);
//   - SUNLU PLA+: "PLA with high toughness" (a high-toughness PLA), its statement already held (Q01033).
// Not enough: FormFutura CarbonFil "10% more impact resistant" than HDglass (another product); sentences that list
// toughness as a property with no comparison; and "Bambu PLA Silk was toughened", which is printed on a retailer's copy
// of the earlier PLA Silk sheet registered under PLA Silk+'s source, not on PLA Silk+'s own sheet ("without compromising
// on toughness or shine" there compares nothing). A statement no row held enters as the maker's statement first, then the
// claim points at it (m389).
//
// Each quote is checked on the cached page. A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m400-toughened-claims-the-sheets-make.mjs [--dry-run]
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';

const MIGRATION = 'm400';
const DATE = '2026-10-07';
const CLAIM = 'Toughened or impact-modified';
const CLAIMS = [
  { grade: 'G018-01', source: 'B-pla-cf-TDS', locator: 'p. 1',
    quote: 'Bambu PLA-CF is a custom-blended tough PLA with carbon fibers added to improve the hardness and bending modulus',
    reason: 'calls the product a tough grade of its polymer: "a custom-blended tough PLA with carbon fibers added".' },
  { grade: 'G020-16', source: 'R-POLYMAKER-PRIORITY-20261002-1b7d35606338', locator: 'p. 1',
    quote: 'Our PolyMax™ PETG is a modified PETG with enhanced fracture toughness which makes it more ductile and impact resistance.',
    reason: 'says the product is a modified grade for toughness: "a modified PETG with enhanced fracture toughness", and that it "outperforms standard PETG filaments".' },
  { grade: 'G131-01', source: 'R-EXTRUDR-PRINT-20260928-83ec5c0b3125', locator: 'p. 1',
    quote: "Unlike most reinforced materials, carbon fiber content here doesn't come at the cost of toughness, both stiffness and impact resistance improve over the standard blend.",
    reason: 'more impact resistance than its own standard grade: "both stiffness and impact resistance improve over the standard blend" (DuraPro PC/PBT).' },
  { grade: 'G001-60', source: 'R-COLORFABB-TDS-E-ColorFabb-Color-on-Demand', locator: 'p. 1',
    quote: 'impact modified to improve toughness',
    reason: 'says the product is impact-modified: "a high quality PLA 3D printing filament, impact modified to improve toughness".' },
  { grade: 'G082-12', source: 'S-PET-TDS-Pegasus-PP-GF', locator: 'p. 1',
    quote: 'based on our Centaur PP plus other PP grades and various impact modifiers and binding',
    reason: 'names what toughens it: "a compound based on our Centaur PP plus other PP grades and various impact modifiers".' },
  { grade: 'G001-188', source: 'D-RECREUS-PLA-PAGE', locator: 'p. 1',
    quote: 'enhanced durability that makes it less brittle than conventional PLA',
    reason: 'tougher than the standard form of its polymer: "less brittle than conventional PLA", with "improved impact resistance".' },
  { grade: 'G168-04', source: 'R-EXTRUDR-greentec-TDS-en', locator: 'p. 1',
    quote: 'is optimised for high impact resistance',
    reason: 'designed for impact resistance: "The material ... is optimised for high impact resistance".' },
  { grade: 'G001-200', evidence: 'Q01033',
    reason: 'calls the product a high-toughness grade of its polymer: "PLA with high toughness", under "Product Information PLA+".' },
];

const t = openTables();
let changed = 0;
for (const c of CLAIMS) {
  let statement;
  if (c.evidence) {
    statement = t.get('evidence', c.evidence);
    if (statement.GradeID !== c.grade) throw new Error(`${MIGRATION}: ${c.evidence} is filed on ${statement.GradeID}, not ${c.grade}`);
  } else {
    const view = onCachedSheet(t, c.source, c.quote, MIGRATION);
    statement = t.rows('evidence').find((r) => r.GradeID === c.grade && r.SourceID === c.source && r.Finding === c.quote);
    if (!statement) {
      const id = t.nextId('evidence');
      t.append('evidence', {
        EvidenceID: id, MaterialID: t.get('grades', c.grade).MaterialID, GradeID: c.grade, Domain: "Makers' know-how", Topic: 'Benefits', Finding: c.quote,
        'Exposure / conditions': `Found ${DATE} by the quality round's search of the product's documents for toughness sentences and checked on the cached page${typeof view === 'string' && view && view !== 'line' ? ` (${view} view)` : ''} (${MIGRATION}).`,
        'Rating 1–5': 'Not published', RubricID: 'Not applicable', 'Evidence type': 'Manufacturer statement', SourceID: c.source, Locator: c.locator,
      });
      statement = t.get('evidence', id);
      changed++;
    }
  }
  const held = t.rows('product_claims').find((r) => r.GradeID === c.grade && r.Claim === CLAIM);
  if (held) {
    if (held.EvidenceID !== statement.EvidenceID) throw new Error(`${MIGRATION}: ${c.grade}'s claim points at ${held.EvidenceID}; the data moved`);
    continue;
  }
  t.append('product_claims', { GradeID: c.grade, Claim: CLAIM, EvidenceID: statement.EvidenceID, Reason: c.reason, 'Reviewed by': `Claude Opus 5.5, ${DATE}, on the statement's words (${MIGRATION})` });
  changed++;
}
if (process.argv.includes('--dry-run')) { console.log(`${MIGRATION}: ${changed} change(s) (dry run)`); process.exit(0); }
if (changed) t.save();
console.log(`${MIGRATION}: ${changed} change(s): ${CLAIMS.length} products' toughened claims`);
