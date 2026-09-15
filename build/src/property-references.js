// Property names the build's code relies on by name. The registry (properties.csv) is the authority on
// property names, but some logic is about a specific property: HDT's test load, a fatigue record's
// stresses, the estimate model's conversions between endpoints. If one of these names changed in the
// registry, that logic would silently stop matching anything.
//
// So every such name is declared here, the build fails if one is not a registered property
// (REGISTRY-CODE-REFERENCE), and test/references.test.js fails if code uses a registered property name
// that is not declared here. Names the estimate model's configuration uses for materials and grades
// are checked the same way by build/src/estimate/validate.js (EST-MODEL-REFERENCE).

import { issue } from './rules.js';

export const CODE_PROPERTY_NAMES = {
  'HDT': 'compile.js (test load), estimate/ (heat-deflection conversions), typed-values via m08',
  'Fatigue life': 'compile.js (fatigue record)',
  'Melting temperature': 'estimate/ (melting-point bound and covariate)',
  'Glass transition temperature': 'estimate/ (amorphous bound)',
  'Vicat softening temperature': 'estimate/ (HDT conversion)',
  'Density': 'estimate/ (density kind)',
  'Tensile modulus': 'estimate/ (modulus kind)',
  'Flexural modulus': 'estimate/ (modulus conversion)',
  'Tensile strength (endpoint unspecified)': 'estimate/ (strength endpoint)',
  'Tensile break strength': 'estimate/ (strength endpoint)',
  'Tensile yield strength': 'estimate/ (strength endpoint)',
  'Flexural strength': 'estimate/ (strength conversion)',
  'Charpy strength': 'lint-rules.js (MEAS-PHYSICS-Z-ABOVE-XY)',
  'Izod impact strength': 'lint-rules.js (MEAS-PHYSICS-Z-ABOVE-XY)',
  'Elongation at break': 'estimate/ (elongation kind), measurement-rules.js (endpoint locator rule)',
  'Elongation at yield': 'estimate/ (elongation bound)',
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
