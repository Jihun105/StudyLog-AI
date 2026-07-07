/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Headline 폰트: 영어는 원래 라이트모드 폰트였던 Newsreader(세리프)로, 한글은
        // Newsreader에 글리프가 없어서 자동으로 다음 폰트인 Pretendard로 폴백됨
        // (index.css의 전역 h1~h6 규칙과 동일한 스택 - font-serif 유틸리티 클래스를
        // 직접 쓰는 곳들도 같이 맞추기 위해 여기서도 동일하게 지정)
        serif: ["'Newsreader'", "'Pretendard'", "Georgia", "serif"],
        // Label = JetBrains Mono. 한글은 Nanum Gothic Coding(한글 모노스페이스)으로 폴백
        mono: ["'JetBrains Mono'", "'Nanum Gothic Coding'", "monospace"],
      },
      colors: {
        // 실제 색상값은 index.css의 CSS 변수(:root / .dark)에서 "R G B"(스페이스로 구분된
        // 십진수) 형식으로 정의함. rgb(var(--color-...) / <alpha-value>) 패턴을 쓰면
        // tailwind가 <alpha-value> 자리에 실제 opacity 값(예: bg-blue-500/10 -> 0.1)을
        // 채워넣어줌 - 이 패턴이 아니라 그냥 var(--color-...)로 직접 참조하면, "/10" 같은
        // 투명도가 붙은 유틸리티는 tailwind가 아예 생성을 못 하고 조용히 버려버리는
        // 문제가 있었음(실제 빌드로 확인함). 이것 때문에 다크모드에서 반투명 배경이
        // 적용되어야 할 곳들이 색이 통째로 안 먹혀서 흰 박스로 보이는 버그가 있었음.
        // 이렇게 해두면 앱 어디서든 이미 쓰이고 있는 dark:bg-gray-900 /
        // dark:bg-blue-500/10 같은 클래스들이 컴포넌트 파일을 하나도 안 고쳐도 .dark
        // 스코프에서 자동으로 다른(Metallic Industrial) 팔레트를 쓰게 됨 - 라이트모드는
        // :root 값(기존 아이보리/네이비) 그대로 유지
        gray: {
          50: "rgb(var(--color-gray-50) / <alpha-value>)",
          100: "rgb(var(--color-gray-100) / <alpha-value>)",
          200: "rgb(var(--color-gray-200) / <alpha-value>)",
          300: "rgb(var(--color-gray-300) / <alpha-value>)",
          400: "rgb(var(--color-gray-400) / <alpha-value>)",
          500: "rgb(var(--color-gray-500) / <alpha-value>)",
          600: "rgb(var(--color-gray-600) / <alpha-value>)",
          700: "rgb(var(--color-gray-700) / <alpha-value>)",
          800: "rgb(var(--color-gray-800) / <alpha-value>)",
          900: "rgb(var(--color-gray-900) / <alpha-value>)",
          950: "rgb(var(--color-gray-950) / <alpha-value>)",
        },
        blue: {
          50: "rgb(var(--color-blue-50) / <alpha-value>)",
          100: "rgb(var(--color-blue-100) / <alpha-value>)",
          200: "rgb(var(--color-blue-200) / <alpha-value>)",
          300: "rgb(var(--color-blue-300) / <alpha-value>)",
          400: "rgb(var(--color-blue-400) / <alpha-value>)",
          500: "rgb(var(--color-blue-500) / <alpha-value>)",
          600: "rgb(var(--color-blue-600) / <alpha-value>)",
          700: "rgb(var(--color-blue-700) / <alpha-value>)",
          800: "rgb(var(--color-blue-800) / <alpha-value>)",
          900: "rgb(var(--color-blue-900) / <alpha-value>)",
          950: "rgb(var(--color-blue-950) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
}

