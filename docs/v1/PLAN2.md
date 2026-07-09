# StudyLog-AI — 베타 배포 이후 개발 계획 및 진행 상황

> `PLAN.md`의 후속 문서. 회원가입/기능 구현 ~ AWS EC2 베타 배포 + GitHub Actions CI/CD 구축까지의
> 전체 과정은 `PLAN.md`에 정리되어 있음. 이 문서는 베타 배포 완료 시점부터 이어지는 작업을 기록함.

---

## 전체 구현 계획 및 진행 상황

| Phase | Step | 내용 | 상태 |
|---|---|---|---|
| Phase 7 | 보완 | fail2ban 설치 (SSH 무차별 대입 방어) | ✅ 완료 |
| Phase 8 | UI | 사이드바 접힘 시 재오픈 버튼-헤더 겹침/단차 수정 | ✅ 완료 |
| Phase 8 | UI | "기본" 폴더 하드코딩 제거 + 진짜 카테고리로 전환 | ✅ 완료 |
| Phase 8 | UI | 폴더/노트 드래그 앤 드롭 (순서 변경, 하위 폴더화, 노트 이동) | ✅ 완료 |
| Phase 9 | UI | 할 일 캘린더 패널 개편 + 세부사항(시작시간/메모) 입력 방식 변경 | ✅ 완료 |
| Phase 9 | UI | 전역 폰트에 Pretendard 추가 (화살표+한글 자간 벌어짐 수정) | ✅ 완료 |
| Phase 9 | UI | 퀴즈 페이지 하위 폴더 노트 미표시 + 전체화면 새 창 문제 수정 | ✅ 완료 |

---

## Phase 7 보완 — fail2ban 설치

EC2 보안 그룹의 SSH(22) 인바운드를 GitHub Actions CI/CD 배포를 위해 `0.0.0.0/0`(전체 허용)으로 열어둔 것에 대한 추가 방어층으로 설치.

### 내용
```
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
```
기본 설정 그대로 사용 — SSH 로그인 반복 실패 시 해당 IP를 자동으로 일정 시간 차단. `.pem` 키 기반 인증만 허용되는 상태라 원래도 실질적 침해 위험은 낮았지만, 무차별 대입 시도 자체를 줄여서 로그 노이즈와 리소스 낭비를 함께 줄이는 목적.

### 검증
`sudo systemctl status fail2ban`으로 `active (running)` 상태 확인 완료.

---

## Phase 8 UI — 사이드바 접힘 시 재오픈 버튼 겹침/단차 수정

### 배경
왼쪽 사이드바(`SidebarLayout`)를 접으면 좌측 상단에 재오픈 버튼(`fixed top-4 left-4`)이 뜨는데, 이 버튼이 실제 레이아웃 공간을 차지하지 않는 `fixed` 요소라 페이지 헤더의 제목 텍스트와 겹치는 문제가 있었음. 여러 차례 반복 수정 시도:
1. 버튼을 flex 자식으로 바꿔 실제 공간 차지 → 버튼 스타일/느낌이 원하는 것과 다름
2. 버튼 앞에 헤더와 같은 배경색 박스를 겹쳐서 배치 → 색은 맞았지만 박스 높이를 페이지마다 고정 픽셀(`h-[60px]`)로 추정해야 해서, Dashboard 이외의 페이지(예: HomePage)에서 실제 헤더 높이와 안 맞아 미세한 "단차"(높이 어긋남)가 눈에 보이는 문제 발생

근본 원인은 "헤더 바깥에서 헤더의 배경/높이를 추정"하는 접근 자체였음. 페이지마다 헤더 내부 구조(제목만 있는지, 배지/버튼이 더 있는지)가 달라 실제 렌더링 높이가 조금씩 다르기 때문.

### 해결
`SidebarLayout.jsx`에 `SidebarCollapsedContext`(접힘 여부)를 만들고, 헤더 바깥에 별도 박스를 겹치는 대신 각 페이지의 헤더 "안"에 여백용 컴포넌트 `<SidebarSpacer />`를 첫 자식으로 넣는 방식으로 변경. `SidebarSpacer`는 접혔을 때만 `w-6`짜리 빈 공간을 렌더링해서 재오픈 버튼과 헤더 텍스트가 겹치지 않을 만큼만 밀어줌. 헤더 자신의 배경/테두리/높이를 그대로 쓰는 것이므로 색상이나 높이를 별도로 맞출 필요가 없어져 단차 문제가 구조적으로 사라짐.

