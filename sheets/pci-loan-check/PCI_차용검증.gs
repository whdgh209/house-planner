/**
 * PCI_차용검증 시트 생성기
 * ---------------------------------------------------------------
 * 개인 간 차용(금전소비대차)의 만기 상환능력을 국세청 PCI 분석 관점에서
 * 사전 점검하는 시트를 현재 스프레드시트에 탭으로 추가한다.
 *
 * 사용법
 *   1) 「부동산」 스프레드시트 열기
 *   2) 확장 프로그램 > Apps Script
 *   3) 이 파일 내용 전체를 붙여넣고 저장
 *   4) 함수 buildPciSheet 선택 후 실행 (최초 1회 권한 승인)
 *
 * 같은 이름의 시트가 이미 있으면 삭제하지 않고 백업 이름으로 보존한다.
 *
 * 주의: 세율·요율·법정 기준값은 모두 입력 셀(B14:B20, B47:B49)로 분리되어
 *       있다. 고시 요율이 바뀌면 수식이 아니라 그 셀만 고치면 된다.
 */

var SHEET_NAME = 'PCI_차용검증';

var FMT = {
  WON: '#,##0"원"',
  WON_PLAIN: '#,##0',
  PCT1: '0.0%',
  PCT2: '0.00%',
  MONTH: '#,##0"개월"',
  TIMES: '0.00"배"',
  DATE: 'yyyy-mm-dd',
  YEAR: '0"년"'
};

var COLOR = {
  TITLE_BG: '#1f3864',
  TITLE_FG: '#ffffff',
  HEAD_BG: '#d9e2f3',
  INPUT_BG: '#fff2cc',
  CALC_BG: '#f2f2f2',
  OUT_BG: '#e2efda',
  RISK_BG: '#fce4e4',
  NOTE_FG: '#7f7f7f',
  BORDER: '#bfbfbf'
};

function buildPciSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var old = ss.getSheetByName(SHEET_NAME);
  if (old) {
    var stamp = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd_HHmmss');
    old.setName(SHEET_NAME + '_백업_' + stamp);
  }
  var sh = ss.insertSheet(SHEET_NAME, ss.getNumSheets());

  writeRows_(sh);
  writeYearTable_(sh);
  writeSensitivity_(sh);
  writeChecklist_(sh);
  applyLayout_(sh);
  applyValidation_(sh);
  applyConditionalFormat_(sh);

  ss.setActiveSheet(sh);
  SpreadsheetApp.getUi().alert(
    SHEET_NAME + ' 시트를 생성했습니다.\n\n' +
    '노란색 셀(입력값)만 본인 숫자로 바꾸면 나머지는 자동 계산됩니다.\n' +
    '세율·요율은 B14:B20, 법정 기준값은 B47:B49에서 수정하세요.');
}

