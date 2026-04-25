import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        secondary: "var(--secondary)",
        accent: "var(--accent)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        border: "var(--border)",
        muted: "var(--muted)",
        'rv-black': "#222222",
        'rv-lime': "#CCEB58",
        'rv-lime-light': "#EDF8C3",
        'rv-white': "#FFFFFF",
      },
      fontFamily: {
        sans: ["'Reddit Sans'", "system-ui", "sans-serif"],
        mono: ["'Reddit Sans Mono'", "monospace"],
      },
      backgroundImage: {
        'rv-gradient': 'linear-gradient(135deg, #CCEB58, #EDF8C3)',
      },
      boxShadow: {
        'rv': '0 4px 24px rgba(204, 235, 88, 0.15)',
      },
    },
  },
  plugins: [],
} satisfies Config;
