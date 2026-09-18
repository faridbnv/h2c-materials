#!/usr/bin/env node
// Which "specimen not stated" measurements would actually change the build if a re-read found the sheet states a
// printed specimen - and which are already settled and must not be re-litigated.
//
// 85 of 103 materials carry a coverage row "At least one observation lacks specimen or conditioning information; no
// family aggregation performed." That row is hand-written workbook prose: no build check reads it, and repairing the
// records will not change it. What a repair does change is one thing only. An implied lower bound comes only from a
// printed specimen (D55, build/src/compile.js impliedBounds, `specimenForm === 'printed'`), and a bound vetoes a
// screen and lifts an estimate's floor. Everything else specimen form touches - headline eligibility
// (`isPartSpecimen`), the estimate pool, back-test membership - already admits an unstated specimen.
//
// So this ledger lists the rows that pass every other implied-bound filter and fail only on specimen form, and it
// marks the sources whose specimen wording has already been ruled on, so a repair pass does not redo or reverse them.
//
//   node docs/audits/2026-09-17-data-gaps/ledgers/comparability-targets.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvText, parseCsvText } from '../../../../build/src/csv.js';
import { loadTables, snapshotDate } from '../../../../build/src/load.js';
import { buildDatabase } from '../../../../build/src/pipeline.js';
import { moistureState } from '../../../../build/src/normalize/moisture.js';
import { annealedBesideAsPrinted } from '../../../../build/src/normalize/specimen.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../..');
const read = (p, label) => parseCsvText(readFileSync(p, 'utf8'), label).records.map((r) => r.values);

const wb = loadTables(join(root, 'data'));
const { db, issues } = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'ledger' });
if (issues.some((i) => i.level === 'error')) { console.error('build errors; fix them first'); process.exit(1); }

// Already ruled on, and why. A repair pass that touches these reverses a decision instead of adding evidence.
const RULED = new Map();
for (const r of read(join(root, 'docs/audits/2026-09-15-filtering-estimates-data/sources/rereads.csv'), 'rereads.csv'))
  RULED.set(r.SourceID, 're-read 2026-09-15 (rereads.csv)');
for (const s of ['S-PPA-TDS', 'D-IPCON-PPA', 'S-PPSGF-TDS-0', 'B-abs-gf-TDS', 'B-pa6-gf-TDS', 'B-pc-fr-TDS',
  'B-pet-cf-TDS', 'B-pla-sparkle-TDS', 'B-pla-tough-upgrade-TDS', 'B-pla-translucent-TDS', 'B-tpu-for-ams-TDS',
  'B-petg-hf-TDS', 'B-pla-aero-TDS', 'B-pla-galaxy-TDS', 'B-pla-silk-dual-color-TDS', 'B-pla-silk-upgrade-TDS',
  'B-pps-cf-TDS']) RULED.set(s, 'corrected by m20 (Bambu and IPCON printed specimens and annealing sentences)');
for (const s of ['I-PLA-TDS', 'I-PETG-TDS', 'I-CF-ABS-TDS', 'I-TPU-TDS'])
  RULED.set(s, 'm33/D63: the sheet publishes no specimen preparation for its values; its Print Recommendation table is a printing guide');
RULED.set('R-KIMYA-PEBA-S-TDS', 'owner ruling D-07: ISO 37 die-cut dumbbells; direction and specimen stay unstated');
// m41 (2026-09-17): the twelve sources this audit opened, each re-read page by page from the cached document.
// Not one publishes a specimen preparation - no specimen table, no print-orientation heading, no moulding
// statement, no direction label. Several print a printing-recommendations block, which is a printing guide and
// not a specimen condition (D63, as m33 ruled for the four iSANMATE sheets). Their rows therefore stay
// "Not published (do not assume printed)", and only the publishers stating a specimen can change that.
for (const s of ['S-PET-TDS', 'S-SPECTRUM-en-tds-spectrum-pctg-cf10', 'S-CPECF', 'S-SPECTRUM-en-tds-spectrum-petg-esd',
  'R-FORMFUTURA-STYX-PA6-TDS', 'X-3DXSTAT-ESD-PA12-TDS-v1', 'S-BVOH', 'S-PES-THERMAX-PES-TDS-v1-0',
  'I-PC-CF-TDS', 'R-FILLAMENTUM-FLEXFILL-PEBA-90A-TDS', 'S-SPECTRUM-en-tds-spectrum-pa12-cf15', 'R-YOUSU-POM-TDS'])
  RULED.set(s, 'm41/D63: re-read 2026-09-17; the sheet publishes no specimen preparation for its values');