/** [라벨, 값 또는 수식, 비고, 스타일, 숫자서식] */
function rowDefs_() {
  return [
    /* 1 */  ['개인 간 차용 및 상환능력 검증 (PCI 세무 리스크 사전 점검)', '', '', 'title', null],
    /* 2 */  ['작성 기준일', '=TODAY()', '', 'calc', FMT.DATE],
    /* 3 */  ['차입자 / 대여자', '봄 / 종호', '차입자 = 돈을 빌리는 사람', 'input', null],
    /* 4 */  ['', '', '', 'blank', null],

    /* 5 */  ['■ 1. 소득 정보  [입력]', '', '', 'head', null],
    /* 6 */  ['기본 연봉 (세전)', 60000000, '근로계약서 기준', 'input', FMT.WON],
    /* 7 */  ['연간 예상 성과상여금 (세전)', 10000000, '변동 재원 — 판정에서 별도 취급', 'input', FMT.WON],
    /* 8 */  ['비과세 식대 (월)', 200000, '월 20만원 한도', 'input', FMT.WON],
    /* 9 */  ['연간 급여 상승률', 0.03, '연도별 시뮬레이션에 반영', 'input', FMT.PCT1],
    /* 10 */ ['성과급 반영률 (시나리오)', 1, '보수적 점검은 0.5 또는 0', 'input', FMT.PCT1],
    /* 11 */ ['식대가 B6에 포함되어 있는가?', '포함', '포함 / 미포함 중 선택', 'input', null],
    /* 12 */ ['', '', '', 'blank', null],

    /* 13 */ ['■ 2. 세·4대보험 요율  [입력 · 매년 고시값 확인]', '', '', 'head', null],
    /* 14 */ ['국민연금 요율 (근로자)', 0.045, '', 'input', FMT.PCT2],
    /* 15 */ ['국민연금 기준소득월액 상한', 6370000, '매년 7월 변동 — 반드시 확인', 'input', FMT.WON],
    /* 16 */ ['건강보험 요율 (근로자)', 0.03545, '', 'input', FMT.PCT2],
    /* 17 */ ['장기요양보험 요율 (건보료 대비)', 0.1295, '건강보험료 × 이 요율', 'input', FMT.PCT2],
    /* 18 */ ['고용보험 요율 (근로자)', 0.009, '', 'input', FMT.PCT2],
    /* 19 */ ['기본급 근로소득세 실효세율 (지방세 포함)', 0.06, '원천징수영수증 결정세액 ÷ 총급여로 역산 권장', 'input', FMT.PCT1],
    /* 20 */ ['상여금 적용 세율 (지방세 포함)', 0.385, '과표 35% 구간 + 지방소득세 3.5%', 'input', FMT.PCT1],
    /* 21 */ ['', '', '', 'blank', null],

    /* 22 */ ['■ 3. 금융 부채 상환 정보  [입력]', '', '', 'head', null],
    /* 23 */ ['주택담보대출 월 상환액', 1200000, '원리금균등 기준', 'input', FMT.WON],
    /* 24 */ ['  └ 잔여 상환 개월수', 300, '만기까지 남은 개월', 'input', FMT.MONTH],
    /* 25 */ ['기타 대출 A 월 상환액 (회사 대출)', 500000, '원금+이자', 'input', FMT.WON],
    /* 26 */ ['  └ 잔여 상환 개월수', 60, '', 'input', FMT.MONTH],
    /* 27 */ ['기타 대출 B 월 상환액 (신협/신용)', 300000, '원금+이자', 'input', FMT.WON],
    /* 28 */ ['  └ 잔여 상환 개월수', 36, '', 'input', FMT.MONTH],
    /* 29 */ ['월 부채상환 합계 (현재)', '=B23+B25+B27', '', 'calc', FMT.WON],
    /* 30 */ ['', '', '', 'blank', null],

    /* 31 */ ['■ 4. 차입자 필수 생활비  [입력]', '', '', 'head', null],
    /* 32 */ ['월 고정비 (통신·보험·교통 등)', 600000, '차입자 명의 카드/계좌 기준', 'input', FMT.WON],
    /* 33 */ ['월 변동비 (식대·카페·개인 소비)', 900000, '최근 3개월 카드 명세 평균 권장', 'input', FMT.WON],
    /* 34 */ ['월 최소 개인 소비액', '=B32+B33', '', 'calc', FMT.WON],
    /* 35 */ ['연간 소비 증가율', 0.02, '물가 반영', 'input', FMT.PCT1],
    /* 36 */ ['', '', '', 'blank', null],

    /* 37 */ ['■ 5. 개인 간 차용 조건  [입력]', '', '', 'head', null],
    /* 38 */ ['차용 원금', 200000000, '', 'input', FMT.WON],
    /* 39 */ ['차용 개시일', '2026-01-01', '실제 계좌이체일', 'input', FMT.DATE],
    /* 40 */ ['차용 기간 (년)', 5, '최대 10년까지 시뮬레이션', 'input', FMT.YEAR],
    /* 41 */ ['약정 이자율 (연)', 0, '무이자면 0%', 'input', FMT.PCT1],
    /* 42 */ ['상환 방식', '만기 일시 상환', '만기 일시 상환 / 원금 분할 상환', 'input', null],
    /* 43 */ ['연간 원금 분할상환액', 0, '만기 일시면 0 — 소명력은 분할이 훨씬 강함', 'input', FMT.WON],
    /* 44 */ ['만기일', '=IF(ISNUMBER(B39),EDATE(B39,B40*12),"")', '', 'calc', FMT.DATE],
    /* 45 */ ['', '', '', 'blank', null],

    /* 46 */ ['■ 6. 세법 기준값  [입력 · 상증세법]', '', '', 'head', null],
    /* 47 */ ['법정 적정 이자율', 0.046, '상증세법 시행령 §31조의4', 'input', FMT.PCT1],
    /* 48 */ ['증여이익 과세 기준금액 (연)', 10000000, '이 금액 이상이면 차액 전액 과세', 'input', FMT.WON],
    /* 49 */ ['이자소득 원천징수율 (비영업대금의 이익)', 0.275, '소득세 25% + 지방소득세 2.5%', 'input', FMT.PCT1],
    /* 50 */ ['', '', '', 'blank', null],

    /* 51 */ ['■ 7. 중간 계산  [자동]', '', '', 'head', null],
    /* 52 */ ['과세대상 월 급여', '=IF($B$11="포함",($B$6-$B$8*12)/12,$B$6/12)', '식대 비과세분 제외', 'calc', FMT.WON],
    /* 53 */ ['월 국민연금', '=ROUND(MIN($B$52,$B$15)*$B$14,0)', '기준소득월액 상한 적용', 'calc', FMT.WON],
    /* 54 */ ['월 건강보험', '=ROUND($B$52*$B$16,0)', '', 'calc', FMT.WON],
    /* 55 */ ['월 장기요양보험', '=ROUND($B$54*$B$17,0)', '', 'calc', FMT.WON],
    /* 56 */ ['월 고용보험', '=ROUND($B$52*$B$18,0)', '', 'calc', FMT.WON],
    /* 57 */ ['월 4대보험 합계', '=SUM($B$53:$B$56)', '', 'calc', FMT.WON],
    /* 58 */ ['월 근로소득세 + 지방소득세', '=ROUND($B$52*$B$19,0)', '', 'calc', FMT.WON],
    /* 59 */ ['월 세후 실수령액 (식대 포함)', '=$B$52-$B$57-$B$58+$B$8', '', 'calc', FMT.WON],
    /* 60 */ ['연간 기본급 세후 실수령액', '=$B$59*12', '', 'calc', FMT.WON],
    /* 61 */ ['성과급 세후 실수령액 (연)', '=ROUND($B$7*$B$10*(1-$B$20),0)', '시나리오 반영률 적용', 'calc', FMT.WON],
    /* 62 */ ['연간 세후 총소득', '=$B$60+$B$61', '', 'calc', FMT.WON],
    /* 63 */ ['연간 기존 부채 상환액', '=$B$29*12', '', 'calc', FMT.WON],
    /* 64 */ ['연간 차용 이자 (총액, 세전)', '=ROUND($B$38*$B$41,0)', '', 'calc', FMT.WON],
    /* 65 */ ['  └ 원천징수세액 (차입자가 세무서 납부)', '=ROUND($B$64*$B$49,0)', '지급월 익월 10일까지', 'calc', FMT.WON],
    /* 66 */ ['  └ 대여자 실수령 이자', '=$B$64-$B$65', '', 'calc', FMT.WON],
    /* 67 */ ['연간 필수 소비 지출', '=$B$34*12', '', 'calc', FMT.WON],
    /* 68 */ ['연간 순 가처분 잉여현금', '=$B$62-($B$63+$B$64+$B$67)', '1년차 기준', 'calc', FMT.WON],
    /* 69 */ ['월 기본급 기준 수지 (성과급 제외)', '=$B$59-$B$29-$B$34-$B$64/12', '음수면 구조적 적자', 'calc', FMT.WON],
    /* 70 */ ['차용기간 누적 저축 가능액 (단순 추정)', '=$B$68*$B$40', '성장률 미반영 — 참고용', 'calc', FMT.WON],
    /* 71 */ ['', '', '', 'blank', null]
  ];
}

