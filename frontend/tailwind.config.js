/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "sans-serif"]
      },
      colors: {
        brand: {
          green: "#22C55E",
          orange: "#F97316",
          ink: "#16301F"
        }
      },
      boxShadow: {
        soft: "0 20px 50px rgba(22, 48, 31, 0.10)"
      }
    }
  },
  plugins: []
};

