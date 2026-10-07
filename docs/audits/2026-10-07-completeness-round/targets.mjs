#!/usr/bin/env node
// Completeness round 2026-10-07: freeze what items 1, 2 and 5 read, from the tables, the compiled database, the record
// tier and the detectors run in phase 0 (baseline/detectors/, recall/), before anything is read. Writes TARGETS-<item>.csv
// beside it and read/DOCS-1.csv, the documents item 1 reads with the leads on each. Run from the repository root after a
// build:
//
//   node docs/audits/2026-10-07-completeness-round/targets.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { readCsv } from '../../../build/src/csv.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../..');
const rows = (p) => readCsv(join(ROOT, p)).records.map((r) => r.values);
const q = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const write = (name, header, list) => {
  writeFileSync(join(HERE, name), [header.join(','), ...list.map((r) => header.map((h) => q(r[h])).join(','))].join('\n') + '\n');
  console.log(`${name}: ${list.length}`);
};
// A seeded draw: the same seed gives the same sample.
const draw = (list, n, seed) => {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  return [...list].map((x) => [rnd(), x]).sort((a, b) => a[0] - b[0]).slice(0, n).map(([, x]) => x);
};

const db = JSON.parse(readFileSync(join(ROOT, 'dist/db.json'), 'utf8'));
const meas = rows('data/tables/measurements.csv');
const profs = rows('data/tables/profiles.csv');
const grades = new Map(rows('data/tables/grades.csv').map((r) => [r.GradeID, r]));
const sources = new Map(rows('data/tables/sources.csv').map((r) => [r.SourceID, r]));
const cgrades = new Map(db.grades.map((g) => [g.id, g]));
const fileOf = (sha) => ['pdf', 'html', 'htm', 'txt'].map((e) => `.cache/sources/by-sha/${sha}.${e}`).find((f) => existsSync(join(ROOT, f))) ?? '';
const gids = (s) => [...String(s ?? '').matchAll(/G\d{3}-\d+\b(?!-R)/g)].map((m) => m[0]);
const own = (g) => { const x = grades.get(g); return x && x.Status === 'active' && x.Role === 'procurement'; };
const productOf = (g) => { const x = grades.get(g); return x ? `${x.Manufacturer} ${x['Product name'] ?? x.Product ?? ''}`.trim() : ''; };
const live = (m) => !/^Retired/.test(m['Data status']) && !/Unresolved/.test(m['Data status']);

