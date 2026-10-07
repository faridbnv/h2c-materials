#!/usr/bin/env node
// Migration m408 (2026-10-07): the toughened claims the quality round's missed-claim draw showed its first search had
// missed (D133, D134).
//
// m400's search read the documents of products with a notched impact headline value only. The closing draw took twenty
// unmarked products that publish any impact value, as m389's did, and a blind Claude Sonnet reader copied every sentence
// of their documents about toughness or impact (docs/audits/2026-10-07-quality-round/blind-draw/negative-sentences.csv):
// four of the twenty carry a statement the rule admits (Flashforge's PLA and HS PLA, "produced using a reinforced and
// toughened ... polylactic acid material"; Siraya Tech's ABS-GF; eSUN's ePA-CF), so the search was widened once, as the
// round's plan says: every unmarked product with any impact value, every sentence of its documents that may state a
// claim (widened-sentences.csv: 160 sentences on 114 products). Claude Opus judged each against the rule
// (schema/vocab/product-claims.csv). Twenty-five products meet it, and a second draw of twenty after the widening
// found one more, whose wording found two (twenty-eight in all): they say they are toughened or impact-modified, name
// what toughens them, claim more toughness or impact resistance than the standard form of their polymer or their own
// standard grade, or say they were optimised for impact. Not enough, as before: toughness listed as a property ("High
// toughness"), a comparison with another polymer ("tougher than PLA" of a PETG, PCTG against PETG), with another product
// (DuraPro PA6 CF against PA12 CF, CarbonFil against HDglass), with "many other 3D printer filaments", a print becoming
// tougher when damp, a technology described in a maker's glossary of all its technologies (Polymaker's
// Nano-reinforcement), and PolyLite PLA Pro's "combining high toughness and high rigidity", as m400 judged it.
//
// Each statement enters as the maker's statement first, its quote checked on the cached page, then the claim points at
// it (m389, m400). A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m408-toughened-claims-the-widened-search-found.mjs [--dry-run]
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';

