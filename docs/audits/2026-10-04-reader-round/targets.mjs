// The reader round's frozen targets (2026-10-04): every material and product field the build shows as missing in
// printing, mechanical or thermal, the coverage notes' conflicts, and the materials with two sources or fewer; then
// every document tied to one, which the round re-reads page by page. Read-only: build/snapshot, dist/db.json and the
// tables; writes TARGETS.csv and DOCS.csv beside this file. With --after it leaves those frozen and writes after/TARGETS.csv
// and after/PROGRESS.md: what the round closed, target by target, against the frozen list.
//
//   node docs/audits/2026-10-04-reader-round/targets.mjs [--after [--frozen <TARGETS.csv> --out <dir>]]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv, csvText } from '../../../build/src/csv.js';
import { cachedText } from '../../../scripts/lib/pdf-text.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');
const rows = (p) => readCsv(join(root, p)).records.map((r) => r.values);

const gates = rows('build/snapshot/gates.csv');
const heads = rows('build/snapshot/headlines.csv');
const print = rows('build/snapshot/print.csv');
const products = rows('build/snapshot/products.csv');
const grades = rows('data/tables/grades.csv');
const sources = rows('data/tables/sources.csv');
const measurements = rows('data/tables/measurements.csv');
const profiles = rows('data/tables/profiles.csv');
const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));

const PRINT = ['nozzle', 'bed', 'chamber', 'drying'];
const MECH = ['tensileStrengthXY', 'tensileModulusXY', 'elongationXY', 'density'];
const THERMAL = ['hdt045'];
const domainOf = (f) => (PRINT.includes(f) ? 'printing' : THERMAL.includes(f) ? 'thermal' : 'mechanical');

const scope = new Map(gates.map((g) => [g.MaterialID, g.scope]));
const inScope = (id) => scope.get(id) === 'within';
const active = grades.filter((g) => g.Status === 'active' && inScope(g.MaterialID));
const materialOf = new Map(active.map((g) => [g.GradeID, g.MaterialID]));
const name = new Map(gates.map((g) => [g.MaterialID, g.Material]));

const targets = [];
const add = (t) => targets.push({ TargetID: `T${String(targets.length + 1).padStart(4, '0')}`, ...t });

// Materials: a print gate no product answers, or a core headline with no published value.
for (const g of gates) {
  if (!inScope(g.MaterialID)) continue;
  for (const f of PRINT) if (g[f] === 'unknown') add({ Level: 'material', MaterialID: g.MaterialID, GradeID: '', Domain: 'printing', Field: f, State: 'unknown', Note: g.Material });
}
for (const h of heads) {
  if (!inScope(h.MaterialID) || ![...MECH, ...THERMAL].includes(h.Headline)) continue;
  if (h.Kind === 'none' || h.Kind === 'estimate') add({ Level: 'material', MaterialID: h.MaterialID, GradeID: '', Domain: domainOf(h.Headline), Field: h.Headline, State: h.Kind, Note: h.Material });
}

// Products: a print gate its own recipe (or its twin's, or the guide) leaves unknown, or a core headline with no value.
const own = new Map();
for (const p of products) (own.get(p.GradeID) ?? own.set(p.GradeID, new Set()).get(p.GradeID)).add(p.Headline);
for (const p of print) {
  if (!materialOf.has(p.GradeID)) continue;
  for (const [f, col] of [['nozzle', 'Nozzle'], ['bed', 'Bed'], ['chamber', 'Chamber'], ['drying', 'Drying']]) {
    if (p[col] === 'unknown') add({ Level: 'product', MaterialID: p.MaterialID, GradeID: p.GradeID, Domain: 'printing', Field: f, State: 'unknown', Note: p.Product });
  }
  const has = own.get(p.GradeID) ?? new Set();
  for (const f of [...MECH, ...THERMAL]) if (!has.has(f)) add({ Level: 'product', MaterialID: p.MaterialID, GradeID: p.GradeID, Domain: domainOf(f), Field: f, State: 'none', Note: p.Product });
}

// The coverage notes: stored conflicts and quarantines, and the rarely published properties no product prints.
const conflictIds = [];
for (const c of db.coverage) {
  if (c.status === 'Conflict' || c.status === 'Quarantined') {
    conflictIds.push(c.id);
    add({ Level: 'conflict', MaterialID: c.materialId, GradeID: c.gradeId ?? '', Domain: c.domain, Field: c.id, State: c.status, Note: c.finding.slice(0, 300) });
  }
}
for (const c of db.coverage) {
  if (c.domain === 'Sparse properties' && c.status === 'Gap' && inScope(c.materialId)) add({ Level: 'sparse', MaterialID: c.materialId, GradeID: '', Domain: 'sparse', Field: 'rarely published properties', State: 'Gap', Note: name.get(c.materialId) ?? '' });
}

