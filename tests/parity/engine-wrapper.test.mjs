// WP-11: the typed engine wrapper (packages/engine). Parity (tests/parity/new-adapter.test.mjs) holds its answers equal to the
// old engine's; these tests hold the contract it adds: branded IDs, requirements by ID, reason codes beside unchanged text,
// RowResult rows, one createContext, and loud refusals. Needs dist/db.json (npm run build), so it lives in tests/parity, which CI runs after the build.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkDb } from '@atlas/data';
import { isGradeId, isMaterialId } from '@atlas/domain';
import { BoundaryError, createContext, defaultEngine, runEngine, scenarioFrom } from '@atlas/engine';
import { loadCorpus } from '../../packages/parity/src/corpus.ts';
import { REPO_ROOT } from '../../packages/engine/src/old-engine.ts';

const typedDb = () => {
  const checked = checkDb(JSON.parse(readFileSync(join(REPO_ROOT, 'dist', 'db.json'), 'utf8')));
  assert.ok(checked.ok, 'dist/db.json must satisfy the typed contract (run npm run build)');
  return checked.db;
};
const db = typedDb();
const corpus = loadCorpus();
const byId = (id) => corpus.cases.find((c) => c.id === id);
const ask = (id, options) => {
  const scenario = scenarioFrom(structuredClone(byId(id).scenario), db.meta);
  return { scenario, output: createContext(db, scenario, options).run() };
};
const STRICT = 'template/outdoor-structural-part/strict';
const EXPLORE = 'template/outdoor-structural-part/explore-estimates-anneal-conditioned';

test('createContext(db, scenario).run() answers every candidate: a material row, then a row for each of its products', () => {
  const { output } = ask(EXPLORE);
  const candidates = db.materials.filter((m) => !m.familyEntry);
  assert.equal(output.evaluations.length, candidates.length);
  assert.equal(output.counts.total, candidates.length);
  assert.equal(output.release, db.meta.release.id);
  let at = 0;
  for (const e of output.evaluations) {
    const material = output.rows[at++];
    assert.equal(material.materialId, e.materialId);
    assert.equal(material.productId, undefined);
    assert.equal(material.stateId, undefined);
    for (const p of e.products ?? []) {
      const row = output.rows[at++];
      assert.deepEqual([row.materialId, row.productId, row.stateId], [e.materialId, p.gradeId, p.state.id]);
    }
  }
  assert.equal(at, output.rows.length);
});

test('IDs at the boundary are the schema\'s: materials, grades, constraints (by position), and the engine\'s own treatment', () => {
  const { scenario, output } = ask(EXPLORE);
  assert.deepEqual(output.constraintIds, scenario.constraints.map((_, i) => `c${i}`));
  const known = new Set([...output.constraintIds, 'treatment']);
  for (const row of output.rows) {
    assert.ok(isMaterialId(row.materialId));
    if (row.productId !== undefined) assert.ok(isGradeId(row.productId));
    for (const r of row.requirements) assert.ok(known.has(r.constraintId), `${r.criterion} names ${r.constraintId}`);
  }
  // A result names its requirement by ID, and the body beside the ID is that requirement.
  for (const e of output.evaluations) {
    for (const r of e.results) {
      if (r.constraintId === 'treatment') assert.equal(r.constraint.kind, 'treatment');
      else assert.deepEqual(r.constraint, scenario.constraints[output.constraintIds.indexOf(r.constraintId)]);
    }
  }
});

test('requirements are matched by ID after a structured clone, where object identity is gone', () => {
  const { scenario, output } = ask(EXPLORE);
  const clone = structuredClone(output);
  assert.deepStrictEqual(clone, output, 'the whole answer is plain data');
  const sample = clone.evaluations.flatMap((e) => e.results).find((r) => r.constraintId === 'c0');
  assert.notStrictEqual(sample.constraint, scenario.constraints[0], 'the clone holds a copy, not the scenario\'s own object');
  assert.deepEqual(sample.constraint, scenario.constraints[0]);
  assert.equal(clone.constraintIds.indexOf(sample.constraintId), 0);
});

