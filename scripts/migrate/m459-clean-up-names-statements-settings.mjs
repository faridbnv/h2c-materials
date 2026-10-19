#!/usr/bin/env node
// Migration m459 (2026-10-19): the data clean-up of OPEN-PROBLEMS' priority 5 that decides little and is fixable from the
// records and their cached pages alone (the clean-up round, docs/audits/2026-10-19-clean-up/).
//
// - Makers spelt one way (§36.1): the 21 products spelt "Fabru / purefil" are Fabru's, as the other 14 and every
//   source's publisher are (m428), so PLA and COC count Fabru once; Zytel 101L's maker is Celanese, whose sheet it is (a
//   new value of the manufacturers vocabulary). Publishers left by m428: MakerBot's two sheets are UltiMaker's
//   (manufacturers.csv lists MakerBot among UltiMaker's names), Airtech's three Kimya documents Kimya's, and the
//   distributor Trinity3DS keeps its own name, the "quoting 3DXTECH" moved to its Source note. Each material's stored
//   Grades coverage row is recounted (recountGrades).
// - Two article titles carry PubMed Central's page furniture, " - PMC Lock" (§37.19).
// - POM / Acetal's filler (§37.8): its products are plain acetal (Grupa Azoty's polyacetal copolymer, Yousu's POM,
//   purefil's POM), so "Unfilled / unspecified", not "Commercial variant / undisclosed".
// - Makers' statements (§37.6): a table's cell quoted as a sentence ("Dry box recommended No", 48 rows of Spectrum's and
//   3DJake's sheets) is written "label: answer", so it no longer reads as the opposite of what it says; nine benefits
//   filed under Pitfalls and limitations (Bambu Lab PPA-CF and PET-CF, Fiberlogy CPE ANTIBAC, five Extrudr DuraPro and
//   XPETG answers) move to Benefits; SUNLU PCL's two Chinese paragraphs that repeat four rows sentence by sentence are
//   retired duplicates.
// - Flashforge's nozzle sizes (§12): 30 profiles that held "0.4mm", or nothing, where their sheet prints the recommended
//   row "Nozzle Diameter φ0.4/0.6mm (φ0.4mm recommended)" holds that row.
// - PC-Max's moisture (§29a): its sheet prints "≤ 0.1%"; the operators vocabulary takes "<=" and ">=" (the engine read
//   both already, values.js), and the row reads as an inclusive bound.
// - Two notched Charpy rows that cite ASTM D882 or ISO 527 (§18): their sheets print that standard on every mechanical
//   row, the Charpy one included; a slip of the sheet's template, recorded as printed and said in Notes.
// Each edit names the value it replaces and every quoted line is checked on its cached page; a re-run is a no-op.
//
//   node scripts/migrate/m459-clean-up-names-statements-settings.mjs [--dry-run]
import { openTables, projectRoot } from '../data/table-io.mjs';
import { onCachedSheet } from '../lib/read-proposals-apply.mjs';
import { retype } from '../lib/profile-settings.mjs';
import { withNote, settleFindings } from '../lib/source-edits.mjs';
import { recountGrades } from '../data/records.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATION = 'm459';
const DATE = '2026-10-19';
const t = openTables();
const counts = { makers: 0, publishers: 0, titles: 0, modifier: 0, fragments: 0, topics: 0, retired: 0, nozzles: 0, operator: 0, charpy: 0, recounted: 0 };
const set = (table, id, column, value) => { const r = t.get(table, id); if (r[column] === value) return false; t.set(table, id, column, value, { expect: r[column], migration: MIGRATION }); return true; };

// Vocabulary: Celanese as a maker, and the inclusive operators.
function addVocab(file, row, key) {
  const path = join(projectRoot, 'schema/vocab', file);
  const text = readFileSync(path, 'utf8');
  if (text.split('\n').some((l) => l.startsWith(`${key},`) || l.startsWith(`"${key}",`))) return;
  writeFileSync(path, `${text.replace(/\n?$/, '\n')}${row}\n`);
}
const VOCAB = [
  ['manufacturers.csv', 'Celanese,"Resin supplier; makes Zytel and Delrin since it acquired DuPont\'s Mobility & Materials business. A grade sheet it publishes alone is its.",Celanese Corporation', 'Celanese'],
  ['operators.csv', '<=,The source states at most the value (≤): an inclusive upper bound.', '<='],
  ['operators.csv', '>=,The source states at least the value (≥): an inclusive lower bound.', '>='],
];

