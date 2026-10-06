// What a maker sells a product as, where it matters to how its values are read (product_claims.csv, D133).
//
// A row points at the maker's own recorded statement: a Makers' know-how row on the same product, a Manufacturer
// statement, whose words a reviewer judged against the claim's rule (schema/vocab/product-claims.csv). The build checks
// that the row points where it must and that the statement speaks of what the claim is about; it never reads a claim
// from a product's name. The claim is shown beside the product's values and the material's spread names the products
// that make it; nothing that filters, decides or estimates reads it.

export const CLAIM = { TOUGHENED: 'Toughened or impact-modified' };
const KNOW_HOW = "Makers' know-how";
const MAKER = 'Manufacturer statement';
// What a statement must speak of to make the claim: toughness, impact, or not breaking.
const WORDS = { [CLAIM.TOUGHENED]: /tough|impact|shatter|brittle|ductil|break|crack/i };

/**
 * Attach each product's claims to it (`g.claims`, absent where it has none). `evidenceRows` are evidence.csv's rows
 * less its retired duplicates. Issues: PRODUCT-CLAIM-REFERENCE, PRODUCT-CLAIM-WORDS.
 */
export function attachProductClaims(rows, { grades, evidenceRows, issues }) {
  const gradeById = new Map(grades.map((g) => [g.id, g]));
  const evidenceById = new Map(evidenceRows.map((r) => [r.EvidenceID, r]));
  for (const r of rows) {
    const where = `product_claims ${r.GradeID} | ${r.Claim}`;
    const g = gradeById.get(r.GradeID);
    const e = evidenceById.get(r.EvidenceID);
    const wrong = !g ? `product ${r.GradeID} does not exist`
      : g.retired ? `product ${r.GradeID} is retired`
      : !e ? `statement ${r.EvidenceID} is a retired duplicate or does not exist`
      : e.GradeID !== r.GradeID ? `statement ${r.EvidenceID} is filed under ${e.GradeID}, not this product`
      : e.Domain !== KNOW_HOW || e['Evidence type'] !== MAKER ? `statement ${r.EvidenceID} is not the maker's own (${e.Domain}, ${e['Evidence type']})`
      : null;
    if (wrong) {
      issues.push({ level: 'error', code: 'PRODUCT-CLAIM-REFERENCE', where, message: `The claim points at no statement the maker made for this product: ${wrong}` });
      continue;
    }
    if (WORDS[r.Claim] && !WORDS[r.Claim].test(e.Finding)) {
      issues.push({ level: 'error', code: 'PRODUCT-CLAIM-WORDS', where, message: `Statement ${r.EvidenceID} says nothing of what the claim is about: "${e.Finding}"` });
      continue;
    }
    (g.claims ??= []).push({ claim: r.Claim, evidenceId: r.EvidenceID });
  }
}
