import { formatKakao, parseKakao, setsText } from './kakao.js';
import * as L from './logic.js';
import { SEED_EXERCISES } from './exercises.js';
import {
  $app, $tabs, store, db, ui, esc, newId, list, byName, $, $$, val, num, toast, settings, save, remove,
  gymOf, gymColor, shareUrl, displayName, badgeFor, header, copyText, shareText, exerciseListHtml, sessionCard,
} from './core.js';
import { calendarEnter, bookingForm, eventForm } from './calendar.js';
import { COLS } from './store.js';
import { sigPad } from './sigpad.js';
import { bindChartTips } from './charts.js';
import { progressHtml, volumeHtml, bodyChartsHtml } from './growth-view.js';
import { parseIcs, matchMember } from './ics.js';

let authState = 'loading', authUser = null;

// ---------- pages ----------
function loginPage() {
  $tabs.hidden = true;
  const denied = authState === 'denied';
  $app.innerHTML = `<div class="login">
    <img src="icon.svg" alt="">
    <h1 style="margin:0">PT 노트</h1>
    <p class="muted">${denied ? `${esc(authUser?.email)} 계정은 권한이 없어요.<br>트레이너 계정으로 로그인하세요.` : '트레이너 전용 앱입니다'}</p>
    <button class="btn primary" id="login">구글 계정으로 로그인</button>
    ${denied ? '<button class="btn ghost" id="logout">다른 계정으로</button>' : ''}
  </div>`;
  $('#login').onclick = () => (denied ? store.logout().then(() => store.login()) : store.login()).catch(e => toast(e.message));
  $('#logout')?.addEventListener('click', () => store.logout());
}

function home() {
  const gyms = list('gyms');
  const members = list('members').filter(m => m.status !== 'ended');
  const t = L.today();
  const alerts = members.map(m => ({ m, st: L.memberData(db(), m.id).status }))
    .map(x => ({ ...x, a: L.alertOf(x.st) })).filter(x => x.a)
    .sort((a, b) => b.a.level - a.a.level || byName(a.m, b.m));
  const byTime = (a, b) => a.date.localeCompare(b.date) || L.toMin(a.time || '99:00') - L.toMin(b.time || '99:00');
  const todays = list('sessions').filter(s => s.date === t).sort(byTime);
  const overdue = list('sessions').filter(s => s.date < t && L.isOverdue(s)).sort(byTime);
  const d = new Date();

  let onboarding = '';
  if (!gyms.length) onboarding = `<div class="card"><b>처음 오셨네요!</b><p class="muted">먼저 수업하는 센터(아파트 헬스장)를 등록하세요.</p><a class="btn primary block" href="#/g/new">센터 등록하기</a></div>`;
  else if (!members.length) onboarding = `<div class="card"><b>회원을 등록해 보세요</b><p class="muted">회원 정보와 계약(회차·기간)을 입력하면 잔여 회차가 자동으로 계산돼요.</p><a class="btn primary block" href="#/m/new">회원 등록하기</a></div>`;

  $app.innerHTML = `${header('PT 노트', { right: `<span class="muted">${d.getMonth() + 1}월 ${d.getDate()}일</span>` })}
    ${store.mode === 'demo' ? '<div class="banner">체험 모드예요. 데이터가 이 기기 브라우저에만 저장돼요. 실제로 쓰려면 설정에서 연결 방법을 확인하세요.</div>' : ''}
    ${onboarding}
    <h2>확인할 회원 ${alerts.length ? `(${alerts.length})` : ''}</h2>
    ${alerts.length ? alerts.map(({ m, a }) => `<a class="card link alert" href="#/m/${m.id}">
        <span class="lv l${a.level}"></span>
        <div class="grow"><div class="row"><span class="dot" style="background:${esc(gymColor(m))}"></span><b>${esc(m.name)}</b></div><div class="muted">${esc(a.text)}</div></div>
        <span class="muted">›</span></a>`).join('') : '<div class="card muted">확인할 알림이 없어요 👍</div>'}
    ${overdue.length ? `<h2>⚠ 기록 안 한 수업 (${overdue.length})</h2>${overdue.map(s => todayRow(s, true)).join('')}` : ''}
    <h2>오늘 수업 ${todays.length ? `(${todays.length})` : ''}</h2>
    ${todays.length ? todays.map(s => todayRow(s)).join('') : `<div class="card muted">오늘 예약된 수업이 없어요. <a href="#/calendar">캘린더</a>에서 예약하세요.</div>`}
    ${statsHtml()}
    ${members.length ? '<a class="btn primary fab" href="#/record" aria-label="수업 기록">＋</a>' : ''}`;
}

// 홈의 수업 한 줄: 예약이면 [기록], 완료면 [카톡]
function todayRow(s, withDate = false) {
  const m = db().members.get(s.memberId);
  const md = L.memberData(db(), s.memberId);
  const no = md.noOf.get(s.id);
  const sub = s.status === 'booked' ? (L.isOverdue(s) ? '수업 시간이 지났어요 · 일지를 써주세요' : '예약')
    : s.status === 'noshow' ? '불참 (회차 차감)' : `완료${no ? ` · ${no}회차` : ''}${s.exercises?.length ? ` · ${s.exercises.length}종목` : ''}`;
  const action = s.status === 'booked' ? `<a class="btn sm primary" href="#/m/${s.memberId}/s/${s.id}">기록</a>`
    : s.status === 'done' && s.exercises?.length ? `<a class="btn sm" href="#/m/${s.memberId}/s/${s.id}/send">카톡</a>` : '';
  return `<div class="card row">
    <span class="time-col">${withDate ? `<small>${esc(L.shortDate(s.date))}</small>` : ''}${esc(s.time || '-')}</span>
    <span class="dot" style="background:${esc(gymColor(m))}"></span>
    <a class="grow" href="#/m/${s.memberId}/s/${s.id}" style="color:inherit"><b>${esc(m?.name || '(삭제된 회원)')}</b><div class="muted small">${esc(sub)}</div></a>
    ${action}</div>`;
}

