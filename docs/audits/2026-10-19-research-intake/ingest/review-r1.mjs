#!/usr/bin/env node
// Stage 4's review of the research intake's reading proposals: the executor's decisions (Claude Opus) on what
// ingest:read-proposals proposed from the reconciled readings (proposals/r1/) and on the readings it held, written into
// proposals/r1-reviewed/, the folder m454 applies with applyProposals.
//
//   node docs/audits/2026-10-19-research-intake/ingest/review-r1.mjs
//
// Every decision is in this file, with its reason, and summary.md lists them:
//
//   VALUE_SETS     a proposed value with cells corrected (a test the sheet names, a column it heads, a direction)
//   VALUE_KEEPS    a held or unmapped reading recorded after all, built by the pipeline's own valueProposal: a unit the
//                  page prints as a power ("gcm-3", "Jm-1") or as kpsi, a label other sheets print for the same test, a
//                  value the reconciler compared with the held row of another load, a quote read in another view
//   PROFILE_SETS   a proposed profile with a cell added from a reading the pipeline held (it is on the same page)
//   NEW_PROFILES   a profile from a held reading, or a setting of a registered sheet the triage set aside to type here
//   CELL_SETS      a cell of a held profile, from a registered sheet the triage set aside to type here
//
// A profile's typed cells are always the parsers' reading of its raw cells (typedOf), so applyProposals' check holds. A
// quote is checked on the cached sheet when m454 applies the folder, not here. Nothing here writes data/.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const R = resolve(here, '..');
const root = resolve(R, '../../..');
const { readCsv, csvText } = await import(join(root, 'build/src/csv.js'));
const { valueProposal, tidy } = await import(join(root, 'scripts/ingest/read-proposals.mjs'));
const { typedOf, TYPED } = await import(join(root, 'scripts/lib/profile-settings.mjs'));
const { readStandards } = await import(join(root, 'build/src/normalize/standards.js'));
const { parseHdtStandard } = await import(join(root, 'build/src/normalize/thermal.js'));
const { loadCellFromParsed } = await import(join(root, 'build/src/typed-values.js'));

const rows = (file) => readCsv(file).records.map((r) => Object.fromEntries(Object.entries(r.values).map(([k, v]) => [k, v ?? ''])));
const headerOf = (file) => readCsv(file).header;
const table = (name) => rows(join(root, 'data/tables', `${name}.csv`));
const NP = 'Not published';
const BY = 'Claude Opus (research intake, stage 4)';
const IN = join(R, 'proposals/r1'), OUT = join(R, 'proposals/r1-reviewed');
const id = (n) => `r1-resolved.csv#${n}`;

const registry = new Map(table('properties').map((p) => [p.Property, p]));
const grades = new Map(table('grades').map((g) => [g.GradeID, g]));
const measurements = table('measurements');
const profiles = table('profiles');
const readings = new Map(['new-values', 'new-settings', 'unmapped', 'mismatches'].flatMap((f) => rows(join(R, `reconcile/r1/${f}.csv`))).map((r) => [r.RowID, r]));
const dropped = rows(join(here, 'readings/r1-dropped.csv'));

// ---------------------------------------------------------------------------------------------------- the decisions
const EUMAKERS_DENSITY = 'Eumakers prints 1,18 g/cm³ on its filament data sheet and 1,07 g/cc on its polymer data sheet for the same product; both are recorded as printed.';
const VALUE_SETS = {
  [id(142)]: { note: EUMAKERS_DENSITY },
  [id(187)]: { note: EUMAKERS_DENSITY },
  [id(143)]: { set: { Property: 'Charpy strength', Notch: 'Unnotched' }, note: 'Its method, ISO 179/2-1eU, is a Charpy test of an unnotched bar struck edgewise (the sheet heads the column ASTM and prints ISO numbers).' },
  [id(147)]: { set: { 'Standard / load': 'HDT/A; 75' }, note: 'The row is labelled HDT/A, ISO 75 method A (1.80 MPa).' },
  [id(193)]: { set: { Locator: 'p. 4: Flexural Strength (Mpa), xy - parallel, 100 %' } },
  [id(194)]: { set: { Locator: 'p. 4: Flexural Modulus (Mpa), xy - parallel, 100 %' } },
  [id(196)]: { set: { Locator: 'p. 4: Flexural Strength (Mpa), xy - normal, 100 %', Direction: 'Stated, not a usable direction' }, note: 'A flat bar the sheet heads "xy - normal" beside its "xy - parallel" bar, with one infill angle (45°) for both: kept apart from the XY value, as a 45/45 bar beside an XY one is (D91).' },
  [id(197)]: { set: { Locator: 'p. 4: Flexural Modulus (Mpa), xy - normal, 100 %', Direction: 'Stated, not a usable direction' }, note: 'A flat bar the sheet heads "xy - normal" beside its "xy - parallel" bar, with one infill angle (45°) for both: kept apart from the XY value, as a 45/45 bar beside an XY one is (D91).' },
  [id(199)]: { set: { Locator: 'p. 4: Impact Strength (KJ/m²), zy - normal, 100 %' } },
  [id(200)]: { set: { Locator: 'p. 4: Impact Strength (KJ/m²), xy - parallel, 100 %' } },
};

