from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

DATABASE_URL = settings.DATABASE_URL

# DB와 실제 연결을 담당 / .env의 DATABASE_URL을 읽어서 접속
engine = create_async_engine(DATABASE_URL, echo=True)

# DB 작업을 할 때 쓰는 세션 공장 / API 요청이 들어올 때마다 세션을 하나 열고, 작업이 끝나면 닫음
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False)

# models에서 테이블을 정의할 때 이걸 상속받음
Base = declarative_base()

# FastAPI의 의존성 주입(Dependency Injection)
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session