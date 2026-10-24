// The interface's property definitions, read from the database's registry (data/tables/properties.csv
// and headline_definitions.csv via build/src/registry.js).
//
// Labels, filters, chart axes, table columns, the export and the drawer's property tabs used to be
// six hand-kept lists that had to agree. They are now derived from one registry at start-up, so a
// selectable registry row appears everywhere at once and nowhere can fall out of step.
//
// PROPERTY (labels.js) and AXIS_DEFS (axes.js) stay the objects every view imports; useRegistry fills
// them in place.

import type { Loose } from '../loose.ts';

import { PROPERTY } from './labels.ts';
import { AXIS_DEFS } from './axes.ts';

// headlines is the selectable set every list below reads; allHeadlines adds the drawer-only ones. A drawer-only headline
// (headline_definitions "Drawer only", D139) is drawn in the drawer alone and is never a filter, an axis, a table or export
// column, or a scenario key.
export const REGISTRY: Loose = { headlines: [], allHeadlines: [], comparisons: [], properties: [] };

export function useRegistry(registry: Loose) {
  REGISTRY.allHeadlines = registry?.headlines ?? [];
  REGISTRY.headlines = REGISTRY.allHeadlines.filter((h: Loose) => !h.drawerOnly);
  REGISTRY.comparisons = registry?.comparisons ?? [];
  REGISTRY.properties = registry?.properties ?? [];

  for (const k of Object.keys(PROPERTY)) delete PROPERTY[k];
  for (const h of REGISTRY.headlines) {
    PROPERTY[h.key] = { short: h.labels.short, plain: h.labels.plain, technical: h.labels.technical, unit: h.unit, hint: h.labels.hint, better: h.better };
  }

  AXIS_DEFS.splice(0, AXIS_DEFS.length, ...REGISTRY.headlines.map((h: Loose) => ({
    key: h.key, label: h.labels.axis, unit: h.unit, better: h.better,
    // The conditions a measurement must meet to be drawn on the axis: the headline's own (D84, D92), each only where set.
    measurement: h.kind === 'measurement'
      ? { properties: h.valueProperties, direction: h.direction, ...(h.loadMPa != null ? { loadMPa: h.loadMPa } : {}),
        ...(h.notch ? { notch: h.notch } : {}), ...(h.testTemperatureC != null ? { testTemperatureC: h.testTemperatureC } : {}),
        ...(h.standard ? { standard: h.standard } : {}) }
      : null,
  })));
}

/** Numeric filters for the rail, in registry order. */
export const numericFilters = () => REGISTRY.headlines.map((h: Loose) => ({ group: h.filter.group, key: h.key, op: h.filter.operator, eg: h.filter.example }));

/** Headline keys a negative requirement makes no sense for. */
export const nonNegativeKeys = (): Loose => new Set(REGISTRY.headlines.filter((h: Loose) => h.filter.nonNegative).map((h: Loose) => h.key));

/** Export columns: every headline, in registry order, with its header. */
export const exportHeadlines = () => REGISTRY.headlines.map((h: Loose) => ({ key: h.key, header: h.labels.export }));

/** Headlines the Properties table shows by default. */
export const tableHeadlines = () => REGISTRY.headlines.filter((h: Loose) => h.tableColumn);

export const headlineDef = (key: Loose) => REGISTRY.headlines.find((h: Loose) => h.key === key) ?? null;

/** Registered property names in a domain (mechanical, thermal, physical), in registry order. */
export const propertiesInDomain = (domain: Loose) => REGISTRY.properties.filter((p: Loose) => p.domain === domain).map((p: Loose) => p.name);

/** Whether a registered property applies to a material ("Applies to"; no rule means every material). */
export function propertyApplies(name: Loose, material: Loose) {
  const rule = REGISTRY.properties.find((p: Loose) => p.name === name)?.appliesTo;
  return !rule || rule.every((c: Loose) => c.values.includes(material[c.field]));
}
