// A gate across several print profiles: a material's (compile.js), and since the re-center a product's own
// (products.js), which is the one that will decide (docs/GOALS.md).

/**
 * The gate across a set of print profiles.
 *
 * Precedence: within > within-low-end > edge > exceeds-recommended > exceeds > unknown.
 *
 * "within" wins because a printable grade existing is what the question asks. The part that needs
 * care is that a known exceedance must outrank an unknown: PEEK carries two profiles demanding a
 * 390-430 and a 400-480 C nozzle against the H2C's 350 C, plus one profile that publishes nothing.
 * Letting the silent profile decide would report PEEK as "unknown" and throw away the evidence that
 * it is out of envelope. Silence is not counter-evidence.
 *
 * "within-low-end" (D151) sits just below "within": the H2C covers the bottom of the maker's window, at least 5 °C of
 * it, which is a pass, flagged. "edge" is next: it reaches only the window's bottom, which is on the line. Both are better
 * than a window the printer misses entirely, and a recommendation above the H2C (D6) is better than a requirement.
 */
export const GATE_PRECEDENCE = ['within', 'within-low-end', 'edge', 'exceeds-recommended', 'exceeds', 'unknown'];

// Among windows the H2C reaches the bottom of, the one it covers most; then the smallest overshoot.
const covers = (a, b) => ((a.overlap ?? -Infinity) > (b.overlap ?? -Infinity)
  || ((a.overlap ?? -Infinity) === (b.overlap ?? -Infinity) && (a.over ?? Infinity) <= (b.over ?? Infinity)) ? a : b);

export function aggregateGate(profiles, axis) {
  if (!profiles.length) return { verdict: 'unknown', reason: 'No print profile recorded' };
  const vs = profiles.map((p) => p.gates[axis]);

  for (const verdict of GATE_PRECEDENCE) {
    const matches = vs.filter((v) => v.verdict === verdict);
    if (!matches.length) continue;
    // Among several exceedances, report the smallest overshoot: it is the closest to printable. Among windows the H2C
    // reaches the bottom of, the one it covers most. Among unknowns, a source that said something in words
    // ("recommended", "-") explains more than one that said nothing, so it supplies the reason.
    const chosen = verdict === 'exceeds'
      ? matches.reduce((a, b) => ((a.over ?? Infinity) <= (b.over ?? Infinity) ? a : b))
      : verdict === 'within-low-end' || verdict === 'edge' ? matches.reduce(covers)
      : verdict === 'unknown' ? (matches.find((v) => v.categorical) ?? matches[0])
      : matches[0];
    const silent = vs.filter((v) => v.verdict === 'unknown').length;
    // The profile the reason was read from, and its product: a material's gate is one product's window, which its
    // other products' own gates need not share (compile.js names it).
    const from = profiles[vs.indexOf(chosen)];
    return {
      ...chosen,
      profileId: from.id ?? null,
      gradeId: from.gradeId ?? null,
      profiles: vs.length,
      ...(vs.length > 1 ? { basis: `${matches.length} of ${vs.length} profiles` } : {}),
      ...(silent && verdict !== 'unknown' ? { unpublishedProfiles: silent } : {}),
    };
  }
  return { verdict: 'unknown', reason: 'No print profile recorded' };
}

/**
 * Whether drying is asked for, across a set of print profiles (D127): the strongest of what they say. A profile that asks
 * for it decides over one that advises it for a condition, and that over one that says it is not needed; silence is
 * 'unknown'.
 */
export function aggregateDrying(profiles) {
  for (const need of ['required', 'optional', 'not-needed']) if (profiles.some((p) => p.drying.need === need)) return need;
  return 'unknown';
}
