#!/usr/bin/env node
// The one way a proposal becomes data.
//
// Under D35 a value enters only from a fetched, hashed document, re-read page by page. At seven documents that is a
// discipline a person keeps; at 1,800 it is a discipline a program keeps or nobody does. So this refuses a batch,
// writing nothing, unless all of the following hold for every row of it:
//
//   a person accepted or rejected the row, by name                 APPLY-UNREVIEWED
//   the cached document still hashes to what the proposal recorded APPLY-HASH
//   every number is printed on the page its Locator names          APPLY-NUMBER-NOT-ON-PAGE
//   the property, the unit and every vocabulary value exist        APPLY-PROPERTY, APPLY-UNIT, APPLY-VOCAB
//   the material is settled, or a ruling settles it                APPLY-IDENTITY
//   the product, the document and the formulation are not already recorded under another name
//                                                                  APPLY-PRODUCT-DUPLICATE, APPLY-SHA-DUPLICATE, APPLY-KEY
//
// and unless the result passes the schema gate, the lint and the core build (no estimates) on a copy of the tables
// first. Only then is anything written. Applying twice changes nothing: a source is known by its SourceID, a grade
// by its source and product, a measurement by its source and locator.
//
//   npm run ingest:apply -- --batch b01-spectrum --dry-run
//   npm run ingest:apply -- --batch b01-spectrum
//
// A batch is also a migration: scripts/migrate/mNN-batch-<name>.mjs calls this with the batch it pins, so the
// sequence of migrations stays the one history of how the data got here.

import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readCsv, csvText } from '../../build/src/csv.js';
import { checkData } from '../../build/src/schema.js';
import { lintData, findingKey } from '../../build/src/lint-rules.js';
import { loadTables, snapshotDate } from '../../build/src/load.js';
import { buildDatabase } from '../../build/src/pipeline.js';
import { openTables, projectRoot, nextId } from '../data/table-io.mjs';
import { sha256, numberOnPage, cachedText } from '../lib/pdf-text.mjs';
import { documentPath } from './extract.mjs';
import { recountGrades } from '../data/records.mjs';

const AUDIT = join(projectRoot, 'docs/audits/2026-09-18-v2-import');
const SEP = String.fromCharCode(0);
// The numbers that must be printed on the page the row cites. Test load MPa is not among them: it is typed from
// the sheet's own words by the build's own reader, which maps a stated load to the class it belongs to, so a sheet
// printing "66 psi" or "1.81 MN/m2" yields 0.45 and 1.8. PARSE-MISMATCH is what holds that column to its words.
const NUMERIC_FIELDS = ['Raw numeric', 'Raw uncertainty ±', 'Raw upper bound', 'Anneal °C', 'Anneal h'];
const PAGE = /^p\.\s*(\d+)\s*:/;
const acceptanceKey = (r) => [r.Code, r.Table, r.Record, r.Field ?? ''].join(SEP);

export class Refusal extends Error {
  constructor(problems) {
    super(`${problems.length} reason(s) to write nothing:\n  ${problems.map((p) => `[${p.code}] ${p.where}: ${p.message}`).join('\n  ')}`);
    this.problems = problems;
  }
}

export const proposalsOf = (batch) => {
  const dir = join(AUDIT, 'proposals', batch);
  if (!existsSync(dir)) throw new Error(`no proposals at ${dir.replace(projectRoot + '/', '')}`);
  return readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
    .map((f) => ({ file: f, ...JSON.parse(readFileSync(join(dir, f), 'utf8')) }));
};

const rowsOf = (proposal) => [
  ...(proposal.grades ?? []).map((g) => ({ kind: 'grade', ...g })),
  ...(proposal.measurements ?? []).map((m) => ({ kind: 'measurement', ...m })),
  ...(proposal.profiles ?? []).map((p) => ({ kind: 'profile', ...p })),
  ...(proposal.evidence ?? []).map((e) => ({ kind: 'evidence', ...e })),
];

/**
 * Everything that must hold before anything is written. Returns the problems; an empty list is permission.
 * `world` is the tables as they stand, so this can be run against a copy as well as against the repository.
 */