function writeRows_(sh) {
  var defs = rowDefs_();
  for (var i = 0; i < defs.length; i++) {
    var r = i + 1;
    var d = defs[i];
    if (d[3] === 'blank') continue;

    sh.getRange(r, 1).setValue(d[0]);
    if (d[1] !== '') {
      var cell = sh.getRange(r, 2);
      if (typeof d[1] === 'string' && d[1].charAt(0) === '=') {
        cell.setFormula(d[1]);
      } else if (d[4] === FMT.DATE && typeof d[1] === 'string') {
        cell.setValue(new Date(d[1] + 'T00:00:00+09:00'));
      } else {
        cell.setValue(d[1]);
      }
      if (d[4]) cell.setNumberFormat(d[4]);
    }
    if (d[2] !== '') sh.getRange(r, 3).setValue(d[2]);

    styleRow_(sh, r, d[3]);
  }
}

function styleRow_(sh, r, style) {
  if (style === 'title') {
    sh.getRange(r, 1, 1, 9).merge()
      .setBackground(COLOR.TITLE_BG).setFontColor(COLOR.TITLE_FG)
      .setFontSize(13).setFontWeight('bold')
      .setVerticalAlignment('middle').setHorizontalAlignment('center');
    sh.setRowHeight(r, 34);
  } else if (style === 'head') {
    sh.getRange(r, 1, 1, 3).setBackground(COLOR.HEAD_BG).setFontWeight('bold');
  } else if (style === 'input') {
    sh.getRange(r, 2).setBackground(COLOR.INPUT_BG).setFontWeight('bold');
  } else if (style === 'calc') {
    sh.getRange(r, 2).setBackground(COLOR.CALC_BG).setFontColor('#333333');
  } else if (style === 'out') {
    sh.getRange(r, 2).setBackground(COLOR.OUT_BG).setFontWeight('bold');
  } else if (style === 'risk') {
    sh.getRange(r, 2).setBackground(COLOR.RISK_BG).setFontWeight('bold');
  }
  sh.getRange(r, 3).setFontColor(COLOR.NOTE_FG).setFontSize(9);
}

