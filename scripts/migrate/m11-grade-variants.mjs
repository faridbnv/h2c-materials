#!/usr/bin/env node
// Migration m11: a grade can declare that its product is a variant of its material, and two products are.
// Re-read 2026-09-14 (D35).
//
// grades.csv gains "Variant" (schema/vocab/grade-variants.csv). A variant product's numbers are its own and it
// can still be the representative grade, as headlines are single-grade observations (Method, Comparison /
// Headlines). The estimate model gives the product a covariate for its variant, so a lightweight or densely
// filled product explains its own offset instead of pulling its polymer family's estimates towards it.
//
// - 3DXTECH HyperLite PP (G082-01): the data sheet gives 0.81 g/cc; unfilled PP is about 0.90. The product
//   description, kept by an authorized distributor after 3DXTECH withdrew the page, says "Our formulation
//   includes a specialty additive which enables ultra low density (0.75g/cc)".
// - Spectrum HDPE (G085-01): the data sheet gives 1.1 g/cm3 and 3.5 GPa. Fully crystalline polyethylene is about
//   1.00 g/cm3 and neat HDPE about 1 GPa, so the "Low Warp" formulation contains an undisclosed dense filler.
//   Its values were the only polyethylene evidence and lifted the polyolefin density estimate (PP 1020 kg/m3).
// - iSANMATE PP (G082-02): the data sheet's density (printed "O.89"), tensile strength and notched impact "NB"
//   were never transcribed, and its source title named another product (PHA EM40010).

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables, nextId, projectRoot } from '../data/table-io.mjs';

export const COLUMN = 'Variant';
const DATE = '2026-09-14';
const NA = 'Not applicable';
export const TRINITY = 'R-TRINITY3DS-HYPERLITE-PP';

export const FIELD = {
  name: COLUMN, type: 'string', role: 'editorial', vocabulary: 'grade-variants', missing: [NA], constraints: { required: true },
  description: 'The product is a variant its material\'s Modifier / filler does not describe (schema/vocab/grade-variants.csv). Its values stay its own; the estimate model gives it a variant covariate so it does not pull its family. Say why in Composition / filler.',
};

export const VARIANTS = [
  { Value: 'lightweight additive', Meaning: 'A declared additive (hollow microspheres, a foaming agent) lowers the density well below the base polymer\'s; stiffness and strength may move with it.' },
  { Value: 'undisclosed dense filler', Meaning: 'The published density or stiffness is beyond what the unfilled base polymer can reach, so the product contains a filler its maker does not name.' },
];

export const GRADES = {
  'G082-01': { variant: 'lightweight additive', composition: 'Specialty additive for ultra low density; the manufacturer states 0.75 g/cc ("HyperLite PP HGB1", R-TRINITY3DS-HYPERLITE-PP). A lightweight variant, not unfilled PP.' },
  'G085-01': { variant: 'undisclosed dense filler', composition: 'Not published by the manufacturer ("Low Warp technology"). Its 1.1 g/cm³ exceeds fully crystalline polyethylene (about 1.00 g/cm³) and its 3.5 GPa modulus is about three times neat HDPE\'s, so the formulation contains a dense filler.' },
};

export const ADDED_SOURCE = {
  SourceID: TRINITY, Publisher: 'Trinity3DS (authorized 3DXTECH distributor), quoting 3DXTECH', Title: 'HyperLite PP [Polypropylene] 3D Printing Filament: product description',
  Revision: 'Not published', 'Publication date': 'Not published', 'Access date': DATE, 'Source class': 'Manufacturer description at distributor',
  URL: 'https://www.trinity3ds.com/3dxtech-filament/pp', Locator: 'Product description', 'Applicable grades': 'G082-01', 'Access status': 'Retrieved',
  SHA256: '14e5f7cc3b0082deadae376d32fcb15ff558d97d6342b0c16f12075bcc855118',
};

