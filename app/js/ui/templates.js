// Application templates. They pre-populate controls and then get out of the way: the banner names
// the template, every control it touched stays editable, and nothing is decided silently.

export const TEMPLATES = [
  {
    name: 'Outdoor structural part',
    description: 'A bracket that lives outside and gets warm. Stiff, not too heavy, survives a hot day in the sun.',
    constraints: [
      { kind: 'gate', gate: 'scope', __group: 'Compatibility' },
      { kind: 'numeric', property: 'hdt045', operator: '>=', value: 100, mandatory: true, __group: 'Thermal' },
      { kind: 'numeric', property: 'tensileModulusXY', operator: '>=', value: 3, mandatory: true, __group: 'Mechanical' },
      { kind: 'numeric', property: 'density', operator: '<=', value: 1500, mandatory: true, __group: 'Mechanical' },
      { kind: 'numeric', property: 'priceCADkg', operator: '<=', value: 100, mandatory: false, __group: 'Cost' },
    ],
  },
  {
    name: 'Indoor prototype',
    description: 'A shape you want to hold in your hand tomorrow. Cheap, easy to print, indoors only.',
    constraints: [
      { kind: 'gate', gate: 'scope', __group: 'Compatibility' },
      { kind: 'gate', gate: 'chamber', __group: 'Compatibility' },
      { kind: 'numeric', property: 'priceCADkg', operator: '<=', value: 45, mandatory: true, __group: 'Cost' },
    ],
  },
  {
    name: 'Lightweight structure',
    description: 'A drone arm or a moving part. As light as possible while still stiff enough not to flex.',
    constraints: [
      { kind: 'gate', gate: 'scope', __group: 'Compatibility' },
      { kind: 'numeric', property: 'density', operator: '<=', value: 1250, mandatory: true, __group: 'Mechanical' },
      { kind: 'numeric', property: 'tensileModulusXY', operator: '>=', value: 2.5, mandatory: true, __group: 'Mechanical' },
    ],
  },
  {
    name: 'Warm environment, no heated chamber',
    description: 'A part that sits near a motor or in a car. Takes heat, and prints without a heated chamber.',
    constraints: [
      { kind: 'gate', gate: 'scope', __group: 'Compatibility' },
      { kind: 'gate', gate: 'chamber', __group: 'Compatibility' },
      { kind: 'gate', gate: 'nozzle', __group: 'Compatibility' },
      { kind: 'numeric', property: 'hdt045', operator: '>=', value: 80, mandatory: true, __group: 'Thermal' },
    ],
  },
  {
    name: 'High-stiffness fixture',
    description: 'A jig or a fixture that must not bend. Weight does not matter, rigidity does.',
    constraints: [
      { kind: 'gate', gate: 'scope', __group: 'Compatibility' },
      { kind: 'numeric', property: 'tensileModulusXY', operator: '>=', value: 5, mandatory: true, __group: 'Mechanical' },
      { kind: 'numeric', property: 'hdt045', operator: '>=', value: 90, mandatory: false, __group: 'Thermal' },
    ],
  },
  {
    name: 'Flexible component',
    description: 'A gasket, a strap or a phone case. Bends a long way and springs back.',
    constraints: [
      { kind: 'gate', gate: 'scope', __group: 'Compatibility' },
      { kind: 'numeric', property: 'elongationXY', operator: '>=', value: 100, mandatory: true, __group: 'Mechanical' },
    ],
  },
];