// Makers.
const touched = new Set();
for (const g of t.rows('grades')) {
  if (g.Manufacturer === 'Fabru / purefil' && set('grades', g.GradeID, 'Manufacturer', 'Fabru')) { counts.makers++; touched.add(g.MaterialID); }
}
onCachedSheet(t, 'R-CELANESE-ZYTEL-101L', 'Celanese', MIGRATION);
if (set('grades', 'G055-R1', 'Manufacturer', 'Celanese')) counts.makers++;

// Publishers.
for (const [id, publisher] of [['R-ULTIMAKER-MAKERBOT-Tough-One-Sheet', 'UltiMaker'], ['R-ULTIMAKER-MAKERBOT-MakerBot-Precision-ASA-3-092020', 'UltiMaker'],
  ['R-AIRTECH-KIMYA-PORTFOLIO', 'Kimya'], ['R-KIMYA-PEBA-S-TDS', 'Kimya'], ['R-AIRTECH-KIMYA-ACQUISITION', 'Kimya']]) {
  if (set('sources', id, 'Publisher', publisher)) counts.publishers++;
}
{
  const s = t.get('sources', 'R-TRINITY3DS-HYPERLITE-PP');
  if (s.Publisher !== 'Trinity3DS') {
    set('sources', s.SourceID, 'Source note', withNote(s['Source note'], `Trinity3DS is an authorized 3DXTECH distributor, and the page quotes 3DXTECH's description (${MIGRATION}).`));
    set('sources', s.SourceID, 'Publisher', 'Trinity3DS');
    counts.publishers++;
  }
}

// Titles.
for (const id of ['P-FATIGUE', 'P-CHEM']) {
  const s = t.get('sources', id);
  if (s.Title.endsWith(' - PMC Lock') && set('sources', id, 'Title', s.Title.replace(/ - PMC Lock$/, ''))) counts.titles++;
}

// POM's filler.
if (set('materials', 'M087', 'Modifier / filler', 'Unfilled / unspecified')) counts.modifier++;
touched.add('M087');

// Statements: a table's cell quoted as a sentence.
const CELL = /^(Dry box recommended|Ruby or hardened nozzle recommended)\s+(No|Yes|if wet)$/;
for (const e of t.rows('evidence')) {
  const m = CELL.exec(e.Finding);
  if (m && set('evidence', e.EvidenceID, 'Finding', `${m[1]}: ${m[2]}`)) counts.fragments++;
}
// Benefits filed as pitfalls.
for (const id of ['Q05681', 'Q05682', 'Q05687', 'Q05694', 'Q05720', 'Q05726', 'Q05729', 'Q05735', 'Q05739']) {
  const e = t.get('evidence', id);
  if (e.Topic !== 'Pitfalls and limitations' && e.Topic !== 'Benefits') throw new Error(`${MIGRATION}: ${id} is filed under ${e.Topic}`);
  if (set('evidence', id, 'Topic', 'Benefits')) counts.topics++;
}
// SUNLU PCL's Chinese paragraphs that repeat four sentence rows.
for (const [id, twins] of [['Q05426', 'Q07919 and Q07920'], ['Q05427', 'Q07922 and Q07923']]) {
  const e = t.get('evidence', id);
  const parts = twins.split(' and ').map((x) => t.get('evidence', x).Finding);
  if (!parts.every((p) => e.Finding.includes(p))) throw new Error(`${MIGRATION}: ${id} does not hold ${twins}`);
  if (e['Evidence type'] === 'Retired duplicate record') continue;
  set('evidence', id, 'Exposure / conditions', withNote(e['Exposure / conditions'] === 'Not applicable' ? '' : e['Exposure / conditions'], `Retired duplicate of ${twins}, which hold its sentences one by one (${MIGRATION}).`).trim());
  set('evidence', id, 'Evidence type', 'Retired duplicate record');
  counts.retired++;
}

