/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        paper: '#F6F4EF',
        surface: '#FFFFFF',
        line: '#E4DFD5',
        ink: { DEFAULT: '#1E1C18', 2: '#5C564C' },
        muted: '#857E73',
        clay: { DEFAULT: '#A95D44', soft: '#FAF2EE', border: '#E3CFC6' },
        ida: { DEFAULT: '#4A7196', soft: '#EDF2F7' },
        idb: { DEFAULT: '#A85A6B', soft: '#F6EBEE' },
        success: '#527A63',
        warn: '#A77B3A',
      },
      fontFamily: {
        serif: ['Songti SC', 'Georgia', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
};


