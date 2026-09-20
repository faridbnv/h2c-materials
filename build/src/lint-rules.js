// Data lint: problems the schema cannot express, because they are about quality rather than structure.
// Every finding has a stable rule code and a record, so an accepted finding can be baselined
// (data/review/accepted-findings.csv) and a new one stops `npm run verify`.
//
// A finding has the one shape rules.js issue() builds: { level, code, table, record, field, where, message }. The
// acceptance baseline is keyed on code + table + record + field.

import { DATA_STATUS } from './normalize/values.js';

export const LINT_RULES = {
  'TEXT-LIGATURE': 'A typographic ligature (ﬁ, ﬂ ...) from PDF extraction; write the plain letters.',
  'TEXT-FULLWIDTH': 'Full-width punctuation (，＜：) in text that is not Chinese or Japanese; write the ASCII character.',
  'TEXT-INVISIBLE': 'A zero-width, control or line-break character inside a cell.',
  'TEXT-SPACING': 'Two or more spaces in a row.',
  'VOCAB-NEAR-DUPLICATE': 'Values that differ only in case, spacing or punctuation in a short-list column that is not raw source text; pick one spelling.',
  'MEAS-DUPLICATE': 'Two active measurements with the same grade, property, value, unit, direction, conditions, source and locator; retire the copy.',
  'MEAS-CONDITIONS-INDISTINCT': 'Different values of one property, from one place in one source, with identical test conditions; a source that prints two tables (dry and conditioned, as printed and annealed, two print speeds) must say which table each row came from.',
  'MEAS-PRINTED-NO-DIRECTION': 'A printed-specimen mechanical measurement with no stated direction, which can never back an XY headline.',
  'MEAS-LOCATOR-DIRECTION': 'The locator names a build direction (X-Y, XY, Z) that the Direction column does not record; a Z result coded as unknown taught the estimate model that unknown directions sit far below XY.',
  'MEAS-PHYSICS-HDT-LOADS': 'One grade, source and state publish HDT at 0.45 MPa below HDT at 1.8 MPa; a lighter load cannot deflect a bar at a lower temperature. Flag the pair physically implausible, or accept with the reason.',
  'MEAS-PHYSICS-Z-ABOVE-XY': 'One grade, source and state publish a Z result clearly above its XY result (strength or impact above, stiffness more than 15 % above); layer bonds make Z the weak direction, so the labels may be swapped.',
  'MEAS-PHYSICS-ORDER': 'Two values of one grade, source and test state that physics orders the other way round. A window cannot see this: a sheet\'s glass transition, heat deflection, Vicat and melting point are four numbers in one unit and one range, so a swapped pair is individually ordinary and jointly impossible. Re-read the rows and correct whichever is on the wrong line.',
  'MEAS-PHYSICS-WINDOW': 'A value outside what its polymer can do (data/tables/plausibility_windows.csv). Beyond a hard bound it is impossible and the row is a defect: re-read the sheet, and if the sheet really prints it, flag it Published value (physically implausible) with the reason (D55). Beyond a soft bound it is surprising: check it, and accept it with what makes it credible.',
  'MEAS-PHYSICS-STRAIN': 'One grade, source, direction and state publish a strain at break below stress / modulus; a thermoplastic softens before it breaks, so the modulus basis (secant, flexural) or a value is suspect.',
  'GRADE-PRODUCT-DUPLICATE': 'Two active grades name the same product of the same manufacturer; one product has one grade. Retire the copy, or say what distinguishes them in Product name.',
  'FORMULATION-KEY-SPANS-MATERIALS': 'One Shared formulation key on active grades of more than one material. The estimate model reads a key as one product and predicts it once, so two materials cannot both own it (D12, D44); file the product under the material it is.',
  'GRADE-KEY-PRODUCTS': 'One Shared formulation key on active grades with different product names. A sheet that prints several products gives each its own key (SourceID#product), or the model reads two products as one.',
  'MEAS-CROSS-SOURCE-TWIN': 'Two sources publish almost the same numbers under the same conditions: one document registered twice, usually a retailer\'s copy of a manufacturer sheet. Keep the manufacturer\'s, retire the copy\'s rows as a duplicate record naming the twin and give its source the corroboration role, or accept with the reason the two really are separate tests.',
  'SOURCE-SHA-DUPLICATE': 'Two source records hold the same document: one SHA-256 under two SourceIDs. A copy on another host is the same document, not a second source.',
  'SOURCE-UNCITED': 'A source whose Citation role is "cited" but no record cites it; cite it, or give it the role it has.',
  'SOURCE-ROLE-CITED': 'A source recorded as not retrieved is cited by a record; nothing may be entered from a source that was not read.',
  'SOURCE-LOCAL-PATH': 'A source whose location is a path on one computer, not a URL anyone can open.',
  'SOURCE-TITLE-NOT-TITLE': 'A source Title that is not the document\'s own title: a shop page\'s chrome (payment or store words), a file name ("B pla basic", an underscore, .xlsx or .pdf) or "untitled"; write the title the publisher printed on the sheet or page.',
  'COVERAGE-DUPLICATE': 'Two coverage rows for one material and domain with the same status and finding.',
  'COVERAGE-SUPERSEDED': 'Several coverage rows for one material and domain with the same status; an older finding may have been overtaken by a newer one.',
};

const CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/;
const FULLWIDTH_PUNCT = /[\uff01-\uff0f\uff1a-\uff20\uff3b-\uff40\uff5b-\uff5e\u3001\u3002]/;
const LIGATURE = /[\ufb00-\ufb06]/;
const INVISIBLE = /[\u0000-\u001f\u007f\u200b-\u200d\u2060\ufeff]/;
const MISSING = /^Not (published|applicable)$/;
// A source Title is what the publisher printed (D63): not a shop page's payment or store chrome, not a file name and
// not a placeholder.
const CHROME = /\b(Visa|Mastercard|Maestro|PayPal|Klarna|Amazon|Apple Pay|Google Pay|Shop Pay|American Express|Diners Club|Discover|Direct Debit|Add to cart|Checkout)\b/i;
// A file name, not a title: the register's own "B pla basic" shape, a document extension, a name that opens with
// the kind of document it is ("TDS_FIBERON..."), or more than one underscore. A single underscore inside a word
// is not enough — colorFabb writes its products nGen_FLEX and colorFabb_XT, and "Technical datasheet nGen_FLEX"
// is the title its own sheet prints.
const FILE_NAME = /^B [A-Za-z]|^(tds|msds|sds|pds|tdb)[_-]|_[^_]*_|\.(xlsx|xls|csv|pdf|docx?)$/i;
export const isTitle = (title) => !(CHROME.test(title) || FILE_NAME.test(title) || /^untitled$/i.test(title));

const TEXT_TABLES = ['materials', 'grades', 'profiles', 'profile_notes', 'measurements', 'evidence', 'prices', 'sources', 'coverage', 'method', 'reference', 'reference_envelopes', 'properties', 'headline_definitions', 'polymer_environment'];