/** 72~83행: 연도별 현금흐름 시뮬레이션 (A~I열) */
function writeYearTable_(sh) {
  sh.getRange('A72').setValue('■ 8. 연도별 현금흐름 시뮬레이션  [자동]');
  sh.getRange('A72:I72').setBackground(COLOR.HEAD_BG).setFontWeight('bold');

  var header = ['연차', '세후 총소득', '기존 부채상환', '필수 생활비',
                '차용 이자', '원금 분할상환', '연간 잉여', '누적 잉여', '원금 대비 누적'];
  sh.getRange(73, 1, 1, 9).setValues([header])
    .setBackground('#f2f2f2').setFontWeight('bold')
    .setHorizontalAlignment('center').setWrap(true);

  for (var n = 1; n <= 10; n++) {
    var r = 73 + n;
    var G = '$A' + r + '>$B$40';
    sh.getRange(r, 1).setValue(n).setNumberFormat(FMT.YEAR)
      .setHorizontalAlignment('center').setFontWeight('bold');

    sh.getRange(r, 2).setFormula(
      '=IF(' + G + ',"",ROUND($B$62*(1+$B$9)^($A' + r + '-1),0))');

    // 잔여 개월수가 남아 있는 대출만 해당 연도에 상환액으로 잡는다
    sh.getRange(r, 3).setFormula(
      '=IF(' + G + ',"",' +
      '$B$23*MIN(12,MAX(0,$B$24-($A' + r + '-1)*12))+' +
      '$B$25*MIN(12,MAX(0,$B$26-($A' + r + '-1)*12))+' +
      '$B$27*MIN(12,MAX(0,$B$28-($A' + r + '-1)*12)))');

    sh.getRange(r, 4).setFormula(
      '=IF(' + G + ',"",ROUND($B$67*(1+$B$35)^($A' + r + '-1),0))');

    // 이자는 그 해 초 잔액 기준
    sh.getRange(r, 5).setFormula(
      '=IF(' + G + ',"",ROUND(MAX(0,$B$38-$B$43*($A' + r + '-1))*$B$41,0))');

    sh.getRange(r, 6).setFormula(
      '=IF(' + G + ',"",MIN($B$43,MAX(0,$B$38-$B$43*($A' + r + '-1))))');

    sh.getRange(r, 7).setFormula(
      '=IF(' + G + ',"",B' + r + '-C' + r + '-D' + r + '-E' + r + '-F' + r + ')');

    sh.getRange(r, 8).setFormula(n === 1
      ? '=IF(' + G + ',"",G' + r + ')'
      : '=IF(' + G + ',"",N(H' + (r - 1) + ')+G' + r + ')');

    sh.getRange(r, 9).setFormula(
      '=IF(' + G + ',"",IFERROR(H' + r + '/$B$38,""))');
  }

  sh.getRange(74, 2, 10, 7).setNumberFormat(FMT.WON_PLAIN);
  sh.getRange(74, 9, 10, 1).setNumberFormat('0.0%');
  sh.getRange(73, 1, 11, 9).setBorder(true, true, true, true, true, true,
    COLOR.BORDER, SpreadsheetApp.BorderStyle.SOLID);
}

