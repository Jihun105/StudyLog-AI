from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue
from openai import OpenAI
from app.core.config import settings

COLLECTION_NAME = "study_notes"
TOP_K = 5

openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
qdrant_client = QdrantClient(host="localhost", port=6333)

def _embed(text: str) -> list[float]:
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding

def search_similar_chunks(query: str, user_id: int, top_k: int = TOP_K) -> list[dict]:
    vector = _embed(query)
    results = qdrant_client.query_points(
        collection_name=COLLECTION_NAME,
        query=vector,
        query_filter=Filter(
            must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))]
        ),
        limit=top_k,
    ).points
    return [
        {
            "content": hit.payload["page_content"],
            "post_id": hit.payload["post_id"],
            "score": hit.score,
        }
        for hit in results
    ]

def ask(query: str, user_id: int) -> str:
    chunks = search_similar_chunks(query, user_id)

    if not chunks:
        context = "관련 노트를 찾지 못했습니다."
    else:
        context = "\n\n---\n\n".join([c["content"] for c in chunks])

    system_prompt = f"""너는 사용자의 공부 노트를 기반으로 질문에 답변하는 AI 튜터야. 아래 노트 내용을 참고해서 답변해줘. 노트에 없는 내용은 공부 내용에 없다고 해줘. 

    [참고 노트]
    {context}"""

    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query},
        ],
    )
    return response.choices[0].message.content