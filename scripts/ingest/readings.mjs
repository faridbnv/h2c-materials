#!/usr/bin/env node
// Reading an identity a product's name does not give.
//
// R075, R077 and R083 each say the same thing: the sheet answers what its name does not, the reading is the
// pipeline's to do, and the list goes to the owner before any of it is written. This is that reading. It writes
// `readings/readings.csv`, one row per document with the evidence it was read from, and READINGS.md beside it.
//
//   npm run ingest:readings                 every document the three rulings cover
//   npm run ingest:readings -- --class R075
//
// Nothing here writes data. A row's Verdict column is empty until the owner fills it, and a batch reads the
// verdicts, not the readings: what the pipeline proposes and what the owner allows are two different columns on
// purpose, because a reading nobody checked is a guess with a citation.
//
// Three strengths of reading, and the difference between them is not a number:
//
//   said      a line of the sheet names one polymer, and the line is quoted
//   named     the product's own name carries a polymer alias with a word stuck to the front of it: easyPETG,
//             ecoPLA, mattePLA, ePC, CosPLA. The maker is naming the polymer; only the tokeniser cannot see it,
//             because splitting every token at every alias makes a nylon out of "pack"
//   narrowed  the sheet names neither, but its own density and melting point admit exactly one row of polymers.csv
//   unread    none of those, and the evidence is listed so the owner decides rather than confirms
//
// A narrowed reading is never silently promoted to a said one. D44 says a family owns no product, and a number
// that admits one polymer is still not the maker saying so. Nor is `named` a reader rule by the back door: seven
// documents carry such a name, which is below the twenty the plan sets for changing the reader, so the reading is
// put to the owner here instead of entering by itself.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readCsv, csvText } from '../../build/src/csv.js';
import { projectRoot } from '../data/table-io.mjs';
import { tokenise } from './classify.mjs';
import { productName } from './propose.mjs';
import { IMPLAUSIBLE_DENSITY } from './propose.mjs';
import { cachedText } from '../lib/pdf-text.mjs';

const AUDIT = join(projectRoot, 'docs/audits/2026-09-18-v2-import');
const PROPOSALS = join(AUDIT, 'proposals');
const OUT = join(AUDIT, 'readings');
const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 && !String(process.argv[i + 1] ?? '--').startsWith('--') ? process.argv[i + 1] : null; };

const table = (name) => readCsv(join(projectRoot, 'data/tables', `${name}.csv`)).records.map((r) => r.values);
const lexicon = (name) => readCsv(join(projectRoot, 'scripts/ingest/lexicon', `${name}.csv`)).records.map((r) => r.values);

/**
 * Which of the three rulings a held document falls under, read from the reason the reader wrote when it held it.
 * The reason is the reader's own words, so this maps what it said rather than re-deciding it: a document whose
 * hold says "no base polymer in" is R075's by construction, and nothing here can move it to another ruling.
 */
export const RULING_OF = [
  ['R075', /no base polymer in/, 'the name says no polymer'],
  ['R077', /names a family, not a polymer/, 'the name says only a family'],
  ['R083', /no material is not a material|would create the material|would be a second (PEI-CF|PEKK-CF)|says copolymer beside/, 'a polymer and filler no material holds'],
];
export const rulingOf = (note) => RULING_OF.find(([, re]) => re.test(String(note ?? '')))?.[0] ?? null;

// The lines a sheet uses to say what it is made of. A sheet says its chemistry in one of a few places and nowhere
// else: a composition row, a "based on" sentence, a polymer-base label, a resin trade name. Reading every line
// instead filed eight colorFabb products under ASA because a legal footer says "provided as a guidance" (the
// comment in classify.mjs records that one), so the window is the label and not the page.
const SAYS_WHAT_IT_IS = /\b(base polymer|polymer base|base (?:material|resin)|composition|chemical (?:base|composition|name)|made (?:of|from)|based on|consists? of|raw material|resin type|material type|polymer type|matrix)\b/i;

