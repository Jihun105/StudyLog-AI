# AI 기능 도입 및 배포 계획

## 1. 프로젝트 목표

- 개인 공부 노트를 저장하고, RAG 기반 AI가 그 내용을 바탕으로 답변
- 퀴즈 생성 및 결과 저장으로 복습 지원
- 반 친구들과 함께 쓸 수 있도록 배포
- 포트폴리오로도 활용 — 실무 감각을 보여주는 기술 적용

---

## 2. 최종 기술 스택

### Frontend
| 기술 | 용도 |
|---|---|
| React + React Router v7 | SPA 프레임워크 |
| BlockNote | 노션 스타일 에디터 |
| Tailwind CSS | 스타일링 |
| Axios | API 통신 |
| Vercel or Nginx | 배포 |

### Backend
| 기술 | 용도 |
|---|---|
| FastAPI | API 서버 |
| SQLAlchemy + Alembic | ORM + 마이그레이션 |
| slowapi | Rate Limiting (AI 엔드포인트 과금 방지) |
| structlog | 구조화 로깅 (JSON 형식) |
| FastAPI BackgroundTasks | 임베딩 비동기 처리 (→ 추후 Celery로 확장) |

### Database
| 기술 | 용도 |
|---|---|
| MySQL | 메인 DB (유저, 포스트, 대화, 퀴즈) |
| Qdrant | 벡터 DB (임베딩 저장 및 검색) |

### AI
| 기술 | 용도 |
|---|---|
| OpenAI text-embedding-3-small | 노트 임베딩 생성 |
| GPT-4o-mini | 대화 응답 + 퀴즈 생성 |
| Hybrid Search (Vector + BM25) | RAG 검색 품질 향상 |
| LangChain | RAG 파이프라인 구성 (문서 로더, 텍스트 스플리터, 체인) |
| LangGraph | 멀티턴 대화 상태 관리 + Agent 흐름 제어 |
| LangSmith | LLM 모니터링 (토큰, 레이턴시, 체인 단계별 추적) |

### Infra / DevOps
| 기술 | 용도 |
|---|---|
| Docker + Docker Compose | 전체 서비스 컨테이너화 |
| GitHub Actions | CI/CD (푸시 → 테스트 → 자동 배포) |
| Nginx | 리버스 프록시 + React 서빙 |
| VPS (DigitalOcean / Hetzner) | 서버 ($6~12/월) |

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

## 4. RAG 시스템 설계

### 인덱싱 파이프라인 (노트 저장 시)
```
포스트 저장
    → BlockNote JSON에서 텍스트 추출
    → LangChain TextSplitter로 블록 단위 청킹
    → OpenAI text-embedding-3-small로 임베딩 생성
    → Qdrant에 저장 (메타데이터: user_id, post_id)
```
> 임베딩 생성은 BackgroundTasks로 처리 — HTTP 응답 블로킹 방지

### 검색 파이프라인 (사용자 질문 시)
```
사용자 질문
    → LangGraph Agent가 질문 의도 분류
         ├── RAG 필요 → Qdrant Hybrid Search (Vector + BM25)
         │                → 상위 k개 청크 (user_id 필터링)
         │                → LangChain RetrievalChain으로 응답 생성
         └── 일반 대화 → 대화 히스토리만으로 GPT-4o-mini 호출
    → 스트리밍 응답 (SSE)으로 프론트에 전달
    → LangSmith에 전체 체인 실행 자동 추적
```

### 핵심 설계 포인트
- **LangGraph 라우팅**: "퀴즈 만들어줘" / "이게 뭐야?" / "일반 질문" 등 의도에 따라 다른 노드로 분기
- **user_id 필터링**: 본인 노트만 검색되도록 Qdrant 쿼리에 필터 필수
- **Hybrid Search**: 벡터 검색 단독보다 키워드가 다른 유사 개념 검색 정확도 향상
- **스트리밍 응답**: FastAPI `StreamingResponse` → ChatGPT처럼 글자가 흘러나오는 UX
- **LangSmith 자동 추적**: LangChain/LangGraph 사용 시 환경변수 설정만으로 모든 체인 실행이 자동 로깅됨

---

## 5. 멀티턴 대화 설계

### DB 스키마 추가
```sql
conversations (
    id, user_id, post_id (nullable), title, created_at
)

messages (
    id, conversation_id, role (user/assistant), content, created_at
)
```

### LangGraph 상태 그래프 구조
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

