// The counts that the docs state in plain words (README, "Where things stand") and that build/snapshot/counts.md
// tabulates, computed in one place from the compiled database so the two cannot disagree about what a product or a
// listed material is. Pure: it reads a db and nothing else, so a test can hand it a small one.
//
// It lives here and not in scripts/snapshot.mjs because that file is a script: importing it would build the database
// and write the snapshot. snapshot.mjs imports these functions instead.

import { productGates } from '../../app/js/engine/products.js';

/** Products are the active procurement grades; a retired grade and a study or reference grade (-R#) are not products. */
export const activeProducts = (db) => db.grades.filter((g) => !g.retired && !/-R\d+$/.test(g.id));

/**
 * What the plain-language summary needs.
 *  - materials: every row of materials.csv is `total`; a family entry or alias owns no product and the page does not list
 *    it, so `listed` is what is left; of those, `excluded` ones are shown only to say why they are out (a high-temperature
 *    plastic, a sintering filament) and `judged` ones are the candidates the templates judge.
 *  - unknown: the products whose print gate on that axis is unknown, counted as the engine judges it (productGates),
 *    the same reading build/snapshot/print.csv records.
 */
export function statusCounts(db) {
  const products = activeProducts(db);
  const listed = db.materials.filter((m) => !m.familyEntry);
  const materialById = new Map(db.materials.map((m) => [m.id, m]));
  const unknown = { chamber: 0, drying: 0, nozzle: 0, bed: 0 };
  for (const g of products) {
    const gates = productGates(materialById.get(g.materialId), g);
    if (gates.chamber.verdict === 'unknown') unknown.chamber++;
    if (gates.drying === 'unknown') unknown.drying++;
    if (gates.nozzle.verdict === 'unknown') unknown.nozzle++;
    if (gates.bed.verdict === 'unknown') unknown.bed++;
  }
  return {
    materials: {
      total: db.materials.length,
      familyEntries: db.materials.length - listed.length,
      listed: listed.length,
      excluded: listed.filter((m) => m.excluded).length,
      judged: listed.filter((m) => !m.excluded).length,
    },
    products: products.length,
    measurements: db.measurements.length,
    sources: db.sources.length,
    unknown,
  };
}
