// The stale-shell guard (pack 02 section 6.2), inline in every page of the view so that it runs even when the page's own scripts
// cannot: Pages caches every file for ten minutes, so a browser can hold an index.html whose chunks the server no longer has.
//
//   reloadOnce()  reload this page once per release (a sessionStorage mark); false when it already did, or cannot remember that it did.
//                 The scenario lives in the address hash, which a reload keeps, so nothing is lost.
//   settled()     the page's data arrived and agrees with the page: forget a mark that names another release, so a later publish can reload
//                 again. A mark that names this shell's own release stays: a shell that reloaded and is still this one is the stale one
//                 (its hash opens a part the server dropped), and forgetting the mark there would reload it again, for ever.
//   notice()      say what happened when a reload is not (or no longer) the answer.
//
// A script or stylesheet of the page that fails to load, and Vite's `vite:preloadError` (a chunk import that failed), take the same path.
// Words come from src/stale-copy.ts, put in at build time (vite.config.ts); there is one vocabulary.
(function () {
  var KEY = 'h2c-reloaded';
  var release = function () {
    var meta = document.querySelector('meta[name="h2c-release"]');
    return meta ? meta.getAttribute('content') || '' : '';
  };
  // A reload is under way: another stale asset failing in the meantime is the same event, not a reason to flash the notice.
  var reloading = false;
  var guard = {
    booted: false,
    reloadOnce: function () {
      if (reloading) return true;
      try {
        var mine = release();
        if (sessionStorage.getItem(KEY) === mine) return false;
        sessionStorage.setItem(KEY, mine);
        reloading = true;
        location.reload();
        return true;
      } catch (e) {
        return false;
      }
    },
    settled: function () {
      guard.booted = true;
      try {
        if (sessionStorage.getItem(KEY) !== release()) sessionStorage.removeItem(KEY);
      } catch (e) { /* nothing was remembered */ }
    },
    notice: function () {
      if (document.querySelector('[data-testid="load-notice"][data-state="stale"]')) return;
      var box = document.createElement('div');
      box.setAttribute('role', 'alert');
      box.setAttribute('data-testid', 'load-notice');
      box.setAttribute('data-state', 'stale');
      box.style.cssText = 'margin:1rem;padding:1rem;border:2px solid currentColor;font:16px/1.5 system-ui,sans-serif';
      var heading = document.createElement('h1');
      heading.style.cssText = 'font-size:1.25rem;margin:0 0 .5rem';
      heading.textContent = __H2C_STALE_HEADING__;
      var body = document.createElement('p');
      body.textContent = __H2C_STALE_BODY__;
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = __H2C_RELOAD__;
      button.addEventListener('click', function () { location.reload(); });
      box.append(heading, body, button);
      (document.body || document.documentElement).prepend(box);
    },
  };
  window.h2c = guard;
  var stop = function () { if (!guard.reloadOnce()) guard.notice(); };
  addEventListener('error', function (event) {
    var target = event.target;
    if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK') && !guard.booted) stop();
  }, true);
  addEventListener('vite:preloadError', function (event) {
    event.preventDefault();
    stop();
  });
})();
