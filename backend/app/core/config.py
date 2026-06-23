from pathlib import Path
from pydantic_settings import BaseSettings

ENV_PATH = Path(__file__).resolve().parent.parent.parent.parent / ".env"

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    class Config:
        env_file = ENV_PATH

settings = Settings()