from pydantic import BaseModel, EmailStr
from datetime import datetime
import re

class SignupRequest(BaseModel):
    username: str
    email: EmailStr # 이메일 형식 자동 검증
    password: str
    nickname: str

    def validate_password(self):
        if len(self.password) < 8:
            raise ValueError("비밀번호는 8자 이상이어야 합니다.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", self.password):
            raise ValueError("비밀번호에 특수문자가 최소 1개 포함되어야 합니다.")
        
class LoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    nickname: str
    created_at: datetime

    class Config:
        from_attributes = True