#!/usr/bin/env node
// Migration m180 (2026-09-26): the test conditions two makers' own documents state for their data sheets (re-center
// phase 6, lane 4, the targeted fetches of batch b36; GOALS C3 and C4, method step 2).
//
// m155 read every cached sheet behind an answer that turns on a value published without its direction or load, and
// left 217 values on 180 sheets that name a standard and nothing about the bar. GOALS' phase 6 decision 4 allows a
// fetch where one document settles a blocking answer. Two makers publish, apart from their sheets, how the values on
// them were measured:
//
//   Extrudr  Its Additional Information Sheet (R-EXTRUDR-AIS, 04.09.2024), section 4, "Test values and test
//            specimen": "To determine a specific value for the technical data sheets, standardized test specimen are
//            being used. ... The test specimen are manufactured through injection moulding and are tested
//            afterwards." m63 registered the document and set every row of batch b07 to a raw material value; the
//            Extrudr sheets that entered later (3DJake's copies, the German, French and Italian editions, and the
//            GreenTEC, FLAX, PEARL, WOOD, BIOFUSION and XPETG sheets of later batches) were never given it, so their
//            values stood as printed parts of unknown direction. Every one of those sheets points to the document in
//            its own words ("More info in the additional information sheet.", "Mehr Infos im
//            Zusatzinformationsblatt", "consultez la fiche d'informations complémentaires", "Maggiori informazioni
//            nella scheda informativa aggiuntiva."). The document was fetched again from its URL on 2026-09-26 and
//            hashes to what m63 recorded.
//   QIDI     Its Filament Guide (a new source, R-QIDI-FILAMENT-GUIDE) compares its filaments in a table whose rows
//            are labelled "Bending Modulus - XY", "Tensile Strength - Z" and "HDT, 0.45 MPa", with the same figures
//            its data sheets print without the axis or the load. Five rows of five products are settled by it.
//
// A statement covers the bars a test is made on, as m128 and m155 decided: the mechanical tests and heat deflection and
// Vicat, never density, melt flow or a DSC temperature. Only a row whose specimen, direction or load is unstated is
// written; a sheet's own statement is never overwritten. The guide settles a row only where it prints, for the
// product the migration pins it to, the number the row holds.
//
// Every statement is checked on the hash-checked document before anything is written: the AIS's section 4 on its
// cached text, each sheet's pointer on its own, and the guide's labels and figures in its bytes (its extracted text
// drops the labels, which stand in a span of their own). A re-run is a no-op, and a run after the data moved stops.
// The reader of every page is an AI agent (claude-opus-5.5, lane 4), not a person, and each note says so.
//
//   node scripts/migrate/m180-the-test-conditions-makers-documents-state.mjs

import { existsSync, readFileSync } from 'node:fs';
import { openTables } from '../data/table-io.mjs';
import { cachedText, cacheDir, sha256 } from '../lib/pdf-text.mjs';
import { correct } from './source-edits.mjs';

const migration = 'm180-the-test-conditions-makers-documents-state';
const date = '2026-09-26';
const NP = 'Not published';
const NA = 'Not applicable';
const READER = 'Read by an AI agent (claude-opus-5.5, re-center lane 4), not a person.';
const t = openTables();

const MECHANICAL = new Set(t.rows('properties').filter((p) => p.Domain === 'mechanical' && p.Property !== 'Tear strength').map((p) => p.Property));
const BARS = new Set([...MECHANICAL, 'HDT', 'Vicat softening temperature']);
const published = (m) => /^Published value/.test(m['Data status']);
const unstatedSpecimen = (m) => /^Not published( \(do not assume printed\))?$/.test(m['Specimen type']);
const unstatedDirection = (m) => m.Direction === 'Unstated' || m.Direction === NP;

const bySource = new Map();
for (const m of t.rows('measurements')) (bySource.get(m.SourceID) ?? bySource.set(m.SourceID, []).get(m.SourceID)).push(m);
const rowsOf = (sourceId) => bySource.get(sourceId) ?? [];

