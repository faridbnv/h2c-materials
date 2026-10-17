#!/usr/bin/env node
// A record of the material pages round (2026-10-16 and 17). Since step 3 these checks run in verify as the CNT section
// of test/pages.check.js (npm run pages:check), which folded them in; this copy still runs, and is kept as the round's.
//
// Cross-section counts on every material page: renders each page the page rule admits (and its records page) from
// dist/db.json, and checks that the counts one section gives agree with the counts another gives for the same thing,
// each on its stated basis. A reviewer found them disagreeing (2026-10-16): "64 of 73 publish a drying schedule" beside
// "drying schedule not stated, 33 products"; "1,056 measured values" beside "1,068 measurements"; "the 23 that give a
// chamber temperature" beside a figure counting 22. Run after a change to a page section:
//
//   node docs/audits/2026-10-16-material-pages-round/page-counts.mjs        # every page; exit 1 on a disagreement
//
// Checks, per page:
//   drying        Printing's drying advice: own + shared + guide = the count it states, and no more than the products
//   measurements  Sources' measurement records = the records page's measurements count = the closing link's count;
//                 its "with a number" = the compiled count of numeric values
//   chamber       the chamber finding's "N whose sheets give a chamber temperature" = the chamber panel's counted n
//   windows       the first screen's "most of N products accept" (nozzle, bed) = that setting's panel n, where drawn
//   density       Physical's "the median of N products" = At a glance's density row
//   impact        each impact row's "X shown, Y compared" = At a glance's row for that test, where both are drawn

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMaterialPage, renderRecordsPage, pageEnv, prepare } from '../../../app/pages/render.js';
import { indexDb, materialContext } from '../../../app/js/ui/material-facts.js';
import { pageOf } from '../../../app/js/ui/page-rule.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
prepare(db);
const env = pageEnv(db, { selectorFile: 'selector.html' });
const ix = indexDb(db);
const ids = db.materials.filter((m) => !m.familyEntry && pageOf(m, ix.measurementsByMaterial.get(m.id) ?? [])).map((m) => m.id);

const num = (s) => Number(String(s).replace(/,/g, ''));
const text = (html) => html.replace(/<[^>]+>/g, '').replace(/&#39;/g, '\'').replace(/&amp;/g, '&').replace(/⁠/g, '');
const section = (html, id) => (new RegExp(`<section class="sec" id="${id}"[\\s\\S]*?(?=<section class="sec|</main>)`).exec(html) ?? [''])[0];
const fails = [];
let checks = 0;
const check = (id, what, ok, detail) => { checks++; if (!ok) fails.push(`${id} ${what}: ${detail}`); };

for (const id of ids) {
  const c = materialContext(db, id, { showEstimates: true });
  const page = renderMaterialPage(db, id, env).html;
  let records = null;
  try { records = renderRecordsPage(db, id, env).html; } catch (e) { fails.push(`${id} records page: ${e.message}`); }

  // Drying: the parts add up to the whole, and the sentence says the whole.
  const dry = /data-drying-have="(\d+)" data-drying-own="(\d+)" data-drying-twin="(\d+)" data-drying-guide="(\d+)" data-products="(\d+)"/.exec(page);
  if (dry) {
    const [have, own, twin, guide, products] = dry.slice(1).map(Number);
    check(id, 'drying', own + twin + guide === have && have <= products, `${own} + ${twin} + ${guide} against ${have} of ${products}`);
    const said = /(\d+) of (\d+) products? ha(?:s|ve) drying advice/.exec(text(section(page, 'printing')));
    if (have) check(id, 'drying sentence', said && num(said[1]) === have && num(said[2]) === products, `says ${said?.[0]}, counted ${have} of ${products}`);
  }

  // Measurement records: Sources, the records page and the closing link count them alike.
  const inv = /data-count="measurements" data-n="(\d+)"/.exec(section(page, 'sources'));
  check(id, 'measurements', inv && Number(inv[1]) === c.ms.length, `Sources ${inv?.[1]}, records ${c.ms.length}`);
  const withNumber = /measurement records, ([\d,]+) with a number/.exec(text(section(page, 'sources')));
  check(id, 'measurements with a number', withNumber && num(withNumber[1]) === c.summary.numericMeasurements, `Sources ${withNumber?.[1]}, compiled ${c.summary.numericMeasurements}`);
  if (records) {
    const rec = /data-count="measurements" data-n="(\d+)"/.exec(records);
    check(id, 'records page measurements', rec && Number(rec[1]) === c.ms.length, `records page ${rec?.[1]}, records ${c.ms.length}`);
  }
  const link = /Every record behind this page: ([\d,]+) measurements?/.exec(text(page));
  check(id, 'closing link', link && num(link[1]) === c.ms.length, `link ${link?.[1]}, records ${c.ms.length}`);

  // Chamber: the finding's count and the panel's.
  const printing = section(page, 'printing');
  const chamberSaid = /The (\d+) whose sheets give a chamber temperature/.exec(text(printing)) ?? (/The one whose sheet gives a chamber temperature/.test(text(printing)) ? [null, '1'] : null);
  const chamberPanel = /class="pw" data-setting="chamber" data-n="(\d+)"/.exec(printing);
  if (chamberSaid && chamberPanel) check(id, 'chamber', num(chamberSaid[1]) === Number(chamberPanel[1]), `finding ${chamberSaid[1]}, figure ${chamberPanel[1]}`);

  // Nozzle and bed: the first screen's count and the panel's.
  for (const axis of ['nozzle', 'bed']) {
    const first = new RegExp(`data-key="${axis}"[\\s\\S]*?<small>(?:most of|all) (\\d+) products accept</small>`).exec(page);
    const panel = new RegExp(`class="pw" data-setting="${axis}" data-n="(\\d+)"`).exec(printing);
    if (first && panel) check(id, `${axis} window`, Number(first[1]) === Number(panel[1]), `first screen ${first[1]}, figure ${panel[1]}`);
  }

  // Density: Physical's median count and At a glance's.
  const glanceDensity = /data-kf="density" data-median="[^"]*" data-min="[^"]*" data-max="[^"]*" data-n="(\d+)"/.exec(page);
  const physical = /Density is typically .+? kg\/m³, the median of (\d+) products/.exec(text(section(page, 'physical')));
  if (glanceDensity && physical) check(id, 'density', Number(glanceDensity[1]) === Number(physical[1]), `At a glance ${glanceDensity[1]}, Physical ${physical[1]}`);

  // Impact: each row's compared count and At a glance's.
  for (const key of ['charpyNotched', 'izodNotched']) {
    const row = new RegExp(`data-headline="${key}"[\\s\\S]*?<small>(\\d+) shown, (\\d+) compared</small>`).exec(section(page, 'mechanical'));
    const glance = new RegExp(`data-kf="${key}" data-median="[^"]*" data-min="[^"]*" data-max="[^"]*" data-n="(\\d+)"`).exec(page);
    if (row && glance) check(id, key, Number(row[2]) === Number(glance[1]), `figure ${row[2]} compared, At a glance ${glance[1]}`);
  }
}

console.log(`${ids.length} pages, ${checks} checks, ${fails.length} disagreements`);
for (const f of fails) console.log(`  ${f}`);
process.exit(fails.length ? 1 : 0);
