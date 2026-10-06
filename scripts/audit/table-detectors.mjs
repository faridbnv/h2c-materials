#!/usr/bin/env node
// Cheap detectors for the error CLASSES the AI re-reads of the last rounds kept finding (check round 3, 2026-10-05).
//
// Those errors were almost never misread characters. They were errors of meaning or position, and each was a class:
//   - a label read as another column (a "Dry box" humidity recommendation stored as the Drying cell of 169 profiles,
//     the Polish sheets' "Suszarka" too; a test specimen's print temperatures stored as the print recommendation);
//   - a negation missed ("has not been annealed" read as annealed; "Not necessary" read as a schedule);
//   - a rule applied outside its scope (the PLA printer guide answering for metal-filled PLAs; a twin reading a
//     sibling that is a different formulation; a page's "printed specimen" reaching a moulded bar);
//   - words of one column sitting in another (a conditioning sentence in Notes while the typed state says nothing).
// A model reading every record for these costs hours; a regular expression finds the candidates in seconds, so
// Sonnet/Opus read only the candidates. Recall comes first: a weaker match is reported with Confidence "low", not
// skipped. Nothing here decides anything or edits anything: each detector writes a CSV of candidates.
//
//   node scripts/audit/table-detectors.mjs                     all five detectors
//   node scripts/audit/table-detectors.mjs --only negation     one of: mislabel, wrong-column, negation, scope, product-on-page
//   node scripts/audit/table-detectors.mjs --include-single   product-on-page also checks sources that hold one product only
//   node scripts/audit/table-detectors.mjs --help
//
// Reads data/tables/*.csv and dist/db.json (the compiled database; `npm run build` makes it, and this runs that once if
// it is missing). Writes build/reports/table-detectors/<detector>.csv, columns Detector, Table, Record, GradeID,
// SourceID, Column, Value, Typed, Evidence, Why, Confidence, Rule, and prints a count per detector with its five most
// common (Column, Value) patterns. `negation` also writes negation-null-readers.csv (the parsers that return nothing
// for a cell with words in it). `product-on-page` reads the local text cache (.cache/text) and prints SKIPPED where it
// is absent, as audit:context does. Read-only with respect to data/ and dist/.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';
import { readCsv, csvText } from '../../build/src/csv.js';
import { parseDrying, parseEnclosure, parseNozzleDiameters, parseTemperature, parseAbrasion } from '../../build/src/normalize/process.js';
import { readMoistureState } from '../../build/src/normalize/moisture.js';
import { readPostProcessingState } from '../../build/src/normalize/specimen.js';
import { readAbrasion } from '../../build/src/recipe.js';
import { reviewFields } from '../../build/src/typed-values.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(root, 'build/reports/table-detectors');
const HEADER = ['Detector', 'Table', 'Record', 'GradeID', 'SourceID', 'Column', 'Value', 'Typed', 'Evidence', 'Why', 'Confidence', 'Rule'];
const NP = 'Not published', NA = 'Not applicable';

// ---------------------------------------------------------------------------------------------------------------- helpers

const known = (v) => v != null && v !== '' && v !== NP && v !== NA;
const clip = (s, n = 200) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };
const fold = (s) => String(s ?? '').normalize('NFKC').replace(/[º˚]/g, '°').replace(/\s+/g, ' ').trim();
const table = (name) => readCsv(join(root, 'data/tables', `${name}.csv`)).records.map((r) => ({ ...r.values, __line: r.line }));
const wordRe = (alts, flags = 'giu') => new RegExp(String.raw`(?<![\p{L}\p{N}])(?:${alts})(?![\p{L}\p{N}])`, flags);

function loadDb() {
  const path = join(root, 'dist/db.json');
  if (!existsSync(path)) { console.log('dist/db.json is missing: running npm run build once'); execSync('npm run build', { cwd: root, stdio: 'inherit' }); }
  return JSON.parse(readFileSync(path, 'utf8'));
}

const finding = (detector, o) => ({
  Detector: detector, Table: o.table, Record: o.record, GradeID: o.grade ?? '', SourceID: o.source ?? '', Column: o.column, Value: clip(o.value, 220),
  Typed: clip(o.typed, 160), Evidence: clip(o.evidence, 260), Why: o.why, Confidence: o.confidence ?? 'high', Rule: o.rule,
});

// ------------------------------------------------------------------------------------------------- negation / condition words

// Words that turn a statement round or make it conditional. Strong ones deny or remove the thing; weak ones make it
// depend on a condition ("when wet", "optional"). Exported: the matcher is the part worth testing on its own.
const STRONG_NEG = String.raw`not|no|without|unless|never|n\/a|non-\w+|nicht|kein\w*|ohne|nie|nein|niewymagane|nieobowi\w+|brak|bez|unnecessary|neither|nor`;
const WEAK_NEG = String.raw`only\s+if|only\s+when|optional(?:ly)?|except|if\s+needed|if\s+necessary|if\s+required|if\s+wet|if\s+desired|when|nur\s+wenn|wenn|falls|jeśli|jesli|gdy|w\s+razie`;
const STRONG_RE = wordRe(STRONG_NEG);
const WEAK_RE = wordRe(WEAK_NEG);

/** The negation (strong) and condition (weak) words in a cell, ignoring the missing-state phrases ("Not published"). */
export function negationHits(text) {
  const t = fold(text).replace(/\bnot\s+(?:published|applicable|stated|specified|available)\b/gi, ' ').replace(/\bn\.\s?a\.?/gi, ' ');
  return { strong: [...t.matchAll(STRONG_RE)].map((m) => m[0].toLowerCase()), weak: [...t.matchAll(WEAK_RE)].map((m) => m[0].toLowerCase()) };
}

// ----------------------------------------------------------------------------------------------------- qualifier vocabulary

// Words that make a product something other than the plain type a printer maker's guide describes (scope detector).
// `low`: a weak signal (a grade name often carries it without changing the formulation).
const QUALIFIERS = [
  ['silk', /\bsilk\b|\bseiden/i], ['matte', /\bmatt?e?\b|\bmatt\b/i], ['glow', /\bglow\b|luminous|phosphor/i],
  ['marble', /\bmarble\b/i], ['sparkle', /sparkle|glitter|galaxy|shimmer|spangle|\bpearl\b|\bmetallic\b/i],
  ['wood', /\bwood\b|\bholz\b|bamboo|\bcork\b/i], ['metal', /\bmetal\w*\b|\bcopper\b|\bbronze\b|\bbrass\b|\bsteel\b|\biron\b|\balumin\w+\b|\btungsten\b|\bmagnetite\b/i],
  ['carbon', /\bCF\b|\bcarbon(?!ate|at\b)|\bCFK\b|\bCFRP\b/i], ['glass', /\bGF\b|\bglass\b|\bglas\b|\bGFK\b/i],
  ['foam', /\bfoam\w*\b|\bLW\b|\baero\b|light[- ]?weight|\bexpand\w*\b/i], ['esd', /\bESD\b|conductive|antistatic|anti-static/i],
  ['high-speed', /\bHS\b|high[- ]?speed|high[- ]?flow|\bHF\b|\brapid\b|\bspeed\b/i], ['translucent', /translucent|transparent|\bclear\b/i],
  ['tough/pro/+', /\btough\b|\bpro\b|\+/i, true],
];
// A grade's Composition / filler sometimes holds a sheet line that is not a composition at all (a bed-surface line, a shop
// price list); its words are no evidence of a filler.
export const NOT_A_COMPOSITION = /build\s+surface|printing\s+platform|print\s+surface|bed\s+adhesion|starting\s+at|ex\.\s*VAT|select\s+options|\bglue\b|build\s*plate|printing\s+platform|Not published|inferred filing/i;
export function gradeQualifiers(g) {
  const main = qualifiersOf(`${g.product} ${known(g.variant) ? g.variant : ''}`);
  const comp = known(g.composition) && !NOT_A_COMPOSITION.test(g.composition) ? qualifiersOf(g.composition) : new Set();
  return { main, comp };
}
export function qualifiersOf(text) {
  const out = new Set();
  for (const [label, re] of QUALIFIERS) if (re.test(String(text ?? ''))) out.add(label);
  return out;
}
const isLowQualifier = (label) => !!QUALIFIERS.find((q) => q[0] === label)?.[2];

// ====================================================================================================================
// 1. mislabel: a label read as another column, from a denylist built from real errors
// ====================================================================================================================