const ANNEALED = 'annealed at 100 °C for 8 h';
const PRINTED_POWER = (printed) => `The page prints the unit as "${printed}", the same unit written as a power.`;
const VALUE_KEEPS = {
  [id(17)]: { quote: '78.4°C 99.6°C', with: { PostProcessing: ANNEALED }, locator: 'p. 2: 热变形温度 ISO 75: Method A(1.80 MPa), Annealed', note: 'The Annealed column; the footnote on p. 3 gives the schedule (100 ℃, 8 hours), as the other annealed rows of this sheet read it. Held by the pipeline because its quote did not match the text layer; two readers read it from the image and the text layer prints it.' },
  [id(18)]: { quote: '135.7°C 138.2°C', with: { PostProcessing: 'Unannealed' }, locator: 'p. 2: ISO 75: Method B (0.45MPa), Unannealed', note: 'The Unannealed column at 0.45 MPa. The reconciler compared it with the held 1.80 MPa row (V009352), a value at the other load; it is a new value.' },
  [id(19)]: { quote: '135.7°C 138.2°C', with: { PostProcessing: ANNEALED }, locator: 'p. 2: ISO 75: Method B (0.45MPa), Annealed', note: 'The Annealed column at 0.45 MPa; the footnote on p. 3 gives the schedule.' },
  [id(98)]: { quote: 'Wtokno szklane - - 10', with: { Unit: '%' }, locator: 'p. 2: 3.2 Mieszaniny, Włókno szklane (Udział masowy [%])', note: 'Section 3.2 of the scanned safety data sheet, the column of mass fractions in per cent; read in its optical text, and by two readers from the image.' },
  [id(107)]: { quote: 'Density (gcm ) ASTM D792 1.01', with: { Unit: 'g/cm3', Specimen: '' }, note: `${PRINTED_POWER('gcm-3')} The sheet's comment, "Resin Manufacturer data", says whose figure it is, not the specimen's form.` },
  [id(125)]: { quote: 'Density (gcm ) ASTM D792 1.24', with: { Unit: 'g/cm3', Specimen: '' }, note: `${PRINTED_POWER('gcm-3')} The sheet's comment, "Resin Manufacturer data", says whose figure it is, not the specimen's form.` },
  [id(113)]: { quote: 'Notched Izod Impact/ Jm * ASTM D256 124', with: { Unit: 'J/m' }, note: PRINTED_POWER('Jm-1') },
  [id(131)]: { quote: 'Notched Izod Impact/ Jm * ASTM D256 154', with: { Unit: 'J/m' }, note: PRINTED_POWER('Jm-1') },
  [id(111)]: { note: 'kpsi is ksi, a thousand psi.' },
  [id(112)]: { note: 'kpsi is ksi, a thousand psi.' },
  [id(129)]: { note: 'kpsi is ksi, a thousand psi.' },
  [id(130)]: { note: 'kpsi is ksi, a thousand psi.' },
  [id(110)]: { with: { Field: 'Elongation at break' }, note: 'A plain "Tensile Elongation" is read as elongation at break, as on the 29 other sheets that print the label.' },
  [id(128)]: { with: { Field: 'Elongation at break' }, note: 'A plain "Tensile Elongation" is read as elongation at break, as on the 29 other sheets that print the label.' },
};

