// Physical order of the numbers a reader is shown (D126): an ultimate strength is at least the yield and break stress
// of the same product, a strain at break at least the strain at yield, a heat deflection at 0.45 MPa at least the one at
// 1.8 MPa, and (for a semicrystalline polymer the model caps) no heat deflection lies above its melting point. The
// floors are the ones the estimates are built with (lower-bounds.js, headline_definitions.csv Lower bound properties), so
// a number below one is a build that did not apply what it knows, never a matter of opinion. EST-ORDER is raised per
// material or grade and headline, naming the bounding measurement.

import { lowerBoundsOf } from '../lower-bounds.js';
import { estimateKeys, identityOf, sig3 } from './model.js';

const EPS = 1e-9;

/**
 * Violations of the order in a compiled database:
 *   [{ record, kind, key, id, shown: { label: value }, floor | ceiling, measurementId | basis, message }]
 * `kind`: material-estimate and grade-estimate (a centre or range end under a floor), grade-value (a product's published
 * value under a floor of its own formulation), melting-point (a heat deflection above the melting point the model caps it by).
 * Shown numbers are three-figure roundings, so a floor is compared as it would be shown (sig3 downwards).
 */
export function orderViolations(db, { forms } = {}) {
  const out = [];
  const defs = new Map(db.registry.headlines.map((h) => [h.key, h]));
  const gradeById = new Map(db.grades.map((g) => [g.id, g]));
  const materialById = new Map(db.materials.map((m) => [m.id, m]));
  const polymers = new Map((db.polymers ?? []).map((p) => [p.id, p]));
  const fkey = (id) => gradeById.get(id)?.formulationKey || id;
  const live = db.measurements.filter((x) => gradeById.has(x.gradeId) && !gradeById.get(x.gradeId).retired);
  const byFormulation = new Map(), byMaterial = new Map();
  for (const x of live) {
    for (const [map, k] of [[byFormulation, fkey(x.gradeId)], [byMaterial, x.materialId]]) {
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(x);
    }
  }
  const keys = estimateKeys(db.registry).filter((k) => defs.get(k).lowerBounds);
  const top = (bounds, unit) => bounds.filter((b) => b.unit === unit).reduce((a, b) => (!a || b.lo > a.lo ? b : a), null);
  const shownOf = (e) => ({ centre: e.centre, 'likely lo': e.lo, 'likely hi': e.hi, 'plausible lo': e.plausible.lo, 'plausible hi': e.plausible.hi });
  const under = (id, kind, key, shown, floor, what, record) => {
    const wrong = Object.entries(shown).filter(([, v]) => v != null && v < sig3(floor.lo, -1) - EPS);
    if (wrong.length) {
      out.push({ record, kind, key, id, shown: Object.fromEntries(wrong), floor: floor.lo, measurementId: floor.measurementId,
        message: `${what} ${wrong.map(([label, v]) => `${label} ${v}`).join(', ')} ${floor.unit} lies under ${floor.lo} ${floor.unit}, its own ${floor.property.toLowerCase()} (${floor.measurementId})` });
    }
  };

  for (const key of keys) {
    const def = defs.get(key);
    for (const m of db.materials) {
      if (m.excluded || m.familyEntry) continue;
      const e = m.headline[key]?.estimate;
      if (!e) continue;
      const floor = top(lowerBoundsOf(def, byMaterial.get(m.id) ?? [], { forms }), e.unit);
      if (floor) under(m.id, 'material-estimate', key, shownOf(e), floor, `${m.name} ${key} estimate`, `${m.id} ${key}`);
    }
    for (const g of db.grades) {
      const mat = materialById.get(g.materialId);
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
  const tmOf = (m) => {
    const own = (byMaterial.get(m.id) ?? []).filter((x) => x.property === 'Melting temperature' && x.numeric && !x.quarantined && !x.implausible
      && x.specimenForm !== 'moulded' && x.value > 60 && x.value < 420).map((x) => x.value).sort((a, b) => a - b);
    const mid = own.length >> 1;
    return own.length ? (own.length % 2 ? own[mid] : (own[mid - 1] + own[mid]) / 2) : polymers.get(identityOf(m))?.meltingPointC ?? null;
  };
  if (estimateKeys(db.registry).includes('hdt045')) {
    const cap = (id, shown, tm, name) => {
      const wrong = Object.entries(shown).filter(([, v]) => v != null && v > sig3(tm, 1) + EPS);
      if (wrong.length) out.push({ record: `${id} hdt045`, kind: 'melting-point', key: 'hdt045', id, shown: Object.fromEntries(wrong), ceiling: tm,
        message: `${name} hdt045 ${wrong.map(([label, v]) => `${label} ${v}`).join(', ')} °C lies above its melting point ${tm} °C` });
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
