// The release's view facts (src/view-facts.ts), counted from the whole compiled database, in the words the old selector counted them: the
// rail's availability lines, the start panel's limits and the table's marks read these, and each was a filter over a table the page no
// longer holds (profiles, sources, evidence). The formulas are the old page's own (app/js/ui/filters.js, start.js, table.js, dates.js).
import { documentsRead } from '@atlas/pages/facts/dates';
import type { Obj } from '@atlas/publish/shards';
import { TABLE_HEADLINES } from '../src/view-fields.ts';
import type { TypicalState, ViewFacts } from '../src/view-facts.ts';

const isObject = (value: unknown): value is Obj => typeof value === 'object' && value !== null && !Array.isArray(value);
const rows = (value: unknown): Obj[] => (Array.isArray(value) ? value.filter(isObject) : []);
const field = (row: Obj, key: string): Obj => (isObject(row[key]) ? row[key] : {});
const stated = (value: unknown): boolean => Boolean(value) && !/^not published$/i.test(String(value).trim());

export function viewFactsOf(db: Obj): ViewFacts {
  const profiles = rows(db['profiles']);
  const drying = (need: string): number => profiles.filter((p) => field(p, 'drying')['need'] === need).length;
  const selectable = new Set(rows(field(db, 'registry')['headlines']).filter((h) => !h['drawerOnly']).map((h) => String(h['key'])));
  const setApart = rows(db['grades']).reduce((n, grade) => n + Object.entries(field(grade, 'headline')).filter(([key, value]) => selectable.has(key) && isObject(value) && value['level'] === 'as-published').length, 0);

  const byId = new Map(rows(db['measurements']).map((m) => [String(m['id']), m]));
  const typicalStates: Record<string, TypicalState> = {};
  for (const material of rows(db['materials'])) {
    for (const key of TABLE_HEADLINES) {
      const typical = field(field(material, 'headline'), key)['typical'];
      const id = isObject(typical) ? typical['measurementId'] : undefined;
      const measurement = typeof id === 'string' ? byId.get(id) : undefined;
      if (!measurement) continue;
      const state = { annealed: measurement['postProcessingState'] === 'annealed', conditioned: measurement['moistureState'] === 'conditioned' };
      if (state.annealed || state.conditioned) typicalStates[String(id)] = state;
    }
  }

  return {
    profiles: {
      total: profiles.length, dryingRequired: drying('required'), dryingOptional: drying('optional'), dryingNotNeeded: drying('not-needed'),
      verifyExactGrade: profiles.filter((p) => /verify exact grade/i.test(`${String(field(p, 'routing')['left'])} ${String(field(p, 'routing')['right'])}`)).length,
      amsPublished: profiles.filter((p) => stated(field(p, 'routing')['amsPublished'])).length,
      enclosure: profiles.filter((p) => stated(p['enclosure'])).length,
    },
    warpingStatements: rows(db['evidence']).filter((e) => /warp/i.test(String(e['topic'] ?? ''))).length,
    setApart,
    documentsRead: documentsRead(rows(db['sources'])),
    waterUptakeHigh: rows(db['polymers']).filter((p) => p['waterUptake'] === 'high').map((p) => String(p['id'])),
    typicalStates,
  };
}
