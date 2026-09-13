// Use & durability holds 380 evidence records across two overlapping source vocabularies.
// The Rating column is unpublished on 352 of them, so an environment criterion has to be built
// from the Finding text, not from a score. Method sheet, Evidence / Claims: a product description
// is a manufacturer claim, not independent validation, so a verdict always travels with its
// evidence type and source.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const MAP = JSON.parse(readFileSync(join(here, '../../mappings/environment-topics.json'), 'utf8'));

export const CATEGORIES = MAP.categories;

export const VERDICT = {
  RESISTANT: 'resistant',
  LIMITED: 'limited',
  NOT_RESISTANT: 'not-resistant',
  SOLUBLE: 'soluble',
  INSOLUBLE: 'insoluble',
  FLAMMABLE: 'flammable',
  SELF_EXTINGUISHING: 'self-extinguishing',
  NO_DATA: 'no-data',
  NARRATIVE: 'narrative',   // a paragraph of evidence, shown but not reduced to a verdict
};

// Order matters: qualified phrases must be tested before the bare words they contain.
const VERDICT_RULES = [
  { re: /^no data available$/i,                     verdict: VERDICT.NO_DATA },
  { re: /^not applicable$/i,                        verdict: VERDICT.NO_DATA },
  { re: /^not resistant to some\b/i,                verdict: VERDICT.LIMITED, qualified: true },
  { re: /^resistant to most\b/i,                    verdict: VERDICT.LIMITED, qualified: true },
  { re: /^(slight(ly)?\s+resistant|limited resistance)$/i, verdict: VERDICT.LIMITED },
  { re: /^not resistant$/i,                         verdict: VERDICT.NOT_RESISTANT },
  { re: /^resistant$/i,                             verdict: VERDICT.RESISTANT },
  { re: /^good$/i,                                  verdict: VERDICT.RESISTANT, vague: true },
  { re: /^poor$/i,                                  verdict: VERDICT.NOT_RESISTANT, vague: true },
  { re: /^insoluble\b/i,                            verdict: VERDICT.INSOLUBLE },
  { re: /^soluble\b/i,                              verdict: VERDICT.SOLUBLE },
  { re: /^self[- ]exting/i,                         verdict: VERDICT.SELF_EXTINGUISHING },
  { re: /^flammable$/i,                             verdict: VERDICT.FLAMMABLE },
];

export function classifyTopic(topic) {
  const entry = MAP.topics[String(topic ?? '').trim()];
  if (!entry) return { category: null, mapped: false, filterable: false, topic };
  const cat = MAP.categories[entry.category];
  return { ...entry, mapped: true, filterable: !!cat?.filterable, label: cat?.label ?? entry.category, topic };
}

export function classifyFinding(finding) {
  const text = finding == null ? '' : String(finding).trim();
  if (!text) return { verdict: VERDICT.NO_DATA, text };
  for (const rule of VERDICT_RULES) {
    if (rule.re.test(text)) return { verdict: rule.verdict, text, qualified: rule.qualified, vague: rule.vague };
  }
  return { verdict: VERDICT.NARRATIVE, text };
}

/** A record only backs an environment criterion if its topic is filterable and it states a verdict. */
export function isUsableEvidence(rec) {
  return rec.topic.filterable && rec.finding.verdict !== VERDICT.NO_DATA && rec.finding.verdict !== VERDICT.NARRATIVE;
}

/**
 * Categories split into two kinds, and the split is decided by the data, not by taste.
 *
 * A verdict category has enough records carrying a classifiable Finding ("Resistant",
 * "Not resistant", "Slight resistant") to answer a PASS/FAIL question.
 *
 * An indicator category has records but no classifiable verdicts among them: every Finding is a
 * paragraph. UV and outdoor is the sharpest case, with seven records across six materials and not
 * one reducible verdict. Offering "outdoor evidence required" as a hard constraint would return
 * UNKNOWN for all 102 materials while looking like a working filter, so the UI must present these
 * as evidence-presence indicators that open the narrative instead.
 *
 * Computed at build time by countUsableByCategory() and written into the compiled meta, so this
 * stays true to the snapshot rather than being a hand-maintained list that silently rots.
 */
export function countUsableByCategory(records) {
  const out = {};
  for (const r of records) {
    const topic = classifyTopic(r.Topic);
    if (!topic.mapped || !topic.filterable) continue;
    const finding = classifyFinding(r.Finding);
    const c = (out[topic.category] ||= { records: 0, usable: 0, materials: new Set() });
    c.records++;
    c.materials.add(r.MaterialID);
    if (isUsableEvidence({ topic, finding })) c.usable++;
  }
  // The display label and the sentence-form noun are authored in the mapping file and travel with
  // the counts. The app used to build a name by appending "resistance" to the key, which produced
  // "water solubility resistance".
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, {
    label: CATEGORIES[k]?.label ?? k,
    noun: CATEGORIES[k]?.noun ?? String(k).replace(/-/g, ' '),
    records: v.records,
    usable: v.usable,
    materials: v.materials.size,
    kind: v.usable > 0 ? 'verdict' : 'indicator',
  }]));
}
