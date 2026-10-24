// Loading a copy of the old engine: a fresh module instance, optionally with a fault patched in.
// The real files under app/js/engine are only ever READ. A fault goes into a temporary copy, never into the real file.
import { copyFileSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const ENGINE_DIR = join(REPO_ROOT, 'app', 'js', 'engine');

/** An exact text patch to one engine file. `count` is how many times `find` must occur: the fault fails loudly if the engine moved. */
export interface Patch {
  file: string;
  find: string;
  replace: string;
  count?: number;
}

/** A decoded link or saved file: the scenario it holds and the warnings it earned. */
export interface Decoded {
  scenario: Record<string, unknown>;
  warnings: string[];
}

/** The scenario module's decoders. Each throws a readable Error for a link or file it refuses; fromHash returns null for no hash at all. */
export interface ScenarioModule {
  fromHash(hash: string, meta: unknown, options: object): Decoded | null;
  deserialize(text: string, meta: unknown, options: object): Decoded;
}

export interface EngineModules {
  constraints: any;
  products: any;
  indices: any;
  scenario: ScenarioModule;
}

const tempDirs: string[] = [];
process.on('exit', () => { for (const d of tempDirs) { try { rmSync(d, { recursive: true, force: true }); } catch { /* best effort */ } } });

/** A temporary directory the harness made: removed when the process ends, whatever the exit code. */
export function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

/** Copy app/js/engine into a new temp directory and apply the patches there. Returns the directory. */
export function copyEngine(patches: readonly Patch[] = [], engineDir: string = ENGINE_DIR): string {
  const dir = makeTempDir('h2c-parity-engine-');
  for (const f of readdirSync(engineDir).filter((n) => n.endsWith('.js'))) copyFileSync(join(engineDir, f), join(dir, f));
  for (const p of patches) {
    const path = join(dir, p.file);
    const text = readFileSync(path, 'utf8');
    const found = text.split(p.find).length - 1;
    if (found !== (p.count ?? 1)) {
      throw new Error(`fault patch for ${p.file} found ${found} occurrence(s) of ${JSON.stringify(p.find.slice(0, 60))}, expected ${p.count ?? 1}: the engine changed, update the fault`);
    }
    writeFileSync(path, text.split(p.find).join(p.replace));
  }
  return dir;
}

/** Import the engine modules from a directory. The same directory imported twice shares instances; use copyEngine for a fresh one. */
export async function loadEngine(dir: string): Promise<EngineModules> {
  const from = (f: string) => import(pathToFileURL(join(dir, f)).href);
  const [constraints, products, indices, scenario] = await Promise.all([from('constraints.js'), from('products.js'), from('indices.js'), from('scenario.js')]);
  return { constraints, products, indices, scenario };
}
