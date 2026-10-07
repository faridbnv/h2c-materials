#!/usr/bin/env node
// Quality round 2026-10-07: freeze what each item reads, from the tables, the compiled database and the earlier rounds'
// files, before anything is read. Writes TARGETS-<item>.csv beside it and read/queue.csv, the one reading queue grouped
// by document. Run from the repository root after a build:
//
//   node docs/audits/2026-10-07-quality-round/targets.mjs
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
const meas = new Map(rows('data/tables/measurements.csv').map((r) => [r.MeasurementID, r]));
const profs = new Map(rows('data/tables/profiles.csv').map((r) => [r.ProfileID, r]));
const grades = new Map(rows('data/tables/grades.csv').map((r) => [r.GradeID, r]));
const sources = new Map(rows('data/tables/sources.csv').map((r) => [r.SourceID, r]));
const compiled = new Map(db.measurements.map((m) => [m.id, m]));
const cgrades = new Map(db.grades.map((g) => [g.id, g]));
const fileOf = (sha) => ['pdf', 'html', 'htm', 'txt'].map((e) => `.cache/sources/by-sha/${sha}.${e}`).find((f) => existsSync(join(ROOT, f))) ?? '';
const pageOf = (locator) => Number(/\bp\.?\s*(\d+)/i.exec(String(locator ?? ''))?.[1] ?? 1);
const productOf = (gradeId) => { const g = grades.get(gradeId); return g ? `${g.Manufacturer} ${g['Product name'] ?? g.Product ?? ''}`.trim() : ''; };

// What decides: a product's value (any active product's headline), a record the leverage census says can turn an answer,
// or a record check round 3 froze as a target.
const productValue = new Set(db.grades.filter((g) => !g.retired).flatMap((g) => Object.values(g.headline ?? {}).map((v) => v?.measurementId).filter(Boolean)));
const leverageYes = new Set(rows('build/reports/leverage/leverage.csv').filter((r) => r.Leverage === 'yes').map((r) => r.Record));
const targets3 = new Set(rows('docs/audits/2026-10-05-check-round-3/TARGETS.csv').map((r) => r.Record));
const read3 = new Set(rows('docs/audits/2026-10-05-check-round-3/read/queue.csv').map((r) => r.Record));
const decides = (id) => leverageYes.has(id) ? 'yes' : productValue.has(id) || targets3.has(id) ? 'value' : 'no';

const queue = [];
let n = 0;
const task = (item, kind, t) => {
  const rec = t.Table === 'profiles' ? profs.get(t.Record) : meas.get(t.Record);
  const sourceId = t.SourceID ?? rec?.SourceID ?? '';
  const sha = t.SHA256 ?? sources.get(sourceId)?.SHA256 ?? '';
  queue.push({
    Task: `T${String(++n).padStart(5, '0')}`, Item: item, Kind: kind, Table: t.Table ?? 'measurements', Record: t.Record ?? '', PairRecord: t.PairRecord ?? '',
    Field: t.Field ?? rec?.Property ?? '', GradeID: t.GradeID ?? rec?.GradeID ?? '', Product: productOf(t.GradeID ?? rec?.GradeID),
    SourceID: sourceId, SHA256: sha, File: t.File ?? fileOf(sha), Page: t.Page ?? pageOf(rec?.Locator), Locator: t.Locator ?? rec?.Locator ?? '',
    Held: t.Held ?? (rec ? `${rec['Raw value']}${rec.Notch && !/^Not /.test(rec.Notch) ? ` · ${rec.Notch}` : ''}${rec.Direction && !/^Not /.test(rec.Direction) ? ` · ${rec.Direction}` : ''} · specimen: ${rec['Specimen type']}` : ''),
    Question: t.Question ?? '', Leverage: t.Leverage ?? decides(t.Record ?? ''), Tier: t.Tier ?? '',
  });
};

