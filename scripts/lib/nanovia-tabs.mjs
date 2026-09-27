// Nanovia's product pages print their tensile table in tabs, one per raster, each under its own sentence: "Test
// performed at 1mm/min on 3D printed test specimins at 0°, along with the tension stress.", "... successively at 45° and
// -45° per layer.", "... at 90°, oposite to the tension stress." The cached text keeps the tables and drops the
// sentences, so a migration reads the tabs from the page's own bytes, checked against the digest sources.csv records.
// m155 read them first, with its own copy of this reader; m167 and m168 read them here.

import { existsSync, readFileSync } from 'node:fs';
import { cacheDir, sha256 } from './pdf-text.mjs';

// Entities the pages use, and full-width punctuation in its ASCII form (as m136 and m155 compare text).
const decode = (s) => s.replace(/&#8217;/g, '’').replace(/&#8211;/g, '–').replace(/&#038;|&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&euro;/g, '€');
const plain = (s) => String(s).replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)).replace(/\s+/g, ' ').trim();

/** Each tab's raster, the sentence that states it, and how a reader names it. */
export const RASTER = {
  0: { re: /^Test performed at 1mm\/min on 3D printed test specimins at 0°, along with the tension stress\.$/, tab: '0°', what: 'a 0° raster, along the load' },
  45: { re: /^Test performed at 1mm\/min on 3D printed test specimins successively at 45° and -45° per layer\.$/, tab: '+45° / -45°', what: 'an alternating ±45° raster' },
  90: { re: /^Test performed at 1mm\/min on 3D printed test specimins at 90°, oposite to the tension stress\.$/, tab: '90°', what: 'a 90° raster, across the load' },
};

/** A Nanovia source's page, from its hash-checked bytes; null where this machine holds none. */
export function nanoviaPage(source) {
  const path = cacheDir('sources/by-sha', `${source.SHA256}.html`);
  if (!existsSync(path)) return null;
  const bytes = readFileSync(path);
  if (sha256(bytes) !== source.SHA256) throw new Error(`${source.SourceID}'s cached page does not hash to ${source.SHA256}`);
  return bytes.toString('utf8');
}

/**
 * The tensile tabs of a page: each tab's angle (its id: 0, 45, 90), its sentence, and its rows as printed [label, value,
 * unit, standard]. A malformed cell ("Elongation ultimate strength/td>" on PA Rail's ±45° tab) is read as printed,
 * with the stray "/td" kept on its label.
 */
export function tensileTabs(html) {
  const out = [];
  for (const m of html.matchAll(/<div class="tensile-data" id="tensile-data-(\d+)"[^>]*>([\s\S]*?)<\/div>/g)) {
    const sentence = plain(decode((m[2].match(/<span>([\s\S]*?)<\/span>/) ?? [])[1] ?? ''));
    const rows = [...m[2].matchAll(/<tr><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><\/tr>/g)]
      .map((r) => r.slice(1).map((c) => plain(decode(c.replace(/<[^>]*>/g, '')))));
    for (const r of m[2].matchAll(/<tr><td>([^<]*?)\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><\/tr>/g)) {
      const cells = r.slice(1).map((c) => plain(decode(c)));
      cells[0] = `${cells[0]}/td`;
      rows.push(cells);
    }
    out.push({ angle: Number(m[1]), sentence, rows });
  }
  return out;
}

/** Whether every tab says what its id says: R-NANOVIA-PETG repeats the 0° sentence under all three, and says nothing. */
export const tabsAgree = (tabs) => tabs.length > 0 && tabs.every((x) => RASTER[x.angle]?.re.test(x.sentence));

/** A printed number as the database writes it: "4,0" is 4.0. */
export const printedNumber = (s) => Number(String(s).replace(',', '.'));
