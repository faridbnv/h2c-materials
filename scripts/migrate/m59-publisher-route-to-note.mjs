#!/usr/bin/env node
// Migration m59 (2026-09-19): how a document was reached moves out of the publisher's name.
//
// D71 says the route to a source is a state and a note, not part of who published it. Twenty sources carried it
// inside the name instead: "Grupa Azoty (document mirrored by filamentworld.de)", "Dow (TDS hosted by 3DXTECH)",
// "DuPont Engineering Polymers (document mirrored by Distrupol)". The page shows the publisher, so a reader saw
// the mirror's name as though it were the maker's.
//
// The publisher becomes the maker alone and the parenthetical joins Source note, where the same fact already
// lives for the sources that record it properly. A parenthetical that is part of the name is left alone:
// "IPCON Polymer Material (Suzhou)" is a place, "Kimya (Armor Group)" an owner, "Toray Industries, Inc. (Toray
// Plastics)" a division. Three Fiberon sheets are a brand line rather than a route, and say so.
//
// Owner ruling R043, 2026-09-19.

import { openTables } from '../data/table-io.mjs';

const ROUTE = /\s*\((document (mirrored|hosted) by [^)]+|TDS hosted by [^)]+)\)\s*/i;
const NOTE = 'Not applicable';

export function migrate(t) {
  let moved = 0;
  for (const row of t.rows('sources')) {
    const publisher = row.Publisher ?? '';
    const route = ROUTE.exec(publisher);
    const fiberon = /^Polymaker \(Fiberon\)$/.test(publisher);
    if (!route && !fiberon) continue;
    const name = fiberon ? 'Polymaker' : publisher.replace(ROUTE, '').trim();
    const said = fiberon
      ? "Published under Polymaker's Fiberon brand line."
      : `${route[1].charAt(0).toUpperCase()}${route[1].slice(1)}.`;
    const note = row['Source note'] === NOTE ? said : `${row['Source note']} ${said}`;
    t.set('sources', row.SourceID, 'Publisher', name, { expect: publisher });
    t.set('sources', row.SourceID, 'Source note', note, { expect: row['Source note'] });
    moved += 1;
  }
  return moved;
}

if (process.argv[1]?.endsWith('m59-publisher-route-to-note.mjs')) {
  const t = openTables();
  const moved = migrate(t);
  t.save();
  console.log(`${moved} publisher name(s) carry only the publisher now`);
}
