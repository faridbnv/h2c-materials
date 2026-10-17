// What the material pages draw beyond the drawer, as configuration: a new map, a new group in the property profile or a
// new rung on the heat ladder is a line here and nothing else. Every key is a registry headline key (each product's own
// value, grades[].headline, as the build chose it; each material's median, materials[].headline); every property a
// registered property name.

/**
 * The maps of every material's median of one key property against another (material-stats.js materialMap), the way an
 * Ashby chart places materials, with this material's products and their middle half drawn over them. `section` is the
 * section a map is drawn in; both axes are logarithmic where the scale rule makes them so (scales.js stripScale).
 */
export const MATERIAL_MAPS = [
  { x: 'tensileModulusXY', y: 'tensileStrengthXY', section: 'mechanical' },
  { x: 'tensileStrengthXY', y: 'hdt045', section: 'thermal' },
];

/** The scatters of two key properties product by product, within the material (the price section's). */
export const FIGURE_PAIRS = [
  { x: 'priceCADkg', y: 'tensileStrengthXY', section: 'price' },
];

/**
 * The groups of the property profile at the head of the page (material-stats.js propertyProfile): each a title and the
 * key properties under it, in order. A key property no group names is drawn in a last group of its own.
 */
export const PROFILE_GROUPS = [
  { title: 'Stiffness and strength', keys: ['tensileModulusXY', 'tensileStrengthXY', 'tensileStrengthZ'] },
  { title: 'Toughness', keys: ['elongationXY', 'charpyNotched', 'izodNotched'] },
  { title: 'Heat', keys: ['hdt045', 'glassTransition'] },
  { title: 'Weight and cost', keys: ['density', 'priceCADkg'] },
];

/**
 * The properties the heat ladder draws beside the key properties in °C (glass transition and both HDT loads), from the
 * values their products publish (material-stats.js heatLadder): not compared as the key properties are, since their test
 * conditions vary from sheet to sheet.
 */
export const LADDER_EXTRA = ['Vicat softening temperature', 'Melting temperature'];

/** The tests the strength section tabulates flat (XY) against across the layers (Z): comparison names (registry.comparisons). */
export const LAYER_TESTS = ['Tensile tests, XY and Z', 'Flexural tests, XY and Z'];
