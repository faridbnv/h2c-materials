#!/usr/bin/env node
// The filament indication (D172), value by value: the first read's verdicts (reading/results-*.csv, Claude Sonnet
// readers, one batch each) with the executor's second pass, written to classification.csv. Run from the repository root
// after `npm run build`:
//
//   node docs/audits/2026-10-20-owner-rulings/evidence/classify.mjs reading/groups.json
//
// The second pass (Claude Opus 5.5, 2026-10-20) applies D172 as recorded, most specific first, as page_context is read
// (D128): what the value's own row says, then its table, then the document.
//   - Melt flow is not a counter-indication: it is measured on the melt, and makers that say their bars were printed print
//     it for the filament too (Bambu Lab, Raise3D, IPCON). The first read counted it, by the rubric it was given.
//   - A row's own label (SUNLU's "热变形温度(X-Y)") speaks for its value whatever its table holds.
//   - A statement about how the document's test specimens were made, not scoped to some of its tests ("All testing
//     specimens were printed", "How to make specimens", "Specimen printing conditions", "Test sample printing
//     conditions", "evaluated based on standard samples printed by eSUN"), speaks for every bar value of the document whose
//     table carries no counter-indication. One scoped by the document to named tests or a section (IPCON's "The shrinkage
//     rate and mechanical properties were tested on specimens printed", Eryone's note under "Mechanical Properties of
//     Printed Samples", Nanovia's tensile-test line, Filament2Print's footnote (1) under its mechanical table) does not
//     reach a value it leaves out; nor does a document that sets the value's table apart in its own words (Prusa's
//     "Typical material properties" beside "Mechanical properties of 3D printed testing specimens"; AzureFilm's "Typical
//     properties" with ISO 294 beside its "(3D printed)" table).
//   - Stratasys's thermal tables carry footnote 2, "Literature value unless otherwise noted": a counter-indication.
//   - Extrudr's product pages, whose text the first read had cut at 7000 characters, print "Mould shrinkage ISO 294-4" in
//     the same table: a counter-indication. 3D4Makers' pages, cut the same way, print nothing either way.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../../../../build/src/csv.js';
import { cachedText } from '../../../../scripts/lib/pdf-text.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../..');
const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
const mById = new Map(db.measurements.map((m) => [m.id, m]));
const groups = new Map(JSON.parse(readFileSync(join(here, process.argv[2] ?? 'reading/groups.json'), 'utf8')).map((g) => [g.group, g]));
const rows = readdirSync(join(here, 'reading')).filter((f) => /^results-\d+\.csv$/.test(f)).sort()
  .flatMap((f) => readCsv(join(here, 'reading', f)).records.map((r) => r.values));

const STRONG = new Set(['injection', 'iso294', 'iso3167', 'mould-shrinkage', 'resin-values', 'supplier-data', 'reference-materials', 'compression', 'resin-grade']);
// Statements about how the document's test specimens were made, not scoped to some of its tests: [source pattern, page, quote].
const DOCUMENT = [
  [/^B-PC-(Bambu-PLA-Basic|Bambu-PLA-Matte|new-Bambu-PLA-Tough)-Technical-Data-Sheet$/, 3, 'Specimen Printing Conditions'],
  [/^R-3DJAKE-KINGROON-PLA-Basic-Technical-Data-Sheet-V1-0$/, 3, 'Specimen Printing Conditions'],
  [/^D-RAISE3D-Raise3D-(Hyper-Core-ABS-CF15-TDS-V1-0|Hyper-Speed-PLA-Filament-TDS-V4-0-EN|Industrial-PET-CF-TDS-V4-0)$/, 1, 'All testing specimens were printed under the following conditions:'],
  [/^D-RAISE3D-Raise3D-(Industrial-PET-CF-TDS-V2-8c9901cf-e1d5-4e11-b9e2-cd245c298c4f|Industrial-PET-GF-TDS-V1)$/, 2, 'All testing specimens were printed under the following conditions:'],
  [/^S-PCGF-(ASA-TDS|PA6CF|PC-ABS-TDS)$/, 2, 'Test Sample Printing Conditions:'],
  [/^S-PEBA-PEBA90A-TDS-en$/, 3, 'The performance of the filament is evaluated based on standard samples printed by eSUN'],
  [/^(S-POLYCN-TDS-Polymaker-|R-POLYMAKER-FIBERON-TDS-FIBERON-)/, 1, 'H O W T O M A K E S P E C I M E N S'],
];
const COUNTER = [
  [/^R-STRATASYS-mds-fdm-(absm30i-0621a|pciso-0820a)$/, /HDT/, 'resin-values', 2, 'Literature value unless otherwise noted.'],
  [/^(D-EXTRUDR-FLEX-MEDIUM-MATT-PAGE|R-EXTRUDR-PRINT-20260928-83ec5c0b3125|R-EXTRUDR-PRIORITY-20261003-4f4b613ed9d4|R-EXTRUDR-PRIORITY-20261003-8f1f07e586ce)$/, /./, 'mould-shrinkage', 1, 'Mould shrinkage  ISO 294-4'],
];

