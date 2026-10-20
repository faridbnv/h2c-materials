#!/usr/bin/env node
// The filament indication (D172), value by value: the readings' verdicts with the executor's second pass, written to
// classification.csv. Run from the repository root after `npm run build`:
//
//   node docs/audits/2026-10-20-owner-rulings/evidence/classify.mjs
//
// Two readings, both by Claude Sonnet readers, one batch each. The first (reading/results-*.csv, 2,265 values on 655
// pages) told its readers to choose "nothing" when in doubt and to let any moulding or melt word win, so they stopped at a
// melt flow rate or a blank mould shrinkage row and did not report what indicated printing; and of the pages whose text
// held a moulding or resin word, one in eight was read. The second (reading/round-2/, after the independent review of
// T1, F1 and F7) read again every value the first left set apart for want of an indication, and every page it never read,
// under the executor's rubric: the owner's "EVEN an implicit indication" first, a counter-indication only when it is
// about the same values or the same table, and doubt with any indication present kept. A value the second reading read
// takes its verdict; one it did not (a value the first reading kept, or set apart by a rule below) keeps the first's.
//
// The second pass (Claude Opus 5.5, 2026-10-20) applies D172 as recorded, most specific first, as page_context is read
// (D128): what the value's own row says, then its table, then the document.
//   - Melt flow is not a counter-indication: it is measured on the melt, and makers that say their bars were printed print
//     it for the filament too (Bambu Lab, Raise3D, IPCON). Nor is a blank mould shrinkage row.
//   - A row's own label (SUNLU's "热变形温度(X-Y)") speaks for its value whatever its table holds.
//   - A statement about how the document's test specimens were made, not scoped to some of its tests ("All testing
//     specimens were printed", "How to make specimens", "Specimen printing conditions"), speaks for every bar value of the
//     document whose table carries no counter-indication (DOCUMENT below; Polymaker's pattern covers every Polymaker sheet
//     that prints it, PolyTerra and PolyLite among them). One the document scopes to a section (IPCON's "The shrinkage rate
//     and mechanical properties were tested on specimens printed", Eryone's note under "Mechanical Properties of Printed
//     Samples") does not reach a value it leaves out; nor does a document that sets the value's table apart in its own
//     words (Prusa's "Typical material properties", AzureFilm's "Typical properties" beside a "(3D printed)" table).
//   - A disclaimer that values "may vary according to printing conditions" (Spectrum, FormFutura, QIDI, Raise3D, BigRep) is
//     no indication: it names no test, specimen or property, it is written for the user's prints, and Spectrum prints the
//     same sentence beside rows it labels "injection moulding". One that speaks of the test specimens (NinjaTek's
//     "specimen details … slicing and/or printing configurations") is a statement about them and keeps.
//   - A sentence keeps only the values whose property it names, and only where it names the printed part (a printed part,
//     object, model, print or prototype, after printing, or the adhesion of its layers): Fillamentum NonOilen's "great
//     temperature resistance after 3D printing" keeps its heat deflection; "printed parts are strong" keeps a strength,
//     not a modulus; "excellent interlayer adhesion" alone names no property and keeps nothing (SENTENCE below).
//   - A figure in a document's prose (a description's "HDT 260 °C", "over 6 GPa after annealing") is no row of its tests:
//     a statement about how the test specimens were made does not reach it (TAKEN_BACK below; m480 for V013950).
//   - A maker that labels each row by its own specimen speaks for that row only: Spectrum prints "(3D printing)" on some rows
//     and "injection moulding" on others of one table (its PET-G Matt modulus), so a neighbour's label is no indication
//     for an unlabelled row (PER_ROW below; the review of T1, F2).
//   - Stratasys's thermal tables carry footnote 2, "Literature value unless otherwise noted": a counter-indication.
//   - Extrudr's product pages print "Mould shrinkage ISO 294-4" in the same table: a counter-indication.
// Every judgement call either reading or this pass made is listed for the owner in DOUBTFUL.md (doubtful.mjs).
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../../../../build/src/csv.js';
import { cachedText } from '../../../../scripts/lib/pdf-text.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../..');
const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
const mById = new Map(db.measurements.map((m) => [m.id, m]));
const results = (dir) => readdirSync(join(here, dir)).filter((f) => /^results-\d+\.csv$/.test(f)).sort()
  .flatMap((f) => readCsv(join(here, dir, f)).records.map((r) => r.values));
