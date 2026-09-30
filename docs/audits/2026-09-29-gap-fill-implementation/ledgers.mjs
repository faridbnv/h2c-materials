// The admission ledgers of the gap-fill tranche: every research finding, price target and estimate disposition of the
// package GAP-FILL-RESEARCH-2026-09-28, each with the outcome it has in this repository and why. They are written from
// the package and from the tables as they stand, so a re-run after the data moves says what moved.
//
//   node docs/audits/2026-09-29-gap-fill-implementation/ledgers.mjs [research root]
//
// Outcomes (the handoff's): ADMIT, ALREADY_RECORDED, CONTEXT_ONLY, CONFLICT, STALE_SOURCE, NO_MEASURABLE_BENEFIT,
// NEEDS_REVIEW. The research's GF-* identifiers are its finding IDs, not record IDs; the records they became are named.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvText, readCsv } from '../../../build/src/csv.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');
const research = process.argv[2] ?? '/Users/farid/Documents/H2C-v2.1-Review-2026-09-27/GAP-FILL-RESEARCH-2026-09-28';
if (!existsSync(join(research, 'injection-manifest.json'))) { console.error(`no research package at ${research}`); process.exit(2); }
const table = (n) => readCsv(join(root, 'data/tables', `${n}.csv`)).records.map((r) => r.values);
const sources = new Map(table('sources').map((s) => [s.SourceID, s]));
const measurements = table('measurements');
const profiles = new Map(table('profiles').map((p) => [p.ProfileID, p]));
const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));

const findings = ['PL-001', 'RB-043', 'RB-036'].flatMap((b) => readFileSync(join(research, 'research', b, 'findings.jsonl'), 'utf8').trim().split('\n').map((l) => ({ batch: b, ...JSON.parse(l) })));

