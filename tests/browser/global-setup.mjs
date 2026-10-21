// Before any test: assemble (or take) the site, serve it under both base paths, and hand the address to the workers. A site that is not
// whole, or a server that did not come up, stops the run here; a suite never runs against less than the whole site.
import { startServer, BASE_PATHS } from './lib/server.mjs';
import { prepareSite } from './lib/site.mjs';

export default async function globalSetup() {
  const t0 = Date.now();
  const site = prepareSite();
  const server = await startServer({ site: site.site, bases: BASE_PATHS });
  process.env['H2C_BROWSER_SITE_INFO'] = JSON.stringify({ ...site, origin: server.origin, bases: BASE_PATHS });
  console.log(`browser suite: ${site.site} served at ${server.origin}${BASE_PATHS.join(' and ')} (release ${site.release}, public view ${site.v3Release}); ready in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  return async () => { await server.close(); };
}
