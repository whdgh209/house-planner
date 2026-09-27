# PT 노트

트레이너용 회원·운동일지 관리 웹앱입니다. 회원에게는 본인 운동일지만 보이는 링크를 보낼 수 있습니다.

- 트레이너 앱: `pt/index.html`
- 회원 보기: `pt/m.html#<공유토큰>` (앱의 회원 → 공유 탭에서 링크 생성)

## 지금 바로 써보기 (체험 모드)

`firebase-config.js`의 `firebaseConfig`가 `null`이면 체험 모드로 동작합니다.
데이터가 **그 기기 브라우저에만** 저장되므로 기능을 확인하는 용도로만 쓰세요.
체험 중 입력한 데이터는 설정 → 백업 파일 저장으로 받아 두었다가, Firebase 연결 후 백업 불러오기로 옮길 수 있습니다.

## 실제 사용 준비 (약 15분, 무료)

### 1. Firebase 프로젝트 만들기
1. https://console.firebase.google.com 에 트레이너(동생) 구글 계정으로 로그인
2. **프로젝트 추가** → 이름 예: `pt-note` → Google 애널리틱스는 꺼도 됨
3. 요금제는 **Spark(무료)** 그대로 둡니다

### 2. 로그인 켜기
- 빌드 → **Authentication** → 시작하기 → 로그인 방법 → **Google** 사용 설정
- Authentication → 설정 → **승인된 도메인**에 앱 주소 도메인 추가 (예: `whdgh209.github.io`)

### 3. 데이터베이스 만들기
- 빌드 → **Firestore Database** → 데이터베이스 만들기 → 위치 `asia-northeast3 (서울)` → **프로덕션 모드**
- **규칙** 탭에 `pt/firestore.rules` 내용을 붙여넣고, `trainer@gmail.com`을 트레이너 이메일로 바꾼 뒤 **게시**

### 4. 앱에 설정값 넣기
- 프로젝트 설정(톱니바퀴) → 일반 → 내 앱 → **웹 앱 추가(</>)** → 표시되는 `firebaseConfig` 값을 복사
- `pt/firebase-config.js`에서
  - `export const firebaseConfig = null;` 을 복사한 값으로 교체
  - `TRAINER_EMAILS`를 트레이너 이메일로 교체 (규칙 파일과 같게)

### 5. 주소 만들기 (GitHub Pages)
- GitHub 저장소 → Settings → Pages → Branch 선택 후 Save
- 주소: `https://<아이디>.github.io/house-planner/pt/`
- 폰에서 열고 **홈 화면에 추가** → 앱처럼 사용

## 보안 메모
- Firebase 설정값(apiKey 등)은 공개돼도 되는 값입니다. 실제 보호는 `firestore.rules`가 합니다.
- 회원 정보·상담 내용·계약은 트레이너 계정만 읽고 쓸 수 있습니다.
- 회원 링크로는 `shares/<토큰>` 문서 1건(이름, 잔여 회차, 운동일지)만 읽힙니다. 공유를 끄거나 링크를 새로 만들면 이전 링크는 바로 막힙니다.
- 회원 개인정보를 코드 저장소에 올리지 마세요.

## 파일 구성
| 파일 | 역할 |
|---|---|
| `index.html`, `app.js` | 트레이너 화면 (홈, 일지, 회원, 설정) |
| `calendar.js` | 캘린더 (주간·월간, 수업 예약, 개인 일정·휴무) |
| `core.js` | 화면들이 함께 쓰는 저장·공유·도우미 |
| `m.html`, `m.js` | 회원 보기 페이지 (읽기 전용) |
| `store.js` | 저장소 (Firestore / 체험 모드) |
| `growth-view.js`, `charts.js` | 성장 그래프 (트레이너 앱·회원 페이지 공용) |
| `sigpad.js` | 손가락 서명 패드 |
| `ics.js` | 구글 캘린더 내보내기(.ics) 파일 읽기 |
| `logic.js` | 날짜, 계약, 잔여 회차, 공휴일 계산 (공휴일은 매년 추가) |
| `kakao.js` | 카톡 문구 만들기, 카톡 기록 읽기 |
| `exercises.js` | 종목 사전 초기값 |
| `firestore.rules` | Firestore 보안 규칙 |
