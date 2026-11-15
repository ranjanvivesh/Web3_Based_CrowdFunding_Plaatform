/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        epilogue: ['Epilogue', 'sans-serif'],
        display: ['Fraunces', 'serif'],
        body: ['Nunito Sans', 'sans-serif'],
      },
      boxShadow: {
        cozy: '0 18px 45px rgba(43, 35, 32, 0.12)',
      },
    },
  },
  plugins: [],
};
