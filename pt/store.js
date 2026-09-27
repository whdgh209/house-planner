// 데이터 저장소: Firebase가 설정되면 Firestore, 아니면 브라우저(localStorage) 체험 모드
import { firebaseConfig, TRAINER_EMAILS } from './firebase-config.js';

export const COLS = ['gyms', 'members', 'contracts', 'sessions', 'exercises', 'settings'];
const LOCAL_KEY = 'pt-note-demo';
const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';

const emptyData = () => Object.fromEntries(COLS.map(c => [c, new Map()]));
const clean = obj => JSON.parse(JSON.stringify(obj)); // undefined 제거

function readLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || {}; } catch { return {}; }
}

class LocalStore {
  mode = 'demo';
  ready = true;
  constructor() {
    const raw = readLocal();
    this.data = emptyData();
    for (const c of COLS) for (const [id, v] of Object.entries(raw[c] || {})) this.data[c].set(id, v);
    this.shares = raw.shares || {};
  }
  async start(onChange, onAuth) { this.onChange = onChange; onAuth('ok'); }
  save() {
    const out = { shares: this.shares };
    for (const c of COLS) out[c] = Object.fromEntries(this.data[c]);
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(out)); } catch (e) { this.onError?.(e); }
    this.onChange();
  }
  put(col, obj) { this.data[col].set(obj.id, clean(obj)); this.save(); }
  del(col, id) { this.data[col].delete(id); this.save(); }
  putShare(token, obj) { this.shares[token] = clean(obj); this.save(); }
  delShare(token) { delete this.shares[token]; this.save(); }
  reset() { localStorage.removeItem(LOCAL_KEY); }
}

class FirebaseStore {
  mode = 'firebase';
  ready = false;
  data = emptyData();
  async start(onChange, onAuth) {
    this.onChange = onChange;
    const [{ initializeApp }, A, F] = await Promise.all([
      import(FB + 'firebase-app.js'), import(FB + 'firebase-auth.js'), import(FB + 'firebase-firestore.js'),
    ]);
    this.A = A; this.F = F;
    const app = initializeApp(firebaseConfig);
    try {
      // 헬스장 지하처럼 신호가 약해도 쓸 수 있게 기기에 캐시
      this.fs = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });
    } catch { this.fs = F.getFirestore(app); }
    this.auth = A.getAuth(app);
    A.onAuthStateChanged(this.auth, user => {
      const ok = !!user && TRAINER_EMAILS.map(e => e.toLowerCase()).includes((user.email || '').toLowerCase());
      if (ok && !this.unsubs) this.subscribe();
      if (!ok && this.unsubs) { this.unsubs.forEach(u => u()); this.unsubs = null; this.data = emptyData(); this.ready = false; }
      onAuth(user ? (ok ? 'ok' : 'denied') : 'out', user);
    });
  }
  subscribe() {
    const pending = new Set(COLS);
    this.unsubs = COLS.map(c => this.F.onSnapshot(this.F.collection(this.fs, c), snap => {
      const m = new Map();
      snap.forEach(d => m.set(d.id, { ...d.data(), id: d.id }));
      this.data[c] = m;
      pending.delete(c);
      if (!pending.size) this.ready = true;
      this.onChange();
    }, err => this.onError?.(err)));
  }
  async login() {
    const p = new this.A.GoogleAuthProvider();
    try { await this.A.signInWithPopup(this.auth, p); }
    catch (e) {
      if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(e.code)) await this.A.signInWithRedirect(this.auth, p);
      else throw e;
    }
  }
  logout() { return this.A.signOut(this.auth); }
  // 화면은 로컬 반영(onSnapshot)으로 즉시 바뀌므로 서버 응답을 기다리지 않음
  put(col, obj) { this.F.setDoc(this.F.doc(this.fs, col, obj.id), clean(obj)).catch(e => this.onError?.(e)); }
  del(col, id) { this.F.deleteDoc(this.F.doc(this.fs, col, id)).catch(e => this.onError?.(e)); }
  putShare(token, obj) { this.put('shares', { ...obj, id: token }); }
  delShare(token) { this.del('shares', token); }
}

export function createStore() {
  return firebaseConfig ? new FirebaseStore() : new LocalStore();
}

// 회원 보기 페이지(m.html)용: 로그인 없이 공유 문서 1건만 읽기
export async function readShare(token) {
  if (!firebaseConfig) return readLocal().shares?.[token] || null;
  const [{ initializeApp }, F] = await Promise.all([import(FB + 'firebase-app.js'), import(FB + 'firebase-firestore.js')]);
  const snap = await F.getDoc(F.doc(F.getFirestore(initializeApp(firebaseConfig)), 'shares', token));
  return snap.exists() ? snap.data() : null;
}
