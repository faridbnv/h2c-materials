// The interface's property definitions, read from the database's registry (data/tables/properties.csv
// and headline_definitions.csv via build/src/registry.js).
//
// Labels, filters, chart axes, table columns, the export and the drawer's property tabs used to be
// six hand-kept lists that had to agree. They are now derived from one registry at start-up, so a
// registry row appears everywhere at once and nowhere can fall out of step.
//
// PROPERTY (labels.js) and AXIS_DEFS (axes.js) stay the objects every view imports; useRegistry fills
// them in place.

import { PROPERTY } from './labels.js';
import { AXIS_DEFS } from './axes.js';

export const REGISTRY = { headlines: [], properties: [] };

export function useRegistry(registry) {
  REGISTRY.headlines = registry?.headlines ?? [];
  REGISTRY.properties = registry?.properties ?? [];

  for (const k of Object.keys(PROPERTY)) delete PROPERTY[k];
  for (const h of REGISTRY.headlines) {
    PROPERTY[h.key] = { short: h.labels.short, plain: h.labels.plain, technical: h.labels.technical, unit: h.unit, hint: h.labels.hint, better: h.better };
  }

  AXIS_DEFS.splice(0, AXIS_DEFS.length, ...REGISTRY.headlines.map((h) => ({
    key: h.key, label: h.labels.axis, unit: h.unit, better: h.better,
    measurement: h.kind === 'measurement'
      ? { properties: h.valueProperties, direction: h.direction, ...(h.loadMPa != null ? { loadMPa: h.loadMPa } : {}) }
      : null,
  })));
}

/** Numeric filters for the rail, in registry order. */
export const numericFilters = () => REGISTRY.headlines.map((h) => ({ group: h.filter.group, key: h.key, op: h.filter.operator, eg: h.filter.example }));

/** Headline keys a negative requirement makes no sense for. */
export const nonNegativeKeys = () => new Set(REGISTRY.headlines.filter((h) => h.filter.nonNegative).map((h) => h.key));

/** Export columns: every headline, in registry order, with its header. */
export const exportHeadlines = () => REGISTRY.headlines.map((h) => ({ key: h.key, header: h.labels.export }));

/** Headlines the Properties table shows by default. */
export const tableHeadlines = () => REGISTRY.headlines.filter((h) => h.tableColumn);

export const headlineDef = (key) => REGISTRY.headlines.find((h) => h.key === key) ?? null;

/** Registered property names in a domain (mechanical, thermal, physical), in registry order. */
export const propertiesInDomain = (domain) => REGISTRY.properties.filter((p) => p.domain === domain).map((p) => p.name);

/** Whether a registered property applies to a material ("Applies to"; no rule means every material). */
export function propertyApplies(name, material) {
  const rule = REGISTRY.properties.find((p) => p.name === name)?.appliesTo;
  return !rule || rule.every((c) => c.values.includes(material[c.field]));
}
