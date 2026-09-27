// 캘린더: 주간·월간 보기, 수업 예약(반복), 개인 일정·휴무
import * as L from './logic.js';
import { $app, db, ui, esc, newId, list, byName, $, $$, val, num, toast, settings, save, remove, gymColor, header } from './core.js';

const HOUR_PX = 56;
const WD = ['월', '화', '수', '목', '금', '토', '일'];
const DURATIONS = [30, 40, 50, 60, 90];
ui.calDate ??= L.today();
ui.calView ??= 'week';

const memberName = s => db().members.get(s.memberId)?.name || '(삭제된 회원)';
const isOffDay = (date, s = settings()) =>
  s.offDays.includes(L.weekday(date)) || list('events').some(e => e.kind === 'off' && e.date === date);
const dayOffEvents = date => list('events').filter(e => e.kind === 'off' && e.date === date);
const timed = x => !!x.time && !(x.kind === 'off' || x.allDay);

// 같은 시간대에 겹치는 일정 / 휴무 / 계약 문제 확인
function conflicts({ date, time, duration, memberId, excludeId }) {
  const out = [];
  const s = settings();
  const a = L.toMin(time), b = a + duration;
  const overlap = x => x.date === date && timed(x) && L.toMin(x.time) < b && a < L.toMin(x.time) + (x.duration || L.DEFAULT_DURATION);
  for (const x of list('sessions')) if (x.id !== excludeId && x.status !== 'noshow' && overlap(x)) out.push(`${x.time} ${memberName(x)} 수업과 겹쳐요`);
  for (const e of list('events')) if (e.kind !== 'off' && overlap(e)) out.push(`${e.time} ${e.title || '개인 일정'}과 겹쳐요`);
  if (dayOffEvents(date).length) out.push('휴무일이에요');
  else if (s.offDays.includes(L.weekday(date))) out.push('쉬는 요일이에요');
  if (L.HOLIDAYS[date]) out.push(`${L.HOLIDAYS[date]}이에요`);
  if (a < s.workStart * 60 || b > s.workEnd * 60) out.push('근무 시간 밖이에요');
  if (memberId) {
    const cur = L.memberData(db(), memberId).contracts.filter(c => c.start <= date).at(-1);
    if (!cur) out.push('이 날짜에 해당하는 계약이 없어요');
    else if (date > cur.end) out.push(`계약 종료일(${L.shortDate(cur.end)}) 이후예요`);
  }
  return out;
}

// ---------- 하단 시트 ----------
function openSheet(html) {
  closeSheet();
  const bg = document.createElement('div');
  bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet" role="dialog">${html}<button class="btn ghost block" data-close>닫기</button></div>`;
  bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-close]') || e.target.closest('a')) closeSheet(); });
  document.body.append(bg);
  return bg;
}
export function closeSheet() { document.querySelector('.sheet-bg')?.remove(); }
window.addEventListener('hashchange', closeSheet);

