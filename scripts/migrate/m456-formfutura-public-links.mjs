#!/usr/bin/env node
// Migration m456 (2026-10-19): FormFutura sheets that were registered from FormFutura's SharePoint, a link that asks a
// reader to sign in (OPEN-PROBLEMS, the research package's task P4.5), point to the public address FormFutura serves the
// same file from (the research intake, stage 8).
//
// The research agent of 2026-10-19 fetched each sheet from formfutura.com/web/content/<id>?download=true and hashed it:
// every one hashes to the SHA-256 registered for it, so the document is the one every record read, and only the address
// a reader is sent to changes. The list, with each fetched digest, is
// docs/audits/2026-10-19-research-intake/later/formfutura-public.csv; this migration checks each digest against the
// registered one before it writes, sets URL (naming the SharePoint address it replaces) and keeps the old address in the
// Access note. A re-run is a no-op.
//
//   node scripts/migrate/m456-formfutura-public-links.mjs [--dry-run]
import { join } from 'node:path';
import { openTables, projectRoot } from '../data/table-io.mjs';
import { rowsOf } from '../lib/sweep-shared.mjs';

const MIGRATION = 'm456';
const t = openTables();
let moved = 0;
for (const r of rowsOf(join(projectRoot, 'docs/audits/2026-10-19-research-intake/later/formfutura-public.csv'))) {
  const s = t.get('sources', r.SourceID);
  if (s.URL === r.URL) continue;
  if (s.SHA256 !== r.SHA256) throw new Error(`${MIGRATION}: ${r.SourceID} is registered as ${s.SHA256.slice(0, 12)}, the public copy hashes to ${r.SHA256.slice(0, 12)}`);
  if (!/formfutura\.sharepoint\.com/.test(s.URL)) throw new Error(`${MIGRATION}: ${r.SourceID}'s URL is not FormFutura's SharePoint: ${s.URL}`);
  const note = `First registered from FormFutura's SharePoint (${s.URL}), which asks a reader to sign in; FormFutura serves the same bytes at the public address, fetched and hashed on ${r.Accessed} by the research agent of 2026-10-19 (${MIGRATION}).`;
  t.set('sources', r.SourceID, 'URL', r.URL, { expect: s.URL, migration: MIGRATION });
  t.set('sources', r.SourceID, 'Access note', s['Access note'] === 'Not applicable' ? note : `${s['Access note']} ${note}`, { expect: s['Access note'], migration: MIGRATION });
  moved++;
}
if (process.argv.includes('--dry-run')) { console.log(`${MIGRATION}: ${moved} source(s) would point to FormFutura's public address`); process.exit(0); }
t.save();
console.log(`${MIGRATION}: ${moved} source(s) point to FormFutura's public address`);
