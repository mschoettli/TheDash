import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg:      "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        card:    "rgb(var(--card) / <alpha-value>)",
        line:    "rgb(var(--line) / <alpha-value>)",
        t1:      "rgb(var(--t1) / <alpha-value>)",
        t2:      "rgb(var(--t2) / <alpha-value>)",
        t3:      "rgb(var(--t3) / <alpha-value>)",
        accent:  "rgb(var(--accent) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
