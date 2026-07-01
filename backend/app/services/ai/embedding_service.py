import logging
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue, FilterSelector
from openai import OpenAI
from app.core.config import settings
from app.utils.chunking import chunk_blocknote
import uuid

logger = logging.getLogger(__name__)

COLLECTION_NAME = "study_notes"
VECTOR_SIZE = 1536

openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
qdrant_client = QdrantClient(host="localhost", port=6333)

def _ensure_collection():
    existing = [c.name for c in qdrant_client.get_collections().collections]
    if COLLECTION_NAME not in existing:
        qdrant_client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )

def _embed(text: str) -> list[float]:
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding

def index_post(
        post_id: int,
        user_id: int,
        title: str,
        content: str,
        category_path: str,
) -> None:
    try:
        _ensure_collection()

        qdrant_client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=FilterSelector(
                filter=Filter(
                    must=[FieldCondition(key="post_id", match=MatchValue(value=post_id))]
                )
            ),
        )

        chunks = chunk_blocknote(content)
        if not chunks:
            logger.warning("[embedding] post_id=%s: chunk_blocknote()가 빈 결과 반환, 인덱싱 건너뜀", post_id)
            return

        prefix = f"[{category_path}] [{title}]\n" if category_path else f"[{title}]\n"

        points = []
        for chunk in chunks:
            text = prefix + chunk
            vector = _embed(text)
            points.append(
                PointStruct(
                    id=str(uuid.uuid4()),
                    vector=vector,
                    payload={
                        "post_id": post_id,
                        "user_id": user_id,
                        "category_path": category_path,
                        "page_content": text,
                    },
                )
            )

        qdrant_client.upsert(collection_name=COLLECTION_NAME, points=points)
        logger.info("[embedding] post_id=%s: %d개 청크 인덱싱 완료", post_id, len(points))
    except Exception:
        logger.exception("[embedding] post_id=%s 인덱싱 실패", post_id)


def delete_post_index(post_id: int) -> None:
    qdrant_client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=FilterSelector(
            filter=Filter(
                must=[FieldCondition(key="post_id", match=MatchValue(value=post_id))]
            )
        ),
    )