// Some sheets arrive with their spaces gone — "Facilan™C8isthefirstproductofourFacilan™family" is one line of
// one — because the PDF positions every glyph itself and the extractor has no word to join them into. Tokenising
// that finds nothing, so a line with almost no spaces is searched for an alias as a substring instead. The test
// is the line's own shape and not the maker's name, because the next sheet that does it will be somebody else's.
const runTogether = (text) => text.length > 24 && (text.match(/ /g) ?? []).length < text.length / 24;

// A density no filament reaches is the page misread, not a heavy filler, and six sheets in the ruling queue
// carry one. Such a number narrows nothing here and declares no Variant there (R078), so both read the same
// threshold from the one place it is written down.

// A number a sheet prints about itself that a polymer row can be checked against. Nothing else narrows an
// identity: a tensile strength varies more between two grades of one polymer than between two polymers.
const FINGERPRINT = {
  density: /^density$/i,
  melting: /melting (point|temperature)/i,
  glass: /glass transition/i,
  vicat: /vicat/i,
  hdt: /heat deflection|deflection temperature/i,
};

/** Every proposal on disk, newest folder per document. */
function everyProposal() {
  const out = new Map();
  for (const dir of readdirSync(PROPOSALS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
    for (const file of readdirSync(join(PROPOSALS, dir)).filter((f) => f.endsWith('.json'))) {
      const proposal = JSON.parse(readFileSync(join(PROPOSALS, dir, file), 'utf8'));
      if (proposal.document?.docKey) out.set(proposal.document.docKey, proposal);
    }
  }
  return out;
}

/** The numbers a proposal read, by the five that bear on an identity, in the unit the polymer row uses. */
function fingerprint(proposal) {
  const out = {};
  for (const m of proposal.measurements ?? []) {
    const property = String(m.row?.Property ?? '');
    for (const [key, re] of Object.entries(FINGERPRINT)) {
      if (!re.test(property) || out[key] !== undefined) continue;
      const value = Number(m.row?.['Normalized value']);
      if (Number.isFinite(value)) out[key] = { value, unit: String(m.row?.['Normalized unit'] ?? ''), raw: String(m.row?.['Raw value'] ?? '') };
    }
  }
  return out;
}

/**
 * What the sheet's own lines say the product is made of, as { polymer, line } for each line that names exactly
 * one. A line naming two has not settled anything — a blend is R082's, not this one's — and is reported as it
 * stands so the owner sees what the reader saw.
 */
/**
 * Every line of the document, from the hashed text the fetch cached. The reader's own `skipped` list is about
 * half of it — it holds the lines it recognised as statements and could not file, not the lines it never looked
 * at — and an identity is as often in a title or a marketing paragraph as in a statement. Nothing is read from
 * the proposal that the document itself can be asked for (D35).
 */
function linesOf(sha, proposal) {
  const cached = sha ? cachedText(sha) : null;
  if (cached) return (cached.pages ?? []).flatMap((page) => (page.lines ?? []).map((l) => String(l.text ?? '')));
  return (proposal?.skipped ?? []).map((s) => String(s.text ?? ''));
}

function saidLines(lines, polymerOf, aliases) {
  const said = [];
  for (const text of lines) {
    if (!SAYS_WHAT_IT_IS.test(text) || text.length > 200) continue;
    const named = runTogether(text)
      ? [...new Set(aliases.filter((a) => new RegExp(`(?<![a-z0-9])${a.Token}(?![a-z0-9])`, 'i').test(text)).map((a) => a.Polymer))]
      : [...new Set(tokenise(text).map((t) => polymerOf.get(t)).filter(Boolean))];
    if (named.length) said.push({ named, line: text.trim() });
  }
  return said;
}

/**
 * Every polymer a sheet prints anywhere, whatever the line was about. This never becomes a reading — a legal
 * footer and a bed-adhesive row both name polymers that are not the filament, which is the trap classify.mjs's
 * own comments record twice — but an owner deciding an identity wants to know that the word appears at all.
 */
function polymerWords(lines, polymerOf, aliases) {
  const seen = new Map();
  for (const text of lines) {
    const named = runTogether(text)
      ? aliases.filter((a) => new RegExp(`(?<![a-z0-9])${a.Token}(?![a-z0-9])`, 'i').test(text)).map((a) => a.Polymer)
      : tokenise(text).map((t) => polymerOf.get(t)).filter(Boolean);
    for (const p of named) seen.set(p, (seen.get(p) ?? 0) + 1);
  }
  return seen;
}

/**
 * What a maker's own URL says a product is. `/colorfabb/ngen-red` is colorFabb saying the sheet it hosts under
 * "AmphoraAM3300" is its nGen; a shop's product path is the shop's own claim about what it is selling, and as
 * public as the sheet. Only the path is read, never the host or the query.
 */
export function fromTheUrl(row, aliases, known) {
  const paths = [row.source_page_url, row.url].filter(Boolean).map((u) => { try { return new URL(u).pathname; } catch { return ''; } });
  const seen = new Map();
  for (const path of paths) {
    for (const token of path.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)) {
      const alias = known.has(token) ? aliases.find((a) => a.Token === token) : null;
      if (alias?.Polymer) seen.set(alias.Polymer, (seen.get(alias.Polymer) ?? 0) + 1);
    }
  }
  return seen;
}

