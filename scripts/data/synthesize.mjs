#!/usr/bin/env node
// Scale check: write a copy of the data with every material (family entries aside) and everything
// recorded against it cloned under new IDs, so the gate, compiler, validator and estimate model can be
// timed and checked at a multiple of today's size. The copies are distinct products (their own names
// and formulation keys) citing the same sources.
//
//   node scripts/data/synthesize.mjs <factor> <output-root>      e.g. 2 /tmp/h2c-2x

import { cpSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables, projectRoot } from './table-io.mjs';

export function synthesize(factor, outRoot) {
  mkdirSync(outRoot, { recursive: true });
  cpSync(join(projectRoot, 'data'), join(outRoot, 'data'), { recursive: true });
  cpSync(join(projectRoot, 'schema'), join(outRoot, 'schema'), { recursive: true });
  const t = openTables(outRoot);
  const max = (table, re) => Math.max(...t.rows(table).map((r) => Number(re.exec(Object.values(r)[0])?.[1] ?? 0)));
  const span = {
    M: max('materials', /^M(\d{3})$/), P: max('profiles', /^P(\d{4})$/), V: max('measurements', /^V(\d{6})$/),
    Q: max('evidence', /^Q(\d{5})$/), CA: max('prices', /^CA(\d{4})$/), C: max('coverage', /^C(\d{5})$/),
  };
  const originals = Object.fromEntries(t.tables().map((n) => [n, [...t.rows(n)]]));
  const familyEntries = new Set(originals.materials.filter((m) => m.Scope === 'Family entry').map((m) => m.MaterialID));

  for (let k = 1; k < factor; k++) {
    const shift = (id) => {
      if (id == null) return id;
      let m;
      if ((m = /^M(\d{3})$/.exec(id))) return `M${String(+m[1] + k * span.M).padStart(3, '0')}`;
      if ((m = /^G(\d{3})-(.+)$/.exec(id))) return `G${String(+m[1] + k * span.M).padStart(3, '0')}-${m[2]}`;
      if ((m = /^P(\d{4})$/.exec(id))) return `P${String(+m[1] + k * span.P).padStart(4, '0')}`;
      if ((m = /^V(\d{6})$/.exec(id))) return `V${String(+m[1] + k * span.V).padStart(6, '0')}`;
      if ((m = /^Q(\d{5})$/.exec(id))) return `Q${String(+m[1] + k * span.Q).padStart(5, '0')}`;
      if ((m = /^CA(\d{4})$/.exec(id))) return `CA${String(+m[1] + k * span.CA).padStart(4, '0')}`;
      if ((m = /^C(\d{5})$/.exec(id))) return `C${String(+m[1] + k * span.C).padStart(5, '0')}`;
      return id; // sources, rubrics and missing states are shared
    };
    const suffix = ` ×${k + 1}`;
    const own = (r) => !familyEntries.has(r.MaterialID);
    const copy = (table, rows, fields, extra = () => ({})) => {
      for (const r of rows) t.append(table, { ...r, ...Object.fromEntries(fields.map((f) => [f, shift(r[f])])), ...extra(r) });
    };
    copy('materials', originals.materials.filter(own), ['MaterialID', 'Representative grade'], (r) => ({
      'Original name': r['Original name'] + suffix, Abbreviation: r.Abbreviation + suffix,
    }));
    copy('grades', originals.grades.filter(own), ['GradeID', 'MaterialID'], (r) => ({ 'Shared formulation key': `${r['Shared formulation key']}${suffix}` }));
    copy('profiles', originals.profiles.filter(own), ['ProfileID', 'MaterialID', 'GradeID']);
    const profileMaterial = new Map(originals.profiles.map((p) => [p.ProfileID, p.MaterialID]));
    copy('profile_notes', originals.profile_notes.filter((r) => !familyEntries.has(profileMaterial.get(r.ProfileID))), ['ProfileID']);
    copy('measurements', originals.measurements.filter(own), ['MeasurementID', 'MaterialID', 'GradeID']);
    copy('evidence', originals.evidence.filter(own), ['EvidenceID', 'MaterialID', 'GradeID']);
    copy('prices', originals.prices.filter(own), ['PriceID', 'MaterialID', 'GradeID']);
    copy('coverage', originals.coverage.filter(own), ['CoverageID', 'MaterialID']);
    copy('headlines', originals.headlines.filter(own), ['MaterialID', 'MeasurementID']);
    copy('material_links', originals.material_links.filter(own), ['MaterialID', 'RecordID']);
    const materialOf = new Map(originals.measurements.map((m) => [m.MeasurementID, m.MaterialID]));
    copy('fatigue_tests', originals.fatigue_tests.filter((r) => !familyEntries.has(materialOf.get(r.MeasurementID))), ['MeasurementID']);
  }
  t.save();
  return Object.fromEntries(t.tables().map((n) => [n, t.rows(n).length]));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [factor, out] = process.argv.slice(2);
  if (!factor || !out) { console.error('usage: node scripts/data/synthesize.mjs <factor> <output-root>'); process.exit(2); }
  console.log(synthesize(Number(factor), resolve(out)));
}
