# AI 기능 구현 노트

> AI 기능 도입 과정에서 내린 설계 결정, 논의 내용, 구현 계획을 기록한다.
> 원본 계획: `AI_SYSTEM_PLAN.md`

---

## 1. 프로젝트 목표

- 개인 공부 노트를 저장하고, RAG 기반 AI가 그 내용을 바탕으로 답변
- 퀴즈 생성 및 결과 저장으로 복습 지원
- 반 친구들과 함께 쓸 수 있도록 배포
- 포트폴리오로 활용 — 실무 감각을 보여주는 기술 적용

---

## 2. 기술 스택

### Frontend
| 기술 | 용도 | 비고 |
|---|---|---|
| React + React Router v7 | SPA 프레임워크 | 기존 구현 완료 |
| BlockNote | 노션 스타일 에디터 | TipTap에서 교체 완료 |
| Tailwind CSS | 스타일링 | 기존 구현 완료 |
| Axios | API 통신 | 기존 구현 완료 |
| Vercel or Nginx | 배포 | Phase 4 |

### Backend
| 기술 | 용도 | 비고 |
|---|---|---|
| FastAPI | API 서버 | 기존 구현 완료 |
| SQLAlchemy + Alembic | ORM + 마이그레이션 | 기존 구현 완료 |
| FastAPI BackgroundTasks | 임베딩 비동기 처리 | ✅ 완료 |
| slowapi | Rate Limiting (AI 엔드포인트 과금 방지) | Phase 4 |
| structlog | 구조화 로깅 (JSON 형식) | Phase 4 |

### Database
| 기술 | 용도 | 비고 |
|---|---|---|
| MySQL | 메인 DB (유저, 포스트, 대화, 퀴즈) | 기존 구현 완료 |
| Qdrant | 벡터 DB (임베딩 저장 및 검색) | ✅ 완료 (Docker로 로컬 실행) |

### AI
| 기술 | 용도 | 비고 |
|---|---|---|
| OpenAI text-embedding-3-small | 노트 임베딩 생성 (1536차원) | ✅ 완료 |
| GPT-4o-mini | 대화 응답 + 퀴즈 생성 (JSON mode) | ✅ 완료 (스트리밍 미적용) |
| Vector Search (Qdrant) | RAG 검색 | ✅ 완료 |
| Hybrid Search (Vector + BM25) | RAG 검색 품질 향상 | ⏳ 대기 |
| LangChain | RAG 파이프라인 | ⏳ 미사용 (직접 구현으로 대체) |
| LangGraph | 멀티턴 대화 StateGraph (의도 분류 → RAG/일반 분기 → 응답 생성 → 저장) | ✅ 완료 |
| LangSmith | LLM 모니터링 (`@traceable`로 프롬프트/응답 상세 추적) | ✅ 완료 |

### Infra / DevOps
| 기술 | 용도 | 비고 |
|---|---|---|
| Docker + Docker Compose | mysql/qdrant/backend/admin/frontend 5개 컨테이너 통합 | ✅ 완료 |
| GitHub Actions | CI/CD (푸시 → 테스트 → 자동 배포) | Phase 4 |
| Nginx | frontend 이미지 안에서 리버스 프록시 겸 React 서빙 + `/admin` 경로 분기 | ✅ 완료 |
| VPS / AWS | 실제 서버 배포 | Phase 4 |
| Django (Admin 전용) | 관리자 페이지 (자체 인증, unmanaged 모델로 기존 DB 조회) | ✅ 완료 (수업 요구사항 겸용) |
| whitenoise | Django Admin 정적 파일 자체 서빙 (`/django-static/`) | ✅ 완료 |
| shiki (oniguruma 엔진) | BlockNote 코드블록 하이라이팅, CRA 빌드 호환용 커스텀 번들 | ✅ 완료 |

### 설치된 패키지 (전체)
`backend/requirements.txt` 참고.

주요 패키지:
```
fastapi, uvicorn[standard], python-multipart
sqlalchemy[asyncio], aiomysql, alembic
python-jose[cryptography], passlib[bcrypt], bcrypt==4.0.1
pydantic-settings, email-validator
openai==2.38.0, qdrant-client
langchain==1.3.2, langchain-openai==1.2.2, langchain-qdrant, langchain-text-splitters
langgraph, langsmith
pytest, pytest-asyncio
```

> ⚠️ bcrypt는 4.0.1로 고정 — 최신 버전과 passlib 호환 문제

---

## 3. 전체 아키텍처

```
[React] ──→ [Nginx] ──→ [FastAPI]
                    │         ├── MySQL         유저, 포스트, 대화, 퀴즈
                    │         ├── Qdrant        벡터 임베딩
                    │         ├── OpenAI API    임베딩 + 응답 생성 + 퀴즈 생성
                    │         ├── LangGraph     멀티턴 대화 Agent 흐름 (의도분류→RAG/일반→응답→저장)
                    │         └── LangSmith     LLM 모니터링 (그래프 흐름 + LLM 호출 상세 추적)
                    │
                    └──→ [Django Admin] (/admin) ──→ MySQL (동일 DB, unmanaged 모델로 읽기 전용 조회)
                              └── 자체 인증(auth_user, createsuperuser) — 서비스 users 테이블과 분리

[GitHub Actions] → Docker Build → VPS 자동 배포   ← Phase 4, 미착수 (Nginx 경로 분기도 아직 미구성)
```

