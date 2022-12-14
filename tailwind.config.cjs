/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.tsx", "./src/**/*.tsx"],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
}
