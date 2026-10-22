// The coverage matrix: one cell per material per domain, for the Data coverage lens. Coverage is terminal (see coverage.ts): nothing here feeds the selection engine.

export const COVERAGE_STATUS_RANK: Readonly<Record<string, number>> = {
  'Gap': 0,
  'Conflict': 1,
  'Quarantined': 2,
  'Limited comparability': 3,
  'Partially resolved': 4,
  'Reviewed with limitations': 5,
  'Resolved': 6,
  'Evidence recorded': 7,
};

export const COVERAGE_DOMAINS: readonly string[] = [
  'Identity', 'H2C status', 'Print setup', 'Mechanical', 'Thermal',
  'Moisture / environmental', 'Post-processing / application', 'Canadian price', 'Sparse properties',
];

export interface CoverageRecord {
  /** One row of the coverage table: the material it speaks for, the domain, and its status. */
  readonly materialId: string;
  readonly domain: string;
  readonly status: string;
  readonly [field: string]: unknown;
}

/** Coverage matrix for a set of materials: one cell per material per domain. */
export function coverageMatrix<M extends { readonly id: string; readonly name: unknown }>(materials: readonly M[], coverageRecords: readonly CoverageRecord[], domains: readonly string[] = COVERAGE_DOMAINS) {
  const byMaterial = new Map<string, CoverageRecord[]>();
  for (const r of coverageRecords) {
    if (!byMaterial.has(r.materialId)) byMaterial.set(r.materialId, []);
    byMaterial.get(r.materialId)!.push(r);
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

