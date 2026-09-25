// Makers' know-how (re-center phase 6, lane 3; GOALS step 5, scorecard C10).
//
// What a maker writes about printing and using its product beyond the numbers (what it is good for, its benefits and
// pitfalls, warping, precision, surface, adhesion between layers, moisture, nozzle wear, odour, supports, printing
// advice) is recorded in evidence.csv in the maker's own words, one statement per row, under the evidence domain
// "Makers' know-how" and a topic whose category is `know-how` (schema/vocab/environment-topics.csv). That category is
// not filterable, and this module takes its rows out of db.evidence altogether into db.knowHow, so nothing the engine
// reads can contain one: the environment criteria, the polymer-level layer (D64), coverage and the evidence counts see
// exactly what they saw before. The product panel ("What the maker says") is the one reader.
//
// Where a product's documents are silent the gap is shown, not hidden, and the state is derived here (D74: what the
// records prove is derived, not stored). The one fact the build cannot derive is which documents were read for
// know-how: a document with no statement may have been read and found silent, or never read. That is
// data/tables/know_how_reads.csv, one row per source and scope. A product's documents are the ones the tables already
// link to it (its own source, its profiles', its measurements', a source naming it in Applicable grades), and its state
// is the first of:
//   collected          at least one statement is recorded on the product;
//   searched-nothing   the maker's site was searched for it (Scope "maker site") and gave nothing, dated;
//   sheet-silent       its documents were read in full (Scope "document") and gave nothing; the site not yet searched;
//   no-document-read   none of its documents was read, because none is cached, or none was read yet.
// The same states are given for the three parts of the print recipe a sheet may leave out: the chamber (or the
// enclosure), drying before printing, and annealing the part after it. A recipe part is collected when the product's
// own profiles state it (lane 2, m136) or, for annealing, its measurements or an annealing statement give a schedule.

import { readCsv } from './csv.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { issue } from './rules.js';

const here = dirname(fileURLToPath(import.meta.url));

/** The evidence category every know-how topic maps to (schema/vocab/environment-categories.csv). */
export const KNOW_HOW = 'know-how';

/** The know-how topics, in the order the panel lists them: the topic vocabulary's know-how rows, in file order. */
export const KNOW_HOW_TOPICS = readCsv(join(here, '../../schema/vocab/environment-topics.csv')).records
  .map((r) => r.values).filter((t) => t.Category === KNOW_HOW).map((t) => t.Value);

export const STATE = {
  COLLECTED: 'collected',
  SEARCHED: 'searched-nothing',
  SILENT: 'sheet-silent',
  UNREAD: 'no-document-read',
};
const STATES = [STATE.COLLECTED, STATE.SEARCHED, STATE.SILENT, STATE.UNREAD];
export const RECIPE_PARTS = ['chamber', 'drying', 'annealing'];
const SCOPE = { DOCUMENT: 'document', SITE: 'maker site' };
const NA = 'Not applicable';

const tally = (keys) => Object.fromEntries(keys.map((k) => [k, 0]));
const latest = (dates) => (dates.length ? [...dates].sort().at(-1) : null);

/** The state of one product, or one part of its recipe, from whether it has what it needs and what was read. */
function stateOf(has, reads) {
  if (has) return STATE.COLLECTED;
  if (reads.searchedOn) return STATE.SEARCHED;
  if (reads.readOn) return STATE.SILENT;
  return STATE.UNREAD;
}

/**
 * Move the know-how statements out of db.evidence into db.knowHow, and give every active product and every material its
 * know-how state and the recipe states beside it. Issues use the ownership codes the rest of the evidence answers to.
 */