`SidebarLayout`을 사용하는 6개 페이지 중 헤더에 제목 텍스트가 있는 5곳(`Dashboard.jsx`, `HomePage.jsx`, `TodoPage.jsx`, `QuizPage.jsx`, `SettingsPage.jsx`)의 헤더 첫 자식으로 `<SidebarSpacer />` 추가. `DocumentsPage.jsx`는 헤더 자체가 없어(준비 중 안내 문구만 중앙 표시) 수정 대상에서 제외.

### 만든/수정 파일
- `frontend/src/components/SidebarLayout.jsx` — `SidebarCollapsedContext`, `SidebarSpacer` export 추가; 접힘/펼침 양쪽 분기 모두 `SidebarCollapsedContext.Provider`로 감싸도록 변경; 기존 `h-[60px]` 추정 박스 제거
- `frontend/src/pages/Dashboard.jsx`, `HomePage.jsx`, `TodoPage.jsx`, `QuizPage.jsx`, `SettingsPage.jsx` — 각 헤더 첫 자식으로 `<SidebarSpacer />` 추가 (`SettingsPage`는 헤더에 flex 래퍼도 없어서 함께 추가)

### 검증
변경된 6개 파일을 `eslint --parser-options=ecmaVersion:2022,sourceType:module,ecmaFeatures:{jsx:true}`로 파싱해 문법 오류 없음 확인.

추가로 노트 상세 페이지(`PostDetailPage.jsx`) 우측 AI 챗봇 패널(`ResizableRightPanel`)의 접힘 재오픈 버튼도 동일한 스타일로 통일 - 기존엔 흰 배경/테두리/그림자가 있는 카드 형태였는데, 왼쪽 사이드바 버튼처럼 배경 없이 아이콘만 있는 형태로 변경(`frontend/src/components/ResizableRightPanel.jsx`). 우측 패널은 원래부터 fixed가 아닌 실제 flex 컬럼이라 겹침 문제는 없었고, 이번 변경은 시각적 통일성 목적. eslint 파싱 검증 완료.

### 추가 — 노트 상세 페이지에 좌측 사이드바 추가

`PostDetailPage.jsx`는 원래 `SidebarLayout`을 쓰지 않고 본문 + 우측 AI 패널만 있는 구조였음(다른 5개 페이지와 다르게 좌측 사이드바 자체가 없었음). 이를 다른 페이지들과 동일하게 `SidebarLayout`으로 감싸서 좌측 사이드바를 열고 닫을 수 있게 변경.

- `handleSelectCategory` 추가 (다른 페이지와 동일하게 `/notes` 또는 `/notes?category=ID`로 이동)
- `selectedCategoryId`는 현재 보고 있는 노트의 `category_id`로 전달해 사이드바에서 해당 카테고리가 하이라이트되도록 함
- 헤더의 breadcrumb 영역 첫 자식으로 `<SidebarSpacer />` 추가 (다른 페이지와 동일한 패턴)
- 로딩/에러 상태의 조기 반환(early return)도 `SidebarLayout`으로 감싸서, 로딩 중에도 사이드바가 바로 보이도록 함

eslint 파싱 검증 완료.

### 추가 — "기본" 폴더를 진짜 카테고리(DB row)로 전환

사용자가 원한 최종 방향: "기본"이 다른 폴더와 기능적으로 완전히 동일해야 함(이름변경/삭제/하위폴더 다 가능) — 최상위에 고정된 특수 폴더라는 개념 자체를 없앰.

