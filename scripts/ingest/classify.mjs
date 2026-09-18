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
    .filter(Boolean);

  const out = [];
  for (let i = 0; i < plain.length; i++) {
    const token = plain[i];
    out.push(token);
    if (/^(nylon|pa)$/.test(token) && /^\d{1,3}$/.test(plain[i + 1] ?? '')) {
      const second = /^\d$/.test(plain[i + 2] ?? '') && /^\d$/.test(plain[i + 1]) ? plain[i + 2] : '';
      out.push(`pa${plain[i + 1]}${second}`);
    }
    if (POLYMER_ORDER.some((p) => p.Token === token)) continue;
    for (const p of POLYMER_ORDER) {
      if (token.length <= p.Token.length || !token.startsWith(p.Token)) continue;
      const rest = token.slice(p.Token.length);
      if (MODIFIER_TOKENS.has(rest) || rest.length === 1 || /^\d+$/.test(rest)) { out.push(p.Token, rest); break; }
    }
  }
  return out.filter((t) => t && !STOPWORDS.has(t));
}

const findToken = (tokens, order, field) => {
  for (const row of order) {
    if (!tokens.includes(row.Token)) continue;
    return { token: row.Token, value: row[field] ?? '', note: row.Note ?? '' };
  }
  return null;
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
export function classifyProduct(product, context = {}, world = {}) {
  const signals = [];
  const tokens = tokenise(product);
  const bodyTokens = tokenise([context.title, context.body].filter(Boolean).join(' '));

  let polymer = findToken(tokens, POLYMER_ORDER, 'Polymer');
  let fromBody = false;
  if (!polymer) { polymer = findToken(bodyTokens, POLYMER_ORDER, 'Polymer'); fromBody = Boolean(polymer); }
  if (polymer) signals.push(`${fromBody ? 'sheet' : 'name'}: ${polymer.token}`);

  const modifier = findToken(tokens, MODIFIER_ORDER, 'Modifier') ?? findToken(bodyTokens, MODIFIER_ORDER, 'Modifier');
  if (modifier) signals.push(`filler: ${modifier.token}`);
  const variant = findToken(tokens, VARIANT_ORDER, 'Variant class');
  if (variant?.value) signals.push(`variant: ${variant.token}`);

  const support = SUPPORT.test(product) || SUPPORT.test(context.title ?? '');
  const hardness = shoreFromName(product);
  if (hardness) signals.push(`hardness: ${hardness}`);

  const reasons = [];
  if (!polymer) reasons.push(`no base polymer in "${product}"`);
  else if (!polymer.value) reasons.push(`"${polymer.token}" names a family, not a polymer: ${polymer.note}`);
  if (modifier && !modifier.value) reasons.push(`"${modifier.token}" has no value in schema/vocab/modifiers.csv: ${modifier.note}`);

  let confidence = 1;
  if (fromBody) confidence -= 0.2;
  if (modifier && !tokens.includes(modifier.token)) confidence -= 0.15;
  // Two polymers in one name ("PC/ABS" aside, which is its own identity) is a name that has to be read by a person.
  const named = POLYMER_ORDER.filter((p) => p.Value !== '' && tokens.includes(p.Token)).map((p) => p.Polymer);
  if (new Set(named).size > 1) { confidence -= 0.5; signals.push(`several polymers named: ${[...new Set(named)].join(', ')}`); }

  const identity = {
    polymer: polymer?.value ?? '',
    modifier: modifier?.value || (polymer?.value ? 'Unfilled / unspecified' : ''),
    variantClass: variant?.value ?? '',
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

  const match = matchMaterial(identity, world.materials ?? [], { ...context, product, grades: world.grades ?? [] });
  const known = (world.polymers ?? []).some((p) => p.PolymerID === identity.polymer);
  if (identity.polymer && !known) reasons.push(`"${identity.polymer}" has no row in polymers.csv, so a material of it cannot be estimated`);

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
  const same = (m) => m['Estimate identity'] === identity.polymer
    && m['Modifier / filler'] === identity.modifier
    && (m['Variant class'] === (identity.variantClass || 'Not applicable'));
  const open = materials.filter((m) => m.Scope !== 'Family entry');
  const ownProduct = (m) => m['Modifier / filler'] === 'Commercial variant / undisclosed';
  const maker = context.manufacturer ?? '';
  // A maker whose own products are materials here answers first with the product of that name: Bambu's PLA Matte
  // is M003, while any other maker's matte PLA is a finish on M001. Names are compared as names, not as text.
  const named = (a, b) => String(a ?? '').toLowerCase().replace(/[^a-z0-9]/g, '') === String(b ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  // Only the maker whose product it is answers by name: Bambu's PLA Matte is M003, and another maker's product of
  // the same name is its own matte PLA under M001. The owner is the manufacturer of the row's representative grade.
  if (context.product) {
    const ownerOf = new Map((context.grades ?? []).map((g) => [g.GradeID, g.Manufacturer]));
    const own = open.find((m) => ownProduct(m) && named(m['Original name'], context.product)
      && (!maker || ownerOf.get(m['Representative grade']) === maker));
    if (own) return own;
  }
  return open.find((m) => same(m) && !ownProduct(m)) ?? null;
}

if (process.argv[1]?.endsWith('classify.mjs')) {
  const table = (n) => readCsv(join(projectRoot, 'data/tables', `${n}.csv`)).records.map((r) => r.values);
  const world = { materials: table('materials'), polymers: table('polymers'), grades: table('grades') };
  const maker = process.argv.includes('--maker') ? process.argv[process.argv.indexOf('--maker') + 1] : '';
  const name = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--maker').join(' ');
  if (!name) { console.error('usage: node scripts/ingest/classify.mjs "<product name>" [--maker "<manufacturer>"]'); process.exit(2); }
  console.log(JSON.stringify(classifyProduct(name, { manufacturer: maker }, world), null, 2));
}