/** 85~108행: 판정 · 세무 리스크 · 민감도 */
function writeSensitivity_(sh) {
  var rows = [
    /* 85 */ ['■ 9. 상환능력 판정  [핵심 산출물]', '', '', 'head', null],
    /* 86 */ ['만기 시 일시상환 대상 잔여 원금', '=MAX(0,$B$38-SUM($F$74:$F$83))', '분할상환분 차감 후', 'out', FMT.WON],
    /* 87 */ ['차용기간 누적 저축 가능액', '=IF($B$40>10,"⚠ 기간 10년 초과 — 시뮬레이션 행 추가 필요",INDEX($H$74:$H$83,$B$40))', '연도별 표 기준', 'out', FMT.WON],
    /* 88 */ ['지표1. 만기 상환 버퍼율', '=IF(NOT(ISNUMBER($B$87)),"-",IF($B$86=0,"원금 전액 분할상환 완료",$B$87/$B$86))', '100% = 딱 맞음, 120% 이상 권장', 'out', '0.0%'],
    /* 89 */ ['지표2. 최종 판정',
              '=IF(NOT(ISNUMBER($B$87)),"입력 확인 필요",' +
              'IFS(N($B$86)<=0,"원금 전액 분할상환 완료",' +
              'AND($B$87>=$B$86*1.2,$B$106>=$B$86),"✅ 상환 여유 충분",' +
              'AND($B$87>=$B$86*1.2,$B$106<$B$86),"⚠ 금액은 충분 — 성과급 의존 주의",' +
              '$B$87>=$B$86,"⚠ 상환 가능 (주의 요망)",' +
              'TRUE,"❌ 상환 능력 부족 (증여 추정 위험)"))',
              '성과급 0% 시나리오(B106)까지 같이 보고 내린 판정', 'out', null],
    /* 90 */ ['소득 대비 차입 배수', '=IFERROR($B$38/$B$62,"")', '연 세후소득의 몇 배를 빌리는가', 'calc', FMT.TIMES],
    /* 91 */ ['총부채 상환비율 (생활 DSR)', '=IFERROR(($B$63+$B$64)/$B$62,"")', '세후소득 대비 부채상환 비중', 'calc', FMT.PCT1],
    /* 92 */ ['월 기본급 기준 수지', '=$B$69', '성과급 없이도 흑자여야 안전', 'calc', FMT.WON],
    /* 93 */ ['', '', '', 'blank', null],

    /* 94 */ ['■ 10. 세무 리스크 진단  [자동]', '', '', 'head', null],
    /* 95 */ ['법정 적정이자 (연)', '=ROUND($B$38*$B$47,0)', '원금 × 4.6%', 'calc', FMT.WON],
    /* 96 */ ['실제 약정이자 (연)', '=$B$64', '', 'calc', FMT.WON],
    /* 97 */ ['무상대여 이익 (연)', '=MAX(0,$B$95-$B$96)', '적정이자 − 약정이자', 'risk', FMT.WON],
    /* 98 */ ['증여세 과세대상 여부',
              '=IF($B$97>=$B$48,"❌ 과세 대상 — 이익 전액이 증여재산가액","✅ 비과세 (연 " & TEXT($B$48,"#,##0") & "원 미만)")',
              '기준 초과 시 초과분이 아닌 전액 과세', 'risk', null],
    /* 99 */ ['무이자 시 안전 원금 한도', '=ROUND($B$48/$B$47,0)', '1,000만원 ÷ 4.6%', 'calc', FMT.WON],
    /* 100 */ ['한도 대비 여유액', '=$B$99-$B$38', '음수면 무이자 구조 불가', 'risk', FMT.WON],
    /* 101 */ ['이자 원천징수 신고 의무',
               '=IF($B$41>0,"있음 — 지급월의 다음 달 10일까지 원천세 신고·납부","없음 (무이자)")',
               '신고 이력이 곧 차용 사실의 증거', 'calc', null],
    /* 102 */ ['지표3. 종합 코멘트',
               '=TEXTJOIN(CHAR(10),TRUE,' +
               'IF($B$97>=$B$48,"⚠ 무상대여 이익 "&TEXT($B$97,"#,##0")&"원이 연 "&TEXT($B$48,"#,##0")&"원 기준 이상 → 초과분이 아닌 이익 전액이 증여재산가액으로 과세될 수 있음.",""),' +
               'IF(AND($B$41=0,$B$38>$B$99),"⚠ 무이자 차용 원금이 안전 한도 "&TEXT($B$99,"#,##0")&"원을 초과. 원금을 낮추거나 최소 이자를 약정할 것.",""),' +
               'IF($B$92<0,"⚠ 성과급을 제외한 기본급만으로는 월 "&TEXT(ABS($B$92),"#,##0")&"원 적자 → 상환 재원을 변동 성과급에 의존. 소명 시 가장 취약한 지점.",""),' +
               'IF($B$41>0,"ℹ 이자 지급 시 27.5%를 원천징수해 다음 달 10일까지 납부해야 차용 사실이 인정됨. 이자 전액을 대여자에게 그냥 보내면 안 됨.",""),' +
               'IF($B$42="만기 일시 상환","ℹ 만기 일시·무이자 구조는 증여 추정이 가장 강한 형태. 매년 일부라도 원금을 이체하면 소명력이 크게 올라감.",""),' +
               'IF($B$90>5,"⚠ 차용 원금이 연 세후소득의 "&TEXT($B$90,"0.0")&"배 → 통상 소명 강도가 높아지는 구간.",""),' +
               'IF($B$91>0.4,"⚠ 생활 DSR "&TEXT($B$91,"0.0%")&" → 기존 부채만으로 상환 여력이 크게 잠식됨.",""))',
               '', 'risk', null],
    /* 103 */ ['', '', '', 'blank', null],
    /* 104 */ ['■ 11. 성과급 민감도 분석  [자동]', '', '', 'head', null]
  ];

  for (var i = 0; i < rows.length; i++) {
    var r = 85 + i;
    var d = rows[i];
    if (d[3] === 'blank') continue;
    sh.getRange(r, 1).setValue(d[0]);
    if (d[1] !== '') {
      var c = sh.getRange(r, 2);
      c.setFormula(d[1]);
      if (d[4]) c.setNumberFormat(d[4]);
    }
    if (d[2] !== '') sh.getRange(r, 3).setValue(d[2]);
    styleRow_(sh, r, d[3]);
  }

  sh.getRange('A104:D104').setBackground(COLOR.HEAD_BG).setFontWeight('bold');
  sh.getRange(102, 2).setWrap(true).setVerticalAlignment('top');
  sh.setRowHeight(102, 120);

  // 민감도 표 105~108
  sh.getRange(105, 1, 1, 4)
    .setValues([['성과급 반영률', '누적 잉여액', '버퍼율', '판정']])
    .setBackground('#f2f2f2').setFontWeight('bold').setHorizontalAlignment('center');

  var scenarios = [0, 0.5, 1];
  for (var s = 0; s < scenarios.length; s++) {
    var r2 = 106 + s;
    sh.getRange(r2, 1).setValue(scenarios[s]).setNumberFormat('0%')
      .setHorizontalAlignment('center').setFontWeight('bold');

    // 성과급은 누적 잉여에 선형으로 작용하므로 연금합계계수로 환산해 차감한다
    sh.getRange(r2, 2).setFormula(
      '=IF(NOT(ISNUMBER($B$87)),"",ROUND($B$87-($B$10-$A' + r2 + ')*ROUND($B$7*(1-$B$20),0)*' +
      'IF($B$9=0,$B$40,((1+$B$9)^$B$40-1)/$B$9),0))');

    sh.getRange(r2, 3).setFormula(
      '=IF(OR(NOT(ISNUMBER(B' + r2 + ')),$B$86=0),"-",B' + r2 + '/$B$86)');

    sh.getRange(r2, 4).setFormula(
      '=IF(NOT(ISNUMBER(B' + r2 + ')),"",' +
      'IFS(B' + r2 + '>=$B$86*1.2,"✅ 여유 충분",B' + r2 + '>=$B$86,"⚠ 가능(주의)",TRUE,"❌ 부족"))');
  }
  sh.getRange(106, 2, 3, 1).setNumberFormat(FMT.WON_PLAIN);
  sh.getRange(106, 3, 3, 1).setNumberFormat('0.0%');
  sh.getRange(105, 1, 4, 4).setBorder(true, true, true, true, true, true,
    COLOR.BORDER, SpreadsheetApp.BorderStyle.SOLID);
}

