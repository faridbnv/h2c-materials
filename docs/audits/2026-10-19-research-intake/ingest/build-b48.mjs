// b48: the documents of the research package of 2026-10-19 that carry data a record will cite, admitted through the
// import pipeline (the research intake, stage 3). Each was saved and hashed by the research agent (or by the intake's
// completion agent, a Claude Sonnet reader) and staged here by digest (ingest:witness --from staged-manifest-b48.csv,
// which hash-checked every file and cached its text). The proposals register the documents and create the four products
// the research found; every value and setting they print enters afterwards through the reading tools (stage 4), and
// polymers.csv cites the polymer references in the batch's migration.
//
// intake.mjs chose the documents and wrote b48-docs.json; this script checks one line of each on its cached text (its
// identity: the line that says what it is), writes proposals/b48/<sha16>.json and b48-packet.json, and pins the packet in
// the migration.
//
//   node docs/audits/2026-10-19-research-intake/ingest/build-b48.mjs
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { readCsv } from '../../../../build/src/csv.js';
import { cachedText } from '../../../../scripts/lib/pdf-text.mjs';
import { ocrSidecar } from '../../../../scripts/ingest/read-common.mjs';

const HERE = 'docs/audits/2026-10-19-research-intake/ingest';
const OUT = `${HERE}/proposals/b48`;
const MIGRATION = 'scripts/migrate/m453-batch-b48-research-intake.mjs';
const PACKAGE = '/Users/farid/Documents/H2C-v2.1-Review-2026-09-27/filament-atlas-research';
const BY = 'Claude Opus 5.5 (research intake 2026-10-19, b48), read on the cached text and the page image';
const DATE = '2026-10-19';
const NP = 'Not published', NA = 'Not applicable';
const sha = (b) => createHash('sha256').update(b).digest('hex');
const squash = (s) => String(s ?? '').normalize('NFKC').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[-–_/]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
const rows = (p) => readCsv(p).records.map((r) => r.values);

const { documents, newGrades } = JSON.parse(readFileSync(`${HERE}/b48-docs.json`, 'utf8'));
const sources = new Map(rows('data/tables/sources.csv').map((s) => [s.SourceID, s]));
const ledger = rows(`${HERE}/ledger.csv`);

// The lines a document can be identified by: the package's quotes of it, kept or not, and its title.
const quotes = new Map();
for (const pkg of ['output', 'intake-completion']) {
  for (const r of rows(join(PACKAGE, pkg, 'readings-new.csv'))) {
    if (!quotes.has(r.source_id)) quotes.set(r.source_id, []);
    quotes.get(r.source_id).push(...String(r.quote ?? '').split(' | ').map((q) => q.trim()).filter((q) => q.length >= 6));
  }
}
const IDENTITY = {
  'NEW-0cd16cbde6e7': 'Heated chamber not required',
  'NEW-0ea774a63185': 'Do not print PVA+ in an enclosed chamber with a chamber temperature of above 50°C',
  'NEW-90ed094c0c77': 'This product is being renamed from PolySonic',
  'NEW-38167ab03310': 'Formerly called PolyTerra',
};
const products = new Map();
for (const pkg of ['output', 'intake-completion']) for (const r of rows(join(PACKAGE, pkg, 'documents.csv'))) products.set(r.doc_id, String(r.products ?? '').split(/[;|]/).map((x) => x.trim()).filter((x) => x.length >= 4));
function evidenceOf(doc, text) {
  // A scan's text is its optical reading, kept beside its empty text layer (ingest:ocr-pass).
  const ocr = ocrSidecar(doc.sha256);
  const all = text.pages.map((p, i) => ({ page: p.page ?? i + 1, s: squash(p.lines.map((l) => l.text).join(' ')) }))
    .concat(ocr ? [...ocr].map(([page, lines]) => ({ page, s: squash(lines.join(' ')), ocr: true })) : []);
  for (const q of [IDENTITY[doc.id], ...(quotes.get(doc.id) ?? []), doc.title, ...(products.get(doc.id) ?? [])].filter(Boolean)) {
    const hit = all.find((p) => p.s.includes(squash(q)));
    if (hit) return { page: hit.page, text: q, ...(hit.ocr ? { view: 'ocr' } : {}) };
  }
  throw new Error(`${doc.id}: no identifying line found on its cached text`);
}

