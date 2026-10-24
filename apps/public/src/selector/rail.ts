// The filter rail's facts (WP-26): what each group of controls says and counts, taken from the old rail (app/js/ui/filters.js) as data, so the
// rail's component only draws it. The sentences are the old rail's, word for word; the counts are the engine's (coverage, selection) and the
// release's view facts (profiles), and the numbers a control prints are the registry's.
import { availability } from '@atlas/engine/port/coverage.ts';
import { runSelection } from '@atlas/engine/port/constraints.ts';
import { FILLER_CLASSES, UNDISCLOSED, fillerOf, isNamedFiller } from '@atlas/engine/port/filler.ts';
import { priceSampleWords } from '@atlas/pages/facts/format';
import { H2C_STATUS, fillerName, prop } from '@atlas/pages/facts/labels';
import { headlineDef, numericFilters } from '@atlas/pages/facts/registry';
import type { Loose } from '@atlas/pages/loose';
import { printCheck } from './templates.ts';

// The order an engineer screens in (the owner's ruling of 2026-10-04): what kind of plastic, what it must withstand,
// whether the H2C can print it, the state the part is used in, then cost and how strict to be about the data. The keys
// are the constraints' stored group names, which saved scenarios carry; GROUP_LABEL is what the rail shows.
export const GROUPS = ['Material family', 'Mechanical', 'Thermal', 'Environment', 'Compatibility', 'Part condition', 'Cost', 'Evidence'] as const;
export const GROUP_LABEL: Record<string, string> = { Compatibility: 'Printing on the H2C', Cost: 'Cost and availability', Evidence: 'Data quality' };
// The rail opens on what a part needs (2026-10-18, REVIEW-0 F14): open, the 25-row family list had pushed density,
// modulus and HDT about 850 px down. The family group opens itself when a family, polymer or filler is ticked.
export const OPEN_BY_DEFAULT = new Set(['Mechanical', 'Thermal', 'Compatibility']);
// A line icon beside each heading, drawn as the top bar's are (20 px box, 1.7 px stroke), so a group is found by shape
// as well as by name in a rail of eight.
export const GROUP_ICON: Record<string, string> = {
  'Material family': '<path d="M10 2.5l7 3.8-7 3.8-7-3.8z"/><path d="M3 10l7 3.8 7-3.8M3 13.7l7 3.8 7-3.8"/>',
  Mechanical: '<path d="M3 7.5v5M5.5 5.5v9M14.5 5.5v9M17 7.5v5M5.5 10h9"/>',
  Thermal: '<path d="M8 11.5V4a2 2 0 0 1 4 0v7.5a3.5 3.5 0 1 1-4 0z"/><path d="M10 8v5.5"/>',
  Environment: '<circle cx="10" cy="10" r="3.2"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4"/>',
  Compatibility: '<path d="M3.5 3.5h13v4h-13zM8 7.5v3l2 2.5 2-2.5v-3M5 16.5h10"/>',
  'Part condition': '<path d="M10 2.8c-2.7 3.6-4.6 6.3-4.6 8.6a4.6 4.6 0 0 0 9.2 0c0-2.3-1.9-5-4.6-8.6z"/>',
  Cost: '<path d="M3 10.6V3.5A.5.5 0 0 1 3.5 3h7.1l6.4 6.4-7.6 7.6z"/><circle cx="7" cy="7" r="1.2"/>',
  Evidence: '<path d="M10 2.5l6 2.5v4.6c0 3.7-2.6 6.4-6 7.9-3.4-1.5-6-4.2-6-7.9V5z"/><path d="M7.3 10l2 2 3.6-3.8"/>',
};

export const H2C_STATUSES = ['Official Bambu product', 'Officially listed family', 'Conditional', 'Theoretical'];

// The comparison in words; the symbols are in the pills' and the drawer's names of a limit.
export const OP_WORD: Record<string, string> = { '>=': 'at least', '<=': 'at most', '>': 'more than', '<': 'less than' };

/**
 * The rail group a requirement is shown and counted in. It is derived from the requirement, not read from the group
 * name it was saved with: the reinforcement, build-material and drying checks were saved under "Manufacturing", a group
 * the rail no longer has, and the badge must count them where they now sit.
 */
