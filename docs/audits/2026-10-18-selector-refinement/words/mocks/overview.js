(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  document.querySelector('[data-template="1"]')?.click(); await wait(600);
  const row = document.querySelector('tr[data-material="M001"]');
  row.scrollIntoView({ block: 'center' }); row.click(); await wait(800);
  const d = document.querySelector('.drawer');
  // Header chip: the page's words for the standing.
  for (const el of d.querySelectorAll('.drawer-head .chip, .drawer-head span')) if (el.textContent.trim() === "Type on Bambu's H2C list") el.textContent = "On Bambu Lab's H2C list";
  // The lede that restated the chip goes; the tab sentence on Overview goes.
  d.querySelector('.drawer-body > p.lede')?.remove();
  d.querySelector('#drawer-help') && (d.querySelector('#drawer-help').style.display = 'none');
  // Requirement row: one name for "reported", the reason without bookkeeping.
  for (const el of d.querySelectorAll('.explain-row .chip')) if (el.textContent.trim() === 'reported only') el.textContent = 'reported, not required';
  for (const el of d.querySelectorAll('.explain-row .why')) if (/No price observation/.test(el.textContent)) el.textContent = 'No price in the sampled shops';
  const also = d.querySelector('.why-also');
  if (also) also.textContent = 'Also met: within H2C capability · a build material, not a support · nozzle, bed and chamber within H2C limits.';
  // One "On the H2C" block in the page's words and numbers.
  const h = [...d.querySelectorAll('h3.sec')].find((x) => /H2C printability/.test(x.textContent));
  const rm = []; for (let n = h.nextElementSibling; n && !(n.tagName === 'H3'); n = n.nextElementSibling) rm.push(n);
  rm.forEach((n) => n.remove());
  h.textContent = 'On the H2C';
  const row2 = (chip, cls, label, value, note) => `<div class="fact"><span class="chip chip-${cls}">${chip}</span><div><b>${label}</b> ${value}<br><span class="fact-why">${note}</span></div></div>`;
  const plain = (label, value, note) => `<div class="fact plain"><div><b>${label}</b> ${value}<br><span class="fact-why">${note}</span></div></div>`;
  h.insertAdjacentHTML('afterend', `<div class="facts-list">
    ${row2('Within', 'PASS', 'Nozzle', '195–230 °C', 'All 195 products within the H2C’s 350 °C.')}
    ${row2('Within', 'PASS', 'Bed', '50–60 °C', '194 within the H2C’s 120 °C; 1 gives no bed temperature.')}
    ${row2('Within', 'PASS', 'Heated chamber', 'none needed', '160 of 195 need none; none asks above the H2C’s 65 °C; 12 say nothing.')}
    ${plain('Nozzle type', 'standard for most', '6 of 195 need a hardened nozzle: eSUN eStars-PLA, Nobufil PLAx, Protopasta Stainless Steel PLA, colorFabb steelFill and 2 more.')}
    ${plain('Drying', '40–65 °C, 3–12 h', '74 products call for it, 105 only for wet filament, 4 say it is not needed.')}
    ${plain('AMS', 'not stated by most', 'One profile of 297 states “AMS, AMS 2PRO, AMS HT, AMS Lite”. Bambu Lab, for AMS 2 Pro and AMS HT: “Not verified for every grade”.')}
  </div>
  <p class="fine">Each product’s settings come from its own data sheet; where it is silent, from a data sheet it shares (11 settings) or the Bambu Lab Filament Guide (93). <button type="button" class="link-btn">Products gives each one.</button></p>`);
  // Key properties' foot in the pages' words.
  for (const p of d.querySelectorAll('.drawer-body p.fine')) if (/comparable basis/.test(p.textContent)) p.textContent = 'Median of its products that state the test’s orientation or load, then their range and how many. Products with an added filler or additive are left out. Select a value for where it comes from.';
  for (const p of d.querySelectorAll('.drawer-body p.data-line')) p.innerHTML = '2,430 values from 281 documents · 1 known gap <button type="button" class="link-btn">See the sources</button>';
  return 'ok';
})()
