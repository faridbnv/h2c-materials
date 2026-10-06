#!/usr/bin/env node
// Duplicate and out-of-range audit (check round 3; OPEN-PROBLEMS §15 "Copies registered beside the maker's own sheet",
// §16 "Other revisions of one sheet may still sit on two grades", §17 "Unfilled products publish a density outside their
// polymer's neat range"). Read-only: it reads data/tables/*.csv, data/review/accepted-findings.csv and dist/db.json, and
// changes no data. It finds three kinds of lead for a person (or a judging agent) to read on the sheets:
//
//   grade-pairs.csv    two active grades of one manufacturer whose names normalise to the same product or near it
//                      (case, punctuation, (R)/TM, "+" as "plus", the maker's name or initials, "filament", "1.75mm",
//                      colour names, revision tokens), or whose measurements overlap heavily (the same property, value
//                      and unit on >= 3 properties that few grades share, or >= 70 % of the smaller set). Each pair
//                      carries the values shared, the values that differ, the Shared formulation key, and a verdict
//                      SUGGESTION: same-product (merge), twin (one sheet, two products: a key, D89) or distinct (and why).
//   source-pairs.csv   MEAS-CROSS-SOURCE-TWIN's decision (build/src/lint-rules.js) without its cap: two sources that
//                      publish the same (property, value, unit, direction, notch, load, moisture, post-processing)
//                      tuples on >= 80 % of the smaller one's values (>= 5 values). The rule ignores a tuple more than
//                      10 sources publish; here none is ignored, so a copy whose values are common is found too.
//   split-sources.csv  (a by-product of the source pass) sources whose rows sit on more than one active grade: a comparison table
//                      or a portfolio legitimately does; a single product's sheet whose few rows sit on another product's
//                      grade is a row filed on the wrong grade (m342 put four ApolloX rows on Spectrum's FlameGuard ASA 275).
//   densities.csv      grades whose headline density lies outside the neat range of their estimate-identity polymer
//                      (the OPEN-PROBLEMS §17 query: unfilled, no Variant, not a study grade), and, flagged apart, the
//                      same test for a product that declares a Variant or an undisclosed commercial modifier.
//
// A suggestion is a lead and decides nothing; the judgement is made on the sheets (build/reports/duplicates/judgements.md).
// Needs dist/db.json (npm run build) for the densities and the polymers' neat ranges.
//
//   node scripts/audit/duplicates.mjs        writes build/reports/duplicates/{grade-pairs,source-pairs,densities}.csv

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv, writeCsv } from '../../build/src/csv.js';
import { DATA_STATUS } from '../../build/src/normalize/values.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = join(root, 'build/reports/duplicates');
mkdirSync(outDir, { recursive: true });
const table = (name) => readCsv(join(root, `data/tables/${name}.csv`)).records.map((r) => r.values);
const grades = table('grades'), materials = table('materials'), measurements = table('measurements'), sources = table('sources');
const accepted = readCsv(join(root, 'data/review/accepted-findings.csv')).records.map((r) => r.values);
const acceptedSet = (code) => new Set(accepted.filter((a) => a.Code === code).map((a) => a.Record));
const gradeById = new Map(grades.map((g) => [g.GradeID, g]));
const matById = new Map(materials.map((m) => [m.MaterialID, m]));
const srcById = new Map(sources.map((s) => [s.SourceID, s]));
const numeric = (r) => DATA_STATUS[r['Data status']]?.numeric;
const live = measurements.filter(numeric);
const NA = (v) => v == null || v === '' || v === 'Not applicable' || v === 'Not published';
const num = (v) => Number(v);

