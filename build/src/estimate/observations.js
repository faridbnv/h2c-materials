// Observations: which measurement says what about a headline (its conversion kind), and the snapshot of materials,
// grades and usable measurements the model is fitted to.

import { moistureState } from '../normalize/moisture.js';
import { specimenForm, postProcessingState, annealedBesideAsPrinted } from '../normalize/specimen.js';
import { median } from './numerics.js';
import { identityOf, transform } from './model.js';

/** Young's modulus in MPa from Shore hardness: Gent (1958) for Shore A, Qi, Joyce and Boyce (2003) for Shore D. */
export function modulusFromShore(shore) {
  const m = /^(\d+(?:\.\d+)?)\s*([AD])$/i.exec(String(shore ?? '').trim());
  if (!m) return null;
  const s = Number(m[1]);
  if (m[2].toUpperCase() === 'A') return s > 20 && s < 99 ? (0.0981 * (56 + 7.62336 * s)) / (0.137505 * (254 - 2.54 * s)) : null;
  const u = (100 - s) / 20;
  return s > 10 && s < 95 ? (781.88 - 156.376 * u) / (u * u) : null;
}

// ------------------------------------------------------------------------------------ the snapshot

export function snapshot(materials, gradeList, measurements, model) {
  const grades = new Map(gradeList.map((g) => [g.id, g]));
  const pool = materials.filter((m) => !m.excluded && !m.familyEntry && model.identities[identityOf(m)]);
  const inPool = new Map(pool.map((m) => [m.id, m]));
  const fkey = (gid) => grades.get(gid)?.formulationKey || gid;
  // A product declared a variant of its material (grades.csv Variant) carries that variant in every grade of its formulation.
  const variants = new Map();
  for (const g of gradeList) if (g.variant) variants.set(fkey(g.id), g.variant);
  const variantOf = (f) => (f ? variants.get(f) ?? null : null);
  const info = (m) => model.identities[identityOf(m)];
  const reinforcement = (m) => m.facets.reinforcement.value;
  const fibre = (m) => reinforcement(m) === 'carbon-fibre' || reinforcement(m) === 'glass-fibre';
  // A semicrystalline polymer that prints amorphous deflects as an amorphous bar does (identities printsAmorphous).
  const amorphousAsPrinted = (m) => info(m).printsAmorphous === true || (info(m).printsAmorphous === 'unfilled' && !fibre(m));
  const matrix = (m) => (info(m).morphology === 'semicrystalline' && !amorphousAsPrinted(m) ? (fibre(m) ? 'semi-filled' : 'semi-unfilled')
    : info(m).morphology === 'elastomer' ? 'elastomer' : 'amorphous');
  const usable = measurements.filter((x) => inPool.has(x.materialId) && x.numeric && !x.quarantined && !x.implausible && !grades.get(x.gradeId)?.retired
    // A film or a filament strand is not a part; a moulded bar is, through its documented conversion.
    && !['film', 'filament'].includes(specimenForm(x.specimenType ?? 'Not published')));
  const byMaterial = new Map();
  for (const x of usable) { if (!byMaterial.has(x.materialId)) byMaterial.set(x.materialId, []); byMaterial.get(x.materialId).push(x); }

  // Melting point and glass transition of a material: its own printed or product values, else its
  // identity's. Supplier resin values describe another specimen and are not used here.
  const own = (m, property, lo, hi) => median((byMaterial.get(m.id) ?? [])
    .filter((x) => x.property === property && x.value > lo && x.value < hi && !mouldedValue(x)).map((x) => x.value));
  const tmOf = (m) => own(m, 'Melting temperature', 60, 420) ?? info(m).tm ?? null;
  // The highest Vicat its own grades publish, as printed or unstated (an annealed Vicat describes another state).
  const max = (xs) => (xs.length ? Math.max(...xs) : null);
  const vicatOf = (m) => max((byMaterial.get(m.id) ?? []).filter((x) => x.property === 'Vicat softening temperature' && x.value > 30 && x.value < 420
    && !mouldedValue(x) && postProcessingState(x.postProcessing ?? 'Not published') !== 'annealed').map((x) => x.value));
  const tgOf = (m) => own(m, 'Glass transition temperature', -150, 420)
    ?? median(pool.filter((p) => identityOf(p) === identityOf(m)).flatMap((p) => (byMaterial.get(p.id) ?? [])
      .filter((x) => x.property === 'Glass transition temperature' && x.value > -150 && x.value < 420 && !mouldedValue(x)).map((x) => x.value)));

  return { grades, pool, inPool, fkey, variantOf, info, reinforcement, fibre, matrix, byMaterial, tmOf, tgOf, vicatOf };
}

// --------------------------------------------------------------------------------- evidence kinds

