// Physical order of the numbers a reader is shown (D126): an ultimate strength is at least the yield and break stress
// of the same product, a strain at break at least the strain at yield, a heat deflection at 0.45 MPa at least the one at
// 1.8 MPa, and (for a semicrystalline polymer the model caps) no heat deflection lies above its melting point. The
// floors are the ones the estimates are built with, a grade's own and, for a material (the spread of its products), the
// range that contains every product's floor (bounds.js) (lower-bounds.js, headline_definitions.csv Lower bound properties), so
// a number below one is a build that did not apply what it knows, never a matter of opinion. EST-ORDER is raised per
// material or grade and headline, naming the bounding measurement.

import { lowerBoundsOf } from '../lower-bounds.ts';
import { estimateKeys, identityOf, sig3 } from './model.ts';
import type { Dyn } from '../types.ts';

const EPS = 1e-9;

/**
 * Violations of the order in a compiled database:
 *   [{ record, kind, key, id, shown: { label: value }, floor | ceiling, measurementId | basis, message }]
 * `kind`: material-estimate and grade-estimate (a centre or range end under a floor), grade-value (a product's published
 * value under a floor of its own formulation), melting-point (a heat deflection above the melting point the model caps it by).
 * Shown numbers are three-figure roundings, so a floor is compared as it would be shown (sig3 downwards).
 */
