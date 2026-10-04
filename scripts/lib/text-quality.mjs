// Is a cached page's text a reading of the page, or only text? (reader round, 2026-10-04.)
//
// pdf.js returns whatever the document's text layer says. A layer can be empty (a scan), full of private-use
// characters (a font with no Unicode map), or mapped to the wrong characters (a Caesar-shifted alphabet, a glyph
// table off by one), and every one of those reads as a successful extraction. Nothing downstream could tell, so a
// number from such a page was checked against a page that never printed it. This module says, page by page, what
// is wrong with a reading, as flags a person can act on. It decides nothing about data: a flag means "look at the
// page image, or read it optically", never "this value is wrong".
//
//   empty            fewer than 40 non-blank characters: a scan, a cover, or a layer that holds only a page number
//   glyph            private-use characters (U+E000-U+F8FF), U+FFFD or "(cid:": the font has no Unicode map
//   letters          letters are under 35 % of the page's characters: symbols and digits where words should be
//   garble           the layer is mapped, but to the wrong characters (see below)
//   label-no-number  a property or print-setting label on a line with no number on it or the two lines after
//
// garble has two readings. (1) The words do not look like words: each Latin word of four letters or more is scored
// by a letter-bigram model (scripts/ingest/lexicon/letter-bigrams.csv, trained on words that recur across the
// cached sheets), and a page whose mean score is far below any language's, or a large share of whose words
// score low, is a substitution cipher or noise. (2) Numbers carry characters no number has ("3]", "4&4", "6|8"):
// an optical reading of a broken layer, or a layer with a digit mapped to a symbol.
//
// Nothing here reads the file system except the two lexicon tables, so a test can hand it a fixture page.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../../build/src/csv.js';
import { lineCells } from './pdf-text.mjs';

const lexiconDir = join(dirname(fileURLToPath(import.meta.url)), '../ingest/lexicon');

export const THRESHOLDS = {
  emptyChars: 40,       // non-blank characters below which a page is empty
  letterRatio: 0.35,    // letters over non-blank characters below which a page is not words
  minWords: 25,         // Latin words of 4+ letters a page needs before its words are scored
  meanBigram: -3.2,     // mean log-probability per letter pair below which the words are not any language's
  lowShare: 0.27,       // share of words scoring under lowWord above which the page is noise
  lowWord: -3.3,        // a word's mean log-probability under which it counts as low
  strayNumbers: 2,      // numbers with a symbol inside, at or above which a page is flagged
  labelWindow: 2,       // lines after a label searched for its number
  orphanLabels: 2,      // labels with no number near them at or above which a page is flagged
};

const NUMERIC_SETTINGS = new Set(['nozzle', 'bed', 'chamber', 'drying']);
// A value a sheet may state in words: the row is complete without a number.
const WORDS_FOR_NO_NUMBER = /\b(?:n\/?a|not|none|no|yes|recommended|necessary|required|applicable|published|determined|available|room|ambient)\b|^\s*[\-\u2010\u2013\u2014]+\s*$|[\-\u2010\u2013\u2014]\s*[\-\u2010\u2013\u2014]/i;
const PRIVATE_USE = /[-�]|\(cid:/g;
const STRAY_NUMBER = /^\d+[\]&|!?{}]\d*$|^[\]&|!?{}]\d+$/;

let bigramTable = null;
/** The letter-bigram log-probabilities: rows are the previous letter ("_" for a word boundary), columns the next. */
export function loadBigrams() {
  if (bigramTable) return bigramTable;
  const { records } = readCsv(join(lexiconDir, 'letter-bigrams.csv'));
  const table = {};
  for (const { values } of records) {
    table[values.Prev] = {};
    for (const [next, value] of Object.entries(values)) if (next !== 'Prev') table[values.Prev][next] = Number(value);
  }
  bigramTable = table;
  return table;
}

/** The property and setting labels the proposal reader recognises, as { kind, label, re }. */
export function loadLabels() {
  const read = (name, kind) => readCsv(join(lexiconDir, `${name}.csv`)).records.map((r) => ({ kind, label: r.values.Property ?? r.values.Field, re: new RegExp(r.values.Label, 'i') }));
  // A setting that is a number: the others (enclosure, plate, nozzle material, a note) are words, and a line that
  // names one without a digit is a sentence, not a row with its value lost.
  return [...read('property-labels', 'property'), ...read('setting-labels', 'setting').filter((l) => NUMERIC_SETTINGS.has(l.label))];
}

const fold = (w) => w.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** The words a page's bigram score is taken over: Latin letters only, accents removed, four or more of them. */
export function scoredWords(text) {
  return [...String(text).toLowerCase().matchAll(/\p{Script=Latin}{4,}/gu)].map((m) => fold(m[0])).filter((w) => /^[a-z]+$/.test(w));
}

/** A word's mean log-probability per letter pair, with its boundaries counted. */
export function wordScore(word, table = loadBigrams()) {
  const s = `_${word}_`;
  let total = 0;
  for (let i = 0; i < s.length - 1; i++) total += table[s[i]][s[i + 1]];
  return total / (s.length - 1);
}

const LETTERS = '_abcdefghijklmnopqrstuvwxyz'.split('');

