// Data lint: problems the schema cannot express, because they are about quality rather than structure.
// Every finding has a stable rule code and a record, so an accepted finding can be baselined
// (data/review/accepted-findings.csv) and a new one stops `npm run verify`.
//
// A finding has the one shape rules.js issue() builds: { level, code, table, record, field, where, message }. The
// acceptance baseline is keyed on code + table + record + field.

import { indexPageContext, contextFor, rowStates, pageStates, specimenApplies, directionApplies } from './page-context.js';
import { DATA_STATUS } from './normalize/values.js';
import { parseAppliesTo, applies, NOT_MODELLED } from './registry.js';
import { compileRelations, relationFindings, specimenForm } from './physical-relations.js';

export const LINT_RULES = {
  'TEXT-LIGATURE': 'A typographic ligature (ﬁ, ﬂ ...) from PDF extraction; write the plain letters.',
  'TEXT-FULLWIDTH': 'Full-width punctuation (，＜：) in text that is not Chinese or Japanese; write the ASCII character.',
  'TEXT-INVISIBLE': 'A zero-width, control or line-break character inside a cell.',
  'TEXT-SPACING': 'Two or more spaces in a row.',
  'VOCAB-NEAR-DUPLICATE': 'Values that differ only in case, spacing or punctuation in a short-list column that is not raw source text; pick one spelling.',
  'MEAS-DUPLICATE': 'Two active measurements with the same grade, property, value, unit, direction, conditions, source and locator; retire the copy.',
  'MEAS-CONDITIONS-INDISTINCT': 'Different values of one property, from one place in one source, with identical test conditions; a source that prints two tables (dry and conditioned, as printed and annealed, two print speeds) must say which table each row came from.',
  'MEAS-PRINTED-NO-DIRECTION': 'A printed-specimen mechanical measurement with no stated direction, which can never back an XY headline.',
  'MEAS-LOCATOR-DIRECTION': 'The locator names a build direction (X-Y, XY, Z) that the Direction column does not record; a Z result coded as unknown taught the estimate model that unknown directions sit far below XY. A thermal or physical row recorded with no direction (Not applicable) is left alone: there the locator names how the bar was printed.',
  'MEAS-PHYSICS-HDT-LOADS': 'One grade, source and state publish HDT at 0.45 MPa below HDT at 1.8 MPa; a lighter load cannot deflect a bar at a lower temperature. Flag the pair physically implausible, or accept with the reason.',
  'MEAS-PHYSICS-Z-ABOVE-XY': 'One grade, source and state publish a Z result clearly above its XY result (strength or impact above, stiffness more than 15 % above); layer bonds make Z the weak direction, so the labels may be swapped.',
  'MEAS-PHYSICS-ORDER': 'Two values of one grade, source and test state that physics orders the other way round (the pairs, margins and what a pair must share are data/tables/physical_relations.csv). A window cannot see this: a sheet\'s glass transition, heat deflection, Vicat and melting point are four numbers in one unit and one range, so a swapped pair is individually ordinary and jointly impossible. A Vicat whose own words name the heavy load (50 N, method B) is not ordered against the glass transition, because that needle sinks into a glassy bar once it yields. Re-read the rows and correct whichever is on the wrong line.',
  'MEAS-PHYSICS-WINDOW': 'A value outside what its polymer can do (data/tables/plausibility_windows.csv). Beyond a hard bound it is impossible and the row is a defect: re-read the sheet, and if the sheet really prints it, flag it Published value (physically implausible) with the reason (D55). Beyond a soft bound it is surprising: check it, and accept it with what makes it credible.',
  'CONTEXT-ROW-CONTRADICTS-PAGE': 'A measurement states a specimen form, moisture state, treatment or bar orientation its page states the opposite of (page_context.csv, D116, D135). The row keeps its own words and the build reads them; re-read the page and correct the row, or accept with why this row differs from its page.',
  'MEAS-PHYSICS-NOTCH': 'One grade, source, direction and state publish a notched impact above the unnotched one; a notch only concentrates stress, so the labels, the units or the sheet are wrong (data audit 2026-10-01, RC6). Re-read the sheet; if it really prints this, flag the pair Published value (physically implausible).',
  'MEAS-PHYSICS-FLEX-STRAIN': 'A flexural strength above 8 % of its flexural modulus, for a rigid polymer: the outer fibre would have strained past where ISO 178 and ASTM D790 stop, so one of the two is another quantity or a misprint (data audit 2026-10-01, RC6).',
  'IMPACT-UNIT-STANDARD': 'An impact value whose unit is not the one its standard reports: ASTM D256 gives J/m (energy per width), ISO 179 and ISO 180 give kJ/m² (energy per area). Re-read which the sheet means; the two cannot be converted without the specimen geometry (data audit 2026-10-01, RC7).',
  'GRADE-VALUES-TWIN': 'Two active grades share at least 80 % of at least five published values with no Shared formulation key between them: one table printed under two products (a reseller, a rebrand, a second-language sheet). Record it as R053 says (one formulation key, the values once) or accept with why the two are separate products (data audit 2026-10-01, RC5).',
  'FILING-FILLER-WORD': 'A product name names a filler or polymer its material does not have (CF, GF, metal, wood, ESD; PETG under PLA), and no Variant explains it. File the product under the material it is, or set its Variant (data audit 2026-10-01, RC9).',
  'MEAS-PHYSICS-STRAIN': 'One grade, source, direction and state publish a strain at break below stress / modulus; a thermoplastic softens before it breaks, so the modulus basis (secant, flexural) or a value is suspect.',
  'PROFILE-DUPLICATE': 'Two live profiles of one product from one sheet that do not name different rows of it (a print speed, a nozzle size): one is a copy, usually of a test bar\'s settings read as a second setup and later made to match (D120). Retire the copy (Profile "Retired duplicate record", its Locator naming the profile that stays) after moving anything only it holds.',
  'PROFILE-SIBLING-SILENT': 'Two profiles of one product from one sheet, rows of it (a print speed, a nozzle size), where one holds a chamber, enclosure, drying or nozzle statement the other does not: the sheet prints it once for every row (D120). Copy it to the silent one.',
  'GRADE-PRODUCT-DUPLICATE': 'Two active grades name the same product of the same manufacturer, the maker\'s own words and a sheet\'s revision mark (V5.6, Version 2) aside; one product has one grade. Retire the copy, or say what distinguishes them in Product name.',
  'FORMULATION-KEY-SPANS-MATERIALS': 'One Shared formulation key on active grades of more than one material. The estimate model reads a key as one product and predicts it once, so two materials cannot both own it (D12, D44); file the product under the material it is.',
  'GRADE-KEY-PRODUCTS': 'One Shared formulation key on active grades with different product names. A sheet that prints several products gives each its own key (SourceID#product), or the model reads two products as one.',
  'MEAS-CROSS-SOURCE-TWIN': 'Two sources publish almost the same numbers under the same conditions: one document registered twice, usually a retailer\'s copy of a manufacturer sheet. Keep the manufacturer\'s, retire the copy\'s rows as a duplicate record naming the twin and give its source the corroboration role, or accept with the reason the two really are separate tests.',
  'SOURCE-SHA-DUPLICATE': 'Two source records hold the same document: one SHA-256 under two SourceIDs. A copy on another host is the same document, not a second source.',
  'SOURCE-UNCITED': 'A source whose Citation role is "cited" but no record cites it; cite it, or give it the role it has.',
  'SOURCE-ROLE-CITED': 'A source recorded as not retrieved is cited by a record; nothing may be entered from a source that was not read.',
  'SOURCE-LOCAL-PATH': 'A source whose location is a path on one computer, not a URL anyone can open.',
  'SOURCE-TITLE-NOT-TITLE': 'A source Title that is not the document\'s own title: a shop page\'s chrome (payment or store words), a file name ("B pla basic", an underscore, .xlsx or .pdf), "untitled", or page furniture (a credit line such as "supported by", a lone mark such as "TM" or "1", the first word of a two-line heading such as "TECHNICAL", a "Page: 1" or "Version: 3.0" label); write the title the publisher printed on the sheet or page, or Not published where it prints none.',
  'COVERAGE-DUPLICATE': 'Two coverage rows for one material and domain with the same status and finding.',
  'COVERAGE-SUPERSEDED': 'Several coverage rows for one material and domain with the same open status; an older finding may have been overtaken by a newer one. Resolved rows are closed events and may stand side by side.',
  'HEADLINE-FAMILY-UNLISTED': 'A headline limited to named families leaves out a family with candidate materials that nobody named: a new rigid family would have no heat deflection at all, and no warning. Name the family in Applies to, or accept with why the headline means nothing for it (an elastomer, D56).',
};

