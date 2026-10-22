#!/usr/bin/env node
// P-erase, the label-only check (15-TYPESCRIPT-PLAN appendix A3). For a file that claims to differ from its old .js
// only by type labels: strip the labels, rewrite `.ts` import specifiers back to `.js`, and require the result to equal
// the old file.
//
//   npm run parity:erase                      every pair in remake/p-erase.json
//   npm run parity:erase -- old.js new.ts     one pair
//
// Stripping is Node's own (node:module stripTypeScriptTypes, mode "strip": labels become blank space, line numbers
// stay). "Equal" means: both sides parsed as JavaScript and printed by one printer, so whitespace, line breaks and a
// trailing comma never matter but every token, name, literal and comment does. A file that fails is not a label-only
// change and goes to the refactor lane. What this does not prove: that the old file was right, or that the types are.
//
// A pair may also carry `rewrites: [{ from, to }]`: literal text that has to change because the file MOVED, not because it
// was relabelled (a path written relative to the old location, an import of a file outside the moved tree). Each rewrite is
// applied to the OLD text before the comparison, and must occur in it (a rewrite that matches nothing is stale and fails),
// so the list is the complete, reviewed set of non-label edits in that file.
//
// A pair may also carry `split: [files]`: .ts files that hold code MOVED out of the new file (a lens-only export taken out of a
// module the first page load shares, so the load does not carry it). The old file's statements must then be exactly the statements
// of the new file and of its split files together, once each, in any order, compared as code (a comment is not compared, since the
// moved code gets a header of its own); import declarations and export lists are left out of both sides, since they are the wiring
// of the split and the type checker resolves them. No statement is added, dropped or changed.
import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const here = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(here, '../..');

/** `import x from './a.ts'`, `export * from "./a.ts"`, `import('./a.ts')` -> the same with `.js`. */
export function rewriteSpecifiers(js) {
  return js.replace(/(\b(?:from|import)\s*\(?\s*)(['"])(\.{1,2}\/[^'"]*)\.ts\2/g, '$1$2$3.js$2');
}

/** The JavaScript a TypeScript file stands for once its labels are erased. */
export function erase(tsText) {
  return rewriteSpecifiers(stripTypeScriptTypes(tsText, { mode: 'strip' }));
}

/** A transformer that replaces every parenthesized expression by the expression inside it. */
const withoutParentheses = (context) => (root) => {
  const visit = (node) => (ts.isParenthesizedExpression(node) ? visit(node.expression) : ts.visitEachChild(node, visit, context));
  return ts.visitNode(root, visit);
};

/**
 * One canonical text for a JavaScript file: parsed, then printed, so layout never decides equality. Redundant parentheses
 * are dropped first (the printer puts back the ones precedence needs), because erasing a cast leaves them behind:
 * `({ a: 1 } as Words)[key]` erases to `({ a: 1 })[key]`, the old file says `{ a: 1 }[key]`, and once the parentheses are gone
 * the two are one tree. Two files with one tree are one program, so this cannot make a change look equal.
 */
export function canonical(js, fileName = 'file.js') {
  const source = ts.createSourceFile(fileName, js, ts.ScriptTarget.Latest, false, ts.ScriptKind.JS);
  const { transformed } = ts.transform(source, [withoutParentheses]);
  return ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printFile(transformed[0]);
}

/** The old text with a pair's declared rewrites applied; a rewrite that finds nothing is an error, never a silent no-op. */
export function applyRewrites(oldJs, rewrites = []) {
  let text = oldJs;
  for (const { from, to } of rewrites) {
    if (!text.includes(from)) throw new Error(`rewrite not found in the old file (stale?): ${from}`);
    text = text.replaceAll(from, to);
  }
  return text;
}

/** { equal, firstDifference } for an old .js text and a new .ts text. */
export function compareErased(oldJs, newTs, rewrites = []) {
  const left = canonical(applyRewrites(oldJs, rewrites)).split('\n');
  const right = canonical(erase(newTs)).split('\n');
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    if (left[i] !== right[i]) return { equal: false, firstDifference: { line: i + 1, old: left[i] ?? '(end)', erased: right[i] ?? '(end)' } };
  }
  return { equal: true };
}

/** The printed top-level statements of a JavaScript text, comments and wiring (imports and export lists) left out. */
function statements(js) {
  const source = ts.createSourceFile('file.js', js, ts.ScriptTarget.Latest, false, ts.ScriptKind.JS);
  const wiring = (n) => ts.isImportDeclaration(n) || ts.isExportDeclaration(n);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: true });
  return source.statements.filter((n) => !wiring(n)).map((n) => printer.printNode(ts.EmitHint.Unspecified, ts.transform(n, [withoutParentheses]).transformed[0], source));
}

/** { equal, firstDifference } for an old .js text and the new .ts text together with the files its code was moved into. */
export function compareSplit(oldJs, newTs, splitTs, rewrites = []) {
  const left = statements(applyRewrites(oldJs, rewrites));
  const right = [newTs, ...splitTs].flatMap((t) => statements(erase(t)));
  const unmatched = [...right];
  for (const st of left) {
    const at = unmatched.indexOf(st);
    if (at < 0) return { equal: false, firstDifference: { line: left.indexOf(st) + 1, old: st.split('\n')[0], erased: '(no such statement in the new file or its split files)' } };
    unmatched.splice(at, 1);
  }
  if (unmatched.length) return { equal: false, firstDifference: { line: left.length + 1, old: '(end)', erased: unmatched[0].split('\n')[0] } };
  return { equal: true };
}

function checkPairs(pairs, root) {
  let failed = 0;
  for (const { old, new: newPath, rewrites, split } of pairs) {
    for (const f of [old, newPath, ...(split ?? [])]) if (!existsSync(resolve(root, f))) throw new Error(`parity:erase: ${f} does not exist`);
    const text = (f) => readFileSync(resolve(root, f), 'utf8');
    const result = split?.length ? compareSplit(text(old), text(newPath), split.map(text), rewrites) : compareErased(text(old), text(newPath), rewrites);
    if (result.equal) console.log(`P-erase ok     ${newPath} == ${old}${split?.length ? ` + ${split.length} split file${split.length === 1 ? '' : 's'}` : ''}${rewrites?.length ? ` (with ${rewrites.length} declared rewrite${rewrites.length === 1 ? '' : 's'})` : ''}`);
    else {
      failed++;
      const d = result.firstDifference;
      console.error(`P-erase FAILED ${newPath} != ${old}\n  first difference at printed line ${d.line}\n    old:    ${d.old.trim()}\n    erased: ${d.erased.trim()}`);
    }
  }
  return failed;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  const pairs = args.length === 2 ? [{ old: args[0], new: args[1] }] : JSON.parse(readFileSync(resolve(REPO, 'remake/p-erase.json'), 'utf8')).pairs;
  if (args.length !== 0 && args.length !== 2) { console.error('usage: parity:erase [-- old.js new.ts]'); process.exit(2); }
  const failed = checkPairs(pairs, args.length === 2 ? process.cwd() : REPO);
  if (failed) process.exit(1);
  console.log(`P-erase: ${pairs.length} pair(s) label-only`);
}