퀴즈 시스템은 LangGraph 흐름과 무관한 독립 서비스(`quiz_service.py`)로, 카테고리 단위 노트 → GPT 1회 호출 → DB 저장 구조로 별도 동작한다 (자세한 설계 이유는 5장 Phase 3 참고).

---

## 4. 구현 계획 및 진행 상황

| Phase | Step | 내용 | 상태 |
|---|---|---|---|
| Phase 1 | Step 1 | BlockNote JSON → 텍스트 추출 유틸 | ✅ 완료 |
| Phase 1 | Step 2 | Qdrant 연동 + 임베딩 인덱싱 (BackgroundTasks) | ✅ 완료 |
| Phase 1 | Step 3 | Vector Search 기반 RAG 검색 | ✅ 완료 |
| Phase 1 | Step 3-2 | Hybrid Search (BM25 추가) | ⏳ 대기 |
| Phase 1 | Step 4 | GPT-4o-mini 연동 + 기본 응답 | ✅ 완료 |
| Phase 1 | Step 4-2 | 스트리밍 응답 (SSE) | ⏳ 대기 |
| Phase 2 | Step 6 | conversations / messages 테이블 추가 (Alembic) | ✅ 완료 |
| Phase 2 | Step 7 | LangGraph StateGraph 의도 분류 + 멀티턴 대화 | ✅ 완료 |
| Phase 2 | Step 8 | 대화 히스토리 API + 프론트 연동 | ✅ 완료 |
| Phase 2 | Step 9 | LangSmith 연동 | ✅ 완료 |
| Phase 3 | Step 10-12 | 퀴즈 생성/채점/UI (카테고리 기반, 독립 서비스로 설계 변경) | ✅ 완료 |
| Phase 4 | Step 13 | Rate Limiting (slowapi) | ✅ 완료 |
| Phase 4 | Step 13-B | Django Admin 패널 (자체 인증 + unmanaged 모델) | ✅ 완료 |
| Phase 4 | Step 14 | 구조화 로깅 (structlog) | ⏳ 대기 |
| Phase 4 | Step 15 | Docker Compose 전체 통합 (mysql/qdrant/backend/admin/frontend) | ✅ 완료 |
| Phase 4 | Step 16 | GitHub Actions CI/CD | ⏳ 대기 |
| Phase 4 | Step 17 | VPS 배포 | ⏳ 대기 |

> Step 번호는 `PLAN.md`와 동일하게 정렬. 상세 진행 로그(트러블슈팅, 검증 방법 등)는 `PLAN.md`에 더 자세히 기록돼 있고, 이 문서는 설계 배경과 이유 위주로 정리한다.

---

## 5. 상세 설계

### Phase 1 — RAG 기반 AI 답변

#### Step 1: BlockNote JSON 텍스트 추출 ✅

**파일**: `backend/app/utils/blocknote.py`

**결정 사항:**
- 블록 타입별 구조 전수 조사 결과
  - `paragraph`, `heading`, `bulletListItem`, `numberedListItem`, `checkListItem`, `quote`, `codeBlock` → 모두 `content: inline*` 구조, 동일 파싱 로직으로 처리
  - `table` → `content`가 `tableContent` dict 구조, 별도 처리
  - `image`, `file`, `audio`, `video` → 텍스트 없음, 빈 문자열로 무시
- `children` 재귀 처리로 중첩 리스트 지원
- 기존 TipTap HTML 포스트는 JSON 파싱 실패 시 원본 반환 fallback

---

#### Step 2: Qdrant 연동 + 임베딩 인덱싱 ✅

**파일**: `backend/app/utils/chunking.py`, `backend/app/services/ai/embedding_service.py`

**Qdrant 환경:**
- 개발: Docker로 로컬 실행
  ```bash
  docker run -d --name qdrant -p 6333:6333 qdrant/qdrant
  ```
- 대시보드: `http://localhost:6333/dashboard`
- 컬렉션명: `study_notes`
- 배포: Docker Compose로 전환 예정

**청킹 전략: 블록 단위 청킹**

글자 수 기준(RecursiveCharacterTextSplitter) 대신 BlockNote 블록을 의미 단위로 사용.

- `heading` 블록이 나오면 새 청크 시작 → 섹션 경계 = 청크 경계
- heading 없는 경우 `max_blocks_per_chunk`(기본값 5)개씩 강제 분리
- overlap: 각 청크 마지막 블록을 다음 청크 첫 블록으로 포함 → 맥락 유실 방지

