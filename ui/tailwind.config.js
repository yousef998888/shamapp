/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      borderRadius: {
        lg: "0.625rem", // var(--radius)
        md: "0.5rem",   // calc(var(--radius) - 2px)
        sm: "0.25rem",  // calc(var(--radius) - 4px)
      },
      colors: {
        border: "#ebebeb",
        input: "#ebebeb",
        ring: "#b5b5b5",
        background: "#ffffff",
        foreground: "#242424",
        primary: {
          DEFAULT: "#2a3cff",
          foreground: "#fbfbfb",
        },
        secondary: {
          DEFAULT: "#f7f7f7",
          foreground: "#343434",
        },
        destructive: {
          DEFAULT: "#e74c3c",
          foreground: "#e74c3c",
        },
        muted: {
          DEFAULT: "#f7f7f7",
          foreground: "#8e8e8e",
        },
        accent: {
          DEFAULT: "#f7f7f7",
          foreground: "#343434",
        },
        popover: {
          DEFAULT: "#ffffff",
          foreground: "#242424",
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "#242424",
        },
        chart: {
          '1': "#e67e22",
          '2': "#1abc9c",
          '3': "#3498db",
          '4': "#f1c40f",
          '5': "#e67e22",
        },
      },
    },
  },
  plugins: [
    // Your other plugins
  ],
}