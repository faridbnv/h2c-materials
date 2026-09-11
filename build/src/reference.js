// Generic reference materials: an Ashby baseline only.
//
// Method sheet, Legacy crosswalk: "Original min/max pairs; uncited numeric values are not
// imported." These 114 entries are uncited min/max envelopes, so they compile to their own file
// and never join the material data. They are a drawing layer: excluded from the candidate set,
// counts, Pareto fronts, index tallies, search, shortlist and every export of candidates.

import { extractReference, REFERENCE_PROPERTIES } from './extract.js';

// The ten defaults bracket the FDM trade space. The molded polymers are the most instructive:
// they let an engineer see printed material sitting below its own molded equivalent.
export const DEFAULT_SELECTION = [
  'low carbon steel',
  'stainless steel',
  'Aluminum alloy, wrought (6061, T4)',
  'Titanium alloys',
  'Magnesium alloys',
  'CFRP, epoxy matrix (isotropic)',
  'GFRP, epoxy matrix (isotropic)',
  'Polycarbonate (PC)',
  'Polyamides (nylons, PA)',
  'Hardwood (oak) parallel to the grain',
];

// Reference property key -> the headline key it may be drawn against.
export const AXIS_EQUIVALENCE = {
  density: 'density',
  tensileModulus: 'tensileModulusXY',
  tensileStrength: 'tensileStrengthXY',
  elongation: 'elongationXY',
};

export function compileReference(path, issues) {
  const rows = extractReference(path);
  const missing = DEFAULT_SELECTION.filter((n) => !rows.some((r) => r.name === n));
  if (missing.length) issues.push({ level: 'error', where: 'generic_materials.xlsx', message: `Default reference materials not found: ${missing.join(', ')}` });

  return {
    meta: {
      count: rows.length,
      categories: [...new Set(rows.map((r) => r.category))],
      properties: REFERENCE_PROPERTIES,
      axisEquivalence: AXIS_EQUIVALENCE,
      defaultSelection: DEFAULT_SELECTION,
      // Carried into the UI banner. These are bulk and molded values; candidates are printed and
      // anisotropic. Mixing them is allowed, mixing them silently is not.
      caveat: 'Bulk and molded property envelopes from a general engineering reference. Not printed, not anisotropic, and not cited to a source. Shown for scale only; never part of the candidate set.',
    },
    materials: rows.map((r) => ({
      id: `REF-${r.name.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()}`,
      name: r.name,
      category: r.category,
      isReference: true,
      properties: r.properties,
      default: DEFAULT_SELECTION.includes(r.name),
    })),
  };
}
