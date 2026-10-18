window.__mock('M097', 1, {
  identity: `Industrial High-Temperature · unfilled · 7 products from 6 makers <span class="chip chip-FAIL chip-small">Beyond H2C capability</span>`,
  answer: `<div class="answer answer-FAIL"><span class="chip chip-FAIL">FAIL</span><p>Of its 7 products, none meets all your requirements and 7 fail at least one.</p></div>`,
  why: `<p class="fine why-on">Shown for its closest product, <b>3DXTECH ThermaX PEEK</b>.</p>
    <div class="explain-list">
      <div class="explain-row"><span class="chip chip-FAIL">FAIL</span><div><div class="crit">Within H2C capability</div><div class="why">Every product asks for a hotter nozzle than the H2C’s 350 °C (On the H2C, below)</div></div></div>
      <div class="explain-row"><span class="chip chip-FAIL">FAIL</span><div><div class="crit">Nozzle ≤ 350 °C</div><div class="why">Requires up to 480 °C; the H2C reaches only 350 °C</div></div></div>
      <div class="explain-row"><span class="chip chip-FAIL">FAIL</span><div><div class="crit">Bed ≤ 120 °C</div><div class="why">Requires up to 180 °C; the H2C reaches only 120 °C</div></div></div>
      <div class="explain-row"><span class="chip chip-INDETERMINATE">INDETERMINATE</span><div><div class="crit">Chamber ≤ 65 °C</div><div class="why">Recommends up to 140 °C, above the H2C’s 65 °C, but does not require it</div></div></div>
      <div class="explain-row"><span class="chip chip-UNKNOWN">UNKNOWN</span><div><div class="crit">Price at most 45 CAD/kg <span class="chip chip-neutral" style="font-size:10px">reported only</span></div><div class="why">No price observation of its own in the sampled shops</div></div></div>
    </div><p class="fine why-also">Also met: build material (not a support).</p>`,
  key: [
    ['Tensile modulus (XY)', '3.63 GPa', '3.54–3.72 · 2 products'],
    ['Tensile strength (XY)', '89.3 MPa', '77–100 · 3 products'],
    ['Tensile strength (Z)', null, ''],
    ['Notched Charpy impact', '6 kJ/m²', 'as published · no stated orientation'],
    ['HDT at 0.45 MPa', '144 °C', '140–147 · 2 products'],
    ['Price', null, ''],
  ],
  more: 'Also: density 1,300 kg/m³ · elongation at break (XY) 28 % · glass transition 143 °C · notched Izod 6 kJ/m² as published. The median of the products that publish each on a comparable basis. Select a value to see where it comes from.',
  h2c: [
    ['Beyond', 'chip-FAIL', 'Nozzle', '390–440 °C', 'Most products that give one · 7 of 7 above or only partly within the H2C’s 350 °C'],
    ['Partly', 'chip-need', 'Bed', '120 °C', 'Most products that give one · 3 within 120 °C, 4 above or only partly within'],
    ['Partly', 'chip-need', 'Heated chamber', '90 °C', 'Most products that give one · 1 within 65 °C, 5 above or only partly within, 1 not published'],
    [null, '', 'Drying', '110–140 °C, 4–8 h', '5 of 7 products call for it'],
    [null, '', 'Nozzle type', 'standard', '1 says a standard nozzle is enough; the rest are silent'],
  ],
  h2cFoot: 'Settings from each product’s own data sheet; none is read from a shared sheet or the Bambu Lab Filament Guide.',
});
