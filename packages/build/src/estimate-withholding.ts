// What the build does when the estimate model fails its own calibration check (WP-21; owner ruling OQ-05 A, 2026-10-20):
//
//   Publish, but withhold and label the estimates for the failing group (or the whole model), and open a ruling for me.
//
// The old build stopped: EST-CALIBRATION is an error, so no database was written (build/src/estimate/validate.js). That stop stays
// on main until cutover. Here the check is the same check (the old validator's own findings, read by their `where`), and the
// consequence is the ruled one:
//
//   - a "group" is a headline: the model is one Gaussian model per headline. A failure of its material-level ranges withholds that
//     headline's estimates of materials and of products; a failure of its product-level ranges (overall, or in one matrix) withholds
//     its product estimates. A finding that names no headline withholds every estimate (the whole model).
//   - the estimate is taken out of each affected cell, so every consumer (the old engine and pages, the new ones) reads the cell as
//     "no estimate", exactly as with estimates off; the cell is labelled in meta.estimateWithheld ("estimate withheld: model check
//     failed for <group>"), and the label travels in estimates.json;
//   - the findings stay in the report as warnings, with a finding of their own that says what was withheld;
//   - a question for the owner is written beside the release (`rulingFor`), in the owner-questions format.
//
// Everything else the validator found stays what it was: only EST-CALIBRATION is withheld. CONVERSION-DRIFT (a learned offset outside
// the band its row states), EST-ORDER and EST-INVALID are checks of the data and of the code, not of how well the model holds hidden
// values, and still stop the build.
import { summariseEstimates } from './estimate/index.ts';
import type { Dyn, Issue } from './types.ts';

export const WITHHELD_CODE = 'EST-WITHHELD';

/** How far a failure reaches. `model`: the headline's material and product estimates. `grades`: its product estimates. `all`: every headline. */
export type WithheldScope = 'model' | 'grades' | 'all';

export interface WithheldGroup {
  /** The headline key, or null where the whole model is withheld. */
  key: string | null;
  scope: WithheldScope;
  /** What the label calls the group. */
  name: string;
  label: string;
  /** The matrices a product-level failure named (it still withholds the headline's product estimates whole). */
  matrices: string[];
  /** The validator's own words, one per finding. */
  findings: string[];
  materialCells: number;
  productCells: number;
}

export interface WithheldRecord {
  status: 'withheld';
  groups: WithheldGroup[];
  /** Every cell that lost its estimate, by place, with its label: `materials/M001/density`, `grades/G001-01/density`. */
  cells: Record<string, string>;
}

const FAILURE = /^estimate model (\w+)(?: grades(?: (.+))?)?$/;

/** The estimated headlines of the registry. */
const estimatedKeys = (db: Dyn): string[] => db.registry.headlines.filter((h: Dyn) => h.estimated).map((h: Dyn) => h.key);

const plainName = (db: Dyn, key: string): string => db.registry.headlines.find((h: Dyn) => h.key === key)?.labels?.plain ?? key;

const labelFor = (name: string): string => `estimate withheld: model check failed for ${name}`;

/** The headlines a calibration finding concerns: the headline it names, or every estimated headline where it names none. */
function groupsOf(db: Dyn, failures: readonly Issue[]): WithheldGroup[] {
  const byKey = new Map<string, WithheldGroup>();
  const whole: string[] = [];
  const known = new Set(estimatedKeys(db));
  for (const f of failures) {
    const parsed = FAILURE.exec(f.where);
    // A finding that names no estimated headline cannot be placed, so it reaches the whole model.
    if (!parsed || !known.has(parsed[1] ?? '')) { whole.push(f.message); continue; }
    const key = parsed[1] ?? '';
    const grades = f.where.includes(' grades');
    const group: WithheldGroup = byKey.get(key) ?? { key, scope: 'grades', name: plainName(db, key), label: labelFor(plainName(db, key)), matrices: [], findings: [], materialCells: 0, productCells: 0 };
    if (!grades) group.scope = 'model';
    if (parsed[2] && !group.matrices.includes(parsed[2])) group.matrices.push(parsed[2]);
    group.findings.push(f.message);
    byKey.set(key, group);
  }
  if (whole.length) {
    const named = [...byKey.values()].flatMap((g) => g.findings);
    return [{ key: null, scope: 'all', name: 'the estimate model', label: labelFor('the estimate model'), matrices: [], findings: [...named, ...whole], materialCells: 0, productCells: 0 }];
  }
  return [...byKey.values()];
}

/**
 * Take the estimates of the failing groups out of the database, label every cell, and bring the coverage figures in line with what the
 * database now holds. Returns the findings to publish in place of the EST-CALIBRATION errors (as warnings, beside one that says what
 * was withheld), and the record of what was withheld, or null where no calibration check failed.
 */
