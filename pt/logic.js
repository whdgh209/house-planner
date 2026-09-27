// 날짜 · 계약 · 잔여 회차 계산
export const pad = n => String(n).padStart(2, '0');
export const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const today = () => fmt(new Date());
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return fmt(d); };
export const diffDays = (a, b) => Math.round((parse(a) - parse(b)) / 86400000);
const WD = '일월화수목금토';
export const dateLabel = s => { const d = parse(s); return `${d.getMonth() + 1}.${d.getDate()} (${WD[d.getDay()]})`; };
export const shortDate = s => { const d = parse(s); return `${d.getMonth() + 1}.${d.getDate()}`; };
export const dday = n => (n === 0 ? 'D-day' : n > 0 ? `D-${n}` : `D+${-n}`);

// 수업 완료와 불참(3시간 규정) 모두 회차 차감
export const counted = s => s.status === 'done' || s.status === 'noshow';
const byTime = (a, b) => (a.createdAt || 0) - (b.createdAt || 0);

// 수업은 "그 날짜 이전에 시작한 가장 최근 계약"에 속함
export function memberData(db, mid) {
  const contracts = [...db.contracts.values()].filter(c => c.memberId === mid)
    .sort((a, b) => a.start.localeCompare(b.start) || byTime(a, b));
  const sessions = [...db.sessions.values()].filter(s => s.memberId === mid)
    .sort((a, b) => a.date.localeCompare(b.date) || byTime(a, b));
  const usage = new Map(contracts.map(c => [c.id, []]));
  const noOf = new Map(), contractOf = new Map();
  for (const s of sessions) {
    if (!counted(s)) continue;
    let c = null;
    for (const k of contracts) if (k.start <= s.date) c = k;
    if (!c) continue;
    const u = usage.get(c.id);
    u.push(s);
    noOf.set(s.id, u.length);
    contractOf.set(s.id, c);
  }
  const cur = contracts.at(-1) || null;
  let status = { state: 'none' };
  if (cur) {
    const used = usage.get(cur.id).length;
    const remaining = cur.count - used;
    const daysLeft = diffDays(cur.end, today());
    status = {
      state: remaining <= 0 ? 'used' : daysLeft < 0 ? 'expired' : 'active',
      contract: cur, used, remaining, total: cur.count, daysLeft,
    };
  }
  return { contracts, sessions, usage, noOf, contractOf, status };
}

export function statusText(st) {
  switch (st.state) {
    case 'none': return '계약 없음';
    case 'used': return st.remaining < 0 ? `회차 초과 ${-st.remaining}회` : '회차 모두 사용';
    case 'expired': return `기간 만료 · 잔여 ${st.remaining}회`;
    default: return `잔여 ${st.remaining}/${st.total} · ${dday(st.daysLeft)}`;
  }
}

// 홈 화면 알림 (level 높을수록 급함)
export function alertOf(st) {
  if (st.state === 'none') return { level: 1, text: '계약 정보 없음' };
  if (st.state === 'expired') return { level: 3, text: `기간 만료 · 남은 ${st.remaining}회 소멸 대상` };
  if (st.state === 'used') return { level: 2, text: '회차 모두 사용 · 재등록 확인' };
  if (st.daysLeft <= 7) return { level: 3, text: `만료 ${dday(st.daysLeft)} · 잔여 ${st.remaining}회` };
  if (st.remaining <= 2) return { level: 2, text: `잔여 ${st.remaining}회 · 재등록 안내` };
  return null;
}

// ---------- 캘린더 ----------
export const toMin = t => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + m; };
export const fromMin = n => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;
export const weekday = s => parse(s).getDay();
export const weekStart = s => addDays(s, -((weekday(s) + 6) % 7)); // 월요일 시작
export const DEFAULT_DURATION = 50;
export const endMin = s => toMin(s.time) + (s.duration || DEFAULT_DURATION);

