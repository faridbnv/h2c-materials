#!/usr/bin/env node
// The human spot-check (docs/GOALS.md, "Two tiers"; re-center plan, phase 6): a fixed, seeded sample of what the page
// shows, for a person to check against the page of the document it came from. Every review in this database so far
// was an agent's; this is the sample that tells the team the real error rate.
//
//   decision values  10 product values per measured headline (50), from candidate materials, comparable level (D84):
//                    the numbers a verdict turns on;
//   print gates      30 product print gates the product's own profile decided (lane 2);
//   know-how         30 makers' statements the drawer shows (lane 3, D85);
//   lone values      every product value a material's pass rests on (one to four products meet a template's limit);
//   record tier      30 facts the reader skipped (lane 1, D85), from dist/h2c.sqlite when it has been built.
//
// Generated from dist/db.json (run `npm run build` first) with a fixed seed, so the same data gives the same sample;
// it decides nothing and changes no data. The person writes their verdict in the last column of the committed file.
//
//   node scripts/audit/spot-check.mjs [--seed N]   writes docs/audits/2026-09-25-re-center/SPOT-CHECK.md

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { TEMPLATES } from '../../app/js/ui/templates.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const out = join(root, 'docs/audits/2026-09-25-re-center/SPOT-CHECK.md');
const seedArg = process.argv.indexOf('--seed');
const SEED = seedArg > 0 ? Number(process.argv[seedArg + 1]) : 20260925;
const HEADLINES = ['density', 'tensileModulusXY', 'tensileStrengthXY', 'elongationXY', 'hdt045'];

// The draw the second read and lane 2 used: mulberry32, then a Fisher-Yates shuffle of candidates in ID order.
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(SEED);
const draw = (list, n) => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };

const dbPath = join(root, 'dist/db.json');
if (!existsSync(dbPath)) { console.error('No dist/db.json; run npm run build'); process.exit(1); }
const db = JSON.parse(readFileSync(dbPath, 'utf8'));
const byId = (list) => new Map(list.map((x) => [x.id, x]));
const materials = byId(db.materials), measurements = byId(db.measurements), sources = byId(db.sources), profiles = byId(db.profiles);
// A candidate the templates judge: in scope, a build material (not a support), an active procurement product.
const candidate = (g) => { const m = materials.get(g.materialId); return m && !m.familyEntry && !m.excluded && !m.facets?.supportMaterial?.value && !g.retired && !/-R\d/.test(g.id); };
const products = db.grades.filter(candidate).sort((a, b) => a.id.localeCompare(b.id));
const label = Object.fromEntries(db.registry.headlines.map((h) => [h.key, h.labels.technical]));
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const product = (g) => `${g.manufacturer} ${g.product} (${g.id})`;
const where = (sourceId, locator) => { const s = sources.get(sourceId); return `${cell(s?.title ?? sourceId)}${s?.url ? ` <${s.url}>` : ''}, ${cell(locator)}`; };

// Decision values: stratified by headline, so each number a template turns on is checked.
const values = HEADLINES.flatMap((key) => draw(products.filter((g) => g.headline?.[key]?.level === 'comparable' && g.headline[key].measurementId), 10)
  .map((g) => ({ g, key, h: g.headline[key], v: measurements.get(g.headline[key].measurementId) })));
const conditions = (v) => [v.direction && !/not.applicable/i.test(v.direction) ? `direction ${v.direction}` : null, v.specimenType, v.moisture !== 'Not published' ? v.moisture : null,
  v.postProcessing !== 'Not published' ? v.postProcessing : null, v.standardText !== 'Not published' ? v.standardText : null].filter(Boolean).map(cell).join('; ');

// Print gates the product's own profile decided.
const AXES = ['nozzle', 'bed', 'chamber'];
const gates = draw(products.flatMap((g) => AXES.map((axis) => ({ g, axis, gate: g.print?.[axis] })))
  .filter((x) => x.gate?.profileId && ['within', 'partial', 'exceeds', 'exceeds-recommended'].includes(x.gate.verdict)), 30);

const knowHow = draw((db.knowHow ?? []).filter((k) => k.gradeId), 30);

let facts = [];
const sqlitePath = join(root, 'dist/h2c.sqlite');
if (existsSync(sqlitePath)) {
  const sql = new DatabaseSync(sqlitePath, { readOnly: true });
  facts = draw(sql.prepare('select sourceid, page, text, reason from source_facts order by rowid').all(), 30);
  sql.close();
}

// Values a verdict rests on: for a template's numeric limit, a material whose products' comparable values straddle
// it, and where one to four products are all that meet it. A misread there turns the material's answer (PLA's 3 GPa
// stiffness rests on colorFabb PLA-HP and Nanovia's PLA EF 3D850, for example). Every such value is listed, not drawn.
const lone = [];
const seen = new Set();
for (const t of TEMPLATES) {
  for (const c of t.constraints.filter((x) => x.kind === 'numeric' && x.mandatory !== false && x.property !== 'priceCADkg')) {
    const meets = (v) => (c.operator === '>=' ? v >= c.value : v <= c.value);
    for (const m of db.materials.filter((x) => !x.familyEntry && !x.excluded)) {
      const vals = products.filter((g) => g.materialId === m.id && g.headline?.[c.property]?.level === 'comparable' && !g.headline[c.property].from)
        .map((g) => ({ g, h: g.headline[c.property] }));
      const pass = vals.filter((x) => meets(x.h.value));
      if (!pass.length || pass.length > 4 || pass.length === vals.length) continue;
      for (const x of pass) {
        const k = `${x.g.id}|${c.property}`;
        if (seen.has(k)) continue;
        seen.add(k);
        lone.push({ ...x, key: c.property, material: m.name, limit: `${c.operator} ${c.value}`, template: t.name, of: vals.length, v: measurements.get(x.h.measurementId) });
      }
    }
  }
}
lone.sort((a, b) => a.material.localeCompare(b.material) || a.key.localeCompare(b.key));

