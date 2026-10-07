#!/bin/sh
# Fetch the b45 documents as served (raw bytes), with their response headers, into the directory given. An archived page
# uses the id_ form, so the bytes are the document as its maker served it, not the archive's rewrite.
# Then stage the copies by digest:
#   H2C_INGEST_ROOT=docs/audits/2026-10-07-quality-round/ingest node scripts/ingest/witness.mjs --from <dir>/manifest.csv
D="$1"
mkdir -p "$D"
f() { n="$1"; u="$2"; curl -sL -A "Mozilla/5.0 (H2C research; contact sf.hoseynian@gmail.com)" --max-time 90 -D "$D/$n.hdr" -o "$D/$n.bin" "$u"; echo "$n $(grep -i '^HTTP' "$D/$n.hdr" | tail -1 | tr -d '\r') $(wc -c < "$D/$n.bin") $(shasum -a 256 "$D/$n.bin" | cut -c1-16)"; }
# Polymaker Panchroma CoPE TDS V5.4: the maker's URL answers 404; the Internet Archive holds the file
f cope-v54 "http://web.archive.org/web/2025id_/https://polymaker.com/wp-content/uploads/lana-downloads/Panchroma-CoPE_TDS_EN_V5.4.pdf"
# Kimya TPC-ESD: the maker's sheet, as a retailer serves it (kimya.fr does not answer)
f kimya-tpc-esd "https://shop3duniverse.com/cdn/shop/t/116/assets/kimya-tpc-esd-3d-filament_en.pdf"
# DREMC: PBT GF data sheet and product page; Support for PLA/PETG product page
f dremc-pbt-gf-tds "https://cdn.shopify.com/s/files/1/0541/6638/8905/files/DREMC_PBT_GF_TDS_V1.1.pdf?v=1747390078"
f dremc-pbt-gf-page "https://store.dremc.com.au/products/dremc-pbt-gf-glass-fibre-filament-1-75mm-1kg"
f dremc-support-page "https://store.dremc.com.au/products/dremc-support-for-pla-petg-filament-1-75mm-1kg"
# Z-Polymers Tullomer: the data sheet and the maker's product page that names what it is
f tullomer-tds "https://img1.wsimg.com/blobby/go/136b2e12-4151-4909-bf95-965ebdb866f4/downloads/5aa2c503-9994-432a-8580-4812439d8c3a/Tullomer%20TDS%201.8.pdf?ver=1765"
f zpolymers-product "https://z-polymers.com/product-info"
