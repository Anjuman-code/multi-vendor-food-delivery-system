/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/components/ui/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Orange brand scale ──────────────────────────────────
        brand: {
          50:  "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316", // primary
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        // ── Semantic surfaces for vendor pages ──────────────────
        vendor: {
          surface:  "#fafbfc",
          sidebar:  "#111827",
          accent:   "#f97316",
          muted:    "#6b7280",
          border:   "#e5e7eb",
        },
      },
      // ── Type scale ───────────────────────────────────────────
      fontSize: {
        "2xs":  ["0.625rem", { lineHeight: "0.875rem" }],
        "3xl":  ["1.75rem", { lineHeight: "2.25rem" }],
        "4xl":  ["2rem",    { lineHeight: "2.5rem" }],
      },
      // ── Spacing tokens for layout consistency ───────────────
      spacing: {
        "4.5": "1.125rem",
        "13":  "3.25rem",
        "15":  "3.75rem",
        "18":  "4.5rem",
      },
      // ── Shadow tokens ───────────────────────────────────────
      boxShadow: {
        "card":    "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        "card-md": "0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
        "card-lg": "0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04)",
        "sidebar": "4px 0 24px 0 rgb(0 0 0 / 0.08)",
      },
      // ── Border radius tokens ─────────────────────────────────
      borderRadius: {
        "2.5xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
