// 여러 화면이 함께 쓰는 저장소 · 도우미
import { createStore } from './store.js';
import { setsText, volume, exerciseLabel } from './kakao.js';
import * as L from './logic.js';

export const $app = document.getElementById('app');
export const $tabs = document.getElementById('tabs');
export const store = createStore();
export const db = () => store.data;
export const ui = { memberFilter: 'all', feedFilter: 'all', feedLimit: 30 };

// ---------- helpers ----------
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const ALPHA = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const newId = (n = 20) => [...crypto.getRandomValues(new Uint8Array(n))].map(x => ALPHA[x % ALPHA.length]).join('');
export const list = col => [...db()[col].values()];
export const byName = (a, b) => a.name.localeCompare(b.name, 'ko');
export const $ = (sel, root = $app) => root.querySelector(sel);
export const $$ = (sel, root = $app) => [...root.querySelectorAll(sel)];
export const val = id => document.getElementById(id)?.value.trim() ?? '';
export const num = id => { const v = parseFloat(val(id)); return Number.isFinite(v) ? v : null; };

let toastTimer;
export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}
store.onError = e => toast(`저장 실패: ${e.code || e.message}`);

export const DEFAULTS = { closing: true, daysPerSession: 4, workStart: 6, workEnd: 23, offDays: [0], duration: 50 };
export const settings = () => ({ ...DEFAULTS, ...(db().settings.get('main') || {}) });

// 저장하면 공유 페이지(회원용 사본)도 함께 갱신
export function save(col, obj) {
  obj.updatedAt = Date.now();
  obj.createdAt ??= Date.now();
  db()[col].set(obj.id, obj);
  store.put(col, obj);
  const mid = col === 'members' ? obj.id : obj.memberId;
  if (mid) syncShare(mid);
}
export function remove(col, id) {
  const obj = db()[col].get(id);
  db()[col].delete(id);
  store.del(col, id);
  if (obj?.memberId) syncShare(obj.memberId);
}

export const gymOf = m => db().gyms.get(m?.gymId);
export const gymColor = m => gymOf(m)?.color || '#9aa3b5';
export const shareUrl = m => (m?.share?.enabled && m.share.token ? new URL(`m.html#${m.share.token}`, location.href).href : '');
export const displayName = n => (n.length >= 3 ? n.slice(1) : n);

export function badgeFor(st) {
  const cls = st.state === 'active' ? (st.daysLeft <= 7 || st.remaining <= 2 ? 'warn' : '') : st.state === 'none' ? 'gray' : 'danger';
  return `<span class="badge ${cls}">${esc(L.statusText(st))}</span>`;
}

export function header(title, { back, right = '' } = {}) {
  return `<header class="bar">${back ? `<a class="back" href="${back}" aria-label="뒤로">‹</a>` : ''}<h1>${esc(title)}</h1>${right}</header>`;
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
  toast('복사했어요. 카톡에 붙여넣기 하세요');
}
export async function shareText(text) {
  if (navigator.share) {
    try { await navigator.share({ text }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  copyText(text);
}

export function exerciseListHtml(exs) {
  if (!exs?.length) return '';
  return `<ol class="ex-list">${exs.map(e => {
    const extra = [setsText(e.sets), e.note].filter(Boolean).join(' · ');
    return `<li>${esc(exerciseLabel(e))}${extra ? `<div class="note">${esc(extra)}</div>` : ''}</li>`;
  }).join('')}</ol>`;
}

export function sessionCard(s, { showMember = false } = {}) {
  const m = db().members.get(s.memberId);
  const md = L.memberData(db(), s.memberId);
  const no = md.noOf.get(s.id);
  const total = md.contractOf.get(s.id)?.count;
  const vol = (s.exercises || []).reduce((t, e) => t + volume(e), 0);
  return `<div class="card">
    <a class="link" href="#/m/${s.memberId}/s/${s.id}" style="color:inherit;display:block">
      <div class="between">
        <div class="row">${showMember ? `<span class="dot" style="background:${esc(gymColor(m))}"></span><span class="name">${esc(m?.name || '(삭제된 회원)')}</span>` : ''}
          <b>${esc(L.dateLabel(s.date))}</b></div>
        <div class="row">${s.memberSign ? '<span class="badge gray" title="회원 서명 완료">서명✓</span>' : ''}${s.status === 'noshow' ? '<span class="badge danger">불참</span>' : ''}${no ? `<span class="badge gray">${no}${total ? `/${total}` : ''}회차</span>` : ''}</div>
      </div>
      ${s.title ? `<div class="muted">${esc(s.title)}</div>` : ''}
      ${exerciseListHtml(s.exercises)}
      ${vol ? `<div class="muted small" style="margin-top:4px">총 볼륨 ${vol.toLocaleString()}kg</div>` : ''}
    </a>
    ${s.status === 'done' && s.exercises?.length ? `<div class="btns" style="margin-bottom:0"><a class="btn sm" href="#/m/${s.memberId}/s/${s.id}/send">카톡 문구</a></div>` : ''}
  </div>`;
}

// ---------- 공유(회원 보기) ----------
export function syncShare(mid) {
  const m = db().members.get(mid);
  if (!m?.share?.enabled || !m.share.token) return;
  const md = L.memberData(db(), mid);
  const st = md.status;
  const nb = L.nextBooking(md.sessions);
  const next = nb ? { date: nb.date, time: nb.time || '' } : null;
  store.putShare(m.share.token, {
    name: displayName(m.name),
    gym: gymOf(m)?.name || '',
    total: st.total ?? null, remaining: st.remaining ?? null, used: st.used ?? null,
    start: st.contract?.start || null, end: st.contract?.end || null, next,
    sessions: md.sessions.filter(L.counted).reverse().map(s => ({
      date: s.date, no: md.noOf.get(s.id) || null, status: s.status, title: s.title || '',
      exercises: (s.exercises || []).map(e => ({ name: e.name, nameEn: e.nameEn || '', note: e.note || '', sets: e.sets || [] })),
    })),
    bodies: m.share.body
      ? list('bodies').filter(b => b.memberId === mid).sort((a, b) => a.date.localeCompare(b.date))
        .map(({ date, weight, muscle, fat }) => ({ date, weight, muscle, fat }))
      : [],
    updatedAt: Date.now(),
  });
}
