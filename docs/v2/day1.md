# StudyLog-AI v2 — Day 1: 관리자 대시보드

> v2 작업 기록. v1까지의 전체 과정은 `docs/v1/PLAN.md` ~ `PLAN5.md`, `docs/v1/ARCHITECTURE.md` 참고.
> v2 전체 로드맵은 `next.md` 참고 — 오늘은 그중 1번 항목(관리자 대시보드)을 처음부터 끝까지 구현.

---

## 오늘 한 일 요약

| 구분 | 내용 | 상태 |
|---|---|---|
| 설계 | 관리자 계정 체계: 별도 관리자 테이블이 아니라 기존 `User`에 `is_admin` 플래그만 추가하는 방식으로 결정 | ✅ 완료 |
| 설계 | "API 요청량"의 의미를 OpenAI 사용량/예상 비용 추적으로 구체화, "실시간 온라인"을 접속 현황 기능으로 채택 | ✅ 완료 |
| 백엔드 | `is_admin` 플래그 + 마이그레이션 + `get_current_admin_user` 의존성 | ✅ 완료 |
| 백엔드 | OpenAI 사용량/비용 자체 로깅 (`openai_usage_logs` 테이블 + 기능별 집계 API) | ✅ 완료 |
| 백엔드 | 웹소켓 기반 실시간 접속 현황 (`PresenceManager`, `/api/ws/presence`) | ✅ 완료 |
| 프론트엔드 | 관리자 대시보드 페이지 (`AdminDashboard.jsx`) + 라우트 가드 + 사이드바 메뉴 | ✅ 완료 |
| 프론트엔드 | 앱 전역에서 접속 상태를 유지하는 `PresenceConnector` 마운트 | ✅ 완료 |
| 배포 | 로컬 검증 → 커밋/푸시 → EC2 배포 → 마이그레이션 → 트러블슈팅 3건 해결 | ✅ 완료 |

---

## 설계 결정

### 관리자 계정 체계
"나도 사용하는 서비스인데, 기존 회원 중 관리자가 되면 관리자 페이지를 따로 볼 수 있게 하고 싶다"는 요구사항. 별도의 관리자 전용 계정/로그인 체계를 새로 만드는 대신, 기존 `User` 모델에 `is_admin: bool` 플래그 하나만 추가하는 쪽으로 결정. 회원가입으로는 절대 `true`가 될 수 없고 DB에서 직접 켜야만 하는 값으로 설계 — 별도 인증 체계를 만드는 것보다 훨씬 적은 코드로, 하지만 여전히 안전하게 목적을 달성함.

### 접속 현황 vs. 단순 접속 로그
"포트폴리오로 볼 때 실시간 온라인이 더 잘 먹힐 것 같다"는 판단에 따라, 단순히 마지막 로그인 시각을 보여주는 방식 대신 웹소켓으로 "지금 이 순간 접속 중인 사용자"를 보여주는 방식을 채택. 단일 인스턴스 앱이라 Redis 같은 pub/sub 없이 인메모리 `dict[user_id, set[WebSocket]]`로 충분하다고 판단.

### OpenAI 사용량 추적
"API 요청량"이라는 표현이 정확히 뭘 의미하는지 먼저 확인하는 과정을 거침 — 실제 OpenAI 청구서 API 연동이 아니라, "지금 OpenAI를 어느 정도 쓰고 있고 한 달에 얼마 정도 나올지" 감을 잡기 위한 자체 추정치임을 확인하고 그 방향으로 구현. 각 OpenAI 호출 지점(임베딩/챗봇/퀴즈 생성)에서 응답의 `usage` 필드를 그대로 기록하고, 모델별 단가표로 비용을 추정하는 방식.

---

## 백엔드 구현

### `is_admin` 플래그
`backend/app/models/user.py`에 `is_admin = Column(Boolean, nullable=False, server_default="0")` 추가하고 마이그레이션(`b2f6e8a4c9d1`) 생성. `core/dependencies.py`에 `get_current_admin_user` 의존성을 추가해, 관리자가 아니면 403을 반환하도록 함.

로그인 응답(`auth_service.authenticate_user`)이 `UserResponse` 스키마를 거치지 않고 직접 dict를 만들어 반환하는 구조라, `is_admin`을 깜빡하고 안 넣으면 로그인 직후 프론트엔드가 관리자 여부를 몰라서 메뉴가 안 뜨는 문제가 있었음 — 발견 즉시 dict에 `"is_admin": user.is_admin` 추가해서 해결.

