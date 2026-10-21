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
