# -*- coding: utf-8 -*-
"""PCI_간편검증.xlsx — 입력 8칸.

판정을 두 축으로 분리한다.
  1단계 (금액)   : 성과급 포함 누적 잉여가 원금을 감당하는가
  2단계 (안정성) : 성과급이 0이어도 감당되는가
한 축으로 뭉치면 '버퍼 210%인데 상환 능력 부족' 같은 모순이 난다.
IFS/TEXTJOIN 등 호환성 문제가 있는 함수는 쓰지 않는다.
"""
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.comments import Comment
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule, CellIsRule

WON, PCT, YEAR, PLAIN = '#,##0"원"', '0.0%', '0"년"', '#,##0'
ARIAL = 'Arial'
LIMIT = 217391304            # 1,000만원 / 4.6%

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
        b.fill, b.border = F_IN, BOX
        b.font = Font(name=ARIAL, bold=True, size=12)
        c1.font = Font(name=ARIAL, bold=True)
    elif style == 'calc':
        ws.cell(r, 2).fill = F_CALC
        ws.cell(r, 2).font = Font(name=ARIAL)
    elif style == 'out':
        b = ws.cell(r, 2)
        b.fill, b.border = F_OUT, BOX
        b.font = Font(name=ARIAL, bold=True, size=14 if big else 11)
        c1.font = Font(name=ARIAL, bold=True)
    elif style == 'risk':
        ws.cell(r, 2).fill = F_RISK
        ws.cell(r, 2).font = Font(name=ARIAL, bold=True)


def banner(r, text, fill=F_HEAD, span=3):
    ws.cell(r, 1, text)
    for col in range(1, span + 1):
        ws.cell(r, col).fill = fill
        ws.cell(r, col).font = Font(name=ARIAL, bold=True)


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

# ── 입력 5~12 ───────────────────────────────────────────────────────────
banner(4, '■ 입력 — 이 칸만 채우세요')
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
put(12, '⑧ 연간 급여 상승률', 0, '모르면 0으로 두세요 (가장 보수적)', 'input', PCT)

# ── 1단계 14~19 ─────────────────────────────────────────────────────────
banner(14, '■ 1단계 · 금액이 되는가   (성과급 포함)')
put(15, '연간 세후 소득 (성과급 포함)', '=$B$5*12+$B$6',
        '월급 12개월 + 성과급. 성과급도 당연히 포함됩니다', 'calc', WON)
put(16, '연간 지출 (대출+생활비+차용이자)',
        '=$B$7*12+$B$8*12+ROUND($B$9*$B$11,0)', None, 'calc', WON)
put(17, '연간 잉여 (저축 가능액)', '=$B$15-$B$16', None, 'calc', WON)
put(18, '차용기간 누적 잉여', '=INDEX($C$48:$C$57,$B$10)',
        '아래 연도별 표 기준', 'out', WON)
put(19, '버퍼율 ①  (성과급 포함)', '=IFERROR($B$18/$B$9,"")',
        '120% 이상이면 금액은 넉넉', 'out', PCT)

# ── 2단계 21~25 ─────────────────────────────────────────────────────────
banner(21, '■ 2단계 · 성과급 없이도 되는가   (안정성)')
put(22, '성과급이 소득에서 차지하는 비중', '=IFERROR($B$6/$B$15,"")',
        '30% 넘으면 소명 시 약한 고리', 'calc', PCT)
put(23, '월급만으로 월 수지', '=$B$5-$B$7-$B$8-ROUND($B$9*$B$11,0)/12',
        '음수면 월급으로 대출·생활비를 못 감당한다는 뜻', 'calc', WON)
put(24, '성과급 0 가정 시 누적 잉여', '=INDEX($F$48:$F$57,$B$10)',
        '성과급이 한 푼도 안 나온다고 보면', 'out', WON)
put(25, '버퍼율 ②  (성과급 0 기준)', '=IFERROR($B$24/$B$9,"")',
        '100% 이상이면 성과급 없이도 상환 가능', 'out', PCT)