/** Measurements added: a template row and the fields that differ. */
export const ADDITIONS = [
  { like: 'V001490', source: TRINITY, set: { 'Raw value': '0.75g/cc', 'Raw numeric': '0.75', 'Normalized value': '750', 'Standard / load': 'Not published', 'Specimen / print parameters': 'Not published',
    Locator: 'Product description: ultra low density (0.75g/cc)',
    Notes: `Added ${DATE} (m11): a product-description claim, not a test result; the data sheet gives 0.81 g/cc (V001490). Describes this lightweight variant, not unfilled PP.` } },
  { like: 'V001497', source: 'I-PP-TDS', set: { Property: 'Density', 'Raw value': 'O.89', 'Raw unit': 'g/cm3', 'Raw numeric': '0.89', 'Conversion factor': '1000', 'Normalized value': '890', 'Normalized unit': 'kg/m³',
    'Specimen type': 'Not published (density specimen form not explicitly established)', Direction: NA, 'Standard / load': 'ISO1183', Locator: 'p. 1: Density',
    Notes: `Added ${DATE} (m11): never transcribed; the data sheet prints the value as "O.89" (letter O), which is 0.89 g/cm³.` } },
  { like: 'V001497', source: 'I-PP-TDS', set: { Property: 'Tensile strength (endpoint unspecified)', 'Raw value': '13.9', 'Raw unit': 'MPa', 'Raw numeric': '13.9', 'Normalized value': '13.9', 'Normalized unit': 'MPa',
    'Standard / load': 'ISO 527', Locator: 'p. 1: Tensile Strength', Notes: `Added ${DATE} (m11): never transcribed. The sheet gives 13.9 MPa for both tensile and flexural strength.` } },
  { like: 'V001497', source: 'I-PP-TDS', set: { Property: 'Izod strength', 'Raw value': 'NB', 'Raw unit': 'Qualitative (no fracture)', 'Raw numeric': NA, 'Normalized value': 'Insufficient comparable data', 'Normalized unit': 'Qualitative (no fracture)',
    'Data status': 'Published qualitative result', 'Standard / load': 'IS O 179', Notch: 'Notched', Locator: 'p. 1: Notched Izod Impact Strength',
    Notes: `Added ${DATE} (m11): never transcribed. The sheet says "Notched Izod Impact Strength, KJ/m2, ISO 179: NB" (no break); ISO 179 is the Charpy standard, so the test type is uncertain.` } },
];

export function migrate(t, root = projectRoot) {
  const schemaPath = join(root, 'schema/tables/grades.schema.json');
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  if (!schema.fields.some((f) => f.name === COLUMN)) {
    schema.fields.splice(schema.fields.findIndex((f) => f.name === 'Composition / filler') + 1, 0, FIELD);
    writeFileSync(schemaPath, `${JSON.stringify(schema, null, 2)}\n`);
    t.schemas.grades = schema;
  }
  if (!t.rows('grades')[0] || !(COLUMN in t.rows('grades')[0])) t.addColumn('grades', COLUMN, { after: 'Composition / filler', fill: () => NA });

  writeFileSync(join(root, 'schema/vocab/grade-variants.csv'), `Value,Meaning\n${VARIANTS.map((v) => `${v.Value},"${v.Meaning.replaceAll('"', '""')}"`).join('\n')}\n`);

  const vocabPath = join(root, 'schema/vocab/source-classes.csv');
  const vocab = readFileSync(vocabPath, 'utf8');
  if (!vocab.includes(`\n${ADDED_SOURCE['Source class']},`)) {
    const lines = vocab.trimEnd().split('\n');
    const at = lines.findIndex((l, i) => i > 0 && l.localeCompare(ADDED_SOURCE['Source class']) > 0);
    lines.splice(at < 0 ? lines.length : at, 0, `${ADDED_SOURCE['Source class']},`); // keep the file's order
    writeFileSync(vocabPath, `${lines.join('\n')}\n`);
  }
  if (!t.find('sources', TRINITY)) t.append('sources', ADDED_SOURCE);
  if (t.get('sources', 'I-PP-TDS').Title !== 'PP Filament Technical Data Sheet') t.set('sources', 'I-PP-TDS', 'Title', 'PP Filament Technical Data Sheet', { expect: '意可曼PHA EM40010' });
  if (t.get('sources', 'I-PP-TDS')['Access date'] !== DATE) t.set('sources', 'I-PP-TDS', 'Access date', DATE);
  if (t.get('sources', 'X-Hyperlite-PP-TDS-v1')['Access date'] !== DATE) t.set('sources', 'X-Hyperlite-PP-TDS-v1', 'Access date', DATE);

  for (const [id, { variant, composition }] of Object.entries(GRADES)) {
    const g = t.get('grades', id);
    if (g['Composition / filler'] !== composition) t.set('grades', id, 'Composition / filler', composition, { expect: 'Not published' });
    if (g[COLUMN] !== variant) t.set('grades', id, COLUMN, variant, { expect: NA });
  }
  if (t.get('sources', 'S-SPECTRUM-en-tds-spectrum-hdpe')['Access date'] !== DATE) t.set('sources', 'S-SPECTRUM-en-tds-spectrum-hdpe', 'Access date', DATE);

  const rows = t.rows('measurements');
  for (const a of ADDITIONS) {
    const like = t.get('measurements', a.like);
    if (rows.some((r) => r.SourceID === a.source && r.Locator === a.set.Locator)) continue;
    t.append('measurements', { ...like, ...a.set, SourceID: a.source, MeasurementID: nextId('measurements', rows.map((r) => r.MeasurementID)) });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  for (const c of t.save()) console.log(`${c.action.padEnd(7)} ${c.table} ${c.record ?? ''} ${c.field ?? ''}`);
}
