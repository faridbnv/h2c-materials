// The axes a goal prepares, in a module of its own: the selector's store needs them on first load, and workspace.ts (the
// whole decision workspace) is only for the lenses that open later. workspace.ts re-exports it, so its callers do not change.
import type { Index } from './indices.ts';
import { indexAxes } from './indices.ts';

/** The axes and scales a goal prepares (D107): its property up, density or cost per volume across, both on Log. */
export function goalAxes(index: Index) {
  const a = indexAxes(index);
  return { x: a.x, y: a.y, xLog: true, yLog: true };
}
