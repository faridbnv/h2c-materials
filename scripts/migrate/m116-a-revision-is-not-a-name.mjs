#!/usr/bin/env node
// Migration m116 (2026-09-21): a revision date is the document's, not the product's.
//
// Yousu heads every sheet "PLA 3D FILMAENT Revision Date: 18/12/2020", and the reader took the whole line for the
// product's name, so six grades carried their sheet's revision date and Yousu's spelling of "filament" in it. A
// seventh, the POM sheet read before that, carried the maker's name and the category word instead. The reader now
// takes a revision clause and the category word off a name, as it takes "3D Filament" off everyone's
// (productName in propose.mjs), and these are the names it reads now: one product, one name, and a later Yousu
// sheet of the same product finds its grade.
//
//   node scripts/migrate/m116-a-revision-is-not-a-name.mjs

import { openTables } from '../data/table-io.mjs';

const RENAMES = [
  ['G001-72', 'PLA 3D FILMAENT Revision Date: 18/12/2020', 'PLA'],
  ['G014-07', 'WOOD 3D FILMAENT Revision Date: 18/12/2020', 'WOOD'],
  ['G082-08', 'PP 3D FILMAENT Revision Date: 18/03/2022', 'PP'],
  ['G027-26', 'Modified ABS 3D FILMAENT Revision Date: 21/12/2020', 'Modified ABS'],
  ['G008-13', 'Silk PLA 3D FILMAENT Revision Date: 21/12/2020', 'Silk PLA'],
  ['G075-03', 'PVA 3D FILMAENT Revision Date: 18/12/2020', 'PVA'],
  ['G087-03', 'YOUSU POM 3D Filament', 'POM'],
];

const t = openTables();
let changed = 0;
for (const [id, was, name] of RENAMES) {
  const g = t.get('grades', id);
  if (g['Product name'] === name) continue;
  if (g.Manufacturer !== 'Yousu') throw new Error(`m116: ${id} is ${g.Manufacturer}'s, not Yousu's`);
  t.set('grades', id, 'Product name', name, { expect: was });
  changed++;
}
if (changed) t.save();
console.log(`m116: ${changed} grade name(s) corrected`);
