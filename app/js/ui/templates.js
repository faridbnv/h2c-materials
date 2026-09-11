// Application templates. They pre-populate controls and then get out of the way: the banner names
// the template, every control it touched stays editable, and nothing is decided silently.

export const TEMPLATES = [
  {
    name: 'Outdoor structural part',
    description: 'Warm outdoor service, stiffness-led. Mirrors the worked example in the architecture brief.',
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
    description: 'Cheap, easy, no thermal or environmental demand.',
    constraints: [
      { kind: 'gate', gate: 'scope', __group: 'Compatibility' },
      { kind: 'gate', gate: 'chamber', __group: 'Compatibility' },
      { kind: 'numeric', property: 'priceCADkg', operator: '<=', value: 45, mandatory: true, __group: 'Cost' },
    ],
  },
  {
    name: 'Lightweight structure',
    description: 'Minimum mass at a stiffness floor. Pair with the beam or panel index on the Ashby lens.',
    constraints: [
      { kind: 'gate', gate: 'scope', __group: 'Compatibility' },
      { kind: 'numeric', property: 'density', operator: '<=', value: 1250, mandatory: true, __group: 'Mechanical' },
      { kind: 'numeric', property: 'tensileModulusXY', operator: '>=', value: 2.5, mandatory: true, __group: 'Mechanical' },
    ],
  },
  {
    name: 'Warm environment, no heated chamber',
    description: 'Thermal capability that the H2C can actually print without a hot chamber.',
    constraints: [
      { kind: 'gate', gate: 'scope', __group: 'Compatibility' },
      { kind: 'gate', gate: 'chamber', __group: 'Compatibility' },
      { kind: 'gate', gate: 'nozzle', __group: 'Compatibility' },
      { kind: 'numeric', property: 'hdt045', operator: '>=', value: 80, mandatory: true, __group: 'Thermal' },
    ],
  },
  {
    name: 'High-stiffness fixture',
    description: 'Jigs and fixtures: stiffness and heat, mass unimportant.',
    constraints: [
      { kind: 'gate', gate: 'scope', __group: 'Compatibility' },
      { kind: 'numeric', property: 'tensileModulusXY', operator: '>=', value: 5, mandatory: true, __group: 'Mechanical' },
      { kind: 'numeric', property: 'hdt045', operator: '>=', value: 90, mandatory: false, __group: 'Thermal' },
    ],
  },
  {
    name: 'Flexible component',
    description: 'Elastomers and high-elongation materials.',
    constraints: [
      { kind: 'gate', gate: 'scope', __group: 'Compatibility' },
      { kind: 'numeric', property: 'elongationXY', operator: '>=', value: 100, mandatory: true, __group: 'Mechanical' },
    ],
  },
];
