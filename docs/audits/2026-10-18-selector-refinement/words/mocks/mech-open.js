const wait = (ms) => new Promise((r) => setTimeout(r, ms));
document.querySelector('[data-template="1"]')?.click(); await wait(600);
const row = document.querySelector('tr[data-material="M001"]');
row.scrollIntoView({ block: 'center' }); row.click(); await wait(800);
document.querySelector('.drawer [data-tab="Mechanical"]')?.click(); await wait(600);
const d = document.querySelector('.drawer');
const blk = d.querySelector('details.imp-block'); blk?.setAttribute('open', ''); await wait(300);
