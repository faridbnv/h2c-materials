// Plan the 2026-09-13 coverage consolidation: every workbook change, computed from the compiled
// snapshot and the rules in build/src/coverage-rules.js, written to plan.json for review.
// apply-workbook-changes.py applies plan.json and nothing else.
//
//   npm run build && node docs/audits/2026-09-13-coverage-consolidation/plan.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyTopic } from '../../../build/src/normalize/chemical.js';
import { ENVIRONMENT_CATEGORIES, CLAIMS_EVIDENCE, CLAIMS_ABSENCE, domainData, manufacturerCount } from '../../../build/src/coverage-rules.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');
const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
const byName = new Map(db.materials.map((m) => [m.name, m]));

// ---------------------------------------------------------------------------------- 1. evidence
// The "Other Physical and Chemical Properties" table of each Bambu data sheet below was re-read on
// 2026-09-13 from a file whose SHA-256 equals the digest in the Sources sheet. Only rows missing from
// the workbook for that material and source are added. Wording is the source's, with the spaces the
// PDF text layer drops restored.
const STANDARD = {
  Solubility: 'Insoluble in water',
  'Resistance to Acid': 'Not resistant',
  'Resistance to Alkali': 'Not resistant',
  'Resistance to Organic Solvent': 'Not resistant to some organic solvents',
  'Resistance to Oil and Grease': 'Resistant to most kinds of oil and grease',
  Flammability: 'Flammable',
};
const SHEETS = [
  ['PLA Tough+', 'B-pla-tough-upgrade-TDS', 2, {}],
  ['PLA Translucent', 'B-pla-translucent-TDS', 3, {}],
  ['PLA Silk+', 'B-pla-silk-upgrade-TDS', 3, {}],
  ['PLA Silk Dual Color', 'B-pla-silk-dual-color-TDS', 3, {}],
  ['PLA Sparkle', 'B-pla-sparkle-TDS', 3, { Flammability: 'Flammable and self-extinguishing in the air' }],
  ['PLA Galaxy', 'B-pla-galaxy-TDS', 3, {}],
  ['PLA Aero', 'B-pla-aero-TDS', 3, {}],
  ['PETG HF', 'B-petg-hf-TDS', 3, {}],
  ['ABS-GF', 'B-abs-gf-TDS', 3, { 'Resistance to Acid': 'Resistant', 'Resistance to Alkali': 'Resistant', 'Resistance to Oil and Grease': 'Not resistant to some kinds of oil and grease' }],
  ['PC FR', 'B-pc-fr-TDS', 3, { Flammability: 'Flame retardant' }],
  ['TPU for AMS', 'B-tpu-for-ams-TDS', 3, {}],
  ['TPU 90A', 'B-TPU-SOFT-TDS-4', 3, {}],
  ['TPU 85A', 'B-TPU-SOFT-TDS-5', 3, {}],
  ['PA6-GF', 'B-pa6-gf-TDS', 3, {}],
  ['PET-CF', 'B-pet-cf-TDS', 3, {}],
  ['PPS-CF', 'B-pps-cf-TDS', 3, { 'Resistance to Acid': 'Resistant', 'Resistance to Alkali': 'Resistant', 'Resistance to Organic Solvent': 'Resistant', 'Resistance to Oil and Grease': 'Resistant', Flammability: 'Self-extinguishing when away from fire; flame-retardant' }],
  ['PVA', 'B-pva-TDS', 3, { Solubility: 'Soluble in water' }],
  ['Support for PLA/PETG', 'B-support-for-pla-petg-TDS', 3, {}],
  ['Support for PA/PET', 'B-support-for-pa-pet-TDS', 2, { Flammability: 'Flammable and self-extinguishing in the air' }],
];
const DOMAIN = { Solubility: 'Support / solubility', Flammability: 'Flammability' };

const lastEvidence = Math.max(...db.evidence.map((e) => Number(e.id.slice(1))));
const newEvidence = [];
for (const [name, sourceId, page, overrides] of SHEETS) {
  const m = byName.get(name);
  if (!m) throw new Error(`No material named ${name}`);
  const grade = db.grades.find((g) => g.materialId === m.id && g.sourceId === sourceId);
  if (!grade) throw new Error(`${name}: no grade cites ${sourceId}`);
  for (const [topic, standard] of Object.entries(STANDARD)) {
    if (db.evidence.some((e) => e.materialId === m.id && e.sourceId === sourceId && e.topic === topic)) continue;
    newEvidence.push({
      EvidenceID: `Q${String(lastEvidence + newEvidence.length + 1).padStart(5, '0')}`,
      MaterialID: m.id, GradeID: grade.id, Domain: DOMAIN[topic] ?? 'Chemical exposure', Topic: topic,
      Finding: overrides[topic] ?? standard,
      'Exposure / conditions': `p. ${page}; concentration, duration and temperature not specified unless stated. Not a chemical design limit.`,
      'Rating 1–5': 'Not published', RubricID: 'Not applicable', 'Evidence type': 'Manufacturer statement',
      SourceID: sourceId, Locator: topic,
    });
  }
}

