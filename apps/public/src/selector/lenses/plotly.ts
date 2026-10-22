// The chart library, loaded when a chart is first opened and never at boot (pack 05 section 8; ADR-12). The basic bundle holds the scatter
// traces, shapes, annotations, log axes and error bars every Ashby view draws. `loadPlotly` is the one place the bundle is imported, so it
// is its own chunk; `Plotly` is the loaded library, and reading it before `loadPlotly` has resolved is a fault, said so.
import type { Loose } from '@atlas/pages/loose';

let library: Loose = null;
let pending: Promise<Loose> | null = null;

/** The library, once. A failed load is tried again the next time a chart is opened, not remembered as failed. */
export function loadPlotly(): Promise<Loose> {
  if (library) return Promise.resolve(library);
  pending ??= import('plotly.js-basic-dist-min').then((module: Loose) => {
    library = module.default ?? module;
    return library;
  }, (error: unknown) => {
    pending = null;
    throw error;
  });
  return pending;
}

export const plotlyLoaded = (): boolean => library !== null;

/** The loaded library. Every call is made after `loadPlotly` has resolved. */
export const Plotly: Loose = new Proxy({}, {
  get(_target, key) {
    if (!library) throw new Error('the chart library was used before it was loaded');
    return library[key];
  },
});
