# StudyLog-AI

개인 공부 노트를 쓰면 AI가 그 내용을 기억했다가 질문에 답해주고, 퀴즈까지 만들어주는 개인용 학습 노트 서비스입니다. React + FastAPI + MySQL + Qdrant(벡터 DB)로 만들었고, RAG 기반 AI 챗봇과 노트 기반 자동 퀴즈 생성이 핵심 기능입니다.

<!--
TODO: 여기에 대시보드/노트 작성/퀴즈 화면 스크린샷 또는 짧은 GIF 삽입
예) ![dashboard](./docs/images/dashboard.png)
-->

**Live Demo**: [http://15.165.35.74](http://15.165.35.74)

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-async-009688?logo=fastapi&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)
![Qdrant](https://img.shields.io/badge/Qdrant-VectorDB-DC244C?logo=qdrant&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?logo=openai&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-EC2-FF9900?logo=amazonaws&logoColor=white)

---

## 목차

- [핵심 기능](#핵심-기능)
- [기술 스택](#기술-스택)
- [아키텍처](#아키텍처)
- [실행 방법](#실행-방법)
- [API 문서](#api-문서)
- [주요 설계 결정](#주요-설계-결정)
- [트러블슈팅 — 겪은 문제와 해결 과정](#트러블슈팅--겪은-문제와-해결-과정)
- [향후 계획](#향후-계획)
- [라이선스](#라이선스)

---

## 핵심 기능

**노트**
- 노션 스타일 리치 텍스트 에디터(BlockNote)로 노트 작성 — 이미지 삽입, 코드 블록(실제 문법 하이라이팅), 인용구, 표 등 지원
- 폴더(카테고리) 구조로 노트 정리, 최대 5단계 depth, 폴더별 색상 지정
- 폴더/노트 드래그 앤 드롭으로 이동·정렬
- 태그 기반 분류 및 검색

**AI 챗봇 (RAG)**
- 내 노트를 벡터 임베딩(OpenAI `text-embedding-3-small`)으로 색인해두고, 질문하면 관련 노트를 검색해 답변에 활용
- LangGraph 기반 멀티턴 대화 — 질문 의도를 분류해 "노트 기반 답변"과 "일반 대화"를 자동으로 분기
- 노트에 없는 내용은 "노트에서 찾지 못했다"는 안내와 함께 일반 지식으로 답변
- LangSmith로 프롬프트/응답 흐름 추적

**AI 퀴즈**
- 폴더(하위 폴더 포함) 또는 직접 선택한 노트(최대 5개)를 기준으로, 총 10문제를 노트별로 나눠 GPT가 병렬 생성(객관식/OX)
- 노트 단위로 개별 생성하기 때문에 출처가 100% 확정적
- 정답은 서버에만 보관하고 클라이언트에는 절대 내려주지 않음
- 채점 및 오답 확인 지원, 30일 넘도록 안 푼 미사용 퀴즈는 자동 정리(단, 시도 기록이 있는 퀴즈는 절대 삭제하지 않음)

**할 일 / 캘린더**
- 날짜 있는 할 일, 날짜 없는 할 일(Plan 뷰), 캘린더 뷰, 시간표(타임테이블) 뷰
- 멀티데이 이벤트, 우선순위, 카테고리별 그룹핑, 드래그 정렬

**AI 시맨틱 검색**
- 키워드가 정확히 일치하지 않아도 의미 기반으로 노트 검색

**계정/운영**
- JWT 인증, 다크모드, 한국어/영어 다국어 지원
- Django 기반 관리자 전용 페이지(읽기 전용 조회)
- Rate Limiting(slowapi)으로 AI 엔드포인트 과금 방지

---

## 기술 스택

### Frontend
| 기술 | 용도 |
|---|---|
| React 19 + React Router v7 | SPA |
| BlockNote | 노션 스타일 에디터 |
| Tailwind CSS | 스타일링 (다크모드 `class` 전략) |
| react-i18next | 다국어(한/영) |
| Axios | API 통신 |

### Backend
| 기술 | 용도 |
|---|---|
| FastAPI (async) | REST API 서버 |
| SQLAlchemy + Alembic | ORM + 스키마 마이그레이션 |
| MySQL 8 (aiomysql) | 메인 DB (유저/노트/대화/퀴즈/할일) |
| Qdrant | 벡터 DB (노트 임베딩 검색) |
| OpenAI (`text-embedding-3-small`, `gpt-4o-mini`) | 임베딩 생성 · 대화/퀴즈 생성 |
| LangGraph | 멀티턴 대화 StateGraph (의도분류 → RAG/일반 분기 → 응답 → 저장) |
| LangSmith | LLM 호출 모니터링/추적 |
| slowapi | Rate Limiting |
| Django (관리자 전용, `/admin`) | 읽기 전용 관리자 페이지 |

### Infra / DevOps
| 기술 | 용도 |
|---|---|
| Docker Compose | mysql/qdrant/backend/admin/frontend 5개 컨테이너 통합 |
| Nginx | 프론트 이미지 안에서 리버스 프록시 + 정적 파일 서빙 |
| GitHub Actions | push → 테스트 → 자동 배포(CI/CD) |
| AWS EC2 | 실제 배포 서버 |

---

## 아키텍처

```
[React SPA] ──▶ [Nginx] ──┬─▶ [FastAPI] ──┬─▶ MySQL       (유저/노트/대화/퀴즈/할일)
                          │               ├─▶ Qdrant      (벡터 임베딩, RAG 검색)
                          │               ├─▶ OpenAI API  (임베딩 생성 + 응답/퀴즈 생성)
                          │               └─▶ LangGraph   (멀티턴 대화 흐름) ──▶ LangSmith(모니터링)
                          │
                          └─▶ [Django Admin] (/admin, 읽기 전용) ──▶ MySQL (동일 DB, unmanaged 모델)
```

프런트가 요청을 보내는 곳은 항상 자기 자신(nginx)이고, nginx가 `/api/`는 FastAPI로, `/admin/`은 Django로 내부 라우팅합니다. 백엔드/DB/벡터DB 포트는 호스트에 노출되지 않고 Docker 내부 네트워크로만 통신합니다.

---

## 실행 방법

### 방법 1) Docker Compose로 한 번에 실행 (권장)

프로젝트 루트(`board/`)에 `.env` 파일이 필요합니다.

```env
DATABASE_URL=mysql+aiomysql://root:비밀번호@localhost:3306/DB이름
SECRET_KEY=랜덤_문자열
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
OPENAI_API_KEY=sk-...

# Docker Compose의 mysql 컨테이너 초기화용 (DATABASE_URL과 값 동일하게)
MYSQL_ROOT_PASSWORD=...
MYSQL_DATABASE=...
```

```bash
cd board
docker compose up --build
```

- 접속: `http://localhost` (서비스), `http://localhost/admin` (관리자)
- 최초 1회만 Django 관리자 계정 생성:
  ```bash
  docker compose exec admin python manage.py migrate
  docker compose exec admin python manage.py createsuperuser
  ```
- 종료: `docker compose down` (볼륨에 데이터 유지됨)

> 컨테이너는 코드를 이미지로 빌드해 넣는 방식이라 코드 변경이 자동 반영되지 않습니다. 활발히 개발할 땐 아래 방법 2를 사용하세요.

### 방법 2) 서비스별로 직접 실행 (개발용)

```bash
# 백엔드
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload        # http://localhost:8000

# 프론트엔드
cd frontend
npm install --legacy-peer-deps
npm start                             # http://localhost:3000

# Qdrant (벡터 DB)
docker run -d --name qdrant -p 6333:6333 qdrant/qdrant

# Django 관리자 (선택)
cd admin
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8001       # http://localhost:8001/admin
```

MySQL은 로컬에 직접 설치되어 있어야 하며, 스키마는 Alembic으로 관리합니다.

---

## API 문서

FastAPI가 자동 생성하는 Swagger 문서: 서버 실행 후 `http://localhost:8000/docs`

주요 엔드포인트 그룹: 인증(`/api/auth`), 노트(`/api/posts`), 카테고리(`/api/categories`), AI 챗봇(`/api/ai/chat`), 대화 히스토리(`/api/conversations`), 퀴즈(`/api/quizzes`), 할 일(`/api/todos`), 업로드(`/api/uploads`), 계정(`/api/users/me`)

---

## 주요 설계 결정

- **RAG는 LangChain 없이 직접 구현**: OpenAI SDK + qdrant-client를 직접 사용. 청킹은 글자 수가 아닌 BlockNote 블록(heading 기준 섹션 경계) 단위로 수행하고, 임베딩 전에 `[카테고리 경로] [제목]`을 접두로 붙여 도메인 정보를 주입.
- **벡터 검색 시 `user_id` 필터 필수** — 타인 노트가 검색되지 않도록 보장.
- **퀴즈는 RAG와 완전히 분리된 독립 서비스** — 청크 검색 없이, 선택된 노트(최대 5개)마다 GPT를 개별·병렬 호출해 문제를 생성. 노트 단위로 생성하므로 출처가 100% 확정적(예전엔 여러 노트를 한 번에 뭉쳐 보내고 GPT 자기 보고로 출처를 추정하는 방식이었으나 정확도 문제로 개선됨). 정답 필드는 응답 스키마 자체에서 제외해 클라이언트로 절대 내려가지 않도록 함. 객관식 정답 위치는 GPT 응답을 그대로 믿지 않고 서버에서 한 번 더 셔플해 LLM의 위치 편향을 보정.
- **학습 이력(퀴즈 시도 기록)은 절대 삭제하지 않음** — 미사용 퀴즈 데이터는 정리하되, 복습 지원이라는 목적에 맞게 사용자의 시도 기록은 보존.

---

## 트러블슈팅 — 겪은 문제와 해결 과정

개발/배포 중 실제로 겪었던 문제들과 원인 분석 과정입니다.

**Docker 프로덕션 빌드가 "Docker 문제"인 줄 알았는데 실제론 의존성 문제였던 사례**
CRA 프로덕션 빌드가 `@shikijs/langs-precompiled`의 일부 언어 문법(csharp, css 등)에서 최신 정규식 문법(`v` flag)을 파싱하지 못해 `SyntaxError`로 실패. Docker 환경 탓으로 오인했으나 로컬 빌드에서도 동일하게 재현되어 실제로는 라이브러리 의존성 문제임을 확인, 필요한 언어만 골라 `oniguruma` 엔진 기반 커스텀 번들로 교체해 해결.

**GitHub Actions 배포가 SSH 타임아웃으로 실패**
EC2 보안 그룹의 SSH(22)를 "내 고정 IP"로만 열어뒀는데, GitHub Actions 러너는 매번 다른 IP에서 접속을 시도해 계속 차단됨. SSH 인바운드를 전체 허용으로 열되, 비밀번호 로그인은 막고 키 기반 인증만 허용되도록 유지해(개인키 없이는 접근 불가) 위험 대비 실용성을 택함.

**배포 후 프로필 사진 업로드만 계속 실패**
로컬 개발 환경(`npm start`)은 nginx를 거치지 않고 백엔드에 직접 요청하기 때문에 발견되지 않았던 문제. 실제 배포 환경에서는 nginx의 기본 업로드 제한(1MB)이 백엔드가 허용하는 10MB보다 작아 nginx 단계에서 먼저 막히고 있었음. `client_max_body_size` 설정으로 해결.

**alembic 마이그레이션 이력과 실제 DB 상태 불일치로 노트 저장 전체가 500 에러**
운영 중이던 서버에서 갑자기 노트 저장이 전부 실패. 로그를 확인해보니 `categories` 테이블에 코드가 참조하는 `color` 컬럼이 실제로는 없어서 모든 카테고리 조회가 터지고 있었음(모델은 이미 배포됐지만 마이그레이션이 안 걸린 상태). 마이그레이션을 실행하려 하니 이번엔 다른 컬럼(`events.memo`)에서 "중복 컬럼" 에러가 발생 — 해당 컬럼은 이미 실제 DB에 존재했지만 alembic의 버전 기록만 그 이전 리비전에 멈춰 있었던 것. 이미 반영된 리비전은 `alembic stamp`로 건너뛰고, 그 다음 리비전부터 `alembic upgrade head`로 마저 적용해 해결. 이 사고를 계기로 저장 실패 시 사용자가 작성 중이던 내용이 유실되지 않도록 자동 임시저장·이탈 경고 기능과, 배포 파이프라인에 마이그레이션 실패 시 점검 모드를 유지하는 안전장치를 계획 중.

---

## 향후 계획

- **안정성**: 저장 실패 시 자동 임시저장(로컬), 배포/마이그레이션 중 점검 모드, 관리자 전용 대시보드(실시간 접속 현황, OpenAI 사용량/비용 추적)
- **RAG 품질**: Hybrid Search(BM25 + Vector), Re-ranking, RAGAS 기반 응답 품질 평가
- **퀴즈 고도화**: 오답 복습(spaced repetition), 오답 AI 설명, 학습 분석 대시보드
- **비용 최적화**: OpenAI/AWS 사용량 모니터링 및 알림, 호출 캐싱
- **모바일 앱**: React Native로 핵심 기능부터 단계적 출시 (선행 조건: HTTPS 도메인 적용)

더 상세한 항목은 `next.md` 참고.

---

## 라이선스

[MIT](./LICENSE)