export function attachKnowHow(db, wb, issues) {
  const statements = db.evidence.filter((e) => e.category === KNOW_HOW);
  db.evidence = db.evidence.filter((e) => e.category !== KNOW_HOW);
  db.meta.counts.evidence = db.evidence.length;

  const gradeById = new Map(db.grades.map((g) => [g.id, g]));
  db.knowHow = statements.map((e) => {
    const g = gradeById.get(e.gradeId);
    if (g && g.materialId !== e.materialId) issues.push(issue('OWN-GRADE-MATERIAL', `evidence ${e.id}`, `Filed under ${e.materialId} but its grade ${e.gradeId} belongs to ${g.materialId}`));
    if (g?.retired) issues.push(issue('OWN-RETIRED-GRADE', `evidence ${e.id}`, `A know-how statement on retired grade ${e.gradeId}`));
    return { id: e.id, materialId: e.materialId, gradeId: e.gradeId, topic: e.topic, text: e.finding, sourceId: e.sourceId, locator: e.locator };
  });
  db.meta.counts.knowHow = db.knowHow.length;

  // Which sources were read, and how.
  const readOn = new Map(), searchedOn = new Map();
  for (const r of wb['Know-how reads']?.rows ?? []) (r.Scope === SCOPE.SITE ? searchedOn : readOn).set(r.SourceID, r['Read on']);

  // A product's documents: the sources the tables already link to it.
  const sourcesOf = new Map();
  const link = (gradeId, sourceId) => {
    if (!gradeId || gradeId === NA || !sourceId || sourceId === NA || !gradeById.has(gradeId)) return;
    (sourcesOf.get(gradeId) ?? sourcesOf.set(gradeId, new Set()).get(gradeId)).add(sourceId);
  };
  for (const g of db.grades) link(g.id, g.sourceId);
  for (const x of [...db.profiles, ...db.measurements, ...db.knowHow]) link(x.gradeId, x.sourceId);
  for (const s of db.sources) for (const id of String(s.applicableGrades ?? '').split(/[;,]\s*/)) link(id.trim(), s.id);

  const byGrade = new Map();
  for (const k of db.knowHow) (byGrade.get(k.gradeId) ?? byGrade.set(k.gradeId, []).get(k.gradeId)).push(k);
  // An annealing schedule the product's own records state: lane 2's statements (Post-processing, m136).
  const annealStated = new Set(db.evidence.filter((e) => e.category === 'post-processing' && /anneal/i.test(`${e.finding} ${e.exposure}`)).map((e) => e.gradeId));

  for (const g of db.grades) {
    if (g.retired) continue;
    const sources = [...(sourcesOf.get(g.id) ?? [])];
    const reads = {
      readOn: latest(sources.filter((s) => readOn.has(s)).map((s) => readOn.get(s))),
      searchedOn: latest(sources.filter((s) => searchedOn.has(s)).map((s) => searchedOn.get(s))),
    };
    const own = byGrade.get(g.id) ?? [];
    const topics = {};
    for (const t of KNOW_HOW_TOPICS) { const n = own.filter((k) => k.topic === t).length; if (n) topics[t] = n; }
    const p = g.print;
    g.knowHow = {
      state: stateOf(own.length > 0, reads),
      statements: own.length,
      topics,
      readOn: reads.readOn,
      searchedOn: reads.searchedOn,
      recipe: {
        chamber: stateOf(!!p && (p.chamber.state !== 'unknown' || p.enclosure !== 'unknown'), reads),
        drying: stateOf(!!p?.drying, reads),
        annealing: stateOf(!!p?.anneal?.length || annealStated.has(g.id), reads),
      },
    };
  }

  const materialStatements = new Map();
  for (const k of db.knowHow) if (k.gradeId === NA) materialStatements.set(k.materialId, (materialStatements.get(k.materialId) ?? 0) + 1);
  const products = { ...tally(STATES) }, materials = { ...tally(STATES) };
  for (const m of db.materials) {
    if (m.familyEntry) continue;
    const list = m.gradeIds.map((id) => gradeById.get(id)).filter((g) => g && !g.retired && g.knowHow);
    const count = (state, of = (g) => g.knowHow.state) => list.filter((g) => of(g) === state).length;
    const byState = Object.fromEntries(STATES.map((s) => [s, count(s)]));
    const makers = new Set(list.map((g) => g.manufacturer));
    const topics = {};
    for (const t of KNOW_HOW_TOPICS) {
      const withIt = list.filter((g) => g.knowHow.topics[t]);
      if (withIt.length) topics[t] = { makers: new Set(withIt.map((g) => g.manufacturer)).size, products: withIt.length };
    }
    const own = materialStatements.get(m.id) ?? 0;
    // The material's state is its most advanced product's: collected if any product (or the material itself) has a
    // statement; searched only when every product that was read was searched; otherwise silent if any was read.
    const state = byState[STATE.COLLECTED] || own ? STATE.COLLECTED
      : byState[STATE.SEARCHED] && !byState[STATE.SILENT] ? STATE.SEARCHED
      : byState[STATE.SILENT] ? STATE.SILENT : STATE.UNREAD;
    m.knowHow = {
      state, products: byState, makers: makers.size, topics, materialStatements: own,
      recipe: Object.fromEntries(RECIPE_PARTS.map((part) => [part, Object.fromEntries(STATES.map((s) => [s, count(s, (g) => g.knowHow.recipe[part])]))])),
    };
    materials[state]++;
    for (const s of STATES) products[s] += byState[s];
  }

  db.meta.knowHow = {
    topics: KNOW_HOW_TOPICS,
    statements: db.knowHow.length,
    products,
    materials,
    documentsRead: [...readOn.keys()].length,
    sitesSearched: [...searchedOn.keys()].length,
  };
}
