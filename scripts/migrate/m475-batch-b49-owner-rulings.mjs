#!/usr/bin/env node
// Migration m475 (2026-10-20), batch b49: the documents the owner's rulings admit (item 9, the held sheets' homes; item
// 6's SBC class; D176), through the import pipeline, and the SBC row of polymers.csv they let the round write.
//
// The owner asked a materials-scientist agent to research and decide the held sheets' homes. Claude Sonnet readers
// fetched the makers' documents; Claude Opus 5.5 (the round's materials-science track) read each page, decided, staged the
// documents by digest into the round's own ledger (ingest:witness --from, docs/audits/2026-10-20-owner-rulings/science/
// ingest/staged-manifest-b49.csv) and wrote the proposals (ingest/build-b49.mjs, which pins the packet here):
// - Multi3D Electrifi, a "copper-filled thermoplastic" whose safety data sheet lists "biodegradable polyester" with a
//   melting point of "Approximately 60 °C": the one biodegradable polyester that melts near 60 °C is polycaprolactone,
//   and its 140-160 °C nozzle and soft filament are a PCL's. A material of its own, PCL-EC (M176), an inferred filing
//   (R227, R228), not estimated: its polymer is inferred and a 2 to 4 g/cm³ copper load is beyond any fill model here.
// - Stratasys Diran 410MF07, "a nylon-based thermoplastic FDM material, mineral-filled 7% by weight", whose polyamide no
//   Stratasys document names: the maker-undisclosed nylon home for its declared filler, Nylon-CE (M177; R229, R230), as
//   the carbon- and glass-fibre homes are (R167), not estimated. Its physical and mechanical tables enter (26 values).
// - Nanovia ISTROFLEX's safety data sheet ("Modified Polyester alloy and oyster shell powder", Tg -32 °C): the evidence
//   m476 files it by. Its density of 1.34 g/cm³ disagrees with the product page's 1.55; both are kept.
// - INEOS Styrolution's Styrolux 656C sheet and K-Resin KR03 page, the references for SBC's row of polymers.csv (below).
// FKuR's Fibrolon V 135002, Nuterials JECTO and Stratasys ST-130 stay out, with their reasons in the V2 ledger (R236 to R238).
//
// The SBC row (a frozen table, D58, D138): FormFutura's Crystal Flex (M174) prints Shore D 63, a flexural modulus of
// 1795 MPa and 1.01 g/cm³, K-Resin KR03's figures, and Styrolux 656C, "Tough and stiff", 1800 MPa and 1020 kg/m³: a clear,
// styrene-rich block copolymer whose glassy polystyrene phase carries the load, a stiff amorphous styrenic and not an
// elastomer (an elastomeric SBC, INEOS's Styroflex 2G66, is Shore 86A and 70 MPa). The row is styrenic and amorphous, its
// neat density 1010 to 1020 kg/m³ from the two references, and M174 is estimated by it. Back-tested before it was kept
// (docs/audits/2026-10-20-owner-rulings/science/BACKTEST.md, D176).
//
// The batch is guarded and rehearsed as every batch is (scripts/ingest/apply.mjs: hashes, reviews, the schema gate, no new
// lint finding, the core build) with the edits above, before anything is written. A re-run is a no-op.
//
//   node scripts/migrate/m475-batch-b49-owner-rulings.mjs [--dry-run]
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openTables, projectRoot } from '../../scripts/data/table-io.mjs';
import { checkData } from '../../build/src/schema.js';
import { readCsv, csvText } from '../../build/src/csv.js';
import { lintData, findingKey } from '../../build/src/lint-rules.js';
import { loadTables, snapshotDate } from '../../build/src/load.js';
import { buildDatabase } from '../../build/src/pipeline.js';

const migration = 'm475-batch-b49-owner-rulings', date = '2026-10-20';
const at = join(projectRoot, 'docs/audits/2026-10-20-owner-rulings/science/ingest');
const PACKET_SHA256 = 'e0d3502b3aa587d2cfdffdb1aedc4d03c12f2c2af522c336b04d33e6c7838706';
const hash = (b) => createHash('sha256').update(b).digest('hex');
const bytes = readFileSync(join(at, 'b49-packet.json')), digest = hash(bytes);
if (digest !== PACKET_SHA256) throw Error(`${migration}: changed packet`);
const p = JSON.parse(bytes);

