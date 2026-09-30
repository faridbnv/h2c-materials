// Source-grounded expectations for the gap-fill tranche, asked of the compiled database. Each was written from the page
// it cites, before this script ran, and says what the page does and does not allow: they are not the engine's parity
// tests, which prove the page agrees with the engine, not that either agrees with the source.
//
//   node docs/audits/2026-09-29-gap-fill-implementation/oracles.mjs     writes ORACLES.json beside it
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { locate } from '../../../scripts/data/source-store.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');
const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
const replay = JSON.parse(readFileSync(join(here, 'FROZEN-REPLAY.json'), 'utf8'));
const results = [];
const check = (name, source, fn) => { fn(); results.push({ name, source, status: 'PASS' }); };
const ms = (g, p) => db.measurements.filter((m) => m.gradeId === g && m.property === p);
const grade = (g) => db.grades.find((x) => x.id === g);
const profile = (id) => db.profiles.find((p) => p.id === id);

check('Flex VX glass transition is -32 °C, as the page prints it, with no specimen or direction', 'R-NANOVIA-Flex-VX p. 1 "Tg -32 °C"', () => {
  const x = ms('G167-08', 'Glass transition temperature');
  assert.equal(x.length, 1); assert.equal(x[0].value, -32); assert.equal(x[0].specimenForm, 'not-stated');
});
check('ISTROFLEX elongation "> 300 %" is a lower bound, never a point value', 'R-NANOVIA-ISTROFLEX p. 1 "Elong. at break > 300 % ISO 527"', () => {
  const x = ms('G167-12', 'Elongation at break');
  assert.equal(x.length, 1); assert.equal(x[0].operator, '>'); assert.equal(x[0].value, 300);
  const h = grade('G167-12').headline.elongationXY;
  assert.equal(h.interval.lo, 300); assert.equal(h.interval.hi, null); assert.equal(h.level, 'as-published');
});
check('PA Food Industry: 4,0 % is the strain at the ultimate strength, not an elongation at break; the strength is 83 MPa', 'R-NANOVIA-PA-Food-Industry p. 1', () => {
  assert.equal(ms('G164-07', 'Tensile strain at strength')[0].value, 4);
  assert.equal(ms('G164-07', 'Elongation at break').length, 0);
  assert.equal(ms('G164-07', 'Tensile strength (endpoint unspecified)')[0].value, 83);
});
check('Flex V0\'s "Tensile resistance 27 MPa VDE282 part 10" is held: no value of 27 is recorded for it', 'R-NANOVIA-Flex p. 1; GF-RB043-0008', () => {
  assert.equal(db.measurements.filter((m) => m.gradeId === 'G167-09' && m.value === 27).length, 0);
  assert.equal(ms('G167-09', 'Hardness').map((m) => m.value).sort((a, b) => a - b).join(), '40,90');
});
check('FLEX HARD CF\'s drying is held: its page prints 6 h in one place and 12 h in another, and the catalogue 6 h', 'GF-RB036-0008', () => {
  assert.equal(grade('G129-02').print.drying ?? null, null);
  assert.equal(db.sources.filter((s) => /flex-hard-cf/.test(s.url ?? '') && s.accessDate === '2026-09-29').length, 0);
});
check('Nobufil PCTG CF: the FDM H column is printed and states no usable direction; the Injection column is moulded', 'R-3DJAKE-3DJAKE-PCTG-CF-tech-data p. 1 (page image)', () => {
  const t = ms('G144-02', 'Tensile strength (endpoint unspecified)');
  assert.deepEqual(t.map((m) => [m.value, m.specimenForm]).sort(), [[39, 'printed'], [60, 'moulded']]);
  assert.equal(grade('G144-02').headline.tensileStrengthXY.value, 39);
  assert.equal(grade('G144-02').headline.tensileStrengthXY.level, 'as-published');
  const hdt = db.measurements.find((m) => m.id === 'V008864');
  assert.equal(hdt.specimenForm, 'printed'); assert.equal(hdt.value, 72);
  assert.equal(grade('G144-02').headline.hdt045 ?? null, null);
  const izod = ms('G144-02', 'Izod impact strength');
  assert.equal(izod.length, 4);
});
check('Conductive Filaflex: the page\'s 0.4 mm row (250 °C) and bed (50-55 °C for large parts) are within the H2C; its chamber stays unknown', 'R-RECREUS-PRINT-20260929-5fe4f7191bfc', () => {
  const p = grade('G157-01').print;
  assert.equal(p.nozzle.verdict, 'within'); assert.equal(p.nozzle.max, 250);
  assert.equal(p.bed.verdict, 'within'); assert.equal(p.bed.max, 55);
  assert.equal(p.chamber.verdict, 'unknown');
});
check('A drying-only profile reads no nozzle, bed or chamber, and fills no gate', 'b40 and m225', () => {
  const ids = db.profiles.filter((p) => /^R-EXTRUDR-PRINT-20260929-|^D-EXTRUDR-FLEX-MEDIUM-MATT-PAGE$|^S-ESUN-PRINT-20260928-c7b961702f53$/.test(p.sourceId));
  assert.equal(ids.length, 10);
  for (const p of ids) { assert.equal(p.nozzle.state, 'unknown'); assert.equal(p.bed.state, 'unknown'); assert.equal(p.chamber.state, 'unknown'); assert.equal(p.drying.state, 'stated'); }
});
check('eSUN PA-CF: XY and Z values are comparable by their stated direction; the Izod values name no notch and decide no impact headline', 'S-ESUN-PRINT-20260928-333834d1b9db p. 1', () => {
  const g = grade('G156-01');
  assert.equal(g.headline.tensileStrengthXY.value, 84.05); assert.equal(g.headline.tensileStrengthXY.level, 'comparable');
  assert.equal(g.headline.tensileStrengthZ.value, 50.34);
  assert.equal(g.headline.izodNotched ?? null, null);
  assert.equal(g.print.drying.tempC, 70);
});
check('The frozen replay moved two answers, both to FAIL on a published value, and made no new PASS', 'FROZEN-REPLAY.json', () => {
  assert.equal(replay.newPasses, 0);
  assert.deepEqual(replay.transitions, { 'default/material/UNKNOWN→FAIL': 1, 'default/product/UNKNOWN→FAIL': 1 });
  const failed = replay.changes.find((c) => c.level === 'product');
  assert.equal(failed.id, 'G156-01');
  assert.ok(failed.results.some((r) => r.status === 'FAIL' && /elongation/i.test(r.criterion)));
});
check('Every source the tranche cites still hashes to its recorded digest', 'sources.csv', () => {
  const ids = db.sources.filter((s) => /-PRINT-20260929-/.test(s.id)).map((s) => s.id);
  assert.equal(ids.length, 9);
  for (const s of db.sources.filter((x) => ids.includes(x.id) || ['R-NANOVIA-PA-Food-Industry', 'R-NANOVIA-Flex-B4C', 'R-NANOVIA-Flex-VX', 'R-NANOVIA-Flex', 'R-NANOVIA-ISTROFLEX', 'R-NANOVIA-TPE-22D', 'S-ESUN-PRINT-20260928-333834d1b9db', 'S-ESUN-PRINT-20260928-c7b961702f53', 'R-3DJAKE-3DJAKE-PCTG-CF-tech-data', 'R-EXTRUDR-PRINT-20260928-526b472f69cc', 'R-EXTRUDR-PRINT-20260928-83ec5c0b3125', 'D-EXTRUDR-FLEX-MEDIUM-MATT-PAGE'].includes(x.id))) {
    const found = locate(s.sha256, s.id);
    assert.equal(found.bytes, 'present', s.id);
    assert.equal(createHash('sha256').update(readFileSync(found.path)).digest('hex'), s.sha256, s.id);
  }
});

const report = { status: 'PASS', release: db.meta.release.id, by: 'Claude (claude-opus-5-5), an agent; expectations written from the cited pages', checks: results };
writeFileSync(join(here, 'ORACLES.json'), `${JSON.stringify(report, null, 1)}\n`);
console.log(`${results.length} source-grounded expectations PASS against release ${db.meta.release.id}`);
