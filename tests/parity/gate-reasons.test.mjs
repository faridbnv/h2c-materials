// WP-19 step 3: the one place the engine reads the build's English. Every print gate sentence of the compiled database has a code,
// each code has a sentence that earns it, and a sentence of no family earns none.
import test from 'node:test';
import assert from 'node:assert/strict';
import { GATE_REASON_CODES } from '../../packages/domain/src/core/reason-codes.ts';
import { gateReasonCodeOf } from '../../packages/engine/src/port/gate-reasons.ts';
import { db } from './helpers.mjs';

const GATES = ['nozzle', 'bed', 'chamber'];

/** Every gate sentence the build wrote: materials' and products' own. */
const sentences = () => {
  const out = [];
  for (const m of db.materials) for (const a of GATES) if (m.gates?.[a]) out.push(m.gates[a].reason);
  for (const g of db.grades) for (const a of GATES) if (g.print?.[a]) out.push(g.print[a].reason);
  return out;
};

test('every gate sentence the build wrote has a code', () => {
  const all = sentences();
  assert.ok(all.length > 3000, `a real comparison: ${all.length} gates`);
  const unclassified = [...new Set(all.filter((r) => gateReasonCodeOf(r) === undefined))];
  assert.deepEqual(unclassified, []);
  const used = new Set(all.map(gateReasonCodeOf));
  for (const code of used) assert.ok(GATE_REASON_CODES.includes(code), `${code} is a listed code`);
});

test('each code is earned by the sentence the build writes for it, with or without the origin it appends', () => {
  const examples = {
    'gate.no-print-profile': ['No print profile recorded', 'No print profile recorded for this product'],
    'gate.no-requirement-published': ['No requirement published'],
    'gate.no-temperature-published': ['No temperature published'],
    'gate.no-chamber-needed': ['No heated chamber needed', 'No heated chamber needed (data sheet shared with Polymaker PolyLite PLA)', 'The source says no enclosure is needed, so no heated chamber is needed'],
    'gate.enclosure-counts': ['An enclosure is asked for, with no temperature. The H2C\'s heated chamber (65 °C) counts as that enclosure', 'Its maker asks for an enclosure ("Yes") and gives no temperature. The H2C\'s heated chamber (65 °C) counts as that enclosure'],
    'gate.chamber-dash': ['The source prints "-" for the chamber: no setpoint, which is not the same as "not needed"'],
    'gate.chamber-recommended-no-temperature': ['A heated chamber is recommended with no temperature, so 65 °C is not shown to be enough'],
    'gate.enclosure-asked-no-temperature': ['Asks for an enclosure but gives no chamber temperature, so 65 °C is not shown to be enough'],
    'gate.chamber-by-kind': ['No chamber stated; of the 41 makers of PLA who state one, none asks above 65 °C'],
    'gate.within-low-end': ['At the low end of the maker\'s window (it asks 60–90 °C; the H2C reaches 65 °C)'],
    'gate.edge': ['The H2C reaches only the bottom of the maker\'s window (120 °C of 120–150 °C)'],
    'gate.recommends-at-least-above': ['Recommends at least 70 °C, above the H2C\'s 65 °C, but does not require it'],
    'gate.requires-at-least-above': ['Requires at least 80 °C; the H2C reaches only 65 °C'],
    'gate.needs-at-least-within': ['Needs at least 40 °C; the H2C reaches 65 °C'],
    'gate.needs-up-to-within': ['Needs up to 60 °C; the H2C reaches 65 °C', 'Needs up to 60 °C; the H2C reaches 65 °C (from the Bambu Lab Filament Guide)'],
    'gate.recommends-up-to-above': ['Recommends up to 80 °C, above the H2C\'s 65 °C, but does not require it'],
    'gate.requires-up-to-above': ['Requires up to 90 °C; the H2C reaches only 65 °C'],
  };
  assert.deepEqual(Object.keys(examples).sort(), [...GATE_REASON_CODES].sort(), 'every listed gate code has an example, and no example lacks a code');
  for (const [code, list] of Object.entries(examples)) for (const sentence of list) assert.equal(gateReasonCodeOf(sentence), code, sentence);
});

test('a sentence of no family has no code, and a family is read only from the start of the sentence', () => {
  for (const sentence of ['', 'Within H2C capability', 'x No print profile recorded', ' No temperature published', 'no temperature published', 'Needs annealing at 80 °C for 4 h']) {
    assert.equal(gateReasonCodeOf(sentence), undefined, JSON.stringify(sentence));
  }
});