const groups1 = new Map(JSON.parse(readFileSync(join(here, 'reading/groups.json'), 'utf8')).map((g) => [g.group, g]));
const groups2 = new Map(JSON.parse(readFileSync(join(here, 'reading/round-2/groups.json'), 'utf8')).map((g) => [g.group, g]));
const first = results('reading');
const second = new Map();
for (const r of results('reading/round-2')) for (const id of r.ids.split(/;\s*/).filter(Boolean)) second.set(id, r);

const STRONG = new Set(['injection', 'iso294', 'iso3167', 'mould-shrinkage', 'resin-values', 'supplier-data', 'reference-materials', 'compression', 'resin-grade']);
// Statements about how the document's test specimens were made, not scoped to some of its tests: [source pattern, quote].
const DOCUMENT = [
  [/^B-PC-(Bambu-PLA-Basic|Bambu-PLA-Matte|new-Bambu-PLA-Tough)-Technical-Data-Sheet$/, 'Specimen Printing Conditions'],
  [/^R-3DJAKE-KINGROON-PLA-Basic-Technical-Data-Sheet-V1-0$/, 'Specimen Printing Conditions'],
  [/^D-RAISE3D-Raise3D-(Hyper-Core-ABS-CF15-TDS-V1-0|Hyper-Speed-PLA-Filament-TDS-V4-0-EN|Industrial-PET-CF-TDS-V4-0)$/, 'All testing specimens were printed under the following conditions:'],
  [/^D-RAISE3D-Raise3D-(Industrial-PET-CF-TDS-V2-8c9901cf-e1d5-4e11-b9e2-cd245c298c4f|Industrial-PET-GF-TDS-V1)$/, 'All testing specimens were printed under the following conditions:'],
  [/^S-PCGF-(ASA-TDS|PA6CF|PC-ABS-TDS)$/, 'Test Sample Printing Conditions:'],
  [/^S-PEBA-PEBA90A-TDS-en$/, 'The performance of the filament is evaluated based on standard samples printed by eSUN'],
  // Every Polymaker sheet that prints its "How to make specimens" box (Polymaker, PolyTerra, PolyLite, Fiberon, …).
  [/^(S-POLYCN-|R-POLYMAKER-)/, 'H O W T O M A K E S P E C I M E N S', 'HOW TO MAKE SPECIMENS'],
];
const COUNTER = [
  [/^R-STRATASYS-mds-fdm-(absm30i-0621a|pciso-0820a)$/, /HDT/, 'resin-values', 'Literature value unless otherwise noted.'],
  [/^(D-EXTRUDR-FLEX-MEDIUM-MATT-PAGE|R-EXTRUDR-PRINT-20260928-83ec5c0b3125|R-EXTRUDR-PRIORITY-20261003-4f4b613ed9d4|R-EXTRUDR-PRIORITY-20261003-8f1f07e586ce)$/, /./, 'mould-shrinkage', 'Mould shrinkage  ISO 294-4'],
];

