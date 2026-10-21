// The impact preview (02 section 11): which answers would the pending corrections move? It is WP-11's engine wrapper, called through
// its `@atlas/engine/impact` interface when that package is on this branch. When it is not, the editor says so, plainly:
// "not available yet" is never shown as "nothing moves".
import { basename, dirname } from 'node:path';
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
  return {
    status: 'ready', mode: typeof report.mode === 'string' ? report.mode : 'core', moved: report.summary.moved,
    estimatesPending: report.summary.estimatesPending === true, byTemplate,
    listingShifts: typeof report.listingShifts === 'number' ? report.listingShifts : 0,
    materials: asStrings(report.materials), moves: movesOf(report.moves), seconds,
  };
}

interface ImpactSessionLike {
  warm(): void;
  preview(records: readonly PendingRecord[]): Promise<unknown>;
  close(): void;
}

interface ImpactModule {
  openImpactSession(options: { readonly root: string }): Promise<unknown>;
}

const isSession = (value: unknown): value is ImpactSessionLike =>
  isRecord(value) && typeof value.warm === 'function' && typeof value.preview === 'function' && typeof value.close === 'function';

const isImpactModule = (value: unknown): value is ImpactModule => isRecord(value) && typeof value.openImpactSession === 'function';

function impactUnavailable(reason: string): ImpactProvider {
  return { unavailable: reason, preview: () => Promise.resolve({ status: 'unavailable', reason }), close: () => undefined };
}

/** Whether `@atlas/engine/impact` is on this branch, found without loading it (loading the engine would slow the editor's start). */
function engineIsHere(): boolean {
  try { import.meta.resolve(IMPACT_MODULE); return true; } catch { return false; }
}

/**
 * WP-11's preview over the checkout that holds `dataDir`. Whether the module exists is known at start; it is loaded when the first
 * preview is asked for. The module is looked up by a name TypeScript cannot resolve, so this file compiles whether or not
 * packages/engine exists; when it does not, the provider says "not available yet (WP-11)".
 */
export function engineImpact(dataDir: string): ImpactProvider {
  if (!engineIsHere()) return impactUnavailable(UNAVAILABLE_NOTE);
  if (basename(dataDir) !== 'data') return impactUnavailable('Impact preview: not available for this data folder (it must be the data/ folder of a checkout).');
  const root = dirname(dataDir);
  let session: Promise<ImpactSessionLike> | undefined;
  const open = (): Promise<ImpactSessionLike> => (session ??= import(IMPACT_MODULE).then(async (loaded: unknown) => {
    if (!isImpactModule(loaded)) throw new Error(`${IMPACT_MODULE} has no openImpactSession`);
    const s = await loaded.openImpactSession({ root });
    if (!isSession(s)) throw new Error('the impact module returned no session');
    s.warm();
    return s;
  }));
  return {
    unavailable: null,
    async preview(records) {
      const started = performance.now();
      try {
        const report = await (await open()).preview(records);
        return readReport(report, Math.round(performance.now() - started) / 1000);
      } catch (error) {
        session = undefined;
        return { status: 'failed', reason: `The impact preview failed: ${error instanceof Error ? error.message : String(error)}` };
      }
    },
    close() { void session?.then((s) => s.close(), () => undefined); },
  };
}

/** A provider made of a function: for tests, which must say they are tests. Never the default. */
export function impactFrom(preview: (records: readonly PendingRecord[]) => Promise<ImpactResponse>): ImpactProvider {
  return { unavailable: null, preview, close: () => undefined };
}