export function railGroupOf(c: Loose): string {
  if (c.kind === 'numeric') return numericFilters().find((f: Loose) => f.key === c.property)?.group ?? c.__group;
  if (c.kind === 'facet') return 'Material family';
  if (c.kind === 'environment') return 'Environment';
  if (c.kind === 'evidence') return 'Evidence';
  if (c.kind === 'gate') return c.gate === 'buyable' ? 'Cost' : 'Compatibility';
  return c.__group;
}

export const find = (cs: Loose[], pred: (c: Loose) => boolean): Loose => cs.find(pred) ?? null;

/** What each group's badge counts: its requirements, and for Part condition the settings that change which values are judged (annealing, a humid part), which are not requirements but change answers all the same. */
export function activeIn(group: string, scenario: Loose): number {
  return scenario.constraints.filter((c: Loose) => railGroupOf(c) === group).length
    + (group === 'Part condition' ? (scenario.anneal ? 1 : 0) + (scenario.moisture === 'conditioned' ? 1 : 0) : 0);
}

export interface FamilyModel {
  readonly name: string; readonly total: number; readonly open: number; readonly on: boolean;
  readonly polymers: readonly { readonly name: string; readonly label: string; readonly total: number; readonly open: number; readonly on: boolean }[];
}

/** The families, each with its polymers, counted over the candidates every other requirement leaves, so a chip says how many a click would show. */
export function familiesOf(materials: Loose[], cs: Loose[], ctx: Loose): FamilyModel[] {
  // Counted over the candidates every other requirement leaves, so a chip says how many a click would show; the
  // rest of the rail counts every material, because its availability lines describe the data, not the query.
  const isFamilyFacet = (c: Loose) => c.kind === 'facet' && (c.facet === 'family' || c.facet === 'polymer');
  const eligible = new Set(runSelection(materials, cs.filter((c) => !isFamilyFacet(c)), ctx).candidates.map((e: Loose) => e.materialId));
  const famSel: string[] = find(cs, (c) => c.facet === 'family')?.in ?? [];
  const polySel: string[] | null = find(cs, (c) => c.facet === 'polymer')?.in ?? null;
  const families = new Map<string, { total: number; open: number; polymers: Map<string, { total: number; open: number }> }>();
  for (const m of materials) {
    const f = m.facets.family?.value ?? m.family;
    if (!families.has(f)) families.set(f, { total: 0, open: 0, polymers: new Map() });
    const e = families.get(f)!;
    e.total++;
    if (eligible.has(m.id)) e.open++;
    const p = m.facets.polymer?.value ?? `${f} › ${m.basePolymer}`;
    const pe = e.polymers.get(p) ?? { total: 0, open: 0 };
    pe.total++;
    if (eligible.has(m.id)) pe.open++;
    e.polymers.set(p, pe);
  }
  const ordered = [...families].sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]));
  return ordered.map(([name, e]) => ({
    name, total: e.total, open: e.open, on: famSel.includes(name),
    polymers: [...e.polymers].sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]))
      .map(([p, pe]) => ({ name: p, label: p.split(' › ').pop() ?? p, total: pe.total, open: pe.open, on: !!polySel?.includes(p) })),
  }));
}

/**
 * The fillers, counted over the materials: the facet's own classes, the fillers the materials table names (a box of its own, after the
 * facet's five: it had been counted with the undisclosed variants, OPEN-PROBLEMS §37.8), and the undisclosed ones. A requirement saved on
 * the facet before (reinforcement) shows as what it reads, its "undisclosed" ticking the named fillers too.
 */
export function fillersOf(materials: Loose[], cs: Loose[]): { readonly key: string; readonly label: string; readonly n: number; readonly on: boolean }[] {
  const filler = find(cs, (c) => c.facet === 'filler');
  const legacy = find(cs, (c) => c.facet === 'reinforcement');
  const counts: Record<string, number> = {};
  for (const m of materials) { const f = fillerOf(m); if (f) counts[f] = (counts[f] ?? 0) + 1; }
  const named = Object.keys(counts).filter(isNamedFiller).sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0) || fillerName(a).localeCompare(fillerName(b)));
  const sel = new Set([...(filler?.in ?? []), ...(legacy?.in ?? []), ...(legacy?.in?.includes(UNDISCLOSED) ? named : [])]);
  return [...FILLER_CLASSES, ...named, UNDISCLOSED].map((k) => ({ key: k, label: fillerName(k), n: counts[k] ?? 0, on: sel.has(k) }));
}

