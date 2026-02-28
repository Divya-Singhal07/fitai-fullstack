/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sky:     "#4FC3F7",
        ocean:   "#0288D1",
        deep:    "#01579B",
        midnight:"#0A1929",
        accent:  "#00E5FF",
        fitpink: "#FF6B9D",
        fitgreen:"#69F0AE",
        fityellow:"#FFD740",
      },
      fontFamily: {
        nunito: ["Nunito", "sans-serif"],
        poppins:["Poppins", "sans-serif"],
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
}
