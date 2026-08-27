<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>스마트 부동산 종합 플래너</title>

  <!-- Firebase SDK -->
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>

  <style>
    :root {
      --naver-green: #03c75a;
      --naver-green-light: #e8f9ef;
      --primary: #2563eb;
      --primary-light: #eff6ff;
      --bg: #f4f6f8;
      --card-bg: #ffffff;
      --text-main: #111827;
      --text-sub: #6b7280;
      --border: #e5e7eb;
      --danger: #ef4444;
      --warning: #f59e0b;
    }
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; }
    html, body { width: 100%; max-width: 100vw; overflow-x: hidden; background: var(--bg); color: var(--text-main); padding-bottom: 60px; }
    
    header { background: #fff; padding: 14px 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 20; width: 100%; }
    header h1 { font-size: 0.98rem; font-weight: 800; display: flex; align-items: center; gap: 4px; }
    
    .user-select { display: flex; align-items: center; gap: 4px; }
    .user-btn { border: 1px solid var(--border); background: #fff; padding: 4px 10px; border-radius: 20px; cursor: pointer; font-weight: 700; font-size: 0.78rem; color: var(--text-sub); transition: all 0.2s; }
    .user-btn.active-jh { background: #dbeafe; color: #1e40af; border-color: #93c5fd; }
    .user-btn.active-bm { background: #fce7f3; color: #9d174d; border-color: #f472b6; }

    .main-layout { max-width: 1240px; width: 100%; margin: 0 auto; padding: 10px; display: grid; grid-template-columns: 1fr; gap: 14px; }
    @media (min-width: 960px) {
      .main-layout { grid-template-columns: 1.18fr 0.82fr; gap: 24px; padding: 16px; }
    }

    .tabs { display: flex; background: #fff; border-radius: 12px; border: 1px solid var(--border); overflow: hidden; margin-bottom: 12px; width: 100%; }
    .tab-btn { flex: 1; padding: 10px 4px; border: none; background: none; font-size: 0.82rem; font-weight: 700; color: var(--text-sub); cursor: pointer; text-align: center; }
    .tab-btn.active { background: var(--naver-green); color: #fff; }

    .area-toggle { display: flex; background: #e5e7eb; padding: 3px; border-radius: 24px; margin-bottom: 12px; width: 100%; }
    .area-btn { flex: 1; padding: 7px 4px; border: none; background: none; font-size: 0.76rem; font-weight: 700; color: var(--text-sub); border-radius: 20px; cursor: pointer; text-align: center; }
    .area-btn.active { background: #fff; color: var(--text-main); box-shadow: 0 2px 4px rgba(0,0,0,0.08); }

    .card { background: var(--card-bg); border-radius: 16px; padding: 14px; border: 1px solid var(--border); box-shadow: 0 2px 8px rgba(0,0,0,0.03); margin-bottom: 14px; width: 100%; overflow: hidden; }
    .card-title { font-size: 0.94rem; font-weight: 800; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }

    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; width: 100%; }
    .input-group { margin-bottom: 10px; width: 100%; }
    .input-group label { display: block; font-size: 0.8rem; color: var(--text-sub); margin-bottom: 4px; font-weight: 600; }
    .input-row { display: flex; align-items: center; gap: 4px; width: 100%; }
    .input-row input, .input-row select { width: 100%; height: 38px; padding: 0 8px; border-radius: 8px; border: 1px solid var(--border); font-size: 0.9rem; font-weight: 700; text-align: right; background: #fff; }
    .input-row textarea { width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border); font-size: 0.85rem; font-weight: 500; text-align: left; background: #fff; resize: none; overflow: hidden; min-height: 42px; }
    .input-row input[type="text"] { text-align: left; font-weight: 600; }
    .input-row span { font-size: 0.82rem; font-weight: 700; color: var(--text-sub); min-width: 14px; }

    .accordion-btn { width: 100%; padding: 10px 12px; background: #f8fafc; border: 1px solid var(--border); border-radius: 10px; color: var(--text-main); font-weight: 800; font-size: 0.84rem; cursor: pointer; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
    .accordion-btn.active { background: #eff6ff; border-color: #93c5fd; color: #1d4ed8; }
    .accordion-content { display: none; background: #f8fafc; padding: 10px; border-radius: 10px; border: 1px solid var(--border); margin-bottom: 10px; width: 100%; }

    .borrower-toggle { display: flex; background: #f3f4f6; padding: 3px; border-radius: 8px; margin-bottom: 10px; width: 100%; }
    .borrower-btn { flex: 1; padding: 6px 2px; border: none; background: none; font-size: 0.76rem; font-weight: 700; color: var(--text-sub); border-radius: 6px; cursor: pointer; text-align: center; }
    .borrower-btn.active { background: #fff; color: var(--naver-green); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

    .policy-toggle-box { display: flex; background: #e2e8f0; padding: 3px; border-radius: 8px; margin-bottom: 10px; width: 100%; }
    .policy-btn { flex: 1; padding: 7px 2px; border: none; background: none; font-size: 0.7rem; font-weight: 700; color: var(--text-sub); border-radius: 6px; cursor: pointer; text-align: center; }
    .policy-btn.active { background: #2563eb; color: #fff; }

    .subway-row { display: grid; grid-template-columns: 1fr 1.2fr 0.8fr 34px; gap: 4px; align-items: center; margin-bottom: 6px; width: 100%; }
    .subway-row input { height: 36px; padding: 0 6px; border-radius: 8px; border: 1px solid var(--border); font-size: 0.82rem; text-align: left; }
    .subway-dist-wrap { display: flex; align-items: center; gap: 2px; height: 36px; border: 1px solid var(--border); border-radius: 8px; background: #fff; padding: 0 4px; }
    .subway-dist-wrap input { width: 100%; height: 100%; border: none; padding: 0; text-align: right; font-weight: 700; outline: none; }
    .subway-dist-wrap span { font-size: 0.72rem; font-weight: 700; color: var(--text-sub); }
    .btn-icon-del { height: 36px; width: 34px; border: none; background: #fee2e2; color: #ef4444; border-radius: 8px; font-weight: 800; cursor: pointer; display: flex; justify-content: center; align-items: center; }
    .btn-add-subway { padding: 8px; background: #eff6ff; border: 1px dashed #3b82f6; color: #2563eb; border-radius: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer; width: 100%; margin-top: 4px; text-align: center; }

    .naver-result-card { background: #fff; border: 1px solid var(--border); border-radius: 14px; padding: 14px; margin-top: 12px; width: 100%; overflow: hidden; }
    .naver-limit-title { font-size: 0.8rem; color: var(--text-sub); font-weight: 600; }
    .naver-limit-val { font-size: 1.35rem; font-weight: 900; color: var(--text-main); margin: 4px 0 6px 0; }
    .naver-sub-info { font-size: 0.8rem; color: var(--text-sub); margin-bottom: 10px; }
    
    .max-afford-box { background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 10px; margin-bottom: 10px; width: 100%; }
    .max-afford-title { font-size: 0.78rem; color: #15803d; font-weight: 700; }
    .max-afford-val { font-size: 1.25rem; font-weight: 900; color: #166534; margin: 2px 0 4px 0; }
    .max-afford-sub { font-size: 0.72rem; color: #14532d; line-height: 1.35; }

    .eval-price-box { font-size: 0.8rem; color: #1e40af; font-weight: 700; margin-bottom: 8px; padding: 6px 8px; background: #eff6ff; border-radius: 6px; display: inline-block; }

    .detail-cost-box { background: #f8fafc; border: 1px solid var(--border); border-radius: 10px; padding: 10px; margin-bottom: 10px; font-size: 0.8rem; width: 100%; }
    .detail-cost-header { font-weight: 800; font-size: 0.82rem; color: var(--text-main); margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; }
    .cost-item { display: flex; justify-content: space-between; color: var(--text-sub); margin-bottom: 3px; }
    .cost-item.total { border-top: 1px solid #e2e8f0; padding-top: 5px; margin-top: 5px; font-weight: 800; color: var(--text-main); font-size: 0.84rem; }

    .target-gap-box { background: #fef2f2; border: 1px solid #fee2e2; border-radius: 10px; padding: 10px; margin-bottom: 10px; width: 100%; }
    .target-gap-title { font-size: 0.76rem; color: #991b1b; font-weight: 600; }
    .target-gap-val { font-size: 1.05rem; font-weight: 800; color: #dc2626; margin-top: 2px; }
    .gap-formula-sub { font-size: 0.72rem; color: #7f1d1d; margin-top: 3px; }

    .monthly-breakdown-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 10px; margin-bottom: 12px; font-size: 0.8rem; color: #1e40af; line-height: 1.45; width: 100%; }
    .monthly-breakdown-box strong { font-weight: 800; font-size: 0.88rem; }

    .all-gauges-box { background: #fff; border: 1px solid var(--border); border-radius: 10px; padding: 10px; margin-bottom: 10px; width: 100%; }
    .gauge-row { margin-bottom: 10px; }
    .gauge-row:last-child { margin-bottom: 0; }
    .gauge-label-flex { display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 700; margin-bottom: 3px; }
    .gauge-bar-bg { width: 100%; height: 7px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
    .gauge-bar-fill { height: 100%; background: var(--naver-green); border-radius: 3px; transition: width 0.3s; }
    .gauge-bar-fill.active-limit { background: #2563eb; }
    .gauge-bar-fill.danger { background: var(--danger); }

    .rule-decision-banner { background: #fffbeb; border: 1px solid #fde68a; padding: 8px 10px; border-radius: 8px; font-size: 0.78rem; color: #92400e; margin-bottom: 10px; line-height: 1.4; width: 100%; }

    .btn-modal-link { background: none; border: 1px solid #bfdbfe; color: #2563eb; padding: 6px 10px; border-radius: 8px; font-size: 0.76rem; font-weight: 700; cursor: pointer; text-align: center; margin-bottom: 6px; width: 100%; }
    .btn-modal-link:hover { background: #eff6ff; }

    .btn-action-group { display: flex; gap: 6px; margin-top: 8px; }
    .btn-save { flex: 1; padding: 11px; background: var(--text-main); color: #fff; border: none; border-radius: 10px; font-weight: 700; font-size: 0.9rem; cursor: pointer; }
    .btn-cancel-edit { display: none; padding: 11px 16px; background: #e5e7eb; color: var(--text-main); border: none; border-radius: 10px; font-weight: 700; font-size: 0.85rem; cursor: pointer; }

    .btn-map-open { background: none; border: 1px solid var(--border); padding: 4px 6px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; cursor: pointer; color: var(--text-sub); }

    .saved-list { display: flex; flex-direction: column; gap: 8px; max-height: 700px; overflow-y: auto; width: 100%; }
    .item-card { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 12px; position: relative; width: 100%; overflow: hidden; }
    .item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .item-name { font-size: 0.88rem; font-weight: 800; color: var(--text-main); word-break: break-all; }
    .badge-user { font-size: 0.68rem; padding: 2px 6px; border-radius: 10px; font-weight: 700; flex-shrink: 0; }
    .user-jh { background: #dbeafe; color: #1e40af; }
    .user-bm { background: #fce7f3; color: #9d174d; }
    .item-summary { font-size: 0.78rem; color: var(--text-sub); line-height: 1.35; word-break: break-all; }
    .item-loan-info { font-size: 0.76rem; color: #03c75a; background: #e8f9ef; padding: 5px 6px; border-radius: 6px; margin-top: 4px; font-weight: 700; word-break: break-all; }
    
    .item-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; border-top: 1px solid #f1f5f9; padding-top: 6px; flex-wrap: wrap; gap: 4px; width: 100%; }
    .btn-card-calc { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; padding: 4px 6px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; cursor: pointer; }
    .btn-card-edit { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 4px 6px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; cursor: pointer; }
    .btn-card-url { background: #f8fafc; color: var(--text-main); border: 1px solid var(--border); padding: 4px 6px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; text-decoration: none; }
    .btn-del { border: none; background: none; color: #94a3b8; cursor: pointer; font-size: 0.7rem; font-weight: 600; }
    .btn-del:hover { color: #ef4444; }

    .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 100; justify-content: center; align-items: center; padding: 12px; }
    .modal-content { background: #fff; width: 100%; max-width: 480px; border-radius: 16px; padding: 16px; max-height: 85vh; overflow-y: auto; }
    .modal-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
    .modal-header h3 { font-size:0.95rem; font-weight:800; }
    .close-btn { border:none; background:none; font-size:1.1rem; cursor:pointer; }
    
    .formula-card { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px; margin-bottom:8px; font-size:0.8rem; line-height:1.5; }
    .formula-title { font-weight:800; color:#1e3a8a; margin-bottom:3px; }
    .formula-math { font-family:monospace; background:#fff; padding:5px 6px; border-radius:6px; border:1px solid #cbd5e1; margin:3px 0; color:#0f172a; font-weight:700; font-size:0.75rem; word-break: break-all; }
    .formula-calc { color:#047857; font-weight:700; margin-top:3px; }

    .tax-step-box { background: #f8fafc; border: 1px solid var(--border); border-radius: 10px; padding: 10px; margin-bottom: 8px; font-size: 0.8rem; width: 100%; }
    .tax-step-title { font-weight: 800; color: #1e3a8a; margin-bottom: 5px; }
    .tax-step-row { display: flex; justify-content: space-between; color: var(--text-sub); margin-bottom: 3px; }
    .tax-step-row.total { font-weight: 800; color: var(--text-main); border-top: 1px solid #e2e8f0; padding-top: 5px; margin-top: 5px; }
  </style>
</head>
<body>

<header>
  <div>
    <h1>🏡 스마트 부동산 종합 플래너</h1>
  </div>
  <div class="user-select">
    <button id="btn-user-jh" class="user-btn active-jh" onclick="setUser('종호')">종호</button>
    <button id="btn-user-bm" class="user-btn" onclick="setUser('봄')">봄</button>
  </div>
</header>

<div class="main-layout">
  <div>
    <div class="tabs">
      <button id="tab-btn-fav" class="tab-btn active" onclick="switchTab('fav')">1. 관심 단지</button>
      <button id="tab-btn-buy" class="tab-btn" onclick="switchTab('buy')">2. 매수 & 대출한도</button>
      <button id="tab-btn-sell" class="tab-btn" onclick="switchTab('sell')">3. 매도 & 비과세</button>
    </div>

    <!-- 1. 관심 단지 섹션 -->
    <div id="fav-section">
      <div class="card">
        <div class="card-title">
          <span id="fav-form-title">🏢 관심 단지 등록 & 임장 메모</span>
          <button class="btn-map-open" onclick="openMapModal()">🗺️ 규제현황</button>
        </div>

        <input type="hidden" id="fav-edit-id" value="" />

        <div class="input-group">
          <label>단지명 / 동호수 / 평형</label>
          <div class="input-row">
            <input type="text" id="fav-apt-name" placeholder="예: 힐스테이트 84A 타입" />
          </div>
        </div>

        <div class="input-group">
          <label>단지 정보 URL (네이버부동산, 호갱노노 링크)</label>
          <div class="input-row">
            <input type="text" id="fav-apt-url" placeholder="https://..." />
          </div>
        </div>

        <div class="input-group">
          <label>지도 앱 URL (네이버지도, 카카오맵 장소 공유 링크)</label>
          <div class="input-row">
            <input type="text" id="fav-map-url" placeholder="https://naver.me/... 또는 https://kko.to/..." />
          </div>
        </div>

        <div class="grid-2">
          <div class="input-group">
            <label>예상 호가 / 실거래가</label>
            <div class="input-row">
              <input type="number" id="fav-price" placeholder="0" step="0.1" />
              <span>억</span>
            </div>
          </div>
          <div class="input-group">
            <label>지역 분류</label>
            <div class="input-row">
              <select id="fav-area">
                <option value="nonreg" selected>비규제지역 (LTV 80%)</option>
                <option value="reg">규제지역 (LTV 70%)</option>
              </select>
            </div>
          </div>
        </div>

        <div class="input-group" style="margin-top:4px;">
          <label>🚇 인근 지하철역 & 도보 거리 (직접 기입)</label>
          <div id="subway-list"></div>
          <button type="button" class="btn-add-subway" onclick="addSubwayRow()">+ 지하철역 추가</button>
        </div>

        <div class="grid-2" style="margin-top:8px;">
          <div class="input-group">
            <label>🏫 학군 (배정 초·중·고 & 학원가)</label>
            <div class="input-row">
              <textarea id="fav-school" placeholder="초품아, 학원가 등" oninput="autoResize(this)"></textarea>
            </div>
          </div>
          <div class="input-group">
            <label>🌳 인프라 / 환경 (마트, 병원, 공원)</label>
            <div class="input-row">
              <textarea id="fav-infra" placeholder="이마트, 공원 인접 등" oninput="autoResize(this)"></textarea>
            </div>
          </div>
        </div>

        <div class="input-group">
          <label>💬 둘만의 임장 총평 & 코멘트</label>
          <div class="input-row">
            <textarea id="fav-memo" placeholder="일조권 우수, 출퇴근 만족 등" oninput="autoResize(this)"></textarea>
          </div>
        </div>

        <div class="btn-action-group">
          <button class="btn-save" id="btn-save-fav" onclick="saveFavScenario()">💾 관심 단지로 등록하여 저장</button>
          <button class="btn-cancel-edit" id="btn-cancel-fav" onclick="cancelEdit('fav')">취소</button>
        </div>
      </div>
    </div>

    <!-- 2. 매수 & 대출한도 섹션 -->
    <div id="buy-section" style="display:none;">
      <div class="area-toggle">
        <button id="area-btn-nonreg" class="area-btn active" onclick="setArea('nonreg')">비규제지역 (LTV 80%)</button>
        <button id="area-btn-reg" class="area-btn" onclick="setArea('reg')">규제지역 (LTV 70%)</button>
      </div>

      <div class="card">
        <div class="card-title">
          <span id="buy-form-title">💰 매수 및 금융 시나리오 입력</span>
          <button class="btn-map-open" onclick="openMapModal()">🗺️ 규제현황</button>
        </div>
        
        <input type="hidden" id="buy-edit-id" value="" />

        <div class="grid-2">
          <div class="input-group">
            <label>매매가 (집값 실거래가)</label>
            <div class="input-row">
              <input type="number" id="buy-price" placeholder="0" step="0.1" oninput="calcNaverEngine()" />
              <span>억</span>
            </div>
          </div>
          <div class="input-group">
            <label>희망 주담대 신청액 (선택)</label>
            <div class="input-row">
              <input type="number" id="buy-desired-loan" placeholder="미입력시 최대" step="0.1" oninput="calcNaverEngine()" />
              <span>억</span>
            </div>
          </div>
        </div>

        <div class="input-group">
          <label>DSR 차주 선택</label>
          <div class="borrower-toggle" style="margin-top:2px;">
            <button id="b-btn-both" class="borrower-btn active" onclick="setBorrower('both')">부부 합산</button>
            <button id="b-btn-jh" class="borrower-btn" onclick="setBorrower('jh')">종호 단독</button>
            <button id="b-btn-bm" class="borrower-btn" onclick="setBorrower('bm')">봄 단독</button>
          </div>
        </div>

        <button class="accordion-btn active" onclick="toggleAccordion('acc-finance', this)">
          <span>💵 가용 현금 & 세전 연봉 상세 입력</span>
          <span>▲</span>
        </button>
        <div id="acc-finance" class="accordion-content" style="display:block;">
          <div class="grid-2">
            <div class="input-group">
              <label>종호 가용 현금</label>
              <div class="input-row"><input type="number" id="cash-jh" placeholder="0" step="0.1" oninput="calcNaverEngine()" /><span>억</span></div>
            </div>
            <div class="input-group">
              <label>봄 가용 현금</label>
              <div class="input-row"><input type="number" id="cash-bm" placeholder="0" step="0.1" oninput="calcNaverEngine()" /><span>억</span></div>
            </div>
          </div>
          <div class="grid-2" style="margin-top:6px;">
            <div class="input-group">
              <label>종호 세전 연봉</label>
              <div class="input-row"><input type="number" id="income-jh" placeholder="0" step="100" oninput="calcNaverEngine()" /><span>만</span></div>
            </div>
            <div class="input-group">
              <label>봄 세전 연봉</label>
              <div class="input-row"><input type="number" id="income-bm" placeholder="0" step="100" oninput="calcNaverEngine()" /><span>만</span></div>
            </div>
          </div>
        </div>

        <button class="accordion-btn active" onclick="toggleAccordion('acc-loan-cond', this)">
          <span>🏦 주담대 금리 & 만기 설정</span>
          <span>▲</span>
        </button>
        <div id="acc-loan-cond" class="accordion-content" style="display:block;">
          <div class="grid-2">
            <div class="input-group">
              <label>주담대 기본 금리 (연)</label>
              <div class="input-row"><input type="number" id="loan-rate" placeholder="0.0" step="0.1" oninput="calcNaverEngine()" /><span>%</span></div>
            </div>
            <div class="input-group">
              <label>주담대 상환 만기</label>
              <div class="input-row">
                <select id="loan-years" onchange="calcNaverEngine()">
                  <option value="30">30년</option>
                  <option value="40" selected>40년</option>
                  <option value="50">50년</option>
                </select>
              </div>
            </div>
          </div>
          <div class="input-group" style="margin-top:6px;">
            <label>주담대 상환 방식</label>
            <div class="input-row">
              <select id="repay-type" onchange="calcNaverEngine()">
                <option value="equal-total" selected>원리금균등분할상환</option>
                <option value="equal-principal">원금균등분할상환</option>
              </select>
            </div>
          </div>
        </div>

        <button class="accordion-btn" onclick="toggleAccordion('acc-corp-loan', this)">
          <span>🏢 사내대출 추가 (DSR 제외 부채)</span>
          <span>▼</span>
        </button>
        <div id="acc-corp-loan" class="accordion-content">
          <div class="grid-3" style="margin-bottom:6px;">
            <div class="input-group"><label>종호 사내대출액</label><div class="input-row"><input type="number" id="corp-loan-jh" placeholder="0" step="0.1" oninput="calcNaverEngine()" /><span>억</span></div></div>
            <div class="input-group"><label>금리</label><div class="input-row"><input type="number" id="corp-rate-jh" placeholder="2.0" step="0.1" oninput="calcNaverEngine()" /><span>%</span></div></div>
            <div class="input-group"><label>만기</label><div class="input-row"><input type="number" id="corp-years-jh" placeholder="10" min="1" oninput="calcNaverEngine()" /><span>년</span></div></div>
          </div>
          <div class="grid-3">
            <div class="input-group"><label>봄 사내대출액</label><div class="input-row"><input type="number" id="corp-loan-bm" placeholder="0" step="0.1" oninput="calcNaverEngine()" /><span>억</span></div></div>
            <div class="input-group"><label>금리</label><div class="input-row"><input type="number" id="corp-rate-bm" placeholder="2.0" step="0.1" oninput="calcNaverEngine()" /><span>%</span></div></div>
            <div class="input-group"><label>만기</label><div class="input-row"><input type="number" id="corp-years-bm" placeholder="10" min="1" oninput="calcNaverEngine()" /><span>년</span></div></div>
          </div>
        </div>

        <div class="input-group">
          <label>자금 플랜 메모</label>
          <div class="input-row">
            <textarea id="buy-memo" placeholder="자금 조달 계획 및 특이사항 입력" oninput="autoResize(this)"></textarea>
          </div>
        </div>

        <div class="naver-result-card">
          <div class="max-afford-box" id="max-afford-box">
            <div class="max-afford-title" id="max-afford-title">🏆 최대 구매 가능 주택 금액</div>
            <div class="max-afford-val" id="res-max-afford-val">0원</div>
            <div class="max-afford-sub" id="res-max-afford-sub">가용현금 + 최대 주담대 한도 - 부대비용 역산</div>
          </div>

          <div class="eval-price-box" id="eval-price-desc">※ 주택 매매평가액: 계산 대기 중</div>
          <div class="naver-limit-title">예상 최대 주담대 한도 (심사 결과)</div>
          <div class="naver-limit-val" id="res-final-limit">0원</div>
          <div class="naver-sub-info" id="res-applied-loan-desc">실제 주담대: 계산 대기 중</div>
          
          <div class="detail-cost-box">
            <div class="detail-cost-header">
              <span>🧾 취득세 및 부대비용 상세 계산</span>
              <button onclick="openBrokerModal()" style="border:none; background:none; color:var(--primary); font-size:0.75rem; font-weight:700; cursor:pointer;">[요율표/VAT ℹ️]</button>
            </div>
            <div class="cost-item"><span>• 취득세</span><span id="cost-acq-tax">0원</span></div>
            <div class="cost-item"><span>• 지방교육세 (취득세의 10%)</span><span id="cost-edu-tax">0원</span></div>
            <div class="cost-item"><span>• 중개보수 (상한 요율+VAT 10%)</span><span id="cost-broker-fee">0원</span></div>
            <div class="cost-item"><span>• 등기/법무/채권 등</span><span id="cost-etc-fee">0원</span></div>
            <div class="cost-item total"><span>부대비용 합계</span><span id="cost-total-sum">0원</span></div>
          </div>

          <div class="target-gap-box" id="gap-box">
            <div class="target-gap-title">목표 집 값까지 추가로 필요한 현금</div>
            <div class="target-gap-val" id="res-need-cash">조건을 입력해 주세요</div>
            <div class="gap-formula-sub" id="gap-formula-text">[매매가 + 부대비용] - 가용현금 - 사내대출 - 주담대</div>
          </div>

          <div class="monthly-breakdown-box" id="res-monthly-breakdown">월 납부액 계산 대기 중...</div>
          <button class="btn-modal-link" onclick="openRepayModal()">🔢 원리금 vs 원금균등 상세 계산과정 보기</button>

          <div class="all-gauges-box">
            <div style="font-weight:800; font-size:0.82rem; margin-bottom:8px; color:var(--text-main);">📊 3대 대출규제 진단 현황</div>
            <div class="gauge-row">
              <div class="gauge-label-flex"><span id="label-gauge-dsr">DSR (스트레스 심사 / 상한 40%)</span><span id="val-gauge-dsr">0%</span></div>
              <div class="gauge-bar-bg"><div id="fill-gauge-dsr" class="gauge-bar-fill" style="width:0%;"></div></div>
            </div>
            <div class="gauge-row">
              <div class="gauge-label-flex"><span id="label-gauge-ltv">LTV (담보인정비율 / 상한 80%)</span><span id="val-gauge-ltv">0%</span></div>
              <div class="gauge-bar-bg"><div id="fill-gauge-ltv" class="gauge-bar-fill" style="width:0%;"></div></div>
            </div>
            <div class="gauge-row">
              <div class="gauge-label-flex"><span>DTI (총부채상환비율 / 상한 60%)</span><span id="val-gauge-dti">0%</span></div>
              <div class="gauge-bar-bg"><div id="fill-gauge-dti" class="gauge-bar-fill" style="width:0%;"></div></div>
            </div>
          </div>

          <div class="rule-decision-banner" id="res-rule-banner">대출규제 한도 분석 대기 중</div>
          <button class="btn-modal-link" onclick="openFormulaModal()">🔍 DSR · LTV · DTI 실제 계산식 보기</button>
        </div>

        <div class="btn-action-group">
          <button class="btn-save" id="btn-save-buy" onclick="saveBuyScenario()">💾 대출·매수 시나리오 저장</button>
          <button class="btn-cancel-edit" id="btn-cancel-buy" onclick="cancelEdit('buy')">취소</button>
        </div>
      </div>
    </div>

    <!-- 3. 매도 & 비과세 정산 섹션 -->
    <div id="sell-section" style="display:none;">
      <div class="card">
        <div class="card-title">
          <span id="sell-form-title">📈 매도 & 비과세 정밀 정산</span>
        </div>
        
        <input type="hidden" id="sell-edit-id" value="" />

        <div class="input-group">
          <label>양도 시점별 세법 적용 조건 선택 (3대 정책 룰)</label>
          <div class="policy-toggle-box">
            <button id="p-btn-2027" class="policy-btn active" onclick="setPolicyYear('2027')">~2027년 (무제한)</button>
            <button id="p-btn-2028" class="policy-btn" onclick="setPolicyYear('2028')">2028년 (20억)</button>
            <button id="p-btn-2029" class="policy-btn" onclick="setPolicyYear('2029')">2029년후 (10억)</button>
          </div>
        </div>

        <div class="grid-2">
          <div class="input-group">
            <label>취득가액 (매수가)</label>
            <div class="input-row"><input type="number" id="sell-buy-price" placeholder="0" step="0.1" oninput="calcSell()" /><span>억</span></div>
          </div>
          <div class="input-group">
            <label>양도가액 (예상 매도가)</label>
            <div class="input-row"><input type="number" id="sell-price" placeholder="0" step="0.1" oninput="calcSell()" /><span>억</span></div>
          </div>
        </div>
        
        <div class="grid-2">
          <div class="input-group">
            <label>보유 기간</label>
            <div class="input-row"><input type="number" id="sell-hold-years" placeholder="0" min="0" oninput="calcSell()" /><span>년</span></div>
          </div>
          <div class="input-group">
            <label>실거주 기간</label>
            <div class="input-row"><input type="number" id="sell-live-years" placeholder="0" min="0" oninput="calcSell()" /><span>년</span></div>
          </div>
        </div>

        <div class="detail-cost-box" style="margin-top:6px;">
          <div class="detail-cost-header">
            <span>⚙️ 법정 인정 필요경비 (자동 계산)</span>
            <button onclick="openExpenseModal()" style="border:none; background:none; color:var(--primary); font-size:0.75rem; font-weight:700; cursor:pointer;">[상세 산출식 ℹ️]</button>
          </div>
          <div class="cost-item">
            <span>차익 공제 총액</span>
            <span id="auto-expense-val" style="color:var(--primary); font-weight:800;">0원</span>
          </div>
          <div style="font-size:0.72rem; color:var(--text-sub); margin-top:3px;">
            ※ 세법상 양도차익 = 매도가 - 취득가 - <strong>취득세/복비 - 매도복비</strong>
          </div>
        </div>

        <div class="input-group" style="margin-top:8px;">
          <label>갈아타기 계획 메모</label>
          <div class="input-row">
            <textarea id="sell-memo" placeholder="갈아타기 계획 및 목표 상급지 메모" oninput="autoResize(this)"></textarea>
          </div>
        </div>

        <div class="naver-result-card">
          <div class="naver-limit-title">세후 최종 실수령 순수익</div>
          <div class="naver-limit-val" style="color:#2563eb;" id="sell-net-profit">0원</div>
          
          <div class="tax-step-box">
            <div class="tax-step-title" id="tax-step-header-title">📋 양도소득세 및 비과세 계산 흐름</div>
            <div class="tax-step-row"><span>① 전체 시세 차익</span><span id="flow-total-profit" style="font-weight:700;">0원</span></div>
            <div class="tax-step-row"><span>② 비과세 적용 방식</span><span id="flow-taxfree-type" style="font-weight:700; color:var(--naver-green);">-</span></div>
            <div class="tax-step-row"><span>③ 12억 초과 과세대상 차익</span><span id="flow-taxable-profit">0원</span></div>
            <div class="tax-step-row"><span id="label-deduct-step">④ 장특공제율 (공제액)</span><span id="flow-deduct-val">0% (0원)</span></div>
            <div class="tax-step-row"><span>⑤ 과세표준 (기본공제 -250만)</span><span id="flow-tax-base">0원</span></div>
            <div class="tax-step-row total"><span>⑥ 최종 예상 양도세 (지방세 포함)</span><span id="flow-final-tax" style="color:var(--danger);">0원</span></div>
          </div>

          <button class="btn-modal-link" onclick="openTaxModal()">📖 양도세 & 비과세 3대 정책 상세 공식 보기</button>
        </div>

        <div class="btn-action-group">
          <button class="btn-save" id="btn-save-sell" onclick="saveSellScenario()">💾 매도 시나리오 저장</button>
          <button class="btn-cancel-edit" id="btn-cancel-sell" onclick="cancelEdit('sell')">취소</button>
        </div>
      </div>
    </div>
  </div>

  <!-- 오른쪽 컬럼: 각 탭별 독립 보관함 리스트 -->
  <div>
    <div class="card">
      <div class="card-title">
        <span id="vault-tab-title">📋 관심 단지 보관함</span>
        <button onclick="clearCurrentTabData()" style="border:none; background:none; color:var(--text-sub); font-size:0.72rem; cursor:pointer;">전체삭제</button>
      </div>
      <div id="saved-list" class="saved-list"></div>
    </div>
  </div>
</div>

<!-- 모달 1: DSR · LTV · DTI 수식 모달 -->
<div id="formula-modal" class="modal-overlay" onclick="closeFormulaModal(event)">
  <div class="modal-content" onclick="event.stopPropagation()">
    <div class="modal-header">
      <h3>🔍 DSR · LTV · DTI 실제 계산식 & 산출과정</h3>
      <button class="close-btn" onclick="closeFormulaModal()">✕</button>
    </div>
    <div class="formula-card">
      <div class="formula-title">1. DSR (총부채원리금상환비율) - 상한 40%</div>
      <div class="formula-math">DSR = (주담대 스트레스 연상환액 ÷ 연소득) × 100</div>
      <div class="formula-calc" id="modal-dsr-calc">계산 대기 중...</div>
    </div>
    <div class="formula-card">
      <div class="formula-title">2. LTV (주택담보대출비율) - 비규제 80% / 규제 70%</div>
      <div class="formula-math">LTV = (실제 주담대 대출액 ÷ 매매평가액) × 100</div>
      <div class="formula-calc" id="modal-ltv-calc">계산 대기 중...</div>
    </div>
    <div class="formula-card">
      <div class="formula-title">3. DTI (총부채상환비율) - 상한 60%</div>
      <div class="formula-math">DTI = (주담대 기본 연상환액 ÷ 연소득) × 100</div>
      <div class="formula-calc" id="modal-dti-calc">계산 대기 중...</div>
    </div>
  </div>
</div>

<!-- 모달 2: 중개보수 안내 모달 -->
<div id="broker-modal" class="modal-overlay" onclick="closeBrokerModal(event)">
  <div class="modal-content" onclick="event.stopPropagation()">
    <div class="modal-header">
      <h3>🧾 중개보수 상한요율 및 VAT 안내</h3>
      <button class="close-btn" onclick="closeBrokerModal()">✕</button>
    </div>
    <div style="font-size:0.8rem; line-height:1.5;">
      • <strong>5천만 미만:</strong> 0.6% (한도 25만)<br>
      • <strong>5천만~2억 미만:</strong> 0.5% (한도 80만)<br>
      • <strong>2억~9억 미만:</strong> 0.4%<br>
      • <strong>9억~12억 미만:</strong> 0.5%<br>
      • <strong>12억~15억 미만:</strong> 0.6%<br>
      • <strong>15억 이상:</strong> 0.7%<br>
      <hr style="margin:8px 0; border:0; border-top:1px solid #e2e8f0;">
      💡 <strong>부가가치세(VAT 10%)</strong>는 양도세 필요경비로 전액 공제됩니다.
    </div>
  </div>
</div>

<!-- 모달 3: 상환액 계산과정 모달 -->
<div id="repay-modal" class="modal-overlay" onclick="closeRepayModal(event)">
  <div class="modal-content" onclick="event.stopPropagation()">
    <div class="modal-header">
      <h3>🔢 월 상환액 실제 수치 계산 과정</h3>
      <button class="close-btn" onclick="closeRepayModal()">✕</button>
    </div>
    <div style="font-size:0.8rem; line-height:1.5;">
      <div class="formula-card">
        <div class="formula-title">1. 원리금균등분할상환</div>
        <div class="formula-math">월납입액 = 대출원금 × [r(1+r)^n ÷ ((1+r)^n - 1)]</div>
        <div class="formula-calc" id="modal-repay-equal-calc">대기 중...</div>
      </div>
      <div class="formula-card">
        <div class="formula-title">2. 원금균등분할상환</div>
        <div class="formula-math">월 원금 = 원금 ÷ n | 첫 달 이자 = 잔액 × r</div>
        <div class="formula-calc" id="modal-repay-principal-calc">대기 중...</div>
      </div>
    </div>
  </div>
</div>

<!-- 모달 4: 필요경비 상세 산출식 모달 -->
<div id="expense-modal" class="modal-overlay" onclick="closeExpenseModal(event)">
  <div class="modal-content" onclick="event.stopPropagation()">
    <div class="modal-header">
      <h3>⚙️ 법정 인정 필요경비 상세 산출</h3>
      <button class="close-btn" onclick="closeExpenseModal()">✕</button>
    </div>
    <div style="font-size:0.8rem; line-height:1.5;">
      <div class="formula-card">
        <div class="formula-title">세부 산출 내역</div>
        <div class="formula-calc" id="modal-expense-detail">대기 중...</div>
      </div>
    </div>
  </div>
</div>

<!-- 모달 5: 양도세 정책 모달 -->
<div id="tax-modal" class="modal-overlay" onclick="closeTaxModal(event)">
  <div class="modal-content" onclick="event.stopPropagation()">
    <div class="modal-header">
      <h3>📖 양도소득세 3대 정책 공식</h3>
      <button class="close-btn" onclick="closeTaxModal()">✕</button>
    </div>
    <div style="font-size:0.8rem; line-height:1.5;">
      <div class="formula-card">
        <div class="formula-title">1. ~2027년 (현행)</div>
        • 공제 한도: 무제한<br>• 공제율: 보유+거주 최대 80% (연 4% + 4%)
      </div>
      <div class="formula-card">
        <div class="formula-title">2. 2028년 (과도기)</div>
        • 공제 한도: 최대 20억 캡<br>• 공제율: 보유 20% + 거주 60% (연 2% + 6%)
      </div>
      <div class="formula-card">
        <div class="formula-title">3. 2029년 이후</div>
        • 공제 한도: 최대 10억 캡<br>• 공제율: 보유 전면폐지 + 거주 최대 80% (연 8%)
      </div>
    </div>
  </div>
</div>

<!-- 모달 6: 규제지역 지도 모달 -->
<div id="map-modal" class="modal-overlay" onclick="closeMapModal(event)">
  <div class="modal-content" onclick="event.stopPropagation()">
    <div class="modal-header">
      <h3>🗺️ 규제/비규제 지역 현황 안내</h3>
      <button class="close-btn" onclick="closeMapModal()">✕</button>
    </div>
    <div style="background:#f8fafc; border:1px solid var(--border); border-radius:10px; padding:12px; font-size:0.8rem; line-height:1.5;">
      <p style="color:#03c75a; font-weight:800; margin-bottom:4px;">🟩 규제지역 (서울 전역 + 경기 과천·성남·하남·광명 등 15개 시군)</p>
      • LTV 70% 제한, 스트레스 DSR 2단계 가산금리 높음(+2.40%p)
      <hr style="margin:8px 0; border:0; border-top:1px solid #e2e8f0;">
      <p style="color:#2563eb; font-weight:800; margin-bottom:4px;">🟦 비규제지역 (경기 기타 지역, 지방 등)</p>
      • 생애최초 LTV 80% 우대, 스트레스 DSR 완화(+0.45%p)
    </div>
  </div>
</div>

<script>
  let currentUser = '종호';
  let currentTab = 'fav';
  let currentArea = 'nonreg';
  let currentBorrower = 'both';
  let currentPolicyYear = '2027';

  let globalMaxDsrLoan = 0;
  let globalMaxLtvLoan = 0;
  let globalPolicyCap = 0;
  let globalFinalLimitWon = 0;
  let globalActualLoanWon = 0;

  let globalDSR = 0;
  let globalLTV = 0;
  let globalDTI = 0;
  let globalIncomeWon = 0;
  let globalEvalPriceWon = 0;
  let globalStressRate = 0;
  let globalBaseRate = 0;
  let globalYears = 40;
  let globalAnnualRepay = 0;
  let globalAnnualStressRepay = 0;
  let globalCorpAnnualRepay = 0;

  function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  function setUser(name) {
    currentUser = name;
    document.getElementById('btn-user-jh').className = 'user-btn ' + (name === '종호' ? 'active-jh' : '');
    document.getElementById('btn-user-bm').className = 'user-btn ' + (name === '봄' ? 'active-bm' : '');
  }

  function setArea(type) {
    currentArea = type;
    document.getElementById('area-btn-nonreg').className = 'area-btn ' + (type === 'nonreg' ? 'active' : '');
    document.getElementById('area-btn-reg').className = 'area-btn ' + (type === 'reg' ? 'active' : '');
    calcNaverEngine();
  }

  function setBorrower(type) {
    currentBorrower = type;
    document.getElementById('b-btn-both').className = 'borrower-btn ' + (type === 'both' ? 'active' : '');
    document.getElementById('b-btn-jh').className = 'borrower-btn ' + (type === 'jh' ? 'active' : '');
    document.getElementById('b-btn-bm').className = 'borrower-btn ' + (type === 'bm' ? 'active' : '');
    calcNaverEngine();
  }

  function setPolicyYear(year) {
    currentPolicyYear = year;
    document.getElementById('p-btn-2027').className = 'policy-btn ' + (year === '2027' ? 'active' : '');
    document.getElementById('p-btn-2028').className = 'policy-btn ' + (year === '2028' ? 'active' : '');
    document.getElementById('p-btn-2029').className = 'policy-btn ' + (year === '2029' ? 'active' : '');
    calcSell();
  }

  function toggleAccordion(id, btn) {
    const el = document.getElementById(id);
    const isOpen = el.style.display === 'block';
    el.style.display = isOpen ? 'none' : 'block';
    btn.classList.toggle('active', !isOpen);
    btn.querySelector('span:last-child').innerText = isOpen ? '▼' : '▲';
    calcNaverEngine();
  }

  function switchTab(tab) {
    currentTab = tab;
    document.getElementById('fav-section').style.display = (tab === 'fav') ? 'block' : 'none';
    document.getElementById('buy-section').style.display = (tab === 'buy') ? 'block' : 'none';
    document.getElementById('sell-section').style.display = (tab === 'sell') ? 'block' : 'none';
    
    document.getElementById('tab-btn-fav').classList.toggle('active', tab === 'fav');
    document.getElementById('tab-btn-buy').classList.toggle('active', tab === 'buy');
    document.getElementById('tab-btn-sell').classList.toggle('active', tab === 'sell');

    const titles = { fav: '📋 관심 단지 보관함', buy: '📋 매수·대출 보관함', sell: '📋 매도·비과세 보관함' };
    document.getElementById('vault-tab-title').innerText = titles[tab];

    renderSavedList();
  }

  function addSubwayRow(line = '', name = '', dist = '') {
    const div = document.createElement('div');
    div.className = 'subway-row';
    div.innerHTML = `
      <input type="text" placeholder="예: 1호선" class="subway-line" value="${line}" />
      <input type="text" placeholder="예: 금정역" class="subway-name" value="${name}" />
      <div class="subway-dist-wrap"><input type="number" placeholder="거리" class="subway-dist" value="${dist}" /><span>m</span></div>
      <button type="button" class="btn-icon-del" onclick="delSubwayRow(this)">✕</button>
    `;
    document.getElementById('subway-list').appendChild(div);
  }

  function delSubwayRow(btn) {
    const list = document.getElementById('subway-list');
    if (list.children.length > 1) {
      btn.parentElement.remove();
    } else {
      btn.parentElement.querySelectorAll('input').forEach(i => i.value = '');
    }
  }

  function openMapModal() { document.getElementById('map-modal').style.display = 'flex'; }
  function closeMapModal() { document.getElementById('map-modal').style.display = 'none'; }
  function openBrokerModal() { document.getElementById('broker-modal').style.display = 'flex'; }
  function closeBrokerModal() { document.getElementById('broker-modal').style.display = 'none'; }
  function openRepayModal() { updateModalRepay(); document.getElementById('repay-modal').style.display = 'flex'; }
  function closeRepayModal() { document.getElementById('repay-modal').style.display = 'none'; }
  function openExpenseModal() { updateModalExpense(); document.getElementById('expense-modal').style.display = 'flex'; }
  function closeExpenseModal() { document.getElementById('expense-modal').style.display = 'none'; }
  function openTaxModal() { document.getElementById('tax-modal').style.display = 'flex'; }
  function closeTaxModal() { document.getElementById('tax-modal').style.display = 'none'; }
  function openFormulaModal() { updateModalFormula(); document.getElementById('formula-modal').style.display = 'flex'; }
  function closeFormulaModal() { document.getElementById('formula-modal').style.display = 'none'; }

  function calcNaverEngine() {
    const p = parseFloat(document.getElementById('buy-price').value) || 0;
    const cashJh = parseFloat(document.getElementById('cash-jh').value) || 0;
    const cashBm = parseFloat(document.getElementById('cash-bm').value) || 0;

    const incJh = parseFloat(document.getElementById('income-jh').value) || 0;
    const incBm = parseFloat(document.getElementById('income-bm').value) || 0;

    let selectedIncome = (currentBorrower === 'both') ? (incJh + incBm) : (currentBorrower === 'jh' ? incJh : incBm);
    let selectedCash = (currentBorrower === 'both') ? (cashJh + cashBm) : (currentBorrower === 'jh' ? cashJh : cashBm);

    const corpJh = parseFloat(document.getElementById('corp-loan-jh').value) || 0;
    const corpRateJh = parseFloat(document.getElementById('corp-rate-jh').value) || 2.0;
    const corpYearsJh = parseInt(document.getElementById('corp-years-jh').value) || 10;

    const corpBm = parseFloat(document.getElementById('corp-loan-bm').value) || 0;
    const corpRateBm = parseFloat(document.getElementById('corp-rate-bm').value) || 2.0;
    const corpYearsBm = parseInt(document.getElementById('corp-years-bm').value) || 10;

    let selectedCorpLoan = (currentBorrower === 'both') ? (corpJh + corpBm) : (currentBorrower === 'jh' ? corpJh : corpBm);
    let selectedCorpWon = selectedCorpLoan * 100000000;

    document.getElementById('b-btn-both').innerText = `부부 합산 (${((incJh+incBm)/10000).toFixed(2)}억)`;
    document.getElementById('b-btn-jh').innerText = `종호 (${(incJh/10000).toFixed(2)}억)`;
    document.getElementById('b-btn-bm').innerText = `봄 (${(incBm/10000).toFixed(2)}억)`;

    const baseRate = parseFloat(document.getElementById('loan-rate').value) || 0;
    const years = parseInt(document.getElementById('loan-years').value) || 40;
    globalYears = years;
    const repayType = document.getElementById('repay-type').value;
    const desiredLoan = parseFloat(document.getElementById('buy-desired-loan').value) || 0;

    globalEvalPriceWon = (p * 100000000) * 0.9;
    globalIncomeWon = selectedIncome * 10000;
    globalBaseRate = baseRate;

    if (selectedIncome <= 0 || baseRate <= 0) {
      document.getElementById('res-final-limit').innerText = '0원';
      document.getElementById('res-applied-loan-desc').innerText = '실제 주담대: 계산 대기 중';
      document.getElementById('res-max-afford-val').innerText = '소득 및 금리를 입력해 주세요';
      document.getElementById('eval-price-desc').innerText = '※ 주택 매매평가액: 계산 대기 중';
      document.getElementById('cost-acq-tax').innerText = '0원';
      document.getElementById('cost-edu-tax').innerText = '0원';
      document.getElementById('cost-broker-fee').innerText = '0원';
      document.getElementById('cost-etc-fee').innerText = '0원';
      document.getElementById('cost-total-sum').innerText = '0원';
      document.getElementById('res-need-cash').innerText = '조건을 입력해 주세요';
      document.getElementById('res-monthly-breakdown').innerHTML = '소득과 금리를 입력해 주세요.';
      document.getElementById('res-rule-banner').innerHTML = '대출규제 한도 분석 대기 중';
      resetGauges();
      return;
    }

    globalPolicyCap = (p <= 15) ? 600000000 : (p <= 25 ? 400000000 : 200000000);
    if (p === 0) globalPolicyCap = 600000000;

    let stressAdd = (currentArea === 'reg') ? 2.40 : 0.45;
    globalStressRate = baseRate + stressAdd;

    let corpMonthlyJh = (corpJh > 0) ? (corpJh * 100000000) * ((corpRateJh/100/12)*Math.pow(1+corpRateJh/100/12, corpYearsJh*12))/(Math.pow(1+corpRateJh/100/12, corpYearsJh*12)-1) : 0;
    let corpMonthlyBm = (corpBm > 0) ? (corpBm * 100000000) * ((corpRateBm/100/12)*Math.pow(1+corpRateBm/100/12, corpYearsBm*12))/(Math.pow(1+corpRateBm/100/12, corpYearsBm*12)-1) : 0;
    globalCorpAnnualRepay = (currentBorrower === 'both') ? (corpMonthlyJh + corpMonthlyBm) * 12 : (currentBorrower === 'jh' ? corpMonthlyJh * 12 : corpMonthlyBm * 12);

    let maxTotalDsrAnnualRepay = globalIncomeWon * 0.40;
    let monthlyStressR = (globalStressRate / 100) / 12;
    let n = years * 12;
    globalMaxDsrLoan = (maxTotalDsrAnnualRepay / 12) * (Math.pow(1 + monthlyStressR, n) - 1) / (monthlyStressR * Math.pow(1 + monthlyStressR, n));

    let ltvMaxRate = (currentArea === 'nonreg') ? 0.80 : 0.70;
    let bankMaxLoanForAfford = Math.min(globalMaxDsrLoan, 600000000); 
    let rawAffordWon = (selectedCash * 100000000) + bankMaxLoanForAfford + selectedCorpWon;
    let estimatedCostWon = rawAffordWon * 0.035; 
    let maxAffordHouseWon = Math.max(rawAffordWon - estimatedCostWon, 0);

    if (selectedCorpWon > 0) {
      document.getElementById('max-afford-title').innerText = `🏆 영끌(사내대출 포함) 최대 구매 가능 주택 금액`;
      document.getElementById('res-max-afford-val').innerText = `약 ${(maxAffordHouseWon/100000000).toFixed(2)}억 원`;
      document.getElementById('res-max-afford-sub').innerText = `가용현금(${(selectedCash).toFixed(1)}억) + 주담대(최대 ${(bankMaxLoanForAfford/100000000).toFixed(2)}억) + 사내대출(${(selectedCorpLoan).toFixed(1)}억) - 부대비용 반영`;
    } else {
      document.getElementById('max-afford-title').innerText = `🏆 은행권 기준 최대 구매 가능 주택 금액`;
      document.getElementById('res-max-afford-val').innerText = `약 ${(maxAffordHouseWon/100000000).toFixed(2)}억 원`;
      document.getElementById('res-max-afford-sub').innerText = `가용현금(${(selectedCash).toFixed(1)}억) + 주담대(최대 ${(bankMaxLoanForAfford/100000000).toFixed(2)}억) - 취득 부대비용 반영`;
    }

    if (p <= 0) {
      document.getElementById('eval-price-desc').innerText = '※ 주택 매매평가액: 계산 대기 중';
      document.getElementById('res-final-limit').innerText = `${(bankMaxLoanForAfford/100000000).toFixed(2)}억 원 (소득기준 최대)`;
      document.getElementById('res-applied-loan-desc').innerText = '매매가를 입력하면 실제 집값 기준 시뮬레이션이 진행됩니다.';
      return;
    }

    document.getElementById('eval-price-desc').innerText = `※ 주택 매매평가액: 약 ${(globalEvalPriceWon/100000000).toFixed(2)}억 원 (실거래가의 보수적 90% 반영)`;

    globalMaxLtvLoan = globalEvalPriceWon * ltvMaxRate;
    globalFinalLimitWon = Math.min(globalMaxDsrLoan, globalMaxLtvLoan, globalPolicyCap);

    if (desiredLoan > 0) {
      let desiredLoanWon = desiredLoan * 100000000;
      if (desiredLoanWon <= globalFinalLimitWon) {
        globalActualLoanWon = desiredLoanWon;
        document.getElementById('res-applied-loan-desc').innerText = `실제 주담대: 희망액 ${desiredLoan}억 원 적용 (최대한도 ${(globalFinalLimitWon/100000000).toFixed(2)}억 중 선택)`;
        document.getElementById('res-applied-loan-desc').style.color = '#2563eb';
      } else {
        globalActualLoanWon = globalFinalLimitWon;
        document.getElementById('res-applied-loan-desc').innerText = `⚠️ 희망 대출액(${desiredLoan}억)이 심사 한도를 초과하여 최대한도 ${(globalFinalLimitWon/100000000).toFixed(2)}억 원이 적용됩니다.`;
        document.getElementById('res-applied-loan-desc').style.color = '#dc2626';
      }
    } else {
      globalActualLoanWon = globalFinalLimitWon;
      document.getElementById('res-applied-loan-desc').innerText = `실제 주담대: 심사 최대 한도 ${(globalFinalLimitWon/100000000).toFixed(2)}억 원 전액 적용`;
      document.getElementById('res-applied-loan-desc').style.color = 'var(--text-sub)';
    }

    let taxRate = (p <= 6) ? 0.01 : ((p <= 9) ? ((p * (2/3) - 3) / 100) : 0.03);
    let acqTaxWon = (p * 100000000) * taxRate;
    let eduTaxWon = acqTaxWon * 0.10;
    let brokerFeeWon = (p * 100000000) * (p <= 9 ? 0.004 : (p <= 12 ? 0.005 : (p <= 15 ? 0.006 : 0.007))) * 1.1;
    let etcFeeWon = 1500000;
    let totalCostWon = acqTaxWon + eduTaxWon + brokerFeeWon + etcFeeWon;

    let totalNeededTotalWon = (p * 100000000) + totalCostWon;
    let availableCashWon = selectedCash * 100000000;
    let needCashWon = totalNeededTotalWon - availableCashWon - selectedCorpWon - globalActualLoanWon;

    let baseMonthlyR = (baseRate / 100) / 12;
    let monthlyMortgagePrincipal = 0;
    let monthlyMortgageInterest = 0;
    let totalMortgageMonthly = 0;

    if (repayType === 'equal-total') {
      totalMortgageMonthly = globalActualLoanWon * (baseMonthlyR * Math.pow(1 + baseMonthlyR, n)) / (Math.pow(1 + baseMonthlyR, n) - 1);
      monthlyMortgageInterest = globalActualLoanWon * baseMonthlyR;
      monthlyMortgagePrincipal = totalMortgageMonthly - monthlyMortgageInterest;
    } else {
      let monthlyPrincipalWon = globalActualLoanWon / n;
      monthlyMortgageInterest = globalActualLoanWon * baseMonthlyR;
      totalMortgageMonthly = monthlyPrincipalWon + monthlyMortgageInterest;
      monthlyMortgagePrincipal = monthlyPrincipalWon;
    }

    let totalCorpMonthlyPay = (currentBorrower === 'both') ? (corpMonthlyJh + corpMonthlyBm) : (currentBorrower === 'jh' ? corpMonthlyJh : corpMonthlyBm);
    let totalMonthlyAllPay = totalMortgageMonthly + totalCorpMonthlyPay;

    globalAnnualRepay = totalMortgageMonthly * 12;
    let stressMonthlyPay = globalActualLoanWon * (monthlyStressR * Math.pow(1 + monthlyStressR, n)) / (Math.pow(1 + monthlyStressR, n) - 1);
    globalAnnualStressRepay = stressMonthlyPay * 12;

    globalDSR = (globalAnnualStressRepay / globalIncomeWon) * 100;
    globalLTV = (globalActualLoanWon / globalEvalPriceWon) * 100;
    globalDTI = ((globalAnnualRepay + globalCorpAnnualRepay) / globalIncomeWon) * 100;

    document.getElementById('res-final-limit').innerText = `${(globalFinalLimitWon/100000000).toFixed(2)}억 원 (${Math.round(globalFinalLimitWon/10000).toLocaleString()}만 원)`;
    
    document.getElementById('cost-acq-tax').innerText = `${Math.round(acqTaxWon/10000).toLocaleString()}만 원 (${(taxRate*100).toFixed(2)}%)`;
    document.getElementById('cost-edu-tax').innerText = `${Math.round(eduTaxWon/10000).toLocaleString()}만 원`;
    document.getElementById('cost-broker-fee').innerText = `${Math.round(brokerFeeWon/10000).toLocaleString()}만 원`;
    document.getElementById('cost-etc-fee').innerText = `${Math.round(etcFeeWon/10000).toLocaleString()}만 원`;
    document.getElementById('cost-total-sum').innerText = `약 ${Math.round(totalCostWon/10000).toLocaleString()}만 원`;

    const gapValElem = document.getElementById('res-need-cash');
    if (needCashWon > 0) {
      gapValElem.innerText = `${(needCashWon/100000000).toFixed(2)}억 원 (${Math.round(needCashWon/10000).toLocaleString()}만 원) 더 필요해요`;
      document.getElementById('gap-box').style.background = '#fef2f2';
      gapValElem.style.color = '#dc2626';
    } else {
      gapValElem.innerText = `현금이 ${Math.abs(Math.round(needCashWon/10000)).toLocaleString()}만 원 남아요 (자금 충분)`;
      document.getElementById('gap-box').style.background = '#f0fdf4';
      gapValElem.style.color = '#15803d';
    }

    let corpText = '';
    if (totalCorpMonthlyPay > 0) {
      if (currentBorrower === 'both') {
        corpText = `- 사내대출 상환액: 약 ${Math.round(totalCorpMonthlyPay/10000)}만 원 (종호 ${Math.round(corpMonthlyJh/10000)}만 + 봄 ${Math.round(corpMonthlyBm/10000)}만)`;
      } else {
        corpText = `- 사내대출 상환액: 약 ${Math.round(totalCorpMonthlyPay/10000)}만 원 (${currentBorrower==='jh'?'종호':'봄'})`;
      }
    } else {
      corpText = '- 사내대출: 미적용';
    }

    document.getElementById('res-monthly-breakdown').innerHTML = `
      • <strong>월 총 납부액: 약 ${Math.round(totalMonthlyAllPay/10000).toLocaleString()}만 원 / 월</strong><br>
      - 주담대 상환액: 원금 ${Math.round(monthlyMortgagePrincipal/10000)}만 + 이자 ${Math.round(monthlyMortgageInterest/10000)}만 = 약 ${Math.round(totalMortgageMonthly/10000)}만 원<br>
      ${corpText}
    `;

    let borrowerTitle = (currentBorrower === 'both') ? '부부 합산' : (currentBorrower === 'jh' ? '종호' : '봄');
    document.getElementById('label-gauge-dsr').innerText = `DSR (${borrowerTitle} 스트레스 심사 / 상한 40%)`;
    document.getElementById('val-gauge-dsr').innerText = `${globalDSR.toFixed(1)}% / 40%`;
    document.getElementById('fill-gauge-dsr').style.width = `${Math.min((globalDSR/40)*100, 100)}%`;
    document.getElementById('fill-gauge-dsr').className = 'gauge-bar-fill ' + (globalDSR > 40 ? 'danger' : '');

    document.getElementById('label-gauge-ltv').innerText = `LTV (담보인정비율 / 상한 ${ltvMaxRate*100}%)`;
    document.getElementById('val-gauge-ltv').innerText = `${globalLTV.toFixed(1)}% / ${ltvMaxRate*100}%`;
    document.getElementById('fill-gauge-ltv').style.width = `${Math.min((globalLTV/(ltvMaxRate*100))*100, 100)}%`;

    document.getElementById('val-gauge-dti').innerText = `${globalDTI.toFixed(1)}% / 60%`;
    document.getElementById('fill-gauge-dti').style.width = `${Math.min((globalDTI/60)*100, 100)}%`;

    const ruleBanner = document.getElementById('res-rule-banner');
    if (globalFinalLimitWon === globalMaxDsrLoan && globalMaxDsrLoan < globalMaxLtvLoan && globalMaxDsrLoan < globalPolicyCap) {
      document.getElementById('fill-gauge-dsr').className = 'gauge-bar-fill active-limit';
      ruleBanner.innerHTML = `⚠️ <strong>대출한도가 [DSR 40% 규제]에 의해 결정되었습니다.</strong><br>${borrowerTitle} 소득 대비 주담대 상환액이 한도에 도달하여 승인액이 ${(globalMaxDsrLoan/100000000).toFixed(2)}억 원으로 제한되었습니다.`;
    } else if (globalFinalLimitWon === globalPolicyCap) {
      ruleBanner.innerHTML = `📌 <strong>대출한도가 [주택가격별 정책 상한액 ${(globalPolicyCap/100000000)}억 원]에 의해 결정되었습니다.</strong><br>소득과 담보 가치가 충분하더라도 가격대별 최대 정책 상한(${p<=15?'15억 이하 6억':(p<=25?'15억 초과 4억':'25억 초과 2억')})에 걸려 승인액이 제한됩니다.`;
    } else {
      document.getElementById('fill-gauge-ltv').className = 'gauge-bar-fill active-limit';
      ruleBanner.innerHTML = `✅ <strong>대출한도가 [LTV ${ltvMaxRate*100}% 규제]에 의해 결정되었습니다.</strong><br>소득이 충분하여 보수적 평가액(${Math.round(globalEvalPriceWon/10000)}만) 대비 담보인정 한도인 ${(globalMaxLtvLoan/100000000).toFixed(2)}억 원까지 승인 가능합니다.`;
    }
  }

  function resetGauges() {
    document.getElementById('val-gauge-dsr').innerText = '0%';
    document.getElementById('val-gauge-ltv').innerText = '0%';
    document.getElementById('val-gauge-dti').innerText = '0%';
    document.getElementById('fill-gauge-dsr').style.width = '0%';
    document.getElementById('fill-gauge-ltv').style.width = '0%';
    document.getElementById('fill-gauge-dti').style.width = '0%';
  }

  function updateModalRepay() {
    let pWon = globalActualLoanWon;
    let r = (globalBaseRate / 100) / 12;
    let n = globalYears * 12;

    if (pWon <= 0 || r <= 0) {
      document.getElementById('modal-repay-equal-calc').innerText = '대출 조건이 입력되지 않았습니다.';
      document.getElementById('modal-repay-principal-calc').innerText = '대출 조건이 입력되지 않았습니다.';
      return;
    }

    let monthlyEqual = pWon * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    let interest1 = pWon * r;
    let principal1 = monthlyEqual - interest1;

    document.getElementById('modal-repay-equal-calc').innerHTML = `
      • 공식: 원금 × [r(1+r)^n ÷ ((1+r)^n - 1)]<br>
      • 대출원금: ${Math.round(pWon/10000).toLocaleString()}만, 월이율: ${(r*100).toFixed(4)}%, 개월수: ${n}개월<br>
      • <strong>매월 고정 납부액: 약 ${Math.round(monthlyEqual/10000).toLocaleString()}만 원 / 월</strong><br>
      (첫 달: 원금 ${Math.round(principal1/10000)}만 + 이자 ${Math.round(interest1/10000)}만)
    `;

    let principalEqual = pWon / n;
    let totalFirst = principalEqual + interest1;

    document.getElementById('modal-repay-principal-calc').innerHTML = `
      • 공식: 월 원금 = 원금 ÷ n | 첫 달 이자 = 잔액 × r<br>
      • 고정 원금: 약 ${Math.round(principalEqual/10000).toLocaleString()}만 원 / 월<br>
      • <strong>첫 달 납부액: 약 ${Math.round(totalFirst/10000).toLocaleString()}만 원</strong> (원금 ${Math.round(principalEqual/10000)}만 + 이자 ${Math.round(interest1/10000)}만)
    `;
  }

  function updateModalExpense() {
    const buyP = parseFloat(document.getElementById('sell-buy-price').value) || 0;
    const sellP = parseFloat(document.getElementById('sell-price').value) || 0;

    if (buyP <= 0) {
      document.getElementById('modal-expense-detail').innerText = '취득가액을 입력해 주세요.';
      return;
    }

    let buyWon = buyP * 100000000;
    let buyTaxRate = (buyP <= 6) ? 0.01 : ((buyP <= 9) ? ((buyP * (2/3) - 3) / 100) : 0.03);
    let buyTax = buyWon * (buyTaxRate * 1.1);
    let buyBroker = buyWon * (buyP <= 9 ? 0.004 : 0.005) * 1.1;
    let sellWon = (sellP > 0 ? sellP : buyP) * 100000000;
    let sellBroker = sellWon * (sellP <= 9 ? 0.004 : 0.005) * 1.1;
    let legal = 1500000;
    let total = buyTax + buyBroker + sellBroker + legal;

    document.getElementById('modal-expense-detail').innerHTML = `
      1. 취득세 및 교육세: 약 ${Math.round(buyTax/10000).toLocaleString()}만 원<br>
      2. 매수 시 중개보수(VAT 포함): 약 ${Math.round(buyBroker/10000).toLocaleString()}만 원<br>
      3. 매도 시 중개보수(VAT 포함): 약 ${Math.round(sellBroker/10000).toLocaleString()}만 원<br>
      4. 법무사/등기/인지대 공제: 150만 원<br>
      --------------------------------------------------<br>
      ➔ <strong>총 필요경비 합계: 약 ${Math.round(total/10000).toLocaleString()}만 원</strong>
    `;
  }

  function updateModalFormula() {
    if (globalIncomeWon <= 0) {
      document.getElementById('modal-dsr-calc').innerText = '입력된 조건이 없습니다.';
      document.getElementById('modal-ltv-calc').innerText = '입력된 조건이 없습니다.';
      document.getElementById('modal-dti-calc').innerText = '입력된 조건이 없습니다.';
      return;
    }

    let borrowerTitle = (currentBorrower === 'both') ? '부부 합산' : (currentBorrower === 'jh' ? '종호' : '봄');

    document.getElementById('modal-dsr-calc').innerHTML = `
      • ${borrowerTitle} 연소득: ${Math.round(globalIncomeWon/10000).toLocaleString()}만 원<br>
      • 스트레스 상환액: 약 ${Math.round(globalAnnualStressRepay/10000).toLocaleString()}만 원 (금리 ${globalStressRate.toFixed(2)}%)<br>
      ➔ <strong>DSR 산출: (${Math.round(globalAnnualStressRepay/10000).toLocaleString()} ÷ ${Math.round(globalIncomeWon/10000).toLocaleString()}) × 100 = ${globalDSR.toFixed(2)}%</strong>
    `;

    document.getElementById('modal-ltv-calc').innerHTML = `
      • 실제 주담대: 약 ${Math.round(globalActualLoanWon/10000).toLocaleString()}만 원<br>
      • 매매평가액(90%): ${Math.round(globalEvalPriceWon/10000).toLocaleString()}만 원<br>
      ➔ <strong>LTV 산출: (${Math.round(globalActualLoanWon/10000).toLocaleString()} ÷ ${Math.round(globalEvalPriceWon/10000).toLocaleString()}) × 100 = ${globalLTV.toFixed(2)}%</strong>
    `;

    document.getElementById('modal-dti-calc').innerHTML = `
      • 연소득: ${Math.round(globalIncomeWon/10000).toLocaleString()}만 원<br>
      • 연간 상환부담 합계: 약 ${Math.round((globalAnnualRepay + globalCorpAnnualRepay)/10000).toLocaleString()}만 원<br>
      ➔ <strong>DTI 산출: (${Math.round((globalAnnualRepay + globalCorpAnnualRepay)/10000).toLocaleString()} ÷ ${Math.round(globalIncomeWon/10000).toLocaleString()}) × 100 = ${globalDTI.toFixed(2)}%</strong>
    `;
  }

  function calcSell() {
    const buyP = parseFloat(document.getElementById('sell-buy-price').value) || 0;
    const sellP = parseFloat(document.getElementById('sell-price').value) || 0;
    const holdY = parseInt(document.getElementById('sell-hold-years').value) || 0;
    const liveY = parseInt(document.getElementById('sell-live-years').value) || 0;

    let autoExpenseWon = 0;
    if (buyP > 0) {
      let buyWon = buyP * 100000000;
      let buyTaxRate = (buyP <= 6) ? 0.01 : ((buyP <= 9) ? ((buyP * (2/3) - 3) / 100) : 0.03);
      let buyTax = buyWon * (buyTaxRate * 1.1);
      let buyBroker = buyWon * (buyP <= 9 ? 0.004 : 0.005) * 1.1;
      let sellWon = (sellP > 0 ? sellP : buyP) * 100000000;
      let sellBroker = sellWon * (sellP <= 9 ? 0.004 : 0.005) * 1.1;
      autoExpenseWon = buyTax + buyBroker + sellBroker + 1500000;
    }
    let expenseMan = Math.round(autoExpenseWon / 10000);
    document.getElementById('auto-expense-val').innerText = `약 ${expenseMan.toLocaleString()}만 원 (자동반영)`;

    const totalProfitMan = (sellP - buyP) * 10000;

    let headerTitle = (currentPolicyYear === '2027') ? '📋 양도소득세 계산 흐름 (~2027년 현행 무제한)' : (currentPolicyYear === '2028' ? '📋 양도소득세 계산 흐름 (2028년 20억)' : '📋 양도소득세 계산 흐름 (2029년후 10억)');
    document.getElementById('tax-step-header-title').innerText = headerTitle;

    if (buyP <= 0 || sellP <= 0 || totalProfitMan <= 0) {
      document.getElementById('sell-net-profit').innerText = '0원';
      document.getElementById('flow-total-profit').innerText = '0원';
      document.getElementById('flow-taxfree-type').innerText = '-';
      document.getElementById('flow-taxable-profit').innerText = '0원';
      document.getElementById('flow-deduct-val').innerText = '0% (0원)';
      document.getElementById('flow-tax-base').innerText = '0원';
      document.getElementById('flow-final-tax').innerText = '0원';
      return;
    }

    document.getElementById('flow-total-profit').innerText = `+${(totalProfitMan/10000).toFixed(2)}억 원`;

    let isTaxFree = (holdY >= 2 && liveY >= 2);
    let tax = 0;
    let taxableProfitMan = 0;
    let deductRate = 0;
    let deductionMan = 0;
    let taxBaseMan = 0;

    if (isTaxFree) {
      if (sellP <= 12) {
        document.getElementById('flow-taxfree-type').innerText = '12억 이하 100% 비과세';
        document.getElementById('flow-taxable-profit').innerText = '0원 (비과세)';
        document.getElementById('flow-deduct-val').innerText = '해당 없음';
        document.getElementById('flow-tax-base').innerText = '0원';
        document.getElementById('flow-final-tax').innerText = '0원 (비과세)';
        
        let netProfit = totalProfitMan - expenseMan;
        document.getElementById('sell-net-profit').innerText = `+${(netProfit/10000).toFixed(2)}억 원`;
        return;
      } else {
        document.getElementById('flow-taxfree-type').innerText = '12억 초과 안분 과세';
        let taxableRatio = (sellP - 12) / sellP;
        taxableProfitMan = (totalProfitMan - expenseMan) * taxableRatio;
        document.getElementById('flow-taxable-profit').innerText = `${Math.round(taxableProfitMan).toLocaleString()}만 원`;

        let capMan = (currentPolicyYear === '2027') ? 999999999 : (currentPolicyYear === '2028' ? 200000 : 100000);
        
        if (currentPolicyYear === '2027') {
          let holdDeduct = Math.min(holdY * 4, 40);
          let liveDeduct = Math.min(liveY * 4, 40);
          deductRate = (holdY >= 3) ? (holdDeduct + liveDeduct) : 0;
        } else if (currentPolicyYear === '2028') {
          let holdDeduct = Math.min(holdY * 2, 20);
          let liveDeduct = Math.min(liveY * 6, 60);
          deductRate = (holdY >= 3) ? (holdDeduct + liveDeduct) : 0;
        } else {
          deductRate = (liveY >= 3) ? Math.min(liveY * 8, 80) : 0;
        }

        deductionMan = Math.min(taxableProfitMan * (deductRate / 100), capMan);
        document.getElementById('flow-deduct-val').innerText = `${deductRate}% (${Math.round(deductionMan).toLocaleString()}만)`;

        taxBaseMan = taxableProfitMan - deductionMan - 250;
        document.getElementById('flow-tax-base').innerText = `${Math.round(Math.max(taxBaseMan, 0)).toLocaleString()}만 원`;

        tax = calcIncomeTax(taxBaseMan) * 1.1;
      }
    } else {
      document.getElementById('flow-taxfree-type').innerText = '비과세 미충족 (일반과세)';
      taxableProfitMan = totalProfitMan - expenseMan;
      document.getElementById('flow-taxable-profit').innerText = `${Math.round(taxableProfitMan).toLocaleString()}만 원`;
      document.getElementById('flow-deduct-val').innerText = '0% (일반세율)';
      taxBaseMan = taxableProfitMan - 250;
      document.getElementById('flow-tax-base').innerText = `${Math.round(Math.max(taxBaseMan, 0)).toLocaleString()}만 원`;
      tax = calcIncomeTax(taxBaseMan) * 1.1;
    }

    tax = Math.max(tax, 0);
    document.getElementById('flow-final-tax').innerText = `약 ${Math.round(tax).toLocaleString()}만 원`;
    let finalNetMan = totalProfitMan - expenseMan - tax;
    document.getElementById('sell-net-profit').innerText = `+${(finalNetMan / 10000).toFixed(2)}억 원`;
  }

  function calcIncomeTax(b) {
    if (b <= 0) return 0;
    if (b <= 1400) return b * 0.06;
    if (b <= 5000) return b * 0.15 - 126;
    if (b <= 8800) return b * 0.24 - 576;
    if (b <= 15000) return b * 0.35 - 1544;
    if (b <= 30000) return b * 0.38 - 1994;
    return b * 0.40 - 6594;
  }

  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
  };

  let db = null;
  let useFirebase = false;

  try {
    if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
      firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      useFirebase = true;
    }
  } catch (e) {
    console.log("Firebase init fallback to LocalStorage");
  }

  function getStorageKey(type) {
    return `jh_bm_vault_${type || currentTab}`;
  }

  function getSavedData(type) {
    try { return JSON.parse(localStorage.getItem(getStorageKey(type))) || []; } catch(e) { return []; }
  }

  function renderSavedList() {
    const list = getSavedData(currentTab);
    const container = document.getElementById('saved-list');
    if (list.length === 0) {
      container.innerHTML = '<p style="font-size:0.8rem; color:var(--text-sub); text-align:center; padding:30px 0;">저장된 데이터가 없습니다.</p>';
      return;
    }

    container.innerHTML = list.map((item, idx) => `
      <div class="item-card">
        <div class="item-header">
          <span class="item-name">${item.aptName}</span>
          <span class="badge-user ${item.user === '종호' ? 'user-jh' : 'user-bm'}">${item.user}</span>
        </div>
        <div class="item-summary">${item.summary}</div>
        ${item.loanInfo ? `<div class="item-loan-info">💳 ${item.loanInfo}</div>` : ''}
        ${item.memo ? `<div style="font-size:0.76rem; background:#f8fafc; padding:6px; border-radius:6px; margin-top:4px; color:var(--text-main); white-space:pre-wrap; word-break:break-all;">${item.memo}</div>` : ''}
        <div class="item-actions">
          <span style="font-size:0.68rem; color:#9ca3af;">${item.date}</span>
          <div style="display:flex; gap:4px; align-items:center; flex-wrap:wrap;">
            ${currentTab === 'fav' && item.data && item.data.price ? `<button class="btn-card-calc" onclick="applyFavToBuy(${idx})">💰 대출계산</button>` : ''}
            ${item.data && item.data.url ? `<a href="${item.data.url}" target="_blank" class="btn-card-url">🔗 부동산</a>` : ''}
            ${item.data && item.data.mapUrl ? `<a href="${item.data.mapUrl}" target="_blank" class="btn-card-url" style="background:#fef08a;">🗺️ 지도</a>` : ''}
            <button class="btn-card-edit" onclick="loadItemToForm(${idx})">✏️ 수정</button>
            <button class="btn-del" onclick="deleteItem(${idx})">삭제</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  function applyFavToBuy(idx) {
    const list = getSavedData('fav');
    const item = list[idx];
    if (!item) return;

    switchTab('buy');
    document.getElementById('buy-price').value = item.data.price || '';
    setArea(item.data.area || 'nonreg');
    calcNaverEngine();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (useFirebase && db) {
    ['fav', 'buy', 'sell'].forEach(type => {
      db.collection('vault_' + type).orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        let remoteList = [];
        snapshot.forEach(doc => {
          remoteList.push(doc.data());
        });
        localStorage.setItem(getStorageKey(type), JSON.stringify(remoteList));
        if (currentTab === type) renderSavedList();
      });
    });
  }

  function cancelEdit(tab) {
    if (tab === 'fav') {
      document.getElementById('fav-edit-id').value = '';
      document.getElementById('fav-form-title').innerText = '🏢 관심 단지 등록 & 임장 메모';
      document.getElementById('btn-save-fav').innerText = '💾 관심 단지로 등록하여 저장';
      document.getElementById('btn-cancel-fav').style.display = 'none';
      document.getElementById('fav-apt-name').value = '';
      document.getElementById('fav-apt-url').value = '';
      document.getElementById('fav-map-url').value = '';
      document.getElementById('fav-price').value = '';
      document.getElementById('fav-school').value = '';
      document.getElementById('fav-infra').value = '';
      document.getElementById('fav-memo').value = '';
      document.getElementById('subway-list').innerHTML = '';
      addSubwayRow();
    } else if (tab === 'buy') {
      document.getElementById('buy-edit-id').value = '';
      document.getElementById('buy-form-title').innerText = '💰 매수 및 금융 시나리오 입력';
      document.getElementById('btn-save-buy').innerText = '💾 대출·매수 시나리오 저장';
      document.getElementById('btn-cancel-buy').style.display = 'none';
    } else if (tab === 'sell') {
      document.getElementById('sell-edit-id').value = '';
      document.getElementById('sell-form-title').innerText = '📈 매도 & 비과세 정밀 정산';
      document.getElementById('btn-save-sell').innerText = '💾 매도 시나리오 저장';
      document.getElementById('btn-cancel-sell').style.display = 'none';
    }
  }

  function loadItemToForm(idx) {
    const list = getSavedData(currentTab);
    const item = list[idx];
    if (!item) return;

    if (currentTab === 'fav') {
      document.getElementById('fav-edit-id').value = idx;
      document.getElementById('fav-apt-name').value = item.data.aptName || '';
      document.getElementById('fav-apt-url').value = item.data.url || '';
      document.getElementById('fav-map-url').value = item.data.mapUrl || '';
      document.getElementById('fav-price').value = item.data.price || '';
      document.getElementById('fav-area').value = item.data.area || 'nonreg';
      document.getElementById('fav-school').value = item.data.school || '';
      document.getElementById('fav-infra').value = item.data.infra || '';
      document.getElementById('fav-memo').value = item.data.memo || '';
      
      const subwayList = document.getElementById('subway-list');
      subwayList.innerHTML = '';
      if (item.data.subways && item.data.subways.length > 0) {
        item.data.subways.forEach(s => addSubwayRow(s.line, s.name, s.dist));
      } else {
        addSubwayRow();
      }
      
      document.getElementById('fav-form-title').innerText = `🏢 관심 단지 수정 중 (${item.aptName})`;
      document.getElementById('btn-save-fav').innerText = '💾 수정 내용 저장하기';
      document.getElementById('btn-cancel-fav').style.display = 'inline-block';
      setUser(item.user);
    } 
    else if (currentTab === 'buy') {
      document.getElementById('buy-edit-id').value = idx;
      document.getElementById('buy-price').value = item.data.price || '';
      document.getElementById('buy-desired-loan').value = item.data.desiredLoan || '';
      document.getElementById('cash-jh').value = item.data.cashJh || '';
      document.getElementById('cash-bm').value = item.data.cashBm || '';
      document.getElementById('income-jh').value = item.data.incomeJh || '';
      document.getElementById('income-bm').value = item.data.incomeBm || '';
      document.getElementById('loan-rate').value = item.data.loanRate || '';
      document.getElementById('loan-years').value = item.data.loanYears || 40;
      document.getElementById('repay-type').value = item.data.repayType || 'equal-total';
      document.getElementById('buy-memo').value = item.data.memo || '';
      
      document.getElementById('corp-loan-jh').value = item.data.corpJh || '';
      document.getElementById('corp-rate-jh').value = item.data.corpRateJh || '2.0';
      document.getElementById('corp-years-jh').value = item.data.corpYearsJh || '10';
      document.getElementById('corp-loan-bm').value = item.data.corpBm || '';
      document.getElementById('corp-rate-bm').value = item.data.corpRateBm || '2.0';
      document.getElementById('corp-years-bm').value = item.data.corpYearsBm || '10';

      setArea(item.data.area || 'nonreg');
      setBorrower(item.data.borrower || 'both');
      setUser(item.user);

      document.getElementById('buy-form-title').innerText = `💰 매수 시나리오 수정 중 (${item.aptName})`;
      document.getElementById('btn-save-buy').innerText = '💾 수정 내용 저장하기';
      document.getElementById('btn-cancel-buy').style.display = 'inline-block';
      calcNaverEngine();
    } 
    else if (currentTab === 'sell') {
      document.getElementById('sell-edit-id').value = idx;
      document.getElementById('sell-buy-price').value = item.data.buyP || '';
      document.getElementById('sell-price').value = item.data.sellP || '';
      document.getElementById('sell-hold-years').value = item.data.holdY || '';
      document.getElementById('sell-live-years').value = item.data.liveY || '';
      document.getElementById('sell-memo').value = item.data.memo || '';

      setPolicyYear(item.data.policyYear || '2027');
      setUser(item.user);

      document.getElementById('sell-form-title').innerText = `📈 매도 시나리오 수정 중 (${item.aptName})`;
      document.getElementById('btn-save-sell').innerText = '💾 수정 내용 저장하기';
      document.getElementById('btn-cancel-sell').style.display = 'inline-block';
      calcSell();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function saveFavScenario() {
    const editIdx = document.getElementById('fav-edit-id').value;
    const aptName = document.getElementById('fav-apt-name').value.trim() || '관심 단지';
    const aptUrl = document.getElementById('fav-apt-url').value.trim();
    const mapUrl = document.getElementById('fav-map-url').value.trim();
    const price = document.getElementById('fav-price').value || '0';
    const area = document.getElementById('fav-area').value;
    const school = document.getElementById('fav-school').value.trim();
    const infra = document.getElementById('fav-infra').value.trim();
    const memo = document.getElementById('fav-memo').value.trim();

    const subways = [];
    document.querySelectorAll('.subway-row').forEach(row => {
      const line = row.querySelector('.subway-line').value.trim();
      const name = row.querySelector('.subway-name').value.trim();
      const dist = row.querySelector('.subway-dist').value.trim();
      if (name) subways.push({ line, name, dist });
    });

    let subwaySummary = subways.map(s => `${s.line ? s.line+' ' : ''}${s.name}역(${s.dist ? s.dist+'m' : ''})`).join(', ');
    let combinedMemo = (school ? `[학군] ${school}\n` : '') + (infra ? `[인프라] ${infra}\n` : '') + (memo ? `[총평] ${memo}` : '');

    const newItem = {
      id: 'item_' + Date.now(),
      createdAt: Date.now(),
      user: currentUser,
      aptName: aptName,
      summary: `예상가 ${price}억 [${area==='nonreg'?'비규제':'규제'}] ${subwaySummary ? '| '+subwaySummary : ''}`,
      loanInfo: `학군: ${school || '-'} | 인프라: ${infra || '-'}`,
      memo: combinedMemo,
      date: new Date().toLocaleDateString('ko-KR', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }),
      data: { aptName, url: aptUrl, mapUrl, price, area, school, infra, memo, subways }
    };

    const list = getSavedData('fav');
    if (editIdx !== '') {
      newItem.id = list[parseInt(editIdx)].id || newItem.id;
      list[parseInt(editIdx)] = newItem;
      document.getElementById('fav-edit-id').value = '';
      document.getElementById('fav-form-title').innerText = '🏢 관심 단지 등록 & 임장 메모';
      document.getElementById('btn-save-fav').innerText = '💾 관심 단지로 등록하여 저장';
      document.getElementById('btn-cancel-fav').style.display = 'none';
    } else {
      list.unshift(newItem);
    }

    localStorage.setItem(getStorageKey('fav'), JSON.stringify(list));
    if (useFirebase && db) {
      db.collection('vault_fav').doc(newItem.id).set(newItem);
    }

    renderSavedList();
    alert(`[${currentUser}]님의 관심 단지가 저장되었습니다!`);
  }

  function saveBuyScenario() {
    const editIdx = document.getElementById('buy-edit-id').value;
    const price = document.getElementById('buy-price').value || '0';
    const desiredLoan = document.getElementById('buy-desired-loan').value || '';
    const cashJh = document.getElementById('cash-jh').value || '';
    const cashBm = document.getElementById('cash-bm').value || '';
    const incomeJh = document.getElementById('income-jh').value || '';
    const incomeBm = document.getElementById('income-bm').value || '';
    const loanRate = document.getElementById('loan-rate').value || '';
    const loanYears = document.getElementById('loan-years').value;
    const repayType = document.getElementById('repay-type').value;
    const memo = document.getElementById('buy-memo').value.trim();

    const corpJh = document.getElementById('corp-loan-jh').value || '';
    const corpRateJh = document.getElementById('corp-rate-jh').value || '';
    const corpYearsJh = document.getElementById('corp-years-jh').value || '';
    const corpBm = document.getElementById('corp-loan-bm').value || '';
    const corpRateBm = document.getElementById('corp-rate-bm').value || '';
    const corpYearsBm = document.getElementById('corp-years-bm').value || '';

    const limit = document.getElementById('res-final-limit').innerText;
    const need = document.getElementById('res-need-cash').innerText;
    const area = (currentArea === 'nonreg') ? '비규제' : '규제';

    const newItem = {
      id: 'item_' + Date.now(),
      createdAt: Date.now(),
      user: currentUser,
      aptName: `집값 ${price}억 매수 자금 플랜`,
      summary: `[${area}] 가용현금 ${((parseFloat(cashJh)||0)+(parseFloat(cashBm)||0)).toFixed(1)}억 | 주담대 ${limit}`,
      loanInfo: need,
      memo: memo ? `[메모] ${memo}` : '',
      date: new Date().toLocaleDateString('ko-KR', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }),
      data: { price, desiredLoan, cashJh, cashBm, incomeJh, incomeBm, loanRate, loanYears, repayType, memo, area: currentArea, borrower: currentBorrower, corpJh, corpRateJh, corpYearsJh, corpBm, corpRateBm, corpYearsBm }
    };

    const list = getSavedData('buy');
    if (editIdx !== '') {
      newItem.id = list[parseInt(editIdx)].id || newItem.id;
      list[parseInt(editIdx)] = newItem;
      document.getElementById('buy-edit-id').value = '';
      document.getElementById('buy-form-title').innerText = '💰 매수 및 금융 시나리오 입력';
      document.getElementById('btn-save-buy').innerText = '💾 대출·매수 시나리오 저장';
      document.getElementById('btn-cancel-buy').style.display = 'none';
    } else {
      list.unshift(newItem);
    }

    localStorage.setItem(getStorageKey('buy'), JSON.stringify(list));
    if (useFirebase && db) {
      db.collection('vault_buy').doc(newItem.id).set(newItem);
    }

    renderSavedList();
    alert(`[${currentUser}]님의 매수 시나리오가 저장되었습니다!`);
  }

  function saveSellScenario() {
    const editIdx = document.getElementById('sell-edit-id').value;
    const buyP = document.getElementById('sell-buy-price').value || '0';
    const sellP = document.getElementById('sell-price').value || '0';
    const holdY = document.getElementById('sell-hold-years').value || '0';
    const liveY = document.getElementById('sell-live-years').value || '0';
    const memo = document.getElementById('sell-memo').value.trim();
    const net = document.getElementById('sell-net-profit').innerText;

    const newItem = {
      id: 'item_' + Date.now(),
      createdAt: Date.now(),
      user: currentUser,
      aptName: `${buyP}억 매수 ➔ ${sellP}억 매도 (${liveY}년 거주 / ${currentPolicyYear}룰)`,
      summary: `세후 최종 실수령 순수익: ${net}`,
      loanInfo: `비과세 및 정책 공제 적용`,
      memo: memo ? `[메모] ${memo}` : '',
      date: new Date().toLocaleDateString('ko-KR', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }),
      data: { buyP, sellP, holdY, liveY, memo, policyYear: currentPolicyYear }
    };

    const list = getSavedData('sell');
    if (editIdx !== '') {
      newItem.id = list[parseInt(editIdx)].id || newItem.id;
      list[parseInt(editIdx)] = newItem;
      document.getElementById('sell-edit-id').value = '';
      document.getElementById('sell-form-title').innerText = '📈 매도 & 비과세 정밀 정산';
      document.getElementById('btn-save-sell').innerText = '💾 매도 시나리오 저장';
      document.getElementById('btn-cancel-sell').style.display = 'none';
    } else {
      list.unshift(newItem);
    }

    localStorage.setItem(getStorageKey('sell'), JSON.stringify(list));
    if (useFirebase && db) {
      db.collection('vault_sell').doc(newItem.id).set(newItem);
    }

    renderSavedList();
    alert(`[${currentUser}]님의 매도 시나리오가 저장되었습니다!`);
  }

  function deleteItem(idx) {
    if (!confirm('해당 항목을 삭제하시겠습니까?')) return;
    const list = getSavedData(currentTab);
    const item = list[idx];
    list.splice(idx, 1);
    localStorage.setItem(getStorageKey(currentTab), JSON.stringify(list));
    
    if (useFirebase && db && item && item.id) {
      db.collection('vault_' + currentTab).doc(item.id).delete();
    }
    renderSavedList();
  }

  function clearCurrentTabData() {
    if (!confirm('현재 탭의 모든 보관함 데이터를 초기화하시겠습니까?')) return;
    const list = getSavedData(currentTab);
    localStorage.removeItem(getStorageKey(currentTab));
    
    if (useFirebase && db) {
      list.forEach(item => {
        if (item.id) db.collection('vault_' + currentTab).doc(item.id).delete();
      });
    }
    renderSavedList();
  }

  addSubwayRow();
  renderSavedList();
</script>
</body>
</html>
