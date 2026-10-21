// A material's filler as a reader files it.
//
// The build's reinforcement facet (compile.js deriveFacets) has six classes, and files every material whose Modifier /
// filler is not one of its five named ones with the undisclosed variants: 17 materials whose filler the materials table
// names (aramid fibre, ceramic, PTFE, graphene, metal powder …) were filtered and drawn as "filler not disclosed", while
// the drawer and the material pages named their filler (OPEN-PROBLEMS §37.8). The facet stays as it is, since the
// estimate model reads it as a class of its own (build/src/estimate, frozen, D58); the filter, the charts' shapes and
// the rail read the filler from here, where a named filler is its own class, keyed by its name ("aramid-fibre").
//
// A requirement on it is the facet "filler" (constraints.js). A requirement saved before it, on "reinforcement", is
// still read as it was written, so a link keeps its answer: there, "undisclosed" includes the named fillers.

/** The five classes the reinforcement facet names, and its class for a variant whose filler is not disclosed. */
export const FILLER_CLASSES: readonly string[] = ['carbon-fibre', 'glass-fibre', 'unfilled', 'esd', 'foaming'];
export const UNDISCLOSED = 'undisclosed';

/** A modifier that names no filler: the undisclosed variant's own words, or a missing state. */
const NAMES_NONE = /undisclosed|^Not /i;
const key = (words: unknown): string => String(words).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export interface FillerSource {
  readonly facets?: { readonly reinforcement?: { readonly value?: string | null } | undefined };
  readonly modifier?: unknown;
}

/**
 * The filler class of a material (or of a product's view of it): the reinforcement facet's, or, where that facet says
 * "undisclosed" and the materials table names a filler, that filler's key. Null where no facet is recorded.
 */
export function fillerOf(m: FillerSource | null | undefined): string | null {
  const r = m?.facets?.reinforcement?.value ?? null;
  if (r !== UNDISCLOSED) return r;
  const mod = String(m?.modifier ?? '').trim();
  return !mod || NAMES_NONE.test(mod) ? UNDISCLOSED : key(mod);
}

/** Whether a filler class is one the materials table names beyond the facet's five (aramid fibre, PTFE …). */
export const isNamedFiller = (f: string | null | undefined): boolean => !!f && f !== UNDISCLOSED && !FILLER_CLASSES.includes(f);
