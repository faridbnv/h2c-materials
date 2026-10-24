// The pages a deploy adds beside the site's own (WP-25; pack 02 section 6.3): the 404 page and the redirect stubs. Node built-ins
// only, so the deploy job can use it without an install.
//
// 404.html is served by Pages with status 404 from ANY depth (/base/nothing, /base/a/b/nothing), so a relative link inside it
// points into the wrong folder. It is therefore fully self-contained (one inline style, one inline script, no file of the site)
// and takes the site root from the first segment of its own address. The same script sends an old release-stamped selector
// address (H2C_Material_Selector_<date>_<release>.html: 53 releases are in the wild, so they are matched by pattern, not listed)
// to the selector, and a missing records page to its material's Products page, keeping the search and the hash.
//
// A stub is the same redirect as a real file, for the names the deploy knows (the current stamped selector page; a material's
// records page where the page generator wrote none). The selector stub keeps the hash, which is where a scenario lives.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const SELECTOR_NAME = /^H2C_Material_Selector_[\w.-]+\.html$/;
export const RECORDS_NAME = /^(M\d+)-records\.html$/;

const STYLE = ':root{color-scheme:light dark}body{font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem}'
  + 'h1{font-size:1.5rem;line-height:1.25}a{color:LinkText}';

// Where a finder address of the old records page goes: a product to its card on the Products page, a measurement to its value,
// documents and known gaps to the Overview's Sources, the rest to the Products page (the old stub's rule, app/pages/stub.js).
const recordsTarget = (id) => `var h=location.hash.slice(1),p=new URLSearchParams(h),g=p.get('product'),t=p.get('type'),d=p.get('doc'),to=${id}+'-products.html';`
  + `if(/^V\\d{6}$/.test(h)||/^G\\d{3}-[\\w-]+$/.test(h))to+='#'+h;else if(g)to+='#'+encodeURIComponent(g);`
  + `else if(d||t==='documents'||t==='review-notes'||/^doc-/.test(h))to=${id}+'.html#sources';`;

// A script that cannot run on a stub's own page (a harness stub) must not throw: the page then just shows its link.
const NOT_FOUND_SCRIPT = '(function(){'
  + 'var parts=location.pathname.split("/").filter(Boolean),last=parts[parts.length-1]||"",'
  + // The site root is the first segment of the address (a project site lives at /<name>/); an address with one segment that names a file is at a root.
  'root=parts.length>1||(parts.length===1&&!/\\./.test(parts[0]))?"/"+parts[0]+"/":"./",'
  + 'home=document.getElementById("home");if(home)home.href=root;'
  + 'var m=/^(M\\d+)-records\\.html$/.exec(last),to=null;'
  // The selector address keeps the hash (a scenario lives there); a records address is read by the records rule, which keeps what it names.
  + `if(/^H2C_Material_Selector_[\\w.-]+\\.html$/.test(last))to=root+(location.search||"")+(location.hash||"");`
  + `else if(m&&parts[parts.length-2]==="materials"){var id=m[1];${recordsTarget('id')}to=root+"materials/"+to;}`
  + 'if(to!==null&&location.replace)location.replace(to);'
  + '})();';

/** The 404 page. Inline style and script only; no address in it is relative to anything but the root it works out for itself. */
export const NOT_FOUND_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found: Filament Atlas</title>
<style>${STYLE}</style></head>
<body>
<main>
<h1>Page not found</h1>
<p>This address does not exist on the Filament Atlas site.</p>
<p><a id="home" href="./">Open the Filament Atlas selector</a></p>
</main>
<script>${NOT_FOUND_SCRIPT}</script>
</body></html>
`;

const STUB_HEAD = (title, script, target) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<script>${script}</script>
<meta http-equiv="refresh" content="1; url=${target}">
<style>${STYLE}</style></head>
`;

/** The page that stands where the old release-stamped selector file was: it goes to the selector at the site root, keeping the hash (a scenario lives there). */
export const selectorStubHtml = () => `${STUB_HEAD('Filament Atlas selector has moved', 'location.replace("./"+location.search+location.hash)', './')}<body>
<main><h1>This page has moved</h1><p>The selector is at the site root now: <a href="./">open it</a>.</p></main>
</body></html>
`;

/** The page that stands where a material's old records page was (materials/<id>-records.html): its Products page, a finder address going to the record it names. */
export function recordsStubHtml(materialId) {
  if (!/^M\d+$/.test(materialId)) throw new Error(`"${materialId}" is not a material ID`);
  const id = JSON.stringify(materialId);
  return `${STUB_HEAD('Records have moved: Filament Atlas', `(function(){${recordsTarget(id)}location.replace(to);})();`, `${materialId}-products.html`)}<body>
<main><h1>The records have moved</h1><p>The records of ${materialId} are on its <a href="${materialId}-products.html">Products page</a> now.</p></main>
</body></html>
`;
}

function writeNew(site, path, html) {
  const file = join(site, path);
  // A page the site already has wins: the page generator's records stub is richer than this one.
  if (existsSync(file)) return false;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  return true;
}

/**
 * Write the selector stub for each old stamped name and the records stub for each material, without replacing a file that is there. Returns the paths written.
 * @param {string} site
 * @param {{ selectorNames?: readonly string[], recordsFor?: readonly string[] }} [what]
 * @returns {string[]}
 */
export function writeStubs(site, { selectorNames = [], recordsFor = [] } = {}) {
  const written = [];
  for (const name of selectorNames) {
    if (!SELECTOR_NAME.test(name)) throw new Error(`"${name}" is not a release-stamped selector name`);
    if (writeNew(site, name, selectorStubHtml())) written.push(name);
  }
  for (const id of recordsFor) {
    const path = `materials/${id}-records.html`;
    if (writeNew(site, path, recordsStubHtml(id))) written.push(path);
  }
  return written;
}