// ---- Item 1: a product's value that repeats a moulded bar's number, compared on the raw interval too.
const raw = (m) => [m['Raw value'], m['Normalized upper bound'], m.Operator, m['Normalized uncertainty ±']].join('|');
const live = (m) => !/^Retired/.test(m['Data status']) && !/Unresolved/.test(m['Data status']);
const key = (g) => { const k = grades.get(g)?.['Shared formulation key']; return k && !/^Not /.test(k) ? k : g; };
const same = (a, b) => ['Property', 'Normalized value', 'Normalized unit', 'Notch', 'Direction'].every((c) => a[c] === b[c]);
const i1 = [];
for (const g of db.grades.filter((x) => !x.retired)) {
  for (const [hk, v] of Object.entries(g.headline ?? {})) {
    const x = v?.measurementId && meas.get(v.measurementId);
    if (!x || !/^Not published/.test(x['Specimen type'])) continue;
    const stay = [...meas.values()].find((y) => y !== x && live(y) && y['Specimen type'] === 'Raw material value' && key(y.GradeID) === key(x.GradeID) && same(x, y));
    if (stay && !i1.some((r) => r.copy === x.MeasurementID)) i1.push({ headline: hk, product: g.id, copy: x.MeasurementID, stay: stay.MeasurementID, rawCopy: x['Raw value'], rawStay: stay['Raw value'], sameRaw: raw(x) === raw(stay) ? 'yes' : 'no', sameGrade: x.GradeID === stay.GradeID ? 'yes' : 'twin', copySource: x.SourceID, staySource: stay.SourceID });
  }
}
// m393's twenty, read again: its rule compared the normalized value only.
const m393 = [...readFileSync(join(ROOT, 'scripts/migrate/m393-impact-copies-of-moulded-values.mjs'), 'utf8').matchAll(/\['(V\d+)', '(V\d+)'\]/g)].map((x) => [x[1], x[2]]);
for (const [c, s] of m393) {
  const x = meas.get(c), y = meas.get(s);
  i1.push({ headline: 'm393', product: x.GradeID, copy: c, stay: s, rawCopy: x['Raw value'], rawStay: y['Raw value'], sameRaw: raw({ ...x, Operator: y.Operator }) === raw(y) ? 'yes' : 'no', sameGrade: x.GradeID === y.GradeID ? 'yes' : 'twin', copySource: x.SourceID, staySource: y.SourceID });
}
write('TARGETS-1.csv', ['headline', 'product', 'copy', 'stay', 'rawCopy', 'rawStay', 'sameRaw', 'sameGrade', 'copySource', 'staySource'], i1);
for (const r of i1) {
  const stay = meas.get(r.stay);
  task(1, 'copy-pair', { Record: r.copy, PairRecord: r.stay, Leverage: r.headline === 'm393' ? 'recheck' : 'value',
    Question: `Does the copy's page print exactly "${r.rawCopy}" for this product, as a point or a range? The record that stays (${r.stay}) is on ${r.staySource} p. ${pageOf(stay.Locator)} ("${stay.Locator}"), printed "${r.rawStay}", filed as a moulded bar (Raw material value): is that the same value, does its moulded statement cover this table, and does the copy's own page say anything about how its bar was made?` });
}

// ---- Item 2: numbers a text layer prints and the optical reading does not find, and records on garbled pages.
const suspects = rows('docs/audits/2026-10-05-gap-round-2/digits/suspects.csv');
const byRecord = new Map();
for (const s of suspects) (byRecord.get(s.record) ?? byRecord.set(s.record, []).get(s.record)).push(s);
const i2 = [...byRecord].map(([id, list]) => ({ record: id, table: list[0].table, SourceID: list[0].SourceID, SHA256: list[0].SHA256, page: list[0].page, fields: [...new Set(list.map((s) => s.field))].join('; '), numbers: list.map((s) => s.number).join('; '), decides: decides(id) }));
const tier2 = (r) => (r.decides === 'yes' ? '1' : r.decides === 'value' ? '1b' : '3');
const rest3 = draw(i2.filter((r) => tier2(r) === '3'), 80, 20261007);
const read2 = [...i2.filter((r) => tier2(r) !== '3'), ...rest3];
// Garbled pages: deciding records on a flagged page that no earlier round read on its image.
const garbled = rows('docs/audits/2026-10-04-reader-round/text-quality/pages.csv').filter((p) => p.flags !== 'label-no-number');
const gkey = new Set(garbled.map((p) => `${p.source_id}|${p.page}`));
const onGarbled = [...meas.values(), ...[...profs.values()].map((p) => ({ ...p, MeasurementID: p.ProfileID, __profile: true }))]
  .filter((r) => gkey.has(`${r.SourceID}|${pageOf(r.Locator)}`) && decides(r.MeasurementID) !== 'no' && !read3.has(r.MeasurementID) && !byRecord.has(r.MeasurementID) && live({ 'Data status': r['Data status'] ?? 'Published value' }));
write('TARGETS-2.csv', ['record', 'table', 'SourceID', 'SHA256', 'page', 'fields', 'numbers', 'decides', 'tier'], [...i2.map((r) => ({ ...r, tier: tier2(r) === '3' && !rest3.includes(r) ? '3-unsampled' : tier2(r) })), ...onGarbled.map((r) => ({ record: r.MeasurementID, table: r.__profile ? 'profiles' : 'measurements', SourceID: r.SourceID, page: pageOf(r.Locator), decides: decides(r.MeasurementID), tier: 'garbled' }))]);
for (const r of read2) task(2, 'value-check', { Table: r.table, Record: r.record, Page: r.page, Tier: tier2(r), Question: `The text layer prints ${r.numbers} for ${r.fields}; the optical reading did not find it. Judge the value from the page image.` });
for (const r of onGarbled) task(2, 'value-check', { Table: r.__profile ? 'profiles' : 'measurements', Record: r.MeasurementID, Tier: 'garbled', Question: 'This page\'s text layer is flagged garbled. Judge the held value from the page image.' });

