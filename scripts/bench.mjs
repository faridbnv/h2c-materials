#!/usr/bin/env node
// What the working loop costs, measured (F16; review finding A11): the build cold and warm, stage by stage, the page it
// bundles, the memory it peaks at, the sizes it ships, and each template's selection, on this machine and runtime.
//
//   npm run bench                     write build/reports/bench.json and print a short table
//   npm run bench -- --growth 2       also the largest chemical group's products twice over: the estimate stage at that size
//   npm run bench -- --growth 2,3     twice and three times over
//
// Each measurement runs in a process of its own, so a peak of memory is that step's and a warm cache is warm:
//
//   cold     the build with the cache off (H2C_NO_BUILD_CACHE=1): the schema gate, the load, buildDatabase's own stage
//            timings (compile, estimate, validate), the release, the reference and contract, the report and the bundle,
//            as build/src/index.js runs them
//   warm     the same with the build cache holding this result (a run before it stores one if it is missing), which is
//            what verify:fast pays when nothing the build reads changed; then each template's selection over every
//            material that is not a family entry, as the page runs it (strict, comparable values, as printed, dry)
//   growth   beside test/scale.check.js, which doubles everything: only the products of the chemical group with the most
//            measurements are copied, as new products of their own materials with their measurements and recipes. That
//            is how a maker's new PLA grades grow the one block the estimate stage solves cubically
//            (build/src/estimate/gaussian.js), and the uniform doubling does not show it. It measures; it gates nothing,
//            and it is not part of `npm run verify`.
//
// The page is bundled into a scratch folder, so dist/ stays as the last build wrote it. Times are wall-clock
// milliseconds on the machine named in the report; memory is the process's peak resident set (process.resourceUsage).

