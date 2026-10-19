#!/usr/bin/env node
// What became of each of the research package's 827 findings (the research intake, stage 10): applied, by which stage and
// migration; already in the data; or left, and why. Written to archive/research-2026-10-19/disposition.csv, the record the
// next research round starts from.
//
// The answer is read from the data, not from memory: a record the finding names (or a record of the product it names,
// from the document it cites) that the round changed, the commit that changed it, and the stage that commit belongs to.
// What no record shows is left, with the reason its outcome gives (a scoped negative, a question for the owner or a maker)
// or the triage's (ingest/intake.mjs: a later copy's reading the registered sheet does not print, a value judged right).
//
//   node docs/audits/2026-10-19-research-intake/ingest/disposition.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsvText, readCsv, csvText } from '../../../../build/src/csv.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../../..');
const PACKAGE = '/Users/farid/Documents/H2C-v2.1-Review-2026-09-27/filament-atlas-research/output';
const OUT = join(ROOT, 'archive/research-2026-10-19/disposition.csv');
const rows = (p) => readCsv(p).records.map((r) => r.values);
const at = (rev, table) => {
  const text = rev ? execFileSync('git', ['show', `${rev}:data/tables/${table}.csv`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }) : null;
  return (text ? parseCsvText(text, table).records : readCsv(join(ROOT, `data/tables/${table}.csv`)).records).map((r) => r.values);
};
const KEYS = { measurements: 'MeasurementID', profiles: 'ProfileID', sources: 'SourceID', grades: 'GradeID', polymers: 'PolymerID', prices: 'PriceID', page_context: 'PageContextID', chamber_need: 'RuleID', evidence: 'EvidenceID', material_summaries: 'MaterialID' };
// The round's commits, oldest first, and what each was; the working tree last.
const STAGES = [
  ['9b2f4706', null, null],
  ['5815246e', 'stage 2', 'm452 (corrections the research found; D168)'],
  ['71137cf6', 'stages 3 and 4', 'm453 (batch b48) and m454 (readings)'],
  ['ee10d9e4', 'stage 5b', 'CN17 switched to deciding'],
  ['4789e5c1', 'stage 6', 'm455 (price batch p06)'],
  [null, 'stages 7 to 9', 'm456 (FormFutura public links), code fixes, the Nylon-GF summary'],
];
const snapshot = (rev) => Object.fromEntries(Object.entries(KEYS).map(([t, k]) => [t, new Map(at(rev, t).map((r) => [r[k], JSON.stringify(r)]))]));
const changedIn = new Map(); // `${table}:${id}` -> stage label
let prev = snapshot(STAGES[0][0]);
for (const [rev, stage, what] of STAGES.slice(1)) {
  const next = snapshot(rev);
  for (const t of Object.keys(KEYS)) for (const [id, v] of next[t]) if (prev[t].get(id) !== v && !changedIn.has(`${t}:${id}`)) changedIn.set(`${t}:${id}`, `${stage}: ${what}`);
  prev = next;
}
const now = Object.fromEntries(['measurements', 'profiles', 'grades', 'sources', 'prices', 'polymers'].map((t) => [t, at(null, t)]));
const sourceOfDoc = (doc) => {
  if (!doc) return null;
  if (!/^NEW-/.test(doc)) return doc;
  const tail = doc.slice(4);
  return now.sources.find((s) => s.SourceID.endsWith(tail))?.SourceID ?? { 'NEW-3db72a183ffa': 'R-COLORFABB-PRINT-20260928-e02f420a2e56', 'NEW-fe20e69c8fdc': 'R-POLYMAKER-PANCHROMA-TDS-V2-1' }[doc] ?? null;
};
const later = new Set(rows(join(ROOT, 'docs/audits/2026-10-19-research-intake/later/copies.csv')).filter((c) => c.registered === 'yes').map((c) => c.of));
const gradeRecords = (gradeId, sourceId) => ['measurements', 'profiles'].flatMap((t) => now[t].filter((r) => r.GradeID === gradeId && (!sourceId || r.SourceID === sourceId)).map((r) => `${t}:${r[KEYS[t]]}`));

