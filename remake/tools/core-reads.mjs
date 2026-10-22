#!/usr/bin/env node
// Which fields of the compiled database does the engine read, and does the declaration of the core carry them? (WP-25; pack 02
// section 9.6.) The lists CORE_FIELDS and ESTIMATE_FIELDS (packages/domain/src/core/core-fields.ts) were first taken from reads like
// these. This tool runs the engine over questions with the whole database behind a recording Proxy, reads everything each answer
// carries (the parity harness reads it too, so a value the engine hands through unread still counts), and prints every read the
// declarations miss. A miss is a field to add to the declaration; the proof that the declaration is enough is
// `npm run parity -- --surface core --milestone`, which this tool does not replace (it sees only the reads of the questions it ran).
//
//   node remake/tools/core-reads.mjs [--every N] [--only PREFIX] [--all]
//     --every N   one random-group question in N, after the templates and the census (default 40; 0 = none)
//     --only P    only the questions whose ID starts with P (template/outdoor-structural-part/ for a quick look)
//     --all       print the paths read too, not only the misses
//   exit 0 every read is carried, 1 a read is missed, 2 the tool could not run. Needs the old build's dist/db.json.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isMain, repoRoot } from './wp-lib.mjs';

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const specOf = (spec, key) => (Object.hasOwn(spec, key) ? spec[key] : spec['*']);

/** Whether a read path ('grades[].estimate.density.lo', arrays as `[]`) is carried by a declaration. */
export function carries(spec, path) {
  let node = spec;
  for (const segment of path.split('.')) {
    if (node === true) return true;
    const child = specOf(node, segment.replace(/\[\]$/, ''));
    if (child === undefined) return false;
    node = child;
  }
  return true;
}

/** Whether the database holds the path anywhere (a field no row has is read as undefined by the engine whatever the declaration says). */
export function present(db, path) {
  const walk = (node, segments) => {
    if (segments.length === 0) return true;
    if (typeof node !== 'object' || node === null) return false;
    const [segment, ...rest] = segments;
    const key = segment.replace(/\[\]$/, '');
    const next = Array.isArray(node) ? node : [node];
    return next.some((n) => isObject(n) && Object.hasOwn(n, key) && (Array.isArray(n[key]) ? (rest.length === 0 || n[key].some((e) => walk(e, rest))) : walk(n[key], rest)));
  };
  return walk(db, path.split('.'));
}

/** A recording Proxy over `db`: every field read is added to `reads` (array positions as `[]`, methods and symbols not counted). */
export function recording(db, reads) {
  const cache = new WeakMap();
  const wrap = (object, path) => {
    if (typeof object !== 'object' || object === null) return object;
    const known = cache.get(object);
    if (known) return known;
    const isArray = Array.isArray(object);
    const proxy = new Proxy(object, {
      get(target, key, receiver) {
        const value = Reflect.get(target, key, receiver);
        if (typeof key === 'symbol' || key === 'toJSON') return value;
        if (isArray) return /^\d+$/.test(key) ? wrap(value, `${path}[]`) : value;
        if (typeof value === 'function') return value;
        const here = path === '' ? key : `${path}.${key}`;
        reads.add(here);
        return wrap(value, here);
      },
      has(target, key) {
        if (!isArray && typeof key === 'string') reads.add(path === '' ? key : `${path}.${key}`);
        return Reflect.has(target, key);
      },
    });
    cache.set(object, proxy);
    return proxy;
  };
  return wrap(db, '');
}

/**
 * The reads of the engine over `cases`, by what the question uses: `core` (strict and exploration without estimates) and `estimated`
 * (exploration with the switch on). `engineModule` is packages/engine's index; `register` sets the words layer's registry.
 */
