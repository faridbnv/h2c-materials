// The release manifest of the new build (WP-21): what a release is made of and what it ran on. The old build's manifest
// (build/src/index.js releaseManifest, dist/manifest.json) is written by its bundle stage; the new build writes this one beside its
// db.json, so that each release records the Node and ICU its estimates were made with (owner ruling OQ-07 A) and whether its
// estimates were published whole, withheld, or not made.
//
// It is reproducible: nothing in it depends on the clock, on the cache (a build that read its estimates from the cache and one
// that computed them write the same manifest) or on the folder it was written to.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodePin, runtimeFingerprint } from './runtime-fingerprint.ts';
import type { RuntimeFingerprint } from './runtime-fingerprint.ts';
import type { Dyn } from './types.ts';

export const MANIFEST_FORMAT = 'h2c-release-manifest 1';

export type EstimatesStatus = 'available' | 'withheld' | 'off';

export interface ReleaseManifest {
  format: typeof MANIFEST_FORMAT;
  release: string;
  releaseDigest: string;
  releaseInputs: Record<string, string>;
  snapshot: string;
  build: string;
  runtime: RuntimeFingerprint & { nodePin: string | null; pinned: boolean };
  estimates: {
    status: EstimatesStatus;
    /** The cache key of the estimate stage: a digest of the compiled core, the code, the runtime and the options its estimates came from. */
    stageKey: string | null;
    /** The headlines whose estimates were withheld, or null for the whole model. */
    withheld: (string | null)[];
  };
  files: Record<string, { sha256: string; bytes: number }>;
}

export interface ManifestInput {
  projectRoot: string;
  release: Dyn;
  snapshot: string;
  build: string;
  estimates: ReleaseManifest['estimates'];
  /** The files of the release, by name, as written in `dir`. */
  dir: string;
  fileNames: readonly string[];
  runtime?: RuntimeFingerprint;
}

/** The manifest of a release whose files have been written to `dir`. */
export function releaseManifest({ projectRoot, release, snapshot, build, estimates, dir, fileNames, runtime = runtimeFingerprint() }: ManifestInput): ReleaseManifest {
  const pin = nodePin(projectRoot, runtime.node);
  const files: ReleaseManifest['files'] = {};
  for (const name of fileNames) {
    const bytes = readFileSync(join(dir, name));
    files[name] = { sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
  }
  return {
    format: MANIFEST_FORMAT,
    release: release.id,
    releaseDigest: release.digest,
    releaseInputs: release.inputs,
    snapshot,
    build,
    runtime: { ...runtime, nodePin: pin.pin, pinned: pin.matches },
    estimates,
    files,
  };
}
