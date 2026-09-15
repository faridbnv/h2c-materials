#!/usr/bin/env node
// Migration m29: an elastomer's Shore hardness is a measurement, so it leaves the estimate model's configuration
// (build/mappings/estimate-model.json hardness, keyed by GradeID) for measurements.csv (DECISIONS D60). The estimate
// stage converts it to stiffness exactly as before (Gent 1958 for Shore A, Qi et al. 2003 for Shore D).
//
// Every source was re-read on 2026-09-15 from its cached copy, SHA-256 matched:
// - PolyFlex TPU95 (S-POLYCN-PolyFlex-TPU95-TDS-V5-1) p. 3 prints "Shore hardness ISO 7619-1, GB/T 531.1 95A".
// - Bambu TPU for AMS (B-tpu-for-ams-TDS) p. 1, Basic Info: "With a Shore hardness of 68D".
// - Ultrafuse TPC 45D (S-TPC) p. 1, Product Description: "TPC 45D is a flexible, shore 45D, rubber-like ...".
// - Bambu TPU 95A HF, TPU 90A, TPU 85A and eSUN PEBA-90A print no hardness row; the scale is the product's name. They
//   are recorded with Data status "Nominal from product designation": numeric evidence of the product's grade of
//   hardness, never a headline, and not a test result.
// The retired grades the configuration also named (G044-01, G044-02) are left out: nothing may be recorded on them.
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { addValue } from './source-edits.mjs';

const MIGRATION = 'm29';
const DATE = '2026-09-15';
const NOMINAL = 'Nominal from product designation';

const ROWS = [
  { like: 'V000752', scale: 'A', value: 95, status: 'Published value', standard: 'ISO 7619-1, GB/T 531.1', locator: 'p. 3: Shore hardness', why: 'published in the source, never transcribed (re-read 2026-09-15; the value had been held in the estimate model\'s configuration).' },
  { like: 'V000768', scale: 'D', value: 68, status: 'Published value', standard: 'Not published', locator: 'p. 1: Basic Info, "Shore hardness of 68D"', why: 'published in the source\'s description, never transcribed (re-read 2026-09-15; held in the estimate model\'s configuration until now).' },
  { like: 'V001690', scale: 'D', value: 45, status: 'Published value', standard: 'Not published', locator: 'p. 1: Product Description, "shore 45D"', why: 'published in the source\'s description, never transcribed (re-read 2026-09-15; held in the estimate model\'s configuration until now).' },
  { like: 'V000784', scale: 'A', value: 95, status: NOMINAL, standard: 'Not published', locator: 'Product name: TPU 95A HF', why: 'the Shore scale in the product\'s name; the source prints no hardness row (re-read 2026-09-15).' },
  { like: 'V000803', scale: 'A', value: 90, status: NOMINAL, standard: 'Not published', locator: 'Product name: TPU 90A', why: 'the Shore scale in the product\'s name; the source prints no hardness row (re-read 2026-09-15).' },
  { like: 'V000819', scale: 'A', value: 85, status: NOMINAL, standard: 'Not published', locator: 'Product name: TPU 85A', why: 'the Shore scale in the product\'s name; the source prints no hardness row (re-read 2026-09-15).' },
  { like: 'V000838', scale: 'A', value: 90, status: NOMINAL, standard: 'Not published', locator: 'Product name: PEBA-90A', why: 'the Shore scale in the product\'s name; the source prints no hardness row (re-read 2026-09-15).' },
];

// TPC / TPEE's only mechanical record is its hardness, so its Mechanical coverage row can no longer say Gap: a new row says
// what is recorded, and the old one is superseded (AGENTS.md, Retire a duplicate record).
const TPC_MECHANICAL = 'C00516';

export function migrate(t) {
  const added = [];
  for (const r of ROWS) {
    added.push(addValue(t, {
      like: r.like, migration: MIGRATION, date: DATE, why: r.why,
      set: {
        Property: 'Hardness', 'Raw value': `${r.value}${r.scale}`, 'Raw unit': `Shore ${r.scale}`, 'Raw numeric': String(r.value),
        'Normalized value': String(r.value), 'Normalized unit': `Shore ${r.scale}`, 'Data status': r.status,
        'Specimen type': 'Not published', 'Post-processing': 'Not published', 'Standard / load': r.standard,
        'Specimen / print parameters': 'Not published', Locator: r.locator,
      },
    }));
  }
  const old = t.get('coverage', TPC_MECHANICAL);
  if (old.Status !== 'Superseded') {
    const hardness = t.rows('measurements').find((r) => r.GradeID === 'G046-01' && r.Property === 'Hardness').MeasurementID;
    const id = t.nextId('coverage');
    t.append('coverage', { CoverageID: id, MaterialID: 'M046', Domain: 'Mechanical', Status: 'Reviewed with limitations',
      Finding: `Shore hardness 45D recorded ${DATE} (${MIGRATION}, ${hardness}) from the Ultrafuse TPC 45D data sheet's description; no tensile, flexural or impact value is published for the selected grade, and none is substituted.` });
    t.set('coverage', TPC_MECHANICAL, 'Finding', `Superseded by ${id} (${DATE}; was "${old.Status}"): ${old.Finding}`, { expect: old.Finding });
    t.set('coverage', TPC_MECHANICAL, 'Status', 'Superseded', { expect: old.Status });
  }
  return added;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record}`);
}