# ── 최종 판정 27 ────────────────────────────────────────────────────────
put(27, '★ 최종 판정',
        '=IF(AND($B$19>=1.2,$B$25>=1),"✅ 상환 여유 충분",'
        'IF(AND($B$19>=1.2,$B$25<1),"⚠ 금액은 충분 — 성과급 의존 주의",'
        'IF($B$19>=1,"⚠ 상환 가능 (주의 요망)",'
        '"❌ 상환 능력 부족 (증여 추정 위험)")))',
        '버퍼율 ①과 ② 를 같이 보고 내린 판정', 'out', None, big=True)
ws.row_dimensions[27].height = 28

# ── 증여세 29~33 ────────────────────────────────────────────────────────
banner(29, '■ 증여세 체크')
put(30, '무상대여 이익 (연)',
        '=MAX(0,ROUND($B$9*0.046,0)-ROUND($B$9*$B$11,0))',
        '법정 적정이자(4.6%) − 실제 약정이자', 'risk', WON)
put(31, '증여세 과세 여부',
        '=IF($B$30>=10000000,"❌ 과세 대상 — 이익 전액이 증여재산가액",'
        '"✅ 비과세 (연 1,000만원 미만)")',
        '1,000만원 이상이면 초과분 아닌 전액 과세', 'risk')
put(32, '무이자로 빌릴 수 있는 최대 원금', LIMIT,
        '1,000만원 ÷ 4.6% — 고정값', 'calc', WON)
put(33, '한도 소진율', '=IF($B$11>0,"-",IFERROR($B$9/$B$32,""))',
        '100% 넘으면 증여세 과세 구간', 'risk', PCT)

# ── 처방 35~39 ──────────────────────────────────────────────────────────
banner(35, '■ 그래서 어떻게 하면 되나')
put(36, '안전한 최대 차용액  (성과급 포함 기준)', '=ROUND($B$18/1.2,-6)',
        '성과급이 계속 나온다는 전제', 'out', WON)
put(37, '안전한 최대 차용액  (성과급 0 기준)', '=MAX(0,ROUND($B$24/1.2,-6))',
        '성과급이 끊겨도 버티는 금액 — 진짜 보수적 안전선', 'out', WON)
put(38, '원금을 다 갚으려면 필요한 기간',
        '=IF(COUNTIF($C$48:$C$57,">="&$B$9)=0,"10년 안에는 불가",'
        '(11-COUNTIF($C$48:$C$57,">="&$B$9))&"년차")',
        '성과급 포함 기준', 'out')

comment_parts = [
    ('$B$30>=10000000',
     '"⚠ 무상대여 이익 "&TEXT($B$30,"#,##0")&"원이 연 1,000만원 이상 → '
     '초과분이 아닌 이익 전액이 증여재산가액으로 과세될 수 있음."'),
    ('AND($B$11=0,$B$9>$B$32)',
     '"⚠ 무이자로는 "&TEXT($B$32,"#,##0")&"원까지만 안전. '
     '원금을 낮추거나 최소한의 이자를 약정하세요."'),
    ('AND($B$11=0,$B$9<=$B$32,$B$9>$B$32*0.95)',
     '"⚠ 무이자 한도를 "&TEXT($B$33,"0.0%")&" 소진했습니다. '
     '원금을 "&TEXT($B$32-$B$9,"#,##0")&"원만 더 늘려도 증여세 과세 구간입니다."'),
    ('AND($B$19>=1.2,$B$25<1)',
     '"⚠ 성과급이 없다고 보면 버퍼율이 "&TEXT($B$25,"0.0%")&"로 떨어집니다. '
     '이 계획은 성과급이 매년 나온다는 전제 위에 서 있습니다."'),
    ('$B$23<0',
     '"⚠ 월급만으로는 월 "&TEXT(ABS($B$23),"#,##0")&"원 적자입니다 '
     '(대출 상환액이 실수령액에 육박하거나 넘습니다)."'),
    ('$B$19<1',
     '"⚠ 금액 자체가 부족합니다. 이 조건이면 '
     '"&TEXT(ROUND($B$18/1.2,-6),"#,##0")&"원까지가 안전선입니다."'),
    ('$B$11>0',
     '"ℹ 이자 지급 시 27.5%를 원천징수해 다음 달 10일까지 납부해야 차용으로 인정됨."'),
]
joined = '&'.join('IF({c},{t}&CHAR(10),"")'.format(c=c, t=t) for c, t in comment_parts)
joined += ('&"ℹ 차용증(확정일자) + 원금 전액 계좌이체 + 매달 상환 이체기록, '
           '이 셋이 없으면 숫자가 좋아도 소용없습니다."')