function statsHtml() {
  const done = list('sessions').filter(L.counted);
  if (!done.length) return '';
  const gyms = list('gyms');
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${L.pad(d.getMonth() + 1)}`);
  }
  const counts = months.map(ym => {
    const inMonth = done.filter(s => s.date.startsWith(ym));
    const byGym = gyms.map(g => ({ g, n: inMonth.filter(s => db().members.get(s.memberId)?.gymId === g.id).length }));
    return { ym, total: inMonth.length, byGym };
  });
  const max = Math.max(1, ...counts.map(c => c.total));
  const cur = counts.at(-1);
  const active = list('members').filter(m => m.status !== 'ended').length;
  // 기록이 시작된 달부터 이번 달까지의 평균
  const firstIdx = Math.max(0, counts.findIndex(c => c.total > 0));
  const span = counts.slice(firstIdx);
  const avg = Math.round(span.reduce((t, c) => t + c.total, 0) / span.length * 10) / 10;
  return `<h2>수업 현황</h2>
    <div class="stats">
      <div class="card"><b>${cur.total}</b><span class="muted small">이번 달 수업</span></div>
      <div class="card"><b>${active}</b><span class="muted small">진행 중 회원</span></div>
      <div class="card"><b>${avg}</b><span class="muted small">월평균</span></div>
    </div>
    <div class="card" style="margin-top:8px">
      <div class="bars">${counts.map((c, i) => `<div class="b ${i === 5 ? 'cur' : ''}">
        <span class="n">${c.total || ''}</span>
        <div class="col" style="height:${Math.max(4, (c.total / max) * 80)}%">${c.byGym.map(({ g, n }) => n ? `<div style="height:${(n / c.total) * 100}%;background:${esc(g.color)}"></div>` : '').join('')}</div>
        <span>${+c.ym.slice(5)}월</span></div>`).join('')}</div>
      <div class="legend">${gyms.map(g => `<span><span class="dot" style="background:${esc(g.color)}"></span> ${esc(g.name)} ${cur.byGym.find(x => x.g.id === g.id)?.n || 0}회</span>`).join('')}</div>
    </div>`;
}

// 홈의 ＋ : 회원 고르고 바로 기록
function recordPicker() {
  const members = list('members').filter(m => m.status !== 'ended').sort(byName);
  $app.innerHTML = `${header('누구 수업을 기록할까요?', { back: '#/home' })}
    <input class="search" id="q" placeholder="이름 검색" autocomplete="off">
    <div id="list"></div>`;
  const draw = () => {
    const q = val('q');
    $('#list').innerHTML = members.filter(m => !q || m.name.includes(q)).map(m => `<a class="card link row" href="#/m/${m.id}/s/new">
      <span class="dot" style="background:${esc(gymColor(m))}"></span><span class="grow name">${esc(m.name)}</span>${badgeFor(L.memberData(db(), m.id).status)}</a>`).join('') || '<p class="empty">회원이 없어요</p>';
  };
  $('#q').oninput = draw; draw();
}

function feed() {
  const gyms = list('gyms');
  $app.innerHTML = `${header('운동일지')}
    <input class="search" id="q" type="search" placeholder="회원 이름, 종목, 메모 검색" autocomplete="off" value="${esc(ui.feedQ || '')}">
    <div class="chips">${[['all', '전체'], ...gyms.map(g => [g.id, g.name])].map(([id, n]) => `<button class="chip ${ui.feedFilter === id ? 'on' : ''}" data-f="${esc(id)}">${esc(n)}</button>`).join('')}</div>
    <div id="list"></div>`;
  const draw = () => {
    const q = (ui.feedQ = val('q')).toLowerCase();
    let items = list('sessions').filter(s => s.status !== 'booked').sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
    if (ui.feedFilter !== 'all') items = items.filter(s => db().members.get(s.memberId)?.gymId === ui.feedFilter);
    if (q) items = items.filter(s => {
      const m = db().members.get(s.memberId);
      const hay = [m?.name, s.title, s.memo, ...(s.exercises || []).flatMap(e => [e.name, e.nameEn, e.note])].join(' ').toLowerCase();
      return hay.includes(q);
    });
    const shown = items.slice(0, ui.feedLimit);
    $('#list').innerHTML = (shown.map(s => sessionCard(s, { showMember: true })).join('') || '<p class="empty">운동일지가 없어요</p>')
      + (items.length > shown.length ? '<button class="btn block" id="more">더 보기</button>' : '');
    $('#more')?.addEventListener('click', () => { ui.feedLimit += 30; draw(); });
  };
  $('#q').oninput = draw;
  $$('.chip').forEach(c => c.onclick = () => { ui.feedFilter = c.dataset.f; feed(); });
  draw();
}

function members() {
  const gyms = list('gyms').filter(g => g.active !== false);
  const filters = [['all', '전체'], ...gyms.map(g => [g.id, g.name]), ['ended', '종료']];
  $app.innerHTML = `${header('회원')}
    <input class="search" id="q" type="search" placeholder="이름 검색" autocomplete="off">
    <div class="chips">${filters.map(([id, n]) => `<button class="chip ${ui.memberFilter === id ? 'on' : ''}" data-f="${esc(id)}">${esc(n)}</button>`).join('')}</div>
    <div id="list"></div>
    <a class="btn primary fab" href="#/m/new" aria-label="회원 추가">＋</a>`;
  const draw = () => {
    const q = val('q');
    const f = ui.memberFilter;
    const items = list('members').filter(m => (f === 'ended' ? m.status === 'ended' : m.status !== 'ended' && (f === 'all' || m.gymId === f)))
      .filter(m => !q || m.name.includes(q)).sort(byName);
    $('#list').innerHTML = items.map(m => {
      const md = L.memberData(db(), m.id);
      const last = md.sessions.at(-1);
      return `<a class="card link row" href="#/m/${m.id}">
        <span class="dot" style="background:${esc(gymColor(m))}"></span>
        <div class="grow"><div class="name">${esc(m.name)} ${m.share?.enabled ? '<span title="공유 중">🔗</span>' : ''}</div>
          <div class="muted small">${esc(gymOf(m)?.name || '')}${last ? ` · 최근 ${L.shortDate(last.date)}` : ''}</div></div>
        ${badgeFor(md.status)}</a>`;
    }).join('') || `<p class="empty">${f === 'ended' ? '종료된 회원이 없어요' : '회원이 없어요. ＋ 버튼으로 등록하세요'}</p>`;
  };
  $('#q').oninput = draw;
  $$('.chip').forEach(c => c.onclick = () => { ui.memberFilter = c.dataset.f; members(); });
  draw();
}

function memberDetail(id, tab = 'summary') {
  const m = db().members.get(id);
  if (!m) { $app.innerHTML = `${header('회원', { back: '#/members' })}<p class="empty">회원을 찾을 수 없어요</p>`; return; }
  const md = L.memberData(db(), id);
  const st = md.status;
  const logs = md.sessions.filter(s => s.status !== 'booked');
  const upcoming = md.sessions.filter(s => s.status === 'booked').sort((a, b) => a.date.localeCompare(b.date) || L.toMin(a.time) - L.toMin(b.time));
  const next = L.nextBooking(md.sessions);
  const tabs = [['summary', '요약'], ['sessions', `일지 ${logs.length || ''}`], ['growth', '성장'], ['contracts', '계약'], ['share', '공유']];
  const upcomingHtml = upcoming.length ? `<h2>예정된 수업 (${upcoming.length})</h2><div class="card">${upcoming.map(s => `<a class="between" href="#/b/${s.id}" style="color:inherit;padding:5px 0">
      <span>${esc(L.dateLabel(s.date))} ${esc(s.time || '')}</span>${L.isOverdue(s) ? '<span class="badge warn">기록 필요</span>' : '<span class="muted">›</span>'}</a>`).join('')}</div>` : '';
  let body = '';

  if (tab === 'summary') {
    const info = [['운동목적', (m.goals || []).join(', ')], ['운동경험', m.experience], ['병력·질환', m.medical], ['통증·수술 이력', m.pain],
      ['식습관·생활패턴', m.lifestyle], ['바라는 점', m.wishes], ['메모', m.memo]].filter(([, v]) => v);
    body = `<div class="card">
        ${st.state === 'none' ? `<p class="muted">계약 정보가 없어요.</p><a class="btn primary block" href="#/m/${id}/c/new">계약 등록</a>` : `
        <div class="between"><div><div class="muted small">잔여 회차</div><div class="big">${Math.max(0, st.remaining)}<span class="muted" style="font-size:18px"> / ${st.total}회</span></div></div>${badgeFor(st)}</div>
        <div class="muted" style="margin-top:6px">${esc(L.shortDate(st.contract.start))} ~ ${esc(L.shortDate(st.contract.end))} (${esc(L.dday(st.daysLeft))})</div>`}
        ${next ? `<div style="margin-top:6px">다음 수업 <b>${esc(L.dateLabel(next.date))} ${esc(next.time || '')}</b>${upcoming.length > 1 ? ` <span class="muted">외 ${upcoming.length - 1}건</span>` : ''}</div>` : ''}
      </div>
      <div class="btns"><a class="btn primary" href="#/m/${id}/s/new">＋ 수업 기록</a><a class="btn" href="#/b/new/m/${id}">수업 예약</a></div>
      <h2>회원 정보</h2>
      <div class="card">
        <div class="between"><span class="muted">센터</span><span>${esc(gymOf(m)?.name || '-')}${m.unit ? ` · ${esc(m.unit)}` : ''}</span></div>
        ${m.phone ? `<div class="between"><span class="muted">연락처</span><a href="tel:${esc(m.phone)}">${esc(m.phone)}</a></div>` : ''}
        ${m.birth ? `<div class="between"><span class="muted">생년월일</span><span>${esc(m.birth)}${m.gender ? ` · ${esc(m.gender)}` : ''}</span></div>` : ''}
      </div>
      ${info.length ? `<h2>상담 내용</h2><div class="card">${info.map(([k, v]) => `<div style="margin-bottom:8px"><div class="muted small">${k}</div><div style="white-space:pre-wrap">${esc(v)}</div></div>`).join('')}</div>` : ''}
      <div class="btns"><a class="btn" href="#/m/${id}/edit">정보 수정</a>
        <button class="btn" id="toggleEnd">${m.status === 'ended' ? '다시 진행 중으로' : '종료 처리'}</button></div>`;
  } else if (tab === 'sessions') {
    body = `<div class="btns"><a class="btn primary" href="#/m/${id}/s/new">＋ 수업 기록</a><a class="btn" href="#/m/${id}/import">카톡 기록 가져오기</a></div>
      ${upcomingHtml}${upcoming.length ? '<h2>운동일지</h2>' : ''}
      ${logs.slice().reverse().map(s => sessionCard(s)).join('') || '<p class="empty">운동일지가 없어요</p>'}`;
  } else if (tab === 'growth') {
    const bodies = list('bodies').filter(b => b.memberId === id).sort((a, b) => b.date.localeCompare(a.date));
    const prog = progressHtml(md.sessions, ui.growthEx?.[id]);
    const numIn = (idName, label, unit) => `<div><label class="f">${label} (${unit})</label><input id="${idName}" type="number" inputmode="decimal" step="0.1"></div>`;
    body = `<h2>종목별 무게</h2>${prog.html}${volumeHtml(md.sessions)}
      <h2>체중·체성분</h2>
      <div class="card">
        <div class="grid2">
          <div><label class="f">측정일</label><input id="bdate" type="date" value="${L.today()}"></div>
          ${numIn('bweight', '체중', 'kg')}${numIn('bmuscle', '골격근량', 'kg')}${numIn('bfat', '체지방률', '%')}
        </div>
        <label class="f">메모</label><input id="bmemo" placeholder="예: 인바디 측정, 공복">
        <div class="btns" style="margin-bottom:0"><button class="btn primary" id="addBody">기록 추가</button></div>
      </div>
      ${bodyChartsHtml(bodies)}
      ${bodies.length ? `<div class="card">${bodies.map(b => `<div class="between" style="padding:5px 0">
        <span><b>${esc(L.shortDate(b.date))}</b> <span class="muted small">${L.BODY_METRICS.filter(([k]) => b[k] != null).map(([k, n, u]) => `${n} ${b[k]}${u}`).join(' · ')}${b.memo ? ` · ${esc(b.memo)}` : ''}</span></span>
        <button class="btn ghost sm" data-bid="${b.id}" aria-label="삭제">✕</button></div>`).join('')}</div>` : ''}`;
  } else if (tab === 'contracts') {
    body = `<a class="btn primary block" href="#/m/${id}/c/new">＋ ${md.contracts.length ? '재등록' : '신규 계약'}</a><div style="height:10px"></div>
      ${md.contracts.slice().reverse().map(c => {
        const used = md.usage.get(c.id).length;
        return `<div class="card"><a href="#/m/${id}/c/${c.id}" style="color:inherit;display:block">
          <div class="between"><b>${c.type === 'renew' ? '재등록' : '신규'} · ${c.count}회</b><span class="badge ${c === st.contract ? '' : 'gray'}">${used}/${c.count} 사용</span></div>
          <div class="muted">${esc(c.start)} ~ ${esc(c.end)}${c.price ? ` · ${Number(c.price).toLocaleString()}원` : ''}${c.memberSign ? ' · 서명 ✓' : ''}</div></a>
          <div class="btns" style="margin-bottom:0"><a class="btn sm" href="#/m/${id}/card/${c.id}">세션카드 보기 · 인쇄</a></div></div>`;
      }).join('') || '<p class="empty">계약이 없어요</p>'}`;
  } else if (tab === 'share') {
    const url = shareUrl(m);
    body = `<div class="card">
        <label class="switch"><span><b>회원에게 운동일지 공유</b><br><span class="muted small">링크를 받은 회원이 로그인 없이 본인 기록을 볼 수 있어요</span></span>
          <input type="checkbox" id="shareOn" ${m.share?.enabled ? 'checked' : ''}></label>
        ${m.share?.enabled ? `<label class="switch"><span>체중·체성분도 보여주기</span><input type="checkbox" id="shareBody" ${m.share.body ? 'checked' : ''}></label>` : ''}
      </div>
      ${url ? `<div class="card"><div class="muted small">공유 링크</div><div style="word-break:break-all">${esc(url)}</div>
        <div class="btns"><button class="btn primary" id="sendLink">카톡으로 보내기</button><button class="btn" id="copyLink">복사</button></div>
        <button class="btn ghost small" id="regen">링크 새로 만들기 (이전 링크는 막힘)</button></div>` : ''}
      <div class="card muted small">회원에게 보이는 것: 이름(성 제외), 잔여 회차, 계약 기간, 다음 수업, 운동일지(종목·세트·메모), 무게 그래프${m.share?.body ? ', 체중·체성분' : ''}<br>
        보이지 않는 것: 연락처, 주소, 상담 내용, 병력, 결제 금액, 서명, 트레이너 메모</div>`;
  }

  $app.innerHTML = `${header(m.name, { back: '#/members', right: `<span class="dot" style="background:${esc(gymColor(m))}"></span>` })}
    <div class="tabs2">${tabs.map(([k, n]) => `<a href="#/m/${id}/${k}" class="${k === tab ? 'on' : ''}">${n}</a>`).join('')}</div>${body}`;

  $('#toggleEnd')?.addEventListener('click', () => {
    save('members', { ...m, status: m.status === 'ended' ? 'active' : 'ended' });
    toast(m.status === 'ended' ? '진행 중으로 바꿨어요' : '종료 회원으로 옮겼어요');
  });
  $$('[data-ex]').forEach(c => c.onclick = () => { ui.growthEx = { ...ui.growthEx, [id]: c.dataset.ex }; memberDetail(id, 'growth'); });
  $('#addBody')?.addEventListener('click', () => {
    const rec = { id: newId(), memberId: id, date: val('bdate'), weight: num('bweight'), muscle: num('bmuscle'), fat: num('bfat'), memo: val('bmemo') };
    if (!rec.date) return toast('측정일을 입력하세요');
    if (rec.weight == null && rec.muscle == null && rec.fat == null) return toast('체중, 골격근량, 체지방률 중 하나는 입력하세요');
    save('bodies', rec); toast('기록했어요');
  });
  $$('[data-bid]').forEach(b => b.onclick = () => { if (confirm('이 기록을 삭제할까요?')) remove('bodies', b.dataset.bid); });
  $('#shareBody')?.addEventListener('change', e => save('members', { ...m, share: { ...m.share, body: e.target.checked } }));
  $('#shareOn')?.addEventListener('change', e => {
    if (e.target.checked) {
      save('members', { ...m, share: { ...m.share, enabled: true, token: m.share?.token || newId(24) } });
      toast('공유를 켰어요');
    } else {
      if (m.share?.token) store.delShare(m.share.token);
      save('members', { ...m, share: { ...m.share, enabled: false, token: null } });
      toast('공유를 껐어요. 이전 링크는 더 이상 열리지 않아요');
    }
  });
  const linkMsg = () => `${displayName(m.name)}님 운동일지는 여기서 언제든 볼 수 있어요 😊\n${shareUrl(db().members.get(id))}`;
  $('#sendLink')?.addEventListener('click', () => shareText(linkMsg()));
  $('#copyLink')?.addEventListener('click', () => copyText(shareUrl(m)));
  $('#regen')?.addEventListener('click', () => {
    if (!confirm('새 링크를 만들면 이전 링크는 열리지 않아요. 계속할까요?')) return;
    store.delShare(m.share.token);
    save('members', { ...m, share: { ...m.share, enabled: true, token: newId(24) } });
    toast('새 링크를 만들었어요');
  });
}

const GOALS = ['다이어트', '근력증가', '체력향상', '체형교정', '재활'];
const EXPERIENCE = ['', '경험없음', '6개월 미만', '1년 미만', '1년 이상', '2년 이상'];

function memberForm(id) {
  const isNew = !id;
  const m = isNew ? { id: newId(), status: 'active', gymId: db().gyms.has(ui.memberFilter) ? ui.memberFilter : list('gyms')[0]?.id } : db().members.get(id);
  if (!m) return memberDetail(id);
  const gyms = list('gyms');
  const opt = (v, cur) => `<option ${v === cur ? 'selected' : ''}>${esc(v)}</option>`;
  $app.innerHTML = `${header(isNew ? '회원 등록' : '회원 정보 수정', { back: isNew ? '#/members' : `#/m/${id}` })}
    ${gyms.length ? '' : '<div class="banner">먼저 설정 → 센터 관리에서 센터를 등록하세요.</div>'}
    <label class="f">이름 *</label><input id="name" value="${esc(m.name)}" autocomplete="off">
    <label class="f">센터</label><select id="gymId">${gyms.map(g => `<option value="${g.id}" ${g.id === m.gymId ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select>
    <div class="grid2">
      <div><label class="f">성별</label><select id="gender">${['', '남', '여'].map(v => opt(v, m.gender)).join('')}</select></div>
      <div><label class="f">생년월일</label><input id="birth" value="${esc(m.birth)}" placeholder="예: 70.9.27"></div>
      <div><label class="f">연락처</label><input id="phone" type="tel" value="${esc(m.phone)}" placeholder="010-"></div>
      <div><label class="f">동/호수</label><input id="unit" value="${esc(m.unit)}" placeholder="예: 205/1102"></div>
    </div>
    <h2>상담일지</h2>
    <label class="f">운동목적</label>
    <div class="checks">${GOALS.map(g => `<label><input type="checkbox" name="goal" value="${g}" ${(m.goals || []).includes(g) ? 'checked' : ''}>${g}</label>`).join('')}</div>
    <label class="f">운동경험</label><select id="experience">${EXPERIENCE.map(v => opt(v, m.experience)).join('')}</select>
    <label class="f">과거병력 및 질환</label><input id="medical" value="${esc(m.medical)}" placeholder="없음">
    <label class="f">참고사항 (수술 이력, 통증 부위)</label><input id="pain" value="${esc(m.pain)}">
    <label class="f">평소 식습관 및 생활패턴</label><textarea id="lifestyle">${esc(m.lifestyle)}</textarea>
    <label class="f">트레이너에게 바라는 점</label><input id="wishes" value="${esc(m.wishes)}">
    <label class="f">트레이너 메모 (회원에게 안 보임)</label><textarea id="memo">${esc(m.memo)}</textarea>
    <div class="btns"><button class="btn primary" id="save">저장</button></div>
    ${isNew ? '' : '<button class="btn danger block" id="del">회원 삭제</button>'}`;

  $('#save').onclick = () => {
    const name = val('name');
    if (!name) return toast('이름을 입력하세요');
    const goals = $$('input[name=goal]:checked').map(i => i.value);
    save('members', { ...m, name, gymId: val('gymId'), gender: val('gender'), birth: val('birth'), phone: val('phone'), unit: val('unit'),
      goals, experience: val('experience'), medical: val('medical'), pain: val('pain'), lifestyle: val('lifestyle'), wishes: val('wishes'), memo: val('memo') });
    toast('저장했어요');
    location.hash = isNew ? `#/m/${m.id}/c/new` : `#/m/${m.id}`;
  };
  $('#del')?.addEventListener('click', () => {
    if (!confirm(`${m.name} 회원과 모든 운동일지·계약을 삭제할까요? 되돌릴 수 없어요.`)) return;
    for (const col of ['sessions', 'contracts']) {
      for (const o of list(col).filter(o => o.memberId === id)) { db()[col].delete(o.id); store.del(col, o.id); }
    }
    if (m.share?.token) store.delShare(m.share.token);
    remove('members', id);
    location.hash = '#/members';
  });
}

const POLICIES = [
  ['period', '기간 내 미진행 강습은 소멸'], ['sign', '매 강습 완료 서명 확인'],
  ['cancel3h', '당일 3시간 전 미변경 시 불참(차감)'], ['refund', '환불·양도 불가 (이사·전출·질병 예외)'],
];

function contractForm(mid, cid) {
  const m = db().members.get(mid);
  if (!m) return memberDetail(mid);
  const isNew = cid === 'new';
  const s = settings();
  const prev = L.memberData(db(), mid).contracts.at(-1);
  const c = isNew
    ? { id: newId(), memberId: mid, type: prev ? 'renew' : 'new', start: L.today(), count: prev?.count || 10, price: prev?.price || '', agreed: {} }
    : db().contracts.get(cid);
  if (!c) return memberDetail(mid, 'contracts');
  const autoEnd = (start, count) => L.addDays(start, count * s.daysPerSession - 1);
  c.end ??= autoEnd(c.start, c.count);
  let endTouched = !isNew;

  $app.innerHTML = `${header(isNew ? `${m.name} · 계약 등록` : `${m.name} · 계약 수정`, { back: `#/m/${mid}/contracts` })}
    <label class="f">구분</label>
    <div class="checks">${[['new', '신규'], ['renew', '재등록']].map(([v, n]) => `<label><input type="radio" name="type" value="${v}" ${c.type === v ? 'checked' : ''}>${n}</label>`).join('')}</div>
    <div class="grid2">
      <div><label class="f">세션 횟수</label><input id="count" type="number" inputmode="numeric" min="1" value="${esc(c.count)}"></div>
      <div><label class="f">금액 (원)</label><input id="price" type="number" inputmode="numeric" value="${esc(c.price)}"></div>
      <div><label class="f">시작일</label><input id="start" type="date" value="${esc(c.start)}"></div>
      <div><label class="f">종료일</label><input id="end" type="date" value="${esc(c.end)}"></div>
    </div>
    <p class="muted small">종료일은 ${s.daysPerSession}일 × 횟수로 자동 계산돼요 (10회 = ${10 * s.daysPerSession}일). 직접 바꿀 수도 있어요.</p>
    <label class="f">정책 동의 확인</label>
    <div class="checks">${POLICIES.map(([k, n]) => `<label><input type="checkbox" name="agree" value="${k}" ${c.agreed?.[k] || isNew ? 'checked' : ''}>${n}</label>`).join('')}</div>
    <label class="f">메모</label><input id="cmemo" value="${esc(c.memo)}" placeholder="예: 입금 확인 9/3">
    <label class="f">회원 서명</label><div id="sigM"></div>
    <label class="f">트레이너 서명</label><div id="sigT"></div>
    <div class="btns"><button class="btn primary" id="save">저장</button></div>
    ${isNew ? '' : '<button class="btn danger block" id="del">계약 삭제</button>'}`;

  if (!c.trainerSign && isNew) c.trainerSign = s.trainerSign || '';
  sigPad($('#sigM'), { value: c.memberSign, label: '회원 서명', onChange: v => { c.memberSign = v; } });
  sigPad($('#sigT'), { value: c.trainerSign, label: '트레이너 서명', onChange: v => { c.trainerSign = v; } });
  const recalc = () => { if (!endTouched && val('start') && num('count')) $('#end').value = autoEnd(val('start'), num('count')); };
  $('#start').oninput = recalc; $('#count').oninput = recalc;
  $('#end').oninput = () => { endTouched = true; };
  $('#save').onclick = () => {
    const count = num('count');
    if (!count || !val('start') || !val('end')) return toast('횟수와 기간을 입력하세요');
    const agreed = Object.fromEntries($$('input[name=agree]').map(i => [i.value, i.checked]));
    save('contracts', { ...c, type: $('input[name=type]:checked').value, count, price: num('price'), start: val('start'), end: val('end'), agreed, memo: val('cmemo') });
    toast('계약을 저장했어요');
    location.hash = `#/m/${mid}`;
  };
  $('#del')?.addEventListener('click', () => {
    if (!confirm('이 계약을 삭제할까요? 운동일지는 남아요.')) return;
    remove('contracts', c.id);
    location.hash = `#/m/${mid}/contracts`;
  });
}

// ----- 수업 기록 (가장 자주 쓰는 화면) -----
let draft = null;

function frequentExercises(mid) {
  const count = new Map();
  for (const s of list('sessions')) for (const e of s.exercises || []) count.set(e.name, (count.get(e.name) || 0) + (s.memberId === mid ? 3 : 1));
  const favs = list('exercises').filter(e => e.fav).map(e => e.name);
  const top = [...count.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
  return [...new Set([...favs, ...top])].slice(0, 14);
}
const dictByName = name => list('exercises').find(e => e.name === name);

function sessionForm(mid, sid) {
  const m = db().members.get(mid);
  if (!m) return memberDetail(mid);
  const isNew = sid === 'new';
  const src = isNew ? { id: newId(), memberId: mid, date: L.today(), status: 'done', title: '', memo: '', exercises: [] } : db().sessions.get(sid);
  if (!src) return memberDetail(mid, 'sessions');
  draft = structuredClone(src);
  if (draft.status === 'booked') draft.status = 'done'; // 예약 → 수업 완료로 기록
  if (!draft.exercises.length) draft.exercises.push({ name: '', nameEn: '', note: '', sets: [] });
  const md = L.memberData(db(), mid);
  const last = md.sessions.filter(s => s.id !== draft.id && s.exercises?.length && s.date <= draft.date).at(-1);

  $app.innerHTML = `${header(`${m.name} · ${isNew ? '수업 기록' : '운동일지 수정'}`, { back: isNew ? `#/m/${mid}` : `#/m/${mid}/sessions` })}
    <div class="grid2">
      <div><label class="f">날짜</label><input id="date" type="date" value="${esc(draft.date)}"></div>
      <div><label class="f">시간 (선택)</label><input id="time" type="time" step="300" value="${esc(draft.time)}"></div>
    </div>
    <div>
      <div><label class="f">수업</label><select id="status"><option value="done">수업 완료</option><option value="noshow">불참 (회차 차감)</option></select></div>
    </div>
    <div class="muted small" id="noInfo" style="margin-top:6px"></div>
    <label class="f">운동 제목 (선택)</label><input id="title" value="${esc(draft.title)}" placeholder="예: 등운동, 흉추들고">
    <label class="f">운동 종목</label>
    <div class="quick">${frequentExercises(mid).map(n => `<button class="chip" data-q="${esc(n)}">＋ ${esc(n)}</button>`).join('')}
      ${last ? `<button class="chip" id="copyLast">↺ 지난 수업(${esc(L.shortDate(last.date))}) 불러오기</button>` : ''}</div>
    <div id="exs"></div>
    <button class="btn block" id="addEx">＋ 종목 추가</button>
    <label class="f">트레이너 메모 (회원에게 안 보임)</label><textarea id="memo" placeholder="컨디션, 다음 수업 계획 등">${esc(draft.memo)}</textarea>
    <label class="f">회원 서명 (강습 완료 확인)</label><div id="sigM"></div>
    <label class="f">트레이너 서명</label><div id="sigT"></div>
    <div class="btns"><button class="btn" id="saveOnly">저장</button><button class="btn primary" id="saveSend">저장 후 카톡 보내기</button></div>
    ${isNew ? '' : '<button class="btn danger block" id="del">운동일지 삭제</button>'}
    <datalist id="exlist">${list('exercises').sort(byName).map(e => `<option value="${esc(e.name)}">${esc(e.nameEn || '')}</option>`).join('')}</datalist>`;
  $('#status').value = draft.status;
  if (!draft.trainerSign && (isNew || src.status === 'booked')) draft.trainerSign = settings().trainerSign || '';
  sigPad($('#sigM'), { value: draft.memberSign, label: '회원 서명', onChange: v => { draft.memberSign = v; } });
  sigPad($('#sigT'), { value: draft.trainerSign, label: '트레이너 서명', onChange: v => { draft.trainerSign = v; } });

  const updateNo = () => {
    const date = val('date');
    const c = md.contracts.filter(c => c.start <= date).at(-1);
    if (!c) { $('#noInfo').textContent = '※ 이 날짜에 해당하는 계약이 없어 회차에 포함되지 않아요'; return; }
    const before = md.usage.get(c.id).filter(s => s.id !== draft.id && s.date <= date).length;
    const n = before + 1;
    $('#noInfo').textContent = `이 수업: ${n}회차 / ${c.count}회${date > c.end ? ' · ⚠ 계약 기간이 지났어요' : ''}${n > c.count ? ' · ⚠ 계약 회차 초과' : ''}`;
  };
  $('#date').onchange = updateNo; $('#status').onchange = updateNo; updateNo();

  const drawEx = () => {
    $('#exs').innerHTML = draft.exercises.map((e, i) => `<div class="ex" data-i="${i}">
      <div class="top"><span class="num">${i + 1}</span>
        <input data-f="name" list="exlist" value="${esc(e.name)}" placeholder="종목 (예: 랫풀다운)" autocomplete="off" style="flex:1">
        <button class="icon" data-act="up" aria-label="위로">↑</button><button class="icon" data-act="down" aria-label="아래로">↓</button><button class="icon" data-act="del" aria-label="삭제">✕</button></div>
      <div class="sub">
        <input data-f="nameEn" value="${esc(e.nameEn)}" placeholder="영문 이름 (자동 입력)">
        <input data-f="note" value="${esc(e.note)}" placeholder="코칭 포인트 (예: 팔꿈치 몸통에 붙이고)">
        ${(e.sets || []).map((s, si) => `<div class="setrow"><span>${si + 1}세트</span>
          <input data-si="${si}" data-sf="kg" type="number" inputmode="decimal" value="${esc(s.kg)}" placeholder="kg">
          <input data-si="${si}" data-sf="reps" type="number" inputmode="numeric" value="${esc(s.reps)}" placeholder="회">
          <button class="icon" data-act="delset" data-si="${si}" aria-label="세트 삭제">✕</button></div>`).join('')}
        <button class="btn sm" data-act="addset">＋ 세트 (kg·횟수)</button>
      </div></div>`).join('');
  };
  drawEx();

  $('#exs').addEventListener('input', e => {
    const box = e.target.closest('.ex'); if (!box) return;
    const ex = draft.exercises[+box.dataset.i];
    if (e.target.dataset.f) ex[e.target.dataset.f] = e.target.value;
    if (e.target.dataset.sf) ex.sets[+e.target.dataset.si][e.target.dataset.sf] = e.target.value === '' ? null : Number(e.target.value);
    if (e.target.dataset.f === 'name') {
      const d = dictByName(e.target.value.trim());
      if (d?.nameEn && (!ex.nameEn || ex.autoEn)) { ex.nameEn = d.nameEn; ex.autoEn = true; $('[data-f=nameEn]', box).value = d.nameEn; }
    }
    if (e.target.dataset.f === 'nameEn') ex.autoEn = false;
  });
  $('#exs').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const i = +b.closest('.ex').dataset.i, exs = draft.exercises, ex = exs[i];
    const act = b.dataset.act;
    if (act === 'del') exs.splice(i, 1);
    if (act === 'up' && i > 0) [exs[i - 1], exs[i]] = [exs[i], exs[i - 1]];
    if (act === 'down' && i < exs.length - 1) [exs[i + 1], exs[i]] = [exs[i], exs[i + 1]];
    if (act === 'addset') { ex.sets ||= []; const p = ex.sets.at(-1); ex.sets.push({ kg: p?.kg ?? null, reps: p?.reps ?? null }); }
    if (act === 'delset') ex.sets.splice(+b.dataset.si, 1);
    drawEx();
    if (act === 'addset') $$(`.ex[data-i="${i}"] [data-sf=kg]`).at(-1)?.focus();
  });
  const addExercise = (name = '') => {
    const d = dictByName(name);
    const emptyIdx = draft.exercises.findIndex(x => !x.name.trim());
    const ex = { name, nameEn: d?.nameEn || '', note: d?.defaultNote || '', sets: [], autoEn: true };
    if (name && emptyIdx >= 0) draft.exercises[emptyIdx] = ex; else draft.exercises.push(ex);
    drawEx();
    if (!name) $$('.ex [data-f=name]').at(-1).focus();
  };
  $('#addEx').onclick = () => addExercise();
  $$('.quick [data-q]').forEach(b => b.onclick = () => { addExercise(b.dataset.q); toast(`${b.dataset.q} 추가`); });
  $('#copyLast')?.addEventListener('click', () => {
    draft.exercises = structuredClone(last.exercises);
    if (!val('title')) $('#title').value = last.title || '';
    drawEx(); toast('지난 수업 종목을 불러왔어요');
  });

  const doSave = () => {
    const date = val('date');
    if (!date) { toast('날짜를 입력하세요'); return false; }
    const exercises = draft.exercises.filter(x => x.name.trim()).map(x => ({
      name: x.name.trim(), nameEn: (x.nameEn || '').trim(), note: (x.note || '').trim(),
      sets: (x.sets || []).filter(s => s.kg != null || s.reps != null),
    }));
    const status = val('status');
    if (status === 'done' && !exercises.length && !confirm('종목 없이 저장할까요?')) return false;
    // 새 종목은 사전에 자동 추가, 영문이 비어 있던 종목은 채워 넣기
    for (const x of exercises) {
      const d = dictByName(x.name);
      if (!d) save('exercises', { id: newId(), name: x.name, nameEn: x.nameEn, part: '' });
      else if (!d.nameEn && x.nameEn) save('exercises', { ...d, nameEn: x.nameEn });
    }
    save('sessions', { ...draft, date, time: val('time'), status, title: val('title'), memo: val('memo'), exercises });
    return true;
  };
  $('#saveOnly').onclick = () => { if (doSave()) { toast('저장했어요'); location.hash = `#/m/${mid}/sessions`; } };
  $('#saveSend').onclick = () => { if (doSave()) location.hash = `#/m/${mid}/s/${draft.id}/send`; };
  $('#del')?.addEventListener('click', () => {
    if (!confirm('이 운동일지를 삭제할까요?')) return;
    remove('sessions', draft.id);
    location.hash = `#/m/${mid}/sessions`;
  });
}

function sendPage(mid, sid) {
  const m = db().members.get(mid), s = db().sessions.get(sid);
  if (!m || !s) return memberDetail(mid, 'sessions');
  const text = formatKakao(s, { closing: settings().closing, shareUrl: shareUrl(m) });
  $app.innerHTML = `${header(`${m.name} · 카톡 보내기`, { back: `#/m/${mid}/sessions` })}
    <p class="muted">아래 문구를 카톡으로 보내세요. 공유 버튼에서 카카오톡을 고르면 돼요.</p>
    <pre class="kakao">${esc(text)}</pre>
    <div class="btns"><button class="btn primary" id="share">카톡으로 보내기</button><button class="btn" id="copy">복사</button></div>
    ${m.share?.enabled ? '' : `<div class="card muted small">💡 회원 공유를 켜면 문구 끝에 "지난 운동일지 보기" 링크가 붙어요. <a href="#/m/${mid}/share">공유 설정</a></div>`}
    <a class="btn block" href="#/m/${mid}/sessions">완료</a>`;
  $('#share').onclick = () => shareText(text);
  $('#copy').onclick = () => copyText(text);
}

function importForm(mid) {
  const m = db().members.get(mid);
  if (!m) return memberDetail(mid);
  let parsed = [];
  $app.innerHTML = `${header(`${m.name} · 카톡 기록 가져오기`, { back: `#/m/${mid}/sessions` })}
    <p class="muted">카톡 대화방에서 이 회원에게 보낸 운동일지를 복사해서 붙여넣으세요. "6.15 운동 / 1.백익스텐션(back extension)" 형식을 자동으로 읽어요.</p>
    <p class="muted small">팁: 카톡 대화방 → 메뉴 → 대화 내용 내보내기(텍스트)를 쓰면 한 번에 가져올 수 있어요.</p>
    <label class="f">연도 (카톡 날짜 줄이 없을 때 사용)</label><input id="year" type="number" value="${new Date().getFullYear()}">
    <label class="f">카톡 내용</label><textarea id="text" style="min-height:180px" placeholder="6.15 운동&#10;1.백익스텐션(back extension)&#10;2.케이블 암풀다운(cable arm pull down)"></textarea>
    <button class="btn block" id="parse">읽어오기</button>
    <div id="preview"></div>`;
  $('#parse').onclick = () => {
    const existing = new Set(list('sessions').filter(s => s.memberId === mid).map(s => s.date));
    parsed = parseKakao($('#text').value, num('year') || new Date().getFullYear());
    $('#preview').innerHTML = parsed.length ? `<h2>${parsed.length}개 수업을 찾았어요</h2>
      ${parsed.map((s, i) => `<label class="card" style="display:block"><div class="row"><input type="checkbox" data-i="${i}" ${existing.has(s.date) ? '' : 'checked'} style="width:auto">
        <b>${esc(L.dateLabel(s.date))}</b>${s.title ? `<span class="muted">${esc(s.title)}</span>` : ''}${existing.has(s.date) ? '<span class="badge warn">이미 있음</span>' : ''}</div>
        ${exerciseListHtml(s.exercises)}</label>`).join('')}
      <button class="btn primary block" id="doImport">선택한 수업 저장</button>` : '<p class="empty">운동일지를 찾지 못했어요. "6.15 운동"으로 시작하는 줄이 있는지 확인하세요.</p>';
    $('#doImport')?.addEventListener('click', () => {
      const picked = $$('#preview input[data-i]:checked').map(i => parsed[+i.dataset.i]);
      picked.forEach((s, k) => {
        for (const x of s.exercises) if (!dictByName(x.name)) save('exercises', { id: newId(), name: x.name, nameEn: x.nameEn, part: '' });
        save('sessions', { id: newId(), memberId: mid, date: s.date, status: 'done', title: s.title, memo: '', exercises: s.exercises, createdAt: Date.now() + k });
      });
      toast(`${picked.length}개 수업을 저장했어요`);
      location.hash = `#/m/${mid}/sessions`;
    });
  };
}

