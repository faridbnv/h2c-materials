// Some tests assert invariants on the compiled database rather than on a fixture, because the
// invariants are about the real snapshot. That means `npm test` needs dist/db.json to exist.
//
// On a fresh clone it does not, and fourteen tests failed with a message telling you to run the
// build. This removes that trap: if the compiled database is missing, build it first.

import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
if (existsSync(join(root, 'dist/db.json'))) process.exit(0);

console.log('dist/db.json is missing; building it first.\n');
const r = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(r.status ?? 1);