export function orderViolations(db: Dyn, { forms }: Dyn = {}) {
  const out = [];
  const defs: Dyn = new Map(db.registry.headlines.map((h: Dyn) => [h.key, h]));
  const gradeById: Dyn = new Map(db.grades.map((g: Dyn) => [g.id, g]));
  const materialById = new Map(db.materials.map((m: Dyn) => [m.id, m]));
  const polymers: Dyn = new Map((db.polymers ?? []).map((p: Dyn) => [p.id, p]));
  const fkey = (id: Dyn) => gradeById.get(id)?.formulationKey || id;
  const live = db.measurements.filter((x: Dyn) => gradeById.has(x.gradeId) && !gradeById.get(x.gradeId).retired);
  const byFormulation = new Map(), byMaterial = new Map();
  for (const x of live) {
    for (const [map, k] of [[byFormulation, fkey(x.gradeId)], [byMaterial, x.materialId]]) {
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(x);
    }
  }
  const keys = estimateKeys(db.registry).filter((k: Dyn) => defs.get(k).lowerBounds);
  const top = (bounds: Dyn, unit: Dyn) => bounds.filter((b: Dyn) => b.unit === unit).reduce((a: Dyn, b: Dyn) => (!a || b.lo > a.lo ? b : a), null);
  const shownOf = (e: Dyn) => ({ centre: e.centre, 'likely lo': e.lo, 'likely hi': e.hi, 'plausible lo': e.plausible.lo, 'plausible hi': e.plausible.hi });
  const under = (id: Dyn, kind: Dyn, key: Dyn, shown: Dyn, floor: Dyn, what: Dyn, record: Dyn) => {
    const wrong = Object.entries(shown).filter(([, v]: Dyn) => v != null && v < sig3(floor.lo, -1) - EPS);
    if (wrong.length) {
      out.push({ record, kind, key, id, shown: Object.fromEntries(wrong), floor: floor.lo, measurementId: floor.measurementId,
        message: `${what} ${wrong.map(([label, v]: Dyn) => `${label} ${v}`).join(', ')} ${floor.unit} lies under ${floor.lo} ${floor.unit}, its own ${floor.property.toLowerCase()} (${floor.measurementId})` });
    }
  };

  for (const key of keys) {
    const def: Dyn = defs.get(key);
    for (const m of db.materials) {
      if (m.excluded || m.familyEntry) continue;
      const e = m.headline[key]?.estimate;
      if (!e) continue;
      // A material's range is the spread of its products: it contains every product's floor (its upper ends reach the
      // highest), and starts no lower than the lowest where every active product has one (bounds.js).
      const formulations = [...new Set(db.grades.filter((g: Dyn) => g.materialId === m.id && !g.retired).map((g: Dyn) => fkey(g.id)))];
      const floors = formulations.map((f: Dyn) => top(lowerBoundsOf(def, byFormulation.get(f) ?? [], { forms }), e.unit));
      const known = floors.filter(Boolean);
      if (!known.length) continue;
      const highest = known.reduce((a: Dyn, b: Dyn) => (b.lo > a.lo ? b : a)), lowest = known.reduce((a: Dyn, b: Dyn) => (b.lo < a.lo ? b : a));
      const all = Object.entries(shownOf(e)), uppers = all.filter(([label]: Dyn) => label.endsWith('hi'));
      const shown = {}, said: Dyn = [];
      const short = (list: Dyn, floor: Dyn, what: Dyn, each: Dyn = '') => {
        const wrong = list.filter(([, v]: Dyn) => v != null && v < sig3(floor.lo, -1) - EPS);
        if (!wrong.length) return;
        Object.assign(shown, Object.fromEntries(wrong));
        said.push(`${wrong.map(([label, v]: Dyn) => `${label} ${v}`).join(', ')} ${floor.unit} lies under ${floor.lo} ${floor.unit}, the ${what} floor among its products${each}, its own ${floor.property.toLowerCase()} (${floor.measurementId})`);
      };
      short(uppers, highest, 'highest');
      if (floors.every(Boolean)) short(all, lowest, 'lowest', ', which every one has');
      if (said.length) out.push({ record: `${m.id} ${key}`, kind: 'material-estimate', key, id: m.id, shown, floor: highest.lo, measurementId: highest.measurementId, message: `${m.name} ${key} estimate ${said.join('; ')}` });
    }
    for (const g of db.grades) {
      const mat: Dyn = materialById.get(g.materialId);
      if (g.retired || !mat || mat.excluded || mat.familyEntry) continue;
      const floor = top(lowerBoundsOf(def, byFormulation.get(fkey(g.id)) ?? [], { forms }), def.unit);
      if (!floor) continue;
      const e = g.estimate?.[key];
      if (e) under(g.id, 'grade-estimate', key, shownOf(e), floor, `${g.id} ${key} estimate`, `${g.id} ${key}`);
      const v = g.headline?.[key];
      if (v?.value != null && v.value < floor.lo - EPS) {
        out.push({ record: `${g.id} ${key}`, kind: 'grade-value', key, id: g.id, shown: { value: v.value }, floor: floor.lo, measurementId: floor.measurementId,
          message: `${g.id} ${key} ${v.value} ${def.unit} (${v.measurementId}) lies under ${floor.lo} ${def.unit}, its own ${floor.property.toLowerCase()} (${floor.measurementId})` });
      }
    }
  }

  // A semicrystalline polymer's heat deflection stays under its melting point (the model's Tm cap, bounds.js): the
  // material's own printed or product melting point, else its identity's.
  const tmOf = (m: Dyn) => {
    const own = (byMaterial.get(m.id) ?? []).filter((x: Dyn) => x.property === 'Melting temperature' && x.numeric && !x.quarantined && !x.implausible
      && x.specimenForm !== 'moulded' && x.value > 60 && x.value < 420).map((x: Dyn) => x.value).sort((a: Dyn, b: Dyn) => a - b);
    const mid = own.length >> 1;
    return own.length ? (own.length % 2 ? own[mid] : (own[mid - 1] + own[mid]) / 2) : polymers.get(identityOf(m))?.meltingPointC ?? null;
  };
  if (estimateKeys(db.registry).includes('hdt045')) {
    const cap = (id: Dyn, shown: Dyn, tm: Dyn, name: Dyn) => {
      const wrong = Object.entries(shown).filter(([, v]: Dyn) => v != null && v > sig3(tm, 1) + EPS);
      if (wrong.length) out.push({ record: `${id} hdt045`, kind: 'melting-point', key: 'hdt045', id, shown: Object.fromEntries(wrong), ceiling: tm,
        message: `${name} hdt045 ${wrong.map(([label, v]: Dyn) => `${label} ${v}`).join(', ')} °C lies above its melting point ${tm} °C` });
    };
    for (const m of db.materials) {
      if (m.excluded || m.familyEntry || polymers.get(identityOf(m))?.morphology !== 'semicrystalline') continue;
      const tm = tmOf(m);
      if (tm == null) continue;
      const e = m.headline.hdt045?.estimate;
      if (e) cap(m.id, shownOf(e), tm, `${m.name} estimate`);
      for (const g of db.grades) if (!g.retired && g.materialId === m.id && g.estimate?.hdt045) cap(g.id, shownOf(g.estimate.hdt045), tm, `${g.id} estimate`);
    }
  }
  return out;
}
