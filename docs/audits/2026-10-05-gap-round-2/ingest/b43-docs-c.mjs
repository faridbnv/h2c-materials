// Flashforge FABRIAL-R (Japanese), Smartfil FLEX 77A (Spanish), BigRep HI-TEMP (optical reading), Markforged Composites
// (four products in one table) and QIDI S-White (bilingual).
import { ACCESSED, FETCHED, NA, NP, num } from './b43-lib.mjs';

// ---- Flashforge / NCI Sales FABRIAL-R TPE (Japanese) --------------------------------------------------------------------
export const fabrial = {
  name: 'Flashforge FABRIAL-R', sha256: '36bdc5d8f5c3688c6f49629cf2ac5ac6e2ee6f587d8b91d2392e36e088fdd501', sourceId: 'D-FLASH-FABRIAL-R-TPE-TDS-JP', publisher: 'Flashforge', provider: 'Flashforge',
  title: 'テクニカルデータシート FABRIAL-R (TPE) [Technical Data Sheet FABRIAL-R, Japanese]', revision: NP,
  url: 'https://after-support.flashforge.jp/uploads/datasheet/tds/TPE_TDS_JP.pdf', docKey: '36bdc5d8f5c3688c',
  accessed: ACCESSED, accessNote: FETCHED('Claude Sonnet'), titleEvidence: 'FABRIAL-R',
  sourceNote: 'One-page Japanese technical data sheet of NCI SALES, INC. for the thermoplastic elastomer (TPE) filament FABRIAL-R for fused-deposition 3D printers, served by Flashforge Japan\'s data-sheet list. Read on the page image: the text layer is a scan\'s and holds the numbers without their Japanese labels.',
  identityNote: 'R167/R205: the sheet names a thermoplastic elastomer (材質 熱可塑性エラストマー(TPE)) and no polymer; filed in TPE, maker-undisclosed elastomer (M167). Its Shore A 90 is a measurement of the product, not a class.',
  visualAll: true, visualNote: 'The sheet is in Japanese and its text layer is an optical reading of a scan; every label and value was read on the page image.',
  grades: [{
    key: 'main', materialId: 'M167', manufacturer: 'Flashforge', product: 'FABRIAL-R',
    composition: '熱可塑性エラストマー(TPE) (thermoplastic elastomer, TPE) (p. 1, as the sheet states it)',
    certification: '取得認証: 細胞毒性試験 ISO 10993-5; 皮膚感作性試験 ISO 10993-10 (cytotoxicity test, skin sensitisation test) (p. 1, as printed; not a certificate: verify grade and certificate)',
    note: 'New product: FABRIAL-R, a TPE of NCI SALES, INC. on Flashforge Japan\'s data-sheet list, filed under TPE, maker-undisclosed elastomer (M167).', evidence: 'FABRIAL-R 材質 熱可塑性エラストマー(TPE)',
  }],
  skipped: [
    'The sheet\'s product table (カラー ナチュラル/アイボリー, フィラメント線径 1.75 +/- 0.05mm, 重量 500 g, 長さ 230 m) is packaging, not a property; the diameter is the grade\'s default.',
    '※ "3Dプリンターによる造形試験片で測定した測定値です。上記は測定値であり、保証値ではありません。" (measured on test pieces formed with a 3D printer; measured values, not guaranteed values): read as the specimen statement of the mechanical table (printed specimens).',
    '※ "3Dプリンターの種類や使用環境、造形物の形状等の条件に合わせて微調整をしてください" (adjust to the printer, environment and part shape) is advice, not a setting.',
  ],
  measure() {
    const out = [];
    const P = 'Printed specimen';
    const FN = 'Footnote ※: measured on test pieces formed by a 3D printer; measured values, not guaranteed values.';
    const row = (o) => out.push({ page: 1, specimenType: P, direction: NA, params: 'Mechanical properties table (機械的特性); test pieces formed by a 3D printer', notes: FN, ...o });
    row({ property: 'Melt mass-flow rate', label: '流動性 (fluidity)', unit: 'g/10 min', raw: '10', num: 10, line: '流動性 JIS K 7210 (150℃ 2.16Kg) g/10 min. 10', std: 'JIS K 7210 (150℃ 2.16Kg)', testTemp: '150 °C', locator: 'p. 1: 流動性 (melt flow, JIS K 7210)', notes: `${FN} 150 ℃ and 2.16 kg are the sheet\'s test condition.` });
    row({ direction: 'Unstated', property: 'Tensile modulus', label: '引張弾性率 (tensile modulus)', unit: 'MPa', raw: '150', num: 150, line: '引張弾性率 JIS K 7161 (1mm/分) MPa 150', std: 'JIS K 7161 (1mm/分)', locator: 'p. 1: 引張弾性率 (tensile modulus, JIS K 7161, 1 mm/min)' });
    row({ direction: 'Unstated', property: 'Tensile yield strength', label: '引張降伏強度 (tensile yield strength)', unit: 'MPa', raw: '10', num: 10, line: '引張降伏強度 JIS K 7161 (50mm/分) MPa 10', std: 'JIS K 7161 (50mm/分)', locator: 'p. 1: 引張降伏強度 (tensile yield strength, JIS K 7161, 50 mm/min)' });
    row({ direction: 'Unstated', property: 'Tensile break strength', label: '引張破断強度 (tensile strength at break)', unit: 'MPa', raw: '18', num: 18, line: '引張破断強度 JIS K 7161 (50mm/分) MPa 18', std: 'JIS K 7161 (50mm/分)', locator: 'p. 1: 引張破断強度 (tensile strength at break, JIS K 7161, 50 mm/min)' });
    row({ direction: 'Unstated', property: 'Elongation at break', label: '引張破断伸度 (tensile elongation at break)', unit: '%', raw: '> 400', num: 400, op: '>', line: '引張破断伸度 JIS K 7161 (50mm/分) % > 400', std: 'JIS K 7161 (50mm/分)', locator: 'p. 1: 引張破断伸度 (tensile elongation at break, JIS K 7161, 50 mm/min)', notes: `${FN} A bound: the sheet prints "> 400 %".` });
    row({ direction: 'Unstated', property: 'Flexural strength', label: '曲げ強度 (flexural strength)', unit: 'MPa', raw: '10', num: 10, line: '曲げ強度 JIS K 7171 (100mm/分) MPa 10', std: 'JIS K 7171 (100mm/分)', locator: 'p. 1: 曲げ強度 (flexural strength, JIS K 7171, 100 mm/min)' });
    row({ direction: 'Unstated', property: 'Flexural modulus', label: '曲げ弾性率 (flexural modulus)', unit: 'MPa', raw: '150', num: 150, line: '曲げ弾性率 JIS K 7171 (2mm/分) MPa 150', std: 'JIS K 7171 (2mm/分)', locator: 'p. 1: 曲げ弾性率 (flexural modulus, JIS K 7171, 2 mm/min)' });
    row({ direction: 'Unstated', property: 'Izod impact strength', label: 'ノッチ付きアイゾット衝撃試験(23℃) (notched Izod impact test)', unit: 'kJ/m2', raw: '58', num: 58, line: 'ノッチ付きアイゾット衝撃試験(23℃) JIS K 7110 KJ/m2 58', std: 'JIS K 7110', notch: 'Notched', testTemp: '23 °C', locator: 'p. 1: ノッチ付きアイゾット衝撃試験(23℃) (notched Izod impact, JIS K 7110)' });
    row({ property: 'Hardness', label: '硬度 (hardness)', unit: 'Shore A', raw: '90', num: 90, line: '硬度 Durometer ショア硬度 A 90', std: 'Durometer', locator: 'p. 1: 硬度 (hardness, durometer, Shore A)', notes: `${FN} Unit column: ショア硬度 A (Shore hardness A).` });
    return out;
  },
  profiles: [{
    page: 1, locator: '造形時プリンター推奨条件 (recommended printer conditions when forming)',
    cells: { nozzle: '140 - 160 ℃', bed: '80 - 100 ℃' },
    lines: { nozzle: 'ノズル温度 ℃ 140 - 160', bed: 'テーブル温度 ℃ 80 - 100' }, evidence: 'ノズル温度 ℃ 140 - 160',
    notes: [['Speed', '造形スピード 5 - 10 mm/秒 (forming speed 5 - 10 mm/s)']],
  }],
};