// ---------------------------------------------------------------------------------------------------------------- names
const COLOURS = new Set('black white red blue green yellow orange pink purple violet grey gray silver gold natural clear bronze brown beige cyan magenta navy teal turquoise lime ivory cream copper'.split(' '));
const STOP = new Set('filament filaments 3d printing printer print by tds pds datasheet data sheet technical technology information product products material materials version rev revision edition en de fr it for the and of'.split(' '));
const VARIANT = new Set('matt matte silk plus pro lite lw hf hs hr ht high speed fast cf gf cfr gfr fr esd flex soft hard medium mf mineral metal wood marble glow carbon glass fiber fibre kevlar foam foaming tough impact food uv anti static antibac antibacterial rapid ultra super basic max premium prime recycled recycle bio bamboo transparent translucent'.split(' '));
function initials(name) {
  const camel = String(name).replace(/([a-z])([A-Z])/g, '$1 $2').split(/[^A-Za-z0-9]+/).filter(Boolean);
  return camel.length > 1 ? camel.map((w) => w[0].toLowerCase()).join('') : '';
}
function tokensOf(name, manufacturer) {
  const maker = new Set(String(manufacturer).normalize('NFKC').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const ini = initials(manufacturer);
  if (ini) maker.add(ini);
  const s = String(name).normalize('NFKC').toLowerCase().replace(/[®™©]/g, '').replace(/\+/g, ' plus ').replace(/\b(1[.,]75|2[.,]85|3[.,]00?|175|285)\s*mm\b/g, ' ')
    .replace(/\bv\d+(?:[.,]\d+)*\b/g, ' ').replace(/[^a-z0-9.]+/g, ' ');
  return s.split(' ').map((t) => t.replace(/^\.+|\.+$/g, '')).filter((t) => t && !STOP.has(t) && !COLOURS.has(t) && !maker.has(t) && !/^(1\.75|2\.85|175|285)$/.test(t));
}
const jaccard = (a, b) => { const A = new Set(a), B = new Set(b); const i = [...A].filter((x) => B.has(x)).length; return i / (new Set([...A, ...B]).size || 1); };

// ---------------------------------------------------------------------------------------------------------------- grade pairs
const active = grades.filter((g) => g.Status === 'active');
const perGrade = new Map();   // GradeID -> Map(tupleKey -> {property, label, value})
const gradeSources = new Map();
for (const r of live) {
  if (!gradeById.has(r.GradeID)) continue;
  if (!perGrade.has(r.GradeID)) { perGrade.set(r.GradeID, new Map()); gradeSources.set(r.GradeID, new Map()); }
  const k = [r.Property, r['Normalized value'], r['Normalized unit'], r.Direction, r['Test load MPa'], r.Notch].join('\u0000');
  perGrade.get(r.GradeID).set(k, { property: r.Property, value: num(r['Normalized value']), unit: r['Normalized unit'], dir: r.Direction, load: r['Test load MPa'], notch: r.Notch, moisture: r['Moisture state'], post: r['Post-processing state'] });
  gradeSources.get(r.GradeID).set(r.SourceID, (gradeSources.get(r.GradeID).get(r.SourceID) ?? 0) + 1);
}
const holders = new Map();   // tupleKey -> number of active grades holding it
for (const g of active) for (const k of perGrade.get(g.GradeID)?.keys() ?? []) holders.set(k, (holders.get(k) ?? 0) + 1);
const RARE = 6;   // a tuple more than this many grades hold is a family's typical number (a density, a Tg), not a fingerprint
const label = (v) => `${v.property}${NA(v.dir) ? '' : ` [${v.dir}]`}${NA(v.load) ? '' : ` @${v.load} MPa`}${NA(v.notch) ? '' : ` (${v.notch})`}=${v.value} ${v.unit}`;
const condKey = (v) => [v.property, v.dir, v.load, v.notch, v.unit].join('\u0000');
const wordHas = (tokens, set) => tokens.filter((t) => set.has(t));

const byMaker = new Map();
for (const g of active) { const k = g.Manufacturer.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g, ''); if (!byMaker.has(k)) byMaker.set(k, []); byMaker.get(k).push(g); }
const twinAccepted = acceptedSet('GRADE-VALUES-TWIN');
const pairRows = [];
let sameMakerPairs = 0, lintLikeTwins = 0, lintLikeKeyed = 0;
for (const gs of byMaker.values()) {
  for (let i = 0; i < gs.length; i++) for (let j = i + 1; j < gs.length; j++) {
    const a = gs[i], b = gs[j];
    sameMakerPairs++;
    const ma = perGrade.get(a.GradeID) ?? new Map(), mb = perGrade.get(b.GradeID) ?? new Map();
    const shared = [...ma.keys()].filter((k) => mb.has(k));
    const smaller = Math.min(ma.size, mb.size);
    const sharedProps = new Set(shared.map((k) => ma.get(k).property));
    const rareShared = shared.filter((k) => holders.get(k) <= RARE);
    const rareProps = new Set(rareShared.map((k) => ma.get(k).property));
    const frac = smaller ? shared.length / smaller : 0;
    // The GRADE-VALUES-TWIN criterion (valueTwins in lint-rules.js): >= 5 values each, >= 5 shared, >= 80 % of the smaller; same maker only here.
    const lintTwin = ma.size >= 5 && mb.size >= 5 && shared.length >= 5 && frac >= 0.8;
    const sameKey = !NA(a['Shared formulation key']) && a['Shared formulation key'] === b['Shared formulation key'];
    if (lintTwin) { lintLikeTwins++; if (sameKey) lintLikeKeyed++; }
    const ta = tokensOf(a['Product name'], a.Manufacturer), tb = tokensOf(b['Product name'], b.Manufacturer);
    const sa = [...new Set(ta)].sort(), sb = [...new Set(tb)].sort();
    const equalNames = sa.length > 0 && sa.join(' ') === sb.join(' ');
    const sameMat = a.MaterialID === b.MaterialID;
    const subset = sameMat && sa.length > 0 && sb.length > 0 && (sa.every((t) => sb.includes(t)) || sb.every((t) => sa.includes(t)));
    const jac = jaccard(sa, sb);
    const nameRel = equalNames ? 'same' : (subset || (sameMat && jac >= 0.6)) ? 'near' : 'different';
    const valueHit = rareProps.size >= 3 || (smaller >= 4 && frac >= 0.7);
    if (nameRel === 'different' && !valueHit) continue;
    if (nameRel === 'near' && !valueHit && !(sameMat && (subset || jac >= 0.6))) continue;
    const diffTokens = [...new Set([...sa.filter((t) => !sb.includes(t)), ...sb.filter((t) => !sa.includes(t))])];
    const variantTokens = diffTokens.filter((t) => VARIANT.has(t) || /^\d+(\.\d+)?$/.test(t) || /^(cf|gf)\d*$/.test(t));
    // Values that differ: the same property and conditions on both, no value in common.
    const condsA = new Map(), condsB = new Map();
    for (const [k, v] of ma) { const c = condKey(v); if (!condsA.has(c)) condsA.set(c, []); condsA.get(c).push([k, v]); }
    for (const [k, v] of mb) { const c = condKey(v); if (!condsB.has(c)) condsB.set(c, []); condsB.get(c).push([k, v]); }
    const differ = [];
    for (const [c, va] of condsA) {
      const vb = condsB.get(c); if (!vb) continue;
      if (va.some(([k]) => mb.has(k))) continue;
      differ.push(`${label(va[0][1])} vs ${vb.map(([, v]) => v.value).join('/')}`);
    }
    const conflicts = differ.length;
    let verdict, reason;
    const both = `${shared.length} shared of ${ma.size} and ${mb.size}; ${conflicts} differ`;
    if (nameRel === 'same') {
      if (sameKey) { verdict = 'same-product (merge) [already keyed]'; reason = `names normalise equal and both carry the key; one product, one grade (${both})`; }
      else if (frac >= 0.7 && conflicts <= 1) { verdict = 'same-product (merge)'; reason = `names normalise equal; ${both}`; }
      else if (conflicts >= 2 && frac < 0.5) { verdict = 'distinct? (same name, different values: a re-test or another revision)'; reason = `names normalise equal but values differ (${both}); read both sheets`; }
      else { verdict = 'same-product? (read both sheets)'; reason = `names normalise equal; ${both}`; }
    } else if (nameRel === 'near') {
      if (variantTokens.length && frac >= 0.8 && lintTwin) { verdict = sameKey ? 'twin (already keyed)' : 'twin (one table, two products: key, D89)'; reason = `names differ by ${variantTokens.join(', ')} but ${both}`; }
      else if (variantTokens.length) { verdict = `distinct (variant ${variantTokens.join(', ')})`; reason = `names differ by ${diffTokens.join(', ')}; ${both}`; }
      else if (frac >= 0.7 && conflicts <= 1) { verdict = 'same-product? (rename or reprint)'; reason = `names differ by ${diffTokens.join(', ')} only; ${both}`; }
      else { verdict = 'distinct? (read both sheets)'; reason = `names differ by ${diffTokens.join(', ')}; ${both}`; }
    } else {
      if (lintTwin) { verdict = sameKey ? 'twin (already keyed)' : 'twin (one sheet, two products: key, D89) or a rename'; reason = `different names, ${both}`; }
      else { verdict = 'distinct? (some values in common)'; reason = `different names, ${both}`; }
    }
    if (!sameKey && lintTwin && twinAccepted.has([a.GradeID, b.GradeID].sort().join(' | '))) reason += ' [GRADE-VALUES-TWIN accepted]';
    const score = (nameRel === 'same' ? 3 : nameRel === 'near' ? 1.5 : 0) + frac * 3 + Math.min(rareShared.length, 10) / 5 - conflicts * 0.4 + (sameKey ? -0.5 : 0);
    const srcs = (g) => [...(gradeSources.get(g.GradeID)?.entries() ?? [])].map(([s, n]) => `${s} (${n})`).join('; ');
    pairRows.push({
      Strength: score.toFixed(2), GradeA: a.GradeID, GradeB: b.GradeID, Manufacturer: a.Manufacturer === b.Manufacturer ? a.Manufacturer : `${a.Manufacturer} / ${b.Manufacturer}`,
      MaterialA: `${a.MaterialID} ${matById.get(a.MaterialID)?.['Original name'] ?? ''}`.trim(), MaterialB: `${b.MaterialID} ${matById.get(b.MaterialID)?.['Original name'] ?? ''}`.trim(),
      ProductA: a['Product name'], ProductB: b['Product name'], NameKeyA: sa.join(' '), NameKeyB: sb.join(' '), NameRelation: nameRel, DifferingNameTokens: diffTokens.join(' '),
      RoleA: a.Role, RoleB: b.Role, VariantA: NA(a.Variant) ? '' : a.Variant, VariantB: NA(b.Variant) ? '' : b.Variant,
      SourcesA: srcs(a), SourcesB: srcs(b), SharedFormulationKeyA: NA(a['Shared formulation key']) ? '' : a['Shared formulation key'], SharedFormulationKeyB: NA(b['Shared formulation key']) ? '' : b['Shared formulation key'],
      SameKey: sameKey ? 'yes' : '', ValuesA: ma.size, ValuesB: mb.size, SharedCount: shared.length, SharedProperties: sharedProps.size, RareSharedProperties: rareProps.size,
      SharedFractionOfSmaller: frac.toFixed(2), SharedValues: shared.slice(0, 12).map((k) => label(ma.get(k))).join(' | '), DifferingValues: differ.slice(0, 12).join(' | '), DifferCount: conflicts,
      Verdict: verdict, Reason: reason,
    });
  }
}
pairRows.sort((x, y) => Number(y.Strength) - Number(x.Strength) || x.GradeA.localeCompare(y.GradeA));
const pairHeader = Object.keys(pairRows[0]);
writeCsv(join(outDir, 'grade-pairs.csv'), pairHeader, pairRows);