const PROFILE_SETS = {
  [`${id(174)} ${id(177)} ${id(178)}`]: { from: [id(175), id(176)], set: { 'Nozzle °C': '185 - 215 °C', 'Bed °C': '50 - 60 °C' }, quote: 'Recommended print settings regular speed | Nozzle temperature | 185 - 215 °C | Bed temperature | 50 - 60 °C', locator: 'p. 1: Recommended print settings regular speed (nozzle, bed)', note: 'The nozzle and bed windows on the same page, which the pipeline held because the reader typed no number: the parsers read 185–215 °C and 50–60 °C, as the page prints them.' },
  [`${id(209)} ${id(210)}`]: { from: [id(211)], set: { 'Abrasion / clogging': 'We recommend using stainless brass or resistant copper alloy nozzles.' }, quote: 'We recommend using stainless brass or resistant copper alloy nozzles.', locator: 'p. 1: N.B. (nozzles)', note: 'The store page\'s nozzle advice: a harder alloy than plain brass, not a hardened nozzle (D168).' },
  [`${id(121)} ${id(122)} ${id(123)} ${id(179)} ${id(180)}`]: { set: { Drying: 'Recommended drying temperature: 75 °C; For Nylon Carbon Fiber, dry six to twelve hours at 75° C (165° F)' }, quote: 'Recommended drying temperature: 75 °C | For Nylon Carbon Fiber, dry six to twelve hours at 75° C (165° F)', note: 'The page\'s drying sentence gives the hours in words beside the temperature.' },
  [`${id(139)} ${id(140)} ${id(141)} ${id(181)} ${id(182)}`]: { set: { Drying: 'Recommended drying temperature: 75 °C; For Nylon Glass, dry six to twelve hours at 75° C (165° F)' }, quote: 'Recommended drying temperature: 75 °C | For Nylon Glass, dry six to twelve hours at 75° C (165° F)', note: 'The page\'s drying sentence gives the hours in words beside the temperature.' },
};

// A held reading, or a setting the triage set aside, that becomes a profile of its own.
const NEW_PROFILES = [
  { from: id(72), source: 'R-RAISE3D-INTAKE-20261019-0ea774a63185', grade: 'G075-09', like: 'P1777', cells: { 'Chamber °C': 'Do not print PVA+ in an enclosed chamber with a chamber temperature of above 50°C, as this may cause clogging.' }, quote: 'Do not print PVA+ in an enclosed chamber with a chamber temperature of above 50°C', locator: 'p. 1: Compatibility', note: 'A ceiling on the chamber, read as one: at most 50 °C (the pipeline held it while the parser read a 50 °C minimum).' },
  { from: id(69), source: 'R-FORMFUTURA-INTAKE-20261019-a19de46bc4d5', grade: 'G102-04', like: null, cells: { Drying: '+4 hours at max.110°C' }, quote: 'Drying: +4 hours at max.110°C', locator: 'p. 1: General printing guidelines (Drying)', note: 'Four hours or more at up to 110 °C: the plus before the hours opens them (the reader typed no hours).' },
  { dropped: ['NEW-bc21a85e0853', 'drying'], source: 'R-MATTERHACKERS-INTAKE-20261019-bc21a85e0853', grade: 'G053-15', like: 'P1010', cells: { Drying: 'You can dry it out by baking it in an oven at 180°F for 4-6 hours.' }, quote: 'You can dry it out by baking it in an oven at 180°F for 4-6 hours.', locator: 'p. 1: product description (drying)', note: 'A schedule printed in Fahrenheit alone, read as 82 °C (D168).' },
  { dropped: ['NEW-315a2e8f1fb9', 'hardened_nozzle', 'Carbon fiber'], source: 'R-FILAMATRIX-INTAKE-20261019-315a2e8f1fb9', grade: 'G165-06', like: null, cells: { 'Abrasion / clogging': 'Carbon fiber is abrasive and can quickly wear a brass nozzle, so a hardened nozzle is highly recommended.' }, quote: 'Carbon fiber is abrasive and can quickly wear a brass nozzle, so a hardened nozzle is highly recommended.', locator: 'p. 1: Nylon Carbon Fiber', note: 'Filamatrix\'s article on its nylons, for its carbon-fibre grade.' },
  { dropped: ['NEW-315a2e8f1fb9', 'hardened_nozzle', 'glass fiber'], source: 'R-FILAMATRIX-INTAKE-20261019-315a2e8f1fb9', grade: 'G166-03', like: null, cells: { 'Abrasion / clogging': 'A hardened nozzle is highly recommended because glass fiber is abrasive.' }, quote: 'A hardened nozzle is highly recommended because glass fiber is abrasive.', locator: 'p. 1: Nylon Glass', note: 'Filamatrix\'s article on its nylons, for its glass-fibre grade.' },
];