function sessionSheet(s) {
  const md = L.memberData(db(), s.memberId);
  const no = md.noOf.get(s.id);
  const st = { booked: '예약', done: '수업 완료', noshow: '불참' }[s.status];
  const series = s.seriesId ? list('sessions').filter(x => x.seriesId === s.seriesId && x.status === 'booked' && x.date >= s.date) : [];
  const bg = openSheet(`
    <div class="row"><span class="dot" style="background:${esc(gymColor(db().members.get(s.memberId)))}"></span><b class="name">${esc(memberName(s))}</b><span class="badge ${s.status === 'noshow' ? 'danger' : s.status === 'done' ? '' : 'gray'}">${st}</span></div>
    <p class="muted" style="margin:4px 0 12px">${esc(L.dateLabel(s.date))} ${esc(s.time || '')}${s.time ? ` · ${s.duration || L.DEFAULT_DURATION}분` : ''}${no ? ` · ${no}회차` : ''}</p>
    ${s.status === 'booked' ? `
      <a class="btn primary block" href="#/m/${s.memberId}/s/${s.id}">수업 완료 · 일지 쓰기</a>
      <button class="btn block" data-act="noshow">불참 처리 (회차 차감)</button>
      <a class="btn block" href="#/b/${s.id}">시간 변경</a>
      <button class="btn danger block" data-act="cancel">예약 취소</button>
      ${series.length > 1 ? `<button class="btn danger block" data-act="cancelSeries">이후 반복 예약 ${series.length}건 모두 취소</button>` : ''}` : `
      <a class="btn primary block" href="#/m/${s.memberId}/s/${s.id}">운동일지 ${s.exercises?.length ? '보기·수정' : '쓰기'}</a>
      ${s.status === 'done' && s.exercises?.length ? `<a class="btn block" href="#/m/${s.memberId}/s/${s.id}/send">카톡 문구</a>` : ''}
      ${s.status === 'noshow' ? '<button class="btn block" data-act="rebook">불참 취소 (예약으로 되돌리기)</button>' : ''}`}
    <a class="btn ghost block" href="#/m/${s.memberId}">회원 정보</a>`);
  bg.addEventListener('click', e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    if (act === 'noshow') { save('sessions', { ...s, status: 'noshow' }); toast('불참 처리했어요 (회차 차감)'); }
    if (act === 'rebook') { save('sessions', { ...s, status: 'booked' }); toast('예약으로 되돌렸어요'); }
    if (act === 'cancel' && confirm('이 예약을 취소할까요?')) { remove('sessions', s.id); toast('예약을 취소했어요'); }
    if (act === 'cancelSeries' && confirm(`${L.shortDate(s.date)}부터 반복 예약 ${series.length}건을 모두 취소할까요?`)) {
      series.forEach(x => remove('sessions', x.id)); toast(`${series.length}건을 취소했어요`);
    }
    closeSheet();
  });
}

function eventSheet(ev) {
  const bg = openSheet(`
    <b class="name">${esc(ev.title || (ev.kind === 'off' ? '휴무' : '개인 일정'))}</b>
    <p class="muted" style="margin:4px 0 12px">${esc(L.dateLabel(ev.date))} ${timed(ev) ? `${esc(ev.time)} · ${ev.duration}분` : '종일'}${ev.memo ? `<br>${esc(ev.memo)}` : ''}</p>
    <a class="btn block" href="#/e/${ev.id}">수정</a>
    <button class="btn danger block" data-act="del">삭제</button>`);
  bg.addEventListener('click', e => {
    if (e.target.closest('[data-act=del]') && confirm('이 일정을 삭제할까요?')) { remove('events', ev.id); closeSheet(); }
  });
}

function slotSheet(date, time) {
  openSheet(`<b class="name">${esc(L.dateLabel(date))} ${esc(time)}</b><div style="height:12px"></div>
    <a class="btn primary block" href="#/b/new/${date}/${time}">수업 예약</a>
    <a class="btn block" href="#/e/new/${date}/${time}">개인 일정</a>
    <a class="btn block" href="#/e/new/${date}/off">휴무로 지정</a>`);
}

// ---------- 캘린더 화면 ----------
// 겹치는 일정은 나란히 배치
function layout(items) {
  const sorted = items.slice().sort((a, b) => L.toMin(a.time) - L.toMin(b.time) || b.dur - a.dur);
  let cluster = [], clusterEnd = -1;
  const flush = () => { const lanes = Math.max(...cluster.map(x => x.lane)) + 1; cluster.forEach(x => (x.lanes = lanes)); cluster = []; };
  for (const it of sorted) {
    const start = L.toMin(it.time);
    if (cluster.length && start >= clusterEnd) flush();
    const used = new Set(cluster.filter(x => L.toMin(x.time) + x.dur > start).map(x => x.lane));
    let lane = 0; while (used.has(lane)) lane++;
    it.lane = lane;
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, start + it.dur);
  }
  if (cluster.length) flush();
  return sorted;
}

