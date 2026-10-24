/// <reference types="vite/client" />

/** Where a material's own page lives, relative to the view (set in vite.config.ts). */
declare const __MATERIAL_PAGES__: string;

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

/** The chart library's basic bundle ships no types; the lenses call it through the Loose seam of plotly.ts. */
declare module 'plotly.js-basic-dist-min';
