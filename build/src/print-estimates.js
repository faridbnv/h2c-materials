// Estimated nozzle and bed windows for materials whose sources publish neither.
//
// Four identities in the snapshot have no product at all: PA66, PA66-CF, PA612 and PA612-GF. Their
// print settings were blank, which is the one thing a print-settings column should never be for a
// nylon. A window is inferred, not invented, and it says how:
//
//   peers    the same polymer identity when any of its materials publishes a window; otherwise every
//            material of the same chemical group and matrix (build/mappings/estimate-model.json)
//   fibre    carbon or glass fibre raises a window by the median difference between filled and
//            unfilled materials of the same identity in the snapshot
//   melting  a semicrystalline polymer cannot print below its melting point, so the nozzle window
//            starts a few degrees above it
//
// Like a chamber band, an estimated window decides nothing: the nozzle and bed gates stay unknown
// (DECISIONS D6, D43). It is shown beside the gate, marked as an estimate.

import { ESTIMATE_MODEL } from './estimates.js';

const identityOf = (m) => (m.family === 'Polymer Blends' ? m.normalizedName : m.basePolymer);
const FIBRE = new Set(['carbon-fibre', 'glass-fibre']);
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const MELT_MARGIN = 5;
const MIN_WIDTH = 15;

/**
 * @param materials compiled materials with `print.nozzleC` and `print.bedC` set
 * @returns {{ applied: object[], fibreOffset: {nozzle:number, bed:number} }}
 */
export function attachPrintEstimates(materials, model = ESTIMATE_MODEL) {
  const pool = materials.filter((m) => !m.excluded && model.identities[identityOf(m)]);
  const fibre = (m) => FIBRE.has(m.facets.reinforcement.value);

  // What fibre does to a window, measured on identities printed both ways.
  const offsets = { nozzle: [], bed: [] };
  const byIdentity = new Map();
  for (const m of pool) { const id = identityOf(m); if (!byIdentity.has(id)) byIdentity.set(id, []); byIdentity.get(id).push(m); }
  for (const ms of byIdentity.values()) {
    for (const [axis, key] of [['nozzle', 'nozzleC'], ['bed', 'bedC']]) {
      const plain = ms.filter((m) => !fibre(m) && m.print[key]), filled = ms.filter((m) => fibre(m) && m.print[key]);
      if (!plain.length || !filled.length) continue;
      const mid = (xs) => median(xs.map((m) => (m.print[key].min + m.print[key].max) / 2));
      offsets[axis].push(mid(filled) - mid(plain));
    }
  }
  const fibreOffset = { nozzle: Math.round(median(offsets.nozzle) ?? 10), bed: Math.round(median(offsets.bed) ?? 0) };

  const applied = [];
  for (const m of pool) {
    const info = model.identities[identityOf(m)];
    for (const [axis, key, out] of [['nozzle', 'nozzleC', 'nozzleEstimate'], ['bed', 'bedC', 'bedEstimate']]) {
      if (m.print[key]) continue;
      let peers = pool.filter((p) => p !== m && identityOf(p) === identityOf(m) && p.print[key]);
      let scope = `${identityOf(m)}`;
      if (!peers.length) {
        peers = pool.filter((p) => p !== m && model.identities[identityOf(p)].group === info.group
          && model.identities[identityOf(p)].morphology === info.morphology && p.print[key]);
        scope = info.group;
      }
      if (peers.length < (scope === identityOf(m) ? 1 : 2)) continue;
      const shift = (p) => (fibre(m) === fibre(p) ? 0 : fibre(m) ? fibreOffset[axis] : -fibreOffset[axis]);
      let lo = Math.round(median(peers.map((p) => p.print[key].min + shift(p))) / 5) * 5;
      let hi = Math.round(median(peers.map((p) => p.print[key].max + shift(p))) / 5) * 5;
      const notes = [];
      if (fibre(m) !== peers.every(fibre) && fibreOffset[axis]) notes.push(`adjusted ${fibreOffset[axis]} °C for fibre where a peer differs`);
      if (axis === 'nozzle' && info.morphology === 'semicrystalline' && info.tm && lo < info.tm + MELT_MARGIN) {
        lo = Math.ceil((info.tm + MELT_MARGIN) / 5) * 5;
        notes.push(`starts above the ${info.tm} °C melting point`);
      }
      if (hi < lo + MIN_WIDTH) hi = lo + MIN_WIDTH;
      m.print[out] = {
        lo, hi, unit: '°C',
        basis: `median of ${peers.length} ${scope} window${peers.length === 1 ? '' : 's'}${notes.length ? `; ${notes.join('; ')}` : ''}`,
        peers: peers.map((p) => ({ materialId: p.id, name: p.name, min: p.print[key].min, max: p.print[key].max })),
      };
      applied.push({ material: m.name, axis, window: `${lo}-${hi} °C` });
    }
  }
  return { applied, fibreOffset };
}
