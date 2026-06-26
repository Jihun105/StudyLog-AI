import json


def chunk_blocknote(content: str, max_blocks_per_chunk: int = 5) -> list[str]:
    """
    BlockNote JSON을 블록 단위로 청킹.
    - heading이 나오면 새 청크 시작
    - heading 없으면 max_blocks_per_chunk개씩 묶음
    - overlap: 각 청크 마지막 블록을 다음 청크 첫 블록으로 포함
    """
    try:
        blocks = json.loads(content)
    except (json.JSONDecodeError, TypeError):
        return [content]

    if not blocks:
        return []

    chunks = []
    current = []

    for block in blocks:
        text = _extract_block_text(block)
        if not text.strip():
            continue

        # heading이 나오면 현재 청크 저장 후 새 청크 시작
        if block.get("type") == "heading" and current:
            chunks.append("\n".join(current))
            current = [current[-1]]  # overlap: 이전 마지막 블록 포함

        current.append(text)

        # max_blocks_per_chunk 초과 시 강제 분리
        if len(current) >= max_blocks_per_chunk:
            chunks.append("\n".join(current))
            current = [current[-1]]  # overlap

    if current:
        chunks.append("\n".join(current))

    return chunks


def _extract_block_text(block: dict) -> str:
    parts = []
    content = block.get("content")

    if isinstance(content, dict) and content.get("type") == "tableContent":
        for row in content.get("rows", []):
            for cell in row.get("cells", []):
                for inline in cell.get("content", []):
                    if inline.get("type") == "text":
                        parts.append(inline.get("text", ""))
    elif isinstance(content, list):
        for inline in content:
            if inline.get("type") == "text":
                parts.append(inline.get("text", ""))

    for child in block.get("children", []):
        parts.append(_extract_block_text(child))

    return " ".join(filter(None, parts))