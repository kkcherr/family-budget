import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // "Lavender Fields" palette — gentle, modern. Roles named to match the
        // colour code: Banner, Band A, Band B, Input, Good, Over.
        canvas: "#F7F5FB",
        surface: "#FFFFFF",
        // Banner + Band A (lavender)
        lavender: {
          50: "#FBFAFE",
          100: "#F2EEFA",
          200: "#E6DFF5",
          300: "#D3C7ED",
          400: "#B7A6E0",
          500: "#9F8FD9",
          600: "#7C6BB0", // banner / primary
          700: "#5E4F8C",
        },
        // Band B (warm cream / butter) — used to distinguish Variable expenses
        butter: {
          100: "#FAF1D6",
          200: "#F1E3B4",
          300: "#E6D28C",
          600: "#A8923E",
          700: "#7E6E2E",
        },
        // Input (calm blue-grey) — input fields and amount chips
        mist: {
          100: "#EAF0F4",
          200: "#DCE6EC",
          300: "#C5D4DD",
          600: "#6E8593",
        },
        // Good / savings (sage)
        sage: {
          100: "#E8F1EC",
          400: "#8FC3AC",
          500: "#6FAE90",
          600: "#5FA384",
        },
        // Over plan / overspend (warm terracotta — never harsh red)
        terracotta: {
          100: "#F8E8DF",
          300: "#EBC3B0",
          400: "#E0A187",
          500: "#D6896A",
          700: "#B0613F",
        },
        ink: {
          DEFAULT: "#3A3450",
          soft: "#6C6584",
          faint: "#9A95AD",
        },
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 6px 24px -8px rgba(124, 107, 176, 0.18)",
        "soft-sm": "0 2px 10px -4px rgba(124, 107, 176, 0.16)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