/**
 * The first sentence of a window's basis. Split on the full stop alone it cut "to reach 0.45 MPa deflection"
 * after the zero, and two accepted findings still quote the half sentence that produced. A sentence ends with a
 * full stop and a space; a decimal point has a digit behind it.
 */
export const basisHead = (basis) => String(basis ?? '').split(/\.\s/)[0];

/**
 * A product's name as GRADE-PRODUCT-DUPLICATE compares it: without its maker's words ("Polymaker PolyLite ABS" is
 * PolyLite ABS), a closing "by <maker>", a sheet's revision mark (V5.6, Version 2, Rev 3) or the words "TDS" and
 * "technical data sheet", so one product entered twice from two revisions of its sheet is found by name. A rating is
 * not a revision: "V0" (UL 94) and "2.0" (a product generation, SUNLU PLA+2.0) stay (completeness round, D136).
 */
export function productName(name, manufacturer) {
  let out = String(name ?? '').normalize('NFKC').replace(/\bby\s+\S+(\s+\S+)?\s*$/i, ' ');
  const words = new Set([manufacturer, ...String(manufacturer ?? '').split(/[\s/]+/)].filter((w) => w && w.length > 2));
  for (const w of words) out = out.replace(new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), ' ');
  return out
    .replace(/\b(v\d+\.\d+(\.\d+)*|(ver\.?|version|rev\.?)\s*\d+(\.\d+)*)\b/gi, ' ')
    .replace(/\b(tds|technical data sheet)\b/gi, ' ')
    .replace(/\s+/g, ' ').trim() || String(name ?? '');
}

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
// Page furniture read as the title, which is what a reader that takes a sheet's first line gets (m149): a credit line
// whose name is a logo ("supported by", "A product by"), a lone mark or number with no word in it ("TM", "®", "1",
// "S.I."), the first word of a heading set on two lines ("TECHNICAL", or letter-spaced "T E C H N I C A L"), and a
// page, version or date label ("Page: 1", "Version: 3.0", "Date of issue: ..."). A title that is only the kind of
// document ("Technical Data Sheet") is left alone: some sheets print exactly that as their heading.
const FURNITURE = (title) => /\bby$/i.test(title)
  || !/[A-Za-z]{2}/.test(title.replace(/\bTM\b|[\u2122\u00ae\u00a9]/g, ''))
  || /^t ?e ?c ?h ?n ?i ?c ?a ?l$/i.test(title)
  || /^(page|version|revision|rev\.?|date( of issue)?|issued?|updated?)\s*:/i.test(title);
