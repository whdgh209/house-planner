# -*- coding: utf-8 -*-
"""PCI_간편검증.xlsx — 입력 8칸짜리 간소화 버전.

상세판과 달리 4대보험·세율을 추산하지 않는다. 사용자가 이미 아는
'통장에 찍히는 실수령액'을 직접 입력받아 요율 7칸을 통째로 없앴다.
IFS/TEXTJOIN 등 호환성 문제가 있는 함수는 쓰지 않는다.
"""
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.comments import Comment
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule, CellIsRule

WON, PCT, YEAR, PLAIN = '#,##0"원"', '0.0%', '0"년"', '#,##0'
ARIAL = 'Arial'

F_TITLE = PatternFill('solid', fgColor='1F3864')
F_HEAD  = PatternFill('solid', fgColor='D9E2F3')
F_IN    = PatternFill('solid', fgColor='FFF2CC')
F_CALC  = PatternFill('solid', fgColor='F2F2F2')
F_OUT   = PatternFill('solid', fgColor='E2EFDA')
F_RISK  = PatternFill('solid', fgColor='FCE4E4')
GREEN = PatternFill('solid', start_color='C6EFCE', end_color='C6EFCE')
AMBER = PatternFill('solid', start_color='FFEB9C', end_color='FFEB9C')
RED   = PatternFill('solid', start_color='FFC7CE', end_color='FFC7CE')
THIN = Side(style='thin', color='BFBFBF')
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

wb = Workbook()
ws = wb.active
ws.title = 'PCI_간편검증'


def put(r, label, value=None, note=None, style=None, fmt=None, big=False):
    c1 = ws.cell(r, 1, label)
    c1.font = Font(name=ARIAL)
    if value is not None:
        c = ws.cell(r, 2, value)
        if fmt:
            c.number_format = fmt
    if note is not None:
        ws.cell(r, 3, note).font = Font(name=ARIAL, size=9, color='7F7F7F')
    if style == 'head':
        for col in range(1, 4):
            ws.cell(r, col).fill = F_HEAD
            ws.cell(r, col).font = Font(name=ARIAL, bold=True)
    elif style == 'input':
        b = ws.cell(r, 2)
        b.fill = F_IN
        b.font = Font(name=ARIAL, bold=True, size=12)
        b.border = BOX
        c1.font = Font(name=ARIAL, bold=True)
    elif style == 'calc':
        ws.cell(r, 2).fill = F_CALC
        ws.cell(r, 2).font = Font(name=ARIAL)
    elif style == 'out':
        b = ws.cell(r, 2)
        b.fill = F_OUT
        b.font = Font(name=ARIAL, bold=True, size=14 if big else 11)
        b.border = BOX
        c1.font = Font(name=ARIAL, bold=True)
    elif style == 'risk':
        ws.cell(r, 2).fill = F_RISK
        ws.cell(r, 2).font = Font(name=ARIAL, bold=True)


# ── 제목 ────────────────────────────────────────────────────────────────
ws.merge_cells('A1:C1')
t = ws['A1']
t.value = '개인 간 차용 상환능력 간편 검증'
t.fill = F_TITLE
t.font = Font(name=ARIAL, size=14, bold=True, color='FFFFFF')
t.alignment = Alignment(horizontal='center', vertical='center')
ws.row_dimensions[1].height = 36

ws.merge_cells('A2:C2')
s = ws['A2']
s.value = '노란 칸 8개만 채우면 끝. 나머지는 전부 자동입니다.'
s.font = Font(name=ARIAL, size=10, color='7F7F7F')
s.alignment = Alignment(horizontal='center')

# ── 입력 (5~12행) ───────────────────────────────────────────────────────
put(4, '■ 입력 — 이 칸만 채우세요', None, None, 'head')
put(5,  '① 월 실수령액 (통장 입금액)', 3800000,
        '급여명세서 실지급액. 세금·4대보험 다 뗀 금액', 'input', WON)
