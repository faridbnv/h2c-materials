#!/usr/bin/env node
// Migration m223 (2026-09-28): what the makers say each product is, searched beyond the data sheet, and names that say
// it (GOALS C2; the owner's instruction of 2026-09-28; D106).
//
// The owner, looking at the page: materials named "polymer not stated" and "TPU, hardness not stated" hold products
// with good data, and naming them so is not acceptable; search the sources beyond the data sheets and name them. Five
// research agents searched each of the 41 products' safety data sheets, product pages, printing guides, archived
// editions, catalogues and listings (docs/audits/2026-09-28-polymer-names/). What they found, product by product, is
// `m223-what-the-makers-say-it-is.csv`: the material each goes to, the source and page that says so, and why. Every
// statement is checked on its cached, hash-checked page here; three safety data sheets that are page images, and one
// whose text layer is unmapped glyphs, were read optically and checked by eye against the page image by an agent.
//
// - The eight TPUs of "TPU, hardness not stated" are rated by their makers: six on the sheets already cited (in prose,
//   which the reader does not read), MatterHackers' on its page, SUNLU's on its own 2024 sheet. Siraya's Flex TPU Air
//   is a foaming TPU and goes to TPU-LW. The class is left with no product and becomes a family entry over the
//   classes they went to.
// - Elastomers the homes held as "TPE": Fillamentum's Flexfill TPE 90A and 96A and eSUN's TPE-83A are SEBS (TPS, by
//   their safety data sheets); Fiberlogy's FiberFlex 30D and 40D and MattFlex 40D are copolyester elastomers (TPC, by
//   every safety data sheet found; their pages say TPU and name nothing else); Nanovia Flex is a polyurethane rated
//   90A; NinjaTek Chinchilla is half a copolyester elastomer (TPC, as a declared softer grade); purefil's TPV is a
//   thermoplastic vulcanizate, a material of its own as TPS is (M175).
// - Nylons: Fillamentum Nylon FX256 is PA12 (its printing guide) and MatterHackers PRO Series Nylon a PA6/PA66 blend
//   (its page). Spectrum ThermaTech PA and Yousu Nylon are filed under PA66 by the owner's ruling on the best evidence,
//   marked inferred (two retailers and a melting range; Yousu's own safety data sheet, whose melting point disagrees).
// - The bio-based compounds are PLA-based blends by their makers' own documents (PLA with a copolyester, where they
//   name the partner). Nothing moves: their homes are named for what they are, PLA blend and PLA blend-CF.
// - Eleven products no document names stay in their homes, which now say the maker does not disclose the polymer.
//
// A re-run is a no-op; a run after the data moved stops. The rulings each move answers are in
// docs/audits/2026-09-18-v2-import/rulings/rulings.csv (R205 to R226).
//
//   node scripts/migrate/m223-what-the-makers-say-it-is.mjs

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { openTables, projectRoot } from '../data/table-io.mjs';
import { readCsv } from '../../build/src/csv.js';
import { locate } from '../data/source-store.mjs';
import { sha256 } from '../lib/pdf-text.mjs';
import { moveGrade, recountGrades } from '../data/records.mjs';
import { pageReader } from './printed-on.mjs';

const migration = 'm223-what-the-makers-say-it-is';
const date = '2026-09-28';
const NA = 'Not applicable', NP = 'Not published';
const READER = 'Read by an AI agent (claude-opus-5.5), not a person.';
const here = (suffix) => join(projectRoot, 'scripts/migrate', `${migration}${suffix}`);
const t = openTables();
const printed = pageReader(t, migration);
const name = (id) => t.get('materials', id)['Original name'];

let changed = 0;
const tally = new Map();
const count = (k, n = 1) => { if (n) { tally.set(k, (tally.get(k) ?? 0) + n); changed += n; } };
const setIf = (table, id, column, value, why) => {
  const now = t.get(table, id)[column];
  if (now === value) return;
  t.set(table, id, column, value, { expect: now });
  count(why);
};

// ------------------------------------------------------------------------------------------------ the sources
// Each is the maker's document (or, for ThermaTech PA, the retailers' listings) a research agent fetched, hashed and
// staged by digest (ingest:witness --from). Kept to corroborate what a product is; no value is transcribed from one.
for (const s of readCsv(here('-sources.csv')).records.map((r) => r.values)) {
  const found = locate(s.SHA256, s.SourceID);
  if (found.bytes !== 'present' || sha256(readFileSync(found.path)) !== s.SHA256) throw new Error(`${migration}: ${s.SourceID} is not cached at ${s.SHA256}; stage it first (ingest:witness --from)`);
  const held = t.find('sources', s.SourceID);
  if (held) { if (held.SHA256 !== s.SHA256) throw new Error(`${migration}: ${s.SourceID} is registered with another digest`); continue; }
  const twin = t.rows('sources').find((x) => x.URL === s.URL && x.SHA256 === s.SHA256);
  if (twin) throw new Error(`${migration}: ${s.URL} at ${s.SHA256} is registered already, as ${twin.SourceID}`);
  t.append('sources', s);
  count('sources registered');
}

