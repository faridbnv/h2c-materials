-- Source-linked observations: every measurement with the source it cites. normalized_value is the typed number, NULL
-- where a missing-state word stands in (normalized_value_state names the word; normalized_value_text is the exact text).
CREATE VIEW v_source_observations AS
SELECT me._ord AS measurement_ord, me.measurementid, me.materialid, me.gradeid, me.property,
       me.raw_value, me.raw_unit, me.normalized_value, me.normalized_value_state, me.normalized_value_text, me.normalized_unit,
       me.data_status, me.sourceid, s.publisher AS source_publisher, s.title AS source_title, s.title_state AS source_title_state,
       s.citation_role, s.access_state, s.sha256 AS source_sha256, me.locator
FROM measurements me
LEFT JOIN sources s ON s.sourceid = me.sourceid
ORDER BY me._ord;
