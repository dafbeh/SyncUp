/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/**/*.{html,js}'],
  theme: {
    extend: {
      width: {
        '1100': '1100px',
        '1/8': '12.5%',
      },
      screens: {
        '4xl': '2550px',
        '3xl': '1900px',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
}
