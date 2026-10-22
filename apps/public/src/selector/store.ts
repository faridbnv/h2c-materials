// The selector's state and what changes it (WP-26): the old page's main.js `state`, its recompute and its actions, as one store the components
// read. Every decision, count and sentence below is the engine's or the facts layer's (packages/engine, packages/pages); this file only asks them
// and keeps the answer. The old page redrew by hand after each action and put focus back by hand; here a change of state is a change of what the
// components show, and Vue keeps the elements (and the focus in them) that did not change.
//
// `state` is a shallow reactive object: its own properties are tracked, and the objects it holds (the database, the scenario, the engine's
// answers) are the engine's plain objects, never wrapped, because the engine matches a requirement by identity and a proxy is not the object.
// An action that changes the scenario in place calls `changed()`, which recomputes and tells the components.
import { shallowReactive, markRaw } from 'vue';
import { baseContextOf, browserEngine, candidatesOf, contextOf } from '@atlas/engine/browser';
import type { BaseContext } from '@atlas/engine/browser';
import { UNKNOWN_POLICY, normalizePolicy } from '@atlas/engine/port/constraints.ts';
import { indexById } from '@atlas/engine/port/indices.ts';
import { matchesQuery } from '@atlas/engine/port/search.ts';
import { DECISIONS_MAX, SHORTLIST_MAX, applyAssumptions, fromHash, newScenario, toHash } from '@atlas/engine/port/scenario.ts';
import { goalAxes } from '@atlas/engine/port/workspace.ts';
import { dayWords, provenanceWords } from '@atlas/pages/facts/dates';
import { esc } from '@atlas/pages/facts/format';
import { setEnvironmentLabels, setH2cBaseline, screenedByKind, unknownGroups, unknownGroupWords, POLICY_CONTROL, POLICY_LABELS } from '@atlas/pages/facts/labels';
import { useRegistry } from '@atlas/pages/facts/registry';
import type { Loose } from '@atlas/pages/loose';
import type { Loaded } from '../parts.ts';
import { candidateCount } from './start.ts';
import { sortForColumnSet } from './table.ts';
import { PRINTABLE } from './templates.ts';

/** Which verdicts a policy shows by default. Strict shows what passed; Explore also shows what could not be evaluated. One place, so the boot path, the mode buttons and a scenario import cannot drift apart. */
export const defaultShowStates = (policy: string): Set<string> =>
  (policy === UNKNOWN_POLICY.EXPLORATION ? new Set(['PASS', 'UNKNOWN']) : new Set(['PASS']));

/** The verdicts in the order every count names them, never alphabetical: "FAIL + PASS" read as a ranking. */
const VERDICT_ORDER = ['PASS', 'UNKNOWN', 'FAIL'];

/** The lenses this selector draws. The others a saved scenario may name (Ashby, parallel lines, coverage, compare) arrive with part 2 and open on the table. */
export const LENSES = [
  { id: 'table', label: 'Table', title: 'The candidates as a sortable list' },
  { id: 'explain', label: 'Why excluded', title: 'Which requirement removed how many materials' },
] as const;

export interface Notice { readonly id: number; readonly text: string }

/** An empty list, and an absent value, of a named type: what a literal `[] as T[]` or `null as T | null` would say, without asserting. */
const emptyList = <T>(): T[] => [];
const nothing = <T>(): T | null => null;

