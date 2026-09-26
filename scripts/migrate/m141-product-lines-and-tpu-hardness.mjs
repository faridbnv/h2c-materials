#!/usr/bin/env node
// Migration m141 (2026-09-25): one maker's product lines are products, and TPU is read by hardness (re-center phase 5,
// the owner's decision of 2026-09-25; D86).
//
// The canonical list was Bambu's catalogue, so fourteen Bambu product lines and eSUN's PLA-Lite were materials of their
// own, one product each, beside a PLA, PETG and TPU that already held every other maker's matte, tough, translucent,
// high-speed and hardness-named products (16 matte and 14 tough PLAs, 5 high-speed PETGs, 34 TPUs named by hardness).
// The only prices in the database were on those lines, so plain PLA and PETG had none.
//
// - The eleven PLA, PLA Silk and PETG lines move into the material they are: PLA Basic, Matte, Basic Gradient, Tough+,
//   Translucent and eSUN PLA Lite into PLA; PLA Silk+ and Silk Dual Color into PLA Silk; PETG Basic, HF and
//   Translucent into PETG. Each old row stays, as an alias of its new home (Scope Family entry, D44), so its name still
//   finds the product.
// - TPU is split by the hardness its maker rates it, for every maker, as the owner chose over one TPU: 87A or softer,
//   88 to 92A, 93 to 97A, harder than 95A (98A and above, and Shore D), and hardness not stated. The rating is the one in
//   the product's name, else the one its sheet publishes, pinned per product in m141-product-lines-and-tpu-hardness-tpu-hardness.csv. TPU itself
//   becomes a family entry over the five, and Bambu's four TPU rows aliases of their class.
//
// A product moves by its MaterialID, with every record filed under it (measurements, profiles, evidence, prices) and the
// printing citations of its own profiles and evidence: its ID and theirs stay, so every link, pin and statement still
// resolves (D86). An alias or a family entry keeps its H2C status and family-context citations; its coverage findings
// become Not applicable, each keeping what it said. Nothing is deleted. A re-run is a no-op; a run after the data moved
// stops.
//
//   node scripts/migrate/m141-product-lines-and-tpu-hardness.mjs

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../../build/src/csv.js';
import { openTables } from '../data/table-io.mjs';
import { moveGrade } from '../data/records.mjs';

const migration = 'm141-product-lines-and-tpu-hardness';
const date = '2026-09-25';
const here = dirname(fileURLToPath(import.meta.url));
const t = openTables();
const NA = 'Not applicable';

const MERGE = {
  M002: 'M001', M003: 'M001', M004: 'M001', M005: 'M001', M006: 'M001', M007: 'M001',
  M009: 'M008', M010: 'M008',
  M021: 'M020', M022: 'M020', M023: 'M020',
};
const TPU = 'M039';
const CLASSES = [
  { id: 'M159', name: 'TPU 85A class and softer', abbr: 'TPU ≤87A', full: 'Thermoplastic Polyurethane, rated 87 Shore A or softer', rated: 'rate them 87 Shore A or softer (60A to 87A here)' },
  { id: 'M160', name: 'TPU 90A class', abbr: 'TPU 90A class', full: 'Thermoplastic Polyurethane, rated 88 to 92 Shore A', rated: 'rate them 88 to 92 Shore A' },
  { id: 'M161', name: 'TPU 95A class', abbr: 'TPU 95A class', full: 'Thermoplastic Polyurethane, rated 93 to 97 Shore A', rated: 'rate them 93 to 97 Shore A' },
  { id: 'M162', name: 'TPU harder than 95A', abbr: 'TPU >95A', full: 'Thermoplastic Polyurethane, rated 98 Shore A or harder, or on the Shore D scale', rated: 'rate them 98 Shore A or harder, or on the Shore D scale (50D to 75D here)' },
  { id: 'M163', name: 'TPU, hardness not stated', abbr: 'TPU (hardness n/s)', full: 'Thermoplastic Polyurethane, hardness not stated', rated: 'state no Shore hardness, in the product\'s name or on its sheets' },
];
const TPU_ALIASES = { M040: 'M162', M041: 'M161', M042: 'M160', M043: 'M159' };
const pinned = readCsv(join(here, `${migration}-tpu-hardness.csv`)).records.map((r) => r.values);

