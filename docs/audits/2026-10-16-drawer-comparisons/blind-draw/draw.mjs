// Draw 40 newly drawn product values (14 hdt18, 13 tensileModulusZ, 13 elongationZ), each its product's own record, on a
// fixed seed; write the blind readers' input (no recorded value in it) and the key kept apart.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const repo = process.argv[2], out = process.argv[3];
const db = JSON.parse(readFileSync(`${repo}/dist/db.json`, 'utf8'));
const ms = new Map(db.measurements.map((m) => [m.id, m]));
const src = new Map(db.sources.map((s) => [s.id, s]));
let seed = 20261016;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const LABEL = { hdt18: 'Heat deflection temperature (HDT) at 1.8 MPa / 264 psi', tensileModulusZ: 'Tensile modulus of a bar printed upright (Z, across the layers)', elongationZ: 'Elongation at break of a bar printed upright (Z, across the layers)' };
const rows = [], key = [];
for (const [k, n] of [['hdt18', 14], ['tensileModulusZ', 13], ['elongationZ', 13]]) {
  const pool = db.grades.filter((g) => !g.retired && g.headline?.[k]?.measurementId && !g.headline[k].from).map((g) => ({ g, m: ms.get(g.headline[k].measurementId) }))
    .filter(({ m }) => { const s = src.get(m.sourceId); return s?.sha256 && existsSync(`${repo}/.cache/text/${s.sha256}.json`); });
  const picked = new Set();
  while (picked.size < Math.min(n, pool.length)) picked.add(Math.floor(rnd() * pool.length));
  for (const i of picked) {
    const { g, m } = pool[i], s = src.get(m.sourceId);
    const task = `D${String(rows.length + 1).padStart(2, '0')}`;
    const page = String(m.locator ?? '').match(/p(?:age)?\.?\s*(\d+)/i)?.[1] ?? '';
    rows.push({ Task: task, Record: m.id, SourceID: m.sourceId, SHA256: s.sha256, Page: page, Product: `${g.manufacturer} ${g.product}`, Label: LABEL[k],
      Question: 'What does the page print for this product: the value with its unit, and every condition its row or table states (orientation, load, standard, specimen, treatment)?' });
    key.push({ Task: task, Record: m.id, Headline: k, Grade: g.id, Value: m.value, Unit: m.unit, Direction: m.direction, LoadMPa: m.thermal?.loadMPa ?? '', Specimen: m.specimenType, PostProcessing: m.postProcessing, Standard: m.standardText, Locator: m.locator, Raw: m.raw?.value ?? '' });
  }
}
const csv = (list) => { const h = Object.keys(list[0]); return [h.join(','), ...list.map((r) => h.map((c) => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n') + '\n'; };
writeFileSync(`${out}/input.csv`, csv(rows));
writeFileSync(`${out}/key.csv`, csv(key));
console.log(rows.length, 'tasks');
