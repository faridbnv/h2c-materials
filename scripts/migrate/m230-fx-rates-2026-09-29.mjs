#!/usr/bin/env node
// Migration m230 (2026-09-30): the exchange rates the price pass compares foreign listings at (D113; GOALS, the price
// pass). One Bank of Canada daily average rate per currency, for 2026-09-29, the latest business day it had published
// when the pass's foreign batches were finalized: FXUSDCAD and FXEURCAD, read from the Valet service's own JSON for that
// day, fetched and hashed (archive/ingest-2026-09-18/prices/fx/captures.csv). The number written is the number the
// document prints, checked here; a second run writes nothing.
//
//   node scripts/migrate/m230-fx-rates-2026-09-29.mjs
import { readFileSync } from 'node:fs';
import { openTables } from '../data/table-io.mjs';
import { locate } from '../data/source-store.mjs';
import { sha256 } from '../lib/pdf-text.mjs';

const migration = 'm230-fx-rates-2026-09-29';
const SHA = '7de44a4381898784aa626c09513aa8112ad91cc513c0131a69b65d95cc714223';
const URL = 'https://www.bankofcanada.ca/valet/observations/FXUSDCAD,FXEURCAD/json?start_date=2026-09-29&end_date=2026-09-29';
const SOURCE = 'R-BOC-VALET-FX-20260929';
const DAY = '2026-09-29';

const found = locate(SHA, SOURCE);
if (found.bytes !== 'present' || sha256(readFileSync(found.path)) !== SHA) throw new Error(`${migration}: the Valet document ${SHA.slice(0, 12)} is not in the source store; restore it (npm run data:sources -- --restore)`);
const doc = JSON.parse(readFileSync(found.path, 'utf8'));
const day = doc.observations.find((o) => o.d === DAY);
if (!day) throw new Error(`${migration}: the document holds no observation for ${DAY}`);

const t = openTables();
let changed = 0;
if (!t.find('sources', SOURCE)) {
  t.append('sources', {
    SourceID: SOURCE, Publisher: 'Bank of Canada', Title: 'Valet: daily average exchange rates FXUSDCAD and FXEURCAD, 2026-09-29', Revision: 'Not published',
    'Publication date': DAY, 'Access date': '2026-09-30', 'Source class': 'Reference or register',
    'Source note': 'The Bank of Canada\'s daily average exchange rates, Canadian dollars per unit of the currency, as its Valet service serves them in JSON. The rates the price pass compares foreign listings at (D113).',
    'Citation role': 'cited', URL, Locator: 'Document / observations', 'Applicable grades': 'Not applicable: exchange rates',
    'Access state': 'retrieved', 'Access note': 'Not applicable', SHA256: SHA,
  });
  changed++;
}
for (const [currency, series] of [['USD', 'FXUSDCAD'], ['EUR', 'FXEURCAD']]) {
  const value = day[series]?.v;
  if (!value) throw new Error(`${migration}: no ${series} on ${DAY}`);
  if (t.rows('fx_rates').some((r) => r.Currency === currency && r['Rate date'] === DAY)) continue;
  t.append('fx_rates', { Currency: currency, 'Rate date': DAY, 'CAD per unit': value, SourceID: SOURCE, Locator: `observations, d ${DAY}, ${series}.v`,
    Notes: `Daily average exchange rate of the ${currency === 'USD' ? 'US dollar' : 'euro'} in Canadian dollars (${migration}).` });
  changed++;
}
t.save();
console.log(`${migration}: ${changed} record(s) written`);
