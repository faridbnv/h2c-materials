// The reviewer-kind report (WP-17; owner ruling OQ-17 A, pack 04 section 6 "Typed authorship, honestly labelled"): today's free-text "Reviewed by"
// cells, classified as agent or human. READ ONLY: it reads data/tables and writes one Markdown file (docs/next/reviewer-kind-report.md) and
// changes no cell. From now on a write command records each reviewer's kind (`reviewedBy`); the rows that exist keep their words.
//
// A claim, not a proof: Git cannot tell actors apart (agents commit under the owner's account, OQ-19 B), and these cells were written by whoever
// wrote the row. The classifier reads what the text says about who looked; it does not know. The rules are below and in the report.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsv } from './csv.ts';
import { sha256Of } from './digest.ts';
import { TABLES, TABLE_NAMES } from './generated/columns.ts';
import type { TableName } from './generated/columns.ts';
import { DEFAULT_DATA_DIR } from './rebuild.ts';
import { REVIEWER_COLUMNS } from './write-core.ts';

export type ReviewerKind = 'agent' | 'human' | 'both' | 'unclear' | 'not-stated';

// What names an agent: a model or tool by name, or the word agent / AI / reader. What names a person: the owner, a human, a person, by hand.
const AGENT = /\b(claude|opus|sonnet|haiku|codex|gpt|gemini|llm|agents?|ai|readers?|models?|subagents?)\b/i;
const HUMAN = /\b(owner|farid|human|humans|person|people|by hand|manually)\b/i;
// Words that mention a person without naming one as the reviewer. "switched to deciding as the owner ruled on 2026-10-20" names a ruling the owner
// made; "no human review" says there was none. Neither is read as a human review.
const NOT_A_REVIEWER = /\b(?:as |when |after )?the owner (?:ruled|approved|decided|asked|accepted)\b[^;]*|\bowner(?:'s)? rulings?\b[^;]*|\b(?:no|without|not)\s+(?:a\s+|any\s+)?(?:human|person|manual|owner)\b[^;,.]*/gi;
const NOT_STATED = new Set(['', 'Not published', 'Not applicable', 'None', 'Unknown']);

/** Who the text says looked at the row. The rules, in order: nothing stated; then a ruling of the owner is set aside; then agent and person words. */
export function classifyReviewer(text: string | null): ReviewerKind {
  if (text === null || NOT_STATED.has(text.trim())) return 'not-stated';
  const reviewers = text.replace(NOT_A_REVIEWER, ' ');
  const agent = AGENT.test(reviewers);
  const human = HUMAN.test(reviewers);
  if (agent && human) return 'both';
  if (agent) return 'agent';
  return human ? 'human' : 'unclear';
}

export interface Phrasing { readonly text: string; readonly kind: ReviewerKind; readonly rows: number }

export interface ReviewerColumnReport {
  readonly table: TableName;
  readonly column: string;
  readonly rows: number;
  readonly counts: Readonly<Record<ReviewerKind, number>>;
  /** The distinct wordings with the most rows, then the ones classified `unclear` or `both` (a person should read those). */
  readonly phrasings: readonly Phrasing[];
  readonly distinct: number;
}

export interface ReviewerKindReport {
  readonly manifestSha256: string;
  readonly columns: readonly ReviewerColumnReport[];
  readonly totals: Readonly<Record<ReviewerKind, number>>;
  readonly rows: number;
}

const emptyCounts = (): Record<ReviewerKind, number> => ({ agent: 0, human: 0, both: 0, unclear: 0, 'not-stated': 0 });
const TOP = 6;

/** One reviewer column: its cells counted by kind (the counts are added to `totals` too) and grouped by wording. */
function reportColumn(table: TableName, column: string, cells: readonly (string | null)[], totals: Record<ReviewerKind, number>): ReviewerColumnReport {
  const counts = emptyCounts();
  const seen = new Map<string, { kind: ReviewerKind; rows: number }>();
  for (const text of cells) {
    const kind = classifyReviewer(text);
    counts[kind]++;
    totals[kind]++;
    const key = text ?? '';
    const was = seen.get(key);
    if (was === undefined) seen.set(key, { kind, rows: 1 }); else was.rows++;
  }
  const all = [...seen].map(([text, v]): Phrasing => ({ text, kind: v.kind, rows: v.rows })).sort((a, b) => b.rows - a.rows || (a.text < b.text ? -1 : Number(a.text > b.text)));
  const reading = all.filter((p) => p.kind === 'unclear' || p.kind === 'both');
  const phrasings = [...all.slice(0, TOP), ...reading.filter((p) => !all.slice(0, TOP).includes(p)).slice(0, TOP)];
  return { table, column, rows: cells.length, counts, phrasings, distinct: all.length };
}

/** Classify every reviewer cell of the tables under `dataDir`. Reads the CSV; changes nothing. */
export function reviewerKindReport(dataDir: string = DEFAULT_DATA_DIR): ReviewerKindReport {
  const columns: ReviewerColumnReport[] = [];
  const totals = emptyCounts();
  for (const table of TABLE_NAMES) {
    const present = REVIEWER_COLUMNS.map((column) => ({ column, at: TABLES[table].columns.findIndex((c) => c.name === column) })).filter(({ at }) => at >= 0);
    if (present.length === 0) continue;
    const { header, records } = parseCsv(readFileSync(join(dataDir, 'tables', `${table}.csv`), 'utf8'), `${table}.csv`);
    for (const { column, at } of present) {
      // The column is found by the schema; the file must agree, or a different column would be reported under this one's name.
      if (header[at] !== column) throw new Error(`${table}.csv has "${header[at] ?? '(nothing)'}" where the schema has "${column}": the report reads the columns of the schema this repository holds, so give it data of that shape`);
      columns.push(reportColumn(table, column, records.map((record) => record.cells[at] ?? null), totals));
    }
  }
  const rows = columns.reduce((sum, c) => sum + c.rows, 0);
  return { manifestSha256: sha256Of(readFileSync(join(dataDir, 'manifest.json'))), columns, totals, rows };
}

const cell = (text: string): string => text.replaceAll('|', '\\|').replace(/\s+/g, ' ');
const clip = (text: string, n: number): string => (text.length > n ? `${text.slice(0, n - 1)}…` : text);
const pct = (part: number, whole: number): string => (whole === 0 ? '0%' : `${((100 * part) / whole).toFixed(1)}%`);

/** The report as Markdown. Deterministic: the same data gives the same text, so a stale file is detected by comparing. */
export function renderReviewerKindReport(report: ReviewerKindReport): string {
  const lines: string[] = [];
  const { totals } = report;
  lines.push(
    '# Reviewer kinds in the existing data',
    '',
    `> **In short.** Of the ${report.rows.toLocaleString('en-US')} cells that say who reviewed, read or wrote a row, ${totals.agent} (${pct(totals.agent, report.rows)}) name an agent only, ${totals.human} name a person only, ${totals.both} name both, ${totals.unclear} say neither and ${totals['not-stated']} state nothing.`
      + " This is a one-off reading of free text (owner ruling OQ-17 A, 2026-10-20): it changes no cell. From now on a write command records each reviewer's kind beside the cell, so new rows can be queried by it; these rows keep the words they have.",
    '',
    `Generated by \`npm run report:reviewers\` from \`data/tables\` (manifest SHA-256 \`${report.manifestSha256.slice(0, 16)}\`). Do not edit: \`npm run report:reviewers -- --check\` fails when it is stale.`,
    '',
    '## What this is, and is not',
    '',
    '- **A claim, not a proof.** Agents commit under the owner\'s account (OQ-19 B), so Git cannot tell who looked. A cell says what its writer wrote. The owner\'s own record of approval is `npm run wp:attest`, not these cells.',
    '- **Read only.** It reads the cells and writes this file. No data, schema or script was changed.',
    '- **Going forward.** The write service now refuses a write to a "Reviewed by", "Read by" or "Written by" cell without `reviewedBy` (each reviewer with their kind), records it in the change record, and treats a human among them as Tier 1.',
    '',
    '## How a cell is classified',
    '',
    '1. Empty, "Not published", "Not applicable", "None" or "Unknown": **not stated**.',
    '2. Words that mention a person without naming one as the reviewer are set aside first: a ruling of the owner ("switched to deciding as the owner ruled on 2026-10-20", "owner ruling") says who decided a rule, and "no human review" says there was none.',
    '3. A model or tool by name (Claude, Opus, Sonnet, Haiku, Codex, GPT, Gemini), or the words agent, AI, LLM, reader or model: names an **agent**.',
    '4. The owner, a human, a person, "by hand": names a **human**.',
    '5. Both: **both**. Neither: **unclear**, listed below for a person to read.',
    '',
    '## By column',
    '',
    '| Table | Column | Rows | Agent | Human | Both | Unclear | Not stated |',
    '|---|---|---:|---:|---:|---:|---:|---:|',
    ...report.columns.map((c) => `| ${c.table} | ${c.column} | ${c.rows} | ${c.counts.agent} | ${c.counts.human} | ${c.counts.both} | ${c.counts.unclear} | ${c.counts['not-stated']} |`),
    `| **All** | | **${report.rows}** | **${totals.agent}** | **${totals.human}** | **${totals.both}** | **${totals.unclear}** | **${totals['not-stated']}** |`,
    '',
    '## The wordings, so the classification can be checked',
    '',
    'The wordings with the most rows in each column, and every wording the reading could not settle (`both`, `unclear`). A wording is cut at 140 characters here; the cell is not.',
    '',
  );
  for (const c of report.columns) {
    lines.push(`### ${c.table}.${c.column}`, '', `${c.rows} rows, ${c.distinct} distinct wordings.`, '', '| Rows | Read as | Wording |', '|---:|---|---|');
    for (const p of c.phrasings) lines.push(`| ${p.rows} | ${p.kind} | ${cell(clip(p.text === '' ? '(empty)' : p.text, 140))} |`);
    lines.push('');
  }
  const open = report.columns.flatMap((c) => c.phrasings.filter((p) => p.kind === 'unclear' || p.kind === 'both').map((p) => `${c.table}.${c.column}: ${p.rows} row(s) read as ${p.kind}`));
  lines.push('## What a person should read', '', open.length ? open.map((line) => `- ${line}`).join('\n') : 'Nothing: every wording names an agent, a person or nothing, and none names both.', '');
  return `${lines.join('\n').trimEnd()}\n`;
}
