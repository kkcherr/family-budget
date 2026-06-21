import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Calm light-lavender palette (see BUILD_SPEC.md visual direction)
        canvas: "#F7F5FB",
        surface: "#FFFFFF",
        lavender: {
          50: "#FBFAFE",
          100: "#F2EEFA",
          200: "#E6DFF5",
          300: "#D3C7ED",
          400: "#B7A6E0",
          500: "#9F8FD9",
          600: "#7C6BB0",
          700: "#5E4F8C",
        },
        // Positive / savings — calm green-lavender sage
        sage: {
          100: "#E8F1EC",
          400: "#9FCBB4",
          600: "#5FA384",
        },
        // Overspend — warm blush/rose, never harsh red
        blush: {
          100: "#FBEEF1",
          300: "#F2CDD6",
          500: "#E8A9B8",
          700: "#C77E91",
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