// ---- Item 1: values a held sheet prints that no row of it holds.
const HEADLINE_OF = {
  Density: 'density', 'Tensile modulus': 'tensileModulusXY', 'Tensile strength (endpoint unspecified)': 'tensileStrengthXY',
  'Tensile yield strength': 'tensileStrengthXY', 'Tensile break strength': 'tensileStrengthXY', 'Elongation at break': 'elongationXY',
  'Charpy strength': 'charpyNotched', 'Izod impact strength': 'izodNotched', HDT: 'hdt045', 'Glass transition temperature': 'glassTransition',
};
// The products a source speaks for: the grades filed on it, the grades its rows are on, and its Applicable grades.
const speaksFor = new Map();
const add = (sid, g) => { if (own(g)) (speaksFor.get(sid) ?? speaksFor.set(sid, new Set()).get(sid)).add(g); };
for (const [g, x] of grades) add(x.SourceID, g);
for (const m of meas) if (live(m)) add(m.SourceID, m.GradeID);
for (const p of profs) add(p.SourceID, p.GradeID);
for (const [sid, s] of sources) for (const g of gids(s['Applicable grades'])) add(sid, g);
// A product's makers' data sheets that hold rows: a product page or guide is read for values only where it is the
// product's only document of that kind (the m397 rule); a safety data sheet never, a resin supplier's sheet only as the
// moulded value it is, so never for a product's printed value.
const tdsWithRows = new Map();
for (const m of meas) if (live(m) && sources.get(m.SourceID)?.['Source class'] === 'Manufacturer TDS') (tdsWithRows.get(m.GradeID) ?? tdsWithRows.set(m.GradeID, new Set()).get(m.GradeID)).add(m.SourceID);
const kindOk = (sid) => {
  const cls = sources.get(sid)?.['Source class'];
  if (cls === 'Manufacturer TDS') return 'tds';
  if (cls === 'Manufacturer product page or guide') return [...(speaksFor.get(sid) ?? [])].every((g) => !tdsWithRows.get(g)?.size) ? 'page' : '';
  return '';
};
// A number the source already holds as a retired copy or an unresolved row is not new (2026-10-04: 144 and 23).
const numbers = (s) => [...String(s ?? '').matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => Number(m[0].replace(',', '.')));
const heldBack = new Map();
for (const m of meas) if (!live(m)) for (const n of numbers(m['Raw value'])) heldBack.set(`${m.SourceID}|${n}`, m.MeasurementID);
// A skipped line whose number a live row of the source already holds, under any property of the same headline, was read
// from another line or another batch.
const heldLive = new Set();
const familyOf = (p) => HEADLINE_OF[p]?.replace(/XY$|Z$/, '') ?? p;
for (const m of meas) if (live(m)) for (const n of numbers(m['Raw value'])) heldLive.add(`${m.SourceID}|${familyOf(m.Property)}|${n}`);
const sqlite = new DatabaseSync(join(ROOT, 'dist/h2c.sqlite'), { readOnly: true });
const leads = [];
for (const c of rows('docs/audits/2026-10-07-completeness-round/recall/candidates.csv').filter((r) => r.kind === 'value')) {
  leads.push({ SourceID: c.source_id, SHA256: c.sha, page: Number(c.page), property: c['field/property'], raw: c['raw value'], line: c['evidence line'], from: 'recall' });
}
for (const f of sqlite.prepare("select sourceid, sha256, page, text, reason, property from source_facts where kind = 'skipped' and property is not null and sourceid is not null").all()) {
  if (/publishes no value|no property and value/.test(f.reason)) continue;
  leads.push({ SourceID: f.sourceid, SHA256: f.sha256, page: f.page, property: f.property, raw: '', line: f.text, from: 'source_facts' });
}
const seen = new Set();
const t1 = [];
for (const l of leads) {
  const key = `${l.SourceID}|${l.page}|${l.property}|${l.line}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const kind = kindOk(l.SourceID);
  if (!kind) continue;
  const products = [...(speaksFor.get(l.SourceID) ?? [])];
  if (!products.length) continue;
  const n = numbers(l.raw || l.line);
  const back = n.map((x) => heldBack.get(`${l.SourceID}|${x}`)).find(Boolean);
  if (back) continue;
  const valueNumbers = l.raw ? n : n.filter((x) => !/^(527|178|179|180|75|1183|792|638|790|256|648|3418|11357|1133|306|37|2240|868|4812|882|9341|1040)$/.test(String(x)));
  if (valueNumbers.length && valueNumbers.every((x) => heldLive.has(`${l.SourceID}|${familyOf(l.property)}|${x}`))) continue;
  if (!valueNumbers.length || /\bTBD\b|\bN\/?A\b|no break|did not break|\bNB\b/i.test(l.line) && !l.raw) continue;
  const hk = HEADLINE_OF[l.property];
  const gaps = hk ? products.filter((g) => !cgrades.get(g)?.headline?.[hk]) : [];
  const tier = gaps.length ? 'T1' : hk ? 'T2' : 'T3';
  t1.push({ ...l, kind, products: products.join(' '), gaps: gaps.join(' '), headline: hk ?? '', tier, file: fileOf(l.SHA256) });
}
const t2 = t1.filter((l) => l.tier === 'T2'), t3 = t1.filter((l) => l.tier === 'T3');
const t2s = new Set(draw(t2, 80, 20261008)), t3s = new Set(draw(t3, 80, 20261009));
for (const l of t1) l.read = l.tier === 'T1' || t2s.has(l) || t3s.has(l) ? 'yes' : 'no';
write('TARGETS-1.csv', ['tier', 'read', 'SourceID', 'kind', 'page', 'property', 'headline', 'raw', 'line', 'products', 'gaps', 'from', 'SHA256', 'file'], t1);
const docs = new Map();
for (const l of t1.filter((x) => x.read === 'yes')) {
  const d = docs.get(l.SourceID) ?? docs.set(l.SourceID, { SourceID: l.SourceID, SHA256: l.SHA256, file: l.file, kind: l.kind, products: l.products, pages: new Set(), leads: [], tiers: new Set() }).get(l.SourceID);
  d.pages.add(l.page); d.tiers.add(l.tier); d.leads.push(`p${l.page} ${l.property}${l.raw ? ` ${l.raw}` : ''}`);
}
write('read/DOCS-1.csv', ['SourceID', 'SHA256', 'file', 'kind', 'tiers', 'products', 'productNames', 'pages', 'leads'], [...docs.values()].map((d) => ({ ...d, tiers: [...d.tiers].sort().join(' '), productNames: d.products.split(' ').map(productOf).join(' | '), pages: [...d.pages].sort((a, b) => a - b).join(' '), leads: d.leads.join('; ') })));
console.log('item 1 by tier:', Object.fromEntries(['T1', 'T2', 'T3'].map((t) => [t, `${t1.filter((l) => l.tier === t).length} leads, ${t1.filter((l) => l.tier === t && l.read === 'yes').length} read`])), `on ${docs.size} documents`);

// ---- Item 2: sources whose rows sit on more than one product, and grade pairs the detector cannot settle by name.
const D = 'docs/audits/2026-10-07-completeness-round/baseline/detectors/';
const split = rows(D + 'split-sources.csv').filter((r) => !/portfolio or comparison table|^P-FATIGUE$/.test(`${r.Suggestion}`) && r.SourceID !== 'P-FATIGUE');
const pairs = rows(D + 'grade-pairs.csv').filter((r) => r.SameKey !== 'yes' && !/GRADE-VALUES-TWIN accepted/.test(r.Reason) && (/^same-product|^twin \(one sheet|same name, different values/.test(r.Verdict)));
write('TARGETS-2.csv', ['kind', 'record', 'pair', 'products', 'detail'], [
  ...split.map((r) => ({ kind: 'split-source', record: r.SourceID, pair: '', products: `${r.MainGrade}; ${r.OtherGrades}`, detail: r.Suggestion })),
  ...pairs.map((r) => ({ kind: 'grade-pair', record: r.GradeA, pair: r.GradeB, products: `${r.ProductA} | ${r.ProductB}`, detail: `${r.Verdict}: ${r.Reason}` })),
]);

// ---- Item 5: held sources without text, and flagged pages of documents that back rows.
const manifest = rows(D + 'source-manifest.csv').filter((r) => r.Registered === 'TRUE');
const backs = new Map();
for (const m of meas) if (live(m)) backs.set(m.SourceID, (backs.get(m.SourceID) ?? 0) + 1);
const backsP = new Map();
for (const p of profs) if (!/Retired/.test(p.Profile ?? '')) backsP.set(p.SourceID, (backsP.get(p.SourceID) ?? 0) + 1);
const noText = manifest.filter((r) => r.Text !== 'cached').map((r) => ({
  SourceID: r.SourceID, class: sources.get(r.SourceID)?.['Source class'] ?? '', bytes: r.Bytes, text: r.Text, measurements: backs.get(r.SourceID) ?? 0, profiles: backsP.get(r.SourceID) ?? 0,
  group: r.Bytes === 'present' ? 'bytes present, text never extracted' : r.Bytes === 'absent' ? 'bytes absent' : r.Bytes === 'mismatch' ? 'hash mismatch' : 'no SHA-256',
}));
const flagged = [];
const bySha = new Map([...sources.values()].filter((s) => /^[0-9a-f]{64}$/.test(s.SHA256)).map((s) => [s.SHA256, s.SourceID]));
for (const [sha, sid] of bySha) {
  const f = join(ROOT, '.cache/quality', `${sha}.json`);
  if (!existsSync(f) || !((backs.get(sid) ?? 0) + (backsP.get(sid) ?? 0))) continue;
  const qd = JSON.parse(readFileSync(f, 'utf8'));
  for (const p of qd.pages ?? []) {
    const bad = (p.flags ?? []).filter((x) => x !== 'label-no-number');
    if (!bad.length) continue;
    const ocr = existsSync(join(ROOT, '.cache/ocr-text', `${sha}.json`)) && (JSON.parse(readFileSync(join(ROOT, '.cache/ocr-text', `${sha}.json`), 'utf8')).pages ?? []).some((x) => x.page === p.page || x.n === p.page);
    flagged.push({ SourceID: sid, class: sources.get(sid)?.['Source class'] ?? '', bytes: 'present', text: `page ${p.page}: ${bad.join(' ')}`, measurements: backs.get(sid) ?? 0, profiles: backsP.get(sid) ?? 0, group: ocr ? 'flagged page, optical reading held' : 'flagged page, no optical reading', sha });
  }
}
write('TARGETS-5.csv', ['group', 'SourceID', 'class', 'bytes', 'text', 'measurements', 'profiles', 'sha'], [...noText, ...flagged]);
const count = (list) => Object.entries(list.reduce((o, r) => ({ ...o, [r.group]: (o[r.group] ?? 0) + 1 }), {})).map(([k, v]) => `${k} ${v}`).join('; ');
console.log('item 5:', count(noText), '|', count(flagged), `| sources without text that back rows: ${noText.filter((r) => r.measurements + r.profiles).length}`);
