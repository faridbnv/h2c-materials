// A product's decision state as text (D99), and back (WP-07 shared core).
//
// stateId is a faithful copy of the two old copies, build/src/products.js:858 and app/js/engine/products.js:28
// (identical bodies); parseStateId of app/js/engine/products.js:62, the only copy. Saved decisions are keyed by this text
// (main.js:406, engine/scenario.js:73), so a drift between the build's and the engine's copy would orphan them.
// tests/domain/state-id.test.mjs holds the three equal on every state of a real build.

import type { AnnealedStateId, StateId } from '../contracts/ids.ts';
import type { StateParts } from '../contracts/engine.ts';

/** An annealing schedule as a state names it; null for a part the sheet does not state. */
export type Schedule = { readonly tempC?: number | null; readonly hours?: number | null };

/**
 * "as-printed", "annealed:120:16", "conditioned", "annealed:120:16+conditioned" ("x": a part the sheet does not state).
 * Any moisture other than 'conditioned' (dry, not-stated, missing) names no moisture part, as the old copies do.
 */
export function stateId(treatment: Schedule | null | undefined, moisture?: string | null): StateId {
  // The old copies: [annealed part or null, 'conditioned' or null].filter(Boolean).join('+') || 'as-printed'.
  const annealed: AnnealedStateId | null = treatment ? `annealed:${treatment.tempC ?? 'x'}:${treatment.hours ?? 'x'}` : null;
  const conditioned = moisture === 'conditioned';
  if (annealed) return conditioned ? `${annealed}+conditioned` : annealed;
  return conditioned ? 'conditioned' : 'as-printed';
}

export type ParsedState = StateParts;

/** A state identifier read back into its parts, as stateId writes them. Null for one stateId could not have written. */
export function parseStateId(id: unknown): ParsedState | null {
  if (typeof id !== 'string' || !id) return null;
  let treatment: ParsedState['treatment'] = null;
  let moisture: ParsedState['moisture'] = 'dry';
  for (const part of id.split('+')) {
    if (part === 'as-printed') continue;
    if (part === 'conditioned') { moisture = 'conditioned'; continue; }
    const m = /^annealed:([^:]+):([^:]+)$/.exec(part);
    const n = (v: string): number | null => (v === 'x' ? null : Number(v));
    if (!m || m[1] === undefined || m[2] === undefined || [m[1], m[2]].some((v) => v !== 'x' && !Number.isFinite(Number(v)))) return null;
    treatment = { tempC: n(m[1]), hours: n(m[2]) };
  }
  return { treatment, moisture };
}
