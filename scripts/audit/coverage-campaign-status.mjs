// Reproduce the campaign's current worklist without confusing a coverage mark with completed research.
// Requires a current build. verify:fast runs this after its build/tests; --check writes nothing.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { parseCsvText, csvText } from '../../build/src/csv.js';
import { coverageMatrix } from '../../app/js/engine/coverage.js';
import { productGates } from '../../app/js/engine/products.js';
import { loadSchemas } from '../../build/src/schema.js';
import { diffTables } from '../data/diff-lib.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const audit = join(root, 'docs/audits/2026-09-30-coverage-expansion');
const read = name => JSON.parse(readFileSync(join(audit, name)));
const db = JSON.parse(readFileSync(join(root, 'dist/db.json')));
const frozen = read('frozen-targets.json'), completed = read('completed-outcomes.json');
const targets = new Map(frozen.Targets.map(t => [t.TaskID, t]));
assert.equal(targets.size, frozen.Targets.length, 'Duplicate frozen target');
const outcomes = new Map(completed.Outcomes.map(o => [o.TaskID, o]));
assert.equal(outcomes.size, completed.Outcomes.length, 'Duplicate completed target');
const mats = db.materials.filter(m => !m.excluded && !m.familyEntry);
const materialById = new Map(db.materials.map(m => [m.id, m]));
const grades = db.grades.filter(g => !g.retired && !/-R\d+$/.test(g.id));
const gradeById = new Map(grades.map(g => [g.id, g]));
const products = grades.filter(g => mats.some(m => m.id === g.materialId));
assert.deepEqual([...targets.keys()].filter(k => k.startsWith('APP-')).sort(), mats.map(m => 'APP-' + m.id).sort(), 'Frozen material scope changed');
assert.deepEqual([...targets.keys()].filter(k => k.startsWith('PROD-')).sort(), products.map(g => 'PROD-' + g.id).sort(), 'Frozen product scope changed');

