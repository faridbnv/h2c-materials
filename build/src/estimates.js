// Peer spans are contextual observations only. They never determine eligibility.
export const ESTIMATE_KEYS = ['density', 'tensileModulusXY', 'tensileStrengthXY', 'elongationXY', 'hdt045'];

// Display families can contain different polymers (PP/PE/OBC, TPU/PEBA/TPC, PPA/PPS).
// They are navigation groups, not transferable material-property populations.
export const peerGroup = (m) => [m.family,
  m.family === 'Polymer Blends' ? m.normalizedName : m.basePolymer,
  m.modifier, m.role].join('|');

const TIERS = [{
  id: 'polymer+modifier', minPeers: 2,
  key: peerGroup,
  label: (m) => `${m.basePolymer}, ${m.modifier}; sampled peer observations only`,
}];

/**
 * Independent-observation key.
 *
 * PA, PA6/66 and CoPA are three canonical entries whose headline modulus all comes from one
 * PolyMide CoPA datasheet, so counting them as three peers claimed three corroborations where there
 * is one, and produced an "estimate" of 2.223 to 2.223 GPa. The Method sheet states the rule
 * directly: shared formulation keys identify repeated commercial evidence, not independent tests.
 */
const observationKey = (grades, h) => {
  const g = grades.get(h.gradeId);
  return g?.formulationKey || h.gradeId || h.sourceId;
};

export function buildEstimates(materials, gradeList = []) {
  const grades = new Map(gradeList.map((g) => [g.id, g]));
  const pool = materials.filter((m) => !m.excluded);
  const report = [];

  for (const key of ESTIMATE_KEYS) {
    // Index the measured population once per tier.
    const index = TIERS.map((t) => {
      const map = new Map();
      for (const m of pool) {
        const h = m.headline[key];
        if (!h?.known || (key === 'hdt045' && (!h.loadStated || h.loadMPa !== 0.45))) continue;
        if (h.interval?.lo == null || h.interval?.hi == null) continue;
        const k = t.key(m);
        if (!map.has(k)) map.set(k, []);
        map.get(k).push({ id: m.id, name: m.name, value: h.value, lo: h.interval.lo, hi: h.interval.hi, unit: h.unit, obs: observationKey(grades, h) });
      }
      return map;
    });

    for (const m of pool) {
      const h = m.headline[key];
      if (h?.known) continue;

      for (let i = 0; i < TIERS.length; i++) {
        const tier = TIERS[i];
        // A material never estimates from itself; it has no value here anyway.
        const all = (index[i].get(tier.key(m)) ?? []).filter((p) => p.id !== m.id);

        // Collapse peers that share one commercial source: they are one observation, not several.
        const seen = new Map();
        for (const p of all) if (!seen.has(p.obs)) seen.set(p.obs, p);
        const independent = [...seen.values()];
        const shared = all.length - independent.length;
        if (independent.length < tier.minPeers) continue;

        const peers = independent;
        if (new Set(peers.map((p) => p.unit)).size !== 1) continue;
        const lo = Math.min(...peers.map((p) => p.lo));
        const hi = Math.max(...peers.map((p) => p.hi));
        if (lo === hi) continue;
        h.estimate = {
          lo,
          hi,
          unit: peers[0].unit,
          tier: tier.id,
          basis: tier.label(m),
          peerCount: peers.length,
          sharedSourceDropped: shared || undefined,
          peers: peers.sort((a, b) => a.value - b.value).map((p) => ({ id: p.id, name: p.name, value: p.value, lo: p.lo, hi: p.hi })),
        };
        report.push({ material: m.name, key, tier: tier.id, n: peers.length, lo: h.estimate.lo, hi: h.estimate.hi });
        break;
      }
    }
  }
  return report;
}

/** Coverage summary for the validation report. */
export function summariseEstimates(materials) {
  const pool = materials.filter((m) => !m.excluded);
  const out = {};
  for (const key of ESTIMATE_KEYS) {
    const missing = pool.filter((m) => !m.headline[key]?.known);
    const byTier = {};
    for (const m of missing) {
      const t = m.headline[key].estimate?.tier ?? 'none';
      byTier[t] = (byTier[t] ?? 0) + 1;
    }
    out[key] = { missing: missing.length, ...byTier };
  }
  return out;
}