/**
 * A polymer alias the product's own name carries with a word stuck to the front: easyPETG, ecoPLA, ePC, rPET.
 * Only where the whole token is not itself something the lexicon knows — "tpe" ends in "pe" and is a family word
 * in its own right, and reading it as a polyethylene would be worse than not reading it at all.
 */
export function gluedToTheName(name, aliases, known) {
  for (const token of String(name).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)) {
    if (known.has(token)) continue;
    const alias = aliases.find((a) => a.Token.length >= 2 && token.endsWith(a.Token) && token.length > a.Token.length);
    if (alias) return { polymer: alias.Polymer, token, alias: alias.Token };
  }
  return null;
}

/**
 * The polymers whose row admits this sheet's numbers. A neat density window is the polymer unfilled, so a sheet
 * above its window carries a filler (D57, and R078's question) and a sheet below it is foamed; neither is read
 * here, because this asks which polymer a name did not give and not what was put in it.
 *
 * A melting point is the harder test and is used as one: an amorphous polymer prints no melting point at all, so
 * a sheet that prints one rules every amorphous row out.
 */
export function admits(fp, polymers) {
  const out = [];
  for (const p of polymers) {
    const lo = Number(p['Neat density min kg/m³']), hi = Number(p['Neat density max kg/m³']);
    const tm = Number(p['Melting point °C']);
    const why = [];
    if (fp.density && fp.density.value < IMPLAUSIBLE_DENSITY && Number.isFinite(lo) && Number.isFinite(hi)) {
      if (fp.density.value < lo || fp.density.value > hi) continue;
      why.push(`density ${fp.density.value} within ${lo}–${hi}`);
    }
    if (fp.melting) {
      if (!Number.isFinite(tm)) continue;                       // amorphous: it prints no melting point
      if (Math.abs(fp.melting.value - tm) > 15) continue;
      why.push(`melts at ${fp.melting.value} against ${tm}`);
    } else if (Number.isFinite(tm) && p.Morphology === 'semicrystalline' && fp.glass) {
      continue;                                                  // it prints a glass transition and no melt
    }
    if (why.length) out.push({ polymer: p.PolymerID, why: why.join(', ') });
  }
  return out;
}

/** What else this maker makes, as the polymers of its grades already applied: a range is evidence, not proof. */
function makersRange(grades, materials) {
  const polymerOf = new Map(materials.map((m) => [m.MaterialID, m['Base polymer']]));
  const range = new Map();
  for (const g of grades) {
    const key = String(g.Manufacturer ?? '').toLowerCase();
    if (!key) continue;
    if (!range.has(key)) range.set(key, new Map());
    const seen = range.get(key), polymer = polymerOf.get(g.MaterialID);
    if (polymer) seen.set(polymer, (seen.get(polymer) ?? 0) + 1);
  }
  return range;
}

