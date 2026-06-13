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
        // ── shadcn/ui semantic tokens (driven by CSS vars in index.css) ──
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // ── Orange brand scale (primary mirrors brand-500) ──────────
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
      // ── Border radius tokens (lg/md/sm derive from --radius) ──
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2.5xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
