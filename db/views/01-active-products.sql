-- Active products: every grade whose Status is the stored word "active", with its material (WP-09; pack 04 section 4.4).
-- A view selects, joins, groups and orders stored facts. It applies no threshold, gate, class limit, precedence or
-- comparability rule: those stay in TypeScript (packages/domain). Never published.
CREATE VIEW v_active_products AS
SELECT g._ord AS grade_ord, g.gradeid, g.materialid, m.original_name AS material, m.family, m.scope AS material_scope,
       g.role, g.manufacturer, g.product_name, g.variant, g.variant_state, g.diameter, g.diameter_state, g.sourceid
FROM grades g
JOIN materials m ON m.materialid = g.materialid
WHERE g.status = 'active'
ORDER BY g._ord;