**임베딩 품질 향상: category_path + 제목 prefix**

```
[머신러닝 > 선형대수 > 기초개념] [선형 변환 정리]
선형 변환은 벡터 공간에서...
```

**Qdrant payload 구조:**
```json
{
  "page_content": "[머신러닝 > 선형대수] [선형 변환 정리]\n청크 내용...",
  "post_id": 42,
  "user_id": 7,
  "category_path": "머신러닝 > 선형대수 > 기초개념"
}
```

**메타데이터 설계 이유:**
- `user_id`: 검색 시 본인 노트만 필터링 (보안 필수)
- `post_id`: 답변에 출처 포스트 표시용
- `category_path`: AI 응답 생성 시 문맥 정보 제공용

**BackgroundTasks 연동:**
- 포스트 저장/수정: `index_post()` 백그라운드 실행
- 포스트 삭제: `delete_post_index()` 백그라운드 실행 → Qdrant에서도 자동 삭제

**구현 중 트러블슈팅:**
- `qdrant_client.delete()` — 최신 버전은 dict 대신 `FilterSelector` 모델 객체 필요
- `qdrant_client.search()` — 최신 버전에서 `query_points()`로 변경됨

---

#### Step 3: Vector Search 기반 RAG 검색 ✅

**파일**: `backend/app/services/ai/rag_service.py`

LangChain 대신 직접 구현. `qdrant_client.query_points()`로 유사 청크 TOP_K(기본 5)개 검색.
`user_id` 필터로 본인 노트만 대상으로 함.

> Hybrid Search(BM25 추가)는 추후 적용 예정

---

#### Step 4: GPT-4o-mini 연동 + AI 채팅 엔드포인트 ✅

**파일**: `backend/app/routers/ai_router.py`, `backend/app/services/ai/rag_service.py`

**엔드포인트:**
```
POST /api/ai/chat
Body: { "query": "질문 내용" }
Response: { "answer": "AI 답변" }
```

**system prompt 전략:**
- 검색된 청크를 `---`로 구분해서 context로 주입
- "노트에 없는 내용은 모른다고 해" 명시 → 환각 방지

> 스트리밍 응답(SSE)은 추후 적용 예정

---

#### Step 5: LangSmith 연동 ✅ (실제로는 Step 9에서, LangGraph 도입과 함께 구현)

당초 예상과 달리 "환경변수만 추가하면 끝"이 아니었음 — 우리 코드가 LangChain의 `ChatOpenAI` 래퍼가 아니라 순수 OpenAI SDK를 직접 호출하는 구조라, env 변수만으로는 그래프 구조(어떤 노드를 거쳤는지)만 추적되고 각 LLM 호출의 프롬프트/응답 상세는 잡히지 않는다. 그래서 실제 OpenAI 호출부를 `@traceable(run_type="llm")` 데코레이터가 붙은 별도 함수로 분리해서 상세 추적까지 확보함. 자세한 내용은 아래 Phase 2 Step 9 참고.

```env
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=lsv2_...
LANGSMITH_PROJECT=board-ai
```

---

### Phase 2 — 멀티턴 대화 (LangGraph) ✅ 완료

#### DB 스키마 (Step 6) ✅ — 실제 구현

계획과 달리 `conversations`에 `post_id` 컬럼은 넣지 않음 — 대화를 특정 노트에 종속시키지 않고 항상 사용자 전체 노트를 대상으로 하는 편이 실사용에 맞다고 판단.

```sql
conversations (
    id, user_id, title, created_at
)

messages (
    id, conversation_id, role (user/assistant), content, created_at
)
```

#### LangGraph StateGraph 구조 (Step 7) ✅ — 실제 구현

계획 단계에서는 퀴즈 생성 노드까지 그래프 안에 넣으려 했지만, 퀴즈 UI가 채팅과 완전히 분리된 별도 페이지로 확정되면서 퀴즈 노드는 제외하고 아래 구조로 확정:

```
START → classify_intent ─┬─→ rag_search ──┐
                          └─→ general_pass ─┴─→ generate_answer → save_messages → END
```

**State 구조:**
```python
{
    "query": str, "user_id": int, "conversation_id": int,
    "history": list[dict],   # 최근 10개 메시지
    "chunks": list[dict],     # RAG 검색 결과
    "intent": str,            # "rag" | "general"
    "answer": str,
    "db": AsyncSession,       # 직렬화 불가 — LangSmith 트레이스에는 안 넘김 (아래 Step 9 참고)
}
```

**의도 분류**: 키워드 매칭 대신 GPT-4o-mini 호출(temperature=0)로 처리. "Attention이 뭐야?"처럼 상식으로도 답할 수 있는 질문을 `general`로 잘못 분류하는 경향이 있어서, "애매하면 무조건 rag"로 프롬프트를 강화함.

**대화 히스토리 전략**: DB에 전체 히스토리 저장, GPT 호출 시엔 최근 10개만 포함(`HISTORY_LIMIT`). `conversation_id` 없이 요청하면 새 conversation 자동 생성(제목 = 질문 앞 50자).

