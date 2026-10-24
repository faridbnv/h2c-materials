#!/usr/bin/env node
// Checks docs/next/rulings.csv, the one status authority for the remake's rulings (WP-01).
// An Owner row needs the owner's own words and a date; a Default row must say so and is never a ruling.
// Exit 0 when every row is valid; exit 1 with one line per problem otherwise.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DEFAULT_WORDS = 'DEFAULT APPLIED, NOT RULED BY THE OWNER';
const STATUSES = new Set(['Owner', 'Default', 'NotCaptured']);
const COLUMNS = ['Id', 'Topic', 'Status', 'Ruling', 'OwnerWords', 'Date', 'Source', 'Effect'];

export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export function checkRulings(text) {
  const problems = [];
  const [header, ...rows] = parseCsv(text);
  if (header?.join(',') !== COLUMNS.join(',')) problems.push(`header must be ${COLUMNS.join(',')}`);
  const seen = new Set();
  rows.forEach((r, i) => {
    const line = i + 2;
    if (r.length !== COLUMNS.length) { problems.push(`line ${line}: ${r.length} fields, expected ${COLUMNS.length}`); return; }
    const row = Object.fromEntries(COLUMNS.map((c, j) => [c, r[j].trim()]));
    if (!row.Id) problems.push(`line ${line}: empty Id`);
    if (seen.has(row.Id)) problems.push(`line ${line}: duplicate Id ${row.Id}`);
    seen.add(row.Id);
    if (!STATUSES.has(row.Status)) problems.push(`${row.Id}: unknown Status "${row.Status}"`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.Date)) problems.push(`${row.Id}: Date must be YYYY-MM-DD`);
    if (!row.Ruling) problems.push(`${row.Id}: empty Ruling`);
    if (row.Status === 'Owner' && (!row.OwnerWords || row.OwnerWords.includes(DEFAULT_WORDS)))
      problems.push(`${row.Id}: an Owner row needs the owner's own words`);
    if (row.Status === 'Default' && row.OwnerWords !== DEFAULT_WORDS)
      problems.push(`${row.Id}: a Default row must say "${DEFAULT_WORDS}"`);
  });
  if (!rows.length) problems.push('no rows');
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.argv[2] ?? 'docs/next/rulings.csv';
  const problems = checkRulings(readFileSync(file, 'utf8'));
  for (const p of problems) console.error(`rulings:check: ${p}`);
  if (problems.length) process.exit(1);
  console.log(`rulings:check: ${file} OK`);
}
