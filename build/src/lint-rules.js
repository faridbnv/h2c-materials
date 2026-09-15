// Data lint: problems the schema cannot express, because they are about quality rather than structure.
// Every finding has a stable rule code and a record, so an accepted finding can be baselined
// (data/review/accepted-findings.csv) and a new one stops `npm run verify`.
//
// Findings: { code, table, record, field, message }. The baseline key is code + table + record + field.

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
  'MEAS-PHYSICS-STRAIN': 'One grade, source, direction and state publish a strain at break below stress / modulus; a thermoplastic softens before it breaks, so the modulus basis (secant, flexural) or a value is suspect.',
  'SOURCE-UNCITED': 'A source whose Citation role is "cited" but no record cites it; cite it, or give it the role it has.',
  'SOURCE-ROLE-CITED': 'A source recorded as not retrieved is cited by a record; nothing may be entered from a source that was not read.',
  'SOURCE-LOCAL-PATH': 'A source whose location is a path on one computer, not a URL anyone can open.',
  'COVERAGE-DUPLICATE': 'Two coverage rows for one material and domain with the same status and finding.',
  'COVERAGE-SUPERSEDED': 'Several coverage rows for one material and domain with the same status; an older finding may have been overtaken by a newer one.',
};

const CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/;
const FULLWIDTH_PUNCT = /[\uff01-\uff0f\uff1a-\uff20\uff3b-\uff40\uff5b-\uff5e\u3001\u3002]/;
const LIGATURE = /[\ufb00-\ufb06]/;
const INVISIBLE = /[\u0000-\u001f\u007f\u200b-\u200d\u2060\ufeff]/;
const MISSING = /^Not (published|applicable)$/;

const TEXT_TABLES = ['materials', 'grades', 'profiles', 'measurements', 'evidence', 'prices', 'sources', 'coverage', 'method', 'reference', 'properties', 'headline_definitions'];

/** tables: { name: { header, rows } } as plain objects (CSV values); schemas: from loadSchemas. */
export function lintData(tables, schemas) {
  const findings = [];
  const add = (code, table, record, field, message) => findings.push({ code, table, record, field: field ?? '', message });
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

  // Spellings of one value in short-list columns (a raw column with a handful of distinct values).
  const norm = (s) => s.normalize('NFKC').toLowerCase().replace(/[^a-z0-9%<>=+.]/g, '').replace(/\.(?=\D|$)/g, '');
  for (const t of ['materials', 'grades', 'profiles', 'measurements', 'evidence', 'prices', 'sources']) {
    const rows = tables[t]?.rows ?? [];
    for (const field of tables[t]?.header ?? []) {
      // Raw columns keep the source's own spelling by design (m07 changes no wording); their typed columns are checked.
      if (schemas[t]?.fields?.find((f) => f.name === field)?.role === 'raw') continue;
      const values = [...new Set(rows.map((r) => r[field]).filter((v) => typeof v === 'string'))];
      if (values.length < 2 || values.length > 60) continue;
      const groups = new Map();
      for (const v of values) { const k = norm(v); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(v); }
      for (const vs of groups.values()) if (vs.length > 1) add('VOCAB-NEAR-DUPLICATE', t, vs.sort().join(' ~ '), field, `${vs.length} spellings`);
    }
  }

  // Measurements.
  const measurements = (tables.measurements?.rows ?? []).filter((r) => !DATA_STATUS[r['Data status']]?.retiredDuplicate);
  const dupKey = (r) => ['GradeID', 'Property', 'Normalized value', 'Normalized unit', 'Direction', 'Standard / load', 'Notch', 'Moisture condition',
    'Post-processing', 'Specimen type', 'Specimen / print parameters', 'SourceID', 'Locator', 'Stress max MPa', 'Stress min MPa'].map((f) => r[f]).join('\u0000');
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

  // Sources.
  const cited = new Set();
  for (const t of ['grades', 'profiles', 'measurements', 'evidence', 'prices']) for (const r of tables[t]?.rows ?? []) cited.add(r.SourceID);
  for (const r of tables.profiles?.rows ?? []) for (const s of String(r['H2C SourceID'] ?? '').split(';')) cited.add(s.trim());
  for (const r of tables.materials?.rows ?? []) cited.add(r['Identity source']);
  for (const r of tables.material_links?.rows ?? []) cited.add(r.RecordID);
  for (const r of tables.sources?.rows ?? []) {
    const role = r['Citation role'] ?? 'cited';
    if (role === 'cited' && !cited.has(r.SourceID)) add('SOURCE-UNCITED', 'sources', r.SourceID, '', `${r['Source class']}; ${r['Access status']}`);
    if (role === 'not-retrieved' && cited.has(r.SourceID)) add('SOURCE-ROLE-CITED', 'sources', r.SourceID, 'Citation role', r['Access status']);
    if (r.URL && !/^https?:\/\//.test(r.URL)) add('SOURCE-LOCAL-PATH', 'sources', r.SourceID, 'URL', r.URL);
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