export function calendarPage() {
  const s = settings();
  const t = L.today();
  const d = L.parse(ui.calDate);
  const nav = `<div class="row cal-nav">
      <button class="btn sm" data-nav="-1" aria-label="이전">‹</button>
      <button class="btn sm" data-nav="0">오늘</button>
      <button class="btn sm" data-nav="1" aria-label="다음">›</button>
      <div class="grow"></div>
      <div class="tabs2" style="margin:0;width:110px"><a href="javascript:" data-view="week" class="${ui.calView === 'week' ? 'on' : ''}">주</a><a href="javascript:" data-view="month" class="${ui.calView === 'month' ? 'on' : ''}">월</a></div>
    </div>`;
  const legend = `<div class="legend cal-legend"><span><i class="lg booked"></i>예약</span><span><i class="lg done"></i>완료</span><span><i class="lg noshow"></i>불참</span><span><i class="lg general"></i>개인</span><span><i class="lg off"></i>휴무</span></div>`;
  $app.innerHTML = `${header(`${d.getFullYear()}년 ${d.getMonth() + 1}월`)}${nav}${ui.calView === 'week' ? weekHtml(s, t) : monthHtml(t)}${legend}
    <a class="btn primary fab" href="#/b/new/${ui.calDate < t ? t : ui.calDate}" aria-label="수업 예약">＋</a>`;

  $$('[data-nav]').forEach(b => b.onclick = () => {
    const n = +b.dataset.nav;
    if (!n) ui.calDate = t;
    else if (ui.calView === 'week') ui.calDate = L.addDays(ui.calDate, 7 * n);
    else { const x = L.parse(ui.calDate); ui.calDate = L.fmt(new Date(x.getFullYear(), x.getMonth() + n, 1)); }
    calendarPage();
    if (ui.calView === 'week') scrollToHour();
  });
  $$('[data-view]').forEach(a => a.onclick = () => { ui.calView = a.dataset.view; calendarPage(); if (ui.calView === 'week') scrollToHour(); });
  $app.onclick = e => {
    const ev = e.target.closest('[data-sid],[data-eid]');
    if (ev) {
      if (ev.dataset.sid) sessionSheet(db().sessions.get(ev.dataset.sid));
      else eventSheet(db().events.get(ev.dataset.eid));
      return;
    }
    const cell = e.target.closest('[data-day]');
    if (cell) { ui.calDate = cell.dataset.day; ui.calView = 'week'; calendarPage(); scrollToHour(); return; }
    const col = e.target.closest('.cal-col');
    if (col) {
      const y = e.clientY - col.getBoundingClientRect().top;
      const min = +col.dataset.h0 * 60 + Math.floor((y / HOUR_PX) * 2) * 30;
      slotSheet(col.dataset.date, L.fromMin(min));
    }
  };
}
// 라우터가 화면을 새로 열 때 호출
export function calendarEnter() { calendarPage(); if (ui.calView === 'week' && !ui.fromData) scrollToHour(); }

function scrollToHour() {
  const body = $('.cal-body');
  if (!body) return;
  const h0 = +body.dataset.h0;
  const first = +body.dataset.first;
  const now = new Date().getHours();
  const target = body.dataset.hasToday === '1' ? Math.max(h0, now - 1) : Number.isFinite(first) ? first : h0 + 2;
  requestAnimationFrame(() => window.scrollTo({ top: body.getBoundingClientRect().top + window.scrollY - 140 + (target - h0) * HOUR_PX }));
}