export async function traceReads({ db, cases, engineModule, register }) {
  const { createContext, scenarioFrom, loadPortedEngine } = engineModule;
  const engine = await loadPortedEngine();
  register(db.registry);
  const core = new Set();
  const estimated = new Set();
  for (const c of cases) {
    const reads = c.scenario.unknownPolicy === 'exploration' && c.scenario.useEstimates !== false ? estimated : core;
    const proxy = recording(db, reads);
    const scenario = scenarioFrom(structuredClone(c.scenario), proxy.meta, engine);
    const answer = createContext(proxy, scenario, { engine }).run({ rankings: true });
    JSON.stringify(answer); // what the answer carries by reference is read here, as the parity harness reads it
  }
  return { core, estimated };
}

/**
 * The reads a declaration misses. `overlay` marks the estimate stage's own fields, which the estimates part may carry instead of the
 * core: a read of one of them in a question that does not use the estimates must be in the core.
 */
export function misses({ reads, db, coreSpec, estimateSpec, overlay }) {
  const missing = [];
  for (const path of reads.core) if (!carries(coreSpec, path) && present(db, path)) missing.push({ path, in: 'core' });
  for (const path of reads.estimated) {
    if (carries(coreSpec, path) || !present(db, path)) continue;
    if (overlay(path) && carries(estimateSpec, path)) continue;
    missing.push({ path, in: overlay(path) ? 'estimates' : 'core' });
  }
  return missing;
}

/** The estimate stage's own fields (build/src/estimate-stage.ts), as paths. */
export const isOverlay = (path) => /^grades\[\]\.(?:estimateVersion|estimate|estimateWithheld)(?:\.|$)/.test(path)
  || /^materials\[\]\.headline\.[^.]+\.(?:estimate|notApplicable)(?:\.|$)/.test(path)
  || /^materials\[\]\.print\.(?:nozzleEstimate|bedEstimate)(?:\.|$)/.test(path)
  || /^meta\.(?:estimateCoverage|estimateModel|printEstimates)(?:\.|$)/.test(path);

if (isMain(import.meta.url)) {
  try {
    const argv = process.argv.slice(2);
    const arg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
    const root = repoRoot();
    const url = (p) => pathToFileURL(join(root, p)).href;
    const [{ loadCorpus }, { engineCorpusCases }, engineModule, domain, registry] = await Promise.all([
      import(url('packages/parity/src/corpus.ts')), import(url('packages/parity/src/corpora.ts')), import(url('packages/engine/src/index.ts')),
      import(url('packages/domain/src/core/core-fields.ts')), import(url('app/js/ui/registry.js')),
    ]);
    const db = JSON.parse(readFileSync(join(root, 'dist', 'db.json'), 'utf8'));
    const every = Number(arg('--every') ?? 40);
    const only = arg('--only');
    const corpus = loadCorpus();
    const all = engineCorpusCases(corpus, db, false).filter((c) => (only ? c.id.startsWith(only) : true));
    const random = all.filter((c) => c.group === 'random');
    const cases = [...all.filter((c) => c.group !== 'random'), ...(every > 0 ? random.filter((_, i) => i % every === 0) : [])];
    console.log(`core-reads: ${cases.length} questions`);
    const reads = await traceReads({ db, cases, engineModule, register: (r) => registry.useRegistry(r) });
    const missing = misses({ reads, db, coreSpec: domain.CORE_FIELDS, estimateSpec: domain.ESTIMATE_FIELDS, overlay: isOverlay });
    console.log(`  read in the core's questions: ${reads.core.size} paths; in the estimates' questions: ${reads.estimated.size}`);
    if (argv.includes('--all')) for (const p of [...reads.core].sort()) console.log(`  ${p}`);
    for (const m of missing) console.log(`  MISSING from ${m.in}: ${m.path}`);
    console.log(missing.length ? `${missing.length} read(s) the declarations miss: add them to packages/domain/src/core/core-fields.ts` : 'every read is carried');
    process.exitCode = missing.length ? 1 : 0;
  } catch (e) {
    console.error(`core-reads failed: ${e.message}`);
    process.exitCode = 2;
  }
}
