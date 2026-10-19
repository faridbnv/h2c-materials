#!/usr/bin/env node
// Migration m449 (2026-10-18): the estimate model's documented conversions and wet offsets become rows of
// conversions.csv, the evidence ledger's table, so one relation lives in one place (the screening build's stage 4, its
// change 4a, D157). Nothing is read from a source: each row copies, byte for byte, a block of
// build/mappings/estimate-model.json as it stood before this change (test/fixtures/estimate-conversions-2026-10-18.json
// keeps those blocks, and test/conversion-layer.test.js proves the model built from the rows equals them).
//
//   conversions.csv     five new columns: Estimate kind (the kind observations.js kindOf emits, or wet / wet-low for a
//                       water offset), Estimate offset and Estimate sd (headline minus related on the model's scale, as the
//                       JSON printed them), Estimate learns (pairs; pairs, down only for an unknown direction, D56;
//                       pairs, across products, down only for the six kinds D159 pools) and Estimate note (the why
//                       shown in an estimate's evidence). A ledger row that is the same relation carries its kind (CV01
//                       HDT 1.8 amorphous, CV03 HDT 0.45 annealed, CV04 tensile XY annealed, CV06 tensile Z, CV08 flexural
//                       XY, CV09 ultimate Z, CV10 elongation's yield XY); every other kind is a row of the new Kind
//                       estimate, which the ledger never reads (Status Not applicable).
//   Kind, Status, Source direction, Source state, Source specimen   accept Not applicable for an estimate row.
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m449-estimate-conversions-as-rows.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { openTables, projectRoot, nextId } from '../../scripts/data/table-io.mjs';

const MIGRATION = 'm449';
const NA = 'Not applicable';
const FIXTURE = join(projectRoot, 'test/fixtures/estimate-conversions-2026-10-18.json');
const t = openTables();

// The blocks as they stood: from the fixture once written, else from the configuration (first run).
const source = existsSync(FIXTURE) ? JSON.parse(readFileSync(FIXTURE, 'utf8'))
  : JSON.parse(readFileSync(join(projectRoot, 'build/mappings/estimate-model.json'), 'utf8'));
const conversions = source.conversions, wet = Object.fromEntries(Object.entries(source.wet).filter(([k]) => !k.startsWith('_')));
if (!existsSync(FIXTURE)) writeFileSync(FIXTURE, `${JSON.stringify({ conversions, wet }, null, 2)}\n`);

const learnsOf = (kind, c) => c.learns ?? (/ unk( |$)/.test(kind) ? 'pairs, down only' : 'pairs');
// The property a kind reads, for an estimate row's Source properties (what the row is about; the ledger reads none).
const PROPERTY = {
  density: { density: 'Density' },
  tensileModulusXY: { flexural: 'Flexural modulus', tensile: 'Tensile modulus', hardness: 'Hardness' },
  tensileStrengthXY: { ultimate: 'Tensile strength (endpoint unspecified)', break: 'Tensile break strength', yield: 'Tensile yield strength', flexural: 'Flexural strength' },
  elongationXY: { break: 'Elongation at break', yield: 'Elongation at yield' },
  hdt045: { HDT: 'HDT', Tg: 'Glass transition temperature', Vicat: 'Vicat softening temperature', Tm: 'Melting temperature' },
};
const HEAD_PROPERTY = { tensileModulusXY: 'Tensile modulus', tensileStrengthXY: 'Tensile strength (endpoint unspecified)', elongationXY: 'Elongation at break' };
// The ledger rows that are the same relation as a documented kind.
const ON_LEDGER = { CV01: ['hdt045', 'HDT 1.8 amorphous'], CV03: ['hdt045', 'HDT 0.45 annealed'], CV04: ['tensileModulusXY', 'tensile XY annealed'],
  CV06: ['tensileModulusXY', 'tensile Z'], CV08: ['tensileModulusXY', 'flexural XY'], CV09: ['tensileStrengthXY', 'ultimate Z'], CV10: ['elongationXY', 'yield XY'] };
const onLedger = new Map(Object.entries(ON_LEDGER).map(([id, [key, kind]]) => [`${key}|${kind}`, id]));

