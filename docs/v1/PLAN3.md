# StudyLog-AI — Phase 10 진행 상황

> `PLAN2.md`의 후속 문서. Phase 9(할 일 캘린더 개편, Pretendard 폰트, 퀴즈 하위폴더/전체화면 수정)까지는
> `PLAN2.md`에 정리되어 있음. 이 문서는 그 이후 커밋되지 않은 작업들을 정리함.

---

## 전체 구현 계획 및 진행 상황

| Phase | Step | 내용 | 상태 |
|---|---|---|---|
| Phase 10 | UI | 할 일 목록 - 시간표(타임테이블) 뷰 추가 | ✅ 완료 |
| Phase 10 | UI | 할 일 종료 시간(end_time) 필드 추가 | ✅ 완료 |
| Phase 10 | UI | 할 일 세부사항에 "날짜변경"(미루기) 버튼 추가 | ✅ 완료 |
| Phase 10 | UI | 전체 폴더보기 페이지 (드릴다운 폴더 브라우저) 추가 | ✅ 완료 |
| Phase 10 | UI | 태그 입력을 쉼표 구분 → Enter로 추가하는 칩 방식으로 변경 | ✅ 완료 |
| Phase 10 | UI | 글쓰기/수정 페이지 우측 패널 제거 + 좌측 사이드바로 교체 | ✅ 완료 |
| Phase 10 | UI | 홈(노트 목록) 카드 레이아웃 개선 (4열, 태그 줄바꿈 방지, 높이 통일) | ✅ 완료 |

---

## 할 일 목록 — 시간표(타임테이블) 뷰

기존 목록 화면 오른쪽에 있던 "미완료 목록" 패널을, 날짜를 하루씩 넘겨가며 그날 시작 시간이 있는 할 일들을 시간대별로 배치해서 보여주는 시간표 형태로 교체. 오전 5시부터 다음날 새벽 2시까지를 한 화면에 표시.

- `frontend/src/pages/TodoPage.jsx`
  - `timetableDate` state + `goToPrevTimetableDay`/`goToNextTimetableDay`/`goToTodayTimetable`로 날짜 이동
  - `TIMETABLE_HOURS`(5~23, 0~1시) 상수와 `formatTimetableHourLabel`로 시간대 라벨 생성
  - `timetableTodos`/`timetableItemsByHour`(useMemo로 시간별 그룹핑) 계산 후 시간대별 행으로 렌더링, 각 항목은 `{start_time}{end_time ? "–end_time" : ""}` 형태로 표시
  - 기존 "미완료 목록" 관련 state/문구(`pendingTodos`, `todo.pendingTitle`, `todo.pendingEmpty`) 제거
- `frontend/src/i18n/locales/{ko,en}.json` — `todo.timetableEmpty` 추가, 안 쓰는 `pendingTitle`/`pendingEmpty` 제거

## 할 일 종료 시간(end_time) 필드

기존엔 시작 시간만 있었는데, 종료 시간도 선택적으로 입력할 수 있게 확장. 시작 시간만 넣고 종료 시간을 비우면 자동으로 시작 시간 + 1시간으로 채워짐(자정을 넘기는 경우도 처리).

- `backend/app/models/todo.py` — `end_time` 컬럼 추가
- `backend/alembic/versions/b7d4e0a91c23_add_end_time_to_todos.py` (신규 마이그레이션)
- `backend/app/schemas/todo.py` — `TodoCreateRequest`/`TodoUpdateRequest`/`TodoResponse`에 `end_time` 추가
- `backend/app/services/todo_service.py` — `_resolve_end_time(start_time, end_time)` 헬퍼 추가, `create_todo`/`update_todo`에서 사용
- `frontend/src/api/todos.js` — `createTodo`/`updateTodo`에 `endTime` 인자 추가
- `frontend/src/pages/TodoPage.jsx` — 상단 추가 폼과 세부사항 패널의 `TimePicker`를 시작~종료 두 개로 확장
- `frontend/src/i18n/locales/{ko,en}.json` — `todo.endTimeOptional` 추가

### 반영 방법 (중요)
DB 스키마 변경이 있으므로 `git pull` 후 마이그레이션 필요:
```
docker compose exec backend alembic upgrade head
```

## 할 일 세부사항 — "날짜변경"(미루기) 버튼

할 일 세부사항 패널(시작/종료 시간 + 메모)에 마감일을 다른 날짜로 옮길 수 있는 버튼 추가. 버튼을 누르면 인라인 날짜 선택창이 나타나고, 날짜를 고르면 제목/우선순위/시작·종료시간/메모는 그대로 두고 마감일만 그 날짜로 변경됨.

