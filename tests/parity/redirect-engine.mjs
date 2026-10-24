// A module resolution hook, loaded with `node --import`: every import of app/js/engine/<name>.js, from any file, resolves to the
// same name in the staged engine named by ATLAS_STAGED_ENGINE (the old files with the ported modules switched in, port/stage.ts).
// It lets the old test files run unedited against the new engine (tests/parity/old-tests-on-port.test.mjs).
import { registerHooks } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const staged = process.env.ATLAS_STAGED_ENGINE;
const engineUrl = process.env.ATLAS_OLD_ENGINE_URL;
if (!staged || !engineUrl) throw new Error('redirect-engine: ATLAS_STAGED_ENGINE and ATLAS_OLD_ENGINE_URL must be set');

registerHooks({
  resolve(specifier, context, nextResolve) {
    const resolved = nextResolve(specifier, context);
    if (resolved.url.startsWith(engineUrl) && resolved.url.endsWith('.js')) {
      return { ...resolved, url: pathToFileURL(join(staged, resolved.url.slice(engineUrl.length))).href };
    }
    return resolved;
  },
});
