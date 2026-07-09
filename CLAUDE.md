# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (frontend/)
```bash
npm start          # Dev server on http://localhost:3000
npm run build      # Production build
npm test           # Run tests in watch mode
```

### Backend (backend/)
```bash
uvicorn app.main:app --reload   # Dev server on http://localhost:8000
alembic upgrade head            # Apply database migrations
alembic revision --autogenerate -m "<message>"  # Generate new migration
```

## Architecture

### Overview
Full-stack app: React SPA (`frontend/`) + FastAPI backend (`backend/`) + MySQL + Qdrant(벡터 DB) + Django(`admin/`, 읽기 전용 관리자 페이지). `docker-compose.yml`로 5개 컨테이너(mysql/qdrant/backend/admin/frontend)를 통합 실행하며, 프로덕션에서는 frontend 컨테이너의 Nginx가 `/api/`→FastAPI, `/admin/`→Django로 리버스 프록시한다(같은 출처라 CORS가 실질적으로 개입하지 않음). 로컬 개발 시에만 각 서비스를 직접 포트(3000/8000/8001)로 띄우며, 이때는 `http://localhost:3000` CORS 허용이 실제로 쓰인다. 자세한 구조는 `docs/ARCHITECTURE.md` 참고.

### Backend (`backend/app/`)
Layered architecture: **routers → services → models**

- `routers/` — HTTP endpoints only; delegate all logic to services (auth, post, category, ai, conversation, quiz, user, upload, todo, event)
- `services/` — Business logic (`auth_service.py`, `post_service.py`, `category_service.py`, `conversation_service.py`, `quiz_service.py`, `todo_service.py`, `event_service.py`, `user_service.py`, `ai/` — `embedding_service.py`/`rag_service.py`/`graph_service.py`)
- `models/` — SQLAlchemy ORM models (async): `user.py`(User), `post.py`(Post/Tag/Category), `conversation.py`(Conversation/Message), `quiz.py`(Quiz/QuizAttempt), `todo.py`(Todo), `event.py`(Event)
- `schemas/` — Pydantic models for request validation and response serialization
- `core/` — Config (Pydantic `BaseSettings` from `.env`), JWT/bcrypt security, FastAPI `Depends()` helpers, slowapi rate limiter
- `db/database.py` — Async SQLAlchemy engine and `AsyncSession`
- `utils/` — `blocknote.py`(BlockNote JSON → 텍스트 추출), `chunking.py`(RAG용 블록 단위 청킹)

**Auth**: JWT Bearer tokens (HS256, `ACCESS_TOKEN_EXPIRE_MINUTES`로 설정, 기본 60분). Protected routes use `Depends(get_current_user)` from `core/dependencies.py`. Passwords hashed with bcrypt (`bcrypt==4.0.1`로 버전 고정 — 최신 버전과 passlib 호환 문제).

**Database**: MySQL via `aiomysql`. Migrations managed with Alembic (`alembic upgrade head` 필수 — `Base.metadata.create_all()`는 신규 테이블만 만들고 기존 테이블 컬럼 추가는 반영 안 함, 마이그레이션 이력과 실제 DB 상태가 어긋나면 500 에러 발생 가능).

**AI 기능**: Qdrant(벡터 검색) + OpenAI(`text-embedding-3-small` 임베딩, `gpt-4o-mini` 응답/퀴즈 생성) + LangGraph(멀티턴 대화 StateGraph) + LangSmith(모니터링, 선택). 관련 엔드포인트는 `/api/ai/chat`(rate limit 10/min), `/api/quizzes/generate`(rate limit 5/min).

**Key constraints**:
- Categories are self-referential (parent_id) with a max depth of 5 (`category_service.MAX_CATEGORY_DEPTH`, 예전엔 3이었음)
- Tags are normalized (shared across posts via `post_tags` junction table)
- Post content is stored as BlockNote JSON (신규 글) or raw HTML (예전 TipTap 글 — 파싱 실패 시 원본 텍스트로 fallback), 둘 다 같은 `content: Text` 컬럼에 저장됨
- 벡터 검색(RAG/시맨틱 검색)은 항상 `user_id`로 필터링 — 타 사용자 노트가 섞이지 않도록 보장

### Frontend (`frontend/src/`)
- `pages/` — Route-level components: `LandingPage`, `Dashboard`, `HomePage`(`/notes`), `AllFoldersPage`, `PostDetailPage`/`PostCreatePage`/`PostEditPage`, `QuizPage`, `TodoPage`, `DocumentsPage`, `SettingsPage`, `LoginPage`/`SignupPage`
- `components/` — Shared UI: `Sidebar.jsx`/`SidebarLayout.jsx`, `RichTextEditor.jsx`(BlockNote 래퍼), `CategorySelect.jsx`, `ColorPicker.jsx`, `FolderTile.jsx`, `NoteCarousel.jsx`, `ResizableRightPanel.jsx`, `SessionExpiredBanner.jsx`, `TagInput.jsx`, `TimePicker.jsx`
- `api/` — Axios functions grouped by domain (`auth.js`, `posts.js`, `categories.js`, `conversations.js`, `events.js`, `quizzes.js`, `todos.js`, `uploads.js`, `users.js`). Base URL은 `process.env.REACT_APP_API_URL`(프로덕션 빌드 시 빈 문자열 → 상대경로/동일 출처)이며, 없으면 로컬 개발용으로 `http://localhost:8000`로 폴백. 모두 `token` 파라미터로 `Authorization: Bearer` 헤더를 받음.
- `context/AuthContext.js` — Global auth state (JWT token + user object) persisted to `localStorage`. Exposes `loginAction`, `logoutAction`, and `useAuth()` hook.
- `context/ThemeContext.js` — 다크모드 상태 관리

**Routing** (React Router v7): 비로그인 페이지는 `/login`, `/signup`. 나머지는 전부 `AppLayout`(사이드바 포함) 안에서 렌더링됨. 루트 `/`는 `RootRoute`가 로그인 여부로 `Dashboard` 또는 `LandingPage`를 분기(주의: `HomePage`가 아님 — `HomePage`는 `/notes`). 인증이 필요한 라우트(`/notes`, `/folders`, `/posts/:id`, `/posts/create`, `/posts/:id/edit`, `/quiz`, `/documents`, `/todos`, `/settings`)는 `PrivateRoute`로 감싸져 있고, `useAuth().user`가 null이면 `/login`으로 리다이렉트.

**State**: No Redux/Zustand — Context API for auth/theme, `useState` for everything else.
