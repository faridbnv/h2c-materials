-- Open findings: coverage rows whose stored Status says the question is not settled (Gap, Conflict, Partially resolved,
-- Quarantined), and measurements whose Data status says the unit or layout is unresolved. A selection by stored words;
-- "Limited comparability" and "Reviewed with limitations" are reviewed findings, so they are not listed.
CREATE VIEW v_open_findings AS
SELECT 'coverage' AS source_table, c.coverageid AS record_id, c.materialid, c.gradeid, c.domain AS subject, c.status, c.finding AS detail, c._ord AS source_ord
FROM coverage c
WHERE c.status IN ('Gap', 'Conflict', 'Partially resolved', 'Quarantined')
UNION ALL
SELECT 'measurements', me.measurementid, me.materialid, me.gradeid, me.property, me.data_status, me.notes, me._ord
FROM measurements me
WHERE me.data_status = 'Unresolved unit / layout'
ORDER BY source_table, source_ord;
