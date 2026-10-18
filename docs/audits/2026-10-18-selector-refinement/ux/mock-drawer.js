(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  document.querySelector('[data-template="1"]')?.click(); await wait(600);
  const row = document.querySelector('tr[data-material="M001"]');
  row.scrollIntoView({ block: 'center' }); row.click(); await wait(800);
  const body = document.querySelector('.drawer-body');
  const heads = [...body.querySelectorAll('h3.sec')];
  const byText = (t) => heads.find((h) => h.textContent.trim().toLowerCase().startsWith(t));
  const kp = byText('key properties'), pr = byText('h2c printability');
  if (kp && pr) {
    const block = [kp]; let n = kp.nextElementSibling;
    while (n && !(n.matches('h3.sec'))) { block.push(n); n = n.nextElementSibling; }
    for (const el of block) body.insertBefore(el, pr);
    pr.textContent = 'Printing on the H2C';
  }
  body.querySelector('p.lede')?.remove();
  return heads.map((h) => h.textContent.trim()).join(' | ');
})()