**트러블슈팅:**
- Qdrant 컬렉션이 아직 없을 때(글 인덱싱 전 상태) RAG 분기가 500 에러로 죽음 → 빈 리스트 반환하도록 수정
- `main.py`에 `logging.basicConfig`가 없어서 그래프 내부 로그가 전혀 안 찍혔음 → 추가, 이후 디버깅 가시성 확보

---

#### Step 8: 대화 히스토리 API + 프론트 연동 ✅

```
GET /api/conversations                    → 본인 대화 목록 (최신순)
GET /api/conversations/{id}/messages      → 특정 대화 전체 히스토리
```

정적 목업이던 "Ask StudyBrain AI" 패널을 실제 채팅으로 교체. `conversation_id`를 컴포넌트 state로 유지해서 대화가 이어지고, 우측 상단 아이콘으로 새 대화 시작 / 이전 대화 목록에서 골라 이어가기를 지원.

**부수 버그 수정**: AI 답변의 줄바꿈(`\n\n`)이 HTML에서 무시돼 한 덩어리로 보이던 문제 → `whitespace-pre-wrap` + 백틱 코드/굵게(`**`) 최소 렌더링 추가.

---

#### Step 9: LangSmith 연동 ✅

`classify_intent`, `generate_answer` 내부의 실제 OpenAI 호출을 `@traceable(run_type="llm")`이 붙은 별도 함수로 분리. LangGraph의 `state` 전체(AsyncSession 포함, 직렬화 불가)를 그대로 넘기지 않고, 직렬화 가능한 `messages: list[dict]`만 넘겨서 트레이스에 안전하게 기록되도록 함.

**트러블슈팅 — `.env` 값이 LangSmith에 전달 안 됨**: pydantic-settings는 `.env` 값을 `Settings` 객체 안에만 담고 실제 `os.environ`으로는 내보내지 않는다. `langsmith`는 `os.getenv()`로 직접 읽기 때문에 `.env`의 `LANGSMITH_*` 값을 전혀 보지 못하는 문제가 있었음 → `core/config.py`에 `load_dotenv(ENV_PATH)` 추가로 해결. 겸사겸사 `Settings`에 `extra = "ignore"`를 추가해서 선언 안 된 키가 `.env`에 있어도 서버가 죽지 않게 함.

---

### Phase 3 — 퀴즈 시스템 ✅ 완료 (설계 변경: 독립 서비스로)

**설계 변경 이유**: 원래 계획은 "LangGraph에 퀴즈 생성 노드를 추가"하는 것이었지만, 실제 필요한 UI는 채팅이 아니라 사이드바의 독립된 "AI Quiz" 페이지였고, 사용자가 카테고리를 선택해서 그 범위 노트로 퀴즈를 만들고 싶어했다. 그래서 채팅 그래프와 완전히 분리된 독립 서비스(`quiz_service.py`)로 구현.

#### DB 스키마 (Step 10) ✅ — 실제 구현

```sql
quizzes (
    id, user_id, category_id (nullable, FK),
    quiz_type (multiple_choice/ox/blank),
    question, options (JSON, nullable), answer, explanation,
    source_post_id (nullable, FK → posts.id), source_title (nullable),
    created_at
)

quiz_attempts (
    id, user_id, quiz_id, user_answer, is_correct, created_at
    -- 향후 SM-2 적용 시 next_review_at 컬럼 추가 예정
)
```

계획 대비 바뀐 점: `post_id` 대신 `category_id`(글 하나가 아니라 카테고리 단위로 노트를 모아 퀴즈 생성), `source_post_id`/`source_title`은 이후 출처 표시 기능을 추가하면서 생김.

#### 문제 생성 흐름

```
카테고리 선택(하위 카테고리 포함, 재귀 조회)
     ↓
해당 노트 전체 텍스트 수집 (최대 8000자로 컷 — 카테고리 크기와 무관하게 비용 고정)
     ↓
GPT-4o-mini 1회 호출 (JSON mode) — 문제 유형별 프롬프트 분기
     ↓
응답 파싱 → 객관식 옵션 순서 재셔플, 출처 제목 매칭
     ↓
DB 저장 (정답은 응답에 포함하지 않음)
```

**문제 유형 3종** (`multiple_choice` / `ox` / `blank`, 생성 전 프론트에서 선택):
- 객관식: GPT가 만든 옵션 순서를 그대로 믿지 않고 서버에서 `random.shuffle()`로 한 번 더 섞음 — LLM이 정답을 특정 위치에 두는 편향을 가질 수 있어 코드로 보정
- OX: options는 `["O", "X"]` 고정
- 빈칸 채우기: 자유 텍스트 입력이라 완전 일치 대신 공백/대소문자를 무시하는 정규화 비교로 채점
- "혼합"(GPT가 유형을 자동 결정)은 아직 미구현 — 향후 확장 후보 (8장 참고)