// The sentence each code names (core/reason-codes.ts comments); a code on a sentence it does not name is a wrong code.
const STEMS = {
  'gate.no-print-profile': /^No print profile recorded/,
  'gate.no-requirement-published': /^No requirement published/,
  'gate.no-temperature-published': /^No temperature published/,
  'gate.no-chamber-needed': /^(No heated chamber needed|The source says no enclosure is needed)/,
  'gate.enclosure-counts': /^(An enclosure is asked for|Its maker asks for an enclosure)/,
  'gate.chamber-dash': /^The source prints "/,
  'gate.chamber-recommended-no-temperature': /^A heated chamber is recommended with no temperature/,
  'gate.enclosure-asked-no-temperature': /^Asks for an enclosure but gives no chamber temperature/,
  'gate.chamber-by-kind': /^No chamber stated; of the \d+ makers of /,
  'gate.within-low-end': /^At the low end of the maker's window/,
  'gate.edge': /^The H2C reaches only the bottom of the maker's window/,
  'gate.recommends-at-least-above': /^Recommends at least /,
  'gate.requires-at-least-above': /^Requires at least /,
  'gate.needs-at-least-within': /^Needs at least /,
  'gate.needs-up-to-within': /^Needs up to /,
  'gate.recommends-up-to-above': /^Recommends up to /,
  'gate.requires-up-to-above': /^Requires up to /,
  'numeric.not-applicable': /^Does not apply: /,
  'numeric.estimate-screened': /^No qualifying measurement\. Estimated .*, which cannot meet this requirement\. Hidden; not measured/,
  'numeric.estimate-vetoed': /^No qualifying measurement\. Estimated .* would fail, but its own .* bounds it from below and meets the requirement, so it is not hidden/,
  'numeric.estimate-may-still-meet': /^No qualifying measurement\. Estimated .* would fail, but the range it may screen on, .*, could still meet it/,
  'numeric.estimate-cannot-screen': /^No qualifying measurement\. Estimated .* would fail, but /,
  'numeric.estimate-not-failing': /^No qualifying measurement\. Estimated .*; (plausible|possible), but never enough to pass/,
  'numeric.ceiling-only': /^Published .* on a bar its sheet does not describe\./,
  'numeric.as-published-not-described': /^Published .* on a test bar its document does not describe as printed/,
  'numeric.as-published-load-not-stated': /^Published .* without the test load, so it is not used at its value/,
  'numeric.as-published-no-orientation': /^Published .* without a usable specimen orientation, so it is not used/,
  'numeric.other-state': /^Published /,
  'numeric.no-price-in-shops': /^No price in the sampled shops/,
  'numeric.related-values-only': /^No qualifying measurement\. Published related values: /,
  'numeric.not-published': /^Not published in the sampled sources; ask the maker or test a printed coupon/,
  'numeric.bound-straddles': /^Published (more than|less than|at least|at most) .*, a bound that leaves the threshold on either side of the value/,
  'numeric.range-straddles': /^Reported range .* straddles the threshold/,
  'numeric.assumed': /^Assumed .* \(a scenario assumption, not published\)/,
  'numeric.published': /^Published /,
  'ledger.sheets-disagree': /./,
  'ledger.bound': /./,
  'treatment.as-printed': /^Used as printed$/,
  'treatment.schedule-incomplete': /^Its values in this state come from bars annealed /,
  'treatment.annealing-allowed': /^Needs annealing /,
  'scope.beyond-h2c': /^Beyond H2C capability: more heat than the H2C gives$/,
  'scope.within-h2c': /^Within H2C capability$/,
  'h2c-status.not-own-spool': /is not Bambu Lab's own spool; its family is "/,
  'h2c-status.recorded': /^Recorded status is "/,
  'nozzle.hardened-available': /^A hardened nozzle prints abrasive and non-abrasive filament$/,
  'nozzle.requires-hardened': /^A source states it needs an abrasion-resistant nozzle/,
  'nozzle.no-special-concern': /^A source states no special nozzle concern/,
  'nozzle.harder-than-brass': /^The maker asks for a nozzle harder than brass, not necessarily a hardened one: /,
  'nozzle.wear-warned': /^The maker warns of nozzle wear and asks for no hardened nozzle: /,
  'nozzle.fibre-treated-abrasive': /^Fibre-filled, and no source states the nozzle it needs/,
  'nozzle.unfilled-no-requirement': /^No hardened-nozzle requirement recorded$/,
  'nozzle.named-filler-check': /^No hardened-nozzle requirement recorded for its .* filler, so check the product/,
  'nozzle.undisclosed-filler-check': /^No hardened-nozzle requirement recorded\. The filler is not disclosed, so check the product/,
  'price.not-listed': /^No sampled Canadian retailer listed (this product|this material) when sampled$/,
  'price.out-of-stock': /lists it, but no sampled offer of (this product|this material) was in stock on /,
  'price.listed': /, seen \S+$/,
  'drying.stated': /^Drying (schedule published|optional|not needed)/,
  'drying.no-statement': /^No drying statement in the sampled sources$/,
  'facet.not-recorded': /^Facet not recorded$/,
  'facet.filler-recorded': /^Recorded as /,
  'facet.role': /^A (support or interface|build) material$/,
  'facet.recorded': /^Recorded as /,
  'environment.narrative-only': /records in this snapshot are narrative only; no reducible verdict exists for any material$/,
  'environment.no-own-statement': /^No statement of this product's own\. /,
  'environment.no-statement': /^No statement for this (product|material)$/,
  'environment.contrary': /^\d+ statement\(s\) report /,
  'environment.mixed-exposures': /^Mixed across exposures: /,
  'environment.matching-and-limited': /only limited resistance \(.*\)/,
  'environment.matching-and-unclear': /more give no clear verdict: /,
  'environment.matching': /\. This covers the exposures stated, not every chemical in the class$/,
  'environment.limited-only': /^\d+ statement\(s\) report only limited resistance/,
  'environment.no-verdict': /^Statements exist, but none gives a verdict/,
  'polymer.basis': /^No statement for this material\. Its base polymer /,
  'polymer.screened': /\. Hidden; not tested on this product$/,
  'polymer.would-screen': /\. It would hide this material with estimates and resin data on$/,
  'evidence.no-criterion': /^No evidence criterion set$/,
  'evidence.checks': /./,
};

