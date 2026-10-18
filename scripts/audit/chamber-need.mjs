#!/usr/bin/env node
// The chamber a kind of plastic needs (data/tables/chamber_need.csv, D151): each row's counts, from the build's own
// computation (build/src/chamber-need.js chamberNeedStats), and every family no row names yet.
//
//   node scripts/audit/chamber-need.mjs            the counts of every row, and of every family no row names
//   node scripts/audit/chamber-need.mjs --draft    also append a reported row for each family no row names: within where
//                                                  its makers support it, else unknown, with the counts as its Reason,
//                                                  for a reviewer to read, split where the data show it, and sign
//
// A maker states a chamber where its own sheet, or the sheet its twin prints, gives a temperature or a window, says none
// is needed, says room temperature, or asks for an enclosure the H2C's heated chamber is (D90, D93); it asks above 65 °C
// where one of its products' chambers is on the line or beyond the H2C (D151). Declared variants are not their kind, and
// count for nothing (D129).

import { fileURLToPath } from 'node:url';
import { readSource } from '../../build/src/source.js';
import { buildDatabase } from '../../build/src/pipeline.js';
import { materialRowsOf } from '../../build/src/registry.js';
import { compileChamberNeed, chamberNeedStats, CHAMBER_NEED } from '../../build/src/chamber-need.js';
import { openTables } from '../data/table-io.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));

export function chamberNeedReport() {
  const { wb } = readSource(root);
  const { db } = buildDatabase(wb, { estimates: false, build: 'audit' });
  const materialRows = materialRowsOf(wb);
  const issues = [];
  const rules = compileChamberNeed(wb['Chamber need']?.rows ?? [], { materialRows, issues });
  const ctx = { materials: db.materials, materialRowById: new Map(materialRows.map((r) => [r.MaterialID, r])), gradeById: new Map(db.grades.map((g) => [g.id, g])) };
  const named = new Set(rules.flatMap((rule) => chamberNeedStats(rule, ctx).materials));
  const families = [...new Set(db.materials.filter((m) => !m.familyEntry && !named.has(m.id)).map((m) => m.family))].sort();
  const drafts = families.map((family) => ({ id: null, appliesToText: `Family: ${family}`, appliesTo: [{ column: 'Family', field: 'family', values: [family] }] }));
  const rows = [...rules, ...drafts].map((rule) => ({ rule, stats: chamberNeedStats(rule, ctx), filled: db.chamberNeed?.find((x) => x.id === rule.id)?.filled ?? 0 }));
  return { rows, issues, drafts: rows.filter((r) => !r.rule.id) };
}

function draftReason({ stats }) {
  const above = stats.aboveMakers.map((m) => `${m.maker} (${m.gradeIds.join(', ')})`).join('; ');
  return `Counted at the stage 3a review: ${stats.makers} distinct makers of its ${stats.products} products state a chamber, ${stats.above} ask above 65 °C${above ? `: ${above}` : ''}. `
    + (stats.qualifies ? 'Within: at least 10 makers state one and at most one in ten asks above.' : stats.makers < CHAMBER_NEED.MIN_MAKERS ? 'Unknown: fewer than 10 makers state one.' : 'Unknown: more than one in ten makers ask above.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { rows, issues, drafts } = chamberNeedReport();
  for (const i of issues) console.error(`  ${i.level.toUpperCase()}  [${i.code}] ${i.where}: ${i.message}`);
  console.log('| Rule | Applies to | Verdict | Status | Products | Makers stating | Asking above 65 °C | Supports within | Filled |');
  console.log('|---|---|---|---|---:|---:|---:|---|---:|');
  for (const { rule, stats, filled } of rows) {
    const above = stats.aboveMakers.map((m) => m.maker).join(', ');
    console.log(`| ${rule.id ?? '(none)'} | ${rule.appliesToText} | ${rule.verdict ?? ''} | ${rule.status ?? ''} | ${stats.products} | ${stats.makers} | ${stats.above}${above ? ` (${above})` : ''} | ${stats.qualifies ? 'yes' : 'no'} | ${filled} |`);
  }
  if (process.argv.includes('--draft') && drafts.length) {
    const t = openTables(root);
    for (const d of drafts) {
      t.append('chamber_need', {
        RuleID: t.nextId('chamber_need'), 'Applies to': d.rule.appliesToText, Verdict: d.stats.qualifies ? 'within' : 'unknown', Status: 'reported',
        'Reviewed by': 'Claude Opus (agent), 2026-10-18', Reason: draftReason(d),
      });
    }
    t.save();
    console.log(`\n${drafts.length} reported row(s) appended to data/tables/chamber_need.csv, for review`);
  }
}