// A line about this product that also names one polymer, on the maker's own page. Two kinds of line name the
// product and a polymer and say nothing about what the product is made of: a comparison ("Printing with PRO HT
// vs. PLA, which is better?") and a shop's menu or breadcrumb ("Home Flex FiberFlex+CF … S2 HIPS …"), which
// lists everything beside it. Both took three products to the wrong polymer before they were refused here.
const A_CONTRAST = /\b(vs\.?|versus|compared (?:to|with)|than|unlike|instead of|rather than|alternative to|or)\b/i;
const A_MENU = /^\s*(?:home|accueil|start(?:seite)?|inicio)\b|\b(?:sale|deals?|% off|add to (?:cart|basket)|categories|all filaments|shop all)\b|\u2013.*\u2013.*\u2013/i;
export function witnessReading(lines, ownName, polymerOf) {
  if (!ownName || ownName.length < 3) return null;
  // The name as the page may print it — with any punctuation or spacing between its characters — and not run on
  // into a longer product's name: BigRep's "HI-TEMP CF" begins with its "HI-TEMP", and a line about the first is
  // not about the second. A filler or variant word straight after the name is the longer product.
  const namePattern = new RegExp(`${[...ownName].map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^a-z0-9]*')}(?![a-z0-9])(?![^a-z0-9]{0,2}(?:cf|gf|af|hs|lw|pro|plus|max|lite|\\+)(?![a-z0-9]))`, 'i');
  // The polymer has to stand in the same clause as the name. "PLA is somewhat stronger, while PRO HT is less
  // brittle" names both in one sentence and says the two are different things.
  const clauses = (l) => String(l).split(/[,;.!?]|\b(?:while|whereas|but|although)\b/i);
  const about = [];
  for (const l of lines) {
    if (l.length > 300 || A_MENU.test(l) || A_CONTRAST.test(l)) continue;
    const clause = clauses(l).find((c) => namePattern.test(c));
    if (clause) about.push({ line: l, clause });
  }
  const named = [...new Set(about.flatMap((a) => tokenise(a.clause).map((t) => polymerOf.get(t)).filter(Boolean)))];
  if (named.length !== 1) return null;
  return { polymer: named[0], line: about.find((a) => tokenise(a.clause).some((t) => polymerOf.get(t) === named[0])).line };
}

