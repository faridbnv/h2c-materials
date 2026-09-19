#!/usr/bin/env node
// Migration m60 (2026-09-19): a polymers.csv row for the PPE/PS blend, from a resin supplier's data sheet.
//
// The estimate model identifies a material by a row of polymers.csv, and a blend by its own name. THERMAX PPE/PS
// had none, so its heat-deflection headline could be neither shown (its sheet publishes only the 1.8 MPa value)
// nor estimated, and the build refused a headline that is neither. Owner ruling R041: write the row from a
// fetched reference.
//
// The reference is SABIC's NORYL 731 data sheet, an unfilled PPE+PS blend, fetched 2026-09-19 and hashed. What it
// states, read from the page:
//
//   Specific Gravity                     1.06 g/cm³   ASTM D792, ISO 1183
//   Water Absorption, saturation, 23°C   0.23 %       ISO 62
//   Water Absorption, equilibrium, 23°C, 50% RH  0.060 %  ISO 62
//   Deflection Temperature, 0.45 MPa, unannealed, 3.20 mm  132 °C  ASTM D648
//   Vicat Softening Temperature          149 °C       ASTM D1525
//
// It publishes no melting point and no crystallisation: the blend is amorphous, which is also what its deflection
// and Vicat rows without a melt say. The density range takes its low end from that sheet and its high end from
// 3DXTECH's THERMAX PPE/PS, which publishes 1.10 g/cm³; both are documents this database holds.

import { openTables } from '../data/table-io.mjs';

const SOURCE = {
  SourceID: 'R-SABIC-NORYL-731-TDS',
  Publisher: 'SABIC Innovative Plastics',
  Title: 'NORYL™ 731 resin — Polyphenylene Ether + PS',
  Revision: 'Not published',
  'Publication date': 'Not published',
  'Access date': '2026-09-19',
  'Source class': 'Resin supplier data sheet',
  'Source note': 'Document mirrored by sushengpolymer.com.',
  'Citation role': 'cited',
  URL: 'https://www.sushengpolymer.com/media/pdf/q1EyWl_NORYL-731-resin.pdf',
  Locator: 'p. 1: Physical, Thermal',
  'Applicable grades': 'Polymer identity of the PPE/PS blend (polymers.csv)',
  'Access state': 'retrieved',
  'Access note': 'Not applicable',
  SHA256: 'ecab3886bb11babece3fcedaa6ca887da2f881f818c1c0fdd63f3fef5671f73e',
};

const POLYMER = {
  PolymerID: 'PPE-PS',
  Group: 'polyphenylene ether blend',
  Morphology: 'amorphous',
  'Melting point °C': 'Not applicable',
  'As printed': 'Not applicable',
  // The column is a class, not a number: 0.23 % at saturation is low beside a polyamide's several per cent.
  'Water uptake': 'low',
  'Neat density min kg/m³': '1060',
  'Neat density max kg/m³': '1100',
  SourceID: SOURCE.SourceID,
  Basis: "SABIC NORYL 731, an unfilled PPE+PS blend: specific gravity 1.06 g/cm³ (ASTM D792, ISO 1183), water absorption at saturation 0.23 % (ISO 62), deflection temperature 132 °C at 0.45 MPa and Vicat 149 °C, with no melting point published. The high end of the density range is 3DXTECH's THERMAX PPE/PS at 1.10 g/cm³.",
};

export function migrate(t) {
  if (!t.find('sources', SOURCE.SourceID)) t.append('sources', SOURCE);
  if (!t.rows('polymers').some((p) => p.PolymerID === POLYMER.PolymerID)) t.append('polymers', POLYMER);
}

if (process.argv[1]?.endsWith('m60-ppe-ps-polymer-row.mjs')) {
  const t = openTables();
  migrate(t);
  t.save();
  console.log(`${POLYMER.PolymerID} is a polymer this database knows`);
}