**정답 비노출 설계**: `QuizQuestion` 응답 스키마에 `answer` 필드 자체가 없음. 채점은 항상 서버(`submit_attempt`)에서 저장된 정답과 비교해서 수행하고, 정답 텍스트는 채점 후 응답에만 포함.

**출처(원본 글) 표시 — best-effort 설계**: 카테고리 안 여러 글을 한 번에 GPT에 넘기는 구조라, RAG처럼 벡터 검색 기반의 확정적인 출처 추적은 불가능하다. 대신 GPT에게 "이 문제의 근거가 된 노트 제목을 답해달라"고 요청하고, 그 응답을 실제로 수집한 글 제목 목록과 정확히 대조해서 일치하면 `source_post_id`를 연결한다. 일치하지 않아도 GPT가 답한 제목 텍스트(`source_title`)는 그대로 보존해서 최소한의 참고 정보는 남긴다.

**오래된 미응시 퀴즈 자동 정리**: `generate_quiz()` 호출 시마다, 그 유저의 퀴즈 중 "생성 후 30일 지났고 + 한 번도 응시(quiz_attempts) 기록이 없는" 것만 삭제(`_cleanup_stale_quizzes`). 별도 배치/스케줄러 없이 생성 시점에 얹어서 처리(lazy cleanup). 실측 기준 DB 용량 자체는 무시할 수준(연간 몇만 행, 수십MB)이지만, 시도 기록이 있는 퀴즈(학습 이력)는 기간과 무관하게 절대 삭제하지 않는 것을 원칙으로 해서 "복습 지원"이라는 목적을 지킴.

**프론트 — 폴더 연동 우측 패널**: 사이드바에서 폴더를 클릭하면 퀴즈 생성 범위 드롭다운이 그 폴더로 자동 전환되고(양방향 동기화), 동시에 우측 패널에 그 폴더 소속 글 목록이 뜬다. 글을 클릭하면 원래는 상세 페이지로 라우팅 이동했는데, 이러면 페이지가 언마운트되면서 진행 중이던 퀴즈(문제/답변/채점 결과)가 전부 사라지는 문제가 있었다. 그래서 페이지 이동 대신 우측 패널 안에서 BlockNote 읽기 전용 뷰로 내용을 바로 보여주는 방식으로 변경.

**트러블슈팅 — 우측 패널 코드블록이 잘려 보임**: 원인이 두 겹이었다. (1) 컨테이너 체인에 `min-width` 제약이 없어서 좁은 flex 레이아웃 안에서는 코드블록 자체의 `overflow-x: auto`가 작동하지 못하고 그냥 잘려 보이는 전형적인 CSS 이슈. (2) BlockNote 에디터 자체가 좌우 54px 고정 패딩을 갖고 있어서, 좁은 사이드 패널에서는 그것만으로 실사용 폭이 크게 줄어드는 문제. 둘 다 이 패널에서만 적용되는 스코프 CSS로 해결, 본문 에디터(PostDetailPage)에는 영향 없음.

**트러블슈팅 — DB 스키마 변경 후 `Unknown column` 에러**: `quiz_type`, `source_post_id`/`source_title` 컬럼 추가 등 스키마가 여러 차례 바뀌었는데, `Base.metadata.create_all()`은 신규 테이블만 생성하고 기존 테이블은 변경하지 않는다. Alembic 마이그레이션 파일은 만들어뒀지만 `create_all()`이 이미 만든 인덱스와 충돌할 가능성이 있어, 실제로는 `ALTER TABLE`을 직접 실행하는 방식을 병행.

#### Step 12: 퀴즈 UI ✅

카테고리 + 문제 유형 선택 → 생성 → 문제별 즉시 채점(정답/오답 + 설명 표시) + 진행률 표시. 문제 아래 출처 표시(매칭 성공 시 클릭하면 우측 패널에서 원문 열람).

---

### Phase 4 — 운영 품질

**Rate Limiting (slowapi)**: AI 엔드포인트 과금 방지

**Django Admin 패널 (Step 13-B)** ✅

**계기**: 수업에서 "FastAPI 프로젝트를 Django로 감싸서 Docker/AWS로 배포"하라는 요구사항이 있었고, 동시에 서비스 자체에도 관리자 페이지/슈퍼유저가 없어 운영이 안 되는 문제가 있었다. FastAPI를 Django 라우팅 안에 억지로 마운트하는 방식은 표준 패턴이 아니라고 판단해 배제하고, **Django를 Admin 전용 프로젝트로 별도 추가**하는 구조로 결정했다.

**구조**:
```
board/
  backend/   ← FastAPI (무변경)
  frontend/  ← React (무변경)
  admin/     ← Django (신규, Admin 전용)
    config/settings.py   MySQL 연결(기존 DATABASE_URL 파싱), INSTALLED_APPS
    boarddata/models.py  기존 8개 테이블 unmanaged 매핑
    boarddata/admin.py   ReadOnlyAdmin (추가/수정 금지)
```

