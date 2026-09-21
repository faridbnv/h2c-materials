#!/usr/bin/env node
// Migration m120 (2026-09-21): "CoC" on FormFutura's footer is its Chamber of Commerce number.
//
// FormFutura prints "Formfutura VOF CoC: 55502105" at the foot of every sheet, and the reader of batch b20 took the
// CoC for the polymer: ReForm rTitan was filed under COC (G137-02), with an "undisclosed dense filler" Variant
// because its 1.10 g/cm³ is above neat COC's. The sheet says what it is: "ReForm rTitan is based on exactly the
// same unique formulation as our TitanX filament range, but is made out of residual TitanX-based filament", and
// FormFutura's TitanX sheet says "TitanX™ is a revolutionary new high-performance and FDM-optimized engineering ABS
// (Acrylonitrile Butadiene Styrene)". It is a recycled ABS: re-filed under ABS, and the Variant, which only the
// wrong polymer's density implied, is dropped. The reader now leaves a company's register line out of the prose it
// reads (propose.mjs, A_COMPANY_REGISTER).
//
//   node scripts/migrate/m120-coc-is-a-chamber-of-commerce.mjs

import { openTables } from '../data/table-io.mjs';
import { refileGrade, recountGrades } from '../data/records.mjs';

const DATE = '2026-09-21';
const MIGRATION = 'm120';
const WHY = 'ReForm rTitan is "made out of residual TitanX-based filament", and FormFutura\'s TitanX sheet calls TitanX "engineering ABS"; the COC it was filed under was the Chamber of Commerce number on the sheet\'s footer.';
const t = openTables();
const to = refileGrade(t, 'G137-02', 'M027', { migration: MIGRATION, date: DATE, why: WHY });
if (to) {
  const g = t.get('grades', to);
  t.set('grades', to, 'Variant', 'Not applicable', { expect: g.Variant });
  t.set('grades', to, 'Composition / filler', 'The sheet states it: "made out of residual TitanX-based filament" (TitanX is FormFutura\'s engineering ABS). No filler declared.', { expect: g['Composition / filler'] });
}
const recounted = ['M027', 'M137'].map((m) => recountGrades(t, m, { migration: MIGRATION, date: DATE, because: 'after ReForm rTitan was re-filed from COC to ABS' })).filter(Boolean);
if (to || recounted.length) t.save();
console.log(`m120: ${to ? `G137-02 -> ${to}` : 'nothing to re-file'}; coverage recounted: ${recounted.join(', ') || 'none'}`);
