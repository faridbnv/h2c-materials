// Building a SurfaceReport: the result of a check that is not "one corpus through two engines" (links, tie rule, P-build,
// P-pages, core sufficiency). The status rule is the engine's: differences fail, a place that could not be compared is its own
// outcome, and zero needs at least one real comparison behind it.
import type { CaseComparison } from './compare.ts';
import type { Difference, NotComputableItem, Status, SurfaceReport } from './types.ts';
import { sha256Hex } from './util.ts';

/** Differences kept in a report. The count is exact; the list is capped so a wholly different database cannot fill the memory. */
const MAX_STORED_DIFFERENCES = 2000;

/** The fields of a SurfaceReport that the check names rather than computes. */
export type SurfaceHead = Pick<SurfaceReport, 'surface' | 'before' | 'after' | 'unit'>;

export class SurfaceBuilder {
  readonly differences: Difference[] = [];
  readonly notComputable: NotComputableItem[] = [];
  readonly notes: string[] = [];
  count = 0;
  units = 0;
  private readonly started = performance.now();
  private readonly head: SurfaceHead;

  constructor(head: SurfaceHead) {
    this.head = head;
  }

  add(d: Difference): void {
    this.count++;
    if (this.differences.length < MAX_STORED_DIFFERENCES) this.differences.push(d);
  }

  /** Fold in one comparison made by compareCase / compareRecordSets. */
  addComparison(c: CaseComparison): void {
    for (const d of c.differences) this.add(d);
    this.notComputable.push(...c.notComputable);
  }

  /** A place neither side could be compared at. Never counted as equal. */
  cannot(unit: string | null, side: NotComputableItem['side'], reason: string): void {
    this.notComputable.push({ case: this.head.surface, record: unit, tier: null, field: null, side, reason });
  }

  finish(): SurfaceReport {
    let status: Status;
    if (this.count > 0) status = 'differs';
    else if (this.notComputable.length > 0) status = 'not-computable';
    else if (this.units === 0) throw new Error(`internal: ${this.head.surface} reports zero differences with nothing compared`);
    else status = 'zero';
    return {
      ...this.head, unitsCompared: this.units, differenceCount: this.count, differences: this.differences,
      truncated: this.count > this.differences.length, notComputable: this.notComputable, notes: this.notes, status,
      timingsMs: { total: Math.round(performance.now() - this.started) },
    };
  }
}

/** The report of a check that could not be made at all: one place that was not computable, nothing compared. */
export function cannotCompare(head: SurfaceHead, side: NotComputableItem['side'], reason: string): SurfaceReport {
  const builder = new SurfaceBuilder(head);
  builder.cannot(null, side, reason);
  return builder.finish();
}

/** A long value cut to `max` characters, with its length and a digest tail so two long values never look alike. */
export function clipWithDigest(text: string, max = 200): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}… (${text.length} chars, sha256:${sha256Hex(text).slice(0, 12)})`;
}
