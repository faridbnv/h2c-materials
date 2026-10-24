-- Headline candidates: each pinned (material, headline, measurement) triple with the headline's definition and the
-- measurement behind it, by structural keys only. Whether the value is comparable is the engine's decision, not this view's.
CREATE VIEW v_headline_candidates AS
SELECT h._ord AS pin_ord, h.materialid, h.headlinekey, d.kind AS headline_kind, d.unit AS headline_unit,
       h.measurementid, me.gradeid, me.property, me.normalized_value, me.normalized_value_state, me.normalized_value_text,
       me.normalized_unit, me.data_status, h.reason AS pin_reason
FROM headlines h
JOIN headline_definitions d ON d.headlinekey = h.headlinekey
JOIN measurements me ON me.measurementid = h.measurementid
ORDER BY h._ord;
