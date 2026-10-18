#!/usr/bin/env node
// Migration m437 (2026-10-18): the caveat on makers' environment statements, said once in the method table, where the
// drawer's Environment tab and the material page's Chemicals and environment read it (coherence round, C11).
//
// The drawer said "Makers rarely give the concentration, temperature or duration: treat them as indications, not design
// data." and the page "Makers rarely give the concentration, temperature or duration, so these are indications, not
// design data.": one caveat in two sentences, each typed in its own module. Like the specimens caveat (Scope,
// Transferable allowables), it becomes a rule both read. The drawer's wording is kept, as the selector-refinement round's
// keep register kept it (K27). Nothing is read from a source; no value, gate or answer moves.
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m437-the-environment-caveat-said-once.mjs
import { openTables } from '../../scripts/data/table-io.mjs';

const MIGRATION = 'm437';
const TOPIC = 'Environment statements';
const ROW = { Section: 'Evidence', Topic: TOPIC, 'Definition / rule': 'Makers rarely give the concentration, temperature or duration: treat them as indications, not design data.' };

const t = openTables();
let changed = 0;
const held = t.find('method', TOPIC);
if (!held) { t.append('method', ROW); changed++; } else if (Object.entries(ROW).some(([k, v]) => held[k] !== v)) throw new Error(`${MIGRATION}: method ${TOPIC} is not what this migration wrote; the data moved`);
if (changed) t.save();
console.log(`${MIGRATION}: ${changed} method row(s) added`);
