#!/usr/bin/env node
// What a product is: from the words a maker prints on a sheet to the material this database files it under.
//
// The rule the owner set (2026-09-18): a product that matches an existing material becomes a grade under it. A new
// material only where the combination of base polymer, filler and commercial variant class does not exist yet. So
// the classifier's job is to read three things out of a name and a sheet, and then look them up:
//
//   polymer       the base polymer, as a row of polymers.csv (PLA, PA612, PPA ...)
//   modifier      the filler the maker declares (Carbon fibre, Glass fibre, ESD formulation, Foaming, or unfilled)
//   variant class the commercial variant the estimate model has a covariate for (silk, particle-filled)
//
// What it must not do is guess. A name that says only "Nylon" names a family, and a family owns no product (D44);
// a filler with no vocabulary value (aramid, conductive) is a ruling, not a near-enough match. Both come back as
// `needsRuling` with what was seen, and the owner answers once, in rulings.csv, for every sheet that says it.
//
// Confidence is not a probability. It starts at 1 and falls for each thing that had to be inferred rather than
// read, so a batch can be sorted by how much of it needs a person.

import { join } from 'node:path';
import { readCsv } from '../../build/src/csv.js';
import { projectRoot } from '../data/table-io.mjs';

const lexicon = (name) => readCsv(join(projectRoot, 'scripts/ingest/lexicon', `${name}.csv`)).records.map((r) => r.values);

const POLYMERS = lexicon('polymer-aliases');
const MODIFIERS = lexicon('modifier-aliases');
const VARIANTS = lexicon('variant-aliases');
const STOPWORDS = new Set(lexicon('stopwords').map((r) => r.Token));

// Longest token first: "pa612" before "pa6" before "pa", "petg" before "pet", "pc-abs" before "pc". A token that
// names a polymer is read before one that names only a family, so "ESD Nylon 12" is a PA12 and not a question.
const byLength = (rows) => [...rows].sort((a, b) => b.Token.length - a.Token.length);
const POLYMER_ORDER = [...byLength(POLYMERS.filter((p) => p.Polymer)), ...byLength(POLYMERS.filter((p) => !p.Polymer))];
const MODIFIER_ORDER = byLength(MODIFIERS);
const VARIANT_ORDER = byLength(VARIANTS);

const MODIFIER_TOKENS = new Set(MODIFIERS.map((m) => m.Token));
// Every token any lexicon knows. Two words are joined into one only where the join is a name something answers
// to: joining every pair made a polymer out of prose, and "provided as a guidance" filed eight colorFabb
// products under ASA because their legal footer says it.
// The short English words a data sheet's prose is made of. Not stopwords.csv, which says what a product name may
// contain; this says what may be joined to what.
const ENGLISH = new Set(['a', 'an', 'as', 'at', 'be', 'by', 'do', 'for', 'if', 'in', 'is', 'it', 'its', 'no', 'not',
  'of', 'on', 'or', 'so', 'the', 'to', 'up', 'use', 'we', 'you', 'all', 'any', 'are', 'can', 'may', 'per', 'has',
  'was', 'one', 'two', 'out', 'our', 'who', 'why', 'how', 'and', 'but', 'with', 'from', 'this', 'that', 'they',
  'them', 'than', 'then', 'when', 'will', 'good', 'high', 'low', 'more', 'most', 'such', 'a4', 'as3']);

const KNOWN_TOKENS = new Set([...POLYMERS.map((p) => p.Token), ...MODIFIERS.map((m) => m.Token), ...VARIANTS.map((v) => v.Token)]);

/**
 * A product name as tokens: lower case, split on anything that is not a letter or digit, brand words dropped, and
 * then two things makers do that a plain split loses.
 *
 * They run the polymer and the filler together ("ABSGF", "asax", "PETGCF"), so a token that starts with a polymer
 * alias is also read as that alias plus the rest, but only where the rest is a filler the vocabulary knows, a
 * single letter or a number. Without that guard "pack" reads as a nylon.
 *
 * And they write a nylon as a name and a number ("Nylon 12", "Nylon 6/6"), so those pairs are joined back up.
 */
