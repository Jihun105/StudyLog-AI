from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

ENV_PATH = Path(__file__).resolve().parent.parent.parent.parent / ".env"

# .env 파일을 실제 프로세스 환경변수(os.environ)에도 로드.
# pydantic-settings는 .env 값을 Settings 객체 안에만 담고 os.environ으로 내보내지 않기 때문에,
# langsmith처럼 os.getenv()로 직접 읽는 외부 라이브러리를 위해 별도로 필요함.
load_dotenv(ENV_PATH)

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    OPENAI_API_KEY: str

    class Config:
        env_file = ENV_PATH
        extra = "ignore"  # LANGSMITH_* 등 Settings에 선언 안 된 .env 키가 있어도 에러 안 나게

settings = Settings()