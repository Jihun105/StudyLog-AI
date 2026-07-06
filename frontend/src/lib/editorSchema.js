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

// BlockNote/prosemirror-highlight는 실제로 강조할 때 themes 배열 중 "첫 번째" 테마만
// 씀(라이트/다크 모드에 따라 자동으로 안 바뀜) - 그래서 코드 블록 배경이 밝은지 어두운지에
// 맞는 테마를 첫 번째로 둬야 함(어두운 배경엔 github-dark, 밝은 배경엔 github-light).
// 문자열 이름 대신 위에서 주석 색을 바꿔둔 테마 객체를 직접 넘김(shiki가 문자열/객체 둘 다 지원함).
// appTheme("light"|"dark")는 에디터를 처음 만들 때(useCreateBlockNote 호출 시점) 한 번만
// 반영됨 - 에디터를 만든 후에 라이트/다크를 토글해도 이미 만들어진 하이라이터가 실시간으로
// 안 바뀌는 건 라이브러리 자체의 제약(위 getLoadedThemes()[0] 참고)이라 어쩔 수 없음
export function getCodeBlockConfig(appTheme) {
  const themes = appTheme === "dark"
    ? [githubDarkWithGreenComments, githubLightWithGreenComments]
    : [githubLightWithGreenComments, githubDarkWithGreenComments];
  return {
    defaultLanguage: "javascript",
    supportedLanguages,
    createHighlighter: () => createHighlighter({ themes, langs: [] }),
  };
}

// 하위 호환용 - appTheme을 모르는 호출부는 계속 라이트 기준으로 동작
export const codeBlockConfig = getCodeBlockConfig("light");