export function tokenise(text) {
  const plain = String(text ?? '').normalize('NFKC').toLowerCase()
    .replace(/([a-z])[-/]([a-z])/g, '$1-$2')
    .split(/[^a-z0-9+.-]+/).filter(Boolean)
    .flatMap((t) => (t.includes('-') && !POLYMERS.some((p) => p.Token === t) ? [t, ...t.split('-')] : [t]))
    // A plus joins a polymer to its filler and nothing else: "PA12+GF15", "PETG+CF", "PA6+CF". Left joined, the
    // whole of it matched nothing and Fiberlogy's "Nylon PA12+GF15" read as the family word in front of it.
    .flatMap((t) => (t.includes('+') && !POLYMERS.some((p) => p.Token === t) ? [t, ...t.split('+')] : [t]))
    .filter(Boolean);

  const out = [];
  for (let i = 0; i < plain.length; i++) {
    const token = plain[i];
    out.push(token);
    // A nylon is written as a name and its numbers: "Nylon 12", "Nylon 6 6" (which is PA66) and "Nylon 6 66"
    // (which is the 6/66 copolymer, a different polymer with a different melting point). A sheet may spell the
    // name out: Fillamentum's Chemical properties table heads its first row "Polymer base" and prints
    // "polyamide 12" and "Polyamide 6 + carbon fibres" — which is the sheet answering the question its product
    // name leaves open, since "Nylon" names a family and a family owns no product (D44).
    if (/^(nylon|pa|polyamide)$/.test(token) && /^\d{1,3}$/.test(plain[i + 1] ?? '')) {
      const first = plain[i + 1], after = plain[i + 2] ?? '';
      if (/^\d$/.test(first) && /^\d$/.test(after)) out.push(`pa${first}${after}`);
      else out.push(`pa${first}`);
      if (/^\d{2,3}$/.test(after)) out.push(`pa${first}-${after}`);
    }
    // A polymer written as two words ("PC ABS", "PET G", "PA6 66", "PPE PS") is one name. Joining the pair makes
    // the alias reachable; without it the longest single token wins and a PC/ABS blend reads as plain ABS.
    // Only where both halves could be part of a name. Joining every pair made a polymer out of prose: "provided
    // as a guidance" gave "asa", and eight colorFabb products read as ASA because their legal footer says it.
    // An ordinary English word is not half of a polymer's name, and neither is a word long enough to be one.
    // Joined only where the join is a name something answers to, and where neither half is an ordinary English
    // word: "asa" is ASA's own alias, and "provided as a guidance" filed eight colorFabb products under ASA.
    const next = plain[i + 1];
    const joinable = (t) => !ENGLISH.has(t);
    for (const joined of next && joinable(token) && joinable(next) ? [`${token}-${next}`, `${token}${next}`] : []) {
      if (KNOWN_TOKENS.has(joined)) out.push(joined);
    }
    if (POLYMER_ORDER.some((p) => p.Token === token)) continue;
    for (const p of POLYMER_ORDER) {
      if (token.length <= p.Token.length || !token.startsWith(p.Token)) continue;
      const rest = token.slice(p.Token.length);
      // A short alias must not eat a longer name: "PES" is polyethersulfone, not polyethylene and a letter, and
      // "PPE" is a polyphenylene ether. A single trailing letter is only a suffix on an alias of three or more.
      const suffix = MODIFIER_TOKENS.has(rest) || /^\d+$/.test(rest) || (rest.length === 1 && p.Token.length >= 3);
      if (suffix) { out.push(p.Token, rest); break; }
    }
  }
  return out.filter((t) => t && !STOPWORDS.has(t));
}

/**
 * The first alias of `order` the tokens contain, preferring one that names something. A row with no value is a
 * refusal ("which nylon is a ruling"), and taking it first threw away a real answer beside it: "PLA SILK Rainbow"
 * lost its silk class to `rainbow`, which is a finish with no class of its own.
 */