if (t.find('materials', 'M159')) {
  const done = t.get('materials', TPU).Scope === 'Family entry' && Object.keys(MERGE).every((id) => t.get('materials', id).Scope === 'Family entry');
  if (!done) throw new Error(`${migration}: half applied; the data moved since this was written`);
  console.log(`${migration}: already applied`);
  process.exit(0);
}

const name = (id) => t.get('materials', id)['Original name'];
let moved = 0, records = 0;

/** Move one product to another material (scripts/data/records.mjs, D86), counting what went with it. */
function move(gradeId, to) {
  const n = moveGrade(t, gradeId, to, { migration });
  if (t.get('grades', gradeId).MaterialID === to) { moved++; records += n; }
}

/**
 * Supersede the live coverage rows of one material and domain with one row that says what is true now: a row is never
 * edited in place (m39's pattern, D72). The new row takes the next ID; each old one says which row replaced it.
 */
function supersede(olds, status, finding) {
  const id = t.nextId('coverage');
  t.append('coverage', { CoverageID: id, MaterialID: olds[0].MaterialID, Domain: olds[0].Domain, Status: status, 'Manufacturer count': NA, Finding: finding });
  for (const old of olds) {
    t.set('coverage', old.CoverageID, 'Finding', `Superseded by ${id} (${date}; was "${old.Status}"): ${old.Finding}`, { expect: old.Finding });
    t.set('coverage', old.CoverageID, 'Status', 'Superseded', { expect: old.Status });
    if (old['Manufacturer count'] !== NA) t.set('coverage', old.CoverageID, 'Manufacturer count', NA, { expect: old['Manufacturer count'] });
  }
}

/** A material that no longer owns a product: an alias of one material, or a family entry over several. */
function toEntry(id, kind, members, why) {
  const m = t.get('materials', id);
  const what = `${m['Original name']} is ${kind === 'alias' ? 'an alias of' : 'a family entry for'} ${members.map(name).join(', ')}`;
  t.set('materials', id, 'Scope', 'Family entry', { expect: 'H2C-relevant' });
  t.set('materials', id, 'Identity notes', `${what} since ${date} (${migration}): ${why}`, { expect: m['Identity notes'] });
  t.append('family_entries', { MaterialID: id, Kind: kind, Why: why });
  for (const to of members) t.append('family_members', { FamilyMaterialID: id, MemberMaterialID: to });
  // One Not applicable row per domain the material had a live finding in, as every family entry has.
  const live = t.rows('coverage').filter((x) => x.MaterialID === id && !['Not applicable', 'Superseded'].includes(x.Status));
  for (const domain of [...new Set(live.map((c) => c.Domain))]) {
    supersede(live.filter((c) => c.Domain === domain), 'Not applicable', `Family entry since ${date} (${migration}): no product of its own. ${what}.`);
  }
}

// ------------------------------------------------------------------------------------------------ the product lines
for (const [id, to] of Object.entries(MERGE)) {
  const grades = t.rows('grades').filter((g) => g.MaterialID === id);
  const active = grades.filter((g) => g.Status === 'active' && g.Role === 'procurement');
  if (active.length !== 1) throw new Error(`${migration}: ${id} ${name(id)} has ${active.length} active products; the merge was decided for one`);
  const product = `${active[0].Manufacturer} ${active[0]['Product name']}`;
  for (const g of grades) move(g.GradeID, to);
  toEntry(id, 'alias', [to], `its one product, ${product} (${active[0].GradeID}), is a ${name(to)} and is recorded there with every record it had; the canonical list named the maker's product line as a material (owner decision, re-center phase 5).`);
}

