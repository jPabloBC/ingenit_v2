/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        blue1: "#001e40",
        blue2: "#003c80",
        blue3: "#005abf",
        blue4: "#0078ff",
        blue5: "#3393ff",
        blue6: "#66aeff",
        blue7: "#99c9ff",
        blue8: "#cce4ff",
        black: "#000000",
        gray1: "#1a1a1a",
        gray2: "#333333",
        gray3: "#4d4d4d",
        gray4: "#666666",
        gray5: "#808080",
        gray6: "#999999",
        gray7: "#b3b3b3",
        gray8: "#cccccc",
        gray9: "#e6e6e6",
        gray10: "#f2f2f2",
        white: "#ffffff",
      },
      fontFamily: {
        title: ["var(--font-archivo)"],
        body: ["var(--font-sansation)"],
      },
    },
  },
  plugins: [],
};