const findToken = (tokens, order, field) => {
  const hits = order.filter((row) => tokens.includes(row.Token));
  const row = hits.find((r) => r[field]) ?? hits[0];
  return row ? { token: row.Token, value: row[field] ?? '', note: row.Note ?? '' } : null;
};

/** Shore hardness a product's own name states: "TPU 95A", "Filaflex 82A", "PEBA 90A" (a Nominal value, m29). */
export function shoreFromName(text) {
  const m = /(?:^|[^0-9a-z])(\d{2,3})\s?([ad])(?:[^0-9a-z]|$)/i.exec(String(text ?? ''));
  if (!m) return null;
  const value = Number(m[1]);
  return value >= 20 && value <= 100 ? `${value}${m[2].toUpperCase()}` : null;
};

const SUPPORT = /\b(support|breakaway|dissolv|soluble|polysupport|sr-?30|rapidrinse|atlas)\b/i;

/**
 * @param product   the maker's product name
 * @param context   { title, body, manufacturer } what else the sheet says, used only to confirm or to lower confidence
 * @param world     { materials, polymers } the tables as they stand
 */
/**
 * An identity ruling that names this product's polymer. The Subject is the product as the sheet prints it, with
 * or without its maker in front of it; the Value is a PolymerID. Nothing else in a ruling reaches the reader:
 * a ruling that settles a material or a filler is read by apply.mjs, where the material is created.
 */
function identityRuling(product, context, world, seen = null) {
  const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9/+]+/g, ' ').trim();
  const names = new Set([norm(product), norm(`${context.manufacturer ?? ''} ${product}`)].filter(Boolean));
  const polymers = new Set((world.polymers ?? []).map((p) => p.PolymerID));
  for (const r of world.rulings ?? []) {
    if (r.Kind !== 'identity' || !names.has(norm(r.Subject)) || !polymers.has(r.Value)) continue;
    return { ruling: r.Ruling, token: norm(product), value: r.Value, note: r.Reason };
  }
  // A ruling may answer for a name rather than for a product: "TPS" on these sheets is the ISO 18064 code for a
  // styrenic elastomer, not thermoplastic starch, and every sheet that says it means the same thing.
  if (seen) {
    for (const r of world.rulings ?? []) {
      if (r.Kind !== 'identity' || norm(r.Subject) !== norm(seen) || !polymers.has(r.Value)) continue;
      return { ruling: r.Ruling, token: norm(seen), value: r.Value, note: r.Reason };
    }
  }
  return null;
}