**백엔드**
- `backend/app/models/post.py`: `Category`에 `is_default` Boolean 컬럼 추가. 사용자가 카테고리를 지정하지 않고 쓴 글이 자동 배정되는 대상임을 표시하는 내부 플래그일 뿐, 이름을 바꿔도(예: "Inbox") 계속 기본 배정 대상으로 동작함.
- `backend/alembic/versions/f3c8a1d29b4e_add_is_default_to_categories.py` (새 마이그레이션, head 반영): `is_default` 컬럼 추가 + 데이터 백필 — `category_id IS NULL`인 글이 있는 사용자마다 "기본" 카테고리를 실제로 생성하고, 그 글들을 전부 이 카테고리로 이동.
- `backend/app/services/category_service.py`: `get_or_create_default_category()` 추가. `get_categories()` 호출 시 기본 카테고리가 없으면 먼저 만들어서, 다른 폴더들과 함께 자연스럽게 목록에 포함되도록 함.
- `backend/app/services/post_service.py`: `create_post`/`update_post`에서 `category_id`가 None이면 `get_or_create_default_category()`로 실제 "기본" 카테고리에 배정 (더 이상 `category_id`가 NULL로 남지 않음).
- 기본 카테고리 삭제도 다른 폴더와 동일하게 허용 — 삭제되면 다음에 카테고리 없이 글을 쓸 때 새 "기본"이 자동으로(self-healing) 다시 생성됨.

**프론트엔드**
- `frontend/src/components/Sidebar.jsx`: 하드코딩됐던 "기본" 버튼/우클릭 메뉴 분기를 전부 제거. 이제 "기본"도 `categories.map()`에서 다른 폴더와 완전히 동일한 `CategoryItem`으로 렌더링되어 이름변경/삭제/하위폴더추가가 다 가능함. `rootMenu`의 "default"/"empty" 모드 구분도 필요 없어져 단순화함.

**반영 방법 (중요)**
DB 스키마 변경이 있는 마이그레이션이라 `git pull` 후 반드시 실행 필요:
```
docker compose exec backend alembic upgrade head
```
(로컬에서 uvicorn으로 직접 돌리는 중이면 `cd backend && alembic upgrade head`)

Python 문법은 `py_compile`로 검증 완료. `Sidebar.jsx`는 샌드박스 bash 마운트가 이 세션에서 유독 이 파일에 대해 정상 저장 이후에도 이전 버전(끝부분에 잘못된 바이트 포함)을 계속 보여주는 캐시 문제가 있어 bash 상의 eslint 검증은 신뢰할 수 없었음 — Read/Write 도구 기준(실제 저장되는 내용)으로 직접 검토해 문법 이상 없음을 확인함. 로컬에서 npm start/Docker 재시작 후 실제로 문제없이 렌더링되는지 확인 필요.

### 추가 — 폴더 우클릭 메뉴가 여러 개 겹쳐서 열리는 버그 수정

여러 폴더를 연달아 우클릭하면 이전 폴더의 메뉴가 안 닫히고 새 메뉴가 계속 쌓여서 열리는 문제 발생. 원인은 각 `CategoryItem`이 우클릭 메뉴 상태(`menuPos`)를 자기 것만 따로 들고 있었기 때문 - 우클릭(`contextmenu`)은 `click` 이벤트가 아니라서, 다른 폴더의 "바깥 클릭 시 닫기" 리스너가 반응하지 않았음.

`Sidebar.jsx`에서 우클릭 메뉴 상태(`contextMenu: {x, y, categoryId}`)를 `Sidebar` 컴포넌트 하나가 소유하도록 끌어올리고, 모든 `CategoryItem`에 props로 내려줌. 상태가 하나뿐이므로 새 폴더를 우클릭하면 자동으로 이전 메뉴가 닫힘(구조적으로 여러 개가 동시에 열릴 수 없음). 빈 공간 우클릭 메뉴도 같은 상태를 공유(`categoryId: null`).

### 추가 — 사이드바 폴더 트리에서 "기본" 종속 구조 제거

---

## Phase 8 UI — 폴더/노트 드래그 앤 드롭

사이드바에서 마우스로 끌어서: (1) 폴더 순서 변경(같은 레벨에서 위/아래 재배치), (2) 폴더를 다른 폴더 안으로 옮겨서 하위 폴더화, (3) 노트 목록에서 노트를 드래그해 다른 폴더로 이동 - 세 가지를 모두 구현.

### 백엔드

