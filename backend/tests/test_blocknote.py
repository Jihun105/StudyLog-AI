from app.utils.blocknote import extract_text_from_blocknote
import json

def test_basic_blocks():
    sample = json.dumps([
        {'type': 'heading', 'content': [{'type': 'text', 'text': '제목'}], 'children': []},
        {'type': 'paragraph', 'content': [{'type': 'text', 'text': '본문 내용'}], 'children': []},
        {'type': 'codeBlock', 'content': [{'type': 'text', 'text': 'print(hello)'}], 'children': []},
        {'type': 'quote', 'content': [{'type': 'text', 'text': '인용구'}], 'children': []}
    ])

    result = extract_text_from_blocknote(sample)
    assert '제목' in result
    assert '본문 내용' in result
    assert 'print(hello)' in result
    assert '인용구' in result