const gradeRow = (key, sourceId, firstSourceId) => {
  const g = newGrades[key];
  return {
    MaterialID: g.MaterialID, Role: 'procurement', Status: 'active', Manufacturer: g.Manufacturer, 'Product name': g['Product name'],
    'Shared formulation key': firstSourceId, 'Composition / filler': g.composition, Variant: NA,
    'Colour caveat': 'Properties may vary by colour; use TDS scope', Availability: NP, 'Certification claims': NP,
    'Selected-grade rationale': 'Documented commercial formulation; traceable manufacturer evidence (research intake 2026-10-19)',
    SourceID: g.sourceId ?? firstSourceId, 'Source locator': 'TDS / official product page', 'Diameter compatibility': 'Check 1.75 mm variant; diameter is not part tolerance',
  };
};
const firstOf = Object.fromEntries(Object.entries(newGrades).map(([k, g]) => [k, documents.find((d) => d.id === g.from).sourceId]));

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
  const applicable = d.polymer
    ? `Polymer reference of ${d.polymer} (polymers.csv): ${d.title}`
    : [...existing, ...newKeys.map((k) => `\${grade:${k}}`)].map((g) => (g.startsWith('$') ? `${newGrades[g.slice(8, -1)].MaterialID} / ${g}` : g)).join('; ') || NA;
  const revision = d.revisionOf ? sources.get(d.revisionOf) : null;
  const wayback = /web\.archive\.org/.test(d.url);
  const row = {
    SourceID: d.sourceId, Publisher: d.publisher, Title: d.title, Revision: NP, 'Publication date': NP, 'Access date': d.accessed,
    'Source class': d.cls,
    'Source note': `${d.note}${revision ? ` A later copy of ${revision.SourceID} (read ${revision['Access date']}), whose bytes have changed since; that row stays.` : ''}`,
    'Citation role': d.role ?? 'cited', URL: d.url, Locator: 'Document / product page', 'Applicable grades': applicable,
    'Access state': 'retrieved',
    'Access note': `Saved ${d.accessed} by the research agent of 2026-10-19${wayback ? ' from the Wayback Machine\'s capture of the maker\'s page' : ''} and hashed; staged by digest into the research intake's ledger (ingest:witness --from, ${HERE}/staged-manifest-b48.csv) on ${DATE}, admitted in batch b48.`,
    SHA256: d.sha256,
  };
  const grades = newKeys.map((key) => ({
    key, row: gradeRow(key, d.sourceId, firstOf[key]),
    review: { status: 'accepted', by: BY, date: DATE, note: `A product the catalogue did not hold, named on its maker's own document ("${newGrades[key]['Product name']}", ${newGrades[key].Manufacturer}); filed under ${newGrades[key].MaterialID}${newGrades[key].MaterialID === 'M001' ? '' : ', the home of a polyamide its maker does not name (R167)'}.` },
    evidence,
  }));
  const proposal = {
    version: 1, generated: { tool: 'build-b48.mjs (research intake 2026-10-19)', date: DATE },
    document: { sha256: d.sha256, url: d.url, pages: text.pages.length, provider: d.publisher, manufacturer: d.publisher, docKey: witness.doc_key },
    identity: { polymer: d.polymer ?? null, materialId: newKeys.length ? newGrades[newKeys[0]].MaterialID : null, note: d.polymer ? `A reference for the polymer ${d.polymer} of polymers.csv (m453 cites it), not a product of the catalogue.` : newKeys.length ? `The document of a product the catalogue did not hold: ${newKeys.map((k) => `${newGrades[k].Manufacturer} ${newGrades[k]['Product name']}`).join(', ')}.` : `A document of ${existing.join(', ')}, products the catalogue holds.` },
    source: { row, evidence, review: { status: 'accepted', by: BY, date: DATE } },
    grades, measurements: [], profiles: [], evidence: [], headlines: [], coverage: [], settings: [], acceptances: [],
    skipped: [{ note: 'Every value and setting the document prints enters through the reading tools (the intake\'s stage 4: ingest:read-reconcile, a blind second reading of what decides, ingest:read-proposals, applyProposals), each checked on this document\'s cached text.' }],
    review: {
      status: 'reviewed', by: BY, date: DATE,
      note: `Registered for what it prints (${d.kind}): ${d.note} Its identifying line is checked on page ${evidence.page} of the cached text.`,
      ...(revision ? { retrievalRevision: { previousSourceID: revision.SourceID, previousSHA256: revision.SHA256, accessed: d.accessed, by: BY } } : {}),
    },
  };
  const name = `${d.sha256.slice(0, 16)}.json`;
  const body = `${JSON.stringify(proposal, null, 2)}\n`;
  writeFileSync(join(OUT, name), body);
  packetDocs.push({ File: name, ProposalSHA256: sha(body), OriginalSHA256: d.sha256, Source: row, Grades: grades.map((g) => ({ Key: g.key, MaterialID: g.row.MaterialID, Manufacturer: g.row.Manufacturer, 'Product name': g.row['Product name'] })), Polymer: d.polymer ?? null });
}
const packet = {
  PacketID: 'b48-research-intake', Batch: 'b48', Documents: packetDocs,
  Totals: { Documents: packetDocs.length, NewGrades: Object.keys(newGrades).length, Values: 0, Profiles: 0 },
  NewVocabulary: [{ Vocabulary: 'manufacturers', Value: 'Eumakers' }, { Vocabulary: 'manufacturers', Value: 'Filamatrix' }],
  Review: { prepared_by: BY, scope: 'the research package of 2026-10-19: the documents that carry data a record cites (print recipes and drying, fibre loads, the four products it found, polymer references, identity statements); their values enter through the reading tools' },
  NotAdmitted: [{ Document: 'the package\'s other saved documents', Why: 'later copies of registered sheets (read on the registered sheet where it prints the same line), price pages (the price pipeline captures its own), safety data sheets that state no fibre load, and documents for held sheets and identities the owner has reserved; archive/research-2026-10-19/disposition.csv says what became of each finding' }],
};
const packetBody = `${JSON.stringify(packet, null, 2)}\n`;
writeFileSync(`${HERE}/b48-packet.json`, packetBody);
console.log(`${packetDocs.length} proposals, ${packet.Totals.NewGrades} new products; packet sha ${sha(packetBody).slice(0, 12)}`);
if (existsSync(MIGRATION)) writeFileSync(MIGRATION, readFileSync(MIGRATION, 'utf8').replace(/const PACKET_SHA256 = '[^']*';/, `const PACKET_SHA256 = '${sha(packetBody)}';`));
else console.log(`(no ${MIGRATION} yet: pin ${sha(packetBody)} by hand)`);