// The snapshot as it will be once those rows exist, for the rules below.
const evidence = [...db.evidence, ...newEvidence.map((r) => ({ id: r.EvidenceID, materialId: r.MaterialID, category: classifyTopic(r.Topic).category }))];
const future = { ...db, evidence };

// ------------------------------------------------------------- 2. Materials: Environmental evidence
// The column cites exactly the material's own exposure, solubility and moisture records. It had become
// a copy of family application notes for 31 materials ("Best uses", "Warping / emissions") and left
// out records the material did have for 26.
const materialEdits = [];
for (const m of db.materials) {
  const own = evidence.filter((e) => e.materialId === m.id && ENVIRONMENT_CATEGORIES.has(e.category)).map((e) => e.id).sort();
  const want = own.length ? own.join('; ') : 'Not published';
  const have = m.evidenceIds.environmental.length ? [...m.evidenceIds.environmental].sort().join('; ') : 'Not published';
  if (want !== have) materialEdits.push({ MaterialID: m.id, name: m.name, column: 'Environmental evidence', before: have, after: want });
}

// ------------------------------------------------------------------------------- 3. coverage rows
// A row may not say Gap beside data, and may not claim evidence without it. Each contradiction gets a
// status and a finding written for what is actually on record.
const SPECIFIC = {
  C00306: ['Limited comparability', 'Elongation at break 98% (V000508) is recorded with no stated direction, so it cannot be an XY headline. No other mechanical value is published.'],
  C00447: ['Evidence recorded', 'HDT 74 °C and 49 °C (V000765, V000766, transcription corrected) are recorded for grade G039-02. It is not the representative grade, so neither is the headline.'],
  C00435: ['Evidence recorded', 'BASF Ultrafuse PC GF30 profile P0158 publishes nozzle, bed and drying; P0048 publishes a bed temperature only.'],
  C00879: ['Partially resolved', 'Only a bed temperature (40-60 °C, P0104) is published. Nozzle and chamber temperatures are not.'],
  C01144: ['Reviewed with limitations', 'The cited IPCON TDS was re-read 2026-09-13 (SHA-256 matches): nozzle and bed are published, the chamber temperature is not.'],
  C00576: ['Limited comparability', 'The only mechanical records are 12 fatigue results for the study grade G052-R1, which is not a procurement grade. No tensile, flexural or impact value is published for a PA12 grade.'],
  C00706: ['Partially resolved', 'Only a crystallization temperature (180.3 °C, V001237) is published. No HDT, glass transition, Vicat or melting value.'],
  C01145: ['Reviewed with limitations', 'The cited IPCON TDS was re-read 2026-09-13 (SHA-256 matches): nozzle and bed are published, the chamber temperature is not.'],
};
const coverageEdits = [];
const unplanned = [];
const recovered = new Set(newEvidence.map((r) => r.MaterialID));
for (const m of db.materials) {
  const data = domainData(future, m);
  for (const c of db.coverage.filter((x) => x.materialId === m.id && data[x.domain] !== undefined)) {
    const has = data[c.domain].length > 0;
    let edit = SPECIFIC[c.id];
    if (!edit && c.domain === 'Moisture / environmental') {
      if (has && (CLAIMS_ABSENCE.has(c.status) || recovered.has(m.id))) {
        edit = ['Evidence recorded', `${data[c.domain].length} exposure, solubility or moisture record(s) from this material's own sources. Test conditions are rarely stated; not a chemical design limit.`];
      } else if (!has && CLAIMS_EVIDENCE.has(c.status)) {
        edit = ['Gap', 'No exposure, solubility or moisture record from this material\'s own sources. Records cited for its family are context, not evidence for this grade.'];
      }
    }
    if (!edit && ((has && CLAIMS_ABSENCE.has(c.status)) || (!has && CLAIMS_EVIDENCE.has(c.status)))) {
      unplanned.push(`${m.name} ${c.id} ${c.domain} "${c.status}" (${data[c.domain].length} records: ${data[c.domain].slice(0, 5).join(', ')}) — ${c.finding}`);
    }
    if (edit && (edit[0] !== c.status || edit[1] !== c.finding)) {
      coverageEdits.push({ CoverageID: c.id, name: m.name, domain: c.domain, before: [c.status, c.finding], after: edit });
    }
  }
  for (const c of db.coverage.filter((x) => x.materialId === m.id && x.domain === 'Grades')) {
    const n = c.finding.match(/^(\d+) distinct manufacturer\(s\)/);
    if (n && Number(n[1]) !== manufacturerCount(db, m)) throw new Error(`${m.name} ${c.id} quotes ${n[1]} manufacturers; there are ${manufacturerCount(db, m)}`);
  }
}

if (unplanned.length) {
  console.error(`${unplanned.length} coverage rows contradict their data with no planned correction:\n${unplanned.join('\n')}`);
  process.exit(1);
}

const plan = { workbookSha256: '31a1e17d394ad3552a035e80994decae2d4301d6b19a4ce2c7c9f8b0352dbe52', newEvidence, materialEdits, coverageEdits };
writeFileSync(join(here, 'plan.json'), JSON.stringify(plan, null, 2) + '\n');
console.log(`evidence rows ${newEvidence.length}, Environmental evidence edits ${materialEdits.length}, coverage edits ${coverageEdits.length}`);