function weekHtml(s, t) {
  const start = L.weekStart(ui.calDate);
  const days = [...Array(7)].map((_, i) => L.addDays(start, i));
  const sessions = list('sessions').filter(x => x.date >= days[0] && x.date <= days[6]);
  const events = list('events').filter(x => x.date >= days[0] && x.date <= days[6]);
  const timedItems = [...sessions.filter(timed), ...events.filter(timed)];
  // 근무 시간 밖의 일정이 있으면 보이는 범위를 넓힘
  const h0 = Math.min(s.workStart, ...timedItems.map(x => Math.floor(L.toMin(x.time) / 60)));
  const h1 = Math.max(s.workEnd, ...timedItems.map(x => Math.ceil(L.endMin(x) / 60)));
  const first = timedItems.length ? Math.min(...timedItems.map(x => Math.floor(L.toMin(x.time) / 60))) : NaN;
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  const head = days.map((date, i) => {
    const hol = L.HOLIDAYS[date];
    const offs = dayOffEvents(date);
    const untimed = sessions.filter(x => x.date === date && !x.time);
    return `<div class="cal-dh ${date === t ? 'today' : ''} ${hol || i === 6 ? 'red' : i === 5 ? 'blue' : ''}">
      <span>${WD[i]}</span><b>${L.parse(date).getDate()}</b>
      ${hol ? `<small class="hol">${esc(hol)}</small>` : ''}
      ${offs.map(e => `<small class="chip-off" data-eid="${e.id}">${esc(e.title || '휴무')}</small>`).join('')}
      ${untimed.map(x => `<small class="chip-s st-${x.status}" data-sid="${x.id}" style="--c:${esc(gymColor(db().members.get(x.memberId)))}">${esc(memberName(x))}</small>`).join('')}
    </div>`;
  }).join('');

  const cols = days.map(date => {
    const items = layout([
      ...sessions.filter(x => x.date === date && timed(x)).map(x => ({ ...x, k: 's', dur: x.duration || L.DEFAULT_DURATION })),
      ...events.filter(x => x.date === date && timed(x)).map(x => ({ ...x, k: 'e', dur: x.duration || 60 })),
    ]);
    const blocks = items.map(it => {
      const top = ((L.toMin(it.time) - h0 * 60) / 60) * HOUR_PX;
      const height = Math.max(22, (it.dur / 60) * HOUR_PX - 2);
      const pos = `top:${top}px;height:${height}px;left:calc(${(it.lane / it.lanes) * 100}% + 1px);width:calc(${100 / it.lanes}% - 2px)`;
      if (it.k === 'e') return `<div class="ev general" data-eid="${it.id}" style="${pos}"><b>${esc(it.title || '개인')}</b><span>${esc(it.time)}</span></div>`;
      const c = gymColor(db().members.get(it.memberId));
      return `<div class="ev st-${it.status}" data-sid="${it.id}" style="${pos};--c:${esc(c)}"><b>${it.status === 'done' ? '✓' : ''}${esc(memberName(it))}</b><span>${esc(it.time)}</span></div>`;
    }).join('');
    const nowLine = date === t && nowMin >= h0 * 60 && nowMin <= h1 * 60 ? `<div class="now" style="top:${((nowMin - h0 * 60) / 60) * HOUR_PX}px"></div>` : '';
    return `<div class="cal-col ${isOffDay(date, s) ? 'off' : ''} ${L.HOLIDAYS[date] ? 'hol' : ''}" data-date="${date}" data-h0="${h0}">${blocks}${nowLine}</div>`;
  }).join('');

  const hours = [...Array(h1 - h0)].map((_, i) => `<div style="height:${HOUR_PX}px">${h0 + i}시</div>`).join('');
  return `<div class="cal">
    <div class="cal-head"><div class="cal-gutter"></div>${head}</div>
    <div class="cal-body" data-h0="${h0}" data-first="${first}" data-has-today="${days.includes(t) ? 1 : 0}" style="height:${(h1 - h0) * HOUR_PX}px;background-size:100% ${HOUR_PX}px">
      <div class="cal-gutter">${hours}</div>${cols}
    </div></div>`;
}

