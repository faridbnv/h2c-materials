// The new-side adapter. A placeholder until the typed engine wrapper lands (WP-11): every case is "not computable", which
// the comparer reports as its own outcome and a non-zero exit, never as zero differences.
import type { Adapter } from './types.ts';

export const createNewPlaceholder = (): Adapter => ({
  name: 'new (placeholder)',
  evaluate: (c) => ({ caseId: c.id, outcome: 'not-computable', reason: 'the new engine is not wired yet (WP-11 fills this adapter)' }),
});
