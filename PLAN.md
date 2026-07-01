# StudyLog-AI — 전체 개발 계획 및 진행 상황

> 새 컴퓨터에서 작업 시작 전 반드시 읽을 것.
> 완료된 것, 다음에 할 것, 앞으로의 계획이 모두 여기 있음.

---

## 환경 세팅 (새 컴퓨터)

```bash
# 1. 저장소 clone
git clone https://github.com/Jihun105/StudyLog-AI.git

# 2. 백엔드 패키지 설치
cd backend
pip install -r requirements.txt

# 3. 프론트엔드 패키지 설치
cd ../frontend
npm install

# 4. .env 파일 생성 (루트에 직접 만들어야 함 — gitignore로 제외됨)
# 위치: StudyLog-AI/.env
DATABASE_URL=mysql+aiomysql://아이디:비밀번호@localhost:3306/study_db
SECRET_KEY=랜덤_문자열
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
OPENAI_API_KEY=sk-...

# 5. MySQL에 DB 생성
mysql -u root -p
CREATE DATABASE study_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 6. Alembic 마이그레이션 적용
cd backend
alembic stamp <현재_최신_revision_id>  # alembic/versions/ 폴더 확인
alembic upgrade head

# 7. Qdrant 실행 (Docker 필요)
docker run -d --name qdrant -p 6333:6333 qdrant/qdrant

# 8. 백엔드 서버 실행
uvicorn app.main:app --reload

# 9. 프론트엔드 서버 실행
cd frontend
npm start
```

> ⚠️ bcrypt는 4.0.1로 고정 — 최신 버전과 passlib 호환 문제 있음

---

## 현재 파일 구조

```
StudyLog-AI/
  .env                          ← gitignore, 직접 만들어야 함
  backend/
    requirements.txt            ✅ 전체 패키지 목록
    alembic/
      versions/
        4286d557a154_init.py
        25336541123f_add_conversations_and_messages.py
        bb7243571f75_add_quizzes_and_quiz_attempts.py
        af3fe9b8ff13_add_quiz_type_and_nullable_options.py
        81b5a3a47d90_add_quiz_source_post.py
    app/
      main.py                   ✅
      core/
        config.py               ✅ 환경변수 (.env 읽기)
        security.py             ✅ JWT, bcrypt
        dependencies.py         ✅ get_current_user
      db/
        database.py             ✅ 비동기 DB 연결
      models/
        user.py                 ✅
        post.py                 ✅ Post, Tag, Category
        conversation.py         ✅ Conversation, Message
        quiz.py                 ✅ Quiz, QuizAttempt
      schemas/
        user.py                 ✅
        post.py                 ✅
        category.py             ✅
        conversation.py         ✅
        quiz.py                 ✅
      routers/
        auth_router.py          ✅
        post_router.py          ✅ (embedding BackgroundTasks 연동)
        category_router.py      ✅
        ai_router.py            ✅ POST /api/ai/chat
        conversation_router.py  ✅ 대화 목록/히스토리
        quiz_router.py          ✅ 퀴즈 생성/채점
      services/
        auth_service.py         ✅
        post_service.py         ✅
        category_service.py     ✅ (get_category_path 포함)
        conversation_service.py ✅
        quiz_service.py         ✅
        ai/
          __init__.py
          embedding_service.py  ✅ Qdrant 인덱싱 + 삭제
          rag_service.py        ✅ Vector Search + GPT 응답 (비동기)
          graph_service.py      ✅ LangGraph 멀티턴 + LangSmith 추적
      utils/
        blocknote.py            ✅ BlockNote JSON → 텍스트 추출
        chunking.py             ✅ 블록 단위 청킹
  frontend/
    Dockerfile                    ✅ 멀티스테이지(node 빌드 → nginx 서빙) + 경로 라우팅
    nginx.conf                     ✅ / → React, /api → backend, /admin·/django-static → admin
    src/
      pages/                    ✅ HomePage, PostCreatePage, PostDetailPage, QuizPage 등
      components/               ✅ Navbar, Sidebar, RichTextEditor(BlockNote)
      api/                      ✅ auth.js, posts.js, categories.js, conversations.js, quizzes.js (BASE_URL이 REACT_APP_API_URL로 오버라이드 가능)
      lib/
        editorSchema.js          ✅ 커스텀 shiki 하이라이터 사용 (codeBlockConfig)
        shiki.bundle.js           ✅ shiki-codegen으로 생성 (oniguruma 엔진, 필요한 언어만)
      context/AuthContext.js    ✅
  admin/                        ✅ Django 관리자 패널 (읽기 전용 조회용, 별도 프로젝트)
    Dockerfile                    ✅ mysqlclient 빌드 + collectstatic + gunicorn
    requirements.txt               ✅ Django, mysqlclient, python-dotenv, gunicorn, whitenoise
    config/
      settings.py                ✅ MySQL 연결(기존 DATABASE_URL 파싱), whitenoise, INSTALLED_APPS
    boarddata/
      models.py                  ✅ 기존 테이블 매핑 (managed=False, unmanaged)
      admin.py                   ✅ ReadOnlyAdmin (추가/수정 금지, 조회+삭제만)
    manage.py
  docker-compose.yml             ✅ mysql/qdrant/backend/admin/frontend 전체 통합
```

