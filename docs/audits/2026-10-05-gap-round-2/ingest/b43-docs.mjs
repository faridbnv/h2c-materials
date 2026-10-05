// The thirteen held sheets' readings (ten admitted). Every cell is the page's own words; the page numbers and rows were
// read on the page images (150 dpi) and against the cached text of each document.
import { ACCESSED, FETCHED, NA, NP, num } from './b43-lib.mjs';

// ---- Stratasys condition tables: a table per layer height / printer / support, a column per print orientation ----------
const SEC = {
  tensile: { std: 'ASTM D638', head: 'Tensile Properties' },
  flexural: { std: 'ASTM D790, Procedure A', head: 'Flexural Properties' },
  compression: { std: 'ASTM D695', head: 'Compression Properties' },
  impact: { std: 'ASTM D256, ASTM D4812', head: 'Impact Properties' },
};
const SD_NOTE = 'The figure in parentheses is the standard deviation (the table footnote).';

/** rows: [section, label, unit, property, [cell per column or null], { notch, note }] */
function stratasysMech({ page, table, title, layer, cols, post, rows, tableNote }) {
  const out = [];
  for (const [sec, label, unit, property, cells, opt = {}] of rows) {
    cells.forEach((cell, i) => {
      if (!cell) return;
      const col = cols[i];
      const direction = sec === 'tensile' && col === 'ZX' ? 'Z' : col;
      out.push({
        page, property, label: `${label} ${unit}`, unit, raw: cell, num: num(cell),
        line: `${label} ${unit} ${cells.filter(Boolean).join(' ')}`,
        direction, specimenType: 'Printed specimen', std: SEC[sec].std, notch: opt.notch, post,
        params: `${title} · ${layer} Layer Height · ${col} Orientation`,
        locator: `p. ${page}: ${SEC[sec].head}: ${label} ${unit} (${col}), ${table}`,
        notes: [SD_NOTE, sec === 'tensile' && col === 'ZX' ? 'The sheet calls the ZX bar Upright; a tensile bar the sheet shows upright is Z, the layer strength (D92, m191).' : null, opt.note, tableNote].filter(Boolean).join(' '),
        status: opt.status, review: undefined,
      });
    });
  }
  return out;
}

const ANTERO_SHA = '893aa52753128a6faed685c450fcbbcb03089483e3e9c98f1bfd01fd6a022577';
const ANNEAL = 'annealed at 200 °C (392 °F) for three hours in a sand medium';
const ANNEAL_REVIEW = 'Fields: Anneal h. The sheet writes the time in words ("for three hours"), which the parser reads as no stated time; the typed value is 3.';

