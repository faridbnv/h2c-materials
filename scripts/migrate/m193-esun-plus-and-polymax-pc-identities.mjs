#!/usr/bin/env node
// Migration m193 (2026-09-27): three product identities the sheets settle (OPEN-PROBLEMS §16 and §17; phase 6, final
// round).
//
// 1. eSUN's PLA+ sat on two grades. G001-142, named "PLA" by the import, holds the Nov. 2021 "Version 4.0" sheet; G001-78
//    holds the Feb. 2026 "Version1.0" sheet. Both head their first page "PLA+", list the same applications (prototyping,
//    decoration, cosplay, other mechanical parts), recommend the same nozzle (210-230 °C) and bed (45-60 °C) windows, and
//    print the same slicing advice word for word ("When slicing, it is best to turn on the Z seam alignment and starting
//    point alignment functions"). The numbering restarts because eSUN's 2024 template restarts every sheet at Version
//    1.0: its ABS+ sheets did the same (Nov. 2021 Version 4.0, Dec. 2025 Version 1.0), and both were already one grade,
//    G027-22. The descriptions differ in wording, and the 2021 values were read on injection-moulded splines where the
//    2026 ones are printed samples: a new test, not a new product. One product: G001-142 retires in favour of G001-78,
//    and its records move there with their IDs, as m174 did. (It had been filed as a twin of eSUN PLA+CMYK, G001-74,
//    through a shared formulation key, and so read that product's values.)
// 2. eSUN's G027-22 is named "ABS", and both its sheets head their first page "ABS+": it is ABS+.
// 3. Polymaker's PolyMax PC sat on two grades, one per revision: the Nov. 2018 Technical Data Sheet Version 4.1 (G035-07)
//    and the V5.5 sheet of 2026 (G035-06). Both print "PolyMax™ PC" and the same description word for word ("PolyMax™ PC
//    is an engineered PC filament combining excellent strength, toughness, heat resistance and printing quality"), and
//    V5.5 continues 4.1's numbering: m174's case exactly. G035-07 retires in favour of G035-06, whose name drops the maker's
//    name the import put before the product's ("Polymaker PolyMax PC" is "PolyMax PC").
//
// The four eSUN sheets also get the title, revision and date they print (the two 2021 sheets were titled only
// "Technical Data Sheet").
//
// Left: the four Buddy3D product cards (G001-108, G020-46, G027-33, G030-08) name no maker on any cached page; re-read
// 2026-09-27.
//
// The reviewer is an agent, claude-opus-5.5 (agent reviewer), reading both sheets of each pair on their cached pages; no
// person has reviewed them. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m193-esun-plus-and-polymax-pc-identities.mjs

import { openTables } from '../data/table-io.mjs';
import { pageReader } from './printed-on.mjs';

const migration = 'm193-esun-plus-and-polymax-pc-identities';
const date = '2026-09-27';
const t = openTables();
const printed = pageReader(t, migration);

let changed = 0;
const tally = {};
const count = (k, n = 1) => { tally[k] = (tally[k] ?? 0) + n; changed += n; };
const note = (before, text) => (before.includes(text) ? before : `${before} ${text}`);
const must = (sourceId, page, words) => { if (!printed(sourceId, page, words)) throw new Error(`${migration}: "${words}" is not printed on p. ${page} of ${sourceId}`); };

/** Every record on grade `from` moves to grade `to`, IDs kept, and a source that named `from` names `to` (m174). */
function moveRecords(from, to) {
  const a = t.get('grades', from), b = t.get('grades', to);
  if (a.MaterialID !== b.MaterialID) throw new Error(`${migration}: ${from} and ${to} are different materials`);
  let n = 0;
  for (const table of ['measurements', 'profiles', 'evidence', 'prices']) {
    const pk = t.schemas[table].primaryKey;
    for (const r of t.rows(table).filter((x) => x.GradeID === from)) {
      t.set(table, r[pk], 'GradeID', to, { expect: from });
      n++;
    }
  }
  for (const s of t.rows('sources').filter((x) => String(x['Applicable grades'] ?? '').split(/;\s*/).includes(from))) {
    const list = s['Applicable grades'].split(/;\s*/).map((g) => (g === from ? to : g));
    t.set('sources', s.SourceID, 'Applicable grades', [...new Set(list)].join('; '), { expect: s['Applicable grades'] });
  }
  return n;
}
function retire(old, keep, why) {
  const moved = moveRecords(old, keep);
  if (moved) count('records moved to the kept grade', moved);
  const g = t.get('grades', old);
  if (g.Status !== 'retired') {
    t.set('grades', old, 'Status', 'retired', { expect: 'active' });
    t.set('grades', old, 'Selected-grade rationale', `Retired ${date} (${migration}) in favour of ${keep}, the same product's newer sheet, and its records moved there: ${why}.`, { expect: g['Selected-grade rationale'] });
    count('grade retired');
  }
}
function rename(gradeId, from, to, sheet, page, words) {
  const g = t.get('grades', gradeId);
  if (g['Product name'] === to) return;
  must(sheet, page, words);
  t.set('grades', gradeId, 'Product name', to, { expect: from });
  t.set('grades', gradeId, 'Selected-grade rationale', note(g['Selected-grade rationale'], `Named "${to}" since ${date} (${migration}): its sheet heads p. ${page} "${words}".`), { expect: g['Selected-grade rationale'] });
  count('product name');
}
/** A source's title, revision and date as the sheet prints them, each only where the cell holds what it replaces. */
function sheetHead(sourceId, set) {
  const s = t.get('sources', sourceId);
  for (const [field, [from, to]] of Object.entries(set)) {
    if (s[field] === to) continue;
    if (s[field] !== from) throw new Error(`${migration}: ${sourceId} ${field} is "${s[field]}", expected "${from}"`);
    t.set('sources', sourceId, field, to, { expect: from });
    count(`source ${field.toLowerCase()}`);
  }
}