---

## 전체 구현 계획 및 진행 상황

| Phase | Step | 내용 | 상태 |
|---|---|---|---|
| Phase 1 | Step 1 | BlockNote JSON → 텍스트 추출 유틸 | ✅ 완료 |
| Phase 1 | Step 2 | Qdrant 연동 + 임베딩 인덱싱 (BackgroundTasks) | ✅ 완료 |
| Phase 1 | Step 3 | Vector Search 기반 RAG 검색 | ✅ 완료 |
| Phase 1 | Step 4 | GPT-4o-mini 연동 + AI 채팅 엔드포인트 | ✅ 완료 |
| Phase 1 | Step 5 | LangSmith 연동 | ⏳ Phase 2 때 같이 (LangGraph 도입 후 효과적) |
| Phase 2 | Step 6 | conversations / messages 테이블 추가 (Alembic) | ✅ 완료 |
| Phase 2 | Step 7 | LangGraph StateGraph 의도 분류 + 멀티턴 대화 | ✅ 완료 |
| Phase 2 | Step 8 | 대화 히스토리 API + 프론트 연동 | ✅ 완료 |
| Phase 2 | Step 9 | LangSmith 연동 (LangGraph와 함께) | ✅ 완료 |
| Phase 1-2 | 보완 | Hybrid Search (BM25 + Vector) | ⏳ 대기 |
| Phase 1-2 | 보완 | 스트리밍 응답 (SSE) | ⏳ 대기 |
| Phase 3 | Step 10-12 | 퀴즈 생성/채점/UI (카테고리 기반, 독립 서비스) | ✅ 완료 |
| Phase 4 | Step 13 | Rate Limiting (slowapi) | ✅ 완료 |
| Phase 4 | Step 13-B | Django Admin 패널 구축 (수업 요구사항: FastAPI + Django + Docker/AWS) | ✅ 완료 |
| Phase 4 | Step 14 | 구조화 로깅 (structlog) | ⏳ 대기 |
| Phase 4 | Step 15 | Docker Compose 통합 (backend/frontend/admin/nginx/mysql/qdrant) | ✅ 완료 |
| Phase 4 | Step 16 | GitHub Actions CI/CD | ⏳ 대기 |
| Phase 4 | Step 17 | VPS/AWS 배포 | ⏳ 대기 |

---

## Phase 2 Step 7 구현 완료 — LangGraph 멀티턴 대화

### 만든 파일
- `backend/app/services/ai/graph_service.py` — LangGraph StateGraph 정의 (의도 분류 → RAG검색/일반대화 분기 → 응답 생성 → DB 저장)
- `backend/app/services/conversation_service.py` — conversation 생성/조회, 최근 메시지 로드, 메시지 저장 (서비스 레이어 분리 원칙에 따라 분리)

### 바뀐 것
- `ai_router.py`: `ChatRequest`에 `conversation_id: int | None` 추가. 없으면 새 conversation 생성(제목 = 질문 앞 50자), 있으면 본인 소유 확인. 응답에 `conversation_id` 포함.
- `rag_service.py`: 동기 → 비동기로 전환 (`AsyncOpenAI`, `AsyncQdrantClient`). 기존 `ask()`는 `graph_service.chat()`으로 대체되어 제거.
- 의도 분류는 키워드 대신 GPT-4o-mini 호출로 처리 (temperature=0).

### LangGraph 노드 흐름 (실제 구현)
```
START → classify_intent ─┬─→ rag_search ──┐
                          └─→ general_pass ─┴─→ generate_answer → save_messages → END
```

### 대화 히스토리 전략
- DB에 전체 히스토리 저장 (messages 테이블)
- GPT 호출 시 최근 10개 메시지만 포함 (`conversation_service.HISTORY_LIMIT`)
- conversation_id 없이 요청하면 새 conversation 자동 생성

### 검증
Mock 검증 이후 실제 인프라(MySQL, Qdrant, OpenAI)에서도 통합 테스트 완료. 과정에서 발견/수정한 이슈:
- `rag_search`에서 Qdrant 컬렉션이 아직 없을 때(글을 한 번도 인덱싱 안 한 상태) 500 에러 나던 것 → 빈 리스트 반환하도록 수정
- 의도 분류 프롬프트가 상식으로 답할 수 있는 질문을 `general`로 잘못 분류하는 경향 → "애매하면 무조건 rag" 로 프롬프트 강화
- `main.py`에 `logging.basicConfig` 없어서 `classify_intent`/`rag_search`/`index_post` 로그가 전혀 안 찍히던 것 → 추가
- `index_post()` 백그라운드 태스크가 조용히 실패할 수 있어 try/except + 로그 추가 (성공/실패 모두 로그로 확인 가능)
- 실제 글을 인덱싱한 뒤 RAG 분기가 노트 내용을 정확히 인용해서 답변하는 것까지 확인함

