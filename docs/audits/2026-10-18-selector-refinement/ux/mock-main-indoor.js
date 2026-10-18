(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  document.querySelector('[data-template="1"]')?.click(); await wait(700);
  const fam = document.querySelector('details.group[data-group="Material family"]'); if (fam) fam.open = false;
  await wait(200);
  return document.getElementById('count')?.textContent;
})()
