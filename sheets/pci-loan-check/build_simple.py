# -*- coding: utf-8 -*-
"""PCI_간편검증.xlsx

성과급을 고정 금액이 아니라 '월 실수령액 대비 비율'로 받는다.
이렇게 하면 급여 상승률이 성과급에도 자동으로 걸린다.
비율을 최소/예상/최대 세 개로 받아 세 시나리오를 동시에 보여준다.
IFS/TEXTJOIN 등 호환성 문제가 있는 함수는 쓰지 않는다.
"""
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.comments import Comment
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule, CellIsRule

WON, PCT, YEAR, PLAIN = '#,##0"원"', '0.0%', '0"년"', '#,##0'
ARIAL = 'Arial'
LIMIT = 217391304                     # 1,000만원 / 4.6%

F_TITLE = PatternFill('solid', fgColor='1F3864')
F_HEAD  = PatternFill('solid', fgColor='D9E2F3')
F_HEAD2 = PatternFill('solid', fgColor='E7E6E6')
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
NOTE_COL = 5                                  # E열 = 비고


def note(r, text):
    ws.cell(r, NOTE_COL, text).font = Font(name=ARIAL, size=9, color='7F7F7F')


def put(r, label, value=None, txt=None, style=None, fmt=None, big=False, span=False):
    c1 = ws.cell(r, 1, label)
    c1.font = Font(name=ARIAL)
    if value is not None:
        if span:
            ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=4)
        c = ws.cell(r, 2, value)
        if fmt:
            c.number_format = fmt
    if txt is not None:
        note(r, txt)
    cells = [ws.cell(r, c) for c in (range(2, 5) if span else [2])]
    if style == 'input':
        for c in cells:
            c.fill, c.border = F_IN, BOX
        cells[0].font = Font(name=ARIAL, bold=True, size=12)
        c1.font = Font(name=ARIAL, bold=True)
    elif style == 'calc':
        for c in cells:
            c.fill = F_CALC
        cells[0].font = Font(name=ARIAL)
    elif style == 'out':
        for c in cells:
            c.fill, c.border = F_OUT, BOX
        cells[0].font = Font(name=ARIAL, bold=True, size=14 if big else 11)
        c1.font = Font(name=ARIAL, bold=True)
    elif style == 'risk':
        for c in cells:
            c.fill = F_RISK
        cells[0].font = Font(name=ARIAL, bold=True)


def banner(r, text, fill=F_HEAD, span=5):
    ws.cell(r, 1, text)
    for col in range(1, span + 1):
        ws.cell(r, col).fill = fill
        ws.cell(r, col).font = Font(name=ARIAL, bold=True)


# ── 제목 ────────────────────────────────────────────────────────────────
ws.merge_cells('A1:E1')
t = ws['A1']
t.value = '개인 간 차용 상환능력 간편 검증'
t.fill = F_TITLE
t.font = Font(name=ARIAL, size=14, bold=True, color='FFFFFF')
t.alignment = Alignment(horizontal='center', vertical='center')
ws.row_dimensions[1].height = 36

ws.merge_cells('A2:E2')
s = ws['A2']
s.value = '노란 칸만 채우면 끝. 성과급은 금액이 아니라 월 실수령액 대비 비율로 넣습니다.'
s.font = Font(name=ARIAL, size=10, color='7F7F7F')
s.alignment = Alignment(horizontal='center')

# ── 입력 5~14 ───────────────────────────────────────────────────────────
banner(4, '■ 입력 — 이 칸만 채우세요')
put(5,  '① 월 실수령액 (통장 입금액)', 5400000,
        '급여명세서 실지급액. 세금·4대보험 다 뗀 금액', 'input', WON)
put(6,  '② 성과급 비율 — 최소', 0,
        '월 실수령액 대비. 최악의 해 기준 (보통 0%)', 'input', PCT)
put(7,  '③ 성과급 비율 — 예상', 0.25,
        '평년에 기대하는 수준', 'input', PCT)
put(8,  '④ 성과급 비율 — 최대', 0.50,
        '가장 잘 나온 해 기준', 'input', PCT)
put(9,  '⑤ 월 대출 상환액 합계', 5650000,
        '주담대 + 신용 + 회사대출 … 전부 더한 값', 'input', WON)
