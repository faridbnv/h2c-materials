// At a glance: the material's typical values as a data sheet prints them (the median of the products that publish each
// key property on a comparable basis, their range and how many they are, as the build compiled them), each with its
// place among every material's median on a track from the lowest material to the highest (material-stats.js
// propertyProfile), grouped as an engineer reads a sheet. The findings say where it stands; "How this is counted" says
// what typical, range and the track mean, what each median leaves out, and the product nearest it.

import { esc } from '../html.js';
import { fmtNumber, fmtBounded, fmtBoundedKind, publishedBound, relatedNote, missingText, convertedNote, priceSampleWords } from '../../js/ui/format.js';
import { REGISTRY } from '../../js/ui/registry.js';
import { productNameOrId, rankOf, stated } from '../../js/ui/material-facts.js';
import { propertyName } from '../../js/ui/labels.js';
import { propertyProfile, landmarkMaterials, percentileAmong } from '../../js/ui/material-stats.js';
import { leftOutWords, toughenedSplit, TOUGHENED_NOTE_SHORT, andList, lower, plural, asPublishedWords } from '../../js/ui/material-words.js';
import { rankWords } from '../charts/context.js';
import { profileTrack, profileHead } from '../charts/profile.js';
import { figure, figId } from '../charts/figure.js';
import { PROFILE_GROUPS } from '../figures.js';
import { findingsBlock, notesHtml, figureCounter, middleHalf } from './common.js';
import { glanceFindings, nearestLacks } from '../findings.js';

/** A range of a spread with a published bound's sign at its end where it is one ("5–650+"), as the selector prints it. */
const spreadRange = (s) => (s.min === s.max && !s.bounds ? esc(fmtNumber(s.min))
  : `${fmtBoundedKind(esc(fmtNumber(s.min)), s.bounds?.min)}–${fmtBoundedKind(esc(fmtNumber(s.max)), s.bounds?.max)}`);

/**
 * Whether a key property's technical name says something its title does not: a test method (a standard, "ISO 179") or a
 * qualifier in brackets ("yield or break"). Spelling the title out, or glossing its orientation, adds nothing.
 */
function addsToTitle(h) {
  const plain = h.labels.plain.toLowerCase(), technical = h.labels.technical ?? '';
  const standard = /\b(?:ISO|ASTM|IEC|DIN|UL)\s?\d+/.exec(technical)?.[0];
  if (standard && !plain.includes(standard.toLowerCase())) return true;
  return [...technical.matchAll(/\(([^)]+)\)/g)].map((x) => x[1]).some((q) => !plain.includes(q.toLowerCase()) && !/layers|orientation/i.test(q) && !/^(?:ISO|ASTM)/.test(q));
}

/**
 * Why a key property has no typical value, short for the table: not applicable, not published, or the values on file
 * and what the nearest one is (its property, the condition the key property asks for that it lacks, its value), so a
 * reader sees what is there and why it is not compared.
 */
function noneShort(e, h, c) {
  if (e?.notApplicable) return 'Not applicable';
  // Products that give it without the basis it is compared on (no stated orientation or load): said as the strength
  // section and the estimates say it, on the same count.
  const a = c.m.summary?.[h.key]?.asPublished;
  if (a?.n) return `Not compared: ${plural(a.n, 'product')} ${a.n === 1 ? 'gives' : 'give'} ${a.min === a.max ? fmtNumber(a.min, h.unit) : `${fmtNumber(a.min)}–${fmtNumber(a.max, h.unit)}`}, with ${asPublishedWords(h)}`;
  const b = e?.related?.best;
  if (b) {
    const cond = nearestLacks(h, b, c.msById.get(b.measurementId));
    const n = e.related.count;
    const g = e.related.grades;
    return `${n === 1 ? 'One value' : `${n} values`} from ${g === 1 ? 'one product\'s own sheet' : `${g} products' own sheets`}, none comparable. Nearest: ${propertyName(b.property)}, ${cond.length ? `${cond.join(', ')}, ` : ''}${fmtBounded(b.value, b.unit, b.interval)}`;
  }
  if (e?.related) return 'On file, not compared';
  return 'Not published';
}
/**
 * Why a key property has no typical value, in full under "How this is counted". Where products give it without the
 * basis it is compared on, those values come first, in the words the first screen and the table use, and the other
 * values on file after them: the nearest of those is said as another value (another document of the same product,
 * where it is), so a value without a stated bar and a moulded bar of the same number are never read as one value
 * described two ways.
 */
