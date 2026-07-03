# StudyLog-AI — 베타 배포 이후 개발 계획 및 진행 상황

> `PLAN.md`의 후속 문서. 회원가입/기능 구현 ~ AWS EC2 베타 배포 + GitHub Actions CI/CD 구축까지의
> 전체 과정은 `PLAN.md`에 정리되어 있음. 이 문서는 베타 배포 완료 시점부터 이어지는 작업을 기록함.

---

## 전체 구현 계획 및 진행 상황

| Phase | Step | 내용 | 상태 |
|---|---|---|---|
| Phase 7 | 보완 | fail2ban 설치 (SSH 무차별 대입 방어) | ✅ 완료 |
| Phase 8 | UI | 사이드바 접힘 시 재오픈 버튼-헤더 겹침/단차 수정 | ✅ 완료 |

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

---