export function classifyProduct(product, context = {}, world = {}) {
  const signals = [];
  const tokens = tokenise(product);
  // A sentence that contrasts the product with another material names that other material, not this one. Spectrum
  // ecoPET 9021 says "Unlike the more widely used PETG in 3D printing, it is based on a non-glycol-modified
  // variant of PET", and reading the body word by word filed a PET under PETG.
  const CONTRAST = /\b(unlike|compared (to|with)|in comparison|rather than|instead of|as opposed to|not to be confused|advantages? over|over (classic|conventional|standard|ordinary)|versus|vs\.?|than)\b/i;
  const bodyText = [context.title, context.body].filter(Boolean).join(' ');
  const bodyTokens = tokenise(bodyText);
  // Sentences cannot be split out of a page whose table and marketing column are interleaved, so the contrast is
  // looked for in the words just before the name: every mention of it contrastive means the sheet is talking
  // about something else.
  const saidPlainly = (token) => {
    const re = new RegExp(`\\b${token.replace(/[^a-z0-9]/gi, '').split('').join('[^a-z0-9]?')}\\b`, 'gi');
    const hits = [...bodyText.matchAll(re)];
    return !hits.length || hits.some((m) => !CONTRAST.test(bodyText.slice(Math.max(0, m.index - 100), m.index)));
  };

  // A product's own name, the title the document prints, and the prose under it are three different witnesses.
  // The catalogue name a link carries is often only "spectrum high speed", while the sheet's own first line says
  // "PLA High Speed": the title is the product naming itself, and reading it is not a guess about the prose.
  const titleTokens = tokenise(context.title ?? '');
  // What the sheet itself says its polymer is, where it says it plainly and says one thing. A composition row
  // that names two polymers has not settled which material this is: Fillamentum's NonOilen sheet reads "Polymer
  // base polylactic acid and polyhydroxy butyrate compound", and taking the first of the two would have filed a
  // PLA/PHB compound as ordinary PLA. Two is a blend, and a blend is identified by its own name.
  // A sheet names materials that are not the filament, and its printing table names most of them: the bed
  // adhesive it recommends ("Magigoo PA, PVA glue") and the build surface it was printed on ("Build surface
  // treatment PC and Texture PEI"). Read word by word, an aramid-filled nylon named two polymers, which is a
  // blend and a ruling, and Polymaker's PolySmooth — a PVB — was confidently a polycarbonate.
  //
  // Which side the other thing stands on is what tells them apart, so it is read and not guessed at. A polymer
  // in front of a thing made of it is naming that thing: "PVA glue". A named surface in front of a polymer is
  // naming what the part was printed on: "build surface treatment PC". Neither reaches across the line, which
  // is what a window wide enough to find the glue from the filament did: "Polymer base PVDF Bed adhesive
  // Dimafix Pen, PVA glue" is one line naming the filament, the surface and the glue.
  const MADE_OF_IT = /(?:glue|tape|adhesive|spray|stick|lacquer|primer|solvent|cleaner)/i;
  const A_SURFACE = /(?:build\s+(?:surface|plate|sheet)|surface\s+treatment|print\s+surface|bed\s+surface|magigoo|dimafix|3dlac)/i;
  const aboutTheFilament = (token) => {
    const word = token.replace(/[^a-z0-9]/gi, '').split('').join('[^a-z0-9]?');
    const re = new RegExp(`\\b${word}\\b`, 'gi');
    const hits = [...bodyText.matchAll(re)];
    if (!hits.length) return true;
    const elsewhere = new RegExp(`\\b${word}\\b[\\s,;(]*${MADE_OF_IT.source}\\b|${A_SURFACE.source}(?:\\s+\\w+)?[\\s,;(]*\\b${word}\\b`, 'gi');
    const named = [...bodyText.matchAll(elsewhere)];
    return hits.some((m) => !named.some((g) => m.index >= g.index && m.index < g.index + g[0].length));
  };
  const plain = bodyTokens.filter((t) => saidPlainly(t) && aboutTheFilament(t));
  // The composition row is the sheet answering for itself, and it is read on its own: a polymer named anywhere in
  // the prose is a mention, and the sheets mention plenty — a bed adhesive, a support material, the polymer a
  // product is compared with. Where the row names two polymers the sheet has not settled which material this is:
  // "Polymer base polylactic acid and polyhydroxy butyrate compound" is a PLA/PHB compound, and taking the first
  // of the two would have filed it as ordinary PLA. Two is a blend, and a blend is identified by its own name.
  const stated = tokenise(context.composition ?? '');
  const says = POLYMER_ORDER.filter((row) => stated.includes(row.Token));
  // A family's own word beside one of its polymers is one statement, not two: "polyamide 12" is a polyamide.
  const saysPolymers = [...new Set(says.filter((row) => row.Polymer || !says.some((o) => o.Polymer && o.Family === row.Family))
    .map((row) => row.Polymer || `family:${row.Family}`))];
  const fromComposition = saysPolymers.length === 1 ? findToken(stated, POLYMER_ORDER, 'Polymer') : null;
  const blended = saysPolymers.length > 1;
  const fromSheet = fromComposition ?? (blended ? null : findToken(plain, POLYMER_ORDER, 'Polymer'));

  let polymer = findToken(tokens, POLYMER_ORDER, 'Polymer');
  let where = 'name';
  if (!polymer) { polymer = findToken(titleTokens, POLYMER_ORDER, 'Polymer'); if (polymer) where = 'title'; }
  // A family word names no polymer, so a name that gives one is not an answer and the sheet may still hold one:
  // "Nylon AF80 Aramid" says only that it is a nylon, and its own Chemical properties table says "Polymer base
  // polyamide 12". The sheet only answers for the family the name states, so a sheet talking about something
  // else cannot overrule the product's own name.
  if (polymer && !polymer.value && fromSheet?.value) {
    const family = (token) => POLYMER_ORDER.find((row) => row.Token === token)?.Family ?? '';
    if (family(fromSheet.token) && family(fromSheet.token) === family(polymer.token)) { polymer = fromSheet; where = fromComposition ? 'composition' : 'sheet'; }
  }
  if (!polymer && !blended) { polymer = fromSheet; if (polymer) where = fromComposition ? 'composition' : 'sheet'; }
  // A polymer found loose in the prose is weaker evidence than the product's own name; one the sheet states in
  // its composition row is not. "Polymer base polyamide 12" is the maker answering for the product, and holding
  // every row of such a sheet back for a person to confirm asks them to read what the sheet already says.
  const fromBody = where === 'sheet';
  if (polymer) signals.push(`${where}: ${polymer.token}`);

  // A filler read from the sheet's own words must be next to a word that makes it a filler. "Glass" on its own
  // appears in "Glass Transition Temperature" on nearly every sheet, and reading it as glass fibre filed a
  // toughened PLA under glass-filled PLA.
  // A filler word, not merely a number beside one: the table and the marketing column are interleaved, so
  // "Tensile Strain at Break 10% lower carbon footprint" put a percentage twelve characters before the word
  // carbon and read a flame-retardant PLA as carbon-filled.
  const FILLER_CONTEXT = /(fib(?:re|er)s?|filled|filler|reinforc|loaded|sphere|bead|content of)/i;
  // The same word in a phrase that is not about what is in the filament.
  const NOT_FILLER = /\b(footprint|neutral|emission|dioxide|monoxide|black-?box|fibre optic)\b/i;
  // The token matched is a tokeniser spelling ("glassfibre", "glass-fibre") and the sheet prints "glass fibre",
  // so the word is looked for with its separators optional rather than as the spelling that matched.
  const loose = (token) => token.replace(/[^a-z0-9]/gi, '').split('').join('[^a-z0-9]?');
  const nearFiller = (token) => {
    const text = [context.title, context.body].filter(Boolean).join(' ');
    const near = new RegExp(`(\\b${loose(token)}\\b[^.]{0,24}${FILLER_CONTEXT.source})|(${FILLER_CONTEXT.source}[^.]{0,24}\\b${loose(token)}\\b)`, 'gi');
    for (const m of text.matchAll(near)) if (!NOT_FILLER.test(text.slice(m.index, m.index + m[0].length + 14))) return true;
    return false;
  };
  // A fibre load is written as a code with its fraction in it, and every maker spells it differently: CF, CF15,
  // cf15s, rCF08, GF30, gf40. Enumerating them loses the next one, so the shape is read rather than the spelling.
  const FIBRE_CODE = /^r?(cf|gf)\d{0,3}[a-z]?\+?$/i;
  const coded = tokens.find((t) => FIBRE_CODE.test(t));
  const inName = (coded ? { token: coded, value: /^r?cf/i.test(coded) ? 'Carbon fibre' : 'Glass fibre', note: '' } : null)
    ?? findToken(tokens, MODIFIER_ORDER, 'Modifier');
  const inBody = findToken(bodyTokens, MODIFIER_ORDER, 'Modifier');
  const modifier = inName ?? (inBody && nearFiller(inBody.token) ? inBody : null);
  if (modifier) signals.push(`filler: ${modifier.token}${inName ? '' : ' (from the sheet, not the name)'}`);
  const variant = findToken(tokens, VARIANT_ORDER, 'Variant class');
  // Which finish it is, not only which class: the database has a material per finish (Metal, Wood, Glow).
  const finish = variant ? VARIANT_ORDER.find((v) => v.Token === variant.token)?.['Finish name'] ?? '' : '';
  if (variant?.value) signals.push(`variant: ${variant.token}${finish ? ` (${finish})` : ''}`);

  // A support or soluble product is not the material it supports: "PolySupport for PA12" is a support, not a PA12.
  // A support product says so in its own words as often as in its name: "AquaPrint is a water-soluble support
  // material designed for complex multi-extrusion 3D printing" names no support token at all in its title.
  const SAYS_SUPPORT = /\b(is an?|as an?)\b[^.]{0,60}\b(support|breakaway|soluble)\b[^.]{0,20}\b(material|filament)\b|\bwater-soluble\b/i;
  const support = SUPPORT.test(product) || SUPPORT.test(context.title ?? '') || SAYS_SUPPORT.test(context.body ?? '');
  const hardness = shoreFromName(product);
  if (hardness) signals.push(`hardness: ${hardness}`);

  // An identity the rule cannot settle is a ruling, written once and applied to every sheet that says the same
  // thing. SUNLU's Easy PA sheet says only "PA", which names a family; SUNLU's own store calls it a PA6/66
  // copolymer, and the ruling carries that answer here so the reader does not have to guess it twice.
  const namedByRuling = identityRuling(product, context, world, polymer?.token ?? null);
  if (namedByRuling) {
    polymer = { token: namedByRuling.token, value: namedByRuling.value, note: namedByRuling.note };
    signals.push(`ruling ${namedByRuling.ruling}: ${namedByRuling.value}`);
  }

  const reasons = [];
  if (support) reasons.push(`"${product}" is a support or soluble product; which support material it is comes from the sheet, and it is never filed under the material it supports`);
  if (!polymer) reasons.push(`no base polymer in "${product}"`);
  else if (!polymer.value) reasons.push(`"${polymer.token}" names a family, not a polymer: ${polymer.note}`);
  if (modifier && !modifier.value) reasons.push(`"${modifier.token}" has no value in schema/vocab/modifiers.csv: ${modifier.note}`);

  let confidence = 1;
  if (fromBody) confidence -= 0.2;
  // A filler the composition row names is as plainly stated as the polymer beside it: "Polymer base Polyamide 6
  // + carbon fibres" is one sentence naming both, and holding every row of such a sheet back asks a person to
  // confirm what the sheet says in the row written to say it.
  const fillerStated = modifier && stated.includes(modifier.token);
  if (modifier && !tokens.includes(modifier.token) && !fillerStated) confidence -= 0.15;
  // Two polymers in one name ("PC/ABS" aside, which is its own identity) is a name that has to be read by a person.
  // Two polymers in one name is a blend, or a support for another material, or a sheet covering two products.
  // Which of those it is comes from the sheet, so it is a question rather than a low score: reading "PC ABS" as
  // ABS, or "PLA/PHA" as PLA, is a confident wrong answer, and those are the ones that do damage.
  // The pieces of a joined name are not separate polymers: "PC ABS" is read from the token pc-abs, and pc and abs
  // are what it was joined from, not a second and third polymer in the name.
  const chosen = polymer?.token ?? '';
  const pieces = new Set([chosen, ...chosen.split('-'), chosen.replace(/-/g, '')]);
  const named = [...new Set(POLYMER_ORDER.filter((p) => p.Polymer && tokens.includes(p.Token) && !pieces.has(p.Token)).map((p) => p.Polymer))];
  if (polymer?.value) named.unshift(polymer.value);
  if (new Set(named.filter(Boolean)).size > 1) {
    confidence -= 0.5;
    reasons.push(`"${product}" names more than one polymer (${[...new Set(named.filter(Boolean))].join(', ')}); which it is comes from the sheet`);
  }

  const identity = {
    polymer: polymer?.value ?? '',
    modifier: modifier?.value || (polymer?.value ? 'Unfilled / unspecified' : ''),
    variantClass: variant?.value ?? '',
    finish,
    family: polymer?.Family ?? POLYMERS.find((p) => p.Token === polymer?.token)?.Family ?? '',
    hardness, support, signals,
  };
  identity.family = POLYMERS.find((p) => p.Token === polymer?.token)?.Family ?? '';

  // "AmideX PA6 Copolymer" is a copolymer of nylon 6 and 6,6, which is PA6/66 and not PA6; the 2026-09-13
  // duplicate-products audit found exactly that sheet filed under three materials. A copolymer word beside a
  // polyamide is a question for the sheet, not a match.
  if (/copolymer|copoly\b/i.test(product) && /^PA/.test(identity.polymer ?? '')) {
    reasons.push(`"${product}" says copolymer beside ${identity.polymer}: which polyamide it is comes from the sheet, not the name`);
    confidence -= 0.3;
  }

  const match = matchMaterial(identity, world.materials ?? [], { ...context, product, tokens, grades: world.grades ?? [] });
  if (!match) {
    const collision = collidesWith(identity, world.materials ?? []);
    if (collision) reasons.push(`a new material here would duplicate ${collision.MaterialID} ${collision['Original name']}, which already holds ${identity.polymer} / ${identity.modifier}${identity.variantClass ? ` / ${identity.variantClass}` : ''}`);
  }
  const known = (world.polymers ?? []).some((p) => p.PolymerID === identity.polymer);
  // A polymer with no row cannot be estimated, so a material of it cannot be created without one. It can still be
  // filed under a material that already exists and already says so: PEEK, PEKK and PEI are six such materials,
  // deliberately not estimated (their Estimate identity is Not applicable), and their products are ordinary.
  // A polymer with no row in polymers.csv cannot be estimated, so a material of it is not created on the reader's
  // own authority. A ruling may say otherwise, and then the material stands for what its sheets publish and for
  // nothing more, which is how the six high-temperature materials have always stood.
  const ruled = (world.rulings ?? []).some((r) => r.Kind === 'polymer-no-row' && r.Subject === identity.polymer);
  if (identity.polymer && !known && !match && !ruled) reasons.push(`"${identity.polymer}" has no row in polymers.csv, so a material of it cannot be created`);

  return {
    ...identity,
    materialId: match?.MaterialID ?? null,
    materialName: match?.['Original name'] ?? null,
    estimateIdentity: match?.['Estimate identity'] ?? (known ? identity.polymer : ''),
    confidence: Math.max(0, Number(confidence.toFixed(2))),
    needsRuling: reasons.length > 0,
    reasons,
  };
}

