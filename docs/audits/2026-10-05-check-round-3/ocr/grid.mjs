// HTML table to rectangular grid, for the Mistral OCR reading (check round 3, 2026-10-05). Pure; no dependencies.
//
//   htmlTableToGrid(html) -> { grid, spanned, headerRows, headers, body, width }
//
// - grid: string[][], rectangular; a rowspan cell fills every row it spans (so a row label stays on each of its rows)
//   and a colspan cell fills every column it spans.
// - spanned: boolean[][], true where a cell is only a copy made by a span (not the cell the page printed there), so a
//   caller can count a colspan value once.
// - headerRows: how many leading rows are the header: the rows made of <th> cells (or in <thead>); when the table has
//   none, the leading rows that hold no digit at all, at most one.
// - headers: per column, the header cells stacked top down and joined with ' / ' (a repeated text is kept once).
// - body: the rows after the header.
// A table with several <table> elements is read as the first one.

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', deg: '°', plusmn: '±', micro: 'µ', sup2: '²', sup3: '³', ndash: '–', mdash: '—', times: '×', le: '≤', ge: '≥', rsquo: '’', lsquo: '‘' };

export function decodeEntities(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d?);/gi, (m, e) => {
    if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

const cellText = (inner) => decodeEntities(inner.replace(/<br\s*\/?>/gi, ' ').replace(/<\/(p|div|li)>/gi, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const attr = (tag, name) => { const m = new RegExp(`\\b${name}\\s*=\\s*["']?(\\d+)`, 'i').exec(tag); return m ? Math.max(1, Number(m[1])) : 1; };

/** The rows of the first table: [{ cells: [{ text, rowspan, colspan, th }], inHead }]. */
function parseRows(html) {
  const table = /<table\b[\s\S]*?<\/table>/i.exec(html)?.[0] ?? String(html);
  const rows = [];
  const head = /<thead\b[\s\S]*?<\/thead>/i.exec(table);
  const headRange = head ? [head.index, head.index + head[0].length] : null;
  for (const tr of table.matchAll(/<tr\b[^>]*>([\s\S]*?)(?=<tr\b|<\/tr>|<\/table>|$)/gi)) {
    const cells = [];
    for (const c of tr[1].matchAll(/<(t[hd])\b([^>]*)>([\s\S]*?)(?=<t[hd]\b|<\/t[hd]>|<\/tr>|$)/gi)) {
      cells.push({ text: cellText(c[3]), rowspan: attr(c[2], 'rowspan'), colspan: attr(c[2], 'colspan'), th: c[1].toLowerCase() === 'th' });
    }
    if (cells.length) rows.push({ cells, inHead: Boolean(headRange && tr.index >= headRange[0] && tr.index < headRange[1]) });
  }
  return rows;
}

export function htmlTableToGrid(html) {
  const rows = parseRows(html);
  const grid = [], spanned = [];
  const taken = []; // taken[r][c] = true once a spanning cell has claimed it
  rows.forEach((row, r) => {
    grid[r] ??= []; spanned[r] ??= []; taken[r] ??= [];
    let c = 0;
    for (const cell of row.cells) {
      while (taken[r][c]) c++;
      for (let dr = 0; dr < cell.rowspan; dr++) {
        for (let dc = 0; dc < cell.colspan; dc++) {
          const rr = r + dr, cc = c + dc;
          grid[rr] ??= []; spanned[rr] ??= []; taken[rr] ??= [];
          grid[rr][cc] = cell.text; spanned[rr][cc] = dr > 0 || dc > 0; taken[rr][cc] = true;
        }
      }
      c += cell.colspan;
    }
  });
  const width = Math.max(0, ...grid.map((r) => r?.length ?? 0));
  const height = grid.length;
  for (let r = 0; r < height; r++) {
    grid[r] ??= []; spanned[r] ??= [];
    for (let c = 0; c < width; c++) { grid[r][c] ??= ''; spanned[r][c] ??= false; }
  }
  // The header: leading rows that are all <th> (or in <thead>); else the first row when it holds no digit.
  let headerRows = 0;
  while (headerRows < rows.length && (rows[headerRows].inHead || rows[headerRows].cells.every((x) => x.th))) headerRows++;
  if (!headerRows && rows.length > 1 && !grid[0].some((t) => /\d/.test(t))) headerRows = 1;
  const headers = Array.from({ length: width }, (_, c) => {
    const parts = [];
    for (let r = 0; r < headerRows; r++) { const t = grid[r][c]; if (t && parts.at(-1) !== t) parts.push(t); }
    return parts.join(' / ');
  });
  return { grid, spanned, headerRows, headers, body: grid.slice(headerRows), width };
}

/** A grid's rows rendered as lines, cells joined with ' | ' (an empty cell kept, so columns stay countable). */
export const gridLines = (g) => g.grid.map((row) => row.join(' | ').replace(/^(\s*\|\s*)+$/, '')).filter((l) => l.trim());
