// The rule catalogue: every check the build, the schema gate, the lint and the contract can raise, by a
// stable code. An issue is { level, code, where, message }. The code is what tests assert, what accepted
// findings are keyed by, and what docs/RULES.md (generated from this file) explains with its fix.
//
// Codes never change meaning. A retired check keeps its code out of use rather than lending it to another.

import { LINT_RULES } from './lint-rules.js';

// `reviewed`: the finding names a record, and a reviewer fixes it or accepts it with a reason (D57).
const r = (level, area, meaning, fix, { reviewed = false } = {}) => ({ level, area, meaning, fix, reviewed });

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
  'PARSE-REVIEW-SCOPE': r('error', 'compile', 'A Parse review does not name the typed columns it explains, or names a column its row does not have (D115).', 'Open the review with "Fields: <columns>." naming only the typed columns it explains, or "Fields: none."'),
  'PARSE-REVIEW-STALE': r('error', 'compile', 'A print profile\'s or a measurement\'s Parse review names a typed column that now agrees with the parser: the review explains a difference that is gone, and would silence the next one (D115).', 'Take the column out of the review\'s Fields, or write "Fields: none." with what the review still records.'),
  'PARSE-TEXT-BOUNDS': r('error', 'compile', 'A typed temperature endpoint is not a number its own raw cell states; a Parse review cannot excuse it (D115).', 'Type the endpoint the cell states, or Not published.'),
  'OPEN-BOUND-WINDOW': r('error', 'compile', 'An open-bound process temperature ("> 80 °C", "up to 60 °C") is typed as a single point.', 'Leave the unstated end Not published.'),
  'HEADLINE-KEY-UNKNOWN': r('error', 'compile', 'headlines.csv pins a value for a key that is not a measurement headline.', 'Use a key from headline_definitions.csv.'),
  'HEADLINE-SELECTION-MULTIPLE': r('error', 'compile', 'One product has two pinned values for one headline in headlines.csv.', 'Keep one pin: a product has one value per headline.'),
  'HEADLINE-NOT-APPLICABLE': r('error', 'compile', 'headlines.csv pins a value for a material outside the headline\'s Applies to.', 'Remove the pin, or widen Applies to.'),
  'HEADLINE-SELECTION-INVALID': r('error', 'compile', 'A pinned measurement cannot be its product\'s value (inactive, another material, not on an active product, wrong property or unit, another direction or load, a physically implausible value, a moulded, film or filament specimen, conditioned, annealed where the product publishes it as printed).', 'Pin a measurement that can be the value, or remove the pin and let the rule choose (build/src/products.js).'),
  'FAMILY-ENTRY-MAPPING': r('error', 'compile', 'Family entries in materials.csv and their member mapping disagree.', 'Make the family entry and its members agree.'),
  'FAMILY-ENTRY-OWNS': r('error', 'compile', 'A family entry owns an active grade.', 'File the product under the material it is (D44).'),
  'GRADE-ROLE-ID': r('error', 'compile', 'A grade Role disagrees with its -R# ID suffix.', 'Study and reference grades, and only they, end in -R#.'),
  'PRICE-INCOMPLETE': r('error', 'compile', 'A price eligible for a median has no list price or net mass.', 'Record both, or set Eligible for median FALSE.'),
  'PRICE-TAX-UNSTATED': r('error', 'compile', 'A price eligible for a median includes VAT at a rate its page does not state.', 'Record the rate the page states in VAT included %, or set Eligible for median FALSE (D113).'),
  'PRICE-FX-MISSING': r('error', 'compile', 'A foreign price eligible for a median is in a currency with no rate in fx_rates.csv.', 'Record the Bank of Canada rate for the currency from a fetched, hashed document (D113).'),
  'PRICE-MARKET-CURRENCY': r('error', 'compile', 'A listing on a Canadian market is in a currency other than CAD.', 'A Canadian listing is in CAD: correct the Currency or the Market (D113).'),
  'FATIGUE-LOADING': r('error', 'compile', 'A Fatigue life measurement has no loading row in fatigue_tests.csv.', 'Add its row to data/tables/fatigue_tests.csv (stresses, frequency, load ratio, run-out).'),
  'CHAMBER-BAND': r('error', 'compile', 'A chamber estimate band is malformed or names a material wrongly.', 'Fix the band: a real range, a basis, and in-scope materials listed once.'),
  'REFERENCE-DEFAULT': r('error', 'compile', 'A default reference material is missing from reference.csv.', 'Restore the row or update the default selection.'),
  'POLYMER-ENV-REFERENCE': r('error', 'compile', 'A polymer_environment row names a polymer not in polymers.csv, a source not in sources.csv, or a source that was not retrieved.', 'Name a polymers.csv identity and a retrieved source; nothing is entered from a source that was not read (D64).'),
  'POLYMER-ENV-CATEGORY': r('error', 'compile', 'A polymer_environment row uses a category that is not filterable, or is fatigue or creep.', 'Use a filterable environment category; a resin reference cannot speak for a printed part under load (D64).'),
  'POLYMER-ENV-VERDICT': r('error', 'compile', 'A polymer_environment row has a verdict outside schema/vocab/polymer-verdicts.csv.', 'Use a verdict from the vocabulary, or add one there with its Meaning and whether it Screens.'),
  'POLYMER-ENV-DUPLICATE': r('error', 'compile', 'Two polymer_environment rows name the same polymer, category and agent.', 'Keep one row per polymer, category and agent; put a second condition in Conditions or Notes.'),
  'PRINT-GUIDE-REFERENCE': r('error', 'compile', 'A print_guide row cites a source that is not in sources.csv, was not retrieved, or is not cited.', 'Register the guide, fetched and hash-checked, with Citation role cited; nothing enters from a guide that was not read (D88).'),
  'PRINT-GUIDE-MATERIAL': r('error', 'compile', 'A print_guide_materials row names a guide row or a material that does not exist, or a family entry, which owns no product.', 'Map a guide type to the one material it is (D88).'),
  'PROCESS-ENCLOSED': r('error', 'compile', 'A nozzle, bed or chamber state is "enclosed" where it may not be: on a nozzle or bed; on a row that does not ask for an enclosure; on a print profile whose chamber row prints a temperature or other words, whose material\'s printer maker\'s guide does not ask an enclosure for its type, or whose product has another profile that states its chamber.', 'A chamber is "enclosed" where its row asks for an enclosure and states no temperature: a printer maker\'s guide row on its own enclosed printers (D90), or a maker\'s own profile for a type that guide asks an enclosure for (D93). Where the sheet states a chamber, record what it states; that decides.'),
  'POLYMER-ENV-PRECEDENCE': r('error', 'integrity', 'A polymer-level record is attached where the material has a grade-level record in the category, cites a row that does not exist, or names another material or polymer.', 'The build attaches these; report the compiler defect (D64).'),

  // ---- registry (build/src/registry.js) -----------------------------------------------------------------
  'REGISTRY-APPLIES-TO': r('error', 'registry', 'An Applies to rule is malformed, tests an unknown field, or names a value no material has.', 'Write "Field: value | value" over Family, Base polymer, Modifier / filler, Role, Scope or H2C status.'),
  'REGISTRY-NA-REASON': r('error', 'registry', 'Applies to is set without a Not applicable reason.', 'Say why the property does not apply elsewhere.'),
  'REGISTRY-CODE-REFERENCE': r('error', 'registry', 'Code relies on a property name that is not in properties.csv.', 'Rename the property in build/src/property-references.js and the code that uses it, or restore the property.'),
  'REGISTRY-REPLACED': r('error', 'registry', 'A property replaced by another is still used by a measurement or a headline, or its replacement is missing or itself replaced.', 'Move the rows to the replacement with a migration; keep the replaced record.'),
  'REGISTRY-HEADLINE': r('error', 'registry', 'A headline definition is inconsistent (value properties, evidence group, unit, price kind).', 'Correct the definition in headline_definitions.csv.'),

  // ---- measurements (build/src/measurement-rules.js) -----------------------------------------------------
  'MEAS-PUBLISHED-NON-NUMERIC': r('error', 'measurements', 'A Published value status with no numeric value.', 'Record the number, or classify the result (qualitative, not published).'),
  'MEAS-ENDPOINT-LOCATOR': r('error', 'measurements', 'An elongation-at-break row whose locator names another endpoint: maximum force, yield, strength or ultimate strength.', 'File it under the endpoint the source names.'),
  'MEAS-RAW-RECONCILE': r('error', 'measurements', 'Raw value, raw numeric, factor and normalized value do not agree.', 'Re-read the source; correct the raw number, the factor or the normalized value.'),
  'MEAS-UNIT-UNKNOWN': r('error', 'measurements', 'A raw unit and a normalized unit the raw-value reconciliation has no conversion between, so the value is not independently checked.', 'Add the conversion to CONVERSIONS in build/src/measurement-rules.js, or write the raw unit as the source prints it and the normalized unit it converts to.'),
  'MEAS-HEADLINE-TYPE': r('error', 'measurements', 'A product value and its measurement disagree in property, unit or value.', 'A defect in build/src/products.js: a product value is read from its measurement, never typed.'),
  'MEAS-PROPERTY-UNREGISTERED': r('error', 'measurements', 'A measurement of a property not in properties.csv.', 'Register the property, or use its registered name.'),
  'MEAS-UNIT': r('error', 'measurements', 'A numeric measurement in a unit its property does not allow.', 'Convert to a canonical unit, or add the unit to the property deliberately.'),
  'MEAS-NOT-APPLICABLE': r('error', 'measurements', 'A measurement of a property that does not apply to its material.', 'File it under the right material, or widen Applies to.'),

  // ---- validation (build/src/validate.js) ---------------------------------------------------------------
  'ID-MISSING': r('error', 'integrity', 'A compiled record has no identifier.', 'Give the record its ID.'),
  'ID-DUPLICATE': r('error', 'integrity', 'Two compiled records share an identifier.', 'Retire one, or renumber a new record.'),
  'REF-UNKNOWN': r('error', 'integrity', 'A record points at a material, grade or source that does not exist.', 'Correct the identifier.'),
  'GRADE-RETIREMENT-HALF': r('error', 'integrity', 'Retired 2026-09-25 (m147): a grade retirement was recorded twice, as Status and as an Availability phrase, and this kept the two in step. Status is the one place now, and Availability says what was recorded about the product.', 'Nothing to do; the code stays out of use. npm run data:retire sets Status.'),
  'OWN-GRADE-MATERIAL': r('error', 'ownership', 'A record is filed under a material its grade does not belong to.', 'File it under the grade\'s material, or use that material\'s grade.'),
  'OWN-RETIRED-GRADE': r('error', 'ownership', 'An active record uses a retired grade.', 'Retire or quarantine the record, or move it to the active grade.'),
  'GRADES-LIST': r('error', 'ownership', 'A material\'s grade list is inconsistent with its grades.', 'Check grade Role, Status and MaterialID.'),
  'HEADLINE-CITATION': r('error', 'ownership', 'A product value cites a missing, quarantined or another product\'s measurement (other than a twin\'s: an active product of the same material under the same formulation key, D89), or a material names a typical product that is not its own.', 'A defect in build/src/products.js: a product value is chosen from that product\'s own active measurements, or read from its twin\'s where it publishes none.'),
  'HEADLINE-DIRECTION': r('error', 'comparability', 'A product value decides as comparable but its measurement states another direction than its headline\'s, or a headline that excludes an unstated direction (the layer strength) carries a value published without one.', 'A defect in build/src/products.js (assess): an unstated direction is as published where the headline says so, never comparable, and never a Z value (D92).'),
  'LINK-CITATION': r('error', 'ownership', 'A material link or headline evidence cites a record that does not exist, is the wrong kind, or belongs to another material.', 'Correct the RecordID or the Link kind.'),
  'GUIDANCE-MISMATCH': r('error', 'ownership', 'Printing guidance does not quote its first cited profile.', 'Cite the right profile first.'),
  'ENVIRONMENT-NOT-OWN': r('error', 'ownership', 'Environmental evidence is not exactly the material\'s own exposure records.', 'File exposure evidence under the material it tests (D38).'),
  'COVERAGE-UNTRUE': r('error', 'coverage', 'A coverage row contradicts the material\'s own records (a Gap beside data, evidence claimed without it, a wrong manufacturer count).', 'Correct the coverage status or finding.'),
  'QUARANTINE-NUMERIC': r('error', 'integrity', 'A quarantined measurement carries a number, or backs a headline.', 'Quarantined values back nothing.'),
  'EXCLUSION': r('error', 'integrity', 'An excluded material (Scope Excluded, the one place exclusion is recorded) does not carry the excluded scope gate.', 'A defect in build/src/compile.js: the scope gate is read from Scope.'),
  'IMPACT-UNITS': r('info', 'comparability', 'Impact data in J/m and kJ/m², which cannot share an axis.', 'Informational; no conversion without specimen geometry.'),
  'HEADLINE-BLANK': r('error', 'estimates', 'An in-scope headline has no value, no estimate and no not-applicable statement, on a material that names an Estimate identity.', 'Record a value, or give the model what it needs (the message names it).'),
  'HEADLINE-UNESTIMATED': r('info', 'estimates', 'An in-scope material the model does not estimate by declaration (Estimate identity Not applicable: a family\'s maker-undisclosed home, a blend such as the PLA blend, or a polymer the model has no row for, such as TPS or TPV; D87, D106) has a headline none of its products publishes. It shows Not published and is judged unknown, as an untested product is (D83).', 'Informational: a product that publishes the value fills it. A material that should be estimated names its polymers.csv row instead.'),
  'NA-INVALID': r('error', 'estimates', 'A not-applicable headline sits beside a value or estimate, or has no reason.', 'A headline is a value, an estimate, or not applicable with a reason.'),
  'EST-INVALID': r('error', 'estimates', 'An estimate is malformed: beside a value, out of scope, unknown kind, strength or precision, no basis, ranges not nested, or evidence misattributed.', 'Fix the estimate model or its inputs; estimates are never authored.'),
  'EST-CALIBRATION': r('error', 'estimates', 'An estimate model\'s likely or plausible range no longer holds hidden headlines as often as it claims.', 'Review recent data and conversions; the model must stay calibrated (D43).'),
  'EST-MODEL-REFERENCE': r('error', 'estimates', 'Retired 2026-09-15 (m28, m29): the estimate model configuration named a material or grade that did not exist. It names none now; polymers, variant classes and hardness are tables the schema gate checks.', 'Nothing to do; the code stays out of use.'),
  'EST-WIDE': r('warn', 'estimates', 'An estimate is imprecise although one of the material\'s products publishes a usable value for that headline: the model is not using evidence it has.', 'Check whether the published value should be its product\'s value (a pin in headlines.csv), and why the model did not use it. Fix it, or accept it with a reason: npm run data:lint -- --accept CODE "reason". Checked by npm run audit:data (in verify).', { reviewed: true }),
  'EST-THIN': r('info', 'estimates', 'Estimates too imprecise to guide a choice, because the material publishes nothing for that headline and its relatives and family scatter.', 'Informational: more data for the material or its siblings is what narrows it, not a change to the model (D58).'),
  'EST-FAMILY-ORDER': r('warn', 'estimates', 'A reinforced material sits below its unfilled sibling where reinforcement raises the property (stiffness; heat deflection of a semicrystalline matrix).', 'Check both values and grades; accept with the reason if the sources genuinely differ. Fix it, or accept it with a reason: npm run data:lint -- --accept CODE "reason". Checked by npm run audit:data (in verify).', { reviewed: true }),
  'EST-CONFLICT': r('info', 'estimates', 'Observations the estimate model down-weights because they contradict everything else it knows about the headline (conflictZ, D58); one finding per material, headline and kind of evidence, with the values and the grades.', 'Informational until the sweep (PLAN-REMAINING 2.3) has read the list: most are a variant a grade does not declare, a unit or a condition misread, or a sheet that prints another product\'s numbers. Fix the record; the count is in the validation report\'s Estimates section.'),
  'EST-GRADE-OUTLIER': r('info', 'estimates', 'A grade whose published value, hidden, sits far outside what the model predicts for that grade from everything else (D81); the worst kind per grade and headline, not raised where EST-OUTLIER already names the material\'s headline.', 'Informational until the sweep (PLAN-REMAINING 2.3): re-read the source, check the grade is the product the sheet names, and look for a variant the grade does not declare.'),
  'EST-CALIBRATION-FEW': r('info', 'estimates', 'Too few measured headlines to calibrate a model; it uses a default scale.', 'Informational; grows with data.'),
  'EST-SUMMARY': r('info', 'estimates', 'How missing headlines are covered by estimates.', 'Informational.'),
  'EST-REJECTED': r('warn', 'estimates', 'Physically impossible observations kept out of the estimate model.', 'Re-read the source; correct or quarantine the measurement.'),
  'EST-OUTLIER': r('warn', 'estimates', 'Measured headlines far outside what every other observation predicts.', 'Re-read the source and check the grade is the right product. Fix it, or accept it with a reason: npm run data:lint -- --accept CODE "reason". Checked by npm run audit:data (in verify).', { reviewed: true }),
  'TOPIC-UNMAPPED': r('error', 'evidence', 'An evidence topic with no category mapping.', 'Add the topic to schema/vocab/environment-topics.csv with its category.'),
  'FAMILY-ENTRIES': r('info', 'materials', 'Canonical names that are family entries, not candidates.', 'Informational (D44).'),
  'NO-MEASUREMENTS': r('warn', 'materials', 'Materials with no property measurements at all.', 'Research a grade with published data. Fix it, or accept it with a reason: npm run data:lint -- --accept CODE "reason". Checked by npm run audit:data (in verify).', { reviewed: true }),

  // ---- audit (scripts/audit-data.mjs) ---------------------------------------------------------------------
  'AUDIT-PARITY': r('error', 'audit', 'The fresh compile, dist/ files and the data embedded in the HTML are not identical, or the HTML loads something from the network.', 'Rebuild; if it persists, the bundler or the build is not deterministic.'),
  'AUDIT-REFERENCE-INTERVAL': r('error', 'audit', 'A reference envelope has a non-numeric or inverted interval.', 'Correct reference.csv.'),
  'AUDIT-REVIEW-FINDING': r('error', 'audit', 'A per-record build finding (an outlier, an imprecise estimate beside a published value, a reinforced material below its sibling, a material with no measurements) is neither fixed nor accepted with a reason.', 'Fix it, or accept it: npm run data:lint -- --accept CODE "reason".'),
  'AUDIT-REVIEW-STALE': r('error', 'audit', 'An accepted build finding no longer occurs.', 'Remove its row from data/review/accepted-findings.csv.'),
  'CONTEXT-DIRECTION': r('warn', 'audit', 'A value\'s own line on its cached page names a build direction (X-Y, Z, Orientation XZ) its row does not record or contradicts (scripts/audit/context-witness.mjs, RC4).', 'Re-read the page and correct the row, or accept with the reason: npm run audit:context -- --accept CODE "reason".'),
  'CONTEXT-NOTCH': r('warn', 'audit', 'A value\'s own line says notched or unnotched and its row says the other (RC4).', 'Re-read the page and correct Notch, or accept with the reason.'),
  'CONTEXT-BOUND-SIGN': r('warn', 'audit', 'A value\'s own line prints a bound sign (<, >, ≤, up to) its row\'s Operator does not carry (RC2).', 'Carry the sign in Operator, or accept with the reason.'),
  'CONTEXT-TEST-TEMPERATURE': r('warn', 'audit', 'A value\'s own line states a sub-zero test temperature its row does not record, so a low-temperature result reads as a room-temperature one (RC3).', 'Record Test temperature and Test temperature °C, or accept with the reason.'),
  'CONTEXT-STANDARD': r('warn', 'audit', 'A value\'s own line names a standard its row does not name, or a different one (RC3, RC4).', 'Re-read the page and correct Standard / load and Standards, or accept with the reason.'),
  'CONTEXT-PAGE-UNRECORDED': r('warn', 'audit', 'A page states once a specimen form, moisture state or treatment for its values, its rows record nothing, and no page_context row carries it (D116, RC3).', 'Add the page\'s page_context row, or correct the rows, or accept with the reason.'),
  'CONTEXT-PROFILE-SETTING': r('warn', 'audit', 'A profile\'s own sheet prints a print setting (a bed or nozzle window, "Hardened Nozzle no") the profile does not hold or contradicts (RC8).', 'Re-read the sheet and correct the profile, or accept with the reason.'),
  'AUDIT-SOURCE-SCOPE': r('error', 'audit', 'A record uses a grade its source does not list under Applicable grades.', 'Add the grade to the source scope, or cite the right source.'),

  // ---- runtime contract (build/src/contract.js) ---------------------------------------------------------
  'CONTRACT': r('error', 'contract', 'dist/db.json or dist/reference.json does not match its JSON Schema.', 'Update the compiler or, for a deliberate shape change, schema/db.schema.json in the same commit.'),

  // ---- lint (build/src/lint-rules.js), reported by npm run data:lint ---------------------------------------
  ...Object.fromEntries(Object.entries(LINT_RULES).map(([code, meaning]) => [code, r('lint', 'lint', meaning, 'Fix it, or accept it with a reason: npm run data:lint -- --accept CODE "reason".')])),
};

/**
 * Build an issue; an unknown code is a programming error and the catalogue decides the level. `at` is the record it is
 * about, { table, record, field }, or a string where no record names it. A finding is one shape everywhere: level, code,
 * where, message, and the record it names, which is what the acceptance baseline is keyed on.
 */
export function issue(code, at, message, extra = {}) {
  const rule = RULES[code];
  if (!rule) throw new Error(`Unknown rule code ${code}`);
  const record = typeof at === 'string' ? { where: at } : { table: at.table, record: at.record, field: at.field ?? '', where: [at.table, at.record, at.field].filter(Boolean).join(' ') };
  return { level: rule.level, code, ...record, message, ...extra };
}

/** The codes whose findings a reviewer decides on, one record at a time (data/review/accepted-findings.csv, D57). */
export const REVIEWED_CODES = Object.entries(RULES).filter(([, r]) => r.reviewed).map(([code]) => code);
