#!/usr/bin/env node
// The judgement calls of the filament indication (D172) for the owner: every value a reader of the second reading marked
// doubtful, and every value the executor's second pass decided against a reader, grouped by the call, with the decision
// taken and why. Reads classification.csv (classify.mjs) and dist/db.json; writes DOUBTFUL.md and doubtful.csv.
//
//   node docs/audits/2026-10-20-owner-rulings/evidence/doubtful.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../../../../build/src/csv.js';
import { generatedMark } from '../../../../scripts/lib/generated-mark.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../..');
const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
const mById = new Map(db.measurements.map((m) => [m.id, m]));
const gById = new Map(db.grades.map((g) => [g.id, g]));
const sById = new Map(db.sources.map((s) => [s.id, s]));
const rows = readCsv(join(here, 'classification.csv')).records.map((r) => r.values);

// The calls, in the order the owner would weigh them, each with its decision and the reason.
const CALLS = [
  { key: 'disclaimer', test: (r) => /disclaimer/.test(r.by),
    title: 'A disclaimer that values vary with printing conditions', decision: 'Set apart.',
    why: 'The readers kept these under "when in doubt with any indication, keep". The sentence ("Actual values may vary according to printing conditions, model complexity, environmental conditions") names no test, specimen or property: it is written for the user\'s prints, and Spectrum prints the same sentence on sheets whose rows it labels "injection moulding". If the owner reads it as an implicit indication, every value below would decide.' },
  { key: 'sentence-not', test: (r) => /sentence does not/.test(r.by),
    title: 'A sentence that does not name this value\'s property on the printed part', decision: 'Set apart.',
    why: 'A reader kept the value on a sentence about printed parts or layer adhesion; the sentence does not name the value\'s property ("excellent interlayer adhesion" for a modulus, "printed parts are strong" for an elongation). Fillamentum NonOilen\'s "great temperature resistance after 3D printing" is the executor\'s example of a sentence that does: it names the property and the printed part.' },
  { key: 'sentence', test: (r) => r.kind === 'sentence' && r.verdict !== 'set-apart',
    title: 'A sentence that names the value\'s property on the printed part', decision: 'Kept.',
    why: 'The owner\'s "even an implicit indication": the maker ties the property to what is printed ("printed parts are strong", "prints that are resistant to high temperatures", "improve the strength and shock resistance of the prototype"). Most are marketing sentences; the owner may want only those that speak of the tested bars.' },
  { key: 'labels-other-table', test: (r) => r.kind === 'labels' && r.doubt === 'yes' && r.verdict !== 'set-apart',
    title: 'Print orientations labelled in another table of the page, or a list the reader was unsure was one table', decision: 'Kept.',
    why: 'An orientation-labelled table on the same page is an implicit indication that the maker tests printed bars; kept under "when in doubt with any indication present, keep" (CreatBot\'s Physical table beside its XY/Z Mechanical one, Siraya\'s "Other Properties").' },
  { key: 'document-doubt', test: (r) => ['document', 'settings', 'words', 'other-document'].includes(r.kind) && r.doubt === 'yes' && r.verdict !== 'set-apart',
    title: 'A statement about the test specimens whose reach is unclear', decision: 'Kept.',
    why: 'A statement about how the document\'s specimens were made or tested, whose scope the page leaves open (Nanovia\'s "Test performed … on 3D printed test specimens" under its tensile rows reaching the flexural and impact rows of the same list; Polymaker\'s "All specimens were conditioned … prior to testing" beside its printed test bars, reaching its heat deflection page; print settings given for "Tensiletest Impacttest" reaching flexural and heat values).' },
  { key: 'counter-doubt', test: (r) => r.verdict === 'set-apart' && r.doubt === 'yes' && !['none', ''].includes(r.kind),
    title: 'A counter-indication about the same table, beside an indication', decision: 'Set apart.',
    why: 'A mould shrinkage row with a value (ISO 294-4, ASTM D955, DIN 16742), "injection moulding" on rows of the same table, or a table the document calls typical beside its printed one, wins over an indication in the same table, as the executor\'s rubric says. SUNLU\'s sheets that print a valued "Mold Shrinkage ISO294" beside rows labelled X-Y are here; those whose row is blank ("/") are kept. A row\'s own orientation label still speaks for its own value.' },
  { key: 'none-doubt', test: (r) => r.verdict === 'set-apart' && r.doubt === 'yes' && ['none', ''].includes(r.kind),
    title: 'Nothing found, with the reader unsure', decision: 'Set apart.',
    why: 'The reader found no indication but was unsure (text cut or garbled, a scoped footnote such as IPCON\'s, a weak sentence it did not count).' },
];
const out = [];
for (const r of rows) {
  const call = CALLS.find((c) => c.test(r));
  if (!call) continue;
  const m = mById.get(r.measurementId);
  const g = gById.get(m?.gradeId);
  out.push({ call: call.key, measurementId: r.measurementId, product: g ? `${g.manufacturer} ${g.product}` : '', gradeId: m?.gradeId ?? '', property: r.property, value: m ? `${m.value} ${m.unit}` : '', sourceId: r.sourceId, group: r.group, decision: r.verdict === 'set-apart' ? 'set apart' : 'kept', reading: r.first, quote: r.quote });
}
const esc = (x) => `"${String(x ?? '').replace(/"/g, '""')}"`;
const cols = ['call', 'measurementId', 'product', 'gradeId', 'property', 'value', 'sourceId', 'group', 'decision', 'reading', 'quote'];
writeFileSync(join(here, 'doubtful.csv'), `${cols.join(',')}\n${out.map((o) => cols.map((c) => esc(o[c])).join(',')).join('\n')}\n`);