function noneWords(e, h, c) {
  if (!e) return missingText(null);
  if (e.notApplicable) return `Not applicable. ${e.notApplicable.reason}`;
  const a = c.m.summary?.[h.key]?.asPublished;
  if (a?.n && e.related) {
    const open = c.grades.map((g) => g.headline?.[h.key]).filter((v) => v?.level === 'as-published' && v.measurementId);
    const openIds = new Set(open.map((v) => v.measurementId));
    const others = e.related.items.filter((i) => !openIds.has(i.measurementId));
    const lead = `Not compared: ${plural(a.n, 'product')} ${a.n === 1 ? 'gives' : 'give'} ${a.min === a.max ? fmtNumber(a.min, h.unit) : `${fmtNumber(a.min)}–${fmtNumber(a.max, h.unit)}`}, with ${asPublishedWords(h)}.`;
    if (!others.length) return `${lead} No filter uses it.`;
    const b = others.find((i) => i.measurementId === e.related.best.measurementId) ?? others[0];
    const own = open.map((v) => c.msById.get(v.measurementId)).find((x) => x?.gradeId === b.gradeId);
    const where = own ? (own.sourceId === b.sourceId ? ', of the same product' : ', from another document of the same product') : '';
    const products = new Set(others.map((i) => i.gradeId)).size;
    return `${lead} ${others.length === 1 ? 'One other value' : `${others.length} other values`} from ${plural(products, 'product')} ${others.length === 1 ? 'is' : 'are'} on file, none comparable.`
      + ` The nearest, ${fmtBounded(b.value, null, b.interval)} ${b.unit} (${b.property}${where}): ${b.why}. No filter uses it.`;
  }
  if (e.related) return relatedNote(e);
  return missingText(e);
}

/** The key properties in the profile's groups, each group's keys in order, any key no group names last. */
function grouped() {
  const keys = REGISTRY.headlines.map((h) => h.key);
  const groups = PROFILE_GROUPS.map((g) => ({ title: g.title, keys: g.keys.filter((k) => keys.includes(k)) })).filter((g) => g.keys.length);
  const rest = keys.filter((k) => !groups.some((g) => g.keys.includes(k)));
  return rest.length ? [...groups, { title: 'Other', keys: rest }] : groups;
}

