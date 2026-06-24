import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight } from "lowlight";
import python from "highlight.js/lib/languages/python";
import javascript from "highlight.js/lib/languages/javascript";
import css from "highlight.js/lib/languages/css";
import sql from "highlight.js/lib/languages/sql";
import bash from "highlight.js/lib/languages/bash";

// lowlight에 언어 등록
const lowlight = createLowlight();
lowlight.register("python", python);
lowlight.register("javascript", javascript);
lowlight.register("css", css);
lowlight.register("sql", sql);
lowlight.register("bash", bash);

function ToolbarButton({ onClick, active, children, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
        active ? "bg-blue-500 text-white" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

function RichTextEditor({ content, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // CodeBlockLowlight로 대체
      }),
      Placeholder.configure({
        placeholder: "내용을 입력하세요...",
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content && editor.isEmpty) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  if (!editor) return null;

  // 링크 삽입 핸들러
  const handleSetLink = () => {
    const url = window.prompt("링크 URL을 입력하세요:", "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <div className="border border-gray-300 rounded overflow-hidden">
      {/* 툴바 */}
      <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-gray-200 bg-gray-50">

        {/* 제목 */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="제목 1">H1</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="제목 2">H2</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="제목 3">H3</ToolbarButton>

        <div className="w-px bg-gray-300 mx-1" />

        {/* 텍스트 스타일 */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="굵게"><b>B</b></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="기울임"><i>I</i></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="밑줄"><u>U</u></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="취소선"><s>S</s></ToolbarButton>

        <div className="w-px bg-gray-300 mx-1" />

        {/* 글자 색상 */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">색상</span>
          <input
            type="color"
            onInput={(e) => editor.chain().focus().setColor(e.target.value).run()}
            value={editor.getAttributes("textStyle").color || "#000000"}
            className="w-6 h-6 cursor-pointer rounded border border-gray-300"
            title="글자 색상"
          />
        </div>

        {/* 형광펜 */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">형광펜</span>
          <input
            type="color"
            onInput={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
            value="#ffff00"
            className="w-6 h-6 cursor-pointer rounded border border-gray-300"
            title="형광펜"
          />
        </div>

        <div className="w-px bg-gray-300 mx-1" />

        {/* 목록 */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="순서 없는 목록">• 목록</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="순서 있는 목록">1. 목록</ToolbarButton>

        <div className="w-px bg-gray-300 mx-1" />

        {/* 코드 */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="인라인 코드">{"</>"}</ToolbarButton>

        {/* 코드블록 언어 선택 */}
        <select
          onChange={(e) => editor.chain().focus().setCodeBlock({ language: e.target.value }).run()}
          className="text-xs border border-gray-300 rounded px-1 py-1 text-gray-600"
          title="코드 블록"
        >
          <option value="">코드블록</option>
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
          <option value="css">CSS</option>
          <option value="sql">SQL</option>
          <option value="bash">Bash</option>
        </select>

        <div className="w-px bg-gray-300 mx-1" />

        {/* 링크 */}
        <ToolbarButton onClick={handleSetLink} active={editor.isActive("link")} title="링크 삽입">🔗 링크</ToolbarButton>

        <div className="w-px bg-gray-300 mx-1" />

        {/* 표 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          active={false}
          title="표 삽입"
        >
          표
        </ToolbarButton>
        {editor.isActive("table") && (
          <>
            <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} active={false} title="열 추가">열+</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().deleteColumn().run()} active={false} title="열 삭제">열-</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} active={false} title="행 추가">행+</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().deleteRow().run()} active={false} title="행 삭제">행-</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} active={false} title="표 삭제">표삭제</ToolbarButton>
          </>
        )}

        <div className="w-px bg-gray-300 mx-1" />

        {/* 기타 */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="인용구">" 인용</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="구분선">─ 구분선</ToolbarButton>
      </div>

      {/* 에디터 본문 */}
      <EditorContent
        editor={editor}
        className="prose max-w-none px-4 py-3 min-h-64 focus:outline-none"
      />
    </div>
  );
}

export default RichTextEditor;