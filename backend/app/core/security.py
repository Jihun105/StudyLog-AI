from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings

# bcrypt 알고리즘을 사용하는 CryptContext 객체 생성
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    '''비밀번호 암호화'''
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    '''비밀번호와 DB의 해시값을 비교'''
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    '''JWT토큰을 생성'''
    to_encode = data.copy()
    expire = datetime.now() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_access_token(token: str) -> dict | None:
    '''토큰을 받아서 안에 든 데이터를 꺼냄, 토큰이 유효하지 않으면 None 반환'''
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
    

# datetime : 날짜와 시간을 다루는 클래스
# timedelta : 시간의 차이를 나타내는 클래스
# jwt : JWT(JSON Web Token)를 생성하고 검증하는 기능 제공
# JWTError : JWT 관련 오류 처리 예외 클래스
# CryptContext : 비밀번호 암호화(Hash)와 검증을 담당