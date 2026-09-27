// 성장 화면 조각 (트레이너 앱과 회원 페이지가 함께 사용)
import { exerciseProgress, sessionVolume, shortDate, BODY_METRICS } from './logic.js';
import { lineChart, barChart } from './charts.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const diff = (a, b, unit) => { const d = Math.round((b - a) * 10) / 10; return d === 0 ? '변화 없음' : `${d > 0 ? '+' : ''}${d}${unit}`; };

// 종목 고르는 칩 + 무게 그래프. selected가 없으면 기록 많은 종목
export function progressHtml(sessions, selected) {
  const list = exerciseProgress(sessions);
  if (!list.length) return { html: '<div class="card muted small">세트에 kg를 기록하면 종목별 무게 변화가 그래프로 보여요.</div>', selected: null };
  const cur = list.find(x => x.name === selected) || list[0];
  const first = cur.pts[0], last = cur.pts.at(-1);
  const html = `<div class="chips">${list.slice(0, 12).map(x => `<button class="chip ${x === cur ? 'on' : ''}" data-ex="${esc(x.name)}">${esc(x.name)}</button>`).join('')}</div>
    <div class="card">
      <div class="between"><b>${esc(cur.name)} 최고 무게</b><span class="badge ${last.y > first.y ? '' : 'gray'}">${cur.pts.length > 1 ? esc(diff(first.y, last.y, 'kg')) : '기록 1회'}</span></div>
      <div class="muted small">${shortDate(first.date)} ${first.y}kg → ${shortDate(last.date)} ${last.y}kg${last.reps ? ` × ${last.reps}회` : ''}</div>
      ${lineChart(cur.pts.map(p => ({ ...p, tip: `${shortDate(p.date)} · ${p.y}kg${p.reps ? ` × ${p.reps}회` : ''}` })), { unit: 'kg', title: `${cur.name} 최고 무게` })
        || '<p class="muted small">두 번 이상 기록하면 그래프가 그려져요.</p>'}
    </div>`;
  return { html, selected: cur.name };
}

// 최근 수업 12회의 총 볼륨(kg × 횟수)
export function volumeHtml(sessions) {
  const items = sessions.filter(s => s.status === 'done').map(s => ({ s, v: sessionVolume(s) })).filter(x => x.v > 0).slice(-12);
  if (items.length < 2) return '';
  return `<div class="card"><b>수업별 운동량</b><div class="muted small">무게 × 횟수 합계 (최근 ${items.length}회)</div>
    ${barChart(items.map(({ s, v }) => ({ label: shortDate(s.date), value: v, tip: `${shortDate(s.date)} · ${v.toLocaleString()}kg` })), { unit: 'kg', title: '수업별 운동량' })}</div>`;
}

export function bodyChartsHtml(bodies) {
  const rows = bodies.slice().sort((a, b) => a.date.localeCompare(b.date));
  return BODY_METRICS.map(([k, name, unit]) => {
    const pts = rows.filter(b => Number.isFinite(+b[k]) && b[k] !== '' && b[k] != null).map(b => ({ date: b.date, y: +b[k] }));
    if (pts.length < 2) return '';
    return `<div class="card"><div class="between"><b>${name}</b><span class="badge gray">${esc(diff(pts[0].y, pts.at(-1).y, unit))}</span></div>
      ${lineChart(pts, { unit, title: name })}</div>`;
  }).join('');
}