### OpenAI 사용량 추적
`backend/app/models/usage.py`의 `OpenAIUsageLog` 모델(기능/모델/토큰수/예상비용)과 마이그레이션(`c5d7f0b3a8e2`) 추가. `services/ai/usage_service.py`에 모델별 단가표(`PRICING_PER_MILLION_TOKENS`)와 `record_usage()` 함수를 만들어, 임베딩(`embedding_service.py`)·챗봇(`graph_service.py`)·퀴즈 생성(`quiz_service.py`) 세 곳의 OpenAI 호출 직후에 각각 기록하도록 연결. 비동기 서비스와 동기 백그라운드 작업(임베딩 인덱싱) 양쪽에서 공통으로 써야 해서, `AsyncSession`과 무관하게 매번 새로 여는 동기 `pymysql` 커넥션으로 기록하고, 실패해도 예외를 전부 삼켜서 로깅 실패가 실제 서비스 기능을 절대 깨지 않도록 함.

`get_usage_summary()`는 이번 달 데이터를 기능별로 집계해 `{month_start, total_estimated_cost_usd, by_feature: [...]}` 형태로 반환.

### 웹소켓 접속 현황
`services/presence_service.py`의 `PresenceManager`가 `dict[user_id, set[WebSocket]]`으로 연결을 관리. `routers/presence_router.py`가 `/api/ws/presence?token=...` 엔드포인트를 열고 (네이티브 WebSocket API는 커스텀 헤더를 못 보내서 쿼리 파라미터로 토큰을 받음) JWT를 검증한 뒤 연결을 등록. `routers/admin_router.py`의 `GET /api/admin/online-users`가 현재 접속 중인 user_id 목록으로 사용자 정보를 조회해 반환.

---

## 프론트엔드 구현

- `frontend/src/pages/AdminDashboard.jsx`: 접속 중 사용자 목록(10초 폴링) + OpenAI 사용량/비용 패널(30초 폴링). 기존 `SettingsPage.jsx`의 `SidebarLayout` + 카드형 `<section>` 레이아웃 패턴을 그대로 따름.
- `frontend/src/components/PresenceConnector.jsx`: 화면에 아무것도 그리지 않고 웹소켓 연결만 유지하는 컴포넌트. `App.js`에서 라우트 밖, `<AuthProvider>` 안에 마운트해서 페이지를 이동해도 연결이 끊기지 않게 함. 연결이 끊기면 5초 뒤 자동 재연결.
- `App.js`: `/admin-dashboard` 라우트를 `PrivateRoute`(로그인 여부) + `AdminRoute`(관리자 여부, 아니면 `/`로 리다이렉트)로 이중 가드.
- `Sidebar.jsx`: `user?.is_admin`일 때만 관리자 대시보드 메뉴 노출.

---

## 트러블슈팅

### 1. 로컬 마이그레이션 시 "테이블이 이미 있다" 에러
`alembic upgrade head` 실행 시 `openai_usage_logs` 테이블 생성 단계에서 `(1050, "Table already exists")` 에러 발생. 원인은 `backend/app/main.py`의 `lifespan`에서 매 서버 시작마다 `Base.metadata.create_all()`을 호출하는데, 새 마이그레이션을 돌리기 전에 백엔드를 한 번이라도 띄우면 `usage.py`의 새 모델이 이미 import된 상태라 테이블이 먼저 만들어져 버림. 실제 스키마는 모델과 이미 일치하므로, 마이그레이션을 재실행하는 대신 `alembic stamp c5d7f0b3a8e2`로 "이미 적용된 것"으로만 표시해서 해결. (`CLAUDE.md`에 이미 문서화된 알려진 패턴.)

### 2. Git 커밋 시 대량의 줄바꿈 diff
커밋 전 `git status`를 보니 이번 세션에서 건드리지 않은 파일까지 전부 "modified"로 표시됨. 원인은 로컬 파일이 CRLF, 저장소에는 LF로 저장되어 있어서 생기는 줄바꿈 차이(Windows git의 `core.autocrlf` 동작)였고 실제 내용 변경은 아니었음. `git add -A` 대신 이번에 실제로 작업한 파일만 명시적으로 골라서 add하는 방식으로 우회.

### 3. EC2 배포 후 로그인 실패 (502)
배포 후 로그인이 계속 실패. `docker compose logs frontend`로 확인해보니 nginx가 `connect() failed (111: Connection refused)`로 backend에 연결을 못 하고 있었음 — 원인은 `docker compose up -d`로 backend가 재기동되며 새 내부 IP를 받았는데, nginx(frontend 컨테이너)가 이전 IP를 캐싱하고 있었던 것(백엔드 자체는 컨테이너 내부에서 확인해보니 정상 응답). `docker compose restart frontend`로 nginx가 새 IP를 다시 찾게 하면서 해결.