// ---------------------------------------------------------------------------------------------------------------- source pairs
const TWIN_FIELDS = ['Property', 'Normalized value', 'Normalized unit', 'Direction', 'Notch', 'Test load MPa', 'Moisture state', 'Post-processing state'];
const TWIN_FLOOR = 5, TWIN_SHARE = 0.8, TWIN_COMMON = 10;
const srcIds = [...new Set(live.map((r) => r.SourceID))].sort();
const srcIdx = new Map(srcIds.map((s, i) => [s, i]));
const perSrc = srcIds.map(() => new Set());
const tupleSrcs = new Map();
const srcGrades = srcIds.map(() => new Map());
for (const r of live) {
  const i = srcIdx.get(r.SourceID);
  const tuple = TWIN_FIELDS.map((f) => r[f]).join('\u0000');
  perSrc[i].add(tuple);
  if (!tupleSrcs.has(tuple)) tupleSrcs.set(tuple, new Set());
  tupleSrcs.get(tuple).add(i);
  srcGrades[i].set(r.GradeID, (srcGrades[i].get(r.GradeID) ?? 0) + 1);
}
const N = srcIds.length;
const count = new Map(), countCapped = new Map();
for (const ss of tupleSrcs.values()) {
  if (ss.size < 2) continue;
  const ids = [...ss].sort((x, y) => x - y);
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const k = ids[i] * N + ids[j];
    count.set(k, (count.get(k) ?? 0) + 1);
    if (ss.size <= TWIN_COMMON) countCapped.set(k, (countCapped.get(k) ?? 0) + 1);
  }
}
const passes = (m, k) => { const c = m.get(k); if (!c) return false; const i = Math.floor(k / N), j = k % N; const s = Math.min(perSrc[i].size, perSrc[j].size); return s >= TWIN_FLOOR && c >= s * TWIN_SHARE; };
const twinAcceptedSrc = acceptedSet('MEAS-CROSS-SOURCE-TWIN');
const srcRows = [];
let withCap = 0, withoutCap = 0;
for (const k of count.keys()) {
  const capped = passes(countCapped, k);
  if (capped) withCap++;
  if (!passes(count, k)) continue;
  withoutCap++;
  const i = Math.floor(k / N), j = k % N, a = srcIds[i], b = srcIds[j];
  const sa = srcById.get(a) ?? {}, sb = srcById.get(b) ?? {};
  const ga = [...srcGrades[i].keys()], gb = [...srcGrades[j].keys()];
  const makerOf = (gs) => [...new Set(gs.map((g) => gradeById.get(g)?.Manufacturer).filter(Boolean))];
  const mA = makerOf(ga), mB = makerOf(gb);
  const sameFile = sa.SHA256 && sa.SHA256 === sb.SHA256;
  const sameGrades = ga.length === gb.length && ga.every((g) => gb.includes(g));
  const makerShared = mA.some((m) => mB.includes(m));
  const pubSame = (sa.Publisher ?? '').toLowerCase() === (sb.Publisher ?? '').toLowerCase();
  const c = count.get(k), smaller = Math.min(perSrc[i].size, perSrc[j].size);
  let verdict, reason;
  const bothAccepted = twinAcceptedSrc.has(`${a} | ${b}`) || twinAcceptedSrc.has(`${b} | ${a}`);
  if (sameFile) { verdict = 'same document registered twice (identical file)'; reason = 'identical SHA-256'; }
  else if (sameGrades) { verdict = 'same document registered twice, or one product\'s two editions (revision, language) on one grade'; reason = `both back ${ga.join(', ')}`; }
  else if (makerShared && ga.length === 1 && gb.length === 1) { verdict = 'one product held twice (two grades) or a twin: judge the grade pair'; reason = `${ga[0]} and ${gb[0]} are the same maker's`; }
  else if (makerShared) { verdict = 'same maker, several grades: twin or one product held twice'; reason = `grades ${ga.join(', ')} | ${gb.join(', ')}`; }
  else if (!pubSame) { verdict = 'reprint of another maker\'s table (R166) or a retailer/supplier copy'; reason = `makers ${mA.join(', ')} vs ${mB.join(', ')}`; }
  else { verdict = 'same publisher, different makers filed: check the filing'; reason = ''; }
  srcRows.push({
    Strength: (c / smaller).toFixed(2), SourceA: a, SourceB: b, SHA256A: sa.SHA256 ?? '', SHA256B: sb.SHA256 ?? '', IdenticalFile: sameFile ? 'yes' : '',
    PublisherA: sa.Publisher ?? '', PublisherB: sb.Publisher ?? '', TitleA: sa.Title ?? '', TitleB: sb.Title ?? '', RevisionA: sa.Revision ?? '', RevisionB: sb.Revision ?? '',
    GradesA: ga.map((g) => `${g} ${gradeById.get(g)?.['Product name'] ?? ''} [${gradeById.get(g)?.Status ?? ''}]`).join('; '), GradesB: gb.map((g) => `${g} ${gradeById.get(g)?.['Product name'] ?? ''} [${gradeById.get(g)?.Status ?? ''}]`).join('; '),
    ValuesA: perSrc[i].size, ValuesB: perSrc[j].size, SharedValues: c, FoundByLintWithCap: capped ? 'yes' : '', AcceptedFinding: bothAccepted ? 'yes' : '',
    Verdict: verdict, Reason: reason,
  });
}
srcRows.sort((x, y) => (Number(y.IdenticalFile === 'yes') - Number(x.IdenticalFile === 'yes')) || Number(y.Strength) - Number(x.Strength) || x.SourceA.localeCompare(y.SourceA));
const srcHeader = Object.keys(srcRows[0]);
writeCsv(join(outDir, 'source-pairs.csv'), srcHeader, srcRows);

