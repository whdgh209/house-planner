// 구글 캘린더 내보내기(.ics) 파일 읽기 → [{uid, title, date, time, duration, allDay}]
const pad = n => String(n).padStart(2, '0');
const fmtDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtTime = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const WD = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

// "20260928T200000Z" → 기기 시간대의 Date / "20260928" → 종일
function parseDate(value, params = '') {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (!h) return { date: new Date(+y, mo - 1, +d), allDay: true };
  const date = z ? new Date(Date.UTC(+y, mo - 1, +d, +h, +mi, +s)) : new Date(+y, mo - 1, +d, +h, +mi, +s); // TZID는 기기 시간대(한국)로 간주
  return { date, allDay: /VALUE=DATE(?!-)/.test(params) };
}

const unescape = s => s.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();

function parseEvents(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n'); // 접힌 줄 펴기
  const events = [];
  let cur = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { cur = { exdates: [] }; continue; }
    if (line === 'END:VEVENT') { if (cur?.start) events.push(cur); cur = null; continue; }
    if (!cur) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const [name, ...params] = line.slice(0, i).split(';');
    const value = line.slice(i + 1);
    const p = params.join(';');
    if (name === 'UID') cur.uid = value;
    else if (name === 'SUMMARY') cur.title = unescape(value);
    else if (name === 'DTSTART') cur.start = parseDate(value, p);
    else if (name === 'DTEND') cur.end = parseDate(value, p);
    else if (name === 'RRULE') cur.rrule = Object.fromEntries(value.split(';').map(kv => kv.split('=')));
    else if (name === 'EXDATE') value.split(',').forEach(v => { const d = parseDate(v, p); if (d) cur.exdates.push(d.date.getTime()); });
    else if (name === 'RECURRENCE-ID') cur.recurrenceId = parseDate(value, p)?.date.getTime();
    else if (name === 'STATUS') cur.status = value;
  }
  return events;
}

// 매주/매일 반복만 펼침 (구글 캘린더 PT 일정은 대부분 매주 반복)
function expand(ev, from, to) {
  const start = ev.start.date;
  const durMs = ev.end ? ev.end.date - start : 60 * 60000;
  const out = [];
  const push = d => { if (d >= from && d < to && !ev.exdates.includes(d.getTime())) out.push(d); };
  const r = ev.rrule;
  if (!r) { push(start); return { out, durMs }; }
  const interval = +(r.INTERVAL || 1);
  const until = r.UNTIL ? parseDate(r.UNTIL)?.date : null;
  const count = r.COUNT ? +r.COUNT : Infinity;
  const days = r.FREQ === 'WEEKLY' ? (r.BYDAY ? r.BYDAY.split(',').map(x => WD[x.slice(-2)]) : [start.getDay()]) : null;
  if (r.FREQ !== 'WEEKLY' && r.FREQ !== 'DAILY') { push(start); return { out, durMs }; }
  let n = 0;
  const weekOf = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return x; };
  const w0 = weekOf(start);
  for (let d = new Date(start); d < to && n < count; d.setDate(d.getDate() + 1)) {
    if (until && d > until) break;
    const ok = r.FREQ === 'DAILY'
      ? Math.round((d - start) / 86400000) % interval === 0
      : days.includes(d.getDay()) && Math.round((weekOf(d) - w0) / (7 * 86400000)) % interval === 0;
    if (!ok) continue;
    n++;
    push(new Date(d));
  }
  return { out, durMs };
}

export function parseIcs(text, { from = new Date(), days = 120 } = {}) {
  const f = new Date(from); f.setHours(0, 0, 0, 0);
  const to = new Date(f); to.setDate(to.getDate() + days);
  const events = parseEvents(text).filter(e => e.status !== 'CANCELLED');
  // 반복 일정 중 한 번만 바꾼 일정(RECURRENCE-ID)은 원래 회차를 대체
  const overridden = new Set(events.filter(e => e.recurrenceId).map(e => `${e.uid}|${e.recurrenceId}`));
  const out = [];
  for (const ev of events) {
    const { out: dates, durMs } = expand(ev, f, to);
    for (const d of dates) {
      if (!ev.recurrenceId && overridden.has(`${ev.uid}|${d.getTime()}`)) continue;
      out.push({
        uid: ev.uid, title: ev.title || '', date: fmtDate(d), allDay: ev.start.allDay,
        time: ev.start.allDay ? '' : fmtTime(d), duration: Math.max(10, Math.round(durMs / 60000)),
      });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

// 일정 제목에서 회원 찾기 ("김도진", "김도진 PT", "PT 김도진" 등). 긴 이름 우선
export function matchMember(title, members) {
  const t = title.replace(/\s+/g, '');
  return members.filter(m => m.name && t.includes(m.name.replace(/\s+/g, ''))).sort((a, b) => b.name.length - a.name.length)[0] || null;
}
