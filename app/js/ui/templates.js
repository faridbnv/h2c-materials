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
// chamber against the H2C's, on the product's own recipe as D88 and D89 read it. Browsing without it is research mode,
// which the page names as one.
export const PRINTABLE = [
  { kind: 'gate', gate: 'nozzle', __group: 'Compatibility' },
  { kind: 'gate', gate: 'bed', __group: 'Compatibility' },
  { kind: 'gate', gate: 'chamber', __group: 'Compatibility' },
];
/** Whether a set of requirements asks the H2C's print gates, all three. */
export const asksPrintable = (constraints) => PRINTABLE.every((p) => constraints.some((c) => c.kind === 'gate' && c.gate === p.gate));

export const TEMPLATES = [
  {
    name: 'Outdoor structural part',
    description: 'A bracket that lives outside. Screens for heat resistance of at least 100 °C, stiffness and weight, on a product the H2C can print.',
    notChecked: 'UV and weathering are not verified: the database holds narrative notes on them, never a verdict. Check the Environment tab of anything you pick.',
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
    description: 'A shape you want to hold in your hand tomorrow. Screens for a build material the H2C can print; the price is tracked, at most 45 CAD/kg.',
    notChecked: 'Ease of printing is not rated: no source publishes it. Price is tracked, not required: many products have no sampled price, which makes sourcing a later task, never a reason to hold a product out.',
    constraints: [
      SCOPE, BUILD_MATERIAL, ...PRINTABLE,
      { kind: 'numeric', property: 'priceCADkg', operator: '<=', value: 45, mandatory: false, __group: 'Cost' },
    ],
  },
  {
    name: 'Lightweight structure',
    description: 'A drone arm or a moving part. Screens for density under 1250 kg/m³ with stiffness of at least 2.5 GPa, on a product the H2C can print.',
    notChecked: 'Thresholds, not an optimum: the lightest adequate material depends on your part\'s shape and loads. The Ashby chart\'s "best for a given weight" line compares them properly.',
    constraints: [
      SCOPE, BUILD_MATERIAL, ...PRINTABLE,
      { kind: 'numeric', property: 'density', operator: '<=', value: 1250, mandatory: true, __group: 'Mechanical' },
      { kind: 'numeric', property: 'tensileModulusXY', operator: '>=', value: 2.5, mandatory: true, __group: 'Mechanical' },
    ],
  },
  {
    name: 'Warm environment',
    description: 'A part near a motor or in a car. Screens for heat resistance of at least 80 °C, on a product whose nozzle, bed and chamber temperatures the H2C can reach.',
    notChecked: 'The H2C heats its chamber actively, up to 65 °C. This does not check whether a material prints without that heat.',
    constraints: [
      SCOPE, BUILD_MATERIAL, ...PRINTABLE,
      { kind: 'numeric', property: 'hdt045', operator: '>=', value: 80, mandatory: true, __group: 'Thermal' },
    ],
  },
  {
    name: 'High-stiffness fixture',
    description: 'A jig or a fixture. Screens for stiffness of at least 5 GPa on a product the H2C can print; heat resistance is tracked, not required.',
    notChecked: 'How much a part bends depends on its shape, print direction and load as much as on stiffness. Measured stiffness is in the print plane (XY).',
    constraints: [
      SCOPE, BUILD_MATERIAL, ...PRINTABLE,
      { kind: 'numeric', property: 'tensileModulusXY', operator: '>=', value: 5, mandatory: true, __group: 'Mechanical' },
      { kind: 'numeric', property: 'hdt045', operator: '>=', value: 90, mandatory: false, __group: 'Thermal' },
    ],
  },
  {
    name: 'Flexible component',
    description: 'A gasket, a strap or a phone case. Screens for stretch of at least 100% before breaking, on a product the H2C can print.',
    notChecked: 'Stretch before breaking is not spring-back, softness or sealing. Check hardness (Shore) in the Mechanical tab.',
    constraints: [
      SCOPE, BUILD_MATERIAL, ...PRINTABLE,
      { kind: 'numeric', property: 'elongationXY', operator: '>=', value: 100, mandatory: true, __group: 'Mechanical' },
    ],
  },
];

/** The template a scenario names, if it still exists under that name. */
export const templateByName = (name) => TEMPLATES.find((t) => t.name === name) ?? null;