---

## Phase 2 Step 8 구현 완료 — 대화 히스토리 API + 프론트 연동

### 만든 파일
- `backend/app/schemas/conversation.py` — `ConversationListResponse`, `ConversationMessagesResponse` 등
- `backend/app/routers/conversation_router.py` — `GET /api/conversations`(목록), `GET /api/conversations/{id}/messages`(히스토리)
- `frontend/src/api/conversations.js` — `getConversations`, `getConversationMessages`, `sendChatMessage`

### 바뀐 것
- `conversation_service.py`: `list_conversations()`, `get_conversation_with_messages()` 추가. 소유권 검증 로직은 `_get_owned_conversation()`으로 공통화
- `main.py`: `conversation_router` 등록
- `PostDetailPage.jsx`: 기존에 정적 목업이던 "Ask StudyBrain AI" 패널을 실제 채팅으로 교체 — 메시지 전송/렌더링, `conversation_id` 상태 관리, 우측 상단 아이콘으로 새 대화 시작 / 이전 대화 목록(드롭다운)에서 골라 이어가기 지원
- (추가) AI 답변에 줄바꿈이 씹히던 문제 수정 — `whitespace-pre-wrap` + 백틱 코드/굵게(`**`) 최소 렌더링 (`renderMessageContent`)

---

## Phase 2 Step 9 구현 완료 — LangSmith 연동

### 바뀐 것
- `graph_service.py`: 실제 OpenAI 호출부(`classify_intent`, `generate_answer`)를 `@traceable(run_type="llm")` 데코레이터가 붙은 별도 함수(`_classify_intent_llm`, `_generate_answer_llm`)로 분리. `state` 전체(AsyncSession 포함, 직렬화 불가) 대신 `messages: list[dict]`만 넘겨서 트레이스에 안전하게 기록되도록 함
- `requirements.txt`: `langsmith` 명시적으로 추가 (langchain의 종속 패키지로 이미 설치돼 있었지만 명시)
- 그래프 구조(의도분류→검색/일반대화→생성→저장) 자체는 LangGraph가 자동으로 추적하고, 두 LLM 호출은 `@traceable`로 프롬프트/응답까지 상세 추적됨

### .env에 추가해야 할 것 (직접 값 채워넣기)
```
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=lsv2_...   # smith.langchain.com에서 발급
LANGSMITH_PROJECT=board-ai
```
설정 안 해도 코드는 그대로 정상 동작함 (tracing 비활성 상태로 조용히 무시됨). 값 넣고 나서 `POST /api/ai/chat` 한번 호출한 뒤 smith.langchain.com 프로젝트 대시보드에서 트레이스가 찍히는지 확인.

### 검증
tracing 비활성/활성(가짜 키) 두 경우 모두 mock으로 실제 채팅 흐름이 안 깨지는 것 확인. 활성 상태에서 API 키가 잘못되면 LangSmith 쪽 연결 에러만 로그로 남고 응답 자체는 정상 반환됨 (best-effort 전송이라 서비스에 영향 없음).

### 부수적으로 고친 버그
`core/config.py`: pydantic-settings는 `.env` 값을 `Settings` 객체 안에만 담고 실제 `os.environ`으로는 내보내지 않아서, `langsmith`처럼 `os.getenv()`로 직접 읽는 라이브러리가 `.env`의 `LANGSMITH_*` 값을 못 보는 문제가 있었음. `load_dotenv(ENV_PATH)` 추가로 해결. 겸사겸사 `Settings`에 `extra = "ignore"` 추가해서, 선언 안 된 키가 `.env`에 있어도 서버가 죽지 않게 함.

---

## Phase 3 (Step 10-12) 구현 완료 — 퀴즈 시스템

### 설계 변경
원래 계획은 "LangGraph에 퀴즈 노드 추가"였지만, 실제 필요한 UI가 채팅이 아니라 사이드바의 독립된 "AI Quiz" 페이지였고, 사용자가 카테고리를 골라 그 범위 노트로 퀴즈를 만들고 싶어해서 채팅 그래프와 무관한 독립 서비스(`quiz_service.py`)로 구현함.

