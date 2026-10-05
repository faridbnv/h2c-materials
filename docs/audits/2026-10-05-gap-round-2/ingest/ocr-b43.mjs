// An optical reading of BigRep HI-TEMP's page, whose text layer maps every glyph to another character ("!0%-/'*$$"), so
// that no number on it can be bound to its page. Same as `npm run ingest:ocr`: ocrmypdf writes a text layer over the page
// image of a copy, and the text is cached under the ORIGINAL document's digest marked as an optical reading (ocr: {...}),
// so apply.mjs asks of every row a person's look at the page image (review.visual). The hashed bytes are never touched.
// (ingest:ocr itself takes only ledger rows whose status is needs-ocr and rewrites the ledger; this deferred sheet's ledger
// row is the V2 import's and stays as it is until the migration marks it applied.)
//
//   H2C_DOCUMENT_CACHE=<cache> node docs/audits/2026-10-05-gap-round-2/ingest/ocr-b43.mjs <sha256> [more digests]
import { readFileSync, writeFileSync } from 'node:fs';
import { cacheDir, documentText, sha256 } from '../../../../scripts/lib/pdf-text.mjs';
import { ocrCopy, pageImages } from '../../../../scripts/ingest/ocr.mjs';
import { documentPath } from '../../../../scripts/ingest/extract.mjs';

for (const sha of process.argv.slice(2)) {
  const source = documentPath(sha, '');
  if (!source) throw new Error(`no cached document for ${sha}`);
  if (sha256(readFileSync(source)) !== sha) throw new Error(`${sha}: the cached document does not hash to its name`);
  const copy = ocrCopy(source, sha, { refresh: true });
  const text = await documentText(readFileSync(copy), { sha, refresh: true });
  writeFileSync(cacheDir('text', `${sha}.json`), JSON.stringify({ ...text, ocr: { tool: 'ocrmypdf', copy: sha256(readFileSync(copy)), date: '2026-10-05' } }));
  pageImages(source, sha, { refresh: true });
  console.log(`${sha.slice(0, 12)}: ${text.pages.length} page(s) read optically`);
  for (const p of text.pages) for (const l of p.lines) console.log(`  p${p.page}: ${l.text}`);
}