- `backend/app/models/post.py`: `Category`에 `order_index` 컬럼 추가(형제 카테고리 간 정렬 순서). `children` relationship에 `order_by="Category.order_index"` 지정.
- `backend/alembic/versions/a1b2c3d4e5f6_add_order_index_to_categories.py` (새 마이그레이션, head 반영): 컬럼 추가 + 기존 카테고리들은 형제 그룹(부모 기준)별로 지금까지의 이름순 그대로 0,1,2...를 채워 넣어 순서가 갑자기 뒤바뀌지 않도록 함.
- `backend/app/services/category_service.py`:
  - `get_categories()` 정렬 기준을 이름순 → `order_index`순으로 변경.
  - `create_category()`: 새 폴더는 형제들 맨 뒤(`order_index = 형제 수`)에 추가되도록 변경.
  - `reorder_categories(items, user_id, db)` 추가 - 프론트가 사용자 소유 카테고리 전체를 `{id, parent_id, order_index}` 스냅샷으로 통째로 보내면, 소유권 검증 → 순환 참조 검증(자기 자신의 하위로 옮기는 시도 차단) → 3단계 깊이 초과 검증을 거친 뒤 한 번에 반영. 부분 diff 대신 전체 스냅샷 방식이라 상태 불일치 위험이 없음.
- `backend/app/schemas/category.py`: `CategoryReorderItem`, `CategoryReorderRequest` 추가.
- `backend/app/routers/category_router.py`: `PUT /api/categories/reorder` 추가.
- `backend/app/schemas/post.py`: `PostMoveRequest`(카테고리만 가볍게 변경) 추가.
- `backend/app/services/post_service.py`: `move_post()` 추가 - 노트 드래그로 폴더 이동 시 제목/본문 등은 그대로 두고 카테고리만 바꿈 (카테고리를 안 주면 기존 로직과 동일하게 "기본"으로 배정).
- `backend/app/routers/post_router.py`: `PATCH /api/posts/{id}/category` 추가.

### 프론트엔드

- `frontend/src/api/categories.js`: `reorderCategories(items, token)` 추가.
- `frontend/src/api/posts.js`: `movePost(postId, categoryId, token)` 추가.
- `frontend/src/components/Sidebar.jsx`:
  - 폴더 행(`CategoryItem`)에 HTML5 드래그 앤 드롭(`draggable`, `onDragStart/onDragOver/onDrop`) 적용. 마우스가 행의 위 25%/아래 25%/가운데 50% 중 어디 있는지로 "앞에 삽입 / 뒤에 삽입 / 하위로 이동"을 구분하고, 해당 위치에 파란 선/테두리로 시각적 표시.
  - 드래그 상태(`draggingId`, `dragOver`)는 `Sidebar` 컴포넌트가 소유하고 모든 `CategoryItem`에 props로 내려줌(재귀 트리 전체에서 하나의 드롭 대상만 표시되도록).
  - 드롭 시 카테고리 트리를 깊은 복사해서 노드 제거→재삽입 후, 트리 전체를 평탄화해 `reorderCategories` 호출(낙관적 업데이트 후 서버 응답으로 재동기화, 실패 시 알림 + 원상 복구).
  - 노트 드래그를 구분하기 위해 `POST_DRAG_TYPE`("application/x-studylog-post")라는 `dataTransfer` 타입을 export - 노트 드래그일 땐 항상 "이 폴더로 이동"으로 처리(형제 삽입 개념 없음).
  - 폴더 목록의 빈 공간에 드롭하면 최상위(부모 없음) 맨 뒤로 이동.
  - 노트가 옮겨지면 `window.dispatchEvent(new Event("studylog:posts-changed"))`로 전역 이벤트를 쏨 - Sidebar와 노트 목록 페이지가 형제 컴포넌트라 props로 직접 콜백을 못 넘기기 때문.
- `frontend/src/pages/HomePage.jsx`: 노트 카드에 `draggable` + `onDragStart`(POST_DRAG_TYPE으로 노트 id 실어보냄) 추가, 드래그 중인 카드는 반투명 표시. `studylog:posts-changed` 이벤트를 구독해서 노트가 옮겨지면 목록을 다시 불러옴.
- `frontend/src/i18n/locales/{ko,en}.json`: `sidebar.moveFailed`, `sidebar.moveIntoOwnSubfolder` 키 추가.

### 반영 방법 (중요)

이번에도 DB 스키마 변경(`order_index` 컬럼)이 있어서 `git pull` 후 마이그레이션 필요:
```
docker compose exec backend alembic upgrade head
```
(로컬 uvicorn이면 `cd backend && python -m alembic upgrade head` — Windows에서 `alembic.exe`가 Application Control 정책에 막히면 `alembic` 대신 `python -m alembic`으로 실행)

