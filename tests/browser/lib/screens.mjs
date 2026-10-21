// The three screens of the interface probe (scripts/ui-probe.mjs) and the material pages it opens. A touch screen is emulated as a
// mobile browser, which is what widens its layout viewport when the page does not fit; a Playwright context takes these options.
export const SCREENS = Object.freeze([
  { name: 'laptop', width: 1180, height: 760, mobile: false },
  { name: 'tablet', width: 820, height: 1100, mobile: true },
  { name: 'phone', width: 390, height: 844, mobile: true },
]);

/** The context options that give a page a screen. */
export const screenOptions = (screen) => ({ viewport: { width: screen.width, height: screen.height }, deviceScaleFactor: 1, isMobile: screen.mobile, hasTouch: screen.mobile });

// [slug, file under materials/, the page's own main[data-page]]. Four materials, each its Overview and its Products page: the largest
// (PLA, 195 products), the middle of the field (PETG), a fibre-filled one with a few products whose cards start closed (PPS-CF), and
// one of three, whose cards start open (PCTG-GF); then the index and the method page.
export const PAGES = Object.freeze([
  ['m001-pla', 'M001.html', 'overview'], ['m001-pla-products', 'M001-products.html', 'products'],
  ['m020-petg', 'M020.html', 'overview'], ['m020-petg-products', 'M020-products.html', 'products'],
  ['m073-pps-cf', 'M073.html', 'overview'], ['m073-pps-cf-products', 'M073-products.html', 'products'],
  ['m110-pctg-gf', 'M110.html', 'overview'], ['m110-pctg-gf-products', 'M110-products.html', 'products'],
  ['index', 'index.html', 'hub'], ['method', 'method.html', 'method'],
]);
