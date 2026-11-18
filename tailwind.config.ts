import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0b0c",
        elev: "#141416",
        panel: "#1b1b1e",
        line: "rgba(246,241,234,0.1)",
        paper: "#f6f1ea",
        mute: "#9c958b",
        blaze: "#ff4d00",
        gold: "#ffd166",
        mint: "#3ddc97",
      },
      fontFamily: {
        display: ["var(--font-display)", "Impact", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        pin: "0 8px 24px rgba(0,0,0,0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