const out = [];
for (const f of rows(join(PACKAGE, 'findings.csv'))) {
  const doc = /doc=([A-Za-z0-9_.-]+)/.exec(f.evidence ?? '')?.[1];
  const source = sourceOfDoc(doc);
  const id = f.target_id;
  let disposition = 'left', stage = '', why = '';
  const touched = (keys) => keys.map((k) => changedIn.get(k)).find(Boolean);
  const hit =
    f.target_type === 'measurement' ? touched([`measurements:${id}`])
      : f.target_type === 'profile' ? touched([`profiles:${id}`])
        : f.target_type === 'grade' ? touched([`grades:${id}`, ...gradeRecords(id, source)]) ?? (f.outcome !== 'NOT-FOUND-SEARCHED' ? touched(gradeRecords(id, null).filter((k) => source && now[k.split(':')[0]].find((r) => r[KEYS[k.split(':')[0]]] === k.split(':')[1])?.SourceID === source)) : null)
          : f.target_type === 'source' ? touched([`sources:${id}`])
            : f.target_type === 'polymer' ? touched([`polymers:${id}`])
              : f.target_type === 'maker-family' || f.target_type === 'material' ? (/chamber/i.test(`${f.summary} ${f.proposed_change}`) && /polyolefin|FL300PE|Braskem/i.test(`${f.summary} ${f.evidence}`) ? touched(['chamber_need:CN17']) : null)
                : null;
  if (f.outcome === 'CODE-CAUSE') { disposition = 'applied'; stage = 'stage 7: code fixes'; why = 'The build change the finding proposed, with a regression test.'; }
  // A FormFutura sheet the research found served publicly with the registered bytes: its URL is what changed (m456).
  else if (hit && (!['NOT-FOUND-SEARCHED', 'NEEDS-MAKER', 'CONFIRMED-AS-RECORDED'].includes(f.outcome) || (f.target_type === 'source' && /m456/.test(hit)))) { disposition = 'applied'; stage = hit; why = 'A record it names, or its product\'s record from the document it cites, was changed or added by this stage.'; }
  else if (f.outcome === 'CONFIRMED-AS-RECORDED') { disposition = 'already-in-data'; why = `The page confirms the held record.${hit ? ` (The record changed for another reason in ${hit}.)` : ''}`; }
  else if (f.outcome === 'NOT-FOUND-SEARCHED') why = 'Searched and not found (the package\'s scoped negative); the gap stays open (OPEN-PROBLEMS).';
  else if (f.outcome === 'NEEDS-MAKER') why = 'A question only the maker can answer (handoffs.csv).';
  else if (f.outcome === 'NEEDS-OWNER') why = 'A question for the owner (handoffs.csv); the owner\'s answers of 2026-10-19 are D168 and the polyolefins chamber row, applied where a record shows it.';
  else if (f.outcome === 'NEEDS-CAPTURE') why = 'A price the pipeline captures live; p06 took what the pages stated (prices/review-p06.mjs).';
  else if (f.target_type === 'source' && later.has(id)) { disposition = 'already-in-data'; why = 'A later copy of a registered sheet: not registered (D131); its held records were compared with it in stage 8 (later/compare.csv, later/read-results.csv).'; }
  else why = 'Not applied: the triage judged the held record right, kept a later copy\'s reading only where the registered sheet prints the same line, or held it for the owner (ingest/intake.mjs, readings/r1-dropped.csv, proposals/r1-reviewed/held.csv).';
  out.push({ FindingID: f.finding_id, Task: f.task_id, Target: `${f.target_type} ${id}`, Outcome: f.outcome, Disposition: disposition, Stage: stage, Why: why });
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, csvText(['FindingID', 'Task', 'Target', 'Outcome', 'Disposition', 'Stage', 'Why'], out));
const count = (k) => Object.entries(out.reduce((a, r) => ({ ...a, [r[k]]: (a[r[k]] ?? 0) + 1 }), {}));
console.log(JSON.stringify({ findings: out.length, byDisposition: count('Disposition'), byStage: count('Stage') }));