// -------------------------------------------------------------------------------------------------- 1. eSUN PLA+
const PLA_2021 = 'S-PEBA-eSUN-PLA-Filament-TDS-V4-0';
const PLA_2026 = 'S-PEBA-PLA-TDS-en';
must(PLA_2021, 1, 'Nov.2021 Version 4.0 PLA+ Technical Data Sheet');
must(PLA_2026, 1, 'Feb.2026 Version1.0 PLA+ Technical Data Sheet');
must(PLA_2021, 1, 'Applications • Prototyping • Decoration • COSPLAY • Other mechanical parts');
must(PLA_2026, 1, '• Prototyping • Decoration Applications • Cosplay • Other mechanical parts');
must(PLA_2021, 2, 'Extruder Temperature 210- 230℃ Build Platform Temperature 45-60°C');
must(PLA_2026, 2, 'Nozzle Temperature 210-230℃');
must(PLA_2026, 2, 'Build Platform Temperature 45~60℃');
for (const [s, p] of [[PLA_2021, 2], [PLA_2026, 2]]) must(s, p, 'When slicing, it is best to turn on the Z seam alignment and starting point alignment functions');
// The same restart on eSUN's ABS+ pair, which is already one grade.
must('S-PEBA-eSUN-ABS-Filament-TDS-V4-0', 1, 'Nov.2021 Version 4.0 ABS+ Technical Data Sheet');
must('S-PEBA-ABS-TDS-EN-docx', 1, 'DEC.2025 Version 1.0 Technical Data Sheet ABS+');
if (t.get('grades', 'G001-142').SourceID !== PLA_2021 || t.get('grades', 'G001-78').SourceID !== PLA_2026) throw new Error(`${migration}: the eSUN PLA+ grades cite other sheets`);
retire('G001-142', 'G001-78', 'eSUN PLA+: the Nov. 2021 Version 4.0 sheet and the Feb. 2026 Version 1.0 sheet both head their first page "PLA+", list the same applications, recommend the same nozzle and bed windows and print the same slicing advice; eSUN\'s 2024 template restarts every sheet at Version 1.0, as its ABS+ pair (G027-22) shows');
sheetHead(PLA_2021, { Title: ['Technical Data Sheet', 'PLA+ Technical Data Sheet'], Revision: ['Not published', 'Version 4.0'], 'Publication date': ['Not published', '2021-11'] });
sheetHead(PLA_2026, { Revision: ['Not published', 'Version 1.0'], 'Publication date': ['Not published', '2026-02'] });

// -------------------------------------------------------------------------------------------------- 2. eSUN ABS+
rename('G027-22', 'ABS', 'ABS+', 'S-PEBA-eSUN-ABS-Filament-TDS-V4-0', 1, 'Version 4.0 ABS+ Technical Data Sheet');
must('S-PEBA-ABS-TDS-EN-docx', 1, 'Technical Data Sheet ABS+');
sheetHead('S-PEBA-eSUN-ABS-Filament-TDS-V4-0', { Title: ['Technical Data Sheet', 'ABS+ Technical Data Sheet'], Revision: ['Not published', 'Version 4.0'], 'Publication date': ['Not published', '2021-11'] });
sheetHead('S-PEBA-ABS-TDS-EN-docx', { Revision: ['Not published', 'Version 1.0'], 'Publication date': ['Not published', '2025-12'] });

// ---------------------------------------------------------------------------------------------- 3. PolyMax PC
const PC_2018 = 'S-POLYCN-index-php-controller-attachment-id-attachment-167';
const PC_V55 = 'S-POLYCN-TDS-Polymaker-PolyMax-PC-V5-5-2026-01-05-EN';
must(PC_2018, 1, 'Nov. 2018 Technical Data Sheet Version 4.1 PolyMax™ PC');
must(PC_V55, 1, 'V5.5 PolyMax™ PC');
for (const s of [PC_2018, PC_V55]) must(s, 1, 'PolyMax™ PC is an engineered PC filament combining excellent strength, toughness, heat resistance and printing quality');
if (t.get('grades', 'G035-07').SourceID !== PC_2018 || t.get('grades', 'G035-06').SourceID !== PC_V55) throw new Error(`${migration}: the PolyMax PC grades cite other sheets`);
rename('G035-06', 'Polymaker PolyMax PC', 'PolyMax PC', PC_V55, 1, 'PolyMax™ PC');
retire('G035-07', 'G035-06', 'PolyMax PC: the Nov. 2018 Version 4.1 sheet and the V5.5 sheet print the same product and description word for word, and V5.5 continues the numbering');

if (changed) t.save();
for (const [k, v] of Object.entries(tally)) console.log(`  ${v}\t${k}`);
console.log(`${migration}: ${changed} change(s)`);