### 만든/바뀐 파일
- `backend/app/models/quiz.py` — `Quiz`(question, options, answer, explanation, quiz_type, category_id, source_post_id, source_title), `QuizAttempt`(user_answer, is_correct)
- `backend/app/schemas/quiz.py` — `QuizGenerateRequest`(category_id, quiz_type), `QuizQuestion`(정답 필드 없음 — 프론트 노출 방지), `QuizAttemptResponse`
- `backend/app/services/quiz_service.py` — 카테고리(+하위 전체) 노트 수집 → GPT 문제 생성 → DB 저장, 채점, 자동 정리, 출처 매칭
- `backend/app/routers/quiz_router.py` — `POST /api/quizzes/generate`, `POST /api/quizzes/{id}/attempt`
- `backend/alembic/versions/` — `bb7243571f75`(테이블/인덱스), `af3fe9b8ff13`(quiz_type 컬럼 + options nullable), `81b5a3a47d90`(source_post_id/source_title 컬럼)
- `frontend/src/api/quizzes.js`, `frontend/src/pages/QuizPage.jsx` — 퀴즈 페이지 전체 (카테고리+유형 선택, 생성, 풀이, 채점, 우측 미리보기 패널)
- `frontend/src/components/ResizableRightPanel.jsx` — 코드블록 잘림 수정 (PostDetailPage와 공유하는 컴포넌트)

### 핵심 기능

**1. 카테고리 기반 문제 생성**
`category_id`: `null`=전체 노트, `0`=미분류, 그 외=선택 카테고리+하위 카테고리 전체(재귀 조회). 노트 텍스트를 이어붙여 8000자에서 컷 — 카테고리 크기와 무관하게 GPT 호출 1번당 비용이 고정되도록 함.

**2. 문제 유형 3종**
객관식(`multiple_choice`) / OX(`ox`) / 빈칸 채우기(`blank`), 생성 전 프론트에서 선택. 문제 개수는 5개 고정. 객관식은 GPT 응답을 받은 뒤 `random.shuffle()`로 정답 위치를 한 번 더 섞어서 위치 편향 가능성을 원천 차단. 빈칸 채우기는 자유 텍스트 입력이라 공백/대소문자를 무시하는 정규화 비교로 채점.

**3. 정답 비노출**
`QuizQuestion` 응답 스키마에 `answer` 필드 자체가 없음 — 채점은 항상 서버(`submit_attempt`)에서 수행하고, 정답은 채점 후 응답에만 포함.

**4. 오래된 미응시 퀴즈 자동 정리**
`generate_quiz()` 호출 시마다 그 유저의 퀴즈 중 "생성 후 30일 지났고 + 시도 기록이 하나도 없는" 것만 정리(`_cleanup_stale_quizzes`, 별도 스케줄러 없이 생성 시점에 얹어서 처리). 한 번이라도 풀어서 정답/오답 기록이 남은 퀴즈는 기간과 무관하게 보존 — 목적이 복습 이력 보존이므로 "생성만 하고 방치된 것"만 대상.

**5. 출처(원본 글) 표시**
카테고리 안 여러 글을 한 번에 GPT에 넘기는 구조라 RAG처럼 확정적인 출처 추적은 불가능. GPT가 스스로 판단한 출처 제목(`source_title`)을 실제 수집한 글 제목과 대조해서 정확히 일치하면 `source_post_id`로 연결(best-effort, 불일치해도 제목 텍스트는 보존). 문제 아래 "출처: {제목}" 표시, 매칭 성공 시 클릭하면 우측 패널에서 원문을 바로 열람.

**6. 폴더 연동 우측 패널**
사이드바 폴더 클릭 → 우측 패널에 그 폴더(직접 소속 글만)의 글 목록 표시, 동시에 퀴즈 생성 범위 드롭다운도 자동 전환(양방향 동기화). 글 클릭 시 페이지 이동 없이 패널 안에서 BlockNote 읽기 전용으로 내용 표시 — 페이지 이동으로 QuizPage가 언마운트되면 진행 중이던 퀴즈가 사라지는 문제를 해결하기 위함. "전체 화면" 버튼으로 새 탭에서도 열람 가능.

### 트러블슈팅
- DB에 매 생성마다 5행씩 쌓이는 것에 대한 우려 → 실측 시 연간 몇만 행/수십MB 수준으로 무시 가능하지만, 복습 이력 보존과 별개로 미사용 데이터 정리는 필요하다고 판단해 자동 정리 기능 추가
- 우측 패널 코드블록이 계속 잘려 보임 → 원인이 두 겹이었음: (1) 컨테이너 체인에 `min-width` 제약이 없어 좁은 flex 레이아웃에서 스크롤 대신 클리핑되는 전형적 CSS 이슈, (2) BlockNote 에디터 자체의 좌우 54px 고정 패딩(`padding-inline`)이 좁은 패널에서 실사용 폭을 크게 잠식. 둘 다 스코프 CSS로 해결
- DB 스키마 변경(quiz_type 추가, options nullable화, source_post_id 추가) 후 `Unknown column` 에러 → 마이그레이션 미실행이 원인. `create_all()`이 이미 만든 인덱스와 alembic 마이그레이션이 충돌할 수 있어서, 이 프로젝트에서는 컬럼 추가분을 직접 SQL(`ALTER TABLE`)로도 적용 가능하도록 안내