// 종이 세션카드와 같은 모양 (인쇄·PDF 저장용)
function sessionCardPage(mid, cid) {
  const m = db().members.get(mid), c = db().contracts.get(cid);
  if (!m || !c) return memberDetail(mid, 'contracts');
  const used = L.memberData(db(), mid).usage.get(cid);
  const s = settings();
  const img = src => (src ? `<img src="${src}" alt="서명">` : '');
  const rows = [...Array(Math.max(c.count, used.length))].map((_, i) => {
    const x = used[i];
    const training = !x ? '' : x.status === 'noshow' ? '불참 (차감)' : (x.exercises || []).map(e => e.name).join(', ');
    return `<tr><td>${i + 1} SESSION</td><td>${x ? esc(L.shortDate(x.date)) : ''}</td><td class="tr">${esc(training)}</td><td>${img(x?.trainerSign)}</td><td>${img(x?.memberSign)}</td></tr>`;
  }).join('');
  $app.innerHTML = `${header(`${m.name} · 세션카드`, { back: `#/m/${mid}/contracts` })}
    <div class="btns noprint"><button class="btn primary" id="print">인쇄 · PDF로 저장</button></div>
    <div class="paper">
      <h1>SESSION CARD</h1>
      <table class="info">
        <tr><th>트레이너</th><td>${esc(s.trainerName || '')}</td><th>회원명</th><td>${esc(m.name)}</td></tr>
        <tr><th>운동목적</th><td>${esc((m.goals || []).join(', '))}</td><th>H/P</th><td>${esc(m.phone || '')}</td></tr>
        <tr><th>계약</th><td colspan="3">${c.type === 'renew' ? '재등록' : '신규'} ${c.count}회 · ${esc(c.start)} ~ ${esc(c.end)}</td></tr>
      </table>
      <table class="grid"><thead><tr><th>SESSION</th><th>월/일</th><th>TRAINING</th><th>Trainer sign</th><th>회원서명</th></tr></thead><tbody>${rows}</tbody></table>
    </div>
    <p class="muted small noprint">인쇄 화면에서 "PDF로 저장"을 고르면 파일로 보관할 수 있어요.</p>`;
  $('#print').onclick = () => window.print();
}

function icsImport() {
  const members = list('members').filter(m => m.status !== 'ended').sort(byName);
  let rows = [], showAll = false;
  $app.innerHTML = `${header('구글 캘린더 가져오기', { back: '#/settings' })}
    <div class="card small">
      <b>.ics 파일 받는 방법 (PC에서)</b>
      <ol style="margin:6px 0;padding-left:20px">
        <li>calendar.google.com → 오른쪽 위 톱니바퀴 → 설정</li>
        <li>왼쪽 "가져오기/내보내기" → 내보내기 → zip 파일 받기</li>
        <li>zip을 풀면 나오는 <b>.ics</b> 파일을 폰으로 옮겨서 아래에서 선택</li>
      </ol>
      <span class="muted">오늘부터 4개월 안의 일정만 가져와요. 일정 제목에 회원 이름이 있으면 그 회원 예약으로 연결돼요.</span>
    </div>
    <label class="btn primary block">.ics 파일 선택<input type="file" id="file" accept=".ics,text/calendar" hidden></label>
    <div id="preview"></div>`;
  const exists = new Set([
    ...list('sessions').map(x => `${x.memberId}|${x.date}|${x.time}`),
    ...list('events').map(x => `ev|${x.date}|${x.time}|${x.title}`),
  ]);
  const draw = () => {
    if (!rows.length) { $('#preview').innerHTML = '<p class="empty">가져올 일정이 없어요</p>'; return; }
    const shown = rows.filter(r => showAll || r.member);
    const hidden = rows.length - shown.length;
    $('#preview').innerHTML = `<h2>일정 ${rows.length}건 · 회원 연결 ${rows.filter(r => r.member).length}건</h2>
      ${shown.map(r => `<div class="card row">
        <div class="grow"><b>${esc(L.dateLabel(r.date))} ${esc(r.time || '종일')}</b>${r.dup ? ' <span class="badge warn">이미 있음</span>' : ''}
          <div class="muted small">${esc(r.title)}${r.time ? ` · ${r.duration}분` : ''}</div></div>
        <select data-i="${r.i}" style="width:130px">
          <option value="">가져오지 않음</option><option value="ev" ${r.pick === 'ev' ? 'selected' : ''}>${r.allDay ? '휴무' : '개인 일정'}</option>
          ${r.allDay ? '' : members.map(m => `<option value="${m.id}" ${r.pick === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}
        </select></div>`).join('')}
      ${hidden ? `<button class="btn block" id="showAll">회원과 연결 안 된 일정 ${hidden}건 보기</button>` : ''}
      <button class="btn primary block" id="doImport" style="margin-top:10px">선택한 일정 가져오기</button>`;
    $$('#preview select').forEach(sel => sel.onchange = () => { rows[+sel.dataset.i].pick = sel.value; });
    $('#showAll')?.addEventListener('click', () => { showAll = true; draw(); });
    $('#doImport').onclick = () => {
      let n = 0;
      rows.filter(r => r.pick).forEach((r, k) => {
        if (r.pick === 'ev') save('events', { id: newId(), kind: r.allDay ? 'off' : 'general', title: r.title, date: r.date, time: r.time, duration: r.duration, memo: '' });
        else save('sessions', { id: newId(), memberId: r.pick, date: r.date, time: r.time, duration: r.duration, status: 'booked', exercises: [], createdAt: Date.now() + k });
        n++;
      });
      toast(`${n}건을 가져왔어요`);
      location.hash = '#/calendar';
    };
  };
  $('#file').onchange = async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      rows = parseIcs(await f.text()).map((r, i) => {
        const member = r.allDay ? null : matchMember(r.title, members);
        const dup = member ? exists.has(`${member.id}|${r.date}|${r.time}`) : exists.has(`ev|${r.date}|${r.time}|${r.title}`);
        return { ...r, i, member, dup, pick: member && !dup ? member.id : '' };
      });
      draw();
    } catch (err) { toast(`파일을 읽지 못했어요: ${err.message}`); }
  };
}