### 검증

백엔드는 `py_compile`로 전체 파일 문법 검증 완료. 프론트엔드는 이번 세션 샌드박스의 bash 마운트가 `Sidebar.jsx`뿐 아니라 `HomePage.jsx` 등 여러 프론트 파일에서 실제 저장 시점과 무관하게 예전 캐시된 내용을 계속 돌려주는 문제가 있어(타임스탬프/크기가 실제 수정 이후에도 전혀 안 바뀜), bash 쪽 eslint 실행 결과는 신뢰할 수 없었음. 대신 Read 도구(실제 저장된 내용, ground truth)로 전체 파일을 다시 읽어 직접 문법을 검토해 이상 없음을 확인함. **로컬에서 마이그레이션 적용 후 실제로 드래그 앤 드롭이 정상 동작하는지 (폴더 순서 변경 / 폴더 하위 이동 / 노트 이동 3가지 모두) 직접 확인 필요.**

### 추가 — 노트 미리보기 카드에서 바로 삭제

기존엔 노트를 지우려면 상세 페이지에 들어가야만 했음. `HomePage.jsx`의 노트 카드 우측 상단에 작은 회색 X 버튼을 추가해서, 목록에서 바로 삭제할 수 있게 함. X를 누르면 카드 클릭(상세 이동)과 안 겹치도록 `stopPropagation` 처리하고, 바로 아래에 "정말 삭제하시겠습니까?" 확인 팝업(삭제/취소 버튼)을 띄움 - `window.confirm()` 대신 카드에 인라인으로 뜨는 팝업이라 어떤 노트를 지우려는 건지 명확함. 문구는 상세 페이지 삭제 확인과 동일한 `postDetail.confirmDelete`/`postDetail.deleteFailed` 키를 재사용해 일관성 유지. 팝업 바깥을 클릭하면 자동으로 닫힘(Sidebar 우클릭 메뉴와 동일한 패턴).

### 추가 — 세션 만료 시 재로그인 배너

기존엔 JWT(60분 만료)가 만료돼도 화면엔 아무 안내 없이 API 호출이 전부 401로 실패하기만 해서, 사용자 입장에선 갑자기 오류가 난 것처럼 보이는 문제가 있었음.

- `frontend/src/components/SessionExpiredBanner.jsx` (신규): axios 전역 응답 인터셉터(`axios.interceptors.response.use`)로 모든 API 호출의 401을 감지. 단, 로그인/회원가입 자체의 401(아이디·비번 오류)까지 "세션 만료"로 오인하면 안 되므로 `/api/auth/login`, `/api/auth/signup` 요청은 제외. 401 감지되면 화면 상단에 고정 배너("세션이 만료되었습니다. 다시 로그인해주세요." + 로그인 버튼)를 띄우고, 버튼을 누르면 로그아웃 처리 후 `/login`으로 이동.
- `frontend/src/App.js`: `<SessionExpiredBanner />`를 `BrowserRouter` 바로 안(라우트 트리 전체에 적용)에 배치.
- `frontend/src/components/Sidebar.jsx`: 로그아웃 버튼도 기존엔 `/`(로그아웃 상태에선 랜딩페이지)로 보냈는데, 로그아웃 직후엔 바로 로그인 화면이 뜨는 게 자연스러우므로 `/login`으로 이동하도록 변경 - 세션 만료 재로그인 흐름과 동작을 통일함.
- `frontend/src/i18n/locales/{ko,en}.json`: `common.sessionExpiredMessage`, `common.reLogin` 키 추가.

백엔드 변경 없음 (기존에 이미 토큰 만료/무효 시 401을 내리고 있었음 - `core/dependencies.py`의 `get_current_user`).

### 추가 — 할 일 우선순위 선택을 네이티브 select에서 커스텀 드롭다운으로 교체

기존엔 네이티브 `<select>`를 써서, 닫혀 있을 땐 스타일을 줄 수 있어도 펼쳤을 때 나오는 옵션 목록은 브라우저가 그려서 앱 디자인과 안 어울리고 꾸밀 수도 없었음. 또한 닫힌 상태에서 "낮음/보통/높음" 텍스트만 보여서 이게 우선순위를 나타낸다는 게 한눈에 안 들어왔음.

