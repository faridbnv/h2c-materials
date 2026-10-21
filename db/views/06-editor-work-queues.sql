-- Editor work queues, one row per item: summaries still draft or marked revise, every open finding, and published values
-- flagged physically implausible. Each queue is a stored word, never a computed judgement.
CREATE VIEW v_editor_work_queues AS
SELECT 'summary-needs-review' AS queue, 'material_summaries' AS source_table, s.materialid AS record_id, s.materialid, s.review_status AS reason, s._ord AS source_ord
FROM material_summaries s
WHERE s.review_status IN ('draft', 'revise')
UNION ALL
SELECT 'open-finding', f.source_table, f.record_id, f.materialid, f.status, f.source_ord
FROM v_open_findings f
UNION ALL
SELECT 'implausible-value', 'measurements', me.measurementid, me.materialid, me.data_status, me._ord
FROM measurements me
WHERE me.data_status = 'Published value (physically implausible)'
ORDER BY queue, source_table, source_ord;
