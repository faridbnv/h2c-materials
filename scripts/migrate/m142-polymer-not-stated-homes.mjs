#!/usr/bin/env node
// Migration m142 (2026-09-25): a family's "polymer not stated" home, TPS, and the sintering filaments (re-center
// phase 5, part 2; the owner's decisions of 2026-09-25 in docs/GOALS.md; D87).
//
// Fifty data sheets name only a family ("colorFabb PA Neat", "eSUN TPE 83A") and twenty-four waited on an owner
// ruling. A family owns no product (D44), so none of them had a home, and every one was deferred. The owner decided:
//
// - A family gets a "polymer not stated" material, one per family entry and declared filler that these sheets need:
//   Nylon (PA), Nylon-CF, Nylon-GF and TPE, and for the undisclosed bio-copolymers the owner named (Extrudr GreenTEC,
//   GreenTEC Pro and Pro CF, 3DJake niceBIO) the PLA family, unfilled and with carbon fibre. Each is shown and judged
//   like any material, labelled in its name, and not estimated (Estimate identity Not applicable). Its base polymer is
//   the word the sheets use where the family has one (PA, TPE), so a word ruling files a family-only sheet by its
//   filler (R168 to R170); the PLA family's is "Biopolymer (not stated)", which no identity reaches.
// - The styrenic elastomers get a material of their own, TPS, under Flexible Elastomers, with no polymers.csv row.
// - Metal and ceramic sintering filaments are recorded and never a candidate, as PEEK is: one material per metal or
//   ceramic the sheets need (316L, silicon carbide, alumina), Scope Excluded, in a family of their own.
//
// Heat deflection is a rigid-bar test (D56) and did not apply to an elastomer only through its polymer's row: a
// Flexible Elastomers material with no row (TPS, the TPE home) has Morphology "not modelled", which hdt045 admitted,
// so FiberFlex's 70 °C and purefil TPS 40D's 110 °C would have decided heat requirements. hdt045 now names the
// families it applies to as well, which leaves out Flexible Elastomers and the sintering filaments; no material that
// existed before this migration changes (build:diff).
//
// Two products already recorded move with the ruling that now names them (R180, R184): purefil's GreenTEC Pro, the
// product Extrudr's GreenTEC Pro sheet describes, and Spectrum's GreenyHT, "a new filament based on high-performance
// biopolymer". Both were filed under PLA from the sheet's comparison with PLA, and both as an undisclosed dense filler
// measured against PLA's neat density; with the polymer not stated neither premise holds, so their Variant is Not
// applicable and their Composition the sheet's own silence. A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m142-polymer-not-stated-homes.mjs

import { openTables } from '../data/table-io.mjs';
import { moveGrade, recountGrades } from '../data/records.mjs';

const migration = 'm142-polymer-not-stated-homes';
const date = '2026-09-25';
const t = openTables();
const NA = 'Not applicable', NP = 'Not published';

if (t.find('materials', 'M164')) {
  const done = t.get('materials', 'M173')['Original name'] === 'Alumina sintering filament' && t.get('grades', 'G001-66').MaterialID === 'M168';
  if (!done) throw new Error(`${migration}: half applied; the data moved since this was written`);
  console.log(`${migration}: already applied`);
  process.exit(0);
}

const decision = `made on ${date} (${migration}) by the owner's decision (docs/GOALS.md, "Decided on 2026-09-25, for phase 5"; D87)`;
const home = (what, instead) => `The home of ${what}, ${decision}. Shown and judged like any material, and not estimated: the model identifies a material by its polymer, and no sheet here states one. ${instead}`;
const common = { 'Best uses': NP, Scope: 'H2C-relevant', 'Estimate identity': NA, 'Variant class': NA, Role: 'Structural / functional / appearance' };
const SINTERING = 'Metal and Ceramic Sintering - Outside H2C Scope';
const sintered = (what) => `Excluded: the printed part is a green part that must be debinded and sintered elsewhere, and its properties are the sintered ${what}'s, not a printed polymer's.`;
const recorded = (what) => `A ${what} sintering filament: recorded and never a candidate, as PEEK is, ${decision}. The sheets name the metal or ceramic and not the binder, so the base polymer is not stated and nothing is estimated.`;

