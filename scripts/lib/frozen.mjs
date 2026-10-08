// A round's frozen list (its targets, the documents it reads) is written once, before anything is read: it is what the
// round is judged against, so a re-run of the round's script must not rewrite it from data the round has since changed
// (completeness round, 2026-10-07: an audit run of the reader round's targets.mjs rewrote its frozen DOCS and TARGETS).
// A write that would change a frozen file stops, unless the run passes --refreeze; one that writes the same bytes is a
// no-op.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export function writeFrozen(path, text, argv = process.argv) {
  if (existsSync(path) && !argv.includes('--refreeze')) {
    if (readFileSync(path, 'utf8') === text) return false;
    throw new Error(`${path} is frozen: it is what its round was judged against, and this run would change it. Pass --refreeze to write it again.`);
  }
  writeFileSync(path, text);
  return true;
}