// XZ (on edge) is loaded in the build plane, as XY is. A source's own label ("Horizontal", "Vertical XZ", "along
// flow") is not a confirmed build orientation and never merges into XY or Z (Method, Comparison / Directions): it is
// read as an unknown direction, with that conversion's wider spread.
const DIRECTION_CLASS = { XY: 'XY', XZ: 'XY', Z: 'Z', ZX: 'Z' };
const mouldedValue = (x) => specimenForm(x.specimenType ?? 'Not published') === 'moulded';
const STRENGTH_ENDPOINT = {
  'Tensile strength (endpoint unspecified)': 'ultimate', 'Tensile break strength': 'break',
  'Tensile yield strength': 'yield', 'Flexural strength': 'flexural',
};

/** The conversion kind of a measurement for a headline, or null when it says nothing about it. */
export function kindOf(x, key, matrixClass, waterUptake = 'high') {
  const moulded = mouldedValue(x) ? ' moulded' : '';
  const dir = moulded ? '' : ` ${DIRECTION_CLASS[x.direction] ?? 'unk'}`;
  // The vocabulary declares each moisture wording's state (normalize/moisture.js); a conditioned value converts to dry.
  // How far it converts depends on the polymer's water uptake (identities waterUptake); a polymer that takes up
  // almost none is read as dry.
  const conditioned = moistureState(x.moisture ?? 'Not published') === 'conditioned';
  const wet = conditioned && waterUptake === 'high' ? ' wet' : conditioned && waterUptake === 'low' ? ' wet-low' : '';
  const kind = (base) => `${base}${dir}${wet}${moulded}`;
  switch (key) {
    case 'density': return x.property === 'Density' ? `density${moulded}` : null;
    case 'tensileModulusXY':
      if (x.property === 'Tensile modulus') return kind('tensile');
      if (x.property === 'Flexural modulus') return kind('flexural');
      return null;
    // An elastomer strain-hardens after it yields (TPU yield 8.6 MPa, break 39 MPa): its yield says little about its
    // ultimate strength, and its strain at yield little about its strain at break.
    case 'tensileStrengthXY': return STRENGTH_ENDPOINT[x.property] && !(matrixClass === 'elastomer' && x.property === 'Tensile yield strength') ? kind(STRENGTH_ENDPOINT[x.property]) : null;
    case 'elongationXY':
      if (x.property === 'Elongation at break') return kind('break');
      // A break strain is never below the strain at yield or at maximum stress.
      if ((x.property === 'Elongation at yield' || x.property === 'Tensile strain at strength') && matrixClass !== 'elastomer') return kind('yield');
      return null;
    case 'hdt045': {
      // ISO 75 stops at 0.2 % outer-fibre strain, so a bar deflects where its modulus falls to about 225 MPa (0.45 MPa)
      // or 900 MPa (1.8 MPa). An elastomer is below that at room temperature: a published HDT describes no bar, and it
      // informs no estimate (TPU's 74 °C from a 26 MPa sheet was estimated and allowed to screen).
      if (matrixClass === 'elastomer') return null;
      if (x.property === 'HDT') {
        const load = x.thermal?.loadMPa;
        // A moulded bar of an amorphous polymer deflects near Tg as a printed one does; a semicrystalline
        // one crystallises further in the mould, so the conversion depends on the matrix.
        const mould = moulded && `${moulded} ${matrixClass === 'amorphous' ? 'amorphous' : 'semicrystalline'}`;
        if (!x.thermal?.loadStated) return `HDT unstated${mould || ''}`;
        if (load >= 0.44 && load <= 0.46) return `HDT 0.45${mould || ''}`;
        return moulded ? null : `HDT 1.8 ${matrixClass}`;
      }
      if (moulded) return null;
      if (x.property === 'Glass transition temperature' && matrixClass === 'amorphous') return 'Tg amorphous';
      if (x.property === 'Vicat softening temperature' && matrixClass !== 'elastomer') return `Vicat ${matrixClass}`;
      if (x.property === 'Melting temperature' && matrixClass === 'semi-filled') return 'Tm semi-filled';
      return null;
    }
    default: return null;
  }
}

/**
 * Observations of every kind for one headline, before conversion: one entry per material, formulation
 * and kind, averaging repeats. A shared datasheet cited by several materials is kept once, under the
 * first material that cites it (Method, Identity / Aliases).
 */
