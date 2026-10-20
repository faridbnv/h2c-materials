// b50: the documents of the second research package (2026-10-19, round 2) that carry data a record will cite, admitted
// through the import pipeline (research intake 2, stage 2). The research agent saved and hashed each one; they were staged
// here by digest (ingest:witness --from staged-manifest-b50.csv, which hash-checked every file and cached its text; the
// image-only pages of Forward AM's and Fiberlogy's sheets were read optically beside it, ingest:ocr-pass). The proposals
// register the documents and create the six products the research found; every value and setting they print enters
// afterwards through the reading tools (stage 3).
//
// intake.mjs chose the documents and wrote b50-docs.json; this script checks one line of each on its cached text (its
// identity: the line that says what it is), writes proposals/b50/<sha16>.json and b50-packet.json, and pins the packet in
// the migration.
//
//   node docs/audits/2026-10-20-research-intake-2/ingest/build-b50.mjs --package <research package folder>
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readCsv } from '../../../../build/src/csv.js';
import { cachedText } from '../../../../scripts/lib/pdf-text.mjs';
import { ocrSidecar } from '../../../../scripts/ingest/read-common.mjs';

const HERE = 'docs/audits/2026-10-20-research-intake-2/ingest';
const OUT = `${HERE}/proposals/b50`;
const MIGRATION = 'scripts/migrate/m488-batch-b50-research-intake-2.mjs';
const at = process.argv.indexOf('--package');
if (at < 0 || !process.argv[at + 1]) { console.error('usage: build-b50.mjs --package <research package folder>'); process.exit(2); }
const PACKAGE = resolve(process.argv[at + 1]);
const BY = 'Claude Opus 5.5 (research intake 2, 2026-10-20, b50), read on the cached text and the page image';
const DATE = '2026-10-20';
const NP = 'Not published', NA = 'Not applicable';
const sha = (b) => createHash('sha256').update(b).digest('hex');
const squash = (s) => String(s ?? '').normalize('NFKC').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[-–_/]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
const rows = (p) => readCsv(p).records.map((r) => r.values);

const { documents, newGrades } = JSON.parse(readFileSync(`${HERE}/b50-docs.json`, 'utf8'));
const sources = new Map(rows('data/tables/sources.csv').map((s) => [s.SourceID, s]));
const ledger = rows(`${HERE}/ledger.csv`);

// The lines a document can be identified by: the package's quotes of it, kept or not, and its title.
const quotes = new Map();
for (const r of rows(join(PACKAGE, 'output/readings-new.csv'))) {
  if (!quotes.has(r.source_id)) quotes.set(r.source_id, []);
  quotes.get(r.source_id).push(...String(r.quote ?? '').split(' | ').map((q) => q.trim()).filter((q) => q.length >= 6));
}
const IDENTITY = {
  'NEW-9828d6e2bfd9': 'Unser Material braucht keinen temperierten Bauraum',
  'NEW-35dfb5b81aeb': 'without the heating chamber',
  'NEW-cb8de69c5dec': 'PolyTerra',
  'NEW-b4959fb55a87': 'PA 6/66',
  'NEW-c8a447a4df81': 'Hemp Based PLA',
  'NEW-bd7cbd47d8e7': 'Ultrafuse',
};
const products = new Map(rows(join(PACKAGE, 'output/documents.csv')).map((r) => [r.doc_id, String(r.products ?? '').split(/[;|]/).map((x) => x.trim()).filter((x) => x.length >= 4)]));
function evidenceOf(doc, text) {
  // An image-only page's text is its optical reading, kept beside its empty text layer (ingest:ocr-pass).
  const ocr = ocrSidecar(doc.sha256);
  const all = text.pages.map((p, i) => ({ page: p.page ?? i + 1, s: squash(p.lines.map((l) => l.text).join(' ')) }))
    .concat(ocr ? [...ocr].map(([page, lines]) => ({ page, s: squash(lines.join(' ')), ocr: true })) : []);
  for (const q of [IDENTITY[doc.id], ...(quotes.get(doc.id) ?? []), doc.title, ...(products.get(doc.id) ?? [])].filter(Boolean)) {
    const hit = all.find((p) => p.s.includes(squash(q)));
    if (hit) return { page: hit.page, text: q, ...(hit.ocr ? { view: 'ocr' } : {}) };
  }
  throw new Error(`${doc.id}: no identifying line found on its cached text`);
}