import { spawnSync, execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { cpus, loadavg, totalmem, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { readCsv, writeCsv } from '../build/src/csv.js';
import { checkData } from '../build/src/schema.js';
import { readSource } from '../build/src/source.js';
import { loadTables, snapshotDate } from '../build/src/load.js';
import { buildDatabase } from '../build/src/pipeline.js';
import { releaseIdentity } from '../build/src/release.js';
import { compileReference } from '../build/src/reference.js';
import { contractIssues } from '../build/src/contract.js';
import { formatReport } from '../build/src/validate.js';
import { estimateReportLines } from '../build/src/estimate/validate.js';
import { polymerEnvironmentReportLines } from '../build/src/polymer-environment.js';
import { bundle } from '../build/src/bundle.js';
import { runSelection } from '../app/js/engine/constraints.js';
import { TEMPLATES } from '../app/js/ui/templates.js';
import { pageContext } from './trace.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT = join(root, 'build/reports/bench.json');
const ms = (t) => Math.round(t);
const mb = (bytes) => Math.round(bytes / 104857.6) / 10;
const peakMB = () => Math.round(process.resourceUsage().maxRSS / 102.4) / 10; // maxRSS is in kilobytes

/** The build's date, as build/src/index.js takes it, so a warm run reads the entry `npm run build` stores. */
function buildDate() {
  if (process.env.SOURCE_DATE_EPOCH) return new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString().slice(0, 10);
  try {
    return execFileSync('git', ['log', '-1', '--format=%cs'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

// ---------------------------------------------------------------- the measurements, each in its own process

/** The build as build/src/index.js runs it, step by step, without writing dist/. */
async function buildChild({ selection }) {
  const steps = {};
  const time = async (name, run) => { const t = performance.now(); const v = await run(); steps[name] = ms(performance.now() - t); return v; };
  const started = performance.now();
  const schemaIssues = await time('gate', () => checkData(join(root, 'data'), join(root, 'schema')).issues);
  const { wb, referenceRows, referenceWhere } = await time('load', () => readSource(root));
  const snapshot = snapshotDate(wb.Method.rows);
  const build = buildDate();
  const built = await time('database', () => buildDatabase(wb, { snapshot, build }));
  const db = built.db;
  const release = await time('release', () => releaseIdentity(root));
  db.meta.release = release;
  const issues = [...schemaIssues, ...built.issues];
  const reference = await time('reference', () => {
    const r = compileReference(referenceRows, issues, referenceWhere, db.registry);
    issues.push(...contractIssues({ db, reference: r }));
    return r;
  });
  await time('report', () => formatReport(db, reference, issues, { snapshot, build, sections: { polymerEnvironment: polymerEnvironmentReportLines(db), estimates: estimateReportLines(db) } }));
  const json = await time('serialize', () => JSON.stringify(db));
  const scratch = mkdtempSync(join(tmpdir(), 'h2c-bench-'));
  let page;
  try {
    symlinkSync(join(root, 'app'), join(scratch, 'app'));
    page = await time('bundle', () => bundle({ projectRoot: scratch, buildRoot: join(root, 'build'), db, reference, meta: { snapshot, build, release } }));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
  const totalMs = ms(performance.now() - started);
  const peak = peakMB();
  const gz = gzipSync(Buffer.from(json, 'utf8'), { level: 9 });
  const out = {
    release: release.id, totalMs, steps,
    stages: built.cached ? built.cached.timing : built.timing,
    cache: built.cached ? { hit: true, readMs: built.timing.cache } : { hit: false },
    peakRssMB: peak,
    errors: issues.filter((i) => i.level === 'error').length,
    counts: db.meta.counts,
    sizes: {
      dbJsonBytes: Buffer.byteLength(json), dbGzipBytes: gz.length, dbEmbeddedBytes: Math.ceil(gz.length / 3) * 4,
      referenceJsonBytes: Buffer.byteLength(JSON.stringify(reference)), pageBytes: page.bytes,
    },
  };
  if (selection) out.selection = selectionTimes(db);
  return out;
}

/** Each template's selection as the page runs it: a first run, then the median of five. */
function selectionTimes(db) {
  const scenario = { unknownPolicy: 'strict', useEstimates: true, evidence: 'comparable', anneal: false, annealMaxC: null, moisture: 'dry' };
  const ctx = pageContext(db, scenario);
  const materials = db.materials.filter((m) => !m.familyEntry);
  return TEMPLATES.map((t) => {
    const first = performance.now();
    const { counts } = runSelection(materials, t.constraints, ctx);
    const firstMs = performance.now() - first;
    const runs = Array.from({ length: 5 }, () => { const s = performance.now(); runSelection(materials, t.constraints, ctx); return performance.now() - s; }).sort((a, b) => a - b);
    return { template: t.name, requirements: t.constraints.length, firstMs: ms(firstMs), medianMs: Math.round(runs[2] * 10) / 10, pass: counts.pass, unknown: counts.unknown, fail: counts.fail };
  });
}

/**
 * A copy of the data with the products of the largest chemical group `factor` times over: each active procurement
 * product of a material whose Estimate identity is in that group is copied `factor - 1` times as a new product of the
 * same material, with its measurements (and their fatigue loading), its print profiles, their notes and the material's
 * links to them. A copy has its own ID, product name and formulation key, so it is a product of its own, never a
 * twin of the one it was copied from. Offers, environment records and pins are not copied: a new product has none.
 */
export function growDominantGroup(dataDir, factor) {
  const path = (t) => join(dataDir, 'tables', `${t}.csv`);
  const read = (t) => { const { header, records } = readCsv(path(t)); return { header, rows: records.map((r) => r.values) }; };
  const T = Object.fromEntries(['materials', 'polymers', 'grades', 'measurements', 'fatigue_tests', 'profiles', 'profile_notes', 'material_links'].map((t) => [t, read(t)]));
  const groupOf = new Map(T.polymers.rows.map((p) => [p.PolymerID, p.Group]));
  const materialGroup = new Map(T.materials.rows.map((m) => [m.MaterialID, groupOf.get(m['Estimate identity']) ?? null]));
  const perGroup = new Map();
  for (const m of T.measurements.rows) { const g = materialGroup.get(m.MaterialID); if (g) perGroup.set(g, (perGroup.get(g) ?? 0) + 1); }
  const [group, measurementsBefore] = [...perGroup].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];

  const num = (id, re) => Number(re.exec(id)?.[1] ?? 0);
  let nextV = Math.max(...T.measurements.rows.map((r) => num(r.MeasurementID, /^V(\d{6})$/))) + 1;
  let nextP = Math.max(...T.profiles.rows.map((r) => num(r.ProfileID, /^P(\d{4})$/))) + 1;
  const nextSeq = new Map();
  for (const g of T.grades.rows) {
    const m = /^G(\d{3})-(\d{2,3})$/.exec(g.GradeID);
    if (m) nextSeq.set(g.MaterialID, Math.max(nextSeq.get(g.MaterialID) ?? 0, Number(m[2]) + 1));
  }
  const products = T.grades.rows.filter((g) => g.Status === 'active' && g.Role === 'procurement' && materialGroup.get(g.MaterialID) === group);
  const byGrade = (rows) => { const m = new Map(); for (const r of rows) (m.get(r.GradeID) ?? m.set(r.GradeID, []).get(r.GradeID)).push(r); return m; };
  const measurementsOf = byGrade(T.measurements.rows);
  const profilesOf = byGrade(T.profiles.rows);
  const fatigueOf = new Map(T.fatigue_tests.rows.map((r) => [r.MeasurementID, r]));
  const notesOf = new Map();
  for (const n of T.profile_notes.rows) (notesOf.get(n.ProfileID) ?? notesOf.set(n.ProfileID, []).get(n.ProfileID)).push(n);
  const linksOf = new Map();
  for (const l of T.material_links.rows) (linksOf.get(l.RecordID) ?? linksOf.set(l.RecordID, []).get(l.RecordID)).push(l);

  let copiedMeasurements = 0;
  for (let k = 2; k <= factor; k++) {
    for (const g of products) {
      const seq = nextSeq.get(g.MaterialID);
      if (seq > 999) throw new Error(`${g.MaterialID} has no grade number left for a copy: grow it less`);
      nextSeq.set(g.MaterialID, seq + 1);
      const gradeId = `G${g.MaterialID.slice(1)}-${String(seq).padStart(seq > 99 ? 3 : 2, '0')}`;
      T.grades.rows.push({ ...g, GradeID: gradeId, 'Product name': `${g['Product name']} ×${k}`, 'Shared formulation key': `${g['Shared formulation key']} ×${k}` });
      for (const m of measurementsOf.get(g.GradeID) ?? []) {
        const id = `V${String(nextV++).padStart(6, '0')}`;
        T.measurements.rows.push({ ...m, MeasurementID: id, GradeID: gradeId });
        if (fatigueOf.has(m.MeasurementID)) T.fatigue_tests.rows.push({ ...fatigueOf.get(m.MeasurementID), MeasurementID: id });
        copiedMeasurements++;
      }
      for (const p of profilesOf.get(g.GradeID) ?? []) {
        const id = `P${String(nextP++).padStart(4, '0')}`;
        T.profiles.rows.push({ ...p, ProfileID: id, GradeID: gradeId });
        for (const n of notesOf.get(p.ProfileID) ?? []) T.profile_notes.rows.push({ ...n, ProfileID: id });
        for (const l of linksOf.get(p.ProfileID) ?? []) T.material_links.rows.push({ ...l, RecordID: id });
      }
    }
  }
  for (const t of ['grades', 'measurements', 'fatigue_tests', 'profiles', 'profile_notes', 'material_links']) writeCsv(path(t), T[t].header, T[t].rows);
  return { group, factor, products: products.length, productsAfter: products.length * factor, measurementsBefore, measurementsAfter: measurementsBefore + copiedMeasurements };
}

function growthChild(factor) {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-growth-'));
  try {
    cpSync(join(root, 'data'), join(dir, 'data'), { recursive: true });
    const grown = growDominantGroup(join(dir, 'data'), factor);
    const wb = loadTables(join(dir, 'data'));
    const t = performance.now();
    // cache: false: this times the stages, and a stored result would time nothing.
    const { issues, timing } = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'bench', cache: false });
    const errors = issues.filter((i) => i.level === 'error');
    return { ...grown, totalMs: ms(performance.now() - t), stages: timing, peakRssMB: peakMB(), errors: errors.length, firstErrors: errors.slice(0, 3).map((e) => `[${e.code}] ${e.message}`) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Run one measurement in a fresh process and read the JSON it prints last. */
function child(args, env = {}) {
  const t = performance.now();
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--child', ...args], {
    cwd: root, encoding: 'utf8', env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0) throw new Error(`bench ${args.join(' ')} failed (exit ${r.status})`);
  const lines = r.stdout.trim().split('\n');
  return { ...JSON.parse(lines[lines.length - 1]), processMs: ms(performance.now() - t) };
}

// ---------------------------------------------------------------- the report

function table(rows) {
  const width = rows[0].map((_, i) => Math.max(...rows.map((r) => String(r[i]).length)));
  return rows.map((r) => r.map((c, i) => (i ? String(c).padStart(width[i]) : String(c).padEnd(width[i]))).join('  ')).join('\n');
}

function summary(report) {
  const { cold, warm } = report;
  const stages = (s) => Object.entries(s ?? {}).map(([k, v]) => `${k} ${v}`).join(', ');
  const out = [
    `bench, release ${report.release}, Node ${report.machine.node} on ${report.machine.cpu} (${report.machine.cores} cores, ${report.machine.memoryGB} GB); `
      + `load average ${report.machine.loadAtStart.join(' ')} at the start, ${report.machine.loadAtEnd.join(' ')} at the end`,
    '',
    table([
      ['', 'cold', 'warm'],
      ['process (ms)', cold.processMs, warm.processMs],
      ['in process (ms)', cold.totalMs, warm.totalMs],
      ...Object.keys(cold.steps).map((k) => [`  ${k}`, cold.steps[k], warm.steps[k]]),
      ['peak RSS (MB)', cold.peakRssMB, warm.peakRssMB],
    ]),
    '',
    `database stages, cold: ${stages(cold.stages)}${warm.cache.hit ? `; warm: read from the build cache in ${warm.cache.readMs} ms` : '; warm: NOT a cache hit'}`,
    `sizes: db.json ${mb(cold.sizes.dbJsonBytes)} MB, gzipped ${mb(cold.sizes.dbGzipBytes)} MB (${mb(cold.sizes.dbEmbeddedBytes)} MB embedded as base64), page ${mb(cold.sizes.pageBytes)} MB`,
    '',
    table([['template', 'requirements', 'first (ms)', 'median (ms)', 'pass', 'unknown', 'fail'],
      ...warm.selection.map((s) => [s.template, s.requirements, s.firstMs, s.medianMs, s.pass, s.unknown, s.fail])]),
  ];
  for (const g of report.growth) {
    out.push('', `growth x${g.factor}: ${g.group}, ${g.products} -> ${g.productsAfter} products, ${g.measurementsBefore} -> ${g.measurementsAfter} measurements: `
      + `estimate ${g.stages.estimate} ms (cold 1x ${cold.stages.estimate} ms), buildDatabase ${g.totalMs} ms, peak RSS ${g.peakRssMB} MB`
      + (g.errors ? `, ${g.errors} build error(s): ${g.firstErrors.join(' | ')}` : ''));
  }
  return out.join('\n');
}

const args = process.argv.slice(2);
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (args[0] === '--child') {
    const [kind, value] = args.slice(1);
    const result = kind === 'growth' ? growthChild(Number(value)) : await buildChild({ selection: kind === 'warm' });
    console.log(JSON.stringify(result));
  } else {
    const i = args.indexOf('--growth');
    const factors = i >= 0 ? String(args[i + 1] ?? '2').split(',').map(Number) : [];
    if (factors.some((f) => !Number.isInteger(f) || f < 2)) { console.error('--growth takes whole factors of 2 or more, as 2 or 2,3'); process.exit(2); }
    const cpu = cpus();
    // The load average beside the times: a machine busy with other work reads slower, and a reader comparing two
    // reports needs to see that before reading a trend into it.
    const load = () => loadavg().map((x) => Math.round(x * 10) / 10);
    const report = {
      date: new Date().toISOString().slice(0, 10),
      machine: { node: process.version, platform: process.platform, arch: process.arch, cpu: cpu[0]?.model ?? 'unknown', cores: cpu.length, memoryGB: Math.round(totalmem() / 2 ** 30), loadAtStart: load() },
    };
    console.error('bench: cold build (H2C_NO_BUILD_CACHE=1)');
    report.cold = child(['cold'], { H2C_NO_BUILD_CACHE: '1' });
    report.release = report.cold.release;
    // A cache entry for these tables and code, stored by this run if `npm run build` has not stored one.
    console.error('bench: storing the build cache entry, if it is missing');
    const primed = child(['prime']);
    report.primedFromCache = primed.cache.hit;
    console.error('bench: warm build, and the templates\' selection');
    report.warm = child(['warm']);
    report.growth = [];
    for (const f of factors) {
      console.error(`bench: the dominant chemical group's products x${f} (cache off)`);
      report.growth.push(child(['growth', String(f)], { H2C_NO_BUILD_CACHE: '1' }));
    }
    report.machine.loadAtEnd = load();
    mkdirSync(dirname(REPORT), { recursive: true });
    writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
    console.log(summary(report));
    console.log('\nreport -> build/reports/bench.json');
  }
}
