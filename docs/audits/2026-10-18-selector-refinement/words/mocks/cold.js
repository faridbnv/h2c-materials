(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(300);
  const NEW = {
    'Outdoor structural part': 'A bracket that lives outside. HDT at 0.45 MPa at least 100 °C, tensile modulus at least 3 GPa, density at most 1500 kg/m³.',
    'Indoor prototype': 'A shape you want to hold in your hand tomorrow. Any build material; price at most 45 CAD/kg is reported, not required.',
    'Lightweight structure': 'A drone arm or a moving part. Density at most 1250 kg/m³ and tensile modulus at least 2.5 GPa.',
    'Warm environment': 'A part near a motor or in a car. HDT at 0.45 MPa at least 80 °C.',
    'High-stiffness fixture': 'A jig or a fixture. Tensile modulus at least 5 GPa; HDT at least 90 °C is reported, not required.',
    'Flexible component': 'A gasket, a strap or a phone case. Elongation at break at least 100 %.',
  };
  for (const card of document.querySelectorAll('[data-template]')) {
    const title = [...card.querySelectorAll('*')].find((e) => NEW[e.textContent.trim()] && e.children.length === 0);
    if (!title) continue;
    const desc = [...card.querySelectorAll('*')].find((e) => e !== title && e.children.length === 0 && e.textContent.trim().length > 40);
    if (desc) desc.textContent = NEW[title.textContent.trim()];
  }
  for (const p of document.querySelectorAll('p, div')) if (p.children.length === 0 && /^A template only fills in the controls/.test(p.textContent.trim()))
    p.textContent = 'Each template fills in the controls and decides nothing; every value stays editable. All six also ask for a build material the H2C can print: nozzle, bed and chamber within its limits.';
  for (const el of document.querySelectorAll('*')) for (const c of el.childNodes) if (c.nodeType === 3 && /^14822$/.test(c.textContent.trim())) c.textContent = c.textContent.replace('14822', '14,822');
  return 'ok';
})()