function settingsPage() {
  const s = settings();
  const gyms = list('gyms');
  $app.innerHTML = `${header('설정')}
    <h2>센터 관리</h2>
    ${gyms.map(g => `<a class="card link row" href="#/g/${g.id}"><span class="dot" style="background:${esc(g.color)}"></span><span class="grow">${esc(g.name)}</span>${g.active === false ? '<span class="badge gray">종료</span>' : ''}<span class="muted">›</span></a>`).join('')}
    <a class="btn block" href="#/g/new">＋ 센터 추가</a>
    <h2>트레이너</h2>
    <div class="card">
      <label class="f" style="margin-top:0">이름 (세션카드에 표시)</label><input id="tname" value="${esc(s.trainerName)}" placeholder="예: 이종열">
      <label class="f">내 서명 (수업 기록·계약 때 자동으로 들어가요)</label><div id="mySig"></div>
      <button class="btn primary sm" id="saveSig" hidden>서명 저장</button>
    </div>
    <h2>수업 기록</h2>
    <a class="card link row" href="#/exercises"><span class="grow">종목 사전 · 즐겨찾기</span><span class="muted">${db().exercises.size}개 ›</span></a>
    <div class="card">
      <label class="switch"><span>카톡 문구 끝에 "입니다" 붙이기</span><input type="checkbox" id="closing" ${s.closing ? 'checked' : ''}></label>
      <label class="f">계약 기간 계산 (1회당 일수)</label><input id="dps" type="number" min="1" value="${s.daysPerSession}">
      <p class="muted small">10회 계약 = ${10 * s.daysPerSession}일</p>
    </div>
    <h2>캘린더</h2>
    <div class="card">
      <div class="grid2">
        <div><label class="f" style="margin-top:0">근무 시작</label><select id="ws">${[...Array(24)].map((_, h) => `<option value="${h}" ${h === s.workStart ? 'selected' : ''}>${h}시</option>`).join('')}</select></div>
        <div><label class="f" style="margin-top:0">근무 끝</label><select id="we">${[...Array(24)].map((_, h) => `<option value="${h + 1}" ${h + 1 === s.workEnd ? 'selected' : ''}>${h + 1}시</option>`).join('')}</select></div>
      </div>
      <label class="f">쉬는 요일</label>
      <div class="chips" id="offDays">${['월', '화', '수', '목', '금', '토', '일'].map((w, i) => `<button class="chip ${s.offDays.includes((i + 1) % 7) ? 'on' : ''}" data-wd="${(i + 1) % 7}">${w}</button>`).join('')}</div>
      <label class="f">기본 수업 시간</label><select id="dur">${[30, 40, 50, 60, 90].map(n => `<option value="${n}" ${n === s.duration ? 'selected' : ''}>${n}분</option>`).join('')}</select>
      <p class="muted small">근무 시간 밖이나 쉬는 요일에 예약하면 경고가 나와요. 특정 날짜 휴무는 캘린더 빈칸을 눌러 "휴무로 지정"하세요.</p>
      <a class="btn block" href="#/import-ics">구글 캘린더에서 일정 가져오기</a>
    </div>
    <h2>데이터</h2>
    <div class="card">
      <div class="btns" style="margin:0"><button class="btn" id="export">백업 파일 저장</button><label class="btn" style="margin:0">백업 불러오기<input type="file" id="import" accept=".json" hidden></label></div>
      <p class="muted small">체험 모드에서 쓰던 데이터를 백업해 두었다가 Firebase 연결 후 불러오면 그대로 옮겨져요.</p>
    </div>
    <h2>계정</h2>
    <div class="card">
      ${store.mode === 'demo'
        ? `<p style="margin-top:0"><b>체험 모드</b> — 이 기기 브라우저에만 저장돼요. 여러 기기에서 쓰고 회원에게 링크를 보내려면 <code>pt/README.md</code> 순서대로 Firebase를 연결하세요.</p><button class="btn danger" id="reset">체험 데이터 모두 지우기</button>`
        : `<p style="margin-top:0">${esc(authUser?.email || '')}</p><button class="btn" id="logout">로그아웃</button>`}
    </div>`;
  $('#closing').onchange = e => save('settings', { ...s, id: 'main', closing: e.target.checked });
  $('#dps').onchange = () => { const v = num('dps'); if (v > 0) { save('settings', { ...s, id: 'main', daysPerSession: v }); settingsPage(); } };
  const setS = patch => save('settings', { ...settings(), id: 'main', ...patch });
  $('#ws').onchange = () => { const v = +val('ws'); if (v < settings().workEnd) setS({ workStart: v }); else toast('근무 끝보다 빨라야 해요'); };
  $('#we').onchange = () => { const v = +val('we'); if (v > settings().workStart) setS({ workEnd: v }); else toast('근무 시작보다 늦어야 해요'); };
  $('#dur').onchange = () => setS({ duration: +val('dur') });
  $$('#offDays .chip').forEach(c => c.onclick = () => {
    const w = +c.dataset.wd, cur = new Set(settings().offDays);
    cur.has(w) ? cur.delete(w) : cur.add(w);
    setS({ offDays: [...cur] }); c.classList.toggle('on');
  });
  $('#tname').onchange = () => setS({ trainerName: val('tname') });
  // 획마다 저장하면 화면이 다시 그려져 서명이 끊기므로 버튼으로 저장
  let pendingSig = '';
  sigPad($('#mySig'), { value: s.trainerSign, label: '내 서명', onChange: v => { pendingSig = v; $('#saveSig').hidden = false; } });
  $('#saveSig').onclick = () => { setS({ trainerSign: pendingSig }); toast(pendingSig ? '서명을 저장했어요' : '서명을 지웠어요'); };
  $('#export').onclick = () => {
    const out = { app: 'pt-note', version: 1, exportedAt: new Date().toISOString() };
    for (const c of COLS) out[c] = list(c);
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' })),
      download: `pt-note-backup-${L.today()}.json`,
    });
    a.click(); URL.revokeObjectURL(a.href);
  };
  $('#import').onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.app !== 'pt-note') throw new Error('PT 노트 백업 파일이 아니에요');
      const n = COLS.reduce((t, c) => t + (data[c]?.length || 0), 0);
      if (!confirm(`${n}개 항목을 불러올까요? 같은 항목은 덮어써요.`)) return;
      // 회원을 마지막에 저장해야 공유 사본이 완성된 데이터로 만들어짐
      for (const c of [...COLS.filter(c => c !== 'members'), 'members']) for (const o of data[c] || []) save(c, o);
      toast('불러왔어요');
    } catch (err) { toast(err.message); }
  };
  $('#reset')?.addEventListener('click', () => { if (confirm('체험 데이터를 모두 지울까요?')) { store.reset(); location.reload(); } });
  $('#logout')?.addEventListener('click', () => store.logout());
}

