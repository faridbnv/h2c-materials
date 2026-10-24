#!/usr/bin/env node
// The type ratchet (15-TYPESCRIPT-PLAN section 6.1): counts the escapes from the type checker in packages/ and apps/,
// and fails when any file has more than remake/types-ratchet.json records. The counts may only fall.
//
//   npm run types:ratchet                 compare; exit 1 on an increase
//   npm run types:ratchet -- --update     record lower counts and newly converted files at their measured count;
//                                         refuses to raise a number that is already recorded
//
// Counted per file: `as` casts and <T>x assertions (not `as const`, which asserts nothing), the `any` keyword,
// `@ts-expect-error` and `@ts-ignore` comments. A newly converted module starts at its measured count.
import { readFileSync, readdirSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const here = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(here, '../..');
const BASELINE = 'remake/types-ratchet.json';
const ROOTS = ['packages', 'apps'];
const KINDS = ['casts', 'any', 'tsExpectError', 'tsIgnore'];
const SOURCE = /\.(ts|tsx|mts|cts)$/;

function* sourceFiles(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(path);
    else if (SOURCE.test(entry.name) && !entry.name.endsWith('.d.ts')) yield path;
  }
}

/** The four counts for one source text. */
export function countEscapes(text, fileName = 'file.ts') {
  const counts = { casts: 0, any: 0, tsExpectError: 0, tsIgnore: 0 };
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
  const visit = (node) => {
    if (ts.isAsExpression(node) && !(ts.isTypeReferenceNode(node.type) && node.type.typeName.getText(source) === 'const')) counts.casts++;
    if (ts.isTypeAssertionExpression(node)) counts.casts++;
    if (node.kind === ts.SyntaxKind.AnyKeyword) counts.any++;
    ts.forEachChild(node, visit);
  };
  visit(source);
  // Comments: scan the token stream so a mention inside a string does not count.
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, text);
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (token !== ts.SyntaxKind.SingleLineCommentTrivia && token !== ts.SyntaxKind.MultiLineCommentTrivia) continue;
    const comment = scanner.getTokenText();
    if (/@ts-expect-error\b/.test(comment)) counts.tsExpectError++;
    if (/@ts-ignore\b/.test(comment)) counts.tsIgnore++;
  }
  return counts;
}

/** { 'packages/x/src/a.ts': { casts, any, tsExpectError, tsIgnore } } for every file with a nonzero count, plus totals. */
export function measure(root = REPO) {
  const files = {};
  const totals = Object.fromEntries(KINDS.map((k) => [k, 0]));
  for (const base of ROOTS) {
    for (const path of sourceFiles(join(root, base))) {
      const counts = countEscapes(readFileSync(path, 'utf8'), path);
      for (const k of KINDS) totals[k] += counts[k];
      if (KINDS.some((k) => counts[k] > 0)) files[relative(root, path).split('\\').join('/')] = counts;
    }
  }
  return { totals, files };
}

/** Problems when `now` exceeds `baseline` (a file missing from the baseline is allowed zero of everything). */
export function compare(baseline, now) {
  const problems = [];
  for (const [file, counts] of Object.entries(now.files)) {
    const allowed = baseline.files[file] ?? {};
    for (const k of KINDS) {
      if (counts[k] > (allowed[k] ?? 0)) problems.push(`${file}: ${k} ${counts[k]} is above the baseline ${allowed[k] ?? 0}`);
    }
  }
  return problems;
}

function recordable(baseline, now) {
  const raised = [];
  for (const [file, counts] of Object.entries(baseline.files)) {
    for (const k of KINDS) if ((now.files[file]?.[k] ?? 0) > counts[k]) raised.push(`${file}: ${k}`);
  }
  return raised;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const path = join(REPO, BASELINE);
  const now = measure();
  const total = KINDS.map((k) => `${k} ${now.totals[k]}`).join(', ');
  if (process.argv.includes('--update')) {
    const previous = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { files: {} };
    const raised = recordable(previous, now);
    if (raised.length) {
      console.error(`types:ratchet: refusing to raise a recorded count:\n${raised.map((r) => `  ${r}`).join('\n')}`);
      process.exit(1);
    }
    writeFileSync(path, `${JSON.stringify({ $comment: 'Escapes from the type checker per file in packages/ and apps/. The counts may only fall (npm run types:ratchet). Regenerate with --update after lowering a count or converting a module.', totals: now.totals, files: now.files }, null, 2)}\n`);
    console.log(`types:ratchet: baseline written (${total})`);
  } else {
    if (!existsSync(path)) { console.error(`types:ratchet: ${BASELINE} is missing; run with --update to create it`); process.exit(1); }
    const problems = compare(JSON.parse(readFileSync(path, 'utf8')), now);
    if (problems.length) {
      console.error(`types:ratchet: counts rose:\n${problems.map((p) => `  ${p}`).join('\n')}`);
      process.exit(1);
    }
    console.log(`types:ratchet: no increase (${total})`);
  }
}
