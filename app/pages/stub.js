// The old records page of a material (materials/<id>-records.html), kept as a stub since the pages were reimagined
// (2026-10-17): a link made before then still lands where its record lives now. Its finder's address
// (#type=…&product=G…&doc=…) is read by a few lines of script: a product goes to its card on the Products page
// (#G…), a measurement to its value (#V…), documents and known gaps to the Overview's Sources, the rest to the Products
// page. Without the script, a refresh goes to the Products page, and a plain link says where everything went.

import { esc, productsHref, overviewHref } from './html.js';
import { documentShell, BRAND } from './shell.js';

/** The stub of a material: { path, html }. `name` is the material's name. */
export function renderStub(id, name, env) {
  const products = productsHref(id);
  const overview = overviewHref(id);
  // An old address names a product (product=G…), a measurement (#V…), a type or a document; JSON keeps the strings safe.
  const script = `<script>(function(){var h=location.hash.slice(1),p=new URLSearchParams(h),g=p.get('product'),t=p.get('type'),d=p.get('doc'),to=${JSON.stringify(products)};`
    + `if(/^V\\d{6}$/.test(h)||/^G\\d{3}-[\\w-]+$/.test(h))to+='#'+h;else if(g)to+='#'+encodeURIComponent(g);else if(d||t==='documents'||t==='review-notes'||/^doc-/.test(h))to=${JSON.stringify(`${overview}#sources`)};`
    + 'location.replace(to);})();</script>';
  const head = `${script}\n<meta http-equiv="refresh" content="${esc(`1; url=${products}`)}">\n`;
  const body = `<div class="stub"><h1 class="pname">${esc(name)}</h1>
<p>The records of ${esc(name)} are on its <a href="${esc(products)}">Products page</a> now, each in its product's card; its documents and known gaps are under <a href="${esc(`${overview}#sources`)}">Sources</a> on its <a href="${esc(overview)}">overview</a>.</p></div>`;
  const html = documentShell({
    kind: 'stub', title: `${name} records: ${BRAND}`, description: `The records of ${name} have moved to its Products page.`,
    stamps: env.stamps, material: id, crumbs: [], body, head,
  });
  return { path: `materials/${id}-records.html`, html };
}