export function rawObservations(key, S, model) {
  const [pl, ph] = model.properties[key].plausibleValues;
  const t = transform(key, model);
  const groups = new Map(), rejected = [], bounds = [];
  for (const m of S.pool) {
    const add = (entry) => {
      const g = `${m.id}|${entry.f}|${entry.kind}`;
      if (!groups.has(g)) groups.set(g, { m, f: entry.f, gradeId: entry.gradeId, kind: entry.kind, ys: [], half: [], items: [], states: new Set() });
      const e = groups.get(g);
      e.ys.push(entry.y); e.half.push(entry.half); e.items.push(entry.item); e.states.add(entry.state ?? '');
    };
    for (const x of S.byMaterial.get(m.id) ?? []) {
      const kind = kindOf(x, key, S.matrix(m), S.info(m).waterUptake ?? null);
      if (!kind) continue;
      // A polymer that prints amorphous and was annealed is crystallised: another state, which no estimate of an
      // as-printed part may learn from.
      if (key === 'hdt045' && S.matrix(m) === 'amorphous' && S.info(m).morphology === 'semicrystalline' && postProcessingState(x.postProcessing ?? 'Not published') === 'annealed') continue;
      // Headlines are as printed. An annealed value of a grade that publishes the as-printed one is another state
      // of the part, not a repeat: averaged, PET-GF's 81.6 and 133.7 °C became one precise 107.65 °C.
      if (annealedBesideAsPrinted(x, S.byMaterial.get(m.id))) continue;
      if (x.value < pl || x.value > ph) { rejected.push({ key, materialId: m.id, material: m.name, measurementId: x.id, property: x.property, value: x.value, unit: x.unit }); continue; }
      // A one-sided bound ("> 16.5 MPa", "< 0.8 %") says the value lies beyond it. Read as an exact point it became
      // the most precise observation of all (PEBA's strength estimate 16.4-16.6 MPa); left out, elastomers lost
      // the only evidence that they stretch hundreds of percent. It is kept at the bound with a documented
      // half-width (estimate-model.json bounds.oneSided), and it limits its own material's estimate.
      const side = x.interval && x.interval.hi == null ? 'lower' : x.interval && x.interval.lo == null ? 'upper' : null;
      if (model.properties[key].scale === 'log' && !(x.value > 0)) continue;
      if (side) bounds.push({ key, materialId: m.id, measurementId: x.id, gradeId: x.gradeId, kind, side, value: x.value });
      const lo = x.interval?.lo ?? x.value, hi = x.interval?.hi ?? x.value;
      if (model.properties[key].scale === 'log' && !side && !(lo > 0)) continue;
      const scaleName = model.properties[key].scale === 'log' ? 'log' : 'linear';
      // The post-processing state and schedule, not its wording: three spellings of one schedule are one state.
      const state = `${postProcessingState(x.postProcessing ?? 'Not published')}|${x.anneal?.tempC ?? ''}|${x.anneal?.hours ?? ''}`;
      add({ f: S.fkey(x.gradeId), gradeId: x.gradeId, kind, state, y: t(x.value), half: side ? model.bounds.oneSided.half[scaleName] : (t(hi) - t(lo)) / 2,
        item: { measurementId: x.id, gradeId: x.gradeId, property: x.property, direction: x.direction, value: x.value, unit: x.unit, ...(side ? { bound: side } : {}) } });
    }
    // An elastomer's Shore hardness (measurements.csv Hardness in Shore A or D, published or nominal from its product
    // designation) informs its stiffness.
    if (key === 'tensileModulusXY' && S.info(m).morphology === 'elastomer') {
      for (const gid of m.gradeIds ?? []) {
        const hx = (S.byMaterial.get(m.id) ?? []).find((x) => x.gradeId === gid && x.property === 'Hardness' && (x.unit === 'Shore A' || x.unit === 'Shore D'));
        const shore = hx && `${hx.value}${hx.unit.slice(-1)}`;
        const e = shore && modulusFromShore(shore);
        if (!e || S.grades.get(gid)?.retired) continue;
        add({ f: S.fkey(gid), gradeId: gid, kind: `hardness ${hx.unit.slice(-1)}`, y: Math.log(e / 1000), half: 0,
          item: { measurementId: hx.id, gradeId: gid, property: `Shore hardness ${shore}`, value: Number((e / 1000).toPrecision(3)), unit: 'GPa', from: `${hx.locator} (${hx.dataStatus})` } });
      }
    }
  }
  // A formulation cited by several materials is owned by the material it represents, else the first.
  const ownerOfF = new Map(), out = [];
  for (const m of S.pool) { const f = m.representativeGrade && S.fkey(m.representativeGrade); if (f && !ownerOfF.has(f)) ownerOfF.set(f, m.id); }
  for (const e of groups.values()) {
    if (!ownerOfF.has(e.f)) ownerOfF.set(e.f, e.m.id);
    if (ownerOfF.get(e.f) !== e.m.id) continue;
    // Repeats under different post-processing (PPS-GF's HDT after annealing at 130 and at 230 °C: 125.8 and 219.6 °C)
    // are not a precise mean: the observation's half-width spans them, and it calibrates no conversion.
    const mixed = e.states.size > 1;
    const spread = mixed ? (Math.max(...e.ys) - Math.min(...e.ys)) / 2 : 0;
    out.push({ ...e, states: undefined, mixedStates: mixed, yRaw: e.ys.reduce((a, b) => a + b, 0) / e.ys.length, half: Math.max(...e.half, spread), bound: e.items.some((i) => i.bound) });
  }
  return { raw: out, rejected, bounds, ownerOfF };
}