put(6,  '② 연간 성과급 실수령액', 6000000,
        '없으면 0. 세후 기준 — 모르면 세전 × 0.6', 'input', WON)
put(7,  '③ 월 대출 상환액 합계', 2000000,
        '주담대 + 신용 + 회사대출 … 전부 더한 값', 'input', WON)
put(8,  '④ 월 생활비 합계', 1500000,
        '고정비 + 변동비. 최근 3개월 카드값 평균', 'input', WON)
put(9,  '⑤ 차용 원금', 200000000, '빌리려는 금액', 'input', WON)
put(10, '⑥ 차용 기간 (년)', 5, '1~10년', 'input', YEAR)
put(11, '⑦ 약정 이자율 (연)', 0, '무이자면 0%', 'input', PCT)
put(12, '⑧ 연간 급여 상승률', 0,
        '모르면 0으로 두세요 (가장 보수적)', 'input', PCT)

# ── 결과 (14~21행) ──────────────────────────────────────────────────────
put(14, '■ 결과', None, None, 'head')
put(15, '연간 세후 소득', '=$B$5*12+$B$6', None, 'calc', WON)
put(16, '연간 지출 (대출+생활비+차용이자)',
        '=$B$7*12+$B$8*12+ROUND($B$9*$B$11,0)', None, 'calc', WON)
put(17, '연간 잉여 (저축 가능액)', '=$B$15-$B$16',
        '음수면 애초에 상환 불가', 'calc', WON)
put(18, '차용기간 누적 잉여', '=INDEX($C$35:$C$44,$B$10)',
        '아래 연도별 표 기준', 'out', WON)
put(19, '만기 상환 버퍼율', '=IFERROR($B$18/$B$9,"")',
        '100% = 딱 맞음 · 120% 이상이어야 안전', 'out', PCT)
put(20, '★ 최종 판정',
        '=IF(AND($B$18>=$B$9*1.2,$B$21>=0),"✅ 상환 여유 충분",'
        'IF(AND($B$18>=$B$9,$B$21>=0),"⚠ 상환 가능 (주의 요망)",'
        '"❌ 상환 능력 부족 (증여 추정 위험)"))',
        None, 'out', None, big=True)
ws.row_dimensions[20].height = 28
put(21, '월 수지 (성과급 빼고)',
        '=$B$5-$B$7-$B$8-ROUND($B$9*$B$11,0)/12',
        '성과급 없이도 흑자여야 안전', 'calc', WON)

# ── 증여세 (23~26행) ────────────────────────────────────────────────────
put(23, '■ 증여세 체크', None, None, 'head')
put(24, '무상대여 이익 (연)',
        '=MAX(0,ROUND($B$9*0.046,0)-ROUND($B$9*$B$11,0))',
        '법정 적정이자(4.6%) − 실제 약정이자', 'risk', WON)
put(25, '증여세 과세 여부',
        '=IF($B$24>=10000000,"❌ 과세 대상 — 이익 전액이 증여재산가액",'
        '"✅ 비과세 (연 1,000만원 미만)")',
        '1,000만원 이상이면 초과분 아닌 전액 과세', 'risk')
put(26, '무이자로 빌릴 수 있는 최대 원금', 217391304,
        '1,000만원 ÷ 4.6% — 고정값', 'calc', WON)

# ── 처방 (28~31행) ──────────────────────────────────────────────────────
put(28, '■ 그래서 어떻게 하면 되나', None, None, 'head')
put(29, '이 조건에서 안전한 최대 차용액', '=ROUND($B$18/1.2,-6)',
        '백만원 단위 내림 — 여유 충분이 나오는 금액', 'out', WON)
put(30, '원금을 다 갚으려면 필요한 기간',
        '=IF(COUNTIF($C$35:$C$44,">="&$B$9)=0,"10년 안에는 불가",'
        '11-COUNTIF($C$35:$C$44,">="&$B$9))',
        '누적 잉여가 원금을 넘어서는 연차', 'out')

