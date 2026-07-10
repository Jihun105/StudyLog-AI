from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime


class ContactCreateRequest(BaseModel):
    name: str
    email: EmailStr
    message: str

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("이름을 입력해주세요.")
        if len(v) > 100:
            raise ValueError("이름은 100자를 넘을 수 없습니다.")
        return v

    @field_validator("message")
    @classmethod
    def message_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("문의 내용을 입력해주세요.")
        if len(v) > 5000:
            raise ValueError("문의 내용은 5000자를 넘을 수 없습니다.")
        return v


class ContactResponse(BaseModel):
    id: int
    name: str
    email: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
