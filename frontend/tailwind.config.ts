import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        jira: {
          app: "rgb(var(--jira-app) / <alpha-value>)",
          nav: "rgb(var(--jira-nav) / <alpha-value>)",
          elevated: "rgb(var(--jira-elevated) / <alpha-value>)",
          panel: "rgb(var(--jira-nav) / <alpha-value>)",
          surface: "rgb(var(--jira-surface) / <alpha-value>)",
          hover: "rgb(var(--jira-hover) / <alpha-value>)",
          border: "rgb(var(--jira-border) / <alpha-value>)",
          borderLight: "rgb(var(--jira-borderLight) / <alpha-value>)",
          blue: "#0052CC",
          blueDark: "#0747A6",
          blueLight: "#4C9AFF",
          blueBg: "rgb(var(--jira-blueBg) / <alpha-value>)",
          text: "rgb(var(--jira-text) / <alpha-value>)",
          textSub: "rgb(var(--jira-textSub) / <alpha-value>)",
          textMuted: "rgb(var(--jira-textMuted) / <alpha-value>)",
          textLight: "rgb(var(--jira-textLight) / <alpha-value>)",
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
          greenBg: "rgb(var(--jira-greenBg) / <alpha-value>)",
          yellow: "#FFAB00",
          yellowBg: "rgb(var(--jira-yellowBg) / <alpha-value>)",
          red: "#DE350B",
          redBg: "rgb(var(--jira-redBg) / <alpha-value>)",
          orange: "#FF8B00",
          orangeBg: "rgb(var(--jira-orangeBg) / <alpha-value>)",
          purple: "#6554E0",
          purpleBg: "rgb(var(--jira-purpleBg) / <alpha-value>)",
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