const MATERIALS = [
  { MaterialID: 'M164', 'Original name': 'Nylon, polymer not stated', Family: 'Nylon / Polyamide', 'H2C status': 'Officially listed family',
    Limitations: 'Its products are nylons whose makers do not say which polyamide, so its range spans several polymers, and nothing is estimated where a product is silent.',
    'Full name': 'Polyamide (Nylon), polymer not stated', Abbreviation: 'PA (polymer n/s)', 'Base polymer': 'PA', 'Modifier / filler': 'Unfilled / unspecified',
    'Identity notes': home('nylon products whose sheets name only the family (nylon, polyamide, PA) and not which polyamide', 'A product whose sheet names its polyamide is filed under that polyamide\'s material instead (R167).') },
  { MaterialID: 'M165', 'Original name': 'Nylon-CF, polymer not stated', Family: 'Nylon / Polyamide', 'H2C status': 'Officially listed family',
    Limitations: 'Its products are carbon-fibre nylons whose makers do not say which polyamide, so its range spans several polymers, and nothing is estimated where a product is silent.',
    'Full name': 'Carbon-fibre polyamide (Nylon), polymer not stated', Abbreviation: 'PA-CF (polymer n/s)', 'Base polymer': 'PA', 'Modifier / filler': 'Carbon fibre',
    'Identity notes': home('carbon-fibre nylon products whose sheets name only the family and not which polyamide', 'A product whose sheet names its polyamide is filed under that polyamide\'s carbon-fibre material instead (R167).') },
  { MaterialID: 'M166', 'Original name': 'Nylon-GF, polymer not stated', Family: 'Nylon / Polyamide', 'H2C status': 'Officially listed family',
    Limitations: 'Its products are glass-fibre nylons whose makers do not say which polyamide, so its range spans several polymers, and nothing is estimated where a product is silent.',
    'Full name': 'Glass-fibre polyamide (Nylon), polymer not stated', Abbreviation: 'PA-GF (polymer n/s)', 'Base polymer': 'PA', 'Modifier / filler': 'Glass fibre',
    'Identity notes': home('glass-fibre nylon products whose sheets name only the family and not which polyamide', 'A product whose sheet names its polyamide is filed under that polyamide\'s glass-fibre material instead (R167).') },
  { MaterialID: 'M167', 'Original name': 'TPE, polymer not stated', Family: 'Flexible Elastomers', 'H2C status': 'Theoretical',
    Limitations: 'Its products are elastomers whose makers name only the family (TPE, or a flexible filament rated by its Shore hardness), so its range spans several elastomers; nothing is estimated, and heat deflection does not apply to it.',
    'Full name': 'Thermoplastic elastomer, polymer not stated', Abbreviation: 'TPE (polymer n/s)', 'Base polymer': 'TPE', 'Modifier / filler': 'Unfilled / unspecified',
    'Identity notes': home('elastomer products whose sheets name only the family (TPE, or a flexible filament named by its Shore hardness) and not which elastomer', 'Fiberlogy\'s FiberFlex 30D and 40D and MattFlex 40D, whose makers\' pages and safety sheets disagree between a TPU and a copolyester elastomer, are here by the owner\'s ruling (R172 to R174). A product whose sheet names its elastomer is filed under that elastomer\'s material instead (R167).') },
  { MaterialID: 'M168', 'Original name': 'PLA family, polymer not stated', Family: 'PLA', 'H2C status': 'Theoretical',
    Limitations: 'Its products are bio-based compounds their makers place beside PLA without naming the polymer (PLA-based with a copolyester, a bio-copolyester or a biopolymer blend, by their own documents), so its range spans several compounds, and nothing is estimated.',
    'Full name': 'Bio-based polymer of the PLA family, polymer not stated', Abbreviation: 'PLA family (polymer n/s)', 'Base polymer': 'Biopolymer (not stated)', 'Modifier / filler': 'Unfilled / unspecified',
    'Identity notes': home('the undisclosed bio-copolymers the owner named (Extrudr GreenTEC and GreenTEC Pro, 3DJake niceBIO) and the products whose sheets say the same (R179 to R185)', 'Extrudr\'s own safety sheets disagree: "based on PLA, contains copolyester" in some editions and "bio-copolyester" in others. A product whose sheet names PLA as its polymer is filed under PLA instead.') },
  { MaterialID: 'M169', 'Original name': 'PLA family-CF, polymer not stated', Family: 'PLA', 'H2C status': 'Theoretical',
    Limitations: 'Its products are carbon-fibre bio-based compounds their makers place beside PLA without naming the polymer, so its range spans several compounds, and nothing is estimated.',
    'Full name': 'Carbon-fibre bio-based polymer of the PLA family, polymer not stated', Abbreviation: 'PLA family-CF (polymer n/s)', 'Base polymer': 'Biopolymer (not stated)', 'Modifier / filler': 'Carbon fibre',
    'Identity notes': home('the carbon-fibre undisclosed bio-copolymers (Extrudr GreenTEC Pro CF by the owner\'s ruling, R181; BigRep HI-TEMP CF, R186)', 'A product whose sheet names PLA as its polymer is filed under PLA-CF instead.') },
  { MaterialID: 'M170', 'Original name': 'TPS', Family: 'Flexible Elastomers', 'H2C status': 'Theoretical',
    Limitations: 'No polymers.csv row, so nothing is estimated; heat deflection does not apply to it.',
    'Full name': 'Styrenic thermoplastic elastomer (TPS)', Abbreviation: 'TPS', 'Base polymer': 'TPS', 'Modifier / filler': 'Unfilled / unspecified',
    'Identity notes': `Styrenic block copolymer elastomers, ISO 18064 TPS: BASF's Ultrafuse TPS 90A is "SEBS based" and purefil's TPS 40D a "thermoplastic styrene block copolymer elastomer". A material of their own, ${decision}; until then R056 filed them under TPE, a family entry, and they waited. No polymers.csv row: the one styrenic resin reference recorded (Kraton G1650 M) is a single SEBS grade, and purefil's sheet does not say its block copolymer is SEBS, so nothing is estimated.` },
  { MaterialID: 'M171', 'Original name': '316L stainless steel sintering filament', Family: SINTERING, 'H2C status': 'Excluded', Scope: 'Excluded',
    Limitations: sintered('stainless steel'), 'Full name': '316L stainless steel metal-polymer composite filament (sintering feedstock)', Abbreviation: '316L',
    'Base polymer': 'Binder (not stated)', 'Modifier / filler': 'Metal powder', 'Identity notes': recorded('316L stainless steel') },
  { MaterialID: 'M172', 'Original name': 'Silicon carbide sintering filament', Family: SINTERING, 'H2C status': 'Excluded', Scope: 'Excluded',
    Limitations: sintered('ceramic'), 'Full name': 'Silicon carbide ceramic-polymer composite filament (sintering feedstock)', Abbreviation: 'SiC',
    'Base polymer': 'Binder (not stated)', 'Modifier / filler': 'Ceramic', 'Identity notes': recorded('silicon carbide') },
  { MaterialID: 'M173', 'Original name': 'Alumina sintering filament', Family: SINTERING, 'H2C status': 'Excluded', Scope: 'Excluded',
    Limitations: sintered('ceramic'), 'Full name': 'Aluminium oxide ceramic-polymer composite filament (sintering feedstock)', Abbreviation: 'Al2O3',
    'Base polymer': 'Binder (not stated)', 'Modifier / filler': 'Ceramic', 'Identity notes': recorded('alumina (aluminium oxide)') },
];
for (const m of MATERIALS) t.append('materials', { ...common, ...m });