// ---------------------------------------------------------------------------------------------------------------- split sources
const splitRows = [];
for (const [i, s] of srcIds.entries()) {
  const gs = [...srcGrades[i].entries()].filter(([g]) => gradeById.get(g)?.Status === 'active').sort((x, y) => y[1] - x[1]);
  if (gs.length < 2) continue;
  const [main, minor] = [gs[0], gs.slice(1)];
  splitRows.push({
    SourceID: s, Title: srcById.get(s)?.Title ?? '', Grades: gs.length, Rows: gs.reduce((a, [, n]) => a + n, 0),
    MainGrade: `${main[0]} ${gradeById.get(main[0])?.['Product name'] ?? ''} (${main[1]})`,
    OtherGrades: minor.map(([g, n]) => `${g} ${gradeById.get(g)?.Manufacturer ?? ''} ${gradeById.get(g)?.['Product name'] ?? ''} (${n})`).join('; '),
    Suggestion: gs.length > 6 ? 'portfolio or comparison table: expected' : minor.every(([g]) => gradeById.get(g)?.Manufacturer === gradeById.get(main[0])?.Manufacturer) ? 'same maker, few grades: check each row is on the product the sheet names' : 'different makers: check the filing',
  });
}
splitRows.sort((a, b) => a.Grades - b.Grades || a.SourceID.localeCompare(b.SourceID));
if (splitRows.length) writeCsv(join(outDir, 'split-sources.csv'), Object.keys(splitRows[0]), splitRows);