test('every requirement result carries a reason code, set by the engine beside the unchanged text, and the code names the sentence it sits on', () => {
  const ids = [...corpus.cases.filter((c) => c.group === 'template').map((c) => c.id), ...corpus.cases.filter((c) => c.group === 'random').slice(0, 120).map((c) => c.id)];
  const seen = new Map();
  let results = 0;
  for (const id of ids) {
    for (const row of ask(id).output.rows) {
      assert.equal(row.reasons.length, row.requirements.length);
      row.requirements.forEach((r, i) => {
        results++;
        assert.equal(row.reasons[i].text, r.reason, 'the entry carries the engine\'s text, word for word');
        assert.equal(row.reasons[i].code, r.reasonCode);
        assert.deepEqual(row.reasons[i].params, {});
        assert.ok(r.reasonCode !== undefined, `no code on "${r.reason}"`);
        seen.set(r.reasonCode, (seen.get(r.reasonCode) ?? 0) + 1);
        assert.ok(STEMS[r.reasonCode], `no stem for ${r.reasonCode}`);
        assert.match(r.reason, STEMS[r.reasonCode], `${r.reasonCode} on "${r.reason}"`);
      });
    }
  }
  assert.ok(results > 100_000 && seen.size >= 60, `a real comparison: ${results} results, ${seen.size} different codes`);
});

test('RowResult: counts, Best and listing places agree with the evaluation they come from', () => {
  for (const id of [STRICT, EXPLORE]) {
    const { output } = ask(id);
    const materialRows = output.rows.filter((r) => r.productId === undefined);
    const places = materialRows.map((r) => r.listingRank).sort((a, b) => a - b);
    assert.deepEqual(places, places.map((_, i) => i + 1), `${id}: listing places are 1..N once each`);
    for (const e of output.evaluations) {
      const row = materialRows.find((r) => r.materialId === e.materialId);
      assert.equal(row.best, e.gradeId);
      assert.deepEqual(row.counts, e.counts ? { pass: e.counts.pass, fail: e.counts.fail, untested: e.counts.untested } : { pass: 0, fail: 0, untested: 0 });
      for (const p of e.products ?? []) {
        const prow = output.rows.find((r) => r.productId === p.gradeId);
        assert.equal(prow.listingRank, row.listingRank, 'a product sits at its material\'s place');
        assert.equal(prow.counts.pass + prow.counts.fail + prow.counts.untested, p.results.length);
      }
    }
    if (id === STRICT) assert.deepEqual(materialRows.map((r) => r.materialId), output.evaluations.map((e) => e.materialId), 'Strict lists in the engine\'s order');
  }
});

