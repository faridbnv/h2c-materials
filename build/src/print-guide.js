// A printer maker's filament guide (docs/DECISIONS.md, D88): what it states for printing a material type, in a print
// profile's columns (data/tables/print_guide.csv), and which of our materials each of its types is
// (print_guide_materials.csv). The build reads a material's guide row only where one of its products says nothing on
// an axis of its print gate, and neither does its twin (D89); products.js does that, and labels what it reads as the
// guide's, never the maker's.
//
// A guide row is read exactly as a profile is (recipe.js): the typed columns decide, the parsers check them. It is
// never a product's profile: it has no GradeID, and a material's own gates and print summary do not see it.

import { readRecipe } from './recipe.js';

const FAMILY_ENTRY = 'Family entry';

/** A guide by its publisher and title, as a reader says it: "Bambu Lab's Filament Guide". */
export function guideName(source) {
  const publisher = source?.publisher ?? 'The publisher';
  const title = String(source?.title ?? 'guide');
  const rest = title.startsWith(publisher) ? title.slice(publisher.length).trim() : title;
  return `${publisher}'s ${rest}`;
}

/**
 * Every guide row compiled, with the materials it speaks for, and the row each material reads. A row must cite a
 * source that was retrieved and is cited; a material row must name a guide row and a material that owns products.
 */
export function compilePrintGuide(rows, materialRows, { sources, materials, issues }) {
  const sourceById = new Map(sources.map((s) => [s.id, s]));
  const materialById = new Map(materials.map((r) => [r.MaterialID, r]));
  const guides = rows.map((r) => {
    const where = `print_guide ${r.PrintGuideID}`;
    const s = sourceById.get(r.SourceID);
    if (!s || s.accessState !== 'retrieved' || s.citationRole !== 'cited') {
      issues.push({ level: 'error', code: 'PRINT-GUIDE-REFERENCE', where, message: `${r.SourceID} is ${!s ? 'not in sources.csv' : `${s.accessState}, citation role ${s.citationRole}`}; a guide row cites a retrieved, cited source` });
    }
    const recipe = readRecipe(r, issues, { where, unreadWhere: where, abrasionColumn: 'Nozzle size / material' });
    const name = `${guideName(s)} for ${r['Guide type']}`;
    return {
      id: r.PrintGuideID, sourceId: r.SourceID, guideType: r['Guide type'], name, locator: r.Locator,
      materials: [],
      nozzle: recipe.nozzle, bed: recipe.bed, chamber: recipe.chamber, gates: recipe.gates,
      enclosure: r.Enclosure, enclosureState: recipe.enclosureState,
      nozzleSizeMaterial: r['Nozzle size / material'], abrasion: recipe.abrasion,
      drying: recipe.drying,
    };
  });
  const byId = new Map(guides.map((g) => [g.id, g]));
  const byMaterial = new Map();
  for (const m of materialRows) {
    const where = `print_guide_materials ${m.MaterialID}`;
    const g = byId.get(m.PrintGuideID);
    const row = materialById.get(m.MaterialID);
    const problem = !g ? `${m.PrintGuideID} is not a print_guide row`
      : !row ? `${m.MaterialID} is not a material`
      : row.Scope === FAMILY_ENTRY ? `${m.MaterialID} is a family entry or an alias, which owns no product`
      : null;
    if (problem) { issues.push({ level: 'error', code: 'PRINT-GUIDE-MATERIAL', where, message: problem }); continue; }
    g.materials.push({ materialId: m.MaterialID, reason: m.Reason });
    byMaterial.set(m.MaterialID, g);
  }
  return { guides, byMaterial };
}