const antero = {
  name: 'Stratasys Antero 800NA', sha256: ANTERO_SHA, sourceId: 'R-STRATASYS-mds-fdm-antero-800na-0825a', publisher: 'Stratasys', provider: 'Stratasys',
  title: 'MATERIAL DATA SHEET Antero 800NA', revision: '0825a (MDS_FDM_Antero 800NA_0825a)',
  url: 'https://www.stratasys.com/siteassets/materials/materials-catalog/fdm-materials/antero-800na/mds_fdm_antero-800na_0825a.pdf?v=4a4973',
  docKey: 'https://www.stratasys.com/siteassets/materials/materials-catalog/fdm-materials/antero-800na/mds_fdm_antero-800na_0825a.pdf?v=4a4973',
  accessed: ACCESSED, accessNote: FETCHED('Claude Sonnet'), titleEvidence: 'Antero 800NA',
  sourceNote: 'Stratasys material data sheet (14 pages) for the FDM filament Antero 800NA: physical and mechanical tables for the as-printed and the annealed state, by print orientation.',
  identityNote: 'R192 (owner, 2026-09-25): Antero 800NA is PEKK ("a PEKK-based FDM thermoplastic", p. 2); filed under PEKK (M098).',
  grades: [{
    key: 'main', materialId: 'M098', manufacturer: 'Stratasys', product: 'Antero 800NA',
    composition: 'a PEKK-based FDM thermoplastic (p. 2, as the sheet states it)',
    note: 'New product: Stratasys Antero 800NA, filed under PEKK (M098) by the owner\'s ruling R192; no grade of this product exists.', evidence: 'Antero 800NA is a PEKK-based FDM thermoplastic with excellent', evidencePage: 2,
  }],
  skipped: [
    'p. 3 (printer and support compatibility, ordering information) names a printer, tips and a build sheet; its "Hardened machine upgrade; Hardened Fortus 450mc head" and the high-temperature build sheet enter as the print profile. Part numbers and prices are not data.',
    'p. 4 and 11: Volume Resistivity "> 1.4*10^14 Ω*cm": the text layer sets the power of ten apart from its mantissa, so the number cannot be bound to its page; it stays in the record tier. Dissipation Factor, Thermal Diffusivity and Chemical Compatibility have no property in properties.csv. The sheet\'s second unit (°F, psi, ksi, ft*lb/in, BTU) repeats each figure and is not a second measurement.',
    'p. 6, 7, 12: "No break", "No Yield" and "-" cells state no number and are not values; Compression Modulus has no property in properties.csv.',
    'p. 8: the UV-exposed row of Table 6 (1,000 h of QUV cycling) is an aged state, not recorded as a value; its control row (no UV exposure) is entered. Table 7 (performance at temperature) states percent changes against room-temperature results, not property values; p. 9 and 10 (chemical resistance, flame, smoke and toxicity), p. 11 and 12 (outgassing, annealed flammability) are test outcomes with no property in properties.csv; p. 13 and 14 hold curves.',
  ],
  measure() {
    const out = [];
    const T3 = 'Table 3: Antero 800NA Physical Properties';
    const phys = (page, table, label, std, cells, cols, opts) => cols.forEach((col, i) => {
      if (cells[i] == null) return;
      out.push({ page, property: opts.property, label, unit: opts.unit, raw: cells[i], num: num(cells[i]), line: `${label} ${std} ${cells.filter(Boolean).join(' ')}`,
        direction: NA, specimenType: opts.specimenType ?? 'Printed specimen', std: opts.property === 'HDT' ? `${label} ${std}` : std, post: opts.post ?? 'As printed', testTemp: opts.testTemp, annealC: opts.annealC,
        params: opts.noColumn ? table : `${table} · ${col} column`, locator: `p. ${page}: ${label}${opts.noColumn ? '' : `, ${col}`}`, notes: opts.notes, review: opts.review });
    });
    // Table 3 (p. 4): as printed
    phys(4, T3, 'HDT @ 66 psi', 'ASTM D648 Method B', ['158 °C (316 °F)', '158 °C (316 °F)'], ['XY', 'ZX'], { property: 'HDT', unit: '°C' });
    phys(4, T3, 'HDT @ 264 psi', 'ASTM D648 Method B', ['157 °C (315 °F)', '156 °C (313 °F)'], ['XY', 'ZX'], { property: 'HDT', unit: '°C' });
    phys(4, T3, 'Molded HDT @ 66 psi', 'ASTM D648 Method B', ['151 °C (304 °F)'], ['both'], { property: 'HDT', unit: '°C', specimenType: 'Raw material value', post: NP, noColumn: true, notes: 'A molded bar, printed in the same table beside the printed columns.' });
    phys(4, T3, 'Molded HDT @ 264 psi', 'ASTM D648 Method B', ['147 °C (297 °F)'], ['both'], { property: 'HDT', unit: '°C', specimenType: 'Raw material value', post: NP, noColumn: true, notes: 'A molded bar, printed in the same table beside the printed columns.' });
    phys(4, T3, 'Tg', 'ASTM D7426 Inflection Point', ['156 °C (313 °F)'], ['both'], { property: 'Glass transition temperature', unit: '°C', noColumn: true });
    phys(4, T3, 'Melt Point', 'ASTM D7426 Peak Heat', ['300 °C (572 °F)'], ['both'], { property: 'Melting temperature', unit: '°C', noColumn: true });
    phys(4, T3, 'Mean CTE', 'ASTM E831 (40 °C to 140 °C)', ['36.11 μm/[m*°C]', '50.20 μm/[m*°C]'], ['XY', 'ZX'], { property: 'Coefficient of thermal expansion', unit: 'µm/m/K', testTemp: '40 °C to 140 °C' });
    phys(4, T3, 'Dielectric Constant', 'ASTM D150 1 kHz test condition', ['3.32'], ['both'], { property: 'Relative permittivity', unit: 'Dimensionless', noColumn: true, post: NP });
    for (const [temp, w] of [['0', '0.2988'], ['30', '0.3011'], ['60', '0.3054'], ['90', '0.3088']]) {
      out.push({ page: 4, property: 'Thermal conductivity', label: `Thermal Conductivity @${temp} °C`, unit: 'W/(m·K)', raw: `${w} W/m*K`, num: Number(w), line: `Thermal Conductivity ASTM E1952 @${temp} °C ${w} W/m*K`,
        direction: NA, specimenType: 'Printed specimen', std: 'ASTM E1952', testTemp: `${temp} °C`, post: 'As printed', params: T3, locator: `p. 4: Thermal Conductivity @${temp} °C` });
    }
    out.push({ page: 4, property: 'Density', label: 'Specific Gravity', unit: 'g/cm3', raw: '1.28', num: 1.28, line: 'Specific Gravity ASTM D792 @23 °C 1.28', direction: NA, specimenType: 'Printed specimen',
      std: 'ASTM D792', testTemp: '23 °C', post: 'As printed', params: T3, locator: 'p. 4: Specific Gravity', notes: 'A specific gravity is dimensionless; the register reads every specific gravity as g/cm3 at the temperature stated.' });
    // Tables 4 and 5 (p. 6, 7): as printed
    const t4 = [
      ['tensile', 'Yield Strength', 'MPa', 'Tensile yield strength', ['86.7 (5.0)', '59.4 (5.8)']],
      ['tensile', 'Elongation @ Yield', '%', 'Elongation at yield', ['4.7', '2.3']],
      ['tensile', 'Strength @ Break', 'MPa', 'Tensile break strength', ['73.0 (4.7)', '59.7 (5.5)']],
      ['tensile', 'Elongation @ Break', '%', 'Elongation at break', ['6.1', '2.3']],
      ['tensile', 'Modulus (Elastic)', 'GPa', 'Tensile modulus', ['2.64 (0.05)', '2.77 (0.04)']],
      ['flexural', 'Strength @ Break', 'MPa', 'Flexural strength', [null, '106 (13)']],
      ['flexural', 'Strength @ 5% Strain', 'MPa', 'Flexural stress at conventional deflection', ['136 (2.3)', null], { note: 'Flexural stress at 5 % strain; the ZX column prints "-".' }],
      ['flexural', 'Strain @ Break', '%', 'Flexural elongation at break', [null, '4.1']],
      ['flexural', 'Modulus', 'GPa', 'Flexural modulus', ['3.20 (0.04)', '2.65 (0.03)']],
      ['compression', 'Yield Strength', 'MPa', 'Compression strength', ['95.8 (5.9)', '95.4 (4.0)'], { note: 'Compressive yield strength.' }],
      ['impact', 'Notched', 'J/m', 'Izod impact strength', ['41.1 (6.9)', '33.3 (4.2)'], { notch: 'Notched' }],
      ['impact', 'Unnotched', 'J/m', 'Izod impact strength', ['1,730 (680)', '203 (35)'], { notch: 'Unnotched' }],
    ];
    const t5 = [
      ['tensile', 'Yield Strength', 'MPa', 'Tensile yield strength', ['90.0 (5.2)', '50.1 (3.6)']],
      ['tensile', 'Elongation @ Yield', '%', 'Elongation at yield', ['4.8', '1.8']],
      ['tensile', 'Strength @ Break', 'MPa', 'Tensile break strength', ['73.0 (13)', '49.4 (3.8)']],
      ['tensile', 'Elongation @ Break', '%', 'Elongation at break', ['6.4', '1.8']],
      ['tensile', 'Modulus (Elastic)', 'GPa', 'Tensile modulus', ['2.71 (0.05)', '2.89 (0.05)']],
      ['flexural', 'Strength @ Break', 'MPa', 'Flexural strength', [null, '96.6 (11)']],
      ['flexural', 'Strength @ 5% Strain', 'MPa', 'Flexural stress at conventional deflection', ['137 (1.85)', null], { note: 'Flexural stress at 5 % strain; the ZX column prints "-".' }],
      ['flexural', 'Strain @ Break', '%', 'Flexural elongation at break', [null, '3.6']],
      ['flexural', 'Modulus', 'GPa', 'Flexural modulus', ['3.20 (0.02)', '3.84 (0.07)']],
      ['compression', 'Yield Strength', 'MPa', 'Compression strength', ['98.4 (4.8)', '102 (1.4)'], { note: 'Compressive yield strength.' }],
      ['impact', 'Notched', 'J/m', 'Izod impact strength', ['40.0 (6.3)', '30.1 (6.0)'], { notch: 'Notched' }],
      ['impact', 'Unnotched', 'J/m', 'Izod impact strength', ['2,730 (1,400)', '119 (44)'], { notch: 'Unnotched' }],
    ];
    out.push(...stratasysMech({ page: 6, table: 'Table 4', title: 'Table 4: Antero 800NA Mechanical Properties - F900 - T20F Tip', layer: '0.254 mm (0.010 in.)', cols: ['XZ', 'ZX'], post: NP, rows: t4,
      tableNote: 'Printed on the F900 with a T20F tip. The annealed state is Table 12.' }));
    out.push(...stratasysMech({ page: 7, table: 'Table 5', title: 'Table 5: Antero 800NA Mechanical Properties - Fortus 450mc - T20F Tip', layer: '0.254 mm (0.010 in.)', cols: ['XZ', 'ZX'], post: NP, rows: t5,
      tableNote: 'Printed on the Fortus 450mc with a T20F tip. The annealed state is Table 12.' }));
    // Table 6 (p. 8): the unexposed control of the UV-ageing test, upright ZX tensile coupons
    for (const [label, unit, property, cell] of [['Yield Strength (MPa)', 'MPa', 'Tensile yield strength', '57.4'], ['Stress at Break (MPa)', 'MPa', 'Tensile break strength', '57.6'], ['Elongation at Break (%)', '%', 'Elongation at break', '2.4'], ['Modulus (GPa)', 'GPa', 'Tensile modulus', '2.7']]) {
      out.push({ page: 8, property, label, unit, raw: cell, num: Number(cell), line: `No UV Exposure 8,320 57.4 8,360 57.6 2.4 - 392 2.7`, direction: 'Z', specimenType: 'Printed specimen', std: 'ASTM D638', post: NP,
        params: 'Table 6: UV Aging of Antero 800NA - F900 - T20F Tip · No UV Exposure control · 0.254 mm (0.010 in.) layer height · ZX (upright) coupons', locator: `p. 8: Table 6 No UV Exposure: ${label}`,
        notes: 'The control of the sheet\'s UV-ageing test: ten ASTM D638 upright (ZX) coupons printed on the F900 with a T20F tip, tested without UV exposure. The sheet calls the ZX bar upright; a tensile bar the sheet shows upright is Z, the layer strength (D92, m191). The UV-exposed row is not recorded.' });
    }
    // Table 11 (p. 11): annealed physical
    const T11 = 'Table 11: Antero 800NA Annealed Physical Properties - Fortus 450mc - T20D';
    const ann = { post: ANNEAL, review: ANNEAL_REVIEW, annealC: 200, annealH: 3 };
    const phys11 = (label, std, cells, cols, opts) => cols.forEach((col, i) => {
      if (cells[i] == null) return;
      out.push({ page: 11, property: opts.property, label, unit: opts.unit, raw: cells[i], num: num(cells[i]), line: `${label} ${std} ${cells.filter(Boolean).join(' ')}`,
        direction: NA, specimenType: 'Printed specimen', std: opts.property === 'HDT' ? `${label} ${std}` : std, ...ann, params: opts.noColumn ? T11 : `${T11} · ${col} column`, locator: `p. 11: ${label}${opts.noColumn ? '' : `, ${col}`}`, notes: opts.notes });
    });
    phys11('HDT @ 66 psi (printed)', 'ASTM D648 Method B', ['177 °C (350.6 °F)', '170 °C (354.2 °F)', '176 °C (348.8 °F)'], ['XY', 'XZ', 'ZX'], { property: 'HDT', unit: '°C', notes: 'The XZ cell prints 170 °C beside 354.2 °F, which is 179 °C; the sheet\'s two figures disagree and the SI figure as printed is recorded.' });
    phys11('HDT @ 266 psi (printed)', 'ASTM D648 Method B', ['159 °C (318.2 °F)', '159 °C (318.2 °F)', '155 °C (311 °F)'], ['XY', 'XZ', 'ZX'], { property: 'HDT', unit: '°C', notes: 'The sheet prints 266 psi here and 264 psi in Table 3 for the same method; the load is recorded as the sheet prints it (the parser reads no load from 266 psi).' });
    phys11('Tg', 'ASTM D7426-08', ['151 °C (303.8 °F)'], ['both'], { property: 'Glass transition temperature', unit: '°C', noColumn: true });
    phys11('Mean CTE (X)', 'ASTM E831', ['48.89 μm/[m*°C]'], ['both'], { property: 'Coefficient of thermal expansion', unit: 'µm/m/K', noColumn: true, notes: 'Expansion along the X axis; the temperature range is not stated.' });
    phys11('Mean CTE (Y)', 'ASTM E831', ['46.61 μm/[m*°C]'], ['both'], { property: 'Coefficient of thermal expansion', unit: 'µm/m/K', noColumn: true, notes: 'Expansion along the Y axis; the temperature range is not stated.' });
    phys11('Mean CTE (Z)', 'ASTM E831', ['52.54 μm/[m*°C]'], ['both'], { property: 'Coefficient of thermal expansion', unit: 'µm/m/K', noColumn: true, notes: 'Expansion along the Z axis; the temperature range is not stated.' });
    phys11('Dielectric Constant', 'ASTM D150-98 1 kHz test condition', ['3.23', null, '3.32'], ['XY', 'XZ', 'ZX'], { property: 'Relative permittivity', unit: 'Dimensionless' });
    phys11('Specific Gravity', 'ASTM D792', ['1.31'], ['both'], { property: 'Density', unit: 'g/cm3', noColumn: true, notes: 'A specific gravity is dimensionless; the register reads every specific gravity as g/cm3. Temperature not stated in this table.' });
    // Table 12 (p. 12): annealed mechanical
    const t12 = [
      ['tensile', 'Elongation @ Yield', '%', 'Elongation at yield', ['2.7 (0.64)', '0.75 (0.27)']],
      ['tensile', 'Strength @ Break', 'MPa', 'Tensile break strength', ['88.8 (12)', '36.7 (4.4)']],
      ['tensile', 'Elongation @ Break', '%', 'Elongation at break', ['2.6 (0.65)', '0.83 (0.28)']],
      ['tensile', 'Modulus (Elastic)', 'GPa', 'Tensile modulus', ['3.87 (0.34)', '4.03 (1.4)']],
      ['flexural', 'Flex Strength', 'MPa', 'Flexural strength', ['173 (4.9)', '53.6 (8.2)']],
      ['flexural', 'Strain @ Break', '%', 'Flexural elongation at break', [null, '1.8 (1.4)']],
      ['flexural', 'Modulus', 'GPa', 'Flexural modulus', [null, '2.96 (0.12)']],
      ['compression', 'Yield Strength', 'MPa', 'Compression strength', ['108 (13)', '106 (4.6)'], { note: 'Compressive yield strength.' }],
      ['impact', 'Notched', 'J/m', 'Izod impact strength', ['27.2 (5.3)', '16.6 (6.4)'], { notch: 'Notched' }],
      ['impact', 'Unnotched', 'J/m', 'Izod impact strength', ['625 (120)', '48.1 (10)'], { notch: 'Unnotched' }],
    ];
    const rows12 = stratasysMech({ page: 12, table: 'Table 12', title: 'Table 12: Antero 800NA Annealed Mechanical Properties - Fortus 450mc - T20D tip', layer: '0.254 mm (0.010 in.)', cols: ['XZ', 'ZX'], post: ANNEAL, rows: t12,
      tableNote: 'Annealed: printed on the Fortus 450mc with a T20D tip, then annealed at 200 °C for three hours in a sand medium (p. 11).' });
    rows12.forEach((r) => Object.assign(r, { review: ANNEAL_REVIEW, annealC: 200, annealH: 3 }));
    out.push(...rows12);
    out.push({ page: 12, property: 'Flexural modulus', label: 'Modulus GPa', unit: 'GPa', raw: '40.3 (0.11)', num: 40.3, line: 'Modulus GPa 40.3 (0.11) 2.96 (0.12)', direction: 'XZ', specimenType: 'Printed specimen',
      std: SEC.flexural.std, post: ANNEAL, review: ANNEAL_REVIEW, annealC: 200, annealH: 3, status: 'Published value (physically implausible)',
      params: 'Table 12: Antero 800NA Annealed Mechanical Properties - Fortus 450mc - T20D tip · 0.254 mm (0.010 in.) Layer Height · XZ Orientation', locator: 'p. 12: Flexural Properties: Modulus GPa (XZ), Table 12',
      notes: `${SD_NOTE} The sheet prints 40.3 GPa (5,840 ksi) for the XZ bar, twelve times its printed-state 3.20 GPa and its own ZX 2.96 GPa; no PEKK reaches it, so it backs no value.` });
    return out;
  },
  accept: [
    { locator: 'p. 6: Tensile Properties: Elongation @ Yield % (ZX), Table 4', code: 'MEAS-PHYSICS-ORDER', reason: 'The lint pairs this yield elongation (Table 4, F900) with the break elongation of Table 5 (Fortus 450mc), two print set-ups of the same sheet; inside Table 4 the ZX yield and break elongations are both 2.3 %.' },
    { locator: 'p. 7: Tensile Properties: Elongation @ Break % (ZX), Table 5', code: 'MEAS-PHYSICS-STRAIN', reason: 'The lint divides Table 4\'s ZX break strength by Table 4\'s ZX modulus; inside Table 5 the ZX break strength 49.4 MPa over its modulus 2.89 GPa is 1.7 %, below the 1.8 % printed.' },
    { locator: 'p. 7: Impact Properties: Unnotched J/m (XZ), Table 5', code: 'MEAS-PHYSICS-WINDOW', reason: 'Printed as 2,730 (1,400) J/m: the unnotched bars of the XZ orientation scatter widely (Table 4 prints 1,730 (680) for the same orientation); the value is the sheet\'s, with its standard deviation.' },
  ],
  profiles: [{
    page: 3, locator: 'Product Information: Table 1 and System Requirements',
    cells: { plate: 'High Temperature Build Sheet 0.51 x 660 x 965 mm (0.02 x 26 x 38 in.); 0.51 x 406 x 470 mm (0.02 x 16 x 18.5 in.)', abrasion: 'Hardened machine upgrade; Hardened Fortus 450mc head' },
    lines: { plate: 'High Temperature • 0.51 x 660 x 965 mm (0.02 x 26 x 38 in.) • 0.51 x 406 x 470 mm (0.02 x 16 x 18.5 in.)' }, evidence: 'Hardened machine upgrade Hardened Fortus 450mc head',
    support: 'SUP8000B (breakaway) with a T16 support tip', notes: [['Layer height', '0.254 mm (0.010 in.) with the T20D or T20F tip; the T20F improves mechanical performance and is the recommended tip']],
  }],
};

