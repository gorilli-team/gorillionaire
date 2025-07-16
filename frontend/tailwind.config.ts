import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Custom dark mode colors
        dark: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
      },
      backgroundColor: {
        dark: {
          primary: "#0f172a",
          secondary: "#1e293b",
          tertiary: "#334155",
        },
      },
      textColor: {
        dark: {
          primary: "#f8fafc",
          secondary: "#cbd5e1",
          tertiary: "#94a3b8",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
