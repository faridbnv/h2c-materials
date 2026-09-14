// The mechanical text cleanup of migration m07, as a pure function shared by the migration, the
// transfer ledger and the lint. It removes what PDF and web extraction added, never what a source said:
//
//  - typographic ligatures (ﬁ ﬂ ...) become their letters;
//  - full-width punctuation (，：；（）＜＞～) becomes ASCII, in text with no Chinese or Japanese in it;
//  - an en or em dash between two numbers becomes a hyphen (a range: 20–40 is 20-40);
//  - a short, explicit list of words that extraction ran together is split again;
//  - runs of whitespace, including line breaks, become one space.
//
// Units (℃, ˚C, kJ/㎡), case ("OFF"), the spacing a source used around a range hyphen, and wording stay as
// published. cleanText is idempotent: cleanText(cleanText(x)) === cleanText(x).

const LIGATURES = { 'ﬀ': 'ff', 'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬃ': 'ffi', 'ﬄ': 'ffl', 'ﬅ': 'st', 'ﬆ': 'st' };
const CJK = /[぀-ヿ㐀-䶿一-鿿]/;
const FULLWIDTH = { '，': ', ', '：': ': ', '；': '; ', '（': ' (', '）': ') ', '＜': '<', '＞': '>', '～': '~', '！': '!', '？': '?', '＝': '=', '＋': '+', '％': '%', '、': ', ' };

/** Words PDF extraction ran together, found in the 2026-09-14 transfer verification. Exact phrases only. */
export const PHRASE_FIXES = [
  ['for8 h', 'for 8 h'],
  ['ifthe firstlayer', 'if the first layer'],
  ['ifthe first layer', 'if the first layer'],
  ['BlastDrying', 'Blast Drying'],
  ['Itselfor', 'Itself or'],
  ['Support forPLA', 'Support for PLA'],
  ['R ecommended', 'Recommended'],
];

export function cleanText(text) {
  if (typeof text !== 'string') return text;
  let s = text.replace(/[ﬀ-ﬆ]/g, (c) => LIGATURES[c]);
  if (!CJK.test(s)) s = s.replace(/[，：；（）＜＞～！？＝＋％、]/g, (c) => FULLWIDTH[c]);
  s = s.replace(/(\d\s*)[–—](?=\s*\d)/g, '$1-');
  for (const [from, to] of PHRASE_FIXES) s = s.split(from).join(to);
  return s.replace(/\s+/g, ' ').trim();
}
