// The port switch (WP-18): which engine modules run from their TypeScript port, and the staged directory that makes it so.
//
// The old engine is a set of ES modules that import each other by relative `.js` path, and the old files are never edited
// (app/js/engine is the comparison baseline). So a mixed engine, ported modules beside old ones, is a staged directory:
//   - a ported module's source is copied in as `<name>.ts`, and `<name>.js` there re-exports it;
//   - an old module's file is copied in as `<name>.js`, and `<name>.ts` there re-exports it.
// An old module that imports `./products.js` and a ported module that imports `./constraints.ts` therefore both reach the
// one instance of the module they name, whichever side of the switch it is on. Node strips the labels of a `.ts` file as it
// loads it, which is the erasure P-erase proves equal to the old file for a label-only port.
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ENGINE_DIR } from '../paths.ts';

/** Every module of app/js/engine. */
export const ENGINE_MODULES = ['constraints', 'coverage', 'filler', 'indices', 'ledger', 'pareto', 'products', 'scenario', 'search', 'workspace'] as const;
export type EngineModuleName = (typeof ENGINE_MODULES)[number];

/** The modules WP-18 ports. `constraints` and `workspace` are WP-19. */
export const PORTABLE = ['pareto', 'filler', 'search', 'coverage', 'ledger', 'indices', 'products', 'scenario'] as const;
export type PortableModule = (typeof PORTABLE)[number];

/** The switch: the modules the typed wrapper runs from their port. A module joins this list in the commit that ports it. */
export const WIRED: readonly PortableModule[] = ['pareto', 'filler', 'search', 'coverage', 'ledger'];

/** The environment variable that overrides the switch: `none` (the old engine as it is), `all`, or a comma-separated list. */
export const PORT_ENV = 'ATLAS_ENGINE_PORT';

export const PORT_DIR = fileURLToPath(new URL('.', import.meta.url));

const isPortable = (name: string): name is PortableModule => PORTABLE.some((m) => m === name);

/** The modules to run from their port: the environment's choice when it makes one, else the committed switch. */
export function activePorts(env: Readonly<Record<string, string | undefined>> = process.env): readonly PortableModule[] {
  const asked = env[PORT_ENV]?.trim();
  if (!asked) return WIRED;
  if (asked === 'none') return [];
  if (asked === 'all') return PORTABLE;
  const named = asked.split(',').map((s) => s.trim());
  const ports: PortableModule[] = [];
  for (const name of named) {
    if (!isPortable(name)) throw new Error(`${PORT_ENV}: "${name}" is not a module WP-18 ports (known: ${PORTABLE.join(', ')}; or none, all)`);
    if (!ports.includes(name)) ports.push(name);
  }
  return ports;
}

const tempDirs: string[] = [];
process.on('exit', () => {
  for (const dir of tempDirs) {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort: a temp directory left behind is harmless */ }
  }
});

export interface StageOptions {
  /** Where the old modules come from: the in-tree engine, or a byte copy of it. */
  readonly from?: string;
  /** Where the ported modules come from: this directory, or a copy with a fault patched in (the harness' own tests). */
  readonly portDir?: string;
}

/** A new temporary directory holding the whole engine, the named modules from their port and the rest as the old files are. Removed when the process ends. */
export function stageEngine(ports: readonly PortableModule[] = activePorts(), { from = ENGINE_DIR, portDir = PORT_DIR }: StageOptions = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-engine-stage-'));
  tempDirs.push(dir);
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}\n');
  for (const name of ENGINE_MODULES) {
    const ported = ports.some((p) => p === name);
    copyFileSync(join(ported ? portDir : from, ported ? `${name}.ts` : `${name}.js`), join(dir, ported ? `${name}.ts` : `${name}.js`));
    writeFileSync(join(dir, ported ? `${name}.js` : `${name}.ts`), `export * from './${ported ? `${name}.ts` : `${name}.js`}';\n`);
  }
  return dir;
}

/** What one module of an engine directory exports. */
export type EngineModule = Readonly<Record<string, unknown>>;

/** Every module of a staged (or any) engine directory, imported by its `.js` name. */
export async function importStaged(dir: string): Promise<ReadonlyMap<EngineModuleName, EngineModule>> {
  const entries = await Promise.all(ENGINE_MODULES.map(async (name): Promise<[EngineModuleName, EngineModule]> => [name, await import(pathToFileURL(join(dir, `${name}.js`)).href)]));
  return new Map(entries);
}
