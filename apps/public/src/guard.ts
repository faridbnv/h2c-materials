// The page's side of the stale-shell guard. The guard itself is inline in the page (guard.inline.js), because it must work when the
// page's own scripts cannot load; these are the calls the app makes into it. Without it (a test page, the dev server) nothing reloads.
interface Guard {
  reloadOnce(): boolean;
  settled(): void;
  notice(): void;
}
declare global {
  interface Window { h2c?: Guard }
}

/** Reload this page once to get the current version. True: it is reloading. False: it already did (or cannot say), so say what happened instead. */
export const reloadOnce = (): boolean => window.h2c?.reloadOnce() ?? false;

/** The page has its data and the data agrees with it: forget the reload, so a later publish can reload again. */
export const settled = (): void => { window.h2c?.settled(); };
