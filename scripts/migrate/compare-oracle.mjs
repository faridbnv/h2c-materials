#!/usr/bin/env node
// Compare dist/db.json and dist/reference.json with the migration baseline and print every
// difference that explained-differences.json does not account for.
//
//   node scripts/migrate/compare-oracle.mjs          unexplained differences only
//   node scripts/migrate/compare-oracle.mjs --all    every difference from the baseline

import { readFileSync } from 'node:fs';
import { diffAgainstBaseline, unexplained } from './oracle.mjs';

const db = JSON.parse(readFileSync('dist/db.json', 'utf8'));
const reference = JSON.parse(readFileSync('dist/reference.json', 'utf8'));
const diffs = diffAgainstBaseline({ db, reference });
const { extra, stale } = unexplained(diffs);
const short = (v) => { const s = JSON.stringify(v); return s && s.length > 160 ? `${s.slice(0, 157)}...` : s; };
for (const d of (process.argv.includes('--all') ? diffs : extra).slice(0, 80)) console.log(`${d.path}\n  before ${short(d.before)}\n  after  ${short(d.after)}`);
for (const d of stale) console.log(`explained but no longer occurs: ${d.path}`);
console.log(`${diffs.length} difference(s) from the baseline; ${extra.length} unexplained; ${stale.length} stale explanation(s)`);
if (extra.length || stale.length) process.exitCode = 1;