### 검증
실제 MySQL 없이 in-memory SQLite로 진짜 SQLAlchemy 비동기 쿼리를 돌려서 확인: 카테고리 재귀 서브트리 조회, 카테고리별/미분류/전체 노트 필터링, 빈 카테고리 에러 처리, 퀴즈 생성 후 DB 저장, 정답/오답 채점, 소유권 검증, 문제 유형별 생성·채점(객관식 정답 위치 분포, OX, 빈칸 정규화 비교), 자동 정리 4가지 케이스, 출처 매칭 3가지 케이스까지 전부 통과. 프론트는 Babel로 문법 검증. 실제 인프라(MySQL, 프론트 서버)에서 사용자가 직접 통합 테스트 완료.

---

## Phase 4 Step 13 구현 완료 — Rate Limiting (slowapi)

AI 엔드포인트(`POST /api/ai/chat`, `POST /api/quizzes/generate`)는 매 호출마다 OpenAI 비용이 발생하는데 제한이 전혀 없었음. 반 친구들과 함께 쓰는 배포 목표를 고려해 과금 방지용 rate limit 추가.

### 만든/바뀐 파일
- `backend/app/core/limiter.py` — `Limiter(key_func=get_user_id_or_ip)` 정의
- `backend/app/main.py` — `app.state.limiter` 등록, `RateLimitExceeded` 예외 핸들러, `SlowAPIMiddleware` 추가
- `backend/app/routers/ai_router.py` — `/api/ai/chat`에 `@limiter.limit("10/minute")`
- `backend/app/routers/quiz_router.py` — `/api/quizzes/generate`에 `@limiter.limit("5/minute")` (`/attempt`는 외부 API 호출이 없어서 제외)
- `backend/requirements.txt` — `slowapi` 추가

### 설계 결정
- **IP가 아니라 유저 기준으로 제한**: `get_user_id_or_ip()`가 `Authorization` 헤더의 JWT를 디코드해서 `user_id`를 키로 사용, 토큰이 없거나 유효하지 않을 때만 IP로 폴백. 같은 와이파이/NAT를 쓰는 여러 학생이 서로의 한도에 영향을 주지 않게 하기 위함
- **slowapi 제약**: rate limit 데코레이터가 붙는 함수는 파라미터 이름이 정확히 `request`(타입 `Request`)여야 slowapi가 인식함. 기존 라우터들은 Pydantic 요청 바디를 `request`라는 이름으로 받고 있어서 이름이 충돌 — 바디 파라미터를 `body`로 이름 변경하고 `request: Request`를 별도로 추가해서 해결
- **엔드포인트별 한도**: `/api/ai/chat`은 10회/분(대화는 짧은 텀으로 여러 번 오갈 수 있어 넉넉하게), `/api/quizzes/generate`는 5회/분(한 번에 5문제씩 생성되는 무거운 호출이라 더 타이트하게)

### 검증
FastAPI `TestClient`로 실제 라우터와 동일한 구조(데코레이터 + `Depends()` 공존)를 재현해서 확인: (1) 한 유저가 한도를 초과하면 3번째 요청부터 429 응답, (2) 다른 유저(다른 JWT)는 같은 시간대에도 전혀 영향받지 않고 정상 처리됨 — 사용자별 독립적인 제한이 의도대로 동작.

---

## Phase 4 Step 13-B 구현 완료 — Django Admin 패널

### 배경
학교 수업 요구사항으로 "FastAPI로 만든 프로젝트를 Django로 감싸서 Docker/AWS로 배포"해야 했음. 동시에 실제로도 서비스에 관리자 페이지/슈퍼유저 계정이 없어 운영이 안 되는 문제가 있었음. 두 요구를 동시에 해결하는 방향으로 **Django를 어드민 전용 프로젝트로 별도 추가**하는 구조를 선택함 (FastAPI를 Django 안에 억지로 마운트하는 방식은 표준 패턴이 아니라고 판단해 배제).

### 구조 결정
- **아키텍처**: FastAPI(기존 서비스, 무변경) + Django(Admin 전용, 신규) + 향후 Nginx(경로 기반 리버스 프록시)로 하나의 Docker Compose 스택 구성 예정 (Docker/Nginx 통합은 이번 라운드에서는 보류, Admin 기능만 우선 구현)
- **인증 완전 분리**: Django Admin은 Django 자체 인증(`auth_user` 테이블, `createsuperuser`)을 사용하고, 기존 서비스의 `users` 테이블(JWT + bcrypt)과는 전혀 연결되지 않음. 이유: 관리자 도구와 실서비스 인증을 분리해 회원 계정 침해가 관리자 권한 침해로 이어지지 않도록 하기 위함
- **모델 소유권**: Django 모델은 전부 `managed = False` (unmanaged) — 테이블 스키마의 단일 진실 공급원은 계속 Alembic이 유지하고, Django는 기존 테이블을 읽기 전용으로 매핑만 함. 하나의 스키마를 두 ORM이 각자 마이그레이션하려 들면 충돌하기 때문