**핵심 설계 결정**:
- **인증 완전 분리**: Django Admin은 Django 자체 인증(`auth_user`, `createsuperuser`)만 사용. 서비스의 `users` 테이블(JWT+bcrypt)과는 전혀 연결하지 않음 — 회원 계정 침해가 관리자 권한 침해로 번지지 않도록 함
- **모델은 전부 unmanaged (`managed = False`)**: 테이블 스키마의 단일 진실 공급원은 계속 Alembic. Django는 읽기 전용 매핑만 하고 마이그레이션은 관여하지 않음
- **이름 충돌 회피**: `users` 테이블을 매핑한 모델은 Django 자체 `auth.User`와 헷갈리지 않도록 `AppUser`로 명명
- **FK는 `on_delete=models.DO_NOTHING`**: cascade 규칙이 이미 MySQL 제약(ON DELETE CASCADE/SET NULL)에 있으므로 Django ORM이 애플리케이션 레벨에서 중복으로 관여하지 않게 함
- **조회 위주 권한(`ReadOnlyAdmin`)**: `has_add_permission`/`has_change_permission`을 항상 `False`로 오버라이드해 추가/수정을 막고 조회+삭제(정리용)만 허용. 이유: Admin 폼으로 직접 값을 바꾸면 서비스 레이어의 비즈니스 로직(예: bcrypt 해싱, 카테고리 depth 3단계 제한)을 우회하게 되기 때문
- **생략한 부분**: `post_tags` 다대다 중간 테이블은 자체 `id` 컬럼이 없는 복합키 구조라 Django ORM과 맞지 않아 이번 라운드에서는 매핑 생략

**확인된 동작**: Django Admin은 유저별로 스코핑되지 않고 전체 유저 데이터를 조회 가능(의도된 설계, 운영자용 전체 감독 도구). 반대로 FastAPI 서비스는 여전히 `current_user.id` 기준으로 본인 데이터만 보이게 스코핑됨. 방금 만든 Django 슈퍼유저로 서비스 일반 로그인은 불가능함을 확인 — 인증 분리가 의도대로 동작.

**Docker Compose 전체 통합 (Step 15)** ✅

`docker-compose.yml`(루트) 하나로 `mysql`, `qdrant`, `backend`, `admin`, `frontend` 5개 컨테이너를 묶었다. 호스트에 노출되는 포트는 `frontend`의 80뿐이고, `frontend` 이미지의 Nginx가 정적 파일 서빙과 리버스 프록시(`/api`→backend, `/admin`·`/django-static`→admin)를 동시에 담당해서 별도 프록시 컨테이너를 두지 않았다.

컨테이너화 과정에서 실제 코드도 일부 손봐야 했다: Qdrant 접속 주소(`rag_service.py`, `embedding_service.py`)가 `host="localhost"`로 하드코딩돼 있어서 `os.getenv("QDRANT_HOST", "localhost")`로 바꾸고, 프론트 `api/*.js`의 `BASE_URL` 하드코딩(`http://localhost:8000`)도 `process.env.REACT_APP_API_URL ?? "http://localhost:8000"`로 바꿔서 Docker 빌드 시엔 빈 문자열(상대경로)을, 로컬 개발 시엔 기존 값을 쓰게 했다.

가장 시간이 걸린 트러블슈팅은 CRA 프로덕션 빌드 자체가 깨지는 문제였다: `@blocknote/code-block`이 기본 제공하는 언어 문법 중 일부(`csharp`, `css`)가 ES2024 정규식 "v" flag를 쓰는데, CRA(`react-scripts` 5.0.1)의 구버전 Babel이 이를 파싱 못 해 `SyntaxError`. Docker 문제로 의심했지만 로컬 빌드에서도 재현되어 실제 의존성 비호환 문제로 확인했고, `shiki-codegen`으로 실제 쓰는 언어만 골라 `oniguruma`(WASM, JS 정규식이 아닌 JSON 문법 데이터) 엔진 기반 커스텀 번들을 만들어 교체해서 해결했다(`frontend/src/lib/shiki.bundle.js`).

그 외: MySQL 공식 이미지가 `MYSQL_USER=root`를 거부하는 문제(→ root는 `MYSQL_ROOT_PASSWORD`만 사용), `mysql` 서비스에 걸려있던 `env_file`이 `.env`의 `MYSQL_USER=root` 잔여값을 계속 재주입하던 문제(→ mysql 서비스에서 `env_file` 제거), Django 정적 파일 경로(`/static/`)가 React 빌드 결과물과 충돌 가능성이 있어 `whitenoise` 도입 + `STATIC_URL`을 `django-static/`으로 분리 — 자세한 트러블슈팅 순서는 `PLAN.md`에 기록.

**남은 작업**: GitHub Actions CI/CD, 실제 AWS/VPS 배포.

**구조화 로깅 (structlog)**: print() 대신 JSON 형식 로그