put(39, '한줄 진단', '=' + joined, None, 'risk')
ws['B39'].alignment = Alignment(wrap_text=True, vertical='top')
ws.row_dimensions[39].height = 118

# ── 읽는 순서 41~44 ─────────────────────────────────────────────────────
banner(41, '■ 읽는 순서 — 이 세 줄만 보면 됩니다', F_HEAD2)
guide = [
    '1) B19 버퍼율 ① 이 120% 이상인가?   → 금액이 되는지',
    '2) B25 버퍼율 ② 가 100% 이상인가?   → 성과급 없이도 되는지',
    '3) B31 이 비과세인가?   → 무이자라면 원금이 B32 이하인지',
]
for i, g in enumerate(guide):
    r = 42 + i
    ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=3)
    ws.cell(r, 1, g).font = Font(name=ARIAL, size=10)

# ── 연도별 표 46~57 ─────────────────────────────────────────────────────
banner(46, '■ 연도별 누적  [자동 — 건드릴 것 없음]', F_HEAD, span=6)
hdr = ['연차', '연간 잉여', '누적 잉여', '원금 대비',
       '연간 잉여 (성과급 0)', '누적 잉여 (성과급 0)']
for i, h in enumerate(hdr, start=1):
    c = ws.cell(47, i, h)
    c.fill = F_CALC
    c.font = Font(name=ARIAL, bold=True)
    c.alignment = Alignment(horizontal='center', wrap_text=True)
    c.border = BOX

for n in range(1, 11):
    r = 47 + n                                  # 48~57
    a = ws.cell(r, 1, n)
    a.number_format = YEAR
    a.alignment = Alignment(horizontal='center')
    a.font = Font(name=ARIAL, bold=True)
    ws.cell(r, 2, '=ROUND($B$15*(1+$B$12)^({n}-1),0)-$B$16'.format(n=n))
    ws.cell(r, 3, '=B{r}'.format(r=r) if n == 1 else '=C{p}+B{r}'.format(p=r - 1, r=r))
    ws.cell(r, 4, '=IFERROR(C{r}/$B$9,"")'.format(r=r))
    ws.cell(r, 5, '=ROUND($B$5*12*(1+$B$12)^({n}-1),0)-$B$16'.format(n=n))
    ws.cell(r, 6, '=E{r}'.format(r=r) if n == 1 else '=F{p}+E{r}'.format(p=r - 1, r=r))
    for col in (2, 3, 5, 6):
        ws.cell(r, col).number_format = PLAIN
    ws.cell(r, 4).number_format = PCT
    for col in range(1, 7):
        ws.cell(r, col).border = BOX

for i, txt in enumerate([
    '초록색으로 칠해진 줄 = 그 해에 원금을 다 갚을 수 있다는 뜻 (성과급 포함 기준)',
    'E·F열은 성과급이 한 푼도 안 나온다고 가정한 경우입니다. 이 둘의 차이가 곧 성과급 의존도입니다.',
    '연간 잉여는 소득에만 상승률을 적용하고 지출은 고정으로 둡니다 (보수적 추정).',
]):
    ws.cell(59 + i, 1, txt).font = Font(name=ARIAL, size=9, color='7F7F7F')

ws.merge_cells('A63:F63')
d = ws['A63']
d.value = ('※ 사전 점검용 추산입니다. 실제 과세 판단은 개별 사실관계에 좌우되므로 '
           '실행 전 세무대리인 확인을 권합니다.')
d.font = Font(name=ARIAL, size=9, color='7F7F7F')
d.alignment = Alignment(wrap_text=True)

