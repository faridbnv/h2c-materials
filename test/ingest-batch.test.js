// The batch program's own judgements about a document, asserted on pages written for the purpose.
import test from 'node:test';
import assert from 'node:assert/strict';

test('a text layer that draws every glyph twice is held whole, and a page with ordinary repeats is not', async () => {
  const { printsEveryNumberTwice } = await import('../scripts/ingest/batch.mjs');
  const pageOf = (...lines) => ({ pages: [{ page: 1, lines: lines.map((text) => ({ text })) }] });
  // Filament2Print's XECARB PA12-CF sheet: bold faked by printing each glyph over itself.
  assert.equal(printsEveryNumberTwice(pageOf('Diameter mm 1,751,75', 'Density ISO 1183 g/cm 1,061,06', 'Hardness Shore D, 15s ShD 7878',
    'Melting point 10 °C/min ISO 11357 °C 180180', 'HDT 1,80 MPa ISO 75 °C 150150', 'Melt Flow Rate 235°C / 5kg ISO 1133 g/10min 3232')), true);
  // A year, a run of one digit and a polyamide's name are not a number printed twice.
  assert.equal(printsEveryNumberTwice(pageOf('Revised 2020', 'Density 1.00 g/cm3', 'Tolerance ± 0.55 mm', 'PA1010 grade', 'HDT 55 °C')), false);
});