**Docker Compose 구성:**
```yaml
services:
  backend:   FastAPI
  frontend:  Nginx + React 빌드
  qdrant:    Qdrant 벡터 DB
  db:        MySQL
```

**GitHub Actions CI/CD**: 푸시 → 테스트 → Docker 빌드 → VPS 자동 배포

---

## 6. 파일 구조 (현재)

```
backend/
  requirements.txt              ✅ 전체 패키지 목록 (langgraph, langsmith 포함)
  alembic/versions/              ✅ 5개 마이그레이션 (init, 대화, 퀴즈 테이블, quiz_type, 출처)
  app/
    main.py                     ✅ 로깅 설정 + 전체 라우터 등록
    core/
      config.py                 ✅ .env 로드 (load_dotenv 병행, pydantic Settings extra=ignore)
    utils/
      blocknote.py               ✅ BlockNote JSON 텍스트 추출
      chunking.py                ✅ 블록 단위 청킹
    services/
      auth_service.py            ✅
      post_service.py            ✅
      category_service.py        ✅ (get_category_path 포함)
      conversation_service.py    ✅ 대화 CRUD + 히스토리
      quiz_service.py            ✅ 퀴즈 생성/채점/자동정리/출처매칭
      ai/
        __init__.py
        embedding_service.py     ✅ Qdrant 인덱싱 + 삭제
        rag_service.py           ✅ Vector Search + GPT 응답 생성 (비동기)
        graph_service.py         ✅ LangGraph 멀티턴 + LangSmith 추적
    routers/
      auth_router.py             ✅
      post_router.py              ✅ (embedding BackgroundTasks 연동)
      category_router.py          ✅
      ai_router.py                 ✅ POST /api/ai/chat (멀티턴)
      conversation_router.py      ✅ 대화 목록/히스토리
      quiz_router.py               ✅ 퀴즈 생성/채점
    models/
      user.py                     ✅
      post.py                     ✅
      conversation.py             ✅ Conversation, Message
      quiz.py                     ✅ Quiz, QuizAttempt
  tests/
    test_blocknote.py             ✅ 통과
    test_chunking.py              ⏳
    test_embedding.py             ⏳
    test_rag.py                   ⏳

frontend/
  Dockerfile                       ✅ node 빌드 → nginx 서빙 멀티스테이지 + nginx.conf 반영
  nginx.conf                        ✅ /, /api, /admin, /django-static 경로 라우팅
  src/
    pages/                          ✅ HomePage, Post*Page, QuizPage
    components/
      Sidebar.jsx                   ✅ 카테고리 트리
      ResizableRightPanel.jsx       ✅ PostDetailPage/QuizPage 공용 우측 패널
    lib/
      editorSchema.js                ✅ 커스텀 shiki 하이라이터 적용
      shiki.bundle.js                 ✅ shiki-codegen 생성 (oniguruma 엔진)
    api/                             ✅ auth, posts, categories, conversations, quizzes (BASE_URL env 오버라이드 가능)
    context/AuthContext.js           ✅

admin/                              ✅ Django Admin 전용 프로젝트 (별도 가상환경/의존성 아님, 같은 conda env)
  Dockerfile                        ✅ mysqlclient 빌드 의존성 + collectstatic + gunicorn
  requirements.txt                   ✅ Django, mysqlclient, python-dotenv, gunicorn, whitenoise
  config/settings.py                ✅ DATABASE_URL 파싱 → DATABASES, whitenoise, 루트 .env 재사용
  boarddata/models.py                ✅ unmanaged 모델 8종 (AppUser, Category, Tag, Post, Conversation, Message, Quiz, QuizAttempt)
  boarddata/admin.py                 ✅ ReadOnlyAdmin 상속 등록
  manage.py

docker-compose.yml                  ✅ mysql/qdrant/backend/admin/frontend 통합
```

> 백엔드/프론트 단위 테스트(`test_chunking`, `test_embedding`, `test_rag` 등)는 아직 미작성 — 향후 확장 후보로 8장에 별도 기재.

---

## 7. 버그 수정 기록

**Phase 1**
- `post_router.py` — `/tags/all` 라우트가 `/{post_id}` 뒤에 있어서 항상 422 에러 → 순서 변경
- `post_service.py` — 미리보기에 `strip_html()` 사용 중 BlockNote JSON이 그대로 노출 → `extract_text_from_blocknote()`로 교체

**Phase 2 (멀티턴 대화)**
- `rag_search`에서 Qdrant 컬렉션이 아직 없을 때(글 인덱싱 전) 500 에러 → 빈 리스트 반환하도록 수정
- 의도 분류 프롬프트가 상식으로 답할 수 있는 질문을 `general`로 잘못 분류 → "애매하면 무조건 rag"로 프롬프트 강화
- `main.py`에 `logging.basicConfig` 부재로 그래프 내부 로그가 전혀 안 찍힘 → 추가
- `index_post()` 백그라운드 태스크가 조용히 실패할 수 있어 try/except + 로그 추가
- `core/config.py`: pydantic-settings가 `.env` 값을 `os.environ`으로 내보내지 않아 LangSmith가 `LANGSMITH_*` 값을 못 읽음 → `load_dotenv()` 추가, `Settings`에 `extra="ignore"` 추가(선언 안 된 키로 인한 서버 크래시 방지)

