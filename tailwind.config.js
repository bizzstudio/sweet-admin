// tailwind.config.js
const defaultTheme = require("tailwindcss/defaultTheme");

const config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        mainColor: {
          superLight: '#f7eac8',
          light: '#3fac3f',
          DEFAULT: '#008000',
          dark: '#006300',
        },
      },
      fontFamily: {
        sans: ["Assistant", "sans-serif"],
        serif: ["Inter", ...defaultTheme.fontFamily.sans],
      },
      boxShadow: {
        around: "0 4px 8px 4px rgba(0, 0, 0, 0.05)",
        bottom:
          "0 5px 6px -7px rgba(0, 0, 0, 0.6), 0 2px 4px -5px rgba(0, 0, 0, 0.06)",
        'up-sm': '0 -1px 2px 0 rgba(0, 0, 0, 0.05)',
        'up': '0 -1px 3px 0 rgba(0, 0, 0, 0.1), 0 -1px 2px -1px rgba(0, 0, 0, 0.1)',
        'up-md': '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -2px rgba(0, 0, 0, 0.1)',
        'up-lg': '0 -10px 15px -3px rgba(0, 0, 0, 0.1), 0 -4px 6px -4px rgba(0, 0, 0, 0.1)',
        'up-xl': '0 -20px 25px -5px rgba(0, 0, 0, 0.1), 0 -8px 10px -6px rgba(0, 0, 0, 0.1)',
        'up-2xl': '0 -25px 50px -12px rgba(0, 0, 0, 0.25)',
        'up-inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
      },
      height: {
        28: "100px",
        sm: "350px",
        md: "400px",
        330: "330px",
        440: "440px",
        lg: "500px",
        xl: "600px",
      },
      width: {
        80: "80px",
        100: "100px",
        200: "200px",
        300: "300px",
        400: "400px",
      },
      padding: {
        2.5: "10px",
      },
      screens: {
        "2xl": "1440px",
        xl: "1280px",
        lg: "1024px",
        ipad: { min: "960px", max: "1023px" },
        md: "768px",
        sm: "640px",
        xs: "420px",
        'xss': "320px",
      },
      borderRadius: {
        '4xl': '30px',
      },
      inset: {
        "-1": "-1rem",
        "-2": "-2rem",
        "-3": "-3rem",
        "-4": "-4rem",
        "-5": "-5rem",
        "-6": "-6rem",
        "-7": "-7rem",
        "-8": "-8rem",
        "-9": "-9rem",
        "-10": "-10rem",
        1: "1rem",
        2: "2rem",
        3: "3rem",
        4: "4rem",
        5: "5rem",
        6: "6rem",
        7: "7rem",
        8: "8rem",
        9: "9rem",
        10: "10rem",
      },
    },
  },
  variants: {
    display: ["group-hover"],
  },
  plugins: [
    // require("tailwind-scrollbar-hide"),
    //require('tailwind-scrollbar')
    function ({ addBase, theme }) {
      addBase({
        ':root': {
          '--main-color-super-light': theme('colors.mainColor.superLight'),
          '--main-color-light': theme('colors.mainColor.light'),
          '--main-color': theme('colors.mainColor.DEFAULT'),
          '--main-color-dark': theme('colors.mainColor.dark'),
        },
      });
    },
  ],
};

module.exports = {
  ...config,
};