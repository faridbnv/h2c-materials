#!/usr/bin/env node
// What the cached sheet says around each value, against what the row records (the data audit of 2026-10-01, RC3, RC4,
// RC8). The numbers are faithful; what went wrong was the context around them: a direction, notch, bound sign or test
// temperature printed on the value's own line and not recorded; a heading or footnote stated once per page and never
// recorded (D116); a print setting printed under a label the import did not know. This reads the text cache, so it
// runs where the cache is (a contributor's checkout) and says so where it is not (CI).
//
//   npm run audit:context                      findings against the baseline; exit 1 on a new or stale one
//   npm run audit:context -- --list            every finding, accepted or not
//   npm run audit:context -- --accept CODE "reason"
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTables } from '../../build/src/load.js';
import { cacheDir, cachedText } from '../lib/pdf-text.mjs';
import { indexPageContext, contextFor, scopeOf, pageOf } from '../../build/src/page-context.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const BASELINE = join(root, 'data/review/context-witness-accepted.csv');
const args = process.argv.slice(2);
if (!existsSync(cacheDir('text'))) { console.log('audit:context skipped: no text cache (.cache/text) in this checkout'); process.exit(0); }

const t = loadTables(join(root, 'data'));
const rows = (sheet) => t[sheet].rows;
const sha = new Map(rows('Sources').map((s) => [s.SourceID, s.SHA256]));
const textCache = new Map();
const pagesOf = (sourceId) => {
  const h = sha.get(sourceId); if (!h || !/^[0-9a-f]{64}$/.test(h)) return null;
  if (!textCache.has(h)) { const c = cachedText(h); textCache.set(h, c ? c.pages.map((p) => ({ page: p.page, lines: p.lines.map((l) => String(l.text ?? '').replace(/\s+/g, ' ').replace(/(\d)\s*([.,])\s*(\d)/g, '$1$2$3')) })) : null); }
  return textCache.get(h);
};
// CI has a .cache/text the import tests write, and none of the makers' sheets: the guard judges only where a sheet is.
if (![...sha.keys()].some((id) => pagesOf(id))) { console.log('audit:context skipped: the text cache (.cache/text) holds none of the cited sheets in this checkout'); process.exit(0); }
const NA =(v) => v == null || v === '' || v === 'Not applicable' || /^Not published/.test(v);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const findings = [];
const add = (code, record, field, message) => findings.push({ code, record, field, message });