### 4. 접속 현황에 본인이 안 뜸
로그인은 되는데 관리자 대시보드의 "지금 접속 중" 목록이 비어 있음. 원인은 `frontend/nginx.conf`의 `/api/` 프록시 블록에 웹소켓 업그레이드 헤더(`proxy_http_version 1.1`, `Upgrade`, `Connection: upgrade`)가 없어서, 브라우저의 웹소켓 핸드셰이크가 nginx를 통과하지 못하고 조용히 실패하고 있었던 것. nginx.conf에 해당 헤더를 추가하고 frontend 컨테이너를 재빌드/재기동해서 해결 — 배포 가이드 작성 때 미리 파악해뒀던 항목이었는데, 실제로 이 시점에서 필요해짐.

---

## 다음에 할 것 (Day 1 시점)

`next.md`의 나머지 항목들 (모바일 앱 배포, 점검 모드, 퀴즈 개선 등) — 순서는 다음 세션에서 다시 논의.

---

# Day 2: 소개/문의 페이지 + 점검모드

> `next.md` 우선순위 2번(소개/문의 페이지)과 3번(점검모드)을 처음부터 끝까지 구현.

---

## 오늘 한 일 요약

| 구분 | 내용 | 상태 |
|---|---|---|
| 백엔드 | `Contact` 모델 + 마이그레이션, 공개 제출 API(`POST /api/contacts`, IP당 rate limit) + 관리자 조회/읽음처리 API | ✅ 완료 |
| 백엔드 | 점검모드 플래그 파일 서비스, 관리자 on/off/상태 API, `/api/health` 공개 헬스체크 | ✅ 완료 |
| 프론트엔드 | 랜딩페이지에 FAQ + 문의 폼, 기능 카드를 4개(노트/AI퀴즈/할일·캘린더/RAG검색)로 보강 | ✅ 완료 |
| 프론트엔드 | `ContactSection` 컴포넌트 분리 + 로그인 사용자용 `/contact` 페이지 + 사이드바 메뉴 | ✅ 완료 |
| 프론트엔드 | 관리자 대시보드에 "문의함" + "점검모드" 토글 섹션 | ✅ 완료 |
| 프론트엔드 | 점검모드 감지용 `useMaintenanceStatus` 훅 + `MaintenancePage` + `App.js` 게이트 | ✅ 완료 |
| 인프라 | `nginx.conf` 점검모드 플래그 체크(관리자/로그인 경로는 항상 우회) + `docker-compose` 공유 볼륨 | ✅ 완료 |
| 인프라 | `deploy.yml`에 배포 시작 시 점검모드 ON, 마이그레이션 성공 시 OFF 자동 연동 | ✅ 완료 |
| 버그수정 | 422 검증 에러의 `detail`이 객체 배열로 오는 경우 화면이 깨지는 문제, 9개 파일 일괄 수정 | ✅ 완료 |
| 버그수정 | 로컬 개발(nginx 없이 직접 접속) 환경에서 점검모드가 감지되지 않던 문제 수정 | ✅ 완료 |

---

## 설계 결정

### 문의 알림 방식
이메일 알림(Resend 등) 대신, 관리자 계정이 이미 있으니 관리자 대시보드 "문의함"에서 직접 확인하는 방식으로 결정. 외부 이메일 서비스 연동이나 API 키 관리 없이 더 적은 코드로 같은 목적을 달성함.

### 점검모드 우회 경로
점검모드가 켜지면 nginx가 `/api/` 전체를 차단하는데, 그러면 관리자도 다시 끌 방법이 없어짐. `/api/admin/*`와 `/api/auth/login` 두 경로만 항상 우회하도록 설계해서, 관리자는 점검 중에도 로그인 + 대시보드 접근이 가능하도록 함.

### 로컬 개발 환경 대응
점검모드 차단을 원래 nginx 레벨에서만 하도록 설계했는데, `npm start` + `uvicorn`으로 직접 붙는 로컬 개발 환경엔 nginx가 없어서 전혀 동작하지 않는 문제를 뒤늦게 발견. 백엔드의 `/api/health` 자체도 같은 플래그를 확인하도록 이중화해서, 배포 환경(nginx 뒤)과 로컬 환경 둘 다 동작하게 함.

---

## 백엔드 구현

### 문의(Contact)
`backend/app/models/contact.py`의 `Contact` 모델(name/email/message/is_read) + 마이그레이션(`d4f6b8e1a2c7`). `POST /api/contacts`는 로그인 없이 누구나 제출 가능한 공개 엔드포인트라 IP당 5분에 5회로 rate limit을 걸어 스팸을 방지. `GET /api/admin/contacts`, `PATCH /api/admin/contacts/{id}/read`는 관리자 전용.