// The cached text of a document, as the migration's guard reads it (scripts/lib/sweep-shared.mjs onSheet).
const squash = (x) => String(x ?? '').toLowerCase().replace(/℃/g, '°c').replace(/[˚º]/g, '°').replace(/[^a-z0-9°%.,<>≤≥+\-]/g, '');
const shaOf = new Map(db.sources.map((s) => [s.id, s.sha256]));
const docs = new Map();
const doc = (sid) => {
  if (!docs.has(sid)) {
    const c = cachedText(shaOf.get(sid));
    docs.set(sid, c ? c.pages.map((pg) => ({ page: pg.page, text: pg.lines.map((l) => l.text).join(' ') })) : []);
  }
  return docs.get(sid);
};
const pageSaying = (sid, quote) => doc(sid).find((p) => squash(p.text).includes(squash(quote.split(' | ')[0])))?.page ?? null;
// The words as the sheet prints them, of the forms a statement takes (Polymaker's box is letter-spaced on its older sheets).
const asPrinted = (sid, quotes) => quotes.find((q) => doc(sid).some((p) => p.text.replace(/\s+/g, ' ').includes(q))) ?? quotes.find((q) => pageSaying(sid, q));
// The quote and what follows it on its page: a disclaimer's "can vary" may sit after the words a reader quoted. (A
// sentence is judged on the words quoted, which are the sentence.)
const withContext = (sid, quote) => {
  const piece = quote.split(' | ').at(-1).replace(/\s+/g, ' ').trim();
  for (const p of doc(sid)) {
    const text = p.text.replace(/\s+/g, ' ');
    const at = text.indexOf(piece);
    if (at >= 0) return `${quote} ${text.slice(at + piece.length, at + piece.length + 160)}`;
  }
  return quote;
};

// Values the second pass took back: a figure in prose, not a row of the document's tests.
const TAKEN_BACK = new Map([
  ['V007190', 'Raise3D Industrial PET CF\'s description says "tensile modulus and strength of over 6 GPa" after annealing: a claim in prose, not a row of its tests (the error-class sweep read it so, m282)'],
  ['V013950', 'Raise3D Industrial PET GF\'s description says "tensile modulus and srength of over 4.1 GPa" after annealing: a claim in prose, not a row of its tests, as its PET CF twin\'s is (m480)'],
  ['V013958', 'Raise3D Industrial PPS CF\'s description says "heat resistance (HDT 260 °C)": a rounded claim in prose, not a row of its tests, whose HDT table prints 251 °C at 0.45 MPa and 132 °C at 1.8 MPa'],
]);
// Values whose figures are another grade's, found outside their document: Spectrum's PET-G HT100 sheet (and its portfolio's
// HDT) prints Eastman Tritan's moulded-resin figures, as the owner's rulings round found (track T5, D176; the Tritan brochure
// was read, not registered). A resin grade's figures are a counter-indication whatever the sheet leaves unsaid.
const RESIN_GRADE = new Map(['V002845', 'V002846', 'V002847', 'V002848', 'V002849', 'V002850', 'V002852', 'V002853', 'V012391']
  .map((id) => [id, 'Spectrum PET-G HT100 prints Eastman Tritan\'s moulded-resin figures (the owner\'s rulings round, track T5, D176)']));
// Values the materials-science track (T5) typed printed and annealed in m473 on the same sheet's note (D176): its reading
// stands, as a statement in words.
const BY_M473 = new Set(['V013951', 'V013952']);