// ---- each value's own line
const live = rows('Properties').filter((r) => /^Published value/.test(r['Data status']) && !/implausible/.test(r['Data status']) && !NA(r['Normalized value']));
for (const r of live) {
  const pages = pagesOf(r.SourceID); const pg = pageOf(r.Locator); if (!pages || pg == null) continue;
  const page = pages.find((p) => p.page === pg); if (!page) continue;
  const tok = String(r['Raw value'] ?? '').match(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:[.,]\d+)?/)?.[0]; if (!tok) continue;
  const re = new RegExp(`(^|[^0-9.,])(${esc(tok)}|${esc(tok.replace('.', ','))})(?![0-9]|[.,][0-9])`);
  const words = String(r.Locator).replace(/^[^:]*:/, '').toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 4);
  const score = (l) => words.filter((w) => l.toLowerCase().includes(w)).length;
  let best = null;
  page.lines.forEach((l, i) => { if (!re.test(l)) return; const own = /[a-z]{3,}/i.test(l.replace(re, '')); const ctx = own ? l : `${[page.lines[i - 1] ?? '', page.lines[i + 1] ?? ''].sort((a, b) => score(b) - score(a))[0]} ${l}`; const s = score(ctx) + (own ? 0.5 : 0); if (!best || s > best.s) best = { s, ctx, line: l }; });
  if (!best || best.s < 1) continue;
  const ctx = best.ctx, lc = ctx.toLowerCase(), id = r.MeasurementID, q = `"${ctx.slice(0, 110)}"`;
  const sign = best.line.match(new RegExp(`([<>≤≥＜＞]|(?:^|[\\s(])(?:max\\.|min\\.|up to|over|above|below))\\s*${esc(tok)}(?![0-9])`, 'i'));
  if (sign && (NA(r.Operator) || r.Operator === '=')) add('CONTEXT-BOUND-SIGN', id, 'Operator', `the line prints "${sign[0].trim()}"; Operator is "${r.Operator}" — ${q}`);
  if (!/temperature|transition|melting|crystalli|vicat|hdt|softening/i.test(r.Property) && /(^|[^0-9a-z])[-−]\s?(10|20|30|40)\s*(°|℃|˚)?\s*c\b|@\s*[-−]\s?\d{2}/i.test(ctx) && !/75-1,\s*-2/i.test(ctx) && NA(r['Test temperature °C'])) add('CONTEXT-TEST-TEMPERATURE', id, 'Test temperature °C', `the line states a sub-zero test temperature; none is recorded — ${q}`);
  // An impact value is defined at its test temperature (D92); a line that prints one ("@23° C", "(+23°C)", "at 23 °C")
  // and a row that records none lose it (the data audit's R10).
  if (/Izod|Charpy|Impact/i.test(r.Property) && NA(r['Test temperature °C']) && /(?:@|\bat\b|\(\s*\+?)\s*-?\d{1,2}\s*(?:°|℃|˚)\s*c?\b/i.test(ctx)) add('CONTEXT-TEST-TEMPERATURE', id, 'Test temperature °C', `the line states a test temperature; none is recorded — ${q}`);
  const mech = /Tensile|Flexural|Elongation|Charpy|Izod|Impact|HDT|modulus/i.test(r.Property);
  const both = /\bxy\b|x\s*-\s*y/i.test(ctx) && /\(\s*z\s*\)|\bzx\b|\bxz\b|z\s*-\s*x/i.test(ctx);
  const onLine = /\(\s*x\s*[-–]?\s*y\s*\)|\bx\s*-\s*y\b|\bxy\b|\bhorizontal\b/i.test(ctx) ? 'XY' : /\(\s*z\s*\)|\bz[- ]?direction\b|\bvertical\b|\(\s*z\s*[-–]\s*x\s*\)|\bzx\b|\bxz\b/i.test(ctx) ? 'Z' : null;
  const rec = /^(XY|Horizontal)/i.test(r.Direction) ? 'XY' : /^(Z|ZX|XZ|Vertical)/i.test(r.Direction) ? 'Z' : null;
  if (mech && onLine && !both && rec && onLine !== rec) add('CONTEXT-DIRECTION', id, 'Direction', `the line says ${onLine}; Direction is ${r.Direction} — ${q}`);
  if (mech && onLine && !both && !rec && /Unstated|Not published|Not applicable/.test(r.Direction)) add('CONTEXT-DIRECTION', id, 'Direction', `the line says ${onLine}; Direction is ${r.Direction} — ${q}`);
  // A standard printed on the value's own line that the row does not name (or names another family's).
  // DIN prints its five digits with a point ("DIN 53.504").
  const lineStd = [...new Set([...ctx.matchAll(/\b(ISO|ASTM|DIN|GB\/T)\s?-?\s?([A-Z]?\s?(\d{2}\.\d{3}|\d{2,5}))(?![\d.,]*\s*(?:-|–)\s*\d)/gi)].filter((x) => x[3] !== tok).map((x) => ({ name: `${x[1].toUpperCase()} ${x[2].replace(/[\s.]/g, '').toUpperCase()}`, digits: x[3].replace('.', '') })))];
  const rowDigits = new Set(String(r.Standards ?? '').match(/\d{2,5}/g) ?? []);
  if (lineStd.length && NA(r.Standards)) add('CONTEXT-STANDARD', id, 'Standards', `the line names ${lineStd.map((x) => x.name).join(', ')}; Standards is ${r.Standards} — ${q}`);
  else if (lineStd.length && !NA(r.Standards) && !lineStd.some((x) => rowDigits.has(x.digits))) add('CONTEXT-STANDARD', id, 'Standards', `the line names ${lineStd.map((x) => x.name).join(', ')}; Standards is ${r.Standards} — ${q}`);
  if (/Izod|Charpy|Impact/i.test(r.Property)) {
    const un = /un-?notch/i.test(lc); const no = /(^|[^n])notch(ed)?\b/i.test(lc.replace(/un-?notch(ed)?/gi, ''));
    if ((un && !no && r.Notch === 'Notched') || (no && !un && r.Notch === 'Unnotched')) add('CONTEXT-NOTCH', id, 'Notch', `the line says ${un ? 'unnotched' : 'notched'}; Notch is ${r.Notch} — ${q}`);
  }
}