let changed = 0;
const tally = new Map();
const count = (k, n) => { if (n) { tally.set(k, (tally.get(k) ?? 0) + n); changed += n; } };
const left = [];
const edit = (m, set, note, key) => count(key, correct(t, { source: m.SourceID, ids: [m.MeasurementID], migration, date, set, note: `${note} ${READER}` }));

// ------------------------------------------------------------------------------------------------- the documents
const plain = (s) => String(s).replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
function textOf(sourceId) {
  const s = t.get('sources', sourceId);
  const text = /^[0-9a-f]{64}$/.test(s.SHA256 ?? '') ? cachedText(s.SHA256) : null;
  if (!text) throw new Error(`${migration}: ${sourceId} has no cached text for ${s.SHA256}; fetch and extract it first`);
  return text.pages.map((p) => ({ page: p.page, text: plain(p.lines.map((l) => (typeof l === 'string' ? l : l.text)).join(' ')) }));
}
function bytesOf(sourceId, ext) {
  const s = t.get('sources', sourceId);
  const path = cacheDir('sources/by-sha', `${s.SHA256}.${ext}`);
  if (!existsSync(path)) throw new Error(`${migration}: ${sourceId} is not cached at ${s.SHA256}.${ext}; fetch ${s.URL} first`);
  const bytes = readFileSync(path);
  if (sha256(bytes) !== s.SHA256) throw new Error(`${migration}: the cached ${sourceId} does not hash to ${s.SHA256}`);
  return bytes;
}