process.env.H2C_INGEST_ROOT = at;
process.env.H2C_PROPOSALS = join(at, 'proposals');
const { proposalsOf, guard, worldOf, writeBatch, markApplied } = await import('../../scripts/ingest/apply.mjs');
const { locate } = await import('../../scripts/data/source-store.mjs');
const { onSheet } = await import('../../scripts/lib/sweep-shared.mjs');

const proposals = proposalsOf('b49');
if (proposals.length !== p.Documents.length) throw Error(`${migration}: proposal inventory moved`);
for (const d of p.Documents) {
  if (hash(readFileSync(join(at, 'proposals/b49', d.File))) !== d.ProposalSHA256) throw Error(`${migration}: proposal ${d.File} moved`);
  const o = locate(d.OriginalSHA256, d.Source.SourceID);
  if (o.bytes !== 'present') throw Error(`${migration}: ${d.Source.SourceID} is ${o.bytes}; restore the source store`);
}

const NP = 'Not published', NA = 'Not applicable';
const BY = 'claude-opus-5.5 (the owner\'s rulings, materials-science track)';

/** The vocabulary values the packet names, added in a tree. */
function addVocabulary(root) {
  let added = 0;
  for (const name of new Set(p.NewVocabulary.map((v) => v.Vocabulary))) {
    const file = join(root, `schema/vocab/${name}.csv`);
    const { header, records } = readCsv(file);
    const rows = records.map((r) => r.values);
    const before = rows.length;
    for (const v of p.NewVocabulary.filter((x) => x.Vocabulary === name)) {
      if (rows.some((r) => r.Value === v.Value)) continue;
      const row = Object.fromEntries(header.map((h) => [h, h === 'Value' ? v.Value : v[h] ?? '']));
      const i = rows.findIndex((r) => r.Value.localeCompare(v.Value, 'en', { sensitivity: 'base' }) > 0);
      rows.splice(i < 0 ? rows.length : i, 0, row);
    }
    if (rows.length !== before) { writeFileSync(file, csvText(header, rows)); added += rows.length - before; }
  }
  return added;
}

// ---- The two homes the rulings make ------------------------------------------------------------------------------
const HOMES = [
  {
    MaterialID: 'M176', 'Original name': 'PCL-EC', Family: 'PVB / Specialty Polymers', 'H2C status': 'Theoretical',
    'Best uses': 'Printed electrical conductors, contacts, heaters, antennas and EMI shielding are the maker\'s proposed applications (Multi3D Electrifi).',
    Limitations: 'No polymers.csv row reaches it, so nothing is estimated: its polymer is inferred, and a copper load of 2 to 4 g/cm³ is beyond what any fill model here describes. Its maker keeps it to about 45 °C in service and advises a direct-drive extruder with a short filament path, not a multi-material feed system.',
    'Full name': 'Polycaprolactone (Electrically conductive)', Scope: 'H2C-relevant', Abbreviation: 'PCL-EC', 'Base polymer': 'PCL',
    'Estimate identity': NA, 'Modifier / filler': 'Electrically conductive', 'Variant class': NA, Role: 'Structural / functional / appearance',
    'Identity notes': 'Inferred filing (the owner\'s rulings, 2026-10-20; R227, R228; D176). Multi3D\'s Electrifi is a "copper-filled thermoplastic"; its safety data sheet lists "biodegradable polyester" and "Conductive Filler" and gives a melting point of "Approximately 60 °C". Polycaprolactone (PCL, melting point 60 °C in polymers.csv) is the one biodegradable polyester that melts near 60 °C (polybutylene succinate and adipate-terephthalate melt near 115 °C, PLA from 150 °C), and the maker\'s 140-160 °C nozzle, room-temperature bed and "soft, low-modulus filament" are a PCL\'s. The maker names no polymer, so the filing is the best evidence and not estimated; a maker document naming another polyester moves the product.',
  },
  {
    MaterialID: 'M177', 'Original name': 'Nylon-CE, maker-undisclosed polyamide', Family: 'Nylon / Polyamide', 'H2C status': 'Officially listed family',
    'Best uses': NP,
    Limitations: 'Its products are mineral-filled nylons whose makers do not disclose which polyamide, so its range spans several polymers, and nothing is estimated where a product is silent.',
    'Full name': 'Mineral-filled polyamide (Nylon), polyamide not disclosed by the maker', Scope: 'H2C-relevant', Abbreviation: 'PA-CE (undisclosed)', 'Base polymer': 'PA',
    'Estimate identity': NA, 'Modifier / filler': 'Ceramic', 'Variant class': NA, Role: 'Structural / functional / appearance',
    'Identity notes': 'The home of mineral-filled nylon products whose makers do not disclose which polyamide, made on 2026-10-20 by the owner\'s rulings (R229; D176) beside the unfilled, carbon-fibre and glass-fibre homes (M164 to M166, R167): Stratasys\'s Diran 410MF07 is "a nylon-based thermoplastic FDM material, mineral-filled 7% by weight", and neither its data sheet, its user guide nor its safety data sheet names the polyamide or the mineral. A mineral load is the Ceramic modifier, as PA6-CE\'s and PAHT-CE\'s are. Shown and judged like any material, and not estimated: the model identifies a material by its polymer. A product a document names is filed under that polymer\'s material instead (R205).',
  },
];
function homes(t) {
  let n = 0;
  for (const h of HOMES) {
    const existing = t.rows('materials').find((m) => m['Original name'] === h['Original name']);
    if (existing) { if (existing.MaterialID !== h.MaterialID) throw Error(`${migration}: ${h['Original name']} is ${existing.MaterialID}, not ${h.MaterialID}`); continue; }
    if (t.find('materials', h.MaterialID)) throw Error(`${migration}: ${h.MaterialID} is taken by another material; renumber the packet`);
    t.append('materials', h);
    n++;
  }
  return n;
}