/**
 * The material a product belongs to: same base polymer, same declared filler, same variant class.
 *
 * Two kinds of row are not a home for someone else's product. A family entry owns none at all (D44). And a row
 * whose Modifier / filler is "Commercial variant / undisclosed" names a product rather than a material class:
 * that value is the maker saying what is in it is not published, so PLA Basic answers for Bambu's PLA Basic and
 * nothing else. ABS-GF is a class, whoever sells it, which is why the test is the declared filler and not who
 * happens to sell it today.
 */
export function matchMaterial(identity, materials, context = {}) {
  if (!identity.polymer) return null;
  const grades = context.grades ?? [];
  const makersOf = new Map();
  for (const g of grades.filter((g) => g.Status === 'active' && g.Role === 'procurement')) {
    if (!makersOf.has(g.MaterialID)) makersOf.set(g.MaterialID, new Set());
    makersOf.get(g.MaterialID).add(g.Manufacturer);
  }
  // A row is product-level when it declares that what is in it is not published *and* only one maker sells it.
  // Five rows declare the same and carry several makers' grades (PLA Silk, PC FR, TPC / TPEE, POM / Acetal,
  // PEI / ULTEM); those are classes, and refusing to file another maker's product under them would duplicate a
  // material that already exists.
  const ownProduct = (m) => m['Modifier / filler'] === 'Commercial variant / undisclosed' && (makersOf.get(m.MaterialID)?.size ?? 0) <= 1;
  // "Commercial variant / undisclosed" on a class row says the makers do not publish what is in it, which is also
  // true of a plain product of that polymer. So a class row declaring it takes an unfilled product as well: POM /
  // Acetal, TPC / TPEE and PEI / ULTEM are those rows, and refusing would create a second material beside each.
  const undisclosed = (m) => m['Modifier / filler'] === 'Commercial variant / undisclosed' && identity.modifier === 'Unfilled / unspecified';
  const same = (m) => m['Estimate identity'] === identity.polymer
    && (m['Modifier / filler'] === identity.modifier || undisclosed(m))
    && m['Variant class'] === (identity.variantClass || 'Not applicable');
  const open = materials.filter((m) => m.Scope !== 'Family entry');
  const maker = context.manufacturer ?? '';
  const named = (a, b) => String(a ?? '').toLowerCase().replace(/[^a-z0-9]/g, '') === String(b ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // A material's name may carry its alias beside it ("nGen / Amphora", "POM / Acetal", "PEI / ULTEM"), so each
  // part of a slash name is a name it answers to.
  const names = (m) => String(m['Original name'] ?? '').split('/').map((n) => n.trim()).filter(Boolean);
  const ownerOf = new Map(grades.map((g) => [g.GradeID, g.Manufacturer]));
  // A product-level row answers only for the maker whose product it is, and only when the maker is known. Nearly
  // four in ten documents in the corpus name no maker, and without that test any of them took Bambu's PLA Basic.
  const mayAnswer = (m) => !ownProduct(m) || (maker && ownerOf.get(m['Representative grade']) === maker);
  if (context.product) {
    const byName = open.find((m) => mayAnswer(m) && names(m).some((n) => named(n, context.product)));
    if (byName) return byName;
  }
  // A finish is an identity, and the material for it exists: PLA Metal, PLA Wood, PLA Glow and their siblings
  // carry other makers' products of the same finish, which is how PLA Silk already holds Polymaker's and eSUN's
  // (owner ruling R039). Their own rows declare one maker, so the product-level test would otherwise refuse them.
  if (identity.finish) {
    const wanted = `${identity.polymer} ${identity.finish}`;
    const byFinish = open.find((m) => m['Estimate identity'] === identity.polymer
      && m['Variant class'] === (identity.variantClass || 'Not applicable')
      && names(m).some((n) => named(n, wanted)));
    if (byFinish) return byFinish;
  }

  const byIdentity = open.find((m) => same(m) && !ownProduct(m));
  if (byIdentity) return byIdentity;
  // A material the estimate model cannot identify (the high-temperature six, whose polymers have no row) can only
  // be reached by name, so a name inside the product's own words finds it: "THERMAX PES" is the PESU material.
  // This is last, or "Carbon Fiber PETG" would stop at PETG instead of reaching PETG-CF.
  if (context.tokens?.length) {
    // The name finds the material, but a filler the name declares still has to match: 3DXTECH's carbon fibre PEEK
    // is not the unfilled PEEK material, and filing it there judged a 10 GPa modulus against an unfilled window.
    return open.find((m) => m['Estimate identity'] === 'Not applicable' && mayAnswer(m)
      && (m['Modifier / filler'] === identity.modifier || undisclosed(m))
      && names(m).some((n) => context.tokens.some((t) => named(n, t)))) ?? null;
  }
  return null;
}

/**
 * A material that already holds this identity, product-level or not. A new material that duplicates one is the
 * failure D44 was written about, and it is worth naming rather than discovering after the fact.
 */
export function collidesWith(identity, materials) {
  if (!identity.polymer) return null;
  return materials.find((m) => m.Scope !== 'Family entry'
    && m['Estimate identity'] === identity.polymer
    && m['Modifier / filler'] === identity.modifier
    && m['Variant class'] === (identity.variantClass || 'Not applicable')) ?? null;
}

if (process.argv[1]?.endsWith('classify.mjs')) {
  const table = (n) => readCsv(join(projectRoot, 'data/tables', `${n}.csv`)).records.map((r) => r.values);
  const world = { materials: table('materials'), polymers: table('polymers'), grades: table('grades') };
  const maker = process.argv.includes('--maker') ? process.argv[process.argv.indexOf('--maker') + 1] : '';
  const name = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--maker').join(' ');
  if (!name) { console.error('usage: node scripts/ingest/classify.mjs "<product name>" [--maker "<manufacturer>"]'); process.exit(2); }
  console.log(JSON.stringify(classifyProduct(name, { manufacturer: maker }, world), null, 2));
}
