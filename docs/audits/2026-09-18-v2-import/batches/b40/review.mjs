// b40: the product pages the gap-fill research of 2026-09-28 saved for nine existing products whose own sheets print no
// drying schedule (and, for Recreus Conductive Filaflex, no nozzle or bed either). GOALS steps 2 and 5, C9/C10: the
// tranche the owner authorized on 2026-09-29 (GOALS, "Decided on 2026-09-29, the gap-fill tranche").
//
// The pages were staged from the research package's saved copies by digest (ingest:witness --from, WITNESSES.csv in
// docs/audits/2026-09-29-gap-fill-implementation/). Each proposal registers the page as a source and adds one profile
// for the existing product, holding only what the pin names; the proposer's automatic readings of the page are kept
// and rejected, as in b39. Every pinned line is found, in order, on the page's cached text, whose bytes hash to the
// digest the research recorded. No product, grade, identity or shared formulation is created or changed.
//
//   node docs/audits/2026-09-18-v2-import/batches/b40/review.mjs     writes archive/ingest-2026-09-18/proposals/b40/
//
// Reviewed by Claude (claude-opus-5-5), an agent, on 2026-09-29: each page's text re-read in full, the pinned lines
// read against the rendered original's text. No person has signed these reads.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { projectRoot } from '../../../../../scripts/data/table-io.mjs';
import { readCsv } from '../../../../../build/src/csv.js';
import { cachedText, sha256 } from '../../../../../scripts/lib/pdf-text.mjs';
import { propose, profileFor } from '../../../../../scripts/ingest/propose.mjs';
import { worldOf } from '../../../../../scripts/ingest/apply.mjs';
import { locate } from '../../../../../scripts/data/source-store.mjs';
import { parseTemperature, parseAbrasion, parseDrying, parseEnclosure } from '../../../../../build/src/normalize/process.js';
import { profileCellsFromParsed } from '../../../../../build/src/typed-values.js';
import { TEMP_WINDOW } from '../../../../../build/src/recipe.js';

const root = projectRoot;
const by = 'Claude (claude-opus-5-5, agent reviewer), 2026-09-29';
const read = (n) => readCsv(`${root}/data/tables/${n}.csv`).records.map((r) => r.values);
const world = { ...worldOf(), polymers: read('polymers'), manufacturers: readCsv(`${root}/schema/vocab/manufacturers.csv`).records.map((r) => r.values), headlineDefinitions: read('headline_definitions') };
const staged = readCsv(`${root}/docs/audits/2026-09-29-gap-fill-implementation/WITNESSES.csv`).records.map((r) => r.values);
const ledger = readCsv(`${root}/docs/audits/2026-09-18-v2-import/ledger.csv`).records.map((r) => r.values);

// An Extrudr page prints its drying schedule as two rows under "Drying"; the raw cell joins them as the page orders them.
const extrudr = (gid, finding, slug, celsius, hours, sheetProfile) => ({
  gid, finding, url: `https://extrudr.com/en/at/products/${slug}/`,
  settings: [{ field: 'drying', raw: `Drying temperature ${celsius} °C; Drying time ${hours} h`, lines: [`Drying temperature ${celsius} °C`, `Drying time ${hours} h`] }],
  locator: `Print Settings, Drying (drying only; the page's nozzle and build plate rows agree with ${sheetProfile}, from the sheet)`,
});

const pins = [
  extrudr('G126-02', 'GF-PL001-0023', 'flex-medium-esd', 60, 6, 'P0393'),
  extrudr('G014-18', 'GF-RB036-0001', 'wood', 50, 4, 'P1025'),
  extrudr('G018-07', 'GF-RB036-0002', 'pla-basic-cf', 50, '0–6', 'P0374'),
  extrudr('G039-15', 'GF-RB036-0005', 'flex-semisoft', 60, 12, 'P0377'),
  extrudr('G039-16', 'GF-RB036-0006', 'flex-hard', 60, 12, 'P0382'),
  extrudr('G039-17', 'GF-RB036-0007', 'flex-medium', 60, 12, 'P0392'),
  extrudr('G152-01', 'GF-RB036-0009', 'flax', 50, 4, 'P1016'),
  extrudr('G169-01', 'GF-RB036-0010', 'greentec-pro-cf', 60, '0–4', 'P1173'),
  {
    gid: 'G157-01', finding: 'GF-PL001-0026', url: 'https://recreus.com/en/products/filaflex-conductivo',
    settings: [
      // The page's table gives a temperature per nozzle; the 0.4 mm row is the H2C's standard nozzle. The other rows
      // (0.6 mm 250 °C, 0.8 mm 252 °C, 1.0 mm 255 °C) stay on the page.
      { field: 'nozzle', raw: '250°C (0.4mm nozzle, 0.2mm layer, 0.38mm line width, 4.0 mm³/s)', lines: ['Nozzle  Layer Height  Line Width  Volumetric Speed  Temperature', '0.4mm  0.2mm  0.38mm  4.0 mm³/s  250°C'] },
      { field: 'nozzle-diameter', raw: '0.4mm', lines: ['0.4mm  0.2mm  0.38mm  4.0 mm³/s  250°C'] },
      { field: 'bed', raw: 'Small parts: No heating (room temperature); Large parts: 50-55°C', lines: ['Bed Temperature:', 'Small parts: No heating (room temperature)', 'Large parts: 50-55°C'] },
      // The page sets an icon before each item; the words are the page's.
      { field: 'drying', raw: 'Filament Drying (CRUCIAL): Temperature: 55°C; Minimum time: 1 hour', lines: ['Filament Drying (CRUCIAL):', '📏 Temperature: 55°C', '⏱️ Minimum time: 1 hour'] },
    ],
    locator: 'Complete Technical Printing Guide: 1. Material Preparation; 3. Basic Parameters, 0.4mm row; 6. Bed Temperature Settings',
  },
];