test('a material with no product on record is judged on its own headline and says so', () => {
  const { output } = ask(EXPLORE);
  const none = output.evaluations.filter((e) => e.counts === null);
  assert.ok(none.length > 0, 'the data holds materials with no product on record');
  for (const e of none) assert.deepEqual([e.products, e.share], [[], null]);
});

test('the wrapper never edits the database it is given', () => {
  const before = JSON.stringify(db);
  ask(EXPLORE);
  ask(STRICT);
  assert.equal(JSON.stringify(db), before);
});

test('assumptions are the scenario\'s: applied to copies of the materials, exactly as the page applies them', () => {
  const base = scenarioFrom(structuredClone(byId(STRICT).scenario), db.meta);
  const scenario = { ...base, assumptions: [{ materialId: '*', property: 'tensileStrengthXY', value: 500 }], constraints: [{ kind: 'numeric', property: 'tensileStrengthXY', operator: '>=', value: 400, mandatory: true }] };
  const plain = createContext(db, { ...scenario, assumptions: [] }).run();
  const assumed = createContext(db, scenario).run();

  // The same selection by hand, with a context built here, not by the wrapper.
  const groupByMaterial = (rows) => {
    const groups = new Map();
    for (const row of rows) {
      if (!groups.has(row.materialId)) groups.set(row.materialId, []);
      groups.get(row.materialId).push(row);
    }
    return groups;
  };
  const ctx = {
    db, measurementsByMaterial: groupByMaterial(db.measurements), evidenceByMaterial: groupByMaterial(db.evidence), polymerEvidenceByMaterial: groupByMaterial(db.polymerEvidence ?? []),
    coverageByMaterial: groupByMaterial(db.coverage), productsByMaterial: defaultEngine.products.productsByMaterial(db), unknownPolicy: 'strict', useEstimates: false, showEstimates: false,
    evidence: 'comparable', anneal: false, annealMaxC: null, moisture: 'dry',
  };
  const units = Object.fromEntries(db.registry.headlines.map((h) => [h.key, h.unit]));
  const candidates = db.materials.filter((m) => !m.familyEntry).map((m) => defaultEngine.scenario.applyAssumptions(m, scenario.assumptions, units).material);
  const direct = defaultEngine.constraints.runSelection(candidates, scenario.constraints, ctx);

  assert.deepEqual(assumed.evaluations.map((e) => e.verdict), direct.evaluations.map((e) => e.verdict));
  assert.notDeepEqual(assumed.evaluations.map((e) => e.verdict), plain.evaluations.map((e) => e.verdict), 'the assumption must have moved something');
  assert.equal(JSON.stringify(db.materials.find((m) => !m.familyEntry).headline.tensileStrengthXY).includes('"assumption":true'), false, 'the database itself is untouched');
});

test('a release is required, and every part of the input must name it', () => {
  const scenario = scenarioFrom(structuredClone(byId(STRICT).scenario), db.meta);
  const lean = { ...db, meta: Object.fromEntries(Object.entries(db.meta).filter(([k]) => k !== 'release')) };
  assert.throws(() => createContext(lean, scenario), (e) => e instanceof BoundaryError && /no release/.test(e.message));
  assert.equal(createContext(lean, scenario, { release: '0123456789ab' }).release, '0123456789ab');
  assert.throws(() => createContext(db, scenario, { release: '0123456789ab' }), /the database is release/);
  assert.throws(() => createContext(lean, scenario, { release: 'not-a-release' }), /release ID/);
  const input = { release: db.meta.release.id, core: db, scenario };
  assert.equal(runEngine(input).rows.length > 0, true);
  assert.throws(() => runEngine({ ...input, estimates: { release: '0123456789ab', status: 'withheld' } }), /estimates is release/);
  assert.throws(() => runEngine({ ...input, detail: new Map([['M001', { release: '0123456789ab', materialId: 'M001' }]]) }), /detail M001 is release/);
});