// ------------------------------------------------------------------------------------------------ TPV, a material
const TPV = 'M175';
if (!t.find('materials', TPV)) {
  if (t.nextId('materials') !== TPV) throw new Error(`${migration}: the next material is ${t.nextId('materials')}, not ${TPV}`);
  t.append('materials', {
    MaterialID: TPV, 'Original name': 'TPV', Family: 'Flexible Elastomers', 'H2C status': 'Theoretical', 'Best uses': NP,
    Limitations: 'No polymers.csv row, so nothing is estimated; heat deflection does not apply to it.',
    'Full name': 'Thermoplastic vulcanizate (TPV)', Scope: 'H2C-relevant', Abbreviation: 'TPV', 'Base polymer': 'TPV',
    'Estimate identity': NA, 'Modifier / filler': 'Unfilled / unspecified', 'Variant class': NA, Role: 'Structural / functional / appearance',
    'Identity notes': `Thermoplastic vulcanizates, ISO 18064 TPV: a rubber phase cross-linked as it is mixed into a thermoplastic. purefil's sheet: "TPV is a high-quality thermoplastic vulcanizate ... With a Shore A hardness of 92"; no document names its rubber or its matrix. A material of its own, as TPS is (R196), made on ${date} (${migration}) by the owner's instruction that a product be named for what its maker's documents say it is (D106); until then R201 filed it under TPE, polymer not stated. No polymers.csv row, so nothing is estimated.`,
  });
  // TPE's own citations, its H2C listing and the family context it cites for use, durability and safety, are the
  // new material's too, as TPS took them (m142). Printing guidance is its product's profile, which moves with it.
  for (const l of t.rows('material_links').filter((x) => x.MaterialID === 'M044' && x.Link !== 'printing')) t.append('material_links', { ...l, MaterialID: TPV });
  count('TPV made a material');
}

// ------------------------------------------------------------------------------------------------ each product
const identities = readCsv(here('.csv')).records.map((r) => r.values);
const moved = new Set();
const citedBefore = new Set(t.rows('material_links').filter((l) => l.Link === 'printing').map((l) => l.MaterialID));
for (const row of identities) {
  const g = t.get('grades', row.GradeID);
  if (row.Check === 'page') {
    if (!printed(row.SourceID, row.Page, row.Words, 2)) throw new Error(`${migration}: ${row.SourceID} p. ${row.Page} no longer prints "${row.Words}"`);
  } else if (row.Check === 'bytes') {
    // A page the reader cannot read whole: 3DJake's question-and-answer block is left out by the page reader, so the
    // answer is checked in the bytes, as m205 checked the link on 3DJake's ELEGOO page.
    const s = t.get('sources', row.SourceID);
    if (!readFileSync(locate(s.SHA256, s.SourceID).path, 'utf8').includes(row.Words)) throw new Error(`${migration}: ${row.SourceID} no longer holds "${row.Words}"`);
  } else throw new Error(`${migration}: ${row.GradeID} names no check ("${row.Check}")`);

  const from = g.MaterialID;
  const done = g['Selected-grade rationale'].includes(migration);
  if (from !== row.To) {
    if (done) throw new Error(`${migration}: ${row.GradeID} is under ${from}, not ${row.To}; the data moved`);
    count('records moved with their products', moveGrade(t, row.GradeID, row.To, { migration }));
    moved.add(from).add(row.To);
    count('products filed under the material their makers name');
  }
  if (done) continue;
  const said = `"${row.Words}" (${row.SourceID}, p. ${row.Page})`;
  // A Shore rating is not a composition; the polymer is.
  if (!/^\d+[AD]$/.test(row.Stated)) {
    const now = t.get('grades', row.GradeID)['Composition / filler'];
    setIf('grades', row.GradeID, 'Composition / filler', now === NP ? said : `${now} ${said}`, 'compositions stated');
  }
  const verb = from === row.To ? `Identified on ${date} (${migration}), under ${name(row.To)}` : `Filed under ${name(row.To)} on ${date} (${migration}), moved from ${name(from)}`;
  setIf('grades', row.GradeID, 'Selected-grade rationale', `${g['Selected-grade rationale']} ${verb}: ${row.Stated}, ${said}. ${row.Why} ${READER}`, 'rationales that say what the product is');
}
if (identities.length !== 30) throw new Error(`${migration}: ${identities.length} identities; this was written for 30`);