/** 110~121행: 소명 실행 체크리스트 + 면책 */
function writeChecklist_(sh) {
  sh.getRange('A110').setValue('■ 12. 소명 실행 체크리스트  [수동 체크]');
  sh.getRange('A110:C110').setBackground(COLOR.HEAD_BG).setFontWeight('bold');

  var items = [
    ['차용증(금전소비대차계약서) 작성', '원금·이자율·만기·상환방법·지연이자 명시'],
    ['차용증에 확정일자 부여', '공증 또는 우체국 내용증명 — 사후 작성 의심 차단'],
    ['대여금 전액을 계좌이체로 수령', '현금 수수는 절대 금지'],
    ['상환은 차입자 본인 계좌 → 대여자 계좌', '제3자 계좌 경유 시 소명 불가'],
    ['이자 지급 시 27.5% 원천징수 후 지급', '무이자면 해당 없음'],
    ['원천징수이행상황신고서 제출', '지급월의 다음 달 10일까지'],
    ['이자소득 지급명세서 제출', '다음 해 2월 말까지'],
    ['매년 일부라도 원금 상환 이력 만들기', '만기 일시 구조의 최대 보완책'],
    ['자금조달계획서에 차입금으로 기재', '주택 취득 시 차용증 첨부'],
    ['대여자의 자금 원천 증빙 확보', '대여자도 자금출처를 소명해야 함']
  ];

  for (var i = 0; i < items.length; i++) {
    var r = 111 + i;
    sh.getRange(r, 1).setValue(items[i][0]);
    sh.getRange(r, 2).insertCheckboxes().setHorizontalAlignment('center');
    sh.getRange(r, 3).setValue(items[i][1])
      .setFontColor(COLOR.NOTE_FG).setFontSize(9);
  }

  sh.getRange('A122').setValue(
    '※ 본 시트는 사전 점검용 추산입니다. 세율·요율은 고시값 변동에 따라 달라지고, ' +
    '실제 과세 판단은 개별 사실관계에 좌우되므로 실행 전 세무대리인 확인을 권합니다.');
  sh.getRange('A122:I122').merge().setFontColor(COLOR.NOTE_FG)
    .setFontSize(9).setWrap(true);
}