# ── 주석 ────────────────────────────────────────────────────────────────
for addr, text in {
    'B5': '급여명세서의 실지급액(공제 후)을 그대로 넣으세요. '
          '4대보험·소득세를 따로 계산할 필요가 없습니다.',
    'B6': '세후 기준입니다. 세전 금액만 안다면 대략 × 0.6 정도로 넣으세요.',
    'B12': '0으로 두면 급여가 전혀 오르지 않는다고 보고 계산합니다. '
           '국세청에 제시할 자료라면 0이 가장 안전합니다.',
    'B19': '성과급까지 포함한 전체 소득 기준입니다. 성과급은 이 계산에 '
           '이미 들어가 있습니다.',
    'B25': '성과급이 한 푼도 안 나온다고 가정했을 때의 버퍼율입니다. '
           '버퍼율 ①과 차이가 클수록 상환 계획이 성과급에 의존한다는 뜻입니다.',
    'B32': '상속세 및 증여세법 시행령 제31조의4 — 적정이자율 연 4.6%. '
           '무상대여 이익이 연 1천만원 이상이면 전액이 증여재산가액.',
}.items():
    ws[addr].comment = Comment(text, 'PCI 간편검증')

# ── 유효성 ──────────────────────────────────────────────────────────────
dv_money = DataValidation(type='decimal', operator='greaterThanOrEqual', formula1=0,
                          allow_blank=False, error='0 이상의 숫자를 입력하세요.')
ws.add_data_validation(dv_money)
for a in ['B5', 'B6', 'B7', 'B8', 'B9']:
    dv_money.add(ws[a])
dv_year = DataValidation(type='whole', operator='between', formula1=1, formula2=10,
                         allow_blank=False, error='1~10년 사이로 입력하세요.')
ws.add_data_validation(dv_year); dv_year.add(ws['B10'])
dv_rate = DataValidation(type='decimal', operator='between', formula1=0, formula2=1,
                         allow_blank=False, error='0% ~ 100% 사이로 입력하세요.')
ws.add_data_validation(dv_rate); dv_rate.add(ws['B11']); dv_rate.add(ws['B12'])

# ── 조건부 서식 ─────────────────────────────────────────────────────────
for kw, fill, color in [('충분', GREEN, '006100'), ('주의', AMBER, '9C6500'),
                        ('부족', RED, '9C0006')]:
    ws.conditional_formatting.add('B27', FormulaRule(
        formula=['ISNUMBER(SEARCH("{0}",B27))'.format(kw)],
        fill=fill, font=Font(color=color, bold=True)))

for rng in ['B19', 'B25']:
    ws.conditional_formatting.add(rng, CellIsRule(
        operator='greaterThanOrEqual', formula=['1.2'], fill=GREEN))
    ws.conditional_formatting.add(rng, CellIsRule(
        operator='lessThan', formula=['1'], fill=RED))

for rng in ['B17', 'B23', 'E48:F57']:
    ws.conditional_formatting.add(rng, CellIsRule(
        operator='lessThan', formula=['0'], font=Font(color='9C0006', bold=True)))

ws.conditional_formatting.add('B22', CellIsRule(
    operator='greaterThanOrEqual', formula=['0.3'], fill=AMBER))
ws.conditional_formatting.add('B31', FormulaRule(
    formula=['ISNUMBER(SEARCH("과세 대상",B31))'],
    fill=RED, font=Font(color='9C0006', bold=True)))
ws.conditional_formatting.add('B33', CellIsRule(
    operator='greaterThan', formula=['1'], fill=RED))
ws.conditional_formatting.add('B33', CellIsRule(
    operator='between', formula=['0.95', '1'], fill=AMBER))
ws.conditional_formatting.add('A48:F57', FormulaRule(
    formula=['$C48>=$B$9'], fill=GREEN))

# ── 레이아웃 ────────────────────────────────────────────────────────────
for col, w in [('A', 36), ('B', 22), ('C', 46), ('D', 12), ('E', 20), ('F', 20)]:
    ws.column_dimensions[col].width = w
ws.sheet_view.showGridLines = False
ws.freeze_panes = 'A3'

out = '/home/user/house-planner/sheets/pci-loan-check/PCI_간편검증.xlsx'
wb.save(out)
print('saved:', out)
