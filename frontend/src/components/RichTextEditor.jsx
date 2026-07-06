import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { en as blockNoteEn, ko as blockNoteKo } from "@blocknote/core/locales";
import { insertOrUpdateBlock, BlockNoteSchema, defaultBlockSpecs, withPageBreak } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import {
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight,
  Heading1, Heading2, Heading3, Pilcrow, List, ListOrdered, ListChecks,
  Table, Image as ImageIcon, PanelRight, ListTree, Minus, X, Quote,
} from "lucide-react";
import { getCodeBlockConfig } from "../lib/editorSchema";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { uploadImage } from "../api/uploads";

// 구분선(수평선) 기능 - 처음엔 직접 커스텀 블록(hr)을 만들어봤는데 화면에 아무것도
// 안 보이는 렌더링 버그가 있어서, BlockNote에 이미 내장돼 있고 실제로 점선을
// 그려주는 "pageBreak" 블록을 재사용함(원래는 인쇄 시 페이지 나누기용이지만,
// 편집 화면에서는 그냥 구분선처럼 보이고 동작도 안정적임)
// 모듈 스코프에 한 번만 만들어서 에디터 인스턴스마다 재생성되지 않게 함
const editorSchema = withPageBreak(BlockNoteSchema.create({ blockSpecs: defaultBlockSpecs }));