export default {
  id: 'key-figures',
  title: 'At a glance',
  render(c, env, place) {
    const m = c.m;
    const name = m.name;
    const groups = grouped();
    const rows = propertyProfile(m, env.ranks, groups.flatMap((g) => g.keys));
    const byKey = new Map(rows.map((r) => [r.key, r]));
    const next = figureCounter(place.n);
    const notes = [];
    // The landmarks every track ticks by name (the materials with the most products), and each track's ends.
    const landmarks = landmarkMaterials(c.db, 3, m.id);
    const trackMarks = (r, rank) => {
      const others = (rank?.entries ?? []).filter((x) => x.id !== m.id);
      const marks = landmarks.map((l) => ({ l, e: others.find((x) => x.id === l.id) })).filter(({ e }) => e)
        .map(({ l, e }) => ({ name: l.name, at: percentileAmong(rank, m.id, e.value).pct }));
      return { ends: others.length ? [others[0].value, others.at(-1).value] : null, marks };
    };
    const tr = (key) => {
      const r = byKey.get(key);
      const h = r.h ?? REGISTRY.headlines.find((x) => x.key === key);
      const e = m.headline?.[key];
      const method = addsToTitle(h) ? `<span class="meth">${esc(h.labels.technical)}</span>` : '';
      if (!r.known) {
        const est = e && !e.known && e.estimate ? ' <a href="#estimates">See the estimate</a>.' : '';
        notes.push(`<p><b>${esc(h.labels.plain)}.</b> ${esc(noneWords(e, h, c))}</p>`);
        return `<tr class="kf kf--none" data-kf="${esc(key)}"><th scope="row">${esc(h.labels.plain)}${method}</th><td class="none" colspan="4">${esc(noneShort(e, h, c))}.${est}</td></tr>`;
      }
      const sp = e.spread ?? { n: 1, min: e.value, max: e.value };
      const s = m.summary?.[key];
      const typical = e.typical?.gradeId ? c.gradeById.get(e.typical.gradeId) : null;
      const rank = env.ranks?.[key];
      const said = [
        sp.q1 != null ? `Middle half ${middleHalf(sp)} ${h.unit}.` : null,
        typical && sp.n > 1 && (sp.min !== sp.max || sp.bounds) ? `Nearest the median: ${productNameOrId(typical)}, ${fmtBounded(e.typical.value, h.unit, e.typical.interval)}.` : null,
        typical && sp.n > 1 && sp.min === sp.max && !sp.bounds ? `All ${sp.n} give ${fmtBounded(e.value, h.unit, publishedBound(e))}.` : null,
        typical && sp.n === 1 ? `One product: ${productNameOrId(typical)}.` : null,
        s ? (() => { const out = leftOutWords(h, s); return out.length ? `Left out of the median: ${andList(out)}.` : null; })() : null,
        s?.claimed ? `${toughenedSplit(s, h.unit)} ${TOUGHENED_NOTE_SHORT}` : null,
        e.converted ? convertedNote(e.converted) : null,
        h.kind === 'price' ? `Prices from a sample of ${priceSampleWords(c.db.meta)}.` : null,
        rank ? rankWords(rankOf(rank, m.id)) : null,
      ].filter(Boolean);
      notes.push(`<p><b>${esc(h.labels.plain)}.</b> ${esc(said.join(' '))}</p>`);
      const range = sp.n > 1 && (sp.min !== sp.max || sp.bounds) ? spreadRange(sp) : '—';
      const where = r.at ? `Above ${Math.round(r.at.pct)} % of the ${r.at.others} other materials' typical values` : '';
      return `<tr class="kf" data-kf="${esc(key)}" data-median="${esc(e.value)}" data-min="${esc(sp.min)}" data-max="${esc(sp.max)}" data-n="${esc(sp.n)}"${where ? ` title="${esc(where)}"` : ''}>`
        + `<th scope="row">${esc(h.labels.plain)}${method}</th>`
        + `<td class="num typ"><b>${esc(fmtBounded(e.value, null, publishedBound(e)))}</b> <span class="u">${esc(h.unit)}</span></td>`
        + `<td class="num rng">${range}</td><td class="num">${esc(String(sp.n))}</td>`
        + `<td class="prof">${r.at ? profileTrack(r, trackMarks(r, rank)) : ''}</td></tr>`;
    };
    const body = groups.map((g) => `<tbody><tr class="grp"><th scope="rowgroup" colspan="5">${esc(g.title)}</th></tr>${g.keys.map(tr).join('')}</tbody>`).join('');
    const table = `<div class="glance-box"><table class="grid glance"><thead><tr><th scope="col">Property</th><th scope="col" class="num">Typical</th><th scope="col" class="num">Range</th>`
      + `<th scope="col" class="num">Products compared</th><th scope="col" class="prof">${profileHead}</th></tr></thead>${body}</table></div>`;
    const known = rows.filter((r) => r.known);
    const ofs = known.filter((r) => r.at).map((r) => r.at.others + 1);
    const ofSpan = ofs.length ? (Math.min(...ofs) === Math.max(...ofs) ? `${ofs[0]}` : `${Math.min(...ofs)} to ${Math.max(...ofs)}`) : '';
    const no = next();
    const counted = notesHtml([
      'Typical is the median of the products that publish the property on a comparable basis: half of them give more, half less. Range is the lowest to the highest of those products, and Products counts them. The middle half, said below, is the range of the middle half of them.',
      `The track places the typical value among every other material's typical value for the property: the left end is the lowest material, the right end the highest, each with its value under it. The band is where the middle half of this material's products would sit among them. Ticked by name are ${andList(landmarks.map((l) => l.name))}, the materials with the most products, where they publish the property. It compares materials' medians, not single products, and only materials with a measured value.`,
    ]) + notes.join('');
    const html = findingsBlock(glanceFindings(name, rows)) + figure({
      id: figId(no), n: no, title: `Typical values, and where each sits among the materials`, cls: 'fig--glance', data: { 'data-glance': 'profile' },
      plot: table,
      label: null,
      read: esc(`Typical is the median of the products compared, and range their lowest to highest. Each track is the typical value's rank among the ${ofSpan} materials that publish the property; its ends give the lowest and highest material's value. The band covers the middle half of its products, and ${andList(landmarks.map((l) => l.name))} are ticked by name.`),
      counted,
    });
    return { empty: false, html, stats: { figures: 1, keyFigures: known.length } };
  },
};