// Makers that label each row by its own specimen, so that a label speaks for its row alone.
const PER_ROW = /^[SR]-SPECTRUM-/i;
// A disclaimer that values vary with printing conditions, which names no test, specimen or sample.
const DISCLAIMER = /(may|can|might|could) vary|vary (greatly |significantly )?(according|depending|with)|variieren|różnić|for reference and comparison/i;
const ABOUT_SPECIMENS = /specimen|sample|test bar|tested on|probe/i;
// A sentence names the printed part, and the property of the value.
const PRINTED_PART = /printed (part|object|model|element|item|prototype|component|sample)s?|\bprints\b|\bprint retains|parts printed|objects printed|models printed|after (3d )?print|printed as a part|interlayer|inter-layer|layer adhesion|adhesion between( the)? layers|layer bonding|bonding of( the)? layers|lamination of layers|prototype/i;
const PROPERTY_WORDS = {
  strength: /strength|strong/i,
  modulus: /stiff|rigid|modulus/i,
  elongation: /elongat|stretch|elastic|ductil/i,
  impact: /impact|shock|unbreakable|breaking|crack|brittle/i,
  heat: /heat|temperature|thermal|\bHDT\b|softening/i,
  mechanical: /mechanical propert/i,
};
const propertyKind = (p) => (/modulus/i.test(p) ? 'modulus' : /strength/i.test(p) && !/impact|charpy|izod/i.test(p) ? 'strength' : /elongation/i.test(p) ? 'elongation' : /charpy|izod|impact/i.test(p) ? 'impact' : p === 'HDT' ? 'heat' : null);
const sentenceReaches = (quote, property) => {
  // A sentence a reader quoted across two lines (" | ") is one sentence.
  const text = quote.replace(/\s+\|\s+/g, ' ');
  const kind = propertyKind(property);
  if (!PRINTED_PART.test(text) || !kind) return false;
  return PROPERTY_WORDS[kind].test(text) || (kind !== 'heat' && PROPERTY_WORDS.mechanical.test(text)) || (kind === 'heat' && /thermal propert/i.test(text));
};

