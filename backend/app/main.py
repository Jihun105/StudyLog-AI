from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import Base, engine
from app.models import user, post
from app.routers import auth_router, post_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(lifespan=lifespan)

# CORS 설정
# 프론트엔드(localhost:3000)에서 백엔드로 요청을 허용합니다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # 허용할 프론트 주소
    allow_credentials=True,
    allow_methods=["*"],   # 모든 HTTP 메서드 허용 (GET, POST, PUT, DELETE)
    allow_headers=["*"],   # 모든 헤더 허용
)

app.include_router(auth_router.router)
app.include_router(post_router.router)

@app.get("/")
async def root():
    return {"message": "AI Study Assistant API"}