// Apple Pages의 "포맷 패널"처럼 지금 커서가 있는 블록/선택 영역에 맞춰 내용이
// 바뀌는 작은 아이콘 버튼. 활성 상태(예: 지금 굵게 처리돼 있음, 지금 H1임)일 때
// 파란색으로 강조됨
function FormatIconButton({ active, onClick, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center p-1.5 rounded-lg transition-colors ${
        active
          ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
          : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

// 툴바 양 끝(서식/목차)에 쓰는, 아이콘만으로는 뭔지 알기 어려우니 글자를 함께
// 보여주는 버튼. iconPosition으로 아이콘을 글자 앞/뒤 중 어디에 둘지 정함
// (서식은 왼쪽 끝이라 아이콘이 바깥쪽인 앞에, 목차는 오른쪽 끝이라 아이콘이
// 바깥쪽인 뒤에 오도록 해서 좌우 대칭이 되게 함)
function FormatLabelButton({ active, onClick, title, icon: Icon, label, iconPosition = "start" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
        active
          ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
          : "text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
      }`}
    >
      {iconPosition === "start" && <Icon size={14} />}
      <span>{label}</span>
      {iconPosition === "end" && <Icon size={14} />}
    </button>
  );
}

// 노트 안의 제목(H1/H2/H3) 블록들을 재귀적으로 모아서 목차 데이터로 만듦
function extractHeadings(blocks, result = []) {
  for (const block of blocks) {
    if (block.type === "heading") {
      const text = (block.content || [])
        .map((item) => (item.type === "text" ? item.text : ""))
        .join("")
        .trim();
      if (text) {
        result.push({ id: block.id, level: block.props?.level || 1, text });
      }
    }
    if (block.children && block.children.length > 0) {
      extractHeadings(block.children, result);
    }
  }
  return result;
}

function RichTextEditor({ initialContent, onChange }) {
  const { theme } = useTheme();
  const { token } = useAuth();
  const { i18n, t } = useTranslation();
  const [formatPanelOpen, setFormatPanelOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [activeStyles, setActiveStyles] = useState({});
  const [activeBlock, setActiveBlock] = useState(null);
  const [headings, setHeadings] = useState([]);

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
    schema: editorSchema,
    // 코드 블록 하이라이터는 에디터를 처음 만들 때의 라이트/다크 상태를 기준으로 고정됨
    // (에디터를 만든 뒤 테마를 토글해도 실시간으로 안 바뀜 - editorSchema.js 참고)
    codeBlock: getCodeBlockConfig(theme),
    initialContent: parsedInitial,
    // 이미지/파일 블록에서 "업로드" 버튼, 드래그&드롭, 붙여넣기로 사진을 넣을 수 있게 함
    uploadFile: async (file) => uploadImage(file, token),
    // BlockNote 기본 placeholder에서 "텍스트를 입력하거나" 부분을 빼고 "/"로 명령어를
    // 쓸 수 있다는 것만 짧게 보여줌
    dictionary: {
      ...(i18n.language === "en" ? blockNoteEn : blockNoteKo),
      placeholders: {
        ...(i18n.language === "en" ? blockNoteEn : blockNoteKo).placeholders,
        default: i18n.language === "en" ? "Type '/' for commands" : "'/'를 입력해 명령어 사용",
      },
    },
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

  // 커서 위치/선택 영역이 바뀔 때마다 포맷 패널에 보여줄 현재 상태(굵게 여부,
  // 지금 블록 종류 등)를 다시 읽어옴
  const refreshActiveState = useCallback(() => {
    if (!editor) return;
    try {
      setActiveStyles(editor.getActiveStyles());
      setActiveBlock(editor.getTextCursorPosition().block);
    } catch {
      // 에디터가 아직 마운트되지 않은 초기 시점 등에는 조용히 무시
    }
  }, [editor]);

  // 글이 바뀔 때마다 목차(제목 목록)를 다시 계산
  const refreshHeadings = useCallback(() => {
    if (!editor) return;
    setHeadings(extractHeadings(editor.document));
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    refreshActiveState();
    refreshHeadings();
    editor.onSelectionChange(refreshActiveState);
    editor.onEditorContentChange(refreshActiveState);
    editor.onEditorContentChange(refreshHeadings);
  }, [editor, refreshActiveState, refreshHeadings]);

  const toggleStyle = (style) => {
    editor.toggleStyles({ [style]: true });
    refreshActiveState();
  };

  const setBlockType = (type, props = {}) => {
    const current = editor.getTextCursorPosition().block;
    editor.updateBlock(current, { type, props });
    refreshActiveState();
  };

  const setAlignment = (textAlignment) => {
    const current = editor.getTextCursorPosition().block;
    editor.updateBlock(current, { props: { textAlignment } });
    refreshActiveState();
  };

  const insertTable = () => {
    insertOrUpdateBlock(editor, {
      type: "table",
      content: {
        type: "tableContent",
        rows: [{ cells: ["", "", ""] }, { cells: ["", "", ""] }],
      },
    });
  };

  const insertImage = () => {
    const insertedBlock = insertOrUpdateBlock(editor, { type: "image" });
    // 이미지 블록을 넣자마자 업로드 패널이 바로 열리도록 함(슬래시 메뉴의 "이미지"와 동일한 동작)
    editor.transact((tr) =>
      tr.setMeta(editor.filePanel.plugin, { block: insertedBlock })
    );
  };

  // 구분선은 다른 스타일 버튼들과 달리 지금 블록의 타입을 바꾸는 게 아니라
  // 표/이미지처럼 새 블록을 끼워 넣는 동작이라 setBlockType 대신 insertOrUpdateBlock을 씀
  // (내부적으로는 BlockNote 내장 pageBreak 블록 타입을 재사용함)
  const insertDivider = () => {
    insertOrUpdateBlock(editor, { type: "pageBreak" });
    refreshActiveState();
  };

  const toggleFormatPanel = () => {
    refreshActiveState();
    setTocOpen(false);
    setFormatPanelOpen((prev) => !prev);
  };

  const toggleToc = () => {
    refreshHeadings();
    setFormatPanelOpen(false);
    setTocOpen((prev) => !prev);
  };

  const jumpToHeading = (id) => {
    editor.setTextCursorPosition(id, "start");
    const el = document.querySelector(`[data-id="${id}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const blockType = activeBlock?.type;
  const headingLevel = activeBlock?.props?.level;
  const alignment = activeBlock?.props?.textAlignment || "left";

  return (
    <div className="relative">
      {/* 얇은 상단 툴바 - 아이콘만 있으면 뭔지 알기 어려워서 서식/목차는 글자를
          함께 보여줌. 서식은 맨 왼쪽, 목차는 맨 오른쪽에 두고, 서식과 나머지
          아이콘(표/이미지 삽입)을 구분선으로 나눔 */}
      <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
        <FormatLabelButton
          active={formatPanelOpen}
          onClick={toggleFormatPanel}
          title={t("richTextEditor.formatPanel")}
          icon={PanelRight}
          label={t("richTextEditor.formatPanel")}
          iconPosition="start"
        />
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
        <FormatIconButton onClick={insertTable} title={t("richTextEditor.insertTable")}>
          <Table size={16} />
        </FormatIconButton>
        <FormatIconButton onClick={insertImage} title={t("richTextEditor.insertImage")}>
          <ImageIcon size={16} />
        </FormatIconButton>
        <div className="flex-1" />
        <FormatLabelButton
          active={tocOpen}
          onClick={toggleToc}
          title={t("richTextEditor.tableOfContents")}
          icon={ListTree}
          label={t("richTextEditor.tableOfContents")}
          iconPosition="end"
        />
      </div>

      {/* 테두리/배경 없이 렌더링 - 글쓰기 페이지의 "문서 페이지" 카드 안에 자연스럽게
          이어지도록 함(Apple Pages처럼 편집 영역 자체엔 별도 박스 테두리를 두지 않음) */}
      <div className="min-h-64">
        <BlockNoteView
          editor={editor}
          onChange={() => onChange(JSON.stringify(editor.document))}
          theme={theme}
        />
      </div>

      {/* 목차 패널 - 제목(H1~H3)들을 모아서 보여주고 클릭하면 해당 위치로 이동 */}
      {tocOpen && (
        <div className="fixed top-24 right-6 z-30 w-60 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 max-h-[75vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              {t("richTextEditor.tableOfContents")}
            </span>
            <button
              onClick={() => setTocOpen(false)}
              className="text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={14} />
            </button>
          </div>

          {headings.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">{t("richTextEditor.noHeadings")}</p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {headings.map((heading) => (
                <button
                  key={heading.id}
                  onClick={() => jumpToHeading(heading.id)}
                  style={{ paddingLeft: `${(heading.level - 1) * 12 + 8}px` }}
                  className="text-left text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg py-1.5 pr-2 truncate"
                >
                  {heading.text}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Apple Pages의 포맷 인스펙터처럼, 평소엔 숨어있다가 토글을 누르면 화면
          오른쪽에 떠서 지금 커서 위치에 맞는 서식을 바로 적용할 수 있게 함 */}
      {formatPanelOpen && (
        <div className="fixed top-24 right-6 z-30 w-60 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 max-h-[75vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              {t("richTextEditor.formatPanel")}
            </span>
            <button
              onClick={() => setFormatPanelOpen(false)}
              className="text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={14} />
            </button>
          </div>

          <div className="mb-4">
            <div className="text-[11px] text-gray-400 dark:text-gray-500 mb-1.5">{t("richTextEditor.style")}</div>
            <div className="grid grid-cols-4 gap-1">
              <FormatIconButton active={blockType === "paragraph"} onClick={() => setBlockType("paragraph")} title={t("richTextEditor.paragraph")}>
                <Pilcrow size={14} />
              </FormatIconButton>
              <FormatIconButton active={blockType === "heading" && headingLevel === 1} onClick={() => setBlockType("heading", { level: 1 })} title="H1">
                <Heading1 size={14} />
              </FormatIconButton>
              <FormatIconButton active={blockType === "heading" && headingLevel === 2} onClick={() => setBlockType("heading", { level: 2 })} title="H2">
                <Heading2 size={14} />
              </FormatIconButton>
              <FormatIconButton active={blockType === "heading" && headingLevel === 3} onClick={() => setBlockType("heading", { level: 3 })} title="H3">
                <Heading3 size={14} />
              </FormatIconButton>
              <FormatIconButton active={blockType === "bulletListItem"} onClick={() => setBlockType("bulletListItem")} title={t("richTextEditor.bulletList")}>
                <List size={14} />
              </FormatIconButton>
              <FormatIconButton active={blockType === "numberedListItem"} onClick={() => setBlockType("numberedListItem")} title={t("richTextEditor.numberedList")}>
                <ListOrdered size={14} />
              </FormatIconButton>
              <FormatIconButton active={blockType === "checkListItem"} onClick={() => setBlockType("checkListItem")} title={t("richTextEditor.checkList")}>
                <ListChecks size={14} />
              </FormatIconButton>
              <FormatIconButton onClick={insertDivider} title={t("richTextEditor.divider")}>
                <Minus size={14} />
              </FormatIconButton>
              <FormatIconButton active={blockType === "quote"} onClick={() => setBlockType("quote")} title={t("richTextEditor.quote")}>
                <Quote size={14} />
              </FormatIconButton>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-[11px] text-gray-400 dark:text-gray-500 mb-1.5">{t("richTextEditor.textFormat")}</div>
            <div className="flex gap-1">
              <FormatIconButton active={!!activeStyles.bold} onClick={() => toggleStyle("bold")} title={t("richTextEditor.bold")}>
                <Bold size={14} />
              </FormatIconButton>
              <FormatIconButton active={!!activeStyles.italic} onClick={() => toggleStyle("italic")} title={t("richTextEditor.italic")}>
                <Italic size={14} />
              </FormatIconButton>
              <FormatIconButton active={!!activeStyles.underline} onClick={() => toggleStyle("underline")} title={t("richTextEditor.underline")}>
                <Underline size={14} />
              </FormatIconButton>
              <FormatIconButton active={!!activeStyles.strike} onClick={() => toggleStyle("strike")} title={t("richTextEditor.strikethrough")}>
                <Strikethrough size={14} />
              </FormatIconButton>
            </div>
          </div>

          <div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500 mb-1.5">{t("richTextEditor.alignment")}</div>
            <div className="flex gap-1">
              <FormatIconButton active={alignment === "left"} onClick={() => setAlignment("left")} title={t("richTextEditor.alignLeft")}>
                <AlignLeft size={14} />
              </FormatIconButton>
              <FormatIconButton active={alignment === "center"} onClick={() => setAlignment("center")} title={t("richTextEditor.alignCenter")}>
                <AlignCenter size={14} />
              </FormatIconButton>
              <FormatIconButton active={alignment === "right"} onClick={() => setAlignment("right")} title={t("richTextEditor.alignRight")}>
                <AlignRight size={14} />
              </FormatIconButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RichTextEditor;