// ---- Smartfil FLEX 77A (Spanish) ----------------------------------------------------------------------------------------
export const smartfil = {
  name: 'Smartfil FLEX 77A', sha256: '691787121528d8e1554f478078d3e869dff0e705852afc6ab710e1929138a32e', sourceId: 'R-FILAMENT2PRINT-Smartfil-FLEX-77A', publisher: 'Smart Materials 3D', provider: 'Filament2Print',
  title: 'FICHA TÉCNICA FLEX 77A (Smartfil)', revision: 'VERSIÓN 1.2, REVISIÓN: 04/11/2024',
  url: 'https://filament2print.com/en/index.php?controller=attachment&id_attachment=3678', docKey: '691787121528d8e1',
  accessed: ACCESSED, accessNote: `${FETCHED('Claude Sonnet')} The retailer Filament2Print serves the maker's own sheet.`, titleEvidence: 'FICHA TÉCNICA FLEX 77A',
  sourceNote: 'One-page Spanish technical data sheet of Smart Materials 3D (brand Smartfil) for SMARTFIL FLEX 77A, a thermoplastic polyurethane of Shore A 77, hosted by the retailer Filament2Print (product page 4113-smartfill-flex-77a).',
  identityNote: 'The sheet names its polymer ("Nombre químico: Poliuretano termoplástico") and its hardness (77 Shore A, ISO 7619-1): a TPU filed by its Shore rating, TPU 85A class and softer (M159) (D86, R205).',
  grades: [{
    key: 'main', materialId: 'M159', manufacturer: 'Smart Materials 3D', product: 'Smartfil FLEX 77A',
    composition: 'Nombre químico: Poliuretano termoplástico (thermoplastic polyurethane); dureza 77 Shore A (p. 1, as the sheet states it)',
    diameter: 'The sheet lists 1,75 mm and 2,85 mm; check the 1.75 mm variant',
    note: 'New product: Smartfil FLEX 77A of Smart Materials 3D, filed under TPU 85A class and softer (M159) by its sheet\'s Shore A 77.', evidence: 'SMARTFIL FLEX 77A es un termoplástico elastómero', evidencePage: 1,
  }],
  skipped: [
    '"-" cells (tensile modulus, flexural strength and modulus, elongation at break, flexural elongation, Charpy impact, glass transition, HDT B) state no number; the ZX plane column prints "-" everywhere.',
    'The packaging row (tamaño M, peso neto 750 g, peso bruto 975 g, diámetros 1,75 mm/2,85 mm, colores blanco y negro, embalaje SmartBag con bolsa desecante) is not a property; "Flujo de material 100 – 120 %" and the first-layer-free "Altura de capa ≥ 0,2 mm" have no profile column beyond the notes below.',
  ],
  visualAll: true, visualNote: 'The sheet is in Spanish; the labels were read on the page image.',
  measure() {
    const out = [];
    const FN = 'Footnote (1): values obtained on printed test pieces, nozzle 0,4 mm, rectilinear infill 100 %, layer height 0,2 mm.';
    out.push({ page: 1, property: 'Density', label: 'Densidad', unit: 'g/cm3', raw: '1,07 g/cm3', num: 1.07, line: 'Densidad 1,07 g/cm3 ASTM D792', direction: NA, specimenType: 'Not published (density specimen form not explicitly established)', std: 'ASTM D792', locator: 'p. 1: Densidad' });
    out.push({ page: 1, property: 'Tensile strength (endpoint unspecified)', label: 'Resistencia a la tracción', unit: 'MPa', raw: '22', num: 22, line: 'Resistencia a la tracción 22 - MPa ISO 527', direction: 'XY', specimenType: 'Printed specimen', std: 'ISO 527', params: `PLANO XY column; ${FN}`, locator: 'p. 1: Resistencia a la tracción, PLANO XY', notes: FN });
    out.push({ page: 1, property: 'Tensile strain at strength', label: 'Alargamiento al esfuerzo máximo', unit: '%', raw: '775', num: 775, line: 'Alargamiento al esfuerzo máximo 775 - % ISO 527', direction: 'XY', specimenType: 'Printed specimen', std: 'ISO 527', params: `PLANO XY column; ${FN}`, locator: 'p. 1: Alargamiento al esfuerzo máximo, PLANO XY', notes: `${FN} Elongation at maximum stress (the label), recorded as the strain at the tensile strength.` });
    out.push({ page: 1, property: 'Hardness', label: 'Dureza', unit: 'Shore A', raw: '77', num: 77, line: 'Dureza 77 Shore A ISO 7619-1', direction: NA, specimenType: 'Printed specimen', std: 'ISO 7619-1', params: `PLANO XY column; ${FN}`, locator: 'p. 1: Dureza', notes: `${FN} The value stands under the PLANO XY column of the mechanical table.` });
    out.push({ page: 1, property: 'Vicat softening temperature', label: 'VICAT A50', unit: '°C', raw: '66', num: 66, line: 'VICAT A50 66 ˚C ISO 306', direction: NA, specimenType: 'Not published (do not assume printed)', std: 'ISO 306 VICAT A50', locator: 'p. 1: VICAT A50' });
    return out;
  },
  profiles: [{
    page: 1, locator: 'PROPIEDADES DE IMPRESIÓN',
    cells: { nozzle: '220 – 240 ˚C', bed: '0 – 50 ˚C', diameter: '≥ 0,2 mm' },
    lines: { nozzle: 'Temperatura de impresión 220 – 240 ˚C', bed: 'Temperatura de la cama 0 – 50 ˚C', diameter: 'Recomendaciones de boquilla ≥ 0,2 mm' }, evidence: 'Temperatura de impresión 220 – 240 ˚C',
    notes: [['Cooling', 'Ventilador de capa 60 – 80 %'], ['Layer height', '≥ 0,2 mm'], ['Speed', 'Velocidad impresión 15 – 20 mm/s']],
  }],
};