const COLORS = ['#34b27b', '#f5b400', '#3b6ce8', '#e5484d', '#8e5cf7', '#f07c2e', '#14a3b8', '#7a8499'];
function gymForm(id) {
  const isNew = id === 'new';
  const g = isNew ? { id: newId(), name: '', color: COLORS[db().gyms.size % COLORS.length], active: true } : db().gyms.get(id);
  if (!g) { location.hash = '#/settings'; return; }
  const used = list('members').filter(m => m.gymId === g.id).length;
  $app.innerHTML = `${header(isNew ? '센터 추가' : '센터 수정', { back: '#/settings' })}
    <label class="f">센터 이름</label><input id="gname" value="${esc(g.name)}" placeholder="예: 구서 롯데캐슬">
    <label class="f">색상 (달력·목록 표시)</label>
    <div class="checks">${COLORS.map(c => `<label><input type="radio" name="color" value="${c}" ${c === g.color ? 'checked' : ''}><span class="dot" style="background:${c};width:18px;height:18px"></span></label>`).join('')}</div>
    <label class="f">강습료 입금 계좌 (선택)</label><input id="account" value="${esc(g.account)}" placeholder="예: 부산은행 000-0000-0000-00 (입주자대표회의)">
    <div class="card" style="margin-top:12px"><label class="switch"><span>진행 중인 센터</span><input type="checkbox" id="active" ${g.active !== false ? 'checked' : ''}></label></div>
    <div class="btns"><button class="btn primary" id="save">저장</button></div>
    ${isNew ? '' : `<button class="btn danger block" id="del" ${used ? 'disabled' : ''}>${used ? `회원 ${used}명이 있어 삭제할 수 없어요` : '센터 삭제'}</button>`}`;
  $('#save').onclick = () => {
    const name = val('gname');
    if (!name) return toast('센터 이름을 입력하세요');
    save('gyms', { ...g, name, color: $('input[name=color]:checked')?.value || g.color, account: val('account'), active: $('#active').checked });
    location.hash = '#/settings';
  };
  $('#del')?.addEventListener('click', () => { if (confirm('센터를 삭제할까요?')) { remove('gyms', g.id); location.hash = '#/settings'; } });
}

