// The offers a saved shop document holds, read from the document alone (D35, D113): what a listing's price, currency,
// stock and title are is what the bytes say, never what a reader remembers or a search snippet showed.
//
//   shopify-catalogue   a Shopify shop's /products.json page: every product it lists, each variant with its price,
//                       compare-at price, availability and SKU. It prints no currency: the shop's own /meta.json does
//                       (its base currency, which is what the catalogue's amounts are in), read with shopMeta below.
//   jsonld              a product page whose server-sent HTML carries schema.org Product data: each Offer's price,
//                       priceCurrency, availability and SKU, and a strike-through list price where the page gives one.
//   amazon              an Amazon product page as a browser drew it (ingest:capture): the price shown, the "List Price"
//                       struck through beside it where there is one, who sells it, and whether it can be bought.
//
// Each offer has a `key` a price row names to find it again, and `title`, the words the listing is sold under, which is
// where its net mass and diameter must be printed.

const unescapeHtml = (s) => String(s ?? '').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
const money = (v) => (v == null || v === '' ? null : Number.isFinite(Number(v)) ? Math.round(Number(v) * 100) / 100 : null);
const clean = (s) => unescapeHtml(s).replace(/\s+/g, ' ').trim();

/** A Shopify shop's /meta.json: its name, country and base currency. */
export function shopMeta(bytes) {
  const j = JSON.parse(Buffer.from(bytes).toString('utf8'));
  if (!j || typeof j.currency !== 'string') throw new Error('not a Shopify /meta.json: no currency');
  return { name: j.name ?? null, country: j.country ?? null, currency: j.currency, domain: j.domain ?? null };
}

/** Every variant of every product on a Shopify /products.json page. */
export function shopifyCatalogueOffers(bytes, url) {
  const j = JSON.parse(Buffer.from(bytes).toString('utf8'));
  if (!Array.isArray(j?.products)) throw new Error('not a Shopify /products.json page: no products');
  const host = new URL(url).origin;
  const offers = [];
  for (const p of j.products) {
    for (const v of p.variants ?? []) {
      const variantTitle = v.title && v.title !== 'Default Title' ? clean(v.title) : '';
      offers.push({
        key: `${p.id}:${v.id}`, product: String(p.id), variant: String(v.id), handle: p.handle,
        vendor: clean(p.vendor), productType: clean(p.product_type), productTitle: clean(p.title), variantTitle,
        title: [clean(p.title), variantTitle].filter(Boolean).join(' / '),
        sku: v.sku ? String(v.sku).trim() : null, price: money(v.price), compareAt: money(v.compare_at_price),
        available: v.available === true ? true : v.available === false ? false : null,
        url: `${host}/products/${p.handle}?variant=${v.id}`,
      });
    }
  }
  return { currency: null, offers };
}

/** The schema.org Product offers a served product page carries in its JSON-LD. */
export function jsonLdOffers(bytes, url) {
  const html = Buffer.from(bytes).toString('utf8');
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const products = [];
  const walk = (x) => {
    if (!x || typeof x !== 'object') return;
    if (Array.isArray(x)) { x.forEach(walk); return; }
    const type = [].concat(x['@type'] ?? []);
    if (type.includes('Product') || type.includes('ProductGroup')) products.push(x);
    for (const k of ['@graph', 'hasVariant', 'itemListElement', 'mainEntity']) if (x[k]) walk(x[k]);
  };
  for (const b of blocks) { try { walk(JSON.parse(b.trim())); } catch { /* a malformed block holds no offer this can read */ } }
  const offers = [];
  let i = 0;
  for (const p of products) {
    const list = [].concat(p.offers ?? []).flatMap((o) => ([].concat(o['@type'] ?? []).includes('AggregateOffer') ? [].concat(o.offers ?? []) : [o]));
    for (const o of list) {
      if (!o || o.price == null && o.priceSpecification == null) continue;
      const specs = [].concat(o.priceSpecification ?? []);
      const strike = specs.find((s) => /StrikethroughPrice|ListPrice|MSRP/i.test(String(s.priceType ?? '')));
      const price = money(o.price ?? specs.find((s) => !s.priceType)?.price ?? specs[0]?.price);
      const availability = String(o.availability ?? '');
      offers.push({
        key: String(o.sku ?? p.sku ?? o.url ?? `offer-${i}`), product: String(p.productID ?? p.sku ?? p.name ?? ''), variant: String(o.sku ?? i),
        vendor: clean(typeof p.brand === 'object' ? p.brand?.name : p.brand), productType: '', productTitle: clean(p.name), variantTitle: clean(o.name ?? ''),
        title: [clean(p.name), o.name && clean(o.name) !== clean(p.name) ? clean(o.name) : ''].filter(Boolean).join(' / '),
        sku: o.sku ? String(o.sku) : p.sku ? String(p.sku) : null, price, compareAt: strike ? money(strike.price) : null,
        currency: o.priceCurrency ?? specs.find((s) => s.priceCurrency)?.priceCurrency ?? null,
        available: /InStock|LimitedAvailability|OnlineOnly/i.test(availability) ? true : /OutOfStock|SoldOut|Discontinued|PreOrder|BackOrder/i.test(availability) ? false : null,
        url: o.url ? new URL(String(o.url), url).href : url,
      });
      i++;
    }
  }
  const currencies = [...new Set(offers.map((o) => o.currency).filter(Boolean))];
  return { currency: currencies.length === 1 ? currencies[0] : null, offers };
}