parts = [
    ('$B$24>=10000000',
     '"⚠ 무상대여 이익 "&TEXT($B$24,"#,##0")&"원이 연 1,000만원 이상 → '
     '초과분이 아닌 이익 전액이 증여재산가액으로 과세될 수 있음."'),
    ('AND($B$11=0,$B$9>217391304),',
     None),  # placeholder, 아래에서 교체
]
comment_parts = [
    ('$B$24>=10000000',
     '"⚠ 무상대여 이익 "&TEXT($B$24,"#,##0")&"원이 연 1,000만원 이상 → '
     '초과분이 아닌 이익 전액이 증여재산가액으로 과세될 수 있음."'),
    ('AND($B$11=0,$B$9>217391304)',
     '"⚠ 무이자로는 217,391,304원까지만 안전. 원금을 낮추거나 최소한의 이자를 약정하세요."'),
    ('$B$21<0',
     '"⚠ 성과급을 빼면 월 "&TEXT(ABS($B$21),"#,##0")&"원 적자 → '
     '상환 재원을 변동 성과급에 의존. 소명 시 가장 취약한 지점."'),
    ('$B$18<$B$9',
     '"⚠ 이 조건이면 "&TEXT(ROUND($B$18/1.2,-6),"#,##0")&"원까지가 안전선. '
     '원금을 줄이거나 기간을 늘리세요."'),
    ('$B$11>0',
     '"ℹ 이자 지급 시 27.5%를 원천징수해 다음 달 10일까지 납부해야 차용으로 인정됨."'),
]
joined = '&'.join('IF({c},{t}&CHAR(10),"")'.format(c=c, t=t) for c, t in comment_parts)
joined += ('&"ℹ 차용증(확정일자) + 원금 전액 계좌이체 + 매달 상환 이체기록, '
           '이 셋이 없으면 숫자가 좋아도 소용없습니다."')
put(31, '한줄 진단', '=' + joined, None, 'risk')
ws['B31'].alignment = Alignment(wrap_text=True, vertical='top')
ws.row_dimensions[31].height = 100

# ── 연도별 표 (33~44행) ─────────────────────────────────────────────────
ws['A33'] = '■ 연도별 누적  [자동 — 건드릴 것 없음]'
for col in range(1, 5):
    ws.cell(33, col).fill = F_HEAD
    ws.cell(33, col).font = Font(name=ARIAL, bold=True)
for i, h in enumerate(['연차', '연간 잉여', '누적 잉여', '원금 대비'], start=1):
    c = ws.cell(34, i, h)
    c.fill = F_CALC
    c.font = Font(name=ARIAL, bold=True)
    c.alignment = Alignment(horizontal='center')

for n in range(1, 11):
    r = 34 + n                                    # 35~44
    a = ws.cell(r, 1, n)
    a.number_format = YEAR
    a.alignment = Alignment(horizontal='center')
    a.font = Font(name=ARIAL, bold=True)
    # 소득에만 상승률 적용(보수적). 지출은 고정.
    ws.cell(r, 2, '=ROUND($B$15*(1+$B$12)^({n}-1),0)-$B$16'.format(n=n))
    ws.cell(r, 3, '=B{r}'.format(r=r) if n == 1
            else '=C{p}+B{r}'.format(p=r - 1, r=r))
    ws.cell(r, 4, '=IFERROR(C{r}/$B$9,"")'.format(r=r))
    ws.cell(r, 2).number_format = PLAIN
    ws.cell(r, 3).number_format = PLAIN
    ws.cell(r, 4).number_format = PCT
    for col in range(1, 5):
        ws.cell(r, col).border = BOX
for col in range(1, 5):
    ws.cell(34, col).border = BOX

ws.cell(45, 1, '초록색으로 칠해진 줄 = 그 해에 원금을 다 갚을 수 있다는 뜻').font = \
    Font(name=ARIAL, size=9, color='7F7F7F')
ws.cell(46, 1, '연간 잉여는 소득에만 상승률을 적용하고 지출은 고정으로 둡니다 (보수적 추정).').font = \
    Font(name=ARIAL, size=9, color='7F7F7F')

