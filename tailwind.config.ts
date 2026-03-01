import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand — violet/purple
        brand: {
          DEFAULT: "#7C3AED",
          light: "#A78BFA",
          dark: "#6D28D9",
          faint: "#F5F3FF",
        },
        // Gradient accent colours
        "brand-pink": "#DB2777",
        "brand-fuchsia": "#C026D3",
        "brand-blue": "#2563EB",
        // Text colours (dark on light)
        ink: "#0F0A1E",
        "ink-2": "#374151",
        "ink-3": "#6B7280",
        "ink-4": "#9CA3AF",
        // Surface / background colours (light theme)
        surface: "#FAFAFA",
        "surface-white": "#FFFFFF",
        "surface-tint": "#F5F3FF",
        "surface-pink": "#FDF2F8",
        // Borders
        "border-subtle": "rgba(124,58,237,0.1)",
        muted: "#6B7280",
        "muted-light": "#9CA3AF",
        border: "#E5E7EB",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      maxWidth: {
        content: "1100px",
      },
      backgroundImage: {
        "ai-gradient": "linear-gradient(135deg, #7C3AED 0%, #A855F7 40%, #DB2777 100%)",
        "ai-gradient-subtle": "linear-gradient(135deg, rgba(124,58,237,0.07) 0%, rgba(219,39,119,0.04) 100%)",
        "ai-gradient-text": "linear-gradient(135deg, #7C3AED 0%, #C026D3 50%, #DB2777 100%)",
      },
      boxShadow: {
        "card": "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
        "card-hover": "0 8px 32px rgba(124,58,237,0.12), 0 2px 8px rgba(0,0,0,0.06)",
        "glow-brand": "0 0 40px rgba(124,58,237,0.25)",
        "glow-pink": "0 0 40px rgba(219,39,119,0.20)",
      },
      animation: {
        "spin-slow": "spin 2s linear infinite",
        "pulse-dot": "pulseDot 2s ease-in-out infinite",
        "fade-up": "fadeUp 0.5s ease-out forwards",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(0.85)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