// ------------------------------------------------------------------------------------------------ TPU by hardness
const tpu = t.get('materials', TPU);
for (const c of CLASSES) {
  t.append('materials', {
    ...tpu, MaterialID: c.id, 'Original name': c.name, 'Full name': c.full, Abbreviation: c.abbr, Scope: 'H2C-relevant',
    'Identity notes': `TPU products whose makers ${c.rated}: the rating in the product's name, else the hardness its sheet publishes (scripts/migrate/${migration}-tpu-hardness.csv). Split from TPU on ${date} (${migration}), the owner's decision (re-center phase 5).`,
  });
  // TPU's own citations: its H2C listing, and the family context it cites for use, durability and safety.
  for (const l of t.rows('material_links').filter((x) => x.MaterialID === TPU && x.Link !== 'printing')) t.append('material_links', { ...l, MaterialID: c.id });
}
// R053 recorded the numbers of sheets that print the same table once, on the first, and gave the others its formulation
// key. Where the makers rate the products differently (Essentium's 80A and 95A, FormFutura's rTPU 85A, 90A and 95A)
// they are not one formulation, whatever the sheets print: each keeps its own key, and the numbers stay where they are.
const OWN_KEY = ['G039-59', 'G039-62', 'G039-64'];
for (const id of OWN_KEY) {
  const g = t.get('grades', id);
  if (g['Shared formulation key'] === g.SourceID) continue;
  t.set('grades', id, 'Shared formulation key', g.SourceID, { expect: g['Shared formulation key'] });
}
const classOf = new Map(pinned.map((p) => [p.GradeID, p.Class]));
const tpuGrades = t.rows('grades').filter((g) => [TPU, ...Object.keys(TPU_ALIASES)].includes(g.MaterialID));
for (const g of tpuGrades) {
  const to = classOf.get(g.GradeID);
  if (!to) throw new Error(`${migration}: ${g.GradeID} ${g['Product name']} has no pinned hardness class`);
  move(g.GradeID, to);
}
if (classOf.size !== tpuGrades.length) throw new Error(`${migration}: ${classOf.size} pinned, ${tpuGrades.length} TPU products; the data moved since this was written`);
// A class cites its first product's first profile, so its guidance quotes a profile, as every material's does.
for (const c of CLASSES) {
  if (t.rows('material_links').some((x) => x.MaterialID === c.id && x.Link === 'printing')) continue;
  const products = new Set(t.rows('grades').filter((g) => g.MaterialID === c.id).map((g) => g.GradeID));
  const first = t.rows('profiles').filter((p) => products.has(p.GradeID) && p.Status !== 'retired').map((p) => p.ProfileID).sort()[0];
  if (first) t.append('material_links', { MaterialID: c.id, Link: 'printing', RecordID: first });
}
for (const [id, to] of Object.entries(TPU_ALIASES)) {
  const product = pinned.find((p) => p.Class === to && p.GradeID.startsWith(`G${id.slice(1)}-`));
  toEntry(id, 'alias', [to], `its one product, ${product.Product} (${product.GradeID}), is rated ${product.Rating} and is recorded under ${name(to)} with every TPU its maker rates alike (owner decision, re-center phase 5).`);
}
toEntry(TPU, 'family', CLASSES.map((c) => c.id), 'TPU products are recorded by the Shore hardness their makers rate them, because a flexible part is chosen by it (owner decision, re-center phase 5).');
// TPE's members were TPU and Bambu's four TPU rows; they are the five TPU classes now.
for (const [old, now] of [[TPU, 'M163'], ...Object.entries(TPU_ALIASES)]) t.update('family_members', { FamilyMaterialID: 'M044', MemberMaterialID: old }, 'MemberMaterialID', now, { migration });

// A gap the moved products fill is closed: their prices and records are their new material's now.
const FILLED = {
  C00072: 'PLA\'s products now include Bambu Lab\'s PLA lines and eSUN PLA-Lite, and their sampled Canadian prices are PLA\'s',
  C00139: 'PLA Silk\'s products now include Bambu Lab PLA Silk+ and PLA Silk Dual Color, and their exposure and moisture statements are PLA Silk\'s',
  C00141: 'PLA Silk\'s products now include Bambu Lab PLA Silk+ and PLA Silk Dual Color, and their sampled Canadian prices are PLA Silk\'s',
  C00260: 'PETG\'s products now include Bambu Lab PETG Basic, HF and Translucent, and their sampled Canadian prices are PETG\'s',
};
for (const [id, finding] of Object.entries(FILLED)) {
  const old = t.get('coverage', id);
  if (old.Status !== 'Gap') throw new Error(`${migration}: coverage ${id} is "${old.Status}", not the Gap this closes`);
  supersede([old], 'Resolved', `${finding} (${migration}, ${date}).`);
}

const changes = t.save();
console.log(`${migration}: ${moved} product(s) moved with ${records} record(s); ${Object.keys(MERGE).length + Object.keys(TPU_ALIASES).length} alias(es), TPU a family entry over ${CLASSES.length} classes; ${changes.length} change(s)`);