export function readings(only = null) {
  const ledger = readCsv(join(AUDIT, 'ledger.csv')).records.map((r) => r.values);
  const polymers = table('polymers'), materials = table('materials'), grades = table('grades');
  const held = new Set(polymers.map((p) => p.PolymerID));
  const polymerAliases = lexicon('polymer-aliases').filter((p) => p.Polymer);
  const byLength = [...polymerAliases].sort((a, b) => b.Token.length - a.Token.length);
  const knownTokens = new Set(lexicon('polymer-aliases').map((p) => p.Token));
  const polymerOf = new Map(polymerAliases.map((p) => [p.Token, p.Polymer]));
  const modifierOf = new Map(lexicon('modifier-aliases').filter((m) => m.Modifier).map((m) => [m.Token, m.Modifier]));
  const range = makersRange(grades, materials);
  const proposals = everyProposal();
  const identities = new Set(materials.map((m) => `${m['Base polymer']} / ${m['Modifier / filler']}`));

  const rows = [];
  for (const row of ledger) {
    if (row.status !== 'held') continue;
    const ruling = rulingOf(row.status_note);
    if (!ruling || (only && ruling !== only)) continue;
    const proposal = proposals.get(row.doc_key);
    const fp = proposal ? fingerprint(proposal) : {};
    const lines = linesOf(row.sha256, proposal);
    const said = saidLines(lines, polymerOf, byLength);
    const printed = polymerWords(lines, polymerOf, byLength);
    const urlSays = fromTheUrl(row, byLength, knownTokens);
    // The second witness: the maker's own product page, fetched and hashed (ingest:witness), read with the same
    // rules as the sheet. A composition line on it, or a polymer glued into its own title, is the maker naming the
    // polymer on a page it wrote about this product; a polymer word anywhere else on it is not, because a shop
    // page names everything it sells.
    // Fetched, the pages turned out to be mostly the makers' datasheet indexes and shop listings, not product
    // pages: 33 of 72 titles name the product at all, and a "based on" sentence on such a page is about whatever
    // product the sentence is beside — BigRep's index said "BigRep PLA is a bioplastic based on …" under four
    // products that are not PLA. So the witness is read only where a line names this product, by the name the
    // sheet gives it, and that line names exactly one polymer. Anything else on the page is about something else.
    // A product may have several witnesses — the page the ledger named and a document a search found (R089) — and
    // the first that names the product beside one polymer is the one that speaks.
    const squash = (t) => String(t ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    const ownName = squash([row.manufacturer, row.provider, row.brand].filter(Boolean).reduce((n, who) => productName(n, who), row.product_raw ?? ''));
    let witness = null, fromWitness = null;
    for (const w of ledger.filter((x) => x.duplicate_kind === 'product-page' && x.duplicate_of === row.doc_key && x.sha256)) {
      const t = cachedText(w.sha256);
      const r = t ? witnessReading([String(t.title ?? ''), ...(t.pages ?? []).flatMap((p) => (p.lines ?? []).map((l) => String(l.text ?? '')))], ownName, polymerOf) : null;
      if (r) { witness = w; fromWitness = r; break; }
    }
    const witnessNamed = fromWitness ? [fromWitness.polymer] : [];
    const witnessLine = fromWitness?.line ?? null;
    const name = row.product_raw || row.doc_key;
    const glued = gluedToTheName(`${row.brand ?? ''} ${name}`, byLength, knownTokens);
    const tokens = tokenise(`${row.brand ?? ''} ${name}`);
    const filler = [...new Set(tokens.map((t) => modifierOf.get(t)).filter(Boolean))];

    // The sheet saying it outright beats everything else, and a sheet that says two things has said nothing.
    const outright = [...new Set(said.flatMap((s) => (s.named.length === 1 ? s.named : [])))];
    const narrowed = admits(fp, polymers);
    const mine = range.get(String(row.brand ?? '').toLowerCase()) ?? range.get(String(row.provider ?? '').toLowerCase()) ?? new Map();
    const preferred = narrowed.filter((n) => mine.has(n.polymer));

    let reading = '', strength = 'unread', why = '';
    if (outright.length === 1) {
      reading = outright[0]; strength = 'said';
      why = `the sheet says so: "${said.find((s) => s.named[0] === outright[0]).line}"`;
    } else if (glued) {
      reading = glued.polymer; strength = 'named';
      why = `the product's own name says it: "${glued.token}" is "${glued.alias}" with a word in front of it`;
    } else if (witnessLine) {
      reading = witnessNamed[0]; strength = 'said (product page)';
      why = `the maker's page names this product and one polymer on one line: "${witnessLine.trim().slice(0, 160)}" (${witness.doc_key}, sha ${witness.sha256.slice(0, 12)})`;
    } else if (urlSays.size === 1) {
      reading = [...urlSays.keys()][0]; strength = 'named';
      // The link that named it, and whose it is: a shop's link is a pointer to the maker's words, never the
      // maker's words (R089), so it is called what it is and the verdict is read with that in mind.
      const link = [row.source_page_url, row.url].filter(Boolean).find((u) => fromTheUrl({ url: u }, byLength, knownTokens).has(reading));
      // The maker's where the link or the page that lists it is on a host carrying the maker's name: a maker's
      // own shop serves its files from a CDN (cdn.shopify.com) that its own page links to.
      const host = (u) => { try { return new URL(u).hostname.toLowerCase().replace(/[^a-z0-9]/g, ''); } catch { return ''; } };
      const makers = [row.brand, row.manufacturer].flatMap((w) => String(w ?? '').toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 3));
      const theirs = [link, row.source_page_url].some((u) => makers.some((m) => host(u).includes(m)));
      why = theirs ? `the maker's own link for it names it: ${link}` : `a link it was found under names it, and the link is not the maker's: ${link}`;
    } else if (narrowed.length === 1) {
      reading = narrowed[0].polymer; strength = 'narrowed'; why = `its own numbers admit one polymer: ${narrowed[0].why}`;
    } else if (preferred.length === 1) {
      reading = preferred[0].polymer; strength = 'narrowed';
      why = `its own numbers admit ${narrowed.length} polymers and this maker makes one of them: ${preferred[0].why}`;
    } else {
      const evidence = [
        outright.length > 1 ? `the sheet names ${outright.join(' and ')}` : '',
        urlSays.size ? `the maker's page names ${[...urlSays.keys()].join(' and ')}` : '',
        printed.size ? `polymers the page prints somewhere: ${[...printed].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([p, n]) => `${p}×${n}`).join(', ')}` : '',
        narrowed.length ? `its numbers admit ${narrowed.map((n) => n.polymer).join(', ')}` : '',
        Object.entries(fp).map(([k, v]) => `${k} ${v.raw}`).join('; '),
        fp.density && fp.density.value >= IMPLAUSIBLE_DENSITY ? `**its density reads ${fp.density.value} kg/m³, which no filament reaches: the page is misread**` : '',
        mine.size ? `this maker's range: ${[...mine].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([p, n]) => `${p}×${n}`).join(', ')}` : '',
      ].filter(Boolean);
      why = evidence.join(' — ') || 'the sheet publishes no number and names no polymer this reader can map';
    }

    // A proposal that already carries the material it would create has read the sheet; what waits is permission,
    // not a reading. So the row says what would be made rather than guessing at it again.
    if (ruling === 'R083' && proposal?.newMaterial) {
      reading = proposal.identity?.polymer ?? reading;
      strength = 'said';
      why = `the sheet declares ${proposal.identity?.polymer} and ${proposal.identity?.modifier}, and no material holds that pair; ${proposal.identity?.signals?.[0] ?? 'read from the name and the sheet'}`;
    }
    const identity = reading ? `${reading} / ${filler[0] ?? 'Unfilled / unspecified'}` : '';
    rows.push({
      Ruling: ruling,
      'Doc key': row.doc_key,
      Provider: row.provider,
      Brand: row.brand || row.provider,
      Product: name,
      Reading: reading || 'Not read',
      'Filler the name declares': filler.join(', ') || 'Unfilled / unspecified',
      'Material it would join': proposal?.newMaterial ? `${proposal.newMaterial['Original name']} (new material)`
        : identity && identities.has(identity) ? identity : identity ? `${identity} (new)` : 'Not read',
      'Polymer has a row': reading ? (held.has(reading) ? 'yes' : 'no — R081') : 'Not read',
      Strength: strength,
      Evidence: why,
      Verdict: '',
      URL: row.url,
    });
  }
  return rows;
}