// ---- Item 4: values far from their material's typical one (|z| > 3) that the 200-value sweep did not reach.
const sqlite = new DatabaseSync(join(ROOT, 'dist/h2c.sqlite'), { readOnly: true });
const swept = new Set(rows('docs/audits/2026-09-18-v2-import/sweep/sweep-200.csv').map((r) => r.measurementid));
const far = sqlite.prepare('select measurementid, materialid, material, gradeid, property, value, unit, median, z from v_measurement_z where abs(z) > 3 order by abs(z) desc').all()
  .filter((r) => !swept.has(r.measurementid) && meas.has(r.measurementid) && live(meas.get(r.measurementid)));
const far1 = far.filter((r) => decides(r.measurementid) !== 'no');
const far2 = draw(far.filter((r) => decides(r.measurementid) === 'no'), 80, 20261008);
write('TARGETS-4.csv', ['measurementid', 'materialid', 'material', 'gradeid', 'property', 'value', 'unit', 'median', 'z', 'tier'],
  far.map((r) => ({ ...r, tier: far1.includes(r) ? '1' : far2.includes(r) ? '2' : '2-unsampled' })));
for (const r of [...far1, ...far2]) task(4, 'value-check', { Record: r.measurementid, Tier: far1.includes(r) ? '1' : '2', Question: `${r.property} ${r.value} ${r.unit} sits far from ${r.material}'s typical ${r.median} (z ${Number(r.z).toFixed(1)}). Is it what the page prints for this product, property, unit and conditions? Give a class: real, wrong-value, wrong-unit, wrong-property, wrong-condition, implausible (the page prints what cannot be) or variant (the product is a special formulation its material does not describe).` });

// ---- Item 5: two documents of one maker on two products, not judged before (judgements.md) and not under one key.
const judged = new Set(readFileSync(join(ROOT, 'build/reports/duplicates/judgements.md'), 'utf8').match(/G\d{3}-\d+/g));
const gids = (s) => [...String(s).matchAll(/G\d{3}-[\dR-]+/g)].map((m) => m[0]);
const i5 = rows('build/reports/duplicates/source-pairs.csv').filter((r) => !r.AcceptedFinding).map((r) => ({ ...r, a: gids(r.GradesA), b: gids(r.GradesB) }))
  .filter((r) => !(r.a.length === 1 && r.b.length === 1 && r.a[0] === r.b[0]))
  .filter((r) => !r.b.some((g) => r.a.map(key).includes(key(g))))
  .filter((r) => !(r.a.every((g) => judged.has(g)) && r.b.every((g) => judged.has(g))));
write('TARGETS-5.csv', ['Strength', 'SourceA', 'GradesA', 'SourceB', 'GradesB', 'SharedValues', 'PublisherA', 'PublisherB'], i5);
for (const r of i5) task(5, 'source-pair', { Table: 'sources', Record: r.SourceA, PairRecord: r.SourceB, SourceID: r.SourceA, GradeID: r.a[0], Page: 1, Locator: r.TitleA, Held: `${r.GradesA} | ${r.GradesB}`, Leverage: 'pair',
  Question: `Compare ${r.SourceA} ("${r.TitleA}", ${r.GradesA}) with ${r.SourceB} ("${r.TitleB}", ${r.GradesB}, ${fileOf(sources.get(r.SourceB)?.SHA256 ?? '')}). They share ${r.SharedValues} of their values. Is it one product's sheet twice (revision), the same content (a copy), one table printed for two named products (twin), another maker's reprint, or distinct? Quote each document's product name.` });

// ---- Item 6: the named records.
const i6 = [
  ...[...meas.values()].filter((m) => m['Data status'] === 'Unresolved unit / layout').map((m) => ({ Record: m.MeasurementID, Question: 'Held back for an unclear unit or layout. Read it on the page image: what exactly does the page print for this product, property and unit, and in which row and column? Can it be recorded (give every cell), or does it stay unreadable (say why)?' })),
  ...['V002945', 'V006179', 'V003101'].map((id) => ({ Record: id, Question: 'A notched Charpy row whose standard cell names a tensile or film standard (ASTM D882 or ISO 527). What does the page print in this row\'s standard cell, and is that cell the neighbouring row\'s?' })),
  { Record: 'V008270', Question: 'Which SUNLU product does this "Product Information" sheet name: plain PLA, PLA+ or PLA+2.0? Quote every product name the sheet prints.' },
];
for (const r of i6) task(6, r.Record === 'V008270' ? 'identity' : 'value-check', r);
const tpu95 = sources.get('S-POLYCN-TDS-Polymaker-PolyFlex-TPU95-V5-5-2025-12-29-EN');
task(6, 'readings', { Table: 'sources', Record: 'S-POLYCN-TDS-Polymaker-PolyFlex-TPU95-V5-5-2025-12-29-EN', SourceID: tpu95.SourceID, GradeID: 'G039-13', Page: 1, Locator: 'ISO 37 rows', Held: 'V003829-V003832, V013494-V013496',
  Question: 'Read every ISO 37 row the page prints (stress at 100/200/300/400 % strain, "Tensile strain", elongation at break) with its value, uncertainty and unit exactly as printed, in the 26-column reading schema.' });
