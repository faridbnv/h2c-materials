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

export const HEADLINE_TYPES = {
  density: { unit: 'kg/m³', properties: ['Density'] },
  tensileModulusXY: { unit: 'GPa', properties: ['Tensile modulus'] },
  tensileStrengthXY: { unit: 'MPa', properties: ['Tensile strength (endpoint unspecified)', 'Tensile yield strength', 'Tensile break strength'] },
  elongationXY: { unit: '%', properties: ['Elongation at break'] },
  hdt045: { unit: '°C', properties: ['HDT'] },
};

export function measurementIssues(db, wb) {
  const issues = [];
  const error = (where, message) => issues.push({ level: 'error', where, message });
  for (const m of db.measurements) {
    if (/^Published value/.test(m.dataStatus) && !m.numeric) error(`measurements ${m.id}`, 'Published numeric status has no numeric value; classify a qualitative result explicitly');
    if (m.property === 'Elongation at break' && /at max\.? force|at yield|at strength/i.test(m.locator)) error(`measurements ${m.id}`, 'Elongation endpoint disagrees with its source locator');
  }
  for (const r of wb?.Properties?.rows ?? []) {
    if (!/^Published value/.test(r['Data status'])) continue;
    const expected = normalizedRawValue(r);
    if (expected === null) continue;
    const actual = Number(r['Normalized value']);
    if (!Number.isFinite(actual) || Math.abs(actual - expected) > Math.max(0.00001, Math.abs(expected) * 0.00001)) {
      error(`Properties ${r.MeasurementID} row ${r.__row}`, `Raw value ${r['Raw value']} ${r['Raw unit']} normalizes to ${expected}, not ${r['Normalized value']}`);
    }
    const rawNumeric = Number(r['Raw numeric']);
    const factor = r.__numbers?.['Conversion factor'] ?? Number(r['Conversion factor']);
    if (!Number.isFinite(rawNumeric) || !Number.isFinite(factor) || Math.abs(rawNumeric * factor - actual) > Math.max(0.00001, Math.abs(actual) * 0.00001)) {
      error(`Properties ${r.MeasurementID} row ${r.__row}`, 'Raw numeric and conversion factor disagree with the cached normalized formula result');
    }
  }
  const byId = new Map(db.measurements.map((m) => [m.id, m]));
  for (const mat of db.materials) for (const [key, rule] of Object.entries(HEADLINE_TYPES)) {
    const h = mat.headline[key];
    if (!h?.known) continue;
    const m = byId.get(h.measurementId);
    if (!m || !rule.properties.includes(m.property) || m.unit !== rule.unit || h.unit !== rule.unit || m.value !== h.value) error(`materials ${mat.id}`, `Headline ${key} has inconsistent property, unit, value or citation`);
  }
  return issues;
}
