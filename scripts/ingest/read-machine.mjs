// The importer's own deterministic sheet reader (readSheet, scripts/ingest/propose.mjs) as an independent second reader
// for the reader round: it reads the text layer by rule, so where a vision reading and the rule agree on a setting's
// numbers or a value on the same page, two unlike readers have seen the same thing.
//
// The test-bar filter is the one scripts/audit/context-witness.mjs applies to the reader's settings (that file is a
// script with top-level effects and cannot be imported): a setting a few lines under "How to make specimens" or beside
// an infill is how the bars were printed, not guidance.

import { join } from 'node:path';
import { loadTables } from '../../build/src/load.js';
import { withReadingOrder } from '../lib/pdf-layout.mjs';
import { projectRoot } from './context.mjs';
import { numbersIn, sameNumber } from './read-common.mjs';

const SPECIMEN_BLOCK = /h\s*o\s*w\s+t\s*o\s+m\s*a\s*k\s*e\s+s\s*p\s*e\s*c\s*i\s*m\s*e\s*n|specimens? (were|was) printed|printed (under|at) the following|printed specimen conditions|print test condition|test equipment|\binfill\s*[:=]?\s*\d|\bshell\s+\d|top\s*&\s*bottom\s+layer/i;

export function inSpecimenBlock(pages, x) {
  const line = x.line.replace(/\s+/g, ' ').trim(); const raw = String(x.raw ?? '').replace(/\s+/g, ' ').trim();
  for (const p of pages ?? []) {
    for (let i = 0; i < p.lines.length; i++) {
      const own = p.lines[i] === line || p.lines[i].includes(line.slice(0, 40));
      const below = x.label && p.lines[i].toLowerCase().startsWith(x.label.toLowerCase()) && raw && (p.lines[i + 1] ?? '').includes(raw.slice(0, 12));
      if (own || below) {
        for (let k = i; k >= Math.max(0, i - 8); k--) {
          if (k < i && /^\s*\d+\.\s+\S|^(notes?|precautions?|tips?)\b/i.test(p.lines[k + 1] ?? '')) return false;
          if (SPECIMEN_BLOCK.test(p.lines[k] ?? '')) return true;
        }
        return false;
      }
    }
  }
  return false;
}

let registry;
/** The property registry readSheet needs: the Property registry sheet, keyed by property. */
export function propertyRegistry() {
  registry ??= new Map(loadTables(join(projectRoot, 'data'))['Property registry'].rows.map((p) => [p.Property, p]));
  return registry;
}

const normalised = (text) => text.pages.map((p) => ({ page: p.page, lines: p.lines.map((l) => String(l.text ?? '').replace(/\s+/g, ' ').replace(/(\d)\s*([.,])\s*(\d)/g, '$1$2$3')) }));

/** What the rule reads from one cached text: { values: [{page, property, number, upper, direction}], settings: [{page, field, raw, numbers}] }. */
export async function machineReading(text, registryMap = propertyRegistry()) {
  const { readSheet } = await import('./propose.mjs');
  const read = readSheet(text, registryMap, { layout: true });
  const lines = normalised(text), blocks = normalised(withReadingOrder(text, { memo: true }));
  return {
    values: read.values.map((v) => ({ page: v.page, property: v.property, number: v.read?.rawNumber ?? null, upper: v.read?.upper ?? null, direction: v.direction, line: v.line })),
    settings: read.settings
      .filter((x) => !/infill/i.test(x.line) && !inSpecimenBlock(x.viaLayout ? blocks : lines, x))
      .map((x) => ({ page: x.page, field: x.field, raw: x.raw, numbers: statedNumbers(x.raw), line: x.line })),
  };
}

/** The numbers a cell states ("for more than 4 hours" states 4). */
export const statedNumbers = (v) => numbersIn(String(v ?? ''));

const subset = (a, b) => a.every((x) => b.some((y) => sameNumber(x, y)));

/**
 * Does the machine reading bear out a vision row: a setting by the same field, page and numbers (drying may omit its
 * hours), a value by the same property, page and number? `compatible(direction)` says whether a printed direction could be the row's.
 */
export function machineAgrees(machine, row, { hours = null, compatible = () => true, textAgrees = () => false } = {}) {
  if (!machine) return false;
  const page = Number(row.page);
  if (row.kind === 'setting') {
    const mine = [row.number_lo, row.number_hi].filter((n) => n !== '' && n != null).map(Number);
    if (hours != null) mine.push(hours);
    const field = row.field === 'hardened_nozzle' ? 'nozzle-material' : row.field;
    return machine.settings.some((s) => {
      if (s.page !== page || s.field !== field) return false;
      if (!mine.length || !s.numbers.length) return textAgrees(row.raw, s.raw);
      // A sheet that adds a Fahrenheit beside the Celsius states the same setting: the leading numbers must be the row's.
      return field === 'drying' ? subset(mine, s.numbers) : mine.every((n, i) => s.numbers[i] != null && sameNumber(n, s.numbers[i]));
    });
  }
  if (row.kind === 'value') {
    if (row.number_lo === '') return false;
    return machine.values.some((v) => v.page === page && v.property === row.field && v.number != null && sameNumber(row.number_lo, v.number) && compatible(v.direction));
  }
  return false;
}
