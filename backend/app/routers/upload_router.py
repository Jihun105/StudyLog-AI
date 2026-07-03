import os
import uuid
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

# 백엔드 프로젝트 루트(backend/) 바로 아래 uploaded_images/ 에 저장.
# Docker Compose에서는 볼륨을 마운트해서 컨테이너 재시작에도 유지되도록 함.
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploaded_images")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# 실제 파일은 main.py에서 StaticFiles로 /api/uploads/files 에 마운트해서 서빙함
STATIC_URL_PREFIX = "/api/uploads/files"


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="이미지 파일(jpg/png/gif/webp)만 업로드할 수 있습니다.")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="이미지 크기는 10MB를 넘을 수 없습니다.")

    # 원본 파일명을 그대로 쓰지 않고 uuid로 대체 (충돌 방지 + 경로 조작 방지)
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
        ext = ".png"
    filename = f"{uuid.uuid4().hex}{ext}"

    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)

    return {"url": f"{STATIC_URL_PREFIX}/{filename}"}
