// The counts of a results file, tallied from its rows. The page shows these, and refuses a file whose own counts differ.
import { GROUP_ORDER } from '@atlas/domain';
import type { Counts, GroupCount, MaterialLine } from './model.ts';

export function tally(materials: readonly MaterialLine[]): Counts {
  const count = (keep: (m: MaterialLine) => boolean): number => materials.filter(keep).length;
  return {
    pass: count((m) => m.verdict === 'PASS'), fail: count((m) => m.verdict === 'FAIL'), unknown: count((m) => m.verdict === 'UNKNOWN'),
    screened: count((m) => m.screened), total: materials.length,
  };
}

export const sameCounts = (a: Counts, b: Counts): boolean =>
  a.pass === b.pass && a.fail === b.fail && a.unknown === b.unknown && a.screened === b.screened && a.total === b.total;

/** The groups of the materials that could not be settled, in the listing's order: the line under the heading ("8 one check away, ..."). */
export function unsettledGroups(materials: readonly MaterialLine[]): readonly GroupCount[] {
  return GROUP_ORDER
    .map((group) => ({ group, count: materials.filter((m) => m.verdict === 'UNKNOWN' && m.group === group).length }))
    .filter((g) => g.count > 0);
}