`frontend/src/pages/TodoPage.jsx`에 `PriorityDropdown` 컴포넌트를 새로 만들어서 할 일 추가 폼 2곳(목록 상단, 캘린더 뷰의 날짜별 사이드 패널)과 인라인 수정 행의 우선순위 `<select>`를 전부 교체함. 닫힌 상태에서도 깃발 아이콘 + 색 점(낮음=회색/보통=주황/높음=빨강, 기존 배지와 동일한 색상 체계)으로 우선순위 컨트롤임을 명확히 보여주고, 펼친 목록도 앱 스타일 그대로인 커스텀 드롭다운으로 렌더링. 바깥 클릭/Esc로 닫힘.

내가 앞서 요청을 오해해서 Claude Desktop/Cowork 설정 얘기로 착각했었음 - 실제로는 우리 앱(`frontend/src/components/Sidebar.jsx`)의 폴더 트리 얘기였음.

기존엔 "기본"(미분류) 항목이 화면상 최상위에 고정되고, 실제로 사용자가 만드는 모든 폴더가 그 아래로 한 단계 들여쓰기(`depth=1`, `indentOffset=1`)되어 마치 전부 "기본" 폴더의 하위 폴더처럼 보였음(주석에 이미 "화면상으로만" 들여쓰기라고 적혀 있었음 - DB상 `parent_id`는 실제로 NULL, 즉 최상위였음). "기본" 옆의 화살표(펼치기/접기)가 다른 모든 폴더의 표시 여부까지 같이 제어하고 있었음.

수정 내용:
- "기본"을 "전체보기"와 동일하게 펼치기/접기 없는 단순 필터 버튼으로 변경(더 이상 다른 폴더를 담는 부모처럼 보이지 않음)
- 사용자가 만드는 폴더들을 `depth=0, indentOffset=0`으로 렌더링해서 "기본"과 나란한 완전한 최상위 폴더로 표시 (노션/옵시디언처럼 폴더들을 종속 없이 따로 만들 수 있음)
- 더 이상 쓰이지 않는 `defaultFolderOpen` 상태 제거

eslint 파싱 검증 완료.

### 수정 — 캘린더 날짜별 패널에서 우선순위 드롭다운이 안 열리던 문제

캘린더 뷰에서 할 일을 추가할 때만 우선순위가 "보통"에 고정되고 토글이 눌러도 안 열리는 것처럼 보였음. 원인: `PriorityDropdown`의 옵션 목록이 `absolute` + `top-full`로, 자신을 감싸는 `position: relative` 래퍼 기준으로 아래쪽에 그려지는데, 캘린더 패널(`ResizableRightPanel.jsx`)의 컨테이너가 `overflow-y-auto overflow-x-auto`로 스크롤 영역을 잘라내고 있고 이 드롭다운이 그 패널의 맨 아래에 위치해서, 열려도 스크롤 영역 밖으로 나가 화면에 안 그려졌던 것(다른 2곳은 이런 위치가 아니라서 문제 없었음).

`frontend/src/pages/TodoPage.jsx`의 `PriorityDropdown`을 수정: 토글 버튼 클릭 시 `getBoundingClientRect()`로 버튼의 실제 화면 좌표를 구해서 `menuPos` state에 저장하고, 옵션 목록을 `absolute` 대신 `fixed` + 그 좌표로 렌더링(`Sidebar.jsx` 우클릭 메뉴와 동일한 패턴). 어떤 스크롤/overflow 컨테이너 안에 있든 잘리지 않고 항상 보임.

---

## Phase 9 UI — 할 일(Todo) 캘린더 패널 개편 + 세부사항 입력 방식 변경

### 캘린더 날짜별 패널 — 할 일 추가 폼 제거 후 버튼형 우선순위로 재도입

처음엔 드롭다운이 안 열리는 문제(위 항목) 때문에 "이 패널에서는 그냥 할 일 추가 자체를 없애자"는 방향으로 `panelTitle`/`panelPriority`/`panelAdding` state와 입력 폼을 통째로 제거했었음. 이후 다시 논의해서 "패널에 할 일 추가 기능은 있어야 한다, 대신 우선순위는 드롭다운이 아니라 버튼(세그먼트 컨트롤)으로 바로 고르게 하자"로 결론.