const L = [
  '# Spot-check: what a person should verify against the page',
  '',
  `Generated by \`node scripts/audit/spot-check.mjs\` (seed ${SEED}) from the build of ${db.meta.snapshot}. Every row review in this`,
  'database was made by an AI agent; this fixed sample is for a person, so the team knows the real error rate before it',
  'relies on a number (docs/GOALS.md, "screening-grade evidence").',
  '',
  '**How to check.** Open the document at the link, go to the page or row the locator names, and compare. Write in the',
  'last column: **ok**, or what the page says instead (a different number, unit, direction, specimen, or "not on this',
  'page"). A value right in number but wrong in its conditions is wrong: the conditions decide whether it is compared.',
  'Count the rows that are not ok; that count over the rows checked is the error rate. Record who checked and when at',
  'the end, and tell the owner.',
  '',
  `## 1. Decision values (${values.length})`,
  '',
  'Product values a verdict turns on: 10 per property the templates screen on, from candidate materials, comparable',
  'level only.',
  '',
  '| # | Product | Property | Value | Conditions as recorded | Where | Checked |',
  '|---:|---|---|---|---|---|---|',
  ...values.map(({ g, key, h, v }, i) => `| ${i + 1} | ${cell(product(g))} | ${cell(label[key] ?? key)} | ${v?.operator && v.operator !== '=' ? v.operator + ' ' : ''}${h.value} ${cell(v?.unit)} (${h.measurementId}) | ${conditions(v ?? {})} | ${where(v?.sourceId, v?.locator)} | |`),
  '',
  `## 2. Print gates (${gates.length})`,
  '',
  'A product\'s own print setting that decides whether the H2C can print it.',
  '',
  '| # | Product | Axis | Recorded | Gate | Where | Checked |',
  '|---:|---|---|---|---|---|---|',
  ...gates.map(({ g, axis, gate }, i) => { const p = profiles.get(gate.profileId); return `| ${i + 1} | ${cell(product(g))} | ${axis} | ${cell(p?.[axis])} | ${cell(gate.verdict)}: ${cell(gate.reason)} | ${where(p?.sourceId, p?.locator)} (${gate.profileId}) | |`; }),
  '',
  `## 3. Makers' know-how (${knowHow.length})`,
  '',
  'Statements the drawer shows in the maker\'s words. Check the words are on the page and belong to this product.',
  '',
  '| # | Product | Topic | Statement | Where | Checked |',
  '|---:|---|---|---|---|---|',
  ...knowHow.map((k, i) => { const g = db.grades.find((x) => x.id === k.gradeId); return `| ${i + 1} | ${cell(g ? product(g) : k.gradeId)} | ${cell(k.topic)} | ${cell(k.text).slice(0, 220)} | ${where(k.sourceId, k.locator)} | |`; }),
  '',
  `## 4. Values a verdict rests on (${lone.length})`,
  '',
  'Not drawn: every product that is one of at most four in its material meeting a template\'s limit while others miss it,',
  'so the material passes on these few numbers. Check these first.',
  '',
  '| # | Product | Material | Property | Value | Limit (template) | Conditions as recorded | Where | Checked |',
  '|---:|---|---|---|---|---|---|---|---|',
  ...lone.map(({ g, h, key, material, limit, template, of, v }, i) => `| ${i + 1} | ${cell(product(g))} | ${cell(material)} (${of} with a value) | ${cell(label[key] ?? key)} | ${h.value} ${cell(v?.unit)} (${h.measurementId}) | ${limit} (${cell(template)}) | ${conditions(v ?? {})} | ${where(v?.sourceId, v?.locator)} | |`),
  '',
  `## 5. The record tier (${facts.length})`,
  '',
  facts.length ? 'Lines the reader skipped, kept as printed with their page (never used in a verdict). Check the text stands on that page.' : 'dist/h2c.sqlite was not built when this was generated (`npm run db:sqlite`), so no record-tier sample.',
  '',
  ...(facts.length ? ['| # | Source | Page | Text as recorded | Why it was not a value | Checked |', '|---:|---|---:|---|---|---|',
    ...facts.map((f, i) => `| ${i + 1} | ${where(f.sourceid, '')} | ${f.page ?? ''} | ${cell(f.text).slice(0, 200)} | ${cell(f.reason)} | |`)] : []),
  '',
  '## Result',
  '',
  '| Checked by | Date | Rows checked | Not ok | Notes |',
  '|---|---|---:|---:|---|',
  '| | | | | |',
  '',
];
writeFileSync(out, `${L.join('\n')}\n`);
console.log(`spot-check: ${values.length} decision values, ${gates.length} print gates, ${knowHow.length} statements, ${lone.length} lone values, ${facts.length} record-tier facts -> ${out}`);