export function guard(proposals, world) {
  const problems = [];
  const fail = (code, where, message) => problems.push({ code, where, message });
  const seenDigest = new Map(world.sources.filter((s) => /^[0-9a-f]{64}$/.test(s.SHA256)).map((s) => [s.SHA256, s.SourceID]));
  const seenUrl = new Map(world.sources.map((s) => [s.URL, s.SourceID]));
  // A product is its maker and its name, compared as names: case, spaces and punctuation are spelling.
  const plain = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const productKey = (maker, product) => `${plain(maker)}${SEP}${plain(product)}`;
  const seenProduct = new Map(world.grades.filter((g) => g.Status === 'active').map((g) => [productKey(g.Manufacturer, g['Product name']), { gradeId: g.GradeID, source: g.SourceID, material: g.MaterialID }]));
  const keyOwner = new Map(world.grades.filter((g) => g.Status === 'active').map((g) => [g['Shared formulation key'], g.MaterialID]));
  const properties = new Map(world.properties.map((p) => [p.Property, p]));
  const materials = new Map(world.materials.map((m) => [m.MaterialID, m]));
  const materialByName = new Map(world.materials.map((m) => [m['Original name'], m]));
  const vocabularies = world.vocabularies ?? {};
  // Only a ruling that creates a material creates one. Every ruling's subject counted, so R055 — which says PHA
  // is a family whose grades are amorphous or semicrystalline and that its products wait — was read as leave to
  // create a PHA material, and one was created with no polymer row behind it.
  const rulings = new Set((world.rulings ?? []).filter((r) => r.Kind === 'new-material').map((r) => r.Subject));

  // Two documents of one batch may derive one identifier as easily as one document and one already registered.
  const claimed = new Map();
  for (const proposal of proposals) {
    const id = proposal.source?.row?.SourceID;
    const sha = proposal.document?.sha256;
    if (!id || !sha) continue;
    if (claimed.has(id) && claimed.get(id) !== sha) {
      problems.push({ code: 'APPLY-SOURCE-COLLISION', where: proposal.file ?? sha.slice(0, 12), message: `${id} is also the identifier of another document in this batch` });
    }
    claimed.set(id, sha);
  }

  for (const proposal of proposals) {
    const where = proposal.file ?? proposal.document?.sha256?.slice(0, 12) ?? 'proposal';
    if (proposal.review?.status !== 'reviewed') fail('APPLY-UNREVIEWED', where, `the document is "${proposal.review?.status ?? 'unreviewed'}"; a person reads it before it enters`);

    // The document, as bytes. Everything below is read off the text of exactly this file.
    const sha = proposal.document?.sha256 ?? '';
    const path = documentPath(sha, proposal.source?.row?.SourceID ?? '');
    if (!path) { fail('APPLY-HASH', where, `no cached document for ${sha.slice(0, 12) || '(none)'}`); continue; }
    if (sha256(readFileSync(path)) !== sha) { fail('APPLY-HASH', where, `the cached document no longer hashes to ${sha.slice(0, 12)}`); continue; }
    const text = cachedText(sha);
    if (!text) { fail('APPLY-STALE', where, 'the text cache is missing or was written by another extractor; run ingest:extract --refresh'); continue; }
    // A scan read by optical character recognition is a guess about a picture, however well it reads. Every row
    // from one is looked at on the page image by a person before it enters, and says so.
    if (text.ocr) {
      for (const row of rowsOf(proposal)) {
        if (row.review?.status !== 'accepted' || !row.row) continue;
        if (!row.review?.visual) fail('APPLY-OCR-UNVERIFIED', `${where} ${row.id}`, `read optically (${text.ocr.tool}); nobody says they read it against the page image`);
      }
    }

    // A document already registered under this proposal's own SourceID is this proposal, applied before: a
    // second run writes nothing rather than refusing. Under any other identifier it is a second registration of
    // one document, which is what this refuses.
    if (seenDigest.has(sha) && seenDigest.get(sha) !== proposal.source?.row?.SourceID) fail('APPLY-SHA-DUPLICATE', where, `this document is already registered as ${seenDigest.get(sha)}`);
    // The other way round: an identifier already taken by a different document. Nine values of Spectrum's 2025 PP
    // sheet were recorded against its 2022 one because both files are called en_tds_spectrum_pp.pdf.
    const registered = world.sources.find((x) => x.SourceID === proposal.source?.row?.SourceID);
    if (registered && /^[0-9a-f]{64}$/.test(registered.SHA256) && registered.SHA256 !== sha) {
      fail('APPLY-SOURCE-COLLISION', where, `${registered.SourceID} is already a document whose SHA-256 is ${registered.SHA256.slice(0, 12)}, not this one`);
    }
    const url = proposal.source?.row?.URL;
    if (url && seenUrl.has(url) && seenUrl.get(url) !== proposal.source?.row?.SourceID) fail('APPLY-URL-DUPLICATE', where, `${url} is already registered as ${seenUrl.get(url)}`);

    // Identity: a material that exists, or a ruling that creates one. Never a family entry.
    // A grade of a material this batch creates carries no MaterialID until the material is written. On a second
    // run the material is there, and the grade is its own: found by the name the proposal gave it.
    const created = proposal.newMaterial && materialByName.get(proposal.newMaterial['Original name']);
    for (const grade of proposal.grades ?? []) {
      const id = grade.row?.MaterialID || created?.MaterialID;
      const material = materials.get(id);
      if (!material && !(proposal.newMaterial && rulings.has(proposal.newMaterial['Original name']))) {
        fail('APPLY-IDENTITY', `${where} ${grade.key}`, `${id ?? 'no material'} is not a material, and no ruling creates one`);
      }
      if (material?.Scope === 'Family entry') fail('APPLY-IDENTITY', `${where} ${grade.key}`, `${id} is a family entry and owns no product (D44)`);
      // A grade is known by its source and its product name, which is also how the writer finds its own row
      // again. The same product under another source is a second registration of one product, and is refused.
      const product = productKey(grade.row?.Manufacturer, grade.row?.['Product name']);
      const mine = seenProduct.get(product);
      if (mine && mine.material !== id) fail('APPLY-PRODUCT-DUPLICATE', `${where} ${grade.key}`, `${grade.row?.Manufacturer} ${grade.row?.['Product name']} is already ${mine.gradeId}, under ${mine.material}`);
      const key = grade.row?.['Shared formulation key'];
      if (key && keyOwner.has(key) && keyOwner.get(key) !== id) fail('APPLY-KEY', `${where} ${grade.key}`, `formulation key ${key} belongs to ${keyOwner.get(key)}`);
    }

    for (const row of rowsOf(proposal)) {
      const at = `${where} ${row.id ?? row.key ?? row.kind}`;
      if (!['accepted', 'rejected'].includes(row.review?.status)) { fail('APPLY-UNREVIEWED', at, `the row is "${row.review?.status ?? 'unreviewed'}"`); continue; }
      if (row.review.status === 'rejected') continue;
      if (!row.review.by) fail('APPLY-UNREVIEWED', at, 'accepted by nobody: a review records who');
      if (row.evidence?.ocr && !row.review?.visual) fail('APPLY-OCR-UNVERIFIED', at, 'read from an optical-character copy; a person looks at the page image before it enters');

      const locator = row.row?.Locator ?? '';
      const page = PAGE.exec(locator);
      if (row.kind === 'measurement' || row.kind === 'profile') {
        if (!page) { fail('APPLY-LOCATOR', at, `"${locator}" does not name a page ("p. 2: ...")`); continue; }
        if (Number(page[1]) > text.pages.length) { fail('APPLY-LOCATOR', at, `page ${page[1]} of a ${text.pages.length}-page document`); continue; }
      }
      if (row.kind === 'measurement') {
        const property = properties.get(row.row?.Property);
        if (!property) fail('APPLY-PROPERTY', at, `"${row.row?.Property}" is not a property in properties.csv`);
        else {
          if (property['Replaced by'] && property['Replaced by'] !== 'Not applicable') fail('APPLY-PROPERTY', at, `"${row.row.Property}" is replaced by "${property['Replaced by']}"`);
          const units = String(property.Units ?? '').split(';').map((u) => u.trim());
          if (!units.includes(row.row?.['Normalized unit'])) fail('APPLY-UNIT', at, `${row.row?.['Normalized unit']} is not a unit of ${row.row?.Property} (${units.join(', ')})`);
        }
        for (const field of NUMERIC_FIELDS) {
          const value = row.row?.[field];
          if (value == null || !/^-?\d/.test(String(value))) continue;
          if (!numberOnPage(text, Number(page[1]), value)) fail('APPLY-NUMBER-NOT-ON-PAGE', at, `${field} ${value} is not printed on page ${page[1]}`);
        }
      }
      for (const [column, vocabulary] of Object.entries(row.vocabularies ?? {})) {
        const allowed = vocabularies[vocabulary];
        if (allowed && row.row?.[column] && !allowed.has(row.row[column])) fail('APPLY-VOCAB', at, `"${row.row[column]}" is not in schema/vocab/${vocabulary}.csv`);
      }
    }
    if (!(proposal.measurements ?? []).some((m) => m.review?.status === 'accepted') && !proposal.review?.note) {
      fail('APPLY-EMPTY', where, 'no accepted values and no note saying why the document is registered anyway');
    }
  }
  return problems;
}