// Cells of held profiles from registered sheets the triage set aside to type here (a tolerance window, a bound, a nozzle metal).
const CELL_SETS = [
  { profile: 'P1629', column: 'Nozzle °C', value: '245±10 °C', quote: 'Printing temp. AF 245±10 °C', locator: 'p. 1: Printing temp.' },
  { profile: 'P1630', column: 'Nozzle °C', value: '240±10 °C', quote: 'Printing temp. AF 240±10 °C', locator: 'p. 1: Printing temp.' },
  { profile: 'P1777', column: 'Nozzle °C', value: '215±10 °C', quote: 'Printing temp. Raise3D specific 215±10 °C', locator: 'p. 2: Printing temp.' },
  { profile: 'P1777', column: 'Bed °C', value: '>60˚C', quote: 'Recommended part bed temperature: >60˚C', locator: 'p. 2: Recommended Operation Conditions' },
  { profile: 'P0986', column: 'Nozzle material', value: 'A standard 0.4mm brass nozzle works well.', quote: 'Nozzle: A standard 0.4mm brass nozzle works well.', locator: 'p. 1: Hardware Considerations (Nozzle)' },
];

// ---------------------------------------------------------------------------------------------------- the build
const decided = [];
const valuesHeader = headerOf(join(IN, 'values-add.csv'));
const profilesHeader = [...new Set(headerOf(join(IN, 'profiles-add.csv')))];
const setHeader = headerOf(join(IN, 'profiles-set.csv'));

// Values the pipeline proposed.
const values = rows(join(IN, 'values-add.csv')).map((v) => {
  const d = VALUE_SETS[v.rows];
  if (!d) return v;
  const out = { ...v, ...(d.set ?? {}) };
  if (d.set?.['Standard / load']) {
    out.Standards = readStandards(out['Standard / load']).join('; ') || NP;
    if (out.Property === 'HDT') out['Test load MPa'] = loadCellFromParsed(parseHdtStandard(out['Standard / load']));
  }
  if (d.note) out.note = tidy(`${v.note} ${BY}: ${d.note}`);
  decided.push({ kind: 'value set', target: v.rows, what: `${v.GradeID} ${v.Property} ${v['Raw value']}`, why: d.note ?? `cells: ${Object.keys(d.set).join(', ')}` });
  return out;
});
for (const k of Object.keys(VALUE_SETS)) if (!values.some((v) => v.rows === k)) throw new Error(`VALUE_SETS names ${k}, which proposes no value`);

// The like-row, as the pipeline chooses it: the same source and product, then the product, the source, the material, the maker.
const published = measurements.filter((m) => /^Published value/.test(m['Data status']));
const likeFor = (gradeId, sourceId) => {
  const g = grades.get(gradeId);
  const rank = (m) => (m.SourceID === sourceId && m.GradeID === gradeId ? 0 : m.GradeID === gradeId ? 1 : m.SourceID === sourceId ? 2
    : m.MaterialID === g.MaterialID ? 3 : grades.get(m.GradeID)?.Manufacturer === g.Manufacturer ? 4 : 5);
  return published.reduce((best, m) => (!best || rank(m) < rank(best) ? m : best), null);
};
const locators = new Map();
for (const m of [...measurements, ...values]) (locators.get(m.SourceID) ?? locators.set(m.SourceID, new Set()).get(m.SourceID)).add(m.Locator);

