import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        // Light, warm paper surfaces (layered). Higher numbers = slightly
        // deeper tints used for insets/code blocks; cards are pure white.
        ink: {
          DEFAULT: "#F7F4EE", // page background (warm cream)
          900: "#EFEAE1", // inset / code surfaces
          800: "#F3EFE8",
          700: "#ECE7DD",
          600: "#EAE4DA", // secondary button
          500: "#E0D9CC", // secondary button hover
        },
        // Text + ink-on-light.
        chalk: {
          DEFAULT: "#1C1A16", // primary text (warm near-black)
          dim: "#5E574B", // secondary text
          faint: "#938B7C", // labels / faint text
        },
        // Deep security red — serious, used as the single accent.
        redline: {
          DEFAULT: "#C20E2E",
          bright: "#E11534",
          deep: "#8E0A21",
          glow: "rgba(194,14,46,0.16)",
        },
        // Pass-green, tuned for light backgrounds.
        safe: {
          DEFAULT: "#1F9D6B",
          dim: "#15784F",
        },
        warn: "#B5730C",
        // Deep warm-ink band for footer / dark sections.
        night: {
          DEFAULT: "#17120F",
          800: "#221A16",
        },
        border: "rgba(28,24,18,0.10)",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        lg: "18px",
        md: "12px",
        sm: "8px",
      },
      boxShadow: {
        glow: "0 14px 34px -12px rgba(194,14,46,0.45)",
        "glow-safe": "0 14px 34px -12px rgba(31,157,107,0.4)",
        // Soft, premium card shadow on light surfaces.
        panel: "0 1px 2px rgba(28,24,18,0.04), 0 18px 44px -26px rgba(28,24,18,0.28)",
        soft: "0 1px 2px rgba(28,24,18,0.04), 0 10px 30px -20px rgba(28,24,18,0.22)",
      },
      keyframes: {
        "scan-sweep": {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "50%": { opacity: "1" },
          "100%": { transform: "translateY(2000%)", opacity: "0" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(194,14,46,0.45)" },
          "70%": { boxShadow: "0 0 0 14px rgba(194,14,46,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(194,14,46,0)" },
        },
        "grid-drift": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "40px 40px" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "43%": { opacity: "1" },
          "45%": { opacity: "0.4" },
          "47%": { opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "spin-slow": "spin-slow 3.5s linear infinite",
        "scan-sweep": "scan-sweep 2.4s cubic-bezier(0.4,0,0.6,1) infinite",
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.4,0,0.6,1) infinite",
        "grid-drift": "grid-drift 8s linear infinite",
        flicker: "flicker 4s linear infinite",
        shimmer: "shimmer 2s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