export function withholdFailedCalibration(db: Dyn, found: readonly Issue[]): { issues: Issue[]; record: WithheldRecord | null } {
  const failures = found.filter((i) => i.code === 'EST-CALIBRATION' && i.level === 'error');
  if (!failures.length) return { issues: [...found], record: null };
  const groups = groupsOf(db, failures);
  const cells: Record<string, string> = {};
  for (const group of groups) {
    const keys = group.key === null ? estimatedKeys(db) : [group.key];
    for (const key of keys) {
      if (group.scope !== 'grades') {
        for (const m of db.materials) {
          const h = m.headline?.[key];
          if (!h?.estimate) continue;
          delete h.estimate;
          cells[`materials/${m.id}/${key}`] = group.label;
          group.materialCells++;
        }
      }
      for (const g of db.grades) {
        if (!g.estimate?.[key]) continue;
        delete g.estimate[key];
        if (!Object.keys(g.estimate).length) delete g.estimate;
        cells[`grades/${g.id}/${key}`] = group.label;
        group.productCells++;
      }
    }
  }
  // The ruling is to withhold: a failure that left an estimate in place, or withheld nothing, is not published as handled.
  const total = groups.reduce((n, g) => n + g.materialCells + g.productCells, 0);
  if (total === 0) return { issues: [...found], record: null };
  for (const group of groups) {
    for (const key of group.key === null ? estimatedKeys(db) : [group.key]) {
      const left = (group.scope !== 'grades' && db.materials.some((m: Dyn) => m.headline?.[key]?.estimate)) || db.grades.some((g: Dyn) => g.estimate?.[key]);
      if (left) throw new Error(`withholding left an estimate of ${key} in the database: the build must not publish it`);
    }
  }
  const record: WithheldRecord = { status: 'withheld', groups, cells };
  db.meta.estimateWithheld = record;
  db.meta.estimateCoverage = summariseEstimates(db.materials, db.registry);
  const names = groups.map((g) => g.name).join(', ');
  const kept = found.filter((i) => !failures.includes(i));
  const downgraded = failures.map((i): Issue => ({ ...i, level: 'warn', message: `${i.message} (estimates withheld, ruling OQ-05 A)` }));
  const summary: Issue = {
    level: 'warn', code: WITHHELD_CODE, where: 'estimates',
    message: `${total} estimates withheld and labelled (model check failed for ${names}). The release is published without them, as ruled (OQ-05 A); a question for the owner is written beside it (estimate-ruling.md). Every other estimate, and the print-window estimates (which this check does not cover), are as the model made them.`,
  };
  return { issues: [...kept, ...downgraded, summary], record };
}

function reachOf(group: WithheldGroup): string {
  switch (group.scope) {
    case 'all':
      return 'the whole model';
    case 'model':
      return 'material and product estimates';
    case 'grades':
      return `product estimates${group.matrices.length ? ` (the check that failed: ${group.matrices.join(', ')} matrix)` : ''}`;
  }
}

/** The lines the validation report adds to its Estimates section where estimates were withheld. */
export function withheldReportLines(record: WithheldRecord): string[] {
  const L = ['## Estimates withheld', ''];
  L.push('The estimate model failed its own calibration check. The release is published anyway and the failing groups\' estimates are withheld and labelled (owner ruling OQ-05 A). A reader sees these cells as having no estimate; their label is in `meta.estimateWithheld` and in `estimates.json`.');
  L.push('');
  L.push('| Group | Reach | Material estimates withheld | Product estimates withheld | Label |');
  L.push('|---|---|---:|---:|---|');
  for (const g of record.groups) {
    L.push(`| ${g.name} | ${reachOf(g)} | ${g.materialCells} | ${g.productCells} | ${g.label} |`);
  }
  L.push('');
  for (const g of record.groups) for (const f of g.findings) L.push(`- ${g.name}: ${f}`);
  L.push('');
  return L;
}

/**
 * The question for the owner that a withholding opens, in the owner-questions format: plain English, tick boxes, an answer line.
 * It is written beside the release the build made; nothing in the repository is changed by a build.
 */
export function rulingFor(record: WithheldRecord, release: string): string {
  const names = record.groups.map((g) => g.name);
  const list = names.length === 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1] ?? ''}`;
  const count = Object.keys(record.cells).length;
  return [
    `# A question for you: the estimate model failed its own check (release ${release})`,
    '',
    `The model that estimates missing values stopped holding the hidden values it claims to hold, for ${list}. Under your ruling OQ-05 A, the release was published anyway. The estimates for ${list} were taken out (${count} places) and each place says "estimate withheld: model check failed for ${names[0] ?? 'the group'}"${names.length > 1 ? ' (or the matching group)' : ''}. Every other estimate, and the nozzle and bed window estimates (this check does not cover them), are unchanged. Nothing measured is affected.`,
    '',
    'What the check found:',
    '',
    ...record.groups.flatMap((g) => g.findings.map((f) => `- ${f}`)),
    '',
    'What should happen next? Tick one.',
    '',
    '- [ ] A. Leave the estimates withheld until someone has looked at what changed in the data or the conversions. (recommended)',
    '- [ ] B. Look at the failing check together before the next release, then decide.',
    '- [ ] C. Something else (write it on the answer line).',
    '',
    'Your answer: ______________________________',
    '',
  ].join('\n');
}

/**
 * A self-test of the withholding: make one headline's plausible range hold none of its hidden values, as a model that had stopped
 * working would, so the real check fails and the real consequences follow. It changes the database after the stage, never the cached
 * result. A key that is not an estimated headline is an error, not a no-op.
 */
export function seedCalibrationFailure(db: Dyn, keys: readonly string[]): void {
  for (const key of keys) {
    const calibration = db.meta?.estimateModel?.properties?.[key]?.calibration;
    if (!calibration) throw new Error(`cannot seed a calibration failure for "${key}": the estimate model has no such headline (known: ${Object.keys(db.meta?.estimateModel?.properties ?? {}).join(', ')})`);
    calibration.plausibleCoverage = 0;
  }
}