// Readings the pipeline held or could not map, recorded.
for (const [rowId, d] of Object.entries(VALUE_KEEPS)) {
  const r = readings.get(rowId);
  if (!r) throw new Error(`${rowId}: not a reconciled reading`);
  const reading = { ...r, ...(d.with ?? {}), Quote: '' };
  const p = valueProposal(reading, { registry, grade: r.Grade });
  if (p.error) throw new Error(`${rowId}: ${p.error}${p.detail ? ` (${p.detail})` : ''}`);
  const { facts, bound, decision, ...value } = p;
  void facts; void bound; void decision;
  let locator = tidy(d.locator ?? `p. ${r.Page}: ${r.Label || reading.Field}`);
  if (locators.get(r.SourceID)?.has(locator)) throw new Error(`${rowId}: locator "${locator}" is taken on ${r.SourceID}`);
  (locators.get(r.SourceID) ?? locators.set(r.SourceID, new Set()).get(r.SourceID)).add(locator);
  const note = `p. ${r.Page}${r.Label ? `, "${r.Label}"` : ''}: the page prints "${r.Raw}"; read by ${r.Reader}, ${r.Presence}, second reading ${r.SecondRead}.`;
  // A printed specimen's conditions as the pipeline writes them for the sibling rows of the same sheet.
  values.push({
    gate: 'ready', task: 'reader-round', like: likeFor(r.Grade, r.SourceID).MeasurementID, SourceID: r.SourceID, GradeID: r.Grade, MaterialID: grades.get(r.Grade).MaterialID,
    ...value, Locator: locator, quote: d.quote ?? r.Quote, note: tidy(`${note} ${BY}: ${d.note}`), decision: '', cause: 'reviewer-kept', sign_view: '', presence: r.Presence,
    second_read: r.SecondRead, quote_view: '', grade_from: 'reader', reader: r.Reader, rows: rowId,
  });
  decided.push({ kind: 'value kept', target: rowId, what: `${r.Grade} ${value.Property} ${value['Raw value']} ${value['Raw unit']}`, why: d.note });
}

// Profiles the pipeline proposed, with cells from held readings of the same page.
const typedColumns = [...new Set(Object.values(TYPED).flat())];
const retyped = (row) => ({ ...row, ...typedOf({ ...row, 'Nozzle material': NP }) });
const proposedProfiles = rows(join(IN, 'profiles-add.csv')).map((p) => {
  const d = PROFILE_SETS[p.rows];
  if (!d) return p;
  const out = retyped({ ...p, ...d.set });
  out.quote = `${p.quote} | ${d.quote}`;
  if (d.locator) out.Locator = `${p.Locator}; ${d.locator}`;
  out.rows = [p.rows, ...(d.from ?? [])].join(' ');
  out.note = tidy(`${p.note} ${BY}: ${d.note}`);
  decided.push({ kind: 'profile cell added', target: p.rows, what: `${p.GradeID} ${Object.entries(d.set).map(([k, v]) => `${k} "${v}"`).join('; ')}`, why: d.note });
  return out;
});
for (const k of Object.keys(PROFILE_SETS)) if (!proposedProfiles.some((p) => p.rows.startsWith(k))) throw new Error(`PROFILE_SETS names ${k}, which proposes no profile`);

const likeProfile = (grade) => profiles.find((p) => p.GradeID === grade && p.Profile !== 'Retired duplicate record')
  ?? profiles.find((p) => p.MaterialID === grades.get(grade).MaterialID && p.Profile !== 'Retired duplicate record');
for (const n of NEW_PROFILES) {
  if (n.from && !readings.has(n.from)) throw new Error(`${n.from}: not a reconciled reading`);
  if (n.dropped && !dropped.some((x) => x.source_id === n.dropped[0] && x.field === n.dropped[1] && (!n.dropped[2] || x.raw.includes(n.dropped[2])) && /typed by hand/.test(x.why))) throw new Error(`${n.dropped.join(' ')}: the triage set no such setting aside`);
  const blank = Object.fromEntries(profilesHeader.map((c) => [c, '']));
  for (const c of ['Nozzle °C', 'Bed °C', 'Chamber °C', 'Enclosure', 'Drying', 'Nozzle diameter', 'Plate', 'Abrasion / clogging']) blank[c] = NP;
  // A product new in this round has no profile yet: the like-row the pipeline chose for its other proposed profile.
  const like = n.like ?? likeProfile(n.grade)?.ProfileID ?? proposedProfiles.find((p) => p.GradeID === n.grade)?.like;
  if (!like) throw new Error(`${n.grade}: no profile to copy`);
  const row = retyped({
    ...blank, gate: 'ready', SourceID: n.source, GradeID: n.grade, MaterialID: grades.get(n.grade).MaterialID, like, Profile: 'Manufacturer published guidance',
    ...n.cells, Locator: n.locator, quote: n.quote, parsed_vs_read: 'agrees', cause: 'reviewer-kept', quote_view: '', grade_from: 'reviewer',
    reader: n.from ? readings.get(n.from).Reader : 'Research agent (Codex)', rows: n.from ?? `r1-dropped.csv: ${n.dropped.slice(0, 2).join(' ')}`,
    note: tidy(`${Object.keys(n.cells).join(', ')} as the page prints it. ${BY}: ${n.note}`),
  });
  for (const c of typedColumns) if (!(c in row)) throw new Error(`profiles-add has no column ${c}`);
  proposedProfiles.push(row);
  decided.push({ kind: 'profile added', target: n.from ?? n.dropped.join(' '), what: `${n.grade} on ${n.source}: ${Object.values(n.cells).join('; ')}`, why: n.note });
}