// ---------------------------------------------------------------------------------------------------------------- densities
const dbPath = join(root, 'dist/db.json');
if (!existsSync(dbPath)) { console.error('No dist/db.json; run npm run build for the densities'); process.exit(1); }
const db = JSON.parse(readFileSync(dbPath, 'utf8'));
const matDb = new Map(db.materials.map((m) => [m.id, m])), polyDb = new Map(db.polymers.map((p) => [p.id, p]));
const measById = new Map(measurements.map((m) => [m.MeasurementID, m]));
const gradesByIdentity = new Map();
for (const g of db.grades) {
  if (g.retired || /-R\d/.test(g.id)) continue;
  const m = matDb.get(g.materialId); const d = g.headline?.density;
  if (!m || !d || m.modifier !== 'Unfilled / unspecified') continue;
  if (!gradesByIdentity.has(m.estimateIdentity)) gradesByIdentity.set(m.estimateIdentity, []);
  gradesByIdentity.get(m.estimateIdentity).push({ id: g.id, v: d.value, variant: g.variant });
}
const median = (xs) => { const s = [...xs].sort((p, q) => p - q); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
const NAME_FILLED = /matt|matte|silk|foam|lightweight|\blw\b|carbon|glass|\bgf\b|\bcf\b|fibre|fiber|\bfr\b|flame|mineral|metal|steel|bronze|copper|wood|marble|stone|glow|sparkle|glitter|ceramic|\bhs\b|high.?speed|\bhf\b|filled|talc|chalk|prime|\besd\b|conductive|magnetic/i;
const POLY_IN_NAME = [['PETG', /pet-?g|petg/i], ['PLA', /\bpla\b/i], ['ABS', /\babs\b/i], ['ASA', /\basa\b/i], ['PC', /\bpc\b/i], ['PA', /\bpa\d*\b|nylon/i], ['TPU', /\btpu\b|flex/i], ['PVA', /\bpva\b/i], ['HIPS', /\bhips\b/i]];
const densRows = [];
let in17 = 0;
for (const g of db.grades) {
  if (g.retired || /-R\d/.test(g.id)) continue;
  const m = matDb.get(g.materialId); if (!m || m.excluded || m.familyEntry) continue;
  const d = g.headline?.density; if (!d) continue;
  const y = polyDb.get(m.estimateIdentity); if (!y?.neatDensity) continue;
  const { min, max } = y.neatDensity;
  if (!(d.value > max || d.value < min)) continue;
  const unfilled = m.modifier === 'Unfilled / unspecified', undisclosed = m.modifier === 'Commercial variant / undisclosed';
  if (!unfilled && !undisclosed) continue;
  const declared = !!g.variant;
  const sec17 = unfilled && !declared;
  if (sec17) in17++;
  const grow = gradeById.get(g.id) ?? {};
  const mr = d.measurementId ? measById.get(d.measurementId) : null;
  const all = measurements.filter((x) => x.GradeID === g.id && x.Property === 'Density' && numeric(x));
  const rawNumeric = mr ? num(mr['Raw numeric']) : NaN, conv = mr ? num(mr['Conversion factor']) : NaN, norm = mr ? num(mr['Normalized value']) : NaN;
  const peers = (gradesByIdentity.get(m.estimateIdentity) ?? []).filter((p) => p.id !== g.id && !p.variant).map((p) => p.v);
  const peerMed = median(peers);
  const fits = [...polyDb.values()].filter((p) => p.neatDensity && d.value >= p.neatDensity.min && d.value <= p.neatDensity.max && p.id !== m.estimateIdentity).map((p) => p.id);
  const nameText = `${g.product} ${grow['Composition / filler'] ?? ''}`;
  const outBy = d.value > max ? d.value - max : min - d.value, rel = outBy / ((max + min) / 2);
  const otherPoly = POLY_IN_NAME.filter(([id, re]) => re.test(g.product) && !m.estimateIdentity.includes(id)).map(([id]) => id);
  let suggestion, why;
  const unitOdd = mr && (!/^(g\/c(m3|c)|g\/cm³|g\/cm\^3)$/i.test(mr['Raw unit'] ?? '') && !/kg\/m/i.test(mr['Raw unit'] ?? '') || (Number.isFinite(rawNumeric * conv) && Math.abs(rawNumeric * conv - norm) > 0.5 + norm * 1e-3));
  const rangeRaw = mr && /\d\s*[-–]\s*\d/.test(String(mr['Raw value']));
  if (rangeRaw) { suggestion = 'unit/transcription (a range recorded as one end)'; why = `raw "${mr['Raw value']}" recorded as ${norm}; the sheet prints a range`; }
  else if (unitOdd) { suggestion = 'unit/transcription'; why = `raw ${mr['Raw value']} ${mr['Raw unit']} x ${mr['Conversion factor']} = ${rawNumeric * conv}, recorded ${norm}`; }
  else if (declared) { suggestion = 'declared variant (value expected to differ)'; why = `Variant "${g.variant}"`; }
  else if (NAME_FILLED.test(nameText)) { suggestion = 'foamed or filled variant to declare'; why = `product name or composition says "${(nameText.match(NAME_FILLED) ?? [])[0]}"`; }
  else if (otherPoly.length || (peerMed != null && Math.abs(d.value - peerMed) / peerMed > 0.2)) { suggestion = 'mis-filed or wrong value: read the sheet'; why = otherPoly.length ? `name mentions ${otherPoly.join('/')}; fits ${fits.join(', ') || 'none'}` : `${(100 * (d.value - peerMed) / peerMed).toFixed(0)} % from the peer median ${peerMed}; fits ${fits.join(', ') || 'none'}`; }
  else if (rel < 0.03) { suggestion = 'genuine (within 3 % of the neat range edge; narrow range or a pigment/additive); declare only after the sheet is re-read'; why = `${outBy} kg/m3 outside, peers' median ${peerMed ?? 'n/a'}`; }
  else { suggestion = 'needs the sheet re-read (filler or additive undisclosed?)'; why = `${outBy} kg/m3 outside; peers' median ${peerMed ?? 'n/a'}; fits ${fits.join(', ') || 'none'}`; }
  densRows.push({
    Section17: sec17 ? 'yes' : 'no (declared variant or undisclosed modifier)', GradeID: g.id, MaterialID: g.materialId, Material: m.name, Manufacturer: g.manufacturer, Product: g.product,
    Modifier: m.modifier, Variant: g.variant ?? '', Composition: grow['Composition / filler'] ?? '', EstimateIdentity: m.estimateIdentity, NeatMin: min, NeatMax: max, Density: d.value,
    OutsideBy: outBy, PeerMedian: peerMed ?? '', PeerCount: peers.length, PolymersWhoseRangeContains: fits.join(' '), HeadlineMeasurement: d.measurementId ?? '', RawValue: mr?.['Raw value'] ?? '', RawUnit: mr?.['Raw unit'] ?? '',
    Conversion: mr?.['Conversion factor'] ?? '', Specimen: mr?.['Specimen type'] ?? '', StandardOrLoad: mr?.['Standard / load'] ?? '', Source: mr?.SourceID ?? '', Locator: mr?.Locator ?? '',
    AllDensityRows: all.map((x) => `${x.MeasurementID}: ${x['Raw value']} ${x['Raw unit']} -> ${x['Normalized value']} (${x.SourceID})`).join(' | '), Suggestion: suggestion, Why: why,
  });
}
densRows.sort((x, y) => (x.Section17 === y.Section17 ? 0 : x.Section17 === 'yes' ? -1 : 1) || x.GradeID.localeCompare(y.GradeID));
writeCsv(join(outDir, 'densities.csv'), Object.keys(densRows[0]), densRows);

// ---------------------------------------------------------------------------------------------------------------- summary
const lint = readCsv(join(root, 'data/review/accepted-findings.csv'));
const verdictCount = (rows, key) => Object.entries(rows.reduce((o, r) => ((o[r[key].split(' (')[0].split('?')[0]] = (o[r[key].split(' (')[0].split('?')[0]] ?? 0) + 1), o), {})).map(([k, v]) => `${v} ${k}`).join(', ');
console.log(`grade-pairs.csv     ${pairRows.length} pairs from ${sameMakerPairs} same-maker active pairs; GRADE-VALUES-TWIN-like (>= 5 shared values, >= 80 % of smaller, same maker): ${lintLikeTwins} (${lintLikeKeyed} already under one key); verdicts: ${verdictCount(pairRows, 'Verdict')}`);
console.log(`source-pairs.csv    ${srcRows.length} pairs without the cap (${withCap} with the cap of ${TWIN_COMMON}; ${srcRows.length - withCap} only found without it; ${srcRows.filter((r) => r.AcceptedFinding).length} accepted already; ${srcRows.filter((r) => r.IdenticalFile).length} identical files)`);
console.log(`densities.csv       ${densRows.length} rows, ${in17} in the OPEN-PROBLEMS section 17 population; suggestions: ${verdictCount(densRows, 'Suggestion')}`);
console.log(`split-sources.csv   ${splitRows.length} sources with rows on more than one active grade`);
void lint;
