// Gap round 2: which page_context rows reach measurements from more than one table of their page (D128).
//
// A page_context row speaks for every measurement on its page whose property falls in its scope (Applies to). Where a
// page prints two tables (a dry and a conditioned one, an as-printed and an annealed one, mechanical and physical
// properties) and the heading or footnote heads only one, the row reaches the other too. For each row this lists the
// measurements it reaches (build/src/page-context.js, contextFor: the same rule the build uses, Table included) and
// groups them by a table key read from their Locator. Rows that reach two or more keys are the candidates a reader
// checks on the sheet (verdicts.csv, applied by m356).
//
// The table key is a heuristic, written down so a reader can judge it. A Locator rarely names a table, so the key is
// what it does carry, after the "p. N:" prefix, lower-cased:
//   heading   the first of: "Table 8: ..." (up to the next ; ) or ,), "<Mechanical|Thermal|Physical|Typical|Other|General|
//             Electrical|Filament's|High thermal> properties", "Print @ 250C table", "<Classic|Standard|High> speed";
//   state     then each of the words that mark one column or table of a sheet, in a fixed order: dry, conditioned, wet,
//             as printed, unannealed, annealed, 3d printed, injection moulded.
// The key is "heading | state, state"; with neither it is "(unlabelled)". Two measurements of one table can still read
// differently (a property label that names its own state), so a candidate is a question for the reader, not a finding.
//
//   node docs/audits/2026-10-05-gap-round-2/page-tables.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readTable } from '../../../scripts/ingest/read-common.mjs';
import { indexPageContext, contextFor, pageOf } from '../../../build/src/page-context.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'page-tables');
const SAMPLE = 3;

const HEADING = /table\s*\d+\s*:?\s*[^;),]*|(?:mechanical|thermal|physical|typical|other|general|electrical|filament'?s?|high thermal)\s+properties|print\s*@\s*\w+\s*table|\b(?:classic|standard|high)[- ]speed/i;
const STATES = [['dry', /\bdry\b/i], ['conditioned', /\bconditioned\b/i], ['wet', /\bwet\b/i], ['as printed', /\bas[- ]printed\b/i], ['unannealed', /\bun-?annealed\b/i],
  ['annealed', /(?<!un-?)\bannealed\b/i], ['3d printed', /\b3d[- ]printed\b/i], ['injection moulded', /\binjection[- ]mou?lded\b/i]];

/** The table key of a locator (see the header). */
export function tableKey(locator) {
  const text = String(locator ?? '').replace(/^\s*p(?:age|p)?\.?\s*\d+\s*:?\s*/i, '');
  const heading = text.match(HEADING)?.[0].trim().replace(/\s+/g, ' ').toLowerCase() ?? '';
  const states = STATES.filter(([, re]) => re.test(text)).map(([name]) => name);
  if (!heading && !states.length) return '(unlabelled)';
  return [heading, states.join(', ')].filter(Boolean).join(' | ');
}

const quote = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;

export function candidates() {
  const contexts = readTable('page_context');
  const measurements = readTable('measurements').filter((m) => m['Data status'] !== 'Retired duplicate record');
  const sources = new Map(readTable('sources').map((s) => [s.SourceID, s]));
  const index = indexPageContext(contexts);
  const reached = new Map(contexts.map((c) => [c.PageContextID, new Map()]));
  for (const m of measurements) {
    if (pageOf(m.Locator) == null) continue;
    const key = tableKey(m.Locator);
    for (const c of contextFor(index, m)) {
      const groups = reached.get(c.PageContextID);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(m.MeasurementID);
    }
  }
  const out = [];
  for (const c of contexts) {
    const groups = reached.get(c.PageContextID);
    if (groups.size < 2) continue;
    const keys = [...groups].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    out.push({
      PageContextID: c.PageContextID, SourceID: c.SourceID, SHA256: sources.get(c.SourceID)?.SHA256 ?? '', Page: c.Page, 'Applies to': c['Applies to'], Table: c.Table ?? '', Statement: c.Statement,
      'Table keys': keys.map(([k, ids]) => `${k} (${ids.length})`).join(' || '),
      'Sample MeasurementIDs': keys.map(([k, ids]) => `${k}: ${ids.slice(0, SAMPLE).join(' ')}`).join(' || '),
    });
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = candidates();
  const header = ['PageContextID', 'SourceID', 'SHA256', 'Page', 'Applies to', 'Table', 'Statement', 'Table keys', 'Sample MeasurementIDs'];
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'candidates.csv'), [header.join(','), ...rows.map((r) => header.map((h) => quote(r[h])).join(','))].join('\n') + '\n');
  const bySource = new Map();
  for (const r of rows) bySource.set(r.SourceID, (bySource.get(r.SourceID) ?? 0) + 1);
  console.log(`${rows.length} page_context row(s) of ${readTable('page_context').length} reach measurements under two or more table keys`);
  console.log([...bySource].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([s, n]) => `${s}: ${n}`).join('\n'));
}
