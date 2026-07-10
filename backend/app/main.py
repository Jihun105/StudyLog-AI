import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.core.limiter import limiter
from app.db.database import Base, engine
from app.models import user, post, conversation, quiz, todo, event, usage, contact
from app.routers import auth_router, post_router, category_router, ai_router, conversation_router, quiz_router, user_router, upload_router, todo_router, event_router, admin_router, presence_router, contact_router
from app.services.maintenance_service import is_maintenance_on

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logging.getLogger("app").setLevel(logging.INFO)

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(lifespan=lifespan)

# Rate Limiting (AI 엔드포인트 과금 방지)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS 설정
# 로컬 개발(localhost:3000)과 배포된 프론트엔드(EC2 퍼블릭 IP) 둘 다에서
# 백엔드로 요청을 허용합니다. 나중에 도메인/HTTPS로 바뀌면 이 목록에 새 주소를
# 추가해줘야 함 - 안 그러면 브라우저가 CORS로 요청을 막아서, GET 요청은 되는데
# (단순 요청이라 브라우저가 프리플라이트 없이 그냥 보내버리는 경우가 있음) 글쓰기 같은
# POST 요청만 원인 모를 "실패" 에러로 보이는 경우가 있음 - 지금 겪은 문제가 이 경우
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://15.165.35.74",
    ],
    allow_credentials=True,
    allow_methods=["*"],   # 모든 HTTP 메서드 허용 (GET, POST, PUT, DELETE)
    allow_headers=["*"],   # 모든 헤더 허용
)

app.include_router(auth_router.router)
app.include_router(post_router.router)
app.include_router(category_router.router)
app.include_router(ai_router.router)
app.include_router(conversation_router.router)
app.include_router(quiz_router.router)
app.include_router(user_router.router)
app.include_router(upload_router.router)
app.include_router(todo_router.router)
app.include_router(event_router.router)
app.include_router(admin_router.router)
app.include_router(presence_router.router)
app.include_router(contact_router.router)

# 업로드된 이미지 정적 서빙 (노트에 삽입된 이미지)
app.mount("/api/uploads/files", StaticFiles(directory=upload_router.UPLOAD_DIR), name="uploaded_images")

@app.get("/")
async def root():
    return {"message": "AI Study Assistant API"}

# 점검모드 감지용 공개 헬스체크. 배포 환경(nginx 뒤)에서는 점검모드가 켜지면 nginx가 이
# 엔드포인트까지 오지도 못하게 먼저 503을 응답하지만, nginx 없이 백엔드에 직접 붙는
# 로컬 개발(npm start + uvicorn) 환경에서는 이 체크가 없으면 점검모드를 켜도 프론트엔드가
# 전혀 감지하지 못함 - 그래서 백엔드 자신도 같은 플래그를 한 번 더 확인해서 503을 응답함
@app.get("/api/health")
async def health():
    if is_maintenance_on():
        return JSONResponse(
            status_code=503,
            content={"status": "maintenance", "message": "점검 중입니다. 잠시 후 다시 시도해주세요."},
        )
    return {"status": "ok"}
