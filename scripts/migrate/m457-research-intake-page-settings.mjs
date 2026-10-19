#!/usr/bin/env node
// Migration m457 (2026-10-19): the settings the research intake's pages print beside the one the research read (the
// research intake, stage 9; docs/audits/2026-10-19-research-intake/).
//
// The research agent read makers' pages for drying or a fibre load, and m454 recorded what it read. The context audit
// (npm run audit:context) then found that several of those pages print the rest of a print recipe too, which the new
// profiles left Not published: Extrudr's DuraPro PA12 CF page, Spectrum's PLA Magic SILK guide, SUNLU's guide (its PCL
// row), 3D4Makers' PEEK article, Polymaker's Panchroma Satin page, FormFutura's PPSU page and MatterHackers' PA CF page;
// eSUN's ABS+ page says an enclosure is necessary; and Polymaker's PolyLite PLA-CF page, registered for its fibre load,
// prints a specification table its product holds no profile from. Each cell is the page's own words, checked on the
// cached, hash-checked page, and typed by the build's own parsers (the readers learnt "Enclosure needed: 90°C heated
// chamber" and "Stainless Steel, Olsson Ruby, or other hardened nozzle types" for it, D168). A re-run is a no-op, and a
// run after the data moved stops.
//
//   node scripts/migrate/m457-research-intake-page-settings.mjs [--dry-run]
import { openTables, nextId } from '../data/table-io.mjs';
import { onCachedSheet } from '../lib/read-proposals-apply.mjs';
import { retype, typedOf } from '../lib/profile-settings.mjs';

const MIGRATION = 'm457';
const NP = 'Not published';
const t = openTables();
// [ProfileID, column, value, quote on the page, Locator part]
const CELLS = [
  ['P1970', 'Nozzle °C', '260–290 °C', 'Nozzle temperature  260–290 °C', 'p. 1: Nozzle temperature'],
  ['P1970', 'Bed °C', '110 °C', 'Build plate temperature  110 °C', 'p. 1: Build plate temperature'],
  ['P1970', 'Enclosure', 'Enclosed chamber required Yes', 'Enclosed chamber required  Yes', 'p. 1: Enclosed chamber required'],
  ['P1971', 'Nozzle °C', '210–240 °C', 'Nozzle Temperature: 210–240 °C', 'p. 1: Nozzle Temperature'],
  ['P1971', 'Bed °C', '40–60 °C', 'Bed Temperature: 40–60 °C', 'p. 1: Bed Temperature'],
  ['P1973', 'Nozzle °C', '130-150℃', 'Nozzle Print Temperature  130-150℃', 'p. 1: PCL, Nozzle Print Temperature'],
  ['P1973', 'Bed °C', '20-40℃ (Normal temperature is also acceptable)', 'Print Platform Temperature  20-40℃', 'p. 1: PCL, Print Platform Temperature'],
  ['P1974', 'Bed °C', '120 - 150°C at minimum', 'You bed temperature should be 120 - 150°C at minimum.', 'p. 1: Bed Temperature'],
  ['P1974', 'Enclosure', 'we would always recommend printing PEEK in a closed printer with a heated build chamber and an active charcoal/carbon filter.', 'we would always recommend printing PEEK in a closed printer with a heated build chamber', 'p. 1: Fumes and gasses'],
  ['P1979', 'Enclosure', 'Not needed', 'Enclosure Not needed', 'p. 1: Enclosure'],
  ['P1981', 'Nozzle °C', '± 360 – 400° C', 'Print temp: ± 360 – 400° C', 'p. 1: General printing guidelines (Print temp)'],
  ['P1981', 'Bed °C', '≥ 120° C', 'Heat bed: ≥ 120° C', 'p. 1: General printing guidelines (Heat bed)'],
  ['P1981', 'Chamber °C', '90°C heated chamber', 'Enclosure needed: 90°C heated chamber', 'p. 1: General printing guidelines (Enclosure needed)'],
  ['P1981', 'Enclosure', 'Enclosure needed: 90°C heated chamber', 'Enclosure needed: 90°C heated chamber', null],
  ['P1982', 'Nozzle °C', '250-265°C', 'Print temperature: 250-265°C', 'p. 1: Print temperature'],
  ['P1982', 'Bed °C', '60-65°C with PVA glue stick', 'Bed temperature: 60-65°C with PVA glue stick', 'p. 1: Bed temperature'],
  ['P1982', 'Abrasion / clogging', 'Nozzle: Stainless Steel , Olsson Ruby , or other hardened nozzle types', 'Nozzle: Stainless Steel , Olsson Ruby , or other hardened nozzle types', 'p. 1: Nozzle'],
  ['P1667', 'Enclosure', 'This is also the reason why an enclosure is necessary when printing ABS.', 'This is also the reason why an enclosure is necessary when printing ABS.', 'p. 1: enclosure (warping and cracking)'],
];
let cells = 0, added = 0;
for (const [id, column, value, quote, locator] of CELLS) {
  const p = t.get('profiles', id);
  if (p[column] === value) continue;
  onCachedSheet(t, p.SourceID, quote, MIGRATION);
  t.set('profiles', id, column, value, { expect: NP, migration: MIGRATION });
  retype(t, id, [column], MIGRATION);
  const row = t.get('profiles', id);
  if (locator && !row.Locator.includes(locator)) t.set('profiles', id, 'Locator', `${row.Locator}; ${locator}`, { expect: row.Locator, migration: MIGRATION });
  cells++;
}

// PolyLite PLA-CF's own page: its specification table (190-230 °C, 25-60 °C, the values its data sheet prints), a profile
// of its own. Its description's "210˚C - 230˚C" and "30˚C - 70˚C" differ and are left (an accepted context finding).
const PAGE = 'R-POLYMAKER-INTAKE-20261019-6a231b651029';
if (!t.rows('profiles').some((p) => p.SourceID === PAGE && p.GradeID === 'G018-05' && p.Profile !== 'Retired duplicate record')) {
  for (const q of ['Nozzle 190-230 °C', 'Bed 25-60 °C', 'Enclosure Not needed', 'Drying Settings: 55˚C for 6h (Only if the material has absorbed moisture)', 'Compatibility 0.4mm+ hardened nozzle required']) onCachedSheet(t, PAGE, q, MIGRATION);
  const like = t.get('profiles', 'P0273');
  const row = {
    ...like, ProfileID: nextId('profiles', t.rows('profiles').map((p) => p.ProfileID)), SourceID: PAGE, 'Parse review': 'Not applicable',
    'Nozzle °C': '190-230 °C', 'Bed °C': '25-60 °C', 'Chamber °C': NP, Enclosure: 'Not needed', Plate: NP,
    Drying: '55˚C for 6h (Only if the material has absorbed moisture)', 'Nozzle diameter': '0.4mm+', 'Abrasion / clogging': '0.4mm+ hardened nozzle required', 'Nozzle material': NP,
    'AMS published': NP, 'Support pairing': NP, 'Failure modes': NP,
    Locator: 'p. 1: Technical Specifications (Nozzle, Bed, Enclosure, Compatibility); p. 1: Drying Settings',
  };
  t.append('profiles', { ...row, ...typedOf(row) });
  added++;
}
if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ migration: MIGRATION, cells, added, written: false })); process.exit(0); }
t.save();
console.log(JSON.stringify({ migration: MIGRATION, cells, added }));
