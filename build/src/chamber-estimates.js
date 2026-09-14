// Estimated chamber bands: what the 2026-09-13 research inferred for materials whose sources
// publish no chamber temperature.
//
// These differ from the property estimates in estimates.js in two ways, and both matter.
//
// They are authored, not computed. A researcher chose each band from peer profiles, so they live in
// build/mappings/chamber-estimates.json, reviewed like code, with the basis and caution the research
// wrote. The build does not re-derive them.
//
// They never decide anything. A property estimate may screen a material out of a requirement its
// plausible range wholly fails (D43). A chamber band cannot, because the most it could ever describe is a
// plausible setpoint, and a setpoint is a recommendation: D6 already says a recommendation never
// removes a candidate. So a band is shown beside the chamber question and changes no verdict.
//
// A band is attached only where nothing better exists. A published numeric window supersedes it,
// and so does a source saying no heated chamber is needed. A categorical "recommended" or "no
// setpoint" does not: the band is shown beside it, never instead of it.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
export const CHAMBER_BANDS = JSON.parse(readFileSync(join(here, '../mappings/chamber-estimates.json'), 'utf8'));

/**
 * @param materials compiled materials, with `print.chamberC` and `print.chamberGuidance` already set
 * @returns {{ applied: object[], superseded: object[], issues: object[] }}
 */
export function attachChamberEstimates(materials, bands = CHAMBER_BANDS) {
  const byName = new Map(materials.map((m) => [m.name, m]));
  const applied = [], superseded = [], issues = [];
  const seen = new Set();

  for (const band of bands.bands) {
    if (!(band.lo < band.hi)) issues.push({ level: 'error', code: 'CHAMBER-BAND', where: 'chamber-estimates.json', message: `Band ${band.lo}-${band.hi} °C is not a range` });
    if (!band.basis) issues.push({ level: 'error', code: 'CHAMBER-BAND', where: 'chamber-estimates.json', message: `Band ${band.lo}-${band.hi} °C does not say where it came from` });

    for (const name of band.materials) {
      const m = byName.get(name);
      if (!m) { issues.push({ level: 'error', code: 'CHAMBER-BAND', where: 'chamber-estimates.json', message: `"${name}" is not a material in the snapshot` }); continue; }
      if (seen.has(name)) { issues.push({ level: 'error', code: 'CHAMBER-BAND', where: 'chamber-estimates.json', message: `"${name}" is listed in more than one band` }); continue; }
      seen.add(name);
      if (m.excluded) { issues.push({ level: 'error', code: 'CHAMBER-BAND', where: 'chamber-estimates.json', message: `"${name}" is outside the H2C scope and must not carry a band` }); continue; }

      const guidance = m.print?.chamberGuidance?.state;
      const reason = m.print?.chamberC ? `publishes ${m.print.chamberC.min}-${m.print.chamberC.max} °C`
        : guidance === 'not-required' ? 'a source says no heated chamber is needed'
        : null;
      if (reason) { superseded.push({ material: name, band: `${band.lo}-${band.hi} °C`, reason }); continue; }

      m.print.chamberEstimate = {
        lo: band.lo, hi: band.hi, unit: '°C', basis: band.basis, caution: band.caution ?? null,
        source: bands.source, alongside: guidance ?? null,
      };
      applied.push({ material: name, band: `${band.lo}-${band.hi} °C`, alongside: guidance ?? null });
    }
  }
  for (const name of Object.keys(bands.noBand ?? {})) {
    if (!byName.has(name)) issues.push({ level: 'error', code: 'CHAMBER-BAND', where: 'chamber-estimates.json', message: `"${name}" in noBand is not a material in the snapshot` });
  }
  return { applied, superseded, issues };
}
