// Application templates. They pre-populate controls and then get out of the way: the banner names
// the template, every control it touched stays editable, and nothing is decided silently.
//
// A template is a starting screen, not a recommendation. Each one names what it actually tests in
// its description and lists, in `notChecked`, the part of the application it cannot test, which the
// results header repeats beside the count. The descriptions used to promise outcomes ("survives a
// hot day in the sun", "springs back", "prints without a heated chamber") that no criterion checked.
//
// Every template is for a part you build, so every one screens out support and interface
// materials. Without that, "Support for ABS" came back as an indoor prototype material. And every one is for a part the
// H2C prints, so every one asks the print gates (D101).

const BUILD_MATERIAL = { kind: 'facet', facet: 'supportMaterial', equals: false, __group: 'Manufacturing' };
const SCOPE = { kind: 'gate', gate: 'scope', __group: 'Compatibility' };
// Every template asks whether the H2C can print the product (D101; GOALS, 2026-09-28, decision 4): its nozzle, bed and
// chamber against the H2C's, on the product's own recipe as D88 and D89 read it. Without it the page says that H2C
// printability is not checked.
export const PRINTABLE = [
  { kind: 'gate', gate: 'nozzle', __group: 'Compatibility' },
  { kind: 'gate', gate: 'bed', __group: 'Compatibility' },
  { kind: 'gate', gate: 'chamber', __group: 'Compatibility' },
];
/** Whether a set of requirements asks the H2C's print gates, all three. */
export const asksPrintable = (constraints) => PRINTABLE.every((p) => constraints.some((c) => c.kind === 'gate' && c.gate === p.gate));
/** The print gates a set of requirements leaves out, by name ("chamber"), in nozzle, bed, chamber order. */
export const printGatesMissing = (constraints) => PRINTABLE.map((p) => p.gate).filter((g) => !constraints.some((c) => c.kind === 'gate' && c.gate === g));
/**
 * How much of the H2C's print check a set of requirements asks: 'all' three gates, 'some', or 'none'. A page that asked
 * only "all or nothing" called two of three gates "not checked", which was false.
 */
export const printCheck = (constraints) => {
  const missing = printGatesMissing(constraints).length;
  return missing === 0 ? 'all' : missing === PRINTABLE.length ? 'none' : 'some';
};

export const TEMPLATES = [
  {
    name: 'Outdoor structural part',
    description: 'A bracket that lives outside. HDT at 0.45 MPa at least 100 °C, tensile modulus at least 3 GPa, density at most 1500 kg/m³, within H2C temperature limits.',
    notChecked: 'UV and weathering. Makers describe them in words and never give a verdict, so no filter can check them. Read the Environment tab of anything you pick.',
    constraints: [
      SCOPE, BUILD_MATERIAL, ...PRINTABLE,
      { kind: 'numeric', property: 'hdt045', operator: '>=', value: 100, mandatory: true, __group: 'Thermal' },
      { kind: 'numeric', property: 'tensileModulusXY', operator: '>=', value: 3, mandatory: true, __group: 'Mechanical' },
      { kind: 'numeric', property: 'density', operator: '<=', value: 1500, mandatory: true, __group: 'Mechanical' },
      { kind: 'numeric', property: 'priceCADkg', operator: '<=', value: 100, mandatory: false, __group: 'Cost' },
    ],
  },
  {
    name: 'Indoor prototype',
    description: 'A shape you want to hold in your hand tomorrow. Any build material within H2C temperature limits; price at most 45 CAD/kg is reported, not required.',
    notChecked: 'Ease of printing. No source rates it. Price is reported, not required: many products have no sampled price, and sourcing comes after the material is chosen.',
    constraints: [
      SCOPE, BUILD_MATERIAL, ...PRINTABLE,
      { kind: 'numeric', property: 'priceCADkg', operator: '<=', value: 45, mandatory: false, __group: 'Cost' },
    ],
  },
  {
    name: 'Lightweight structure',
    description: 'A drone arm or a moving part. Density at most 1250 kg/m³ and tensile modulus at least 2.5 GPa, within H2C temperature limits.',
    notChecked: 'Which material is lightest overall. These are thresholds, and the lightest adequate material depends on the part\'s shape and loads. Rank by a performance index, or use the Ashby chart\'s guide line.',
    constraints: [
      SCOPE, BUILD_MATERIAL, ...PRINTABLE,
      { kind: 'numeric', property: 'density', operator: '<=', value: 1250, mandatory: true, __group: 'Mechanical' },
      { kind: 'numeric', property: 'tensileModulusXY', operator: '>=', value: 2.5, mandatory: true, __group: 'Mechanical' },
    ],
  },
  {
    name: 'Warm environment',
    description: 'A part near a motor or in a car. HDT at 0.45 MPa at least 80 °C, within H2C temperature limits.',
    notChecked: 'Printing without chamber heat. The H2C heats its chamber up to 65 °C, and the check assumes it does.',
    constraints: [
      SCOPE, BUILD_MATERIAL, ...PRINTABLE,
      { kind: 'numeric', property: 'hdt045', operator: '>=', value: 80, mandatory: true, __group: 'Thermal' },
    ],
  },
  {
    name: 'High-stiffness fixture',
    description: 'A jig or a fixture. Tensile modulus at least 5 GPa, within H2C temperature limits. HDT at least 90 °C is reported, not required.',
    notChecked: 'Deflection of the part. It depends on geometry, print orientation and load as much as on modulus, and the modulus compared is in the print plane (XY).',
    constraints: [
      SCOPE, BUILD_MATERIAL, ...PRINTABLE,
      { kind: 'numeric', property: 'tensileModulusXY', operator: '>=', value: 5, mandatory: true, __group: 'Mechanical' },
      { kind: 'numeric', property: 'hdt045', operator: '>=', value: 90, mandatory: false, __group: 'Thermal' },
    ],
  },
  {
    name: 'Flexible component',
    description: 'A gasket, a strap or a phone case. Elongation at break at least 100 %, within H2C temperature limits.',
    notChecked: 'Recovery, softness and sealing. Elongation at break says none of these; check Shore hardness in the Mechanical tab.',
    constraints: [
      SCOPE, BUILD_MATERIAL, ...PRINTABLE,
      { kind: 'numeric', property: 'elongationXY', operator: '>=', value: 100, mandatory: true, __group: 'Mechanical' },
    ],
  },
];

/** The template a scenario names, if it still exists under that name. */
export const templateByName = (name) => TEMPLATES.find((t) => t.name === name) ?? null;
