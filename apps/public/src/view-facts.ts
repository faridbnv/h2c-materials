// The counts and lookups the selector's sentences quote, computed from the whole compiled database when the release is cut and carried in
// the core part beside the model (tools/shards.ts). They are facts of the release, like the model, and the page checks their shape before
// it uses them. Nothing here is computed in the browser from a partial database: a count of print profiles needs every profile.
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

/** What a measurement's typical value was measured after: annealing, moisture conditioning (the table's marks on a median). */
export interface TypicalState { readonly annealed: boolean; readonly conditioned: boolean }

export interface ViewFacts {
  /** The print profiles: how many, and how many say what (the rail's availability lines, the start panel's limits). */
  readonly profiles: {
    readonly total: number;
    readonly dryingRequired: number;
    readonly dryingOptional: number;
    readonly dryingNotNeeded: number;
    /** Profiles whose routing says only "verify the exact grade". */
    readonly verifyExactGrade: number;
    readonly amsPublished: number;
    readonly enclosure: number;
  };
  /** Statements about warping in the whole database. */
  readonly warpingStatements: number;
  /** Product values that are shown and never judged (their test bar no document describes as printed). */
  readonly setApart: number;
  /** The first and last day a document was read, or null where the sources carry none. */
  readonly documentsRead: { readonly from: string; readonly to: string } | null;
  /** Polymers that take up much water from humid air (a nylon judged dry says so on its row). */
  readonly waterUptakeHigh: readonly string[];
  /** The state each table column's typical measurement was taken in, for the measurements that were annealed or conditioned. */
  readonly typicalStates: Readonly<Record<string, TypicalState>>;
}

export function isViewFacts(value: unknown): value is ViewFacts {
  if (!isObject(value)) return false;
  const p = value['profiles'];
  const read = value['documentsRead'];
  return isObject(p) && ['total', 'dryingRequired', 'dryingOptional', 'dryingNotNeeded', 'verifyExactGrade', 'amsPublished', 'enclosure'].every((k) => isCount(p[k]))
    && isCount(value['warpingStatements']) && isCount(value['setApart'])
    && (read === null || (isObject(read) && typeof read['from'] === 'string' && typeof read['to'] === 'string'))
    && Array.isArray(value['waterUptakeHigh']) && value['waterUptakeHigh'].every((id) => typeof id === 'string')
    && isObject(value['typicalStates']) && Object.values(value['typicalStates']).every((s) => isObject(s) && typeof s['annealed'] === 'boolean' && typeof s['conditioned'] === 'boolean');
}
