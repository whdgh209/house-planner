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
