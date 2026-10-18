window.__mock('M001', 1, {
  identity: `PLA · unfilled · 195 products from 40 makers <span class="chip chip-neutral chip-small">On Bambu Lab's H2C list</span>`,
  answer: `<div class="answer answer-PASS"><span class="chip chip-PASS">PASS</span><p>Of its 195 products, 183 meet all your requirements and 12 publish too little to judge. <button type="button" class="btn btn-sm">Show the products</button></p></div>`,
  why: `<p class="fine why-on">Shown for <b>Bambu Lab PLA Basic</b>, one of the 183 that pass.</p>
    <div class="explain-list"><div class="explain-row"><span class="chip chip-PASS">PASS</span><div>
      <div class="crit">Price at most 45 CAD/kg <span class="chip chip-neutral" style="font-size:10px">reported only</span></div>
      <div class="why">Published 27.99 CAD/kg <button type="button" class="link-btn src-link">source</button></div></div></div></div>
    <p class="fine why-also">Also met: within the H2C's capability and its nozzle, bed and chamber limits · build material (not a support).</p>`,
  key: [
    ['Tensile modulus (XY)', '2.53 GPa', 'middle half 1.93–2.87 · 55 products'],
    ['Tensile strength (XY)', '45.5 MPa', 'middle half 40–53 · 71 products'],
    ['Tensile strength (Z)', '30.6 MPa', 'middle half 22.9–34 · 39 products'],
    ['Notched Charpy impact', '6 kJ/m²', 'middle half 3.97–7.9 · 14 products'],
    ['HDT at 0.45 MPa', '55 °C', 'middle half 54–59 · 89 products'],
    ['Price', '34 CAD/kg', 'middle half 28–40 · 26 products'],
  ],
  more: 'Also: density 1,240 kg/m³ · elongation at break (XY) 7.23 % · notched Izod 5 kJ/m² · glass transition 59 °C. The median of the products that publish each on a comparable basis. Select a value to see where it comes from.',
  h2c: [
    ['Within', 'chip-PASS', 'Nozzle', '195–230 °C', 'Most products that give one · all 195 within the H2C’s 350 °C'],
    ['Within', 'chip-PASS', 'Bed', '50–60 °C', 'Most products that give one · 194 within 120 °C, 1 not published'],
    ['Within', 'chip-PASS', 'Heated chamber', 'none needed', '160 of 195 products · 183 within 65 °C, 12 not published'],
    [null, '', 'Drying', '40–65 °C, 3–12 h', 'Most advise it only for wet filament'],
    [null, '', 'Nozzle type', 'standard for most', '6 of 195 products need a hardened nozzle'],
  ],
  h2cFoot: 'Where a product’s own data sheet is silent: 93 settings from the Bambu Lab Filament Guide, 11 from a data sheet shared with another product.',
});
