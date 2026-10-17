// Prepares the three typefaces the static material pages embed: Inter (body, tables, figures) and Newsreader roman and
// italic (masthead, section titles, summary prose). It downloads each release, checks the SHA-256 of every input
// against the constants below and the licence against the SIL Open Font License 1.1 with no Reserved Font Name,
// subsets each face to the code points the pages use while keeping its variable axes, and writes the subsets, both
// licences and FONTS.md (the record of sources, hashes, ranges, axes and features) to app/pages/assets/fonts/.
//
// Run: node scripts/pages/subset-fonts.mjs
//
// Why the inputs are pinned by hash: the Newsreader URLs follow the `main` branch of google/fonts, which can change
// under us, and a download is never trusted because of where it came from. A changed file stops the script; the new
// hash is entered here only after the new file has been looked at. Nothing downloaded is ever executed: the only tool
// that touches the zip is the system `unzip`, given the archive and two member names as arguments.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = join(ROOT, '.cache', 'fonts');
const OUT = join(ROOT, 'app', 'pages', 'assets', 'fonts');

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

// ---------------------------------------------------------------------------------------------------------------------
// What is downloaded, and what each file must hash to.

const INTER_ZIP = {
  dir: 'inter-4.1',
  file: 'Inter-4.1.zip',
  url: 'https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip',
  sha256: '9883fdd4a49d4fb66bd8177ba6625ef9a64aa45899767dde3d36aa425756b11e',
  members: {
    'InterVariable.ttf': '4989b125924991b90d05b2d16e0e388c48f7d5bb8b30539bbf9c755278d0ccaf',
    'LICENSE.txt': '262481e844521b326f5ecd053e59b98c8b2da78c8ee1bdbb6e8174305e54935a',
  },
};

const NEWSREADER = [
  {
    dir: 'newsreader-roman',
    file: 'Newsreader[opsz,wght].ttf',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/newsreader/Newsreader%5Bopsz,wght%5D.ttf',
    sha256: '8a08d13f8a6c0d51be379a60af84f945f65369a67e509ee3c3bdcc421254d7c1',
  },
  {
    dir: 'newsreader-italic',
    file: 'Newsreader-Italic[opsz,wght].ttf',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/newsreader/Newsreader-Italic%5Bopsz,wght%5D.ttf',
    sha256: '796668611f80b64d5adf182fde3b6f29ed83b4e7cbec7b96937e84ac01364792',
  },
  {
    dir: 'newsreader-licence',
    file: 'OFL.txt',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/newsreader/OFL.txt',
    sha256: 'fdfad38143ec470553cae82a1e45320bdd1b9ec70415d37bd0171051d8a4ded8',
  },
];

// ---------------------------------------------------------------------------------------------------------------------
// What is kept.

/** The code points the pages use, as [first, last] pairs (a single code point is [x, x]). */
const RANGES = [
  [0x0020, 0x007e], [0x00a0, 0x00ff], [0x0100, 0x017f], [0x02da, 0x02da], [0x0394, 0x0394], [0x03a9, 0x03a9],
  [0x03bc, 0x03bc], [0x2010, 0x2015], [0x2018, 0x201f], [0x2020, 0x2022], [0x2026, 0x2026], [0x2030, 0x2030],
  [0x2032, 0x2033], [0x2039, 0x203a], [0x2044, 0x2044], [0x2060, 0x2060], [0x2070, 0x209f], [0x2103, 0x2103],
  [0x2122, 0x2122], [0x2190, 0x2193], [0x2212, 0x2212], [0x2248, 0x2248], [0x2260, 0x2260], [0x2264, 0x2265],
  [0x2605, 0x2606], [0x2713, 0x2713], [0x2717, 0x2717],
];

const hex = (cp) => cp.toString(16).toUpperCase().padStart(4, '0');
const rangeLabel = ([a, b]) => (a === b ? `U+${hex(a)}` : `U+${hex(a)}–${hex(b)}`);
const REQUESTED = RANGES.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i));
const TEXT = String.fromCodePoint(...REQUESTED);

/** Layout features the pages ask for by name. A face that lacks one simply never uses it (reported below). */
const FEATURES_ASKED = ['kern', 'liga', 'tnum', 'lnum', 'case', 'frac', 'sups', 'subs'];

