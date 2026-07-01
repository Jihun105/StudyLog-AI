from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue
from qdrant_client.http.exceptions import UnexpectedResponse
from openai import AsyncOpenAI
from app.core.config import settings

COLLECTION_NAME = "study_notes"
TOP_K = 5

openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
qdrant_client = AsyncQdrantClient(host="localhost", port=6333)


async def _embed(text: str) -> list[float]:
    response = await openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding


async def search_similar_chunks(query: str, user_id: int, top_k: int = TOP_K) -> list[dict]:
    vector = await _embed(query)
    try:
        result = await qdrant_client.query_points(
            collection_name=COLLECTION_NAME,
            query=vector,
            query_filter=Filter(
                must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))]
            ),
            limit=top_k,
        )
    except UnexpectedResponse as e:
        # 아직 인덱싱된 글이 하나도 없으면 컬렉션 자체가 없음 (index_post 최초 실행 전)
        if e.status_code == 404:
            return []
        raise

    return [
        {
            "content": hit.payload["page_content"],
            "post_id": hit.payload["post_id"],
            "score": hit.score,
        }
        for hit in result.points
    ]
