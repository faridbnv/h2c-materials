// Where a material's pages are, relative to this page, with the trailing slash. The page rule (packages/pages/src/facts/page-rule.ts) writes a
// page's path as `materials/<id>.html`, beside the selector's page; the view is published in a folder of the site and the pages sit beside that
// folder, so the build says where (vite.config.ts, H2C_MATERIAL_PAGES) and the drawer rewrites the pages' addresses to it. Its own module so
// that the page can set it at boot without loading the drawer.
export let pagesBase = 'materials/';
export const setPagesBase = (base: string): void => { pagesBase = base; };
