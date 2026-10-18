// The chamber a kind of plastic needs (data/tables/chamber_need.csv, D151): what a product's silence about the chamber
// means, read from the makers of its kind who do state one.
//
// Most products' sheets, their twins' and their material's printer maker's guide say nothing about a heated chamber, and
// such a product was unknown on the chamber however its kind is printed: of the makers of PLA who state a chamber, none
// asks above the H2C's 65 °C. A row of chamber_need.csv names a kind of plastic by the registry's Applies-to grammar
// ("Family: PLA") and says what silence means for it: `within`, the H2C's chamber is enough, or `unknown`. The build
// counts, for each row, the distinct makers whose own sheet (or its twin's) states a chamber for a product of the kind,
// and how many of them ask above 65 °C; a `within` row needs at least MIN_MAKERS stating and at most one in ten asking
// above, and the build stops when the data no longer support it (CHAMBER-NEED-DRIFT). Nothing is stored that the build
// can count.
//
// Only a `deciding` row decides, and only for a chamber that is truly silent: no reading, no words the parser could not
// read and no enclosure statement on the product's own sheets, its twin's or its guide's (products.js speaksTo). A chamber
// "recommended" with no temperature, a sheet's "-" and an enclosure asked for with no temperature have spoken, and stay
// unknown (the owner's ruling of 2026-10-05). The nozzle and the bed are never filled. A `reported` row only reports: the
// mechanism lands with every row reported, and each row is switched to deciding in a commit of its own.
//
// It runs after the estimate stage (pipeline.js): the frozen stage validates its product screening on the products whose
// own sheets, twins or guide settle all three printer checks (estimate/product-screening.js), and a chamber read from
// its kind is not one of them until that stage is reopened (screening build, stage 4).

import { parseAppliesTo, applies } from './registry.js';
import { speaksTo } from './products.js';
import { chamberBandsFromTables } from './chamber-estimates.js';
import { H2C_BASELINE } from './normalize/process.js';

export const CHAMBER_NEED = {
  // At least this many distinct makers must state a chamber for a kind of plastic before its silence can mean "within".
  MIN_MAKERS: 10,
  // And at most one in ten of them may ask above the H2C's chamber (a window it reaches only at its edge, or none of).
  MAX_ABOVE_TENTHS: 1,
};

// A chamber stated: a temperature or a window, "not required" (or no enclosure needed), room temperature, or an enclosure
// that the H2C's heated chamber is (D90, D93). "Recommended" with no temperature and a sheet's "-" are not.
const STATING = new Set(['range', 'not-required', 'ambient', 'enclosed']);
// A maker asks above 65 °C where its chamber, under D151, is on the line or beyond the H2C, required or recommended.
const ABOVE = new Set(['edge', 'exceeds', 'exceeds-recommended']);

const maker = (g) => String(g.manufacturer ?? '').trim().toLowerCase();
/** A kind of plastic as a sentence names it: the values its rule's first clause names ("PLA", "Nylon / Polyamide"). */
const kindName = (rule) => (rule.appliesTo?.[0]?.values ?? []).join(' or ') || rule.id;

/** The rows of chamber_need.csv, their Applies to parsed against the materials (an unknown field or value is an error). */
export function compileChamberNeed(rows, { materialRows, issues }) {
  return rows.map((r) => ({
    id: r.RuleID,
    appliesTo: parseAppliesTo(r['Applies to'], `chamber_need ${r.RuleID}`, issues, materialRows),
    appliesToText: r['Applies to'],
    verdict: r.Verdict,
    status: r.Status,
    reviewedBy: r['Reviewed by'],
    reason: r.Reason,
  }));
}

/**
 * What the makers of a kind of plastic state about the chamber: the materials the rule names (family entries left out),
 * their products (active, procurement, not a declared variant: a variant is not the kind, as for the guide, D129), and
 * among those the distinct makers whose own sheet or twin's states a chamber, and those of them that ask above 65 °C.
 * `qualifies` says whether the data support a `within` row.
 */
export function chamberNeedStats(rule, { materials, materialRowById, gradeById }) {
  const matched = materials.filter((m) => !m.familyEntry && materialRowById.get(m.id) && applies(rule.appliesTo, materialRowById.get(m.id)));
  const products = matched.flatMap((m) => m.gradeIds.map((id) => gradeById.get(id)).filter((g) => g && !g.retired && !g.variant));
  const stating = new Map();
  for (const g of products) {
    const c = g.print?.chamber;
    const origin = g.print?.from?.chamber?.origin;
    // The maker's own sheet, or the sheet its twin prints (D89): never the guide's word, nor a kind's own default.
    if (!c || !STATING.has(c.state) || (origin && origin !== 'twin')) continue;
    const k = maker(g);
    const m = stating.get(k) ?? { name: String(g.manufacturer).trim(), products: [], above: [] };
    m.products.push(g.id);
    if (ABOVE.has(c.verdict)) m.above.push(g.id);
    stating.set(k, m);
  }
  const makers = stating.size;
  const above = [...stating.values()].filter((m) => m.above.length);
  return {
    materials: matched.map((m) => m.id),
    products: products.length,
    makers,
    above: above.length,
    aboveMakers: above.map((m) => ({ maker: m.name, gradeIds: m.above })).sort((a, b) => a.maker.localeCompare(b.maker)),
    qualifies: makers >= CHAMBER_NEED.MIN_MAKERS && above.length * 10 <= makers * CHAMBER_NEED.MAX_ABOVE_TENTHS,
  };
}