// ---- Stratasys FDM Nylon-CF10 -------------------------------------------------------------------------------------------
const cf10 = {
  name: 'Stratasys FDM Nylon-CF10', sha256: 'd311f4ae2286bd106c3be034245dd03f4428abf23a1b7ee79dd9d630177ce84c', sourceId: 'R-STRATASYS-fdm-nylon-cf10-material-datasheet', publisher: 'Stratasys', provider: 'Stratasys',
  title: 'MATERIAL DATA SHEET FDM Nylon-CF10', revision: '0723a (MDS_FDM_FDM Nylon-CF10_0723a)',
  url: 'https://www.stratasys.com/siteassets/materials/materials-catalog/fdm-materials/nylon-cf10/redesign/fdm-nylon-cf10-material-datasheet.pdf?v=4ac731',
  docKey: 'https://www.stratasys.com/siteassets/materials/materials-catalog/fdm-materials/nylon-cf10/redesign/fdm-nylon-cf10-material-datasheet.pdf?v=4ac731',
  accessed: ACCESSED, accessNote: FETCHED('Claude Sonnet'), titleEvidence: 'FDM Nylon-CF10',
  sourceNote: 'Stratasys material data sheet (8 pages) for FDM Nylon-CF10: physical properties by orientation, mechanical properties for two print set-ups.',
  identityNote: 'R168: a sheet whose only word for its polymer is "nylon" ("a blended nylon polymer with 10% chopped carbon fiber (by weight)", p. 2) is filed in the nylon home that holds its declared filler: Nylon-CF, maker-undisclosed polyamide (M165).',
  grades: [{
    key: 'main', materialId: 'M165', manufacturer: 'Stratasys', product: 'FDM Nylon-CF10',
    composition: 'a composite material combining a blended nylon polymer with 10% chopped carbon fiber (by weight) (p. 2, as the sheet states it)',
    note: 'New product: Stratasys FDM Nylon-CF10, filed under Nylon-CF, maker-undisclosed polyamide (M165) by R168.', evidence: 'FDM Nylon-CF10 is a composite material combining a blended nylon polymer with 10% chopped carbon fiber', evidencePage: 2,
  }],
  skipped: [
    'p. 3 (printer and support compatibility, ordering information) names heads, trays and supports; the hardened extrusion head and the build trays enter as the print profile. Part numbers are not data.',
    'p. 4: Volume Resistivity (1.88E+15 and 4.25E+13 Ohms-cm) is entered; the sheet\'s imperial repeats of every figure are not second measurements.',
    'p. 6 and 7: "No Yield" cells state no number; Compression Modulus has no property in properties.csv; the Compression Yield Strength rows are "No Yield" in both columns, and the Peak Strength rows are entered as the compression strength with the peak named in Notes.',
    'p. 8 (chemical resistance, Table 6) states percent changes of tensile properties after a 72 hour exposure, not property values.',
  ],
  measure() {
    const out = [];
    const T3 = 'Table 3. FDM Nylon-CF10 Physical Properties';
    const two = (label, std, cells, opts) => ['XY', 'XZ/ZX'].forEach((col, i) => {
      if (cells[i] == null) return;
      out.push({ page: 4, property: opts.property, label, unit: opts.unit, raw: cells[i], num: opts.numText ? Number(opts.numText[i]) : num(cells[i]), numText: opts.numText?.[i], line: `${label} ${std} ${cells.filter(Boolean).join(' ')}`,
        direction: NA, specimenType: 'Printed specimen', std: opts.property === 'HDT' ? `${label} ${std}` : std, post: 'As printed', testTemp: opts.testTemp, params: `${T3} · ${col} column`, locator: `p. 4: ${label}, ${col}`, notes: opts.notes });
    });
    two('HDT @ 66 psi', 'ASTM D648 Method B', ['58 °C (136 °F)', '77 °C (171 °F)'], { property: 'HDT', unit: '°C' });
    two('HDT @ 264 psi', 'ASTM D648 Method B', ['52 °C (126 °F)', '62 °C (144 °F)'], { property: 'HDT', unit: '°C' });
    out.push({ page: 4, property: 'Glass transition temperature', label: 'Tg', unit: '°C', raw: '109 °C (228.2 °F)', num: 109, line: 'Tg ASTM D7426 Inflection Point 109 °C (228.2 °F)', direction: NA, specimenType: 'Printed specimen', std: 'ASTM D7426 Inflection Point', post: 'As printed', params: T3, locator: 'p. 4: Tg' });
    two('CTE (XY)', 'ASTM E831 (RT to 60 °C)', ['94 μm/[m*°C]', '79 μm/[m*°C]'], { property: 'Coefficient of thermal expansion', unit: 'µm/m/K', testTemp: 'RT to 60 °C', notes: 'Expansion measured in the XY plane of the specimen.' });
    two('CTE (Z)', 'ASTM E831 (RT to 60 °C)', ['180 μm/[m*°C]', '148 μm/[m*°C]'], { property: 'Coefficient of thermal expansion', unit: 'µm/m/K', testTemp: 'RT to 60 °C', notes: 'Expansion measured along the Z axis of the specimen.' });
    two('Volume Resistivity', 'ASTM D257', ['1.88E+15 Ohms-cm', '4.25E+13 Ohms-cm'], { property: 'Volume resistivity', unit: 'Ω·cm', numText: ['1.88E+15', '4.25E+13'] });
    out.push({ page: 4, property: 'Density', label: 'Specific Gravity', unit: 'g/cm3', raw: '1.1411', num: 1.1411, line: 'Specific Gravity ASTM D792@23 °C 1.1411', direction: NA, specimenType: 'Printed specimen', std: 'ASTM D792', testTemp: '23 °C', post: 'As printed', params: T3, locator: 'p. 4: Specific Gravity', notes: 'A specific gravity is dimensionless; the register reads every specific gravity as g/cm3 at the temperature stated.' });
    const rows = (peak) => [
      ['tensile', 'Yield Strength', 'MPa', 'Tensile yield strength', peak.ty],
      ['tensile', 'Elongation @ Yield', '%', 'Elongation at yield', peak.ey],
      ['tensile', 'Strength @ Break', 'MPa', 'Tensile break strength', peak.tb],
      ['tensile', 'Elongation @ Break', '%', 'Elongation at break', peak.eb],
      ['tensile', 'Modulus (Elastic)', 'GPa', 'Tensile modulus', peak.tm],
      ['flexural', 'Strength @ Break', 'MPa', 'Flexural strength', peak.fs],
      ['flexural', 'Strain @ Break', '%', 'Flexural elongation at break', peak.fe],
      ['flexural', 'Modulus', 'GPa', 'Flexural modulus', peak.fm],
      ['compression', 'Peak Strength', 'MPa', 'Compression strength', peak.cp, { note: 'Compressive peak strength; the yield strength row prints "No Yield".' }],
      ['impact', 'Notched', 'J/m', 'Izod impact strength', peak.in, { notch: 'Notched' }],
      ['impact', 'Unnotched', 'J/m', 'Izod impact strength', peak.iu, { notch: 'Unnotched' }],
    ];
    out.push(...stratasysMech({ page: 6, table: 'Table 4', title: 'Table 4. FDM Nylon-CF10 Mechanical Properties', layer: '0.010 in.', cols: ['XZ', 'ZX'], post: NP,
      tableNote: 'The table names no support material; Table 5 is the set-up with SUP4000B support.',
      rows: rows({ ty: ['69.1 (3.74)', '25.4 (3.61)'], ey: ['4.44 (0.61)', '2.52 (0.60)'], tb: ['67.6 (4.12)', '24.7 (3.81)'], eb: ['4.74 (0.73)', '2.41 (0.62)'], tm: ['4.15 (0.12)', '1.57 (0.071)'],
        fs: ['123.7 (2.74)', '39.7 (3.49)'], fe: ['4.61 (0.24)', '3.16 (0.44)'], fm: ['5.37 (0.17)', '1.54 (0.101)'], cp: ['76.1 (40.0)', '124.2 (12.15)'], in: ['202.7 (8.6)', '36.4 (13.4)'], iu: ['1030.5 (74.3)', '117.11 (17.1)'] }) }));
    out.push(...stratasysMech({ page: 7, table: 'Table 5', title: 'Table 5. FDM Nylon-CF10 Mechanical Properties with SUP4000B Support', layer: '0.010 in.', cols: ['XZ', 'ZX'], post: NP,
      tableNote: 'Printed with SUP4000B support (the table\'s title).',
      rows: rows({ ty: ['75.2 (2.0)', '35.8 (1.1)'], ey: ['5.0 (0.29)', '3.7 (0.33)'], tb: ['74.3 (2.1)', '35.7 (1.1)'], eb: ['5.4 (0.59)', '3.7 (0.33)'], tm: ['4.20 (0.086)', '1.73 (0.031)'],
        fs: ['132 (2.1)', '57.7 (1.7)'], fe: ['4.7 (0.16)', '4.6 (0.20)'], fm: ['5.24 (0.084)', '1.67 (0.039)'], cp: ['80.6 (2.7)', '139 (1.7)'], in: ['187 (7.2)', '41.2 (6.3)'], iu: ['1030 (73)', '145 (15)'] }) }));
    return out;
  },
  accept: [
    { locator: 'p. 4: HDT @ 66 psi, XY', code: 'MEAS-PHYSICS-HDT-LOADS', reason: 'The lint pairs the XY column\'s 66 psi value (58 °C) with the XZ/ZX column\'s 264 psi value (62 °C); inside each column the lighter load reads higher (XY 58 over 52, XZ/ZX 77 over 62).' },
    { locator: 'p. 7: Tensile Properties: Elongation @ Yield % (ZX), Table 5', code: 'MEAS-PHYSICS-ORDER', reason: 'The lint pairs this yield elongation (Table 5, with SUP4000B support) with the break elongation of Table 4, a different print set-up; inside Table 5 the ZX yield and break elongations are both 3.7 %.' },
  ],
  profiles: [{
    page: 3, locator: 'Product Information: Table 1 and Build Tray',
    cells: { plate: 'F190CR build tray; F370CR build tray', abrasion: 'F123CR Hardened Extrusion Head (all slice heights)' },
    lines: { plate: 'Build Tray • F190CR build tray • F370CR build tray' }, evidence: 'F123CR Hardened Extrusion Head',
    support: 'QSR Support (SR-35 soluble) or SUP4000B (breakaway support), F123 Std Head', notes: [],
  }],
};

export { antero, cf10 };
