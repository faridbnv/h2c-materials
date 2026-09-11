// Family estimates: plausibility bounds for materials with no measurement of their own.
//
// Why this exists. In Explore mode a material with no mechanical data at all answered UNKNOWN to
// every mechanical criterion, so PLA Lite survived a search for "elongation at least 100%" and sat
// among the elastomers. Nobody familiar with PLA would put it there. A bound that says "every PLA
// in this database measures between 1.2 and 25% elongation" rules it out without pretending to
// know its exact value.
//
// What this is NOT. It is not a measurement, not a headline, and not usable as evidence. The
// architecture brief forbids inferring a property from a family average and then presenting it as
// data; it allows the inference only when it is explicitly separated and labelled, which is what
// the `estimate` object and the UI treatment do. Strict mode never sees these at all, and even in
// Explore an estimate can only rule a material OUT, never confirm it in. See applyEstimate in
// app/js/engine/constraints.js.
//
// Sources are the compiled headline values only: each is already verified against its own citation,
// measured in XY where direction applies, and drawn from a single grade. Pooling raw measurements
// would mix directions and specimen types and produce a bound that means nothing.

export const ESTIMATE_KEYS = ['density', 'tensileModulusXY', 'tensileStrengthXY', 'elongationXY', 'hdt045'];

/** Reinforcement classes that may share an envelope. Carbon and glass are never pooled with unfilled. */
function reinforcementClass(m) {
  switch (m.facets.reinforcement.value) {
    case 'carbon-fibre': return 'cf';
    case 'glass-fibre': return 'gf';
    case 'esd': return 'esd';
    case 'foaming': return 'foam';
    // An undisclosed commercial variant of PLA is still PLA. Grouping it with the unfilled grades
    // is a judgement, and it is recorded in the basis string the UI shows.
    default: return 'unreinforced';
  }
}

/**
 * A coarse behaviour class, used only by the widest tier.
 *
 * Without it "all unreinforced materials" pooled TPU at 0.0053 GPa with PLA at 2.88 and produced a
 * bound spanning three orders of magnitude, which rules nothing out and invites the reader to think
 * a support material might be as stiff as a structural one. Elastomers, supports and rigid
 * thermoplastics are different populations and are never pooled.
 */
function behaviourClass(m) {
  if (m.family === 'Flexible Elastomers') return 'elastomer';
  if (m.role === 'Support/interface' || /^Support/.test(m.family)) return 'support';
  return 'rigid';
}

// Most specific first. Each tier says what it pools and the minimum number of measured peers.
const TIERS = [
  {
    id: 'family+filler',
    minPeers: 2,
    label: (m) => `${m.family}, ${reinforcementClass(m) === 'unreinforced' ? 'unreinforced' : reinforcementClass(m).toUpperCase()} grades`,
    key: (m) => `${m.family}|${reinforcementClass(m)}`,
  },
  {
    id: 'family',
    minPeers: 2,
    label: (m) => `${m.family}, all grades including reinforced ones`,
    key: (m) => `${m.family}|*`,
  },
  {
    id: 'filler',
    minPeers: 3,
    label: (m) => {
      const r = reinforcementClass(m) === 'unreinforced' ? 'unreinforced' : `${reinforcementClass(m).toUpperCase()}-filled`;
      const b = { elastomer: 'elastomers', support: 'support materials', rigid: 'rigid thermoplastics' }[behaviourClass(m)];
      return `all ${r} ${b} in this database`;
    },
    key: (m) => `${behaviourClass(m)}|${reinforcementClass(m)}`,
  },
];

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
        if (!h?.known) continue;
        const k = t.key(m);
        if (!map.has(k)) map.set(k, []);
        map.get(k).push({ id: m.id, name: m.name, value: h.value, unit: h.unit, obs: observationKey(grades, h) });
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
        const vs = peers.map((p) => p.value);
        h.estimate = {
          lo: Math.min(...vs),
          hi: Math.max(...vs),
          unit: peers[0].unit,
          tier: tier.id,
          basis: tier.label(m),
          peerCount: peers.length,
          sharedSourceDropped: shared || undefined,
          peers: peers.sort((a, b) => a.value - b.value).map((p) => ({ id: p.id, name: p.name, value: p.value })),
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
