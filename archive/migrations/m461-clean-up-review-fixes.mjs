#!/usr/bin/env node
// Migration m461 (2026-10-19): what the clean-up round's review found in m459 and m460
// (docs/audits/2026-10-19-clean-up/README.md, "Review").
//
// - F5: Extrudr's DuraPro PA6 CF answer (Q05739) is mostly a limitation (it absorbs moisture; it does not insulate):
//   back under Pitfalls and limitations, where m459 had taken it from.
// - F6: four "Drybox recommended No" cells (3DJake's Prografen sheets, Spectrum PLA Nature) m459's pattern missed,
//   written "Drybox recommended: No" as the others.
// - F7: the manufacturers vocabulary keeps one Fabru row: "Fabru / purefil" is an alias of Fabru now that no product
//   is spelt so (m459), so a later purefil import cannot bring the second spelling back.
// - F9: Stratasys PC's two Table 9 elongations (m460) carry the layer height the table prints, as Table 8's rows do;
//   the 30 Flashforge profiles m459 gave their recommended nozzle row name the page of it in their Locator.
// Each edit names the value it replaces; a re-run is a no-op.
//
//   node scripts/migrate/m461-clean-up-review-fixes.mjs [--dry-run]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openTables, projectRoot } from '../../scripts/data/table-io.mjs';
import { onCachedSheet } from '../../scripts/lib/read-proposals-apply.mjs';

const MIGRATION = 'm461';
const t = openTables();
const counts = { topic: 0, fragments: 0, layer: 0, locators: 0, vocab: 0 };
const set = (table, id, column, value) => { const r = t.get(table, id); if (r[column] === value) return false; t.set(table, id, column, value, { expect: r[column], migration: MIGRATION }); return true; };

if (set('evidence', 'Q05739', 'Topic', 'Pitfalls and limitations')) counts.topic++;
for (const e of t.rows('evidence')) {
  const m = /^(Drybox recommended)\s+(No|Yes)$/.exec(e.Finding);
  if (m && set('evidence', e.EvidenceID, 'Finding', `${m[1]}: ${m[2]}`)) counts.fragments++;
}

onCachedSheet(t, 'R-STRATASYS-mds-fdm-pc-0426a', '0.25 mm (0.010 in.) Layer Height', MIGRATION);
for (const id of ['V015652', 'V015653']) {
  if (set('measurements', id, 'Specimen / print parameters', 'Table 9: Mechanical Properties of PC Red, Fortus 450mc, T16 · 0.25 mm (0.010 in.) Layer Height')) counts.layer++;
}

// The page each Flashforge sheet prints its recommended nozzle row on.
const SUFFIX = '; Nozzle Diameter (recommended printing settings)';
for (const p of t.rows('profiles')) {
  if (!p.Locator.endsWith(SUFFIX)) continue;
  const sha = t.get('sources', p.SourceID)?.SHA256;
  const text = JSON.parse(readFileSync(join(projectRoot, '.cache/text', `${sha}.json`), 'utf8'));
  const page = text.pages.find((pg) => pg.lines.some((l) => l.text.includes(p['Nozzle diameter'])))?.page;
  if (!page) throw new Error(`${MIGRATION}: ${p.ProfileID}'s nozzle row "${p['Nozzle diameter']}" is on no page of ${p.SourceID}`);
  if (set('profiles', p.ProfileID, 'Locator', `${p.Locator.slice(0, -SUFFIX.length)}; p. ${page}: Nozzle Diameter (recommended printing settings)`)) counts.locators++;
}

if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ migration: MIGRATION, ...counts, written: false })); process.exit(0); }

const vocab = join(projectRoot, 'schema/vocab/manufacturers.csv');
const lines = readFileSync(vocab, 'utf8').split('\n');
if (lines.some((l) => l.startsWith('Fabru / purefil,'))) {
  if (t.rows('grades').some((g) => g.Manufacturer === 'Fabru / purefil')) throw new Error(`${MIGRATION}: a product is still spelt "Fabru / purefil"`);
  const out = lines.filter((l) => !l.startsWith('Fabru / purefil,')).map((l) => (l.startsWith('Fabru,') ? 'Fabru,"Fabru AG, Swiss maker, whose filament brand is purefil; it sells as purefil and as Fabru.",Fabru / purefil;purefil;Purefil;fabru;purefil GmbH' : l));
  writeFileSync(vocab, out.join('\n'));
  counts.vocab++;
}
t.save();
console.log(JSON.stringify({ migration: MIGRATION, ...counts }));
