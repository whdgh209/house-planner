// 작은 SVG 차트 (한 계열만: 제목이 계열 이름이라 범례 없음)
import { parse, shortDate } from './logic.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtNum = v => (Math.round(v * 10) / 10).toLocaleString();

function ticks(lo, hi, n = 3) {
  const raw = (hi - lo) / n;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(k => k * mag).find(s => s >= raw) || raw;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
}

const table = (rows, head) => `<details class="chart-table"><summary>표로 보기</summary><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></details>`;

// points: [{date:'YYYY-MM-DD', y:number, tip?:string}]
export function lineChart(points, { unit = '', title = '' } = {}) {
  const pts = points.filter(p => Number.isFinite(p.y)).sort((a, b) => a.date.localeCompare(b.date));
  if (pts.length < 2) return '';
  const W = 340, H = 150, L = 34, R = 44, T = 12, B = 22;
  let lo = Math.min(...pts.map(p => p.y)), hi = Math.max(...pts.map(p => p.y));
  const pad = Math.max((hi - lo) * 0.15, Math.abs(hi) * 0.02, 0.5);
  lo -= pad; hi += pad;
  const t0 = parse(pts[0].date).getTime(), t1 = parse(pts.at(-1).date).getTime();
  const x = d => L + ((parse(d).getTime() - t0) / (t1 - t0 || 1)) * (W - L - R);
  const y = v => T + ((hi - v) / (hi - lo)) * (H - T - B);
  const grid = ticks(lo, hi).map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 5}" y="${y(v) + 3.5}" class="axis" text-anchor="end">${fmtNum(v)}</text>`).join('');
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.y).toFixed(1)}`).join('');
  const last = pts.at(-1);
  const tip = p => esc(p.tip || `${shortDate(p.date)} · ${fmtNum(p.y)}${unit}`);
  return `<figure class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">
    ${grid}
    <path d="${path}" class="line"/>
    ${pts.map(p => `<circle cx="${x(p.date)}" cy="${y(p.y)}" r="4" class="dotm"/>`).join('')}
    <text x="${x(last.date) + 8}" y="${y(last.y) + 4}" class="val">${fmtNum(last.y)}${esc(unit)}</text>
    <text x="${L}" y="${H - 5}" class="axis">${shortDate(pts[0].date)}</text>
    <text x="${W - R}" y="${H - 5}" class="axis" text-anchor="end">${shortDate(last.date)}</text>
    ${pts.map(p => `<circle cx="${x(p.date)}" cy="${y(p.y)}" r="14" class="hit" data-tip="${tip(p)}"/>`).join('')}
  </svg>${table(pts.map(p => [shortDate(p.date), `${fmtNum(p.y)}${unit}`]), ['날짜', title || '값'])}</figure>`;
}

// items: [{label, value, tip?}]
export function barChart(items, { unit = '', title = '' } = {}) {
  if (!items.length) return '';
  const W = 340, H = 140, L = 6, R = 6, T = 18, B = 20;
  const max = Math.max(...items.map(i => i.value), 1);
  const slot = (W - L - R) / items.length;
  const bw = Math.min(26, slot - 2); // 막대 사이 2px 이상 간격
  const r = Math.min(4, bw / 2);
  const peak = items.reduce((a, b) => (b.value > a.value ? b : a));
  const bars = items.map((it, i) => {
    const h = Math.max(1, (it.value / max) * (H - T - B));
    const x0 = L + i * slot + (slot - bw) / 2, y0 = H - B - h;
    // 위쪽만 둥글게, 바닥은 기준선에 붙임
    const d = `M${x0},${H - B}V${y0 + r}Q${x0},${y0} ${x0 + r},${y0}H${x0 + bw - r}Q${x0 + bw},${y0} ${x0 + bw},${y0 + r}V${H - B}Z`;
    const lastOrPeak = i === items.length - 1 || it === peak;
    return `<path d="${d}" class="bar ${i === items.length - 1 ? 'cur' : ''}"/>
      ${lastOrPeak ? `<text x="${x0 + bw / 2}" y="${y0 - 4}" class="val" text-anchor="middle">${fmtNum(it.value)}</text>` : ''}
      <text x="${x0 + bw / 2}" y="${H - 6}" class="axis" text-anchor="middle">${esc(it.label)}</text>
      <rect x="${L + i * slot}" y="${T - 10}" width="${slot}" height="${H - T - B + 10}" class="hit" data-tip="${esc(it.tip || `${it.label} · ${fmtNum(it.value)}${unit}`)}"/>`;
  }).join('');
  return `<figure class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">
    <line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" class="grid"/>${bars}</svg>
    ${table(items.map(i => [i.label, `${fmtNum(i.value)}${unit}`]), ['', title || '값'])}</figure>`;
}

// 차트 점·막대에 손가락/마우스를 대면 값 표시
let tipEl;
export function bindChartTips() {
  if (tipEl) return;
  tipEl = Object.assign(document.createElement('div'), { className: 'chart-tip' });
  document.body.append(tipEl);
  const show = e => {
    const t = e.target.closest?.('[data-tip]');
    if (!t) { tipEl.style.opacity = 0; return; }
    const r = t.getBoundingClientRect();
    tipEl.textContent = t.dataset.tip;
    tipEl.style.opacity = 1;
    tipEl.style.left = `${Math.min(window.innerWidth - tipEl.offsetWidth - 8, Math.max(8, r.left + r.width / 2 - tipEl.offsetWidth / 2))}px`;
    tipEl.style.top = `${r.top + window.scrollY - tipEl.offsetHeight - 6}px`;
  };
  document.addEventListener('pointerover', show);
  document.addEventListener('pointerdown', show);
  window.addEventListener('scroll', () => { tipEl.style.opacity = 0; }, { passive: true });
}
