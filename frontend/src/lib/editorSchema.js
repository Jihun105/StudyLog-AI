import { createHighlighter } from "./shiki.bundle";

// 필요한 언어만 골라 직접 생성한 하이라이터 (csharp 등 일부 언어 grammar가
// 최신 정규식 "v" flag를 써서 CRA(react-scripts)의 구버전 Babel 파서가
// 파싱하지 못해 빌드가 깨지는 문제가 있어, 실제 쓰는 언어만 커스텀 번들로 대체함)
const supportedLanguages = {
  text: { name: "Plain Text", aliases: ["text", "txt", "plain"] },
  javascript: { name: "JavaScript", aliases: ["javascript", "js"] },
  typescript: { name: "TypeScript", aliases: ["typescript", "ts"] },
  python: { name: "Python", aliases: ["python", "py"] },
  java: { name: "Java", aliases: ["java"] },
  cpp: { name: "C++", aliases: ["cpp", "c++"] },
  c: { name: "C", aliases: ["c"] },
  sql: { name: "SQL", aliases: ["sql"] },
  shellscript: { name: "Shell", aliases: ["bash", "sh", "shell"] },
  json: { name: "JSON", aliases: ["json"] },
  html: { name: "HTML", aliases: ["html"] },
  css: { name: "CSS", aliases: ["css"] },
  markdown: { name: "Markdown", aliases: ["markdown", "md"] },
};

export const codeBlockConfig = {
  defaultLanguage: "javascript",
  supportedLanguages,
  createHighlighter: () =>
    createHighlighter({
      themes: ["github-dark", "github-light"],
      langs: [],
    }),
};