const MIGRATION = 'm408';
const DATE = '2026-10-07';
const CLAIM = 'Toughened or impact-modified';
const TOUGHENED = 'says the product is made of a toughened material';
const CLAIMS = [
  ['G028-02', 'D-SIRAYA-Fibreheart-ABS-GF-TDS', 'Glass Fiber enhances durability and impact resistance', 'names what toughens it: "Superior Toughness: Glass Fiber enhances durability and impact resistance".'],
  ['G001-55', 'D-FIBERLOGY-PLA-IMPACT-FILAMENT-PAGE', 'Thanks to its increased impact strength and higher temperature resistance', 'more impact strength than the typical PLA it is set beside: "the ease and safety of printing typical of PLA with mechanical strength comparable to ABS. Thanks to its increased impact strength …".'],
  ['G001-43', 'R-ERYONE-eryone-hs-pla-tds', 'Compared to standard PLA, it exhibits superior toughness', 'tougher than the standard form of its polymer: "Compared to standard PLA, it exhibits superior toughness".'],
  ['G001-45', 'R-ERYONE-eryone-pla-tds', 'shows significant improvements in hardness and toughness', 'tougher than the standard form of its polymer: "Compared to traditional PLA, Airewan PLA+ shows significant improvements in hardness and toughness".'],
  ['G001-48', 'D-FLASH-PLA-Multicolor-TDS-EN', 'strengthened and toughened polylactic acid modified material', `${TOUGHENED}: "produced using a strengthened and toughened polylactic acid modified material".`],
  ['G017-07', 'D-FLASH-PLA-LW-TDS-EN', 'toughened PLA-based composite', `${TOUGHENED}: "produced using a toughened PLA-based composite blended with foaming microspheres".`],
  ['G001-49', 'D-FLASH-PLA-HS-TDS-EN', 'reinforced and toughened modified polylactic acid material', `${TOUGHENED}: "produced using a reinforced and toughened modified polylactic acid material".`],
  ['G001-50', 'D-FLASH-PLA-Matte-TDS-EN', 'toughened matte polylactic acid modified material', `${TOUGHENED}: "produced using a toughened matte polylactic acid modified material".`],
  ['G008-09', 'D-FLASH-PLA-Silk-TDS-EN', 'toughened, high-gloss polylactic acid modified material', `${TOUGHENED}: "produced using a toughened, high-gloss polylactic acid modified material".`],
  ['G001-51', 'D-FLASH-PLA-Pro-TDS-EN', 'its toughness is twice that of the ordinary PLA filament', 'toughened, and tougher than the ordinary form of its polymer: "a specially toughened polylactic acid modified material, and its toughness is twice that of the ordinary PLA filament".'],
  ['G001-52', 'D-FLASH-PLA-Crystal-TDS-EN', 'toughened, high- transparency modified PLA material', `${TOUGHENED}: "produced using a toughened, high-transparency modified PLA material".`],
  ['G001-67', 'D-FLASH-PLA-TDS-EN', 'reinforced and toughened polylactic acid modified material', `${TOUGHENED}: "produced using a reinforced and toughened polylactic acid modified material".`],
  ['G028-07', 'D-FIBERLOGY-ABSGF-FILAMENT-PAGE', 'has been optimized for impact strength and dimensional accuracy', 'designed for impact: "The ABS+GF filament has been optimized for impact strength and dimensional accuracy" (as m400 judged Extrudr GreenTEC\'s "optimised for high impact resistance").'],
  ['G024-10', 'D-3D4MAKERS-PETG-CARBON-PAGE', 'Increased Impact Resistance compared to regular PETG', 'more impact resistance than the regular form of its polymer: "Increased Impact Resistance compared to regular PETG".'],
  ['G019-03', 'S-PEBA-eSUN-PLA-GF-Filament-TDS-V1-0-1', 'enhance the rigidity and impact resistance of ordinary PLA', 'names what toughens it and claims more than its polymer\'s ordinary form: "15-20% glass fiber is added to greatly enhance the rigidity and impact resistance of ordinary PLA".'],
  ['G020-45', 'R-QIDI-PETG-TOUGH', 'improved the notch impact strength of QIDI ToughPETG-HF to more than twice that of', 'more impact resistance than the ordinary form of its polymer: "QIDI has improved the notch impact strength of QIDI ToughPETG-HF to more than twice that of ordinary PETG" (韧性改良技术, toughness-improvement technology).'],
  ['G027-39', 'R-3DJAKE-3DJAKE-TDS-ABS-Prime-pptx', 'has exceptional strength with an increased impact resistance', 'more impact resistance than the regular form of its polymer: "based on regular ABS. Due to our enhanced formulation, ABS Prime has exceptional strength with an increased impact resistance".'],
  ['G011-06', 'R-3DJAKE-3DJAKE-ANYCUBIC-TDS-PLA-Metal-V3-0', 'With a refined formula that enhances toughness and printing performance', 'says its formula is toughened: "With a refined formula that enhances toughness and printing performance".'],
  ['G001-155', 'D-RAISE3D-Raise3D-Hyper-Speed-PLA-Filament-TDS-V4-0-EN', 'significantly improving the interlayer bonding quality and impact resistance', 'more impact resistance than the regular form of its polymer: "The mechanical properties of Hyper Speed PLA outperform regular PLA under high-speed printing, significantly improving the interlayer bonding quality and impact resistance".'],
  ['G001-159', 'S-PET-TDS-EasyFil-PLA', 'slightly modified with an impact modifier, making the filament tougher', 'names what toughens it: "slightly modified with an impact modifier, making the filament tougher".'],
  ['G001-177', 'D-3D4MAKERS-FACILAN-C8-FILAMENT-PAGE', 'has higher impact strength than PLA', 'more impact resistance than the standard form of its polymer: "Facilan™ C8 has higher impact strength than PLA".'],
  ['G001-179', 'D-BIGREP-PLX-PAGE', 'can better withstand impacts without breaking', 'more impact resistance than the standard form of its polymer: "PLX is more flexible than PLA and can better withstand impacts without breaking (notched impact strength of 4 vs 2 kJ/m²)".'],
  ['G156-01', 'S-PEBA-eSUN-ePA-CF-Filament-TDS-V4-0', 'adding 20% carbon fiber greatly enhances the strength, rigidity and tough', 'names what toughens it and claims more than its polymer: "adding 20% carbon fiber greatly enhances the strength, rigidity and toughness of nylon".'],
  ['G168-03', 'R-EXTRUDR-GAP2-20261005-8a59c7615526', 'built-in flexibility for improved impact resistance', 'more impact resistance than its own standard grade: "greater flexural strength than standard GreenTEC, along with a degree of built-in flexibility for improved impact resistance".'],
  // The second draw of twenty (negative-2-sentences.csv) found one more, a design claim the widened words did not reach
  // ("specially designed for applications that require ultra high impact toughness"); the same wording, swept, found two.
  ['G027-41', 'R-3DJAKE-ABS-P-TDS-1', 'specially designed for applications that require ultra high impact toughness', 'designed for impact and names what toughens it: "a filament with high butadiene content, specially designed for applications that require ultra high impact toughness".'],
  ['G088-03', 'R-EXTRUDR-PRIORITY-20261003-ce91065b0c8a', 'engineered for parts that need to survive real impact', 'designed for impact: "BUILT TO WITHSTAND IMPACT. PCTG is a modified copolyester engineered for parts that need to survive real impact".'],
  ['G068-02', 'R-POLYMAKER-PRIORITY-20261003-67deefea2e32', 'engineered for users who need the toughness of an engineering-grade filament', 'designed for toughness: "It\'s engineered for users who need the toughness of an engineering-grade filament without sacrificing printability".'],
  ['G110-03', 'D-FIBERLOGY-PCTGGF-FILAMENT-PAGE', 'The result is a material with increased strength, stiffness, and impact resistance', 'names what toughens it and claims more than its polymer: "combines the versatility of PCTG copolyester with … glass fiber (10%). The result is a material with increased strength, stiffness, and impact resistance".'],
];