/** The H2C's print check: how many of the three gates are asked, and what each publishes (the rail's lines under each). */
export function printGatesOf(materials: Loose[], cs: Loose[]) {
  const asked: Record<string, boolean> = { nozzle: !!find(cs, (c) => c.gate === 'nozzle'), bed: !!find(cs, (c) => c.gate === 'bed'), chamber: !!find(cs, (c) => c.gate === 'chamber') };
  // A window the H2C reaches only at its bottom edge is on the line, unresolved; one it covers the low end of passes (D151).
  const edgeLine = (gate: string) => materials.filter((m) => m.gates[gate]?.verdict === 'edge').length;
  const gateLine = (gate: string): { text: string; edge: number } => {
    if (gate !== 'chamber') {
      const known = materials.filter((m) => m.gates[gate]?.verdict !== 'unknown').length;
      return { text: `${known} of ${materials.length} publish a ${gate} temperature`, edge: edgeLine(gate) };
    }
    // The chamber is answered by a temperature or in words, and the two are counted apart: "no heated chamber
    // needed" settles the question without being a number.
    const numeric = materials.filter((m) => m.print?.chamberC).length;
    const words = materials.filter((m) => !m.print?.chamberC && m.print?.chamberGuidance?.state === 'not-required').length;
    return { text: `${numeric} of ${materials.length} publish a chamber temperature; ${words} more say none is needed`, edge: edgeLine(gate) };
  };
  return { asked, check: printCheck(cs), lines: Object.fromEntries(['nozzle', 'bed', 'chamber'].map((g) => [g, gateLine(g)])) };
}

/** Which materials a property does not apply to, by family: "Flexible Elastomers 12". The registry's reason is a paragraph for the drawer; the rail names who is left out. */
const notApplicableTo = (materials: Loose[], key: string): string => {
  const fams = new Map<string, number>();
  for (const m of materials) if (m.headline?.[key]?.notApplicable) fams.set(m.family, (fams.get(m.family) ?? 0) + 1);
  return [...fams].sort((x, y) => y[1] - x[1]).map(([f, n]) => `${f} ${n}`).join(', ');
};

/** One numeric requirement's control: its labels, its availability line (with the caveat under it), its example, and the requirement it holds. */
export function numericsOf(group: string, materials: Loose[], cs: Loose[], db: Loose, ctx: Loose) {
  // With estimates on, the availability line also counts the materials an estimate stands in for.
  const estimatedFor = (key: string) => (ctx.showEstimates ? materials.filter((m) => { const h = m.headline?.[key]; return h && !h.known && !h.notApplicable?.rule && h.estimate; }).length : 0);
  return numericFilters().filter((x: Loose) => x.group === group).map((f: Loose) => {
    const c = find(cs, (x) => x.property === f.key);
    const a = availability(materials, f.key);
    const P = prop(f.key);
    const def = headlineDef(f.key);
    const extra: string | null = a.caveats
      ? `${a.caveats} of those ${a.withData} cite a source that states the standard but not the load`
      : def?.kind === 'price' ? `${priceSampleWords(db.meta)}.`
      : def?.appliesTo && a.notApplicable ? `Not applicable to ${a.notApplicable} material${a.notApplicable === 1 ? '' : 's'} (${notApplicableTo(materials, f.key)})` : null;
    const estimated = estimatedFor(f.key);
    return {
      key: String(f.key), op: String(f.op), example: String(f.eg), requirement: c, P,
      avail: `${a.withData} of ${a.total} have data${estimated ? `, ${estimated} more estimated` : ''}`, caveat: extra,
    };
  });
}

/** The words about the H2C's status values: one line each, joined (the rail's "?" explains them). */
export const statusMeanings = (): string => H2C_STATUSES.map((st) => `${H2C_STATUS[st].label}: ${H2C_STATUS[st].meaning}`).join(' ');