- `frontend/src/pages/TodoPage.jsx`에 `PriorityButtonGroup` 컴포넌트 추가 — 낮음/보통/높음 3개 버튼을 한 줄에 나열, 선택된 버튼은 해당 우선순위 색(회색/주황/빨강)으로 배경이 채워짐. 드롭다운을 펼쳐야 하는 번거로움 없이 한눈에 다 보이고 바로 클릭 가능.
- 캘린더 패널의 할 일 추가 폼(`panelTitle`/`panelPriority`/`panelAdding` state, `handlePanelAdd`, 입력창+버튼 JSX)을 되살리되, 우선순위 선택 부분만 `PriorityDropdown` 대신 `PriorityButtonGroup` 사용.
- 목록 상단 폼과 인라인 수정 행은 기존 `PriorityDropdown`(드롭다운) 그대로 유지 — 이번 변경은 캘린더 패널 한정.

### 캘린더 날짜별 패널 — 목록에서 마감일 표시 제거

이 패널은 이미 특정 날짜를 골라서 그 날짜의 할 일만 보여주는 곳이라, 각 항목 오른쪽의 마감일(예: `2026-07-03`) 표시가 중복이었음. `TodoRow`에 `hideDate` prop을 추가해서 이 패널의 목록 렌더링(`rowProps(todo, false, false, true)`)에만 켜고, 다른 목록(전체 목록/미완료 목록)은 그대로 마감일을 보여줌.

### 할 일 세부사항(시작 시간/메모) 입력 방식 변경

기존엔 각 할 일 행 맨 앞에 작은 화살표 버튼만 따로 있어서 눈에 잘 안 띄고 뭘 펼치는 버튼인지 헷갈린다는 피드백. 두 가지로 개선:

1. **목록 상단 추가 폼에 시작 시간/메모 입력란 상시 노출** — 예전엔 세부사항을 나중에 행을 펼쳐서만 넣을 수 있었는데, 할 일을 처음 만들 때부터 바로 입력할 수 있게 추가 폼 아래에 `TimePicker`(선택)와 메모 입력란(선택)을 항상 보이는 두 번째 줄로 추가. 둘 다 비워도 정상적으로 할 일이 생성됨.
   - `frontend/src/api/todos.js`: `createTodo`에 `startTime`, `memo` 선택 인자 추가 (백엔드 `TodoCreateRequest`는 이미 두 필드를 지원하고 있어서 백엔드 변경은 불필요).
   - `frontend/src/pages/TodoPage.jsx`: `newStartTime`/`newMemo` state 추가, `handleAdd`에서 함께 전송 후 초기화.
2. **세부사항 토글을 우선순위 옆으로 이동 + 라벨 추가** — 행 맨 앞의 독립된 화살표 버튼을 없애고, 우선순위 배지 바로 옆에 "세부사항" 글자 + 화살표를 붙여서 배치. 이제 우선순위와 세부사항 토글이 한 그룹으로 붙어 있어 뭘 펼치는 버튼인지 훨씬 명확함. (`todo.detailLabel` i18n 키 추가)

### 세부사항 저장 완료 시 저장 버튼 초록색으로 피드백

세부사항(시작 시간/메모)을 펼쳐서 수정 후 저장하면, 저장이 실제로 잘 됐는지 알기 어렵다는 피드백. `saveDetails`(TodoPage)가 성공/실패 여부(`true`/`false`)를 반환하도록 바꾸고, `TodoRow`의 저장 버튼이 저장 성공 시 1.5초간 초록색 + "저장됨" 문구로 바뀌었다가 자동으로 원래(파란색 "저장") 상태로 돌아오도록 함. 저장 후 값을 다시 수정하면 바로 초록색이 풀림. (`common.saved` i18n 키 추가)

### 만든/수정 파일
- `frontend/src/pages/TodoPage.jsx` — `PriorityButtonGroup` 추가, 캘린더 패널 추가 폼 재구성, `TodoRow`에 `hideDate`/`justSaved` 처리 추가, 세부사항 토글 위치 변경, 상단 폼에 시작시간/메모 입력란 추가
- `frontend/src/api/todos.js` — `createTodo`에 `startTime`/`memo` 인자 추가
- `frontend/src/i18n/locales/{ko,en}.json` — `todo.detailLabel`, `todo.startTimeOptional`, `common.saved` 키 추가

