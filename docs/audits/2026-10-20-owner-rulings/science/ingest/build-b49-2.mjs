// b49-2: the flexible-PVC reference the rubber limit for PVC-P cites (the owner's rulings, the round's review F4): Fainplast's
// "PVC Flexible for Extrusion" sheet, a compounder's table of flexible PVC compounds by Shore A hardness. Staged by digest
// into this round's ledger (ingest:witness --from staged-manifest-b49-2.csv); this script writes its proposal and the
// packet m478 pins. A second batch of the round, since b49's packet is pinned by m475.
//
//   node docs/audits/2026-10-20-owner-rulings/science/ingest/build-b49-2.mjs
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { readCsv } from '../../../../../build/src/csv.js';
import { cachedText } from '../../../../../scripts/lib/pdf-text.mjs';

const HERE = 'docs/audits/2026-10-20-owner-rulings/science/ingest';
const OUT = `${HERE}/proposals/b49-2`;
const MIGRATION = 'scripts/migrate/m478-review-fixes-pvc-p-and-sbc.mjs';
const BY = 'Claude Opus 5.5 (the owner\'s rulings 2026-10-20, b49-2), read on the cached text';
const DATE = '2026-10-20';
const SHA = '2596444c620652a7994955402c3a550b5d394ef83f27e013e1e158e247b82bf1';
const sha = (b) => createHash('sha256').update(b).digest('hex');
const ledger = readCsv(`${HERE}/ledger.csv`).records.map((r) => r.values);
const text = cachedText(SHA);
if (!text) throw new Error('no cached text; stage it first');
const witness = ledger.find((r) => r.sha256 === SHA);
if (!witness) throw new Error('not in the round\'s ledger');
const line = text.pages.flatMap((p) => p.lines.map((l) => ({ page: p.page, text: l.text }))).find((l) => l.text.includes('Compounds for the extrusion of hoses, gaskets'));
const note = 'Fainplast\'s table of flexible PVC (PVC-P) compounds for extrusion, Shore A 45 to 94 with elongations at break of 200 to 460 % (ISO 868, ISO 527), the harder grades named "Semi rigid" from 96A: the reference for the rubber limit of PVC-P (class_limits.csv CL03, m478). No value is recorded from it; it is no product of the catalogue.';
const row = {
  SourceID: 'R-FAINPLAST-PVC-FLEXIBLE-EXTRUSION', Publisher: 'Fainplast', Title: 'PVC Flexible for Extrusion', Revision: 'Not published',
  'Publication date': 'Not published', 'Access date': DATE, 'Source class': 'Resin supplier data sheet',
  'Source note': 'A PVC compounder\'s range table (Fainplast SRL, Ascoli Piceno), its flexible compounds for hoses, gaskets and profiles.',
  'Citation role': 'cited', URL: 'https://www.fainplast.com/wp-content/uploads/datasheet/PVC_flex.pdf', Locator: 'Document / product page',
  'Applicable grades': 'Class reference of PVC-P (class_limits.csv CL03): flexible PVC compounds', 'Access state': 'retrieved',
  'Access note': `Fetched ${DATE} from the maker's site (HTTP 200) and hashed by Claude Opus 5.5, the same bytes a Claude Sonnet reader saved on 2026-10-19; staged by digest into the owner's rulings' ledger (ingest:witness --from, ${HERE}/staged-manifest-b49-2.csv), admitted in batch b49-2.`,
  SHA256: SHA,
};
const proposal = {
  version: 1, generated: { tool: 'build-b49-2.mjs (the owner\'s rulings 2026-10-20)', date: DATE },
  document: { sha256: SHA, url: row.URL, pages: text.pages.length, provider: 'Fainplast', manufacturer: 'Fainplast', docKey: witness.doc_key },
  identity: { polymer: null, materialId: null, note },
  source: { row, evidence: { page: line.page, text: line.text }, review: { status: 'accepted', by: BY, date: DATE } },
  grades: [], measurements: [], profiles: [], evidence: [], headlines: [], coverage: [], settings: [], acceptances: [],
  skipped: [{ note: 'Its compounds are no products of the catalogue; their figures stay in the record tier.' }],
  review: { status: 'reviewed', by: BY, date: DATE, note },
};
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const name = `${SHA.slice(0, 16)}.json`;
const body = `${JSON.stringify(proposal, null, 2)}\n`;
writeFileSync(join(OUT, name), body);
const packet = { PacketID: 'b49-2-owner-rulings', Batch: 'b49-2', Documents: [{ File: name, ProposalSHA256: sha(body), OriginalSHA256: SHA, Source: row, Grades: [], Polymer: null, Values: 0, Profiles: 0 }], Totals: { Documents: 1, NewGrades: 0, Values: 0, Profiles: 0 }, NewVocabulary: [], Review: { prepared_by: BY, scope: 'the reference for PVC-P\'s rubber limit (the round\'s review, F4)' } };
const packetBody = `${JSON.stringify(packet, null, 2)}\n`;
writeFileSync(`${HERE}/b49-2-packet.json`, packetBody);
console.log(`1 proposal; packet sha ${sha(packetBody)}`);
if (existsSync(MIGRATION)) writeFileSync(MIGRATION, readFileSync(MIGRATION, 'utf8').replace(/const PACKET_SHA256 = '[^']*';/, `const PACKET_SHA256 = '${sha(packetBody)}';`));
