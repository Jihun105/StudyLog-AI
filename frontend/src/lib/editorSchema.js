import { createHighlighter } from "./shiki.bundle";
import githubLightTheme from "@shikijs/themes/github-light";
import githubDarkTheme from "@shikijs/themes/github-dark";

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

// 주석(# ..., // ... 등) 색을 원하는 밝은 초록색으로 바꾸기 위해, shiki 테마를
// 그대로 쓰지 않고 comment 관련 스코프의 foreground만 오버라이드해서 복제함
function withGreenComments(theme) {
  return {
    ...theme,
    tokenColors: theme.tokenColors.map((rule) => {
      const scopes = Array.isArray(rule.scope) ? rule.scope : [rule.scope];
      const isComment = scopes.some((scope) => typeof scope === "string" && scope.includes("comment"));
      if (!isComment) return rule;
      return { ...rule, settings: { ...rule.settings, foreground: "#16a34a" } };
    }),
  };
}

const githubLightWithGreenComments = withGreenComments(githubLightTheme);
const githubDarkWithGreenComments = withGreenComments(githubDarkTheme);

export const codeBlockConfig = {
  defaultLanguage: "javascript",
  supportedLanguages,
  // BlockNote/prosemirror-highlight는 실제로 강조할 때 이 배열 중 "첫 번째" 테마만
  // 씀(라이트/다크 모드에 따라 자동으로 안 바뀜). 코드 블록 배경을 밝은 아이보리 톤으로
  // 쓰고 있어서, 어두운 배경 기준 팔레트인 github-dark가 첫 번째면 글자색(연한 톤)이
  // 밝은 배경 위에서 거의 안 보임 - 그래서 밝은 배경에 맞는 github-light를 첫 번째로 둠.
  // 문자열 이름 대신 위에서 주석 색을 바꿔둔 테마 객체를 직접 넘김(shiki가 문자열/객체
  // 둘 다 지원함)
  createHighlighter: () =>
    createHighlighter({
      themes: [githubLightWithGreenComments, githubDarkWithGreenComments],
      langs: [],
    }),
};