---

## Phase 9 UI — 전역 폰트에 Pretendard 추가 (화살표+한글 자간 벌어짐 수정)

메모/세부사항 등 텍스트 입력창에 화살표(→) 같은 기호를 직접 입력한 뒤 바로 이어서 한글을 입력하면, 그 사이 자간이 눈에 띄게 벌어져 보인다는 리포트. 영어를 이어 쓰면 문제없이 붙어 있음.

**원인**: 전역 폰트가 `'Inter', sans-serif`인데 Inter엔 한글 글리프가 없음. 그래서 화살표 같은 라틴/기호 문자는 Inter로 그려지고, 바로 뒤 한글은 브라우저가 시스템 한글 폰트(예: 맑은 고딕)로 자동 대체해서 그림 - 두 폰트의 자간 계산 방식이 달라서 전환 지점에서 간격이 벌어져 보임. 영어만 이어 쓰면 계속 Inter 하나로만 렌더링되니 문제가 없었던 것.

**해결**: 한글+라틴을 모두 자연스럽게 지원하는 무료 폰트 Pretendard를 CDN으로 추가하고, 전역 폰트 스택 맨 앞에 배치해서 한글이 나와도 같은 폰트 계열 안에서 처리되도록 함.

### 만든/수정 파일
- `frontend/public/index.html` — Pretendard CDN(`cdn.jsdelivr.net/gh/orioncactus/pretendard`) `<link>` 추가
- `frontend/src/index.css` — 전역 `font-family`를 `'Inter', sans-serif` → `'Pretendard', 'Inter', sans-serif`로 변경

---

## Phase 9 UI — 퀴즈 페이지 하위 폴더 노트 미표시 + 전체화면 새 창 문제 수정

### 하위 폴더 노트가 우측 패널에 안 보이던 문제

퀴즈 페이지에서 상위 폴더를 선택하면 하위 폴더에 있는 노트까지 퀴즈 범위에 포함되어야 하는데(실제 퀴즈 생성 로직은 이미 그렇게 동작하고 있었음 - `quiz_service.py`가 `get_category_subtree_ids`로 하위 폴더까지 포함해서 문제를 뽑음), 우측 패널의 "이 폴더의 글 목록" 미리보기만 하위 폴더 노트를 안 보여주고 있었음.

원인은 단순함: `QuizPage.jsx`의 패널용 `getPosts` 호출에 `include_subcategories` 값을 안 넘겨서(기본값 `false`) 딱 그 폴더에 직접 속한 글만 조회되고 있었음. `getPosts(1, 50, null, null, token, categoryParam, true)`로 마지막 인자를 `true`로 넘기도록 수정 - 백엔드 `/api/posts` 엔드포인트는 이미 이 파라미터를 지원하고 있어서 프론트 한 줄 수정으로 해결.

### "전체 화면" 버튼이 새 창을 띄우던 문제

우측 패널에서 노트를 열었을 때 있는 "전체 화면" 버튼이 `window.open(..., "_blank")`으로 새 탭/창을 여는 방식이었는데, 새 창을 띄우지 않고 같은 화면 안에서 미리보기가 전체 화면을 꽉 채우도록 변경 요청.

`previewFullscreen` state를 추가해서, 켜지면 노트 미리보기 영역을 `position: fixed; inset: 0`인 오버레이로 렌더링해 화면 전체를 덮도록 함. 버튼을 다시 누르면(아이콘이 확대→축소 모양으로 바뀜) 원래 우측 패널 크기로 돌아옴. 폴더를 바꾸거나 목록으로 돌아가면 자동으로 전체화면이 해제됨.

### 만든/수정 파일
- `frontend/src/pages/QuizPage.jsx` — 패널용 `getPosts` 호출에 `include_subcategories=true` 추가; `previewFullscreen` state + 전체화면 오버레이 렌더링 추가; `window.open` 제거하고 `Maximize2`/`Minimize2` 아이콘으로 토글
- `frontend/src/i18n/locales/{ko,en}.json` — `quiz.exitFullScreen` 키 추가

---
