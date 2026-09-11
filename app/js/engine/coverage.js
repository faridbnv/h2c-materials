// Coverage. Method sheet, Verification / Coverage: "Coverage is terminal: it reports gaps and
// conflicts but does not drive material or price calculations."
//
// So nothing here may feed the selection engine. It answers a different question: what can this
// database decide, and what can it not.

export const COVERAGE_STATUS_RANK = {
  'Gap': 0,
  'Conflict': 1,
  'Quarantined': 2,
  'Limited comparability': 3,
  'Partially resolved': 4,
  'Reviewed with limitations': 5,
  'Resolved': 6,
  'Evidence recorded': 7,
};

export const COVERAGE_DOMAINS = [
  'Identity', 'H2C status', 'Print setup', 'Mechanical', 'Thermal',
  'Moisture / environmental', 'Post-processing / application', 'Canadian price', 'Sparse properties',
];

/** Coverage matrix for a set of materials: one cell per material per domain. */
export function coverageMatrix(materials, coverageRecords, domains = COVERAGE_DOMAINS) {
  const byMaterial = new Map();
  for (const r of coverageRecords) {
    if (!byMaterial.has(r.materialId)) byMaterial.set(r.materialId, []);
    byMaterial.get(r.materialId).push(r);
  }
  return materials.map((m) => {
    const records = byMaterial.get(m.id) ?? [];
    const cells = domains.map((domain) => {
      const hits = records.filter((r) => r.domain === domain);
      if (!hits.length) return { domain, status: null, records: [] };
      // Show the weakest status present; a gap alongside evidence is still a gap.
      const worst = hits.reduce((a, b) =>
        (COVERAGE_STATUS_RANK[a.status] ?? 9) <= (COVERAGE_STATUS_RANK[b.status] ?? 9) ? a : b);
      return { domain, status: worst.status, records: hits };
    });
    return { materialId: m.id, name: m.name, cells };
  });
}

/**
 * Per-material headline completeness. This is the brief's answer to a fabricated confidence score:
 * show what is present over what was asked for, and let the reader judge.
 */
export function headlineCompleteness(material, keys) {
  const available = keys.filter((k) => material.headline?.[k]?.known);
  return { available: available.length, requested: keys.length, missing: keys.filter((k) => !material.headline?.[k]?.known) };
}

/** Evidence summary for one material: counts, not a score. */
export function evidenceSummary(material, { measurements, evidence, coverage, grades }) {
  const mine = (rows) => rows.filter((r) => r.materialId === material.id);
  const ms = mine(measurements);
  const cov = mine(coverage);
  return {
    measurements: ms.length,
    numericMeasurements: ms.filter((m) => m.numeric).length,
    quarantined: ms.filter((m) => m.quarantined).length,
    grades: mine(grades).length,
    exactGradeEvidence: ms.some((m) => m.gradeId && m.gradeId !== 'Not applicable'),
    evidenceRecords: mine(evidence).length,
    gaps: cov.filter((c) => c.status === 'Gap').length,
    conflicts: cov.filter((c) => c.status === 'Conflict').length,
    limitedComparability: cov.filter((c) => c.status === 'Limited comparability').length,
  };
}

/** Data-availability count for one headline key, for the filter rail's inline label. */
export function availability(materials, key) {
  const withData = materials.filter((m) => m.headline?.[key]?.known).length;
  const caveats = key === 'hdt045'
    ? materials.filter((m) => m.headline?.hdt045?.known && m.headline.hdt045.loadStated === false).length
    : 0;
  return { withData, total: materials.length, caveats };
}
