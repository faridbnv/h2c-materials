// Staging a document the owner supplies (R084): the pipeline hashes what it is given, and never guesses which
// row a file belongs to. What is asserted is the matching rule, on rows written for the purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { rowForStagedFile, adapter } from '../scripts/ingest/fetch.mjs';

const rows = [
  { doc_key: 'a', provider: 'iSANMATE', product_raw: 'ABS', url: 'https://www.isanmate.com/wp-content/uploads/2022/09/ABS_TDS.pdf' },
  { doc_key: 'b', provider: 'iSANMATE', product_raw: 'ABS GF', url: 'https://www.isanmate.com/wp-content/uploads/2024/09/ABS-GF_TDS.pdf' },
  { doc_key: 'c', provider: 'FormFutura', product_raw: 'ABSpro', url: 'https://formfutura.sharepoint.com/sites/downloads/Shared%20Documents/TDS%20-%20ABSpro.pdf' },
  { doc_key: 'd', provider: 'FormFutura', product_raw: 'ABSpro Flame Retardant', url: 'https://formfutura.sharepoint.com/sites/downloads/Shared%20Documents/TDS%20-%20ABSpro%20-%20Flame%20Retardant.pdf' },
];

test('a staged file finds its row by the file name the URL carries, whatever the case or punctuation', () => {
  assert.equal(rowForStagedFile('ABS_TDS.pdf', rows).row.doc_key, 'a');
  assert.equal(rowForStagedFile('abs-gf_tds.PDF', rows).row.doc_key, 'b');
  // A SharePoint name is percent-encoded in the URL and plain on disk.
  assert.equal(rowForStagedFile('TDS - ABSpro - Flame Retardant.pdf', rows).row.doc_key, 'd');
});

