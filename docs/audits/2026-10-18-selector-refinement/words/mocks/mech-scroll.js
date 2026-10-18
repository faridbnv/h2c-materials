const body = d.querySelector('.drawer-body');
const rows = blk.querySelectorAll('table tr'); const t = rows[rows.length - 2];
body.scrollTop = t.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - 20;
await wait(300);
return 'ok';