const dir = `${root}/archive/ingest-2026-09-18/proposals/b40`;
mkdirSync(dir, { recursive: true });
const register = [];
for (const pin of pins) {
  const s = staged.find((x) => x.url === pin.url);
  if (!s) throw new Error(`b40: ${pin.gid} has no staged page at ${pin.url}`);
  const sha = s.sha256;
  const found = locate(sha, '');
  if (found.bytes !== 'present' || sha256(readFileSync(found.path)) !== sha) throw new Error(`b40: the cached copy of ${pin.url} does not hash to ${sha.slice(0, 12)}`);
  const text = cachedText(sha);
  if (!text) throw new Error(`b40: no cached text for ${sha.slice(0, 12)}; run ingest:extract`);
  const lines = text.pages[0].lines.map((l) => l.text);
  // Each pinned run of lines stands on the page in order, one after another.
  const at = (run) => lines.findIndex((_, i) => run.every((want, k) => lines[i + k] === want));
  for (const set of pin.settings) if (at(set.lines) < 0) throw new Error(`b40: ${pin.gid} ${set.field}: "${set.lines.join(' / ')}" is not on the page`);
  const row = ledger.find((l) => l.sha256 === sha && l.url === pin.url);
  if (!row) throw new Error(`b40: ${pin.url} is not witnessed in the ledger`);
  const grade = world.grades.find((g) => g.GradeID === pin.gid && g.Status === 'active');
  if (!grade || grade.SourceID !== s.for) throw new Error(`b40: ${pin.gid} is not the active product of ${s.for}`);

  const p = propose(row, text, world);
  for (const k of ['grades', 'measurements', 'profiles', 'evidence']) for (const r of p[k] ?? []) r.review = { status: 'rejected', by, note: 'An automatic reading of a product page. Only the pinned print setting below is in this tranche.' };
  p.newMaterial = null; p.headlines = [];
  p.discardedAutomaticGrades = (p.grades ?? []).filter((g) => g.review.status === 'rejected');
  const maker = grade.Manufacturer.toUpperCase().replace(/[^A-Z0-9]+/g, '-');
  const sourceId = `R-${maker}-PRINT-20260929-${sha.slice(0, 12)}`;
  p.source.row = {
    SourceID: sourceId, Publisher: grade.Manufacturer, Title: (text.title || `${grade.Manufacturer} ${grade['Product name']} product page`).normalize('NFKC'),
    Revision: 'Not published', 'Publication date': 'Not published', 'Access date': s.accessed,
    'Source class': 'Manufacturer product page or guide',
    'Source note': 'The exact product\'s page, saved by the gap-fill research of 2026-09-28 and staged from that copy by digest (b40). Only the print setting its profile names was taken; the page\'s other statements are unread here. Reviewed by Claude, an agent.',
    'Citation role': 'cited', URL: pin.url, Locator: 'Document / product page', 'Applicable grades': pin.gid,
    'Access state': 'retrieved', 'Access note': 'Not applicable', SHA256: sha,
  };
  p.source.review = { status: 'accepted', by };
  p.grades = [{ key: pin.gid, row: { ...grade, SourceID: sourceId }, review: { status: 'accepted', by, note: `Existing product ${pin.gid}; no grade, identity or shared formulation is created or changed.` } }];
  const profile = profileFor(pin.settings.map((x) => ({ field: x.field, raw: x.raw, page: 1, line: x.lines.join(' / ') })),
    { sourceId, materialId: grade.MaterialID, modifier: '', locator: pin.locator });
  // The typed cells are the build's own reading (recipe.js), whose plausibility windows keep the nozzle diameter and
  // layer height in the Recreus row from being read as temperatures; the proposer reads without them.
  const r = profile.row;
  Object.assign(r, profileCellsFromParsed({
    nozzle: parseTemperature(r['Nozzle °C'], { plausible: TEMP_WINDOW.nozzle }), bed: parseTemperature(r['Bed °C'], { plausible: TEMP_WINDOW.bed }),
    chamber: parseTemperature(r['Chamber °C'], { plausible: TEMP_WINDOW.chamber }), enclosure: parseEnclosure(r.Enclosure), drying: parseDrying(r.Drying),
    abrasion: parseAbrasion(r['Abrasion / clogging']),
  }));
  profile.id = `print-${pin.gid}`;
  profile.gradeKey = pin.gid;
  profile.evidence = { page: 1, text: pin.settings.map((x) => x.lines.join(' / ')).join(' | ') };
  profile.review = { status: 'accepted', by, finding: pin.finding, note: 'Page text re-read in full; the pinned lines stand in the exact product\'s own print-settings section. Typed cells are the build\'s parsers\' reading of the raw words, as for every other profile.' };
  p.profiles = [...(p.profiles ?? []).filter((r) => r.review.status === 'rejected'), profile];
  p.document.docKey = row.doc_key;
  p.review = { status: 'reviewed', by, note: `Registered for ${pin.gid}'s ${pin.settings.map((x) => x.field).join(', ')} (${pin.finding}); no measurement is taken from the page.` };
  writeFileSync(`${dir}/${sha.slice(0, 16)}.json`, `${JSON.stringify(p, null, 2)}\n`);
  register.push({ finding: pin.finding, gid: pin.gid, sourceId, sha, settings: pin.settings.map((x) => `${x.field}: ${x.raw}`).join(' | ') });
}
writeFileSync(`${root}/docs/audits/2026-09-18-v2-import/batches/b40/proposals.json`, `${JSON.stringify(register, null, 2)}\n`);
console.log(`${register.length} b40 proposals written, one accepted profile each; every automatic reading rejected`);