// ---- polymers.csv: SBC, a stiff amorphous styrenic -----------------------------------------------------------------
const SBC_ROW = {
  PolymerID: 'SBC', Group: 'styrenic', Morphology: 'amorphous', 'Melting point °C': NA, 'As printed': NA, 'Annealing threshold °C': NA,
  'Water uptake': NA, 'Neat density min kg/m³': '1010', 'Neat density max kg/m³': '1020', SourceID: 'R-INEOS-STYROLUX-656C-TDS',
  Basis: 'A clear, styrene-rich styrene-butadiene block copolymer whose glassy polystyrene phase carries the load: a stiff amorphous styrenic, not an elastomer (the owner\'s rulings, 2026-10-20, R231, D176). INEOS Styrolution\'s sheet for Styrolux 656C (R-INEOS-STYROLUX-656C-TDS) calls it "a clear styrene-butadiene copolymer (SBC)" and a "Tough and stiff grade", and prints a tensile modulus of 1800 MPa (ISO 527), a Shore D hardness of 72 (ISO 868), an HDT B of 77 °C (ISO 75) and a density of 1020 kg/m³ (ISO 1183); its K-Resin KR03 page (R-INEOS-KRESIN-KR03-PAGE, the Wayback Machine\'s capture of 2021-11-04) prints Shore D 63 and a density of 1.01 g/cm³ (ASTM D 792), the figures FormFutura\'s Crystal Flex (M174) prints. The density range is those two references\' figures. An elastomeric SBC (INEOS\'s Styroflex, Shore 86A, 70 MPa) is a TPS (M170), not this row.',
};
function sbc(t) {
  let n = 0;
  onSheet(t, 'R-INEOS-STYROLUX-656C-TDS', 'is a clear styrene-butadiene copolymer (SBC) | Tough and stiff grade | Tensile Modulus ISO 527 MPa 1800 | Hardness, Shore D ISO 868 - 72 | Density ISO 1183 kg/m³ 1020', migration);
  onSheet(t, 'R-INEOS-KRESIN-KR03-PAGE', 'Excellent Clarity | Good Stiffness | Hardness, Shore D ASTM D 2240 - 63 | ASTM D 792 g/cm³ 1.01', migration);
  if (!t.find('polymers', 'SBC')) { t.append('polymers', SBC_ROW); n++; }
  const m = t.get('materials', 'M174');
  if (m['Estimate identity'] === NA) {
    t.set('materials', 'M174', 'Estimate identity', 'SBC', { expect: NA, migration });
    t.set('materials', 'M174', 'Limitations', NP, { expect: 'No polymers.csv row, so nothing is estimated where its products are silent.', migration });
    t.set('materials', 'M174', 'Identity notes', `${m['Identity notes']} Estimated since 2026-10-20 (the owner's rulings, R231, D176): INEOS Styrolution's Styrolux 656C sheet and K-Resin KR03 page give SBC a polymers.csv row, a stiff amorphous styrenic, as R199 waited for.`, { expect: m['Identity notes'], migration });
    n++;
  }
  return n;
}

