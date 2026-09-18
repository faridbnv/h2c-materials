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
  'Fatigue life': 'compile.js (fatigue record)',
  'Melting temperature': 'estimate/ (melting-point bound and covariate), lint-rules.js (MEAS-PHYSICS-ORDER)',
  'Glass transition temperature': 'estimate/ (amorphous bound), lint-rules.js (MEAS-PHYSICS-ORDER)',
  'Vicat softening temperature': 'estimate/ (HDT conversion), lint-rules.js (MEAS-PHYSICS-ORDER)',
  'Density': 'estimate/ (density kind)',
  'Tensile modulus': 'estimate/ (modulus kind)',
  'Flexural modulus': 'estimate/ (modulus conversion)',
  'Tensile strength (endpoint unspecified)': 'estimate/ (strength endpoint), lint-rules.js (MEAS-PHYSICS-ORDER)',
  'Tensile break strength': 'estimate/ (strength endpoint)',
  'Tensile yield strength': 'estimate/ (strength endpoint), lint-rules.js (MEAS-PHYSICS-ORDER)',
  'Flexural strength': 'estimate/ (strength conversion), lint-rules.js (MEAS-PHYSICS-ORDER)',
  'Hardness': 'estimate/observations.js (an elastomer\'s stiffness from its Shore hardness)',
  'Charpy strength': 'lint-rules.js (MEAS-PHYSICS-Z-ABOVE-XY)',
  'Izod impact strength': 'lint-rules.js (MEAS-PHYSICS-Z-ABOVE-XY)',
  'Elongation at break': 'estimate/ (elongation kind), measurement-rules.js (endpoint locator rule), lint-rules.js (MEAS-PHYSICS-ORDER)',
  'Elongation at yield': 'estimate/ (elongation bound), lint-rules.js (MEAS-PHYSICS-ORDER)',
  'Tensile strain at strength': 'estimate/ (elongation bound)',
  'Crystallization temperature': 'lint-rules.js (MEAS-PHYSICS-ORDER: a polymer crystallises below where it melted)',
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
