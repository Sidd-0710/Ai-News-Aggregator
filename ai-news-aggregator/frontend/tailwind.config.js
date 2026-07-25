module.exports = {
  content: [
    "./public/index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#f7f2e7',
        'paper-dim': '#efe7d4',
        ink: '#141311',
        signal: '#ff4b1f',
        'signal-dim': '#ffe3d5',
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        hard: '4px 4px 0 0 #141311',
        'hard-sm': '2px 2px 0 0 #141311',
        'hard-lg': '8px 8px 0 0 #141311',
        'hard-signal': '4px 4px 0 0 #ff4b1f',
      },
    },
  },
  plugins: [],
}
