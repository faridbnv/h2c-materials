// Every issue the tooling can raise carries a stable code from the rule catalogue (build/src/rules.js),
// with the catalogue's level, and docs/RULES.md explains it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES } from '../build/src/rules.js';
import { loadTables, snapshotDate } from '../build/src/load.js';
import { buildDatabase } from '../build/src/pipeline.js';
import { checkData } from '../build/src/schema.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sources = [
  ...readdirSync(join(root, 'build/src')).filter((f) => f.endsWith('.js')).map((f) => `build/src/${f}`),
  ...readdirSync(join(root, 'build/src/estimate')).map((f) => `build/src/estimate/${f}`),
  'scripts/audit-data.mjs',
];

test('every issue site names a catalogued code with the catalogue level', () => {
  const problems = [];
  for (const file of sources) {
    const text = readFileSync(join(root, file), 'utf8');
    text.split('\n').forEach((line, i) => {
      const at = `${file}:${i + 1}`;
      for (const m of line.matchAll(/\{\s*level:\s*'(error|warn)',\s*(code:\s*'([A-Z0-9-]+)')?/g)) {
        if (!m[3]) { if (!/code\b/.test(line)) problems.push(`${at} issue without a code`); continue; }
        if (!RULES[m[3]]) problems.push(`${at} unknown code ${m[3]}`);
        else if (RULES[m[3]].level !== m[1]) problems.push(`${at} ${m[3]} is ${m[1]} here but ${RULES[m[3]].level} in the catalogue`);
      }
      if (/(validate|measurement-rules|schema|registry)\.js$/.test(file)) {
        for (const m of line.matchAll(/\b(err|warn|error|bad)\(([^)]{0,40})/g)) {
          if (/^(code|\s*$)/.test(m[2]) || /=>|function/.test(line.slice(0, m.index))) continue;
          const code = /^'([A-Z0-9-]+)'/.exec(m[2])?.[1];
          if (!code) problems.push(`${at} ${m[1]}() call without a code: ${m[0]}`);
          else if (!RULES[code]) problems.push(`${at} unknown code ${code}`);
        }
      }
    });
  }
  assert.deepEqual(problems, []);
});

test('a real build raises only catalogued codes at their catalogued level', () => {
  const wb = loadTables(join(root, 'data'));
  const { db, issues } = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'test' });
  for (const i of issues) {
    assert.ok(RULES[i.code], `${i.where}: no code for "${i.message}"`);
    assert.equal(i.level, RULES[i.code].level, `${i.code} level`);
  }
  // EST-WIDE is absent because no material in this snapshot has an imprecise estimate beside a usable published
  // value it could have shown; the thirteen that used to raise it publish nothing for the headline, so they are
  // EST-THIN (m47). A build that raises EST-WIDE again means the model is ignoring evidence it has. A declared
  // variant's value is not such evidence where the material has other products: its headline sets it apart (D57), as
  // PA6's does Nanovia PA Rail's XY modulus since m168.
  //
  // EST-REJECTED appeared with b20: a bronze-filled and a steel-filled PLA publish 3.9 and 3.13 g/cm³, which is
  // true of the products and outside anything the model can learn a PLA's density from. Each grade declares the
  // load with the Variant D57 asks for, and the model keeps the value out rather than learning a PLA that weighs
  // like bronze. What the assertion above guards is that every code is catalogued at its catalogued level; this
  // list is the record of which ones a real build raises, and a code entering it is a thing to explain, as here.
  //
  // EST-CONFLICT appeared with PLAN-REMAINING 2.1: the observations the model had always down-weighted, and only
  // listed in the report, are a finding now, one per material, headline and kind, informational until the sweep.
  // EST-GRADE-OUTLIER arrived with the grade estimates (D81): a grade's own value, hidden, far from its prediction.
  // HEADLINE-UNESTIMATED arrived with the families' "polymer not stated" homes (D87, m142): they are declared not
  // estimated, so a headline none of their products publishes is listed rather than an error.
  // m216 preserves Spectrum's full no-heated-chamber sentence. Its reviewed typed state is authoritative,
  // while PARSE-UNREAD records that the temperature parser cannot read that prose; no finding is suppressed.
  assert.deepEqual([...new Set(issues.map((i) => i.code))].sort(), ['EST-CONFLICT', 'EST-FAMILY-ORDER', 'EST-GRADE-OUTLIER', 'EST-OUTLIER', 'EST-REJECTED', 'EST-SUMMARY', 'EST-THIN', 'FAMILY-ENTRIES', 'HEADLINE-UNESTIMATED', 'IMPACT-UNITS', 'NO-MEASUREMENTS', 'PARSE-UNREAD']);
});

