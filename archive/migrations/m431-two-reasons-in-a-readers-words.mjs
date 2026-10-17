#!/usr/bin/env node
// Migration m431 (2026-10-17): two reasons the reviewers read as wrong, written again from the documents (data review
// fixes, items 10 and 11; read by Claude Opus).
//
// 1. Fiberlogy PCTG+GF10 (G110-03) is marked "Toughened or impact-modified" (product_claims.csv), and the reviewers
//    read that as wrong for a glass-filled product. Fiberlogy's own page (D-FIBERLOGY-PCTGGF-FILAMENT-PAGE) says it
//    "combines the versatility of PCTG copolyester with the exceptional properties of glass fiber (10%). The result is a
//    material with increased strength, stiffness, and impact resistance", and lists "High impact strength and tensile
//    strength". That is the vocabulary's second way: the maker claims more impact resistance than the plain form of its
//    polymer (schema/vocab/product-claims.csv). So the mark stays, as the maker states it. Its reason said the maker
//    "names what toughens it", which glass fibre is not (a reinforcement, not an impact modifier); the reason now says
//    which of the ways it is, and that the maker never calls it toughened.
// 2. Bambu Lab's filament guide's "PETG HF" row answers a print setting for every PETG product whose own sheet, and
//    whose twin's, are silent on it (D88). Read again, the guide's columns are "PLA PETG HF ABS ABS-GF ASA ASA-CF PC PC
//    FR TPU 95A HF TPU for AMS PLA-CF PETG-CF PET-CF PAHT-CF PA6-CF PA6-GF PPA-CF PPS-CF": it has no column for plain
//    PETG, and PETG HF is its one unfilled PETG, the nearest row. The mapping stays; its reason now says so in a
//    reader's words, and what the guide's high-flow row means for a product that is not high-flow.
// Each quote is checked on the cached page. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m431-two-reasons-in-a-readers-words.mjs
import { openTables } from '../../scripts/data/table-io.mjs';
import { onCachedSheet } from '../../scripts/lib/read-proposals-apply.mjs';

const MIGRATION = 'm431';
const DATE = '2026-10-17';
const WHO = `Claude Opus, ${DATE}, on the maker's own words (${MIGRATION}, data review fixes)`;
const t = openTables();
let n = 0;

onCachedSheet(t, 'D-FIBERLOGY-PCTGGF-FILAMENT-PAGE', 'The result is a material with increased strength, stiffness, and impact resistance | High impact strength and tensile strength', MIGRATION);
const CLAIM = { GradeID: 'G110-03', Claim: 'Toughened or impact-modified' };
const claim = t.rows('product_claims').find((r) => r.GradeID === CLAIM.GradeID && r.Claim === CLAIM.Claim);
const REASON = 'claims more impact resistance than the plain form of its polymer: "combines the versatility of PCTG copolyester with … glass fiber (10%). The result is a material with increased strength, stiffness, and impact resistance", and "High impact strength". Glass fibre is a reinforcement, not what toughens it, and the maker never calls the product toughened; the mark is its claim of impact resistance, beside the product\'s own published values (D133).';
if (claim.Reason !== REASON) {
  n += t.update('product_claims', CLAIM, 'Reason', REASON, { expect: claim.Reason, migration: MIGRATION }) ? 1 : 0;
  n += t.update('product_claims', CLAIM, 'Reviewed by', `${claim['Reviewed by']}; reason written again by ${WHO}`, { expect: claim['Reviewed by'], migration: MIGRATION }) ? 1 : 0;
}

onCachedSheet(t, 'B-GUIDE', 'PLA PETG HF ABS ABS-GF ASA ASA-CF PC PC FR TPU 95A HF TPU for AMS PLA-CF PETG-CF PET-CF PAHT-CF PA6-CF PA6-GF PPA-CF PPS-CF', MIGRATION);
const map = t.get('print_guide_materials', 'M020');
if (map.PrintGuideID !== 'PG017') throw new Error(`${MIGRATION}: PETG reads ${map.PrintGuideID}, not PG017; the data moved`);
const GUIDE = 'Bambu Lab\'s filament guide has no column for plain PETG: its columns are PLA, PETG HF, ABS, ASA, PC, the TPUs and the fibre-filled grades. PETG HF, a high-flow PETG and a product of PETG here (m141, D86), is its one unfilled PETG and the nearest column, so a PETG product whose own sheet and twin are silent reads it, labelled as the guide\'s. It is a high-flow grade\'s window (nozzle 230 to 260 °C, bed 60 to 80 °C), which a plain PETG\'s own sheet may set lower. Not PETG-CF, a column of its own, nor PETG-GF, -ESD, PCTG, CPE or PET, which the guide does not name.';
if (map.Reason !== GUIDE) {
  t.set('print_guide_materials', 'M020', 'Reason', GUIDE, { expect: map.Reason, migration: MIGRATION });
  t.set('print_guide_materials', 'M020', 'Reviewed by', `${map['Reviewed by']}; reason written again by ${WHO}`, { expect: map['Reviewed by'], migration: MIGRATION });
  n += 2;
}
if (n) t.save();
console.log(`${MIGRATION}: ${n} cell(s) of two reasons written again from the documents`);
