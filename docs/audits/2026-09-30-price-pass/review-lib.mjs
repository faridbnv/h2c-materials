// What the foreign batches' reviews share (review-p03.mjs, review-p04.mjs): the variant a listing accepted by a reviewer
// is recorded at, by the rule review-p01.mjs states, and the selected.csv row it becomes. A listing is named by its
// shop and product ID, or by its title where the ID is long; `variant` narrows it to the reviewer's variant.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { csvText } from '../../../build/src/csv.js';
import { batchOffers, SELECTED_HEADER, PRICES_ROOT } from '../../../scripts/ingest/prices.mjs';
import { massKg, isOneSeventyFive } from '../../../scripts/lib/offers.mjs';

export const REVIEWER = 'Claude (claude-opus-5-5), an agent, 2026-09-30';
/** A reviewer's statement of diameter where the listing names none, from the product's own registered data sheet. */
export const TDS = (source, page, printed) => `The listing names no diameter; the product's own data sheet (${source}, p. ${page}) prints "${printed}", the only diameter it names.`;

const diameterOf = (o) => isOneSeventyFive(o.title) ?? isOneSeventyFive(o.sku) ?? isOneSeventyFive(`${o.productType} ${o.description}`);

/** The variant of one listing recorded, by the rule of review-p01.mjs: 1.75 mm, a printed mass, in stock, then black. */
export function variantOf(variants, { variant, massFrom, diameter } = {}) {
  const usable = variants.filter((o) => (!variant || variant.test(o.variantTitle)) && (diameterOf(o) === true || (diameter && diameterOf(o) !== false))
    && (massFrom === 'description' ? massKg(o.description) : massKg(o.title)) != null && o.available != null && !/sample/i.test(o.title));
  const rank = (o) => (o.available ? 0 : 4) + (/black/i.test(`${o.variantTitle} ${o.productTitle}`) ? 0 : /natural|white/i.test(`${o.variantTitle} ${o.productTitle}`) ? 1 : 2);
  return usable.length ? [...usable].sort((a, b) => rank(a) - rank(b))[0] : null;
}

/** LISTINGS ([GradeID, host, product id or null, options]) into the batch's selected.csv; throws on a listing that is gone. */
export function writeSelection(batch, listings, why) {
  const byListing = new Map();
  for (const o of batchOffers(batch)) { const k = `${o.capture.Host}|${o.product}`; if (!byListing.has(k)) byListing.set(k, []); byListing.get(k).push(o); }
  const rows = listings.map(([gradeId, host, pid, opts = {}]) => {
    const list = pid ? byListing.get(`${host}|${pid}`) : [...byListing.entries()].find(([k, v]) => k.startsWith(`${host}|`) && v[0].productTitle === opts.title)?.[1];
    if (!list) throw new Error(`${gradeId}: no listing ${host} ${pid ?? opts.title}`);
    const o = variantOf(list, opts);
    if (!o) throw new Error(`${gradeId}: no usable variant in ${host} "${list[0].productTitle}"`);
    return {
      GradeID: gradeId, SHA256: o.capture.SHA256, Offer: o.key, Packaging: /refill/i.test(o.title) ? 'Refill' : 'Spool', 'Mass from': opts.massFrom ?? 'title',
      'Eligible for median': 'TRUE', 'Headline sample': 'TRUE', 'Regular price basis': '', Notes: opts.note ?? '', Diameter: opts.diameter ?? '', Maker: opts.maker ?? '',
      'VAT included %': opts.vat ?? '', Status: 'accepted', Reviewer: REVIEWER, Why: why,
      _offer: o,
    };
  });
  mkdirSync(join(PRICES_ROOT, batch), { recursive: true });
  writeFileSync(join(PRICES_ROOT, batch, 'selected.csv'), csvText(SELECTED_HEADER, rows));
  return rows;
}