// ---- what a page states once, with no page_context row to carry it (D116)
const pageIndex = indexPageContext(rows('Page context'));
const byPage = new Map();
for (const r of live) { const pg = pageOf(r.Locator); if (pg == null) continue; const k = `${r.SourceID}\u0000${pg}`; if (!byPage.has(k)) byPage.set(k, []); byPage.get(k).push(r); }
// A statement about the test, not about storage, marketing or a link: "3D printed parts" sells the filament, "store in a
// dry place" and "conditioned at room temperature for 24h" (no humidity) say nothing about a value's moisture, and an
// "after annealing" in a sentence about warping is advice. The readers of the 2026-10-01 sweep found half the first
// version's statements were such.
const STATEMENTS = [
  ['Specimen type', /non-?injection mou?lded|printed specimens?|printed samples?|3d[- ]printed (test )?(specimens?|samples?)\b(?! at \d+ different angles)|specimens? (were )?printed|typical material properties\s*[–-]\s*3d printed/, (r) => /^Not published|Raw material value/.test(r['Specimen type'])],
  ['Moisture state', /\(dry state\)|dry state|dry status|\bdry,? @ ?\d+ ?mm\/min|\(dry, at \d+|dry as mou?lded|\(dry\)|in dry condition|conditioned (?:at|in)[^.]{0,40}(?:% ?r\.?h|humidity|standard climate)|\(conditioned\b/, (r) => r['Moisture state'] === 'not-stated'],
  ['Post-processing state', /(all )?(specimens?|samples?) (were )?annealed|annealed at \d+|\(after annealing\)|退火/, (r) => r['Post-processing state'] === 'not-stated'],
];
const ADVICE = /\b(store|stored|storage|keep|transport|ensure the filament)\b[^.]{0,60}$/;
for (const [k, list] of byPage) {
  const [sourceId, pg] = k.split('\u0000'); const page = pagesOf(sourceId)?.find((p) => p.page === Number(pg)); if (!page) continue;
  const text = page.lines.join(' ').toLowerCase();
  for (const [field, said, silent] of STATEMENTS) {
    const m = text.match(said); if (!m || (field === 'Post-processing state' && /without (having to )?anneal/.test(text))) continue;
    if (ADVICE.test(text.slice(Math.max(0, m.index - 80), m.index))) continue;
    // A page_context row for this field anywhere on the page means a reader read the statement and scoped it (D116):
    // the rows outside its scope are outside the table it heads.
    const scoped = (pageIndex.get(`${sourceId}\u0000${Number(pg)}`) ?? []).some((c) => c[field] && !/^Not published|not-stated/.test(c[field]));
    if (scoped) continue;
    // A moisture statement qualifies the mechanical tests; a heat deflection bar is tested as moulded or printed.
    const open = list.filter((r) => (field === 'Moisture state' ? /Tensile|Flexural|Elongation|Impact|Charpy|Izod|modulus/i : /Tensile|Flexural|Elongation|Impact|Charpy|Izod|HDT|modulus/i).test(r.Property) && silent(r) && !contextFor(pageIndex, r).some((c) => c[field] && !/^Not published|not-stated/.test(c[field])));
    if (open.length) add('CONTEXT-PAGE-UNRECORDED', `${sourceId} p. ${pg}`, field, `the page says "${m[0]}"; ${open.length} of its rows (${open.slice(0, 4).map((r) => r.MeasurementID).join(', ')}${open.length > 4 ? ', …' : ''}) record nothing, and no page_context row carries it`);
  }
}

// ---- print settings a sheet prints and its profile does not hold
const LABEL = { Bed: /(?:platform temp|print platform|bed temp(?:erature)?|heated bed|hot ?bed temp|build plate temp(?:erature)?|plate temp|底板温度|热床)[^0-9]{0,40}?(\d{2,3})\s*(?:-|–|~|to)\s*(\d{2,3})\s*(?:°|℃|˚|c\b)/i, Nozzle: /(?:nozzle temp(?:erature)?|print(?:ing)? temp(?:erature)?|extru(?:der|sion) temp(?:erature)?|喷嘴温度|打印温度)[^0-9]{0,40}?(\d{3})\s*(?:-|–|~|to)\s*(\d{3})\s*(?:°|℃|˚|c\b)/i };
const profilesByGrade = new Map(); for (const r of rows('Print setup').filter((x) => x.Profile !== 'Retired duplicate record')) { if (!profilesByGrade.has(r.GradeID)) profilesByGrade.set(r.GradeID, []); profilesByGrade.get(r.GradeID).push(r); }
for (const r of rows('Print setup').filter((x) => x.Profile !== 'Retired duplicate record')) {
  // A profile that records how a sheet's test bars were printed holds no guidance by design (m170).
  if (/not printing guidance/.test(r.Locator)) continue;
  const pages = pagesOf(r.SourceID); if (!pages) continue;
  const text = pages.map((p) => p.lines.join(' ')).join(' ');
  for (const [axis, re] of Object.entries(LABEL)) {
    if (r[`${axis} state`] === 'range') continue;
    const m = text.match(re); if (m) add('CONTEXT-PROFILE-SETTING', r.ProfileID, `${axis} °C`, `its own sheet prints "${m[0].slice(0, 70)}"; the profile holds ${r[`${axis} °C`]}${profilesByGrade.get(r.GradeID).some((p) => p[`${axis} state`] === 'range') ? ' (another profile of the product holds a window)' : ' (no profile of the product holds one)'}`);
  }
  // A chamber window, an enclosure ask or a drying schedule its own sheet prints, where the profile holds nothing (the
  // data audit's R50–R52: "Recommended environmental temperature 70 – 80", "it is recommended to use an enclosure",
  // "Drying conditions: 70°C / 4 hours").
  if (r['Chamber state'] === 'unknown') {
    const m = text.match(/(?:chamber|environment(?:al)?|ambient|enclosure)\s*temp(?:erature)?\.?[^0-9]{0,30}?(\d{2,3})\s*(?:-|–|~|to)\s*(\d{2,3})\s*(?:\(|°|℃|˚|c\b)/i);
    if (m) add('CONTEXT-PROFILE-SETTING', r.ProfileID, 'Chamber °C', `its own sheet prints "${m[0].slice(0, 70)}"; the profile holds ${r['Chamber °C']}`);
  }
  if (r['Enclosure state'] === 'unknown' && !/^(recommended|range|enclosed|required)$/.test(r['Chamber state'])) {
    // A question the sheet answers ("Enclosed chamber required No") is read with its answer.
    const m = text.match(/recommended to (?:use|print (?:with|in)) an? (?:enclosure|enclosed (?:printer|chamber))|enclosed (?:chamber|printer|space)\s*(?:required|recommended)?\s*[:\-]?\s*(?:required|recommended|yes|no)\b|requires? an? enclosure/i);
    if (m) add('CONTEXT-PROFILE-SETTING', r.ProfileID, 'Enclosure', `its own sheet prints "${m[0].slice(0, 70)}"; the profile holds ${r.Enclosure}`);
  }
  if (r['Drying state'] === 'unknown' || /^Not published$/.test(r.Drying)) {
    const m = text.match(/dry(?:ing)?(?: conditions?| temp(?:erature)?\.?(?: and time)?)?\s*[:\-]?\s*(\d{2,3})\s*(?:°|℃|˚)\s*c?\s*[\/,x×]?\s*(?:for\s*)?(\d{1,2})\s*(?:-\s*\d{1,2}\s*)?(?:h|hours?|hrs?)\b/i);
    if (m) add('CONTEXT-PROFILE-SETTING', r.ProfileID, 'Drying', `its own sheet prints "${m[0].slice(0, 70)}"; the profile holds ${r.Drying}`);
  }
  // "Hardened Nozzle no" printed on the profile's own sheet against a typed TRUE, or the reverse.
  // A sheet laid out as question and answer in two columns prints the answer a line away from its question: Spectrum's
  // TPU sheets read "Dry box recommended / Yes / No / Ruby or hardened nozzle recommended", where "No" answers the nozzle
  // question; the bare question was read as a recommendation (the control re-read of 2026-10-01).
  if (/^Ruby or hardened nozzle recommended$/i.test(r['Abrasion / clogging'])) {
    const lines = pages.flatMap((p) => p.lines.map((l) => l.trim()));
    const i = lines.findIndex((l) => /^Ruby or hardened nozzle recommended$/i.test(l));
    const near = i < 0 ? [] : [lines[i - 1], lines[i + 1]].filter((l) => /^(yes|no)$/i.test(l ?? ''));
    if (near.length) add('CONTEXT-PROFILE-SETTING', r.ProfileID, 'Hardened nozzle', `its sheet answers the question on the next line ("${near.join('" / "')}"); the profile holds the bare question as ${r['Hardened nozzle']}`);
  }
  // A sheet may ask the question and answer it ("Ruby or hardened nozzle recommended No"), or deny it ("no hardened nozzle
  // required").
  const hn = text.match(/(\bno\s+)?hardened nozzle\s*(?:(?:recommended|required)\s*\??\s*[:\-]?\s*(no|yes)\b|[:\-]?\s*(no|yes|not (?:required|necessary)|required|recommended)\b)/i);
  // A profile whose cell holds the sheet's question with its answer has been read from its own words; the text layer
  // can run a neighbouring answer into the question ("No Hardened nozzle required Yes").
  const answered = /\b(yes|no|nein|not necessary|not required)\s*$/i.test(r['Abrasion / clogging']);
  if (hn && !answered) { const says = hn[1] || /^(no|not)/i.test(hn[2] ?? hn[3]) ? 'FALSE' : 'TRUE'; if (r['Hardened nozzle'] !== says && r['Hardened nozzle'] !== 'Not published') add('CONTEXT-PROFILE-SETTING', r.ProfileID, 'Hardened nozzle', `its own sheet prints "${hn[0]}"; the profile holds ${r['Hardened nozzle']}`); }
}

// ---- what the importer's own sheet reader finds on a profile's sheet and the profile does not hold (RC8, the control
// re-read of 2026-10-01: the label regexes above find the labels someone thought of; the reader finds every label its
// lexicon knows, in every layout it reads). A sheet that prints how its test bars were printed, or a line that states
// an infill, describes specimens, not guidance (m170).
const { readSheet, testBlockAt } = await import('../ingest/propose.mjs');
const registry = new Map(rows('Property registry').map((p) => [p.Property, p]));
const SPECIMENS = /printed specimen conditions|specimen (preparation|conditions)[:\s]|test specimens?( were)? (3d )?printed|print test condition|specimens were printed at the following/i;
// The numbers a cell states, and an open end's sign: what two readings of one setting must share.
// "for more than 4 hours" states the open end ">4h" states (Siraya Tech's two wordings of one schedule).
const statedOf = (v) => (String(v).replace(/\b(?:more than|at least|over|above)\b\s*/gi, '> ').match(/\d+(?:[.,]\d+)?|[+<>＞≥≤]/g) ?? []).map((n) => n.replace(',', '.').replace('＞', '>'));
const READ_COLUMN = { nozzle: 'Nozzle °C', bed: 'Bed °C', chamber: 'Chamber °C', enclosure: 'Enclosure', drying: 'Drying', 'nozzle-material': 'Abrasion / clogging' };
const sheetSettings = new Map();
// A setting a few lines under "How to make specimens", "printed under the following conditions" or a line that states an
// infill is the setting the test bars were printed at, not guidance: Polymaker's "Environmental Temperature 90°C" (m170).
const SPECIMEN_BLOCK = /h\s*o\s*w\s+t\s*o\s+m\s*a\s*k\s*e\s+s\s*p\s*e\s*c\s*i\s*m\s*e\s*n|specimens? (were|was) printed|printed (under|at) the following|printed specimen conditions|print test condition|test equipment|\binfill\s*[:=]?\s*\d|\bshell\s+\d|top\s*&\s*bottom\s+layer/i;
// The reader may have joined a label to the value on the line below it ("Extruder Temperature" / "275℃"), so the setting is
// found by its whole line or by its label with its value just below.
const inSpecimenBlock = (pages, x) => {
  const line = x.line.replace(/\s+/g, ' ').trim(); const raw = String(x.raw ?? '').replace(/\s+/g, ' ').trim();
  for (const p of pages ?? []) {
    for (let i = 0; i < p.lines.length; i++) {
      const own = p.lines[i] === line || p.lines[i].includes(line.slice(0, 40));
      const below = x.label && p.lines[i].toLowerCase().startsWith(x.label.toLowerCase()) && raw && (p.lines[i + 1] ?? '').includes(raw.slice(0, 12));
      // A numbered note or a notes heading after the test block begins guidance again (Raise3D's "2. Please dry …").
      if (own || below) {
        for (let k = i; k >= Math.max(0, i - 8); k--) {
          if (k < i && /^\s*\d+\.\s+\S|^(notes?|precautions?|tips?)\b/i.test(p.lines[k + 1] ?? '')) return false;
          if (SPECIMEN_BLOCK.test(p.lines[k] ?? '')) return true;
        }
        return false;
      }
    }
  }
  return false;
};
for (const r of rows('Print setup').filter((x) => x.Profile !== 'Retired duplicate record')) {
  const h = sha.get(r.SourceID); if (!h || !/^[0-9a-f]{64}$/.test(h)) continue;
  if (!sheetSettings.has(r.SourceID)) {
    const c = cachedText(h);
    let settings = [];
    if (c) { try { settings = readSheet(c, registry).settings; } catch { settings = []; } }
    const pg = pagesOf(r.SourceID);
    // A sheet that prints test-bar settings beside its guidance (eSUN's "Print test condition", 3DXTECH's "Printed Specimen
    // Conditions") is read block by block: what sits under such a heading is not guidance, what sits elsewhere is.
    sheetSettings.set(r.SourceID, settings.filter((x) => !/infill/i.test(x.line) && !inSpecimenBlock(pg, x)));
  }
  // A profile that says its sheet prints no guidance (m170: only how the test bars were printed) is checked too: the
  // reader may find guidance in the notes beside them (Raise3D's "2. Please dry the filament … at least 8 hours").
  if (/not printing guidance/.test(r.Locator)) {
    for (const x of sheetSettings.get(r.SourceID)) if (READ_COLUMN[x.field] && /\d|\b(yes|no|not|required|recommended|needed|necessary|hardened|brass|steel|ruby)\b/i.test(x.raw)) add('CONTEXT-PROFILE-SETTING', r.ProfileID, READ_COLUMN[x.field], `the profile says its sheet prints no guidance; the import's sheet reader finds "${x.line.slice(0, 80)}"`);
    continue;
  }
  for (const x of sheetSettings.get(r.SourceID)) {
    const column = READ_COLUMN[x.field]; if (!column) continue;
    const held = r[column];
    // Polymaker's "Closure chamber | Needed (90-100°C)" states a chamber, and a profile may hold it there.
    const asChamber = x.field === 'enclosure' && r['Chamber °C'] === x.raw;
    const silent = !asChamber && held === 'Not published';
    if (silent && /\d|\b(yes|no|nein|not|required|recommend\w*|needed|necessary|room|ambient|brass|steel|hardened|ruby|closed|enclosed)\b/i.test(x.raw)) add('CONTEXT-PROFILE-SETTING', r.ProfileID, column, `the import's sheet reader finds "${x.line.slice(0, 80)}"; the profile holds ${held.slice(0, 40)}`);
    // A cell that holds part of what the sheet prints: a drying schedule without its hours, a window without its open
    // end's "+", a typo that split a number ("240 - 28 0 °C"), a specimen's print temperature for the guidance.
    const numeric = ['nozzle', 'bed', 'chamber', 'drying'].includes(x.field);
    const read = statedOf(x.raw);
    if (!silent && !asChamber && numeric && read.some((v) => /\d/.test(v)) && !sheetSettings.get(r.SourceID).some((y) => y.field === x.field && statedOf(y.raw).every((v) => statedOf(held).includes(v)))) {
      add('CONTEXT-PROFILE-SETTING', r.ProfileID, column, `the import's sheet reader finds "${x.line.slice(0, 80)}"; the profile holds "${held.slice(0, 50)}"`);
    }
  }
}

// ---- a held setting the sheet prints only where the reader does not read guidance: under a test-bar heading or in a
// pellet-processing table (the independent review of the profile root-cause sweep: the reader drops what sits there, so
// a profile that holds it is otherwise invisible to the check above).
const tempsOf = (v) => (String(v).match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => Number(n.replace(',', '.'))).filter((n) => n >= 15 && n <= 450);
for (const r of rows('Print setup').filter((x) => x.Profile !== 'Retired duplicate record' && !/not printing guidance/.test(x.Locator))) {
  const pages = pagesOf(r.SourceID); if (!pages) continue;
  for (const column of ['Nozzle °C', 'Bed °C', 'Chamber °C']) {
    const want = tempsOf(r[column]); if (!want.length || /^Not published/.test(r[column])) continue;
    const at = pages.flatMap((p) => p.lines.flatMap((l, i) => (want.every((v) => tempsOf(l).includes(v)) ? [testBlockAt(p.lines, i)] : [])));
    if (at.length && at.every(Boolean)) add('CONTEXT-PROFILE-SETTING', r.ProfileID, column, `"${r[column].slice(0, 40)}" is printed on its sheet only under a test-bar or pellet-processing heading`);
  }
}

// ---- the baseline
const key = (f) => `${f.code}\u0000${f.record}\u0000${f.field}`;
const parse = (text) => text.trim().split('\n').slice(1).filter(Boolean).map((l) => { const m = l.match(/^([^,]*),([^,]*),([^,]*),"?(.*?)"?,([^,]*)$/); return m ? { code: m[1], record: m[2], field: m[3], reason: m[4].replace(/""/g, '"'), accepted: m[5] } : null; }).filter(Boolean);
const accepted = existsSync(BASELINE) ? parse(readFileSync(BASELINE, 'utf8')) : [];
const acceptAt = args.indexOf('--accept');
if (acceptAt >= 0) {
  const [code, reason] = [args[acceptAt + 1], args[acceptAt + 2]];
  if (!code || !reason) { console.error('usage: npm run audit:context -- --accept CODE "reason"'); process.exit(2); }
  const have = new Set(accepted.map(key)); const date = new Date().toISOString().slice(0, 10);
  for (const f of findings.filter((x) => x.code === code && !have.has(key(x)))) accepted.push({ code: f.code, record: f.record, field: f.field, reason, accepted: date });
  const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
  writeFileSync(BASELINE, ['Code,Record,Field,Reason,Accepted', ...accepted.sort((a, b) => key(a).localeCompare(key(b))).map((a) => [a.code, a.record, a.field, q(a.reason), a.accepted].join(','))].join('\n') + '\n');
  console.log(`accepted ${findings.filter((x) => x.code === code).length} ${code} finding(s)`);
  process.exit(0);
}
const have = new Set(accepted.map(key)); const now = new Set(findings.map(key));
// An acceptance goes stale only where its sheet was read: a checkout missing that sheet cannot say the finding is gone.
const sourceOfRecord = new Map([...rows('Properties').map((r) => [r.MeasurementID, r.SourceID]), ...rows('Print setup').map((r) => [r.ProfileID, r.SourceID])]);
const judged = (a) => Boolean(pagesOf(sourceOfRecord.get(a.record) ?? a.record.replace(/ p\. \d+$/, '')));
const fresh = findings.filter((f) => !have.has(key(f))); const stale = accepted.filter((a) => !now.has(key(a)) && judged(a));
if (args.includes('--list')) for (const f of findings) console.log(`${have.has(key(f)) ? 'accepted' : 'NEW     '} ${f.code.padEnd(26)} ${f.record} [${f.field}] ${f.message.slice(0, 160)}`);
else for (const f of fresh) console.log(`NEW ${f.code.padEnd(26)} ${f.record} [${f.field}] ${f.message.slice(0, 160)}`);
for (const a of stale) console.log(`STALE ${a.code} ${a.record} [${a.field}]: the finding no longer occurs; remove its acceptance`);
const by = {}; findings.forEach((f) => (by[f.code] = (by[f.code] ?? 0) + 1));
console.log(`audit:context: ${findings.length} finding(s): ${findings.length - fresh.length} accepted, ${fresh.length} new ${JSON.stringify(by)}, ${stale.length} stale`);
process.exit(fresh.length || stale.length ? 1 : 0);
