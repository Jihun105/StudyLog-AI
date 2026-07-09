# StudyLog-AI — Phase 12 진행 상황

> `PLAN4.md`의 후속 문서. Phase 11(노트 작성 화면 Apple Pages 스타일 개편, 카테고리 커스텀 드롭다운)까지는
> `PLAN4.md`에 정리되어 있음. 이 문서는 그 이후 진행된, 디자인 시스템(세리프 헤드라인 / 모노스페이스 라벨 /
> 본문 폰트) 전면 적용과 대시보드·노트 편집기·코드 블록 관련 UI 폴리싱 작업을 정리함.

---

## 전체 구현 계획 및 진행 상황

| Phase | Step | 내용 | 상태 |
|---|---|---|---|
| Phase 12 | 폰트 | 사이드바 폰트(버튼 안 span 상속 문제) 수정 | ✅ 완료 |
| Phase 12 | 폰트 | AI 퀴즈 "전체 노트" 범위 선택 — 네이티브 select → 커스텀 드롭다운 | ✅ 완료 |
| Phase 12 | 폰트 | 노트 제목(h4) 세리프 미적용 문제 — `h1~h6` 전체로 규칙 확장 | ✅ 완료 |
| Phase 12 | 폰트 | 버튼 안 `<span>` 라벨이 모노스페이스 상속 안 되는 문제 — `button *` 규칙으로 확장 | ✅ 완료 |
| Phase 12 | 폰트 | 할 일 목록 / AI 퀴즈 페이지 제목을 `<h1>` + 세리프로 통일 | ✅ 완료 |
| Phase 12 | 폰트 | AI 퀴즈 범위·유형 선택 패널 전체를 사이드바와 동일한 세리프로 통일 | ✅ 완료 |
| Phase 12 | 폰트 | 할 일 목록 페이지 전체를 사이드바와 동일한 세리프로 통일 | ✅ 완료 |
| Phase 12 | UI | 대시보드 "최근 노트" — 세로형 카드 비율 + 한 줄 제목 + 새 노트 카드 | ✅ 완료 |
| Phase 12 | UI | 대시보드 "최근 노트" — 3D 코스트플로우 캐러셀(`NoteCarousel`)로 전면 개편 | ✅ 완료 |
| Phase 12 | UI | 캐러셀 위 마우스 휠이 페이지 전체 스크롤과 함께 움직이는 문제 수정 | ✅ 완료 |
| Phase 12 | UI | 대시보드 최근 노트 개수 5개 → 10개 | ✅ 완료 |
| Phase 12 | UI | 노트 작성 에디터 본문 폰트를 Pretendard 전용 → 앱 본문 폰트(Work Sans)로 통일 | ✅ 완료 |
| Phase 12 | UI | 인용구(blockquote) 스타일 — 세리프 이탤릭 + 아이보리 배경 + 굵은 좌측 테두리 | ✅ 완료 |
| Phase 12 | UI | 코드 블록 배경색을 인용구와 동일하게(검정 → 아이보리) | ✅ 완료 |
| Phase 12 | UI | 코드 블록 실제 구문 강조(syntax highlight) 색상 복원 | ✅ 완료 |
| Phase 12 | UI | 코드 블록 주석(`#`, `//`) 색을 밝은 초록으로 지정 | ✅ 완료 |
| Phase 12 | UI | 코드 블록 언어 선택 드롭다운 커스텀 교체 시도 (DOM 오버레이) | ❌ 실패 → 롤백, CSS 스타일링만 유지 |
| Phase 12 | UI | 서식 패널에 "인용구" 삽입 버튼 추가 | ✅ 완료 |
| Phase 12 | UI | 코드 블록 안 굵게/색상 등 서식 툴바 노출 가능 여부 조사 | 🔍 조사만 진행 — ProseMirror 스키마 레벨 제약으로 판단, 미구현 권장 |
| Phase 12 | UI | "AI 상태: 온라인" 배지 제거 (홈/글쓰기/수정/상세보기 4개 페이지) | ✅ 완료 |

---

## 폰트 시스템 전면 적용 — 근본 원인과 수정

이번 배치의 핵심 주제는 "디자인 시스템에서 정한 폰트(Headline=Newsreader 세리프, Label=JetBrains Mono, Body=Work Sans)가 왜 특정 요소에서만 안 먹히는가"를 하나씩 추적한 것. 반복적으로 드러난 원인은 아래 두 가지로 요약됨.

