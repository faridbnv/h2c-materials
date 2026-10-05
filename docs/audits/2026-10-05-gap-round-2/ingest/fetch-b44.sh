#!/bin/sh
# Fetch the b44 documents as served (raw bytes), with their response headers, into the directory given.
# Archive pages use the id_ form so the bytes are the page as the maker served it, not the archive's rewrite.
# Then: B44_BYTES=<dir> node docs/audits/2026-10-05-gap-round-2/ingest/build-b44.mjs, and stage the copies by digest with
#   H2C_INGEST_ROOT=docs/audits/2026-10-05-gap-round-2/ingest node scripts/ingest/witness.mjs --from <dir>/manifest.csv
D="$1"
mkdir -p "$D"
f() { n="$1"; u="$2"; curl -sL -A "Mozilla/5.0 (H2C research; contact sf.hoseynian@gmail.com)" --max-time 90 -D "$D/$n.hdr" -o "$D/$n.bin" "$u"; echo "$n $(head -1 "$D/$n.hdr" | tr -d '\r') $(wc -c < "$D/$n.bin")"; }
A=http://web.archive.org/web
R=https://www.raise3d.com/materials
X=https://www.3dxtech.com
# Raise3D's own materials pages
f g026-06 "$R/petg-esd/"
f g029-09 "$R/hyper-core-abs-cf15/"
f g059-03 "$R/pa12-cf-plus/"
f g068-04 "$R/pet-gf/"
f g071-04 "$R/ppa-gf/"
f g071-05 "$R/hyper-core-ppa-gf25/"
f g080-03 "$R/pet-support/"
# 3DXTECH: the Triton3D pages, the maker's directory that maps their names (identity evidence), two archived pages, WearX
f g029-11 "https://3dxtech.com/products/triton-abs-cf-1"
f g030-11 "$X/products/triton-esd-abs-1"
f triton-dir "$X/pages/triton3d-downloadable-tds-and-sds"
f g084-01 "$A/20240618193856id_/https://www.3dxtech.com/product/fibrex-pp-gf30-polypropylene/"
f g020-01 "$A/20210422202454id_/https://www.3dxtech.com/product/3dxpro-low-gloss-petg/"
f g049-09 "https://3dxtech.com/product/wear-resistant-pa6"
# Fabru (purefil), Fiberlogy, Extrudr, Fillamentum, FormFutura, BASF Forward AM
f g137-03 "https://www.purefil.de/en/filament/coc/purefil-coc-flex-filament_1297_10017/"
f g167-03 "https://fiberlogy.com/en/filaments/flex-en/fiberflex-30d-en/"
f g167-06 "https://fiberlogy.com/en/filaments/flex-en/fiberflex-40d-en/"
# the shop answers the shop-eu address with a German page; the /en/de/ address is its English one
f g168-03 "https://extrudr.com/en/de/products/greentec-pro/"
f g168-04 "https://extrudr.com/en/it/products/greentec/"
f g014-21 "https://fillamentum.com/collections/timberfill-filament/"
f g171-02 "https://forward-am.com/wp-content/uploads/2021/01/User-Guidelines.pdf"
f g149-04 "https://www.formfutura.com/biofil-pcl"
