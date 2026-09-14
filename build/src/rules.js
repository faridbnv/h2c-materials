// The rule catalogue: every check the build, the schema gate, the lint and the contract can raise, by a
// stable code. An issue is { level, code, where, message }. The code is what tests assert, what accepted
// findings are keyed by, and what docs/RULES.md (generated from this file) explains with its fix.
//
// Codes never change meaning. A retired check keeps its code out of use rather than lending it to another.

import { LINT_RULES } from './lint-rules.js';

const r = (level, area, meaning, fix) => ({ level, area, meaning, fix });

export const RULES = {
  // ---- schema gate (build/src/schema.js) ---------------------------------------------------------------
  'SCHEMA-TABLE': r('error', 'schema', 'A table and its schema do not both exist.', 'Add the missing CSV or schema/tables/<table>.schema.json, in the same commit.'),
  'SCHEMA-COLUMN': r('error', 'schema', 'A column is undeclared, missing, or out of schema order.', 'Declare the column in the schema, add it to the file, or reorder the file (npm run data:fmt keeps order).'),
  'SCHEMA-DECLARATION': r('error', 'schema', 'A schema names a missing-state word or vocabulary that does not exist.', 'Add the word to schema/vocab/missing-states.csv, or the vocabulary file.'),
  'SCHEMA-REQUIRED': r('error', 'schema', 'A required cell is empty.', 'Write the value, or the explicit missing state the column accepts (never 0 for unknown).'),
  'SCHEMA-UNIQUE': r('error', 'schema', 'A value or combination that must be unique repeats.', 'Use a new ID (npm run data:new-id), or retire the duplicate.'),
  'SCHEMA-TYPE': r('error', 'schema', 'A value is not of its declared type (number, whole number, date, boolean).', 'Write the value in the declared type, or an accepted missing state.'),
  'SCHEMA-RANGE': r('error', 'schema', 'A number is outside its declared minimum or maximum.', 'Check the source; correct the value or its unit.'),
  'SCHEMA-PATTERN': r('error', 'schema', 'A value does not match its declared pattern.', 'Write it in the declared form (IDs: see the schema pattern).'),
  'SCHEMA-VOCABULARY': r('error', 'schema', 'A value is not in its controlled vocabulary or enum.', 'Use an existing value, or add a new one to schema/vocab/ deliberately.'),
  'SCHEMA-REFERENCE': r('error', 'schema', 'A reference (including a list item or an ID in prose) points at nothing.', 'Correct the identifier, or add the record it refers to.'),
  'SCHEMA-LIST': r('error', 'schema', 'A list cell is empty or repeats an item.', 'List each item once.'),
  'SCHEMA-FORMAT': r('error', 'schema', 'A file is not in canonical CSV form.', 'npm run data:fmt'),
  'SCHEMA-MANIFEST': r('error', 'schema', 'data/manifest.json does not match the tables.', 'npm run data:fmt, and commit the manifest with the data.'),

  // ---- compile (build/src/compile.js, typed-values.js) ---------------------------------------------------
  'DATA-STATUS-UNKNOWN': r('error', 'compile', 'A measurement has a Data status the build does not know.', 'Use a status from schema/vocab/data-status.csv.'),
  'PARSE-UNREAD': r('warn', 'compile', 'Raw process text the parser could not read.', 'Check the typed columns hold the right reading; extend the parser if the wording is common.'),
  'PARSE-MISMATCH': r('error', 'compile', 'A typed value differs from the parser reading of its raw text, with no Parse review.', 'Correct the typed value, or explain the reviewed value in Parse review.'),
  'HEADLINE-KEY-UNKNOWN': r('error', 'compile', 'headlines.csv selects for a key that is not a measurement headline.', 'Use a key from headline_definitions.csv.'),
  'HEADLINE-SELECTION-MULTIPLE': r('error', 'compile', 'A headline selects more than one value measurement.', 'Keep one value row; mark the others Use context.'),
  'HEADLINE-NOT-APPLICABLE': r('error', 'compile', 'A headline selects a value for a material outside its Applies to.', 'Remove the selection, or widen Applies to.'),
  'HEADLINE-SELECTION-INVALID': r('error', 'compile', 'A selected measurement cannot be the headline (inactive, non-numeric, another material or grade, wrong property, unit or direction).', 'Select a measurement that fits the headline definition, or fix the measurement.'),
  'FAMILY-ENTRY-MAPPING': r('error', 'compile', 'Family entries in materials.csv and their member mapping disagree.', 'Make the family entry and its members agree.'),
  'FAMILY-ENTRY-OWNS': r('error', 'compile', 'A family entry owns an active grade.', 'File the product under the material it is (D44).'),
  'GRADE-ROLE-ID': r('error', 'compile', 'A grade Role disagrees with its -R# ID suffix.', 'Study and reference grades, and only they, end in -R#.'),
  'PRICE-INCOMPLETE': r('error', 'compile', 'A price eligible for a median has no list price or net mass.', 'Record both, or set Eligible for median FALSE.'),
  'CHAMBER-BAND': r('error', 'compile', 'A chamber estimate band is malformed or names a material wrongly.', 'Fix the band: a real range, a basis, and in-scope materials listed once.'),
  'REFERENCE-DEFAULT': r('error', 'compile', 'A default reference material is missing from reference.csv.', 'Restore the row or update the default selection.'),

  // ---- registry (build/src/registry.js) -----------------------------------------------------------------
  'REGISTRY-APPLIES-TO': r('error', 'registry', 'An Applies to rule is malformed, tests an unknown field, or names a value no material has.', 'Write "Field: value | value" over Family, Base polymer, Modifier / filler, Role, Scope or H2C status.'),
  'REGISTRY-NA-REASON': r('error', 'registry', 'Applies to is set without a Not applicable reason.', 'Say why the property does not apply elsewhere.'),
  'REGISTRY-HEADLINE': r('error', 'registry', 'A headline definition is inconsistent (value properties, evidence group, unit, price kind).', 'Correct the definition in headline_definitions.csv.'),

  // ---- measurements (build/src/measurement-rules.js) -----------------------------------------------------
  'MEAS-PUBLISHED-NON-NUMERIC': r('error', 'measurements', 'A Published value status with no numeric value.', 'Record the number, or classify the result (qualitative, not published).'),
  'MEAS-ENDPOINT-LOCATOR': r('error', 'measurements', 'An elongation-at-break row whose locator names another endpoint.', 'File it under the endpoint the source names.'),
  'MEAS-RAW-RECONCILE': r('error', 'measurements', 'Raw value, raw numeric, factor and normalized value do not agree.', 'Re-read the source; correct the raw number, the factor or the normalized value.'),
  'MEAS-HEADLINE-TYPE': r('error', 'measurements', 'A headline and its measurement disagree in property, unit or value.', 'Select a measurement that fits the headline.'),
  'MEAS-PROPERTY-UNREGISTERED': r('error', 'measurements', 'A measurement of a property not in properties.csv.', 'Register the property, or use its registered name.'),
  'MEAS-UNIT': r('error', 'measurements', 'A numeric measurement in a unit its property does not allow.', 'Convert to a canonical unit, or add the unit to the property deliberately.'),
  'MEAS-NOT-APPLICABLE': r('error', 'measurements', 'A measurement of a property that does not apply to its material.', 'File it under the right material, or widen Applies to.'),

  // ---- validation (build/src/validate.js) ---------------------------------------------------------------
  'ID-MISSING': r('error', 'integrity', 'A compiled record has no identifier.', 'Give the record its ID.'),
  'ID-DUPLICATE': r('error', 'integrity', 'Two compiled records share an identifier.', 'Retire one, or renumber a new record.'),
  'REF-UNKNOWN': r('error', 'integrity', 'A record points at a material, grade or source that does not exist.', 'Correct the identifier.'),
  'GRADE-RETIREMENT-HALF': r('error', 'integrity', 'A grade retirement is recorded on Status or Availability but not both.', 'Set Status retired and Availability "Retired mapping; audit trail only" together (npm run data:retire).'),
  'OWN-GRADE-MATERIAL': r('error', 'ownership', 'A record is filed under a material its grade does not belong to.', 'File it under the grade\'s material, or use that material\'s grade.'),
  'OWN-RETIRED-GRADE': r('error', 'ownership', 'An active record uses a retired grade.', 'Retire or quarantine the record, or move it to the active grade.'),
  'GRADES-LIST': r('error', 'ownership', 'A material\'s grade list is inconsistent with its grades.', 'Check grade Role, Status and MaterialID.'),
  'REP-GRADE-NOT-OWN': r('error', 'ownership', 'A representative grade is not one of the material\'s grades.', 'Choose one of its procurement grades.'),
  'HEADLINE-CITATION': r('error', 'ownership', 'A headline cites a missing, retired, other-material, non-representative or quarantined measurement.', 'Select the representative grade\'s own active measurement.'),
  'HEADLINE-DIRECTION': r('error', 'comparability', 'An XY headline cites a measurement of another direction.', 'Select an XY measurement; an unstated direction is not XY.'),
  'LINK-CITATION': r('error', 'ownership', 'A material link or headline evidence cites a record that does not exist, is the wrong kind, or belongs to another material.', 'Correct the RecordID or the Link kind.'),
  'GUIDANCE-MISMATCH': r('error', 'ownership', 'Printing guidance does not quote its first cited profile.', 'Cite the right profile first.'),
  'ENVIRONMENT-NOT-OWN': r('error', 'ownership', 'Environmental evidence is not exactly the material\'s own exposure records.', 'File exposure evidence under the material it tests (D38).'),
  'COVERAGE-UNTRUE': r('error', 'coverage', 'A coverage row contradicts the material\'s own records (a Gap beside data, evidence claimed without it, a wrong manufacturer count).', 'Correct the coverage status or finding.'),
  'QUARANTINE-NUMERIC': r('error', 'integrity', 'A quarantined measurement carries a number, or backs a headline.', 'Quarantined values back nothing.'),
  'EXCLUSION': r('error', 'integrity', 'Scope and H2C status disagree about exclusion, or an excluded material lacks its gate.', 'Set Scope Excluded and H2C status Excluded together.'),
  'HDT-LOAD-WRONG': r('error', 'comparability', 'An HDT headline at 0.45 MPa cites a measurement at another stated load.', 'Select a 0.45 MPa measurement.'),
  'HDT-LOAD-UNSTATED': r('warn', 'comparability', 'HDT headlines whose source names the standard but not the load.', 'Re-read the source for the load; the value stays flagged until then.'),
  'IMPACT-UNITS': r('warn', 'comparability', 'Impact data in J/m and kJ/m², which cannot share an axis.', 'Informational; no conversion without specimen geometry.'),
  'HEADLINE-BLANK': r('error', 'estimates', 'An in-scope headline has no value, no estimate and no not-applicable statement.', 'Record a value, or give the model what it needs (the message names it).'),
  'NA-INVALID': r('error', 'estimates', 'A not-applicable headline sits beside a value or estimate, or has no reason.', 'A headline is a value, an estimate, or not applicable with a reason.'),
  'EST-INVALID': r('error', 'estimates', 'An estimate is malformed: beside a value, out of scope, unknown kind, strength or precision, no basis, ranges not nested, or evidence misattributed.', 'Fix the estimate model or its inputs; estimates are never authored.'),
  'EST-CALIBRATION': r('error', 'estimates', 'An estimate model\'s likely or plausible range no longer holds hidden headlines as often as it claims.', 'Review recent data and conversions; the model must stay calibrated (D43).'),
  'EST-CALIBRATION-FEW': r('warn', 'estimates', 'Too few measured headlines to calibrate a model; it uses a default scale.', 'Informational; grows with data.'),
  'EST-SUMMARY': r('warn', 'estimates', 'How missing headlines are covered by estimates.', 'Informational.'),
  'EST-REJECTED': r('warn', 'estimates', 'Physically impossible observations kept out of the estimate model.', 'Re-read the source; correct or quarantine the measurement.'),
  'EST-OUTLIER': r('warn', 'estimates', 'Measured headlines far outside what every other observation predicts.', 'Re-read the source and check the grade is the right product.'),
  'TOPIC-UNMAPPED': r('error', 'evidence', 'An evidence topic with no category mapping.', 'Add the topic to schema/vocab/environment-topics.csv with its category.'),
  'FAMILY-ENTRIES': r('warn', 'materials', 'Canonical names that are family entries, not candidates.', 'Informational (D44).'),
  'NO-MEASUREMENTS': r('warn', 'materials', 'Materials with no property measurements at all.', 'Research a grade with published data.'),

  // ---- audit (scripts/audit-data.mjs) ---------------------------------------------------------------------
  'AUDIT-PARITY': r('error', 'audit', 'The fresh compile, dist/ files and the data embedded in the HTML are not identical, or the HTML loads something from the network.', 'Rebuild; if it persists, the bundler or the build is not deterministic.'),
  'AUDIT-REFERENCE-INTERVAL': r('error', 'audit', 'A reference envelope has a non-numeric or inverted interval.', 'Correct reference.csv.'),
  'AUDIT-SOURCE-SCOPE': r('error', 'audit', 'A record uses a grade its source does not list under Applicable grades.', 'Add the grade to the source scope, or cite the right source.'),

  // ---- runtime contract (build/src/contract.js) ---------------------------------------------------------
  'CONTRACT': r('error', 'contract', 'dist/db.json or dist/reference.json does not match its JSON Schema.', 'Update the compiler or, for a deliberate shape change, schema/db.schema.json in the same commit.'),

  // ---- lint (build/src/lint-rules.js), reported by npm run data:lint ---------------------------------------
  ...Object.fromEntries(Object.entries(LINT_RULES).map(([code, meaning]) => [code, r('lint', 'lint', meaning, 'Fix it, or accept it with a reason: npm run data:lint -- --accept CODE "reason".')])),
};

/** Build an issue; an unknown code or a level that disagrees with the catalogue is a programming error. */
export function issue(code, where, message, extra = {}) {
  const rule = RULES[code];
  if (!rule) throw new Error(`Unknown rule code ${code}`);
  return { level: rule.level, code, where, message, ...extra };
}