/** tables: { name: { header, rows } } as plain objects (CSV values); schemas: from loadSchemas. */
export function lintData(tables, schemas) {
  const findings = [];
  // The shape issue() builds (rules.js), written here because the catalogue reads LINT_RULES from this file.
  const add = (code, table, record, field, message) => findings.push({ level: 'lint', code, table, record, field: field ?? '', where: [table, record, field].filter(Boolean).join(' '), message });
  const pkOf = (t) => schemas[t]?.primaryKey;
  const idOf = (t, r) => (pkOf(t) ? r[pkOf(t)] : (schemas[t]?.uniqueKeys?.[0] ?? []).map((f) => r[f]).join(' | '));

  // Text artifacts, per cell.
  for (const t of TEXT_TABLES) {
    for (const r of tables[t]?.rows ?? []) {
      for (const [field, v] of Object.entries(r)) {
        if (typeof v !== 'string') continue;
        const where = [t, idOf(t, r), field];
        if (LIGATURE.test(v)) add('TEXT-LIGATURE', ...where, JSON.stringify(v.slice(0, 80)));
        if (FULLWIDTH_PUNCT.test(v) && !CJK.test(v)) add('TEXT-FULLWIDTH', ...where, JSON.stringify(v.slice(0, 80)));
        if (INVISIBLE.test(v)) add('TEXT-INVISIBLE', ...where, JSON.stringify(v.slice(0, 80)));
        if (/ {2,}/.test(v)) add('TEXT-SPACING', ...where, JSON.stringify(v.slice(0, 80)));
      }
    }
  }

  // Spellings of one value, in the columns where one spelling is intended. There is no cap on how many
  // distinct values a column may hold: a cap switches the check off silently as the data grows, which is
  // exactly when brand-name drift starts (it stopped at 60, and Manufacturer was at 30).
  const norm = (s) => s.normalize('NFKC').toLowerCase().replace(/[^a-z0-9%<>=+.]/g, '').replace(/\.(?=\D|$)/g, '');
  const ONE_SPELLING = new Set(['canonical', 'editorial']);
  for (const t of ['materials', 'grades', 'profiles', 'profile_notes', 'measurements', 'evidence', 'prices', 'sources', 'polymer_environment']) {
    const rows = tables[t]?.rows ?? [];
    for (const field of tables[t]?.header ?? []) {
      const f = schemas[t]?.fields?.find((x) => x.name === field);
      // Raw and prose columns keep the source's own words by design (m07 changes no wording); their typed columns are
      // checked instead. A vocabulary or a reference already allows one spelling each. A number is not a spelling:
      // the normaliser drops its sign, so -35 and 35 would read as one value. `spellings: "many"` is a column where
      // more than one spelling is legitimate, because different publishers name their own products.
      if (!ONE_SPELLING.has(f?.role) || f.type === 'number' || f.vocabulary || f.item?.vocabulary || f.reference || f.spellings === 'many') continue;
      const values = [...new Set(rows.map((r) => r[field]).filter((v) => typeof v === 'string'))];
      if (values.length < 2) continue;
      const groups = new Map();
      for (const v of values) { const k = norm(v); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(v); }
      for (const vs of groups.values()) if (vs.length > 1) add('VOCAB-NEAR-DUPLICATE', t, vs.sort().join(' ~ '), field, `${vs.length} spellings`);
    }
  }

  // Measurements.
  const measurements = (tables.measurements?.rows ?? []).filter((r) => !DATA_STATUS[r['Data status']]?.retiredDuplicate);
  // A fatigue measurement's stresses are part of what makes it distinct (data/tables/fatigue_tests.csv).
  const fatigue = new Map((tables.fatigue_tests?.rows ?? []).map((f) => [f.MeasurementID, f]));
  const dupKey = (r) => [...['GradeID', 'Property', 'Normalized value', 'Normalized unit', 'Direction', 'Standard / load', 'Notch', 'Moisture condition',
    'Post-processing', 'Specimen type', 'Specimen / print parameters', 'SourceID', 'Locator'].map((f) => r[f]), ...['Stress max MPa', 'Stress min MPa'].map((f) => fatigue.get(r.MeasurementID)?.[f] ?? 'Not applicable')].join('\u0000');
  const seen = new Map();
  for (const r of measurements) {
    const k = dupKey(r);
    if (seen.has(k)) add('MEAS-DUPLICATE', 'measurements', r.MeasurementID, '', `same as ${seen.get(k)}`);
    else seen.set(k, r.MeasurementID);
  }
  // Rows the source lists separately must differ in a stated condition, or the table they came from is lost.
  const CONDITION_FIELDS = ['GradeID', 'Property', 'Direction', 'Notch', 'Standard / load', 'Test load MPa', 'Test temperature', 'Moisture condition',
    'Post-processing', 'Specimen type', 'Specimen / print parameters', 'SourceID'];
  const locator = (s) => String(s ?? '').normalize('NFKC').replace(/[\s'’"]/g, '').toLowerCase();
  const byConditions = new Map();
  for (const r of measurements.filter((m) => DATA_STATUS[m['Data status']]?.numeric)) {
    const k = [...CONDITION_FIELDS.map((f) => r[f]), locator(r.Locator)].join('\u0000');
    if (!byConditions.has(k)) byConditions.set(k, []);
    byConditions.get(k).push(r);
  }
  for (const rows of byConditions.values()) {
    if (new Set(rows.map((r) => r['Normalized value'])).size < 2) continue;
    for (const r of rows.slice(1)) add('MEAS-CONDITIONS-INDISTINCT', 'measurements', r.MeasurementID, '', `${r.Property} ${r['Normalized value']} vs ${rows[0].MeasurementID} ${rows[0]['Normalized value']} (${r.SourceID}, ${r.Locator})`);
  }

  const mechanical = new Set((tables.properties?.rows ?? []).filter((p) => p.Domain === 'mechanical').map((p) => p.Property));
  for (const r of measurements) {
    if (mechanical.has(r.Property) && /^Printed specimen/.test(r['Specimen type'] ?? '') && r.Direction === 'Not published' && /^Published value/.test(r['Data status'])) {
      add('MEAS-PRINTED-NO-DIRECTION', 'measurements', r.MeasurementID, 'Direction', `${r.Property} ${r['Normalized value']} ${r['Normalized unit']}`);
    }
  }

  // A direction the locator names and the Direction column does not record (audit 2026-09-15, B-03). Mixed labels
  // (X-Z, ZX, "XY and Z") name no single direction and are left to the reader.
  const NAMED = [['XY', /(^|[^A-Za-z-])(X-Y|XY)([^A-Za-z-]|$)/], ['Z', /(^|[^A-Za-z-])Z([^A-Za-z-]|$)/]];
  for (const r of tables.measurements?.rows ?? []) {
    if (r['Data status'] === 'Retired duplicate record') continue;
    const named = NAMED.filter(([, re]) => re.test(r.Locator ?? '')).map(([d]) => d);
    if (named.length !== 1 || /X-?Z|Z-?X/.test(r.Locator ?? '')) continue;
    if (r.Direction !== named[0]) add('MEAS-LOCATOR-DIRECTION', 'measurements', r.MeasurementID, 'Direction', `${r.Locator} is recorded as ${r.Direction}`);
  }

  // Physics the tables must not contradict within one grade, source and test state (audit 2026-09-15, B-10). A value
  // flagged "Published value (physically implausible)" has been dealt with and is left out.
  const active = (tables.measurements?.rows ?? []).filter((r) => /^Published value( \(transcription corrected\))?$/.test(r['Data status'] ?? '') && Number.isFinite(Number(r['Normalized value'])));
  const groups = new Map();
  for (const r of active) {
    const k = [r.GradeID, r.SourceID, r['Moisture condition'], r['Post-processing']].join('\u0000');
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  const num = (r) => Number(r['Normalized value']);
  for (const rows of groups.values()) {
    const of = (property, pred = () => true) => rows.filter((r) => r.Property === property && pred(r));
    const load = (r) => Number(r['Test load MPa']);
    for (const lo of of('HDT', (r) => Math.abs(load(r) - 0.45) < 0.02)) {
      for (const hi of of('HDT', (r) => Math.abs(load(r) - 1.8) < 0.05)) {
        if (num(lo) < num(hi)) add('MEAS-PHYSICS-HDT-LOADS', 'measurements', lo.MeasurementID, 'Normalized value', `${num(lo)} °C at 0.45 MPa < ${num(hi)} °C at 1.8 MPa (${hi.MeasurementID})`);
      }
    }
    for (const property of ['Tensile modulus', 'Flexural modulus', 'Tensile strength (endpoint unspecified)', 'Tensile break strength', 'Flexural strength', 'Charpy strength', 'Izod impact strength']) {
      const stiffness = /modulus/.test(property);
      for (const z of of(property, (r) => r.Direction === 'Z')) {
        for (const xy of of(property, (r) => r.Direction === 'XY' && r['Normalized unit'] === z['Normalized unit'] && r.Notch === z.Notch)) {
          if (num(z) > num(xy) * (stiffness ? 1.15 : 1)) add('MEAS-PHYSICS-Z-ABOVE-XY', 'measurements', z.MeasurementID, 'Direction', `${property} Z ${num(z)} > XY ${num(xy)} ${xy['Normalized unit']} (${xy.MeasurementID})`);
        }
      }
    }
    for (const e of of('Elongation at break', (r) => r.Operator === '=' || !r.Operator)) {
      const same = (r) => r.Direction === e.Direction;
      const strength = of('Tensile strength (endpoint unspecified)', same)[0] ?? of('Tensile break strength', same)[0];
      const modulus = of('Tensile modulus', same)[0];
      if (!strength || !modulus || !(num(modulus) > 0)) continue;
      const linear = (num(strength) / (num(modulus) * 1000)) * 100;
      if (num(e) < linear * 0.9) add('MEAS-PHYSICS-STRAIN', 'measurements', e.MeasurementID, 'Normalized value', `${num(e)} % < stress / modulus ${linear.toFixed(2)} % (${strength.MeasurementID} / ${modulus.MeasurementID})`);
    }
  }

  // One document registered twice. A retailer's copy of a manufacturer sheet carries the same table, so the two
  // sources publish the same values under the same conditions; MEAS-DUPLICATE cannot see it, because its key
  // includes the SourceID and the Locator. Rare tuples only: a density every PLA sheet prints says nothing, and
  // pairing every source that shares one would be quadratic in the register.
  const TWIN_FIELDS = ['Property', 'Normalized value', 'Normalized unit', 'Direction', 'Notch', 'Test load MPa', 'Moisture state', 'Post-processing state'];
  const TWIN_COMMON = 10;   // a tuple more sources than this publish is a common value, not a fingerprint
  const TWIN_FLOOR = 5;     // a sheet with fewer values than this cannot be told from a coincidence
  const TWIN_SHARE = 0.8;   // of the smaller sheet's values
  const perSource = new Map();
  const tupleSources = new Map();
  for (const r of measurements.filter((m) => DATA_STATUS[m['Data status']]?.numeric)) {
    const tuple = TWIN_FIELDS.map((f) => r[f]).join('\u0000');
    if (!perSource.has(r.SourceID)) perSource.set(r.SourceID, new Set());
    perSource.get(r.SourceID).add(tuple);
    if (!tupleSources.has(tuple)) tupleSources.set(tuple, new Set());
    tupleSources.get(tuple).add(r.SourceID);
  }
  const sharedValues = new Map();
  for (const ss of tupleSources.values()) {
    if (ss.size < 2 || ss.size > TWIN_COMMON) continue;
    const ids = [...ss].sort();
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const k = `${ids[i]}\u0000${ids[j]}`;
      sharedValues.set(k, (sharedValues.get(k) ?? 0) + 1);
    }
  }
  for (const [k, count] of sharedValues) {
    const [a, b] = k.split('\u0000');
    const smaller = Math.min(perSource.get(a).size, perSource.get(b).size);
    if (smaller < TWIN_FLOOR || count < smaller * TWIN_SHARE) continue;
    add('MEAS-CROSS-SOURCE-TWIN', 'sources', `${a} | ${b}`, '', `${count} of ${perSource.get(a).size} and ${perSource.get(b).size} values are the same under the same conditions`);
  }

  // Grades: one product, one grade, one formulation key.
  const activeGrades = (tables.grades?.rows ?? []).filter((g) => g.Status === 'active');
  const productKey = (s) => String(s ?? '').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g, '');
  const byProduct = new Map();
  for (const g of activeGrades) {
    const k = `${productKey(g.Manufacturer)}\u0000${productKey(g['Product name'])}`;
    if (byProduct.has(k)) add('GRADE-PRODUCT-DUPLICATE', 'grades', g.GradeID, 'Product name', `${g.Manufacturer} ${g['Product name']} is already ${byProduct.get(k)}`);
    else byProduct.set(k, g.GradeID);
  }
  const byFormulation = new Map();
  for (const g of activeGrades) {
    const k = g['Shared formulation key'];
    if (!k) continue;
    if (!byFormulation.has(k)) byFormulation.set(k, []);
    byFormulation.get(k).push(g);
  }
  for (const [k, gs] of byFormulation) {
    const materials = [...new Set(gs.map((g) => g.MaterialID))];
    if (materials.length > 1) add('FORMULATION-KEY-SPANS-MATERIALS', 'grades', gs.map((g) => g.GradeID).join(' | '), 'Shared formulation key', `${k} is on ${materials.join(', ')}`);
    const products = [...new Set(gs.map((g) => productKey(g['Product name'])))];
    if (materials.length === 1 && products.length > 1) add('GRADE-KEY-PRODUCTS', 'grades', gs.map((g) => g.GradeID).join(' | '), 'Shared formulation key', `${k} is on ${gs.map((g) => g['Product name']).join(', ')}`);
  }

  // A value outside what its polymer can do. The windows are a table, keyed on the property, the unit, how the
  // material solidifies, whether it is reinforced and, for an impact result, its notch; the most specific window
  // that matches wins. A value the database already flags physically implausible has been dealt with and is left
  // alone, and so is one it cannot read.
  const windows = tables.plausibility_windows?.rows ?? [];
  if (windows.length) {
    const materials = new Map((tables.materials?.rows ?? []).map((m) => [m.MaterialID, m]));
    const morphology = new Map((tables.polymers?.rows ?? []).map((p) => [p.PolymerID, p.Morphology]));
    const number = (v) => (v == null || /^Not /.test(String(v)) ? null : Number(v));
    // How a material solidifies comes from its polymer's row. A material with no row is judged as a
    // high-temperature one only where its family says it is: the blends and specialities that have no row yet
    // (a PC/ASA, a PPE/PS) are ordinary printable polymers, and judging them against PEEK's windows called their
    // glass transition surprisingly low. Where nothing says, nothing is assumed and only an "any" window applies.
    const classOf = (m) => morphology.get(m?.['Estimate identity'])
      ?? (/High-Temperature/i.test(m?.Family ?? '') ? 'high-temp' : 'any');
    const fillOf = (m) => (['Carbon fibre', 'Glass fibre'].includes(m?.['Modifier / filler']) ? 'fibre'
      : m?.['Modifier / filler'] === 'Unfilled / unspecified' ? 'unfilled' : 'any');
    const fits = (window, want, field) => window[field] === want[field] || window[field] === 'any';
    for (const r of measurements) {
      // A value the database already flags physically implausible has been dealt with, with its reason recorded.
      if (!/^Published value( \(transcription corrected\))?$/.test(r['Data status'] ?? '')) continue;
      const value = Number(r['Normalized value']);
      if (!Number.isFinite(value)) continue;
      const material = materials.get(r.MaterialID);
      const want = {
        'Matrix class': classOf(material), 'Fill class': fillOf(material),
        Condition: ['Notched', 'Unnotched'].includes(r.Notch) ? r.Notch : 'any',
      };
      const matching = windows.filter((w) => w.Property === r.Property && w['Normalized unit'] === r['Normalized unit']
        && fits(w, want, 'Matrix class') && fits(w, want, 'Fill class') && fits(w, want, 'Condition'));
      if (!matching.length) continue;
      const score = (w) => ['Matrix class', 'Fill class', 'Condition'].reduce((a, f) => a + (w[f] === 'any' ? 0 : 1), 0);
      const window = matching.sort((a, b) => score(b) - score(a))[0];
      // A film or a filament strand is not a printed bar and is far stronger; D55 already keeps both out of every
      // headline and estimate, so neither is judged against a printed part's window.
      if (/^(Film|Filament)/.test(r['Specimen type'] ?? '')) continue;
      const where = `${r.Property} ${value} ${r['Normalized unit']} on a ${want['Matrix class']} ${want['Fill class'] === 'any' ? 'compound' : want['Fill class']} material`;
      if (window['Always flag'] === 'TRUE') { add('MEAS-PHYSICS-WINDOW', 'measurements', r.MeasurementID, 'Normalized value', `${where}: ${window.Basis.split('.')[0]}`); continue; }
      const [hardLow, rawSoftLow, softHigh, hardHigh] = ['Hard low', 'Soft low', 'Soft high', 'Hard high'].map((f) => number(window[f]));
      // A part printed across its layers is weakest there: a Z value is legitimately a third to a half of the same
      // property in the build plane, so the window's soft low says nothing about it. The hard low still holds, and
      // MEAS-PHYSICS-Z-ABOVE-XY owns the opposite error.
      const acrossLayers = ['Z', 'ZX', 'XZ', 'Vertical XZ (source label)'].includes(r.Direction);
      const softLow = acrossLayers ? null : rawSoftLow;
      const beyond = (hardLow != null && value < hardLow) ? `below ${hardLow}, which is impossible`
        : (hardHigh != null && value > hardHigh) ? `above ${hardHigh}, which is impossible`
        : (softLow != null && value < softLow) ? `below ${softLow}, which is surprising`
        : (softHigh != null && value > softHigh) ? `above ${softHigh}, which is surprising`
        : null;
      if (beyond) add('MEAS-PHYSICS-WINDOW', 'measurements', r.MeasurementID, 'Normalized value', `${where} is ${beyond} (${window.WindowID})`);
    }
  }

  // Relations physics fixes between two values of one grade, source and state. These catch what a window cannot: a
  // value that landed under the wrong property. A sheet prints its glass transition, heat deflection, Vicat and
  // melting point as four numbers in one unit and one range, so a swapped pair is individually ordinary.
  const elastomerIdentities = new Set((tables.polymers?.rows ?? []).filter((p) => p.Morphology === 'elastomer').map((p) => p.PolymerID));
  const ORDERED = [
    ['Glass transition temperature', 'Vicat softening temperature', 'a bar softens above the temperature at which its polymer goes rubbery'],
    ['Vicat softening temperature', 'Melting temperature', 'a crystalline polymer melts above the temperature at which a needle sinks into it'],
    ['Glass transition temperature', 'Melting temperature', 'a polymer melts above its glass transition'],
    ['Crystallization temperature', 'Melting temperature', 'a polymer crystallises on cooling, below where it melted'],
    ['Elongation at yield', 'Elongation at break', 'a bar yields before it breaks'],
    ['Tensile yield strength', 'Tensile strength (endpoint unspecified)', 'the ultimate stress is the highest the bar reached, so it is at least the stress at yield'],
  ];
  // Two different tests can cross by a little where the polymer puts them close together: a PLA's Vicat at 10 N
  // and its glass transition sit within a couple of degrees of each other, and which comes first is scatter. An
  // inversion is only evidence of a swapped line when it is larger than that, so the margin is a tenth.
  const ORDER_MARGIN = 0.1;
  const elastomers = new Set((tables.materials?.rows ?? []).filter((m) => elastomerIdentities.has(m['Estimate identity'])).map((m) => m.MaterialID));
  for (const rows of groups.values()) {
    const of = (property, pred = () => true) => rows.filter((r) => r.Property === property && pred(r));
    for (const [lower, higher, why] of ORDERED) {
      for (const a of of(lower)) {
        for (const b of of(higher, (r) => r['Normalized unit'] === a['Normalized unit'] && r.Direction === a.Direction)) {
          if (num(a) > num(b) * (1 + ORDER_MARGIN)) add('MEAS-PHYSICS-ORDER', 'measurements', a.MeasurementID, 'Normalized value', `${lower} ${num(a)} above ${higher} ${num(b)} (${b.MeasurementID}): ${why}`);
        }
      }
    }
    // A bar bends harder than it pulls, because its outer fibre carries the load: a flexural strength below the
    // tensile strength of the same specimen is one of the two on the wrong line. An elastomer is left out: it
    // never reaches the conventional deflection, so what its sheet calls a flexural strength is another quantity.
    for (const flexural of of('Flexural strength', (r) => !elastomers.has(r.MaterialID))) {
      for (const tensile of of('Tensile strength (endpoint unspecified)', (r) => r['Normalized unit'] === flexural['Normalized unit'] && r.Direction === flexural.Direction)) {
        if (num(flexural) < num(tensile) * (1 - ORDER_MARGIN)) add('MEAS-PHYSICS-ORDER', 'measurements', flexural.MeasurementID, 'Normalized value', `Flexural strength ${num(flexural)} below tensile strength ${num(tensile)} (${tensile.MeasurementID}): a bar bends harder than it pulls, because its outer fibre carries the load`);
      }
    }
  }

  // Sources.
  const byDigest = new Map();
  const cited = new Set();
  for (const t of ['grades', 'profiles', 'measurements', 'evidence', 'prices', 'polymer_environment', 'polymers']) for (const r of tables[t]?.rows ?? []) cited.add(r.SourceID);
  for (const r of tables.profiles?.rows ?? []) for (const s of String(r['H2C SourceID'] ?? '').split(';')) cited.add(s.trim());
  for (const r of tables.material_links?.rows ?? []) cited.add(r.RecordID);
  for (const r of tables.sources?.rows ?? []) {
    const role = r['Citation role'] ?? 'cited';
    if (role === 'cited' && !cited.has(r.SourceID)) add('SOURCE-UNCITED', 'sources', r.SourceID, '', `${r['Source class']}; ${r['Access state']}`);
    if (role === 'not-retrieved' && cited.has(r.SourceID)) add('SOURCE-ROLE-CITED', 'sources', r.SourceID, 'Citation role', r['Access state']);
    if (r.URL && !/^https?:\/\//.test(r.URL)) add('SOURCE-LOCAL-PATH', 'sources', r.SourceID, 'URL', r.URL);
    if (r.Title && !isTitle(r.Title)) add('SOURCE-TITLE-NOT-TITLE', 'sources', r.SourceID, 'Title', JSON.stringify(r.Title.slice(0, 80)));
    if (/^[0-9a-f]{64}$/.test(r.SHA256 ?? '')) {
      if (byDigest.has(r.SHA256)) add('SOURCE-SHA-DUPLICATE', 'sources', r.SourceID, 'SHA256', `the same document as ${byDigest.get(r.SHA256)}`);
      else byDigest.set(r.SHA256, r.SourceID);
    }
  }

  // Coverage.
  const byMaterialDomain = new Map();
  for (const r of (tables.coverage?.rows ?? []).filter((c) => c.Status !== 'Superseded')) {
    const k = `${r.MaterialID} ${r.Domain}`;
    if (!byMaterialDomain.has(k)) byMaterialDomain.set(k, []);
    byMaterialDomain.get(k).push(r);
  }
  for (const [k, rows] of byMaterialDomain) {
    const exact = new Map();
    for (const r of rows) {
      const key = `${r.Status}\u0000${r.Finding}`;
      if (exact.has(key)) add('COVERAGE-DUPLICATE', 'coverage', r.CoverageID, '', `same as ${exact.get(key)} (${k})`);
      else exact.set(key, r.CoverageID);
    }
    const byStatus = new Map();
    for (const r of rows) { if (!byStatus.has(r.Status)) byStatus.set(r.Status, []); byStatus.get(r.Status).push(r); }
    for (const [status, same] of byStatus) {
      const distinct = [...new Map(same.map((r) => [r.Finding, r])).values()];
      if (distinct.length > 1 && !MISSING.test(status)) add('COVERAGE-SUPERSEDED', 'coverage', distinct.map((r) => r.CoverageID).join(' | '), '', `${k}: ${distinct.length} "${status}" findings`);
    }
  }
  return findings;
}

export const findingKey = (f) => `${f.code}\u0000${f.table}\u0000${f.record}\u0000${f.field}`;
