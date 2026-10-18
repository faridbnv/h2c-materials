// Per-row "Also drawn, not in the median" in the pages' words.
for (const p of blk.querySelectorAll('*')) if (p.children.length === 0 || p.tagName === 'TD' || p.tagName === 'P') {
  if (/Also drawn, not in the median:/.test(p.textContent) && p.children.length === 0) p.textContent = p.textContent.replace('Also drawn, not in the median:', 'Not in the median:').replace(/ and (\d+) special formulations?/, ', $1 with an added filler or additive').replace(/: (\d+) special formulations?/, ': $1 with an added filler or additive');
}
// The n-counts paragraph goes: the closed "How XY and Z differ" line already says what is compared; the column says it.
for (const p of blk.querySelectorAll('p')) if (/^n counts/.test(p.textContent.trim())) p.remove();
for (const th of blk.querySelectorAll('th')) if (th.textContent.trim() === 'n') th.textContent = 'Compared';
// Pair and share lines: one sentence each, answer first.
for (const p of blk.querySelectorAll('p')) {
  if (/^Both orientations:/.test(p.textContent.trim())) p.textContent = 'Both XY and Z published: 31 products for tensile modulus, 42 for tensile strength, 37 for elongation at break.';
  if (/^Z as a share of XY/.test(p.textContent.trim())) p.textContent = 'Kept across the layers, Z as a share of XY (median of the products with both from one document): tensile modulus 89 % (67–103 %, 28 products), tensile strength 62 % (27–111 %, 38), elongation at break 59 % (3–246 %, 35).';
}
// The tally: drawn first, the rest folded.
for (const p of blk.querySelectorAll('p.imp-tally')) {
  const m = p.textContent.trim().match(/^Of the (\d+) results below, (\d+) (?:is|are) drawn above; the other (\d+): (.*)\.$/s);
  if (m) p.outerHTML = `<details class="imp-about"><summary>${m[1]} results: ${m[2]} drawn above, ${m[3]} not drawn</summary><p class="fine">Not drawn: ${m[4].replace(/(\d+) more of products already drawn/, '$1 more values of products already drawn')}.</p></details>`;
}
for (const k of blk.querySelectorAll('.imp-key span, .imp-key')) if (k.children.length === 0 && /special formulation/.test(k.textContent)) k.textContent = k.textContent.replace('special formulation', 'added filler or additive');
for (const n of blk.querySelectorAll('.imp-key *')) for (const c of n.childNodes) if (c.nodeType === 3 && /special formulation/.test(c.textContent)) c.textContent = c.textContent.replace('special formulation', 'added filler or additive');
