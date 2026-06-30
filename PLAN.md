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
        quiz.py                 ⏳ Phase 3
      schemas/
        user.py                 ✅
        post.py                 ✅
        category.py             ✅
      routers/
        auth_router.py          ✅
        post_router.py          ✅ (embedding BackgroundTasks 연동)
        category_router.py      ✅
        ai_router.py            ✅ POST /api/ai/chat
      services/
        auth_service.py         ✅
        post_service.py         ✅
        category_service.py     ✅ (get_category_path 포함)
        ai/
          __init__.py
          embedding_service.py  ✅ Qdrant 인덱싱 + 삭제
          rag_service.py        ✅ Vector Search + GPT 응답
          graph_service.py      ⏳ Phase 2 Step 7
      utils/
        blocknote.py            ✅ BlockNote JSON → 텍스트 추출
        chunking.py             ✅ 블록 단위 청킹
  frontend/
    src/
      pages/                    ✅ HomePage, PostCreatePage, PostDetailPage 등
      components/               ✅ Navbar, Sidebar, RichTextEditor(BlockNote)
      api/                      ✅ auth.js, posts.js, categories.js
      context/AuthContext.js    ✅
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
| Phase 2 | Step 7 | LangGraph StateGraph 의도 분류 + 멀티턴 대화 | 🔄 다음 작업 |
| Phase 2 | Step 8 | 대화 히스토리 API + 프론트 연동 | ⏳ 대기 |
| Phase 2 | Step 9 | LangSmith 연동 (LangGraph와 함께) | ⏳ 대기 |
| Phase 1-2 | 보완 | Hybrid Search (BM25 + Vector) | ⏳ 대기 |
| Phase 1-2 | 보완 | 스트리밍 응답 (SSE) | ⏳ 대기 |
| Phase 3 | Step 10 | LangGraph에 퀴즈 생성 노드 추가 | ⏳ 대기 |
| Phase 3 | Step 11 | quizzes / quiz_attempts 테이블 + 결과 저장 | ⏳ 대기 |
| Phase 3 | Step 12 | 퀴즈 UI 구현 | ⏳ 대기 |
| Phase 4 | Step 13 | Rate Limiting (slowapi) | ⏳ 대기 |
| Phase 4 | Step 14 | 구조화 로깅 (structlog) | ⏳ 대기 |
| Phase 4 | Step 15 | Docker Compose 작성 | ⏳ 대기 |
| Phase 4 | Step 16 | GitHub Actions CI/CD | ⏳ 대기 |
| Phase 4 | Step 17 | VPS 배포 | ⏳ 대기 |

---

## 다음에 할 것 — Phase 2 Step 7: LangGraph 멀티턴 대화

### 만들 파일
`backend/app/services/ai/graph_service.py`

### LangGraph State 구조
```python
{
    "query": "사용자 질문",
    "user_id": 1,
    "conversation_id": 3,
    "history": [
        {"role": "user", "content": "이전 질문"},
        {"role": "assistant", "content": "이전 답변"},
    ],
    "chunks": [],   # RAG 검색 결과
    "intent": "",   # "rag" or "general"
    "answer": ""    # 최종 답변
}
```

### LangGraph 노드 흐름
```
[사용자 입력]
     ↓
[의도 분류 노드] → "RAG 질문이야? 일반 대화야?"
     ├──→ [RAG 검색 노드] → Qdrant 검색
     └──→ [일반 대화 노드]
              ↓
     [응답 생성 노드] → 히스토리 + RAG 결과 → GPT 호출
              ↓
     [DB 저장 노드] → messages 테이블에 저장
```

### 대화 히스토리 전략
- DB에 전체 히스토리 저장
- GPT 호출 시 최근 10개 메시지만 포함 (토큰 비용 절감)
- 새 대화 시작 시 새 conversation 생성

### 바꿀 것
- `ai_router.py`: conversation_id를 받아서 히스토리 로드
- `rag_service.py`의 `ask()` → `graph_service.py`의 LangGraph로 교체

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
| POST | /api/ai/chat | RAG 기반 질문 답변 |

---

## 기술 스택

### Backend
- FastAPI + SQLAlchemy(async) + aiomysql + Alembic
- Qdrant (벡터 DB, Docker로 실행)
- OpenAI text-embedding-3-small (임베딩)
- GPT-4o-mini (응답 생성)
- LangGraph (멀티턴 대화 — 구현 예정)
- LangSmith (모니터링 — LangGraph 도입 후)

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

### 향후 개선 포인트 (포트폴리오)
- Hybrid Search (BM25 + Vector) — RAG 정확도 향상
- 스트리밍 응답 (SSE) — ChatGPT 스타일 UX
- RAGAS로 RAG 성능 평가
- SM-2 알고리즘 — 퀴즈 복습 스케줄링
- Re-ranking — 검색 결과 재정렬