### 동작 방식
- LangGraph의 `StateGraph`로 대화 상태(메시지 히스토리, 검색 결과 등)를 관리
- 대화별로 최근 N개 메시지를 OpenAI 호출 시 포함
- RAG로 검색된 청크는 system prompt에 주입
- post_id가 있으면 해당 노트 기반 대화, 없으면 전체 노트 대상

---

## 6. 퀴즈 시스템 설계

### DB 스키마 추가
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

### 생성 방식
- 단일 노트 내용 → GPT-4o-mini에 프롬프트 → JSON 구조 퀴즈 반환
- 추후 SM-2 알고리즘으로 복습 스케줄링 확장 가능

### 퀴즈 타입 선택 (사용자가 직접 선택)
- UI에서 퀴즈 생성 전 타입 선택: **객관식 / OX / 빈칸 채우기 / 혼합**
- 선택한 타입을 API 요청에 포함 → LangGraph 퀴즈 노드에서 해당 타입에 맞는 프롬프트 사용
- **혼합** 선택 시 GPT가 노트 내용에 따라 적합한 타입을 자동 결정

---

## 7. 포트폴리오 관점에서 임팩트 높은 기술들

| 기술 | 왜 중요한가 | 구현 난이도 |
|---|---|---|
| **스트리밍 응답 (SSE)** | 실시간 UX + "응답 지연을 어떻게 해결했나" 면접 답변 | ★★★ |
| **LangChain** | RAG 파이프라인 — LLM 생태계 이해도 | ★★ |
| **LangGraph** | Agent 흐름 설계 — 아직 쓰는 곳 드물어 차별점이 됨 | ★★★ |
| **LangSmith** | LLM 체인 모니터링 — AI 서비스 실무 감각 | ★★ |
| **GitHub Actions CI/CD** | 전체 개발 사이클을 혼자 돌릴 줄 안다는 신호 | ★★ |
| **Rate Limiting** | AI API 과금 방지 — 비용/보안 감각 | ★ |
| **Hybrid Search** | RAG 한계를 알고 보완했다는 깊이 | ★★★ |
| **BackgroundTasks** | 비동기 처리 감각 | ★★ |
| **structlog** | print() 대신 구조화 로깅 — 실무 경험자처럼 보임 | ★ |

---

## 8. GraphDB에 대한 결론

현재 데이터 모델에는 GraphDB가 자연스럽게 맞는 구조가 없어 도입 불필요.

추후 **GraphRAG** 방향으로 확장 가능:
- 노트에서 개념과 관계를 LLM으로 추출
- 지식 그래프로 구성 (Neo4j)
- 멀티홉 질문 ("ORM 제공하는 Python 프레임워크?") 정확도 향상

지금은 기본 RAG 완성 후 README에 향후 개선 방향으로 언급하는 수준 권장.

---

## 9. MySQL 확장성

MySQL 자체는 수백만 유저도 버티는 검증된 DB. 이 프로젝트에서 병목이 생기는 순서:

```
1순위. AI 엔드포인트 동시 요청 (FastAPI 워커 수)
2순위. 임베딩 생성 부하 (BackgroundTask / Queue)
3순위. Qdrant 벡터 검색 튜닝
4순위. MySQL (한참 나중 얘기)
```

지금 해야 할 것: 인덱스 확인 (`user_id`, `post_id`, `created_at`), 커넥션 풀 설정, N+1 쿼리 방지.

---

## 10. 구현 순서 (권장)

```
Phase 1 — RAG 기반 AI 답변
    1. BlockNote JSON → 텍스트 추출 유틸
    2. LangChain TextSplitter + Qdrant 연동 + 임베딩 인덱싱 (BackgroundTasks)
    3. LangChain RetrievalChain + Hybrid Search 구현
    4. GPT-4o-mini 연동 + 스트리밍 응답 (SSE)
    5. LangSmith 연동 (환경변수 설정으로 자동 추적)

Phase 2 — 멀티턴 대화 (LangGraph)
    6. conversations / messages 테이블 추가 (Alembic)
    7. LangGraph StateGraph로 의도 분류 + 라우팅 Agent 구성
    8. 대화 히스토리 API + 프론트 연동

Phase 3 — 퀴즈
    9. LangGraph에 퀴즈 생성 노드 추가
    10. quizzes / quiz_attempts 테이블 + 결과 저장
    11. 퀴즈 UI 구현

Phase 4 — 운영 품질
    12. Rate Limiting (slowapi)
    13. 구조화 로깅 (structlog)
    14. Docker Compose 작성
    15. GitHub Actions CI/CD
    16. VPS 배포
```
