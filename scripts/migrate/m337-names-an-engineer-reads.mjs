#!/usr/bin/env node
// Migration m337 (2026-10-04): the headline names an engineer reads (D124; GOALS, "Decided on 2026-10-04, the
// engineer-grade interface", decision 5).
//
// The reader is an engineer choosing a filament for a part. m275 made the names say what is measured, but kept a plain
// paraphrase in front ("Stiffness (tensile modulus, XY)", "Stretch before breaking (elongation, XY)") and hints written
// for a lay reader ("how heavy a printed part will be"). The names are now the ones a data sheet prints, the hints say
// on what basis a value is compared, and the comparison notes and the one not-applicable reason say in three or four
// sentences what they said in eight. The one method sentence the drawer shows on every material is said once, plainly.
// Display text only: no key, unit, rule or value changes, and no answer moves.
//
//   node scripts/migrate/m337-names-an-engineer-reads.mjs
import { openTables } from '../data/table-io.mjs';

const MIGRATION = 'm337';
const t = openTables();
const NAMES = {
  density: {
    Hint: ['how heavy a printed part will be', 'As published: usually the filament\'s density, not a printed part\'s.'],
    'Filter example': ['e.g. 1400 for something light', 'e.g. 1250 for a lightweight part'],
  },
  tensileModulusXY: {
    Short: ['Stiffness XY', 'Modulus XY'],
    Plain: ['Stiffness (tensile modulus, XY)', 'Tensile modulus (XY)'],
    Technical: ['Tensile modulus, XY direction', 'Tensile modulus, XY orientation'],
    Hint: ['resistance to bending and stretching', 'Bars printed in the XY plane.'],
    'Filter example': ['e.g. 3, about as stiff as unfilled PLA', 'e.g. 3; unfilled PLA is about 2.5'],
    'Export header': ['Stiffness GPa', 'Tensile modulus XY GPa'],
  },
  tensileStrengthXY: {
    Plain: ['Strength (tensile, XY; yield or break)', 'Tensile strength (XY)'],
    Technical: ['Tensile strength, XY direction', 'Tensile strength (yield or break), XY orientation'],
    Hint: ['load it takes before failing', 'Bars printed in the XY plane; yield or break, whichever the sheet gives.'],
    'Export header': ['Strength MPa', 'Tensile strength XY MPa'],
  },
  tensileStrengthZ: {
    Plain: ['Strength across layers (tensile, Z)', 'Tensile strength (Z)'],
    Technical: ['Tensile strength, Z direction', 'Tensile strength, Z orientation (across the layers)'],
    Hint: ['load it takes pulled across its layers before they part; a printed part\'s weak direction',
      'Bars printed upright and pulled across the layers: the interlayer strength, a print\'s weakest direction.'],
    'Filter example': ['e.g. 20 for a part pulled across its layers', 'e.g. 20 for a part loaded across its layers'],
    'Export header': ['Layer strength MPa', 'Tensile strength Z MPa'],
    'Comparison note': ['Only a bar the source says was printed upright and pulled along Z is compared: that is how well the layers hold together. A value with no stated direction is almost always a flat or a moulded bar, so it is left out, not counted apart; a bar labelled XZ or ZX is shown and not compared, because sheets use those labels for bars printed on edge and upright alike.',
      'Only a bar the source says was printed upright and pulled along Z is compared. A value with no stated orientation is almost always a flat or moulded bar, and is left out. Bars labelled XZ or ZX are shown and not compared: sheets use those labels for bars printed on edge and upright alike.'],
  },
  elongationXY: {
    Short: ['Stretch', 'Elongation XY'],
    Plain: ['Stretch before breaking (elongation, XY)', 'Elongation at break (XY)'],
    Technical: ['Elongation at break, XY direction', 'Elongation at break, XY orientation'],
    Hint: ['how far it stretches before it snaps; not the same as springing back or toughness', 'Bars printed in the XY plane. Not a measure of toughness or recovery.'],
    'Filter example': ['e.g. 100 or more for anything rubbery', 'e.g. 100 or more for an elastomer'],
    'Export header': ['Stretch %', 'Elongation at break XY %'],
  },
  charpyNotched: {
    Short: ['Impact (Charpy)', 'Charpy notched'],
    Plain: ['Notched impact, Charpy', 'Notched Charpy impact'],
    Hint: ['energy a notched bar held at both ends absorbs when struck; Izod is another test, never mixed or converted', 'ISO 179, notched bar, room temperature. Never mixed with Izod.'],
    'Comparison note': ['Only a notched Charpy bar (ISO 179) in kJ/m², struck at room temperature, is compared. Izod is another test on another bar, clamped upright: it has its own filter, and the two are never mixed or converted. A value in J/m is energy per metre of notch, and becomes kJ/m² only with the bar\'s thickness; an unnotched bar absorbs several times the energy, and one whose notch the sheet does not state could be either; a bar struck cold is another number. All of them stay on record and are shown here.',
      'Only a notched Charpy bar (ISO 179) in kJ/m² at room temperature is compared. Izod is a different test with its own filter, and the two are never mixed or converted. Values in J/m, unnotched bars, bars whose notch is not stated and bars struck cold are kept and shown here, not compared.'],
  },
  izodNotched: {
    Short: ['Impact (Izod)', 'Izod notched'],
    Plain: ['Notched impact, Izod', 'Notched Izod impact'],
    Hint: ['energy a notched bar clamped upright absorbs when struck; Charpy is another test, never mixed or converted', 'ISO 180, notched bar, room temperature. Never mixed with Charpy.'],
    'Comparison note': ['Only a notched Izod bar (ISO 180) in kJ/m², struck at room temperature, is compared. Charpy is another test on another bar, held at both ends: it has its own filter, and the two are never mixed or converted. A value in J/m (ASTM D256) is energy per metre of notch, and one to ASTM D256 printed in kJ/m² is that value converted by its maker with a bar thickness the sheet does not give: neither is an ISO 180 bar. An unnotched bar absorbs several times the energy, and one whose notch the sheet does not state could be either; a bar struck cold is another number. All of them stay on record and are shown here.',
      'Only a notched Izod bar (ISO 180) in kJ/m² at room temperature is compared. Charpy is a different test with its own filter, and the two are never mixed or converted. ASTM D256 values (J/m, or kJ/m² converted with a bar thickness the sheet does not give), unnotched bars, bars whose notch is not stated and bars struck cold are kept and shown here, not compared.'],
  },
  hdt045: {
    Plain: ['Heat deflection (HDT, 0.45 MPa)', 'HDT at 0.45 MPa'],
    Technical: ['HDT at 0.45 MPa', 'Heat deflection temperature at 0.45 MPa'],
    Hint: ['temperature at which a bar bends under a light 0.45 MPa load; a screening number, not a service temperature', 'A screening value, not a service temperature.'],
    'Filter example': ['e.g. 100 to survive a hot car', 'e.g. 100 for a part in a hot car'],
    'Not applicable reason': ['Heat deflection is a rigid-bar test and means nothing for an elastomer: ISO 75 ends at 0.2 % outer-fibre strain, which a bar reaches where its modulus falls to about 225 MPa at 0.45 MPa (D56; audit 2026-09-15, B-08). Makers list it as N/A (Bambu Lab, TPU for AMS). A value an elastomer\'s own sheet publishes stays that sheet\'s measurement: it is shown, and never decides. An elastomer the model has no polymer row for is still an elastomer: a Flexible Elastomers material is left out by its family (TPS, TPV, and TPE, maker-undisclosed elastomer; D87, D106), and so is a sintering filament, whose part is the sintered metal\'s or ceramic\'s.',
      'HDT is a rigid-bar test. ISO 75 ends at 0.2 % outer-fibre strain, which a bar reaches once its modulus falls to about 225 MPa, so an elastomer has no meaningful HDT and makers list it as N/A. A value an elastomer\'s sheet publishes is shown and never decides. Sintering filaments are left out too: the finished part is the sintered metal or ceramic.'],
  },
  glassTransition: {
    Plain: ['Glass transition', 'Glass transition (Tg)'],
    Hint: ['where it turns from glassy to rubbery; an amorphous plastic loses its stiffness above it', 'Usually by DSC. An amorphous plastic loses its stiffness above it.'],
    'Comparison note': ['The product\'s own value, as its sheet publishes it, almost always by DSC. It is a property of the plastic, not of a bar, so it has no direction; a resin supplier\'s value is the raw material\'s, not the product\'s, and is shown, not compared.',
      'The product\'s own value as its sheet publishes it, almost always by DSC. It has no orientation. A resin supplier\'s value describes the raw material, so it is shown, not compared.'],
  },
  priceCADkg: {
    Hint: ['sampled listings; Canadian where one exists, else a foreign one converted at the Bank of Canada rate; not live',
      'Median of sampled shop listings, not live. Canadian where one exists; otherwise a foreign price converted at the Bank of Canada rate.'],
    'Filter example': ['e.g. 60 per kilogram', 'e.g. 60'],
  },
};
let n = 0;
for (const [key, fields] of Object.entries(NAMES)) {
  for (const [field, [was, now]] of Object.entries(fields)) {
    if (t.get('headline_definitions', key)[field] === now) continue;
    t.set('headline_definitions', key, field, now, { expect: was, migration: MIGRATION });
    n++;
  }
}
const ALLOWABLES = ['No transferable long-term allowable. Verify grade, conditioning and geometry. This holds for every material here, and is shown on each; what a material adds to it is in its own limitations.',
  'Data-sheet values describe test specimens, not design allowables. Confirm the exact product, its conditioning and your part\'s geometry with your own print.'];
if (t.get('method', 'Transferable allowables')['Definition / rule'] !== ALLOWABLES[1]) {
  t.set('method', 'Transferable allowables', 'Definition / rule', ALLOWABLES[1], { expect: ALLOWABLES[0], migration: MIGRATION });
  n++;
}
t.save();
console.log(`${MIGRATION}: ${n} display texts changed`);