/**
 * Features kept so that a face renders as its designer intended even though the pages never name them: ccmp, locl,
 * mark and mkmk compose and position accents (Latin Extended-A); calt is Inter's contextual alternates (the case-aware
 * brackets and punctuation, the arrows); pnum is the proportional figures that tnum switches away from; rvrn is
 * Newsreader's required variation substitution, which is what makes its optical sizes swap glyph shapes. Together they
 * cost about 3 KB of Inter and 6 KB of a Newsreader face, and a face without them looks subtly wrong.
 */
const FEATURES_RENDERING = ['ccmp', 'locl', 'mark', 'mkmk', 'calt', 'pnum', 'rvrn'];

/**
 * Inter's stylistic sets and character variants (ss01-ss08, cv01-cv11) are left out: kept, they add about 13 KB to the
 * Inter subset (+22 %), and no page asks for one. Add them here, and regenerate, if a page ever does.
 */
const KEEP_FEATURES = [...FEATURES_ASKED, ...FEATURES_RENDERING];

/** Name table entries kept beyond harfbuzz's defaults: the copyright notice, licence description and licence URL. */
const PRESERVE_NAME_IDS = [0, 13, 14];

const FACES = [
  {
    key: 'inter',
    label: 'Inter Variable',
    out: 'Inter-Variable.subset.woff2',
    axes: { wght: { min: 400, max: 700 }, opsz: { min: 14, max: 32 } },
  },
  {
    key: 'newsreader-roman',
    label: 'Newsreader Variable (roman)',
    out: 'Newsreader-Variable.subset.woff2',
    axes: { wght: { min: 400, max: 700 }, opsz: { min: 6, max: 72 } },
  },
  {
    key: 'newsreader-italic',
    label: 'Newsreader Variable (italic)',
    out: 'Newsreader-Italic-Variable.subset.woff2',
    axes: { wght: { min: 400, max: 700 }, opsz: { min: 6, max: 72 } },
  },
];

// ---------------------------------------------------------------------------------------------------------------------
// Downloading and checking.