// Documents: every source a target's product or material cites.
const docs = new Map();
const cite = (sourceId, gradeId, materialId, why) => {
  if (!sourceId) return;
  const d = docs.get(sourceId) ?? docs.set(sourceId, { grades: new Set(), materials: new Set(), why: new Set() }).get(sourceId);
  if (gradeId) d.grades.add(gradeId);
  if (materialId) d.materials.add(materialId);
  d.why.add(why);
};
const targetGrades = new Map();
const targetMaterials = new Map();
for (const t of targets) {
  if (t.Level === 'product') (targetGrades.get(t.GradeID) ?? targetGrades.set(t.GradeID, new Set()).get(t.GradeID)).add(t.Field);
  if (t.Level === 'material' || t.Level === 'conflict') (targetMaterials.get(t.MaterialID) ?? targetMaterials.set(t.MaterialID, new Set()).get(t.MaterialID)).add(t.Field);
}
const tier = (gradeId, materialId) => (targetMaterials.has(materialId) ? 1 : targetGrades.has(gradeId) ? 2 : 0);
for (const g of active) {
  if (tier(g.GradeID, g.MaterialID)) cite(g.SourceID, g.GradeID, g.MaterialID, 'grade');
}
for (const m of measurements) if (materialOf.has(m.GradeID) && tier(m.GradeID, m.MaterialID)) cite(m.SourceID, m.GradeID, m.MaterialID, 'measurement');
for (const p of profiles) if (materialOf.has(p.GradeID) && tier(p.GradeID, p.MaterialID)) cite(p.SourceID, p.GradeID, p.MaterialID, 'profile');
for (const s of sources) {
  for (const g of (s['Applicable grades'] ?? '').match(/G\d{3}-\d+(?:-R\d+)?/g) ?? []) {
    if (materialOf.has(g) && tier(g, materialOf.get(g))) cite(s.SourceID, g, materialOf.get(g), 'applicable');
  }
}
// A conflict's finding names its records; their sources are read too.
const byMeasurement = new Map(measurements.map((m) => [m.MeasurementID, m]));
for (const c of db.coverage.filter((c) => conflictIds.includes(c.id))) {
  for (const v of c.finding.match(/V\d{6}/g) ?? []) { const m = byMeasurement.get(v); if (m) cite(m.SourceID, m.GradeID, m.MaterialID, `conflict ${c.id}`); }
}

// Sources per in-scope material, for the thin list.
const perMaterial = new Map();
for (const [id, d] of docs) for (const m of d.materials) (perMaterial.get(m) ?? perMaterial.set(m, new Set()).get(m)).add(id);
const allSourcesOf = new Map();
const note = (m, s) => (allSourcesOf.get(m) ?? allSourcesOf.set(m, new Set()).get(m)).add(s);
for (const g of active) if (g.SourceID) note(g.MaterialID, g.SourceID);
for (const s of sources) for (const g of (s['Applicable grades'] ?? '').match(/G\d{3}-\d+/g) ?? []) if (materialOf.has(g)) note(materialOf.get(g), s.SourceID);
for (const g of gates) {
  if (!inScope(g.MaterialID)) continue;
  const n = allSourcesOf.get(g.MaterialID)?.size ?? 0;
  if (n <= 2) add({ Level: 'thin', MaterialID: g.MaterialID, GradeID: '', Domain: 'sources', Field: 'sources', State: String(n), Note: g.Material });
}

const source = new Map(sources.map((s) => [s.SourceID, s]));
const docRows = [];
for (const [id, d] of [...docs].sort(([a], [b]) => a.localeCompare(b))) {
  const s = source.get(id);
  const sha = s?.SHA256 && /^[0-9a-f]{64}$/.test(s.SHA256) ? s.SHA256 : '';
  let kind = '', cache = 'none', pages = 0, ocr = '';
  if (sha) {
    const bytes = ['pdf', 'html'].find((x) => existsSync(join(root, '.cache/sources/by-sha', `${sha}.${x}`))) ?? (existsSync(join(root, '.cache/sources', `${id}.pdf`)) ? 'pdf' : '');
    kind = bytes;
    const text = cachedText(sha);
    if (text) { cache = 'current'; pages = text.pages.length; ocr = text.ocr ? 'yes' : ''; kind ||= text.html ? 'html' : 'pdf'; }
    else if (existsSync(join(root, '.cache/text', `${sha}.json`))) cache = 'stale';
  }
  const t = Math.min(...[...d.grades].map((g) => tier(g, materialOf.get(g))).filter(Boolean), ...[...d.materials].map((m) => (targetMaterials.has(m) ? 1 : 2)));
  docRows.push({ SourceID: id, SHA256: sha, Kind: kind, Cache: cache, Pages: String(pages), OCR: ocr, Tier: String(t), Materials: [...d.materials].sort().join(' '), Grades: [...d.grades].sort().join(' '), Cited: [...d.why].sort().join(' '), Publisher: s?.Publisher ?? '', Title: s?.Title ?? '', URL: s?.URL ?? '' });
}

