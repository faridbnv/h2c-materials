#!/usr/bin/env node
// The fields a written summary of a material can fill (D142), each with the value the build would put in its place, and
// those it cannot fill with the reason: what a writer may name as a number, and nothing else.
//
//   npm run pages:fields -- M020            PETG's fields, as text
//   npm run pages:fields -- M020 --json     the same as JSON
//
// It asks build/src/written.js, the build's own fill, of every field, so what it lists is what the build will accept and
// what it refuses is a SUMMARY-PLACEHOLDER error. Values are shown as the page prints them (format.js fmtNumber); the
// parts the build stores keep the raw number. It reads dist/db.json (built first where it is stale) and writes nothing.

import { fillField, fillContext, indexForFill, COUNT_FIELDS, HEADLINE_PARTS } from '../../build/src/written.js';
import { fmtNumber } from '../../app/js/ui/format.js';
import { pageOf } from '../../app/js/ui/page-rule.js';
import { loadDb } from './lib.mjs';

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
if (!id) { console.error('Name a material: npm run pages:fields -- M020'); process.exit(2); }
const db = loadDb({ quiet: true });
const m = db.materials.find((x) => x.id === id);
if (!m) { console.error(`${id}: no such material.`); process.exit(2); }
if (m.familyEntry) { console.error(`${id} (${m.name}) is a family entry: it has no page and no summary.`); process.exit(2); }

const fc = fillContext(m, indexForFill(db), db.registry);
const shown = (parts) => parts.map((p) => (p.field ? `${p.bound ? `${p.bound} ` : ''}${fmtNumber(p.value)}${p.unit ? ` ${p.unit}` : ''}` : p.text)).join('');
const ask = (field) => { const r = fillField(field, fc); return r.refused ? { field, refused: r.refused } : { field, shows: shown(r.parts) }; };

const out = {
  material: m.id, name: m.name, release: db.meta.release?.id ?? null, page: pageOf(m, db.measurements.filter((x) => x.materialId === m.id)),
  fields: [...COUNT_FIELDS, 'name'].map(ask),
  headlines: db.registry.headlines.map((h) => {
    const parts = HEADLINE_PARTS.map((p) => ask(`${h.key}.${p}`));
    return { key: h.key, label: h.labels.plain, fillable: parts.filter((p) => !p.refused), refused: parts.filter((p) => p.refused) };
  }),
};

if (args.includes('--json')) {
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log(`${m.name} (${m.id}): the fields its summary can fill, from release ${out.release}${out.page ? '' : '. It has no page, so it takes no summary'}.`);
  console.log('Write a number only as one of these placeholders; the build fills it.\n');
  for (const f of out.fields) console.log(`  {${f.field}}`.padEnd(34) + (f.refused ?? f.shows));
  for (const h of out.headlines) {
    console.log(`\n${h.label} (${h.key})`);
    for (const f of h.fillable) console.log(`  {${f.field}}`.padEnd(34) + f.shows);
    // One line for what it cannot fill, its reason once: the same reason holds every refused part but the quartiles.
    const reasons = [...new Set(h.refused.map((f) => f.refused.replace(/^\{[^}]+\}:?\s*/, '')))];
    if (h.refused.length) console.log(`  not fillable: ${h.refused.map((f) => `.${f.field.split('.')[1]}`).join(' ')} (${reasons.join('; ')})`);
  }
}