/** Make `dir` under .cache/fonts a new, empty directory: a stale file from an earlier run must not be mistaken for a fresh download. */
function freshDir(name) {
  const dir = join(CACHE, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  return dir;
}

async function download(spec) {
  const dir = freshDir(spec.dir);
  const res = await fetch(spec.url);
  if (!res.ok) throw new Error(`${spec.url}: HTTP ${res.status}. If the file has moved, find its current path under ofl/newsreader/ in github.com/google/fonts and update this script.`);
  const buf = Buffer.from(await res.arrayBuffer());
  const got = sha256(buf);
  if (got !== spec.sha256) throw new Error(`${spec.url}: SHA-256 is ${got}, expected ${spec.sha256}. The download changed; look at it before pinning the new hash.`);
  const path = join(dir, spec.file);
  writeFileSync(path, buf);
  return { path, dir, buf, sha256: got };
}

/** Take two members out of the Inter zip with the system unzip, into a directory of their own, and check their hashes. */
function extractInter(zip) {
  const dir = freshDir('inter-4.1-extracted');
  const names = Object.keys(INTER_ZIP.members);
  execFileSync('unzip', ['-o', '-q', zip.path, ...names, '-d', dir], { stdio: ['ignore', 'inherit', 'inherit'] });
  const files = {};
  for (const name of names) {
    const buf = readFileSync(join(dir, name));
    const got = sha256(buf);
    if (got !== INTER_ZIP.members[name]) throw new Error(`${name} from ${INTER_ZIP.file}: SHA-256 is ${got}, expected ${INTER_ZIP.members[name]}`);
    files[name] = { buf, sha256: got };
  }
  return files;
}

/**
 * The licence must be the SIL Open Font License 1.1 and must declare no Reserved Font Name. Every copy of the licence
 * defines the term in its text ("Reserved Font Name refers to any names specified as such after the copyright
 * statement(s)"), so the check reads only the header above the licence's own rule line, where a font declares its names
 * ("Copyright ... with Reserved Font Name X").
 */
function checkLicence(label, buf) {
  const text = buf.toString('utf8');
  const split = text.search(/^-{20,}\s*$/m);
  if (split < 0) throw new Error(`${label}: no rule line between the copyright header and the licence text`);
  const header = text.slice(0, split);
  const body = text.slice(split);
  if (!/SIL Open Font License, Version 1\.1/i.test(header)) throw new Error(`${label}: the header does not name the SIL Open Font License, Version 1.1`);
  if (!/SIL OPEN FONT LICENSE Version 1\.1 - 26 February 2007/.test(body)) throw new Error(`${label}: the licence text is not OFL 1.1`);
  if (/reserved font name/i.test(header)) throw new Error(`${label}: the header declares a Reserved Font Name`);
  const copyright = header.split('\n').find((l) => /^Copyright/i.test(l.trim()));
  if (!copyright) throw new Error(`${label}: no copyright line`);
  return copyright.trim();
}

// ---------------------------------------------------------------------------------------------------------------------
// A small SFNT reader, only for checking: which code points a font maps, which axes it varies on, which layout features
// it carries and what its name table says. It reads a font after subset-font has decoded it, never anything executable.

function tables(b) {
  const n = b.readUInt16BE(4);
  const t = {};
  for (let i = 0; i < n; i++) {
    const o = 12 + i * 16;
    t[b.toString('latin1', o, o + 4)] = { off: b.readUInt32BE(o + 8), len: b.readUInt32BE(o + 12) };
  }
  return t;
}

function axesOf(b, t) {
  if (!t.fvar) return [];
  const o = t.fvar.off;
  const first = b.readUInt16BE(o + 4);
  const count = b.readUInt16BE(o + 8);
  const size = b.readUInt16BE(o + 10);
  return Array.from({ length: count }, (_, i) => {
    const p = o + first + i * size;
    const fx = (q) => b.readInt32BE(q) / 65536;
    return { tag: b.toString('latin1', p, p + 4), min: fx(p + 4), default: fx(p + 8), max: fx(p + 12) };
  });
}

function featuresOf(b, t) {
  const out = new Set();
  for (const tag of ['GSUB', 'GPOS']) {
    if (!t[tag]) continue;
    const list = t[tag].off + b.readUInt16BE(t[tag].off + 6);
    const n = b.readUInt16BE(list);
    for (let i = 0; i < n; i++) out.add(b.toString('latin1', list + 2 + i * 6, list + 6 + i * 6));
  }
  return [...out].sort();
}

/** The set of code points the font maps to a glyph other than .notdef (cmap formats 4 and 12, the ones fonts use for Unicode). */
function codePointsOf(b, t) {
  const base = t.cmap.off;
  const n = b.readUInt16BE(base + 2);
  const subtables = Array.from({ length: n }, (_, i) => ({
    platform: b.readUInt16BE(base + 4 + i * 8),
    encoding: b.readUInt16BE(base + 6 + i * 8),
    off: base + b.readUInt32BE(base + 8 + i * 8),
  })).filter((s) => (s.platform === 3 && (s.encoding === 1 || s.encoding === 10)) || s.platform === 0);
  const set = new Set();
  for (const s of subtables) {
    const format = b.readUInt16BE(s.off);
    if (format === 12) {
      const groups = b.readUInt32BE(s.off + 12);
      for (let g = 0; g < groups; g++) {
        const p = s.off + 16 + g * 12;
        const start = b.readUInt32BE(p);
        const end = b.readUInt32BE(p + 4);
        const glyph = b.readUInt32BE(p + 8);
        for (let c = start; c <= end; c++) if (glyph + (c - start) !== 0) set.add(c);
      }
    } else if (format === 4) {
      const segs = b.readUInt16BE(s.off + 6) / 2;
      const ends = s.off + 14;
      const starts = ends + segs * 2 + 2;
      const deltas = starts + segs * 2;
      const ranges = deltas + segs * 2;
      for (let i = 0; i < segs; i++) {
        const end = b.readUInt16BE(ends + i * 2);
        const start = b.readUInt16BE(starts + i * 2);
        const delta = b.readInt16BE(deltas + i * 2);
        const rangeOffset = b.readUInt16BE(ranges + i * 2);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          let glyph;
          if (rangeOffset === 0) glyph = (c + delta) & 0xffff;
          else {
            const g = b.readUInt16BE(ranges + i * 2 + rangeOffset + (c - start) * 2);
            glyph = g === 0 ? 0 : (g + delta) & 0xffff;
          }
          if (glyph !== 0) set.add(c);
        }
      }
    }
  }
  return set;
}

