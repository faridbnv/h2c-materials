#!/usr/bin/env node
// Migration m402 (2026-10-07): The Filament's TPU 95A, 87A and 82A sheets held once (quality round 2026-10-07, item 5;
// D89, R053, D134).
//
// 3DJake's "THE FILAMENT TPU 95A" document and Spectrum's own sheet of that name read line for line the same (the round's
// source-pair reading, and a comparison of the cached text: 39 lines of 39 alike), and so do the 87A and 82A pairs. The
// Filament is Spectrum Group's brand; b32 recorded its ASA, ASA CF, HT-PLA, PLA Matte, PLA Lite and PETG Lite listings as
// twins of Spectrum's products under Spectrum's sheet as the formulation key, with the values held once on Spectrum's
// product. The three TPU listings were left holding a copy of every value under the retailer's document. This files them
// as b32 did: each takes its Spectrum product's sheet as its key; each copied value is retired as a duplicate record naming
// the one that stays; a value only the copy held (Shore hardness 87A and 82A) is recorded on the Spectrum product from
// Spectrum's own sheet first, its quote checked on the cached page. Their print profiles and statements stay theirs, as
// b32's twins' did. A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m402-the-filament-tpu-sheets-held-once.mjs [--dry-run]
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';

const MIGRATION = 'm402';
const DATE = '2026-10-07';
const PAIRS = [
  { copy: 'G039-53', maker: 'G039-05', copySource: 'R-3DJAKE-3DJAKE-EN-TDS-The-Filament-TPU-95A', makerSource: 'S-SPECTRUM-en-tds-the-filament-tpu-95a' },
  { copy: 'G039-54', maker: 'G039-06', copySource: 'R-3DJAKE-3DJAKE-EN-TDS-The-Filament-TPU-87A', makerSource: 'S-SPECTRUM-en-tds-the-filament-tpu-87a' },
  { copy: 'G039-56', maker: 'G039-09', copySource: 'R-3DJAKE-3DJAKE-EN-TDS-The-Filament-TPU-82A', makerSource: 'S-SPECTRUM-en-tds-the-filament-tpu-82a' },
];
// The maker's own line for a value only the copy held, as its sheet prints it.
const MAKER_LINES = { 'G039-54|Hardness': { raw: '87A', quote: 'Shore hardness A 87A ISO 7619-1' }, 'G039-56|Hardness': { raw: '82A', quote: 'Shore hardness A 82A ISO 7619-1' } };
const RETIRED = 'Retired duplicate record';
const live = (m) => !/^Retired/.test(m['Data status']);
const t = openTables();
let changed = 0;

for (const p of PAIRS) {
  const copy = t.get('grades', p.copy), maker = t.get('grades', p.maker);
  if (copy.MaterialID !== maker.MaterialID) throw new Error(`${MIGRATION}: ${p.copy} and ${p.maker} are on two materials`);
  if (copy['Shared formulation key'] !== p.makerSource) {
    t.set('grades', p.copy, 'Shared formulation key', p.makerSource, { expect: p.copySource, migration: MIGRATION });
    changed++;
  }
  for (const m of t.rows('measurements').filter((r) => r.GradeID === p.copy && r.SourceID === p.copySource && live(r))) {
    let stays = t.rows('measurements').find((r) => r.GradeID === p.maker && live(r) && r.Property === m.Property && Number(r['Normalized value']) === Number(m['Normalized value']) && r['Normalized unit'] === m['Normalized unit']);
    if (!stays) {
      const line = MAKER_LINES[`${p.copy}|${m.Property}`];
      if (!line) throw new Error(`${MIGRATION}: ${m.MeasurementID} (${m.Property} ${m['Raw value']}) has no counterpart on ${p.maker} and no line of the maker's sheet named for it`);
      onCachedSheet(t, p.makerSource, line.quote, MIGRATION);
      const id = t.nextId('measurements');
      t.append('measurements', {
        ...m, MeasurementID: id, GradeID: p.maker, MaterialID: maker.MaterialID, SourceID: p.makerSource, 'Raw value': line.raw,
        Notes: `Added ${DATE} (${MIGRATION}): published in the source, never transcribed. p. 1, "Shore hardness A" under "General Properties": the page prints "${line.quote}"; checked on the cached page. The same line on 3DJake's copy of the sheet was held as ${m.MeasurementID}, now retired for this row.`,
      });
      stays = t.get('measurements', id);
      changed++;
    }
    t.set('measurements', m.MeasurementID, 'Data status', RETIRED, { expect: m['Data status'], migration: MIGRATION });
    t.set('measurements', m.MeasurementID, 'Notes', `${m.Notes} Retired ${DATE} (${MIGRATION}): 3DJake's document is Spectrum's sheet line for line; the value is held once, as ${stays.MeasurementID} on ${maker.Manufacturer} ${maker['Product name']} (${p.maker}), which this product reads as its twin (D89, R053).`, { expect: m.Notes, migration: MIGRATION });
    changed++;
  }
}
if (process.argv.includes('--dry-run')) { console.log(`${MIGRATION}: ${changed} change(s) (dry run)`); process.exit(0); }
if (changed) t.save();
console.log(`${MIGRATION}: ${changed} change(s)`);