// Whether a statement is on a document's cached text, as the migration's guard reads it (scripts/lib/sweep-shared.mjs onSheet).
const squash = (x) => String(x ?? '').toLowerCase().replace(/℃/g, '°c').replace(/[˚º]/g, '°').replace(/[^a-z0-9°%.,<>≤≥+\-]/g, '');
const shaOf = new Map(db.sources.map((s) => [s.id, s.sha256]));
const texts = new Map();
const says = (sid, quote) => {
  if (!texts.has(sid)) { const c = cachedText(shaOf.get(sid)); texts.set(sid, c ? squash(c.pages.map((pg) => pg.lines.map((l) => l.text).join(' ')).join(' ')) : ''); }
  return texts.get(sid).includes(squash(quote));
};
// Values the executor's review of the indicated set took back: a figure in prose, not a row of the document's tests.
const TAKEN_BACK = new Map([['V013958', 'Raise3D Industrial PPS CF\'s description says "heat resistance (HDT 260 °C)": a rounded claim in prose, not a row of its tests, whose HDT table prints 251 °C at 0.45 MPa and 132 °C at 1.8 MPa']]);
const out = [];
for (const r of rows) {
  const g = groups.get(r.group);
  for (const id of r.ids.split(/;\s*/).filter(Boolean)) {
    const m = mById.get(id);
    const row = { measurementId: id, group: r.group, sourceId: g.sourceId, page: g.page, property: m?.property ?? '', first: `${r.verdict}${r.kind ? `:${r.kind}` : ''}` };
    const counter = COUNTER.find(([s, p]) => s.test(g.sourceId) && p.test(m?.property ?? ''));
    const doc = DOCUMENT.find(([s, , q]) => s.test(g.sourceId) && says(g.sourceId, q));
    const ownLabel = /\(X-Y\)|（X-Y）/.test(m?.locator ?? '') && m?.property === 'HDT';
    let v;
    if (TAKEN_BACK.has(id)) v = { verdict: 'set-apart', kind: 'none', quote: '', quotePage: '', by: `second pass: ${TAKEN_BACK.get(id)}` };
    else if (counter) v = { verdict: 'set-apart', kind: counter[2], quote: counter[4], quotePage: counter[3], by: 'second pass' };
    else if (ownLabel) v = { verdict: 'implied', kind: 'own-label', quote: (m.locator.match(/[^:]*\(X-Y\)|[^:]*（X-Y）/) ?? [''])[0].trim(), quotePage: g.page, by: 'second pass' };
    else if (r.verdict === 'STATED') v = { verdict: 'stated', kind: r.kind, quote: r.quote, quotePage: Number(r.notes.match(/\bp(?:age)?\s?(\d+)/i)?.[1] ?? g.page), by: 'first read' };
    else if (r.verdict === 'IMPLIED') v = { verdict: 'implied', kind: r.kind, quote: r.quote, quotePage: Number((r.kind === 'other-document' && r.notes.match(/\bp(?:age)?\s?(\d+)/i)?.[1]) || g.page), by: 'first read' };
    else if (r.verdict === 'COUNTER' && STRONG.has(r.kind)) v = { verdict: 'set-apart', kind: r.kind, quote: r.quote, quotePage: g.page, by: 'first read' };
    else if (doc) v = { verdict: 'implied', kind: 'document', quote: doc[2], quotePage: doc[1], by: 'second pass' };
    else v = { verdict: 'set-apart', kind: 'none', quote: '', quotePage: '', by: r.verdict === 'COUNTER' ? 'second pass (melt flow is no counter; nothing indicates)' : 'first read' };
    out.push({ ...row, ...v });
  }
}
const esc = (x) => `"${String(x ?? '').replace(/"/g, '""')}"`;
const cols = ['measurementId', 'group', 'sourceId', 'page', 'property', 'first', 'verdict', 'kind', 'quote', 'quotePage', 'by'];
writeFileSync(join(here, 'classification.csv'), `${cols.join(',')}\n${out.map((o) => cols.map((c) => esc(o[c])).join(',')).join('\n')}\n`);
const t = {};
for (const o of out) t[`${o.verdict} ${o.kind}`] = (t[`${o.verdict} ${o.kind}`] ?? 0) + 1;
console.log(out.length, 'values');
console.log(Object.entries(t).sort().map(([k, n]) => `${String(n).padStart(5)} ${k}`).join('\n'));