function nameOf(b, t, id) {
  const base = t.name.off;
  const count = b.readUInt16BE(base + 2);
  const strings = base + b.readUInt16BE(base + 4);
  for (let i = 0; i < count; i++) {
    const p = base + 6 + i * 12;
    if (b.readUInt16BE(p + 6) !== id) continue;
    const len = b.readUInt16BE(p + 8);
    const off = strings + b.readUInt16BE(p + 10);
    return b.readUInt16BE(p) === 3 || b.readUInt16BE(p) === 0 ? Buffer.from(b.subarray(off, off + len)).swap16().toString('utf16le') : b.toString('latin1', off, off + len);
  }
  return null;
}

/** Decode a WOFF2 subset back to a plain SFNT (every glyph kept, nothing re-subsetted) so that it can be read. */
const toSfnt = (woff2) => subsetFont(woff2, undefined, { keepAllGlyphs: true, targetFormat: 'sfnt' });

// ---------------------------------------------------------------------------------------------------------------------

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

async function main() {
  mkdirSync(OUT, { recursive: true });

  console.log('Downloading ...');
  const zip = await download(INTER_ZIP);
  const inter = extractInter(zip);
  const [roman, italic, nrLicence] = await Promise.all(NEWSREADER.map(download));

  const licences = {
    'Inter-OFL.txt': { buf: inter['LICENSE.txt'].buf, sha256: inter['LICENSE.txt'].sha256 },
    'Newsreader-OFL.txt': { buf: nrLicence.buf, sha256: nrLicence.sha256 },
  };
  const copyrights = {
    'Inter-OFL.txt': checkLicence('Inter LICENSE.txt', licences['Inter-OFL.txt'].buf),
    'Newsreader-OFL.txt': checkLicence('Newsreader OFL.txt', licences['Newsreader-OFL.txt'].buf),
  };
  console.log('Licences: SIL OFL 1.1, no Reserved Font Name declared in either header.');

  const sources = {
    inter: { buf: inter['InterVariable.ttf'].buf, sha256: inter['InterVariable.ttf'].sha256 },
    'newsreader-roman': { buf: roman.buf, sha256: roman.sha256 },
    'newsreader-italic': { buf: italic.buf, sha256: italic.sha256 },
  };

  const report = [];
  for (const face of FACES) {
    const src = sources[face.key];
    const srcTables = tables(src.buf);
    const srcAxes = axesOf(src.buf, srcTables);
    const srcMap = codePointsOf(src.buf, srcTables);
    const srcFeatures = featuresOf(src.buf, srcTables);

    // An axis range must lie inside what the font has; opsz is limited only if the file has it.
    const axes = Object.fromEntries(Object.entries(face.axes).filter(([tag]) => srcAxes.some((a) => a.tag === tag)));
    for (const [tag, r] of Object.entries(axes)) {
      const a = srcAxes.find((x) => x.tag === tag);
      if (r.min < a.min || r.max > a.max) throw new Error(`${face.label}: ${tag} ${r.min}-${r.max} lies outside the font's ${a.min}-${a.max}`);
    }

    const woff2 = await subsetFont(src.buf, TEXT, {
      targetFormat: 'woff2',
      variationAxes: axes,
      keepFeatures: KEEP_FEATURES,
      preserveNameIds: PRESERVE_NAME_IDS,
    });
    if (woff2.subarray(0, 4).toString('latin1') !== 'wOF2') throw new Error(`${face.out}: not a WOFF2 file`);
    writeFileSync(join(OUT, face.out), woff2);

    // Prove the output parses: decode it, read it back, and subset it again to a few characters.
    const sfnt = await toSfnt(woff2);
    const outTables = tables(sfnt);
    const outMap = codePointsOf(sfnt, outTables);
    const outAxes = axesOf(sfnt, outTables);
    const outFeatures = featuresOf(sfnt, outTables);
    const again = await subsetFont(woff2, 'PETG 46.5 MPa', { targetFormat: 'woff2' });
    if (again.subarray(0, 4).toString('latin1') !== 'wOF2' || again.length === 0) throw new Error(`${face.out}: could not be subset again`);

    const missing = REQUESTED.filter((cp) => !srcMap.has(cp));
    const lostInSubset = REQUESTED.filter((cp) => srcMap.has(cp) && !outMap.has(cp));
    if (lostInSubset.length) throw new Error(`${face.out}: code points the source has are missing from the subset: ${lostInSubset.map(hex).join(' ')}`);
    for (const [tag, r] of Object.entries(axes)) {
      const a = outAxes.find((x) => x.tag === tag);
      if (!a || a.min !== r.min || a.max !== r.max) throw new Error(`${face.out}: axis ${tag} is ${a ? `${a.min}-${a.max}` : 'missing'}, expected ${r.min}-${r.max}`);
    }
    const copyright = nameOf(sfnt, outTables, 0);
    if (!copyright) throw new Error(`${face.out}: the copyright notice (name ID 0) did not survive the subset`);

    report.push({
      face,
      axes: outAxes,
      srcAxes,
      size: woff2.length,
      sha256: sha256(woff2),
      src,
      missing,
      absentFeatures: KEEP_FEATURES.filter((f) => !srcFeatures.includes(f)),
      keptFeatures: outFeatures,
      glyphsMapped: REQUESTED.length - missing.length,
      copyright,
    });
  }

  for (const [name, l] of Object.entries(licences)) writeFileSync(join(OUT, name), l.buf);

  for (const r of report) {
    console.log(`\n${r.face.label}: ${r.face.out}, ${r.size} bytes (${kb(r.size)})`);
    console.log(`  axes: ${r.axes.map((a) => `${a.tag} ${a.min}–${a.max} (default ${a.default})`).join(', ')}`);
    console.log(`  code points the source font lacks (they fall back to system fonts): ${r.missing.length ? r.missing.map((c) => `U+${hex(c)}`).join(' ') : 'none'}`);
    console.log(`  kept-list features the source does not have (never used): ${r.absentFeatures.join(' ') || 'none'}`);
  }
  const total = report.reduce((s, r) => s + r.size, 0);
  console.log(`\nTotal: ${total} bytes (${kb(total)})`);

  writeFileSync(join(OUT, 'FONTS.md'), fontsMd({ report, licences, copyrights, zip, total }));
  console.log(`Wrote ${OUT}`);
}