test('what the engine says is checked on the way out: a bad ID, an unknown word or a requirement it was not given is an error', () => {
  const scenario = scenarioFrom(structuredClone(byId(STRICT).scenario), db.meta);
  const tamper = (change) => ({
    ...defaultEngine,
    constraints: { ...defaultEngine.constraints, runSelection: (m, c, ctx) => { const s = defaultEngine.constraints.runSelection(m, c, ctx); return { ...s, evaluations: s.evaluations.map(change) }; } },
  });
  const run = (engine) => createContext(db, scenario, { engine }).run();
  assert.throws(() => run(tamper((e) => ({ ...e, materialId: 'bogus' }))), (e) => e instanceof BoundaryError && /material ID/.test(e.message));
  assert.throws(() => run(tamper((e) => ({ ...e, group: 'sort-of' }))), /group/);
  assert.throws(() => run(tamper((e) => ({ ...e, results: e.results.map((r) => ({ ...r, status: 'MAYBE' })) }))), /requirement status/);
  assert.throws(() => run(tamper((e) => ({ ...e, results: e.results.map((r) => ({ ...r, constraintId: 'c99' })) }))), /did not hold/);
  // A copy of the requirement is no error: results are matched by ID, not by the object.
  assert.doesNotThrow(() => run(tamper((e) => ({ ...e, results: e.results.map((r) => ({ ...r, constraint: { ...r.constraint } })) }))));
  assert.throws(() => run(tamper((e) => (e.products?.length ? { ...e, products: e.products.map((p) => ({ ...p, state: { ...p.state, id: 'annealed:120:016' } })) } : e))), /state ID/);
  // A state's parts must be what its identifier says.
  assert.throws(() => run(tamper((e) => (e.products?.length ? { ...e, products: e.products.map((p) => ({ ...p, state: { ...p.state, moisture: 'conditioned' } })) } : e))), /not what the identifier says/);
  assert.throws(() => run(tamper((e) => (e.products?.length ? { ...e, products: e.products.map((p) => ({ ...p, state: { ...p.state, treatment: { tempC: 120, hours: 16 } } })) } : e))), /not what the identifier says/);
  assert.throws(() => run(tamper((e) => ({ ...e, share: 'most' }))), /share/);
});

test('a result the engine lists twice is one object here too, and a requirement ID the scenario supplies is checked', () => {
  const { output } = ask(EXPLORE);
  const material = output.evaluations.find((e) => e.counts === null && e.unresolved.length > 0);
  assert.ok(material, 'a material judged on its own headline with open requirements');
  for (const r of [...material.unresolved, ...material.failed]) assert.ok(material.results.includes(r), 'the same object as in results');
  const scenario = scenarioFrom(structuredClone(byId(STRICT).scenario), db.meta);
  const withId = (id) => ({ ...scenario, constraints: [{ ...scenario.constraints[0], id }, ...scenario.constraints.slice(1)] });
  assert.throws(() => createContext(db, withId(5)).run(), /constraint ID/);
  assert.throws(() => createContext(db, withId('has space')).run(), /constraint ID/);
  assert.throws(() => createContext(db, withId('treatment')).run(), /share the ID treatment/);
  assert.equal(createContext(db, withId('mine')).run().constraintIds[0], 'mine');
});

test('two requirements that share an ID are refused; the same object twice is told apart by place', () => {
  const scenario = scenarioFrom(structuredClone(byId(STRICT).scenario), db.meta);
  const [first] = scenario.constraints;
  const twice = createContext(db, { ...scenario, constraints: [first, first] }).run();
  assert.deepEqual(twice.constraintIds, ['c0', 'c1']);
  assert.throws(() => createContext(db, { ...scenario, constraints: [{ ...first, id: 'x' }, { ...scenario.constraints[1], id: 'x' }] }).run(), /share the ID x/);
  assert.throws(() => scenarioFrom({ ...byId(STRICT).scenario, constraints: [{ kind: 'bogus' }] }, db.meta), /not one a scenario may hold/);
  assert.throws(() => createContext(db, { ...scenario, constraints: [{ kind: 'bogus' }] }).run(), /Unsupported constraint kind/);
});
