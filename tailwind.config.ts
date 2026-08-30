import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F0EFE6",
        ink: "#22301F",
        mustard: "#B98A2E",
        mustardBg: "#F3E9D2",
        muted: "#8A8672",
        border: "#DCD8CB",
        borderLight: "#E4E1D5",
        white2: "#FFFFFF",
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