/** The tables as the guard reads them, from a checkout or a copy. */
export function worldOf(root = projectRoot) {
  const table = (n) => readCsv(join(root, 'data/tables', `${n}.csv`)).records.map((r) => r.values);
  const vocabularies = {};
  for (const f of readdirSync(join(root, 'schema/vocab')).filter((f) => f.endsWith('.csv'))) {
    vocabularies[f.replace(/\.csv$/, '')] = new Set(readCsv(join(root, 'schema/vocab', f)).records.map((r) => r.values.Value));
  }
  const rulingsPath = join(AUDIT, 'rulings/rulings.csv');
  return {
    sources: table('sources'), grades: table('grades'), materials: table('materials'), properties: table('properties'),
    vocabularies, rulings: existsSync(rulingsPath) ? readCsv(rulingsPath).records.map((r) => r.values) : [],
  };
}

/** Write a reviewed batch into an open set of tables. Idempotent: what is already recorded is left alone. */
export function writeBatch(t, proposals, { migration, date, root = projectRoot }) {
  const log = [];
  const note = (what) => log.push(what);
  const touchedMaterials = new Set();
  const accepting = [];
  const acceptanceFile = join(root, 'data/review/accepted-findings.csv');
  const alreadyAccepted = new Set(readCsv(acceptanceFile).records.map((r) => acceptanceKey(r.values)));
  for (const proposal of proposals) {
    const accepted = (rows) => (rows ?? []).filter((r) => r.review?.status === 'accepted');
    // Whether this proposal is the one that creates its material, or joins one an earlier document created.
    let createdHere = !proposal.newMaterial;

    if (proposal.newMaterial) {
      // Two of a maker's documents may be two products of one new material (an ESD Ultem and an ESD Ultem 1010).
      // The first creates it; the second finds it by the name the proposal gave it, and its grade belongs there.
      const existing = t.rows('materials').find((m) => m['Original name'] === proposal.newMaterial['Original name']);
      createdHere = !existing;
      const id = existing?.MaterialID ?? nextId('materials', t.rows('materials').map((m) => m.MaterialID));
      if (!existing) {
        proposal.newMaterial.MaterialID = id;
        t.append('materials', proposal.newMaterial);
        note(`material ${id} ${proposal.newMaterial['Original name']}`);
      }
      for (const grade of proposal.grades ?? []) grade.row.MaterialID = grade.row.MaterialID || id;
    }

    const sourceId = proposal.source?.row?.SourceID;
    const gradeIds = {};
    for (const grade of accepted(proposal.grades)) {
      // A grade is a maker's product, not a document. A second sheet for one product is a revision or a copy, and
      // its rows belong on the grade that is already there: Spectrum publishes LW-PLA UltraFoam twice, one sheet
      // with five values and one with ten, and two grades for one product is what GRADE-PRODUCT-DUPLICATE is.
      const same = (a, b) => String(a ?? '').toLowerCase().replace(/[^a-z0-9]/g, '') === String(b ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const existing = t.rows('grades').find((g) => g.Status === 'active' && same(g.Manufacturer, grade.row.Manufacturer) && same(g['Product name'], grade.row['Product name']))
        ?? t.rows('grades').find((g) => g.SourceID === grade.row.SourceID && g['Product name'] === grade.row['Product name']);
      if (existing) { gradeIds[grade.key] = existing.GradeID; continue; }
      const id = nextId('grades', t.rows('grades').map((g) => g.GradeID), { materialId: grade.row.MaterialID });
      gradeIds[grade.key] = id;
      t.append('grades', { GradeID: id, ...grade.row });
      touchedMaterials.add(grade.row.MaterialID);
      note(`grade ${id} ${grade.row.Manufacturer} ${grade.row['Product name']}`);
    }
    const resolve = (value) => String(value ?? '').replace(/\$\{grade:([^}]+)\}/g, (_, key) => gradeIds[key] ?? `\${grade:${key}}`);

    // A new material stands for its first grade, and that grade's identifier is only known once it is written.
    if (proposal.newMaterial?.MaterialID) {
      const representative = resolve(proposal.newMaterial['Representative grade']);
      if (!representative.includes('${')) {
        t.set('materials', proposal.newMaterial.MaterialID, 'Representative grade', representative, { expect: proposal.newMaterial['Representative grade'] });
        note(`material ${proposal.newMaterial.MaterialID} stands for ${representative}`);
      }
    }

    if (sourceId && !t.find('sources', sourceId)) {
      t.append('sources', { ...proposal.source.row, 'Applicable grades': resolve(proposal.source.row['Applicable grades']) });
      note(`source ${sourceId}`);
    }

    const gradeOf = (key, fallback) => gradeIds[key] ?? fallback;
    const materialOf = (gradeId, fallback) => t.find('grades', gradeId)?.MaterialID ?? fallback;

    for (const m of accepted(proposal.measurements)) {
      if (t.rows('measurements').some((x) => x.SourceID === m.row.SourceID && x.Locator === m.row.Locator)) continue;
      const id = nextId('measurements', t.rows('measurements').map((x) => x.MeasurementID));
      const gradeId = gradeOf(m.gradeKey, m.row.GradeID);
      const added = `Added ${date} (${migration}): re-read from the source document, page ${PAGE.exec(m.row.Locator)?.[1] ?? '?'} (SHA-256 recorded in sources.csv).`;
      t.append('measurements', {
        MeasurementID: id, ...m.row, GradeID: gradeId, MaterialID: materialOf(gradeId, m.row.MaterialID),
        Notes: m.row.Notes && m.row.Notes !== 'Not applicable' ? `${added} ${m.row.Notes}` : added,
      });
      note(`measurement ${id} ${m.row.Property}`);
    }

    for (const p of accepted(proposal.profiles)) {
      if (t.rows('profiles').some((x) => x.SourceID === p.row.SourceID && x.Locator === p.row.Locator)) continue;
      const id = nextId('profiles', t.rows('profiles').map((x) => x.ProfileID));
      const gradeId = gradeOf(p.gradeKey, p.row.GradeID);
      t.append('profiles', { ProfileID: id, ...p.row, GradeID: gradeId, MaterialID: materialOf(gradeId, p.row.MaterialID) });
      for (const n of p.notes ?? []) if (!t.rows('profile_notes').some((x) => x.ProfileID === id && x.Topic === n.Topic)) t.append('profile_notes', { ProfileID: id, ...n });
      note(`profile ${id}`);
    }

    for (const e of accepted(proposal.evidence)) {
      if (t.rows('evidence').some((x) => x.SourceID === e.row.SourceID && x.Locator === e.row.Locator && x.Topic === e.row.Topic)) continue;
      const id = nextId('evidence', t.rows('evidence').map((x) => x.EvidenceID));
      const gradeId = gradeOf(e.gradeKey, e.row.GradeID);
      t.append('evidence', { EvidenceID: id, ...e.row, GradeID: gradeId, MaterialID: materialOf(gradeId, e.row.MaterialID) });
      note(`evidence ${id} ${e.row.Topic}`);
    }

    // A material's headlines are its representative grade's. Where this proposal's material was created by an
    // earlier document of the same batch, that grade is not this one's and the selections are already made.
    for (const h of createdHere ? proposal.headlines ?? [] : []) {
      // A selection a reviewer turned down is not made: a maker whose sheets are all injection-moulded bars
      // publishes nothing a headline may show, and the build says so rather than the batch writing it anyway.
      if (h.review?.status === 'rejected') continue;
      const measurement = (proposal.measurements ?? []).find((m) => m.id === h.measurement);
      const recorded = t.rows('measurements').find((x) => x.SourceID === measurement?.row?.SourceID && x.Locator === measurement?.row?.Locator);
      if (!recorded) continue;
      if (t.rows('headlines').some((x) => x.MaterialID === recorded.MaterialID && x.HeadlineKey === h.HeadlineKey && x.Use === h.Use)) continue;
      t.append('headlines', { MaterialID: recorded.MaterialID, HeadlineKey: h.HeadlineKey, MeasurementID: recorded.MeasurementID, Use: h.Use });
      note(`headline ${recorded.MaterialID} ${h.HeadlineKey}`);
    }

    // A material's printing guidance is the profile it cites, and a material that cites none shows "Not
    // published" however many profiles its grades have: the build quotes the first `printing` link and nothing
    // else (compile.js, GUIDANCE-MISMATCH). Every material written by hand cites one; nothing wrote it for a
    // material the pipeline created, so thirty-six of them had a print profile and published no guidance. The
    // link is the representative grade's own profile, which is what the hand-written ones cite.
    if (createdHere && proposal.newMaterial?.MaterialID) {
      const material = t.find('materials', proposal.newMaterial.MaterialID);
      const profile = t.rows('profiles').find((x) => x.GradeID === material?.['Representative grade']);
      const cites = (id) => t.rows('material_links').some((x) => x.MaterialID === material.MaterialID && x.Link === 'printing' && x.RecordID === id);
      if (profile && !cites(profile.ProfileID)) {
        t.append('material_links', { MaterialID: material.MaterialID, Link: 'printing', RecordID: profile.ProfileID });
        note(`link ${material.MaterialID} printing ${profile.ProfileID}`);
      }
    }

    // A finding the reviewer accepted, now that the record it is about has an identifier. It is written into the
    // batch's own acceptance rows so the lint that runs on the result sees the same baseline a commit will.
    for (const a of proposal.acceptances ?? []) {
      // A finding about a record the batch does not create a row for names that record itself.
      const literal = String(a.row ?? '').startsWith('record:');
      const proposed = literal ? null : (proposal.measurements ?? []).find((m) => m.id === a.row);
      const recorded = literal ? null : t.rows('measurements').find((x) => x.SourceID === proposed?.row?.SourceID && x.Locator === proposed?.row?.Locator);
      if (!literal && !recorded) continue;
      const row = literal
        ? { Code: a.code, Table: a.field || 'sources', Record: String(a.row).slice('record:'.length), Field: '', Reason: a.reason, Accepted: date }
        : { Code: a.code, Table: 'measurements', Record: recorded.MeasurementID, Field: a.field ?? '', Reason: a.reason, Accepted: date };
      if (alreadyAccepted.has(acceptanceKey(row))) continue;
      accepting.push(row);
      note(`accepted ${a.code} on ${row.Record}`);
    }
  }

  // What a new grade does to a material's coverage: the manufacturer count is a column, and a row that no longer
  // states the truth is superseded rather than edited (D72's rule for coverage, the m37 pattern).
  for (const materialId of [...touchedMaterials]) {
    const made = recountGrades(t, materialId, { migration, date, because: 'after the grades this batch added' });
    if (made) note(`coverage ${made} (recounted ${materialId})`);
  }

  if (accepting.length) {
    const { header, records } = readCsv(acceptanceFile);
    writeFileSync(acceptanceFile, csvText(header, [...records.map((r) => r.values), ...accepting]));
  }
  return log;
}

