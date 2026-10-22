// The core-sufficiency hook for WP-25 (pack 07 section 5.4): "the engine on the public `core` alone must equal the engine on
// the full read model". This is the check that would have caught the Flexible component count moving from 10 to 11
// "not enough data".
//
// The adapter is core-hook.ts (WP-25): it answers from the published core alone, cut with the declarations the page and the writer
// use, and the CLI registers it when the core surface is asked for. Without a registered hook the check says "not computable" and
// names why, never zero. It is never part of a default run.
import { runParity } from './compare.ts';
import type { Db } from './old-adapter.ts';
import { cannotCompare } from './surface.ts';
import type { Adapter, CorpusCase, ParityReport, SurfaceReport } from './types.ts';

/** What core-hook.ts provides: an adapter fed only the public core (no detail shards) for the same data. */
export interface CoreSufficiencyHook {
  /** Built from the same db the full read model was; it must not read anything outside the public core. */
  coreAdapter(db: Db): Adapter | Promise<Adapter>;
}

let registered: CoreSufficiencyHook | null = null;

/** core-hook.ts calls this once (installCoreHook). Registering twice is a mistake, not an override. */
export function registerCoreSufficiency(hook: CoreSufficiencyHook): void {
  if (registered) throw new Error('a core-sufficiency hook is already registered');
  registered = hook;
}

export const coreSufficiencyHook = (): CoreSufficiencyHook | null => registered;

export type CoreSufficiencyResult = { kind: 'parity'; report: ParityReport } | { kind: 'surface'; report: SurfaceReport };

/** The full read model against the core alone over `cases`. With no hook registered: not computable, with the reason. */
export async function runCoreSufficiency(opts: { cases: CorpusCase[]; full: Adapter; db: Db }): Promise<CoreSufficiencyResult> {
  if (!registered) {
    const head = { surface: 'core', before: opts.full.name, after: '(no core adapter)', unit: 'case' };
    const reason = 'no core adapter is registered: WP-25 supplies it (packages/parity/src/core-sufficiency.ts registerCoreSufficiency)';
    return { kind: 'surface', report: cannotCompare(head, 'after', reason) };
  }
  const core = await registered.coreAdapter(opts.db);
  return { kind: 'parity', report: await runParity({ corpusName: 'core-sufficiency', cases: opts.cases, before: opts.full, after: core }) };
}
