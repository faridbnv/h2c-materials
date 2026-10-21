// The historic-link check: every link a build must still open (historic-links.ts, plus the back-links on the built pages).
//
// Two parts. OPENINGS: each side's decoder reads each link and the results are compared field by field (what it opened as,
// the questions it asks, the warnings it speaks, or its refusal words). REPLAY: the question each opened link asks is put to
// both engines like any corpus case, so a link that opens the same but is answered differently shows too.
import { canon } from './canon.ts';
import { compareRecordSets, emptyComparison, runParity } from './compare.ts';
import type { HistoricLink } from './historic-links.ts';
import { linkRequest } from './historic-links.ts';
import { SurfaceBuilder } from './surface.ts';
import type { Adapter, CorpusCase, CorpusScenario, LinkOpening, LinkRequest, ParityReport, RecordFacts, SurfaceReport } from './types.ts';
import { compareStrings, sha256Hex } from './util.ts';

export interface LinkUnit {
  id: string;
  request: LinkRequest;
  /** What the old decoder must do with it: the harvested expectation, or `opened` for a back-link read off a built page. */
  expect: HistoricLink['expect'];
}

/** The units of one run: the harvested links, then each distinct hash found on the built pages. */
export function linkUnits(links: readonly HistoricLink[], pageHashes: readonly string[]): LinkUnit[] {
  return [
    ...links.map((l): LinkUnit => ({ id: l.id, request: linkRequest(l), expect: l.expect })),
    ...pageHashes.map((h): LinkUnit => ({ id: `page-link/${sha256Hex(h).slice(0, 12)}`, request: { kind: 'hash', text: h }, expect: 'opened' })),
  ];
}

/** The facts the two sides are compared on for a link a decoder read (or refused). */
function factsOf(o: Exclude<LinkOpening, { outcome: 'not-computable' }>): RecordFacts {
  switch (o.outcome) {
    case 'opened': return o.facts;
    case 'empty': return { decision: { outcome: 'empty' } };
    case 'refused': return { decision: { outcome: 'refused' }, wording: { message: o.message } };
  }
}

export interface LinksRun {
  openings: SurfaceReport;
  /** Null when no link opened (nothing to replay). */
  replay: ParityReport | null;
  replayCases: number;
}

export async function runLinks(opts: { units: readonly LinkUnit[]; before: Adapter; after: Adapter }): Promise<LinksRun> {
  const { before, after } = opts;
  const b = new SurfaceBuilder({ surface: 'links', before: before.name, after: after.name, unit: 'link' });
  const replayScenarios = new Map<string, { id: string; scenario: CorpusScenario }>();
  for (const unit of opts.units) {
    if (!before.openLink) { b.cannot(unit.id, 'before', `${before.name} cannot open links`); continue; }
    if (!after.openLink) { b.cannot(unit.id, 'after', `${after.name} cannot open links`); continue; }
    const x = before.openLink(unit.request);
    const y = after.openLink(unit.request);
    for (const [side, o] of [['before', x], ['after', y]] as const) if (o.outcome === 'not-computable') b.cannot(unit.id, side, o.reason);
    if (x.outcome === 'not-computable' || y.outcome === 'not-computable') continue;
    b.units++;
    if (x.outcome !== unit.expect) {
      b.add({ case: unit.id, record: 'link', tier: 'decision', field: 'harvested expectation (the baseline decoder)', before: unit.expect, after: x.outcome });
    }
    const cmp = emptyComparison();
    compareRecordSets(unit.id, { link: factsOf(x) }, { link: factsOf(y) }, cmp);
    b.addComparison(cmp);
    if (x.outcome === 'opened') {
      const key = sha256Hex(canon(x.scenario)).slice(0, 12);
      if (!replayScenarios.has(key)) replayScenarios.set(key, { id: unit.id, scenario: x.scenario });
    }
  }
  const cases: CorpusCase[] = [...replayScenarios].sort((p, q) => compareStrings(p[0], q[0])).map(([key, v]) => ({
    id: `link/${key}`, group: 'link', name: `the question of ${v.id}`, scenario: v.scenario,
  }));
  b.notes.push(`${opts.units.length} links; ${cases.length} distinct questions to replay in the engines`);
  const openings = b.finish();
  const replay = cases.length ? await runParity({ corpusName: 'links', cases, before, after }) : null;
  return { openings, replay, replayCases: cases.length };
}
