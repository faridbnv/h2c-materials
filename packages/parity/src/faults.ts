// Injected faults for the harness self-test (pack 07 section 5.7). Each patches ONE rule in a temporary copy of the engine.
// `expect` names the tiers a correct harness must report; the tests hold the harness to it.
import type { Patch } from './engine-copy.ts';
import type { Tier } from './types.ts';

export interface Fault {
  name: string;
  description: string;
  expect: Tier[];
  patches: Patch[];
}

export const FAULTS: Fault[] = [
  {
    name: 'gate-verdict',
    description: 'A print gate that sits at the low end of the window answers "on the line" instead of pass',
    expect: ['decision', 'evidence'],
    patches: [{ file: 'constraints.js', find: "'within-low-end': STATUS.PASS,", replace: "'within-low-end': STATUS.INDETERMINATE," }],
  },
  {
    name: 'tie-order',
    description: 'Among tied products the LAST one represents the material, not the first',
    expect: ['decision'],
    patches: [{ file: 'constraints.js', find: 'const best = judged.reduce((a, b) => (compareGroups(b.e, a.e) < 0 ? b : a));', replace: 'const best = judged.reduce((a, b) => (compareGroups(b.e, a.e) <= 0 ? b : a));' }],
  },
  {
    name: 'edge-strict',
    description: 'A value exactly on a ">=" limit no longer passes (the float edge)',
    expect: ['decision', 'evidence'],
    patches: [{ file: 'constraints.js', find: 'if (lo !== null && lo >= threshold) return STATUS.PASS;\n      if (hi !== null && (hi < threshold', replace: 'if (lo !== null && lo > threshold) return STATUS.PASS;\n      if (hi !== null && (hi < threshold' }],
  },
  {
    name: 'untested-as-zero',
    description: 'Products that could not be judged are counted as zero untested',
    expect: ['decision'],
    patches: [{ file: 'constraints.js', find: 'fail: fail.length, untested: unknown.length,', replace: 'fail: fail.length, untested: 0,' }],
  },
  {
    name: 'drop-cited-ids',
    description: 'A product requirement no longer carries the measurement ID it cites',
    expect: ['evidence'],
    patches: [{ file: 'constraints.js', find: "for (const k of ['measurementId', 'evidenceIds',", replace: "for (const k of ['evidenceIds'," }],
  },
  {
    name: 'gate-precedence',
    description: 'When a material has a requirement that failed and one that is unresolved, the unresolved one now outranks the failure (the verdict precedence is flipped)',
    expect: ['decision'],
    patches: [{
      file: 'constraints.js',
      find: '  if (failed.length) verdict = STATUS.FAIL;\n  else if (!unresolved.length) verdict = STATUS.PASS;\n  else verdict = STATUS.UNKNOWN;',
      replace: '  if (unresolved.length) verdict = STATUS.UNKNOWN;\n  else if (failed.length) verdict = STATUS.FAIL;\n  else verdict = STATUS.PASS;',
    }],
  },
  {
    name: 'missing-word-zero',
    description: 'The missing-state word "not-published" on an unanswered numeric requirement is turned into the number 0',
    expect: ['evidence'],
    patches: [{
      file: 'constraints.js',
      find: "      missing: h?.missing ?? 'not-published',\n    };\n  }\n\n  const interval",
      replace: "      missing: h?.missing === 'not-published' ? 0 : (h?.missing ?? 'not-published'),\n    };\n  }\n\n  const interval",
    }],
  },
  {
    name: 'cited-sibling-swap',
    description: 'A requirement cites a sibling measurement of the same grade and property with an equal value instead of the one it rests on; no verdict moves',
    expect: ['evidence'],
    patches: [{
      file: 'constraints.js',
      find: '    measurementId: h.measurementId, gradeId: h.gradeId, sourceId: h.sourceId,',
      replace: '    measurementId: ((m0) => (m0 && (ctx.measurementsByMaterial?.get(material.id) ?? []).find((m) => m.id !== m0.id && m.gradeId === m0.gradeId && m.property === m0.property && m.value === m0.value)?.id) || h.measurementId)(ctx.measurementById?.get(h.measurementId)), gradeId: h.gradeId, sourceId: h.sourceId,',
    }],
  },
  {
    name: 'reason-wording',
    description: 'One reason sentence is reworded ("as its sheet states" becomes "as its sheet says"); no verdict moves',
    expect: ['wording'],
    patches: [{ file: 'constraints.js', find: ", as its sheet states; annealing is allowed", replace: ", as its sheet says; annealing is allowed" }],
  },
];

export const faultByName = (name: string): Fault => {
  const f = FAULTS.find((x) => x.name === name);
  if (!f) throw new Error(`unknown fault "${name}"; known: ${FAULTS.map((x) => x.name).join(', ')}`);
  return f;
};