// Chinchilla is half a copolyester elastomer and half another TPE, 75 Shore A: a softer grade of TPC, whose values
// stay its own (grade-variants.csv).
setIf('grades', 'G167-05', 'Variant', 'declared softer grade', 'Chinchilla declared a softer grade');

// ------------------------------------------------------------------------------------------------ the TPU class left empty
// A family entry is never a member of another (FAMILY-ENTRY-MAPPING), so TPU's and TPE's rows naming it name the
// materials its products went to instead; each keeps its row (D72), re-pointed.
const TPU_NS = 'M163';
const repoint = [['M039', 'M150'], ['M044', TPV]];
for (const [family, to] of repoint) {
  if (t.rows('family_members').some((r) => r.FamilyMaterialID === family && r.MemberMaterialID === TPU_NS)) {
    t.update('family_members', { FamilyMaterialID: family, MemberMaterialID: TPU_NS }, 'MemberMaterialID', to, { migration });
    count('family members re-pointed');
  }
}
if (t.get('materials', TPU_NS).Scope !== 'Family entry') {
  if (t.rows('grades').some((x) => x.MaterialID === TPU_NS && x.Status === 'active')) throw new Error(`${migration}: ${TPU_NS} still holds a product`);
  const members = ['M159', 'M161', 'M162', 'M150'];
  const why = `every TPU it held is rated by its maker, on its sheet, its page or its maker's other sheet, and is recorded under its class: Eryone Hyper Speed TPU and Standard TPU, Anycubic TPU, MatterHackers Build Series TPU and SUNLU TPU at 95A, eSUN eFlex at 87A, purefil's TPU at 53D, and Siraya Tech Flex TPU Air, a foaming TPU, under TPU-LW (owner's instruction of ${date}, D106).`;
  const m = t.get('materials', TPU_NS);
  const what = `${m['Original name']} is a family entry for ${members.map(name).join(', ')}`;
  t.set('materials', TPU_NS, 'Scope', 'Family entry', { expect: 'H2C-relevant' });
  t.set('materials', TPU_NS, 'Identity notes', `${what} since ${date} (${migration}): ${why}`, { expect: m['Identity notes'] });
  t.append('family_entries', { MaterialID: TPU_NS, Kind: 'family', Why: why });
  for (const to of members) t.append('family_members', { FamilyMaterialID: TPU_NS, MemberMaterialID: to });
  // One Not applicable row per domain it had a live finding in, as every family entry has (m141's pattern).
  const live = t.rows('coverage').filter((x) => x.MaterialID === TPU_NS && !['Not applicable', 'Superseded'].includes(x.Status));
  for (const domain of [...new Set(live.map((c) => c.Domain))]) {
    const id = t.nextId('coverage');
    t.append('coverage', { CoverageID: id, MaterialID: TPU_NS, GradeID: NA, Domain: domain, Status: 'Not applicable', 'Manufacturer count': NA, Finding: `Family entry since ${date} (${migration}): no product of its own. ${what}.` });
    for (const old of live.filter((c) => c.Domain === domain)) {
      t.set('coverage', old.CoverageID, 'Finding', `Superseded by ${id} (${date}; was "${old.Status}"): ${old.Finding}`, { expect: old.Finding });
      t.set('coverage', old.CoverageID, 'Status', 'Superseded', { expect: old.Status });
      if (old['Manufacturer count'] !== NA) t.set('coverage', old.CoverageID, 'Manufacturer count', NA, { expect: old['Manufacturer count'] });
    }
  }
  count('TPU, hardness not stated made a family entry');
}