function applyLayout_(sh) {
  sh.setColumnWidth(1, 300);
  sh.setColumnWidth(2, 165);
  sh.setColumnWidth(3, 300);
  for (var c = 4; c <= 9; c++) sh.setColumnWidth(c, 125);
  sh.setFrozenRows(1);
  sh.getRange('A1:I122').setFontFamily('Arial');
  sh.setHiddenGridlines(true);
}

function applyValidation_(sh) {
  var v1 = SpreadsheetApp.newDataValidation()
    .requireValueInList(['포함', '미포함'], true).setAllowInvalid(false).build();
  sh.getRange('B11').setDataValidation(v1);

  var v2 = SpreadsheetApp.newDataValidation()
    .requireValueInList(['만기 일시 상환', '원금 분할 상환'], true)
    .setAllowInvalid(false).build();
  sh.getRange('B42').setDataValidation(v2);

  var vPos = SpreadsheetApp.newDataValidation()
    .requireNumberGreaterThanOrEqualTo(0)
    .setHelpText('0 이상의 숫자를 입력하세요.').setAllowInvalid(false).build();
  ['B6', 'B7', 'B8', 'B23', 'B25', 'B27', 'B32', 'B33', 'B38', 'B43']
    .forEach(function (a) { sh.getRange(a).setDataValidation(vPos); });

  var vYear = SpreadsheetApp.newDataValidation()
    .requireNumberBetween(1, 10)
    .setHelpText('1~10년 사이로 입력하세요. 10년 초과는 시뮬레이션 행을 추가해야 합니다.')
    .setAllowInvalid(false).build();
  sh.getRange('B40').setDataValidation(vYear);
}