// ---- BigRep HI-TEMP (optical reading of a mis-mapped text layer) -------------------------------------------------------
export const bigrepHiTemp = {
  name: 'BigRep HI-TEMP', sha256: '9c6f8b6fe1d8e21360ca83ecb8de97f127b241bfb2223f661057c95844d61861', sourceId: 'R-BIGREP-Edf9dbsNa39BiC-Vl1Fh9MwB917sFqJdBc2ekgXXAjmr3g', publisher: 'BigRep', provider: 'BigRep',
  title: 'HI-TEMP filament datasheet', revision: 'Last updated 30.07.2025', published: '2025-07-30',
  url: 'https://bigrepgmbh.sharepoint.com/:b:/g/Edf9dbsNa39BiC-Vl1Fh9MwB917sFqJdBc2ekgXXAjmr3g?e=tQs3vW',
  docKey: 'https://bigrepgmbh.sharepoint.com/:b:/g/Edf9dbsNa39BiC-Vl1Fh9MwB917sFqJdBc2ekgXXAjmr3g?e=tQs3vW',
  accessed: ACCESSED, accessNote: `${FETCHED('Claude Sonnet')} The PDF's text layer maps every glyph to another character, so its text was read optically (ocrmypdf, cached under the document's digest as an optical reading) and every row was read against the page image.`, titleEvidence: 'HI-TEMP',
  sourceNote: 'One-page BigRep filament datasheet for HI-TEMP (bigrep.com/filaments/hi-temp), linked from the maker\'s product page as a document viewer.',
  identityNote: 'The sheet says "Material Bio-Polymer Blend"; BigRep\'s own HI-TEMP CF documents say a PLA blend (R185, m223): filed in PLA blend (M168).',
  visualNote: 'The text layer is mis-mapped; this reading is optical and was checked against the page image.',
  grades: [{
    key: 'main', materialId: 'M168', manufacturer: 'BigRep', product: 'HI-TEMP',
    composition: 'Material Bio-Polymer Blend (p. 1, as the sheet states it)', certification: 'Reach Compliant Yes; RoHS Certified Yes; FDA Compliant Yes (except Silver color) (p. 1, as printed; not a certificate: verify grade and certificate)',
    diameter: 'The sheet states Diameter 2.85 mm; check for a 1.75 mm variant',
    note: 'New product: BigRep HI-TEMP, filed under PLA blend (M168) as BigRep\'s HI-TEMP CF documents file its carbon-fibre sibling (R185).', evidence: 'HI-TEMP Material Bio-Polymer Blend',
  }],
  skipped: ['Diameter 2.85 mm is the grade\'s Diameter compatibility; Reach, RoHS and FDA statements are the grade\'s Certification claims.', 'The footer date reads "30.07.2095" in the optical text and 30.07.2025 on the page image.'],
  measure() {
    const out = [];
    const row = (o) => out.push({ page: 1, direction: NA, specimenType: 'Not published (do not assume printed)', ...o });
    row({ property: 'Density', label: 'Density (ISO 1183)', unit: 'g/cm3', raw: '1.35 g/cm3', num: 1.35, line: 'Density (ISO 1183) 1.35 g/cm*', std: 'ISO 1183', specimenType: 'Not published (density specimen form not explicitly established)', locator: 'p. 1: Density (ISO 1183)' });
    row({ property: 'Tensile strength (endpoint unspecified)', label: 'Tensile Strength (ISO 527)', unit: 'MPa', raw: '50 MPa', num: 50, line: 'Tensile Strength (ISO 527) 50 MPa', std: 'ISO 527', direction: 'Unstated', locator: 'p. 1: Tensile Strength (ISO 527)' });
    row({ property: 'Tensile modulus', label: 'Tensile Modulus (ISO 527)', unit: 'MPa', raw: '4400 MPa', num: 4400, line: 'Tensile Modulus (ISO 527) 4400 MPa', std: 'ISO 527', direction: 'Unstated', locator: 'p. 1: Tensile Modulus (ISO 527)' });
    row({ property: 'Flexural strength', label: 'Flexural Strength (ISO 178)', unit: 'MPa', raw: '55 MPa', num: 55, line: 'Flexural Strength (ISO 178) 55 MPa', std: 'ISO 178', direction: 'Unstated', locator: 'p. 1: Flexural Strength (ISO 178)' });
    row({ property: 'Flexural modulus', label: 'Flexural Modulus (ISO 178)', unit: 'MPa', raw: '4300 MPa', num: 4300, line: 'Flexural Modulus (ISO 178) 4300 MPa', std: 'ISO 178', direction: 'Unstated', locator: 'p. 1: Flexural Modulus (ISO 178)' });
    row({ direction: 'Unstated', property: 'Charpy strength', label: 'Impact Strength, Notched (ISO 179)', unit: 'kJ/m2', raw: '4 kJ/m2', num: 4, line: 'Impact Strength, Notched (ISO 179) 4 kJ/m?', std: 'ISO 179', notch: 'Notched', locator: 'p. 1: Impact Strength, Notched (ISO 179)', notes: 'ISO 179 is the Charpy method.' });
    row({ property: 'HDT', label: 'HDT A - 1.8 MPa (ISO 75)', unit: '°C', raw: '54 °C', num: 54, line: 'HDT A - 1.8 MPa (ISO 75) 54°C', std: 'HDT A - 1.8 MPa ISO 75', locator: 'p. 1: HDT A - 1.8 MPa (ISO 75)' });
    row({ property: 'HDT', label: 'HDT B - 0.45 MPa (ISO 75)', unit: '°C', raw: '58 °C', num: 58, line: 'HDT B - 0.45 MPa (ISO 75) 58 °C', std: 'HDT B - 0.45 MPa ISO 75', locator: 'p. 1: HDT B - 0.45 MPa (ISO 75)' });
    row({ property: 'Vicat softening temperature', label: 'Vicat Softening Tempeature (ISO 306)', unit: '°C', raw: '154 °C', num: 154, line: 'Vicat Softening Tempeature (ISO 306) 154°C', std: 'ISO 306', locator: 'p. 1: Vicat Softening Temperature (ISO 306)', notes: 'The sheet spells the label "Tempeature".' });
    row({ property: 'Melting temperature', label: 'Melting Temperature (Tm) (DSC)', unit: '°C', raw: '170 °C', num: 170, line: 'Melting Temperature (Tm) (DSC) 170°C', std: 'DSC', locator: 'p. 1: Melting Temperature (Tm) (DSC)' });
    return out;
  },
  profiles: [{
    page: 1, locator: 'Recommended Printing Conditions and Other Information',
    cells: { nozzle: '190 - 230 °C', bed: '50 - 70 °C', drying: '50 °C for 4 - 6 hours' },
    lines: { nozzle: 'Nozzle Temperature 190 - 230°C', bed: 'Print Bed Temperature 50- 70°C', drying: 'Drying Recommendations 50°C for4 - 6 hours' }, evidence: 'Nozzle Temperature 190 - 230°C',
    notes: [['Cooling', 'Fan Speed 50 - 100 %']],
  }],
};

