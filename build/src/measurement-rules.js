import { applies } from './registry.js';
import { issue } from './rules.js';

// Independent raw-to-normalized reconciliation. Never repairs a value during compilation.
// Decimal commas with one/two decimal digits differ from grouped integer cycle counts.
export function rawNumber(text) {
  const match = String(text ?? '').replace(/[−–]/g, '-').match(/^\s*[<>＜＞≥≤]?\s*(-?\d+(?:[ ,.\u00a0]\d+)*)/);
  if (!match) return null;
  let token = match[1].trim().replace(/[ \u00a0]/g, '');
  if (/^-?\d+,\d{1,2}$/.test(token)) token = token.replace(',', '.');
  else if (/^-?\d{1,3}(,\d{3})+$/.test(token)) token = token.replaceAll(',', '');
  if (!/^-?\d+(\.\d+)?$/.test(token)) return null;
  return Number(token);
}

export function normalizedRawValue(row) {
  const value = rawNumber(row['Raw value']);
  if (value === null) return null;
  const raw = String(row['Raw unit']).toLowerCase().replaceAll('³', '3').replaceAll('²', '2').replaceAll('℃', '°c');
  const unit = String(row['Normalized unit']).toLowerCase().replaceAll('³', '3').replaceAll('²', '2');
  let factor;
  if (raw === unit || (['kj/m2', 'kj/m^2', 'kj/㎡'].includes(raw) && unit === 'kj/m2') || (raw === 'ppm/k' && unit === 'µm/m/k')) factor = 1;
  else if (['g/cc', 'g/cm3'].includes(raw) && unit === 'kg/m3') factor = 1000;
  else if (raw === 'mpa' && unit === 'gpa') factor = 0.001;
  else if (raw === 'kg/cm2' && unit === 'mpa') factor = 0.0980665;
  else if (raw === 'kg/cm2' && unit === 'gpa') factor = 0.0000980665;
  if (factor === undefined) return null;
  return value * factor;
}

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
    if (expected === null) continue;
    const actual = Number(r['Normalized value']);
    if (!Number.isFinite(actual) || Math.abs(actual - expected) > Math.max(0.00001, Math.abs(expected) * 0.00001)) {
      error('MEAS-RAW-RECONCILE', `Properties ${r.MeasurementID} row ${r.__row}`, `Raw value ${r['Raw value']} ${r['Raw unit']} normalizes to ${expected}, not ${r['Normalized value']}`);
    }
    const rawNumeric = Number(r['Raw numeric']);
    const factor = r.__numbers?.['Conversion factor'] ?? Number(r['Conversion factor']);
    if (!Number.isFinite(rawNumeric) || !Number.isFinite(factor) || Math.abs(rawNumeric * factor - actual) > Math.max(0.00001, Math.abs(actual) * 0.00001)) {
      error('MEAS-RAW-RECONCILE', `Properties ${r.MeasurementID} row ${r.__row}`, 'Raw numeric and conversion factor disagree with the cached normalized formula result');
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
    if (m.numeric && !p.units.includes(m.unit)) error('MEAS-UNIT', `measurements ${m.id}`, `${m.property} in ${m.unit}; properties.csv allows ${p.units.join(', ')}`);
    const mat = materials.get(m.materialId);
    if (mat && !applies(p.appliesTo, mat)) error('MEAS-NOT-APPLICABLE', `measurements ${m.id}`, `${m.property} does not apply to ${mat.name} (${p.appliesToText}); file it under the right material or widen Applies to`);
  }
  return issues;
}
