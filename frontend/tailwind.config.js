/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'DM Mono'", "monospace"],
        body: ["'Outfit'", "sans-serif"],
      },
      colors: {
        surface: {
          DEFAULT: "#0d0f14",
          raised: "#141720",
          border: "#1e2330",
          hover: "#1a1f2e",
        },
        accent: {
          green: "#00e5a0",
          greenDim: "#00b87d",
          blue: "#3b82f6",
          amber: "#f59e0b",
          red: "#ef4444",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease forwards",
        "slide-up": "slideUp 0.4s ease forwards",
        pulse2: "pulse2 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: "translateY(12px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        pulse2: { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.5 } },
      },
    },
  },
  plugins: [],
};