const reviewed = new Set();
for (const o of outcomes.values()) {
  assert.ok(targets.has(o.TaskID), 'Outcome outside frozen scope: ' + o.TaskID);
  assert.ok(o.Commit && o.Packet && o.Outcome, 'Incomplete disposition: ' + o.TaskID);
  execFileSync('git', ['cat-file', '-e', o.Commit + '^{commit}'], { cwd: root });
  if (!reviewed.has(o.Packet)) {
    const packet = readFileSync(join(audit, o.Packet + '-packet.json'));
    const review = read(o.Packet + '-review.json');
    assert.equal(review.input_sha256, createHash('sha256').update(packet).digest('hex'), 'Review no longer pins ' + o.Packet);
    assert.equal(review.overall_verdict ?? review.verdict, 'APPROVE', 'Unapproved packet ' + o.Packet);
    reviewed.add(o.Packet);
  }
}
const count = prefix => {
  const total = [...targets.keys()].filter(k => k.startsWith(prefix)).length;
  const done = [...outcomes.keys()].filter(k => k.startsWith(prefix)).length;
  return { total, completed: done, remaining: total - done };
};
const matrix = coverageMatrix(mats, db.coverage, ['Post-processing / application']);
const application = { 'Evidence recorded': 0, 'Reviewed with limitations': 0, Gap: 0, Unassessed: 0 };
for (const m of matrix) application[m.cells[0].status ?? 'Unassessed']++;
const categories = ['acid', 'alkali', 'organic-solvent', 'oil-grease', 'uv-outdoor', 'moisture', 'hydrolysis'];
const scope = new Set(mats.map(m => m.id));
const env = db.evidence.filter(e => scope.has(e.materialId) && categories.includes(e.category));
const gateRows = grades.map(g => productGates(materialById.get(g.materialId), g));
const delta = {};
// Use the canonical record diff: relationship tables have composite identities, not the first column.
const { tables: schemas } = loadSchemas(join(root, 'schema'));
const versions = new Map();
const version = (side, name) => {
  const key = side + ':' + name;
  if (!versions.has(key)) versions.set(key, side === 'from'
    ? execFileSync('git', ['show', frozen.BaselineCommit + ':data/tables/' + name + '.csv'], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
    : readFileSync(join(root, 'data/tables', name + '.csv'), 'utf8'));
  return versions.get(key);
};
const changes = diffTables(schemas, version);
for (const name of [...new Set(changes.map(c => c.table))].sort()) {
  const rows = changes.filter(c => c.table === name);
  const n = action => new Set(rows.filter(c => c.action === action && c.record !== '(column)').map(c => c.record)).size;
  delta[name] = { baseline: parseCsvText(version('from', name)).records.length, current: parseCsvText(version('to', name)).records.length,
    added: n('Added'), edited_existing: n('Edited'), removed: n('Removed') };
}
const commits = execFileSync('git', ['log', '--reverse', '--format=%H\t%s', frozen.BaselineCommit + '..' + completed.LatestCompletedDataCommit], { cwd: root, encoding: 'utf8' }).trim().split('\n').map(line => { const [hash, ...subject] = line.split('\t'); return { hash, subject: subject.join('\t') }; });
const status = {
  dataRelease: db.meta.release.id, latestCompletedDataCommit: completed.LatestCompletedDataCommit,
  frozenBaselineCommit: frozen.BaselineCommit, materialAssessments: count('APP-'), productPasses: count('PROD-'),
  applicationCells: application,
  environmentalRecordPresence: { scope: 'Seven exposure categories; exact grade records only, not polymer context or approvals', materials: new Set(env.map(e => e.materialId)).size, byCategory: Object.fromEntries(categories.map(c => [c, new Set(env.filter(e => e.category === c).map(e => e.materialId)).size])) },
  allCataloguePrintGates: { products: grades.length, nozzleKnown: gateRows.filter(g => g.nozzle.verdict !== 'unknown').length, chamberKnown: gateRows.filter(g => g.chamber.verdict !== 'unknown').length, chamberUnknown: gateRows.filter(g => g.chamber.verdict === 'unknown').length, dryingRequired: gateRows.filter(g => g.drying === 'required').length },
  databaseCounts: db.meta.counts, canonicalTableDelta: delta, commits,
  completionMeaning: 'Final evidenced bounded outcome, not resolved evidence, universal absence, product suitability or a selection PASS. Material judgments never close joined product passes.'
};
const targetRows = frozen.Targets.map(t => {
  const o = outcomes.get(t.TaskID), product = t.GradeID ? gradeById.get(t.GradeID) : null;
  const mid = product?.materialId ?? t.MaterialID;
  return { TaskID: t.TaskID, Kind: t.TaskID.startsWith('APP-') ? 'material-assessment' : 'joined-product-pass', BaselineMaterialID: t.MaterialID, CurrentMaterialID: mid, GradeID: t.GradeID ?? '', Material: materialById.get(mid)?.name ?? '', Manufacturer: product?.manufacturer ?? '', Product: product?.product ?? '', PriorityAtBaseline: t.Priority ?? '', CampaignStatus: o ? 'Final bounded outcome' : 'Pending', Outcome: o?.Outcome ?? '', CompletedCommit: o?.Commit ?? '', Packet: o ? o.Packet + '-packet.json' : '', Question: t.Question, StoppingRule: t.StoppingRule };
});
const pending = targetRows.filter(t => t.CampaignStatus === 'Pending');
const md = `# Coverage campaign: current status

Generated by \`npm run audit:coverage-status\` from the current build, frozen targets and approved committed outcomes. \`verify:fast\` checks it after building. Historical tranche counts in README.md describe their own releases.

Data release: **${status.dataRelease}**. Latest completed data commit: **${status.latestCompletedDataCommit.slice(0, 7)}**. Campaign baseline: **${status.frozenBaselineCommit.slice(0, 7)}**.

| Campaign work | Completed | Remaining |
|---|---:|---:|
| Material Application assessments | ${status.materialAssessments.completed}/${status.materialAssessments.total} | ${status.materialAssessments.remaining} |
| Joined product research passes | ${status.productPasses.completed}/${status.productPasses.total} | ${status.productPasses.remaining} |

The campaign is incomplete. Every assigned target is in [task-status.csv](task-status.csv); the exact pending subset is [remaining-targets.csv](remaining-targets.csv). The original questions, baseline record/source references, prior searches, dependencies and stopping rules are in [frozen-targets.json](frozen-targets.json). Current owners and names are resolved in the CSV; historical names remain in the frozen input. [completed-outcomes.json](completed-outcomes.json) retains each final outcome and its committing evidence packet. Originals stay private.

## What coverage means now

Application has **${application['Evidence recorded']} Evidence recorded, ${application['Reviewed with limitations']} Reviewed with limitations, ${application.Gap} Gap and ${application.Unassessed} Unassessed** cells across ${mats.length} materials. A completed campaign assessment may still be a gap. An already-filled historical cell may still await this campaign review. Maker claims and these judgments never create selection passes.

The seven exposure categories have exact-product records on **${status.environmentalRecordPresence.materials}/${mats.length} materials** (49 at baseline); UV/outdoor records on **${status.environmentalRecordPresence.byCategory['uv-outdoor']}** (6 before), hydrolysis on **${status.environmentalRecordPresence.byCategory.hydrolysis}** (0 before). These are record-presence counts, including qualified narrative, not product approvals or complete exposure conditions. Polymer context remains separate.

Across all ${grades.length} active catalogue products (including out-of-scope products), nozzle is known for ${status.allCataloguePrintGates.nozzleKnown}, chamber for ${status.allCataloguePrintGates.chamberKnown}, and chamber unknown for ${status.allCataloguePrintGates.chamberUnknown}; ${status.allCataloguePrintGates.dryingRequired} require drying. The frozen campaign has ${products.length} in-scope products. [build/snapshot/counts.md](../../../build/snapshot/counts.md) owns the other database counts.

## What was done

The campaign reviewed source ownership/conditions, recovered missing statements and bounded exposure records, corrected Insublend's identity, added scoped application judgments and exact print/drying guidance, preserved separate PCL methods and qualified UV coupon observations, corrected source text/certification attribution, and repaired qualifier rendering and missing-bound summary/calibration behavior. Catalogue size and the published measurement-estimate model were not expanded; prices were not refreshed.

| Canonical table | Added rows | Edited existing rows | Removed |
|---|---:|---:|---:|
${Object.entries(delta).map(([name, d]) => `| ${name} | ${d.added} | ${d.edited_existing} | ${d.removed} |`).join('\n')}

Rows are not unique useful findings or completed research targets. In particular, evidence.csv includes both know-how and environmental/application lanes. Active compiled counts differ from raw tables containing retired records.

| Commit | Change |
|---|---|
${commits.map(c => `| \`${c.hash.slice(0, 7)}\` | ${c.subject} |`).join('\n')}

