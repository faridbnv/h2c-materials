// WP-06: the three TypeScript levels, TypeScript 6 itself, and the compile-time proof that rows and columns agree.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const tsc = (...args) => spawnSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), ...args], { cwd: root, encoding: 'utf8' });

function resolved(config) {
  const run = tsc('--showConfig', '-p', config);
  assert.equal(run.status, 0, run.stderr || run.stdout);
  return JSON.parse(run.stdout).compilerOptions;
}

test('TypeScript is 6.x, pinned exactly in package.json', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.match(pkg.devDependencies.typescript, /^6\.\d+\.\d+$/);
  assert.equal(JSON.parse(readFileSync(join(root, 'node_modules/typescript/package.json'), 'utf8')).version, pkg.devDependencies.typescript);
  for (const name of ['typescript-eslint', 'eslint', '@types/node']) assert.match(pkg.devDependencies[name], /^\d+\.\d+\.\d+$/, `${name} must be pinned exactly`);
  assert.deepEqual(pkg.workspaces, ['packages/*']);
});

test('base level: erasable syntax only, type-only imports explicit, no emit, no TypeScript 7 hazards', () => {
  const o = resolved('tsconfig.base.json');
  for (const flag of ['strict', 'erasableSyntaxOnly', 'verbatimModuleSyntax', 'noEmit', 'rewriteRelativeImportExtensions', 'noImplicitOverride', 'skipLibCheck']) assert.equal(o[flag], true, flag);
  assert.equal(o.module, 'nodenext');
  assert.equal(o.baseUrl, undefined);
  assert.equal(o.paths, undefined);
});

test('strong level adds the four checks; interface level is strong', () => {
  const base = resolved('tsconfig.base.json');
  const strong = resolved('tsconfig.strong.json');
  for (const flag of ['noUncheckedIndexedAccess', 'exactOptionalPropertyTypes', 'noImplicitReturns', 'noFallthroughCasesInSwitch']) {
    assert.equal(base[flag], undefined, `${flag} is not in base`);
    assert.equal(strong[flag], true, flag);
  }
  const config = JSON.parse(readFileSync(join(root, 'tsconfig.interface.json'), 'utf8'));
  assert.equal(config.extends, './tsconfig.strong.json');
});

test('tsc --noEmit is clean at the default and the strong level', () => {
  for (const args of [['--noEmit'], ['--noEmit', '-p', 'tsconfig.strong.json']]) {
    const run = tsc(...args);
    assert.equal(run.status, 0, run.stdout + run.stderr);
  }
});

test('a row type that loses a column fails tsc in tables-check.ts, naming the table', () => {
  const scratch = join(root, 'node_modules/.cache');
  mkdirSync(scratch, { recursive: true });
  const tmp = mkdtempSync(join(scratch, 'rows-mutation-'));
  try {
    cpSync(join(root, 'packages/data/src'), join(tmp, 'src'), { recursive: true });
    const rows = join(tmp, 'src/generated/rows.ts');
    const mutated = readFileSync(rows, 'utf8').replace('  readonly "CAD per unit": number;\n', '');
    assert.notEqual(mutated, readFileSync(rows, 'utf8'));
    writeFileSync(rows, mutated);
    writeFileSync(join(tmp, 'tsconfig.json'), JSON.stringify({ extends: join(root, 'tsconfig.strong.json'), include: ['src/**/*.ts'], exclude: [] }));
    const run = tsc('--noEmit', '-p', join(tmp, 'tsconfig.json'));
    assert.equal(run.status, 2, run.stdout);
    assert.match(run.stdout, /tables-check\.ts.*fx_rates/s);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('the lint rule on `any` agrees with the type ratchet: off exactly where the baseline records a count, an error elsewhere', () => {
  const ratchet = JSON.parse(readFileSync(join(root, 'remake/types-ratchet.json'), 'utf8'));
  const tolerated = Object.entries(ratchet.files).filter(([, c]) => c.any > 0).map(([f]) => f);
  assert.ok(tolerated.length >= 3, 'the baseline tolerates `any` in a few parity files');
  const severity = (file) => {
    const run = spawnSync(process.execPath, [join(root, 'node_modules/eslint/bin/eslint.js'), '--print-config', file], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    const rule = JSON.parse(run.stdout).rules['@typescript-eslint/no-explicit-any'];
    return rule[0];
  };
  for (const file of tolerated) assert.equal(severity(file), 0, `${file}: baseline tolerates its any`);
  // A tolerated count is bounded by the ratchet; a file the baseline records at zero is held to the lint rule.
  for (const file of ['packages/parity/src/cli.ts', 'packages/parity/src/canon.ts', 'packages/parity/src/compare.ts']) {
    assert.ok(!tolerated.includes(file), file);
    assert.equal(severity(file), 2, `${file}: any is an error`);
  }
});
