import { applies } from './registry.js';
import { issue } from './rules.js';

// Independent raw-to-normalized reconciliation. Never repairs a value during compilation.
// Decimal commas with one/two decimal digits differ from grouped integer cycle counts.
const SUPERSCRIPT = { '\u2070': '0', '\u00b9': '1', '\u00b2': '2', '\u00b3': '3', '\u2074': '4', '\u2075': '5', '\u2076': '6', '\u2077': '7', '\u2078': '8', '\u2079': '9', '\u207a': '+', '\u207b': '-' };

export function rawNumber(text) {
  const plain = String(text ?? '').replace(/[−–]/g, '-')
    .replace(/[\u2070\u00b9\u00b2\u00b3\u2074-\u2079\u207a\u207b]+/g, (run) => `^${[...run].map((c) => SUPERSCRIPT[c]).join('')}`);
  // A power of ten is one number: a resistivity is published as "> 10¹² Ω" and a volume resistivity as
  // "6.75×10¹⁴ Ω·cm", and read as the digits they are made of they become 1012 and 6.75, which is a conductor
  // where the sheet says an insulator. The superscripts are written with a caret first, because that is how the
  // reader writes a raised piece it joined to its ten.
  const power = /^\s*[<>＜＞≥≤~≈約]?\s*(-?\d+(?:[.,]\d+)?)?\s*(?:[×x*·]\s*)?10\s*\^\s*([-+]?\d+)/.exec(plain);
  if (power) {
    const mantissa = power[1] == null ? 1 : Number(String(power[1]).replace(',', '.'));
    return Number.isFinite(mantissa) ? mantissa * 10 ** Number(power[2]) : null;
  }
  // The same number written with an E. A maker publishes a surface resistivity as "> 1.0E+15 ohms" and a thermal
  // expansion as "5.0E-5 cm/cm/C", and read as the digits in front of the E they become 1 and 5, which is an
  // insulator read as a conductor and an expansion a thousand times what any polymer has. The exponent's sign
  // may be left out where it is positive: Nanovia prints "10E13" for a surface resistivity and 3DJake "1E1" and
  // "4E1" for the resistivity of its conductive grades. The letter has to stand between two digits, so a
  // designation that ends in one ("ASTM E 2092") is not a number.
  const exponent = /^\s*[<>＜＞≥≤~≈約]?\s*(-?\d+(?:[.,]\d+)?)\s*[Ee]\s*([-+]?\d{1,3})(?![\d.,])/.exec(plain);
  if (exponent) {
    const mantissa = Number(String(exponent[1]).replace(',', '.'));
    return Number.isFinite(mantissa) ? mantissa * 10 ** Number(exponent[2]) : null;
  }
  // A source may print a bound ("> 500 %") or an approximation ("~1.5 %"); both lead with the number they qualify.
  // A number may be written without its leading zero: a maker prints ".13 %" for a water absorption of 0.13.
  const match = plain.match(/^\s*[<>＜＞≥≤~≈約]?\s*(-?(?:\d+(?:[ ,.\u00a0]\d+)*|[.,]\d+))/);
  if (!match) return null;
  let token = match[1].trim().replace(/[ \u00a0]/g, '');
  if (/^-?[.,]\d+$/.test(token)) token = `0${token.replace(',', '.')}`;
  // A comma is a decimal comma wherever no thousands separator could stand. A thousands separator has exactly
  // three digits behind it and at most three in front of the first one, so "1,1128" and "1836,740" are both
  // decimals and neither was a number this reader returned at all: each reached the applier as a NaN, from
  // 3DJake's density of "1,1128 g/cc" and Filament2Print's flexural modulus of "1836,740 MPa".
  //
  // What is left — three digits behind the comma and no more than three in front — is genuinely ambiguous, and
  // stays so: it is read as the thousands here and settled against what the property can reach (couldBe), which
  // is the one place that has the property to ask about.
  if (/^-?\d+,(\d{1,2}|\d{4,})$/.test(token) || /^-?\d{4,},\d{3}$/.test(token)) token = token.replace(',', '.');
  else if (/^-?\d{1,3}(,\d{3})+$/.test(token)) token = token.replaceAll(',', '');
  if (!/^-?\d+(\.\d+)?$/.test(token)) return null;
  return Number(token);
}