/**
 * The owner's verdicts, written as rulings. A verdict is one word in readings.csv: `yes` takes the reading, a
 * polymer's ID corrects it, `no` strikes it. Each `yes` or polymer becomes a row of rulings.csv the reader applies
 * like every other ruling: Kind `identity` for a product whose name says no polymer or only a family (R075, R077),
 * naming the product as the catalogue lists it; Kind `new-material` where the sheet declares a pair no material
 * holds (R083), which is the permission apply.mjs asks for before it creates one. A verdict that corrects an R083
 * reading is an identity ruling first — the proposal is re-read under it, and the material it then names comes
 * back here for its own permission. Nothing is written for `no`, for a polymer with no row (R081 writes the row
 * first), or for a subject the register already rules on; a verdict that disagrees with the register is reported
 * and left to the owner, because two rulings on one product would be a contradiction the reader cannot apply.
 */
export function rulingsFromVerdicts(rows, rulings, polymers, { by = 'farid', date = new Date().toISOString().slice(0, 10) } = {}) {
  const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9/+]+/g, ' ').trim();
  const have = new Map(rulings.map((r) => [`${r.Kind}|${norm(r.Subject)}`, r]));
  const held = new Set(polymers.map((p) => p.PolymerID));
  let next = Math.max(0, ...rulings.map((r) => Number(String(r.Ruling).replace(/\D/g, '')) || 0)) + 1;
  const out = { written: [], refused: [], struck: [], already: [] };
  for (const r of rows) {
    const said = String(r.Verdict ?? '').trim();
    if (!said) continue;
    if (/^no$/i.test(said)) { out.struck.push(r); continue; }
    const polymer = /^yes$/i.test(said) ? r.Reading : said;
    if (!polymer || polymer === 'Not read') { out.refused.push({ row: r, why: 'the reading is empty: a verdict of yes takes nothing, so name the polymer' }); continue; }
    if (!held.has(polymer)) { out.refused.push({ row: r, why: `"${polymer}" has no row in polymers.csv (R081: the row is written from a producer's reference first)` }); continue; }
    const creates = /\(new material\)$/.test(r['Material it would join'] ?? '');
    const kind = r.Ruling === 'R083' && creates && polymer === r.Reading ? 'new-material' : 'identity';
    const subject = kind === 'new-material' ? r['Material it would join'].replace(' (new material)', '') : r.Product;
    const modifier = /the sheet declares \S+ and (.+?), and no material holds/.exec(r.Evidence ?? '')?.[1] ?? r['Filler the name declares'];
    const value = kind === 'new-material' ? `${polymer} × ${modifier}` : polymer;
    const prior = have.get(`${kind}|${norm(subject)}`);
    if (prior && prior.Value !== value) { out.refused.push({ row: r, why: `${prior.Ruling} already rules ${subject} as "${prior.Value}"; the verdict says "${value}"` }); continue; }
    if (prior) { out.already.push({ row: r, ruling: prior.Ruling }); continue; }
    const how = /^yes$/i.test(said) ? `the reading stands` : `read as ${r.Reading}, and the owner says ${polymer}`;
    const row = {
      Ruling: `R${String(next++).padStart(3, '0')}`, Kind: kind, Subject: subject, Value: value,
      Reason: `Owner verdict on readings/readings.csv (${r.Provider} ${r.Product}, ${r.Ruling}): ${how}. ${String(r.Evidence ?? '').slice(0, 320)}`,
      By: by, Date: date,
    };
    have.set(`${kind}|${norm(subject)}`, row);
    out.written.push(row);
  }
  return out;
}

