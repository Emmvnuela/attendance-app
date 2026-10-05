/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        board: '#1E3B34',   // chalkboard green: navigation, bars
        ink: '#15211D',     // text
        paper: '#F5F6F3',   // page
        line: '#D8DDD7',    // rules and tracks
        sun: '#E9B300',     // this month / emphasis
        moss: '#3E7B5F',    // healthy
        brick: '#B8402B',   // problems
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