function monthHtml(t) {
  const d = L.parse(ui.calDate);
  const first = L.fmt(new Date(d.getFullYear(), d.getMonth(), 1));
  const last = L.fmt(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  const start = L.weekStart(first);
  const cells = [];
  for (let x = start; x <= last || cells.length % 7; x = L.addDays(x, 1)) cells.push(x);
  const sessions = list('sessions');
  return `<div class="month">${WD.map((w, i) => `<div class="mh ${i === 6 ? 'red' : i === 5 ? 'blue' : ''}">${w}</div>`).join('')}
    ${cells.map((date, i) => {
      const items = sessions.filter(x => x.date === date).sort((a, b) => L.toMin(a.time) - L.toMin(b.time));
      const hol = L.HOLIDAYS[date];
      const off = dayOffEvents(date).length || settings().offDays.includes(L.weekday(date));
      return `<div class="mc ${date.slice(0, 7) !== first.slice(0, 7) ? 'other' : ''} ${date === t ? 'today' : ''} ${off ? 'off' : ''}" data-day="${date}">
        <span class="${hol || i % 7 === 6 ? 'red' : i % 7 === 5 ? 'blue' : ''}">${L.parse(date).getDate()}</span>
        ${hol ? `<small class="hol">${esc(hol)}</small>` : ''}
        ${items.slice(0, 3).map(x => `<small class="chip-s st-${x.status}" style="--c:${esc(gymColor(db().members.get(x.memberId)))}">${esc(memberName(x))}</small>`).join('')}
        ${items.length > 3 ? `<small class="muted">+${items.length - 3}</small>` : ''}
      </div>`;
    }).join('')}</div>`;
}

// ---------- 수업 예약 ----------
function occurrences(date, weekdays, count) {
  const out = [];
  for (let d = date, guard = 0; out.length < count && guard < 400; d = L.addDays(d, 1), guard++) {
    if (weekdays.includes(L.weekday(d))) out.push(d);
  }
  return out;
}

function suggestedCount(mid) {
  if (!mid) return 1;
  const md = L.memberData(db(), mid);
  const future = md.sessions.filter(x => x.status === 'booked' && x.date >= L.today()).length;
  return Math.max(1, (md.status.remaining ?? 1) - future);
}

export function bookingForm(id, date, time, mid) {
  const s = settings();
  const isNew = id === 'new';
  const b = isNew
    ? { id: newId(), memberId: mid || '', date: date || L.today(), time: time || '20:00', duration: s.duration, status: 'booked', exercises: [] }
    : db().sessions.get(id);
  if (!b) { location.hash = '#/calendar'; return; }
  const members = list('members').filter(m => m.status !== 'ended' || m.id === b.memberId).sort(byName);
  const back = '#/calendar';
  $app.innerHTML = `${header(isNew ? '수업 예약' : '예약 변경', { back })}
    <label class="f">회원</label>
    <select id="member" ${isNew ? '' : 'disabled'}><option value="">회원 선택</option>${members.map(m => `<option value="${m.id}" ${m.id === b.memberId ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select>
    <div class="muted small" id="minfo" style="margin-top:4px"></div>
    <div class="grid2">
      <div><label class="f">날짜</label><input id="date" type="date" value="${esc(b.date)}"></div>
      <div><label class="f">시작 시간</label><input id="time" type="time" step="300" value="${esc(b.time)}"></div>
    </div>
    <label class="f">수업 시간</label>
    <div class="checks">${DURATIONS.map(n => `<label><input type="radio" name="dur" value="${n}" ${n === (b.duration || s.duration) ? 'checked' : ''}>${n}분</label>`).join('')}</div>
    ${isNew ? `<div class="card" style="margin-top:12px">
      <label class="switch"><span><b>매주 반복 예약</b><br><span class="muted small">예: 매주 월·수 20:00</span></span><input type="checkbox" id="repeat"></label>
      <div id="repeatBox" hidden>
        <label class="f">요일</label>
        <div class="chips" id="wd">${WD.map((w, i) => `<button class="chip" data-wd="${(i + 1) % 7}">${w}</button>`).join('')}</div>
        <label class="f">횟수</label><input id="count" type="number" min="1" max="60" inputmode="numeric">
      </div></div>` : ''}
    <div id="preview"></div>
    <div class="btns"><button class="btn primary" id="save">${isNew ? '예약하기' : '저장'}</button></div>
    ${isNew ? '' : `<a class="btn block" href="#/m/${b.memberId}/s/${b.id}">수업 완료 · 일지 쓰기</a>`}`;

  const wdSel = new Set([L.weekday(b.date)]);
  const syncWd = () => $$('#wd .chip').forEach(c => c.classList.toggle('on', wdSel.has(+c.dataset.wd)));
  const dur = () => +($('input[name=dur]:checked')?.value || s.duration);
  const dates = () => ($('#repeat')?.checked ? occurrences(val('date'), [...wdSel], Math.min(60, num('count') || 1)) : [val('date')]);

  const draw = () => {
    const m = db().members.get(val('member') || b.memberId);
    if (m) {
      const st = L.memberData(db(), m.id).status;
      $('#minfo').textContent = `${L.statusText(st)}${st.contract ? ` · 계약 ${L.shortDate(st.contract.start)}~${L.shortDate(st.contract.end)}` : ''}`;
    } else $('#minfo').textContent = '';
    const time = val('time');
    if (!val('date') || !time) { $('#preview').innerHTML = ''; return; }
    const rows = dates().map(date => ({ date, warn: conflicts({ date, time, duration: dur(), memberId: m?.id, excludeId: b.id }) }));
    const bad = rows.filter(r => r.warn.length).length;
    $('#preview').innerHTML = rows.length > 1 || bad ? `<h2>${rows.length > 1 ? `${rows.length}건 예약` : '확인'}${bad ? ` · ⚠ ${bad}건 확인 필요` : ''}</h2>
      <div class="card">${rows.map(r => `<div class="between" style="padding:4px 0"><span>${esc(L.dateLabel(r.date))} ${esc(time)}</span>
        <span class="small ${r.warn.length ? '' : 'muted'}" style="color:${r.warn.length ? 'var(--danger)' : ''};text-align:right">${esc(r.warn.join(', ') || '✓')}</span></div>`).join('')}</div>` : '';
  };
  $('#member').onchange = () => { if ($('#count')) $('#count').value = suggestedCount(val('member')); draw(); };
  $('#date').onchange = () => { if (!$('#repeat')?.checked) { wdSel.clear(); wdSel.add(L.weekday(val('date'))); syncWd(); } draw(); };
  $('#time').onchange = draw;
  $$('input[name=dur]').forEach(r => r.onchange = draw);
  if (isNew) {
    $('#count').value = suggestedCount(b.memberId);
    $('#repeat').onchange = e => { $('#repeatBox').hidden = !e.target.checked; draw(); };
    $$('#wd .chip').forEach(c => c.onclick = () => { const w = +c.dataset.wd; wdSel.has(w) && wdSel.size > 1 ? wdSel.delete(w) : wdSel.add(w); syncWd(); draw(); });
    $('#count').oninput = draw;
    syncWd();
  }
  draw();

  $('#save').onclick = () => {
    const memberId = val('member') || b.memberId;
    if (!memberId) return toast('회원을 선택하세요');
    const time = val('time');
    if (!val('date') || !time) return toast('날짜와 시간을 입력하세요');
    if (isNew) {
      const list_ = dates();
      const seriesId = list_.length > 1 ? newId() : null;
      list_.forEach((date, k) => save('sessions', { ...b, id: k ? newId() : b.id, memberId, date, time, duration: dur(), seriesId, createdAt: Date.now() + k }));
      toast(list_.length > 1 ? `${list_.length}건 예약했어요` : '예약했어요');
      ui.calDate = list_[0];
    } else {
      save('sessions', { ...b, date: val('date'), time, duration: dur() });
      toast('변경했어요');
      ui.calDate = val('date');
    }
    location.hash = back;
  };
}

// ---------- 개인 일정 · 휴무 ----------
export function eventForm(id, date, time) {
  const isNew = id === 'new';
  const off = time === 'off';
  const ev = isNew
    ? { id: newId(), kind: off ? 'off' : 'general', date: date || L.today(), time: off ? '' : time || '12:00', duration: 60, title: '', memo: '' }
    : db().events.get(id);
  if (!ev) { location.hash = '#/calendar'; return; }
  $app.innerHTML = `${header(isNew ? '일정 추가' : '일정 수정', { back: '#/calendar' })}
    <label class="f">종류</label>
    <div class="checks">${[['general', '개인 일정'], ['off', '휴무 (종일)']].map(([k, n]) => `<label><input type="radio" name="kind" value="${k}" ${ev.kind === k ? 'checked' : ''}>${n}</label>`).join('')}</div>
    <label class="f">제목</label><input id="title" value="${esc(ev.title)}" placeholder="예: 블루핸즈, 병원, 휴가">
    <label class="f">날짜</label><input id="date" type="date" value="${esc(ev.date)}">
    <div id="timeBox" class="grid2">
      <div><label class="f">시작 시간</label><input id="time" type="time" step="300" value="${esc(ev.time)}"></div>
      <div><label class="f">소요 (분)</label><input id="duration" type="number" min="10" step="10" value="${esc(ev.duration)}"></div>
    </div>
    <label class="f">메모</label><input id="memo" value="${esc(ev.memo)}">
    <div class="btns"><button class="btn primary" id="save">저장</button></div>
    ${isNew ? '' : '<button class="btn danger block" id="del">삭제</button>'}`;
  const kind = () => $('input[name=kind]:checked').value;
  const sync = () => { $('#timeBox').hidden = kind() === 'off'; };
  $$('input[name=kind]').forEach(r => r.onchange = sync); sync();
  $('#save').onclick = () => {
    if (!val('date')) return toast('날짜를 입력하세요');
    const k = kind();
    if (k === 'general' && !val('time')) return toast('시간을 입력하세요');
    save('events', { ...ev, kind: k, title: val('title'), date: val('date'), time: k === 'off' ? '' : val('time'), duration: num('duration') || 60, memo: val('memo') });
    ui.calDate = val('date');
    location.hash = '#/calendar';
  };
  $('#del')?.addEventListener('click', () => { if (confirm('삭제할까요?')) { remove('events', ev.id); location.hash = '#/calendar'; } });
}