/** Apply a batch to a copy of the tables and check the result. */
export function rehearse(proposals, { migration, date }) {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-apply-'));
  try {
    cpSync(join(projectRoot, 'data'), join(dir, 'data'), { recursive: true });
    cpSync(join(projectRoot, 'schema'), join(dir, 'schema'), { recursive: true });
    const t = openTables(dir);
    const log = writeBatch(t, proposals, { migration, date, root: dir });
    t.save();
    const gate = checkData(join(dir, 'data'), join(dir, 'schema'));
    let lint = [], build = [];
    if (!gate.issues.length) {
      const tables = Object.fromEntries(Object.keys(gate.schemas).map((n) => {
        const { header, records } = readCsv(join(dir, 'data/tables', `${n}.csv`));
        return [n, { header, rows: records.map((r) => r.values) }];
      }));
      // The baseline is the copy's, so a finding this batch accepts counts as accepted here too.
      const baseline = new Set(readCsv(join(dir, 'data/review/accepted-findings.csv')).records
        .map((r) => findingKey({ code: r.values.Code, table: r.values.Table, record: r.values.Record, field: r.values.Field ?? '' })));
      lint = lintData(tables, gate.schemas).filter((f) => !baseline.has(findingKey(f)));
      const wb = loadTables(join(dir, 'data'));
      build = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'apply', estimates: false }).issues.filter((i) => i.level === 'error');
    }
    return { log, gate: gate.issues, lint, build };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** The whole of it: guard, rehearse, then write. Throws a Refusal and writes nothing if anything is wrong. */
