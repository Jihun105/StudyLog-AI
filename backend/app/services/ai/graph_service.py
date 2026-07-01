import logging
from typing import TypedDict
from sqlalchemy.ext.asyncio import AsyncSession
from langgraph.graph import StateGraph, START, END
from langsmith import traceable
from openai import AsyncOpenAI
from app.core.config import settings
from app.services.ai.rag_service import search_similar_chunks
from app.services.conversation_service import save_message

logger = logging.getLogger(__name__)

openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

CLASSIFY_SYSTEM_PROMPT = (
    "사용자 질문을 'rag' 또는 'general' 둘 중 하나로만 분류해.\n"
    "'rag': 특정 지식/개념/주제에 대한 질문. 사용자가 작성한 공부 노트에 관련 내용이 있을 수 있는 "
    "모든 질문 (애매하면 무조건 'rag'로 분류해).\n"
    "'general': 인사, 감사 인사, 잡담처럼 지식 검색이 전혀 필요 없는 경우만.\n"
    "다른 말은 절대 덧붙이지 말고 'rag' 또는 'general' 한 단어만 답해."
)


class GraphState(TypedDict):
    query: str
    user_id: int
    conversation_id: int
    history: list[dict]   # [{"role": "user"|"assistant", "content": str}, ...]
    chunks: list[dict]    # RAG 검색 결과
    intent: str            # "rag" or "general"
    answer: str
    db: AsyncSession


async def _chat_completion(messages: list[dict], temperature: float | None = None) -> str:
    kwargs = {"model": "gpt-4o-mini", "messages": messages}
    if temperature is not None:
        kwargs["temperature"] = temperature
    response = await openai_client.chat.completions.create(**kwargs)
    return response.choices[0].message.content or ""


# LangSmith 상세 추적용 래퍼. state 전체(AsyncSession 포함) 대신
# 직렬화 가능한 messages만 넘겨서, 트레이스에 db 커넥션 같은 게 안 남게 함.
@traceable(run_type="llm", name="classify_intent")
async def _classify_intent_llm(messages: list[dict]) -> str:
    return await _chat_completion(messages, temperature=0)


@traceable(run_type="llm", name="generate_answer")
async def _generate_answer_llm(messages: list[dict]) -> str:
    return await _chat_completion(messages)


async def classify_intent(state: GraphState) -> dict:
    messages = [
        {"role": "system", "content": CLASSIFY_SYSTEM_PROMPT},
        {"role": "user", "content": state["query"]},
    ]
    raw = (await _classify_intent_llm(messages)).strip().lower()
    intent = "rag" if "rag" in raw else "general"
    logger.info("[graph] classify_intent query=%r -> intent=%s (raw=%r)", state["query"], intent, raw)
    return {"intent": intent}


def route_by_intent(state: GraphState) -> str:
    return "rag_search" if state["intent"] == "rag" else "general_pass"


async def rag_search(state: GraphState) -> dict:
    chunks = await search_similar_chunks(state["query"], state["user_id"])
    logger.info(
        "[graph] rag_search query=%r -> %d chunks (post_ids=%s)",
        state["query"], len(chunks), [c["post_id"] for c in chunks],
    )
    return {"chunks": chunks}


async def general_pass(state: GraphState) -> dict:
    return {"chunks": []}


async def generate_answer(state: GraphState) -> dict:
    chunks = state["chunks"]

    if chunks:
        context = "\n\n---\n\n".join(c["content"] for c in chunks)
        system_prompt = (
            "너는 사용자의 공부 노트를 기반으로 질문에 답변하는 AI 튜터야. "
            "아래 노트 내용을 참고해서 답변해줘. 노트에 없는 내용은 공부 내용에 없다고 해줘.\n\n"
            f"[참고 노트]\n{context}"
        )
    else:
        system_prompt = "너는 사용자의 공부를 도와주는 친근한 AI 튜터야. 자연스럽게 대화해줘."

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(state["history"])
    messages.append({"role": "user", "content": state["query"]})

    answer = await _generate_answer_llm(messages)
    return {"answer": answer}


async def save_messages(state: GraphState) -> dict:
    db = state["db"]
    conversation_id = state["conversation_id"]
    await save_message(conversation_id, "user", state["query"], db)
    await save_message(conversation_id, "assistant", state["answer"], db)
    return {}


def build_graph():
    graph = StateGraph(GraphState)
    graph.add_node("classify_intent", classify_intent)
    graph.add_node("rag_search", rag_search)
    graph.add_node("general_pass", general_pass)
    graph.add_node("generate_answer", generate_answer)
    graph.add_node("save_messages", save_messages)

    graph.add_edge(START, "classify_intent")
    graph.add_conditional_edges(
        "classify_intent",
        route_by_intent,
        {"rag_search": "rag_search", "general_pass": "general_pass"},
    )
    graph.add_edge("rag_search", "generate_answer")
    graph.add_edge("general_pass", "generate_answer")
    graph.add_edge("generate_answer", "save_messages")
    graph.add_edge("save_messages", END)

    return graph.compile()


_compiled_graph = build_graph()


async def chat(
    query: str,
    user_id: int,
    conversation_id: int,
    history: list[dict],
    db: AsyncSession,
) -> str:
    state: GraphState = {
        "query": query,
        "user_id": user_id,
        "conversation_id": conversation_id,
        "history": history,
        "chunks": [],
        "intent": "",
        "answer": "",
        "db": db,
    }
    result = await _compiled_graph.ainvoke(state)
    return result["answer"]