const DRYING_VERB = /\bdry\b|\bdried\b|\bdrying\b|dehydr|dehumid|trockn|getrocknet|trocken(?!box|schrank)|suszen|susz[ąa]|siccat|séch|secad|\bbake\b|\bbaking\b|\boven\b|\bdryer\b|\bpre-?dry/i;
const DRYBOX_PHRASE = /dry[\s-]*box|drybox|dry\s+cabinet|dry\s+storage|dry\s+environment|dry\s+place|keep\s+dry|kept\s+dry|storage|suszarka|trockenbox|trockenschrank|lagerung|aufbewahr/gi;
const STORAGE_WORDS = /dry[\s-]*box|drybox|dry\s+cabinet|dry\s+storage|dry\s+environment|dry\s+place|keep\s+dry|kept\s+dry|storage|stored?\b|humidity|relative\s+humidity|\bRH\b|\d\s*%|desicc|vacuum[\s-]*seal|sealed|suszarka|trockenbox|trockenschrank|lagerung|aufbewahr|luftfeucht|wilgotno|przechow/i;
const STORAGE_STRONG = /dry[\s-]*box|drybox|dry\s+cabinet|dry\s+storage|dry\s+environment|storage|desicc|vacuum[\s-]*seal|sealed|suszarka|trockenbox|trockenschrank|lagerung|aufbewahr|przechow/i;
const DRYBOX_LABEL = /dry[\s-]*box|drybox|suszarka|storage|humidity|dry\s+environment|dry\s+storage|lagerung|aufbewahrung|luftfeucht|wilgotno|przechow|desiccant/i;
const SPECIMEN_LABEL = /test(?:ing)?\s+(?:specimen|bar|sample|piece|part)s?|specimens?|probek[öo]rper|pr[üu]fk[öo]rper|pr[üu]fstab|zugstab|printed\s+test|test\s+print|pr[óo]bk|samples?\s+(?:were|was)\s+printed|conditions?\s+(?:of\s+)?the\s+(?:test|specimen)/i;
const RECOMMEND_LABEL = /recommend|guidance|guideline|settings|processing|printing\s+(?:parameters|temperature|conditions)|nozzle\s+temp|empfohlen|drucktemperatur|zalecan|temperatura\s+dyszy/i;
const NOT_GUIDANCE = /not\s+printing\s+guidance|which\s+are\s+not\s+printing|are\s+the\s+specimens|specimens'?\s+print\s+conditions/i;

// A one-word answer to a question the sheet asks ("Is drying highly recommended? Required") is a statement, not a stray cell.
const BARE_ANSWER = /^(?:required|recommended|highly recommended|yes|always|necessary|mandatory|essential|strongly recommended|needed)[.!]?$/i;
const hasAnyDryingNumber = (text) => { const p = parseDrying(text); return p.tempC != null || p.hours != null; };
const hasSchedule = (text) => { const p = parseDrying(text); return p.tempC != null && (p.hours != null || /\d\s*(?:h|hrs?|hours?|min)\b/i.test(text)); };

function specimenTemps(measurements) {
  // grade|source -> { nozzle:Set, bed:Set, from: [ids] } from the print conditions the specimens were printed under.
  const map = new Map();
  const NOZ = /(?:nozzle|extrusion|extruder|hot\s*end|melt|print(?:ing)?|d[üu]sen)\s*(?:temp(?:erature)?\.?|temperatur)\s*[:=]?\s*(\d{2,3})(?![\d.])(?:\s*[-–]\s*(\d{2,3}))?/gi;
  const BED = /(?:bed|plate|platform|heizbett|build\s*plate|hot\s*bed)\s*(?:temp(?:erature)?\.?|temperatur)\s*[:=]?\s*(\d{2,3})(?![\d.])/gi;
  for (const m of measurements) {
    const t = fold(m['Specimen / print parameters']);
    if (!known(t)) continue;
    const k = `${m.GradeID}|${m.SourceID}`;
    const e = map.get(k) ?? map.set(k, { nozzle: new Set(), bed: new Set(), ids: [] }).get(k);
    for (const x of t.matchAll(NOZ)) { e.nozzle.add(Number(x[1])); if (x[2]) e.nozzle.add(Number(x[2])); }
    for (const x of t.matchAll(BED)) e.bed.add(Number(x[1]));
    if (e.ids.length < 3) e.ids.push(m.MeasurementID);
  }
  return map;
}

const TENSILE_PROP = /^(?:Tensile|Elongation at (?:break|yield))/;
const FLEX_PROP = /^Flexural/;
const FLEX_WORDS = /flexural|flexure|bending|\bbend\b|biege|biegung|3[- ]point|three[- ]point|zginan|\bflex\b/i;
const TENSILE_WORDS = /tensile|tension|\bzug|rozci[ąa]g|\bUTS\b|young'?s|elastizit/i;
const YIELD_WORDS = /yield|streck|fließ|fliess|plastyczno|\bσ\s*y\b|elastic limit/i;
const BREAK_WORDS = /break|bruch|rupture|fracture|rei(?:ß|ss)|zerwani|failure/i;
const HDT_WORDS = /\bHDT\b|heat\s+deflection|deflection\s+temp|\bDTUL\b|w[äa]rmeform|ugi[ęe]ci|temperature\s+of\s+deflection/i;
const VICAT_WORDS = /vi[cs]+at|\bVST\b/i;
const VICAT_STD = new Set(['ISO 306', 'ASTM D1525', 'GB/T 1633']);
const HDT_STD = new Set(['ISO 75', 'ASTM D648', 'GB/T 1634', 'GB/T 1634.2']);
const FLEX_STD = new Set(['ISO 178', 'ASTM D790', 'DIN 53452', 'GB/T 9341']);
const TENSILE_STD = new Set(['ISO 527', 'ASTM D638', 'GB/T 1040', 'GB/T 1040.2', 'DIN 53455']);