export function applyBatch(batch, { migration = batch, date = new Date().toISOString().slice(0, 10), dryRun = false } = {}) {
  const proposals = proposalsOf(batch);
  const problems = guard(proposals, worldOf());
  if (problems.length) throw new Refusal(problems);

  const rehearsal = rehearse(proposals, { migration, date });
  const after = [
    ...rehearsal.gate.map((i) => ({ code: 'APPLY-SCHEMA', where: i.where, message: i.message })),
    ...rehearsal.lint.map((i) => ({ code: 'APPLY-LINT', where: i.where, message: `${i.code}: ${i.message}` })),
    ...rehearsal.build.map((i) => ({ code: 'APPLY-CORE-BUILD', where: i.where, message: `${i.code}: ${i.message}` })),
  ];
  if (after.length) throw new Refusal(after);
  if (dryRun) return { log: rehearsal.log, written: false };

  const t = openTables();
  const log = writeBatch(t, proposals, { migration, date });
  t.save();
  // The ledger is the one place that says where a document stands, and until now it never learned that a
  // document had entered the database: five batches' worth of sheets still read "extracted". A document is
  // applied when a source carries its digest.
  const applied = markApplied(proposals, t);
  return { log, written: true, applied };
}

/** Every document of this batch, in the ledger, as applied, with the SourceID its bytes were registered under. */
function markApplied(proposals, t) {
  const path = join(AUDIT, 'ledger.csv');
  if (!existsSync(path)) return 0;
  const { records } = readCsv(path);
  const rows = records.map((r) => r.values);
  const head = Object.keys(rows[0] ?? {});
  const bySha = new Map(t.rows('sources').filter((x) => x.SHA256).map((x) => [x.SHA256, x.SourceID]));
  const digests = new Set(proposals.map((p) => p.document?.sha256).filter(Boolean));
  let n = 0;
  for (const row of rows) {
    if (!digests.has(row.sha256) || !bySha.has(row.sha256)) continue;
    if (row.status === 'applied' && row.registered_source_id === bySha.get(row.sha256)) continue;
    row.registered_source_id = bySha.get(row.sha256);
    row.registered_by = 'sha';
    row.status = 'applied';
    // A document that has entered waits for nothing, so the reason it was waiting goes with the status. Where
    // the document was found is not a reason and stays: "also listed by" outlives the hold beside it, and so
    // does "staged copy", which is the retrieval record the source row's Access state was written from (R084).
    const listed = ((row.status_note ?? '').match(/(?:also listed by|staged copy: )[^\u2014;]+/g) ?? []).map((f) => f.trim()).join('; ') || undefined;
    if (/^held: /.test(row.status_note ?? '')) row.status_note = listed ?? '';
    row.updated = new Date().toISOString().slice(0, 10);
    n++;
  }
  if (n) writeFileSync(path, csvText(head, rows));
  return n;
}

if (process.argv[1]?.endsWith('apply.mjs')) {
  const at = process.argv.indexOf('--batch');
  const batch = at >= 0 ? process.argv[at + 1] : null;
  if (!batch) { console.error('usage: npm run ingest:apply -- --batch <name> [--migration mNN] [--dry-run]'); process.exit(2); }
  const migrationAt = process.argv.indexOf('--migration');
  try {
    const { log, written, applied } = applyBatch(batch, { migration: migrationAt >= 0 ? process.argv[migrationAt + 1] : batch, dryRun: process.argv.includes('--dry-run') });
    console.log(`${log.length} record(s) ${written ? 'written' : 'would be written'}`);
    if (applied) console.log(`  ${applied} ledger row(s) now say applied`);
    for (const line of log.slice(0, 40)) console.log(`  ${line}`);
    if (log.length > 40) console.log(`  ... and ${log.length - 40} more`);
  } catch (e) {
    console.error(e instanceof Refusal ? `Nothing written. ${e.message}` : e.message);
    process.exit(1);
  }
}
