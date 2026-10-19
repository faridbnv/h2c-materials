#!/usr/bin/env node
// Migration m446 (2026-10-18): polymers.csv gains Annealing threshold °C, the temperature a heat treatment must exceed to
// change a printed part of a polymer that crystallises when it is annealed (the screening build's stage 4, D153).
//
// Bambu Lab's PLA sheets print "All the specimens were annealed and dried at 55 °C for 8 h before testing" (50 °C on
// some): 361 values of 15 products, every mechanical and heat value of each. The rows keep those words, and their typed
// state is annealed, as the words say. But PLA's glass transition is 55-60 °C (NatureWorks Ingeo 3D850, a PLA grade for
// 3D-printing monofilament, p. 1), and the same page says that annealing "in the range of 176-266°F (80-130°C) can be
// used to promote crystallization": at or below the glass transition nothing crystallises, so these are the values of
// the part as printed. Read as annealed, they decided nothing for an as-printed part, and every as-printed question
// about those 15 products waited on an annealing that changes nothing.
//
// The ruling (the executor, the Opus agent the owner appointed to settle data, 2026-10-18): record the values as the
// page says, and judge them as printed only through a state the vocabulary has for it; post-processing-states.csv has
// none ("as-printed" means the source states no heat treatment), so the rule is data: a polymer's threshold, read by the
// build where it assigns the state (build/src/normalize/specimen.js, judgeHeatTreatment), never a branch named for a
// maker. It is the glass transition's low end, 55 °C for PLA: a treatment at or below it is at or below every PLA's.
//
// Only a polymer that crystallises when it is annealed takes a threshold. An amorphous polymer's anneal below its glass
// transition relieves moulded-in or printed-in stress and is an annealing, the one resin sheets test by (INEOS's
// Terluran GP-22 ABS, R-INEOS-TERLURAN-GP22-TDS p. 2: "Heat Deflection Temperature A; (annealed 4 h/80 °C; 1.8 MPa)"),
// so ABS, ASA, PC and PETG keep Bambu Lab's 65-80 °C schedules as annealed: Not applicable. PLA's Morphology stays amorphous here; that class is the estimate model's, changed with a back-test in
// the next commit (D158). The other semicrystalline rows are Not recorded: none holds a value annealed at or below its
// glass transition today, and their sources were not read for this column.
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m446-annealing-threshold.mjs
import { openTables } from '../data/table-io.mjs';
import { onSheet } from '../lib/sweep-shared.mjs';

const MIGRATION = 'm446';
const COLUMN = 'Annealing threshold °C';
const NA = 'Not applicable', NR = 'Not recorded';
const SOURCE = 'R-NATUREWORKS-INGEO-3D850-TDS';
const QUOTES = ['Glass Transition Temperature, °C 55-60 D3418', 'Post-annealing in the range of 176-266°F', '(80-130°C) can be used to promote crystallization and improve the'];
const OLD_TAIL = 'The melting point column stays Not applicable while this row classes PLA as amorphous; that class is the estimate model\'s to change, with a back-test (screening build, stage 4).';
const NEW_TAIL = `${OLD_TAIL} The same page says that annealing "in the range of 176-266°F (80-130°C) can be used to promote crystallization": the annealing threshold is the glass transition's low end, 55 °C, at or below which nothing crystallises (D153).`;

const t = openTables();
for (const q of QUOTES) onSheet(t, SOURCE, q, MIGRATION);
let changed = 0;
if (!t.header('polymers').includes(COLUMN)) {
  t.addColumn('polymers', COLUMN, { after: 'As printed', fill: (r) => (r.PolymerID === 'PLA' ? '55' : r.Morphology === 'semicrystalline' || r.PolymerID === 'PLA-PHA' ? NR : NA) });
  changed++;
}
const pla = t.get('polymers', 'PLA');
if (pla[COLUMN] !== '55') throw new Error(`${MIGRATION}: PLA's ${COLUMN} is ${pla[COLUMN]}; the data moved`);
if (pla.SourceID !== SOURCE) throw new Error(`${MIGRATION}: PLA cites ${pla.SourceID}; the data moved`);
if (!pla.Basis.endsWith(NEW_TAIL)) { t.set('polymers', 'PLA', 'Basis', pla.Basis.replace(OLD_TAIL, NEW_TAIL), { expect: pla.Basis, migration: MIGRATION }); changed++; }
if (!t.get('polymers', 'PLA').Basis.endsWith(NEW_TAIL)) throw new Error(`${MIGRATION}: PLA's Basis does not end as this migration expects`);
t.save();
console.log(`${MIGRATION}: ${changed} change(s)`);
