import { useEffect, useMemo } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { codeBlockConfig } from "../lib/editorSchema";

function RichTextEditor({ initialContent, onChange }) {
  // JSON이면 파싱, HTML이면 undefined (useEffect에서 처리)
  const parsedInitial = useMemo(() => {
    if (!initialContent) return undefined;
    try {
      const parsed = JSON.parse(initialContent);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
    return undefined;
  }, []); // 마운트 시 1회만

  const editor = useCreateBlockNote({
    codeBlock: codeBlockConfig,
    initialContent: parsedInitial,
  });

  // 기존 TipTap HTML 포스트 fallback
  useEffect(() => {
    if (!editor || !initialContent || parsedInitial) return;
    async function loadHTML() {
      const blocks = await editor.tryParseHTMLToBlocks(initialContent);
      editor.replaceBlocks(editor.document, blocks);
    }
    loadHTML();
  }, [editor]);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden min-h-64">
      <BlockNoteView
        editor={editor}
        onChange={() => onChange(JSON.stringify(editor.document))}
        theme="light"
      />
    </div>
  );
}

export default RichTextEditor;
