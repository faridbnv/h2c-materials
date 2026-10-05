// Essentium PA and PA-CF (a column per print orientation) and 3D4Makers' PI Filament Z2 (Zymergen's sheet).
import { ACCESSED, FETCHED, NA, NP, num } from './b43-lib.mjs';

const NOT_USABLE = 'Stated, not a usable direction';
const YX_NOTE = 'YX is a flat bar with its length along Y (the sheet\'s drawing); the vocabulary has no value for it, so the sheet\'s label stays in Locator and Specimen / print parameters.';
const ZX_TENSILE = 'The sheet draws the ZX bar upright; a tensile bar the sheet shows upright is Z, the layer strength (D92, m191).';
const WATER = 'The sheet notes that the mechanical properties of PA may change with water uptake; it states no conditioning.';

export const essentiumPA = {
  name: 'Essentium PA', sha256: '83953599227035063ae445aa52a5e983d41f0a01494b3d582cce7752d91d5bb8', sourceId: 'R-ESSENTIUM-Essentium-PA-TDS', publisher: 'Essentium / Nexa3D', provider: 'Essentium / Nexa3D',
  title: 'Essentium PA Technical Data Sheet', revision: NP, url: 'https://nexa3d.com/wp-content/uploads/2024/07/Essentium-PA-TDS.pdf', docKey: '8395359922703506',
  accessed: ACCESSED, accessNote: FETCHED('Claude Sonnet'), titleEvidence: 'Essentium PA',
  sourceNote: 'One-page technical data sheet hosted by the current brand owner (Nexa3D): molded and printed (XY, YX, ZX) tensile and flexural values, pellet-maker values, FDM print settings.',
  identityNote: 'R169: "PA" standing alone is filed in the nylon home (Nylon, maker-undisclosed polyamide, M164); the sheet names no polyamide ("a new polyamide filament ... by BASF").',
  grades: [{
    key: 'main', materialId: 'M164', manufacturer: 'Essentium', product: 'Essentium PA',
    composition: 'a new polyamide filament specially formulated for additive manufacturing by BASF (p. 1, as the sheet states it)',
    note: 'New product: Essentium PA, filed under Nylon, maker-undisclosed polyamide (M164) by R169.', evidence: 'Essentium PA is a new polyamide filament specially formulated for additive manufacturing by BASF',
  }],
  skipped: [
    'Extrusion multiplier (flow) "20 - 50" has no column of a profile; the footnote "1 Print settings: nozzle temp: 255ºC, bed temp: 85ºC, infill: 100%, speed: 30mm/s, layer height: 0.3mm, extrustion multiplie: 1.0, nozzle diameter: 1.0mm" is the specimens\' print setting (no cell carries its mark), kept in the Notes of every printed row and never as guidance (m170).',
    'The Molded Properties column is the pellet maker\'s injection-molded bar; it enters as a raw-material value.',
  ],
  measure() {
    const out = [];
    const cols = ['Molded', 'XY', 'YX', 'ZX'];
    const FN1 = 'Footnote 1 (its mark is on no cell of the page) prints the specimens\' print settings: nozzle 255 ºC, bed 85 ºC, infill 100 %, speed 30 mm/s, layer height 0.3 mm, extrusion multiplier 1.0, nozzle diameter 1.0 mm.';
    const rows = [
      ['Tensile Strength, MPa', 'MPa', 'Tensile strength (endpoint unspecified)', 'ASTM D638', ['55', '49', '47', '24'], true],
      ['Tensile Modulus, MPa', 'MPa', 'Tensile modulus', 'ASTM D638', ['2180', '1954', '1871', '1638'], true],
      ['Flexural Strength, MPa', 'MPa', 'Flexural strength', 'ASTM D790', ['73', '58', '32', '44'], false],
      ['Flexural Modulus, MPa', 'MPa', 'Flexural modulus', 'ASTM D790', ['1749', '1506', '877', '1097'], false],
    ];
    for (const [label, unit, property, std, cells, tensile] of rows) {
      cells.forEach((cell, i) => {
        const col = cols[i];
        const molded = col === 'Molded';
        out.push({
          page: 1, property, label, unit, raw: cell, num: Number(cell), line: `${label} ${std} ${cells.join(' ')}`,
          direction: molded ? NA : col === 'YX' ? NOT_USABLE : col === 'ZX' && tensile ? 'Z' : col,
          specimenType: molded ? 'Raw material value' : 'Printed specimen', std,
          params: molded ? 'Molded Properties column' : `Print Orientation ${col}`, locator: `p. 1: ${label}, ${molded ? 'Molded Properties' : `Print Orientation ${col}`}`,
          notes: [molded ? 'The Molded Properties column of the sheet\'s table.' : FN1, col === 'YX' ? YX_NOTE : null, col === 'ZX' && tensile ? ZX_TENSILE : null, WATER].filter(Boolean).join(' '),
        });
      });
    }
    const pellet = 'Footnote 2: values taken from the pellet maker\'s TDS.';
    out.push({ page: 1, property: 'Density', label: 'Specific Gravity', unit: 'g/cm3', raw: '1.12', num: 1.12, line: 'Specific Gravity ISO 1183 1.12', direction: NA, specimenType: 'Raw material value', std: 'ISO 1183', locator: 'p. 1: Specific Gravity', notes: `${pellet} A specific gravity is dimensionless; the register reads every specific gravity as g/cm3.` });
    out.push({ page: 1, property: 'Water absorption', label: 'Moisture (50%, RH), %', unit: '%', raw: '3.2', num: 3.2, line: 'Moisture (50%, RH), % ISO 62 3.2', direction: NA, specimenType: 'Raw material value', std: 'ISO 62', moisture: '50% RH', locator: 'p. 1: Moisture (50%, RH)', notes: `${pellet} Moisture taken up at 50 % relative humidity.` });
    out.push({ page: 1, property: 'Water absorption', label: 'Moisture (Sat), %', unit: '%', raw: '10.5', num: 10.5, line: 'Moisture (Sat), % ISO 62 10.5', direction: NA, specimenType: 'Raw material value', std: 'ISO 62', locator: 'p. 1: Moisture (Sat)', notes: `${pellet} Moisture taken up at saturation.` });
    out.push({ page: 1, property: 'Melting temperature', label: 'Melting Point, ºC', unit: '°C', raw: '189', num: 189, line: 'Melting Point, ºC ISO 3164 189', direction: NA, specimenType: 'Raw material value', std: 'ISO 3164', locator: 'p. 1: Melting Point', notes: `${pellet} The sheet cites ISO 3164 for the melting point.` });
    out.push({ page: 1, property: 'HDT', label: 'Heat Deflection Temp., ºC', unit: '°C', raw: '82', num: 82, line: 'Heat Deflection Temp., ºC ASTM D648 82', direction: NA, specimenType: 'Not published (do not assume printed)', std: 'ASTM D648', locator: 'p. 1: Heat Deflection Temp.', notes: 'The sheet states no load and no specimen for the heat deflection; footnote 2 (pellet maker\'s TDS) is not marked on this row.' });
    return out;
  },
  accept: [
    { locator: 'p. 1: Moisture (50%, RH)', code: 'MEAS-PHYSICS-WINDOW', reason: 'A polyamide takes up about this much water at 50 % relative humidity; the sheet takes it from the pellet maker\'s TDS (footnote 2).' },
    { locator: 'p. 1: Moisture (Sat)', code: 'MEAS-PHYSICS-WINDOW', reason: 'Saturation uptake of a polyamide in water can exceed 10 %; the sheet takes it from the pellet maker\'s TDS (footnote 2), and the row is a moisture content, not a strength.' },
    { locator: 'p. 1: Flexural Strength, MPa, Print Orientation YX', code: 'MEAS-PHYSICS-ORDER', reason: 'The sheet prints a YX flexural strength (32 MPa) below its YX tensile strength (47 MPa) and a YX flexural modulus (877 MPa) below the other orientations\' (1506 and 1097); the sheet gives no reason, and the figures are recorded as printed with the YX direction unusable.' },
  ],
  profiles: [{
    page: 1, locator: 'RECOMMENDED PRINT SETTINGS',
    cells: { nozzle: '245 – 265', bed: '85 – 100', chamber: 'Room Temperature', plate: 'Glass Bed with Solution' },
    lines: { nozzle: 'Extrusion Temperature, ºC 245 – 265', bed: 'Bed Temperature, ºC 85 – 100', chamber: 'Enclosure Temperature, ºC Room Temperature', plate: 'Bed Adhesion Method Glass Bed with Solution' },
    evidence: 'Extrusion Temperature, ºC 245 – 265', notes: [],
  }],
};

