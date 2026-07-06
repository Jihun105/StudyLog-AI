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
        // 실제 색상값은 index.css의 CSS 변수(:root / .dark)에서 정의함.
        // gray/blue 팔레트를 var(--...)로 간접 참조하게 해두면, 앱 어디서든
        // 이미 쓰이고 있는 dark:bg-gray-900 / dark:text-gray-100 같은 클래스들이
        // 컴포넌트 파일을 하나도 안 고쳐도 .dark 스코프에서 자동으로 다른(Metallic
        // Industrial) 팔레트를 쓰게 됨 - 라이트모드는 :root 값(기존 아이보리/네이비) 그대로 유지
        gray: {
          50: "var(--color-gray-50)",
          100: "var(--color-gray-100)",
          200: "var(--color-gray-200)",
          300: "var(--color-gray-300)",
          400: "var(--color-gray-400)",
          500: "var(--color-gray-500)",
          600: "var(--color-gray-600)",
          700: "var(--color-gray-700)",
          800: "var(--color-gray-800)",
          900: "var(--color-gray-900)",
          950: "var(--color-gray-950)",
        },
        blue: {
          50: "var(--color-blue-50)",
          100: "var(--color-blue-100)",
          200: "var(--color-blue-200)",
          300: "var(--color-blue-300)",
          400: "var(--color-blue-400)",
          500: "var(--color-blue-500)",
          600: "var(--color-blue-600)",
          700: "var(--color-blue-700)",
          800: "var(--color-blue-800)",
          900: "var(--color-blue-900)",
          950: "var(--color-blue-950)",
        },
      },
    },
  },
  plugins: [],
}