test('a file no URL names is matched by a product name that one row alone carries, and refused where two do', () => {
  assert.equal(rowForStagedFile('iSANMATE ABS GF datasheet 2026.pdf', rows).row.doc_key, 'b');
  // The longest name the file contains is the product: a file named for the flame-retardant grade is not the plain one.
  assert.equal(rowForStagedFile('ABSpro Flame Retardant datasheet.pdf', rows).row.doc_key, 'd');
  assert.equal(rowForStagedFile('ABSpro datasheet.pdf', rows).row.doc_key, 'c');
  // Two names of one length that the file contains alike are two products: it is listed, not guessed.
  const twins = [...rows, { doc_key: 'e', provider: 'X', product_raw: 'PLA Pro', url: 'https://x.example/1' }, { doc_key: 'f', provider: 'X', product_raw: 'PET Pro', url: 'https://x.example/2' }];
  const ambiguous = rowForStagedFile('PLA Pro and PET Pro.pdf', twins);
  assert.equal(ambiguous.row, undefined);
  assert.match(ambiguous.why, /2 products' names fit/);
  assert.match(rowForStagedFile('something else.pdf', rows).why, /no row carries this file name/);
});

test('the host that disallows fetching tools is the one the owner stages by hand', () => {
  assert.equal(adapter('https://www.isanmate.com/wp-content/uploads/2022/09/ABS_TDS.pdf').kind, 'manual');
});

test('a library is staged by what each file is: its data sheets, never its safety sheets, leaflets or case studies', async () => {
  const { stageKind } = await import('../scripts/ingest/fetch.mjs');
  for (const name of ['TDS - ABSpro.pdf', 'formfutura-tds-highprecisionpet.pdf', '3DIAKON-TDS-27-05-2019.pdf', 'TDS MDflex.pdf',
    'ABS-Glass-Fiber-Technical-Data-Sheet.pdf', 'PLA-Wood_-TDS.pdf', 'PA12_CF-TDS.pdf']) assert.equal(stageKind(name), 'data-sheet', name);
  for (const name of ['SDS Formfutura STYX-12 (DE)v09-04-2019.pdf', 'NovamidID1070black_SDS_EN_EU_2021-12-13.pdf',
    'PLA-Safety-Data-Sheet.pdf']) assert.equal(stageKind(name), 'safety-sheet', name);
  assert.equal(stageKind('Statement of compliance with food contact regulations - STYX-12 - 2020Jan27.pdf'), 'declaration');
  assert.equal(stageKind('DSM CS McGill hi-res final.pdf'), 'case-study');
  assert.equal(stageKind('ReForm rPLA - Website text.pdf'), 'website-text');
  assert.equal(stageKind('ff-Spool_Specifications-750g_Cardboard.pdf'), 'spool');
  assert.equal(stageKind('AM_Addigy-F1030_Leaflet.pdf'), 'leaflet');
  assert.equal(stageKind('Spec_MEP_Xantar C CF 107 V0_150928.pdf'), 'other');
});

test('two rows carrying one file name are told apart by the folder the file sits in', () => {
  const base = 'https://formfutura.sharepoint.com/sites/downloads/Shared%20Documents/Filaments/FormFutura%20Filaments';
  const both = [
    { doc_key: 'plain', product_raw: 'High Gloss PLA', url: `${base}/High%20Gloss%20PLA/Data%20Sheets%20and%20Declarations/TDS%20-%20High%20Gloss%20PLA.pdf` },
    { doc_key: 'morph', product_raw: 'High Gloss PLA', url: `${base}/High%20Gloss%20PLA%20-%20ColorMorph/Data%20Sheets%20and%20Declarations/TDS%20-%20High%20Gloss%20PLA.pdf` },
  ];
  const name = 'TDS - High Gloss PLA.pdf';
  assert.equal(rowForStagedFile(name, both, { path: ['FormFutura Filaments', 'High Gloss PLA', 'Data Sheets and Declarations', name] }).row.doc_key, 'plain');
  assert.equal(rowForStagedFile(name, both, { path: ['FormFutura Filaments', 'High Gloss PLA - ColorMorph', 'Data Sheets and Declarations', name] }).row.doc_key, 'morph');
  // Without a path, or with one that separates nothing, the name alone is two rows and a question.
  assert.match(rowForStagedFile(name, both).why, /2 rows carry this file name/);
  assert.match(rowForStagedFile(name, both, { path: ['elsewhere', name] }).why, /2 rows carry this file name/);
});

test('a data sheet no row carries gets a row at the address the library gives it, named by its folder', async () => {
  const { rowForUnlistedFile } = await import('../scripts/ingest/fetch.mjs');
  const sibling = { provider: 'FormFutura', provider_kind: 'manufacturer', brand: 'FormFutura', manufacturer: 'FormFutura', language: 'Not stated' };
  const row = rowForUnlistedFile(['Partner Materials', 'Lehvoss', 'Luvocom 3F PAHT 9825 NT', 'Data sheets & declarations', 'TDS - LUVOCOM 3F PAHT 9825 NT - Injection molded specimen.pdf'],
    { rootUrl: 'https://formfutura.sharepoint.com/sites/downloads/Shared%20Documents/Downloads%20Server/Materials/Filaments/', sibling, date: '2026-09-21' });
  assert.equal(row.url, 'https://formfutura.sharepoint.com/sites/downloads/Shared%20Documents/Downloads%20Server/Materials/Filaments/Partner%20Materials/Lehvoss/Luvocom%203F%20PAHT%209825%20NT/Data%20sheets%20%26%20declarations/TDS%20-%20LUVOCOM%203F%20PAHT%209825%20NT%20-%20Injection%20molded%20specimen.pdf');
  assert.equal(row.product_raw, 'Luvocom 3F PAHT 9825 NT');
  assert.match(row.doc_key, /^url:[0-9a-f]{16}$/);
  assert.equal(row.status, 'inventoried');
  assert.equal(row.provider, 'FormFutura');
  // A file straight under the library's root is named by its own file name.
  assert.equal(rowForUnlistedFile(['PDS_TDS.pdf'], { rootUrl: 'https://www.isanmate.com/wp-content/uploads/2024/09', sibling, date: '2026-09-21' }).url,
    'https://www.isanmate.com/wp-content/uploads/2024/09/PDS_TDS.pdf');
});
