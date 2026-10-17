// What the material pages draw beyond the drawer, as configuration: a new map, a new strip or a new rung on the heat
// ladder is a line here and nothing else. Every key is a registry headline key (each product's own
// value, grades[].headline, as the build chose it; each material's median, materials[].headline); every property a
// registered property name.

/**
 * The properties the heat ladder draws beside the key properties in °C (glass transition and both HDT loads), from the
 * values their products publish (material-stats.js heatLadder): not compared as the key properties are, since their test
 * conditions vary from sheet to sheet.
 */
export const LADDER_EXTRA = ['Vicat softening temperature', 'Melting temperature'];

// ------------------------------------------------------------------ the five figures (pages-reimagined round)

/**
 * The columns of "Against its alternatives" (charts/peers.js) and, in this order, the first screen's key figures: each a
 * registry headline key, its column title and the line under it.
 */
export const PEER_COLUMNS = [
  { key: 'tensileModulusXY', title: 'Modulus (XY)', sub: 'GPa' },
  { key: 'tensileStrengthXY', title: 'Strength (XY)', sub: 'MPa' },
  { key: 'tensileStrengthZ', title: 'Strength (Z)', sub: 'MPa' },
  { key: 'charpyNotched', title: 'Notched Charpy', sub: 'kJ/m²' },
  { key: 'hdt045', title: 'HDT 0.45 MPa', sub: '°C' },
  { key: 'priceCADkg', title: 'Price', sub: 'CAD/kg' },
];

/** The two maps of "Among all materials" (charts/map.js): y against x, each a registry headline key. */
export const MAP_PANELS = [
  { x: 'tensileModulusXY', y: 'tensileStrengthXY' },
  { x: 'priceCADkg', y: 'hdt045' },
];

/** A product strip is drawn for a property only where at least this many products publish it; under it, a table. */
export const STRIP_MIN = 4;
/**
 * The one rule for a strip (D145): a property is drawn product by product where at least STRIP_MIN products are ranked
 * in its median (materials[].summary[key].n); with fewer, the section lists what each sheet publishes in a table.
 */
export const inStrip = (m, key) => (m.summary?.[key]?.n ?? 0) >= STRIP_MIN;

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
