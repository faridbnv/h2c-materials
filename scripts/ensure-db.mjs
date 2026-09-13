// Database tests must reflect current inputs, even when dist/db.json already exists.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');


console.log('Building the current workbook and code before database tests.\n');
const r = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(r.status ?? 1);