const eryone = sources.get('R-ERYONE-eryone-pla-light-weight-tds');
task(6, 'readings', { Table: 'sources', Record: eryone.SourceID, SourceID: eryone.SourceID, GradeID: 'G017-06', Page: 2, Locator: 'Elongation at breakX-Y', Held: 'V004816-V004826',
  Question: 'Read the X-Y elongation at break row exactly as printed (label, standard, unit cell, value), and say what unit the value is in by the page\'s other rows.' });

// ---- Item 7: a page that states once how its test bars were oriented.
const ORIENT = /(print(?:ed|ing)?\s+(?:flat|horizontal(?:ly)?|lying)|printing direction|build (?:orientation|direction)|orientation\s*[:=]?\s*(?:x-?y|flat|horizontal)|in the x-?y (?:plane|direction)|lying flat|flat on the (?:bed|build plate|plate)|specimens? (?:were|was|are) printed (?:in|along|flat|horizontally))/i;
const unstated = db.measurements.filter((m) => /Charpy|Izod|Impact strength|Tensile|Elongation|Flexural/.test(m.property) && ['unknown', 'not-applicable'].includes(m.direction) && productValue.has(m.id));
const srcPages = new Map();
for (const m of unstated) (srcPages.get(m.sourceId) ?? srcPages.set(m.sourceId, new Set()).get(m.sourceId)).add(pageOf(m.locator));
const stmt = sqlite.prepare('select page, text from documents_fts where sourceid = ?');
const i7 = [];
for (const [sid, pages] of srcPages) {
  for (const { page, text } of stmt.all(sid)) {
    if (!pages.has(Number(page))) continue;
    for (const line of String(text).split('\n')) if (ORIENT.test(line)) i7.push({ SourceID: sid, page, line: line.trim().slice(0, 240), values: unstated.filter((m) => m.sourceId === sid && pageOf(m.locator) === Number(page)).length });
  }
}
write('TARGETS-7.csv', ['SourceID', 'page', 'line', 'values'], i7);

// ---- Item 11: what the documents of products with an impact value and no toughness mark say about toughness.
const claimed = new Set(rows('data/tables/product_claims.csv').map((r) => r.GradeID));
const impactProducts = db.grades.filter((g) => !g.retired && (g.headline?.charpyNotched || g.headline?.izodNotched) && !claimed.has(g.id));
const docsOf = (g) => new Set([g.sourceId, ...db.measurements.filter((m) => m.gradeId === g.id).map((m) => m.sourceId), ...db.knowHow.filter((k) => k.gradeId === g.id).map((k) => k.sourceId)].filter(Boolean));
const TOUGH = /(tough|impact[- ]modif|impact resist|impact strength (?:is|of up to)|shatter|brittle|impact modifier|break[- ]resist|unbreakable|durab(?:le|ility) (?:and|&) impact)/i;
const i11 = [];
const sent = sqlite.prepare('select page, text from documents_fts where sourceid = ?');
for (const g of impactProducts) {
  for (const sid of docsOf(g)) {
    for (const { page, text } of sent.all(sid)) {
      for (const s of String(text).replace(/\n/g, ' ').split(/(?<=[.!?])\s+/)) {
        if (TOUGH.test(s) && s.length < 400 && !/\b(test|ISO|ASTM|kJ|J\/m|notched|unnotched|Charpy|Izod)\b/.test(s)) i11.push({ GradeID: g.id, product: productOf(g.id), SourceID: sid, page, sentence: s.trim() });
      }
    }
  }
}
write('TARGETS-11.csv', ['GradeID', 'product', 'SourceID', 'page', 'sentence'], i11);

write('read/queue.csv', ['Task', 'Item', 'Kind', 'Tier', 'Table', 'Record', 'PairRecord', 'Field', 'GradeID', 'Product', 'SourceID', 'SHA256', 'File', 'Page', 'Locator', 'Held', 'Question', 'Leverage'], queue);
const docs = new Set(queue.map((t) => t.SHA256 || t.SourceID));
console.log(`queue: ${queue.length} tasks on ${docs.size} documents; by item:`, Object.fromEntries([1, 2, 4, 5, 6].map((i) => [i, queue.filter((t) => t.Item === i).length])));
