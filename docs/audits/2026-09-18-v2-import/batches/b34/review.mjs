#!/usr/bin/env node
// Batch b34's review, as it was made: every decision on every row of the 74 held sheets the owner freed on 2026-09-25
// (docs/GOALS.md, phase 5; D87), each through scripts/ingest/review.mjs, so the proposals carry who decided what and
// why. The reviewer is an agent, named as one (AGENTS.md: "a person, or an agent named as one"). Every row was read
// against its line on the page; the optically read sheets (FiberFlex, MattFlex, BigRep HI-TEMP CF) against the page
// image in .cache/pages, and signed --visual. A row the page does not print is rejected with the line quoted, never
// corrected; --set writes only what the page prints (a composition sentence, a moisture state its footnote states).
//
//   node docs/audits/2026-09-18-v2-import/batches/b34/review.mjs

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { projectRoot } from '../../../../../scripts/data/table-io.mjs';

const BATCH = 'b34';
const BY = 'claude-opus-5.5 (agent reviewer)';
const READ = 'read against the page: the row states its property, its method, its condition and its unit as the sheet prints them, and the identity is the one the rulings of 2026-09-25 give (R167 to R198)';
// A document is named by its proposal file (its key, or for a key that is a URL its digest's first sixteen characters).
const review = (doc, ...args) => {
  try {
    return execFileSync('node', [join(projectRoot, 'scripts/ingest/review.mjs'), '--batch', BATCH, '--doc', doc, ...args, '--by', BY],
      { cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    process.exitCode = 1;
    return `${doc}: ${String(e.stderr || e.message).trim()}`;
  }
};

const accept = (doc, rows, note = READ) => review(doc, '--accept', rows, '--note', note);
const reject = (doc, rows, note) => review(doc, '--reject', rows, '--note', note);
const set = (doc, rows, pair) => review(doc, '--set', rows, pair);
const visual = (doc, rows, note) => review(doc, '--visual', rows, '--note', note);
const rename = (doc, name, note) => review(doc, '--rename', name, '--note', note);
const done = (doc, note) => review(doc, '--done', ...(note ? ['--note', note] : []));
const all = (n, from = 1) => Array.from({ length: n - from + 1 }, (_, i) => `m${String(i + from).padStart(2, '0')}`);
const except = (list, ...out) => list.filter((x) => !out.includes(x));
const composition = (text) => `Composition / filler=${text}`;
const PA_DENSE = 'above what an unfilled polyamide reaches (about 1150 kg/m³)';
const TPE_DENSE = 'above what an unfilled thermoplastic elastomer reaches (1250 kg/m³, polymers.csv TPE)';

// ------------------------------------------------------------------------------------------ Nylon, polymer not stated
accept('5b31728f9205a3ed', ['main', ...all(5), 'p1'].join(','));
accept('60fa1f20a76e9c69', ['main', ...all(10), 'p1'].join(','), `${READ}. m01 to m04 are the "3D Printed" table; m05 to m10 the "Injection Molded*" table, "obtained from the information provided by the supplier of the raw material", typed as raw material values`);
set('1c5b6527a66e302d', 'main', composition('colorFabb PA Blue Metal Detectable is a 3D printing filament infused with metal detectable particles (p. 1, as the sheet states it)'));
accept('1c5b6527a66e302d', [...all(13), 'p1'].join(','), `${READ}. The reader's "a Metal finish ... declares no filler" was its finish word, not the sheet: the composition is the sheet's sentence. m09 "Heat Deflection Temperature (A)" is kept with its load unstated, as printed`);
set('8de66aa22ae18962', 'main', composition('The colorFabb PA Blue Metal Detectable is a 3D printing filament infused with metal detectable particles (p. 1, as the sheet states it)'));
accept('8de66aa22ae18962', [...all(10), 'p1'].join(','));
accept('f0e4894683f2fc37', ['main', ...all(10), 'p1'].join(','));
accept('1c4020f8343d14d7', ['main', ...all(11), 'p1'].join(','));
accept('3013db7322e8f00c', ['main', 'm01', 'm02', 'p1'].join(','), `${READ}. The reader reads two of the sheet's values; the rest (a yield strength in psi, flexural values in KPSI, a notched Izod) stay in the record tier`);
set('6489655e4381fcc2', 'm03', 'Notch=Unnotched');
set('6489655e4381fcc2', 'main', 'Variant=declared dense filler');
set('6489655e4381fcc2', 'main', composition(`The page declares the load: "a 3D printer filament enriched with a metallic charge". Its density of 1300 kg/m³ is ${PA_DENSE}; recorded as a Variant under D57 (R095).`));
accept('6489655e4381fcc2', 'm01,m02,p1', `${READ}. m03's method is "ISO 179 1eU", unnotched, which its Notch now says`);
reject('27fb63eeafcc72e6', 'm04', 'Not a modulus: the line "50 MPa ISO 527 (1)" is the tensile strength "At break, injection moulding" under the sheet\'s tensile strength rows; the reader carried the "Elastic modulus" heading onto it');
set('27fb63eeafcc72e6', 'main', 'Variant=declared dense filler');
set('27fb63eeafcc72e6', 'main', composition(`The sheet declares the load: "Incorporates ceramic filler". Its density of 1300 kg/m³ is ${PA_DENSE}; recorded as a Variant under D57 (R095).`));
accept('27fb63eeafcc72e6', 'm01,m02,m03,m05,p1', `${READ}. m05's 6300 MPa is an injection-moulded bar of a ceramic-filled polyamide, typed as a raw material value. The profile leaves the nozzle unread: the page prints "Nozzle temperature - standard speed 250-280°C"`);
accept('41f036e425495065', ['main', ...all(5)].join(','), `${READ}. "14,000 psi", "250,000 psi" and "320,000 psi" are thousands, as the MPa beside each (97, 1,700, 2,200) confirms`);
accept('eb1c6983d4096527', ['main', ...all(4), 'p1'].join(','));

// ------------------------------------------------------------------------------ Nylon-CF and Nylon-GF, polymer not stated
accept('d7211f580c38f882', ['main', ...all(5), 'p1'].join(','));
rename('2f2c62d7166497db', 'Onyx GF', 'p. 1 prints "Onyx GF" under "COMPOSITE MATERIAL DATASHEET", which the reader took for the name');
const ONYX = all(11);
set('2f2c62d7166497db', ONYX.join(','), 'Moisture condition=Conditioned: 52% RH and 23 ± 2°C for 44 ± 2 h, ASTM D618 Procedure A');
set('2f2c62d7166497db', ONYX.join(','), 'Moisture state=conditioned');
reject('2f2c62d7166497db', 'm12,m13,m14', 'The "Dry | Conditioned | Wet" table is the XY orientation; the reader filed its dry column as XZ. The dry XY values are 60.4 MPa at yield, 59.4 MPa at break and 5.5 % (p. 2)');

// --------------------------------------------------------------------------------------------- TPE, polymer not stated
accept('c645e2c9ce0e6bf4', ['main', ...all(3), 'p1'].join(','));
for (const doc of ['23bf73df25dcd63c', 'd0f7e567eecaf673']) {
  set(doc, 'main', composition('Polymer base polyolefin (p. 1, the Chemical properties table)'));
  accept(doc, [...all(5), 'p1'].join(','));
}
set('208fe3d5f9614717', 'main', composition('Not published'));
reject('208fe3d5f9614717', 'm03', 'The same 22 Shore D as m02, read again from the maker\'s list "Shore D 22 – Nanovia TPE 22D"; recorded once');
reject('208fe3d5f9614717', 'm04,m05', 'Other products: the maker\'s list of its flexibles, "Shore D 44 – Nanovia Istroflex & Flex VX" and "Shore D 70 – Nanovia TPU 70D"');
reject('208fe3d5f9614717', 'p2', 'The same settings as p1, read again from the prose "Extrusion temperature : between 220 and 240 °C"');
accept('208fe3d5f9614717', 'm01,m02,p1', `${READ}. The composition the reader found was a related product's caption ("Nanovia ABS CF : Carbon fiber reinforced"), not this product's`);
reject('419076e1fe26a452', 'main,m01,m02,m03', 'The French edition of the TPE 22D page (nanovia.tech/ref/tpe-22d/); the English edition in this batch is the product\'s sheet. m01 repeats its 22 Shore D from the maker\'s list; m02 and m03 are other products (Istroflex and Flex VX, TPU 70D)');
accept('bd1e75c061cc00a8', ['main', ...all(4), 'p1'].join(','));
accept('a3e6bf39931c3b35', ['main', ...all(4), 'p1'].join(','));
set('d86d18d3c27a5af4', 'main', 'Variant=declared dense filler');
set('d86d18d3c27a5af4', 'main', composition(`The page declares the load: "Nanovia Istroflex contains is a heavy polymer, based on biodegradable monomers and cosmetic grade oyster shells" (as printed). Its density of 1550 kg/m³ is ${TPE_DENSE}; recorded as a Variant under D57 (R095).`));
accept('d86d18d3c27a5af4', [...all(6), 'p1'].join(','));
set('a1ce5f081e16739a', 'main', 'Variant=declared dense filler');
set('a1ce5f081e16739a', 'main', composition(`The page declares the load: "Massic B4C concentration 25 %" and "Volumic B4C concentration 10 %" (boron carbide). Its density of 1450 kg/m³ is ${TPE_DENSE}; recorded as a Variant under D57 (R095).`));
accept('a1ce5f081e16739a', 'm01,p1');
rename('490e5c2e96323c5d', 'Chinchilla', 'p. 1 prints "Chinchilla 3D Printing Filament" and "Chinchilla™ flexible 3D printer filament"; "Technical Specifications" is the sheet\'s heading');
accept('490e5c2e96323c5d', all(8).join(','), `${READ}. "3,189 psi" and "4,995 psi" are thousands, as the MPa beside each (22, 34) confirms`);
const SIGNED = 'read against the page image (.cache/pages, p. 1): the value, the unit and the row\'s label are the ones the image prints';
visual('29baaa34d6aa8066', 'main,m01,m02,m03,m05,m06,p1', SIGNED);
reject('29baaa34d6aa8066', 'm04', 'The page image prints "Shore D 15s ASTM D2240 - 27": 27 at a 15-second reading, not 15 Shore D');
visual('87644db1781f20be', ['main', ...all(6), 'p1'].join(','), SIGNED);
visual('99b4c3f30cb41579', ['main', ...all(7), 'p1'].join(','), SIGNED);
visual('b39e330771c24d66', ['main', ...all(6), 'p1'].join(','), SIGNED);
visual('9196bd983c5f8483', ['main', ...except(all(9), 'm04'), 'p1'].join(','), SIGNED);
reject('9196bd983c5f8483', 'm04', 'The page image prints "Shore D 15s ASTM D2240 37": 37 at a 15-second reading, not 15 Shore D');
visual('34367b819db88336', ['main', ...all(7), 'p1'].join(','), SIGNED);
visual('518e5919bf60c3f8', ['main', ...all(7), 'p1'].join(','), SIGNED);

// ------------------------------------------------------------------------ PLA family, polymer not stated (and with CF)
accept('7f3c349fc7bd46f0', ['main', ...all(11), 'p1'].join(','), `${READ}. The sheet prints its standards one row off (VICAT beside ISO 3146-C, melting beside ISO 1133, MFR beside ISO 75), and they are kept as printed`);
accept('760b35ecc10d2650', ['main', ...all(11), 'p1'].join(','));
for (const doc of ['648dbe95c949cc3f', 'ab7835a7f110f64e']) {
  set(doc, 'main', composition('The composite material contains 10% carbon fibre (p. 1, as the sheet states it)'));
  accept(doc, [...all(12), 'p1'].join(','));
}
accept('2e82e0989ac3890b', ['main', ...all(7), 'p1'].join(','), `${READ}. m04 prints its flexural modulus beside ISO 527, as the sheet does`);
accept('9a2c77aa94eba1ad', ['main', ...all(10), 'p1'].join(','));
accept('14959173884f6eac', ['main', ...all(6)].join(','));
reject('14959173884f6eac', 'p1', 'Read from a text layer whose glyphs are mis-mapped ("No€€le Temperature 1œ0 - 230 TS", "50 TS for 4 - 6 âours"): the nozzle is unread and the drying cell has no unit');
visual('d0cb0ed60c65a68d', ['main', ...all(10), 'p1'].join(','), `${SIGNED}. The profile leaves the bed unread: the image prints "Print Bed Temperature 50 - 80 °C"`);

// ------------------------------------------------------------------------------------------------------------ TPS
set('f0a4d75b0ff81487', 'p1', 'Drying=Ultrafuse® TPS 90A is in a printable condition, drying is not necessary');
reject('f0a4d75b0ff81487', 'm14', 'The 14.1 kJ/m² is the upright (ZX) column\'s; the XY and XZ columns print "No break", and the row as read states no direction');
accept('f0a4d75b0ff81487', ['main', ...except(all(17), 'm14')].join(','), `${READ}. The elastomer's moduli (54 and 37 MPa) and its glass transition (-59 °C) are outside the rigid windows, as an elastomer's are`);
rename('816a9fd447126279', 'Thermoplastic styrene block copolymer elastomer (TPS)', 'p. 1 prints "Thermoplastic styrene block copolymer elastomer (TPS)"; the text layer draws its "ti" ligature as "+"');
reject('816a9fd447126279', 'm02', 'Not a Vicat temperature: the 23 °C is the test temperature of "Thermal conductivity 23°C - W/(K*m)", which prints no value');
reject('816a9fd447126279', 'p1', 'Every cell unread: the page prints printing 210-240 °C, heated bed 60-80 °C, build chamber 60-80 °C and drying 80 °C in a two-column layout the reader does not pair');
accept('816a9fd447126279', 'm01,m03');

// ------------------------------------------------------------------------------------------------------------ PA6
accept('523f50519a241fc4', ['main', ...all(9), 'p1'].join(','), `${READ}. The profile leaves the bed and enclosure unread ("Print Bed Temp: 80-95°C", "Print Bed Enclosure: Recommended")`);

// ------------------------------------------------------------------------------------------------ TPU harder than 95A
rename('1a7894b2dc86431d', 'MD Flex', 'p. 3 prints "MD Flex is an innovative Nanocomposite developed with a high quality TPU98A"; "DISCOVER" is the partner\'s banner on p. 1');
set('1a7894b2dc86431d', 'main', composition('An innovative Nanocomposite developed with a high quality TPU98A and a patented, scientifically validated and highly effective Nano-Copper additive (p. 3, as the sheet states it)'));
accept('1a7894b2dc86431d', [...all(5), 'p1'].join(','));

// ------------------------------------------------------------------------------------- sintering filaments (Excluded)
reject('80f2fdba449f8aeb', 'm02', 'Not a mould shrinkage: "Shrinkage after sintering 10 – 15 %" is the part\'s shrinkage in the furnace');
accept('80f2fdba449f8aeb', 'main,m01,p1', `${READ}. The density is the filament's, 7190 kg/m³ at 88 % steel by mass`);
reject('f5acf07137eadb7e', 'm02', 'Not a mould shrinkage: "Shrinkage after sintering 10 – 15 %" is the part\'s shrinkage in the furnace');
accept('f5acf07137eadb7e', 'main,m01,p1', `${READ}. The density is the filament's, 2660 kg/m³ at 71 % silicon carbide by mass`);
reject('8992b2383e8d5a73', all(5).join(','), 'The sintered steel\'s properties: the table is headed "Mechanical Properties | sintered", and a sintering filament is recorded for what it is and never judged (R187); the record tier keeps them (D85)');
set('8992b2383e8d5a73', 'p1', 'Drying=316L is in a printable condition, drying is not necessary');
accept('8992b2383e8d5a73', 'main,p1');
rename('afe0917e3ad785a0', 'Kerfil Aluminiumoxid (Al2O3)', 'p. 1 prints "Kerfil Aluminiumoxid (Al2O3)", the 2 and 3 set as subscripts on a line of their own');
reject('afe0917e3ad785a0', 'm02,m03', 'Not a mould shrinkage: "Schwindung (X/Y) 19.5%" and "(Z) 28.5%" are the part\'s shrinkage in sintering (p. 2)');
reject('afe0917e3ad785a0', 'p1', 'The German layout is unread: the page prints "Drucktemperatur 170-200 °C" and "Heizbett Temperatur 50 °C", and the drying cell\'s "6" is the resistivity\'s exponent');
accept('afe0917e3ad785a0', 'm01', `${READ}. "3.776 g/cm³" is a decimal point: the filament's density at its alumina load`);

// ------------------------------------------------------------------------ held back: every row read and refused
reject('58a9c5673b437051', 'main,m01,m02,m03,m04,m05,m06', 'One table of four products (Onyx, Onyx FR, Onyx ESD, Nylon), a column each; the reader reads one product per document');
reject('1025ec0ed8d47b3c', ['main', ...all(20)].join(','), 'UltiMaker\'s comparison page of every Method material ("Select the material properties you would like to compare"): a tensile strength per material, none of them said to be this page\'s product, and the product is "Nylon for Method series", not the Specialty Nylon the listing names');
const TPV = 'The sheet is purefil\'s TPV ("Thermoplastic vulcanizate (TPV)", Shore A 92), not TPS 40D as the listing says; the reader took "TPS" from the listing. No ruling covers a TPV (the owner\'s list, docs/GOALS.md)';
reject('0d7409be7fc659cf', 'main,m01,m02,m03,p1', TPV);

// ------------------------------------------------------------------------------------------------------ signed off
for (const doc of ['5b31728f9205a3ed', '60fa1f20a76e9c69', '1c5b6527a66e302d', '8de66aa22ae18962', 'f0e4894683f2fc37', '1c4020f8343d14d7',
  '3013db7322e8f00c', '6489655e4381fcc2', '27fb63eeafcc72e6', '41f036e425495065', 'eb1c6983d4096527', 'd7211f580c38f882', '2f2c62d7166497db',
  'c645e2c9ce0e6bf4', '23bf73df25dcd63c', 'd0f7e567eecaf673', '208fe3d5f9614717', 'bd1e75c061cc00a8', 'a3e6bf39931c3b35',
  'd86d18d3c27a5af4', 'a1ce5f081e16739a', '490e5c2e96323c5d', '29baaa34d6aa8066', '87644db1781f20be', '99b4c3f30cb41579', 'b39e330771c24d66',
  '9196bd983c5f8483', '34367b819db88336', '518e5919bf60c3f8', '7f3c349fc7bd46f0', '760b35ecc10d2650', '648dbe95c949cc3f', 'ab7835a7f110f64e',
  '2e82e0989ac3890b', '9a2c77aa94eba1ad', '14959173884f6eac', 'd0cb0ed60c65a68d', 'f0a4d75b0ff81487', '816a9fd447126279', '523f50519a241fc4',
  '1a7894b2dc86431d', '80f2fdba449f8aeb', 'f5acf07137eadb7e', 'afe0917e3ad785a0']) {
  console.log(done(doc));
}
console.log(done('8992b2383e8d5a73', 'Registered with its print settings and no values: every value the sheet prints is the sintered steel\'s (R187), and the sheet is the product\'s own'));