put(10, '⑥ 월 생활비 합계', 1000000,
        '고정비 + 변동비. 최근 3개월 카드값 평균', 'input', WON)
put(11, '⑦ 차용 원금', 217000000, '빌리려는 금액', 'input', WON)
put(12, '⑧ 차용 기간 (년)', 10, '1~10년', 'input', YEAR)
put(13, '⑨ 약정 이자율 (연)', 0, '무이자면 0%', 'input', PCT)
put(14, '⑩ 연간 급여 상승률', 0.05,
        '월급과 성과급에 함께 적용됩니다', 'input', PCT)

put(16, '연간 지출 (대출 + 생활비 + 차용이자)',
        '=$B$9*12+$B$10*12+ROUND($B$11*$B$13,0)',
        '세 시나리오 공통', 'calc', WON, span=True)

# ── 시나리오 표 18~25 ───────────────────────────────────────────────────
banner(18, '■ 시나리오별 결과 — 성과급이 얼마나 나오느냐에 따라')
for i, h in enumerate(['구분', '최소', '예상', '최대'], start=1):
    c = ws.cell(19, i, h)
    c.fill = F_CALC
    c.font = Font(name=ARIAL, bold=True)
    c.alignment = Alignment(horizontal='center')
    c.border = BOX

SRC = {2: '$B$6', 3: '$B$7', 4: '$B$8'}          # 열 -> 성과급 비율 입력셀

rows = [
    (20, '성과급 비율', '={s}', PCT, 'calc'),
    (21, '연간 세후 소득 (1년차)', '=ROUND($B$5*12*(1+{s}),0)', WON, 'calc'),
    (22, '연간 잉여 (1년차)', '=ROUND($B$5*12*(1+{s}),0)-$B$16', WON, 'calc'),
    (23, '차용기간 누적 잉여', '=INDEX({col}$51:{col}$60,$B$12)', PLAIN, 'out'),
    (24, '버퍼율  (누적 ÷ 원금)', '=IFERROR({col}23/$B$11,"")', PCT, 'out'),
    (25, '판정', '=IF({col}24>=1.2,"✅ 여유 충분",'
                 'IF({col}24>=1,"⚠ 가능(주의)","❌ 부족"))', None, 'out'),
    (26, '안전한 최대 차용액', '=MAX(0,ROUND({col}23/1.2,-6))', PLAIN, 'out'),
]
for r, label, tmpl, fmt, style in rows:
    ws.cell(r, 1, label).font = Font(name=ARIAL, bold=(style == 'out'))
    for col in (2, 3, 4):
        letter = chr(ord('A') + col - 1)
        c = ws.cell(r, col, tmpl.format(s=SRC[col], col=letter))
        if fmt:
            c.number_format = fmt
        c.alignment = Alignment(horizontal='center')
        c.border = BOX
        c.fill = F_OUT if style == 'out' else F_CALC
        if style == 'out':
            c.font = Font(name=ARIAL, bold=True)
note(20, '월 실수령액 대비 비율 (입력값 그대로)')
note(23, '아래 연도별 표에서 차용 기간에 해당하는 해의 누적')
note(24, '120% 이상이면 여유 · 100% 미만이면 부족')
note(26, '그 시나리오에서 버퍼 120%가 나오는 금액')

# ── 최종 판정 28 ────────────────────────────────────────────────────────
put(28, '★ 최종 판정',
        '=IF(OR($B$6>$C$20,$C$20>$D$20),"⚠ 성과급 비율을 최소 ≤ 예상 ≤ 최대 순서로 입력하세요",'
        'IF($B$24>=1.2,"✅ 어떤 경우에도 여유 충분",'
        'IF($B$24>=1,"✅ 성과급이 최소여도 상환 가능",'
        'IF($C$24>=1.2,"⚠ 예상대로면 충분 — 성과급 부진 시 위험",'
        'IF($C$24>=1,"⚠ 예상 기준 겨우 가능 (여유 없음)",'
        'IF($D$24>=1,"❌ 성과급이 최대로 나와야만 가능 — 사실상 부족",'
        '"❌ 상환 능력 부족 (증여 추정 위험)"))))))',
        '세 시나리오를 모두 보고 내린 판정', 'out', None, big=True, span=True)
