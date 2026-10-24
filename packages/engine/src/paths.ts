// Where the old engine lives: the repository root and app/js/engine, which is only ever read.
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));
export const ENGINE_DIR = join(REPO_ROOT, 'app', 'js', 'engine');