### 만든 파일
- `admin/config/settings.py` — `DATABASE_URL`(SQLAlchemy 형식 문자열)을 `urlparse`로 파싱해 Django `DATABASES`에 매핑. 루트 `.env`를 `load_dotenv`로 그대로 재사용 (Django 전용 `.env` 별도 생성 안 함)
- `admin/boarddata/models.py` — 기존 8개 테이블(`users`→`AppUser`, `categories`, `tags`, `posts`, `conversations`, `messages`, `quizzes`, `quiz_attempts`)을 unmanaged 모델로 매핑. FK는 전부 `on_delete=models.DO_NOTHING` (cascade 규칙은 이미 MySQL 제약에 있으므로 Django가 중복 관여 안 함). `users` 테이블 매핑 모델은 Django 자체 `auth.User`와 이름이 겹치지 않도록 `AppUser`로 명명
- `admin/boarddata/admin.py` — `ReadOnlyAdmin` 베이스 클래스(`has_add_permission`/`has_change_permission` 항상 `False` 반환)를 만들어 전 모델에 상속. 추가/수정은 전부 막고 조회+삭제(정리용)만 허용
- 생략한 부분: `post_tags` 다대다 중간 테이블은 자체 `id` 컬럼이 없는 복합키 구조라 Django ORM과 맞지 않아 이번 라운드에서는 매핑 생략 (조회 위주 목적이라 태그 관계 없이도 핵심 데이터는 다 보임)

### 왜 조회 위주(읽기 전용)로 제한했나
Django Admin 폼으로 직접 값을 바꾸면 서비스 레이어의 비즈니스 로직을 우회하게 됨. 예: `AppUser.password_hash`를 Admin에서 직접 수정하면 bcrypt 해시가 아닌 평문이 그대로 저장돼 로그인이 깨짐. `Category.parent`를 자유롭게 바꾸면 서비스에서 강제하는 "최대 depth 3" 제약이 깨질 수 있음. 그래서 추가/수정은 막고, 조회와 삭제(스팸/오래된 데이터 정리 목적)만 열어둠.

### 확인된 동작
- Django Admin은 특정 유저로 스코핑되지 않고 전체 유저의 데이터를 다 조회 가능 (의도된 설계 — 운영자용 전체 감독 도구이므로). 반대로 FastAPI 서비스는 여전히 `current_user.id` 기준으로 본인 데이터만 보이게 스코핑됨 — 두 시스템의 역할이 다름
- 방금 만든 Django 슈퍼유저 계정으로 서비스 일반 로그인은 불가능 (테이블 자체가 다름) — 인증 완전 분리 확인됨

### 진행 방식 (참고)
이 단계부터는 사용자가 학습 목적으로 직접 타이핑하며 진행하길 원해서, 코드를 대화 중 단계별로 제시하고 사용자가 직접 파일에 작성하는 방식으로 진행함 (일부 기계적인 수정은 요청에 따라 대신 적용).

### 남은 작업 (다음 라운드)
- GitHub Actions CI/CD
- AWS/VPS 실제 배포

---

## Phase 4 Step 15 구현 완료 — Docker Compose 전체 통합

### 구조
`docker-compose.yml`(프로젝트 루트) 하나로 5개 컨테이너를 묶음: `mysql`, `qdrant`, `backend`(FastAPI), `admin`(Django), `frontend`(Nginx + React 빌드). 호스트에 노출되는 포트는 `frontend`의 `80`뿐이고, 나머지는 컴포즈 내부 네트워크에서 서비스 이름으로만 통신한다.

**요청 라우팅**: `frontend`의 Nginx가 리버스 프록시 역할까지 겸함(별도 nginx 컨테이너를 안 두고 frontend 이미지 자체를 nginx 기반으로 유지 — 컨테이너 하나 절약).
- `/` (그 외 전부) → React 정적 빌드, `try_files $uri /index.html`로 React Router 새로고침 대응
- `/api/*` → `backend:8000`
- `/admin/*`, `/django-static/*` → `admin:8001`

### 컨테이너 간 통신을 위해 필요했던 코드 변경
- `backend/app/services/ai/rag_service.py`, `embedding_service.py`: Qdrant 접속 주소가 `host="localhost"`로 하드코딩되어 있던 것을 `os.getenv("QDRANT_HOST", "localhost")`로 변경 — 컴포즈 환경에서는 `QDRANT_HOST=qdrant`로 주입, 로컬 개발(비-Docker) 시엔 기존처럼 `localhost` 폴백
- `frontend/src/api/*.js` 5개 파일: `BASE_URL = "http://localhost:8000"` 하드코딩을 `process.env.REACT_APP_API_URL ?? "http://localhost:8000"`로 변경 — Docker 빌드 시엔 `ENV REACT_APP_API_URL=""`(빈 문자열, 상대경로가 되어 같은 origin의 Nginx를 통해 `/api`로 감), 로컬 `npm start` 시엔 기존 동작 유지
- `docker-compose.yml`에서 `backend`/`admin` 서비스의 `DATABASE_URL`을 `.env`의 값 대신 `mysql+aiomysql://root:${MYSQL_ROOT_PASSWORD}@mysql:3306/${MYSQL_DATABASE}`로 오버라이드 — 컨테이너 간에는 `localhost`가 아니라 서비스 이름(`mysql`)으로 접속해야 하기 때문