// A family entry lists the materials a search for its name answers with (D44): the homes are members of theirs.
const MEMBERS = { M164: 'M047', M165: 'M062', M166: 'M063', M167: 'M044', M170: 'M044' };
for (const [member, family] of Object.entries(MEMBERS)) t.append('family_members', { FamilyMaterialID: family, MemberMaterialID: member });
// And each says so in its own notes, which list its members.
const NOTED = {
  M047: 'PA is a family entry for unfilled aliphatic polyamides: PA6, PA6/66, PA66, PA12, PA612.',
  M062: 'PA-CF is a family entry for carbon-fibre polyamides: PA6-CF, PA66-CF, PA12-CF, PA612-CF, PAHT-CF.',
  M063: 'PA-GF is a family entry for glass-fibre polyamides:',
  M044: 'TPE is a family entry for thermoplastic elastomers: TPU (all grades), PEBA, TPC / TPEE, OBC.',
};
const ALSO = {
  M047: `Since ${date} also Nylon, polymer not stated (M164), for the products whose sheets name only the family (D87).`,
  M062: `Since ${date} also Nylon-CF, polymer not stated (M165), for the products whose sheets name only the family (D87).`,
  M063: `Since ${date} also Nylon-GF, polymer not stated (M166), for the products whose sheets name only the family (D87).`,
  M044: `Since ${date} also TPS (M170), and TPE, polymer not stated (M167) for the products whose sheets name only the family (D87).`,
};
for (const [id, head] of Object.entries(NOTED)) {
  const notes = t.get('materials', id)['Identity notes'];
  if (!notes.startsWith(head)) throw new Error(`${migration}: ${id}'s Identity notes no longer begin "${head}"`);
  t.set('materials', id, 'Identity notes', `${notes} ${ALSO[id]}`, { expect: notes });
}

