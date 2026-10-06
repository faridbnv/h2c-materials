#!/usr/bin/env node
// Migration m384 (2026-10-06): the impact statements go back to the topics they had, and the four kept go under topics
// that exist (D132 withdrawn).
//
// m383 (f57dffda, reverted) moved eleven makers' statements into a new topic, "Impact and toughness", and added four.
// A statement holds one topic, so each move emptied the topic it left: the drawer then told an engineer that Bambu Lab
// said nothing about layer adhesion beside its "excellent toughness and Z-layer strength", and six more products the
// same of their applications or benefits. The code is reverted; the data it added is kept, because each quote was found
// on its hashed page: the later saved PLA Tough+ product page (R-BAMBU-PLA-TOUGH-20261005) and three of its statements,
// and Anycubic's PLA+ sentence. The eleven go back where they were, and the four go where their main point belongs.
// The topic "Impact and toughness" then holds nothing and leaves the vocabulary in the same commit.
//
// Each quote is checked on the cached sheet, and the kept page's bytes against its SHA-256. A re-run is a no-op, and a
// run after the data moved stops.
//
//   node scripts/migrate/m384-impact-statements-back-to-their-topics.mjs
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { openTables } from '../data/table-io.mjs';
import { cacheDir, sha256 } from '../lib/pdf-text.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';

const MIGRATION = 'm384';
const FROM = 'Impact and toughness';
const KEPT_SOURCE = 'R-BAMBU-PLA-TOUGH-20261005';
const t = openTables();

// Where each statement goes: the eleven to the topic m383 found them under, the four kept to the topic of their main point.
const TOPICS = {
  Q00990: 'Benefits', Q00992: 'Benefits', Q00999: 'Benefits', Q01909: 'Benefits', Q01981: 'Benefits', Q02267: 'Benefits',
  Q00998: 'Good for', Q01427: 'Good for', Q02559: 'Good for', Q05649: 'Good for',
  Q01276: 'Adhesion between layers',
  // "Engineered for real-world impact … toughness on par with ABS": what the product does better than standard PLA.
  Q05757: 'Benefits',
  // "perfect for prints that need to bend without breaking — like springs, clips, and connectors": what it is for.
  Q05758: 'Good for',
  // "suitable for demanding, tool-grade applications": what it is for.
  Q05759: 'Good for',
  // "known for its high toughness, impressive impact resistance, and excellent elongation at break".
  Q05760: 'Benefits',
};

// The kept page enters no row of its own here, but four statements stand on it: its bytes must be the ones hashed.
const source = t.get('sources', KEPT_SOURCE);
const copies = [cacheDir('sources', 'by-sha', `${source.SHA256}.html`),
  ...(existsSync(cacheDir('later-copies')) ? readdirSync(cacheDir('later-copies')).map((d) => cacheDir('later-copies', d, `${source.SHA256}.html`)) : [])];
const bytes = copies.find(existsSync);
if (!bytes || sha256(readFileSync(bytes)) !== source.SHA256) throw new Error(`${MIGRATION}: ${KEPT_SOURCE}'s page is not cached with SHA-256 ${source.SHA256}`);

let cells = 0;
for (const [id, topic] of Object.entries(TOPICS)) {
  const row = t.get('evidence', id);
  if (row.Domain !== "Makers' know-how") throw new Error(`${MIGRATION}: ${id} is not a maker's statement`);
  if (row.Topic === topic) continue;
  onCachedSheet(t, row.SourceID, row.Finding, MIGRATION);
  t.set('evidence', id, 'Topic', topic, { expect: FROM, migration: MIGRATION });
  cells++;
}
const left = t.rows('evidence').filter((r) => r.Topic === FROM).map((r) => r.EvidenceID);
if (left.length) throw new Error(`${MIGRATION}: still under "${FROM}": ${left.join(', ')}`);
if (cells) t.save();
console.log(`${MIGRATION}: ${cells} statement(s) under the topics they belong to; "${FROM}" holds none`);