function applyConditionalFormat_(sh) {
  var rules = [];

  // 최종 판정 B89 — 판정 문구에 '충분'과 '주의'가 함께 들어갈 수 있어
  // (예: "금액은 충분 — 성과급 의존 주의") 앞머리 이모지로 판별한다.
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextStartsWith('✅').setBackground('#c6efce').setFontColor('#006100')
    .setRanges([sh.getRange('B89'), sh.getRange('D106:D108')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextStartsWith('⚠').setBackground('#ffeb9c').setFontColor('#9c6500')
    .setRanges([sh.getRange('B89'), sh.getRange('D106:D108')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextStartsWith('❌').setBackground('#ffc7ce').setFontColor('#9c0006')
    .setRanges([sh.getRange('B89'), sh.getRange('D106:D108')]).build());

  // 버퍼율
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThanOrEqualTo(1.2).setBackground('#c6efce')
    .setRanges([sh.getRange('B88'), sh.getRange('C106:C108')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(1).setBackground('#ffc7ce')
    .setRanges([sh.getRange('B88'), sh.getRange('C106:C108')]).build());

  // 음수 현금흐름
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(0).setFontColor('#9c0006').setBold(true)
    .setRanges([sh.getRange('B68:B70'), sh.getRange('B92'),
                sh.getRange('B100'), sh.getRange('G74:H83')]).build());

  // 과세 대상
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains('과세 대상').setBackground('#ffc7ce').setFontColor('#9c0006')
    .setRanges([sh.getRange('B98')]).build());

  // 누적 원금 대비 비율 그라데이션
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .setGradientMinpointWithValue('#f8696b', SpreadsheetApp.InterpolationType.NUMBER, '0')
    .setGradientMidpointWithValue('#ffeb84', SpreadsheetApp.InterpolationType.NUMBER, '1')
    .setGradientMaxpointWithValue('#63be7b', SpreadsheetApp.InterpolationType.NUMBER, '1.2')
    .setRanges([sh.getRange('I74:I83')]).build());

  sh.setConditionalFormatRules(rules);
}
