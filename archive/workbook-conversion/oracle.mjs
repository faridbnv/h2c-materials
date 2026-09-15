// The migration oracle: the database and reference the workbook build produced at the branch base
// (archive/workbook-conversion/baseline/*.json.gz). Every migration step must reproduce them, except for the exact
// differences listed in explained-differences.json, each with the step that made it and why.

import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const baseline = (f) => JSON.parse(gunzipSync(readFileSync(join(root, 'archive/workbook-conversion/baseline', `${f}.gz`))).toString('utf8'));

export const explained = () => JSON.parse(readFileSync(join(root, 'scripts/migrate/explained-differences.json'), 'utf8')).differences;

/** Every path at which `after` differs from the baseline, meta.build excluded. */
export function diffAgainstBaseline({ db, reference }) {
  const diffs = [];
  const walk = (a, b, path) => {
    if (a === b || diffs.length > 5000) return;
    if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object' || Array.isArray(a) !== Array.isArray(b)) {
      diffs.push({ path, before: a, after: b });
      return;
    }
    if (Array.isArray(a)) {
      if (a.length !== b.length) diffs.push({ path: `${path}.length`, before: a.length, after: b.length });
      for (let i = 0; i < Math.min(a.length, b.length); i++) walk(a[i], b[i], `${path}[${a[i]?.id ?? i}]`);
      return;
    }
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[k], b[k], `${path}.${k}`);
  };
  const strip = (x) => { const c = structuredClone(x); if (c?.meta) delete c.meta.build; return c; };
  walk(strip(baseline('db.json')), strip(db), 'db.json');
  walk(strip(baseline('reference.json')), strip(reference), 'reference.json');
  return diffs;
}

/** Differences not in the explained list, and explained entries that no longer occur. */
export function unexplained(diffs) {
  const list = explained();
  const same = (e, d) => e.path === d.path && JSON.stringify(e.before) === JSON.stringify(d.before) && JSON.stringify(e.after) === JSON.stringify(d.after);
  // An entry with "added": true explains a new field at that path whatever its content; the content
  // is checked by its own tests (the registry by test/registry.test.js).
  const matches = (e, d) => (e.added ? d.path === e.path && d.before === undefined : same(e, d));
  return {
    extra: diffs.filter((d) => !list.some((e) => matches(e, d))),
    stale: list.filter((e) => !diffs.some((d) => matches(e, d))),
  };
}
