import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#050909",
          secondary: "#BF4133",
          accent: "#4B2928",
          background: "#FCFCFC",
          taupe: "#D4C3B3",
          sand: "#AE8D72",
        },
      },
      boxShadow: {
        premium: "0 24px 70px rgba(75, 41, 40, 0.16)",
      },
    },
  },
  plugins: [],
};

export default config;