const HEADER = ['Ruling', 'Doc key', 'Provider', 'Brand', 'Product', 'Reading', 'Filler the name declares',
  'Material it would join', 'Polymer has a row', 'Strength', 'Evidence', 'Verdict', 'URL'];

function document(rows) {
  const by = (key) => { const m = new Map(); for (const r of rows) m.set(r[key], (m.get(r[key]) ?? 0) + 1); return m; };
  const strengths = by('Strength');
  const out = ['# What each sheet says its product is', '',
    `Generated by \`npm run ingest:readings\` on ${new Date().toISOString().slice(0, 10)}. **Nothing here is written until a Verdict says so.**`, '',
    'R075, R077 and R083 each say the sheet answers what the name does not, and that the reading goes to the owner',
    'before any of it becomes data. This is that reading, for', `**${rows.length} documents**:`, '',
    `- **said** — a line of the sheet names one polymer, and the line is quoted: ${strengths.get('said') ?? 0}`,
    `- **named** — the product's own name carries the polymer with a word stuck to the front (easyPETG, ecoPLA, ePC): ${strengths.get('named') ?? 0}`,
    `- **said (product page)** — the sheet names none, and the maker's own product page, fetched and hashed as a second witness, does: ${strengths.get('said (product page)') ?? 0}`,
    `- **narrowed** — the sheet names none, but its own density and melting point admit one row of \`polymers.csv\`: ${strengths.get('narrowed') ?? 0}`,
    `- **unread** — neither, and what the sheet does publish is listed instead: ${strengths.get('unread') ?? 0}`, '',
    'Strike a row by writing `no` in its Verdict; correct one by writing the polymer it should be. A row left empty',
    'stays held, which is the same as striking it but says nobody looked.', '',
    'A verdict becomes a ruling with `npm run ingest:readings -- --rulings`: `yes` and a polymer name each write a row of',
    '`rulings/rulings.csv` that the reader applies on the next `ingest:batch -- --propose`; `no` writes nothing, and the',
    'document stays held under its ruling with the strike noted.', ''];

  for (const [id, , what] of RULING_OF) {
    const mine = rows.filter((r) => r.Ruling === id);
    if (!mine.length) continue;
    out.push(`## ${id}: ${what}`, '', `${mine.length} document(s).`, '');
    for (const strength of ['said', 'named', 'said (product page)', 'narrowed', 'unread']) {
      const set = mine.filter((r) => r.Strength === strength);
      if (!set.length) continue;
      out.push(`### ${strength} — ${set.length}`, '', '| Product | Maker | Reading | It would join | Read from |', '|---|---|---|---|---|');
      for (const r of set) out.push(`| ${r.Product} | ${r.Brand} | ${r.Reading} | ${r['Material it would join']} | ${String(r.Evidence).replace(/\|/g, '/').slice(0, 200)} |`);
      out.push('');
    }
  }
  const made = new Map();
  for (const r of rows.filter((x) => /\(new material\)$/.test(x['Material it would join']))) {
    const name = r['Material it would join'].replace(' (new material)', '');
    if (!made.has(name)) made.set(name, []);
    made.get(name).push(r);
  }
  if (made.size) {
    out.push('## The materials this would create', '',
      `R083 says the material is created where the sheet declares both, and that this list goes to the owner`,
      `before any of it is written. **${made.size} material(s)** across ${[...made.values()].reduce((a, b) => a + b.length, 0)} document(s):`, '',
      '| Material | Documents | Read from |', '|---|---|---|');
    for (const [name, mine] of [...made].sort((a, b) => b[1].length - a[1].length)) {
      out.push(`| **${name}** | ${mine.map((r) => `${r.Brand} ${r.Product}`).join('; ')} | ${String(mine[0].Evidence).replace(/\|/g, '/').slice(0, 150)} |`);
    }
    out.push('');
  }

  const missing = rows.filter((r) => r['Polymer has a row'] === 'no — R081');
  if (missing.length) {
    out.push('## Polymers these readings need and `polymers.csv` does not hold', '',
      ...[...new Set(missing.map((r) => r.Reading))].map((p) => `- **${p}** — ${missing.filter((r) => r.Reading === p).length} document(s); R081 says the row is written from a producer's reference first`), '');
  }
  return out.join('\n');
}

