// What a material page may weigh, raw and gzipped, and the whole set. Over budget is a warning; over twice the budget
// stops the build (step 3, app/pages/stage.js), and pages.check.js fails over budget.
//
// Set at about one and a half times the largest of each kind when every page was first rendered (2026-10-16, release
// 61bd76665879, 76 materials), rounded up: the largest main page PLA's, 558 KB (68 KB gzipped), the median 147 KB
// (22 KB); the largest records page PLA's, 3.06 MB (265 KB gzipped), the median 171 KB (18 KB); the stylesheet with its
// three embedded faces 439 KB (318 KB gzipped); the set 31.4 MB (4.0 MB gzipped). The script's budget was raised to
// 30 KB the same day, when the redesign added the Products table and the records finder (page.js and tables.src.js
// together about 27 KB).

export const PAGE_BUDGET = {
  main: { raw: 850_000, gzip: 105_000 },
  records: { raw: 4_600_000, gzip: 400_000 },
  // The shared stylesheet with its embedded fonts, and the page script (a classic script, no library).
  css: { raw: 660_000, gzip: 480_000 },
  script: { raw: 30_000 },
  set: { raw: 50_000_000 },
};