/**
 * The bigram table from a vocabulary: [word, documents it occurs in] pairs. Each pair adds log(documents) to its
 * letter pairs (a word every sheet prints counts more than a brand name, and not as much as its frequency would
 * say), with half a count of smoothing so no pair is impossible. Rows are returned as CSV records.
 */
export function trainBigrams(vocabulary) {
  const counts = Object.fromEntries(LETTERS.map((a) => [a, Object.fromEntries(LETTERS.map((b) => [b, 0.5]))]));
  for (const [word, documents] of vocabulary) {
    const s = `_${word}_`;
    for (let i = 0; i < s.length - 1; i++) counts[s[i]][s[i + 1]] += Math.log(documents);
  }
  return LETTERS.map((a) => {
    const total = Object.values(counts[a]).reduce((x, y) => x + y, 0);
    return { Prev: a, ...Object.fromEntries(LETTERS.map((b) => [b, Math.log(counts[a][b] / total).toFixed(2)])) };
  });
}

const hasNumber =(text) => /\d/.test(text);

/**
 * What is wrong with one page's text, if anything. `page` is a cache page ({ page, lines }); `labels` are the
 * recognised labels (loadLabels). Returns { page, chars, letterRatio, flags, detail }.
 */
export function pageQuality(page, { labels = loadLabels(), bigrams = loadBigrams(), thresholds = THRESHOLDS } = {}) {
  const lines = page.lines ?? [];
  const text = lines.map((l) => l.text).join('\n');
  const solid = text.replace(/\s/g, '');
  const chars = solid.length;
  const letters = (solid.match(/\p{L}/gu) ?? []).length;
  const letterRatio = chars ? letters / chars : 0;
  const flags = [];
  const detail = {};

  if (chars < thresholds.emptyChars) flags.push('empty');
  const glyphs = (text.match(PRIVATE_USE) ?? []).length;
  if (glyphs) { flags.push('glyph'); detail.glyphs = glyphs; }
  // An empty page has no letters to be short of: it is already flagged, and saying both would count it twice.
  if (chars >= thresholds.emptyChars && letterRatio < thresholds.letterRatio) flags.push('letters');

  const words = scoredWords(text);
  if (words.length >= thresholds.minWords) {
    const scores = words.map((w) => wordScore(w, bigrams));
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const low = scores.filter((s) => s < thresholds.lowWord).length / scores.length;
    detail.bigram = Number(mean.toFixed(3));
    detail.lowShare = Number(low.toFixed(3));
    if (mean < thresholds.meanBigram || low >= thresholds.lowShare) flags.push('garble');
  }
  const stray = text.split(/\s+/).filter((t) => STRAY_NUMBER.test(t)).length;
  if (stray) detail.stray = stray;
  if (stray >= thresholds.strayNumbers && !flags.includes('garble')) flags.push('garble');

  const orphans = labelsWithoutNumber(lines, labels, thresholds.labelWindow);
  // One label alone is as likely a heading or a sentence as a row; two on a page is a table whose values are gone.
  if (orphans.length >= thresholds.orphanLabels) { flags.push('label-no-number'); detail.labels = orphans; }

  return { page: page.page, chars, letterRatio: Number(letterRatio.toFixed(3)), flags, detail };
}

/** Lines that start with a recognised label while that line and the next `window` hold no digit. */
export function labelsWithoutNumber(lines, labels, window = THRESHOLDS.labelWindow) {
  const found = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const head = lineCells(line)[0]?.text ?? line.text;
    const label = labels.find((l) => l.re.test(line.text.trim()) || l.re.test(head.trim()));
    if (!label) continue;
    // A sentence is not a row: a label opening a long line of prose is a mention.
    if (line.text.split(/\s+/).length > 14) continue;
    // A column heading names its unit in brackets ("Elongation (%)", "Modulus [MPa]"): the values are below it.
    if (/[\[(][^\]\d)]{1,8}[\])]\s*$/.test(line.text)) continue;
    const rest = line.text.replace(label.re, '');
    if (WORDS_FOR_NO_NUMBER.test(rest)) continue;
    // Three words after the label make a sentence that mentions it.
    if ((rest.match(/\p{L}{3,}/gu) ?? []).length >= 3) continue;
    const near = lines.slice(i, i + 1 + window);
    if (near.some((l) => hasNumber(l.text))) continue;
    found.push(`${label.kind}:${label.label}: ${line.text.slice(0, 60)}`);
  }
  return found;
}

/**
 * A document's quality: every page's, and what the document is as a whole. `text` is a cache entry
 * ({ sha, extractor, pages, ocr? }). A reading that is already optical says so, because its flags mean something
 * else: the recognition went wrong, not the file's own layer.
 */
export function docQuality(text, options = {}) {
  const pages = text.pages.map((p) => pageQuality(p, options));
  const counts = {};
  for (const p of pages) for (const f of p.flags) counts[f] = (counts[f] ?? 0) + 1;
  return {
    sha: text.sha,
    extractor: text.extractor,
    optical: Boolean(text.ocr),
    pages,
    pageCount: pages.length,
    flaggedPages: pages.filter((p) => p.flags.length).length,
    counts,
  };
}

/** The flags that mean the text itself cannot be trusted (label-no-number only asks for a second look). */
export const BROKEN = new Set(['empty', 'glyph', 'letters', 'garble']);
export const isBroken = (pageResult) => pageResult.flags.some((f) => BROKEN.has(f));
