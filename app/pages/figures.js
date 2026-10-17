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
  { x: 'tensileModulusXY', y: 'tensileStrengthXY', section: 'mechanical', words: { x: 'modulus', y: 'strength' } },
  { x: 'tensileStrengthXY', y: 'hdt045', section: 'thermal', words: { x: 'strength', y: 'HDT' } },
];

/**
 * The first screen's numbers, under the material's name: these key properties' typical values with how many products
 * each rests on, then the nozzle and bed windows most products accept.
 */
export const FIRST_SCREEN = {
  keys: ['tensileStrengthXY', 'tensileStrengthZ', 'tensileModulusXY', 'hdt045', 'hdt18', 'charpyNotched'],
  // The comparison lines under them, against the two materials with the most products: these medians, in this order.
  versus: ['tensileModulusXY', 'tensileStrengthXY', 'tensileStrengthZ', 'hdt045', 'charpyNotched', 'priceCADkg'],
};

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

/**
 * The order of the makers' topics (db.meta.knowHow.topics): the engineering ones first and open, the marketing ones
 * closed with their counts. A topic named in neither list is open, after these.
 */
export const MAKER_TOPICS = {
  open: ['Pitfalls and limitations', 'Warping and shrinkage', 'Moisture sensitivity', 'Printing advice', 'Nozzle wear', 'Adhesion between layers',
    'Precision and tolerance', 'Supports and removal', 'Odour and emissions'],
  closed: ['Good for', 'Benefits', 'Surface finish'],
};

/** The tests the strength section tabulates flat (XY) against across the layers (Z): comparison names (registry.comparisons). */
export const LAYER_TESTS = ['Tensile tests, XY and Z', 'Flexural tests, XY and Z'];

// ------------------------------------------------------------------ the five figures (pages-reimagined round)

/**
 * The columns of "Against its alternatives" (charts/peers.js) and, in this order, the first screen's key figures: each a
 * registry headline key, its column title and the line under it.
 */
export const PEER_COLUMNS = [
  { key: 'tensileModulusXY', title: 'Modulus (XY)', sub: 'tensile · GPa' },
  { key: 'tensileStrengthXY', title: 'Strength (XY)', sub: 'tensile · MPa' },
  { key: 'tensileStrengthZ', title: 'Strength (Z)', sub: 'across layers · MPa' },
  { key: 'charpyNotched', title: 'Notched Charpy', sub: 'impact · kJ/m²' },
  { key: 'hdt045', title: 'HDT', sub: 'at 0.45 MPa · °C' },
  { key: 'priceCADkg', title: 'Price', sub: 'CAD/kg' },
];

/** The two maps of "Among all materials" (charts/map.js): y against x, each a registry headline key. */
export const MAP_PANELS = [
  { x: 'tensileModulusXY', y: 'tensileStrengthXY' },
  { x: 'priceCADkg', y: 'hdt045' },
];

/** The product strips each section draws (charts/strips.js stripsFigure), by the figure's id. */
export const STRIP_SETS = {
  mechanical: ['tensileStrengthXY', 'tensileModulusXY', 'tensileStrengthZ', 'elongationXY', 'charpyNotched', 'izodNotched'],
  thermal: ['hdt045', 'hdt18', 'glassTransition'],
  'density-price': ['density', 'priceCADkg'],
};

/** The pairs of "Across the layers" (charts/layers.js): flat (XY) and across the layers (Z), by registry key. */
export const LAYER_PAIRS = [
  { xy: 'tensileStrengthXY', z: 'tensileStrengthZ', title: 'Tensile strength', word: 'strength' },
  { xy: 'tensileModulusXY', z: 'tensileModulusZ', title: 'Tensile modulus', word: 'stiffness' },
  { xy: 'elongationXY', z: 'elongationZ', title: 'Elongation at break', word: 'elongation' },
];

export { peersFigure } from './charts/peers.js';
export { mapsFigure } from './charts/map.js';
export { stripsFigure } from './charts/strips.js';
export { layersFigure } from './charts/layers.js';
export { temperaturesFigure } from './charts/temperatures.js';
export { miniSpread } from './charts/mini.js';
export { peerSet } from '../js/ui/material-stats.js';
