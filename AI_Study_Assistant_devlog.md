# AI Study Assistant — 백엔드 1단계 개발 기록

> 개인 공부 기록 블로그 + AI 기반 지식 검색 시스템  
> "내가 공부한 내용을 AI가 기억하고 설명해 주는 개인 지식 베이스"

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [개발 단계 로드맵](#3-개발-단계-로드맵)
4. [설계 결정 및 이유](#4-설계-결정-및-이유)
5. [DB 스키마](#5-db-스키마)
6. [API 명세](#6-api-명세)
7. [프로젝트 구조](#7-프로젝트-구조)
8. [핵심 구현 내용](#8-핵심-구현-내용)
9. [트러블슈팅](#9-트러블슈팅)

---

## 1. 프로젝트 개요

사용자가 학습한 내용을 게시글 형태로 작성하고 저장한다.  
이후 AI에게 질문하면 사용자가 직접 작성한 공부 기록을 기반으로 답변을 생성한다.

**예시**
- 질문: "Attention이 뭐야?"
- 답변: 사용자가 작성한 Attention 관련 학습 노트를 검색한 뒤, RAG를 통해 내용을 정리하여 답변 생성

**학습 목표**

| 목표 | 설명 |
|------|------|
| CRUD 구현 | 게시글 생성/조회/수정/삭제 |
| REST API 설계 | 엔드포인트 명세, 상태 코드, 에러 처리 |
| React + FastAPI 연동 | 프론트엔드와 백엔드 통신 |
| DB 설계 | 정규화, 관계 설계, 제약 조건 |
| JWT 인증 | 토큰 기반 인증 시스템 구현 |
| RAG 시스템 | 벡터 DB + 임베딩 기반 지식 검색 |
| AI 서비스 개발 | OpenAI API 연동, 대화형 학습 도우미 |

---

## 2. 기술 스택

| 분류 | 기술 | 선택 이유 |
|------|------|-----------|
| Frontend | React, React Router, Axios, Tailwind CSS | 컴포넌트 기반 UI, 생태계 풍부 |
| Backend | Python, FastAPI | 비동기 지원, 자동 API 문서화(Swagger) |
| ORM | SQLAlchemy (비동기) | Python 표준 ORM, 비동기 엔진 지원 |
| DB (개발) | MySQL | 로컬 환경에 기 설치된 DB 활용 |
| DB (배포) | PostgreSQL | 배포 환경 표준, pgvector 확장 지원 |
| 인증 | JWT (python-jose) | Stateless 인증, 서버 부담 없음 |
| 비밀번호 | bcrypt (passlib) | 단방향 해싱, 업계 표준 |
| AI | OpenAI API, Vector DB, RAG | 개인 지식 기반 질의응답 구현 |
| DevOps | Git, GitHub, Docker, Vercel, Render | 버전 관리 및 배포 자동화 |

---

## 3. 개발 단계 로드맵

| 단계 | 내용 | 상태 |
|------|------|------|
| 1단계 | 회원가입 / 로그인 / 게시글 CRUD | ✅ 완료 |
| 2단계 | 검색 기능 / 태그 필터링 | ⏳ 예정 |
| 3단계 | AI 요약 기능 | ⏳ 예정 |
| 4단계 | 벡터 DB 구축 / 임베딩 저장 | ⏳ 예정 |
| 5단계 | RAG 기반 질문 답변 기능 | ⏳ 예정 |
| 6단계 | 대화형 AI 학습 도우미 기능 | ⏳ 예정 |

---

## 4. 설계 결정 및 이유

### 4-1. 로그인 방식: 이메일 대신 아이디(username) 기반

이메일은 DB에 저장만 하고, 로그인은 별도로 생성한 `username`(아이디)으로 한다.

**이유**
- 실제 서비스 대부분이 아이디/비밀번호 방식을 채택
- 이메일은 계정 찾기, 본인 확인 등 별도 용도로 보존
- 나중에 아이디 변경 기능을 추가해도 이메일과 독립적으로 관리 가능

---

### 4-2. Unique 제약 조건: username / nickname / email 모두 unique

세 필드 모두 중복을 허용하지 않는다.

**이유**
- `username`: 로그인 식별자이므로 당연히 unique
- `nickname`: 게시글 작성자 표시에 사용, 중복 시 사용자 구분 불가
- `email`: 계정 찾기 등 1:1 매핑이 필요한 용도로 사용 예정

---

### 4-3. 비밀번호 정책: 최소 8자 + 특수문자 1개

**이유**
- 너무 엄격하면 데모/테스트 시 불편
- 너무 느슨하면 보안 항목 설명 불가
- 8자 + 특수문자 조합은 실제 서비스에서도 흔히 사용하는 최소 기준

---

### 4-4. 비밀번호 저장: bcrypt 해싱

평문 비밀번호를 DB에 저장하지 않고, bcrypt로 해싱한 값만 저장한다.

**이유**
- DB가 유출되더라도 원본 비밀번호 복원 불가 (단방향 해시)
- bcrypt는 느린 해시 함수로 브루트포스 공격에 강함
- 로그인 시 입력값을 해싱해서 저장된 해시와 비교하는 방식으로 검증

---

### 4-5. 인증 방식: JWT (JSON Web Token)

로그인 성공 시 JWT 토큰을 발급하고, 이후 요청마다 헤더에 토큰을 포함한다.

**이유**
- **Stateless**: 서버가 세션을 저장할 필요 없음 → 서버 부담 감소
- 토큰 자체에 유저 정보(`user_id`)가 포함되어 DB 조회 없이 인증 가능
- 토큰 payload에는 민감하지 않은 정보(`user_id`, 만료 시간)만 저장

**토큰 구조**
```
헤더.페이로드.서명
eyJhbGci... . eyJzdWIi... . IuyFsXp...
```
- 헤더: 암호화 알고리즘 (HS256)
- 페이로드: user_id, 만료 시간
- 서명: 서버 비밀키로 서명 → 위조 불가

---

### 4-6. 로그아웃: 클라이언트 사이드 토큰 삭제

별도 로그아웃 API 없이 프론트엔드에서 토큰을 삭제하는 방식으로 처리한다.

**이유**
- JWT는 Stateless 특성상 서버가 토큰을 강제로 무효화할 수 없음
- 클라이언트에서 토큰을 삭제하면 이후 인증이 필요한 요청이 불가능해짐
- 서버 사이드 블랙리스트 방식은 구현 복잡도 대비 이점이 적음 (포트폴리오 규모)

---

### 4-7. 태그 설계: 정규화된 별도 테이블 구조

`posts` 테이블에 tags를 배열로 저장하는 대신, `tags`와 `post_tags` 별도 테이블로 정규화했다.

**비교**

| 방식 | 장점 | 단점 |
|------|------|------|
| Array 컬럼 | 구현 단순 | 태그별 필터링/집계 어려움 |
| 정규화 (채택) | 태그 검색, 집계 용이 | 구현 복잡도 소폭 증가 |

**이유**
- 2단계에서 태그 검색, 태그별 게시글 수 집계 기능이 예정되어 있음
- 처음부터 정규화해두면 스키마 마이그레이션 없이 기능 확장 가능
- 같은 태그명은 재사용 (중복 저장 없음) → 데이터 일관성 보장

---

### 4-8. ON DELETE CASCADE

유저 삭제 시 해당 유저의 게시글도 자동으로 삭제된다.

**이유**
- 이 서비스의 게시글은 철저히 개인 공부 기록
- 작성자가 없는 게시글을 남겨두는 것이 서비스 특성상 무의미
- SET NULL 방식은 재가입해도 기존 글과 연결되지 않아 실익이 없음

---

### 4-9. 비동기 처리 (Async/Await)

SQLAlchemy 비동기 엔진과 `aiomysql` 드라이버를 사용하여 전체 백엔드를 비동기로 구현했다.

**동기 vs 비동기**

```
[동기]
요청1 → DB 대기 중... → 응답1
                         요청2 → DB 대기 중... → 응답2

[비동기]
요청1 → DB 대기 중 → 요청2 처리 → DB 응답 → 응답1 → 응답2
```

**이유**
- DB, 외부 API 호출 등 I/O 대기 시간에 다른 요청 처리 가능
- 향후 OpenAI API 호출(RAG 단계)에서 비동기의 이점이 더욱 커짐
- 처음부터 비동기로 설계하면 나중에 전환 비용 없음

---

### 4-10. Service 레이어 분리

`routers/`와 `services/`를 분리하여 역할을 명확히 구분했다.

| 레이어 | 역할 |
|--------|------|
| routers/ | 요청 수신, 응답 반환만 담당 |
| services/ | 실제 비즈니스 로직 담당 |

**이유**
- **재사용성**: 같은 로직을 여러 엔드포인트에서 호출 가능
- **테스트 용이성**: 서비스 함수를 HTTP 요청 없이 단독 테스트 가능
- **유지보수**: 로직 변경 시 서비스 파일만 수정하면 됨

---

### 4-11. 게시글 목록/상세 분리

목록 조회에서는 content 전체 대신 앞 100자만 preview로 반환한다.

**이유**
- 목록 화면에서 전체 내용이 필요 없음
- content 전체를 매번 전송하면 응답 크기가 불필요하게 커짐
- 상세 조회(`GET /api/posts/{id}`)에서만 전체 content 반환

---

## 5. DB 스키마

### users
| 컬럼 | 타입 | 조건 |
|------|------|------|
| id | SERIAL | PK |
| username | VARCHAR(50) | UNIQUE, NOT NULL |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| nickname | VARCHAR(50) | UNIQUE, NOT NULL |
| created_at | TIMESTAMP | DEFAULT now() |

### posts
| 컬럼 | 타입 | 조건 |
|------|------|------|
| id | SERIAL | PK |
| user_id | INTEGER | FK → users.id, ON DELETE CASCADE |
| title | VARCHAR(255) | NOT NULL |
| content | TEXT | NOT NULL |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | DEFAULT now() |

### tags
| 컬럼 | 타입 | 조건 |
|------|------|------|
| id | SERIAL | PK |
| name | VARCHAR(50) | UNIQUE, NOT NULL |

### post_tags
| 컬럼 | 타입 | 조건 |
|------|------|------|
| post_id | INTEGER | FK → posts.id, ON DELETE CASCADE |
| tag_id | INTEGER | FK → tags.id, ON DELETE CASCADE |

- `(post_id, tag_id)` 복합 PK — 같은 태그 중복 불가

---

## 6. API 명세

### 인증

#### `POST /api/auth/signup` — 회원가입

**Request Body**
```json
{
  "username": "jihun123",
  "email": "user@example.com",
  "password": "Passwd1!",
  "nickname": "지훈"
}
```

**Response (201 Created)**
```json
{
  "id": 1,
  "username": "jihun123",
  "email": "user@example.com",
  "nickname": "지훈",
  "created_at": "2026-06-19T12:00:00Z"
}
```

**에러**
| 상태 코드 | 설명 |
|-----------|------|
| 400 | validation 실패 (비밀번호 8자 미만, 특수문자 없음 등) |
| 409 | username / 닉네임 / 이메일 중복 |

---

#### `POST /api/auth/login` — 로그인

**Request Body**
```json
{
  "username": "jihun123",
  "password": "Passwd1!"
}
```

**Response (200 OK)**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "jihun123",
    "nickname": "지훈"
  }
}
```

**에러**
| 상태 코드 | 설명 |
|-----------|------|
| 401 | 아이디 없음 또는 비밀번호 불일치 |

> 보안상 아이디 없음과 비밀번호 불일치를 동일한 메시지로 처리 (어떤 아이디가 존재하는지 노출 방지)

> 로그아웃은 클라이언트 사이드에서 토큰 삭제로 처리 (JWT stateless 특성)

---

### 게시글

#### `GET /api/posts` — 목록 조회

**Query Parameters**
```
?page=1&limit=10
```

**Response (200 OK)**
```json
{
  "posts": [
    {
      "id": 1,
      "title": "Attention 메커니즘 정리",
      "preview": "Attention이란 Query, Key, Value 세 가지...",
      "nickname": "지훈",
      "tags": ["딥러닝", "NLP"],
      "created_at": "2026-06-19T12:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 10
}
```

---

#### `GET /api/posts/{id}` — 상세 조회

**Response (200 OK)**
```json
{
  "id": 1,
  "title": "Attention 메커니즘 정리",
  "content": "전체 내용...",
  "nickname": "지훈",
  "tags": ["딥러닝", "NLP"],
  "created_at": "2026-06-19T12:00:00Z",
  "updated_at": "2026-06-19T12:00:00Z"
}
```

**에러**
| 상태 코드 | 설명 |
|-----------|------|
| 404 | 존재하지 않는 게시글 |

---

#### `POST /api/posts` — 게시글 작성 (인증 필요)

**Request Body**
```json
{
  "title": "Attention 메커니즘 정리",
  "content": "전체 내용...",
  "tags": ["딥러닝", "NLP"]
}
```

**Response (201 Created)**
```json
{
  "id": 1,
  "title": "Attention 메커니즘 정리",
  "content": "전체 내용...",
  "nickname": "지훈",
  "tags": ["딥러닝", "NLP"],
  "created_at": "2026-06-19T12:00:00Z",
  "updated_at": "2026-06-19T12:00:00Z"
}
```

**에러**
| 상태 코드 | 설명 |
|-----------|------|
| 401 | 토큰 없음 또는 만료 |

---

#### `PUT /api/posts/{id}` — 게시글 수정 (인증 필요, 본인 글만)

**Request Body**
```json
{
  "title": "수정된 제목",
  "content": "수정된 내용...",
  "tags": ["딥러닝"]
}
```

**Response (200 OK)**
```json
{
  "id": 1,
  "title": "수정된 제목",
  "content": "수정된 내용...",
  "nickname": "지훈",
  "tags": ["딥러닝"],
  "created_at": "2026-06-19T12:00:00Z",
  "updated_at": "2026-06-19T15:00:00Z"
}
```

**에러**
| 상태 코드 | 설명 |
|-----------|------|
| 401 | 토큰 없음 또는 만료 |
| 403 | 본인 글 아님 |
| 404 | 존재하지 않는 게시글 |

---

#### `DELETE /api/posts/{id}` — 게시글 삭제 (인증 필요, 본인 글만)

**Response (204 No Content)**

**에러**
| 상태 코드 | 설명 |
|-----------|------|
| 401 | 토큰 없음 또는 만료 |
| 403 | 본인 글 아님 |
| 404 | 존재하지 않는 게시글 |

---

## 7. 프로젝트 구조

```
board/
├── backend/
│   └── app/
│       ├── core/
│       │   ├── config.py           # 환경변수 읽기 (pydantic-settings)
│       │   ├── security.py         # JWT 생성/검증, bcrypt 비밀번호 해싱
│       │   └── dependencies.py     # JWT 인증 미들웨어 (get_current_user)
│       ├── db/
│       │   └── database.py         # 비동기 DB 연결, 세션 관리
│       ├── models/
│       │   ├── user.py             # SQLAlchemy User 모델
│       │   └── post.py             # SQLAlchemy Post, Tag, post_tags 모델
│       ├── schemas/
│       │   ├── user.py             # 회원가입/로그인 request, response 스키마
│       │   └── post.py             # 게시글 request, response 스키마
│       ├── routers/
│       │   ├── auth.py             # 인증 엔드포인트 (요청/응답만)
│       │   └── post.py             # 게시글 엔드포인트 (요청/응답만)
│       ├── services/
│       │   ├── auth.py             # 회원가입/로그인 비즈니스 로직
│       │   └── post.py             # 게시글 CRUD 비즈니스 로직
│       └── main.py                 # FastAPI 앱 진입점, 라우터 등록
└── frontend/                       # React (2단계 예정)
```

---

## 8. 핵심 구현 내용

### 8-1. 비동기 DB 세션 관리

```python
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

`async with`를 사용해 세션을 열고 닫는 것을 자동으로 처리한다.  
FastAPI의 의존성 주입(Dependency Injection)으로 각 요청마다 독립적인 세션을 제공한다.

---

### 8-2. JWT 인증 미들웨어

```python
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="토큰이 유효하지 않습니다.")
    ...
```

`get_current_user`를 한 번 정의해두고, 인증이 필요한 모든 엔드포인트에서 `Depends(get_current_user)`로 재사용한다.

---

### 8-3. 태그 처리 로직

```python
for tag_name in request.tags:
    result = await db.execute(select(Tag).filter(Tag.name == tag_name))
    tag = result.scalar_one_or_none()
    if tag is None:
        tag = Tag(name=tag_name)
        db.add(tag)
        await db.flush()
    tags.append(tag)
```

태그가 이미 존재하면 재사용하고, 없으면 새로 생성한다.  
`db.flush()`로 commit 없이 임시 반영하여 새 태그의 id를 즉시 사용한다.

---

### 8-4. selectinload로 N+1 문제 방지

```python
result = await db.execute(
    select(Post)
    .options(selectinload(Post.tags), selectinload(Post.user))
)
```

`selectinload`를 사용해 Post 조회 시 연관된 tags와 user를 한 번의 쿼리로 함께 불러온다.  
이를 사용하지 않으면 게시글 수만큼 추가 쿼리가 발생하는 N+1 문제가 생긴다.

---

## 9. 트러블슈팅

### 9-1. bcrypt 버전 충돌

**증상**
```
ValueError: password cannot be longer than 72 bytes
```

**원인**  
최신 버전의 bcrypt 라이브러리에서 내부 버그 감지 로직이 추가되어 passlib과 충돌 발생.

**해결**
```bash
pip install bcrypt==4.0.1
```

---

### 9-2. Pydantic 스키마 오타

**증상**
```
fastapi.exceptions.ResponseValidationError: Field required 'created__at'
```

**원인**  
`schemas/user.py`의 `UserResponse`에서 `created_at` 필드명을 `created__at`(언더바 2개)으로 오타.

**해결**  
`created__at` → `created_at` 수정.

---

### 9-3. OAuth2 Authorize 에러

**증상**  
FastAPI docs의 Authorize 버튼 클릭 시 `Unprocessable Entity` 에러.

**원인**  
`OAuth2PasswordBearer`는 form-data 방식으로 로그인을 요청하는데, 기존 로그인 엔드포인트는 JSON 방식으로 받고 있어 충돌 발생.

**해결**  
로그인 엔드포인트를 `OAuth2PasswordRequestForm`으로 변경하여 form-data 방식으로 수신.

```python
@router.post("/login", status_code=200)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    return await authenticate_user(form_data.username, form_data.password, db)
```