// ---- Markforged Composites: four Composite Base products in one table --------------------------------------------------
const MF_SHA = '58a9c5673b437051db279513a2720ef02cda9f76cd50d9e6976db79efd32ac71';
const MF_ID = 'R-MARKFORGED-CompositesMaterialDatasheet';
export const markforged = {
  name: 'Markforged Composites', sha256: MF_SHA, sourceId: MF_ID, publisher: 'Markforged', provider: 'Markforged',
  title: 'Composites Material Datasheet', revision: 'REV 5.3 - 10/10/2023', published: '2023-10-10',
  url: 'https://s3.amazonaws.com/mf.product.doc.images/Datasheets/Material+Datasheets/CompositesMaterialDatasheet.pdf', docKey: '58a9c5673b437051',
  accessed: ACCESSED, accessNote: FETCHED('Claude Sonnet'), titleEvidence: 'Composites',
  sourceNote: 'Two-page Markforged material datasheet: one table of four Composite Base products (Onyx, Onyx FR, Onyx ESD, Nylon), one of five continuous fibres, test-specimen dimensions and flexural curves. Only the Composite Base products are filaments of the database.',
  identityNote: 'Onyx is "a micro carbon fiber filled nylon" (p. 2): Nylon-CF, maker-undisclosed polyamide (M165, R168); Onyx FR is an Onyx variant (flame-retardant) on the same base; Nylon (White) names no filler: Nylon, maker-undisclosed polyamide (M164). The sheet names no polyamide.',
  grades: [
    { key: 'onyx', materialId: 'M165', manufacturer: 'Markforged', product: 'Onyx', formulationKey: `${MF_ID}-Onyx`, composition: 'Onyx is a micro carbon fiber filled nylon (p. 2, as the sheet states it)', note: 'New product: Markforged Onyx, filed under Nylon-CF, maker-undisclosed polyamide (M165) by R168.', evidence: 'Onyx is a micro carbon fiber filled nylon', evidencePage: 2 },
    { key: 'onyxfr', materialId: 'M165', manufacturer: 'Markforged', product: 'Onyx FR', formulationKey: `${MF_ID}-OnyxFR`, composition: 'Onyx FR is a Blue Card certified UL94 V-0 material that possesses similar mechanical properties to Onyx (p. 2, as the sheet states it)', note: 'New product: Markforged Onyx FR, an Onyx variant, filed with Onyx under Nylon-CF, maker-undisclosed polyamide (M165); the sheet states no filler of its own.', evidence: 'Onyx FR is a Blue Card certified UL94 V-0 material that possesses similar', evidencePage: 2 },
    { key: 'nylon', materialId: 'M164', manufacturer: 'Markforged', product: 'Nylon White', formulationKey: `${MF_ID}-Nylon`, composition: 'Nylon White parts are smooth, non-abrasive, and easily painted (p. 2, as the sheet states it)', note: 'New product: Markforged Nylon (White), filed under Nylon, maker-undisclosed polyamide (M164) by R168.', evidence: 'Nylon White parts are smooth, non-abrasive, and easily painted', evidencePage: 2 },
  ],
  skipped: [
    'p. 1 "Continuous Fiber" table (Carbon, Carbon FR, Kevlar, Fiberglass, HSHT FG) and p. 2 continuous-fibre text: fibres laid by a second nozzle that "cannot be printed by themselves"; not filament products of the database.',
    'p. 1 Flame Resistance (UL94 V-0 for Onyx FR, footnote 2): no property for a UL 94 rating; it stays in the record tier.',
    'The Onyx ESD column (tensile modulus 4.2 GPa, yield 52 MPa, break 50 MPa, strain 25 %, flexural 83 MPa and 3.7 GPa, HDT 138 °C, notched Izod 44 J/m, 1.2 g/cm3, surface resistance 10^5 - 10^7 Ω) is not entered: the product is named for a static-dissipative additive and no home holds an ESD polyamide (FILING-FILLER-WORD refuses it under Nylon-CF); it waits for the owner\'s word on a home.',
    'p. 2 repeats each flexural strength as a heading ("Onyx Flexural Strength: 71 MPa") and draws the flexural curves: the same figures, not second measurements.',
  ],
  measure() {
    const out = [];
    const keys = ['onyx', 'onyxfr', 'onyxesd', 'nylon'], names = ['Onyx', 'Onyx FR', 'Onyx ESD', 'Nylon'];
    const SPEC = 'Composite Base table; plastic test plaques printed with full infill (p. 1); tensile ASTM D638 type I or IV beams, flexural 3-pt bending 4.5 in (L) x 0.4 in (W) x 0.12 in (H)';
    const rows = [
      ['Tensile Modulus (GPa)', 'GPa', 'Tensile modulus', 'D638', ['2.4', '3.0', '4.2', '1.7'], {}],
      ['Tensile Stress at Yield (MPa)', 'MPa', 'Tensile yield strength', 'D638', ['40', '41', '52', '51'], {}],
      ['Tensile Stress at Break (MPa)', 'MPa', 'Tensile break strength', 'D638', ['37', '40', '50', '36'], {}],
      ['Tensile Strain at Break (%)', '%', 'Elongation at break', 'D638', ['25', '18', '25', '150'], {}],
      ['Flexural Strength (MPa)', 'MPa', 'Flexural stress at conventional deflection', 'D790', ['71', '71', '83', '50'], { note: 'Footnote 1: measured by a method similar to ASTM D790; Composite Base-only parts do not break before the end of the flexural test, so this is the stress at the end of the test, not a strength at break.' }],
      ['Flexural Modulus (GPa)', 'GPa', 'Flexural modulus', 'D790', ['3.0', '3.6', '3.7', '1.4'], { note: 'Footnote 1: measured by a method similar to ASTM D790.' }],
      ['Heat Deflection Temp (°C)', '°C', 'HDT', 'D648 B', ['145', '145', '138', '41'], { std: 'Heat-deflection temperature at 0.45 MPa, 66 psi (ASTM D648-07 Method B)', dir: NA }],
      ['Izod Impact - notched (J/m)', 'J/m', 'Izod impact strength', 'D256-10 A', ['330', null, '44', '110'], { notch: 'Notched' }],
      ['Density (g/cm3)', 'g/cm3', 'Density', null, ['1.2', '1.2', '1.2', '1.1'], { dir: NA, specimenType: 'Not published (density specimen form not explicitly established)' }],
    ];
    for (const [label, unit, property, method, cells, o] of rows) {
      cells.forEach((cell, i) => {
        if (cell == null || keys[i] === 'onyxesd') return; // Onyx ESD waits on a home (see the packet's NotAdmitted)
        out.push({
          gradeKey: keys[i], page: 1, property, label, unit, raw: cell, num: Number(cell), line: `${label} ${method ?? '—'} ${cells.map((c) => c ?? '—').join(' ')}`,
          direction: o.dir ?? 'Unstated', specimenType: o.specimenType ?? 'Printed specimen', std: o.std ?? (method ? `ASTM ${method}` : ''), notch: o.notch,
          params: `${names[i]} column; ${SPEC}`, locator: `p. 1: ${label}, ${names[i]}`,
          notes: [o.note, 'The sheet states no print orientation for the Composite Base table.'].filter(Boolean).join(' '),
        });
      });
    }
    return out;
  },
  profiles: [],
};