export const essentiumPACF = {
  name: 'Essentium PA-CF', sha256: 'e48afc79b561cc0f26e7b3d43d628d706d1ee243e70092b9f5708bd6cad0d333', sourceId: 'R-ESSENTIUM-TDS-Essentium-PA-CF', publisher: 'Essentium / Nexa3D', provider: 'Essentium / Nexa3D',
  title: 'Essentium PA-CF Technical Data Sheet', revision: 'Version 1.0', published: '2020-05-28', url: 'https://nexa3d.com/wp-content/uploads/2024/07/TDS-Essentium-PA-CF.pdf', docKey: 'e48afc79b561cc0f',
  accessed: ACCESSED, accessNote: FETCHED('Claude Sonnet'), titleEvidence: 'Essentium PA-CF',
  sourceNote: 'Two-page technical data sheet hosted by the current brand owner (Nexa3D): mechanical properties by print orientation, melting point and heat deflection, handling and drying, FDM and HSE print settings.',
  identityNote: 'R168/R169: "PA" standing alone with a declared carbon-fibre filler ("a carbon fiber-infused polyamide filament") is filed in Nylon-CF, maker-undisclosed polyamide (M165).',
  grades: [{
    key: 'main', materialId: 'M165', manufacturer: 'Essentium', product: 'Essentium PA-CF',
    composition: 'a carbon fiber-infused polyamide filament specially formulated for additive manufacturing (p. 1, as the sheet states it)',
    note: 'New product: Essentium PA-CF, filed under Nylon-CF, maker-undisclosed polyamide (M165) by R168/R169.', evidence: 'Essentium PA-CF is a carbon fiber-infused polyamide filament specially formulated for additive manufacturing',
  }],
  skipped: [
    'p. 2 "RECOMMENDED HSE PRINT SETTINGS" (0.4 mm and 0.8 mm "Hozzle": extrusion width, layer height, print speed, infill, hozzle temperature 240 - 400 and 230 - 400 °C, bed temperature, IR temperature, fan speed) are settings of Essentium\'s high-speed extrusion platform, not of an FDM desktop printer; only the FDM settings block enters as the profile. Extrusion width, layer height, infill and IR temperature have no profile column.',
    'The FDM block\'s "Infill Density < 75 %" has no column; its "Bed Material G-10/FR4 or Glass" is kept in Plate.',
  ],
  measure() {
    const out = [];
    const cols = ['XY', '45/45', 'YX', 'ZX'];
    const rows = [
      ['Ultimate Tensile Strength, MPa', 'MPa', 'Tensile strength (endpoint unspecified)', 'ISO 527-2', ['55.9 (0.3)', '29.1 (0.5)', '21.5 (0.4)', '19.3 (0.9)'], 't'],
      ['Tensile Modulus, GPa', 'GPa', 'Tensile modulus', 'ISO 527-2', ['2.16 (0.15)', '0.95 (0.07)', '0.61 (0.06)', '0.48 (0.02)'], 't'],
      ['Strain at Break, %', '%', 'Elongation at break', 'ISO 527-2', ['18 (1)', '16 (1)', '14 (2)', '22 (1)'], 't'],
      ['Flexural Strength, MPa', 'MPa', 'Flexural strength', 'ISO 178', ['72.8 (1.6)', '38.4 (0.3)', '23.1 (1.0)', '22.3 (0.8)'], 'f'],
      ['Flexural Modulus, GPa', 'GPa', 'Flexural modulus', 'ISO 178', ['2.39 (0.05)', '1.00 (0.03)', '0.54 (0.02)', '0.56 (0.01)'], 'f'],
      ['Notched Izod Impact Strength, kJ/m2', 'kJ/m2', 'Izod impact strength', 'ISO 180/A', ['48 (2)', '38 (3)', '19 (2)', '9.7 (1.3)'], 'i'],
    ];
    for (const [label, unit, property, std, cells, kind] of rows) {
      cells.forEach((cell, i) => {
        const col = cols[i];
        out.push({
          page: 1, property, label, unit, raw: cell, num: num(cell), line: `${label} ${std} ${cells.join(' ')}`,
          direction: col === 'YX' ? NOT_USABLE : col === 'ZX' && kind === 't' ? 'Z' : col,
          specimenType: 'Printed specimen', std, notch: kind === 'i' ? 'Notched' : undefined,
          params: `Mechanical Properties · Print Orientation ${col}`, locator: `p. 1: ${label}, Print Orientation ${col}`,
          notes: ['The figure in parentheses is the standard deviation (the table footnote).', col === '45/45' ? 'A bar printed with a ±45° raster, labelled beside the sheet\'s own XY bar: not the XY value.' : null, col === 'YX' ? YX_NOTE : null, col === 'ZX' && kind === 't' ? ZX_TENSILE : null, WATER].filter(Boolean).join(' '),
        });
      });
    }
    out.push({ page: 1, property: 'Melting temperature', label: 'Melting Point, ˚C', unit: '°C', raw: '192', num: 192, line: 'Melting Point, ˚C ASTM D3418 192', direction: NA, specimenType: 'Not published (do not assume printed)', std: 'ASTM D3418', locator: 'p. 1: Melting Point' });
    out.push({ page: 1, property: 'HDT', label: 'HDT @ 0.45 MPa, ˚C', unit: '°C', raw: '178', num: 178, line: 'HDT @ 0.45 MPa, ˚C ASTM D648 178', direction: NA, specimenType: 'Not published (do not assume printed)', std: 'HDT @ 0.45 MPa ASTM D648', locator: 'p. 1: HDT @ 0.45 MPa' });
    return out;
  },
  profiles: [{
    page: 2, locator: 'RECOMMENDED FDM PRINT SETTINGS and Material Handling and Drying',
    cells: { nozzle: '265 – 300', bed: '85 – 100', plate: 'G-10/FR4 or Glass', drying: 'dried in an oven or vacuum oven at 100 – 120˚C for 4 – 8 hours if the material absorbs more than 500ppm moisture' },
    lines: { nozzle: 'Nozzle Temperature, ºC 265 – 300', bed: 'Bed Temperature, ºC 85 – 100', plate: 'Bed Material G-10/FR4 or Glass', drying: 'If the material does absorb more than 500ppm moisture, it should be dried in a low dew point (< -40˚C) oven or vacuum oven at 100 – 120˚C for 4 – 8 hours.' },
    evidence: 'Nozzle Temperature, ºC 265 – 300',
    notes: [['Speed', 'Print Speed 30 – 60 mm/s; First Layer Speed 15 – 30 mm/s'], ['Cooling', 'Fan Speed 0 – 50 %'], ['Adhesion / release', 'Bed Adhesion Method Magigoo PA or PVA glue'],
      ['Storage humidity', 'Keep the material in the vacuum sealed packaging until ready to print; feed the filament from a dry container and store it in a dry cabinet; the drying oven has a low dew point (below -40˚C)']],
  }],
};

