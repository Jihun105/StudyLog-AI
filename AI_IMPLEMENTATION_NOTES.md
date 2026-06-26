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
| FastAPI BackgroundTasks | 임베딩 비동기 처리 | Phase 1 Step 2 |
| slowapi | Rate Limiting (AI 엔드포인트 과금 방지) | Phase 4 |
| structlog | 구조화 로깅 (JSON 형식) | Phase 4 |

### Database
| 기술 | 용도 | 비고 |
|---|---|---|
| MySQL | 메인 DB (유저, 포스트, 대화, 퀴즈) | 기존 구현 완료 |
| Qdrant | 벡터 DB (임베딩 저장 및 검색) | Phase 1 Step 2 |

### AI
| 기술 | 용도 | 비고 |
|---|---|---|
| OpenAI text-embedding-3-small | 노트 임베딩 생성 (1536차원) | Phase 1 Step 2 |
| GPT-4o-mini | 대화 응답 + 퀴즈 생성 | Phase 1 Step 4 |
| Hybrid Search (Vector + BM25) | RAG 검색 품질 향상 | Phase 1 Step 3 |
| LangChain | RAG 파이프라인 (문서 로더, 텍스트 스플리터, 체인) | Phase 1 |
| LangGraph | 멀티턴 대화 상태 관리 + Agent 흐름 제어 | Phase 2 |
| LangSmith | LLM 모니터링 (토큰, 레이턴시, 체인 단계별 추적) | Phase 1 Step 5 |

### Infra / DevOps
| 기술 | 용도 | 비고 |
|---|---|---|
| Docker + Docker Compose | 전체 서비스 컨테이너화 | Phase 4 |
| GitHub Actions | CI/CD (푸시 → 테스트 → 자동 배포) | Phase 4 |
| Nginx | 리버스 프록시 + React 서빙 | Phase 4 |
| VPS (DigitalOcean / Hetzner) | 서버 ($6~12/월) | Phase 4 |

### 설치된 패키지 (AI 관련)
```
openai==2.38.0
langchain==1.3.2
langchain-openai==1.2.2
langchain-qdrant
langchain-text-splitters
qdrant-client
```

---

## 3. 전체 아키텍처

```
[React] ──→ [Nginx] ──→ [FastAPI]
                              ├── MySQL         유저, 포스트, 대화, 퀴즈
                              ├── Qdrant        벡터 임베딩
                              ├── OpenAI API    임베딩 + 응답 생성
                              ├── LangChain     RAG 파이프라인
                              ├── LangGraph     대화 Agent 흐름
                              └── LangSmith     LLM 모니터링

[GitHub Actions] → Docker Build → VPS 자동 배포
```

---

## 4. 구현 계획 및 진행 상황

| Phase | Step | 내용 | 상태 |
|---|---|---|---|
| Phase 1 | Step 1 | BlockNote JSON → 텍스트 추출 유틸 | ✅ 완료 |
| Phase 1 | Step 2 | Qdrant 연동 + 임베딩 인덱싱 (BackgroundTasks) | 🔄 진행 중 |
| Phase 1 | Step 3 | LangChain RetrievalChain + Hybrid Search | ⏳ 대기 |
| Phase 1 | Step 4 | GPT-4o-mini 연동 + 스트리밍 응답 (SSE) | ⏳ 대기 |
| Phase 1 | Step 5 | LangSmith 연동 | ⏳ 대기 |
| Phase 2 | Step 6 | conversations / messages 테이블 추가 (Alembic) | ⏳ 대기 |
| Phase 2 | Step 7 | LangGraph StateGraph 의도 분류 + 라우팅 Agent | ⏳ 대기 |
| Phase 2 | Step 8 | 대화 히스토리 API + 프론트 연동 | ⏳ 대기 |
| Phase 3 | Step 9 | LangGraph에 퀴즈 생성 노드 추가 | ⏳ 대기 |
| Phase 3 | Step 10 | quizzes / quiz_attempts 테이블 + 결과 저장 | ⏳ 대기 |
| Phase 3 | Step 11 | 퀴즈 UI 구현 | ⏳ 대기 |
| Phase 4 | Step 12 | Rate Limiting (slowapi) | ⏳ 대기 |
| Phase 4 | Step 13 | 구조화 로깅 (structlog) | ⏳ 대기 |
| Phase 4 | Step 14 | Docker Compose 작성 | ⏳ 대기 |
| Phase 4 | Step 15 | GitHub Actions CI/CD | ⏳ 대기 |
| Phase 4 | Step 16 | VPS 배포 | ⏳ 대기 |

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

#### Step 2: Qdrant 연동 + 임베딩 인덱싱 🔄

**파일**: `backend/app/utils/chunking.py`, `backend/app/services/embedding_service.py`

**Qdrant 환경:**
- 개발: Docker로 로컬 실행
  ```bash
  docker run -d --name qdrant -p 6333:6333 qdrant/qdrant
  ```
- 대시보드: `http://localhost:6333/dashboard`
- 배포: Docker Compose로 전환

**청킹 전략: 블록 단위 청킹**

글자 수 기준(RecursiveCharacterTextSplitter) 대신 BlockNote 블록을 의미 단위로 사용.

- `heading` 블록이 나오면 새 청크 시작 → 섹션 경계 = 청크 경계
- heading 없는 경우 `max_blocks_per_chunk`(기본값 5)개씩 강제 분리
- overlap: 각 청크 마지막 블록을 다음 청크 첫 블록으로 포함 → 맥락 유실 방지

**임베딩 품질 향상: category_path + 제목 prefix**