// ---------------------------------------------------------------------------------------------------------------------
// FONTS.md: generated, so it cannot drift from what the script did.

function fontsMd({ report, licences, copyrights, zip, total }) {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'node_modules', 'subset-font', 'package.json'), 'utf8'));
  const hb = JSON.parse(readFileSync(join(ROOT, 'node_modules', 'harfbuzzjs', 'package.json'), 'utf8'));
  const byKey = Object.fromEntries(report.map((r) => [r.face.key, r]));
  const L = [];
  L.push('# Embedded typefaces', '');
  L.push('> **In short.** The static material pages embed three variable typefaces, subset to Latin plus the symbols the pages use, as WOFF2: Inter (sans) and Newsreader roman and italic (serif). All are under the SIL Open Font License 1.1 with no Reserved Font Name. This file is written by `scripts/pages/subset-fonts.mjs`; do not edit it by hand.', '');
  L.push('## Sources', '');
  L.push('| Face | Version | Source | Input file | Input SHA-256 |', '| --- | --- | --- | --- | --- |');
  L.push(`| Inter | 4.1 | \`${INTER_ZIP.url}\` (zip SHA-256 \`${zip.sha256}\`) | \`InterVariable.ttf\` | \`${byKey.inter.src.sha256}\` |`);
  L.push(`| Newsreader roman | google/fonts \`main\`, \`ofl/newsreader/\` (pinned here by hash, not by commit) | \`${NEWSREADER[0].url}\` | \`${NEWSREADER[0].file}\` | \`${byKey['newsreader-roman'].src.sha256}\` |`);
  L.push(`| Newsreader italic | as above | \`${NEWSREADER[1].url}\` | \`${NEWSREADER[1].file}\` | \`${byKey['newsreader-italic'].src.sha256}\` |`);
  L.push('', '| Licence file | Taken from | SHA-256 | Copyright line |', '| --- | --- | --- | --- |');
  L.push(`| \`Inter-OFL.txt\` | \`LICENSE.txt\` in the Inter 4.1 zip | \`${licences['Inter-OFL.txt'].sha256}\` | ${copyrights['Inter-OFL.txt']} |`);
  L.push(`| \`Newsreader-OFL.txt\` | \`${NEWSREADER[2].url}\` | \`${licences['Newsreader-OFL.txt'].sha256}\` | ${copyrights['Newsreader-OFL.txt']} |`);
  L.push('', '## Outputs', '');
  L.push('| File | Bytes | SHA-256 | Axes kept (of the source’s) |', '| --- | ---: | --- | --- |');
  for (const r of report) {
    const axes = r.axes.map((a) => {
      const s = r.srcAxes.find((x) => x.tag === a.tag);
      return `${a.tag} ${a.min}–${a.max} (source ${s.min}–${s.max})`;
    });
    L.push(`| \`${r.face.out}\` | ${r.size} | \`${r.sha256}\` | ${axes.join('; ')} |`);
  }
  L.push(`| Total | ${total} | | |`);
  L.push('', 'The sizes and hashes depend on the subsetting tool’s release: the script is pinned to `subset-font` ' + `${pkg.version} (through \`harfbuzzjs\` ${hb.version}, a WebAssembly build of HarfBuzz), exact in the root \`package.json\` and \`package-lock.json\`. A new release of the tool can change an output's hash with no change in what it draws.`);
  L.push('', '## Code points', '');
  L.push(`${REQUESTED.length} code points asked for in every face: ${RANGES.map(rangeLabel).join(', ')}.`, '');
  for (const r of report) {
    L.push(`- ${r.face.label}: the source lacks ${r.missing.length ? r.missing.map((c) => `U+${hex(c)}`).join(', ') : 'none of them'}${r.missing.length ? '; those fall back to the next font in the page’s stack' : ''}.`);
  }
  L.push('', 'U+2060 (word joiner) and U+00AD (soft hyphen) are default-ignorable: a browser draws nothing for them whether or not the font maps them, so their absence from a face costs nothing. The other code points a face lacks are drawn by the next font in the stack, so the stack (Inter first for symbols, arrows, sub- and superscripts, \u2605, \u2713 and \u2717, which Newsreader does not have) decides how they look.');
  L.push('', '## Layout features', '');
  L.push(`Kept (\`keepFeatures\`): ${KEEP_FEATURES.map((f) => `\`${f}\``).join(', ')}. Named by the pages: ${FEATURES_ASKED.map((f) => `\`${f}\``).join(', ')}. Kept so the faces draw as designed: ${FEATURES_RENDERING.map((f) => `\`${f}\``).join(', ')} (accent composition and positioning, Inter’s contextual alternates, proportional figures, Newsreader’s optical-size substitutions).`, '');
  for (const r of report) {
    L.push(`- ${r.face.label}: features present in the output: ${r.keptFeatures.map((f) => `\`${f}\``).join(' ')}. Kept-list features the source does not have: ${r.absentFeatures.length ? r.absentFeatures.map((f) => `\`${f}\``).join(' ') : 'none'}.`);
  }
  L.push('', 'Left out: Inter’s stylistic sets and character variants (`ss01`–`ss08`, `cv01`–`cv11`), which would add about 13 KB to the Inter subset. Where a face lacks a feature the pages name (Inter has no `liga`; neither family has `lnum`), the `font-feature-settings` or `font-variant-numeric` request does nothing and is harmless.');
  L.push('', '## Regenerate', '', '```bash', 'npm install            # subset-font is a devDependency of the root package', 'node scripts/pages/subset-fonts.mjs', '```', '');
  L.push('The script downloads into new directories under `.cache/fonts/` (ignored by git), stops if any download’s SHA-256 differs from the constants in the script or if a licence is not OFL 1.1 or declares a Reserved Font Name, then subsets, re-reads each output, and rewrites everything in this folder.');
  L.push('', '## Licence', '');
  L.push('All three faces are licensed under the SIL Open Font License, Version 1.1 (<https://openfontlicense.org>). Neither licence header declares a Reserved Font Name, so the subset may keep the families’ own names. The licence grants permission to use, study, copy, merge, embed, modify and redistribute the fonts, alone or inside other software, provided that:');
  L.push('', '- the copyright notice and the licence text travel with every copy: `Inter-OFL.txt` and `Newsreader-OFL.txt` sit beside the subsets, and each subset keeps its own copyright notice (name ID 0), licence description (13) and licence URL (14) in its `name` table;', '- the fonts are not sold on their own: they are embedded in pages that are the product;', '- a modified version is itself released under the OFL: a subset with a narrowed axis range is a modified version, and these files stay under the same licence, as this file says;', '- no Reserved Font Name is used in a modified version: none is declared.');
  L.push('', 'Embedding in a document is expressly within the licence: the OFL FAQ treats embedding a font in a web page or document as use, not as redistribution of the font as a product.', '');
  return L.join('\n');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
