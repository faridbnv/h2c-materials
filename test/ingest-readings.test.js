// Reading an identity a name does not give (R075, R077, R083). What is asserted here is the rule, on a fixture:
// a count from the live corpus would fail every time a document is applied, and would say nothing about whether
// the rule is right.
//
// The one thing each test guards is a way this reading could become a guess with a citation on it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { admits, gluedToTheName, fromTheUrl, rulingsFromVerdicts } from '../scripts/ingest/readings.mjs';
import { IMPLAUSIBLE_DENSITY } from '../scripts/ingest/propose.mjs';

const aliases = [
  { Token: 'petg', Polymer: 'PETG' }, { Token: 'pla', Polymer: 'PLA' }, { Token: 'pc', Polymer: 'PC' },
  { Token: 'pe', Polymer: 'PE' }, { Token: 'pet', Polymer: 'PET' },
].sort((a, b) => b.Token.length - a.Token.length);
const known = new Set([...aliases.map((a) => a.Token), 'tpe', 'nylon']);

const polymers = [
  { PolymerID: 'PLA', Morphology: 'amorphous', 'Melting point °C': 'Not applicable', 'Neat density min kg/m³': '1170', 'Neat density max kg/m³': '1330' },
  { PolymerID: 'PA12', Morphology: 'semicrystalline', 'Melting point °C': '178', 'Neat density min kg/m³': '990', 'Neat density max kg/m³': '1040' },
  { PolymerID: 'PA6', Morphology: 'semicrystalline', 'Melting point °C': '222', 'Neat density min kg/m³': '1110', 'Neat density max kg/m³': '1180' },
];

test('a word stuck to the front of an alias is the maker naming its polymer', () => {
  assert.equal(gluedToTheName('3DJAKE easyPETG Pastel Pink', aliases, known)?.polymer, 'PETG');
  assert.equal(gluedToTheName('Polymaker PolyLite CosPLA Version A', aliases, known)?.polymer, 'PLA');
  assert.equal(gluedToTheName('eSUN ePC Filament', aliases, known)?.polymer, 'PC');
});

test('a token the lexicon already knows is never split: TPE is not a polyethylene', () => {
  // "tpe" ends in "pe". Splitting it would file six elastomers under PE, which is worse than leaving them held:
  // a family word that owns no product is D44's business, not this reading's.
  assert.equal(gluedToTheName('Flexfill TPE 90A', aliases, known), null);
  assert.equal(gluedToTheName('eSUN TPE 83A Filament', aliases, known), null);
});

test('an alias standing alone is not a glued name, and neither is a word that merely contains one', () => {
  assert.equal(gluedToTheName('PLA Filament', aliases, known), null);
  assert.equal(gluedToTheName('Compact Filament', aliases, known), null);   // "compact" does not end in an alias
});

test('a sheet that prints a melting point rules out every amorphous polymer', () => {
  const read = admits({ melting: { value: 180, unit: '°C' } }, polymers).map((a) => a.polymer);
  assert.deepEqual(read, ['PA12']);
  assert.ok(!read.includes('PLA'));
});

test('a density is a window and not a point: PA6 and PA12 do not overlap', () => {
  assert.deepEqual(admits({ density: { value: 1150 } }, polymers).map((a) => a.polymer), ['PA6']);
  assert.deepEqual(admits({ density: { value: 1000 } }, polymers).map((a) => a.polymer), ['PA12']);
});

test('a density no filament reaches narrows nothing: it is the page misread', () => {
  // Four sheets in the ruling queue read 23000 kg/m³ or more, one of them 1183000. Used as a fingerprint such a
  // number excludes every polymer and would read as "no polymer fits", which is a conclusion about the database
  // drawn from a defect in the reading.
  assert.ok(IMPLAUSIBLE_DENSITY > 4000, 'tungsten-filled PLA, the densest here, is about 4000');
  assert.deepEqual(admits({ density: { value: 23000 } }, polymers), []);
  assert.deepEqual(admits({ density: { value: 23000 }, melting: { value: 222 } }, polymers).map((a) => a.polymer), ['PA6']);
});

test("a maker's own product path names the polymer; the host and the query do not", () => {
  const seen = fromTheUrl({ source_page_url: 'https://www.3djake.com/colorfabb/pla-red', url: 'https://cdn/x.pdf?v=pc' }, aliases, known);
  assert.deepEqual([...seen.keys()], ['PLA']);
  assert.equal(fromTheUrl({ url: 'https://pla.example.com/sheet.pdf' }, aliases, known).size, 0);
});