/**
 * A unit as this check compares it: case, spaces, superscripts, the degree sign and a parenthetical aside are
 * spelling, not meaning, so "M P a", "MPa", "kJ /m2", "kJ/m²" and "g/10 min (unit not printed)" each read as one
 * unit. Without this a sheet that spaced its unit differently skipped the strongest check in silence.
 */
export const unitKey = (text) => String(text ?? '').toLowerCase()
  .replace(/\([^)]*\)/g, '').replaceAll('³', '3').replaceAll('²', '2').replaceAll('^2', '2').replaceAll('^3', '3')
  .replaceAll('℃', '°c').replaceAll('㎡', 'm2').replaceAll('∙', '·').replaceAll('*', '·')
  .replace(/[\s\u00a0]+/g, '').trim();

// Every conversion this check knows, "from -> to" in unit keys. It is deliberately its own table: it exists to
// disagree with the Conversion factor recorded beside the value, so it may never read that factor.
// A conversion that is not a factor (°F to °C, which needs an offset) has no home here and none of the data
// needs one yet; it would be a column on the row, not a special case here.
const CONVERSIONS = new Map(Object.entries({
  'ppm/k->µm/m/k': 1,
  'g/cc->kg/m3': 1000, 'g/cm3->kg/m3': 1000, 'specificgravity->kg/m3': 1000,
  'mpa->gpa': 0.001, 'n/mm2->mpa': 1, 'n/mm2->gpa': 0.001,
  'kg/cm2->mpa': 0.0980665, 'kg/cm2->gpa': 0.0000980665, 'kgf/cm2->mpa': 0.0980665, 'kgf/cm2->gpa': 0.0000980665,
  'psi->mpa': 0.00689476, 'psi->gpa': 0.00000689476, 'ksi->mpa': 6.89476, 'ksi->gpa': 0.00689476,
  'kg·cm/cm->j/m': 9.80665, 'kg∙cm/cm->j/m': 9.80665, 'kgf·cm/cm->j/m': 9.80665, 'ft·lbf/in->j/m': 53.3787, 'ft·lb/in->j/m': 53.3787,
}));

export function normalizedRawValue(row) {
  const value = rawNumber(row['Raw value']);
  if (value === null) return null;
  const raw = unitKey(row['Raw unit']);
  const unit = unitKey(row['Normalized unit']);
  const factor = raw === unit ? 1 : CONVERSIONS.get(`${raw}->${unit}`);
  if (factor === undefined) return null;
  return value * factor;
}

/**
 * Whether this row's units are a pair the check knows, so an unknown pair can be reported rather than skipped.
 * A raw unit that is a missing state is not an unknown pair: the sheet printed no unit, so there is nothing to
 * convert, and the normalized unit says so in its own words ("Shore (scale not specified by source)").
 */
export const unitsKnown = (row) => /^Not (published|applicable|recorded)$/.test(String(row['Raw unit']).trim())
  || unitKey(row['Raw unit']) === unitKey(row['Normalized unit'])
  || CONVERSIONS.has(`${unitKey(row['Raw unit'])}->${unitKey(row['Normalized unit'])}`);

