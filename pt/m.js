// 회원 보기 페이지: 트레이너가 공유한 링크(m.html#토큰)로 본인 운동일지만 읽기
import { readShare } from './store.js';
import { setsText, exerciseLabel } from './kakao.js';
import { dateLabel, shortDate, diffDays, today, dday } from './logic.js';
import { progressHtml, volumeHtml, bodyChartsHtml } from './growth-view.js';
import { bindChartTips } from './charts.js';

const $app = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KEY = 'pt-note-token';

// 홈 화면 아이콘으로 열면 주소에 토큰이 없으므로 기기에 기억해 둔 토큰 사용
let token = location.hash.slice(1);
try {
  if (token) localStorage.setItem(KEY, token);
  else token = localStorage.getItem(KEY) || '';
} catch {}

function sessionHtml(s) {
  return `<div class="card">
    <div class="between"><b>${esc(dateLabel(s.date))}</b>
      <span>${s.status === 'noshow' ? '<span class="badge danger">불참</span>' : ''}${s.no ? `<span class="badge gray">${s.no}회차</span>` : ''}</span></div>
    ${s.title ? `<div class="muted">${esc(s.title)}</div>` : ''}
    ${s.exercises?.length ? `<ol class="ex-list">${s.exercises.map(e => {
      const extra = [setsText(e.sets), e.note].filter(Boolean).join(' · ');
      return `<li>${esc(exerciseLabel(e))}${extra ? `<div class="note">${esc(extra)}</div>` : ''}</li>`;
    }).join('')}</ol>` : ''}
  </div>`;
}

async function main() {
  if (!token) return fail();
  let d;
  try { d = await readShare(token); } catch { d = null; }
  if (!d) return fail();
  const daysLeft = d.end ? diffDays(d.end, today()) : null;
  $app.innerHTML = `<header class="bar"><h1>${esc(d.name)}님의 운동일지</h1></header>
    ${d.total ? `<div class="card">
      <div class="muted small">남은 수업</div>
      <div class="big">${Math.max(0, d.remaining)}<span class="muted" style="font-size:18px"> / ${d.total}회</span></div>
      <div class="muted" style="margin-top:6px">${esc(shortDate(d.start))} ~ ${esc(shortDate(d.end))}${daysLeft != null ? ` (${esc(daysLeft < 0 ? '기간 종료' : dday(daysLeft))})` : ''}</div>
      ${d.next && d.next.date >= today() ? `<div style="margin-top:6px">다음 수업 <b>${esc(dateLabel(d.next.date))} ${esc(d.next.time)}</b></div>` : ''}
    </div>` : ''}
    <div id="growth"></div>
    <h2>운동일지</h2>
    <input class="search" id="q" type="search" placeholder="종목 검색 (예: 랫풀다운)">
    <div id="list"></div>
    <p class="muted small" style="text-align:center">${d.gym ? esc(d.gym) + ' · ' : ''}마지막 업데이트 ${esc(new Date(d.updatedAt).toLocaleDateString('ko-KR'))}<br>
    공유 버튼 → "홈 화면에 추가"를 누르면 앱처럼 바로 열 수 있어요</p>`;
  const draw = () => {
    const q = document.getElementById('q').value.trim().toLowerCase();
    const items = (d.sessions || []).filter(s => !q || (s.exercises || []).some(e => `${e.name} ${e.nameEn} ${e.note}`.toLowerCase().includes(q)));
    document.getElementById('list').innerHTML = items.map(sessionHtml).join('') || '<p class="empty">운동일지가 아직 없어요</p>';
  };
  document.getElementById('q').oninput = draw;
  draw();

  // 성장 기록: 종목별 무게, 수업별 운동량, 체중·체성분
  const asc = (d.sessions || []).slice().reverse();
  let selected = null;
  const drawGrowth = () => {
    const prog = progressHtml(asc, selected);
    selected = prog.selected;
    const extra = volumeHtml(asc) + bodyChartsHtml(d.bodies || []);
    const box = document.getElementById('growth');
    box.innerHTML = prog.selected || extra ? `<h2>성장 기록</h2>${prog.selected ? prog.html : ''}${extra}` : '';
    box.querySelectorAll('[data-ex]').forEach(c => c.onclick = () => { selected = c.dataset.ex; drawGrowth(); });
  };
  drawGrowth();
  bindChartTips();
}

function fail() {
  $app.innerHTML = `<div class="login"><img src="icon.svg" alt=""><h1 style="margin:0">링크를 열 수 없어요</h1>
    <p class="muted">링크가 잘못되었거나 공유가 중지되었어요.<br>담당 트레이너에게 새 링크를 요청해 주세요.</p></div>`;
}

main();