ws.merge_cells('A48:C48')
d = ws['A48']
d.value = ('※ 사전 점검용 추산입니다. 실제 과세 판단은 개별 사실관계에 좌우되므로 '
           '실행 전 세무대리인 확인을 권합니다.')
d.font = Font(name=ARIAL, size=9, color='7F7F7F')
d.alignment = Alignment(wrap_text=True)

# ── 근거 주석 ───────────────────────────────────────────────────────────
for addr, text in {
    'B5': '급여명세서의 실지급액(공제 후)을 그대로 넣으세요. '
          '4대보험·소득세를 따로 계산할 필요가 없습니다.',
    'B6': '세후 기준입니다. 세전 금액만 안다면 대략 × 0.6 정도로 넣으세요 '
          '(과표 35% 구간 + 지방소득세 가정).',
    'B12': '0으로 두면 급여가 전혀 오르지 않는다고 보고 계산합니다. '
           '국세청에 제시할 자료라면 0이 가장 안전합니다.',
    'B26': '상속세 및 증여세법 시행령 제31조의4 — 적정이자율 연 4.6%. '
           '무상대여 이익이 연 1천만원 이상이면 전액이 증여재산가액.',
}.items():
    ws[addr].comment = Comment(text, 'PCI 간편검증')

# ── 데이터 유효성 ───────────────────────────────────────────────────────
dv_money = DataValidation(type='decimal', operator='greaterThanOrEqual', formula1=0,
                          allow_blank=False, error='0 이상의 숫자를 입력하세요.')
ws.add_data_validation(dv_money)
for a in ['B5', 'B6', 'B7', 'B8', 'B9']:
    dv_money.add(ws[a])

dv_year = DataValidation(type='whole', operator='between', formula1=1, formula2=10,
                         allow_blank=False, error='1~10년 사이로 입력하세요.')
ws.add_data_validation(dv_year)
dv_year.add(ws['B10'])

dv_rate = DataValidation(type='decimal', operator='between', formula1=0, formula2=1,
                         allow_blank=False, error='0% ~ 100% 사이로 입력하세요.')
ws.add_data_validation(dv_rate)
dv_rate.add(ws['B11'])
dv_rate.add(ws['B12'])

# ── 조건부 서식 ─────────────────────────────────────────────────────────
for kw, fill, color in [('충분', GREEN, '006100'), ('주의', AMBER, '9C6500'),
                        ('부족', RED, '9C0006')]:
    ws.conditional_formatting.add('B20', FormulaRule(
        formula=['ISNUMBER(SEARCH("{0}",B20))'.format(kw)],
        fill=fill, font=Font(color=color, bold=True)))

ws.conditional_formatting.add('B19', CellIsRule(
    operator='greaterThanOrEqual', formula=['1.2'], fill=GREEN))
ws.conditional_formatting.add('B19', CellIsRule(
    operator='lessThan', formula=['1'], fill=RED))

for rng in ['B17', 'B21']:
    ws.conditional_formatting.add(rng, CellIsRule(
        operator='lessThan', formula=['0'], font=Font(color='9C0006', bold=True)))

ws.conditional_formatting.add('B25', FormulaRule(
    formula=['ISNUMBER(SEARCH("과세 대상",B25))'],
    fill=RED, font=Font(color='9C0006', bold=True)))

# 원금을 넘어서는 연차부터 초록
ws.conditional_formatting.add('A35:D44', FormulaRule(
    formula=['$C35>=$B$9'], fill=GREEN))

# ── 레이아웃 ────────────────────────────────────────────────────────────
ws.column_dimensions['A'].width = 36
ws.column_dimensions['B'].width = 22
ws.column_dimensions['C'].width = 46
ws.column_dimensions['D'].width = 14
ws.sheet_view.showGridLines = False
ws.freeze_panes = 'A3'

out = '/home/user/house-planner/sheets/pci-loan-check/PCI_간편검증.xlsx'
wb.save(out)
print('saved:', out)