test('provoked errors carry the code a reader looks up', () => {
  const wb = loadTables(join(root, 'data'));
  // A pin of a tensile modulus as a density.
  wb.Headlines.rows.push({ MaterialID: 'M020', HeadlineKey: 'density', MeasurementID: 'V000384', Reason: 'test' });
  wb.Grades.rows.find((g) => g.GradeID === 'G020-01').Role = 'study';
  // A printer maker's guide read from a source kept only to corroborate, and mapped to a family entry (D88).
  const guide = wb['Print guide'].rows[0];
  const corroborating = wb.Sources.rows.find((s) => s['Citation role'] === 'corroboration').SourceID;
  wb['Print guide'].rows.push({ ...guide, PrintGuideID: 'PG999', SourceID: corroborating });
  const family = wb.Materials.rows.find((m) => m.Scope === 'Family entry').MaterialID;
  wb['Print guide materials'].rows.push({ MaterialID: family, PrintGuideID: guide.PrintGuideID, Reason: 'test', 'Reviewed by': 'test' });
  // "enclosed" declared by a maker's own profile, and by a guide row that says no enclosure is needed (D90).
  const enclosed = { 'Chamber state': 'enclosed', 'Chamber requirement': 'required', 'Parse review': 'test' };
  Object.assign(wb['Print setup'].rows[0], enclosed);
  Object.assign(wb['Print guide'].rows.find((r) => r['Enclosure state'] === 'not-needed'), enclosed);
  // And (D93) by a maker's profile that asks for an enclosure with no temperature, of a type the guide asks one for,
  // where another profile of its product states the chamber: the first such profile the tables hold.
  const guideEnclosed = new Set(wb['Print guide'].rows.filter((r) => r['Chamber state'] === 'enclosed').map((r) => r.PrintGuideID));
  const enclosedTypes = new Set(wb['Print guide materials'].rows.filter((r) => guideEnclosed.has(r.PrintGuideID)).map((r) => r.MaterialID));
  const stating = wb['Print setup'].rows.filter((r) => enclosedTypes.has(r.MaterialID) && r['Chamber state'] === 'range');
  const beside = wb['Print setup'].rows.find((r) => r['Enclosure state'] === 'recommended' && r['Chamber °C'] === 'Not published'
    && stating.some((s) => s.GradeID === r.GradeID && s !== r));
  Object.assign(beside, enclosed);
  // The core database: these codes are the compiler's, which the estimate stage cannot remove.
  const { db, issues } = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'test', estimates: false });
  const codes = new Set(issues.filter((i) => i.level === 'error').map((i) => i.code));
  assert.ok(codes.has('HEADLINE-SELECTION-INVALID'), [...codes].join(' '));
  assert.ok(codes.has('GRADE-ROLE-ID'), [...codes].join(' '));
  assert.ok(codes.has('PRINT-GUIDE-REFERENCE'), [...codes].join(' '));
  assert.ok(codes.has('PRINT-GUIDE-MATERIAL'), [...codes].join(' '));
  const enclosedAt = issues.filter((i) => i.code === 'PROCESS-ENCLOSED').map((i) => i.where.split(' ')[0]);
  assert.deepEqual([...new Set(enclosedAt)].sort(), ['print_guide', 'profiles'], 'a profile and a guide row that needs no enclosure may not declare it');
  assert.ok(issues.some((i) => i.code === 'PROCESS-ENCLOSED' && i.where === `profiles ${beside.ProfileID}` && /states its chamber/.test(i.message)), `${beside.ProfileID}: a stated chamber beside it decides`);
  const schema = checkData(join(root, 'data'), join(root, 'schema')).issues;
  assert.deepEqual(schema, []);
});

test('docs/RULES.md lists every code', () => {
  const doc = readFileSync(join(root, 'docs/RULES.md'), 'utf8');
  for (const code of Object.keys(RULES)) assert.ok(doc.includes(`\`${code}\``), code);
});