// What became of each finding here. `src` is the registered source the fact now cites; `records` the rows it wrote.
const nanovia = (g) => `The registered page ${g} (read 2026-09-26) prints the same line, so the fact is recorded from it; the research's later copy of that URL, whose text differs only in the site's related-product carousel, is not registered as a second revision.`;
const ESUN_PAGE = 'S-ESUN-PRINT-20260928-333834d1b9db';
const esun = 'The page b39 registered on 2026-09-28 (same URL) prints the same label and value; the research\'s later copy is not registered. Direction as labelled; specimen, standard, moisture and treatment not stated.';
const nobufil = 'The registered sheet (same digest). Column read on the rendered page image: FDM H is printed, Injection moulded; the sheet does not define H, so the printed value states no usable direction.';
const b40 = 'Batch b40 (m226): the research\'s saved copy staged by digest and registered; drying only, typed by the build\'s parser as every profile is.';
const OUT = {
  'GF-PL001-0011': ['CONTEXT_ONLY', null, '', 'HDT "155" is printed with an unexplained "10/10" and no load; the sheet\'s 0.45 MPa is not transferable to the page. Not recorded.'],
  'GF-PL001-0020': ['ADMIT', 'R-3DJAKE-3DJAKE-PCTG-CF-tech-data', 'V008864 (Specimen type, Specimen / print parameters)', 'The page image prints 72 under FDM H, not Injection as m128 read it; corrected with its expected old value. The other twelve Nobufil sheets\' single HDT values stand under Injection (checked), as m128 has them.'],
  'GF-PL001-0022': ['ADMIT', 'R-NANOVIA-TPE-22D', 'P1161 (Drying)', 'Registered page (same digest) prints the drying sentence; filled on the profile that cites it.'],
  'GF-PL001-0023': ['ADMIT', 'R-EXTRUDR-PRINT-20260929-3793d04515ce', 'P1310', b40],
  'GF-PL001-0024': ['ADMIT', 'R-EXTRUDR-PRINT-20260928-83ec5c0b3125', 'P1297 (Drying)', 'The page b39 registered for this product (the /en/inlt/ storefront of the same page) prints the same 65 °C, 8–12 h; filled on the profile that cites it. The research\'s /en/at/ copy is not registered.'],
  'GF-PL001-0025': ['ADMIT', 'S-ESUN-PRINT-20260928-c7b961702f53', 'P1306; sources Citation role corroboration → cited', 'The page b39 registered (same URL) prints the drying conditions and the AMS advice; a drying and AMS profile now cites it.'],
  'GF-PL001-0026': ['ADMIT', 'R-RECREUS-PRINT-20260929-5fe4f7191bfc', 'P1313', `${b40} Nozzle 250 °C from the 0.4 mm row; the bed (small parts unheated, large parts 50-55 °C), which the research left out and its reviewer said the page prints, is recorded too.`],
  'GF-PL001-0027': ['CONFLICT', null, '', 'Spectrum\'s current shop body calls the bio-based product "Bio-Based Copolyester (PLA-Free)", against m223\'s PLA-blend filing from its category page. An identity question for the owner or the maker (OPEN-PROBLEMS §14); nothing is refiled.'],
  'GF-PL001-0028': ['CONTEXT_ONLY', null, '', 'A 3D4Makers-branded filament of the same compound name is not LEHVOSS G148-01; no price or product transfers.'],
  'GF-PL001-0029': ['CONTEXT_ONLY', null, '', 'The FormFutura PDF is Helios Support\'s sheet (already registered as S-PET-TDS-Helios-Support); it names Crystal Flex only as an adhesion partner.'],
  'GF-RB043-0001': ['ADMIT', 'R-NANOVIA-PA-Food-Industry', 'P1172 (Drying)', nanovia('R-NANOVIA-PA-Food-Industry')],
  'GF-RB043-0002': ['ADMIT', 'R-NANOVIA-Flex-B4C', 'P1183 (Drying)', nanovia('R-NANOVIA-Flex-B4C')],
  'GF-RB043-0003': ['ADMIT', 'R-NANOVIA-Flex-VX', 'P1184 (Drying)', nanovia('R-NANOVIA-Flex-VX')],
  'GF-RB043-0004': ['ADMIT', 'R-NANOVIA-Flex', 'P1186 (Drying)', `${nanovia('R-NANOVIA-Flex')} 100 °C for a flexible filament is what the page prints (the sentence of Nanovia's PA pages); recorded as printed.`],
  'GF-RB043-0005': ['ADMIT', 'R-NANOVIA-ISTROFLEX', 'P1191 (Drying)', nanovia('R-NANOVIA-ISTROFLEX')],
  'GF-RB043-0008': ['NEEDS_REVIEW', null, '', 'Held as the research held it: "Tensile resistance 27 MPa VDE282 part 10" has no faithful property or standard in the vocabulary (OPEN-PROBLEMS §11, stresses at a stated elongation). Not filed as a tensile strength.'],
  'GF-RB036-0001': ['ADMIT', 'R-EXTRUDR-PRINT-20260929-5f1378a7bff2', 'P1312', b40],
  'GF-RB036-0002': ['ADMIT', 'R-EXTRUDR-PRINT-20260929-af22746e0274', 'P1314', `${b40} "0–6 h" is typed 6 h, the end the parser reads, as the 172 other profiles with a range are.`],
  'GF-RB036-0003': ['ADMIT', 'R-EXTRUDR-PRINT-20260928-526b472f69cc', 'P1291 (Drying)', 'The page b39 registered for this product (/en/inlt/) prints the same 60 °C, 10 h; filled on the profile that cites it.'],
  'GF-RB036-0004': ['ADMIT', 'D-EXTRUDR-FLEX-MEDIUM-MATT-PAGE', 'P1307; sources Citation role corroboration → cited', 'The page registered on 2026-09-26 (/en/se/ storefront) prints the same 60 °C, 12 h; a drying profile now cites it.'],
  'GF-RB036-0005': ['ADMIT', 'R-EXTRUDR-PRINT-20260929-c415150859a4', 'P1315', b40],
  'GF-RB036-0006': ['ADMIT', 'R-EXTRUDR-PRINT-20260929-245381f760f8', 'P1308', b40],
  'GF-RB036-0007': ['ADMIT', 'R-EXTRUDR-PRINT-20260929-ca0239ac2a92', 'P1316', b40],
  'GF-RB036-0008': ['CONFLICT', null, '', 'Held: the page\'s FAQ says 6 hours at 60 °C and its settings table 12 h; the catalogue prints 6 h. Not averaged; a question for Extrudr (OPEN-PROBLEMS §12).'],
  'GF-RB036-0009': ['ADMIT', 'R-EXTRUDR-PRINT-20260929-2cccd500d85c', 'P1309', b40],
  'GF-RB036-0010': ['ADMIT', 'R-EXTRUDR-PRINT-20260929-463457967aab', 'P1311', `${b40} "0–4 h" is typed 4 h, the end the parser reads.`],
};
// Measurements m225 wrote, found by the finding its Notes name.
const byFinding = new Map();
for (const m of measurements) { const f = /\((GF-[A-Z0-9]+-\d{4}), the gap-fill research/.exec(m.Notes)?.[1]; if (f) byFinding.set(f, [...(byFinding.get(f) ?? []), m]); }

const rows = [];
for (const f of findings) {
  const src = f.source_refs?.[0] ?? {};
  let [outcome, sourceId, records, reason] = OUT[f.finding_id] ?? [];
  const written = byFinding.get(f.finding_id);
  if (!outcome && written) {
    const m = written[0];
    outcome = 'ADMIT'; sourceId = m.SourceID; records = written.map((x) => x.MeasurementID).join('; ');
    reason = m.SourceID === ESUN_PAGE ? esun : m.SourceID.startsWith('R-3DJAKE') ? nobufil : m.SourceID.startsWith('R-NANOVIA') ? nanovia(m.SourceID) : 'Recorded from the registered source.';
  }
  if (!outcome) throw new Error(`${f.finding_id} has no outcome`);
  const s = sourceId ? sources.get(sourceId) : null;
  rows.push({
    FindingID: f.finding_id, Batch: f.batch, Type: f.type, MaterialID: f.material_id, GradeID: f.grade_id, 'Research outcome': f.outcome,
    'Research review': f.review?.status ?? '', Outcome: outcome,
    'Research SHA256': (f.source_refs ?? []).map((r) => r.sha256).join('; '), 'Research locator': src.locator ?? '',
    'Admitted SourceID': sourceId ?? '', 'Admitted SHA256': s?.SHA256 ?? '', Records: records ?? '',
    Migration: outcome === 'ADMIT' ? (/PRINT-20260929/.test(sourceId ?? '') ? 'm226-batch-b40' : 'm225-gap-fill-registered-sources') : '',
    'GOALS step': f.type === 'measurement' || f.type === 'correction' ? 'steps 2, 5 (C3, C6)' : f.type === 'profile' ? 'step 5 (C9, C10)' : f.type === 'price' ? 'step 6' : 'step 2 (C2)',
    Reason: reason,
  });
}
rows.push({ FindingID: 'none (P1287)', Batch: 're-read', Type: 'profile', MaterialID: 'M156', GradeID: 'G156-01', 'Research outcome': 'not a finding', 'Research review': '', Outcome: 'ADMIT',
  'Research SHA256': '', 'Research locator': '', 'Admitted SourceID': ESUN_PAGE, 'Admitted SHA256': sources.get(ESUN_PAGE).SHA256, Records: 'P1287 (Drying)', Migration: 'm225-gap-fill-registered-sources',
  'GOALS step': 'step 5 (C9, C10)', Reason: 'Found on re-reading the page for GF-PL001-0001 to 0010: the line b39 took P1287\'s enclosure from, "Dry at70℃/>12h，use a hardened steel nozzle，enclosed-chamber printing", also states the drying. Typed 70 °C, 12 h (the bound the parser reads).' });
writeFileSync(join(here, 'ADMISSION.csv'), csvText(Object.keys(rows[0]), rows));

// Prices: the 136 frozen targets. None enters here; each says why (README, "Prices").
const obs = new Map();
for (const d of readdirSync(join(research, 'research'))) {
  const p = join(research, 'research', d, 'foreign-price-observations.csv');
  if (existsSync(p)) for (const r of readCsv(p).records.map((x) => x.values)) obs.set(r.ObservationID, r);
}
const priced = new Set(db.materials.filter((m) => m.headline?.priceCADkg?.value != null).map((m) => m.id));
const PRICE_FILE = join(here, 'PRICE-RECHECK.csv');
const recheck = existsSync(PRICE_FILE) ? new Map(readCsv(PRICE_FILE).records.map((r) => [r.values.ObservationID, r.values])) : new Map();
const priceRows = JSON.parse(readFileSync(join(research, 'price-target-dispositions.json'), 'utf8')).map((t) => {
  const os = t.ObservationIDs.map((id) => obs.get(id)).filter(Boolean);
  const currencies = [...new Set(os.map((o) => o.Currency))].join('; ');
  const taxes = [...new Set(os.map((o) => o.TaxBasis))].join('; ');
  // An offer the page shows sold out, back-ordered or on request is not a current offer: the existing contract does not
  // count one (Eligible for median FALSE, as CA0022 and CA0066). A stock the page does not state leaves it open.
  const inStock = (o) => !/out ?of ?stock|soldout|backorder|upon request|inquiry required|unavailable|conflict/i.test(o.Stock);
  const usable = os.filter(inStock);
  let outcome, reason;
  if (t.Outcome === 'OUT_OF_SCOPE_NO_PROCUREMENT_PRODUCT') { outcome = 'CONTEXT_ONLY'; reason = 'No procurement product to price.'; }
  else if (t.Outcome === 'BOUNDED_NO_USABLE_SELECTED_OFFER') { outcome = 'CONTEXT_ONLY'; reason = 'The research\'s bounded search found no usable selected offer; kept as its record.'; }
  else if (t.Outcome === 'CONTEXT_ONLY_BOUNDED_NO_COMPARABLE_OFFER') { outcome = 'CONTEXT_ONLY'; reason = 'Price context only (tax, sale-only, identity, selection or package limits); never a regular comparator.'; }
  else if (priced.has(t.MaterialID)) { outcome = 'NO_MEASURABLE_BENEFIT'; reason = `The material already has a comparable price (sampled 2026-09-10); a ${currencies} offer is a refresh or a second seller, which GOALS (phase 6, decision 3) leaves to the refresh routine that comes with the team layer. No coverage gained.`; }
  else if (!usable.length) { outcome = 'CONTEXT_ONLY'; reason = `Stock "${os.map((o) => o.Stock).join('; ')}" when captured: not a current offer, which the existing contract does not count either (Eligible for median FALSE).`; }
  else if (usable.every((o) => o.Currency === 'CAD')) { outcome = 'NEEDS_REVIEW'; reason = 'A Canadian offer the existing CAD contract could hold, held for the rendered selected-offer recheck the research could not make.'; }
  else if (usable.every((o) => /included-rate-unknown|not-stated/.test(o.TaxBasis))) { outcome = 'CONTEXT_ONLY'; reason = `Tax ${taxes}: 04-PRICES keeps a price whose tax cannot be separated as a labelled hint, never a regular comparator; and a ${currencies} amount needs the currency contract, not built (README, "Prices").`; }
  else { outcome = 'NEEDS_REVIEW'; reason = `A ${currencies} offer, tax ${taxes}: comparable only through the currency, market and tax contract of 04-PRICES, which this tranche does not build (README, "Prices"). Held with its research evidence.`; }
  const r = t.ObservationIDs.map((id) => recheck.get(id)).filter(Boolean);
  if (r.length) reason += ` Rendered recheck ${r[0]['Checked on']}: ${r.map((x) => x.Result).join('; ')}.`;
  return { TaskID: t.TaskID, MaterialID: t.MaterialID, 'Requested GradeID': t.RequestedGradeID, 'Research outcome': t.Outcome, Observations: t.ObservationIDs.join('; '),
    Currencies: currencies, 'Tax basis': taxes, 'Material priced now': priced.has(t.MaterialID) ? 'yes' : 'no', Outcome: outcome, 'GOALS step': 'step 6', Reason: reason };
});
writeFileSync(join(here, 'PRICES.csv'), csvText(Object.keys(priceRows[0]), priceRows));

// Estimates: the 203 dispositions. The model is unchanged; what each cell is now is read from the build.
const estRows = JSON.parse(readFileSync(join(research, 'estimates/target-dispositions.json'), 'utf8')).map((t) => {
  const h = db.materials.find((m) => m.id === t.MaterialID)?.headline?.[t.Headline];
  const now = h?.value != null ? `published: ${h.value}` : h?.estimate ? `estimated (${h.estimate.precision ?? 'no precision'})` : h?.notApplicable || h?.missing === 'not-applicable' ? 'not applicable' : 'no value, no estimate';
  const outcome = t.Disposition === 'REPLACED_BY_PUBLISHED_PRODUCT_ROLLUP' ? (h?.value != null ? 'ADMIT' : 'NEEDS_REVIEW') : 'CONTEXT_ONLY';
  const reason = outcome === 'ADMIT' ? 'Recomputed on latest main: the product value the unchanged rule chooses from the admitted rows (GF-PL001-0001 to 0010) replaces the estimate.'
    : t.KnownSemanticHold ? `Retained; the known hold stands (${t.KnownSemanticHold.slice(0, 160)}…).`
      : 'Retained as the research\'s reviewed disposition; the estimate stays the unchanged model\'s, recalibrated by the admitted rows. No value generated.';
  return { TaskID: t.TaskID, MaterialID: t.MaterialID, Headline: t.Headline, 'Research disposition': t.Disposition, 'Now': now, Outcome: outcome, 'GOALS step': 'step 2 (C12)', Reason: reason };
});
writeFileSync(join(here, 'ESTIMATES.csv'), csvText(Object.keys(estRows[0]), estRows));

const count = (rs) => rs.reduce((t, r) => ({ ...t, [r.Outcome]: (t[r.Outcome] ?? 0) + 1 }), {});
console.log(JSON.stringify({ findings: rows.length, findingOutcomes: count(rows), prices: priceRows.length, priceOutcomes: count(priceRows), estimates: estRows.length, estimateOutcomes: count(estRows) }, null, 1));
