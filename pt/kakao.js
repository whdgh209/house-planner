// 카톡 운동일지 문구 만들기 / 붙여넣은 카톡 기록 읽기
const pad = n => String(n).padStart(2, '0');

// [{kg, reps}] → "30kg×12회 2세트, 35kg×10회"
export function setsText(sets = []) {
  const groups = [];
  for (const s of sets.filter(s => s && (s.kg || s.reps))) {
    const key = `${s.kg || ''}|${s.reps || ''}`;
    const last = groups.at(-1);
    if (last && last.key === key) last.n++;
    else groups.push({ key, s, n: 1 });
  }
  return groups.map(({ s, n }) =>
    `${s.kg ? `${s.kg}kg` : ''}${s.kg && s.reps ? '×' : ''}${s.reps ? `${s.reps}회` : ''}${n > 1 ? ` ${n}세트` : ''}`
  ).join(', ');
}

export const volume = ex => (ex.sets || []).reduce((t, s) => t + (Number(s.kg) || 0) * (Number(s.reps) || 0), 0);

export const exerciseLabel = e => `${e.name}${e.nameEn ? `(${e.nameEn})` : ''}`;

export function formatKakao(session, { closing = true, shareUrl = '' } = {}) {
  const [, m, d] = session.date.split('-').map(Number);
  const head = `${m}.${d} 운동${session.title ? `(${session.title})` : ''}`;
  const exs = (session.exercises || []).filter(e => e.name && e.name.trim());
  const lines = exs.map((e, i) => {
    const extra = [setsText(e.sets), (e.note || '').trim()].filter(Boolean).join(' / ');
    return `${i + 1}.${exerciseLabel(e)}${extra ? ' ' + extra : ''}`;
  });
  // 동생 분 말투: 마지막 종목에 메모가 없으면 "…입니다"로 끝냄
  const last = exs.at(-1);
  if (closing && last && !setsText(last.sets) && !(last.note || '').trim()) lines[lines.length - 1] += '입니다';
  let text = [head, ...lines].join('\n');
  if (shareUrl) text += `\n\n지난 운동일지 보기 ▶ ${shareUrl}`;
  return text;
}

// "케이블 암풀다운(cable arm pull down) 메모" → {name, nameEn, note}
export function parseExercise(t) {
  t = t.replace(/\s*입니다\s*$/, '').trim();
  const m = t.match(/^(.*?)\(([^()]*[A-Za-z][^()]*)\)\s*[-–:,]?\s*(.*)$/);
  if (!m) return { name: t, nameEn: '', note: '' };
  let name = m[1].trim(), nameEn = m[2].trim();
  const note = m[3].replace(/\s*입니다\s*$/, '').trim();
  // "랫풀다운(뉴트럴그립 와이드 lat pull down)" → name "랫풀다운(뉴트럴그립 와이드)", en "lat pull down"
  const k = nameEn.match(/^([^A-Za-z]*[가-힣][^A-Za-z]*?)\s+([A-Za-z].*)$/);
  if (k) { name += `(${k[1].trim().replace(/,$/, '')})`; nameEn = k[2].trim(); }
  return { name, nameEn, note };
}

// 카톡 대화 텍스트 → [{date, title, exercises}]
export function parseKakao(text, defaultYear) {
  const out = [];
  let year = defaultYear, cur = null;
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim();
    // 모바일 내보내기: "2026년 6월 15일 오후 3:14, 이름 : 내용"
    const mob = line.match(/^(\d{4})년\s*\d{1,2}월\s*\d{1,2}일\s*(?:오전|오후)\s*\d{1,2}:\d{2},\s*.+?\s:\s(.*)$/);
    if (mob) { year = +mob[1]; line = mob[2].trim(); }
    else {
      const sep = line.match(/(\d{4})년\s*\d{1,2}월\s*\d{1,2}일/);
      if (sep) { year = +sep[1]; continue; }
    }
    line = line.replace(/^\[[^\]]*\]\s*\[[^\]]*\]\s*/, ''); // PC: "[이름] [오후 3:14] 내용"
    if (!line || /^(오전|오후)\s*\d{1,2}:\d{2}$/.test(line)) continue;
    const head = line.match(/^(\d{1,2})\.(\d{1,2})\s*운동\s*(?:\((.*)\))?\s*$/);
    if (head) {
      cur = { date: `${year}-${pad(head[1])}-${pad(head[2])}`, title: (head[3] || '').trim(), exercises: [] };
      out.push(cur);
      continue;
    }
    if (!cur) continue;
    const ex = line.match(/^(\d{1,2})\s*[.)]?\s*(\D.*)$/);
    if (ex) cur.exercises.push(parseExercise(ex[2]));
    else if (cur.exercises.length) {
      const last = cur.exercises.at(-1);
      last.note = [last.note, line.replace(/\s*입니다\s*$/, '')].filter(Boolean).join(' ');
    }
  }
  return out.filter(s => s.exercises.length);
}