/** The label a filled chamber carries, with the counts: "No chamber stated; of the 41 makers of PLA who state one, none asks above 65 °C". */
export function chamberNeedLabel(rule, stats) {
  const limit = H2C_BASELINE.chamberC;
  const asks = stats.above === 0 ? 'none asks' : stats.above === 1 ? '1 asks' : `${stats.above} ask`;
  return `No chamber stated; of the ${stats.makers} makers of ${kindName(rule)} who state one, ${asks} above ${limit} °C`;
}

/**
 * Whether a product's chamber is truly silent: nothing read from its own sheets, its twin's or its guide (`from` names
 * none for the chamber), and nothing its own sheets say about the chamber or an enclosure, in words the parser could not
 * read included. A product with no recipe at all is not filled: no sheet of its was read for printing.
 */
function silent(g, profileById) {
  const p = g.print;
  if (!p || p.chamber?.verdict !== 'unknown' || p.chamber.state !== 'unknown' || p.from?.chamber) return false;
  if (!p.profileIds.length && !p.from?.nozzle && !p.from?.bed) return false;
  return !speaksTo(p.profileIds.map((id) => profileById.get(id)).filter(Boolean), 'chamber');
}

/**
 * Every row's counts and checks, and, for a `deciding` row whose verdict is `within`, its products' truly silent chambers
 * read as within, `from.chamber` saying so (origin `family`). Writes `db.chamberNeed`. Returns the issues.
 */
export function attachChamberNeed(db, wb, { materialRows }) {
  const issues = [];
  const rules = compileChamberNeed(wb['Chamber need']?.rows ?? [], { materialRows, issues });
  const materialRowById = new Map(materialRows.map((r) => [r.MaterialID, r]));
  const gradeById = new Map(db.grades.map((g) => [g.id, g]));
  const profileById = new Map(db.profiles.map((p) => [p.id, p]));
  const bands = chamberBandsFromTables(wb).bands.filter((b) => b.lo > H2C_BASELINE.chamberC);
  const ctx = { materials: db.materials, materialRowById, gradeById };
  const stats = new Map(rules.map((rule) => [rule.id, chamberNeedStats(rule, ctx)]));
  const where = (rule) => `chamber_need ${rule.id}`;

  // One kind of plastic per material: two rows naming one material would say two things about one silence.
  const ruleOf = new Map();
  for (const rule of rules) {
    for (const id of stats.get(rule.id).materials) {
      if (ruleOf.has(id)) issues.push({ level: 'error', code: 'CHAMBER-NEED-OVERLAP', where: where(rule), message: `${id} is named by ${ruleOf.get(id)} too; one row speaks for a material` });
      else ruleOf.set(id, rule.id);
    }
  }
  for (const rule of rules) {
    const s = stats.get(rule.id);
    const counts = `${s.makers} makers state a chamber, ${s.above} ask above ${H2C_BASELINE.chamberC} °C`;
    if (!s.materials.length) issues.push({ level: 'error', code: 'CHAMBER-NEED-DRIFT', where: where(rule), message: 'names no material' });
    else if (rule.verdict === 'within' && !s.qualifies) {
      issues.push({ level: 'error', code: 'CHAMBER-NEED-DRIFT', where: where(rule), message: `is within, but ${counts}; within needs at least ${CHAMBER_NEED.MIN_MAKERS} makers and at most one in ten above` });
    } else if (rule.status === 'reported' && s.qualifies) {
      issues.push({ level: 'info', code: 'CHAMBER-NEED-READY', where: where(rule), message: `is reported, and the data would support a deciding within row: ${counts}` });
    }
    if (rule.verdict !== 'within') continue;
    for (const b of bands) {
      for (const id of b.materials.filter((x) => s.materials.includes(x))) {
        issues.push({ level: 'error', code: 'CHAMBER-NEED-BAND-CONFLICT', where: where(rule), message: `is within, but ${id}'s researched chamber band, ${b.lo}–${b.hi} °C, lies wholly above ${H2C_BASELINE.chamberC} °C` });
      }
    }
  }

  for (const rule of rules) {
    const s = stats.get(rule.id);
    s.filled = 0;
    if (rule.status !== 'deciding' || rule.verdict !== 'within' || !s.qualifies) continue;
    const label = chamberNeedLabel(rule, s);
    for (const id of s.materials) {
      for (const g of db.materials.find((m) => m.id === id).gradeIds.map((x) => gradeById.get(x))) {
        if (!g || g.retired || g.variant || !silent(g, profileById)) continue;
        g.print.chamber = { ...g.print.chamber, verdict: 'within', reason: label, profileId: null };
        g.print.from = { ...(g.print.from ?? {}), chamber: { origin: 'family', ruleId: rule.id, label } };
        s.filled++;
      }
    }
  }
  db.chamberNeed = rules.map((rule) => {
    const { qualifies, ...s } = stats.get(rule.id);
    return { id: rule.id, appliesTo: rule.appliesToText, verdict: rule.verdict, status: rule.status, reviewedBy: rule.reviewedBy, reason: rule.reason, qualifies, ...s };
  });
  return issues;
}

