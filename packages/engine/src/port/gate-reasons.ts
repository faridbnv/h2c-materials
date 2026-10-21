// The code of a print gate's reason, read from the sentence the build wrote it in.
//
// The engine says why a printer check is open ("no print recipe on record", "its chamber temperature is not stated") from
// the check's reason. The build writes that reason in English and no code (build/src/normalize/process.js, gates.js,
// products.js, chamber-need.js), and the build is frozen until WP-20, so the engine used to read the sentence with two regular
// expressions (constraints.js:948-949). This file is the one place the engine reads the build's English: each family of
// sentences the build writes has its code here, and everything past it works from the code. When the build writes the code
// (WP-20) this file is deleted and the gate carries it.
//
// Every distinct sentence of the compiled database is covered (tests/parity/gate-reasons.test.mjs reads them all). A sentence
// that belongs to no family has no code, and the engine says no more of it than it did before.
import type { GateReasonCode } from '@atlas/domain';

/** The families, in the order the build's rules write them. A reason may carry a suffix after it (" (data sheet shared with ...)"). */
const FAMILIES: readonly (readonly [RegExp, GateReasonCode])[] = [
  [/^No print profile recorded/, 'gate.no-print-profile'],
  [/^No requirement published/, 'gate.no-requirement-published'],
  [/^No temperature published/, 'gate.no-temperature-published'],
  [/^(No heated chamber needed|The source says no enclosure is needed)/, 'gate.no-chamber-needed'],
  [/^(An enclosure is asked for|Its maker asks for an enclosure)/, 'gate.enclosure-counts'],
  [/^The source prints "/, 'gate.chamber-dash'],
  [/^A heated chamber is recommended with no temperature/, 'gate.chamber-recommended-no-temperature'],
  [/^Asks for an enclosure but gives no chamber temperature/, 'gate.enclosure-asked-no-temperature'],
  [/^No chamber stated; of the \d+ makers of /, 'gate.chamber-by-kind'],
  [/^At the low end of the maker's window/, 'gate.within-low-end'],
  [/^The H2C reaches only the bottom of the maker's window/, 'gate.edge'],
  [/^Recommends at least /, 'gate.recommends-at-least-above'],
  [/^Requires at least /, 'gate.requires-at-least-above'],
  [/^Needs at least /, 'gate.needs-at-least-within'],
  [/^Needs up to /, 'gate.needs-up-to-within'],
  [/^Recommends up to /, 'gate.recommends-up-to-above'],
  [/^Requires up to /, 'gate.requires-up-to-above'],
];

/** The code of a print gate's reason sentence, or undefined for a sentence of no family. */
export function gateReasonCodeOf(reason: string): GateReasonCode | undefined {
  return FAMILIES.find(([pattern]) => pattern.test(reason))?.[1];
}