/**
 * An Amazon product page as a browser drew it. Amazon prints the price in parts ("$", "29", ".", "99") inside the buy
 * box, and a struck-through "List Price" beside it only when the price is below it. Read from the buy box alone, so a
 * sponsored product's price elsewhere on the page is never taken.
 */
export function amazonOffers(bytes, url) {
  const html = Buffer.from(bytes).toString('utf8');
  const box = (id) => { const m = new RegExp(`id="${id}"[\\s\\S]*?(?=<div id="(?:desktop_buybox|buybox|rightCol)|$)`).exec(html); return m ? m[0].slice(0, 60000) : ''; };
  const center = box('corePriceDisplay_desktop_feature_div') || box('corePrice_feature_div') || box('apex_desktop');
  const offscreen = (s) => [...s.matchAll(/<span class="a-offscreen">\s*([^<]+?)\s*<\/span>/g)].map((m) => clean(m[1]));
  const amount = (s) => { const m = /(?:CDN\$|C\$|CA\$|\$)\s?([\d,]+(?:\.\d{2})?)/.exec(s ?? ''); return m ? Number(m[1].replace(/,/g, '')) : null; };
  const shown = offscreen(center);
  const priceText = shown.find((s) => amount(s) != null);
  const listBlock = /List Price:?[\s\S]{0,600}?<span class="a-offscreen">\s*([^<]+?)\s*<\/span>/i.exec(center) ?? /List Price:?[\s\S]{0,600}?<span class="a-offscreen">\s*([^<]+?)\s*<\/span>/i.exec(html);
  const title = clean((/<span id="productTitle"[^>]*>([\s\S]*?)<\/span>/.exec(html) ?? [])[1] ?? '');
  const soldBy = clean(((/id="sellerProfileTriggerId"[^>]*>([\s\S]*?)<\/a>/.exec(html) ?? /Sold by\s*<\/span>[\s\S]{0,400}?<span[^>]*>([\s\S]*?)<\/span>/i.exec(html)) ?? [])[1] ?? '').replace(/<[^>]+>/g, '');
  const brand = clean((/id="bylineInfo"[^>]*>([\s\S]*?)<\/a>/.exec(html) ?? [])[1] ?? '').replace(/^(Visit the|Brand:)\s*/i, '').replace(/\s*Store$/i, '');
  const asin = (/\/dp\/([A-Z0-9]{10})/.exec(url) ?? /name="ASIN" value="([A-Z0-9]{10})"/.exec(html) ?? [])[1] ?? null;
  const addToCart = /id="add-to-cart-button"/.test(html);
  const unavailable = /Currently unavailable|Temporarily out of stock/i.test(html);
  const currency = /CDN\$|C\$|CA\$/.test(priceText ?? '') || /amazon\.ca/.test(url) ? 'CAD' : null;
  const price = amount(priceText);
  const listPrice = listBlock ? amount(listBlock[1]) : null;
  if (price == null) return { currency, offers: [] };
  return {
    currency,
    offers: [{
      key: asin ?? url, product: asin ?? '', variant: asin ?? '', vendor: brand, productType: '', productTitle: title, variantTitle: '', title,
      sku: asin, price, compareAt: listPrice && listPrice > price ? listPrice : null, currency, soldBy,
      available: addToCart && !unavailable ? true : unavailable ? false : null, url,
    }],
  };
}

export const FORMATS = { 'shopify-catalogue': shopifyCatalogueOffers, jsonld: jsonLdOffers, amazon: amazonOffers };

/** The offers of one document in a named format. */
export function readOffers(bytes, format, url) {
  const read = FORMATS[format];
  if (!read) throw new Error(`no offer reader for "${format}"; one of ${Object.keys(FORMATS).join(', ')}`);
  return read(bytes, url);
}

/**
 * The net filament mass a listing's own words print, in kg, or null where they print none or two that disagree. Metric
 * only: a pound figure is a shipping weight as often as a spool's, and a gross weight is not the filament's.
 */
export function massKg(text) {
  const s = String(text ?? '');
  const found = new Set();
  for (const m of s.matchAll(/(?<![\d.])(\d+(?:[.,]\d+)?)\s?(kg|kilo(?:gram)?s?|g|gr|grams?)(?![a-z])/gi)) {
    const n = Number(m[1].replace(',', '.'));
    const kg = /^k/i.test(m[2]) ? n : n / 1000;
    if (kg >= 0.1 && kg <= 10) found.add(Math.round(kg * 1000) / 1000);
  }
  return found.size === 1 ? [...found][0] : null;
}

/** Whether a listing's words sell 1.75 mm filament: true, false (another diameter only), or null (none stated). */
export function isOneSeventyFive(text) {
  const s = String(text ?? '');
  const d175 = /1[.,]75\s?mm|\b1[.,]75\b/i.test(s);
  const other = /\b(2[.,]85|3[.,]00?)\s?mm\b/i.test(s);
  return d175 ? true : other ? false : null;
}