function detectMislabel({ profiles, measurements }) {
  const out = [];
  const add = (o) => out.push(finding('mislabel', o));
  const measByGradeSource = specimenTemps(measurements.filter((m) => !/^Retired/.test(m['Data status'])));

  for (const p of profiles) {
    if (/^Retired duplicate/.test(p.Profile) || /Retired duplicate of/.test(p.Locator)) continue;
    const base = { table: 'profiles', record: p.ProfileID, grade: p.GradeID, source: p.SourceID };
    const dry = p.Drying;
    // 1a. Drying cell holds a dry-box / storage-humidity statement.
    if (known(dry)) {
      const sched = hasSchedule(dry);
      const bare = dry.replace(DRYBOX_PHRASE, ' ');
      const verb = DRYING_VERB.test(bare);
      if (STORAGE_WORDS.test(dry) && !sched) {
        add({ ...base, column: 'Drying', value: dry, typed: `need ${p['Drying need']}, ${p['Drying °C']} °C, ${p['Drying hours']} h`, evidence: p.Locator,
          why: verb ? 'dry-box / storage words and no temperature+time schedule, beside a drying instruction' : 'dry-box / storage-humidity statement with no temperature+time schedule and no drying instruction: belongs in profile_notes (Storage humidity)',
          confidence: verb ? 'low' : 'high', rule: 'drying-is-storage-statement' });
      } else if (STORAGE_STRONG.test(dry) && sched) {
        add({ ...base, column: 'Drying', value: dry, typed: `need ${p['Drying need']}, ${p['Drying °C']} °C, ${p['Drying hours']} h`, evidence: p.Locator,
          why: 'a schedule is stated, but the cell also carries dry-box / storage words: check the schedule is for drying, not for the box', confidence: 'low', rule: 'drying-schedule-beside-storage-words' });
      }
      // 1b. A drying "required" with neither a schedule nor any drying instruction in it.
      if (p['Drying need'] === 'required' && !BARE_ANSWER.test(dry) && !hasAnyDryingNumber(dry) && !verb && !STORAGE_WORDS.test(dry)) {
        add({ ...base, column: 'Drying', value: dry, typed: `need ${p['Drying need']}`, evidence: p.Locator,
          why: 'Drying need is required (the parser default for any stated text) but the cell has no temperature, no time and no drying word', confidence: 'high', rule: 'drying-required-without-drying-words' });
      }
      // 1c. The Locator's label for the cell is a dry-box label and the cell holds no drying instruction.
      const part = p.Locator.split(/;\s*/).find((x) => DRYBOX_LABEL.test(x));
      if (part && !hasAnyDryingNumber(dry) && !verb && !STORAGE_WORDS.test(dry)) {
        add({ ...base, column: 'Drying', value: dry, typed: `need ${p['Drying need']}`, evidence: p.Locator,
          why: `the Locator names a dry-box / storage label ("${clip(part, 60)}") and the Drying cell holds neither a schedule nor a drying instruction`, confidence: 'low', rule: 'drying-under-storage-label' });
      }
    }
    // 2. Nozzle / bed cell filled from a test-specimen heading.
    const parts = p.Locator.split(/;\s*/);
    const specimenPart = parts.find((x) => SPECIMEN_LABEL.test(x));
    const hasRecommend = parts.some((x) => RECOMMEND_LABEL.test(x) && !SPECIMEN_LABEL.test(x));
    for (const [col, axis] of [['Nozzle °C', 'nozzle'], ['Bed °C', 'bed']]) {
      if (!known(p[col])) continue;
      const lo = p[`${axis === 'nozzle' ? 'Nozzle' : 'Bed'} min °C`], hi = p[`${axis === 'nozzle' ? 'Nozzle' : 'Bed'} max °C`];
      if (specimenPart && !NOT_GUIDANCE.test(p.Locator.replace(specimenPart, ''))) {
        add({ ...base, column: col, value: p[col], typed: `${p[`${axis === 'nozzle' ? 'Nozzle' : 'Bed'} state`]} ${lo}–${hi}`, evidence: p.Locator,
          why: `the Locator labels part of the profile as test-specimen conditions ("${clip(specimenPart, 80)}") and ${col} holds a temperature`,
          confidence: hasRecommend || /\(m\d{3}/.test(p.Locator) ? 'low' : 'high', rule: 'temperature-under-specimen-label' });
      }
      // The cell equals the print temperature the product's own specimens were printed at and no recommendation label says otherwise.
      const sp = measByGradeSource.get(`${p.GradeID}|${p.SourceID}`);
      const nums = [Number(lo), Number(hi)].filter(Number.isFinite);
      if (sp && nums.length && new Set(nums).size === 1 && sp[axis].has(nums[0]) && !hasRecommend && !specimenPart) {
        add({ ...base, column: col, value: p[col], typed: `${nums[0]} °C`, evidence: `${p.Locator} | specimens ${sp.ids.join(', ')} printed at ${[...sp[axis]].join('/')} °C`,
          why: `${col} is a single value equal to the ${axis} temperature of this product's test specimens, and the Locator names no recommendation`, confidence: 'low', rule: 'temperature-equals-specimen-conditions' });
      }
    }
  }

  // 3. Measurements filed under the wrong property, by the words of their own Locator / test standard.
  for (const m of measurements) {
    if (/^Retired/.test(m['Data status'])) continue;
    const prop = m.Property;
    const text = `${m.Locator ?? ''} ${known(m['Standard / load']) ? m['Standard / load'] : ''}`;
    const stds = known(m.Standards) ? m.Standards.split(';').map((x) => x.trim()) : [];
    const base = { table: 'measurements', record: m.MeasurementID, grade: m.GradeID, source: m.SourceID, column: 'Property', value: prop, evidence: `${m.Locator} | ${m['Standard / load']} | ${m.Standards}` };
    const typed = `${m['Normalized value']} ${m['Normalized unit']}`;
    // `filed` is what the row says it is, `actual` what its words / standard say; flag when the evidence is all actual.
    const pair = (kind, filed, actual, filedStd, actualStd, actualRe, filedRe) => {
      const a = actualRe.test(text), f = filedRe.test(text);
      const sa = stds.some((x) => actualStd.has(x)), sf = stds.some((x) => filedStd.has(x));
      if (sa && !sf) add({ ...base, typed, why: `${kind}: filed as ${filed}, but its test standard (${stds.join('; ')}) is the ${actual} test`, confidence: f && !a ? 'low' : 'high', rule: `${kind}-by-standard` });
      else if (a && !f) add({ ...base, typed, why: `${kind}: filed as ${filed}, but its Locator / standard words are ${actual}`, confidence: 'high', rule: `${kind}-by-words` });
      else if (a && f) add({ ...base, typed, why: `${kind}: filed as ${filed}; the Locator / standard names both ${filed} and ${actual} words`, confidence: 'low', rule: `${kind}-by-words-both` });
    };
    if (prop === 'HDT') pair('hdt-vs-vicat', 'HDT', 'Vicat', HDT_STD, VICAT_STD, VICAT_WORDS, HDT_WORDS);
    else if (/^Vicat/.test(prop)) pair('vicat-vs-hdt', 'Vicat', 'HDT', VICAT_STD, HDT_STD, HDT_WORDS, VICAT_WORDS);
    if (TENSILE_PROP.test(prop)) {
      const f = FLEX_WORDS.test(text), t = TENSILE_WORDS.test(text), sf = stds.some((x) => FLEX_STD.has(x)), st = stds.some((x) => TENSILE_STD.has(x));
      if (sf && !st) add({ ...base, typed, why: `tensile property, but its test standard (${stds.join('; ')}) is a flexural test`, confidence: t && !f ? 'low' : 'high', rule: 'tensile-by-flexural-standard' });
      else if (f && !t) add({ ...base, typed, why: 'tensile property, but the Locator / standard carries flexural words and no tensile word', confidence: 'high', rule: 'tensile-by-flexural-words' });
      else if (f && t) add({ ...base, typed, why: 'tensile property; the Locator / standard names both flexural and tensile words', confidence: 'low', rule: 'tensile-by-flexural-words-both' });
    }
    if (FLEX_PROP.test(prop)) {
      const f = FLEX_WORDS.test(text), t = TENSILE_WORDS.test(text), sf = stds.some((x) => FLEX_STD.has(x)), st = stds.some((x) => TENSILE_STD.has(x));
      if (st && !sf) add({ ...base, typed, why: `flexural property, but its test standard (${stds.join('; ')}) is a tensile test`, confidence: f && !t ? 'low' : 'high', rule: 'flexural-by-tensile-standard' });
      else if (t && !f) add({ ...base, typed, why: 'flexural property, but the Locator / standard carries tensile words and no flexural word', confidence: 'high', rule: 'flexural-by-tensile-words' });
      else if (t && f) add({ ...base, typed, why: 'flexural property; the Locator / standard names both tensile and flexural words', confidence: 'low', rule: 'flexural-by-tensile-words-both' });
    }
    // Yield and break are distinct endpoints of a tensile test.
    const isBreak = prop === 'Tensile break strength' || prop === 'Elongation at break';
    const isYield = prop === 'Tensile yield strength' || prop === 'Elongation at yield';
    if (isBreak || isYield) {
      const y = YIELD_WORDS.test(text), b = BREAK_WORDS.test(text);
      if (isBreak && y && !b) add({ ...base, typed, why: 'filed as break, but the Locator / standard says yield and not break', confidence: 'high', rule: 'break-by-yield-words' });
      else if (isBreak && y && b) add({ ...base, typed, why: 'filed as break; the Locator / standard names both yield and break', confidence: 'low', rule: 'break-by-yield-words-both' });
      if (isYield && b && !y) add({ ...base, typed, why: 'filed as yield, but the Locator / standard says break and not yield', confidence: 'high', rule: 'yield-by-break-words' });
      else if (isYield && y && b) add({ ...base, typed, why: 'filed as yield; the Locator / standard names both yield and break', confidence: 'low', rule: 'yield-by-break-words-both' });
    }
  }
  return out;
}

// ====================================================================================================================
// 2. wrong-column: words of one column in another
// ====================================================================================================================

const WORDS_DRYING = /\bdry\b|\bdried\b|\bdrying\b|dehydr|dehumid|trockn|suszen|\bdryer\b|\bdesicc|\bpre-?dry|\bbake\b|\boven\b/i;
const WORDS_CHAMBER = /\bchamber\b|enclos|closed\s+(?:print|cavity|box)|sealed\s+print|kammer|komora|\bheated\s+chamber\b/i;
const WORDS_PLATE = /\bPEI\b|build\s*(?:plate|surface|sheet)|\bglass\b|buildtak|\bglue\b|\badhesive\b|kapton|painter'?s?\s+tape|garolite|magigoo|\bplate\b|\bbed\s+adhesion\b|\bgrip\b|dimafix|\bLAC\b|\btape\b/i;
const WORDS_TEMPCELL = /°\s*C|℃|\bhours?\b|\d\s*h\b/i;
const HARDENED_EXEMPT = /hardened|ruby|abrasi|wear[- ]resist|steel\s+nozzle|brass|stainless|nozzle/i; // readAbrasion reads these lines deliberately

// What a sentence says about moisture and treatment, with the negations the repo's own readers know.
// A sentence that states how the specimens were treated: "were annealed", "dried at 80 °C", "conditioned at 50 % RH", "saturated".
const SPECIMEN_STATE_SENTENCE = /(?:were|was|been|are)\s+(?:annealed|dried|conditioned|saturated|soaked|immersed|tempered)|annealed\s+(?:at|for)\s+\d|dried\s+(?:at|for)\s+\d|conditioned\s+(?:at|for|in)\s+[^.]{0,40}(?:RH|humidity|water|%)|\d+\s*%\s*(?:RH|relative)|dry\s+as\s+mou?lded|\bDAM\b|saturat|getempert|gedruckt/i;
// A review note that records that the sheet says nothing.
const NOTE_SAYS_NONE = /(?:states?|prints?|gives?|says?)\s+no\s+(?:conditioning|annealing|moisture|heat|treatment)|no\s+(?:conditioning|annealing|heat\s+treatment)\s+is\s+(?:stated|given|printed)|not\s+(?:annealed|conditioned|dried)|does\s+not\s+(?:state|say)/i;
function moistureWords(text) {
  // Storage advice ("Kept dry; TDS recommends drying before printing") and room-temperature rests say nothing of the
  // specimen's moisture, as the repo's readers decide (moisture.js); only a statement about the specimens counts.
  const t = fold(text).replace(/(?:saturated|equilibrium)\s+water\s+absorption(?:\s+rate)?|conditioned\s+(?:at|to)\s+room\s+temp\w*|conditioned\s+at\s+ambient|<\s*\d+\s*%\s*RH\s+during/gi, ' ');
  const advice = /recommend|advis|should|\bmust\b|\bkeep\b|\bkept\b|\bstore\b|\bstored\b|prior\s+to\s+print|before\s+print|\bif\b/i.test(t);
  const dry = !advice && (/\bdried\b|\bdry\s+(?:state|status|as)\b|^dry\b(?!\s*(?:box|run|film))|\bDAM\b|dry-as|getrocknet|wysuszon|desiccat|trocken(?!box)/i.test(t)) && !/\bnot\s+dried\b|\bundried\b|\bnon-?dried\b|\bwithout\s+dry/i.test(t);
  const wet = /conditioned|conditioning|saturat|equilibr|immers|soaked|^wet\b|\bwet\s+(?:state|status)|water\s+(?:bath|immersion)|konditioniert|kondycjonowan|nasycon/i.test(t);
  const atmos = /(?<![<≤]\s*[\d.]*)(?<![\d.])\d+\s*%\s*(?:RH|r\.?\s?h\.?|relative\s+humidity)|23\s*°?\s*C?\s*[/,]\s*50\s*%|normklima|standard\s+(?:climate|atmosphere)/i.test(t);
  return { dry, wet, atmos };
}
function treatmentWords(text) {
  let t = fold(text);
  const negated = /\bnot\s+(?:been\s+|be\s+)?annealed|unannealed|non-?annealed|before\s+anneal\w*|without\s+anneal\w*|no\s+anneal\w*|nicht\s+getempert|ohne\s+temper\w*|bez\s+wygrzewania/i.test(t);
  t = t.replace(/\bnot\s+(?:been\s+|be\s+)?annealed|unannealed|non-?annealed|before\s+anneal\w*|without\s+anneal\w*|no\s+anneal\w*|nicht\s+getempert|ohne\s+temper\w*|bez\s+wygrzewania/gi, ' ');
  const annealed = /anneal|getempert|tempern|wygrzew|heat[- ]treat/i.test(t);
  const asPrinted = negated || /\bas[- ]print(?:ed)?\b|\bas[- ]built\b|ungetempert|untreated/i.test(t);
  return { annealed, asPrinted };
}

function detectWrongColumn({ tables, profiles, measurements, db }) {
  const out = [];
  const add = (o) => out.push(finding('wrong-column', o));
  for (const p of profiles) {
    if (/Retired duplicate of/.test(p.Locator)) continue;
    const base = { table: 'profiles', record: p.ProfileID, grade: p.GradeID, source: p.SourceID, evidence: p.Locator };
    const plate = p.Plate, dry = p.Drying, enc = p.Enclosure;
    if (known(plate)) {
      if (WORDS_DRYING.test(plate)) add({ ...base, column: 'Plate', value: plate, typed: '', why: 'drying words in the Plate cell', rule: 'drying-words-in-plate' });
      if (WORDS_CHAMBER.test(plate)) add({ ...base, column: 'Plate', value: plate, typed: '', why: 'chamber / enclosure words in the Plate cell', rule: 'chamber-words-in-plate' });
    }
    if (known(dry)) {
      if (WORDS_PLATE.test(dry)) add({ ...base, column: 'Drying', value: dry, typed: `need ${p['Drying need']}`, why: 'plate / bed-surface words in the Drying cell', confidence: WORDS_DRYING.test(dry) ? 'low' : 'high', rule: 'plate-words-in-drying' });
      if (/\bnozzle\s+temp|\bbed\s+temp|print(?:ing)?\s+temp/i.test(dry)) add({ ...base, column: 'Drying', value: dry, typed: `${p['Drying °C']} °C`, why: 'nozzle / bed / printing temperature words in the Drying cell', rule: 'print-temperature-words-in-drying' });
    }
    if (known(enc)) {
      if (WORDS_DRYING.test(enc)) add({ ...base, column: 'Enclosure', value: enc, typed: p['Enclosure state'], why: 'drying words in the Enclosure cell', rule: 'drying-words-in-enclosure' });
      else if (WORDS_TEMPCELL.test(enc) && /\d\s*(?:h\b|hours?)/i.test(enc)) add({ ...base, column: 'Enclosure', value: enc, typed: p['Enclosure state'], why: 'a temperature + time schedule in the Enclosure cell', rule: 'schedule-in-enclosure' });
      else if (/\d{2,3}\s*(?:[-–]\s*\d{2,3}\s*)?°\s*C|℃/.test(fold(enc))) add({ ...base, column: 'Enclosure', value: enc, typed: p['Enclosure state'], why: 'a temperature in the Enclosure cell (a chamber temperature belongs in Chamber °C)', confidence: 'low', rule: 'temperature-in-enclosure' });
      if (WORDS_PLATE.test(enc) && !/enclos/i.test(enc)) add({ ...base, column: 'Enclosure', value: enc, typed: p['Enclosure state'], why: 'plate words in the Enclosure cell', confidence: 'low', rule: 'plate-words-in-enclosure' });
    }
    for (const c of ['Nozzle °C', 'Bed °C', 'Chamber °C']) {
      const v = p[c];
      if (!known(v)) continue;
      if (WORDS_DRYING.test(v) && /\d\s*(?:h\b|hours?)/i.test(v)) add({ ...base, column: c, value: v, typed: '', why: 'a drying schedule in a temperature cell', rule: 'drying-words-in-temperature-cell' });
    }
    for (const c of ['Nozzle diameter', 'Nozzle material']) {
      const v = p[c];
      if (!known(v)) continue;
      // "Hardened" here is read deliberately by readAbrasion: exempt it, and anything about the nozzle itself.
      const rest = v.replace(new RegExp(HARDENED_EXEMPT.source, 'gi'), ' ');
      if (WORDS_DRYING.test(rest) || /\bbed\b|\bplate\b|enclos|chamber/i.test(rest)) add({ ...base, column: c, value: v, typed: '', why: `drying / bed / chamber words in ${c}`, confidence: 'low', rule: 'foreign-words-in-nozzle-cell' });
    }
  }

  // A grade's Composition / filler that is a sheet line about something else (a bed surface, a shop's price list).
  for (const g of tables.grades) {
    if (/Retired/.test(g.Status) && false) continue;
    if (known(g['Composition / filler']) && /build\s+surface|printing\s+platform|print\s+surface|bed\s+adhesion|starting\s+at\s*:|ex\.\s*VAT|select\s+options|glue\s+stick/i.test(g['Composition / filler'])) {
      add({ table: 'grades', record: g.GradeID, grade: g.GradeID, source: g.SourceID, column: 'Composition / filler', value: g['Composition / filler'], typed: `Variant ${g.Variant}`, evidence: `${g['Product name']} (${g.Manufacturer}); ${g['Source locator']}`,
        why: 'the Composition / filler cell holds a bed-surface / printing-platform / shop-price line, not a composition (and its "carbon fiber plate" or "glass" words read as fillers)', rule: 'composition-holds-other-column' });
    }
  }

  // Measurements: state wording in a cell that is not the state cell, against the compiled (effective) state.
  const compiled = new Map(db.measurements.map((m) => [m.id, m]));
  for (const m of measurements) {
    if (/^Retired/.test(m['Data status'])) continue;
    const c = compiled.get(m.MeasurementID);
    if (!c) continue;
    const review = reviewFields(m);
    const moistureIsMeasurand = /^(?:Water absorption|Moisture content)/.test(m.Property);
    // A melt-flow test runs on pellets: the specimen's anneal / moisture sentence is not about it (page-context.js exempts it too).
    if (/^Melt (?:mass|volume)-flow rate/.test(m.Property)) continue;
    const moistureState = c.moistureState, treatmentState = c.postProcessingState;
    const inherited = c.pageContext ? Object.keys(c.pageContext).join('+') : '';
    const sources = [
      ['Moisture condition', m['Moisture condition'], 'high', 'mt'], ['Post-processing', m['Post-processing'], 'high', 'mt'],
      ['Locator', m.Locator, 'high', 'mt'], ['Standard / load', m['Standard / load'], 'high', 'mt'], ['Test temperature', m['Test temperature'], 'low', 'm'],
      ['Notes', m.Notes, 'low', 'mt'], ['Specimen / print parameters', m['Specimen / print parameters'], 'low', 'mt'],
    ];
    const base = { table: 'measurements', record: m.MeasurementID, grade: m.GradeID, source: m.SourceID };
    // One finding per row and kind: the same sentence often sits in Notes and in the print parameters; the others are named in Evidence.
    const byKind = new Map();
    const emit = (kind, o) => {
      const prior = byKind.get(kind);
      if (prior) { prior.Evidence = clip(`${prior.Evidence} | also in ${o.column}`, 260); return; }
      const f = finding('wrong-column', { ...base, ...o }); out.push(f); byKind.set(kind, f);
    };
    for (const [col, text, conf, scopes] of sources) {
      if (!known(text)) continue;
      // Notes and print parameters are long free text. A review note that says the sheet states nothing is not a statement,
      // and a sentence about something else is not the specimen's state: only a sentence that dates or doses it counts.
      if ((col === 'Notes' || col === 'Specimen / print parameters') && !SPECIMEN_STATE_SENTENCE.test(text)) continue;
      if (col === 'Notes' && NOTE_SAYS_NONE.test(text)) continue;
      if (scopes.includes('m') && !moistureIsMeasurand && !review?.has('Moisture state')) {
        const w = moistureWords(text);
        const typed = `Moisture state ${moistureState}${inherited ? ` (page-inherited: ${inherited})` : ''}`;
        const atmosDeliberate = col === 'Moisture condition' && /test atmosphere|table is headed|heading/i.test(text);
        if ((w.dry || w.wet) && moistureState === 'not-stated') {
          emit('m-ns', { column: col, value: text, typed, evidence: `${w.dry ? 'dry' : ''}${w.dry && w.wet ? '+' : ''}${w.wet ? 'conditioned/wet' : ''} words; Moisture condition: ${m['Moisture condition']}`, why: `${col} states the moisture condition, the compiled Moisture state is not-stated`, confidence: conf, rule: 'moisture-words-state-not-stated' });
        } else if (w.atmos && !w.dry && !w.wet && moistureState === 'not-stated' && col !== 'Test temperature' && !atmosDeliberate) {
          emit('m-atm', { column: col, value: text, typed, evidence: `Moisture condition: ${m['Moisture condition']}`, why: `${col} names a humidity / test atmosphere (23 °C / 50 % RH style); the compiled Moisture state is not-stated (the repo types a bare test atmosphere as not-stated, so this is for a reader to confirm)`, confidence: 'low', rule: 'atmosphere-words-state-not-stated' });
        } else if (w.dry && !w.wet && moistureState === 'conditioned') {
          emit('m-c', { column: col, value: text, typed, evidence: `Moisture condition: ${m['Moisture condition']}`, why: `${col} says dry, the compiled Moisture state is conditioned`, confidence: conf, rule: 'dry-words-state-conditioned' });
        } else if (w.wet && !w.dry && moistureState === 'dry') {
          emit('m-d', { column: col, value: text, typed, evidence: `Moisture condition: ${m['Moisture condition']}`, why: `${col} says conditioned / wet, the compiled Moisture state is dry`, confidence: conf, rule: 'wet-words-state-dry' });
        }
      }
      if (scopes.includes('t') && !review?.has('Post-processing state')) {
        const w = treatmentWords(text);
        const typed = `Post-processing state ${treatmentState}${inherited ? ` (page-inherited: ${inherited})` : ''}`;
        if (w.annealed && treatmentState === 'not-stated') {
          emit('t-ns', { column: col, value: text, typed, evidence: `Post-processing: ${m['Post-processing']}`, why: `${col} says annealed / tempered, the compiled Post-processing state is not-stated`, confidence: conf, rule: 'annealed-words-state-not-stated' });
        } else if (w.annealed && !w.asPrinted && treatmentState === 'as-printed') {
          emit('t-ap', { column: col, value: text, typed, evidence: `Post-processing: ${m['Post-processing']}`, why: `${col} says annealed, the compiled Post-processing state is as-printed`, confidence: conf, rule: 'annealed-words-state-as-printed' });
        } else if (w.asPrinted && !w.annealed && treatmentState === 'annealed') {
          emit('t-an', { column: col, value: text, typed, evidence: `Post-processing: ${m['Post-processing']}`, why: `${col} says as-printed / not annealed, the compiled Post-processing state is annealed`, confidence: conf, rule: 'as-printed-words-state-annealed' });
        } else if (w.asPrinted && !w.annealed && treatmentState === 'not-stated' && col !== 'Specimen / print parameters') {
          emit('t-nsa', { column: col, value: text, typed, evidence: `Post-processing: ${m['Post-processing']}`, why: `${col} says as-printed / not annealed, the compiled Post-processing state is not-stated`, confidence: 'low', rule: 'as-printed-words-state-not-stated' });
        }
      }
    }
  }
  // Notes and print parameters are long free text; a state word in a sentence about something else is common there.
  // They stay in the output as low-confidence candidates, so the reader decides.
  return out;
}

// ====================================================================================================================
// 3. negation: a positive typed reading on words that deny or condition it
// ====================================================================================================================

const POSITIVE_PROFILE = [
  { table: 'profiles', column: 'Drying', typedCols: ['Drying need'], positive: (r) => r['Drying need'] === 'required', parser: (r) => parseDrying(r.Drying).need },
  { table: 'profiles', column: 'Enclosure', typedCols: ['Enclosure state'], positive: (r) => r['Enclosure state'] === 'recommended', parser: (r) => parseEnclosure(r.Enclosure).state },
  { table: 'profiles', column: 'Chamber °C', typedCols: ['Chamber state', 'Chamber requirement'], positive: (r) => ['range', 'recommended', 'enclosed'].includes(r['Chamber state']) || ['required', 'recommended'].includes(r['Chamber requirement']), parser: (r) => { const c = parseTemperature(r['Chamber °C'], { plausible: [0, 250] }); return `${c.state}/${c.requirement}`; } },
  { table: 'profiles', column: 'Nozzle °C', typedCols: ['Nozzle state', 'Nozzle requirement'], positive: (r) => r['Nozzle requirement'] === 'required' && r['Nozzle state'] === 'range', parser: null },
  { table: 'profiles', column: 'Bed °C', typedCols: ['Bed state', 'Bed requirement'], positive: (r) => r['Bed requirement'] === 'required' && r['Bed state'] === 'range', parser: null },
  ...['Abrasion / clogging', 'Nozzle material', 'Nozzle diameter'].map((column) => ({ table: 'profiles', column, typedCols: ['Hardened nozzle'], positive: (r) => r['Hardened nozzle'] === 'TRUE', parser: (r) => String(readAbrasion(r).requiresHardened) })),
  { table: 'measurements', column: 'Post-processing', typedCols: ['Post-processing state'], positive: (r) => r['Post-processing state'] === 'annealed', parser: (r) => readPostProcessingState(r['Post-processing']) },
  { table: 'measurements', column: 'Moisture condition', typedCols: ['Moisture state'], positive: (r) => ['dry', 'conditioned'].includes(r['Moisture state']), parser: (r) => readMoistureState(r['Moisture condition']) },
  { table: 'page_context', column: 'Statement', typedCols: ['Moisture state'], positive: (r) => ['dry', 'conditioned'].includes(r['Moisture state']), parser: null },
  { table: 'page_context', column: 'Statement', typedCols: ['Post-processing state'], positive: (r) => r['Post-processing state'] === 'annealed', parser: null },
  { table: 'print_guide', column: 'Drying', typedCols: ['Drying need'], positive: (r) => r['Drying need'] === 'required', parser: (r) => parseDrying(r.Drying).need },
  { table: 'print_guide', column: 'Enclosure', typedCols: ['Enclosure state'], positive: (r) => r['Enclosure state'] === 'recommended', parser: (r) => parseEnclosure(r.Enclosure).state },
  { table: 'print_guide', column: 'Chamber °C', typedCols: ['Chamber state', 'Chamber requirement'], positive: (r) => ['range', 'recommended', 'enclosed'].includes(r['Chamber state']) || ['required', 'recommended'].includes(r['Chamber requirement']), parser: null },
  { table: 'print_guide', column: 'Nozzle size / material', typedCols: ['Hardened nozzle'], positive: (r) => r['Hardened nozzle'] === 'TRUE', parser: (r) => String(readAbrasion(r, 'Nozzle size / material').requiresHardened) },
];
const idOf = { profiles: 'ProfileID', measurements: 'MeasurementID', page_context: 'PageContextID', print_guide: 'PrintGuideID' };

function detectNegation({ tables }) {
  const out = [];
  for (const rule of POSITIVE_PROFILE) {
    const rows = tables[rule.table];
    for (const r of rows) {
      if (/Retired duplicate/.test(r.Profile ?? '') || /Retired duplicate of/.test(r.Locator ?? '') || /^Retired/.test(r['Data status'] ?? '')) continue;
      const cell = r[rule.column];
      if (!known(cell) || !rule.positive(r)) continue;
      const hits = negationHits(cell);
      if (!hits.strong.length && !hits.weak.length) continue;
      const strong = hits.strong.length > 0;
      const review = reviewFields(r);
      const typedBits = rule.typedCols.map((c) => `${c}=${r[c]}`).join(', ');
      const reading = rule.parser ? rule.parser(r) : null;
      out.push(finding('negation', {
        table: rule.table, record: r[idOf[rule.table]], grade: r.GradeID, source: r.SourceID, column: rule.column, value: cell, typed: typedBits,
        evidence: `${strong ? 'negation' : 'condition'} words: ${[...new Set([...hits.strong, ...hits.weak])].join(', ')}${reading != null ? `; parser reads ${reading}` : '; no parser checks this typed value'}${review && rule.typedCols.some((c) => review.has(c)) ? '; a Parse review explains it' : ''}`,
        why: `positive typed reading (${typedBits}) on a cell carrying ${strong ? 'negation' : 'condition'} words`,
        confidence: strong ? 'high' : 'low', rule: `${rule.table}.${rule.column}->${rule.typedCols[0]}`,
      }));
    }
  }
  return out;
}

/** The parsers that say nothing for a cell with words in it (the "null-reader gaps"), counted. */
function nullReaderGaps({ tables }) {
  const rows = [];
  const push = (parser, table, column, typedColumn, cells, nullReads, nullWithPositive, note) => rows.push({ Parser: parser, Table: table, Column: column, Typed: typedColumn, NonEmptyCells: cells, ReturnsNothing: nullReads, NothingButTypedPositive: nullWithPositive, Note: note });
  const meas = tables.measurements.filter((m) => !/^Retired/.test(m['Data status']));
  for (const [parser, column, typedColumn, read, positives] of [
    ['readMoistureState', 'Moisture condition', 'Moisture state', readMoistureState, ['dry', 'conditioned']],
    ['readPostProcessingState', 'Post-processing', 'Post-processing state', readPostProcessingState, ['annealed']],
  ]) {
    const cells = meas.filter((m) => known(m[column]));
    const nulls = cells.filter((m) => read(m[column]) == null);
    const unchecked = nulls.filter((m) => positives.includes(m[typedColumn]));
    push(parser, 'measurements', column, typedColumn, cells.length, nulls.length, unchecked.length, `the ${nulls.length - unchecked.length} others are typed not-stated or as-printed: the wording may still carry a state (see wrong-column)`);
  }
  return rows;
}

function nullReaderGapsAll({ tables }) {
  const rows = nullReaderGaps({ tables });
  const push = (o) => rows.push({ Parser: o.parser, Table: o.table, Column: o.column, Typed: o.typed, NonEmptyCells: o.cells, ReturnsNothing: o.nulls, NothingButTypedPositive: o.positive, Note: o.note });
  const profs = tables.profiles.filter((p) => !/Retired duplicate/.test(p.Locator));
  // readAbrasion: a non-empty line it cannot read. readRecipe raises no PARSE-UNREAD for the abrasion lines.
  const ab = (p) => readAbrasion(p);
  for (const column of ['Abrasion / clogging', 'Nozzle material', 'Nozzle diameter']) {
    const cells = profs.filter((p) => known(p[column]));
    const nulls = cells.filter((p) => parseAbrasion(p[column]).requiresHardened == null);
    const ownOnly = nulls.filter((p) => ab(p).requiresHardened == null && (p['Hardened nozzle'] === 'TRUE' || p['Hardened nozzle'] === 'FALSE'));
    push({ parser: 'parseAbrasion', table: 'profiles', column, typed: 'Hardened nozzle', cells: cells.length, nulls: nulls.length, positive: ownOnly.length,
      note: column === 'Abrasion / clogging' ? 'an unread abrasion line raises no PARSE-UNREAD; the last figure is rows where no nozzle line reads and the stored TRUE/FALSE rests on a Parse review alone' : 'the line is read only when the abrasion line is silent (readAbrasion); the last figure is rows where none of the three lines reads and the stored TRUE/FALSE rests on a Parse review alone' });
  }
  // Typed values a Parse review holds against the parser, by field: each rests on a human reading, no parser checks it.
  const overrides = new Map();
  for (const [t, rows] of [['profiles', profs], ['measurements', tables.measurements.filter((m) => !/^Retired/.test(m['Data status']))], ['print_guide', tables.print_guide]]) {
    for (const r of rows) for (const f of reviewFields(r) ?? []) { const k = `${t}|${f}`; overrides.set(k, (overrides.get(k) ?? 0) + 1); }
  }
  for (const [k, v] of [...overrides].sort((a, b) => b[1] - a[1])) {
    const [t, f] = k.split('|');
    push({ parser: '(Parse review override)', table: t, column: f, typed: f, cells: v, nulls: 0, positive: v, note: 'rows whose Parse review "Fields:" names this typed column: the parser is silenced for it, so it rests on a human reading' });
  }
  const dia = profs.filter((p) => known(p['Nozzle diameter']));
  const noDia = dia.filter((p) => parseNozzleDiameters(p['Nozzle diameter']).diameters.length === 0 && !parseNozzleDiameters(p['Nozzle diameter']).atLeast);
  push({ parser: 'parseNozzleDiameters', table: 'profiles', column: 'Nozzle diameter', typed: '(none)', cells: dia.length, nulls: noDia.length, positive: dia.length, note: 'Nozzle diameter has NO typed column and no PARSE-MISMATCH check: compile.js parses it for display only, so a wrong diameter cell is never compared to anything' });
  const enc = profs.filter((p) => known(p.Enclosure));
  const encNull = enc.filter((p) => parseEnclosure(p.Enclosure).unparsed);
  push({ parser: 'parseEnclosure', table: 'profiles', column: 'Enclosure', typed: 'Enclosure state', cells: enc.length, nulls: encNull.length, positive: encNull.filter((p) => p['Enclosure state'] === 'recommended').length, note: 'raises PARSE-UNREAD (a warning) on the build; counted here as a gap only when the typed state is recommended' });
  for (const [c, label] of [['Nozzle °C', 'Nozzle'], ['Bed °C', 'Bed'], ['Chamber °C', 'Chamber']]) {
    const cells = profs.filter((p) => known(p[c]));
    const nulls = cells.filter((p) => parseTemperature(p[c], { plausible: [0, 500] }).unparsed);
    push({ parser: 'parseTemperature', table: 'profiles', column: c, typed: `${label} state`, cells: cells.length, nulls: nulls.length, positive: nulls.filter((p) => p[`${label} state`] === 'range').length, note: 'raises PARSE-UNREAD (a warning); counted as unchecked when the typed state is a range' });
  }
  const dry = profs.filter((p) => known(p.Drying));
  const defaultRequired = dry.filter((p) => parseDrying(p.Drying).need === 'required' && !BARE_ANSWER.test(p.Drying) && !hasAnyDryingNumber(p.Drying) && !DRYING_VERB.test(p.Drying));
  push({ parser: 'parseDrying', table: 'profiles', column: 'Drying', typed: 'Drying need', cells: dry.length, nulls: 0, positive: defaultRequired.length, note: 'parseDrying never returns unknown for a non-empty cell: any text with no negation word is read as need=required; the last figure is cells read as required with no temperature, no time and no drying word' });
  push({ parser: '(none)', table: 'page_context', column: 'Statement', typed: 'Moisture state / Post-processing state / Specimen type', cells: tables.page_context.filter((r) => known(r.Statement)).length, nulls: tables.page_context.length, positive: tables.page_context.filter((r) => r['Moisture state'] !== 'not-stated' || r['Post-processing state'] !== 'not-stated').length, note: 'no parser reads a page_context Statement: its typed states are checked by nothing but a reader of the page' });
  push({ parser: 'readStandards/readTestTemperature', table: 'measurements', column: 'Standard / load', typed: 'Standards', cells: 0, nulls: 0, positive: 0, note: 'checked by their parsers (PARSE-MISMATCH); not a null-reader gap' });
  return rows;
}

// ====================================================================================================================
// 4. scope: a rule reaching beyond its scope
// ====================================================================================================================

function detectScope({ tables, db }) {
  const out = [];
  const add = (o) => out.push(finding('scope', o));
  const guideRows = new Map(db.printGuide.map((g) => [g.id, g]));
  const guideReason = new Map();
  for (const r of tables.print_guide_materials) guideReason.set(r.PrintGuideID, [...(guideReason.get(r.PrintGuideID) ?? []), `${r.MaterialID}: ${r.Reason}`]);
  const materialName = new Map(db.materials.map((m) => [m.id, m.name]));

  // 4a. Products that answer a print gate from a printer guide, with a qualifier the guide's type does not cover.
  for (const g of db.grades) {
    if (g.retired) continue;
    const from = g.print?.from ?? {};
    const guideAxes = Object.entries(from).filter(([, o]) => o.origin === 'guide');
    if (!guideAxes.length) continue;
    const ids = [...new Set(guideAxes.map(([, o]) => o.guideId))];
    const covered = new Set();
    for (const id of ids) for (const q of qualifiersOf(`${guideRows.get(id)?.guideType ?? ''} ${guideRows.get(id)?.name ?? ''}`)) covered.add(q);
    const text = `${g.product} | ${g.variant ?? ''} | ${g.composition ?? ''}`;
    const gq = gradeQualifiers(g);
    const found = [...new Set([...gq.main, ...gq.comp])].filter((q) => !covered.has(q));
    const hasVariant = known(g.variant);
    if (!found.length && !hasVariant) continue;
    const high = hasVariant || found.some((q) => gq.main.has(q) && !isLowQualifier(q));
    add({ table: 'grades', record: g.id, grade: g.id, source: g.sourceId, column: hasVariant ? 'Variant' : 'Product name', value: hasVariant ? `${g.product} [${g.variant}]` : g.product,
      typed: `answers ${guideAxes.map(([a]) => a).join(', ')} from ${ids.join('/')} (${ids.map((i) => guideRows.get(i)?.guideType).join('/')})`,
      evidence: `qualifier ${found.join(', ') || '(Variant only)'} in "${clip(text, 110)}"; mapping reason: ${clip(ids.map((i) => guideReason.get(i)?.join(' ')).join(' '), 150)}`,
      why: hasVariant ? 'a product with a Variant is not the guide\'s type and should read none (D129)' : `the guide's type does not cover "${found.join(', ')}", and the product carries it`,
      confidence: high ? 'high' : 'low', rule: 'guide-answers-qualified-product' });
  }

  // 4b. Formulation-key twins whose names differ in a qualifier: they read each other's values (D89).
  const groups = new Map();
  for (const g of db.grades) if (!g.retired && known(g.formulationKey)) (groups.get(g.formulationKey) ?? groups.set(g.formulationKey, []).get(g.formulationKey)).push(g);
  for (const [key, gs] of groups) {
    if (gs.length < 2) continue;
    const sets = gs.map((g) => { const q = gradeQualifiers(g); return { g, q: new Set([...q.main, ...q.comp]) }; });
    const union = new Set(sets.flatMap((s) => [...s.q]));
    const differing = [...union].filter((q) => sets.some((s) => s.q.has(q)) && sets.some((s) => !s.q.has(q)));
    const variants = new Set(gs.map((g) => (known(g.variant) ? g.variant : '')));
    if (!differing.length && variants.size < 2) continue;
    const readers = gs.filter((g) => Object.values(g.print?.from ?? {}).some((o) => o.origin === 'twin') || (g.states ?? []).some((s) => Object.values(s.values ?? {}).some((v) => v?.origin === 'twin' || v?.twin || v?.from)));
    const high = variants.size > 1 || differing.some((q) => !isLowQualifier(q));
    add({ table: 'grades', record: key, grade: gs.map((g) => g.id).join(';'), source: gs[0].sourceId, column: 'Shared formulation key', value: gs.map((g) => g.product).join(' | '),
      typed: `${gs.length} grades share the key; ${readers.length} read a twin (${readers.map((g) => g.id).join(', ') || 'none in this db'})`,
      evidence: `differing qualifiers: ${differing.join(', ') || '(Variant)'}; variants: ${[...variants].map((v) => v || '-').join(' / ')}`,
      why: 'grades with one formulation key whose names / variants differ in a filler or qualifier word read each other\'s values and print recipe (D89)',
      confidence: high ? 'high' : 'low', rule: 'twin-names-differ' });
  }

  // 4c. A page statement's specimen form against the rows that inherit it, and against sibling rows that state their own.
  const formOf = new Map(readCsv(join(root, 'schema/vocab/specimen-types.csv')).records.map((r) => [r.values.Value, r.values.Form]));
  const pcById = new Map(tables.page_context.map((c) => [c.PageContextID, c]));
  const compiledById = new Map(db.measurements.map((m) => [m.id, m]));
  const inheriting = new Map(); // PageContextID -> compiled measurements that inherited its specimen type
  for (const m of db.measurements) { const id = m.pageContext?.specimenType; if (id) (inheriting.get(id) ?? inheriting.set(id, []).get(id)).push(m); }
  const MOULDED = /injection[- ]?mou?ld|mou?lded|compression[- ]?mou?ld|pressed\s+plaque|ISO\s?294|ISO\s?3167|ASTM\s?D3641|ISO\s?10724|extruded\s+(?:film|sheet)|\bfilm\b|\bplaque\b|spritzguss|wtrysk/i;
  const PRINTED = /\bFDM\b|\bFFF\b|3D[- ]?print|printed|layer\s+height|\binfill\b|print(?:ing)?\s+(?:speed|temperature|orientation|direction)|nozzle|gedruckt|druck/i;
  const rowsByPage = new Map();
  for (const m of tables.measurements) {
    if (/^Retired/.test(m['Data status'])) continue;
    const page = (/\bp(?:age|p)?\.?\s*(\d+)/i.exec(m.Locator ?? '') ?? [])[1];
    if (!page) continue;
    const k = `${m.SourceID}|${page}`;
    (rowsByPage.get(k) ?? rowsByPage.set(k, []).get(k)).push(m);
  }
  for (const c of tables.page_context) {
    if (!known(c['Specimen type'])) continue;
    const form = formOf.get(c['Specimen type']);
    const inherited = (inheriting.get(c.PageContextID) ?? []).map((m) => tables.byId.measurements.get(m.id)).filter(Boolean);
    const siblings = (rowsByPage.get(`${c.SourceID}|${c.Page}`) ?? []).filter((m) => known(m['Specimen type']) && formOf.get(m['Specimen type']) && formOf.get(m['Specimen type']) !== form && formOf.get(m['Specimen type']) !== 'not-stated');
    const sibTotal = (rowsByPage.get(`${c.SourceID}|${c.Page}`) ?? []).length;
    const base = { table: 'page_context', record: c.PageContextID, source: c.SourceID, column: 'Specimen type', value: c['Specimen type'], evidence: `p. ${c.Page} ${c['Applies to']}${known(c.Table) ? ` / ${c.Table}` : ''}: ${clip(c.Statement, 120)}` };
    if (siblings.length) {
      const forms = [...new Set(siblings.map((m) => `${m['Specimen type']} (${formOf.get(m['Specimen type'])})`))];
      add({ ...base, grade: siblings[0].GradeID, typed: `form ${form}; ${inherited.length} rows inherit it; ${siblings.length} of ${sibTotal} rows on the page state ${forms.join(', ')}`,
        why: 'the page statement is typed one specimen form while rows on the same page and source state another of their own: check the statement speaks for the rows that inherit it (set Table, or narrow Applies to); with no inheriting row it is inert but misleading',
        confidence: inherited.length > 0 && !known(c.Table) ? 'high' : 'low', rule: 'page-specimen-form-vs-sibling-rows' });
    }
    // Inheriting rows whose own text says the opposite.
    const hits = inherited.filter((m) => {
      const t = `${m['Specimen / print parameters'] ?? ''} ${m.Locator ?? ''} ${m['Standard / load'] ?? ''} ${m.Notes ?? ''}`;
      return form === 'printed' ? MOULDED.test(t) && !PRINTED.test(m['Specimen / print parameters'] ?? '') : form === 'moulded' ? PRINTED.test(m['Specimen / print parameters'] ?? '') && !MOULDED.test(t) : false;
    });
    if (hits.length) {
      add({ ...base, grade: hits[0].GradeID, typed: `form ${form}; ${hits.length} of ${inherited.length} inheriting rows`, evidence: `${base.evidence} | e.g. ${hits[0].MeasurementID}: ${clip(hits[0].Locator, 60)} | ${clip(hits[0]['Specimen / print parameters'], 80)}`,
        why: `rows that inherit "${c['Specimen type']}" carry ${form === 'printed' ? 'moulded / film' : 'printed'} words of their own`, confidence: 'low', rule: 'inherited-specimen-form-words' });
    }
  }
  void pcById; void compiledById;
  return out;
}

// ====================================================================================================================
// 5. product-on-page: does the cited page name the product whose value it supports?
// ====================================================================================================================

const MAKER_NOISE = new Set(['filament', 'filaments', 'the', 'by', 'and', 'of', 'for', 'series', 'inc', 'ltd', 'gmbh', 'co', 'llc', 'corp', 'technologies', 'technology', 'materials', 'material', 'printing', '3d', 'tds', 'datasheet']);
const GENERIC = new Set(['pla', 'petg', 'abs', 'asa', 'pc', 'pa', 'tpu', 'pet', 'pp', 'pe', 'pvb', 'pva', 'hips', 'pctg', 'peek', 'pei', 'cf', 'gf', 'plus', 'pro', 'basic', 'standard', 'mm', '1', '75', '175', 'kg', 'g', 'x']);
const normName = (s) => fold(String(s ?? '').replace(/[®™©℠]/g, '')).toLowerCase().replace(/[^\p{L}\p{N}+]+/gu, ' ').trim();
const squash = (s) => normName(s).replace(/ /g, '');

/** Names a product could appear under on a page: the full product name without the maker, and its distinctive tokens. */
export function productNames(product, manufacturer) {
  const maker = new Set(normName(manufacturer).split(' ').filter(Boolean));
  const tokens = normName(product).split(' ').filter((t) => t && !maker.has(t) && !MAKER_NOISE.has(t));
  const full = tokens.join(' ');
  const distinctive = tokens.filter((t) => !GENERIC.has(t) && t.length > 1);
  return { full, fullSquashed: full.replace(/ /g, ''), distinctive };
}

async function detectProductOnPage({ tables }) {
  const out = [];
  const textDir = join(root, '.cache/text');
  if (!existsSync(textDir)) { console.log('\n*** product-on-page SKIPPED: no text cache (.cache/text) in this checkout. ***\n'); return null; }
  const { cachedText, repairLigatures } = await import('../lib/pdf-text.mjs');
  const targetsPath = join(root, 'docs/audits/2026-10-05-check-round-3/TARGETS.csv');
  if (!existsSync(targetsPath)) { console.log('\n*** product-on-page SKIPPED: docs/audits/2026-10-05-check-round-3/TARGETS.csv is missing. ***\n'); return null; }
  const targets = readCsv(targetsPath).records.map((r) => r.values).filter((t) => t.Kind === 'value');
  const sha = new Map(tables.sources.map((s) => [s.SourceID, s.SHA256]));
  const grades = new Map(tables.grades.map((g) => [g.GradeID, g]));
  const byKey = new Map();
  for (const g of tables.grades) if (known(g['Shared formulation key'])) (byKey.get(g['Shared formulation key']) ?? byKey.set(g['Shared formulation key'], []).get(g['Shared formulation key'])).push(g);
  const sourceGrades = new Map();
  for (const m of tables.measurements) if (!/^Retired/.test(m['Data status'])) (sourceGrades.get(m.SourceID) ?? sourceGrades.set(m.SourceID, new Set()).get(m.SourceID)).add(m.GradeID);
  const applicable = new Map(tables.sources.map((s) => [s.SourceID, known(s['Applicable grades']) ? s['Applicable grades'].split(/[;,]/).map((x) => x.trim()).filter(Boolean) : []]));
  const pageCache = new Map();
  const pagesOf = (sourceId) => {
    const h = sha.get(sourceId);
    if (!h || !/^[0-9a-f]{64}$/.test(h)) return null;
    if (!pageCache.has(h)) {
      const t = cachedText(h);
      pageCache.set(h, t ? t.pages.map((p) => ({ page: p.page, text: repairLigatures(p.lines.map((l) => String(l.text ?? '')).join(' ')) })) : null);
    }
    return pageCache.get(h);
  };
  const named = (pageText, names) => {
    const n = normName(pageText), s = n.replace(/ /g, '');
    if (!names.full) return true;
    if (n.includes(names.full) || s.includes(names.fullSquashed)) return true;
    return names.distinctive.length > 0 && names.distinctive.every((t) => s.includes(t.replace(/ /g, '')));
  };
  const counts = { checked: 0, noCache: 0, noPage: 0, singleProduct: 0, ok: 0, twinOk: 0, miss: 0 };
  const seen = new Set();
  for (const t of targets) {
    const key = `${t.SourceID}|${t.GradeID}|${t.Locator}`;
    if (seen.has(key)) continue;
    seen.add(key);
    counts.checked++;
    const g = grades.get(t.GradeID);
    if (!g) continue;
    const pages = pagesOf(t.SourceID);
    if (!pages) { counts.noCache++; continue; }
    const pageNo = (/\bp(?:age|p)?\.?\s*(\d+)/i.exec(t.Locator) ?? [])[1];
    const page = pages.find((p) => p.page === Number(pageNo));
    if (!page) { counts.noPage++; continue; }
    const grs = sourceGrades.get(t.SourceID) ?? new Set();
    const appl = applicable.get(t.SourceID) ?? [];
    const single = (appl.length === 1 && appl[0] === t.GradeID && grs.size <= 1) || (grs.size === 1 && grs.has(t.GradeID) && appl.length <= 1);
    if (single) counts.singleProduct++;
    if (single && !process.argv.includes('--include-single')) continue;
    const names = productNames(g['Product name'], g.Manufacturer);
    if (named(page.text, names)) { counts.ok++; continue; }
    const twins = (byKey.get(g['Shared formulation key']) ?? []).filter((x) => x.GradeID !== g.GradeID);
    if (twins.some((x) => named(page.text, productNames(x['Product name'], x.Manufacturer)))) { counts.twinOk++; continue; }
    counts.miss++;
    const elsewhere = pages.find((p) => p.page !== page.page && named(p.text, names));
    out.push(finding('product-on-page', {
      table: 'measurements', record: t.Record, grade: t.GradeID, source: t.SourceID, column: 'Locator', value: t.Locator, typed: `${t.Field} = ${t.Value} for "${g['Product name']}" (${t.DecidesFor})`,
      evidence: `page text begins: ${clip(page.text, 200)}`,
      why: `p. ${pageNo} of a source with ${grs.size} recorded grade(s) and ${appl.length} applicable (${t.SheetType}) does not name "${g['Product name']}"${elsewhere ? `; the product is named on p. ${elsewhere.page}` : ' and no other page of the sheet names it'}`,
      confidence: elsewhere || single ? 'low' : 'high', rule: single ? (elsewhere ? 'single-product-named-on-another-page' : 'single-product-named-nowhere') : elsewhere ? 'named-on-another-page' : 'named-nowhere',
    }));
  }
  console.log(`product-on-page: ${counts.checked} distinct value targets; ${counts.singleProduct} single-product sources, ${counts.ok} name the product, ${counts.twinOk} name a twin, ${counts.noCache} with no cached text, ${counts.noPage} with no such page in the cache, ${counts.miss} misses`);
  return out;
}

// ----------------------------------------------------------------------------------------------------------------- main

const DETECTORS = ['mislabel', 'wrong-column', 'negation', 'scope', 'product-on-page'];

function summarise(name, rows) {
  const high = rows.filter((r) => r.Confidence === 'high').length;
  console.log(`\n== ${name}: ${rows.length} candidates (${high} high, ${rows.length - high} low) -> build/reports/table-detectors/${name}.csv`);
  const byRule = new Map();
  for (const r of rows) byRule.set(r.Rule, (byRule.get(r.Rule) ?? 0) + 1);
  console.log(`   by rule: ${[...byRule].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join('; ')}`);
  const pat = new Map();
  for (const r of rows) { const k = `${r.Column} | ${clip(r.Value, 60)}`; pat.set(k, (pat.get(k) ?? 0) + 1); }
  console.log('   top (Column | Value) patterns:');
  for (const [k, v] of [...pat].sort((a, b) => b[1] - a[1]).slice(0, 5)) console.log(`     ${String(v).padStart(4)}  ${k}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) { console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 28).map((l) => l.replace(/^\/\/ ?/, '')).join('\n')); return; }
  const oi = args.indexOf('--only');
  const only = oi >= 0 ? args[oi + 1] : null;
  if (only && !DETECTORS.includes(only)) { console.error(`--only ${only}: one of ${DETECTORS.join(', ')}`); process.exit(2); }
  const want = (n) => !only || only === n;
  mkdirSync(OUT, { recursive: true });

  const tables = {};
  for (const n of ['profiles', 'measurements', 'page_context', 'print_guide', 'print_guide_materials', 'grades', 'sources']) tables[n] = table(n);
  tables.byId = { measurements: new Map(tables.measurements.map((m) => [m.MeasurementID, m])) };
  const db = loadDb();
  const ctx = { tables, db, profiles: tables.profiles, measurements: tables.measurements };

  const write = (name, rows, header = HEADER) => writeFileSync(join(OUT, `${name}.csv`), csvText(header, rows.map((r) => Object.fromEntries(header.map((h) => [h, r[h] === '' ? null : r[h]])))));
  const run = {
    'mislabel': () => detectMislabel(ctx),
    'wrong-column': () => detectWrongColumn(ctx),
    'negation': () => detectNegation(ctx),
    'scope': () => detectScope(ctx),
    'product-on-page': () => detectProductOnPage(ctx),
  };
  for (const name of DETECTORS) {
    if (!want(name)) continue;
    const rows = await run[name]();
    if (rows == null) continue;
    write(name, rows);
    summarise(name, rows);
    if (name === 'negation') {
      const gaps = nullReaderGapsAll(ctx);
      write('negation-null-readers', gaps, ['Parser', 'Table', 'Column', 'Typed', 'NonEmptyCells', 'ReturnsNothing', 'NothingButTypedPositive', 'Note']);
      console.log('   null-reader gaps (parser, column: non-empty cells / return nothing / nothing-but-typed-positive):');
      for (const g of gaps) console.log(`     ${g.Parser} ${g.Table}.${g.Column}: ${g.NonEmptyCells} / ${g.ReturnsNothing} / ${g.NothingButTypedPositive}  ${clip(g.Note, 140)}`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