// ------------------------------------------------------------------ Extrudr: every value on its sheets is moulded
{
  const AIS = 'R-EXTRUDR-AIS';
  const SECTION = 'To determine a specific value for the technical data sheets, standardized test specimen are being used. These are designed and manufactured according to the specific regulation (e.g. ISO 527 oder ISO 179). The test specimen are manufactured through injection moulding and are tested afterwards.';
  bytesOf(AIS, 'pdf');
  const page = textOf(AIS).find((p) => p.text.includes(SECTION));
  if (page?.page !== 4 || !page.text.includes('4. TEST VALUES AND TEST SPECIMEN')) throw new Error(`${migration}: ${AIS} no longer prints section 4 on p. 4 as quoted`);
  // Each sheet's own pointer to that document, in the sheet's language.
  const POINTER = [/More info in the additional information sheet\./, /Mehr Infos im Zusatzinformationsblatt/, /consultez la fiche d'informations complémentaires/, /Maggiori informazioni nella scheda informativa aggiuntiva\./];
  const explained = new Set();
  for (const s of t.rows('sources').filter((x) => x.Publisher === 'Extrudr' && x.SourceID !== AIS && bySource.has(x.SourceID))) {
    const pages = textOf(s.SourceID);
    const hit = pages.map((p) => ({ page: p.page, m: POINTER.map((re) => re.exec(p.text)).find(Boolean) })).find((x) => x.m);
    if (!hit) { left.push(`${s.SourceID} (its text does not point to the additional information sheet)`); continue; }
    for (const m of rowsOf(s.SourceID)) explained.add(m.GradeID);
    for (const m of rowsOf(s.SourceID).filter((x) => published(x) && BARS.has(x.Property) && unstatedSpecimen(x))) {
      // A moulded bar has no build direction: "Unstated" says a printed result's direction was not given (directions
      // vocabulary), and m63 wrote the b07 rows of these same sheets as Not applicable.
      const set = { 'Specimen type': [m['Specimen type'], 'Raw material value'] };
      if (unstatedDirection(m)) set.Direction = [m.Direction, NA];
      edit(m, set,
        `p. ${hit.page} points to Extrudr's additional information sheet ("${hit.m[0]}"), and that sheet (${AIS}, p. 4, section 4, "Test values and test specimen") states for Extrudr's technical data sheets: "${SECTION}" This row's bar was injection moulded, so it stands for the resin, not a printed part, and has no build direction, as m63 recorded for the sheets of batch b07.`,
        'Extrudr: injection moulded (its additional information sheet)');
    }
  }
  // The register names every product the document now explains.
  const ais = t.get('sources', AIS);
  const grades = t.rows('grades').filter((g) => g.Status === 'active' && explained.has(g.GradeID)).map((g) => `${g.MaterialID} / ${g.GradeID}`).sort();
  const before = ais['Applicable grades'].split('; ').filter(Boolean);
  const after = [...new Set([...before, ...grades])].sort();
  if (after.join('; ') !== before.join('; ')) {
    t.set('sources', AIS, 'Applicable grades', after.join('; '), { expect: ais['Applicable grades'] });
    t.set('sources', AIS, 'Access note', `Fetched again from its URL on ${date} (${migration}); it hashes to the SHA-256 m63 recorded.`, { expect: ais['Access note'] });
    count('Extrudr: the additional information sheet names the products it explains', 1);
  }
}

// ------------------------------------------------------------- QIDI: the Filament Guide's axis and load, per product
{
  const GUIDE = {
    SourceID: 'R-QIDI-FILAMENT-GUIDE',
    Publisher: 'QIDI',
    Title: 'QIDI Filament Guide | Choose the Right Filament',
    Revision: NP,
    'Publication date': NP,
    'Access date': date,
    'Source class': 'Manufacturer product page or guide',
    'Source note': "QIDI's own comparison of its filaments, one column per product: a bending strength and a bending modulus labelled XY, a tensile strength labelled Z and a heat deflection labelled \"HDT, 0.45 MPa\", the figures its data sheets print, some without the axis or the load. Fetched in batch b36 (ledger: a witness for the PETG-GF sheet).",
    'Citation role': 'corroboration',
    URL: 'https://qidi3d.com/pages/choose-the-right-filament-3d-filaments-guide-for-qidi-printers',
    Locator: 'Filament Properties: "Bending Modulus - XY", "Tensile Strength - Z", "HDT, 0.45 MPa"',
    'Applicable grades': NA,
    'Access state': 'retrieved',
    'Access note': NA,
    SHA256: '8f33d194a0f6537367ec3331c8e04b112b9ed675b8dbc4668effaabd1221d425',
  };
  // The product each column is, pinned: the guide's column, the grade whose sheet prints the same figure, and why.
  const PRODUCTS = [
    { slug: 'abs-gf25', grade: 'G028-10', why: 'the column "ABS-GF25"; the sheet is headed "QIDI NexABS-GF25" and the ledger lists it as QIDI ABS GF25' },
    { slug: 'odorless-abs', grade: 'G027-32', why: 'the column "Odorless ABS"; the ledger lists the sheet as QIDI ODORLESS ABS' },
    { slug: 'petg-gf', grade: 'G025-04', why: 'the column "PETG-GF", QIDI\'s PETG GF' },
    { slug: 'petg-cf', grade: 'G024-16', why: 'the column "PETG-CF", QIDI\'s PETG CF' },
    { slug: 'petg-rapido', grade: 'G020-44', why: 'the column "PETG Rapido", QIDI\'s PETG RAPIDO' },
  ];
  // The guide's rows this reads, by the label it prints under each, and what a matching row of ours is given.
  const ROWS = [
    { label: 'Bending Modulus - XY', properties: ['Flexural modulus'], unit: 'MPa', set: 'XY' },
    { label: 'Bending Strength - XY', properties: ['Flexural strength'], unit: 'MPa', set: 'XY' },
    { label: 'Tensile Strength - Z', properties: ['Tensile break strength', 'Tensile strength (endpoint unspecified)'], unit: 'MPa', set: 'Z' },
    { label: 'HDT, 0.45 MPa', properties: ['HDT'], unit: '℃', set: 'load' },
  ];
  if (!t.rows('sources').some((s) => s.SourceID === GUIDE.SourceID)) { t.append('sources', GUIDE); count('QIDI: its Filament Guide registered', 1); }
  const html = bytesOf(GUIDE.SourceID, 'html').toString('utf8').replace(/\s+/g, ' ');
  if (!html.includes('<title>QIDI Filament Guide | Choose the Right Filament')) throw new Error(`${migration}: the cached guide is not QIDI's Filament Guide`);
  // Each row of the table: a sort button, the label under it, then one cell per product up to the next row.
  const table = new Map();
  const heads = [...html.matchAll(/data-sort-row="([a-z_]+)"[\s\S]*?class="qidi-label-sub">([^<]+)</g)];
  heads.forEach((h, i) => {
    const block = html.slice(h.index, heads[i + 1]?.index ?? html.length);
    const cells = new Map();
    for (const c of block.matchAll(/data-product="([a-z0-9-]+)" data-sort-value="[^"]*"[^>]*>\s*(?:<div class="qidi-bar-wrapper">\s*)?<span class="qidi-bar-num">([^<]+)<\/span>/g)) cells.set(c[1], c[2].trim());
    table.set(h[2].replace(/&amp;/g, '&').trim(), cells);
  });
  const applicable = new Set();
  for (const r of ROWS) {
    const cells = table.get(r.label);
    if (!cells) throw new Error(`${migration}: the guide no longer prints a row labelled "${r.label}"`);
    for (const p of PRODUCTS) {
      const printed = cells.get(p.slug);
      const g = t.get('grades', p.grade);
      if (!printed) continue;
      const number = Number((printed.match(/^([\d.]+)\s*(MPa|℃)$/) ?? [])[1]);
      if (!Number.isFinite(number) || !printed.endsWith(r.unit)) throw new Error(`${migration}: the guide's "${r.label}" cell for ${p.slug} reads "${printed}"`);
      for (const m of t.rows('measurements').filter((x) => x.GradeID === p.grade && x.SourceID === g.SourceID && r.properties.includes(x.Property) && published(x) && Number(x['Raw numeric']) === number)) {
        applicable.add(`${g.MaterialID} / ${g.GradeID}`);
        const words = `QIDI's Filament Guide (${GUIDE.SourceID}), in its "Filament Properties" table, prints "${printed}" for ${p.why}, in the row labelled "${r.label}": the figure this row holds, from the product's own sheet, which prints it without`;
        if (r.set === 'load') {
          if (m['Test load MPa'] === '0.45') continue;
          if (m['Test load MPa'] !== NP) { left.push(`${m.MeasurementID} (the sheet states ${m['Test load MPa']} MPa; the guide prints the figure at 0.45 MPa)`); continue; }
          edit(m, { 'Test load MPa': [NP, '0.45'], 'Parse review': [NA, `The raw text is the sheet's own ("${m['Standard / load']}") and states no load, so the parser reads none; the typed 0.45 MPa is the load QIDI's Filament Guide prints for this figure (${GUIDE.SourceID}, row "${r.label}"). Read by an AI agent (${migration}).`] },
            `${words} the load. ISO 75 at 0.45 MPa is method B (D65).`, 'QIDI: heat deflection at 0.45 MPa (its Filament Guide)');
        } else {
          if (m.Direction === r.set) continue;
          if (!unstatedDirection(m)) { left.push(`${m.MeasurementID} (already ${m.Direction}; the guide labels the figure ${r.set})`); continue; }
          edit(m, { Direction: [m.Direction, r.set] }, `${words} the axis.`, `QIDI: ${r.set} (its Filament Guide)`);
        }
      }
    }
  }
  const guide = t.get('sources', GUIDE.SourceID);
  const grades = [...applicable].sort().join('; ') || NA;
  if (guide['Applicable grades'] !== grades) { t.set('sources', GUIDE.SourceID, 'Applicable grades', grades, { expect: guide['Applicable grades'] }); count('QIDI: the guide names the products it settles', 1); }
}

if (changed) t.save();
for (const [k, v] of [...tally].sort()) console.log(`  ${v}\t${k}`);
if (left.length) console.log(`  left as they were:\n    ${left.join('\n    ')}`);
console.log(`${migration}: ${changed} change(s) from two makers' own documents`);