- `frontend/src/pages/TodoPage.jsx`
  - `TodoRow`에 `onPostpone` prop 추가, `postponeOpen` state로 날짜 입력 토글
  - 메인 컴포넌트에 `postponeTodo(todoId, newDueDate)` 추가 (`saveDetails`와 동일한 패턴으로 `updateTodo` 호출, 마감일만 교체)
  - `rowProps`에 `onPostpone: (newDueDate) => postponeTodo(todo.id, newDueDate)` 연결
- `frontend/src/i18n/locales/{ko,en}.json` — `todo.postpone`("날짜변경") 추가

## 전체 폴더보기 페이지

사이드바 "전체 보기" 아래에 "전체 폴더보기" 진입점을 추가. 최상위에서는 내가 만든 최상위 폴더들만 보여주고, 폴더를 누르면 그 하위 폴더들이 보이며, 하위 폴더를 누르면 그 안의 모든 노트(하위의 하위까지 포함)를 한 번에 보여주는 드릴다운 방식. 상단에 경로(breadcrumb) 표시.

- `frontend/src/pages/AllFoldersPage.jsx` (신규) — `path` 배열로 드릴다운 단계 관리, `isFolderBrowsingMode`로 "폴더 목록을 보여줄지 / 노트 목록을 보여줄지" 판단
- `frontend/src/App.js` — `/folders` 라우트 추가
- `frontend/src/components/Sidebar.jsx` — "전체 폴더보기" 진입 버튼 추가 (`sidebar.allFolders`). "전체 보기"와 동시에 하이라이트되지 않도록 `SidebarLayout`에 `selectedCategoryId`를 아예 넘기지 않음
- `frontend/src/i18n/locales/{ko,en}.json` — `sidebar.allFolders`, `folders.title`, `folders.empty` 추가

## 태그 입력 — 쉼표 구분 → 칩 방식

글쓰기/수정 페이지의 태그 입력을 쉼표로 구분해서 한 번에 입력하는 방식에서, 태그를 하나씩 입력 후 Enter로 추가하는 칩(chip) 방식으로 변경.

- `frontend/src/components/TagInput.jsx` (신규) — Enter로 추가, 칩의 X 버튼 또는 빈 입력에서 Backspace로 삭제
- `frontend/src/pages/PostCreatePage.jsx`, `PostEditPage.jsx` — 문자열(`tagInput`) 대신 배열(`tags`) state로 전환, `TagInput` 적용
- `frontend/src/i18n/locales/{ko,en}.json` — `postCreate.tagsPlaceholder`/`postEdit.tagsPlaceholder`에서 "(쉼표로 구분)" 문구 제거

## 글쓰기/수정 페이지 — 우측 패널 제거, 좌측 사이드바 추가

기존 우측 패널("AI 컨텍스트" + "관련 노트")을 전부 제거하고, 대신 다른 페이지들과 동일한 좌측 사이드바(`SidebarLayout`)를 붙여서 글을 쓰는 중에도 폴더 이동이 가능하도록 변경.

- `frontend/src/pages/PostCreatePage.jsx`, `PostEditPage.jsx` — `ResizableRightPanel` 및 우측 패널 관련 코드 제거, `SidebarLayout`으로 감싸고 `handleSelectCategory` 추가, 헤더에 `<SidebarSpacer />` 추가

## 홈(노트 목록) 카드 레이아웃

- `frontend/src/pages/HomePage.jsx`
  - 노트 카드 그리드를 4열(`lg:grid-cols-4`)로, 카드 세로 패딩 축소 + 카드 간 간격 확대
  - 태그를 최대 3개까지만 보여주고 나머지는 "..."로 표시(줄바꿈 없이 한 줄 유지)
  - 태그가 없는 노트도 카드 높이가 동일하도록 태그 영역에 `min-h-[26px]` 적용
- `frontend/src/pages/Dashboard.jsx` — 최근 노트 그리드도 동일하게 3열로 조정

---

## 검증

이번 배치 전체를 프로젝트의 실제 babel 설정(`babel-preset-react-app`, `NODE_ENV=development`)으로 `TodoPage.jsx`를 포함해 문법 검증 완료. 나머지 파일들은 Read 도구로 저장된 내용을 직접 재검토함. **로컬에서 `alembic upgrade head` 실행 후 타임테이블/종료시간/날짜변경/전체폴더보기/태그입력 5가지 기능이 실제로 정상 동작하는지 확인 필요.**
