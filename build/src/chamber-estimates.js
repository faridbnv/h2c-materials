// Estimated chamber bands: what the 2026-09-13 research inferred for materials whose sources
// publish no chamber temperature.
//
// These differ from the property estimates of build/src/estimate/ in two ways, and both matter.
//
// They are authored, not computed. A researcher chose each band from peer profiles, so they live in
// data/tables/chamber_bands.csv, one row per material by MaterialID, with the basis and caution the
// research wrote. The build does not re-derive them.
//
// They never decide anything. A property estimate may screen a material out of a requirement its
// plausible range wholly fails (D43). A chamber band cannot, because the most it could ever describe is a
// plausible setpoint, and a setpoint is a recommendation: D6 already says a recommendation never
// removes a candidate. So a band is shown beside the chamber question and changes no verdict.
//
// A band is attached only where nothing better exists. A published numeric window supersedes it,
// and so does a source saying no heated chamber is needed. A categorical "recommended" or "no
// setpoint" does not: the band is shown beside it, never instead of it.

/**
 * The bands as the attaching logic reads them, from chamber_bands.csv: consecutive rows with the same band
 * form one band, in table order, and no-band rows record materials deliberately given none.
 */
export function chamberBandsFromTables(wb) {
  const nameOf = new Map(wb.Materials.rows.map((m) => [m.MaterialID, m['Original name']]));
  const out = { source: null, bands: [], noBand: {} };
  for (const r of wb['Chamber bands'].rows) {
    out.source ??= r.Source;
    if (r.Kind === 'no-band') { out.noBand[nameOf.get(r.MaterialID)] = r.Basis; continue; }
    const caution = r.Caution === 'Not applicable' ? undefined : r.Caution;
    const last = out.bands.at(-1);
    const lo = Number(r['Low °C']), hi = Number(r['High °C']);
    if (last && last.lo === lo && last.hi === hi && last.basis === r.Basis && last.caution === caution) last.materials.push(nameOf.get(r.MaterialID));
    else out.bands.push({ lo, hi, basis: r.Basis, ...(caution ? { caution } : {}), materials: [nameOf.get(r.MaterialID)] });
  }
  return out;
}

/**
 * @param materials compiled materials, with `print.chamberC` and `print.chamberGuidance` already set
 * @returns {{ applied: object[], superseded: object[], issues: object[] }}
 */
export function attachChamberEstimates(materials, bands) {
  const byName = new Map(materials.map((m) => [m.name, m]));
  const applied = [], superseded = [], issues = [];
  const seen = new Set();

  for (const band of bands.bands) {
    if (!(band.lo < band.hi)) issues.push({ level: 'error', code: 'CHAMBER-BAND', where: 'chamber_bands.csv', message: `Band ${band.lo}-${band.hi} °C is not a range` });
    if (!band.basis) issues.push({ level: 'error', code: 'CHAMBER-BAND', where: 'chamber_bands.csv', message: `Band ${band.lo}-${band.hi} °C does not say where it came from` });

    for (const name of band.materials) {
      const m = byName.get(name);
      if (!m) { issues.push({ level: 'error', code: 'CHAMBER-BAND', where: 'chamber_bands.csv', message: `"${name}" is not a material in the snapshot` }); continue; }
      if (seen.has(name)) { issues.push({ level: 'error', code: 'CHAMBER-BAND', where: 'chamber_bands.csv', message: `"${name}" is listed in more than one band` }); continue; }
      seen.add(name);
      if (m.excluded) { issues.push({ level: 'error', code: 'CHAMBER-BAND', where: 'chamber_bands.csv', message: `"${name}" is outside the H2C scope and must not carry a band` }); continue; }

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
    if (!byName.has(name)) issues.push({ level: 'error', code: 'CHAMBER-BAND', where: 'chamber_bands.csv', message: `"${name}" in noBand is not a material in the snapshot` });
  }
  return { applied, superseded, issues };
}