// ------------------------------------------------------------------------------------------------ the homes' names
// What is left in a nylon or elastomer home is what no document names: its maker does not disclose the polymer, and
// the name says so. The bio-based compounds' homes are named for what their makers' documents say they are.
const undisclosed = (what) => `The home of ${what} whose makers do not disclose which, after a search of their safety data sheets, product pages, guides, archived editions and listings (${migration}, ${date}; docs/audits/2026-09-28-polymer-names/). Shown and judged like any material, and not estimated: the model identifies a material by its polymer, and no document here names one. Made on 2026-09-25 as a "polymer not stated" home (m142, D87) and renamed by the owner's instruction of ${date} (D106). A product a document names is filed under that polymer's material instead; the owner files one on the best evidence where the documents fall short, and says so on the grade (R205).`;
const HOMES = {
  M164: { 'Original name': 'Nylon, maker-undisclosed polyamide', 'Full name': 'Polyamide (Nylon), polyamide not disclosed by the maker', Abbreviation: 'PA (undisclosed)',
    Limitations: 'Its products are nylons whose makers do not disclose which polyamide, so its range spans several polymers, and nothing is estimated where a product is silent.',
    'Identity notes': undisclosed('nylon products') },
  M165: { 'Original name': 'Nylon-CF, maker-undisclosed polyamide', 'Full name': 'Carbon-fibre polyamide (Nylon), polyamide not disclosed by the maker', Abbreviation: 'PA-CF (undisclosed)',
    Limitations: 'Its products are carbon-fibre nylons whose makers do not disclose which polyamide, so its range spans several polymers, and nothing is estimated where a product is silent.',
    'Identity notes': undisclosed('carbon-fibre nylon products') },
  M166: { 'Original name': 'Nylon-GF, maker-undisclosed polyamide', 'Full name': 'Glass-fibre polyamide (Nylon), polyamide not disclosed by the maker', Abbreviation: 'PA-GF (undisclosed)',
    Limitations: 'Its products are glass-fibre nylons whose makers do not disclose which polyamide, so its range spans several polymers, and nothing is estimated where a product is silent.',
    'Identity notes': undisclosed('glass-fibre nylon products') },
  M167: { 'Original name': 'TPE, maker-undisclosed elastomer', 'Full name': 'Thermoplastic elastomer, elastomer not disclosed by the maker', Abbreviation: 'TPE (undisclosed)',
    Limitations: 'Its products are elastomers whose makers do not disclose which, so its range spans several elastomers; nothing is estimated, and heat deflection does not apply to it.',
    'Identity notes': undisclosed('elastomer products') },
  M168: { 'Original name': 'PLA blend', 'Full name': 'PLA-based bio-blend (PLA with a bio-copolyester)', Abbreviation: 'PLA blend', 'Base polymer': 'PLA blend',
    Limitations: 'Its products are bio-based compounds of PLA with a copolyester and mineral fillers, whose partners and proportions their makers do not publish, so its range spans several compounds, and nothing is estimated.',
    'Identity notes': `Bio-based compounds whose makers' documents say they are PLA-based: Extrudr's safety data sheets, "based on PLA, contains copolyester" (GreenTEC; GreenTEC Pro in 2019, "bio-copolyester" in 2026), which purefil's GreenTEC Pro repeats; BigRep's for PRO HT, "Polylactic acid (PLA) compound"; 3DJake's own answer on niceBIO, "other contents besides the PLA"; and Spectrum, which files GreenyHT and GreenyPro under modified PLA. Named for that on ${date} (${migration}), by the owner's instruction (D106); made on 2026-09-25 as "PLA family, polymer not stated" (m142, D87). Not estimated: no polymers.csv row describes a PLA blend, and these products' Vicat (up to 160 °C) and heat deflection sit far from PLA's.` },
  M169: { 'Original name': 'PLA blend-CF', 'Full name': 'Carbon-fibre PLA-based bio-blend', Abbreviation: 'PLA blend-CF', 'Base polymer': 'PLA blend',
    Limitations: 'Its products are carbon-fibre bio-based compounds of PLA with a copolyester, whose partners and proportions their makers do not publish, so its range spans several compounds, and nothing is estimated.',
    'Identity notes': `Carbon-fibre bio-based compounds whose makers say they are PLA-based: Extrudr's German safety data sheet for GreenTEC Pro CF, "auf PLA-Basis, enthält Copolyester", and BigRep's page, "HI-TEMP CF is a PLA blend reinforced with 10% chopped carbon fiber". Named for that on ${date} (${migration}), by the owner's instruction (D106); made on 2026-09-25 as "PLA family-CF, polymer not stated" (m142, D87). Not estimated: no polymers.csv row describes a PLA blend.` },
};
for (const [id, columns] of Object.entries(HOMES)) for (const [column, value] of Object.entries(columns)) setIf('materials', id, column, value, 'home names and notes');