const L = ['# The filament indication\'s judgement calls, for the owner', '', generatedMark('node docs/audits/2026-10-20-owner-rulings/evidence/doubtful.mjs', '2026-10-20'), '',
  '> **In short.** The second reading (the review of T1, F1) read every value the first left set apart under the owner\'s',
  '> "EVEN an implicit indication". Its readers marked the calls they were unsure of, and the executor\'s second pass',
  '> (`classify.mjs`) decided two kinds against them. Each call below says what was decided and why, and lists the',
  '> products it reaches; every value is in [doubtful.csv](doubtful.csv). A call the owner reverses is one rule in',
  '> `classify.mjs` and a rerun of m483.', ''];
L.push('| Call | Decision | Values | Products |', '|---|---|---:|---:|');
for (const c of CALLS) {
  const xs = out.filter((o) => o.call === c.key);
  if (xs.length) L.push(`| ${c.title} | ${c.decision} | ${xs.length} | ${new Set(xs.map((o) => o.gradeId)).size} |`);
}
for (const c of CALLS) {
  const xs = out.filter((o) => o.call === c.key);
  if (!xs.length) continue;
  L.push('', `## ${c.title}`, '', `**${c.decision}** ${c.why}`, '');
  const byProduct = new Map();
  for (const o of xs) { const k = `${o.product} (${o.gradeId})`; if (!byProduct.has(k)) byProduct.set(k, []); byProduct.get(k).push(`${o.property} ${o.value}`); }
  const pub = new Map();
  for (const o of xs) { const p = sById.get(o.sourceId)?.publisher ?? '?'; pub.set(p, (pub.get(p) ?? 0) + 1); }
  L.push(`By publisher: ${[...pub].sort((a, b) => b[1] - a[1]).map(([p, n]) => `${p} ${n}`).join(', ')}.`, '');
  for (const [k, vs] of [...byProduct].sort()) L.push(`- ${k}: ${vs.join('; ')}`);
}
writeFileSync(join(here, 'DOUBTFUL.md'), `${L.join('\n')}\n`);
console.log(out.length, 'values in', new Set(out.map((o) => o.call)).size, 'calls');