test("a maker's page is a witness only where a line names this product and one polymer, and is not a comparison or a menu", async () => {
  const { witnessReading } = await import('../scripts/ingest/readings.mjs');
  const polymerOf = new Map([['pekk', 'PEKK'], ['pla', 'PLA'], ['hips', 'HIPS'], ['pa12', 'PA12']]);
  // Stratasys's page: the line names the product and one polymer, and is about the product.
  assert.equal(witnessReading(['Antero 800NA: A PEKK-Based 3D Printing Material'], 'antero800na', polymerOf)?.polymer, 'PEKK');
  // A comparison names the product beside a polymer it is not: BigRep's "Printing with PRO HT vs. PLA".
  assert.equal(witnessReading(['Printing with PRO HT vs. PLA, which is better?'], 'proht', polymerOf), null);
  // A menu lists everything beside the product: Fiberlogy's breadcrumb put a HIPS next to FiberFlex+CF.
  assert.equal(witnessReading(['Home Flex FiberFlex+CF FiberFlex+CF Filament – S2 HIPS – Sale'], 'fiberflexcf', polymerOf), null);
  // Two polymers on the product's lines settle nothing.
  assert.equal(witnessReading(['NylonG is a PA12', 'NylonG prints like PLA'], 'nylong', polymerOf), null);
  // A line that does not name the product is about something else, whatever it says.
  assert.equal(witnessReading(['Our PLA is a bioplastic'], 'proht', polymerOf), null);
  // A longer product that begins with this one's name is another product: BigRep's HI-TEMP CF is not its HI-TEMP.
  assert.equal(witnessReading(['HI-TEMP CF PA12 CF'], 'hitemp', polymerOf), null);
  // And the polymer has to stand in the same clause as the name.
  assert.equal(witnessReading(['PLA is somewhat stronger and resistant to impact, while PRO HT is less brittle'], 'proht', polymerOf), null);
  assert.equal(witnessReading(['PLX - Next Gen PLA Filament - 80% Faster 3D Printing'], 'plx', polymerOf)?.polymer, 'PLA');
});

test('a verdict becomes the one ruling the reader can apply, and never a second ruling on a product the register has', () => {
  const polymers = [{ PolymerID: 'PLA' }, { PolymerID: 'PA12' }, { PolymerID: 'PETG' }];
  const rulings = [{ Ruling: 'R010', Kind: 'identity', Subject: 'Old Product', Value: 'PETG', Reason: '', By: 'farid', Date: '2026-09-18' }];
  const row = (over) => ({ Ruling: 'R075', 'Doc key': 'k', Provider: 'Maker', Brand: 'Maker', Product: 'Thing', Reading: 'PLA', 'Filler the name declares': 'Unfilled / unspecified', 'Material it would join': 'PLA / Unfilled / unspecified', 'Polymer has a row': 'yes', Strength: 'said', Evidence: 'the sheet says so', Verdict: '', ...over });
  const out = rulingsFromVerdicts([
    row({ Verdict: 'yes' }),                                                            // the reading stands
    row({ Product: 'Other', Verdict: 'PA12' }),                                         // corrected to a polymer with a row
    row({ Product: 'Struck', Verdict: 'no' }),                                          // nothing written
    row({ Product: 'Later', Verdict: 'PA11' }),                                         // no row yet: R081 first
    row({ Product: 'Old Product', Verdict: 'PLA' }),                                    // the register already rules it, differently
    row({ Product: 'Old Product', Verdict: 'PETG' }),                                   // ... and the same way
    row({ Ruling: 'R083', Product: 'Hemp thing', Reading: 'PLA', 'Material it would join': 'PLA-NF (new material)', Evidence: 'the sheet declares PLA and Natural fibre, and no material holds that pair', Verdict: 'yes' }),
    row({ Ruling: 'R083', Product: 'Hemp other', Reading: 'PLA', 'Material it would join': 'PLA-NF (new material)', Evidence: 'the sheet declares PLA and Natural fibre, and no material holds that pair', Verdict: 'PA12' }),
    row({ Product: 'Nobody looked' }),
  ], rulings, polymers, { by: 'farid', date: '2026-09-21' });
  assert.deepEqual(out.written.map((r) => [r.Ruling, r.Kind, r.Subject, r.Value]), [
    ['R011', 'identity', 'Thing', 'PLA'],
    ['R012', 'identity', 'Other', 'PA12'],
    ['R013', 'new-material', 'PLA-NF', 'PLA × Natural fibre'],
    // A corrected R083 reading is an identity ruling first; the material it then names comes back for its own permission.
    ['R014', 'identity', 'Hemp other', 'PA12'],
  ]);
  assert.equal(out.struck.length, 1);
  assert.equal(out.already.length, 1);
  assert.deepEqual(out.refused.map((r) => r.row.Product), ['Later', 'Old Product']);
  assert.match(out.refused[0].why, /no row in polymers\.csv/);
  assert.match(out.refused[1].why, /R010 already rules/);
  assert.ok(out.written.every((r) => r.By === 'farid' && r.Date === '2026-09-21' && /Owner verdict/.test(r.Reason)));
});
