// The public data manifest of a deploy, and its completeness rule (02 section 9.6). Types only.

import type { ReleaseId, Sha256 } from './ids.ts';

/** One file of a release, with its digest and size. */
export type ManifestFile = { readonly path: string; readonly sha256: Sha256; readonly bytes: number };

/** The parts a mode can need. `detail:cited` is the detail shard of every material the output cites. */
export type DataPart = 'core' | 'estimates' | 'reference' | 'detail' | 'detail:cited';

/** The page's modes and outputs, each with the parts it must have loaded before it computes anything. */
export type DataMode = 'strict' | 'explore' | 'exploreEstimates' | 'drawer' | 'ashby' | 'brief' | 'export';

export type PublicManifest = {
  readonly release: ReleaseId;
  readonly commit: string;
  /** The runtime that built it; a release rebuilds on linux-x64 with the pinned Node. */
  readonly runtime: { readonly node: string; readonly icu: string; readonly platform: string; readonly arch: string };
  readonly files: {
    readonly core: ManifestFile;
    /** `withheld` when the estimate check failed: each affected cell carries a visible label (OQ-05 A). */
    readonly estimates: ManifestFile & { readonly status: 'available' | 'withheld' };
    readonly reference: ManifestFile;
    /** `{materialId}` in the pattern is replaced by each material's ID. */
    readonly detail: { readonly pattern: `${string}{materialId}${string}`; readonly count: number };
  };
  /**
   * The completeness rule: a mode computes only when every part it requires has loaded and names the same release as
   * index.html; otherwise "loading" or "could not load", never a partial result.
   */
  readonly requires: { readonly [M in DataMode]: readonly DataPart[] };
};