function exercisesPage() {
  let editing = null;
  $app.innerHTML = `${header('종목 사전', { back: '#/settings' })}
    <p class="muted small">★ 즐겨찾기한 종목은 수업 기록 화면 맨 앞에 나와요. 새 종목은 수업 기록 때 자동으로 추가돼요.</p>
    <div class="card">
      <div class="grid2"><input id="ename" placeholder="종목 이름"><input id="een" placeholder="영문"></div>
      <div class="grid2" style="margin-top:8px"><input id="epart" placeholder="부위 (예: 등)"><input id="enote" placeholder="기본 코칭 포인트"></div>
      <div class="btns" style="margin-bottom:0"><button class="btn primary" id="esave">추가</button><button class="btn ghost" id="ecancel" hidden>취소</button></div>
    </div>
    <input class="search" id="q" type="search" placeholder="검색">
    <div id="list"></div>`;
  const fill = e => {
    editing = e;
    $('#ename').value = e?.name || ''; $('#een').value = e?.nameEn || ''; $('#epart').value = e?.part || ''; $('#enote').value = e?.defaultNote || '';
    $('#esave').textContent = e ? '수정' : '추가'; $('#ecancel').hidden = !e;
    if (e) window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const draw = () => {
    const q = val('q').toLowerCase();
    const items = list('exercises').filter(e => !q || `${e.name} ${e.nameEn} ${e.part}`.toLowerCase().includes(q))
      .sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0) || (a.part || '힣').localeCompare(b.part || '힣', 'ko') || byName(a, b));
    $('#list').innerHTML = items.map(e => `<div class="card row" data-id="${e.id}">
      <button class="icon btn ghost" data-act="fav" style="font-size:20px;color:${e.fav ? '#f5b400' : 'var(--line)'}">★</button>
      <div class="grow" data-act="edit"><b>${esc(e.name)}</b> <span class="muted">${esc(e.nameEn)}</span>${e.part ? ` <span class="badge gray">${esc(e.part)}</span>` : ''}</div>
      <button class="icon btn ghost" data-act="del">✕</button></div>`).join('') || '<p class="empty">없어요</p>';
  };
  $('#q').oninput = draw;
  $('#ecancel').onclick = () => fill(null);
  $('#esave').onclick = () => {
    const name = val('ename');
    if (!name) return toast('종목 이름을 입력하세요');
    save('exercises', { ...(editing || { id: newId() }), name, nameEn: val('een'), part: val('epart'), defaultNote: val('enote') });
    fill(null); draw();
  };
  $('#list').onclick = e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const ex = db().exercises.get(b.closest('[data-id]').dataset.id);
    if (b.dataset.act === 'fav') save('exercises', { ...ex, fav: !ex.fav });
    if (b.dataset.act === 'edit') fill(ex);
    if (b.dataset.act === 'del' && confirm(`${ex.name}을(를) 사전에서 뺄까요? (지난 운동일지는 그대로)`)) remove('exercises', ex.id);
    draw();
  };
  draw();
}