ws.row_dimensions[28].height = 28
ws['B28'].alignment = Alignment(horizontal='center', vertical='center')

# ── 추가 지표 30~33 ─────────────────────────────────────────────────────
banner(30, '■ 월 단위로 보면')
put(31, '월 수지 — 성과급 최소일 때',
        '=$B$5*(1+$B$6)-$B$9-$B$10-ROUND($B$11*$B$13,0)/12',
        '음수면 그 해에는 통장이 마이너스', 'calc', WON, span=True)
put(32, '월 수지 — 성과급 예상일 때',
        '=$B$5*(1+$B$7)-$B$9-$B$10-ROUND($B$11*$B$13,0)/12',
        None, 'calc', WON, span=True)
put(33, '원금을 다 갚으려면 필요한 기간',
        '=IF(COUNTIF($C$51:$C$60,">="&$B$11)=0,"10년 안에는 불가",'
        '(11-COUNTIF($C$51:$C$60,">="&$B$11))&"년차")',
        '예상 시나리오 기준', 'out', None, span=True)

# ── 증여세 35~39 ────────────────────────────────────────────────────────
banner(35, '■ 증여세 체크')
put(36, '무상대여 이익 (연)',
        '=MAX(0,ROUND($B$11*0.046,0)-ROUND($B$11*$B$13,0))',
        '법정 적정이자(4.6%) − 실제 약정이자', 'risk', WON, span=True)
put(37, '증여세 과세 여부',
        '=IF($B$36>=10000000,"❌ 과세 대상 — 이익 전액이 증여재산가액",'
        '"✅ 비과세 (연 1,000만원 미만)")',
        '1,000만원 이상이면 초과분 아닌 전액 과세', 'risk', None, span=True)
put(38, '무이자로 빌릴 수 있는 최대 원금', LIMIT,
        '1,000만원 ÷ 4.6% — 고정값', 'calc', WON, span=True)
put(39, '한도 소진율', '=IF($B$13>0,"-",IFERROR($B$11/$B$38,""))',
        '100% 넘으면 증여세 과세 구간', 'risk', PCT, span=True)

# ── 진단 41 ─────────────────────────────────────────────────────────────
parts = [
    ('OR($B$6>$C$20,$C$20>$D$20)',
     '"⚠ 성과급 비율 입력 순서가 잘못됐습니다 (최소 ≤ 예상 ≤ 최대)."'),
    ('$B$36>=10000000',
     '"⚠ 무상대여 이익 "&TEXT($B$36,"#,##0")&"원이 연 1,000만원 이상 → '
     '초과분이 아닌 이익 전액이 증여재산가액으로 과세될 수 있음."'),
    ('AND($B$13=0,$B$11>$B$38)',
     '"⚠ 무이자로는 "&TEXT($B$38,"#,##0")&"원까지만 안전. '
     '원금을 낮추거나 최소한의 이자를 약정하세요."'),
    ('AND($B$13=0,$B$11<=$B$38,$B$11>$B$38*0.95)',
     '"⚠ 무이자 한도를 "&TEXT($B$39,"0.0%")&" 소진했습니다. '
     '원금을 "&TEXT($B$38-$B$11,"#,##0")&"원만 더 늘려도 증여세 과세 구간입니다."'),
    ('AND($C$24>=1,$B$24<1)',
     '"⚠ 성과급이 예상("&TEXT($C$20,"0%")&")대로 나오면 버퍼 "&TEXT($C$24,"0.0%")&"지만, '
     '최소("&TEXT($B$20,"0%")&")면 "&TEXT($B$24,"0.0%")&"로 떨어집니다. '
     '상환 계획이 성과급에 달려 있습니다."'),
    ('$B$31<0',
     '"⚠ 성과급이 최소일 때는 월 "&TEXT(ABS($B$31),"#,##0")&"원 적자입니다 '
     '(대출 상환액이 실수령액에 육박하거나 넘습니다)."'),
    ('$D$24<1',
     '"⚠ 성과급이 최대로 나와도 금액이 부족합니다. 안전선은 '
     '"&TEXT($D$26,"#,##0")&"원입니다."'),
    ('$B$13>0',
     '"ℹ 이자 지급 시 27.5%를 원천징수해 다음 달 10일까지 납부해야 차용으로 인정됨."'),
]
joined = '&'.join('IF({c},{t}&CHAR(10),"")'.format(c=c, t=t) for c, t in parts)
joined += ('&"ℹ 차용증(확정일자) + 원금 전액 계좌이체 + 매달 상환 이체기록, '
           '이 셋이 없으면 숫자가 좋아도 소용없습니다."')