export function createStore(loaded: Loaded, hooks: { readonly loadEstimates: () => Promise<Loose>; readonly loadDrawerParts: (id: string) => Promise<{ readonly detail: Loose; readonly shared: Loose }> }) {
  const db: Loose = markRaw(loaded.model);
  const facts = markRaw(loaded.facts);
  const base: BaseContext = markRaw(baseContextOf(browserEngine, loaded.model));
  const gradeById: Map<string, Loose> = markRaw(new Map(db.grades.map((g: Loose) => [g.id, g])));
  setEnvironmentLabels(db.meta.environmentCategories);
  setH2cBaseline(db.meta.h2cBaseline);
  useRegistry(db.registry);

  const materialIds = () => new Set<string>(db.materials.map((m: Loose) => m.id));
  const gradeIds = () => new Set<string>(db.grades.filter((g: Loose) => !g.retired).map((g: Loose) => g.id));
  // A drawer-only headline (D139) is no scenario key: a link or file naming one is dropped like an unknown key.
  const headlineKeys = () => new Set<string>(db.registry.headlines.filter((h: Loose) => !h.drawerOnly).map((h: Loose) => h.key));
  const validationOptions = () => ({ materialIds: materialIds(), headlineKeys: headlineKeys(), gradeIds: gradeIds() });

  const state: Loose = shallowReactive({
    db, facts, gradeById, release: loaded.release,
    scenario: null, ctx: null,
    lens: 'table', search: '', sort: { key: 'name', dir: 'asc' }, columnSet: 'properties',
    // Set when switching column sets had to drop the sort, so the table can say so.
    sortNotice: null,
    // Estimates are an Explore-mode aid only; Strict neither shows them nor lets them decide.
    useEstimates: true,
    // Which constraint verdicts the table shows. The status-bar chips toggle these, which is what makes them controls rather than decoration.
    showStates: new Set(['PASS']),
    // Whether materials held out of Include as unlikely (a property that does not apply, an estimate, resin data) are shown anyway.
    showScreened: false,
    selectedMaterialId: null, drawerTab: 'Overview',
    // Which panel occupies the drawer: a material, or the save-and-share panel. One slot.
    panel: null,
    highlightMeasurement: null, highlightSource: null,
    baseline: null, shortlistNotice: null,
    materials: [], selection: null, rows: [], searchExcluded: [], searchFamilies: [], examined: [], annealGain: null,
    sortOverride: false,
    // Messages for the reader: what an unreadable link or a refused file used to say in a dialog.
    notices: emptyList<Notice>(),
    // What the page is waiting for before it may show a result: the estimates part, when Explore with estimates is asked.
    pending: nothing<'estimates'>(),
    estimates: loaded.estimates ?? null,
    estimatesProblem: nothing<Loose>(),
    // How many drawers are fetching their material's parts: with `pending`, whether the page is still waiting for something (data-busy).
    drawerLoading: 0,
    // Bumped when the engine's answer changed (the drawer depends on it), and when anything the table draws changed (`vrev`): components read a
    // plain object the engine owns (the scenario), which Vue cannot see change, through these.
    rev: 0, vrev: 0,
  });

  const touch = () => { state.vrev++; };
  let noticeId = 0;
  const say = (text: string) => { state.notices = [...state.notices, { id: ++noticeId, text }]; };

  // ------------------------------------------------------------------ scenario hydration

  /**
   * Make a validated scenario the running state. One function for startup, file import and anything else that replaces the question, because
   * import used to set the scenario and forget the lens, the baseline, the columns, the estimates switch and the open material.
   */
  function hydrate(scenario: Loose) {
    state.scenario = scenario;
    state.showStates = defaultShowStates(scenario.unknownPolicy);
    state.showScreened = false;
    state.selectedMaterialId = scenario.openMaterial ?? null;
    state.panel = state.selectedMaterialId ? 'material' : null;
    state.drawerTab = 'Overview';
    state.highlightMeasurement = null;
    state.highlightSource = null;
    state.useEstimates = scenario.useEstimates !== false;
    state.columnSet = scenario.columnSet ?? 'properties';
    state.sortNotice = null;
    state.baseline = scenario.baseline ?? null;
    state.sortOverride = false;
    state.lens = LENSES.some((l) => l.id === scenario.lens) ? scenario.lens : 'table';
  }

  // ------------------------------------------------------------------ derived state

  /** Whether the answer this scenario asks needs the estimates part (Explore, with the switch on). */
  const needsEstimates = (scenario: Loose) => normalizePolicy(scenario.unknownPolicy) === UNKNOWN_POLICY.EXPLORATION && scenario.useEstimates !== false;

  function recompute() {
    const { scenario } = state;
    scenario.unknownPolicy = normalizePolicy(scenario.unknownPolicy);
    const ctx = markRaw(contextOf(browserEngine, base, scenario));
    state.ctx = ctx;
    const materials = candidatesOf(browserEngine, db, scenario);
    const selection = browserEngine.constraints.runSelection(materials, scenario.constraints, ctx);
    state.selection = selection;
    // What annealing would add (D99), said beside the question and one press away: the materials that pass only once a
    // product may be judged annealed at the schedule its sheet states.
    state.annealGain = null;
    if (scenario.constraints.length && !ctx.anneal) {
      const now = new Set(selection.evaluations.filter((e: Loose) => e.verdict === 'PASS').map((e: Loose) => e.materialId));
      state.annealGain = browserEngine.constraints.runSelection(materials, scenario.constraints, { ...ctx, anneal: true, annealMaxC: null }).evaluations
        .filter((e: Loose) => e.verdict === 'PASS' && !now.has(e.materialId)).map((e: Loose) => e.materialId);
    }
    state.materials = materials;
    applySearch();
  }

  /** The part of recompute that follows the search: typing in the box does not run the selection again. */
  function applySearch() {
    const { ctx, selection, materials } = state;
    const q = state.search.trim();
    const byId = new Map<string, Loose>(materials.map((m: Loose) => [m.id, m]));
    // Searching a family's name finds its members and says what the family is, so "PA-CF" answers
    // with PA6-CF, PA12-CF and the rest rather than with nothing, or with one of them twice.
    state.searchFamilies = q ? db.materials.filter((m: Loose) => m.familyEntry && matchesQuery(m, q)) : [];
    const productsOf = (m: Loose) => ctx.productsByMaterial?.get(m.id) ?? [];
    const members = new Set(state.searchFamilies.flatMap((f: Loose) => f.familyEntry.members.map((x: Loose) => x.id)));
    const all = selection.evaluations.map((e: Loose) => ({ material: byId.get(e.materialId), evaluation: e }));
    const found = all.filter(({ material: m }: Loose) => matchesQuery(m, q, productsOf(m)) || members.has(m.id));
    state.examined = found;
    const visible = (e: Loose) => state.showStates.has(e.verdict) && (!e.screened || state.showScreened);
    state.rows = found.filter(({ evaluation: e }: Loose) => visible(e));
    // Search the whole database, not only what survived the filters: the hits the filters removed are kept here and
    // shown in their own group with the criterion that removed them.
    state.searchExcluded = q ? found.filter(({ evaluation: e }: Loose) => !visible(e)) : [];
  }

  // ------------------------------------------------------------------ url state

  let hashTimer: ReturnType<typeof setTimeout> | null = null;
  function pushHash() {
    if (hashTimer !== null) clearTimeout(hashTimer);
    hashTimer = setTimeout(() => { history.replaceState(null, '', `#${toHash(state.scenario)}`); }, 250);
  }
  /** Write the address now. Before a part's failure reaches the stale-shell guard, which may reload the page: the reload keeps
   *  only what the address holds, and the debounced write above may not have happened yet. */
  function flushHash() {
    if (hashTimer !== null) clearTimeout(hashTimer);
    hashTimer = null;
    history.replaceState(null, '', `#${toHash(state.scenario)}`);
  }

  /** The estimates part, when the question asks for it: the page computes nothing until it has arrived (the completeness rule). */
  async function ensureEstimates(): Promise<void> {
    if (!needsEstimates(state.scenario) || state.estimates) return;
    state.pending = 'estimates';
    state.estimatesProblem = null;
    try {
      state.estimates = await hooks.loadEstimates();
    } catch (error) {
      flushHash();
      state.estimatesProblem = error;
      return;
    } finally {
      state.pending = null;
    }
  }

  /** Recompute, unless the part the answer needs has not arrived. */
  async function render() {
    if (needsEstimates(state.scenario) && !state.estimates) {
      await ensureEstimates();
      if (state.estimatesProblem) return;
    }
    recompute();
    state.rev++;
    touch();
  }

  const changed = () => { void render(); pushHash(); };

  // ------------------------------------------------------------------ actions

  const actions = {
    changed,
    sort(key: string) {
      state.sortNotice = null;
      // A column order chosen while a goal ranks the table: the goal stays (the ranks and the export keep it), and the rows follow the column until the goal is chosen again.
      state.sortOverride = true;
      state.sort = state.sort.key === key
        ? { key, dir: state.sort.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'name' || key === 'family' ? 'asc' : 'desc' };
      touch();
    },
    togglePin(id: string) {
      const s = state.scenario.shortlist;
      const i = s.indexOf(id);
      if (i >= 0) s.splice(i, 1);
      else if (s.length < SHORTLIST_MAX) s.push(id);
      else {
        const m = db.materials.find((x: Loose) => x.id === id);
        state.shortlistNotice = `The shortlist holds ${SHORTLIST_MAX}, so ${m?.name ?? id} was not added. Remove one first.`;
        touch();
        return;
      }
      state.shortlistNotice = null;
      void render(); pushHash();
    },
    // The open material lives in the URL, so a link can point straight at one. A tab can be named,
    // so a Coverage cell lands on the evidence it describes rather than on the Overview.
    openMaterial(id: string, tab = 'Overview') {
      state.selectedMaterialId = id; state.drawerTab = tab; state.panel = 'material';
      state.highlightMeasurement = null; state.highlightSource = null;
      state.scenario.openMaterial = id;
      touch(); pushHash();
    },
    setDrawerTab(tab: string) { state.drawerTab = tab; state.highlightMeasurement = null; state.highlightSource = null; touch(); },
    // From a measurement to the source that published it: the Sources tab (internally still "Evidence"), taken to that source's block.
    openSource(sourceId: string) {
      state.drawerTab = 'Evidence';
      state.highlightMeasurement = null;
      state.highlightSource = sourceId;
      touch();
    },
    closeDrawer() {
      state.selectedMaterialId = null; state.scenario.openMaterial = null; state.panel = null;
      touch(); pushHash();
    },
    openMeasurement(id: string) {
      const m = db.measurements.find((x: Loose) => x.id === id);
      if (!m) return;
      state.selectedMaterialId = m.materialId;
      state.scenario.openMaterial = m.materialId;
      state.panel = 'material';
      state.drawerTab = 'Evidence';
      state.highlightMeasurement = id;
      state.highlightSource = null;
      touch(); pushHash();
    },
    openScenario() { state.panel = 'scenario'; touch(); },
    setBaseline(id: string) {
      state.baseline = id || null;
      state.scenario.baseline = state.baseline;
      touch(); pushHash();
    },
    setPolicy(p: string) {
      const policy = normalizePolicy(p);
      state.scenario.unknownPolicy = policy;
      // Reset the view to the policy's own default so the change is visible in the table, not just in a label.
      state.showStates = defaultShowStates(policy);
      state.showScreened = false;
      state.scenario.plot.layers = { ...(state.scenario.plot.layers ?? {}), unresolved: null };
      void render(); pushHash();
    },
    toggleEstimates(on: boolean) { state.useEstimates = on; state.scenario.useEstimates = on; void render(); pushHash(); },
    toggleScreened() { state.showScreened = !state.showScreened; applyAndTouch(); },
    setColumns(which: string) {
      const before = { sort: state.sort, columnSet: state.columnSet };
      state.columnSet = which;
      state.scenario.columnSet = which;
      // A sort by a column the new set does not show falls back to name, and the table says so: a list that reorders
      // itself without a word reads as the data changing.
      state.sort = sortForColumnSet(state.sort, which);
      state.sortNotice = state.sort === before.sort ? null : { key: before.sort.key, from: before.columnSet, to: which };
      touch(); pushHash();
    },
    // Back to the results the policy counts as candidates. This used to switch on FAIL as well, so "show everything that matched" filled the table with materials that had failed.
    showAllStates() {
      state.showStates = defaultShowStates(state.scenario.unknownPolicy);
      state.showScreened = false;
      applyAndTouch();
    },
    toggleState(verdict: string) {
      const next = new Set<string>(state.showStates);
      if (next.has(verdict)) {
        // The last visible kind stays on. Its chip is disabled and says so.
        if (next.size === 1) return;
        next.delete(verdict);
      } else next.add(verdict);
      state.showStates = next;
      applyAndTouch();
    },
    setSearch(text: string) { state.search = text; applyAndTouch(); },
    clearSearch() { state.search = ''; applyAndTouch(); },
    // Rank the survivors by a goal (D83): a performance index over each material's passing products. Since D107 it is one
    // goal for the table, the chart and the export, and choosing it prepares the chart's axes and scales in one action.
    setGoal(id: string) {
      const index = id ? indexById(id) : null;
      state.scenario.rankBy = index ? index.id : null;
      if (index) Object.assign(state.scenario.plot, goalAxes(index), { indexM: null });
      state.sortOverride = false;
      state.sortNotice = null;
      touch(); pushHash();
    },
    // Judge products annealed where their sheets state a schedule (D99), from the line that says what it would add.
    allowAnnealing() { state.scenario.anneal = true; changed(); },
    // Ask all three of the H2C's print checks: nozzle, bed and chamber (D101).
    checkPrintable() {
      state.scenario.constraints = state.scenario.constraints.filter((c: Loose) => !(c.kind === 'gate' && PRINTABLE.some((p) => p.gate === c.gate)));
      state.scenario.constraints.push(...PRINTABLE.map((c) => ({ ...c })));
      changed();
    },
    // A template sets requirements, not the evidence policy (the screening review, C08 and V23): the reader's Leave out or
    // Include stays as it was, and the result chips go back to that mode's defaults.
    applyTemplate(t: Loose) {
      state.scenario.constraints = t.constraints.map((c: Loose) => ({ ...c }));
      state.scenario.template = t.name;
      state.showStates = defaultShowStates(state.scenario.unknownPolicy);
      state.showScreened = false;
      if (state.panel === 'scenario') state.panel = null;
      actions.setLens('table');
      void render(); pushHash();
    },
    setLens(lens: string) {
      state.lens = LENSES.some((l) => l.id === lens) ? lens : 'table';
      state.scenario.lens = lens;
      touch(); pushHash();
    },
    reset() {
      state.scenario.constraints = [];
      state.scenario.template = null;
      changed();
    },
    // Removes the whole criterion. It was labelled "Relax", which suggests loosening a threshold.
    removeConstraint(constraint: Loose) {
      state.scenario.constraints = state.scenario.constraints.filter((c: Loose) => c !== constraint);
      void render(); pushHash();
    },
    // Choose a product, or unchoose it (D103): the exact product, the state its answer is in, the release and the day.
    toggleDecision(gradeId: string) {
      const list = state.scenario.decisions ?? (state.scenario.decisions = []);
      const i = list.findIndex((d: Loose) => d.gradeId === gradeId);
      if (i >= 0) list.splice(i, 1);
      else if (list.length < DECISIONS_MAX) {
        const entry = state.selection.evaluations.flatMap((e: Loose) => e.products ?? []).find((p: Loose) => p.gradeId === gradeId);
        list.push({ gradeId, stateId: entry?.state?.id ?? null, release: db.meta.release?.id ?? null, chosenOn: new Date().toISOString().slice(0, 10), note: null, tests: [] });
      } else {
        state.shortlistNotice = `At most ${DECISIONS_MAX} products can be chosen. Remove one first.`;
        touch();
        return;
      }
      state.shortlistNotice = null;
      void render(); pushHash();
    },
    // A test result the team recorded for a chosen product: its own evidence, kept with the decision (D103).
    addTestResult(gradeId: string, result: Loose) {
      const d = (state.scenario.decisions ?? []).find((x: Loose) => x.gradeId === gradeId);
      if (!d) return;
      d.tests = [...(d.tests ?? []), result];
      state.rev++;
      touch();
    },
    setDecisionNote(gradeId: string, note: string) {
      const d = (state.scenario.decisions ?? []).find((x: Loose) => x.gradeId === gradeId);
      if (d) d.note = note || null;
      pushHash();
    },
    clearShortlist() { state.scenario.shortlist = []; state.shortlistNotice = null; void render(); pushHash(); },
    dismissNotice(id: number) { state.notices = state.notices.filter((n: Notice) => n.id !== id); },
    say,
    /** A scenario from a file, a link or a start: replaces the question whole. */
    replaceScenario(scenario: Loose) { hydrate(scenario); void render(); pushHash(); },
  };

  /** A change of what is shown that leaves the selection as it is: the rows follow the chips and the search. */
  function applyAndTouch() { applySearch(); touch(); }

  // ------------------------------------------------------------------ the page's own views of the state

  /** The hidden materials by what hid them (D148): how many a property that does not apply holds out, and how many the estimates switch does, by an estimate or by resin reference data. */
  function screenedKinds(evaluations: Loose[]) {
    const out = { notApplicable: 0, bySwitch: 0, estimate: 0, polymer: 0 };
    for (const e of evaluations) {
      if (!e.screened) continue;
      const by = screenedByKind(e);
      if (by.notApplicable.length) out.notApplicable++;
      if (by.estimate.length || by.polymer.length) out.bySwitch++;
      if (by.estimate.length) out.estimate++;
      if (by.polymer.length) out.polymer++;
    }
    return out;
  }

  /** Whether the HIDDEN chip is on screen: once something is held out of Include. A property that does not apply holds a material out whatever the estimates switch says (D148). */
  const screenedChipShown = () => state.scenario.constraints.length > 0
    && state.scenario.unknownPolicy === UNKNOWN_POLICY.EXPLORATION && state.selection.counts.screened > 0;

  /**
   * What the rows on screen are, in words that add up to their number: the candidates among them (of how many, when not
   * all are shown), then those shown for another reason. Each row is exactly one of these, so the parts always sum to the count.
   */
  function shownBreakdown(rows: Loose[], candidates: number): string {
    let mine = 0, unchecked = 0, screened = 0, failed = 0;
    for (const { evaluation: e } of rows) {
      if (e.eligible) mine++;
      else if (e.screened) screened++;
      else if (e.verdict === 'FAIL') failed++;
      else unchecked++;
    }
    if (mine === rows.length && rows.length === candidates) return '';
    const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
    return [
      !candidates ? 'no candidates' : mine === candidates ? plural(candidates, 'candidate') : `${mine} of the ${plural(candidates, 'candidate')}`,
      unchecked ? `${unchecked} could not be checked` : null,
      screened ? `${screened} hidden` : null,
      failed ? `${failed} failed` : null,
    ].filter(Boolean).join(', ');
  }

  /** The headline count. One function, because the search handler used to write its own version straight into the element and undo everything this one says. */
  function countHtml(): string {
    const shown = state.rows.length;
    // The materials the missing-data rule keeps as candidates. It was called "eligible", a word defined nowhere on screen.
    const candidates = state.selection.candidates.length;
    const tested = state.scenario.constraints.length > 0;
    // Nothing has been asked yet, so nothing has passed. Reading "102 shown PASS" on a blank screen implies a test that never ran.
    // HIDDEN is named with the verdicts while its chip is on, as it adds rows too.
    const label = tested ? [...VERDICT_ORDER.filter((v) => state.showStates.has(v)),
      ...(screenedChipShown() && state.showScreened ? ['HIDDEN'] : [])].join(' + ') : '';
    const held = state.searchExcluded.length;
    const parts = tested ? shownBreakdown(state.rows, candidates) : '';
    const head = tested
      ? `${shown} shown <small>${esc(label)}${parts ? ` · ${esc(parts)}` : ''}</small>`
      : `${shown} material${shown === 1 ? '' : 's'} <small>no requirements set</small>`;
    return head + (state.search ? ` <small>matching "${esc(state.search)}"${held ? `, plus ${held} listed below that your requirements exclude` : ''}</small>` : '');
  }

  /** A status chip's text, led by a box that is ticked while its results are shown. The chips are filters, and read as a tally when their on and off states differed only by an outline. */
  const chipText = (on: boolean, text: string) => `${on ? '☑' : '☐'} ${text}`;

  /** The status bar: the three verdict chips, the HIDDEN chip, and the estimates switch's line. */
  function statusView() {
    const { counts } = state.selection;
    const tested = state.scenario.constraints.length > 0;
    const explore = state.scenario.unknownPolicy === UNKNOWN_POLICY.EXPLORATION;
    const kinds = screenedKinds(state.selection.evaluations);
    const chips = [['PASS', counts.pass], ['UNKNOWN', counts.unknown], ['FAIL', counts.fail]].map(([verdict, n]: Loose) => {
      const on = state.showStates.has(verdict);
      const last = on && state.showStates.size === 1;
      // UNKNOWN counts the hidden materials too, never FAIL. Its title names the groups it holds (stage 3d): most of them
      // were measured and missed, which "could not be checked for missing data" had hidden.
      const groups = unknownGroupWords(unknownGroups(state.selection.evaluations, { explore }));
      const what: Record<string, string> = { PASS: 'that meet every requirement', FAIL: 'that fail a requirement',
        UNKNOWN: `UNKNOWN materials${groups ? ` (${groups}${screenedChipShown() ? '; the HIDDEN chip shows the hidden ones' : ''})` : ''}` };
      return {
        verdict, hidden: !tested, on, text: chipText(on, `${verdict} ${n}`), disabled: n === 0 || last,
        title: n === 0 ? `No material is ${verdict} under the current requirements`
          : last ? `Showing the ${n} ${what[verdict]}. At least one kind of result stays shown.`
          : on ? `Showing the ${n} ${what[verdict]}. Click to hide them.`
          : `Click to show the ${n} ${what[verdict]}.`,
      };
    });
    const why = [kinds.notApplicable ? `${kinds.notApplicable} because a required property does not apply to them (such as an elastomer's HDT)` : null,
      kinds.estimate ? `${kinds.estimate} by an estimate that clearly misses a requirement` : null,
      kinds.polymer ? `${kinds.polymer} by resin reference data reporting the base polymer attacked or dissolved` : null].filter(Boolean).join('; ');
    const s = counts.screened;
    const screened = {
      hidden: !screenedChipShown(), on: state.showScreened, text: chipText(state.showScreened, `HIDDEN ${counts.screened}`),
      // No sentence for nothing hidden: the chip is off screen then, and "0 UNKNOWN materials are hidden: ." read as a fault.
      title: !s || !why ? ''
        : state.showScreened
          ? `Showing the ${s} hidden UNKNOWN material${s === 1 ? '' : 's'}: ${why}. Click to hide ${s === 1 ? 'it' : 'them'} again.`
          : `${s} UNKNOWN material${s === 1 ? ' is' : 's are'} hidden: ${why}. None failed a measured value. Click to show ${s === 1 ? 'it' : 'them'}.`,
    };
    // How many it screened, under the switch: only what the switch hides, by an estimate or by resin reference data: a property
    // that does not apply hides a material whatever the switch says, and is not the switch's to count (D148).
    const ruled = explore && state.useEstimates && kinds.bySwitch ? `${kinds.bySwitch} hidden` : '';
    return { tested, explore, chips, screened, ruled };
  }

  /** Provenance: the release and when its documents were read, at the end of the status bar. */
  const provenance = () => ({
    text: provenanceWords(db.meta.release?.id, facts.documentsRead),
    title: `Release ${db.meta.release?.id ?? 'unidentified'}, built ${dayWords(db.meta.build)} from database snapshot ${db.meta.snapshot}; `
      + `${candidateCount(db)} materials, ${db.meta.counts.measurements} measurements. Open Save / share for the full record.`,
  });

  // ------------------------------------------------------------------ start

  /** Open from the link in the address (or a new question), as the page loads. */
  function start(hash: string) {
    let fromLink: Loose = null;
    let problem: string | null = null;
    try {
      fromLink = fromHash(hash, db.meta, validationOptions());
    } catch (error) {
      problem = error instanceof Error ? error.message : String(error);
    }
    hydrate(fromLink?.scenario ?? newScenario(db.meta));
    if (problem) say(`This link could not be read, so the selector opened with nothing set. ${problem}`);
    for (const w of fromLink?.warnings ?? []) say(w);
  }

  /** A link pasted into an open tab changes only the fragment, which reloads nothing: without this the old selection stayed on screen (audit 2026-09-15, A-07). */
  function followHash(hash: string): boolean {
    if (hash === toHash(state.scenario)) return false;
    let next: Loose;
    try {
      next = fromHash(hash, db.meta, validationOptions());
    } catch (error) {
      say(`This link could not be read, and nothing was changed.\n\n${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
    hydrate(next?.scenario ?? newScenario(db.meta));
    for (const w of next?.warnings ?? []) say(w);
    return true;
  }

  return {
    state, actions, render, start, followHash, hydrate, validationOptions,
    countHtml, statusView, provenance, ensureEstimates,
    loadDrawerParts: async (id: string) => {
      try {
        return await hooks.loadDrawerParts(id);
      } catch (error) {
        flushHash();
        throw error;
      }
    },
    policyControl: POLICY_CONTROL, policyLabels: POLICY_LABELS,
  };
}

export type Store = ReturnType<typeof createStore>;