1. **시맨틱 태그 기준 규칙의 사각지대**: `index.css`의 전역 규칙은 `h1~h6`, `button`, `.text-xs` 같은 태그/클래스에 걸려 있는데, 실제 컴포넌트가 `<h4>` 대신 `<div>`를 쓰거나(노트 제목, 페이지 타이틀), 네이티브 `<select>`(AI 퀴즈 범위 선택기)를 쓰면 규칙이 아예 안 걸림.
2. **`<span>` 래핑으로 인한 상속 차단**: 전역 `* { font-family: Work Sans }` 규칙은 명시적 규칙이라, `<button>` 안에 `<span>`으로 한 번 더 감싸진 라벨 텍스트는 (부모의 모노스페이스 지정을 상속받지 못하고) 그 span에 직접 Work Sans가 씌워짐. 사이드바 메뉴 라벨, AI 퀴즈 범위 드롭다운 라벨, 할 일 우선순위(`•보통`) 라벨이 전부 이 패턴이었음.

**수정 내역**

- `frontend/src/index.css`
  - `h1, h2, h3` → `h1, h2, h3, h4, h5, h6`로 확장 (노트 제목 h4 누락 수정)
  - `.sidebar-root button` → `.sidebar-root, .sidebar-root *`로 확장 (사이드바 span 상속 수정)
  - `button, .text-xs` → `button, .text-xs, button *`로 확장 (전체 버튼 span 라벨 상속 수정 — AI 퀴즈 "전체 노트" 라벨, 할 일 `•보통` 라벨 등 한 번에 해결)
  - `.bn-editor button` → `.bn-editor button, .bn-editor button *`로 동반 확장 (에디터 툴바는 계속 Pretendard 유지)
  - 신규 범용 클래스 `.app-serif-panel, .app-serif-panel *` 추가 — 특정 영역 전체를 사이드바와 동일한 세리프로 강제 통일할 때 사용
- `frontend/src/pages/QuizPage.jsx`
  - AI 퀴즈 범위 선택 — 네이티브 `<select>`를 `CategorySelect.jsx`와 같은 패턴의 커스텀 드롭다운(`scopeOptions` 배열 + 바깥 클릭 시 닫힘)으로 교체
  - 페이지 제목 `<div>` → `<h1>`(인라인 세리프 스타일)로 교체
  - 범위/유형 선택 패널 전체(`객관식`/`OX`, `전체 노트`, 검색창, `퀴즈 생성`)에 `.app-serif-panel` 적용
- `frontend/src/pages/TodoPage.jsx`
  - 페이지 제목 `<div>` → `<h1>`(인라인 세리프 스타일)로 교체
  - 페이지 전체(`flex-1 ...` 최상위 컨테이너)에 `.app-serif-panel` 적용 — 보기 전환 버튼, 추가 폼, 우선순위 드롭다운, 필터, 목록/달력 항목 전부 세리프로 통일

---

## 대시보드 "최근 노트" — 캐러셀 개편

Memoir 앱 → Pokémon TCG Pocket 앱 참고 이미지를 거치며 단계적으로 요구사항이 구체화됨.

1. 카드 비율을 세로형(4:5)으로, 제목은 한 줄 말줄임으로 변경 + "새 노트 작성" 카드 추가
2. 5개 카드가 다음 줄로 넘어가는 문제 → 마우스 휠로 옆으로 넘기는 가로 스크롤 시도
3. "게임 카드 넘기듯" 3D 코스트플로우가 필요하다는 요청 → `frontend/src/components/NoteCarousel.jsx` 신규 작성 (`perspective` + `rotateY` + `scale`로 좌우 카드가 뒤로 젖혀지며 작아지는 효과, 클릭 시 해당 카드로 포커스 이동 또는 활성 카드면 열기)
4. 휠을 캐러셀 위에서 굴리면 페이지 전체도 같이 스크롤되는 문제 → React `onWheel`은 패시브 리스너라 `preventDefault()`가 무시됨을 확인, `useRef` + `useEffect`로 네이티브 `addEventListener('wheel', handler, { passive: false })` 등록해서 해결
5. 최근 노트 표시 개수 5 → 10개로 변경 (`getPosts(1, 10, ...)`)

**변경 파일**: `frontend/src/components/NoteCarousel.jsx`(신규), `frontend/src/pages/Dashboard.jsx`

---

## 코드 블록 / 인용구 스타일링