// ---- QIDI S-White (bilingual) --------------------------------------------------------------------------------------------
export const qidiSWhite = {
  name: 'QIDI S-White', sha256: '715a70a33079fa3f19ef7eb2cbe4cb77c6a15511a7f826cc19d7a4d0704fa2ea', sourceId: 'R-QIDI-S-White', publisher: 'QIDI', provider: 'QIDI',
  title: 'QIDI S-White Technical Data Sheet', revision: 'Version No: 3.0 (Data / Revised: 03.2023)', published: '2023-03',
  url: 'https://drive.google.com/file/d/1SmKn9yDfEWdgjZGdPaeDpQ8je57Egjdh/view?usp=drive_link', docKey: 'https://drive.google.com/file/d/1SmKn9yDfEWdgjZGdPaeDpQ8je57Egjdh/view?usp=drive_link',
  accessed: ACCESSED, accessNote: FETCHED('Claude Sonnet'), titleEvidence: 'QIDI S-White',
  sourceNote: 'Four-page bilingual (Chinese and English) QIDI technical data sheet for QIDI S-White Quick-Remove Support Material, linked from QIDI\'s filament library as a Google Drive viewer.',
  identityNote: 'R202 (owner, 2026-09-25): QIDI S-White, a Quick-Remove Support Material that names no chemistry, is Support for ABS (M079); the seven materials it lists as suitable stay on its profile as the support pairing.',
  grades: [{
    key: 'main', materialId: 'M079', manufacturer: 'QIDI', product: 'S-White',
    composition: 'QIDI S-White Quick-Remove Support Material (p. 1, as the sheet states it)',
    note: 'New product: QIDI S-White, filed under Support for ABS (M079) by the owner\'s ruling R202.', evidence: 'QIDI S-White Quick-Remove Support Material',
  }],
  skipped: [
    'p. 3 support settings with no profile column: Raft separation distance 0 mm, Recommended Support Infill Ratio 15%-20%, Recommended Dense Support Layers 3-5, Vertical Offset Top/Down Layers 0, Horizontal offset 0.3-0.6 mm, Support infill outlines 0-1; they stay in the record tier.',
    'p. 4 item 3 recommends a hardened-steel nozzle "and above grade nozzles made by Phaetus" with a heating block thicker than 12 mm (entered as the abrasion statement), item 4 a wipe wall or wipe tower in dual-extruder printing and item 5 annealing the part before removing S-White with the body material\'s conditions: advice, entered as it applies to a profile column or not at all.',
  ],
  visualAll: false,
  measure() {
    const out = [];
    const row = (o) => out.push({ page: 2, direction: NA, specimenType: 'Not published (do not assume printed)', ...o });
    row({ property: 'Density', label: '密度 Density', unit: 'g/cm3', raw: '1.16 g/cm³', num: 1.16, line: 'Density ISO 1183 1.16 g/cm³', std: 'ISO 1183', specimenType: 'Not published (density specimen form not explicitly established)', locator: 'p. 2: Density' });
    row({ property: 'Water absorption', label: '吸湿率 Water absorption', unit: '%', raw: '0.4 %', num: 0.4, line: 'Water absorption ISO 62: Method 1 0.4 %', std: 'ISO 62: Method 1', locator: 'p. 2: Water absorption' });
    row({ property: 'Melting temperature', label: '熔点 Melting Temperature', unit: '°C', raw: '168 ℃', num: 168, line: 'Melting Temperature ISO 11357 168 ℃', std: 'ISO 11357', locator: 'p. 2: Melting Temperature' });
    row({ property: 'Melt mass-flow rate', label: '熔融指数 Melt index', unit: 'g/10 min', raw: '5.1', num: 5.1, line: 'Melt index 260℃，2.16kg 5.1', std: '260℃, 2.16kg', testTemp: '260 °C', locator: 'p. 2: Melt index', notes: 'The sheet prints no unit for the melt index; g/10 min is the unit of a melt index (260 ℃, 2.16 kg are the sheet\'s test condition).' });
    return out;
  },
  profiles: [{
    page: 3, locator: 'Recommended printing conditions and Additional Suggestions',
    cells: { nozzle: '260-280℃', bed: '60-80℃', plate: 'Coating with PVP glue', diameter: '0.4-1.0mm', drying: '80-100℃ for 4-6h', abrasion: 'hardened steel and above grade nozzles made by Phaetus, heating block thicker than 12mm' },
    lines: { nozzle: 'Nozzle Temperature 260-280℃', bed: 'Build plate temperature 60-80℃', plate: 'Recommended build surface treatment Coating with PVP glue', diameter: 'Recommended Nozzle Diameter 0.4-1.0mm', drying: 'dry the filament in an oven at 80-100℃ for 4-6h' },
    evidence: 'Nozzle Temperature 260-280℃',
    support: 'QIDI ABS-HF; QIDI TPU95A-HF; QIDI TPU85A-HF; QIDI PET-GF; QIDI PET-CF; QIDI NexABS-GF25; QIDI NexABS-CF20',
    notes: [['Cooling', 'Cooling fan speed OFF'], ['Speed', 'Print speed 30-120 mm/s'], ['Retraction', 'Retraction distance 1-3 mm; retraction speed 1800-3600 mm/min'],
      ['Adhesion / release', 'Coating with PVP glue; raft separation distance 0 mm'], ['Storage humidity', 'Put the filament into a dry box (humidity below 15%) immediately after opening the vacuum foil bag; put the unused filament back into the original aluminum foil bag']],
  }],
};