export const isTitle = (title) => {
  const t = String(title).trim();
  return !(CHROME.test(t) || FILE_NAME.test(t) || /^untitled$/i.test(t) || FURNITURE(t));
};

const TEXT_TABLES = ['materials', 'grades', 'profiles', 'profile_notes', 'measurements', 'evidence', 'prices', 'sources', 'coverage', 'method', 'reference', 'reference_envelopes', 'properties', 'headline_definitions', 'polymer_environment', 'print_guide', 'print_guide_materials', 'fx_rates', 'product_claims', 'impact_test_guesses'];

/** tables: { name: { header, rows } } as plain objects (CSV values); schemas: from loadSchemas. */
/**
 * Pairs of active grades that print one table: at least five published values, at least 80 % of the smaller set
 * identical (property, value and unit). A value more than 60 grades print is a family's typical number, not a table.
 * Returns "a | b" (sorted) to { shared, smaller }.
 */
export function valueTwins(active, gradeRows) {
  const status = new Map(gradeRows.map((g) => [g.GradeID, g.Status]));
  const values = new Map();
  for (const r of active) { if (!values.has(r.GradeID)) values.set(r.GradeID, new Set()); values.get(r.GradeID).add(`${r.Property}=${Number(r['Normalized value'])} ${r['Normalized unit']}`); }
  const valueGrades = new Map();
  for (const [g, vs] of values) { if (vs.size < 5 || status.get(g) !== 'active') continue; for (const v of vs) { if (!valueGrades.has(v)) valueGrades.set(v, []); valueGrades.get(v).push(g); } }
  const pairShared = new Map();
  for (const gs of valueGrades.values()) { if (gs.length < 2 || gs.length > 60) continue; for (let i = 0; i < gs.length; i++) for (let j = i + 1; j < gs.length; j++) { const k = [gs[i], gs[j]].sort().join(' | '); pairShared.set(k, (pairShared.get(k) ?? 0) + 1); } }
  const out = new Map();
  for (const [k, shared] of pairShared) {
    const [a, b] = k.split(' | '); const smaller = Math.min(values.get(a).size, values.get(b).size);
    if (shared >= 5 && shared >= 0.8 * smaller) out.set(k, { shared, smaller });
  }
  return out;
}

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
  // A thermal or physical property carries no build direction (the Direction vocabulary's Not applicable: density,
  // thermal transitions), and nothing reads one: heat deflection's headline has none. Where such a row says so, the
  // locator's "XY" is how the bar was printed, not a test axis; a mechanical row, or one whose property is unknown, is
  // still held to its locator.
  const domainOf = new Map((tables.properties?.rows ?? []).map((p) => [p.Property, p.Domain]));
  const directionless = (r) => r.Direction === 'Not applicable' && ['thermal', 'physical'].includes(domainOf.get(r.Property));
  for (const r of tables.measurements?.rows ?? []) {
    if (r['Data status'] === 'Retired duplicate record' || directionless(r)) continue;
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
  const twinPairs = valueTwins(active, tables.grades?.rows ?? []);
  for (const rows of groups.values()) {
    const of = (property, pred = () => true) => rows.filter((r) => r.Property === property && pred(r));
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
  // A plus is a word of the name: Raise3D's "Industrial PA12 CF+" is another product than its "Industrial PA12 CF" (m364).
  const productKey = (s) => String(s ?? '').normalize('NFKC').toLowerCase().replace(/\+/g, 'plus').replace(/[^a-z0-9]/g, '');
  const byProduct = new Map();
  for (const g of activeGrades) {
    const k = `${productKey(g.Manufacturer)}\u0000${productKey(productName(g['Product name'], g.Manufacturer))}`;
    if (byProduct.has(k)) add('GRADE-PRODUCT-DUPLICATE', 'grades', g.GradeID, 'Product name', `${g.Manufacturer} ${g['Product name']} is already ${byProduct.get(k)}`);
    else byProduct.set(k, g.GradeID);
  }
  // Which grades carry a measurement of their own. Where the lint is run without the measurements table at all
  // — a caller checking grades alone — nothing is known about that, and every grade counts, which is what the
  // rule did before it could ask.
  const measurementRows = tables.measurements?.rows ?? [];
  // A row retired as a duplicate record is the copy of a value another row holds: it is not a value of its grade's own.
  const measured = new Set(measurementRows.filter((m) => m['Data status'] !== 'Retired duplicate record').map((m) => m.GradeID).filter(Boolean));
  const knowsValues = measurementRows.length > 0;
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
    // A grade that carries no measurement of its own is not a second product competing for the key: it is R053's
    // twin, a product whose sheet prints another sheet's numbers, recorded as "a grade each, citing its own
    // sheet, with the values recorded once". Sharing the key is what says the two are one formulation, and it
    // is the whole point of the ruling. What the rule guards is the other shape — two grades that each carry
    // values under one key, where the model would read two products' measurements as one product's.
    const withValues = knowsValues ? gs.filter((g) => measured.has(g.GradeID)) : gs;
    const products = [...new Set(withValues.map((g) => productKey(g['Product name'])))];
    // Products whose sheets print one table (GRADE-VALUES-TWIN, linked pair by pair) are one formulation, as the key
    // says (R053).
    const reached = new Set(withValues.slice(0, 1).map((g) => g.GradeID));
    for (let grew = true; grew;) {
      grew = false;
      for (const g of withValues) if (!reached.has(g.GradeID) && [...reached].some((x) => twinPairs.has([x, g.GradeID].sort().join(' | ')))) { reached.add(g.GradeID); grew = true; }
    }
    const oneTable = reached.size === withValues.length;
    if (materials.length === 1 && products.length > 1 && !oneTable) add('GRADE-KEY-PRODUCTS', 'grades', withValues.map((g) => g.GradeID).join(' | '), 'Shared formulation key', `${k} is on ${withValues.map((g) => g['Product name']).join(', ')}`);
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
    // What the filler does to this property, which is not always what the material's Modifier says. A grade may
    // declare a load its material does not carry: a bronze-filled PLA is a grade of PLA whose Variant says so
    // (D57, R078), and judged by its material alone it was an unfilled PLA at 3.9 g/cm³ and a flexural modulus
    // of 9 GPa — every one of them a permanent accepted finding. The grade's own declaration comes first, and
    // only where it declares nothing does the material's modifier answer (D80).
    const grades = new Map((tables.grades?.rows ?? []).map((g) => [g.GradeID, g]));
    const fillOf = (m, grade) => {
      const variant = grade?.Variant;
      // A dense powder load, declared by the maker or read from a density the polymer cannot reach (D80, R095).
      if (/dense filler$/.test(variant ?? '')) return 'dense';
      if (variant === 'lightweight additive') return 'light';
      if (m?.['Modifier / filler'] === 'Foaming') return 'light';
      if (['Carbon fibre', 'Glass fibre'].includes(m?.['Modifier / filler'])) return 'fibre';
      return m?.['Modifier / filler'] === 'Unfilled / unspecified' ? 'unfilled' : 'any';
    };
    const fits = (window, want, field) => window[field] === want[field] || window[field] === 'any';
    for (const r of measurements) {
      // A value the database already flags physically implausible has been dealt with, with its reason recorded.
      if (!/^Published value( \(transcription corrected\))?$/.test(r['Data status'] ?? '')) continue;
      const value = Number(r['Normalized value']);
      if (!Number.isFinite(value)) continue;
      const material = materials.get(r.MaterialID);
      const want = {
        'Matrix class': classOf(material), 'Fill class': fillOf(material, grades.get(r.GradeID)),
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
      const named = { any: 'compound', dense: 'densely filled', light: 'foamed or lightened' };
      const where = `${r.Property} ${value} ${r['Normalized unit']} on a ${want['Matrix class']} ${named[want['Fill class']] ?? want['Fill class']} material`;
      if (window['Always flag'] === 'TRUE') { add('MEAS-PHYSICS-WINDOW', 'measurements', r.MeasurementID, 'Normalized value', `${where}: ${basisHead(window.Basis)}`); continue; }
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

  // Relations physics fixes between two values of one grade, source and state (data/tables/physical_relations.csv, read
  // through build/src/physical-relations.js). These catch what a window cannot: a value that landed under the wrong
  // property. A sheet prints its glass transition, heat deflection, Vicat and melting point as four numbers in one unit
  // and one range, so a swapped pair is individually ordinary. Each relation says which keys the two values must
  // share, its margin (two different tests cross by a little where the polymer puts them close: a PLA's Vicat at 10 N
  // and its glass transition sit within a couple of degrees, and which comes first is scatter), and the materials it
  // holds for.
  const elastomerIdentities = new Set((tables.polymers?.rows ?? []).filter((p) => p.Morphology === 'elastomer').map((p) => p.PolymerID));
  const elastomers = new Set((tables.materials?.rows ?? []).filter((m) => elastomerIdentities.has(m['Estimate identity'])).map((m) => m.MaterialID));
  // Physics orders two values of one specimen. A film or a filament strand is not the bar the sheet's other rows
  // were measured on — FormFutura prints Ingeo's film tensile strength (110 MPa, ASTM D882) beside its own printed
  // bars' flexural strength (55) — so a pair across two specimen forms is two claims about two things, not one of
  // them on the wrong line. The window check already leaves those forms out (below) for the same reason. So is a bar
  // printed at a setting its product is not meant for (D95): colorFabb's unfoamed PET column is ordered against its own
  // column, never against the foamed bar beside it.
  const sameSpecimen = (a, b) => specimenForm(a) === specimenForm(b);
  const polymerMorphology = new Map((tables.polymers?.rows ?? []).map((p) => [p.PolymerID, p.Morphology]));
  const materialRows = (tables.materials?.rows ?? []).map((m) => ({ ...m, Morphology: polymerMorphology.get(m['Estimate identity']) ?? NOT_MODELLED }));
  const materialById = new Map(materialRows.map((m) => [m.MaterialID, m]));
  for (const relation of compileRelations(tables.physical_relations?.rows, parseAppliesTo, materialRows)) {
    for (const f of relationFindings(relation, active, (r) => materialById.get(r.MaterialID) ?? { Morphology: NOT_MODELLED }, applies)) {
      add(relation.code, 'measurements', f.record.MeasurementID, 'Normalized value', f.message);
    }
  }

  // Sources.
  const byDigest = new Map();
  const cited = new Set();
  for (const t of ['grades', 'profiles', 'measurements', 'evidence', 'prices', 'fx_rates', 'polymer_environment', 'polymers', 'print_guide']) for (const r of tables[t]?.rows ?? []) cited.add(r.SourceID);
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
      // A Resolved row is closed: it records one thing that was fixed (a unit corrected, a grade retired), so several
      // in one domain are a log of separate events, and a closed finding has nothing left to go stale.
      if (distinct.length > 1 && !MISSING.test(status) && status !== 'Resolved') add('COVERAGE-SUPERSEDED', 'coverage', distinct.map((r) => r.CoverageID).join(' | '), '', `${k}: ${distinct.length} "${status}" findings`);
    }
  }

  // A headline limited to named families (heat deflection names the rigid ones, D87). A family is left out on purpose,
  // with the reason accepted, or by oversight, when it arrived after the list was written.
  const candidates = (tables.materials?.rows ?? []).filter((m) => m.Scope === 'H2C-relevant');
  for (const h of tables.headline_definitions?.rows ?? []) {
    const clause = String(h['Applies to'] ?? '').split(';').map((x) => x.trim()).find((x) => /^Family\s*:/.test(x));
    if (!clause) continue;
    const named = new Set(clause.replace(/^Family\s*:/, '').split('|').map((x) => x.trim()));
    for (const family of [...new Set(candidates.map((m) => m.Family))].filter((f) => !named.has(f)).sort()) {
      add('HEADLINE-FAMILY-UNLISTED', 'headline_definitions', `${h.HeadlineKey} | ${family}`, 'Applies to', `${family} has candidate materials and is not named`);
    }
  }
  // ---- the data audit of 2026-10-01 (PM-TRIAL-2026-10-01/data-audit, RC5, RC6, RC7, RC9)
  // A notch only concentrates stress: notched impact above unnotched, on one specimen form, direction and state, is a
  // swapped label, a unit or a sheet error. Extrudr's DURAPRO ASA CF prints notched Izod 100 beside unnotched 20 kJ/m².
  // A flexural strength is the outer-fibre stress at break or at the conventional deflection; above 8 % of the
  // flexural modulus a rigid bar would have strained past where the test stops (MatterHackers' PLA: 73 MPa beside 350).
  for (const rows of groups.values()) {
    const of = (property, pred = () => true) => rows.filter((r) => r.Property === property && pred(r));
    for (const property of ['Izod impact strength', 'Charpy strength']) {
      for (const n of of(property, (r) => r.Notch === 'Notched')) {
        for (const u of of(property, (r) => r.Notch === 'Unnotched' && r['Normalized unit'] === n['Normalized unit'] && r.Direction === n.Direction && r['Test temperature °C'] === n['Test temperature °C'] && sameSpecimen(n, r))) {
          if (num(n) > num(u) * 1.05) add('MEAS-PHYSICS-NOTCH', 'measurements', n.MeasurementID, 'Normalized value', `${property} notched ${num(n)} > unnotched ${num(u)} ${u['Normalized unit']} (${u.MeasurementID})`);
        }
      }
    }
    for (const m of of('Flexural modulus', (r) => !elastomers.has(r.MaterialID))) {
      for (const f of of('Flexural strength', (r) => r.Direction === m.Direction && sameSpecimen(m, r))) {
        if (num(f) / (num(m) * 1000) > 0.08) add('MEAS-PHYSICS-FLEX-STRAIN', 'measurements', m.MeasurementID, 'Normalized value', `flexural strength ${num(f)} MPa is ${((100 * num(f)) / (num(m) * 1000)).toFixed(0)} % of flexural modulus ${num(m)} GPa (${f.MeasurementID})`);
      }
    }
  }
  // The unit a standard reports. The raw unit is the sheet's own; "kj/m²" beside ASTM D256 is the Extrudr template.
  for (const r of active.filter((x) => /Izod|Charpy|Impact/i.test(x.Property))) {
    const std = String(r['Standard / load'] ?? '') + ' ' + String(r.Standards ?? ''); const unit = String(r['Raw unit'] ?? r['Normalized unit'] ?? '');
    const astm = /D\s?256/i.test(std), iso = /ISO\s?1(79|80)/i.test(std);
    if ((astm && !iso && /kJ/i.test(unit)) || (iso && !astm && /J\/m(?![²2])/i.test(unit) && !/kJ/i.test(unit))) add('IMPACT-UNIT-STANDARD', 'measurements', r.MeasurementID, 'Raw unit', `${unit} beside ${std.trim().slice(0, 60)}`);
  }
  // One table under two products. The cross-source twin check above keys on the conditions too, so two copies of one
  // sheet recorded with different direction or state words escape it; this one keys on the values alone, per grade.
  const gradeRow = new Map((tables.grades?.rows ?? []).map((g) => [g.GradeID, g]));
  for (const [k, { shared, smaller }] of twinPairs) {
    const [a, b] = k.split(' | ');
    const ka = gradeRow.get(a)?.['Shared formulation key'], kb = gradeRow.get(b)?.['Shared formulation key'];
    if (!(ka && ka === kb)) add('GRADE-VALUES-TWIN', 'grades', k, 'Shared formulation key', `${shared} of ${smaller} values identical (${gradeRow.get(a)?.Manufacturer} ${gradeRow.get(a)?.['Product name']} / ${gradeRow.get(b)?.Manufacturer} ${gradeRow.get(b)?.['Product name']})`);
  }
  // A filler or polymer in the product's name that its material does not have.
  const FILLER_WORDS = [[/\b(cf|carbon)\b/i, /carbon|\bcf\b/], [/\b(gf|glass)\b/i, /glass|\bgf\b/], [/\besd\b|antistatic|conductive/i, /esd|static|conduct/], [/\b(steel|copper|bronze|brass|iron|tungsten|metal)\b/i, /metal|steel|copper|bronze|iron|sinter/], [/\b(wood|bamboo|cork)\b/i, /wood|natural/], [/\bpetg\b/i, /petg|copolyester|\bpet\b/], [/\bpla\b/i, /pla/]];
  const materialRow = new Map((tables.materials?.rows ?? []).map((m) => [m.MaterialID, m]));
  for (const g of (tables.grades?.rows ?? []).filter((x) => x.Status === 'active' && (!x.Variant || x.Variant === 'Not applicable'))) {
    const m = materialRow.get(g.MaterialID); if (!m) continue;
    const mat = `${m['Original name']} ${m.Family} ${m['Modifier / filler']} ${m['Base polymer']} ${m['Variant class']}`.toLowerCase();
    for (const [word, owns] of FILLER_WORDS) if (word.test(g['Product name'] ?? '') && !owns.test(mat)) add('FILING-FILLER-WORD', 'grades', g.GradeID, 'MaterialID', `"${g['Product name']}" names ${String(g['Product name']).match(word)[0]}; filed under ${m['Original name']} (${m['Modifier / filler']})`);
  }
  // A row that states the opposite of what its page states once (D116). Rows that state nothing inherit in compile.js.
  const pageIndex = indexPageContext(tables.page_context?.rows ?? []);
  if (pageIndex.size) {
    for (const r of active) {
      for (const c of contextFor(pageIndex, r)) {
        const own = rowStates(r), page = pageStates(c);
        for (const [field, label] of [['specimen', 'Specimen type'], ['moisture', 'Moisture state'], ['treatment', 'Post-processing state'], ['direction', 'Direction']]) {
          if (field === 'specimen' && !specimenApplies(r.Property)) continue;
          if (field === 'direction' && !directionApplies(r.Property)) continue;
          if (own[field] && page[field] && own[field] !== page[field]) add('CONTEXT-ROW-CONTRADICTS-PAGE', 'measurements', r.MeasurementID, label, `the row says ${own[field]}; p. ${c.Page} of ${c.SourceID} says ${page[field]} (${c.PageContextID}: "${String(c.Statement).slice(0, 80)}")`);
        }
      }
    }
  }
  // Two profiles of one product from one sheet (D120). A sheet that prints a row per print speed or nozzle size gives a
  // profile per row, and its Locator names the row; any other pair is one setup read twice.
  const ROW = /\b(standard|high)[- ]speed\b|\(high speed\)|\bclassic\b|zonal temperature|\bnozzle\s+(diameter\s+)?\d\.\d|\bnozzle \d\.\dmm row\b|\bfoamed column\b|\d+-\s*\d+mm\/s/i;
  const SHEET_WIDE = ['Chamber °C', 'Enclosure', 'Drying', 'Abrasion / clogging'];
  const stated = (v) => v != null && v !== '' && !/^Not (published|applicable)/.test(v);
  const byProductSheet = new Map();
  for (const r of tables.profiles?.rows ?? []) {
    if (r.Profile === 'Retired duplicate record' || /not printing guidance/.test(r.Locator ?? '')) continue;
    const k = `${r.GradeID}\u0000${r.SourceID}`;
    if (!byProductSheet.has(k)) byProductSheet.set(k, []);
    byProductSheet.get(k).push(r);
  }
  for (const ps of byProductSheet.values()) {
    if (ps.length < 2) continue;
    if (!ps.some((p) => ROW.test(p.Locator))) {
      for (const p of ps.slice(1)) add('PROFILE-DUPLICATE', 'profiles', p.ProfileID, '', `${ps.length} profiles of ${p.GradeID} from ${p.SourceID} (${ps.map((x) => x.ProfileID).join(', ')}) name no row of the sheet between them`);
      continue;
    }
    for (const col of SHEET_WIDE) {
      const holder = ps.find((p) => stated(p[col])); if (!holder) continue;
      for (const p of ps) if (!stated(p[col])) add('PROFILE-SIBLING-SILENT', 'profiles', p.ProfileID, col, `${holder.ProfileID}, another row of the same sheet, holds "${String(holder[col]).slice(0, 60)}"`);
    }
  }
  return findings;
}

export const findingKey = (f) => `${f.code}\u0000${f.table}\u0000${f.record}\u0000${f.field}`;