// The family's own citations, its H2C listing and the family context it cites for use, durability and safety, are
// the home's too, as a TPU class took TPU's (m141). Printing guidance is a product's profile, cited after the batch.
const CITED_FROM = { M164: 'M047', M165: 'M062', M166: 'M063', M167: 'M044', M170: 'M044' };
for (const [id, from] of Object.entries(CITED_FROM)) {
  for (const l of t.rows('material_links').filter((x) => x.MaterialID === from && x.Link !== 'printing')) t.append('material_links', { ...l, MaterialID: id });
}

// Heat deflection applies to the families of rigid polymers, as well as to the morphologies it always named.
const hdt = t.get('headline_definitions', 'hdt045');
const RIGID = ['ABS', 'Acetals', 'ASA', 'Copolyesters', 'Fluoropolymers', 'High-Performance Engineering',
  'Industrial High-Temperature - Outside H2C Practical Envelope', 'Nylon / Polyamide', 'PET Engineering', 'PETG', 'PLA',
  'Polycarbonate', 'Polymer Blends', 'Polyolefins', 'PVB / Specialty Polymers', 'Styrenics', 'Support / Interface', 'Support / Soluble'];
t.set('headline_definitions', 'hdt045', 'Applies to', `${hdt['Applies to']}; Family: ${RIGID.join(' | ')}`, { expect: 'Morphology: amorphous | semicrystalline | not modelled' });
t.set('headline_definitions', 'hdt045', 'Not applicable reason',
  `${hdt['Not applicable reason']} An elastomer the model has no polymer row for is still an elastomer: a Flexible Elastomers material is left out by its family (TPS, TPE polymer not stated; D87), and so is a sintering filament, whose part is the sintered metal's or ceramic's.`,
  { expect: hdt['Not applicable reason'] });

// The two products already recorded that the rulings now name move to the home, with every record filed under them.
const MOVED = {
  'G001-66': { name: 'GreenTEC Pro', composition: 'Its density of 1390 kg/m³ is above what neat PLA reaches (1330), so the product carries a filler its name does not declare. Not declared on the sheet; recorded as a Variant under D57 (R078, m131-grades-the-sweep-found).' },
  'G001-134': { name: 'GreenyHT', composition: 'Its density of 1540 kg/m³ is above what neat PLA reaches (1330), so the product carries a filler its name does not declare. Not declared on the sheet; recorded as a Variant under D57 (R078).' },
};
let records = 0;
for (const [id, was] of Object.entries(MOVED)) {
  const g = t.get('grades', id);
  if (g['Product name'] !== was.name || g.MaterialID !== 'M001') throw new Error(`${migration}: ${id} is ${g.Manufacturer} ${g['Product name']} under ${g.MaterialID}, not ${was.name} under PLA`);
  records += moveGrade(t, id, 'M168', { migration });
  t.set('grades', id, 'Variant', NA, { expect: 'undisclosed dense filler' });
  t.set('grades', id, 'Composition / filler', `${NP}: the sheet declares no filler. Recorded until ${date} as an undisclosed dense filler, from its density against neat PLA's; filed in the PLA family's polymer-not-stated home (${migration}, D87), where no polymer's density is known to exceed.`, { expect: was.composition });
}
const recount = recountGrades(t, 'M001', { migration, date, because: 'after GreenTEC Pro and GreenyHT moved to the PLA family\'s polymer-not-stated home' });

const changes = t.save();
console.log(`${migration}: ${MATERIALS.length} materials, ${Object.keys(MEMBERS).length} family members, 2 products moved with ${records} record(s)${recount ? `, PLA's makers recounted (${recount})` : ''}; ${changes.length} change(s)`);
