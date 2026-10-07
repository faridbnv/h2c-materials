// Property names the build's code relies on by name. The registry (properties.csv) is the authority on
// property names, but some logic is about a specific property: HDT's test load, a fatigue record's
// stresses, the estimate model's conversions between endpoints. If one of these names changed in the
// registry, that logic would silently stop matching anything.
//
// So every such name is declared here, the build fails if one is not a registered property
// (REGISTRY-CODE-REFERENCE), and test/references.test.js fails if code uses a registered property name
// that is not declared here. The estimate model's configuration names no material, grade or polymer; those are tables.

import { issue } from './rules.js';

export const CODE_PROPERTY_NAMES = {
  'HDT': 'compile.js (test load), estimate/ (heat-deflection conversions), typed-values via m08',
  'Fatigue life': 'compile.js (fatigue record), coverage-rules.js (the rarely published properties, D114)',
  'Compression strength': 'coverage-rules.js (the rarely published properties, D114)',
  'Coefficient of thermal expansion': 'coverage-rules.js (the rarely published properties, D114)',
  'Thermal conductivity': 'coverage-rules.js (the rarely published properties, D114)',
  'Melting temperature': 'estimate/ (melting-point bound and covariate), physical_relations.csv (MEAS-PHYSICS-ORDER)',
  'Glass transition temperature': 'estimate/ (amorphous bound), physical_relations.csv (MEAS-PHYSICS-ORDER)',
  'Vicat softening temperature': 'estimate/ (HDT conversion), physical_relations.csv (MEAS-PHYSICS-ORDER)',
  'Density': 'estimate/ (density kind)',
  'Tensile modulus': 'estimate/ (modulus kind)',
  'Flexural modulus': 'estimate/ (modulus conversion)',
  'Tensile strength (endpoint unspecified)': 'estimate/ (strength endpoint), physical_relations.csv (MEAS-PHYSICS-ORDER)',
  'Tensile break strength': 'estimate/ (strength endpoint)',
  'Tensile yield strength': 'estimate/ (strength endpoint), physical_relations.csv (MEAS-PHYSICS-ORDER)',
  'Flexural strength': 'estimate/ (strength conversion), physical_relations.csv (MEAS-PHYSICS-ORDER)',
  'Hardness': 'estimate/observations.js (an elastomer\'s stiffness from its Shore hardness)',
  'Charpy strength': 'lint-rules.js (MEAS-PHYSICS-Z-ABOVE-XY), app/js/ui/detail.js (named "Charpy impact strength" beside Izod impact strength, D133)',
  'Izod impact strength': 'lint-rules.js (MEAS-PHYSICS-Z-ABOVE-XY)',
  'Impact strength': 'compile.js (a reading in impact_test_guesses.csv is of this property alone, IMPACT-GUESS-PROPERTY), app/js/ui/detail.js (its heading says the test is unclear, D133)',
  'Elongation at break': 'estimate/ (elongation kind), measurement-rules.js (endpoint locator rule), physical_relations.csv (MEAS-PHYSICS-ORDER)',
  'Elongation at yield': 'estimate/ (elongation bound), physical_relations.csv (MEAS-PHYSICS-ORDER)',
  'Tensile strain at strength': 'estimate/ (elongation bound)',
};

/** Property names the code relies on, each of which must be a registered property. */
export function codeReferenceIssues(registry) {
  const issues = [];
  const properties = new Set(registry.properties.map((p) => p.name));
  for (const [name, usedBy] of Object.entries(CODE_PROPERTY_NAMES)) {
    if (!properties.has(name)) issues.push(issue('REGISTRY-CODE-REFERENCE', 'build/src/property-references.js', `Code relies on property "${name}" (${usedBy}), which is not in properties.csv; rename it in the code too, or restore the property`));
  }
  return issues;
}
