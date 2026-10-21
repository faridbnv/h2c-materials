-- Profile lineage: each print setup with the product, material and source it comes from, and how many notes it carries.
CREATE VIEW v_profile_lineage AS
SELECT p._ord AS profile_ord, p.profileid, p.materialid, m.original_name AS material, p.gradeid, g.manufacturer, g.product_name,
       p.profile, p.sourceid, s.title AS source_title, s.title_state AS source_title_state, s.access_state,
       p.h2c_sourceid, p.locator,
       (SELECT count(*) FROM profile_notes n WHERE n.profileid = p.profileid) AS note_count
FROM profiles p
JOIN materials m ON m.materialid = p.materialid
LEFT JOIN grades g ON g.gradeid = p.gradeid
LEFT JOIN sources s ON s.sourceid = p.sourceid
ORDER BY p._ord;
