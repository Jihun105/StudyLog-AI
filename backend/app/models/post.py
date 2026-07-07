from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Table, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

post_tags = Table(
    "post_tags",
    Base.metadata,
    # SQLAlchemy가 관리하는 모든 테이블 정보
    Column("post_id", Integer, ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True),
    # posts 가 사라지면 post_tags 행도 자동 삭제
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)
)

class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    posts = relationship("Post", secondary=post_tags, back_populates="tags")

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", backref="posts")
    tags = relationship("Tag", secondary=post_tags, back_populates="posts")
    category = relationship("Category")

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    # 부모 카테고리 ID (NULL이면 최상위 폴더)
    parent_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=True)
    # 카테고리 소유자
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    # 사용자가 카테고리를 지정하지 않고 글을 쓸 때 자동으로 배정되는 "기본" 카테고리 표시.
    # 다른 폴더와 기능(이름변경/삭제/하위폴더추가)은 완전히 동일하고, 단지 새 글의 기본
    # 배정 대상을 찾기 위한 내부 플래그일 뿐 - 이름을 바꿔도(예: "Inbox") 계속 기본 배정 대상으로 동작함
    is_default = Column(Boolean, nullable=False, server_default="0")
    # 같은 부모 아래 형제 카테고리들 사이의 정렬 순서 (드래그 앤 드롭 순서 변경용).
    # 값 자체엔 의미가 없고, 같은 parent_id를 가진 카테고리끼리 오름차순으로만 비교함
    order_index = Column(Integer, nullable=False, server_default="0")
    # 폴더 색상 - Event.category와 같은 방식으로, 자유 입력이 아니라 프론트에서 고정된
    # 8개 팔레트 중 하나의 색상 키(예: "blue", "rose")를 그대로 저장함. 지정 안 하면 NULL
    # (색 없는 기본 회색 폴더로 표시됨)
    color = Column(String(20), nullable=True)

    # 자기 자신을 참조하는 관계 (하위 카테고리 목록) - order_index 순으로 정렬해서 가져옴
    children = relationship(
        "Category",
        back_populates="parent",
        cascade="all, delete-orphan",
        order_by="Category.order_index",
    )
    parent = relationship("Category", back_populates="children", remote_side=[id])

# relationship() : SQLAlchemy에서 테이블 간 관계를 Python 객체로 표현