const verdictOf = (r) => ({ STATED: 'stated', IMPLIED: 'implied', KEEP: r.kind === 'words' ? 'stated' : 'implied' })[r.verdict];
const out = [];
const seen = new Set();
const push = (id, group, sourceId, page, reading, v) => {
  if (seen.has(id)) return;
  seen.add(id);
  const m = mById.get(id);
  out.push({ measurementId: id, group, sourceId, page, property: m?.property ?? '', first: reading, ...v });
};
function classify(id, g, r, round) {
  const m = mById.get(id);
  const counter = COUNTER.find(([s, p]) => s.test(g.sourceId) && p.test(m?.property ?? ''));
  const docRule = DOCUMENT.map(([s, ...qs]) => (s.test(g.sourceId) ? asPrinted(g.sourceId, qs) : null)).find(Boolean);
  const ownLabel = /\(X-Y\)|（X-Y）/.test(m?.locator ?? '') && m?.property === 'HDT';
  const reading = `${round === 2 ? 'second' : 'first'}: ${r.verdict}${r.kind ? `:${r.kind}` : ''}${r.doubt === 'yes' ? ' (doubtful)' : ''}`;
  const quotePage = (q) => Number(r.quotePage) || pageSaying(g.sourceId, q) || g.page;
  let v;
  if (RESIN_GRADE.has(id)) v = { verdict: 'set-apart', kind: 'resin-grade', quote: '', quotePage: '', by: `second pass: ${RESIN_GRADE.get(id)}` };
  else if (BY_M473.has(id)) v = { verdict: 'stated', kind: 'words', quote: 'All testing specimens were printed under the following conditions', quotePage: 2, by: 'm473 (the materials-science track, D176)' };
  else if (TAKEN_BACK.has(id)) v = { verdict: 'set-apart', kind: 'none', quote: '', quotePage: '', by: `second pass: ${TAKEN_BACK.get(id)}` };
  else if (counter) v = { verdict: 'set-apart', kind: counter[2], quote: counter[3], quotePage: quotePage(counter[3]), by: 'second pass' };
  else if (ownLabel) v = { verdict: 'implied', kind: 'own-label', quote: (m.locator.match(/[^:]*\(X-Y\)|[^:]*（X-Y）/) ?? [''])[0].trim(), quotePage: g.page, by: 'second pass' };
  else if (r.verdict === 'COUNTER' && (STRONG.has(r.kind) || round === 2)) v = { verdict: 'set-apart', kind: r.kind === 'typed-table' ? 'typical-table' : r.kind, quote: r.quote, quotePage: quotePage(r.quote), by: round === 2 ? 'second reading' : 'first read' };
  else if (verdictOf(r) && r.kind === 'labels' && PER_ROW.test(g.sourceId)) v = { verdict: 'set-apart', kind: 'none', quote: '', quotePage: '', by: 'second pass: Spectrum labels its rows one by one ("injection moulding" on others of a table), so another row\'s label speaks for that row only' };
  else if (verdictOf(r)) {
    const text = round === 2 && ['document', 'sentence'].includes(r.kind) ? withContext(g.sourceId, r.quote) : r.quote;
    if (round === 2 && ['document', 'sentence'].includes(r.kind) && DISCLAIMER.test(text) && !ABOUT_SPECIMENS.test(text)) {
      v = { verdict: 'set-apart', kind: 'none', quote: '', quotePage: '', by: 'second pass: a disclaimer that values vary with printing conditions names no test, specimen or property' };
    } else if (round === 2 && r.kind === 'sentence' && !sentenceReaches(r.quote, m?.property ?? '')) {
      v = { verdict: 'set-apart', kind: 'none', quote: '', quotePage: '', by: 'second pass: the sentence does not name this value\'s property on the printed part' };
    } else {
      v = { verdict: verdictOf(r), kind: r.kind, quote: r.quote, quotePage: quotePage(r.quote), by: round === 2 ? 'second reading' : 'first read' };
    }
  } else if (docRule) v = { verdict: 'implied', kind: 'document', quote: docRule, quotePage: pageSaying(g.sourceId, docRule), by: 'second pass' };
  else v = { verdict: 'set-apart', kind: 'none', quote: '', quotePage: '', by: round === 2 ? 'second reading' : r.verdict === 'COUNTER' ? 'second pass (melt flow is no counter; nothing indicates)' : 'first read' };
  return { reading, v, doubt: r.doubt === 'yes' ? 'yes' : 'no' };
}
// Values recorded after both readings, set apart by the table they sit in (m484: the review of T1, F3).
const LATER = [['V015699', 'S-PVB-269cd3c8-prusament-pla-hs-technical-datasheet', 2, 'typical-table', 'Typical material properties', 'second pass: m484 recorded it; its table is the sheet\'s "Typical material properties", set apart from its printed specimens\' table as the sheet\'s other heat row is']];
for (const [id, sourceId, page, kind, quote, by] of LATER) push(id, 'm484', sourceId, page, 'not read', { verdict: 'set-apart', kind, quote, quotePage: page, by, doubt: 'no' });
// The second reading first: its verdicts replace the first's for every value it read.
for (const [id, r] of second) {
  const g = groups2.get(r.group);
  const { reading, v, doubt } = classify(id, g, r, 2);
  push(id, r.group, g.sourceId, g.page, reading, { ...v, doubt });
}
for (const r of first) {
  const g = groups1.get(r.group);
  for (const id of r.ids.split(/;\s*/).filter(Boolean)) {
    const { reading, v } = classify(id, g, r, 1);
    push(id, r.group, g.sourceId, g.page, reading, { ...v, doubt: 'no' });
  }
}
out.sort((a, b) => (a.measurementId < b.measurementId ? -1 : 1));
const esc = (x) => `"${String(x ?? '').replace(/"/g, '""')}"`;
const cols = ['measurementId', 'group', 'sourceId', 'page', 'property', 'first', 'verdict', 'kind', 'quote', 'quotePage', 'by', 'doubt'];
writeFileSync(join(here, 'classification.csv'), `${cols.join(',')}\n${out.map((o) => cols.map((c) => esc(o[c])).join(',')).join('\n')}\n`);
const t = {};
for (const o of out) t[`${o.verdict} ${o.kind}`] = (t[`${o.verdict} ${o.kind}`] ?? 0) + 1;
console.log(out.length, 'values;', out.filter((o) => o.verdict !== 'set-apart').length, 'indicated');
console.log(Object.entries(t).sort().map(([k, n]) => `${String(n).padStart(5)} ${k}`).join('\n'));