const t = openTables();
let changed = 0;
for (const [grade, source, quote, reason] of CLAIMS) {
  const view = onCachedSheet(t, source, quote, MIGRATION);
  // A statement already held on the product, from this source, that holds the quote, is the one the claim points at.
  let statement = t.rows('evidence').find((r) => r.GradeID === grade && r.SourceID === source && r['Evidence type'] === 'Manufacturer statement' && r.Finding.includes(quote));
  if (!statement) {
    const id = t.nextId('evidence');
    t.append('evidence', {
      EvidenceID: id, MaterialID: t.get('grades', grade).MaterialID, GradeID: grade, Domain: "Makers' know-how", Topic: 'Benefits', Finding: quote,
      'Exposure / conditions': `Found ${DATE} by the quality round's widened search of the product's documents for toughness sentences and checked on the cached page${typeof view === 'string' && view && view !== 'line' ? ` (${view} view)` : ''} (${MIGRATION}).`,
      'Rating 1–5': 'Not published', RubricID: 'Not applicable', 'Evidence type': 'Manufacturer statement', SourceID: source, Locator: 'p. 1',
    });
    statement = t.get('evidence', id);
    changed++;
  }
  const held = t.rows('product_claims').find((r) => r.GradeID === grade && r.Claim === CLAIM);
  if (held) {
    if (held.EvidenceID !== statement.EvidenceID) throw new Error(`${MIGRATION}: ${grade}'s claim points at ${held.EvidenceID}; the data moved`);
    continue;
  }
  t.append('product_claims', { GradeID: grade, Claim: CLAIM, EvidenceID: statement.EvidenceID, Reason: reason, 'Reviewed by': `Claude Opus 5.5, ${DATE}, on the statement's words (${MIGRATION})` });
  changed++;
}
if (process.argv.includes('--dry-run')) { console.log(`${MIGRATION}: ${changed} change(s) (dry run)`); process.exit(0); }
if (changed) t.save();
console.log(`${MIGRATION}: ${changed} change(s): ${CLAIMS.length} products' toughened claims`);
