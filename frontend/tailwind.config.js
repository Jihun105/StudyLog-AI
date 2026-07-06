/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // 사용자가 준 디자인 시스템의 실제 폰트: Headline = Newsreader(세리프).
        // Newsreader엔 한글이 없어서 한글은 Noto Serif KR로 자연스럽게 폴백됨
        serif: ["'Newsreader'", "'Noto Serif KR'", "Georgia", "serif"],
        // Label = JetBrains Mono. 한글은 Nanum Gothic Coding(한글 모노스페이스)으로 폴백
        mono: ["'JetBrains Mono'", "'Nanum Gothic Coding'", "monospace"],
      },
      colors: {
        // 디자인 시스템 이미지의 Neutral(#F9F7F2)/Tertiary(#E5E1D8)를 정확히 반영.
        // 50=Neutral, 200=Tertiary, 100은 그 사이 보간값. 300 이후(본문/다크모드용)는
        // 참고 이미지에 없어서 기존에 맞춰둔 톤을 그대로 이어감
        gray: {
          50: "#f9f7f2",
          100: "#efece5",
          200: "#e5e1d8",
          300: "#c7beac",
          400: "#a99c82",
          500: "#85795f",
          600: "#655a45",
          700: "#4a4132",
          800: "#2e2820",
          900: "#1c1810",
          950: "#100d08",
        },
        // 디자인 시스템의 Primary(#203047, 짙은 네이비)를 정확히 반영. 앱 전체 강조
        // 버튼/링크/포커스링/활성 상태가 blue-*를 쓰고 있어서 여기서 한 번에 적용됨
        blue: {
          50: "#eef0f2",
          100: "#dcdfe3",
          200: "#b9c0c9",
          300: "#8894a3",
          400: "#7183a5",
          500: "#3d4f68",
          600: "#203047",
          700: "#162232",
          800: "#0f1723",
          900: "#0a1018",
          950: "#060a0f",
        },
      },
    },
  },
  plugins: [],
}