// ---- The rulings, written once in the import's registry ------------------------------------------------------------
const RULINGS = [
  ['R227', 'material', 'Electrifi', 'M176', 'The owner\'s rulings of 2026-10-20 (a materials-scientist agent decides; D176), on the best evidence (R205): Multi3D\'s safety data sheet lists "biodegradable polyester" with a melting point of "Approximately 60 °C", which among biodegradable polyesters only polycaprolactone has; its 140-160 °C nozzle and soft filament agree. Inferred, not settled: the maker names no polymer. Filed under PCL-EC, its conductive copper load the Electrically conductive modifier.'],
  ['R228', 'new-material', 'PCL-EC', 'PCL × Electrically conductive', 'The owner\'s rulings of 2026-10-20 (D176): a conductive PCL is a material of its own, as TPU-EC and ASA-EC are, under PVB / Specialty Polymers beside PCL; not estimated (Estimate identity Not applicable).'],
  ['R229', 'new-material', 'Nylon-CE, maker-undisclosed polyamide', 'PA × Ceramic', 'The owner\'s rulings of 2026-10-20 (D176): the maker-undisclosed nylon home for a declared mineral filler, beside the unfilled, carbon-fibre and glass-fibre homes (R167); not estimated.'],
  ['R230', 'material', 'Diran 410MF07', 'M177', 'R167 applied by the owner\'s rulings of 2026-10-20 (D176): "a nylon-based thermoplastic FDM material, mineral-filled 7% by weight" names the family and the filler, not the polyamide; Stratasys\'s user guide and safety data sheet name neither.'],
  ['R231', 'identity-policy', 'SBC', 'A stiff amorphous styrenic, with a polymers.csv row', 'The owner\'s rulings of 2026-10-20 (D176), on R199\'s open question (a stiff amorphous styrenic, or an elastomer like SEBS): Crystal Flex prints Shore D 63 and a 1795 MPa flexural modulus, K-Resin KR03\'s figures, and INEOS Styrolution\'s Styrolux and K-Resin SBCs are clear, stiff, glassy styrenics (1500 to 1800 MPa); an elastomeric SBC is a TPS. Styrolux 656C\'s sheet and K-Resin KR03\'s page give its row (m475), so SBC is estimated.'],
  ['R236', 'scope', 'Fibrolon V 135002 (trial grade)', 'Not admitted', 'The owner\'s rulings of 2026-10-20 (D176): FKuR\'s sheet is a compound "suitable for the production of 3D printing filaments", measured on injection-moulded ISO 3167 bars. colorFabb\'s woodFill sheets print its figures and colorFabb names FKuR its compounding partner, but no document says woodFill is V 135002, and the catalogue holds no colorFabb woodFill: a resin sheet is registered only to a product it records (R194). Its home, once colorFabb woodFill is imported from colorFabb\'s own sheet, is that product\'s resin reference.'],
  ['R237', 'scope', 'Nuterials JECTO', 'Not admitted', 'The owner\'s rulings of 2026-10-20 (D176): Nuterials sells JECTO as pellets; its walnut filament (FILA, 1.75 mm) "is currently under development and undergoing testing" (nuterials.com, 2026-10-19), and its binder is named only "Natural Polymer". It enters when a filament is sold.'],
  ['R238', 'scope', 'Composite Molding Material (ST-130)', 'Not admitted', 'The owner\'s rulings of 2026-10-20 (D176): no Stratasys document names ST-130\'s polymer or family (its sheet, its pages, and the SDS search; a combined PC-ABS sheet that carries the code "ST130_S" does not say ST-130 is that alloy). It is a sacrificial tooling material, dissolved after curing, sold in canisters for Fortus 450mc and 900mc; no home holds it without a family.'],
];
const RULINGS_FILE = join(projectRoot, 'docs/audits/2026-09-18-v2-import/rulings/rulings.csv');
function rulings() {
  const { header, records } = readCsv(RULINGS_FILE);
  const rows = records.map((r) => r.values);
  let n = 0;
  for (const [Ruling, Kind, Subject, Value, Reason] of RULINGS) {
    const there = rows.find((r) => r.Ruling === Ruling);
    if (there) { if (there.Subject !== Subject) throw Error(`${migration}: ${Ruling} is taken by "${there.Subject}"`); continue; }
    rows.push({ Ruling, Kind, Subject, Value, Reason, By: BY, Date: date });
    n++;
  }
  if (n) writeFileSync(RULINGS_FILE, csvText(header, rows));
  return n;
}