### 점검모드
`backend/app/services/maintenance_service.py`가 플래그 파일(`MAINTENANCE_FLAG_PATH`, 로컬 기본값 `./maintenance/ON`, docker-compose에서는 `/shared/maintenance/ON`으로 오버라이드) 존재 여부로 on/off를 판단. `GET/POST /api/admin/maintenance*`로 관리자가 토글. `/api/health`는 공개 엔드포인트인데, 점검모드면 503을 응답 - 처음엔 nginx만 이 체크를 하도록 설계했다가, 로컬 개발 환경 대응을 위해 백엔드에도 같은 체크를 추가함.

---

## 프론트엔드 구현

- `LandingPage.jsx`: FAQ + 문의 폼(`ContactSection`) 추가, 기능 카드를 4개(노트/AI퀴즈/할일·캘린더/RAG검색)로 보강해 `next.md`의 소개 페이지 스펙(핵심 기능 4가지를 사용자 관점에서 설명)을 충족시킴.
- `components/ContactSection.jsx`: FAQ 아코디언 + 문의 폼을 재사용 가능한 컴포넌트로 분리 - 로그인 여부와 무관하게 같은 UI를 랜딩페이지와 로그인 후 `/contact` 페이지 양쪽에서 사용.
- `pages/ContactPage.jsx` + 사이드바 "문의하기" 메뉴: 로그인한 사용자도 문의 폼에 접근할 수 있도록 추가 (원래 랜딩페이지는 비로그인 사용자에게만 보여서, 로그인 후엔 문의할 방법이 없었음).
- `pages/AdminDashboard.jsx`: "문의함"(안읽음 뱃지 + 목록 + 읽음처리)과 "점검모드"(상태 표시 + on/off 버튼) 섹션 추가.
- `hooks/useMaintenanceStatus.js` + `pages/MaintenancePage.jsx` + `App.js`의 `MaintenanceGate`: `/api/health`를 20초 간격으로 폴링해서 점검 중이면 관리자를 제외한 모두에게 점검 페이지를 보여줌. `/login`만 예외로 통과시켜서 관리자가 로그인은 계속 할 수 있게 함.

---

## 인프라

- `frontend/nginx.conf`: `/api/admin/`, `/api/auth/login`은 항상 백엔드로 통과, 나머지 `/api/`는 점검모드 플래그 파일이 있으면 백엔드까지 가지 않고 바로 503(JSON)을 응답.
- `docker-compose.yml`: 백엔드/프론트엔드 컨테이너가 `./maintenance` 호스트 디렉토리를 공유 볼륨으로 마운트.
- `.github/workflows/deploy.yml`: `set -e`로 스크립트를 구성해서, 배포 시작 시 점검모드 ON → git pull/빌드/마이그레이션 → 성공하면 OFF. 중간 어디서든 실패하면 스크립트가 그 자리에서 멈춰서 점검모드가 계속 켜진 채로 남음(깨진 화면 대신 점검 페이지 노출).

---

## 트러블슈팅

### 1. `detail`이 배열로 와서 화면이 깨짐
FastAPI가 요청 자체를 검증(422)하며 자동 생성하는 에러는 `detail`이 `{type, loc, msg, ...}` 객체 배열인데, 로그인/회원가입/설정/글쓰기/글수정/퀴즈/사이드바/홈/전체폴더보기 등 9개 파일이 이 값을 항상 문자열이라고 가정하고 그대로 렌더링하고 있어서 "Objects are not valid as a React child" 에러가 발생. `frontend/src/utils/errors.js`의 `getErrorMessage` 헬퍼로 배열이면 메시지들을 합쳐 문자열로 정규화하도록 전부 교체.

### 2. 로컬 개발 환경에서 점검모드가 감지되지 않음
점검모드 차단을 nginx에서만 하도록 설계했는데, `npm start` + `uvicorn`으로 직접 붙는 로컬 개발 환경엔 nginx가 없어서 `/api/health`가 점검모드 여부와 상관없이 항상 200을 응답하고 있었음. 백엔드의 `/api/health`도 같은 플래그를 직접 확인하도록 수정해서 해결.

### 3. 로그인 후엔 소개/문의 페이지에 접근할 방법이 없음
랜딩페이지(FAQ+문의폼 포함)는 비로그인 상태(`/`)에서만 보이도록 되어 있어서, 로그인한 기존 사용자는 문의를 남길 방법이 없었음. `ContactSection`을 재사용 가능한 컴포넌트로 분리하고, 로그인 사용자용 `/contact` 페이지 + 사이드바 메뉴를 추가해서 해결.

---

## 다음에 할 것

`next.md`의 나머지 항목들(Quiz 고도화, 리소스 비용 최소화, 모바일 앱 배포) — 순서는 다음 세션에서 다시 논의.