// The family entries list their members by name in their notes, and TPE gains TPV.
const RENAMED = [
  ['M047', 'Nylon, polymer not stated (M164)', 'Nylon, maker-undisclosed polyamide (M164)'],
  ['M062', 'Nylon-CF, polymer not stated (M165)', 'Nylon-CF, maker-undisclosed polyamide (M165)'],
  ['M063', 'Nylon-GF, polymer not stated (M166)', 'Nylon-GF, maker-undisclosed polyamide (M166)'],
  ['M044', 'TPE, polymer not stated (M167)', 'TPE, maker-undisclosed elastomer (M167)'],
];
for (const [id, was, now] of RENAMED) {
  const notes = t.get('materials', id)['Identity notes'];
  if (notes.includes(now)) continue;
  if (!notes.includes(was)) throw new Error(`${migration}: ${id}'s Identity notes no longer name "${was}"`);
  setIf('materials', id, 'Identity notes', notes.replace(was, now), 'family entries that name the homes');
}
const TPE_TPV = ` Since ${date} also TPV (${TPV}), purefil's thermoplastic vulcanizate (${migration}).`;
const tpe = t.get('materials', 'M044')['Identity notes'];
if (!tpe.includes(TPE_TPV.trim())) setIf('materials', 'M044', 'Identity notes', `${tpe}${TPE_TPV}`, 'family entries that name the homes');

// ------------------------------------------------------------------------------------------------ PA66's first products
// PA66 had no product: its coverage said so, and its values were a moulded resin reference's and estimates. The two
// products filed here on the best evidence make those rows untrue; each is superseded, never edited (D72, m141).
const PA66 = 'M055';
const INFERRED = `filed on ${date} by the owner's ruling on the best evidence, marked inferred on each grade (${migration}, R225, R226)`;
const PA66_NOW = {
  'Print setup': ['Evidence recorded', NA, `Spectrum ThermaTech PA (P1163: nozzle 250-280 °C, bed 60-80 °C) and Yousu Nylon (P1192: nozzle 220-260 °C, bed 80-120 °C) publish their own print settings; both ${INFERRED}.`],
  Grades: ['Gap', '2', `2 distinct manufacturer(s) documented against target 3: Spectrum, Yousu. Both ${INFERRED}: Yousu's own safety data sheet names PA66 while its melting point is a PA6's, and Spectrum names no polyamide (two retailers say PA6/6). No product whose maker names PA66 outright is recorded.`],
  Mechanical: ['Limited comparability', NA, `Two printed products, ${INFERRED}: Spectrum ThermaTech PA, ceramic-filled (a declared dense filler, kept apart), and Yousu Nylon. The resin reference Zytel 101L NC010, moulded and dry (G055-R1), stays as the estimates' anchor.`],
  Thermal: ['Limited comparability', NA, `Two printed products, ${INFERRED}; the resin reference Zytel 101L NC010 (HDT 190 °C at 0.45 MPa and 70 °C at 1.8 MPa, moulded, dry; melting point 262 °C) stays beside them.`],
};
for (const [domain, [status, manufacturers, finding]] of Object.entries(PA66_NOW)) {
  const live = t.rows('coverage').filter((c) => c.MaterialID === PA66 && c.Domain === domain && c.Status !== 'Superseded');
  if (live.some((c) => c.Finding === finding)) continue;
  const id = t.nextId('coverage');
  t.append('coverage', { CoverageID: id, MaterialID: PA66, GradeID: NA, Domain: domain, Status: status, 'Manufacturer count': manufacturers, Finding: finding });
  for (const old of live) {
    t.set('coverage', old.CoverageID, 'Finding', `Superseded by ${id} (${date}; was "${old.Status}"): ${old.Finding}`, { expect: old.Finding });
    t.set('coverage', old.CoverageID, 'Status', 'Superseded', { expect: old.Status });
    if (old['Manufacturer count'] !== NA) t.set('coverage', old.CoverageID, 'Manufacturer count', NA, { expect: old['Manufacturer count'] });
  }
  count('PA66 coverage superseded');
}

// ------------------------------------------------------------------------------------------------ the counts
for (const m of [...moved].sort()) {
  if (t.get('materials', m).Scope === 'Family entry') continue;
  // A material whose printing citation left with the product that gave it cites its first remaining product's first
  // profile instead, as a class does (m141).
  if (citedBefore.has(m) && !t.rows('material_links').some((l) => l.MaterialID === m && l.Link === 'printing')) {
    const products = new Set(t.rows('grades').filter((g) => g.MaterialID === m && g.Status === 'active').map((g) => g.GradeID));
    const first = t.rows('profiles').filter((p) => products.has(p.GradeID) && p.Status !== 'retired').map((p) => p.ProfileID).sort()[0];
    if (first) { t.append('material_links', { MaterialID: m, Link: 'printing', RecordID: first }); count('printing citations replaced'); }
  }
  if (recountGrades(t, m, { migration, date, because: 'after the products whose makers name their polymer or rating were filed under it' })) count('materials recounted');
}

if (changed) t.save();
for (const [k, n] of [...tally].sort()) console.log(`  ${n}\t${k}`);
console.log(`${migration}: ${changed} change(s)`);