### Django 정적 파일 — `/static/` 경로 충돌 문제
React 빌드 결과물과 Django 기본 정적 파일 경로가 둘 다 `/static/`이라 충돌 가능성이 있었음. `whitenoise` 라이브러리를 추가해서 Django가 자기 정적 파일(Admin CSS/JS)을 스스로 서빙하게 하고, `STATIC_URL`을 `django-static/`으로 변경해 아예 경로를 분리. `admin/Dockerfile`의 `CMD`에서 컨테이너 실행 시점(빌드 시점이 아님 — `.env` 값이 아직 없으므로)에 `collectstatic`을 먼저 돌리고 `gunicorn`을 띄우도록 구성.

### 트러블슈팅 (실제로 겪은 순서대로)
1. **CRA 프로덕션 빌드 자체가 실패**: `@blocknote/code-block`이 기본 제공하는 40여 개 언어 문법 파일 중 일부(`csharp`, `css` 등)가 최신 정규식 문법(ES2024 "v" flag, `@shikijs/langs-precompiled`)을 쓰는데, CRA(`react-scripts` 5.0.1)에 내장된 구버전 Babel 파서가 이를 파싱하지 못해 `SyntaxError`로 빌드 실패. 처음엔 Docker/Node 버전 문제로 의심했으나 로컬 `npm run build`에서도 동일하게 재현되어 실제 의존성 문제로 확인. **해결**: `shiki-codegen` CLI로 실제 쓰는 언어(javascript, typescript, python, java, cpp, c, sql, shellscript, json, html, css, markdown)만 골라 `oniguruma` 엔진(WASM 기반, JS 정규식이 아니라 JSON 문법 데이터라 이 문제 자체가 발생하지 않음) 커스텀 번들을 생성해서 교체 (`frontend/src/lib/shiki.bundle.js`, `editorSchema.js`). 부수 효과로 번들 크기도 줄어듦.
2. **`npm ci`가 Windows에서 만든 `package-lock.json`을 리눅스 컨테이너에서 계속 거부**: `npm ci`는 락파일과 완전히 일치해야 하는데, 플랫폼별 optional 의존성 차이로 재생성해도 반복 발생. 재현성보다 실용성을 택해 Dockerfile을 `npm ci` 대신 `npm install`로 되돌림 (원래 빌드를 막던 진짜 원인은 위 1번이었고, 그게 해결된 뒤로는 `npm install`도 정상 동작).
3. **MySQL 공식 이미지가 `MYSQL_USER=root` 설정을 거부**: `MYSQL_USER`/`MYSQL_PASSWORD`는 "추가 일반 유저"용이라 이미 존재하는 root 계정에는 못 씀. `MYSQL_ROOT_PASSWORD`만 쓰고 backend/admin의 `DATABASE_URL`도 `root` 계정 기준으로 통일해서 해결.
4. **위 3번을 고쳤는데도 계속 같은 에러 반복**: `docker-compose.yml`의 `environment:`는 고쳤지만, `mysql` 서비스에 걸려있던 `env_file: - ./.env`가 `.env`에 남아있던 `MYSQL_USER=root` 줄을 그대로 다시 주입하고 있었음. `mysql` 서비스에서 `env_file` 자체를 제거(mysql은 `MYSQL_DATABASE`/`MYSQL_ROOT_PASSWORD`만 있으면 되므로)하고 해결. 추가로, 이미 생성된 컨테이너는 환경변수가 최초 생성 시점에 고정되므로 `docker-compose.yml`을 고친 뒤엔 `docker compose down` 후 재기동이 필요했다는 점도 확인.
5. **새 컨테이너의 빈 DB에 Django 자체 인증 테이블이 없어 `createsuperuser` 실패**: `python manage.py migrate`로 `auth`/`admin`/`contenttypes`/`sessions` 테이블만 생성(우리 앱 테이블은 `managed=False`라 영향 없음) 후 해결.

### 검증
`docker compose up --build`로 5개 컨테이너 전부 정상 기동 확인. `http://localhost`에서 회원가입/로그인(backend↔mysql 연결 확인), `http://localhost/admin`에서 Django 로그인 및 CSS 정상 렌더링(whitenoise 확인) 및 데이터 조회까지 실제 브라우저로 확인 완료.

---

## 현재 API 목록

### 인증
| Method | URL | 설명 |
|---|---|---|
| POST | /api/auth/signup | 회원가입 |
| POST | /api/auth/login | 로그인 |