const FLAT = 'Footnote *: printed flat on the bed representing XY/XZ/ZX (Intamsys funmat HT); print orientation -45°/45°.';
export const piZ2 = {
  name: '3D4Makers PI Filament Z2', sha256: '556fd3e0d2ebf186c45a4a32e7a7bf504ba91a86a0859e97fd9c4f4b5b9a9e73', sourceId: 'R-3D4MAKERS-TDS-PI-Filament-Z2-Zymergen-3D4Makers-ver-02', publisher: '3D4Makers', provider: '3D4Makers',
  title: 'Technical Data Sheet (TDS) PI Filament Z2 (Zymergen)', revision: 'Version 01', published: '2022-02-01',
  url: 'https://cdn.shopify.com/s/files/1/0762/2839/files/TDS_PI_Filament_Z2_Zymergen_3D4Makers_ver.02.pdf?v=1654256926', docKey: '556fd3e0d2ebf186',
  accessed: ACCESSED, accessNote: FETCHED('Claude Sonnet'), titleEvidence: 'Thermoplastic Polyimide for fused fabrication filament printing',
  sourceNote: 'Zymergen\'s technical data sheet for its thermoplastic polyimide filament Z2, published by 3D4Makers on its product-data page (the file name names both); the sheet carries the mark CONFIDENTIAL in its footer.',
  identityNote: 'R193 (confirmed by the owner, 2026-09-25): "Thermoplastic Polyimide for fused fabrication filament printing" is TPI (M121); the product stays under TPI.',
  grades: [{
    key: 'main', materialId: 'M121', manufacturer: '3D4Makers', product: 'PI Filament Z2',
    composition: 'Thermoplastic Polyimide for fused fabrication filament printing (p. 1, as the sheet states it)',
    note: 'New product: 3D4Makers PI Filament Z2 (Zymergen), filed under TPI (M121) by R193.', evidence: 'Thermoplastic Polyimide for fused fabrication filament printing',
  }],
  skipped: [
    'p. 1: Flexural Modulus, Flexural strength @ break, Flexural elongation @ break and the two UL 94 flammability rows print "TBD" in every column and "N/A" cells state no number: no values.',
    'p. 2: the ppm/°F rows repeat each ppm/°C figure; the footnote bullets "Tnozzle 405 ℃, Tbuildplate 160 ℃, Tchamber 160 ℃" and "Layer thickness 0,2mm (30 mm/s), Beadwidth 0,5mm" are the test bars\' print settings and never guidance (m170).',
    'p. 3: Filament diameter (1.75 mm) and Dielectric loss (1 and 10 GHz) have no property in properties.csv; the nozzle-diameter cell is unreadable in the text layer and is read on the page image.',
  ],
  measure() {
    const out = [];
    const cols = ['XY', 'XZ', 'ZX'];
    const colName = { XY: 'XY* (flat)', XZ: 'XZ (on edge)', ZX: 'ZX (upright)' };
    const row = (cond) => (label, std, unit, property, cells, fn, dirOf) => cells.forEach((cell, i) => {
      if (cell == null) return;
      const col = cols[i];
      out.push({
        page: 1, property, label, unit, raw: cell, num: Number(cell), line: `${label} ${std} ${unit} ${cells.map((c) => c ?? 'N/A').join(' ')}`,
        direction: dirOf(col), specimenType: 'Printed specimen', std, params: `${colName[col]} column; ${fn}`, locator: `p. 1: ${label} (${std}), ${colName[col]}`,
        notes: [fn, cond(col)].filter(Boolean).join(' '),
      });
    });
    const star = row((col) => (col !== 'XY' ? 'The footnote says the bars of the XZ and ZX columns were printed flat to represent those orientations, so the column\'s direction is not the bar\'s: no usable direction. The ** and *** rows below carry the plate-cut XZ and ZX bars.' : null));
    const plate = row((col) => (col === 'ZX' ? ZX_TENSILE : null));
    const starDir = (col) => (col === 'XY' ? 'XY' : NOT_USABLE);
    const plateDir = (col) => (col === 'ZX' ? 'Z' : col);
    star('Tensile Strength *', 'ISO 527 Type 1BA', 'MPa', 'Tensile strength (endpoint unspecified)', ['83', '89', '68'], FLAT, starDir);
    star('Tensile Modulus*', 'ISO 527 Type 1BA', 'GPa', 'Tensile modulus', ['2.73', '2.89', '2.56'], FLAT, starDir);
    star('Strain at Break *', 'ISO 527 Type 1BA', '%', 'Elongation at break', ['4.8', '4.8', '3.5'], FLAT, starDir);
    const F2 = 'Footnote **: XZ/ZX bars out of water-jetted 3D printed plates (Minifactory Ultra).';
    plate('Tensile Strength **', 'ASTM D638 type V', 'MPa', 'Tensile strength (endpoint unspecified)', [null, '101', '59'], F2, plateDir);
    plate('Tensile Modulus**', 'ASTM D638 type V', 'GPa', 'Tensile modulus', [null, '2.82', '2.57'], F2, plateDir);
    plate('Strain at Break **', 'ASTM D638 type V', '%', 'Elongation at break', [null, '4.5', '2.7'], F2, plateDir);
    const F3 = 'Footnote ***: single wall data on Z-strength (Minifactory Ultra).';
    plate('Tensile Strength ***', 'ASTM 1708', 'MPa', 'Tensile strength (endpoint unspecified)', [null, null, '96'], F3, plateDir);
    plate('Tensile Modulus***', 'ASTM 1708', 'GPa', 'Tensile modulus', [null, null, '2.41'], F3, plateDir);
    plate('Strain at Break ***', 'ASTM 1708', '%', 'Elongation at break', [null, null, '4.7'], F3, plateDir);
    for (const [label, notch, cells] of [['Impact Strength Izod (notched) **', 'Notched', ['5.3', '5.3', '4.3']], ['Impact Strength Izod (unnotched) **', 'Unnotched', ['29', '28', '26']]]) {
      cells.forEach((cell, i) => {
        const col = cols[i];
        out.push({ page: 1, property: 'Izod impact strength', label, unit: 'kJ/m2', raw: cell, num: Number(cell), line: `${label} ISO180 KJ/m2 ${cells.join(' ')}`, direction: col, specimenType: 'Printed specimen', std: 'ISO180', notch,
          params: `${colName[col]} column; ${F2}`, locator: `p. 1: ${label} (ISO180), ${colName[col]}`, notes: `${F2} The sheet marks the whole row with the footnote, XY column included.` });
      });
    }
    out.push({ page: 1, property: 'HDT', label: 'Temp. of deflection under load (1.80 MPa) *', unit: '°C', raw: '167', num: 167, line: 'Temp. of deflection under load (1.80 MPa) * ISO 75-1/-2 ∘C 167', direction: NA, specimenType: 'Printed specimen', std: 'ISO 75-1/-2 1.80 MPa', params: `Footnote *; ${FLAT}`, locator: 'p. 1: Temp. of deflection under load (1.80 MPa)', notes: FLAT });
    out.push({ page: 1, property: 'HDT', label: 'Temp. of deflection under load (0.45 MPa) *', unit: '°C', raw: '175', num: 175, line: 'Temp. of deflection under load (0.45 MPa) * ISO 75-1/-2 ∘C 175', direction: NA, specimenType: 'Printed specimen', std: 'ISO 75-1/-2 0.45 MPa', params: `Footnote *; ${FLAT}`, locator: 'p. 1: Temp. of deflection under load (0.45 MPa)', notes: FLAT });
    const ranges = ['-50 ℃ to 60 ℃', '60℃ to 120 ℃', '120 ℃ to 190 ℃'];
    const cte = [
      ['-45/45 infill', [['43.05', '46.64'], ['53.95', '58.52'], ['62.51', '67.74']]],
      ['90º XZ infill', [['50.15', '44.68'], ['61.07', '58.30'], ['68.64', '65.23']]],
    ];
    for (const [infill, per] of cte) per.forEach(([a, b], r) => ['XY* Flat', 'XZ (on edge) and ZX (upright)'].forEach((col, ci) => {
      const cell = [a, b][ci];
      out.push({ page: 2, property: 'Coefficient of thermal expansion', label: `CTE (${infill}) ${ranges[r]}`, unit: 'µm/m/K', raw: `${cell} ppm/°C`, num: Number(cell), line: `CTE (${infill}) ${ranges[r]} ASTM 831 ppm/℃ ${a} ${b}`,
        direction: NA, specimenType: 'Printed specimen', std: 'ASTM 831', testTemp: ranges[r].replace(/℃/g, '°C'), params: `CTE (${infill}); column ${col}; Print orientation -45º/45º for the XY* column`,
        locator: `p. 2: CTE (${infill}) ${ranges[r].replace(/℃/g, '°C')}, ${col}`, notes: 'ppm/°C is µm/m/K. The sheet\'s ppm/°F rows repeat these figures.' });
    }));
    out.push({ page: 2, property: 'Glass transition temperature', label: 'Tg', unit: '°C', raw: '195', num: 195, line: 'Tg DMA ∘C 195', direction: NA, specimenType: 'Not published (do not assume printed)', std: 'DMA', locator: 'p. 2: Tg' });
    out.push({ page: 2, property: 'Decomposition temperature', label: 'Td at 1% loss', unit: '°C', raw: '343', num: 343, line: 'Td at 1% loss DMA ∘C 343', direction: NA, specimenType: 'Not published (do not assume printed)', std: 'DMA', locator: 'p. 2: Td at 1% loss', notes: 'Temperature at 1 % mass loss (the label); the method column prints DMA.' });
    out.push({ page: 2, property: 'Decomposition temperature', label: 'Td', unit: '°C', raw: '460', num: 460, line: 'Td DMA ∘C 460', direction: NA, specimenType: 'Not published (do not assume printed)', std: 'DMA', locator: 'p. 2: Td', notes: 'The sheet prints no loss for this Td; the method column prints DMA.' });
    out.push({ page: 3, property: 'Density', label: 'Density', unit: 'g/cm3', raw: '1.51', num: 1.51, line: 'Density ASTM B923-10 g/cm3 1.51', direction: NA, specimenType: 'Not published (density specimen form not explicitly established)', std: 'ASTM B923-10', locator: 'p. 3: Density' });
    out.push({ page: 3, property: 'Relative permittivity', label: 'Dielectric constant (1GHz)', unit: 'Dimensionless', raw: '2.87', num: 2.87, line: 'Dielectric constant (1GHz) ASTM D150 - 2.87', direction: NA, specimenType: 'Not published (do not assume printed)', std: 'ASTM D150, 1 GHz', locator: 'p. 3: Dielectric constant (1GHz)' });
    out.push({ page: 3, property: 'Relative permittivity', label: 'Dielectric constant (10GHz)', unit: 'Dimensionless', raw: '2.85', num: 2.85, line: 'Dielectric constant (10GHz) ASTM D150 - 2.85', direction: NA, specimenType: 'Not published (do not assume printed)', std: 'ASTM D150, 10 GHz', locator: 'p. 3: Dielectric constant (10GHz)' });
    out.push({ page: 3, property: 'Dielectric strength', label: 'Breakdown voltage', unit: 'kV/mm', raw: '172 MV/m', num: 172, line: 'Breakdown voltage ASTM D149 MV/m 172', direction: NA, specimenType: 'Not published (do not assume printed)', std: 'ASTM D149', locator: 'p. 3: Breakdown voltage', notes: 'The sheet prints MV/m; 1 MV/m is 1 kV/mm.' });
    return out;
  },
  accept: [
    { locator: 'p. 1: Tensile Strength *** (ASTM 1708), ZX (upright)', code: 'MEAS-PHYSICS-Z-ABOVE-XY', field: 'Direction', reason: 'The sheet lists "Highest Z-strength" as a product highlight: the single-wall ZX bars (footnote ***) reach 96 MPa against 83 MPa for the flat ISO 527 bars; the figures are the sheet\'s own.' },
  ],
  profiles: [{
    page: 3, locator: 'Recommended Processing conditions',
    cells: { nozzle: '390℃-410℃', bed: '120℃-160℃', chamber: '80℃-160℃', plate: 'Glass, Carbon plate', diameter: '≥ 0.4 mm, Ruby or Hardened preferred', abrasion: 'Ruby or Hardened preferred', drying: '>4 hours at 120 ℃' },
    lines: { nozzle: 'Nozzle temperature 390℃-410℃', bed: 'Bed temperature 120℃-160℃', chamber: 'Chamber temperature 80℃-160℃', plate: 'Bed material Glass, Carbon plate', diameter: 'Nozzle diameter ≥ 0.4 mm, Ruby or Hardened preferred', drying: 'Drying instructions filament >4 hours at 120 ℃' },
    evidence: 'Nozzle temperature 390℃-410℃',
    notes: [['Speed', 'Print speed 15-150 mm/s'], ['Adhesion / release', 'Adhesion promoter Magigoo HT, Nano polymer adhesive, GeckoTec EZ-Hot']],
  }],
};
