// b43: the thirteen held data sheets of gap round 2 (GOALS, "Decided on 2026-10-05, gap round 2", item 4), read page by page
// from their page images and their cached text, and proposed through the import pipeline's own row builders.
//
// Each document was deferred only because the import's text reader could not pair its layout (a column per print
// orientation, a condition table per layer height, a mis-mapped text layer, Japanese and Spanish labels, four products in
// one table). The reviewer's reading below gives the sheet's own words per cell and the conditions the page states;
// the typed columns are the parsers' reading (measurementRow / profileFor in scripts/ingest/propose.mjs). Three
// documents are not admitted (see NotAdmitted in the packet).
//
//   H2C_DOCUMENT_CACHE=<cache> node docs/audits/2026-10-05-gap-round-2/ingest/build-b43.mjs
//
// It writes proposals/b43/<sha16>.json and ../b43-packet.json (the packet the migration pins).
import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BY, DATE, NA, NP, cachedText, meas, profile, stamp, tables as t } from './b43-lib.mjs';
import { antero, cf10 } from './b43-docs.mjs';
import { essentiumPA, essentiumPACF, piZ2 } from './b43-docs-b.mjs';
import { fabrial, smartfil, bigrepHiTemp, markforged, qidiSWhite } from './b43-docs-c.mjs';
const docs = [antero, cf10, essentiumPA, essentiumPACF, piZ2, fabrial, smartfil, bigrepHiTemp, markforged, qidiSWhite];

const OUT = 'docs/audits/2026-10-05-gap-round-2/ingest/proposals/b43';
const sha = (b) => createHash('sha256').update(b).digest('hex');

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const packetDocs = [];
let nMeas = 0, nProf = 0, nGrades = 0;

for (const d of docs) {
  const text = cachedText(d.sha256);
  if (!text) throw new Error(`${d.name}: no cached text`);
  const ctxFor = (g) => ({ sourceId: d.sourceId, materialId: g.materialId });
  const grades = d.grades.map((g) => ({
    key: g.key,
    row: {
      MaterialID: g.materialId, Role: 'procurement', Status: 'active', Manufacturer: g.manufacturer, 'Product name': g.product,
      'Shared formulation key': g.formulationKey ?? d.sourceId, 'Composition / filler': g.composition ?? NP, Variant: g.variant ?? NA,
      'Colour caveat': 'Properties may vary by colour; use TDS scope', Availability: NP, 'Certification claims': g.certification ?? NP,
      'Selected-grade rationale': g.rationale ?? 'Documented commercial formulation; traceable manufacturer evidence',
      SourceID: d.sourceId, 'Source locator': 'TDS / official product page', 'Diameter compatibility': g.diameter ?? 'Check 1.75 mm variant; diameter is not part tolerance',
    },
    review: { status: 'accepted', by: BY, date: DATE, ...(text.ocr ? { visual: true } : {}), note: g.note },
    evidence: { page: g.evidencePage ?? 1, text: g.evidence },
  }));
  const gradeOf = new Map(d.grades.map((g) => [g.key, g]));
  const measurements = [];
  for (const spec of d.measure(text)) {
    const g = gradeOf.get(spec.gradeKey ?? 'main');
    const m = meas({ sourceId: d.sourceId, materialId: g.materialId }, { ...spec, gradeKey: spec.gradeKey ?? 'main' });
    measurements.push(stamp(m, text, { visual: d.visualAll ? true : undefined, visualNote: d.visualNote }));
  }
  measurements.forEach((m, i) => { m.id = `m${String(i + 1).padStart(3, '0')}`; });
  const profiles = (d.profiles ?? []).map((p) => profile({ sourceId: d.sourceId, materialId: gradeOf.get(p.gradeKey ?? 'main').materialId }, p));
  const sourceRow = {
    SourceID: d.sourceId, Publisher: d.publisher, Title: d.title, Revision: d.revision ?? NP, 'Publication date': d.published ?? NP, 'Access date': d.accessed,
    'Source class': 'Manufacturer TDS', 'Source note': d.sourceNote ?? NA, 'Citation role': 'cited', URL: d.url, Locator: 'Document / product page',
    'Applicable grades': d.grades.map((g) => `\${grade:${g.key}}`).join('; '), 'Access state': 'retrieved',
    'Access note': d.accessNote, SHA256: d.sha256,
  };
  const proposal = {
    version: 1, generated: { tool: 'build-b43.mjs (gap round 2)', date: DATE },
    document: { sha256: d.sha256, url: d.url, pages: text.pages.length, provider: d.provider, manufacturer: d.publisher, docKey: d.docKey },
    identity: { polymer: null, materialId: d.grades[0].materialId, note: d.identityNote },
    source: { row: sourceRow, evidence: { page: 1, text: d.titleEvidence }, review: { status: 'accepted', by: BY, date: DATE } },
    grades, measurements, profiles, evidence: [], headlines: [], coverage: [], settings: [],
    acceptances: (d.accept ?? []).map((a) => {
      const m = measurements.find((x) => x.row.Locator === a.locator);
      if (!m) throw new Error(`${d.name}: no row with the locator ${a.locator}`);
      return { row: m.id, code: a.code, field: a.field ?? 'Normalized value', reason: a.reason };
    }),
    skipped: d.skipped.map((note) => ({ note })),
    review: { status: 'reviewed', by: BY, date: DATE, note: `Read page by page on the page images (150 dpi) and against the cached text: ${measurements.length} value(s) and ${profiles.length} print profile(s) proposed for ${grades.length} product(s); ${d.skipped.length} omission(s) are reasoned in skipped.` },
  };
  const name = `${d.sha256.slice(0, 16)}.json`;
  const body = `${JSON.stringify(proposal, null, 2)}\n`;
  writeFileSync(join(OUT, name), body);
  nMeas += measurements.length; nProf += profiles.length; nGrades += grades.length;
  packetDocs.push({
    File: name, ProposalSHA256: sha(body), OriginalSHA256: d.sha256, DocKey: d.docKey, Source: sourceRow,
    NewGrades: d.grades.map((g) => ({ Key: g.key, MaterialID: g.materialId, Manufacturer: g.manufacturer, 'Product name': g.product })),
    Values: measurements.length, Profiles: profiles.length, Skipped: d.skipped,
  });
}

