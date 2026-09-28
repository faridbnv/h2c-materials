#!/usr/bin/env node
// Migration m215 (2026-09-28): Fiberon PET-GF15's annealed heat deflections are annealed on the one schedule its sheet
// states (D99; the review of 2026-09-27, S03 and D03).
//
// A product is judged in one state it can be made in (D99), and two values join in one state only where the same
// annealing produced both. PET-GF15's sheet (R-FIBERON-PETGF15-TDS, p. 1) prints its heat deflection twice, "(as
// printed)" and "(annealed)", with no schedule beside the annealed rows; it prints one annealing schedule for the product,
// "Annealing temp. and time 120°C/16H" in its print settings, and "*All specimens were annealed at 120°C for 16h." under
// its mechanical table. Its Vicat (V001929) and mechanical rows already carry 120 °C, 16 h. Read with the sheet's one
// recipe, V001932 (87.3 °C at 1.8 MPa) and V001933 (133.7 °C at 0.45 MPa) are annealed at 120 °C for 16 h; left
// unstated, the product's annealed stiffness and heat deflection could never be one part, which is not what the sheet
// says. The raw Post-processing keeps the row's own words; the typed schedule and its Parse review say it is this
// reading. It is a reading, made by an AI agent (claude-opus-5.5): ACCEPTANCE.md asks a person to confirm it.
//
// Each statement is checked on the cached text of the document whose bytes hash to the SHA-256 in sources.csv. A re-run
// is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m215-pet-gf15-annealed-on-its-own-recipe.mjs

import { readFileSync } from 'node:fs';
import { openTables } from '../data/table-io.mjs';
import { sha256 } from '../lib/pdf-text.mjs';
import { documentPath } from '../ingest/extract.mjs';
import { pageReader } from './printed-on.mjs';
import { withNote } from './source-edits.mjs';

const migration = 'm215-pet-gf15-annealed-on-its-own-recipe';
const SOURCE = 'R-FIBERON-PETGF15-TDS';
const NP = 'Not published';
const STATEMENTS = ['Annealing temp. and time 120°C/16H', '*All specimens were annealed at 120°C for 16h.', 'ISO 75 1.8MPa 87.3°C (annealed)', 'ISO 75 0.45MPa 133.7°C (annealed)'];
const ROWS = ['V001932', 'V001933'];
const REVIEW = 'Anneal °C and Anneal h are the one annealing schedule this page states for the product ("Annealing temp. and time '
  + '120°C/16H" in its print settings; "*All specimens were annealed at 120°C for 16h." under its mechanical table); the row itself '
  + 'prints only "(annealed)". A reading of the sheet, recorded as one (m215, 2026-09-28, claude-opus-5.5, agent reviewer; the '
  + 'review of 2026-09-27, S03), for a person to confirm (docs/audits/2026-09-27-v2.1-review/ACCEPTANCE.md).';

const t = openTables();
const source = t.get('sources', SOURCE);
const path = documentPath(source.SHA256, SOURCE);
if (!path || sha256(readFileSync(path)) !== source.SHA256) throw new Error(`${migration}: the cached ${SOURCE} does not hash to ${source.SHA256}`);
const printed = pageReader(t, migration);
for (const statement of STATEMENTS) if (!printed(SOURCE, 1, statement)) throw new Error(`${migration}: "${statement}" is not printed on p. 1 of ${SOURCE}`);
// The sheet's mechanical rows already carry the schedule: the reading joins the HDT rows to the one the sheet states.
const stated = t.rows('measurements').filter((m) => m.GradeID === 'G068-02' && m.SourceID === SOURCE && m['Post-processing state'] === 'annealed' && m['Anneal °C'] !== NP);
if (!stated.length || stated.some((m) => m['Anneal °C'] !== '120' || m['Anneal h'] !== '16')) throw new Error(`${migration}: the sheet's other annealed rows no longer read 120 °C, 16 h`);

let n = 0;
for (const id of ROWS) {
  const row = t.get('measurements', id);
  if (row.SourceID !== SOURCE || row.Property !== 'HDT' || row['Post-processing state'] !== 'annealed') throw new Error(`${migration}: ${id} is not an annealed HDT of ${SOURCE}`);
  if (row['Anneal °C'] === '120' && row['Anneal h'] === '16') continue;
  t.set('measurements', id, 'Anneal °C', '120', { expect: NP });
  t.set('measurements', id, 'Anneal h', '16', { expect: NP });
  t.set('measurements', id, 'Parse review', REVIEW, { expect: 'Not applicable' });
  t.set('measurements', id, 'Notes', withNote(row.Notes, `Corrected 2026-09-28 (${migration}) against the source: annealed on the one schedule the sheet states for the product, 120 °C for 16 h (see Parse review).`), { expect: row.Notes });
  n++;
}
if (n) t.save();
console.log(`${migration}: ${n} measurement(s) given the sheet's schedule`);