// 예약했는데 수업 시간이 지나도록 일지를 안 쓴 수업
export function isOverdue(s, now = new Date()) {
  if (s.status !== 'booked') return false;
  const t = fmt(now);
  if (s.date !== t) return s.date < t;
  return !!s.time && endMin(s) <= now.getHours() * 60 + now.getMinutes();
}

export const nextBooking = (sessions, t = today()) =>
  sessions.filter(s => s.status === 'booked' && s.date >= t)
    .sort((a, b) => a.date.localeCompare(b.date) || toMin(a.time) - toMin(b.time))[0] || null;

// 공휴일 (매년 추가 필요)
export const HOLIDAYS = {
  '2026-01-01': '신정', '2026-02-16': '설날 연휴', '2026-02-17': '설날', '2026-02-18': '설날 연휴',
  '2026-03-01': '삼일절', '2026-03-02': '대체공휴일', '2026-05-05': '어린이날', '2026-05-24': '부처님오신날',
  '2026-05-25': '대체공휴일', '2026-06-03': '지방선거', '2026-06-06': '현충일', '2026-08-15': '광복절',
  '2026-08-17': '대체공휴일', '2026-09-24': '추석 연휴', '2026-09-25': '추석', '2026-09-26': '추석 연휴',
  '2026-10-01': '국군의날', '2026-10-03': '개천절', '2026-10-05': '대체공휴일', '2026-10-09': '한글날',
  '2026-12-25': '성탄절',
  '2027-01-01': '신정', '2027-02-06': '설날 연휴', '2027-02-07': '설날', '2027-02-08': '설날 연휴',
  '2027-02-09': '대체공휴일', '2027-03-01': '삼일절', '2027-05-05': '어린이날', '2027-05-13': '부처님오신날',
  '2027-06-06': '현충일', '2027-08-15': '광복절', '2027-08-16': '대체공휴일', '2027-09-14': '추석 연휴',
  '2027-09-15': '추석', '2027-09-16': '추석 연휴', '2027-10-01': '국군의날', '2027-10-03': '개천절',
  '2027-10-04': '대체공휴일', '2027-10-09': '한글날', '2027-10-11': '대체공휴일', '2027-12-25': '성탄절',
  '2027-12-27': '대체공휴일',
};

// ---------- 성장 기록 ----------
const kgOf = x => Number(x?.kg) || 0;
export const sessionVolume = s => (s.exercises || []).reduce((t, e) => t + (e.sets || []).reduce((u, x) => u + kgOf(x) * (Number(x.reps) || 0), 0), 0);

// 종목별 그날 최고 무게: [{name, pts:[{date, y, reps}]}] (기록 많은 순)
export function exerciseProgress(sessions) {
  const byName = new Map();
  for (const s of sessions) {
    if (s.status !== 'done') continue;
    for (const e of s.exercises || []) {
      const withKg = (e.sets || []).filter(x => kgOf(x) > 0);
      if (!withKg.length) continue;
      const best = withKg.reduce((a, b) => (kgOf(b) > kgOf(a) || (kgOf(b) === kgOf(a) && +b.reps > +a.reps) ? b : a));
      const pts = byName.get(e.name) || [];
      const same = pts.find(p => p.date === s.date);
      if (same) { if (kgOf(best) > same.y) Object.assign(same, { y: kgOf(best), reps: best.reps }); }
      else pts.push({ date: s.date, y: kgOf(best), reps: best.reps });
      byName.set(e.name, pts);
    }
  }
  return [...byName].map(([name, pts]) => ({ name, pts: pts.sort((a, b) => a.date.localeCompare(b.date)) }))
    .sort((a, b) => b.pts.length - a.pts.length || a.name.localeCompare(b.name, 'ko'));
}

export const BODY_METRICS = [['weight', '체중', 'kg'], ['muscle', '골격근량', 'kg'], ['fat', '체지방률', '%']];