const sets = rows(join(IN, 'profiles-set.csv'));
for (const c of CELL_SETS) {
  const p = profiles.find((x) => x.ProfileID === c.profile);
  const expect = (sets.find((s) => s.id === c.profile && s.column === c.column) ?? {}).value ?? p[c.column];
  sets.push({ gate: 'ready', table: 'profiles', id: c.profile, column: c.column, expect, value: c.value, source: p.SourceID, quote: c.quote, note: tidy(`${c.locator}: the page prints "${c.value}". ${BY}: a setting the triage set aside to type by hand.`), parsed_vs_read: 'agrees', cause: 'reviewer-kept', quote_view: '', grade_from: 'reviewer', reader: 'Research agent (Codex)', rows: 'r1-dropped.csv', GradeID: p.GradeID });
  decided.push({ kind: 'held profile cell', target: c.profile, what: `${c.column} "${c.value}"`, why: 'a tolerance window, a bound or a nozzle metal the triage set aside to type by hand' });
}
// Each held profile's Locator names the rows now read.
for (const [profile, locs] of Object.entries(Object.groupBy(CELL_SETS, (c) => c.profile))) {
  const p = profiles.find((x) => x.ProfileID === profile);
  const add = [...new Set(locs.map((c) => c.locator))].filter((l) => !p.Locator.includes(l));
  if (add.length) sets.push({ gate: 'ready', table: 'profiles', id: profile, column: 'Locator', expect: p.Locator, value: `${p.Locator}; ${add.join('; ')}`, source: p.SourceID, quote: locs[0].quote, note: 'Locator names the rows now read.', parsed_vs_read: 'agrees', cause: 'reviewer-kept', quote_view: '', grade_from: 'reviewer', reader: 'Research agent (Codex)', rows: 'r1-dropped.csv', GradeID: p.GradeID });
}

// ---------------------------------------------------------------------------------------------------- the folder
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'values-add.csv'), csvText(valuesHeader, values));
writeFileSync(join(OUT, 'profiles-add.csv'), csvText(profilesHeader, proposedProfiles));
writeFileSync(join(OUT, 'profiles-set.csv'), csvText(setHeader, sets));
const used = new Set([...Object.keys(VALUE_KEEPS), ...NEW_PROFILES.map((n) => n.from).filter(Boolean), ...Object.values(PROFILE_SETS).flatMap((d) => d.from ?? [])]);
const held = rows(join(IN, 'held.csv')).filter((h) => !used.has(h.RowID));
writeFileSync(join(OUT, 'held.csv'), csvText(headerOf(join(IN, 'held.csv')), held));
const md = (s) => String(s).replace(/\|/g, '\\|');
writeFileSync(join(OUT, 'summary.md'), `# Stage 4 proposals, reviewed

> **Historical record** (2026-10-19): the executor's decisions on the research intake's reading proposals. Written by
> \`ingest/review-r1.mjs\`; m454 applies this folder.

- ${values.length} values to add, ${proposedProfiles.length} profiles to add, ${sets.length} cells of held profiles to set.
- ${held.length} readings left held: settings no table column takes (print speed, fan, infill, spool weight), a twin's
  profile already proposed, readings already recorded from another sheet, a unit the page does not print, labels with
  no property, and page notes that change no record.

| Decision | Row | What | Why |
|---|---|---|---|
${decided.map((d) => `| ${d.kind} | ${md(d.target)} | ${md(d.what)} | ${md(d.why)} |`).join('\n')}
`);
console.log(JSON.stringify({ values: values.length, profiles: proposedProfiles.length, cellSets: sets.length, held: held.length, decisions: decided.length }));
