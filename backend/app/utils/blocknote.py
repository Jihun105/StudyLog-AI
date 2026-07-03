import html
import json
import re

def extract_text_from_blocknote(content: str) -> str:
    """
    BlockNote JSON 문자열에서 순수 텍스트를 추출
    """
    try:
        blocks = json.loads(content)
    except (json.JSONDecodeError, TypeError):
        # JSON이 아니면 (구 TipTap HTML등) 태그를 제거하고 &lt;int:pk&gt; 같은 HTML 엔티티를
        # 원래 문자(<int:pk>)로 복원해서 돌려줌. 그대로 넘기면 GPT/퀴즈/RAG에 이스케이프된
        # 문자열이 그대로 노출되어 화면에 깨진 것처럼 보임
        stripped = re.sub(r"<[^>]+>", " ", content or "")
        return html.unescape(stripped).strip()

    return _extract_from_blocks(blocks)

def _extract_from_blocks(blocks: list) -> str:
    texts = []
    for block in blocks:
        texts.append(_extract_from_block(block))
    
    return "\n".join(filter(None, texts))

def _extract_from_block(block: dict) -> str:
    parts = []

    content = block.get("content")

    # table 블록 처리
    if isinstance(content, dict) and content.get("type") == "tableContent":
        for row in content.get("rows", []):
            for cell in row.get("cells", []):
                for inline in cell.get("content", []):
                    if inline.get("type") == "text":
                        # &lt;int:pk&gt; 처럼 HTML 엔티티로 저장된 경우를 대비해 복원 (일반 텍스트면 그대로 통과)
                        parts.append(html.unescape(inline.get("text", "")))

    # 일반 블록 (paragraph, heading, quote, codeBlock, list 등)
    elif isinstance(content, list):
        for inline in content:
            if inline.get("type") == "text":
                parts.append(html.unescape(inline.get("text", "")))

    # 중첩 블록 (children) 재귀 처리
    children = block.get("children", [])
    if children:
        parts.append(_extract_from_blocks(children))

    return " ".join(filter(None, parts))