const gradeRow = (key, firstSourceId) => {
  const g = newGrades[key];
  return {
    MaterialID: g.MaterialID, Role: 'procurement', Status: 'active', Manufacturer: g.Manufacturer, 'Product name': g['Product name'],
    'Shared formulation key': firstSourceId, 'Composition / filler': g.composition, Variant: NA,
    'Colour caveat': 'Properties may vary by colour; use TDS scope', Availability: NP, 'Certification claims': NP,
    'Selected-grade rationale': 'Documented commercial formulation; traceable manufacturer evidence (research intake 2, 2026-10-20)',
    SourceID: firstSourceId, 'Source locator': 'TDS / official product page', 'Diameter compatibility': 'Check 1.75 mm variant; diameter is not part tolerance',
    // Each new product's own documents print 1.75 mm (Kexcelled p. 3, Forward AM p. 3, Sakata p. 1, QIDI's and
    // Filamentive's store pages).
    Diameter: '1.75 mm',
  };
};
const firstOf = Object.fromEntries(Object.entries(newGrades).map(([k, g]) => [k, documents.find((d) => d.id === g.from).sourceId]));
const HOME = {
  M164: ', the home of a polyamide its maker does not name: Sakata calls it a copolyamide and names no monomers (R167)',
  M165: ', the home of a carbon-fibre polyamide its maker does not name: Sakata calls it a copolyamide and names no monomers (R167)',
};

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const packetDocs = [];
for (const d of documents) {
  const text = cachedText(d.sha256);
  if (!text) throw new Error(`${d.id}: no cached text; stage it first (ingest:witness --from)`);
  const witness = ledger.find((r) => r.sha256 === d.sha256);
  if (!witness) throw new Error(`${d.id}: not in the round's ledger`);
  const evidence = evidenceOf(d, text);
  const newKeys = (d.grades ?? []).filter((g) => g.startsWith('@')).map((g) => g.slice(1));
  const existing = (d.grades ?? []).filter((g) => !g.startsWith('@'));
  const applicable = [...existing, ...newKeys.map((k) => `${newGrades[k].MaterialID} / \${grade:${k}}`)].join('; ') || NA;
  const revision = d.revisionOf ? sources.get(d.revisionOf) : null;
  const wayback = /web\.archive\.org/.test(d.url);
  const row = {
    SourceID: d.sourceId, Publisher: d.publisher, Title: d.title, Revision: NP, 'Publication date': NP, 'Access date': d.accessed,
    'Source class': d.cls,
    'Source note': `${d.note}${revision ? ` A later document of the product beside ${revision.SourceID} (read ${revision['Access date']}); neither prints a date that orders them against the other, so neither supersedes the other (D171), and that row stays.` : ''}`,
    'Citation role': d.role ?? 'cited', URL: d.url, Locator: 'Document / product page', 'Applicable grades': applicable,
    'Access state': 'retrieved',
    'Access note': `Saved ${d.accessed} by the research agent of 2026-10-19 (round 2)${wayback ? ' from the Wayback Machine\'s capture of the maker\'s file' : ''} and hashed; staged by digest into the round's ledger (ingest:witness --from, ${HERE}/staged-manifest-b50.csv) on ${DATE}, admitted in batch b50.`,
    SHA256: d.sha256,
    // No document here prints a date that orders it against a held one (D171): none supersedes another.
    'Superseded by': NA,
  };
  const grades = newKeys.map((key) => ({
    key, row: gradeRow(key, firstOf[key]),
    review: { status: 'accepted', by: BY, date: DATE, note: `A product the catalogue did not hold, named on its maker's own document ("${newGrades[key]['Product name']}", ${newGrades[key].Manufacturer}); filed under ${newGrades[key].MaterialID}${HOME[newGrades[key].MaterialID] ?? ''}.` },
    evidence,
  }));
  const proposal = {
    version: 1, generated: { tool: 'build-b50.mjs (research intake 2, 2026-10-20)', date: DATE },
    document: { sha256: d.sha256, url: d.url, pages: text.pages.length, provider: d.publisher, manufacturer: d.publisher, docKey: witness.doc_key },
    identity: { polymer: null, materialId: newKeys.length ? newGrades[newKeys[0]].MaterialID : null, note: newKeys.length ? `The document of a product the catalogue did not hold: ${newKeys.map((k) => `${newGrades[k].Manufacturer} ${newGrades[k]['Product name']}`).join(', ')}.` : `A document of ${existing.join(', ')}, products the catalogue holds.` },
    source: { row, evidence, review: { status: 'accepted', by: BY, date: DATE } },
    grades, measurements: [], profiles: [], evidence: [], headlines: [], coverage: [], settings: [], acceptances: [],
    skipped: [{ note: d.role === 'corroboration' ? 'Kept to corroborate a filing or a name (m490); no value is transcribed from it.' : 'Every value and setting the document prints enters through the reading tools (the intake\'s stage 3: ingest:read-reconcile, a blind second reading of what decides, ingest:read-proposals, applyProposals), each checked on this document\'s cached text.' }],
    review: {
      status: 'reviewed', by: BY, date: DATE,
      note: `Registered for what it prints (${d.kind}): ${d.note} Its identifying line is checked on page ${evidence.page} of the cached text${evidence.view === 'ocr' ? ' (its optical reading)' : ''}.`,
      ...(revision ? { retrievalRevision: { previousSourceID: revision.SourceID, previousSHA256: revision.SHA256, accessed: d.accessed, by: BY } } : {}),
    },
  };
  const name = `${d.sha256.slice(0, 16)}.json`;
  const body = `${JSON.stringify(proposal, null, 2)}\n`;
  writeFileSync(join(OUT, name), body);
  packetDocs.push({ File: name, ProposalSHA256: sha(body), OriginalSHA256: d.sha256, Source: row, Grades: grades.map((g) => ({ Key: g.key, MaterialID: g.row.MaterialID, Manufacturer: g.row.Manufacturer, 'Product name': g.row['Product name'] })) });
}
const packet = {
  PacketID: 'b50-research-intake-2', Batch: 'b50', Documents: packetDocs,
  Totals: { Documents: packetDocs.length, NewGrades: Object.keys(newGrades).length, Values: 0, Profiles: 0 },
  NewVocabulary: [
    { Vocabulary: 'manufacturers', Value: 'Filamentive', Meaning: 'UK maker of recycled and bio-based filaments.' },
    { Vocabulary: 'manufacturers', Value: 'Kexcelled', Meaning: 'Chinese maker of engineering filaments (the K5 and K8 lines).' },
    { Vocabulary: 'manufacturers', Value: 'Sakata 3D', Meaning: 'Spanish maker of filaments.', Aliases: 'Sakata;SAKATA 3D' },
  ],
  Review: { prepared_by: BY, scope: 'the second research package (2026-10-19, round 2): the documents that carry data a record cites (six products for materials one product short of a page or thin, chamber and enclosure statements, a conditional drying, fibre loads, two newer documents of held products, and two documents kept to corroborate a filing and a name); their values enter through the reading tools' },
  NotAdmitted: [{ Document: 'the package\'s other saved documents', Why: 'copies of registered pages and sheets whose digests differ (no edition established, D131), retailer listings (the price pipeline captures its own), documents of products held for stock, identity or the owner, polymer references (polymers.csv is frozen), and a 2024 eSUN catalogue whose drying column prints only dashes; archive/research-2026-10-20/disposition.csv says what became of each finding' }],
};
const packetBody = `${JSON.stringify(packet, null, 2)}\n`;
writeFileSync(`${HERE}/b50-packet.json`, packetBody);
console.log(`${packetDocs.length} proposals, ${packet.Totals.NewGrades} new products; packet sha ${sha(packetBody).slice(0, 12)}`);
if (existsSync(MIGRATION)) writeFileSync(MIGRATION, readFileSync(MIGRATION, 'utf8').replace(/const PACKET_SHA256 = '[^']*';/, `const PACKET_SHA256 = '${sha(packetBody)}';`));
else console.log(`(no ${MIGRATION} yet: pin ${sha(packetBody)} by hand)`);
