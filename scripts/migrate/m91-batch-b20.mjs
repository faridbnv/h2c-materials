#!/usr/bin/env node
// Migration m91 (2026-09-20): batch b20, the rulings that settle their products without asking again.
//
// R078 (a filament denser than its polymer), R079 (a finish of a material the database already holds) and R080
// (graphene and a natural fibre) are mechanical: the owner's answer decides every document that says the same
// thing, and nothing further is put to them. This is those, and what reading them found.
//
// **R078, narrowed to what the ruling says.** "A filament denser than its named polymer reaches" is the heavy
// case and only that: the grade declares a Variant of "undisclosed dense filler" and says so in Composition /
// filler (D57). The light case was in the same reader message and is not in the ruling, and it should not have
// been: Fabru's "Cyclo-Olefin-Copolymer flexibel" is 940 kg/m³ against COC's 1010 because it is the soft grade,
// and calling that a lightweight additive would record a component that is not in it. A density no filament
// reaches — six sheets read 11115, 23000 or 923000 — declares nothing at all and stays a question.
//
// **R079, twice over.** A product whose identity the database already holds is a grade under that material:
// `collidesWith` keys on the three things a material is, so a collision is the same material and not a similar
// one. And where the database holds no material for the finish but does hold the plain polymer, the product is
// a grade of that — a glow or a glitter PETG is a PETG mechanically and the finish is a fact about the grade,
// which is the owner's own wording. The same product in PLA never reaches that second step, because PLA Glow
// and PLA Sparkle exist and the first step finds them.
//
// **Three materials that would have been created twice.** PEI-CF, PEEK-CF and PEKK-CF set their Estimate
// identity to "Not applicable", because the estimate model excludes them — and every match in the classifier
// compared that field to a polymer, so none of the three ever matched itself. A material the model excludes is
// still a material.
//
// Three reader defects, each of which was putting a wrong identity into the data rather than missing one:
//
//   - **A help desk is not a support material.** Siraya Tech's captured pages open "… Essentials & Accs SUPPORT
//     BLOG Need help? Call us … support@siraya.tech", and read as the title that made supports of its whole
//     filled range: ABS CF, ASA GF, PET CF, PETG CF, TPU GF, PPA, PEBA and four TPUs, twenty documents.
//   - **A sheet names the support it prints against.** BASF's PAHT CF15 says "compatible with BVOH, water-
//     soluble support material, and HIPS", which says what supports this filament, not that it is one.
//   - **A shop's menu lists every material it sells.** Thirteen Nanovia products took "hips" from a category
//     menu on their own page — among them a silicon-carbide filament and a stainless-steel one, which is how a
//     HIPS came to publish 7190 kg/m³.
//
// And one in the review rather than the reader: `--decide` accepted a row when any of its reasons matched the
// pattern, so a row held both for a confidence and for a value outside every physics window was accepted on the
// confidence and carried the other, unread. Every reason must match now. Nothing reached the database that way
// — the nine rows it had swallowed in b19 were all in documents b19 held — but it would have.
//
// **R083 is not mechanical and is not applied here.** Twenty-five documents would create fourteen materials,
// and the ruling says that list goes to the owner before any of it is written. A proposal carrying a new
// material now waits for a verdict in readings/readings.csv, and READINGS.md lists what would be made.
//
// Four documents are held after reading rather than recorded: colorFabb's copperFill sheet twice, which prints
// two value columns the reader reads as one list; Nanovia's ISTROFLEX, a Shore D 44 elastomer the reader files
// under PLA; and AzureFilm's LumberLay, a 0.97 g/cc filament filed under PEI.
//
//   node scripts/migrate/m91-batch-b20.mjs

import { applyBatch, Refusal } from '../ingest/apply.mjs';

try {
  const { log, applied } = applyBatch('b20', { migration: 'm91-batch-b20', date: '2026-09-20' });
  console.log(`${log.length} record(s) written; ${applied} document(s) marked applied in the ledger`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error('b20 refused:');
  console.error(error.message);
  process.exit(1);
}