The full source operations, corrections, holds and verification receipts are in [README.md](README.md) and its per-tranche packets/reviews. The latest two data commits passed 69 browser views and 300 rendered scenarios: [tenth-verification.json](tenth-verification.json) and [eleventh-verification.json](eleventh-verification.json). Independent review was AI, not human. Historical active-time/token use was not reliably measured.

## Changed answers across the whole campaign

Compared with the frozen 39bb487 build, the 15-question replay moves 10 of 18195 material/product answers: 7 UNKNOWN→PASS from the PAHT9825/Prografen print gates, and 3 Insublend-material FAIL→UNKNOWN answers after its correct product ownership/source evidence replaces the prior material basis. The 48 environmental/policy questions move no verdicts and remove 1 UV inference screen for Insublend under exploration-with-estimates. The 24 template/mode questions move 36 of 30744 answers. These suites overlap and their counts must not be summed. Source claims did not establish an environmental pass; the independent source/ownership review receipts remain in the tranche history.

Receipts: [frozen](campaign-frozen-replay.json), [environment](campaign-environment-replay.json), [templates](campaign-template-replay.json). They describe the implementation through 955a51b, not a prediction of future campaign yield. The Siraya Air supplemental hardening criterion also changed FAIL→PASS under the existing no-requirement-recorded contract, with its undisclosed-filler caveat; this was not a source approval of brass.

## What remains

1. Review the remaining ${status.materialAssessments.remaining} historical Application judgments against their named originals; update only when the evidence supports it. Completing these does not search every product.
2. Finish ${status.productPasses.remaining} joined product passes: application/finishing, twelve environmental categories, missing properties/comparison conditions, printer gates/drying/treatment/moisture states, source conflicts and reuse of prior price outcomes. Baseline missing fields are questions to reconcile, not claims they remain missing today.
3. Keep unreconciled identity/revision/specimen claims, printed certification scope, colour/recipe conflicts, coupled foaming states and other held findings in [OPEN-PROBLEMS.md](../../OPEN-PROBLEMS.md). Admission still needs original custody, independent deciding-evidence review, guarded injection, full verification and backup.
4. Human source spot-checks, team trial, physical tests, cold-check performance and partial private full-text/custody remain explicit limitations. The general import pause remains outside this bounded campaign; no manufacturer messages, catalogue growth or price refresh routine is authorized.

Continue in maker batches of at most 12 products, at most 5 reviewed batches per coherent tranche. Reuse originals and exact prior routes before new searches; do not reopen a completed search without a new source/revision or materially different question. Maintain each task's outcome in completed-outcomes.json after its verified commit, then regenerate this status. The effort recommendation is in [EFFORT-AND-VALUE.md](EFFORT-AND-VALUE.md); it is advice, not a change to the authorized scope.
`;
const outputs = new Map([
  ['STATUS.md', md], ['STATUS.json', JSON.stringify(status, null, 2) + '\n'],
  ['task-status.csv', csvText(Object.keys(targetRows[0]), targetRows)],
  ['remaining-targets.csv', csvText(Object.keys(targetRows[0]), pending)],
  ['table-delta.json', JSON.stringify(delta, null, 2) + '\n']
]);
for (const [name, text] of outputs) {
  const path = join(audit, name);
  if (process.argv.includes('--check')) assert.ok(existsSync(path) && readFileSync(path, 'utf8') === text, name + ' is stale; run npm run build && npm run audit:coverage-status');
  else writeFileSync(path, text);
}
console.log(`Campaign status: ${status.materialAssessments.completed}/${mats.length} material assessments; ${status.productPasses.completed}/${products.length} product passes; ${pending.length} pending targets. ${process.argv.includes('--check') ? 'Current.' : 'Written.'}`);