- **인용구**: 참고 이미지(이탤릭 세리프 + 아이보리 박스 + 굵은 잉크색 좌측 테두리)에 맞춰 `[data-content-type="quote"] blockquote` 스타일 추가. 서식 패널에 인용구 삽입 버튼이 없어서 `Quote` 아이콘 버튼도 함께 추가.
- **코드 블록 배경**: 기본 검정 → 인용구와 같은 아이보리(`#f9f7f2`)로 통일, 다크모드에서도 항상 이 톤 고정.
- **구문 강조 버그**: 모든 언어가 한 가지 색으로만 나오는 문제를 `@blocknote/core`/`prosemirror-highlight`/`@shikijs/core` 소스코드를 직접 읽어 근본 원인을 추적함 — BlockNote는 실제 하이라이팅 시 `highlighter.getLoadedThemes()[0]`(테마 배열의 첫 번째)만 사용하고 라이트/다크 모드에 따라 자동으로 안 바뀜. `themes: ["github-dark", "github-light"]` 순서 때문에 어두운 배경용 팔레트가 밝은 배경 위에서 렌더링되어 거의 안 보였던 것. `frontend/src/lib/editorSchema.js`에서 `themes: [githubLight, githubDark]`로 순서를 바꾸고, 이전에 걸어뒀던 강제 단색 CSS(`pre, pre * { color: #000 !important }`)를 제거해서 실제 토큰별 색이 보이도록 수정.
- **주석 색**: 원하는 밝은 초록(`#16a34a`)으로 고정하기 위해, shiki 테마 객체를 그대로 쓰지 않고 `tokenColors` 중 `comment` 스코프의 `foreground`만 오버라이드하는 `withGreenComments()` 헬퍼를 `editorSchema.js`에 추가.
- **언어 선택 드롭다운 커스텀화 시도**: `CategorySelect.jsx`처럼 완전히 커스텀 드롭다운으로 바꾸려고 DOM 오버레이 방식(네이티브 select 숨기고 `createRoot`로 커스텀 React 드롭다운을 절대위치로 얹는 방식)을 시도했으나 오버레이가 전혀 렌더링되지 않는 문제가 반복되어, 사용자 지시로 완전히 롤백. 최종적으로는 CSS만으로 네이티브 select/option 색상을 스타일링하는 선에서 유지 (`frontend/src/components/CodeBlockLanguagePicker.jsx`는 생성 후 삭제됨).
- **코드 블록 안 서식 툴바(굵게/색상) 노출 조사**: `@blocknote/core`의 codeBlock 노드 스펙이 `marks: ""`로 모든 마크를 스키마 레벨에서 차단하고 있고, `FormattingToolbar`의 `shouldShow`도 코드 타입 노드에서 명시적으로 `false`를 반환하도록 하드코딩되어 있음을 확인. UI만 손보면 되는 문제가 아니라 스키마 자체의 제약이라, 무리한 몽키패치 대신 미구현을 권장함.

**변경 파일**: `frontend/src/index.css`, `frontend/src/lib/editorSchema.js`, `frontend/src/components/RichTextEditor.jsx`, `frontend/src/i18n/locales/{ko,en}.json`(`richTextEditor.quote` 키 추가)

---

## 그 외 소소한 수정

- "AI 상태: 온라인" 배지를 `HomePage`, `PostCreatePage`, `PostEditPage`, `PostDetailPage` 4개 페이지 헤더에서 모두 제거 (번역 키 `common.aiStatusOnline` 자체는 유지, JSX 사용처만 제거)

---

## 검증

이번 배치도 이전 배치와 동일하게, `mcp__workspace__bash` 기반 esbuild 문법 검사가 실제 파일과 다른 내용(존재하지 않는 줄 번호의 오류)을 반환하는 샌드박스 캐싱 버그가 여러 차례 재현됨. 이 경우 항상 `Read` 도구로 저장된 파일을 직접 재확인하는 방식으로 검증했고, `Read` 결과와 실제 동작(스크린샷 기반 사용자 확인)이 최종 판단 기준이었음.

**로컬에서 직접 실행해서 아래 항목들이 실제로 정상 동작하는지 확인이 필요함:**
- 대시보드 캐러셀에서 휠 스크롤 시 카드만 움직이고 페이지 전체는 안 움직이는지, 카드 10개가 모두 순회되는지
- 코드 블록에서 언어를 바꿔가며 실제로 토큰별 색이 다르게 나오는지 (주석은 초록, 문자열/키워드 등은 원래 색)
- 할 일 목록 / AI 퀴즈 페이지에서 버튼·입력창·목록 항목까지 전부 세리프 폰트로 일관되게 보이는지 (라이트/다크 모드 둘 다)
- 코드 블록 언어 선택 select가 다크모드에서도 글자가 잘 보이는지

이번 배치도 아직 git에 커밋되지 않은 상태. 이전 배치들과 마찬가지로 `git diff -w`로 줄바꿈(CRLF/LF) 노이즈를 제외하고 실제 변경 파일만 골라 스테이징하는 것을 권장함.
