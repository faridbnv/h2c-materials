#!/usr/bin/env node
// Renders material pages into dist/materials/ from dist/db.json, for working on their design: the build's stage 8
// (step 3) renders every page itself.
//
//   npm run pages -- M020 M001 M110                     those materials' pages and records pages, and the assets
//   npm run pages -- --all                              every material the page rule admits (page-rule.js pageOf)
//   npm run pages -- M020 --sample-summaries <file>     with sample written summaries put into a copy of the database
//
// It reads dist/db.json, building it first when it is missing or older than data/ or build/src, and writes nothing
// but dist/materials/, which it empties first, so no page of an earlier render is left beside these. It prints each
// page's size, raw and gzipped, and the time the render took.
//
// --sample-summaries is for the owner's design review only: the file maps a material ID to { by, on, status, summary },
// the summary's numbers written as placeholders ({tensileStrengthXY.median}, {products}) that this script fills from
// the material's compiled values, as step 4's build will. Nothing it reads is written back.

import { readFileSync, writeFileSync, mkdirSync, rmSync, statSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { renderSite, pageEnv, prepare } from '../../app/pages/render.js';
import { readAssets } from '../../app/pages/read-assets.js';
import { REGISTRY } from '../../app/js/ui/registry.js';
import { identity, materialContext, productNameOrId } from '../../app/js/ui/material-facts.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const all = args.includes('--all');
const sampleAt = args.indexOf('--sample-summaries');
const sampleFile = sampleAt >= 0 ? args[sampleAt + 1] : null;
const ids = args.filter((a, i) => !a.startsWith('--') && (sampleAt < 0 || i !== sampleAt + 1));
if (!all && !ids.length) {
  console.error('Name the materials (npm run pages -- M020 M001) or pass --all.');
  process.exit(2);
}

// dist/db.json, built first where it is missing or older than what it is built from.
const newest = (dir) => readdirSync(join(root, dir), { recursive: true }).reduce((t, f) => {
  try { return Math.max(t, statSync(join(root, dir, f)).mtimeMs); } catch { return t; }
}, 0);
const dbPath = join(root, 'dist/db.json');
if (!existsSync(dbPath) || statSync(dbPath).mtimeMs < Math.max(newest('data'), newest('build/src'))) {
  console.log('dist/db.json is missing or older than data/ or build/src: building it first.');
  const r = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
  if (r.status) process.exit(r.status);
}
let db = JSON.parse(readFileSync(dbPath, 'utf8'));

if (sampleFile) db = withSamples(db, JSON.parse(readFileSync(sampleFile, 'utf8')));

const selectorFile = `H2C_Material_Selector_${db.meta.snapshot}_${db.meta.release?.id}.html`;
const env = pageEnv(db, { assets: readAssets(root), selectorFile: existsSync(join(root, 'dist', selectorFile)) ? selectorFile : null });
if (!all) env.only = ids;

const t0 = performance.now();
const { files, stats } = renderSite(db, env);
const ms = performance.now() - t0;
if (!all) for (const id of ids) if (!stats.perPage.some((p) => p.id === id)) console.warn(`${id}: no page (not a material the page rule admits).`);

const out = join(root, 'dist/materials');
rmSync(out, { recursive: true, force: true });
const sizes = [];
for (const [path, text] of files) {
  const file = join(root, 'dist', path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
  const bytes = Buffer.byteLength(text);
  sizes.push({ path, bytes, gzip: gzipSync(text, { level: 9 }).length });
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const show = (list) => list.forEach((s) => console.log(`  ${s.path.padEnd(36)} ${kb(s.bytes).padStart(11)} ${kb(s.gzip).padStart(11)} gz`));
const mains = sizes.filter((s) => /\/M\d+\.html$/.test(s.path)).sort((a, b) => b.bytes - a.bytes);
const records = sizes.filter((s) => /-records\.html$/.test(s.path)).sort((a, b) => b.bytes - a.bytes);
const assets = sizes.filter((s) => s.path.includes('/assets/'));
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[s.length >> 1] : 0; };
console.log(`Rendered ${stats.pages} material pages and ${stats.recordsPages} records pages in ${(ms / 1000).toFixed(2)} s.`);
console.log(`Main pages (${mains.length}), largest first:`); show(all ? mains.slice(0, 5) : mains);
if (all) console.log(`  median ${kb(median(mains.map((s) => s.bytes)))}, ${kb(median(mains.map((s) => s.gzip)))} gz; all ${kb(mains.reduce((n, s) => n + s.bytes, 0))}`);
console.log(`Records pages (${records.length}), largest first:`); show(all ? records.slice(0, 5) : records);
if (all) console.log(`  median ${kb(median(records.map((s) => s.bytes)))}, ${kb(median(records.map((s) => s.gzip)))} gz; all ${kb(records.reduce((n, s) => n + s.bytes, 0))}`);
console.log('Assets:'); show(assets);
console.log(`Set: ${kb(sizes.reduce((n, s) => n + s.bytes, 0))}, ${kb(sizes.reduce((n, s) => n + s.gzip, 0))} gz, in dist/materials/.`);

/**
 * A copy of the database whose named materials carry a sample written summary, its placeholders filled from their
 * compiled values: {key.median|min|max|q1|q3|n|products} for a key property, {key.range} for its range, {key.label} for
 * its name and {key.typical} for its product nearest the median, and {products}, {makers}, {values}, {profiles}, {name}.
 * A placeholder the material cannot fill stops the script.
 */
function withSamples(base, samples) {
  prepare(base);
  const fill = (m, c, field) => {
    const id = identity(m, c);
    const counts = { products: id.products, makers: id.makers, values: c.summary.numericMeasurements, profiles: c.profiles.length };
    if (field in counts) return [{ field, value: counts[field] }];
    if (field === 'name') return [{ text: m.name }];
    const [key, part] = field.split('.');
    const h = REGISTRY.allHeadlines.find((x) => x.key === key);
    const s = m.summary?.[key];
    if (h && part === 'label') return [{ text: h.labels.plain }];
    if (!h || !s?.n) throw new Error(`${m.id}: {${field}} has no compiled value to fill.`);
    if (part === 'typical') return [{ text: productNameOrId(c.gradeById.get(s.typical)) }];
    if (part === 'range') return [{ field: `${key}.min`, value: s.min }, { text: '–' }, { field: `${key}.max`, value: s.max, unit: h.unit }];
    if (part === 'n' || part === 'products') return [{ field, value: s[part] }];
    if (['median', 'min', 'max', 'q1', 'q3'].includes(part) && Number.isFinite(s[part])) return [{ field, value: s[part], unit: h.unit }];
    throw new Error(`${m.id}: {${field}} is not a field the build fills.`);
  };
  const materials = base.materials.map((m) => {
    const x = samples[m.id];
    if (!x) return m;
    const c = materialContext(base, m.id);
    const parts = [];
    for (const piece of x.summary.split(/(\{[^}]+\})/)) {
      if (!piece) continue;
      const f = /^\{([^}]+)\}$/.exec(piece);
      if (f) parts.push(...fill(m, c, f[1].trim())); else parts.push({ text: piece });
    }
    return { ...m, written: { by: x.by, on: x.on, status: x.status, parts } };
  });
  return { ...base, materials };
}
