// Read-only value checks over dist/db.json. Usage: node value-checks.mjs
import fs from 'fs';
const db = JSON.parse(fs.readFileSync('/Users/farid/Documents/h2c-materials-branch/dist/db.json', 'utf8'));
const mById = new Map(db.measurements.map((m) => [m.id, m]));
const matById = new Map(db.materials.map((m) => [m.id, m]));
const grades = db.grades.filter((g) => !g.retired);
const H = (g, k) => (g.headline && g.headline[k]) || null;
const meas = (h) => (h ? mById.get(h.measurementId) : null);
const matName = (g) => { const m = matById.get(g.materialId); return m ? `${g.materialId} ${m.name}` : g.materialId; };
const fmt = (n) => (typeof n === 'number' ? +n.toPrecision(6) : n);
const desc = (g, h, k) => {
  const m = meas(h);
  return `${k}=${fmt(h.value)} [${h.level}] ${h.measurementId}` + (m ? ` (src ${m.sourceId}; "${m.locator}"; dir ${m.direction}; load ${m.thermal ? m.thermal.loadMPa : '-'}; spec ${m.specimenType}; post ${m.postProcessingState})` : '');
};
const head = (g) => `${g.id} | ${matName(g)} | ${g.manufacturer} ${g.product}`;

console.log(`non-retired grades: ${grades.length} of ${db.grades.length}\n`);

// 1
console.log('=== CHECK 1: hdt18 value above hdt045 value (same product) ===');
let c1 = 0;
for (const g of grades) {
  const a = H(g, 'hdt18'), b = H(g, 'hdt045');
  if (a && b && a.value > b.value) {
    c1++;
    console.log(`${head(g)}\n   ${desc(g, a, 'hdt18')}\n   ${desc(g, b, 'hdt045')}\n   anneal18=${JSON.stringify(a.anneal || null)} anneal045=${JSON.stringify(b.anneal || null)} from18=${a.from || '-'} from045=${b.from || '-'}`);
  }
}
console.log(`-> ${c1} product(s)\n`);

// 2
console.log('=== CHECK 2: Z/XY share outside 0.2-1.5 (both comparable, same property and sourceId) ===');
let c2 = 0;
for (const [z, xy] of [['tensileModulusZ', 'tensileModulusXY'], ['tensileStrengthZ', 'tensileStrengthXY'], ['elongationZ', 'elongationXY']]) {
  for (const g of grades) {
    const a = H(g, z), b = H(g, xy);
    if (!a || !b || a.level !== 'comparable' || b.level !== 'comparable') continue;
    const ma = meas(a), mb = meas(b);
    if (!ma || !mb || ma.property !== mb.property || ma.sourceId !== mb.sourceId) continue;
    const r = a.value / b.value;
    if (!(r >= 0.2 && r <= 1.5)) {
      c2++;
      console.log(`${head(g)}\n   ratio ${z}/${xy} = ${fmt(r)}\n   ${desc(g, a, z)}\n   ${desc(g, b, xy)}`);
    }
  }
}
console.log(`-> ${c2} pair(s)\n`);

// 3
console.log('=== CHECK 3: tensileModulusZ > 1.3 x XY, or tensileStrengthZ > 1.2 x XY (any source) ===');
let c3 = 0;
for (const [z, xy, lim] of [['tensileModulusZ', 'tensileModulusXY', 1.3], ['tensileStrengthZ', 'tensileStrengthXY', 1.2]]) {
  for (const g of grades) {
    const a = H(g, z), b = H(g, xy);
    if (!a || !b) continue;
    if (a.value > lim * b.value) {
      c3++;
      const ma = meas(a), mb = meas(b);
      console.log(`${head(g)}\n   ratio ${z}/${xy} = ${fmt(a.value / b.value)} (limit ${lim}); same source: ${ma && mb && ma.sourceId === mb.sourceId}\n   ${desc(g, a, z)}\n   ${desc(g, b, xy)}`);
    }
  }
}
console.log(`-> ${c3} pair(s)\n`);

// 4
console.log('=== CHECK 4: hdt18 whose measurement load is not 1.8 MPa, or whose direction is Z, XZ or ZX ===');
let c4 = 0;
for (const g of grades) {
  const a = H(g, 'hdt18');
  if (!a) continue;
  const m = meas(a);
  const load = m && m.thermal ? m.thermal.loadMPa : undefined;
  const bad = [];
  if (!m) bad.push('measurement missing');
  else {
    if (load !== 1.8) bad.push(`load ${load}`);
    if (['Z', 'XZ', 'ZX'].includes(m.direction)) bad.push(`direction ${m.direction}`);
  }
  if (bad.length) { c4++; console.log(`${head(g)}\n   ${bad.join('; ')}\n   ${desc(g, a, 'hdt18')}`); }
}
console.log(`-> ${c4} product(s)\n`);

// 5
console.log('=== CHECK 5: tensileModulusZ / elongationZ whose measurement direction is not exactly Z ===');
let c5 = 0;
for (const k of ['tensileModulusZ', 'elongationZ']) {
  for (const g of grades) {
    const a = H(g, k);
    if (!a) continue;
    const m = meas(a);
    if (!m || m.direction !== 'Z') {
      c5++;
      console.log(`${head(g)}\n   ${m ? 'direction ' + m.direction : 'measurement missing'}; headline direction ${a.direction || '-'}\n   ${desc(g, a, k)}`);
    }
  }
}
console.log(`-> ${c5} value(s)\n`);

console.log(`SUMMARY: check1=${c1} check2=${c2} check3=${c3} check4=${c4} check5=${c5}`);
