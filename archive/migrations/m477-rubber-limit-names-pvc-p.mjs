#!/usr/bin/env node
// Migration m477 (2026-10-20): the rubber limit (CL01, D154) names the plasticised PVC (the owner's rulings, item 10;
// D176; OPEN-PROBLEMS §38.9). A deciding row's reach changes, so it is a commit of its own, with its decision diff
// (docs/audits/2026-10-20-owner-rulings/science/DECISION-DIFF.md).
//
// CL01 says an unfilled rubber's tensile modulus is at most 0.5 GPa: the Cambridge Materials Data Book prints every
// elastomer class at 0.0007 to 0.04 GPa, and the hardest unfilled elastomer filaments here, Shore D TPUs, publish 0.39 to
// 0.40 GPa. Its Basis left out the plasticised PVC "which no record calls an elastomer". Since m476 a record does: PVC-P
// (M178) is a material of its own under Flexible Elastomers, and its product, purefil's "Polyvinylchlorid weich 94A",
// says "flexible und gummiähnliche Eigenschaften" and "Die Shore Härte beträgt 94A". The physics is CL01's own: a
// plasticiser lowers PVC's glass transition below room temperature and its small crystallites hold the chains as a
// thermoplastic elastomer's hard blocks do; a material its maker rates on the Shore A scale is a rubber (Shore 95A is
// about 0.04 GPa by Gent's relation, which CV20 already reads), more than ten times under the limit. With it, PVC-P's
// product fails a 2 GPa or stiffer requirement on a limit of its kind of plastic instead of waiting on "not enough data",
// where the rigid PVC model had estimated it at 0.2 to 8.7 GPa.
//
//   node scripts/migrate/m477-rubber-limit-names-pvc-p.mjs
import { openTables } from '../../scripts/data/table-io.mjs';
import { onSheet } from '../../scripts/lib/sweep-shared.mjs';

const MIGRATION = 'm477';
const t = openTables();
const row = t.get('class_limits', 'CL01');
const OLD_APPLIES = 'Base polymer: TPU | TPE | PEBA | TPC | OBC | TPS | TPV; Modifier / filler: Unfilled / unspecified';
const NEW_APPLIES = 'Base polymer: TPU | TPE | PEBA | TPC | OBC | TPS | TPV | PVC-P; Modifier / filler: Unfilled / unspecified';
const OLD_WORDS = 'An unfilled rubber (TPU, PEBA, OBC, TPE, TPS, TPV)';
const NEW_WORDS = 'An unfilled rubber (TPU, PEBA, OBC, TPE, TPS, TPV, PVC-P)';
const OLD_TAIL = 'Formfutura Crystal Flex (SBC, a Shore 63D styrenic with a 1.8 GPa flexural modulus) is not a rubber and is left out; so is the plasticised PVC, which no record calls an elastomer.';
const NEW_TAIL = 'Formfutura Crystal Flex (SBC, a Shore 63D styrenic with a 1.8 GPa flexural modulus) is not a rubber and is left out. Since the owner\'s rulings of 2026-10-20 (m477, D176) it also holds for the plasticised PVC (PVC-P, M178): a plasticiser lowers PVC\'s glass transition below room temperature and its small crystallites hold the chains as a thermoplastic elastomer\'s hard blocks do, and its product, purefil\'s "Polyvinylchlorid weich 94A", is rated on the Shore A scale (94A, about 0.04 GPa by Gent\'s relation) with "gummiähnliche Eigenschaften"; it publishes no modulus, so the limit decides alone.';
let n = 0;
if (row['Applies to'] !== NEW_APPLIES) {
  onSheet(t, 'R-FABRU-PUREFIL-7782-Materialdatenblatt-PVC-P-purefil', 'gummiähnliche Eigenschaften | Die Shore Härte beträgt 94A', MIGRATION);
  if (t.get('materials', 'M178')['Base polymer'] !== 'PVC-P') throw new Error(`${MIGRATION}: M178 is not PVC-P`);
  if (!row.Basis.includes(OLD_TAIL)) throw new Error(`${MIGRATION}: CL01's Basis moved`);
  t.set('class_limits', 'CL01', 'Applies to', NEW_APPLIES, { expect: OLD_APPLIES, migration: MIGRATION });
  t.set('class_limits', 'CL01', 'Reason words', NEW_WORDS, { expect: OLD_WORDS, migration: MIGRATION });
  t.set('class_limits', 'CL01', 'Basis', row.Basis.replace(OLD_TAIL, NEW_TAIL), { expect: row.Basis, migration: MIGRATION });
  n++;
}
if (n) t.save();
console.log(`${MIGRATION}: ${n} class limit(s) widened`);
