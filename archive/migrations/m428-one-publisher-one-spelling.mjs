#!/usr/bin/env node
// Migration m428 (2026-10-17): one publisher, one spelling (data review fixes, item 6; a Claude Sonnet reader read
// every source of every publisher spelt more than one way, and the documents' own legal lines; judged by Claude Opus).
//
// The material pages group a material's documents by Publisher and count publishers, and PCTG-GF's showed "Spectrum"
// and "Spectrum Group Sp. z o.o." as two. 127 spellings were read; 28 sets were judged one company and are spelt one way,
// as the company writes itself in its documents (Spectrum, 3DJake, Fabru, Extrudr, MatterHackers, Yousu, BASF, DuPont,
// Eryone, Fillamentum and others). Where a document prints a legal name that differs (Spectrum Group Sp. z o.o.,
// niceshops GmbH, FD3D GmbH, Fabru GmbH, RECREUS INDUSTRIES S.L.), the source's note keeps it with its page.
// - A brand line is its company's: Fiberon is Polymaker's, PRO Series MatterHackers', Filaflex Recreus', purefil
//   Fabru's, The Filament and Prografen Spectrum's (their sheets' disclaimers name Spectrum Group Sp. z o.o.).
// - A maker's own regional storefront on its own domain is the maker (us.spectrumfilaments.com, ca.qidi3d.com,
//   ca.eryone3d.com, ca.store.bambulab.com).
// - "3DJake / 3DJAKE" was a host label as much as a spelling: 3DJake serves other makers' sheets, and 41 of them name
//   their maker (nobufil GmbH, Azurefilm d.o.o., Proto-pasta, Anycubic, Spectrum Group Sp. z o.o., ELEGOO's SHENZHEN
//   ZHINENGPAI TECHNOLOGY): those 39, and Spectrum's two PLA Graphene sheets filed under "3DJake", are their makers', as
//   Kingroon's sheets already were. Six that name no maker are 3DJake's, the host that publishes them.
// - Five shop catalogues carried their own SourceID as Publisher: they are 3D Printing Canada's and Shop3D.ca's, by their
//   URLs and their sibling catalogues.
// Judged different and left: BASF Forward AM beside BASF's resin sheets (a separate 3D-printing business), Trinity3DS (a
// distributor quoting 3DXTECH), Airtech's Kimya documents (no cached copy), and UltiMaker beside "UltiMaker / MakerBot"
// (the sheets print MakerBot only). 244 sources change; the rows, quotes and pages are
// docs/audits/2026-10-17-data-review-fixes/publishers.csv; each quote is checked on its cached sheet (a shop's JSON catalogue has no page to check). A re-run is a no-op, and a
// run after the data moved stops.
//
//   node scripts/migrate/m428-one-publisher-one-spelling.mjs
import { join } from 'node:path';
import { openTables, projectRoot } from '../../scripts/data/table-io.mjs';
import { onCachedSheet } from '../../scripts/lib/read-proposals-apply.mjs';
import { rowsOf } from '../../scripts/lib/sweep-shared.mjs';

const MIGRATION = 'm428';
const DATE = '2026-10-17';
const NA = 'Not applicable';
const t = openTables();
const rows = rowsOf(join(projectRoot, 'docs/audits/2026-10-17-data-review-fixes/publishers.csv'));
let n = 0;
for (const r of rows) {
  const s = t.get('sources', r.SourceID);
  if (s.Publisher === r['Publisher after']) continue;
  if (r.Quote !== NA) onCachedSheet(t, r.SourceID, r.Quote, MIGRATION);
  const host = /^3DJake/.test(r['Publisher before']) && r['Publisher after'] !== '3DJake';
  const legal = r['Legal name'] !== NA && r['Legal name'] !== r['Publisher after'] ? ` The document names its publisher "${r['Legal name']}"${r.Page !== NA ? ` (${r.Page.replace(/^p(\d)/, 'p. $1')})` : ''}.` : '';
  const what = host
    ? `Publisher "${r['Publisher after']}" since ${DATE} (${MIGRATION}), was "${r['Publisher before']}": the sheet is its maker's, which 3DJake hosts.`
    : `Publisher spelt "${r['Publisher after']}" since ${DATE} (${MIGRATION}), was "${r['Publisher before']}": one company, one spelling.`;
  const note = s['Source note'];
  t.set('sources', r.SourceID, 'Publisher', r['Publisher after'], { expect: r['Publisher before'], migration: MIGRATION });
  t.set('sources', r.SourceID, 'Source note', `${note === NA ? '' : `${note} `}${what}${legal}`, { expect: note, migration: MIGRATION });
  n++;
}
if (n) t.save();
console.log(`${MIGRATION}: ${n} source(s) spelt with their publisher's one name`);
