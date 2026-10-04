#!/bin/sh
# Fetch the b41 documents as served (raw bytes), with their response headers, into the directory given.
# Archive pages use the id_ form so the bytes are the page as the maker served it, not the archive's rewrite.
D="$1"
mkdir -p "$D"
f() { n="$1"; u="$2"; curl -sL -A "Mozilla/5.0 (H2C research; contact sf.hoseynian@gmail.com)" --max-time 90 -D "$D/$n.hdr" -o "$D/$n.bin" "$u"; echo "$n $(head -1 "$D/$n.hdr" | tr -d '\r') $(wc -c < "$D/$n.bin")"; }
f m064 "http://web.archive.org/web/20251115020229id_/https://www.3dxtech.com/products/3dxstat-esd-nylon-12"
f m103 "http://web.archive.org/web/20250917152246id_/https://www.3dxtech.com/products/hyperlite%E2%84%A2-pp"
f m119 "http://web.archive.org/web/20231002212720id_/https://www.3dxtech.com/product/3dxmax-pc-asa/"
f m120 "http://web.archive.org/web/20231002204210id_/https://www.3dxtech.com/product/3dxstat-esd-pvdf/"
f m124 "http://web.archive.org/web/20240528134142id_/https://www.3dxtech.com/product/3dxstat-esd-pps/"
f m128 "http://web.archive.org/web/20230603150315id_/https://www.3dxtech.com/product/carbonx-pc-abs-cf/"
f m132 "http://web.archive.org/web/20240813223834id_/https://flashforge.com/products/pbt-gf"
f m133 "http://web.archive.org/web/20251008152550id_/https://www.flashforge.com/products/flexible"
f m146 "https://fillamentum.com/wp-content/uploads/2024/11/3D_PRINT_GUIDE_NONOILEN_8_2024.pdf"
f m154 "https://fillamentum.com/wp-content/uploads/2020/10/FI_Printing_Guide_Nylon_AF80_Aramid.pdf"
f dry "https://fillamentum.com/wp-content/uploads/2023/10/Recommendation-for-filament-processing_drying_EN_12102023.pdf"
f m174 "https://3d.nice-cdn.com/upload/file/formfutura-tds-crystalflex.pdf"