export function measurementIssues(db, wb) {
  const issues = [];
  const error = (code, where, message) => issues.push(issue(code, where, message));
  for (const m of db.measurements) {
    if (/^Published value/.test(m.dataStatus) && !m.numeric) error('MEAS-PUBLISHED-NON-NUMERIC', `measurements ${m.id}`, 'Published numeric status has no numeric value; classify a qualitative result explicitly');
    if (m.property === 'Elongation at break' && /at max\.? force|at yield|at strength/i.test(m.locator)) error('MEAS-ENDPOINT-LOCATOR', `measurements ${m.id}`, 'Elongation endpoint disagrees with its source locator');
  }
  for (const r of wb?.Properties?.rows ?? []) {
    if (!/^Published value/.test(r['Data status'])) continue;
    const expected = normalizedRawValue(r);
    // A unit pair the table does not know turns the strongest check off without saying so. A raw value that does
    // not lead with its number ("Specific gravity 1.01 at 23 °C") cannot be reconciled at all, and says so here.
    if (expected === null) {
      if (rawNumber(r['Raw value']) !== null && !unitsKnown(r)) {
        error('MEAS-UNIT-UNKNOWN', `Properties ${r.MeasurementID} row ${r.__row}`, `no conversion from "${r['Raw unit']}" to "${r['Normalized unit']}"; the raw value is not reconciled`);
      }
      continue;
    }
    const actual = Number(r['Normalized value']);
    if (!Number.isFinite(actual) || Math.abs(actual - expected) > Math.max(0.00001, Math.abs(expected) * 0.00001)) {
      error('MEAS-RAW-RECONCILE', `Properties ${r.MeasurementID} row ${r.__row}`, `Raw value ${r['Raw value']} ${r['Raw unit']} normalizes to ${expected}, not ${r['Normalized value']}`);
    }
    const rawNumeric = Number(r['Raw numeric']);
    const factor = r.__numbers?.['Conversion factor'] ?? Number(r['Conversion factor']);
    if (!Number.isFinite(rawNumeric) || !Number.isFinite(factor) || Math.abs(rawNumeric * factor - actual) > Math.max(0.00001, Math.abs(actual) * 0.00001)) {
      error('MEAS-RAW-RECONCILE', `Properties ${r.MeasurementID} row ${r.__row}`, 'Raw numeric and conversion factor disagree with the cached normalized formula result');
    }
    // The spread and the upper end convert with the same factor as the value (audit 2026-09-15, C-12).
    for (const [raw, normalized] of [['Raw uncertainty ±', 'Normalized uncertainty ±'], ['Raw upper bound', 'Normalized upper bound']]) {
      const a = Number(r[raw]), b = Number(r[normalized]);
      if (!Number.isFinite(a) && !Number.isFinite(b)) continue;
      if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(factor) || Math.abs(a * factor - b) > Math.max(0.00001, Math.abs(b) * 0.00001)) {
        error('MEAS-RAW-RECONCILE', `Properties ${r.MeasurementID} row ${r.__row}`, `${raw} ${r[raw]} × ${r['Conversion factor']} disagrees with ${normalized} ${r[normalized]}`);
      }
    }
  }
  const byId = new Map(db.measurements.map((m) => [m.id, m]));
  for (const mat of db.materials) for (const def of db.registry.headlines.filter((h) => h.kind === 'measurement')) {
    const h = mat.headline[def.key];
    if (!h?.known) continue;
    const m = byId.get(h.measurementId);
    if (!m || !def.valueProperties.includes(m.property) || m.unit !== def.unit || h.unit !== def.unit || m.value !== h.value) error('MEAS-HEADLINE-TYPE', `materials ${mat.id}`, `Headline ${def.key} has inconsistent property, unit, value or citation`);
  }

  // Every measurement is of a registered property, in one of its units, of a material it applies to.
  const properties = new Map(db.registry.properties.map((p) => [p.name, p]));
  const materials = new Map(db.materials.map((m) => [m.id, m]));
  for (const m of db.measurements) {
    const p = properties.get(m.property);
    if (!p) { error('MEAS-PROPERTY-UNREGISTERED', `measurements ${m.id}`, `Property "${m.property}" is not in properties.csv`); continue; }
    if (p.replacedBy) error('REGISTRY-REPLACED', `measurements ${m.id}`, `${m.property} is replaced by ${p.replacedBy}`);
    if (m.numeric && !p.units.includes(m.unit)) error('MEAS-UNIT', `measurements ${m.id}`, `${m.property} in ${m.unit}; properties.csv allows ${p.units.join(', ')}`);
    const mat = materials.get(m.materialId);
    if (mat && !applies(p.appliesTo, mat)) error('MEAS-NOT-APPLICABLE', `measurements ${m.id}`, `${m.property} does not apply to ${mat.name} (${p.appliesToText}); file it under the right material or widen Applies to`);
  }
  return issues;
}