put(41, '한줄 진단', '=' + joined, None, 'risk', None, span=True)
ws['B41'].alignment = Alignment(wrap_text=True, vertical='top')
ws.row_dimensions[41].height = 120

# ── 읽는 순서 43~46 ─────────────────────────────────────────────────────
banner(43, '■ 읽는 순서 — 이 세 줄만 보면 됩니다', F_HEAD2)
for i, g in enumerate([
    '1) 24행 버퍼율을 왼쪽(최소)부터 보세요. 최소에서 100%가 넘으면 성과급과 무관하게 안전합니다.',
    '2) 최소는 낮고 예상만 넘는다면, 그 계획은 성과급이 매년 나온다는 전제 위에 있습니다.',
    '3) 37행이 비과세인지 확인하세요. 무이자라면 원금이 38행 금액 이하여야 합니다.',
]):
    r = 44 + i
    ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=5)
    ws.cell(r, 1, g).font = Font(name=ARIAL, size=10)

# ── 연도별 표 49~60 ─────────────────────────────────────────────────────
banner(49, '■ 연도별 누적  [자동 — 건드릴 것 없음]')
for i, h in enumerate(['연차', '누적 (최소)', '누적 (예상)', '누적 (최대)',
                       '원금 대비 (예상)'], start=1):
    c = ws.cell(50, i, h)
    c.fill = F_CALC
    c.font = Font(name=ARIAL, bold=True)
    c.alignment = Alignment(horizontal='center', wrap_text=True)
    c.border = BOX

for n in range(1, 11):
    r = 50 + n                                    # 51~60
    a = ws.cell(r, 1, n)
    a.number_format = YEAR
    a.alignment = Alignment(horizontal='center')
    a.font = Font(name=ARIAL, bold=True)
    for col in (2, 3, 4):
        letter = chr(ord('A') + col - 1)
        year_inc = 'ROUND($B$5*12*(1+{s})*(1+$B$14)^({n}-1),0)-$B$16'.format(
            s=SRC[col], n=n)
        f = ('=' + year_inc) if n == 1 else \
            ('={L}{p}+'.format(L=letter, p=r - 1) + year_inc)
        c = ws.cell(r, col, f)
        c.number_format = PLAIN
        c.border = BOX
    e = ws.cell(r, 5, '=IFERROR(C{r}/$B$11,"")'.format(r=r))
    e.number_format = PCT
    e.border = BOX

for i, txt in enumerate([
    '초록색으로 칠해진 줄 = 예상 시나리오에서 그 해에 원금을 다 갚을 수 있다는 뜻',
    '성과급은 월 실수령액 × 비율로 계산되므로 급여 상승률이 성과급에도 함께 적용됩니다.',
    '지출은 상승률 없이 고정으로 둡니다 (보수적 추정).',
]):
    ws.cell(62 + i, 1, txt).font = Font(name=ARIAL, size=9, color='7F7F7F')

ws.merge_cells('A66:E66')
d = ws['A66']
d.value = ('※ 사전 점검용 추산입니다. 실제 과세 판단은 개별 사실관계에 좌우되므로 '
           '실행 전 세무대리인 확인을 권합니다.')
d.font = Font(name=ARIAL, size=9, color='7F7F7F')
d.alignment = Alignment(wrap_text=True)

# ── 주석 ────────────────────────────────────────────────────────────────
for addr, text in {
    'B5': '급여명세서의 실지급액(공제 후)을 그대로 넣으세요. '
          '4대보험·소득세를 따로 계산할 필요가 없습니다.',
    'B7': '성과급은 금액이 아니라 월 실수령액 대비 비율로 넣습니다. '
          '예: 월 540만원에 성과급이 월 135만원 수준이면 25%. '
          '비율로 두면 급여가 오를 때 성과급도 같이 오릅니다.',
    'B14': '월급과 성과급 양쪽에 적용됩니다. 0으로 두면 급여가 전혀 오르지 '
           '않는다고 보고 계산합니다 — 국세청에 제시할 자료라면 0이 가장 안전합니다.',
    'B38': '상속세 및 증여세법 시행령 제31조의4 — 적정이자율 연 4.6%. '
           '무상대여 이익이 연 1천만원 이상이면 전액이 증여재산가액.',
}.items():
    ws[addr].comment = Comment(text, 'PCI 간편검증')

