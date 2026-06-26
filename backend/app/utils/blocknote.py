import json

def extract_text_from_blocknote(content: str) -> str:
    """
    BlockNote JSON 문자열에서 순수 텍스트를 추출
    """
    try:
        blocks = json.loads(content)
    except (json.JSONDecodeError, TypeError):
        return content # JSON이 아니면 (구 TipTap HTML등) 그대로
    
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
                        parts.append(inline.get("text", ""))

    # 일반 블록 (paragraph, heading, quote, codeBlock, list 등)
    elif isinstance(content, list):
        for inline in content:
            if inline.get("type") == "text":
                parts.append(inline.get("text", ""))

    # 중첩 블록 (children) 재귀 처리
    children = block.get("children", [])
    if children:
        parts.append(_extract_from_blocks(children))

    return " ".join(filter(None, parts))