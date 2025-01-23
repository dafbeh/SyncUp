/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/**/*.{html,js}'],
  theme: {
    extend: {
      width: {
        '1100': '1100px',
        '1/8': '12.5%',
        '8/10': '80%',
      },
      height: {
        '9/10': '90%'
      },
      screens: {
        '4xl': '2550px',
        '3xl': '1900px',
      },
      fontFamily: {
        opensans: ['Open Sans']
      }
    },
  },
  darkMode: 'class',
  plugins: [],
}
