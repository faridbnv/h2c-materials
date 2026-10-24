// `npm run editor`: build the interface when it is missing or older than its sources, start the service on 127.0.0.1 and print the
// address to open. The token is in the address after the `#`, which a browser keeps to itself. Ctrl+C stops it; drafts are in the
// sandbox workspace and are there next time.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { DIST_DIR, startService } from './service.ts';

const APP_DIR = fileURLToPath(new URL('..', import.meta.url));

function newestInside(dir: string): number {
  return readdirSync(dir, { withFileTypes: true }).reduce((newest, entry) => {
    const path = join(dir, entry.name);
    return Math.max(newest, entry.isDirectory() ? newestInside(path) : statSync(path).mtimeMs);
  }, 0);
}

/** Whether `dist/` is missing or older than the interface's sources, config or lock of its tools. */
function interfaceIsStale(): boolean {
  const built = join(DIST_DIR, 'index.html');
  if (!existsSync(built)) return true;
  const sources = [newestInside(join(APP_DIR, 'src')), ...['index.html', 'vite.config.ts', 'package.json'].map((f) => statSync(join(APP_DIR, f)).mtimeMs)];
  return Math.max(...sources) > statSync(built).mtimeMs;
}

async function buildInterface(): Promise<void> {
  console.error('Building the editor interface...');
  const { build } = await import('vite');
  await build({ root: APP_DIR, logLevel: 'warn' });
}

const { values } = parseArgs({
  options: {
    workspace: { type: 'string' }, 'source-store': { type: 'string' }, 'data-dir': { type: 'string' },
    open: { type: 'boolean', default: false }, 'no-build': { type: 'boolean', default: false }, port: { type: 'string' }, 'ready-line': { type: 'boolean', default: false },
  },
});

if (!values['no-build'] && interfaceIsStale()) await buildInterface();

const service = await startService({
  ...(values.workspace === undefined ? {} : { workspaceDir: resolve(values.workspace) }),
  ...(values['source-store'] === undefined ? {} : { sourceStore: resolve(values['source-store']) }),
  ...(values['data-dir'] === undefined ? {} : { dataDir: resolve(values['data-dir']) }),
  ...(values.port === undefined ? {} : { port: Number(values.port) }),
});
const state = await service.editor.state();
// Since the process began: Node's start, loading the code, the interface build when it is stale, opening the workspace.
const readyMs = Math.round(performance.now());

console.error('Filament Atlas editor, sandbox workspace (changes stay on this computer).');
console.error(`  data from commit ${state.commit.slice(0, 12)}; ${state.drafts} draft(s), ${state.conflicts} conflict(s)`);
console.error(`  source store: ${service.editor.library.root ?? 'not on this computer'}`);
console.error(`  impact preview: ${state.impact.available ? 'available' : state.impact.note}`);
console.error(`  ready in ${(readyMs / 1000).toFixed(2)} s`);
console.error(`\nOpen this address (the part after # is this session's secret):\n  ${service.launchUrl}\n`);
if (values['ready-line']) console.log(JSON.stringify({ ready: true, readyMs, launchUrl: service.launchUrl, port: service.port }));

if (values.open && process.platform === 'darwin') spawnSync('open', [service.launchUrl], { stdio: 'ignore' });

const stop = (): void => { void service.close().then(() => process.exit(0)); };
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
