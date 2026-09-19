#!/usr/bin/env node
// Migration m55 (2026-09-18): nine values recorded against a page that does not print them.
//
// Spectrum publishes two PP data sheets under one file name:
//
//   https://spectrumfilaments.com/wp-content/uploads/2022/05/en_tds_spectrum_pp.pdf
//   https://spectrumfilaments.com/wp-content/uploads/2025/11/en_tds_spectrum_pp.pdf
//
// The batch reader derives a source identifier from a document's file name, so both derived
// S-SPECTRUM-en-tds-spectrum-pp. The 2022 sheet was already registered under that identifier, the applier saw the
// identifier and left the source alone, and the 2025 sheet's nine values were written against the 2022 sheet's
// SHA-256. A reader tracing V002766 to its source would have found a page that prints 500 % where the row says
// 637 %, and no "Elongation at Yield" line at all. A second read of a sample of the batch found it.
//
// The two documents differ in their bytes, so the fix is to register the 2025 sheet as its own source and move the
// nine rows to it. Nothing about the values changes: they were read from the 2025 sheet and they stay as they were
// read. scripts/ingest/propose.mjs now tells two documents of one file name apart by their digest, and
// scripts/ingest/apply.mjs refuses a batch whose source identifier belongs to a document with another digest.

import { openTables } from '../data/table-io.mjs';

const OLD = 'S-SPECTRUM-en-tds-spectrum-pp';
const NEW = 'S-SPECTRUM-en-tds-spectrum-pp-42aa71';
const SHA = '42aa71b93b904c2ca6fb90a5133b08e4f8f2e95ed75defb6d383f2c9875afdca';
const ROWS = ['V002766', 'V002767', 'V002768', 'V002769', 'V002770', 'V002771', 'V002772', 'V002773', 'V002774'];

const SOURCE = {
  SourceID: NEW,
  Publisher: 'Spectrum',
  Title: 'TECHNICAL DATA SHEET PP',
  Revision: 'Not published',
  'Publication date': 'Not published',
  'Access date': '2026-09-18',
  'Source class': 'Manufacturer TDS',
  'Source note': "The maker's 2025 edition of its PP data sheet. It is a different document from the 2022 edition (S-SPECTRUM-en-tds-spectrum-pp) and both are published under the same file name.",
  'Citation role': 'cited',
  URL: 'https://spectrumfilaments.com/wp-content/uploads/2025/11/en_tds_spectrum_pp.pdf',
  Locator: 'Document / product page',
  'Applicable grades': 'G082-03',
  'Access state': 'retrieved',
  'Access note': 'Not applicable',
  SHA256: SHA,
};

export function migrate(t) {
  if (!t.find('sources', NEW)) t.append('sources', SOURCE);
  for (const id of ROWS) {
    const row = t.get('measurements', id);
    if (row.SourceID === NEW) continue;
    t.set('measurements', id, 'SourceID', NEW, { expect: OLD });
    const note = `Re-attributed ${'2026-09-18'} (m55): read from the 2025 edition of the sheet, which is a different document from the 2022 edition it was recorded against.`;
    t.set('measurements', id, 'Notes', `${row.Notes} ${note}`, { expect: row.Notes });
  }
}

if (process.argv[1]?.endsWith('m55-pp-2025-sheet-its-own-source.mjs')) {
  const t = openTables();
  migrate(t);
  t.save();
  console.log(`${NEW} registered; ${ROWS.length} row(s) moved to it`);
}
