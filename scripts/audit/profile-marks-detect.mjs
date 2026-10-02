// The detectors of the print-profile error marks (the data audit of 2026-10-01, docs/audits/2026-10-02-profile-root-causes).
// Every error the control draws found was one of four kinds: a setting the sheet prints that no profile of that sheet
// holds (omission), a cell holding part of what the sheet prints (part-held), a cell holding a test bar's print setting
// (specimen), or a typed reading of a right raw cell (parse, which PARSE-MISMATCH guards). The first three leave a mark
// on the sheet's text a script can see without understanding the layout: a number printed on a setting-like line and held
// nowhere, or a held number found only under a specimen heading or beside another setting's label. detect() lists every
// such mark, so a reader reads marks grouped by cause rather than every profile. It is independent of the import's
// reader on purpose: a reading error the reader makes is a reading error it cannot see.
//
// Pure: the profile rows and a pagesOf(sourceId) -> [{ page, lines: [string] }] | null are its whole input
// (scripts/audit/profile-marks.mjs reads them from the tables and the text cache).

const NA = (v) => v == null || v === '' || v === 'Not applicable' || v === 'Not published';

const HELD = ['Nozzle °C', 'Bed °C', 'Chamber °C', 'Enclosure', 'Plate', 'Drying', 'Nozzle material', 'Nozzle diameter', 'Abrasion / clogging', 'Failure modes', 'Support pairing', 'Profile'];
export const TEMP = /(?<![\d.])\d{2,3}(?:[.,]\d)?\s*(?:[-–~～至to+＋/]+\s*\d{2,3}(?:[.,]\d)?\s*)?(?:\((?:recommended|rec\.)\)\s*)?\(?\s*(?:(?:°|º|˚|o)\s*[CF]\b|℃|℉|degrees? ?C|C\b)/;
const TIME = /(?<![\d.])\d{1,2}(?:[.,]\d)?\s*(?:[-–~～to]+\s*\d{1,2}\s*)?\+?\s*(?:h|hr|hrs|hours?|H|小时|min|minutes)\b/;
const NOZZLE = /harden|stainless|steel nozzle|ruby|abrasi|wear[- ]?resist|brass|tungsten|nozzle material|carbide|obsidian/i;
const KEY = /nozzle|extru|print(ing)?\s*temp|hot\s*end|melt temp|bed|plate|platform|hot\s*pad|heat\s*bed|chamber|enclos|ambient|environment|room temp|dry|drying|dried|dehydrat|oven|喷嘴|热床|底板|烘干|干燥|腔/i;
// What prints a temperature but is not printing guidance: a property, a test condition, storage.
const PROP = /\b(HDT|heat (deflection|distortion)|vicat|glass transition|\bTg\b|melting (point|temp)|\bTm\b|crystalli|softening|melt (flow|volume|index|mass)|\bMFR\b|\bMFI\b|\bMVR\b|2[.,]16 ?kg|decompos|ISO ?75|D ?648|D ?1525|ISO ?306|D ?3418|11357|flammab|UL ?94|storage|store\b|stored|shelf|brittle|service temp|use temp|continuous|conductiv|CLTE|expansion|@ ?-?\d+ ?°|at 23|23 ?(°|º|˚)?C ?\/ ?50|test temp|permeab|heat resistance|temperature resistance|heat aging|ageing|aging|weathering|xenon|odor|smoke|density|g\/10 ?min|tensile|flexural|impact|izod|charpy|elongation|modulus|hardness|shore|shrink|water absorption|moisture absor|compression set|kj\/m|j\/m|mpa|kg∙cm|g\/cm|\bRH\b|% ?r\.?h|relative humidity|crystal|anneal|conditioned|dsc|tga|10 ?°c\/min|°c\/h)/i;
const STORE = /keep (out|away|sealed|dry|in)|direct (heat|sunlight)|sunlight/i;
export const SPECIMEN_BLOCK = /h\s*o\s*w\s+t\s*o\s+m\s*a\s*k\s*e\s+s\s*p\s*e\s*c\s*i\s*m\s*e\s*n|specimens? (were|was|are) (3d )?printed|printed (under|at|with) the following|printed specimen conditions|print(ing)? test condition|test (the )?spline|splines are printed|test equipment|specimen (preparation|conditions|print)|试样打印|测试样条|(print|specimen|sample|test|layer).{0,60}\binfill\s*[:=]?\s*\d|\binfill\s*[:=]?\s*\d.{0,60}(print|specimen|sample|test|layer)|filling\s*=|\bshell\s+\d|raster orientation|layer ?height\s*[:=]?\s*0[.,]\d.*infill/i;
const FIELD_WORDS = {
  'Nozzle °C': /nozzle|extru|print(ing)?\s*(temp|temperature)|hot\s*end|melt|processing temp|working temp|喷嘴|打印温度/i,
  'Bed °C': /bed|plate|platform|pad|heat\s*bed|build surface|热床|底板/i,
  'Chamber °C': /chamber|enclos|ambient|environment|room|build (volume|space)|腔/i,
  Drying: /dry|drying|dried|dehydrat|oven|moisture|烘干|干燥/i,
};
const TEMP_G = new RegExp(TEMP.source, 'g');
const TIME_G = /(?<![\d.])\d{1,2}(?:[.,]\d)?\s*(?:[-–~～to]+\s*\d{1,2}\s*)?\+?\s*(?:h|hr|hrs|hours?|H|小时)\b/g;
const settingNums = (l, keyed) => {
  // a signed temperature ("(-30°C)", "+23°C") is a test condition, not a setting
  const t = [...l.matchAll(TEMP_G)].filter((m) => !/(^|[^\d\s])\s*[-−+]\s*$/.test(l.slice(Math.max(0, m.index - 3), m.index)) || /\d\s*[-−]\s*$/.test(l.slice(Math.max(0, m.index - 4), m.index))).flatMap((m) => nums(m[0], 15, 450));
  if (t.length || !keyed) return t;
  return [...l.matchAll(/(?<![\d.,])(\d{2,3})(?![\d.,]*\s*(?:mm|%|g\b|kg|mpa|cm|s\b|m\/|x\b|ml|w\b|v\b|rpm|ppm|n\b|j\b|kn|µm|um\b|°(?!\s*[cf])))/gi)].map((m) => Number(m[1])).filter((v) => v >= 15 && v <= 450);
};
const timeNums = (l) => (l.match(TIME_G) ?? []).flatMap((m) => nums(m, 1, 48));
const nums = (s, lo = 0, hi = 1e9) => (String(s).match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => Number(n.replace(',', '.'))).filter((x) => x >= lo && x <= hi);
const tidy = (l) => String(l ?? '').replace(/\s+/g, ' ').trim();
export const shapeOf = (l) => tidy(l).toLowerCase().replace(/\d+(?:[.,]\d+)?/g, '#').replace(/(°|º|˚)\s*[cf]?|℃|℉/g, '°').replace(/[|:;,()［］【】\[\]（）*=]/g, ' ').replace(/#(\s*[-–~～+/至to±]+\s*#)+/g, '#').replace(/\s+/g, ' ').trim().slice(0, 60);

/** Marks on every guidance sheet, for the given profile rows. */
export function detect(profileRows, { pagesOf }) {
  const bySource = new Map();
  for (const r of profileRows) {
    if (/not printing guidance/.test(r.Locator)) continue;
    (bySource.get(r.SourceID) ?? bySource.set(r.SourceID, []).get(r.SourceID)).push(r);
  }
  const marks = [];
  for (const [sid, ps] of bySource) {
    const pages = pagesOf(sid); if (!pages) continue;
    // What each product of the sheet holds: a sheet filed under two products must hold its settings on both.
    const grades = [...new Set(ps.map((p) => p.GradeID))];
    const heldBy = new Map(grades.map((g) => [g, new Set(ps.filter((p) => p.GradeID === g).flatMap((p) => HELD.flatMap((k) => (NA(p[k]) ? [] : nums(p[k])))))]));
    const held = { has: (v) => grades.every((g) => heldBy.get(g).has(v)) };
    const heldText = ps.flatMap((p) => HELD.map((k) => p[k])).join(' | ').toLowerCase();
    const lines = pages.flatMap((pg) => pg.lines.map((l, i) => ({ page: pg.page, i, l: tidy(l), all: pg.lines })));
    if (!lines.length) continue;
    const specimenAt = (x) => x.all.slice(Math.max(0, x.i - 8), x.i + 1).some((y) => SPECIMEN_BLOCK.test(tidy(y)));
    const ctx = (x) => ({ prev: tidy(x.all[x.i - 1]).slice(0, 90), next: tidy(x.all[x.i + 1]).slice(0, 90) });
    const base = (x) => ({ sid, profiles: ps.map((p) => p.ProfileID).join(' '), page: x.page, line: x.l.slice(0, 200), shape: shapeOf(x.l), ...ctx(x), specimen: specimenAt(x) ? 'specimen' : '' });
    // omission and part-held: a setting-like line with a number nobody holds
    for (const x of lines) {
      if (!x.l || x.l.length > 260) continue;
      const near = `${tidy(x.all[x.i - 1])} ${x.l}`;
      const above = `${tidy(x.all[x.i - 2])} ${tidy(x.all[x.i - 1])}`;
      const t = TEMP.test(x.l), h = TIME.test(x.l) && /dry|drying|dried|oven|dehyd|烘干|干燥/i.test(`${above} ${x.l} ${tidy(x.all[x.i + 1])}`), k = (KEY.test(x.l) || (/^[\d\s.,–~°ºC℃()+-]+$/.test(x.l) && KEY.test(above))) && nums(x.l, 15, 450).length > 0, n = NOZZLE.test(x.l);
      if (!t && !h && !k && !n) continue;
      if (PROP.test(x.l) || STORE.test(x.l) || specimenAt(x)) continue;
      // the numbers a setting is made of: temperatures, drying hours, and on a setting's line a bare number that is not a
      // speed, a share, a length or a mass
      const ns = [...settingNums(x.l, k), ...(h ? timeNums(x.l) : [])];
      if (!ns.length && !n) continue;
      const missing = ns.filter((v) => !held.has(v));
      const nozzleMissing = n && !/harden|steel|ruby|abrasi|wear|brass|tungsten|carbide|obsidian/.test(heldText);
      if (!missing.length && !nozzleMissing) continue;
      marks.push({ kind: missing.length && missing.length < ns.length ? 'part-held' : missing.length ? 'unheld' : 'nozzle-statement', ...base(x), missing: missing.join(' ') });
    }
    // a chamber, enclosure or nozzle statement in words, where every profile of the sheet holds nothing there
    const silent = (cols) => ps.every((p) => cols.every((c) => NA(p[c]) || /^Not published/.test(p[c])));
    for (const x of lines) {
      if (!x.l || x.l.length > 200 || specimenAt(x) || STORE.test(x.l) || /\bstor(e|ed|age)\b|anneal/i.test(x.l)) continue;
      const w = `${x.l} ${tidy(x.all[x.i + 1])}`;
      if ((/enclos|closure|closed|draft|draught/i.test(x.l) && silent(['Enclosure']) || /chamber|ambient temp|environment(al)? temp|room temp/i.test(x.l) && silent(['Chamber °C'])) && /need|requir|recommend|necessary|\bnot\b|room temp|ambient|\bopen\b|closed|\byes\b|\bno\b|heated|passive|normal/i.test(w))
        marks.push({ kind: 'word-statement', ...base(x), column: 'Chamber °C / Enclosure' });
      if (/dry|drying|dried|dehydrat/i.test(x.l) && /need|requir|recommend|necessary|\bnot\b|before|prior|\byes\b|\bno\b/i.test(w) && silent(['Drying']))
        marks.push({ kind: 'word-statement', ...base(x), column: 'Drying' });
    }
    // an open end's sign the sheet prints beside a held number and the cell drops
    for (const p of ps) for (const col of Object.keys(FIELD_WORDS)) {
      if (NA(p[col]) || /^Not published/.test(p[col]) || /[+<>≥≤＞＜]|min|max|least|above|below|up to|over|under/i.test(p[col])) continue;
      const want = nums(p[col], 15, 450); if (!want.length) continue;
      for (const x of lines) {
        if (!want.every((v) => nums(x.l, 15, 450).includes(v)) || specimenAt(x)) continue;
        const signed = new RegExp(`(?:[<>≥≤＞＜]|\\b(?:min|max|at least|above|below|up to|over|under)\\b)\\s*\\.?\\s*${want[want.length - 1]}\\s*(?:°|º|˚|℃)|${want[want.length - 1]}\\s*(?:°|º|˚|℃)?\\s*C?\\s*(?:\\+|＋|or (?:more|higher|above)|and (?:above|up))`, 'i');
        if (signed.test(x.l) && FIELD_WORDS[col].test(`${tidy(x.all[x.i - 1])} ${x.l}`)) { marks.push({ kind: 'sign-dropped', ...base(x), profiles: p.ProfileID, column: col }); break; }
      }
    }
    // a raw cell that is not one line of the sheet but two run together: a neighbouring row's words absorbed
    const flat = (v) => tidy(v).toLowerCase().replace(/[：:]/g, ':').replace(/[–—~～]/g, '-').replace(/[＞]/g, '>').replace(/[＜]/g, '<').replace(/[（]/g, '(').replace(/[）]/g, ')').replace(/[，]/g, ',').replace(/\s*([°º˚℃,;:/~–-])\s*/g, '$1');
    const sheetLines = lines.map((x) => flat(x.l));
    for (const p of ps) for (const col of ['Nozzle °C', 'Bed °C', 'Chamber °C', 'Enclosure', 'Drying', 'Abrasion / clogging']) {
      if (NA(p[col]) || /^Not published/.test(p[col]) || p[col].length < 8) continue;
      if (/^Use abrasion-resistant nozzle; verify minimum orifice/.test(p[col])) continue;
      const v = flat(p[col]);
      if (sheetLines.some((l) => l.includes(v))) continue;
      if (/; /.test(p[col]) && p[col].split(/; /).every((part) => { const f = flat(part); return f.length < 4 || sheetLines.some((l, i) => `${l} ${sheetLines[i + 1] ?? ''}`.includes(f)); })) continue;
      if (sheetLines.some((l, i) => `${l} ${sheetLines[i + 1] ?? ''}`.includes(v))) continue;
      // not on the sheet as one run of words: where its first words are
      const head = v.split(' ').slice(0, 2).join(' '); const k = Math.max(0, sheetLines.findIndex((l) => l.includes(head)));
      if (/[a-z]{3,}/.test(v)) marks.push({ kind: 'raw-not-verbatim', ...base(lines[k] ?? lines[0]), profiles: p.ProfileID, column: col, held: p[col] });
    }
    // specimen and wrong-row: where each held number sits on the sheet
    for (const p of ps) {
      for (const [col, words] of Object.entries(FIELD_WORDS)) {
        if (NA(p[col]) || /^Not published/.test(p[col])) continue;
        const want = nums(p[col], 15, 450); if (!want.length) continue;
        const at = lines.filter((x) => want.every((v) => nums(x.l, 15, 450).includes(v)));
        if (!at.length) { marks.push({ kind: 'held-not-on-sheet', ...base({ page: '', i: 0, l: `${col}: ${p[col]}`, all: [] }), profiles: p.ProfileID, column: col }); continue; }
        if (at.every(specimenAt)) marks.push({ kind: 'held-from-specimen', ...base(at[0]), profiles: p.ProfileID, column: col });
        else if (!at.some((x) => words.test(`${tidy(x.all[x.i - 1])} ${x.l} ${tidy(x.all[x.i + 1])}`))) marks.push({ kind: 'held-beside-other-label', ...base(at[0]), profiles: p.ProfileID, column: col });
      }
    }
  }
  // two profiles of one product from one sheet: one is a copy, and a copy that holds less, or holds otherwise, is wrong
  const byKey = new Map();
  for (const r of profileRows) { if (/not printing guidance/.test(r.Locator)) continue; const k = `${r.GradeID}\u0000${r.SourceID}`; (byKey.get(k) ?? byKey.set(k, []).get(k)).push(r); }
  for (const ps of byKey.values()) {
    if (ps.length < 2) continue;
    for (const col of ['Nozzle °C', 'Bed °C', 'Chamber °C', 'Enclosure', 'Drying', 'Abrasion / clogging']) {
      const vals = [...new Set(ps.map((p) => p[col]))]; if (vals.length < 2) continue;
      const held = vals.filter((v) => !NA(v) && !/^Not published/.test(v));
      for (const p of ps) marks.push({ kind: held.length > 1 ? 'duplicate-conflict' : NA(p[col]) || /^Not published/.test(p[col]) ? 'duplicate-incomplete' : 'duplicate-holds', sid: p.SourceID, profiles: p.ProfileID, page: '', line: `${col}: ${p[col]}`, shape: '', prev: '', next: '', specimen: '', column: col, siblings: ps.map((x) => x.ProfileID).join(' ') });
    }
    marks.push({ kind: 'duplicate', sid: ps[0].SourceID, profiles: ps.map((p) => p.ProfileID).join(' '), page: '', line: `${ps.length} profiles of ${ps[0].GradeID}`, shape: '', prev: '', next: '', specimen: '' });
  }
  return marks;
}

// ---- template clusters: sheets of one publisher whose printing-guidance lines share their labels. A maker reuses a
// template, so a reading error on one member is on every member; reading one exemplar per cluster finds the cause.
const CLUSTER_KEY = /nozzle|extru|print(ing)? ?temp|hot ?end|bed|plate|platform|hot ?pad|heat ?bed|chamber|enclos|ambient|environment|dry|drying|dried|fan|cooling|speed|retract|bridging|first layer|raft|brim|adhes|glue|warp|anneal|abras|harden|ruby|steel/i;
const labelOf = (l) => l.toLowerCase().replace(/[^a-z一-鿿 ]+/g, ' ').replace(/\b(c|f|mm|s|h|min|hours?|and|or|the|of|to|at|for|a)\b/g, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 4).join(' ');
const jaccard = (a, b) => { if (!a.size && !b.size) return 1; let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i); };

/** SourceID -> "T001": each sheet's template cluster, among the sheets of one publisher (Jaccard of label sets >= 0.5). */
export function clusterTemplates(profileRows, { pagesOf, publisherOf }) {
  const sources = new Set(profileRows.filter((r) => !/not printing guidance/.test(r.Locator)).map((r) => r.SourceID));
  const labels = new Map();
  for (const sid of sources) {
    const set = new Set();
    for (const p of pagesOf(sid) ?? []) for (const l of p.lines) if (CLUSTER_KEY.test(l) && String(l).length < 160) { const k = labelOf(String(l)); if (k) set.add(k); }
    labels.set(sid, set);
  }
  const pub = (sid) => String(publisherOf(sid) || '?').replace(/ \/.*$/, '').replace(/\s*\(.*\)/, '').trim().toLowerCase();
  const clusters = [];
  for (const sid of [...sources].sort()) {
    const p = pub(sid), s = labels.get(sid);
    let best = null, bj = 0;
    for (const c of clusters) if (c.pub === p) { const j = jaccard(s, c.rep); if (j > bj) { bj = j; best = c; } }
    if (best && bj >= 0.5) best.members.push(sid); else clusters.push({ pub: p, rep: s, members: [sid] });
  }
  return new Map(clusters.flatMap((c, i) => c.members.map((m) => [m, `T${String(i + 1).padStart(3, '0')}`])));
}