# ── 유효성 ──────────────────────────────────────────────────────────────
dv_money = DataValidation(type='decimal', operator='greaterThanOrEqual', formula1=0,
                          allow_blank=False, error='0 이상의 숫자를 입력하세요.')
ws.add_data_validation(dv_money)
for a in ['B5', 'B9', 'B10', 'B11']:
    dv_money.add(ws[a])
dv_year = DataValidation(type='whole', operator='between', formula1=1, formula2=10,
                         allow_blank=False, error='1~10년 사이로 입력하세요.')
ws.add_data_validation(dv_year); dv_year.add(ws['B12'])
dv_ratio = DataValidation(type='decimal', operator='between', formula1=0, formula2=5,
                          allow_blank=False, error='0% ~ 500% 사이로 입력하세요.')
ws.add_data_validation(dv_ratio)
for a in ['B6', 'B7', 'B8']:
    dv_ratio.add(ws[a])
dv_rate = DataValidation(type='decimal', operator='between', formula1=0, formula2=1,
                         allow_blank=False, error='0% ~ 100% 사이로 입력하세요.')
ws.add_data_validation(dv_rate); dv_rate.add(ws['B13']); dv_rate.add(ws['B14'])

# ── 조건부 서식 ─────────────────────────────────────────────────────────
for kw, fill, color in [('충분', GREEN, '006100'), ('가능', AMBER, '9C6500'),
                        ('부족', RED, '9C0006'), ('위험', AMBER, '9C6500')]:
    ws.conditional_formatting.add('B25:D25', FormulaRule(
        formula=['ISNUMBER(SEARCH("{0}",B25))'.format(kw)],
        fill=fill, font=Font(color=color, bold=True)))
for kw, fill, color in [('충분', GREEN, '006100'), ('가능', GREEN, '006100'),
                        ('위험', AMBER, '9C6500'), ('여유 없음', AMBER, '9C6500'),
                        ('부족', RED, '9C0006')]:
    ws.conditional_formatting.add('B28', FormulaRule(
        formula=['ISNUMBER(SEARCH("{0}",$B$28))'.format(kw)],
        fill=fill, font=Font(color=color, bold=True, size=14)))

ws.conditional_formatting.add('B24:D24', CellIsRule(
    operator='greaterThanOrEqual', formula=['1.2'], fill=GREEN))
ws.conditional_formatting.add('B24:D24', CellIsRule(
    operator='lessThan', formula=['1'], fill=RED))
for rng in ['B22:D22', 'B31', 'B32', 'B51:D60']:
    ws.conditional_formatting.add(rng, CellIsRule(
        operator='lessThan', formula=['0'], font=Font(color='9C0006', bold=True)))
ws.conditional_formatting.add('B37', FormulaRule(
    formula=['ISNUMBER(SEARCH("과세 대상",$B$37))'],
    fill=RED, font=Font(color='9C0006', bold=True)))
ws.conditional_formatting.add('B39', CellIsRule(
    operator='greaterThan', formula=['1'], fill=RED))
ws.conditional_formatting.add('B39', CellIsRule(
    operator='between', formula=['0.95', '1'], fill=AMBER))
ws.conditional_formatting.add('A51:E60', FormulaRule(
    formula=['$C51>=$B$11'], fill=GREEN))

# ── 레이아웃 ────────────────────────────────────────────────────────────
for col, w in [('A', 34), ('B', 19), ('C', 19), ('D', 19), ('E', 50)]:
    ws.column_dimensions[col].width = w
ws.sheet_view.showGridLines = False
ws.freeze_panes = 'A3'

out = '/home/user/house-planner/sheets/pci-loan-check/PCI_간편검증.xlsx'
wb.save(out)
print('saved:', out)