const packet = {
  PacketID: 'b43-held-sheets', Batch: 'b43', Documents: packetDocs,
  Totals: { Documents: packetDocs.length, NewGrades: nGrades, Values: nMeas, Profiles: nProf },
  NewVocabulary: [
    { Vocabulary: 'standards', Value: 'ASTM D150', Meaning: 'AC loss characteristics and permittivity (dielectric constant) of solid electrical insulation.' },
    { Vocabulary: 'standards', Value: 'ASTM D4812', Meaning: 'Unnotched cantilever beam impact resistance of plastics.' },
    { Vocabulary: 'standards', Value: 'ASTM B923', Meaning: 'Metal powder skeletal density by helium or nitrogen pycnometry (printed by Zymergen as the method of its filament density).' },
    { Vocabulary: 'standards', Value: 'ISO 3164', Meaning: 'Printed on Essentium\'s PA sheet as the method of a melting point; probably ISO 3146 (melting behaviour of semi-crystalline polymers), kept as the sheet prints it.' },
    { Vocabulary: 'standards', Value: 'ASTM E1952', Meaning: 'Thermal conductivity and thermal diffusivity by modulated temperature differential scanning calorimetry.' },
    { Vocabulary: 'manufacturers', Value: 'Smart Materials 3D', Meaning: 'Spanish maker of the Smartfil filament line (Smart Materials 3D, Jaén); its sheets are titled FICHA TÉCNICA and name the Smartfil product.', Aliases: 'Smartfil;Smart Materials;smartmaterials3d' }],
  Review: { prepared_by: BY, scope: 'thirteen held sheets, read page by page; three are not admitted' },
  NotAdmitted: [
    { Document: 'Markforged Onyx ESD (one column of the Composites table, 58a9c5673b43)', Why: 'a static-dissipative variant of Onyx whose additive the sheet does not name: filed under Nylon-CF it is refused by the filing check (FILING-FILLER-WORD: "ESD" names a filler its material does not have), and no ESD polyamide home exists. Waits for the owner\'s word on a home; its column stays on the page in the record tier.' },
    { Document: 'Stratasys ST-130 "Composite Molding Material" (mss_fdm_st130_1016a.pdf, 04b78b6d572e)', Why: 'its sheet names no base polymer and no family ("a model material for sacrificial tooling", dissolved after curing): no home reaches it and the ledger holds it for a ruling (R205 searches beyond the sheet first). Nothing is entered until the owner rules or a maker document names the polymer.' },
    { Document: 'Stratasys Diran 410MF07 (34f028a12c8c)', Why: 'OPEN-PROBLEMS §14: its sheet says "a nylon-based thermoplastic FDM material, mineral-filled 7% by weight" and waits on the owner for its home (the Nylon home with a declared filler, or a filled home). Not entered.' },
    { Document: 'colorFabb Woodfill Fine, FKuR Fibrolon V 135002 (trial grade) sheet (af2a1612aba9)', Why: 'a resin maker\'s sheet that names no filament and no colorFabb product; the database records no colorFabb Woodfill Fine for R194 to register it to. Not entered.' },
    { Document: 'Markforged Composites, continuous-fibre table (Carbon, Carbon FR, Kevlar, Fiberglass, HSHT FG)', Why: 'reinforcing fibres laid by a second nozzle that "cannot be printed by themselves"; not filament products the database holds. Only the Composite Base table (Onyx, Onyx FR, Onyx ESD, Nylon) enters.' },
    { Document: 'Essentium PA-CF "Recommended HSE print settings" (0.4 mm and 0.8 mm "Hozzle")', Why: 'settings for Essentium\'s own high-speed extrusion platform (nozzle to 400 °C); only the FDM settings block enters as the profile.' },
  ],
};
const body = `${JSON.stringify(packet, null, 2)}\n`;
writeFileSync('docs/audits/2026-10-05-gap-round-2/ingest/b43-packet.json', body);
console.log(`${packetDocs.length} proposals, ${nGrades} grades, ${nMeas} values, ${nProf} profiles; packet sha ${sha(body).slice(0, 12)}`);

// Pin the packet in the migration.
import { readFileSync } from 'node:fs';
const m = 'scripts/migrate/m362-batch-b43-held-sheets.mjs';
writeFileSync(m, readFileSync(m, 'utf8').replace(/const PACKET_SHA256 = '[^']*';/, `const PACKET_SHA256 = '${sha(body)}';`));