// Flashforge's recommended nozzle sizes.
const RECOMMENDED = /^Nozzle Diameter:?\s*(φ0\.\d\/0\.\dmm(?:\s*\((?:φ|Recommended φ)?0\.\dmm(?: recommended)?\))?)$/;
const grades = new Map(t.rows('grades').map((g) => [g.GradeID, g]));
const textCache = (sha) => { try { return JSON.parse(readFileSync(join(projectRoot, '.cache/text', `${sha}.json`), 'utf8')); } catch { return null; } };
for (const p of t.rows('profiles')) {
  if (grades.get(p.GradeID)?.Manufacturer !== 'Flashforge' || p.Profile === 'Retired duplicate record') continue;
  if (!/^(0\.\dmm|Not published)$/.test(p['Nozzle diameter'])) continue;
  const text = textCache(t.get('sources', p.SourceID)?.SHA256);
  const rows = [...new Set((text?.pages ?? []).flatMap((pg) => pg.lines.map((l) => l.text.trim())).map((l) => RECOMMENDED.exec(l)?.[1]).filter(Boolean))];
  if (rows.length !== 1) continue;
  onCachedSheet(t, p.SourceID, rows[0], MIGRATION);
  set('profiles', p.ProfileID, 'Nozzle diameter', rows[0]);
  retype(t, p.ProfileID, ['Nozzle diameter'], MIGRATION);
  const loc = t.get('profiles', p.ProfileID).Locator;
  if (!/Nozzle Diameter/i.test(loc)) set('profiles', p.ProfileID, 'Locator', `${loc}; Nozzle Diameter (recommended printing settings)`);
  counts.nozzles++;
}

// PC-Max's inclusive bound.
onCachedSheet(t, 'S-POLYCN-Polymaker-PC-Max-TDS-v1-0', 'Moisture content (%) Thermogravimetric ≤ 0.1%', MIGRATION);
{
  const m = t.get('measurements', 'V003896');
  if (m.Operator !== '<=') {
    set('measurements', 'V003896', 'Operator', '<=');
    set('measurements', 'V003896', 'Raw value', '≤ 0.1%');
    set('measurements', 'V003896', 'Notes', withNote(m.Notes, `The sheet's "≤ 0.1%" is an inclusive bound since the operators vocabulary took "<=" (${MIGRATION}).`));
    counts.operator++;
  }
}

// The two notched Charpy rows that cite a tensile or film standard.
for (const [id, source, quote] of [['V002945', 'S-SPECTRUM-eng-tds-the-filament-pla-hs', 'Charpy notched impact strength, 23°C 5 kJ/m2 D 882'],
  ['V003101', 'S-SPECTRUM-en-tds-spectrum-pla-crystal', 'Charpy notched impact strength, 23°C 5 kJ/m2 ISO 527 (1)']]) {
  onCachedSheet(t, source, quote, MIGRATION);
  const m = t.get('measurements', id);
  const note = `Re-read ${DATE} (${MIGRATION}): the sheet prints this standard on every row of its mechanical table, the Charpy one included; a slip of the sheet's template, recorded as printed.`;
  if (!m.Notes.includes(`(${MIGRATION})`) && set('measurements', id, 'Notes', withNote(m.Notes, note))) counts.charpy++;
}

for (const materialId of new Set([...touched, ...t.rows('grades').filter((g) => g.Manufacturer === 'Fabru').map((g) => g.MaterialID)])) {
  if (recountGrades(t, materialId, { migration: MIGRATION, date: DATE, because: 'after Fabru\'s two spellings became one' })) counts.recounted++;
}

// POM's plausibility window is an unfilled acetal's now, which its density no longer leaves: the acceptance is stale.
const settled = settleFindings(t, { date: DATE, drop: [{ Code: 'MEAS-PHYSICS-WINDOW', Table: 'measurements', Record: 'V005602', Field: 'Normalized value' }] });
if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ migration: MIGRATION, ...counts, written: false })); process.exit(0); }
for (const [file, row, key] of VOCAB) addVocab(file, row, key);
t.save();
console.log(JSON.stringify({ migration: MIGRATION, ...counts, settled }));
