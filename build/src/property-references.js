// Property names the build's code relies on by name. The registry (properties.csv) is the authority on
// property names, but some logic is about a specific property: HDT's test load, a fatigue record's
// stresses, the estimate model's conversions between endpoints. If one of these names changed in the
// registry, that logic would silently stop matching anything.
//
// So every such name is declared here, the build fails if one is not a registered property
// (REGISTRY-CODE-REFERENCE), and test/references.test.js fails if code uses a registered property name
// that is not declared here. Names the estimate model's configuration uses for materials and grades
// are checked the same way (EST-MODEL-REFERENCE).

import { issue } from './rules.js';

export const CODE_PROPERTY_NAMES = {
  'HDT': 'compile.js (test load), estimates.js (heat-deflection conversions), typed-values via m08',
  'Fatigue life': 'compile.js (fatigue record)',
  'Melting temperature': 'estimates.js (melting-point bound and covariate)',
  'Glass transition temperature': 'estimates.js (amorphous bound)',
  'Vicat softening temperature': 'estimates.js (HDT conversion)',
  'Density': 'estimates.js (density kind)',
  'Tensile modulus': 'estimates.js (modulus kind)',
  'Flexural modulus': 'estimates.js (modulus conversion)',
  'Tensile strength (endpoint unspecified)': 'estimates.js (strength endpoint)',
  'Tensile break strength': 'estimates.js (strength endpoint)',
  'Tensile yield strength': 'estimates.js (strength endpoint)',
  'Flexural strength': 'estimates.js (strength conversion)',
  'Elongation at break': 'estimates.js (elongation kind), measurement-rules.js (endpoint locator rule)',
  'Elongation at yield': 'estimates.js (elongation bound)',
  'Tensile strain at strength': 'estimates.js (elongation bound)',
};

/** Code and model references that must resolve against the data. */
export function referenceIssues({ registry, materials, grades, model }) {
  const issues = [];
  const properties = new Set(registry.properties.map((p) => p.name));
  for (const [name, usedBy] of Object.entries(CODE_PROPERTY_NAMES)) {
    if (!properties.has(name)) issues.push(issue('REGISTRY-CODE-REFERENCE', 'build/src/property-references.js', `Code relies on property "${name}" (${usedBy}), which is not in properties.csv; rename it in the code too, or restore the property`));
  }
  const names = new Set(materials.map((m) => m.name));
  for (const [tag, list] of Object.entries(model.variants ?? {})) {
    if (tag.startsWith('_')) continue;
    for (const n of list) if (!names.has(n)) issues.push(issue('EST-MODEL-REFERENCE', 'build/mappings/estimate-model.json', `variants.${tag} names "${n}", which is not a material`));
  }
  const gradeIds = new Set(grades.map((g) => g.id));
  for (const id of Object.keys(model.hardness ?? {})) {
    if (!id.startsWith('_') && !gradeIds.has(id)) issues.push(issue('EST-MODEL-REFERENCE', 'build/mappings/estimate-model.json', `hardness names grade "${id}", which does not exist`));
  }
  return issues;
}