const tcols = ['TargetID', 'Level', 'MaterialID', 'GradeID', 'Domain', 'Field', 'State', 'Note'];
if (process.argv.includes('--after')) {
  // A target is its level, material, product and field; the frozen list is the round's starting point.
  const key = (t) => [t.Level, t.MaterialID, t.GradeID, t.Field].join('|');
  // A later round freezes its own list: --frozen <TARGETS.csv> and --out <dir> (gap round 2 reads the reader round's after/).
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const before = rows(arg('--frozen', 'docs/audits/2026-10-04-reader-round/TARGETS.csv'));
  const outDir = resolve(root, arg('--out', 'docs/audits/2026-10-04-reader-round/after'));
  const now = new Set(targets.map(key));
  const then = new Set(before.map(key));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'TARGETS.csv'), csvText(tcols, targets));
  const groups = new Map();
  for (const t of before) {
    const g = `${t.Level}|${t.Level === 'material' || t.Level === 'product' ? t.Field : t.Level}`;
    const e = groups.get(g) ?? groups.set(g, { level: t.Level, field: t.Level === 'material' || t.Level === 'product' ? t.Field : '', before: 0, closed: 0, opened: 0 }).get(g);
    e.before++; if (!now.has(key(t))) e.closed++;
  }
  for (const t of targets) {
    if (then.has(key(t))) continue;
    const g = `${t.Level}|${t.Level === 'material' || t.Level === 'product' ? t.Field : t.Level}`;
    const e = groups.get(g) ?? groups.set(g, { level: t.Level, field: t.Level === 'material' || t.Level === 'product' ? t.Field : '', before: 0, closed: 0, opened: 0 }).get(g);
    e.opened++;
  }
  const frozenPath = arg('--frozen', 'docs/audits/2026-10-04-reader-round/TARGETS.csv');
  const command = `node docs/audits/2026-10-04-reader-round/targets.mjs --after${process.argv.includes('--frozen') ? ` --frozen ${frozenPath} --out ${arg('--out', '')}` : ''}`;
  const lines = ['# Targets closed', '', `Generated by \`${command}\` from the build as it stands, against the`,
    `frozen list ${frozenPath}. A target is closed when the build no longer shows it missing; opened is a target the`,
    'frozen list did not have (a new product, or a value the round moved to another state).', '',
    '| Level | Field | Frozen | Closed | Still open | Opened | Now |', '|---|---|---:|---:|---:|---:|---:|'];
  for (const e of [...groups.values()].sort((a, b) => a.level.localeCompare(b.level) || a.field.localeCompare(b.field))) {
    lines.push(`| ${e.level} | ${e.field || '—'} | ${e.before} | ${e.closed} | ${e.before - e.closed} | ${e.opened} | ${e.before - e.closed + e.opened} |`);
  }
  lines.push('', `${before.length} frozen targets; ${before.filter((t) => !now.has(key(t))).length} closed; ${targets.length} now.`);
  writeFileSync(join(outDir, 'PROGRESS.md'), lines.join('\n') + '\n');
  console.log(lines.join('\n'));
  process.exit(0);
}
writeFileSync(join(here, 'TARGETS.csv'), csvText(tcols, targets));
writeFileSync(join(here, 'DOCS.csv'), csvText(Object.keys(docRows[0]), docRows));

const count = (xs, k) => xs.reduce((o, x) => ((o[x[k]] = (o[x[k]] ?? 0) + 1), o), {});
console.log('targets', targets.length, count(targets, 'Level'));
console.log('material targets by field', count(targets.filter((t) => t.Level === 'material'), 'Field'));
console.log('product targets by field', count(targets.filter((t) => t.Level === 'product'), 'Field'));
console.log('documents', docRows.length, 'by cache', count(docRows, 'Cache'), 'by kind', count(docRows, 'Kind'), 'by tier', count(docRows, 'Tier'));
console.log('pages (current cache)', docRows.reduce((n, d) => n + Number(d.Pages), 0));
