// A locator can contain several distinct statements. Preserve their wording identity,
// and refuse an unexpected changed peer rather than admitting a silent duplicate.
export function reviewedClause(rows, proposed, operations, table, key, migration) {
  const sameLocator = (r) => r.GradeID === proposed.GradeID && r.SourceID === proposed.SourceID && r.Topic === proposed.Topic && r.Locator === proposed.Locator;
  const peers = rows.filter(sameLocator);
  const row = peers.find((r) => r.Finding === proposed.Finding);
  if (row) return row; // The caller still guards every proposed column.
  for (const peer of peers) {
    if (!operations.some((other) => other.Kind === 'append' && other.Table === table && sameLocator(other.Proposed) && other.Proposed.Finding === peer.Finding)) {
      throw new Error(`${migration}: ${peer[key]} moved`);
    }
  }
  return undefined;
}