**Phase 4 (Docker Compose 통합)**
- CRA 프로덕션 빌드가 `@shikijs/langs-precompiled`의 일부 언어 문법(csharp, css 등)에서 ES2024 정규식 "v" flag를 못 읽어 `SyntaxError`로 실패 → 실제 필요한 언어만 `oniguruma` 엔진 기반 커스텀 번들(`shiki-codegen`)로 교체해서 해결 (Docker 문제로 오인했으나 로컬 빌드에서도 재현되어 실제 의존성 문제로 확인)
- `npm ci`가 Windows에서 생성한 `package-lock.json`을 Linux 컨테이너에서 플랫폼별 optional 의존성 차이로 계속 거부(`Missing: yaml@2.9.0`) → 재생성해도 반복되어 `npm install`로 되돌림 (원래 빌드를 막던 원인은 위 shiki 문제였고 해결 후엔 `npm install`도 정상 동작)
- MySQL 공식 이미지가 `MYSQL_USER=root` 설정을 거부(root는 `MYSQL_ROOT_PASSWORD` 전용) → root 계정 기준으로 `DATABASE_URL` 통일
- `mysql` 서비스의 `env_file`이 `.env`에 남아있던 `MYSQL_USER=root`를 `environment:` 수정과 무관하게 계속 재주입 → `mysql` 서비스에서 `env_file` 자체 제거로 해결. 이미 생성된 컨테이너는 환경변수가 고정되므로 설정 변경 후 `docker compose down` 후 재기동이 필요했음
- Django 정적 파일 경로(`/static/`)가 React 빌드 결과물과 경로 충돌 가능성 → `whitenoise` 도입 + `STATIC_URL`을 `django-static/`으로 분리
- 새 MySQL 컨테이너에 Django 자체 인증 테이블이 없어 `createsuperuser` 실패 → `python manage.py migrate`로 `auth`/`admin`/`contenttypes`/`sessions` 테이블만 생성(앱 테이블은 `managed=False`라 무관)

**Phase 3 (퀴즈 시스템)**
- 우측 패널 코드블록 잘림 — 원인 두 겹: (1) 컨테이너 체인에 `min-width` 제약 부재로 좁은 flex 레이아웃에서 스크롤 대신 클리핑되는 CSS 이슈, (2) BlockNote 에디터 자체의 좌우 54px 고정 패딩이 좁은 패널의 실사용 폭을 크게 잠식 → 둘 다 스코프 CSS로 해결
- DB 스키마 변경(quiz_type, source_post_id 등 컬럼 추가) 후 `Unknown column` 에러 — `create_all()`은 신규 테이블만 생성하고 기존 테이블은 갱신하지 않음 → Alembic 마이그레이션 작성 + 직접 `ALTER TABLE` 실행 병행
- 우측 패널에서 글 클릭 시 페이지 이동으로 QuizPage가 언마운트되며 진행 중이던 퀴즈가 소실 → 페이지 이동 대신 패널 내 인라인 미리보기로 변경

---

## 8. 향후 확장 가능성 (포트폴리오 관점)

**RAG 품질**
- **Hybrid Search (BM25 + Vector)**: 키워드 매칭과 벡터 유사도를 함께 사용해 RAG 정확도 향상
- **Re-ranking**: 검색 상위 k개 청크를 관련도 순으로 재정렬
- **RAGAS**: RAG 응답 품질 정량 평가
- **GraphRAG**: 노트에서 개념-관계를 LLM으로 추출 → Neo4j 지식 그래프 → 멀티홉 질문 정확도 향상

**대화/UX**
- **스트리밍 응답 (SSE)**: ChatGPT 스타일 타이핑 UX

**퀴즈 시스템**
- **혼합 유형**: GPT가 노트 내용에 따라 문제 유형(객관식/OX/빈칸)을 자동 결정 — 현재는 프론트에서 수동 선택만 지원
- **SM-2 알고리즘**: `quiz_attempts` 기록 기반 복습 스케줄링 (`next_review_at` 컬럼 추가 필요)
- **출처 추적 고도화**: 현재는 GPT 자기 보고 + 텍스트 대조 방식(best-effort). 노트를 청크 단위로 임베딩해서 관련도 기반으로 출처를 추정하면 정확도 향상 가능

**운영/인프라 (Phase 4)**
- **Celery**: BackgroundTasks → Celery로 확장 시 대규모 임베딩 처리 가능
- Rate Limiting(slowapi) ✅, Django Admin 패널 ✅, Docker Compose 통합 ✅ — 남은 것: 구조화 로깅(structlog), GitHub Actions CI/CD, VPS/AWS 실제 배포
