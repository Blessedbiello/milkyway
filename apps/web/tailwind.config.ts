import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        solana: {
          purple: "#9945FF",
          green: "#14F195",
          cyan: "#00D1FF",
          pink: "#FB47EC",
        },
        surface: {
          0: "#09090b",
          1: "#0f0f14",
          2: "#16161d",
          3: "#1c1c26",
          4: "#242430",
        },
        border: {
          DEFAULT: "#27272a",
          subtle: "#1e1e24",
          accent: "rgba(153, 69, 255, 0.3)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-solana":
          "linear-gradient(135deg, #9945FF 0%, #14F195 50%, #00D1FF 100%)",
        "gradient-card":
          "linear-gradient(180deg, rgba(153, 69, 255, 0.05) 0%, transparent 100%)",
      },
      boxShadow: {
        glow: "0 0 20px rgba(153, 69, 255, 0.15)",
        "glow-green": "0 0 20px rgba(20, 241, 149, 0.15)",
        "glow-lg": "0 0 40px rgba(153, 69, 255, 0.2)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 8s linear infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
