#!/usr/bin/env node
// Check round 3's frozen targets (2026-10-05): the records the tool's answers rest on, not every record.
//
// - value: a measurement that is a product's value for a headline, in any state (dist/db.json grades[].states[].values
//   and grades[].headline), whether its own or read from a twin. Typical says it is also its material's typical value,
//   the number a material row shows.
// - gate: the profile cell that sets a product's print gate (nozzle, bed, chamber, drying: the profileId the build
//   cites; enclosure and hardened nozzle: the product's own profiles that state one), or the printer guide's row that
//   answers it (Kind guide).
// Each target carries its source and the sheet's type: multi-product (the source holds values of two products or
// more), x-y-z (one product, values in two directions or more) or single-table. Read-only: dist/db.json and the tables;
// writes TARGETS.csv beside this file, and copies of build/snapshot's templates, print and products into baseline/.
//
//   node docs/audits/2026-10-05-check-round-3/targets.mjs
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv, csvText } from '../../../build/src/csv.js';
import { writeFrozen } from '../../../scripts/lib/frozen.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');
const rows = (p) => readCsv(join(root, p)).records.map((r) => r.values);
const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
const measurements = new Map(rows('data/tables/measurements.csv').map((m) => [m.MeasurementID, m]));
const profiles = new Map(rows('data/tables/profiles.csv').map((p) => [p.ProfileID, p]));
const guides = new Map(rows('data/tables/print_guide.csv').map((g) => [g.PrintGuideID, g]));

// A sheet's type, from the measurements it holds.
const bySource = new Map();
for (const m of measurements.values()) {
  if (m['Data status'].startsWith('Retired')) continue;
  const s = bySource.get(m.SourceID) ?? bySource.set(m.SourceID, { grades: new Set(), directions: new Set() }).get(m.SourceID);
  s.grades.add(m.GradeID);
  if (!['Not stated', 'Not applicable', 'Not published', ''].includes(m.Direction)) s.directions.add(m.Direction);
}
const sheetType = (sid) => {
  const s = bySource.get(sid);
  if (!s) return 'no-measurements';
  return s.grades.size > 1 ? 'multi-product' : s.directions.size > 1 ? 'x-y-z' : 'single-table';
};

const typical = new Set();
for (const mat of db.materials) for (const h of Object.values(mat.headline ?? {})) if (h?.typical?.measurementId) typical.add(h.typical.measurementId);

const targets = new Map();
const add = (key, t) => { if (!targets.has(key)) targets.set(key, t); };
for (const g of db.grades) {
  if (g.retired) continue;
  const values = [...Object.entries(g.headline ?? {}), ...(g.states ?? []).flatMap((s) => Object.entries(s.values ?? {}))];
  for (const [field, v] of values) {
    if (!v?.measurementId) continue;
    const m = measurements.get(v.measurementId);
    add(`value:${v.measurementId}`, { Kind: 'value', Record: v.measurementId, Field: m.Property, GradeID: m.GradeID, MaterialID: m.MaterialID,
      SourceID: m.SourceID, Locator: m.Locator, Value: m['Raw value'], Typical: typical.has(v.measurementId) ? 'yes' : 'no', DecidesFor: g.id === m.GradeID ? 'own' : `twin ${g.id}` });
  }
  const p = g.print ?? {};
  const cell = (axis, column, id) => {
    const r = profiles.get(id);
    add(`gate:${id}:${axis}`, { Kind: 'gate', Record: id, Field: column, GradeID: r.GradeID, MaterialID: r.MaterialID, SourceID: r.SourceID, Locator: r.Locator, Value: r[column], Typical: '', DecidesFor: g.id === r.GradeID ? 'own' : `twin ${g.id}` });
  };
  const guide = (axis, column, id) => {
    const r = guides.get(id);
    add(`guide:${id}:${axis}`, { Kind: 'guide', Record: id, Field: column, GradeID: '', MaterialID: '', SourceID: r.SourceID, Locator: r.Locator, Value: r[column], Typical: '', DecidesFor: 'guide' });
  };
  for (const [axis, column] of [['nozzle', 'Nozzle °C'], ['bed', 'Bed °C'], ['chamber', 'Chamber °C'], ['drying', 'Drying']]) {
    const from = p.from?.[axis];
    if (from?.origin === 'guide') guide(axis, column, from.guideId);
    else if (p[axis]?.profileId) cell(axis, column, p[axis].profileId);
  }
  for (const [axis, columns] of [['enclosure', ['Enclosure']], ['hardenedNozzle', ['Abrasion / clogging', 'Nozzle material']]]) {
    if (p[axis] == null) continue;
    const from = p.from?.[axis];
    if (from?.origin === 'guide') { guide(axis, axis === 'enclosure' ? 'Enclosure' : 'Hardened nozzle', from.guideId); continue; }
    const owner = from?.origin === 'twin' ? from.gradeId : g.id;
    const own = db.grades.find((x) => x.id === owner)?.print?.profileIds ?? [];
    for (const id of own) for (const c of columns) if (profiles.get(id)[c] !== 'Not published') cell(axis, c, id);
  }
}

const list = [...targets.values()].sort((a, b) => a.Kind.localeCompare(b.Kind) || a.SourceID.localeCompare(b.SourceID) || a.Record.localeCompare(b.Record));
const out = list.map((t, i) => ({ TargetID: `K${String(i + 1).padStart(5, '0')}`, ...t, SheetType: sheetType(t.SourceID) }));
writeFrozen(join(here, 'TARGETS.csv'), csvText(Object.keys(out[0]), out));
mkdirSync(join(here, 'baseline'), { recursive: true });
for (const f of ['templates.csv', 'print.csv', 'products.csv']) writeFrozen(join(here, 'baseline', f), readFileSync(join(root, 'build/snapshot', f), 'utf8'));
const count = (k) => out.filter((t) => t.Kind === k).length;
console.log(`${out.length} targets: ${count('value')} values (${out.filter((t) => t.Typical === 'yes').length} typical), ${count('gate')} gate cells, ${count('guide')} guide cells; ${new Set(out.map((t) => t.SourceID)).size} sources`);