if (process.argv[1]?.endsWith('readings.mjs') && process.argv.includes('--rulings')) {
  const rows = readCsv(join(OUT, 'readings.csv')).records.map((r) => r.values);
  const rulingsPath = join(AUDIT, 'rulings/rulings.csv');
  const rulings = readCsv(rulingsPath).records.map((r) => r.values);
  const result = rulingsFromVerdicts(rows, rulings, table('polymers'), { by: arg('by') ?? 'farid' });
  if (result.written.length) writeFileSync(rulingsPath, csvText(Object.keys(rulings[0]), [...rulings, ...result.written]));
  console.log(`${rows.filter((r) => String(r.Verdict ?? '').trim()).length} verdict(s): ${result.written.length} ruling(s) written, ${result.already.length} already on the register, ${result.struck.length} struck, ${result.refused.length} refused`);
  for (const r of result.written) console.log(`  ${r.Ruling}  ${r.Kind.padEnd(12)} ${r.Subject} -> ${r.Value}`);
  for (const { row, why } of result.refused) console.log(`  ?  ${row.Provider} ${row.Product}: ${why}`);
  if (result.written.length) console.log('next: npm run ingest:batch -- --propose --held ruling');
} else if (process.argv[1]?.endsWith('readings.mjs')) {
  const rows = readings(arg('class'));
  mkdirSync(OUT, { recursive: true });
  const path = join(OUT, 'readings.csv');
  // A verdict already given is the owner's and is never overwritten by a re-run: the reading is re-derived, the
  // answer is kept. Without this, regenerating the list to add a maker would silently unanswer every row.
  if (existsSync(path)) {
    const kept = new Map(readCsv(path).records.map((r) => [r.values['Doc key'], r.values.Verdict]));
    for (const r of rows) r.Verdict = kept.get(r['Doc key']) || '';
  }
  writeFileSync(path, csvText(HEADER, rows));
  writeFileSync(join(AUDIT, 'READINGS.md'), document(rows));
  const answered = rows.filter((r) => r.Verdict).length;
  console.log(`${rows.length} document(s) read -> readings/readings.csv and READINGS.md${answered ? `, ${answered} already answered` : ''}`);
  for (const [id] of RULING_OF) {
    const mine = rows.filter((r) => r.Ruling === id);
    if (mine.length) console.log(`  ${id}  ${String(mine.length).padStart(3)}   ${['said', 'named', 'said (product page)', 'narrowed', 'unread'].map((s) => `${s} ${mine.filter((r) => r.Strength === s).length}`).join(', ')}`);
  }
}