청크 텍스트 앞에 카테고리 경로와 포스트 제목을 prefix로 붙여 임베딩에 도메인 정보를 녹여 넣음.

```
[머신러닝 > 선형대수 > 기초개념] [선형 변환 정리]
선형 변환은 벡터 공간에서...
```

**Qdrant 저장 구조:**
```json
{
  "page_content": "[머신러닝 > 선형대수] [선형 변환 정리]\n청크 내용...",
  "metadata": {
    "post_id": 42,
    "user_id": 7,
    "category_id": 12,
    "category_path": "머신러닝 > 선형대수 > 기초개념"
  }
}
```

**메타데이터 설계 이유:**
- `user_id`: 검색 시 본인 노트만 필터링 (보안 필수)
- `post_id`: 답변에 출처 포스트 표시용
- `category_id`: 특정 폴더 범위 내 검색 필터링용
- `category_path`: AI 응답 생성 시 문맥 정보 제공용

**모델:**
- 임베딩: `text-embedding-3-small` (1536차원)
- 응답 생성: `GPT-4o-mini`

**`index_post()` 시그니처:**
```python
def index_post(
    post_id: int,
    user_id: int,
    title: str,
    content: str,
    category_path: str
) -> None:
```

**BackgroundTasks 연동**: 포스트 저장 API에서 임베딩 인덱싱을 BackgroundTasks로 처리 → HTTP 응답 블로킹 방지

---

#### Step 3: Hybrid Search

**파일**: `backend/app/services/rag_service.py`

Vector Search + BM25 조합. 키워드가 정확히 일치해도 벡터 검색 단독으론 놓칠 수 있는 케이스 보완.

> ⚠️ Qdrant Sparse Vector 방식 vs LangChain EnsembleRetriever 방식 중 구현 시 결정 필요

---

#### Step 4: 스트리밍 응답 (SSE)

**파일**: `backend/app/routers/ai_router.py`

FastAPI `StreamingResponse`로 SSE 구현 → 글자가 흘러나오는 ChatGPT 스타일 UX.

```
GET /ai/chat  →  StreamingResponse (text/event-stream)
```

---

#### Step 5: LangSmith 연동

환경변수 설정만으로 LangChain/LangGraph 체인 실행 자동 추적.

```env
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=...
LANGCHAIN_PROJECT=board-ai
```

---

### Phase 2 — 멀티턴 대화 (LangGraph)

#### DB 스키마 추가 (Step 6)
```sql
conversations (
    id, user_id, post_id (nullable), title, created_at
)

messages (
    id, conversation_id, role (user/assistant), content, created_at
)
```

#### LangGraph StateGraph 구조 (Step 7)
```
[사용자 입력]
     ↓
[의도 분류 노드]
     ├──→ [RAG 검색 노드] ──→ [응답 생성 노드]
     ├──→ [퀴즈 생성 노드]
     └──→ [일반 대화 노드]
                              ↓
                         [스트리밍 출력]
```

**동작 방식:**
- `StateGraph`로 대화 상태(메시지 히스토리, 검색 결과) 관리
- 대화별 최근 N개 메시지를 OpenAI 호출 시 포함
- RAG 검색 청크는 system prompt에 주입
- `post_id` 있으면 해당 노트 기반 대화, 없으면 전체 노트 대상

---

### Phase 3 — 퀴즈 시스템

#### DB 스키마 추가 (Step 10)
```sql
quizzes (
    id, post_id, question, type (객관식/OX/빈칸),
    options (JSON), answer, explanation, created_at
)

quiz_attempts (
    id, user_id, quiz_id, user_answer, is_correct, created_at
    -- 추후 스페이스드 리피티션: next_review_at 컬럼 추가
)
```

**퀴즈 타입**: 객관식 / OX / 빈칸 채우기 / 혼합 (UI에서 선택)

**혼합 선택 시**: GPT가 노트 내용에 따라 적합한 타입 자동 결정

---

### Phase 4 — 운영 품질

**Rate Limiting (slowapi)**: AI 엔드포인트 과금 방지

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

## 6. 파일 구조 (목표)

```
backend/
  app/
    utils/
      blocknote.py          ✅ BlockNote JSON 텍스트 추출
      chunking.py           🔄 블록 단위 청킹
    services/
      auth_service.py       ✅
      post_service.py       ✅ (index_post 호출 추가 예정)
      category_service.py   ✅ (category_path 조합 추가 예정)
      embedding_service.py  ⏳ Qdrant 인덱싱
      rag_service.py        ⏳ Hybrid Search + 응답 생성
    routers/
      auth_router.py        ✅
      post_router.py        ✅
      category_router.py    ✅
      ai_router.py          ⏳ 채팅 + 퀴즈 엔드포인트
    models/
      user.py               ✅
      post.py               ✅
      conversation.py       ⏳ Phase 2
      quiz.py               ⏳ Phase 3
  tests/
    test_blocknote.py       ✅ 통과
    test_chunking.py        ⏳
    test_embedding.py       ⏳
    test_rag.py             ⏳
```

---

## 7. 향후 확장 가능성 (포트폴리오 관점)

- **Re-ranking**: 검색 상위 k개 청크를 관련도 순으로 재정렬 → RAG 정확도 향상
- **GraphRAG**: 노트에서 개념-관계를 LLM으로 추출 → Neo4j 지식 그래프 → 멀티홉 질문 정확도 향상
- **SM-2 알고리즘**: 퀴즈 결과 기반 복습 스케줄링 (next_review_at 컬럼 활용)
- **Celery**: BackgroundTasks → Celery로 확장 시 대규모 임베딩 처리 가능
