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

/**
 * One canonical text for a JavaScript file: parsed, then printed, so layout never decides equality. Parentheses that group
 * nothing the tree does not already say are dropped first (the printer puts back the ones precedence needs), because a cast
 * leaves them behind when its labels are erased: `({ a: 1 } as Words)[key]` erases to `({ a: 1 })[key]`, the old file says
 * `{ a: 1 }[key]`, and the two are one tree. Two files with one tree are one program, so this cannot make a change look equal.
 */
export function canonical(js, fileName = 'file.js') {
  const source = ts.createSourceFile(fileName, js, ts.ScriptTarget.Latest, false, ts.ScriptKind.JS);
  const withoutParens = (context) => (root) => {
    const visit = (node) => (ts.isParenthesizedExpression(node) ? visit(node.expression) : ts.visitEachChild(node, visit, context));
    return ts.visitNode(root, visit);
  };
  const { transformed } = ts.transform(source, [withoutParens]);
  return ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printFile(transformed[0]);
}

/** { equal, firstDifference } for an old .js text and a new .ts text. */
export function compareErased(oldJs, newTs) {
  const left = canonical(oldJs).split('\n');
  const right = canonical(erase(newTs)).split('\n');
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    if (left[i] !== right[i]) return { equal: false, firstDifference: { line: i + 1, old: left[i] ?? '(end)', erased: right[i] ?? '(end)' } };
  }
  return { equal: true };
}

function checkPairs(pairs, root) {
  let failed = 0;
  for (const { old, new: newPath } of pairs) {
    for (const f of [old, newPath]) if (!existsSync(resolve(root, f))) throw new Error(`parity:erase: ${f} does not exist`);
    const result = compareErased(readFileSync(resolve(root, old), 'utf8'), readFileSync(resolve(root, newPath), 'utf8'));
    if (result.equal) console.log(`P-erase ok     ${newPath} == ${old}`);
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
