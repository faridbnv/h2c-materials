#!/usr/bin/env node
// Migration m421 (2026-10-17): heat-deflection loads the reader had left unstated, typed from the cells' own words
// (D141; the parser sweep that followed m420).
//
// Spectrum's portfolio prints the HDT method letter alone, "method=A" and "method=B" (33 rows); Stratasys prints ASTM
// D648's load as "266 psi" and "18.6 kg"; two sheets print "ISO 75 B**" with a footnote mark. The load reader
// (build/src/normalize/thermal.js) knew "ISO 75/A", "HDT-A" and "Method A" and exactly "264 psi" and "18.5 kgf", so each
// of these was typed Test load MPa = Not published, and the typed column, written from the reader (m08), agreed with it.
// A value with no stated load is admitted "as published" for the 0.45 MPa headline, so eight method-A values (ISO 75
// method A is 1.80 MPa) stood as the 0.45 MPa heat deflection of eleven products (Spectrum's twins among them:
// G027-05, G027-58, G031-03, G031-15, G031-36, G031-42, G049-01, G049-04, G050-04, G104-01, G108-01). The reader now
// reads the letter and the two spellings; this writes what it reads into Test load MPa, naming the value it replaces,
// and notes it on the row. V012429 (G129-01, 134 °C, "method=A") is typed 1.8 MPa as its cell states although the
// product's own data sheet prints 134 °C at 0.45 MPa: that conflict is recorded in docs/OPEN-PROBLEMS.md, not resolved
// here. A review that explained "ISO 75 B" to the old reader (V010322) now names nothing it still needs to.
// A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m421-a-method-letter-states-the-load.mjs
import { openTables } from '../../scripts/data/table-io.mjs';
import { parseHdtStandard } from '../../build/src/normalize/thermal.js';
import { loadCellFromParsed, reviewFields } from '../../build/src/typed-values.js';

const MIGRATION = 'm421';
const NA = 'Not applicable';
const t = openTables();
let cells = 0;
const hdt = (r) => /\b(?:HDT|heat deflection|heat distortion)\b/i.test(r.Property);

for (const r of t.rows('measurements').filter(hdt)) {
  const read = loadCellFromParsed(parseHdtStandard(r['Standard / load']));
  const fields = reviewFields(r);
  const explained = fields?.has('Test load MPa') ?? false;
  if (r['Test load MPa'] !== read && !explained) {
    if (r['Test load MPa'] !== 'Not published') throw new Error(`${MIGRATION}: ${r.MeasurementID} Test load MPa is ${r['Test load MPa']}, not Not published; the data moved`);
    t.set('measurements', r.MeasurementID, 'Test load MPa', read, { expect: 'Not published', migration: MIGRATION });
    const note = `Fields: none. Test load typed ${read} MPa from the sheet's own words, "${r['Standard / load']}", which the reader had not read (${MIGRATION}, D141).`;
    if (r['Parse review'] === NA) t.set('measurements', r.MeasurementID, 'Parse review', note, { expect: NA, migration: MIGRATION });
    cells++;
  } else if (explained && r['Test load MPa'] === read) {
    // The review's reason is kept; only the column it no longer needs to explain leaves its Fields.
    const rest = [...fields].filter((f) => f !== 'Test load MPa');
    const was = r['Parse review'];
    const now = was.replace(/^Fields:\s*[^.]*\.\s*/, `Fields: ${rest.length ? rest.join(', ') : 'none'}. `) + ` The reader reads this load since ${MIGRATION} (D141).`;
    t.set('measurements', r.MeasurementID, 'Parse review', now, { expect: was, migration: MIGRATION });
    cells++;
  }
}
// With its load typed, Spectrum's portfolio row for PLA Matt (V012362: "HDT B", 116 °C, annealed, schedule not stated)
// joins the product's own sheet's row (V002780: 116 °C at 0.45 MPa, annealed 4 h at 90 °C) in one observation of one
// product's one value, and the estimate model refuses a group that mixes two annealing states (database.test.js). The
// portfolio reprints the sheet's figure: the row is retired as its duplicate, as AGENTS.md's recipe says, and the
// sheet's own row stays.
{
  const r = t.get('measurements', 'V012362');
  if (r['Data status'] === 'Published value') {
    t.set('measurements', 'V012362', 'Data status', 'Retired duplicate record', { expect: 'Published value', migration: MIGRATION });
    t.set('measurements', 'V012362', 'Notes', `${r.Notes === NA ? '' : `${r.Notes} `}Retired duplicate of V002780 (${MIGRATION}): Spectrum's portfolio reprints the PLA Matt sheet's 116 °C at 0.45 MPa (its "HDT B"), whose annealing schedule the sheet states and the portfolio does not.`, { expect: r.Notes, migration: MIGRATION });
    cells++;
  }
}

if (cells) t.save();
console.log(`${MIGRATION}: ${cells} row(s) changed`);