### 게시글
| Method | URL | 설명 |
|---|---|---|
| GET | /api/posts | 목록 조회 (페이지네이션, 검색, 태그 필터) |
| GET | /api/posts/{id} | 상세 조회 |
| POST | /api/posts | 작성 (인증 + 임베딩 자동 인덱싱) |
| PUT | /api/posts/{id} | 수정 (인증 + 재인덱싱) |
| DELETE | /api/posts/{id} | 삭제 (인증 + Qdrant 삭제) |
| GET | /api/posts/tags/all | 태그 목록 |

### 카테고리
| Method | URL | 설명 |
|---|---|---|
| GET | /api/categories | 카테고리 트리 조회 |
| POST | /api/categories | 카테고리 생성 (최대 3단계) |
| DELETE | /api/categories/{id} | 삭제 |
| PUT | /api/categories/{id} | 이름 변경 |

### AI
| Method | URL | 설명 |
|---|---|---|
| POST | /api/ai/chat | LangGraph 기반 멀티턴 대화 (RAG 검색 + 일반 대화 자동 분기). Body: `{query, conversation_id?}` → Response: `{conversation_id, answer}` |

### 대화
| Method | URL | 설명 |
|---|---|---|
| GET | /api/conversations | 본인 대화 목록 조회 (최신순) |
| GET | /api/conversations/{id}/messages | 특정 대화의 전체 메시지 히스토리 조회 (본인 소유만) |

### 퀴즈
| Method | URL | 설명 |
|---|---|---|
| POST | /api/quizzes/generate | 카테고리(+하위) 노트 기반 5문제 생성. Body: `{category_id?, quiz_type}` (quiz_type: multiple_choice/ox/blank) |
| POST | /api/quizzes/{id}/attempt | 답안 제출 및 채점. Body: `{user_answer}` → Response: `{is_correct, correct_answer, explanation}` |

---

## 기술 스택

### Backend
- FastAPI + SQLAlchemy(async) + aiomysql + Alembic
- Qdrant (벡터 DB, Docker로 실행)
- OpenAI text-embedding-3-small (임베딩)
- GPT-4o-mini (응답 생성)
- LangGraph (멀티턴 대화 StateGraph)
- LangSmith (모니터링, @traceable 상세 추적)

### Frontend
- React + React Router v7
- BlockNote (노션 스타일 에디터)
- Tailwind CSS + Axios

---

## 주요 설계 결정

### RAG 구조
- LangChain 미사용 → OpenAI SDK + qdrant-client 직접 구현
- 청킹: 글자 수 기준 대신 BlockNote 블록 단위 (heading = 섹션 경계)
- 임베딩 prefix: `[카테고리 경로] [제목]` 앞에 붙여 도메인 정보 주입
- 보안: Qdrant 검색 시 user_id 필터 필수 (타인 노트 검색 차단)
- 글 삭제 시 Qdrant에서도 자동 삭제 (BackgroundTasks)

### 멀티턴 대화
- conversations 테이블: 대화방 단위
- messages 테이블: role(user/assistant) + content 저장
- GPT 호출 시 최근 10개 메시지 포함

### 퀴즈 시스템
- 채팅(RAG)과 완전히 분리된 독립 서비스 — 카테고리 단위로 노트를 모아 GPT 한 번 호출로 문제 생성(청크 검색 없이 통짜 컨텍스트)
- 정답은 서버에만 보관, 클라이언트 응답에는 절대 포함하지 않음 (`QuizQuestion` 스키마에 `answer` 필드 자체가 없음)
- 객관식 정답 위치는 GPT 응답을 그대로 믿지 않고 서버에서 한 번 더 셔플 — LLM의 위치 편향을 코드로 보정
- 출처 추적은 확정적 RAG 매칭이 아니라 GPT 자기 보고 + 텍스트 대조 방식의 best-effort — 정확도보다 구현 단순성과 실용성 우선
- 미사용 데이터(생성만 하고 안 푼 퀴즈)는 일정 기간 후 자동 정리하되, 학습 이력(시도 기록)이 있는 데이터는 절대 삭제하지 않음 — "복습 지원"이라는 목적에 맞게 이력 보존을 최우선

### 향후 개선 포인트 (포트폴리오)
- Hybrid Search (BM25 + Vector) — RAG 정확도 향상
- 스트리밍 응답 (SSE) — ChatGPT 스타일 UX
- RAGAS로 RAG 성능 평가
- Re-ranking — 검색 결과 재정렬
- 퀴즈 "혼합" 유형 — GPT가 노트 내용에 따라 문제 유형을 자동 결정 (현재는 3종 중 수동 선택만 지원)
- SM-2 알고리즘 — `quiz_attempts` 기록 기반 복습 스케줄링 (`next_review_at` 컬럼 추가 필요)
- 퀴즈 출처 추적 고도화 — 현재는 GPT 자기 보고 방식(best-effort). 노트를 청크 단위로 임베딩해 관련도 기반으로 출처를 추정하면 정확도 향상 가능