// ---------- router ----------
const routes = [
  [/^#\/(home)?$/, home, 'home'],
  [/^#\/record$/, recordPicker, 'home'],
  [/^#\/calendar$/, calendarEnter, 'calendar'],
  [/^#\/b\/new(?:\/(\d{4}-\d\d-\d\d))?(?:\/(\d\d:\d\d))?(?:\/m\/(\w+))?$/, (d, t, mid) => bookingForm('new', d, t, mid), 'calendar', true],
  [/^#\/b\/(\w+)$/, id => bookingForm(id), 'calendar', true],
  [/^#\/e\/new\/(\d{4}-\d\d-\d\d)\/(\d\d:\d\d|off)$/, (d, t) => eventForm('new', d, t), 'calendar', true],
  [/^#\/e\/(\w+)$/, id => eventForm(id), 'calendar', true],
  [/^#\/feed$/, feed, 'feed'],
  [/^#\/members$/, members, 'members'],
  [/^#\/m\/new$/, () => memberForm(null), 'members', true],
  [/^#\/m\/(\w+)\/edit$/, memberForm, 'members', true],
  [/^#\/m\/(\w+)\/c\/(\w+)$/, contractForm, 'members', true],
  [/^#\/m\/(\w+)\/s\/(\w+)\/send$/, sendPage, 'members'],
  [/^#\/m\/(\w+)\/s\/(\w+)$/, sessionForm, 'members', true],
  [/^#\/m\/(\w+)\/import$/, importForm, 'members', true],
  [/^#\/m\/(\w+)\/card\/(\w+)$/, sessionCardPage, 'members'],
  [/^#\/m\/(\w+)(?:\/(summary|sessions|growth|contracts|share))?$/, memberDetail, 'members'],
  [/^#\/settings$/, settingsPage, 'settings'],
  [/^#\/g\/(\w+)$/, gymForm, 'settings', true],
  [/^#\/exercises$/, exercisesPage, 'settings'],
  [/^#\/import-ics$/, icsImport, 'settings', true],
];

function render(fromData = false) {
  if (authState === 'loading') return;
  if (authState !== 'ok') return loginPage();
  if (!store.ready) { $app.innerHTML = '<p class="empty">불러오는 중…</p>'; return; }
  const hash = location.hash || '#/home';
  const route = routes.find(([re]) => re.test(hash));
  if (!route) { location.hash = '#/home'; return; }
  const [re, fn, tab, isForm] = route;
  if (fromData && isForm) return; // 입력 중인 화면은 다시 그리지 않음
  $tabs.hidden = false;
  $$('#tabs a', document).forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
  $app.onclick = null; // 캘린더가 등록한 클릭 처리 해제
  ui.fromData = fromData;
  fn(...hash.match(re).slice(1));
  if (!fromData) window.scrollTo(0, 0);
}

let seeded = false;
function ensureSeed() {
  if (seeded || !store.ready) return;
  seeded = true;
  if (settings().seeded) return;
  for (const [name, nameEn, part] of SEED_EXERCISES) if (!dictByName(name)) save('exercises', { id: newId(), name, nameEn, part });
  save('settings', { ...settings(), id: 'main', seeded: true });
}

let raf = 0;
store.start(
  () => { ensureSeed(); cancelAnimationFrame(raf); raf = requestAnimationFrame(() => render(true)); },
  (state, user) => { authState = state; authUser = user; ensureSeed(); render(); },
).catch(e => { $app.innerHTML = `<p class="empty">시작하지 못했어요: ${esc(e.message)}</p>`; });
window.addEventListener('hashchange', () => render());

bindChartTips();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
