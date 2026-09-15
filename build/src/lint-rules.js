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