// ---- The V2 ledger: the held sheets, admitted here or kept out ---------------------------------------------------
const V2_LEDGER = join(projectRoot, 'docs/audits/2026-09-18-v2-import/ledger.csv');
const ADMITTED = { '2688570615b2eb82': 'R-MULTI3D-ELECTRIFI-TDS', 'https://www.stratasys.com/contentassets/6729604c61704654ac5c0392276a2d57/mds_fdm_diran410mf07_0224a-1.pdf?v=4aa22c': 'R-STRATASYS-mds-fdm-diran410mf07-0224a' };
const KEPT_OUT = { af2a1612aba91481: 'R236', '4a90a1e5e22db834': 'R237', 'https://www.stratasys.com/siteassets/materials/materials-catalog/fdm-materials/st-130/mss_fdm_st130_1016a.pdf?v=48e19f': 'R238' };
function v2ledger() {
  const { header, records } = readCsv(V2_LEDGER);
  const rows = records.map((r) => r.values);
  let n = 0;
  for (const [key, sid] of Object.entries(ADMITTED)) {
    const r = rows.find((x) => x.doc_key === key);
    if (!r) throw Error(`${migration}: no V2 ledger row ${key}`);
    if (r.status === 'applied') continue;
    if (r.status !== 'deferred') throw Error(`${migration}: ${key} is ${r.status}, not deferred`);
    Object.assign(r, { status: 'applied', batch: 'b49', registered_source_id: sid, registered_by: 'sha', updated: date,
      status_note: `${r.status_note} Admitted ${date} in batch b49 (${migration}; the owner's rulings, D176): staged by digest into docs/audits/2026-10-20-owner-rulings/science/ingest/ledger.csv and registered as ${sid}.` });
    n++;
  }
  for (const [key, ruling] of Object.entries(KEPT_OUT)) {
    const r = rows.find((x) => x.doc_key === key);
    if (!r) throw Error(`${migration}: no V2 ledger row ${key}`);
    const note = ` The owner's rulings of 2026-10-20 keep it out (${ruling}, D176; ${migration}).`;
    if (r.status_note.includes(note.trim())) continue;
    r.status_note = `${r.status_note}${note}`; r.updated = date; n++;
  }
  if (n) writeFileSync(V2_LEDGER, csvText(header, rows));
  return n;
}

// Rehearse on a copy of the tables: the homes, the batch and the SBC row together, then the schema gate, the lint (no
// new finding) and the core build, before anything is written.
const dir = mkdtempSync(join(tmpdir(), 'h2c-b49-rehearse-'));
let rehearsal;
try {
  cpSync(join(projectRoot, 'data'), join(dir, 'data'), { recursive: true }); cpSync(join(projectRoot, 'schema'), join(dir, 'schema'), { recursive: true });
  const vocab = addVocabulary(dir);
  { const t = openTables(dir); homes(t); t.save(); }
  const problems = guard(proposals, worldOf(dir));
  if (problems.length) throw Error(JSON.stringify(problems, null, 1));
  const t = openTables(dir), log = writeBatch(t, proposals, { migration, date, root: dir }), set = sbc(t); t.save();
  const gate = checkData(join(dir, 'data'), join(dir, 'schema')); if (gate.issues.length) throw Error(JSON.stringify(gate.issues));
  const tables = Object.fromEntries(Object.keys(gate.schemas).map((n) => { const { header, records } = readCsv(join(dir, 'data/tables', `${n}.csv`)); return [n, { header, rows: records.map((r) => r.values) }]; }));
  const baseline = new Set(readCsv(join(dir, 'data/review/accepted-findings.csv')).records.map((r) => findingKey({ code: r.values.Code, table: r.values.Table, record: r.values.Record, field: r.values.Field ?? '' })));
  const lint = lintData(tables, gate.schemas).filter((f) => !baseline.has(findingKey(f)));
  if (lint.length) throw Error(JSON.stringify(lint, null, 1));
  const wb = loadTables(join(dir, 'data')), issues = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'apply', estimates: false }).issues.filter((i) => i.level === 'error');
  if (issues.length) throw Error(JSON.stringify(issues, null, 1));
  rehearsal = { vocab, log: log.length, set };
} finally { rmSync(dir, { recursive: true, force: true }); }
if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ migration, packet: digest, rehearsal, written: false }, null, 2)); process.exit(0); }

const vocab = addVocabulary(projectRoot);
const t = openTables(), made = homes(t), log = writeBatch(t, proposals, { migration, date }), set = sbc(t), applied = markApplied(proposals, t);
if (made || log.length || set || applied) t.save();
const ruled = rulings(), ledger = v2ledger();
console.log(JSON.stringify({ migration, packet: digest, vocab, made, log, set, applied, ruled, ledger }, null, 2));
