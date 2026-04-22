import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          500: "#5F3BFF",
          600: "#4C2BE8"
        },
        accent: {
          500: "#FF7A18"
        }
      }
    }
  },
  plugins: []
};

export default config;
