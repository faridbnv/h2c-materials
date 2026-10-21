// The old constraints module until WP-19 ports it, seen through the one function the ported scenario module reads.
// A staged engine (stage.ts) never copies this file: there `constraints.ts` re-exports the old module itself.
import { normalizePolicy as oldNormalizePolicy } from '../../../../app/js/engine/constraints.js';

export const normalizePolicy: (value: unknown) => string = oldNormalizePolicy;