RULED.set('B-support-for-pla-TDS', 'm33: the sheet has no Specimen Printing Conditions table');
RULED.set('R-BASF-PCGF30-TDS', 'm33: only the p. 3 print-direction headings are the specimen preparation');
RULED.set('R-ESSENTIUM-PPSCF-TDS', 'm33: only the p. 1 print-orientation headings are the specimen preparation');

const sources = new Map(db.sources.map((s) => [s.id, s]));
const materials = new Map(db.materials.map((m) => [m.id, m]));
const byMaterial = new Map();
for (const x of db.measurements) {
  if (!byMaterial.has(x.materialId)) byMaterial.set(x.materialId, []);
  byMaterial.get(x.materialId).push(x);
}

const rows = [];
for (const m of db.materials) {
  const own = byMaterial.get(m.id) ?? [];
  for (const def of db.registry.headlines) {
    const rel = def.lowerBounds;
    // A bound is only computed where the headline has no selected measurement (compile.js impliedBounds).
    if (!rel || m.headline[def.key]?.known || m.headline[def.key]?.notApplicable) continue;
    for (const x of own) {
      if (!rel.properties.includes(x.property)) continue;
      if (!(rel.loadMPa == null || (x.thermal?.loadStated && Math.abs(x.thermal.loadMPa - rel.loadMPa) < 0.05))) continue;
      if (!x.numeric || x.quarantined || x.implausible) continue;
      if (x.operator === '<' || x.operator === '<=') continue;
      if (annealedBesideAsPrinted(x, own)) continue;
      if ((rel.excludeMoisture ?? []).includes(moistureState(x.moisture ?? 'Not published'))) continue;
      // Everything passes but the form: this row becomes a bound if, and only if, the sheet states a printed specimen.
      if (x.specimenForm !== 'not-stated') continue;
      const s = sources.get(x.sourceId);
      rows.push({
        MaterialID: m.id, Material: m.name, 'H2C status': m.h2cStatus, Headline: def.key,
        MeasurementID: x.id, GradeID: x.gradeId, Property: x.property, Value: `${x.value} ${x.unit}`,
        'Specimen type': x.specimenType, Direction: x.direction ?? 'Not published',
        'Moisture condition': x.moisture ?? 'Not published',
        SourceID: x.sourceId, Publisher: s?.publisher ?? '?', 'Source class': s?.sourceClass ?? '?',
        'PDF cached by audit:sources': /\.pdf(\?|$)/i.test(s?.url ?? '') ? 'yes' : 'no (fetch by hand)',
        Locator: x.locator ?? '',
        'Already ruled on': RULED.get(x.sourceId) ?? 'no',
      });
    }
  }
}

rows.sort((a, b) => a.MaterialID.localeCompare(b.MaterialID) || a.Headline.localeCompare(b.Headline) || a.MeasurementID.localeCompare(b.MeasurementID));
writeFileSync(join(here, 'comparability-targets.csv'), csvText(Object.keys(rows[0]), rows));

const open = rows.filter((r) => r['Already ruled on'] === 'no');
const bySource = new Map();
for (const r of open) {
  if (!bySource.has(r.SourceID)) bySource.set(r.SourceID, { rows: 0, materials: new Set(), publisher: r.Publisher, pdf: r['PDF cached by audit:sources'] });
  const e = bySource.get(r.SourceID); e.rows++; e.materials.add(r.MaterialID);
}
console.log(`comparability-targets.csv: ${rows.length} rows would become implied lower bounds if their sheet states a printed specimen.`);
console.log(`  ${new Set(rows.map((r) => r.MaterialID)).size} materials; ${rows.length - open.length} rows are on sources already ruled on, leaving ${open.length} rows on ${bySource.size} sources to re-read.`);
for (const [id, e] of [...bySource].sort((a, b) => b[1].rows - a[1].rows))
  console.log(`    ${String(e.rows).padStart(2)} rows  ${id.padEnd(46)} ${e.publisher.padEnd(22)} ${[...e.materials].sort().join(',')}${e.pdf.startsWith('no') ? '  [not a .pdf URL]' : ''}`);
