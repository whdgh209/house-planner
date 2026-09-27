// 손가락 서명 패드 → PNG 데이터(URL)
export function sigPad(box, { value = '', onChange = () => {}, label = '서명' } = {}) {
  const W = 600, H = 220;
  const drawEmpty = () => {
    box.innerHTML = `<div class="sig"><canvas width="${W}" height="${H}" aria-label="${label} 칸"></canvas>
      <button type="button" class="btn ghost sm sig-clear">지우기</button><span class="sig-hint">여기에 ${label}</span></div>`;
    const cv = box.querySelector('canvas'), ctx = cv.getContext('2d');
    ctx.lineWidth = 5; ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = '#111';
    let drawing = false, dirty = false, last;
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height)]; };
    cv.addEventListener('pointerdown', e => { drawing = true; last = pos(e); cv.setPointerCapture(e.pointerId); box.querySelector('.sig-hint').hidden = true; });
    cv.addEventListener('pointermove', e => {
      if (!drawing) return;
      const p = pos(e);
      ctx.beginPath(); ctx.moveTo(...last); ctx.lineTo(...p); ctx.stroke();
      last = p; dirty = true;
    });
    const end = () => { if (drawing && dirty) onChange(cv.toDataURL('image/png')); drawing = false; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    box.querySelector('.sig-clear').onclick = () => { ctx.clearRect(0, 0, W, H); dirty = false; box.querySelector('.sig-hint').hidden = false; onChange(''); };
  };
  const drawValue = () => {
    box.innerHTML = `<div class="sig"><img src="${value}" alt="${label}"><button type="button" class="btn ghost sm sig-clear">다시 서명</button></div>`;
    box.querySelector('.sig-clear').onclick = () => { value = ''; onChange(''); drawEmpty(); };
  };
  value ? drawValue() : drawEmpty();
}
