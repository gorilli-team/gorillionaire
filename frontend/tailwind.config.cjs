const flowbitePlugin = require('flowbite/plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // enables dark mode via class
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "node_modules/flowbite-react/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [flowbitePlugin],
};


// module.exports = {
//   darkMode: 'class', // REQUIRED: enable dark mode via class
//   content: [
//     "./src/**/*.{js,ts,jsx,tsx,mdx}",
//   ],
//   plugins: [require('flowbite/plugin')],
// }