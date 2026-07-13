import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        jira: {
          app: "#F4F5F7",
          nav: "#FFFFFF",
          panel: "#FFFFFF",
          surface: "#F4F5F7",
          hover: "#EBECF0",
          border: "#DFE1E6",
          borderLight: "#C1C7D0",
          blue: "#0052CC",
          blueDark: "#0747A6",
          blueLight: "#4C9AFF",
          blueBg: "#DEEBFF",
          text: "#172B4D",
          textSub: "#42526E",
          textMuted: "#6B778C",
          textLight: "#97A0AF",
          epic: "#6554E0",
          story: "#36B37E",
          task: "#4C9AFF",
          bug: "#DE350B",
          subtask: "#A5ADBA",
          priHighest: "#DE350B",
          priHigh: "#FF5630",
          priMedium: "#FFAB00",
          priLow: "#36B37E",
          priLowest: "#57D9A3",
          green: "#36B37E",
          greenBg: "#E3FCEF",
          yellow: "#FFAB00",
          yellowBg: "#FFFAE6",
          red: "#DE350B",
          redBg: "#FFEBE6",
          orange: "#FF8B00",
          orangeBg: "#FFF0E6",
          purple: "#6554E0",
          purpleBg: "#EAE6FF",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(9, 30, 66, 0.08)",
        cardHover: "0 4px 8px -2px rgba(9, 30, 66, 0.12)",
        modal: "0 8px 16px -4px rgba(9, 30, 66, 0.25)",
        dropdown: "0 4px 12px -2px rgba(9, 30, 66, 0.20)",
      },
    },
  },
  plugins: [],
};

export default config;
