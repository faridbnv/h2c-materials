// The impact preview (02 section 11): which answers would the pending corrections move? It is WP-11's engine wrapper, called through
// its `@atlas/engine/impact` interface when that package is on this branch. When it is not, the editor says so, plainly:
// "not available yet" is never shown as "nothing moves".
import { basename, dirname } from 'node:path';
import { Worker } from 'node:worker_threads';
import type { ChangeRecord } from '@atlas/domain/contracts';
import type { ImpactMove, ImpactResponse } from '../shared/api.ts';

const IMPACT_MODULE = '@atlas/engine/impact';
const UNAVAILABLE_NOTE = 'Impact preview: not available yet (WP-11). The engine that tells which answers move has not been added to this branch.';

/** The part of a pending record the preview reads. */
export type PendingRecord = Pick<ChangeRecord, 'table' | 'recordId' | 'before' | 'after'>;

export interface ImpactProvider {
  /** Why the preview cannot run, or null when it can. */
  readonly unavailable: string | null;
  preview(records: readonly PendingRecord[]): Promise<ImpactResponse>;
  close(): void;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const asStrings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);

function movesOf(value: unknown): ImpactMove[] {
  const list: unknown[] = Array.isArray(value) ? value : [];
  return list.flatMap((move) => {
    if (!isRecord(move) || typeof move.case !== 'string' || typeof move.record !== 'string' || typeof move.materialId !== 'string') return [];
    const changes: unknown[] = Array.isArray(move.changes) ? move.changes : [];
    return [{
      case: move.case, record: move.record, materialId: move.materialId,
      changes: changes.flatMap((c) => (isRecord(c) && typeof c.field === 'string' && typeof c.before === 'string' && typeof c.after === 'string' ? [{ field: c.field, before: c.before, after: c.after }] : [])),
    }];
  });
}

/** WP-11's report, read for what the editor shows. A report that does not look like one is a failure, never a pass. */
export function readReport(report: unknown, seconds: number): ImpactResponse {
  if (!isRecord(report) || !isRecord(report.summary) || typeof report.summary.moved !== 'number') return { status: 'failed', reason: 'The impact preview returned something the editor does not understand.' };
  const byTemplate = isRecord(report.summary.byTemplate)
    ? Object.fromEntries(Object.entries(report.summary.byTemplate).flatMap(([name, n]) => (typeof n === 'number' ? [[name, n]] : [])))
    : {};
  const cases = isRecord(report.cases) ? report.cases : {};
  const count = (value: unknown): number => (typeof value === 'number' ? value : Array.isArray(value) ? value.length : 0);
  return {
    status: 'ready', mode: typeof report.mode === 'string' ? report.mode : 'core', moved: report.summary.moved,
    estimatesPending: report.summary.estimatesPending === true,
    questions: { asked: count(cases.asked), answered: count(cases.answered), estimatesPending: count(cases.estimatesPending) }, byTemplate,
    listingShifts: typeof report.listingShifts === 'number' ? report.listingShifts : 0,
    materials: asStrings(report.materials), moves: movesOf(report.moves), seconds,
  };
}

function impactUnavailable(reason: string): ImpactProvider {
  return { unavailable: reason, preview: () => Promise.resolve({ status: 'unavailable', reason }), close: () => undefined };
}

/** Whether `@atlas/engine/impact` is on this branch, found without loading it (loading the engine would slow the editor's start). */
function engineIsHere(specifier: string): boolean {
  try { import.meta.resolve(specifier); return true; } catch { return false; }
}

interface Waiting { readonly resolve: (report: unknown) => void; readonly reject: (error: Error) => void }

/**
 * WP-11's preview over the checkout that holds `dataDir`, in a thread of its own (impact-worker.ts). Whether the module exists is
 * known at start; it is loaded when the first preview is asked for. The module is looked up by a name TypeScript cannot resolve, so
 * this file compiles whether or not packages/engine exists; when it does not, the provider says "not available yet (WP-11)".
 */
export function engineImpact(dataDir: string, specifier: string = IMPACT_MODULE): ImpactProvider {
  if (!engineIsHere(specifier)) return impactUnavailable(UNAVAILABLE_NOTE);
  if (basename(dataDir) !== 'data') return impactUnavailable('Impact preview: not available for this data folder (it must be the data/ folder of a checkout).');
  const root = dirname(dataDir);
  const waiting = new Map<number, Waiting>();
  let worker: Worker | undefined;
  let next = 0;

  const end = (error: Error): void => {
    worker = undefined;
    for (const w of waiting.values()) w.reject(error);
    waiting.clear();
  };
  const start = (): Worker => {
    const made = new Worker(new URL('./impact-worker.ts', import.meta.url), { workerData: { root, specifier } });
    made.on('message', (message: unknown) => {
      if (!isRecord(message) || typeof message.id !== 'number') return;
      const w = waiting.get(message.id);
      waiting.delete(message.id);
      if (typeof message.error === 'string') w?.reject(new Error(message.error)); else w?.resolve(message.report);
    });
    made.on('error', end);
    made.on('exit', () => end(new Error('the impact thread stopped')));
    made.unref();
    return made;
  };
  return {
    unavailable: null,
    async preview(records) {
      const started = performance.now();
      const id = next++;
      try {
        const report = await new Promise<unknown>((resolve, reject) => {
          waiting.set(id, { resolve, reject });
          (worker ??= start()).postMessage({ id, records });
        });
        return readReport(report, Math.round(performance.now() - started) / 1000);
      } catch (error) {
        return { status: 'failed', reason: `The impact preview failed: ${error instanceof Error ? error.message : String(error)}` };
      }
    },
    close() { void worker?.terminate(); worker = undefined; },
  };
}

/** A provider made of a function: for tests, which must say they are tests. Never the default. */
export function impactFrom(preview: (records: readonly PendingRecord[]) => Promise<ImpactResponse>): ImpactProvider {
  return { unavailable: null, preview, close: () => undefined };
}