const ESTIMATE_COLUMNS = ['Estimate kind', 'Estimate offset', 'Estimate sd', 'Estimate learns', 'Estimate note'];
let changed = 0;
for (const [i, column] of ESTIMATE_COLUMNS.entries()) {
  if (t.header('conversions').includes(column)) continue;
  t.addColumn('conversions', column, { after: i ? ESTIMATE_COLUMNS[i - 1] : 'Status', fill: () => NA });
  changed++;
}
const cell = (v) => String(v);
const estimateCells = (kind, c, learns) => ({ 'Estimate kind': kind, 'Estimate offset': cell(c.offset), 'Estimate sd': cell(c.sd), 'Estimate learns': learns ?? NA, 'Estimate note': c.why ?? NA });
const ensure = (row) => {
  const held = t.get('conversions', row.ConversionID);
  if (!held) { t.append('conversions', row); changed++; return; }
  for (const [k, v] of Object.entries(row)) if (held[k] !== v) throw new Error(`${MIGRATION}: ${row.ConversionID} ${k} is ${held[k]}, not ${v}; the data moved`);
};
const existingRow = (key, kind) => t.rows('conversions').find((r) => r['Target headline'] === key && r['Estimate kind'] === kind);

for (const [key, table] of Object.entries(conversions)) {
  for (const [kind, c] of Object.entries(table)) {
    const cells = estimateCells(kind, c, learnsOf(kind, c));
    const ledgerId = onLedger.get(`${key}|${kind}`);
    if (ledgerId) {
      const r = t.get('conversions', ledgerId);
      for (const [k, v] of Object.entries(cells)) {
        if (r[k] === v) continue;
        t.set('conversions', ledgerId, k, v, { expect: NA, migration: MIGRATION });
        changed++;
      }
      continue;
    }
    if (existingRow(key, kind)) { ensure({ ...existingRow(key, kind), ...cells }); continue; }
    const word = kind.split(' ')[0];
    const property = PROPERTY[key][word] ?? (key === 'density' ? 'Density' : null);
    if (!property) throw new Error(`${MIGRATION}: no property for ${key} ${kind}`);
    const load = /^HDT 1\.8/.test(kind) ? '1.8' : NA;
    t.append('conversions', {
      ConversionID: nextId('conversions', t.rows('conversions').map((r) => r.ConversionID)), 'Target headline': key, 'Source properties': property,
      'Source load MPa': load, 'Source direction': NA, 'Source state': NA, 'Source specimen': NA, Kind: 'estimate',
      'Factor low': NA, 'Factor high': NA, 'Absolute offset': '0', 'Applies to': '', 'Physical relation': /^HDT 1\.8/.test(kind) ? 'PR08' : NA,
      Status: NA, ...cells, 'Reason words': NA, SourceID: NA,
      Basis: `The estimate model's documented conversion of ${property.toLowerCase()} (${kind}) to ${key}, refined at every build by the grades that publish both (D43, D157).`,
    });
    changed++;
  }
}
for (const [cls, byKey] of Object.entries(wet)) {
  for (const [key, c] of Object.entries(byKey)) {
    const kind = cls === 'high' ? 'wet' : 'wet-low';
    if (existingRow(key, kind)) continue;
    t.append('conversions', {
      ConversionID: nextId('conversions', t.rows('conversions').map((r) => r.ConversionID)), 'Target headline': key, 'Source properties': HEAD_PROPERTY[key],
      'Source load MPa': NA, 'Source direction': NA, 'Source state': 'conditioned', 'Source specimen': NA, Kind: 'estimate',
      'Factor low': NA, 'Factor high': NA, 'Absolute offset': '0', 'Applies to': '', 'Physical relation': NA, Status: NA,
      'Estimate kind': kind, 'Estimate offset': cell(c.offset), 'Estimate sd': cell(c.sd), 'Estimate learns': NA, 'Estimate note': NA,
      'Reason words': NA, SourceID: NA,
      Basis: `The estimate model's offset from a value measured after moisture conditioning to the dry one, for a polymer of ${cls} water uptake (polymers.csv Water uptake), added to the dry conversion's (D53, D157). ${source.wet._comment ?? ''}`.trim(),
    });
    changed++;
  }
}
// method.csv's Estimates rule names where the conversions are.
const PARAMS = 'Parameters: build/mappings/estimate-model.json.';
const NOW = 'Parameters: build/mappings/estimate-model.json; the documented conversions are rows of data/tables/conversions.csv (D157).';
const rule = t.get('method', 'Estimates')['Definition / rule'];
if (rule.endsWith(PARAMS)) { t.set('method', 'Estimates', 'Definition / rule', rule.slice(0, -PARAMS.length) + NOW, { expect: rule, migration: MIGRATION }); changed++; }
else if (!rule.endsWith(NOW)) throw new Error(`${MIGRATION}: method.csv Estimates does not end as expected; the data moved`);
t.save();
console.log(`${MIGRATION}: ${changed} change(s)`);
