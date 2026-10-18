(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(300);
  const fam = document.querySelector('details.group[data-group="Material family"]'); if (fam) fam.open = false;
  await wait(200);
  return [...document.querySelectorAll('details.group')].map((d) => d.dataset.group + (d.open ? '+' : '-')).join(' ');
})()
