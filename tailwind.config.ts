/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // BIA Custom Colors
        bia: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
        },
        bio: {
          teal: "#0d9488",
          emerald: "#059669",
          cyan: "#0891b2",
          blue: "#2563eb",
          purple: "#7c3aed",
          pink: "#db2777",
        },
        // ═════════════════════════════════════════════════════════════
        //  QUANTIS BRAND PALETTE (R10) — Lilás / Azul / Roxo / Vinho
        //  + tons amarelados e brancos sofisticados
        // ═════════════════════════════════════════════════════════════
        quantis: {
          // Lilás (primário claro)
          lilac: {
            50:  "#f7f3ff",
            100: "#ede4ff",
            200: "#dccaff",
            300: "#c1a0ff",
            400: "#a878ff",
            500: "#9152f5",
            600: "#7c3ce0",
            700: "#6829b8",
            800: "#532196",
            900: "#3f1976",
          },
          // Roxo (primário escuro / brand)
          purple: {
            50:  "#f5f0fe",
            100: "#e8dcfd",
            200: "#d3b9fb",
            300: "#b48af5",
            400: "#9457ed",
            500: "#7531df",
            600: "#6321c0",
            700: "#511a9c",
            800: "#42177e",
            900: "#321360",
          },
          // Azul (secundário)
          blue: {
            50:  "#eff5ff",
            100: "#dbe7fe",
            200: "#bed4fe",
            300: "#91b6fc",
            400: "#5e8df8",
            500: "#3a66f0",
            600: "#2848e1",
            700: "#2138c4",
            800: "#1f309e",
            900: "#1e2c7e",
          },
          // Vinho (acento / energia)
          wine: {
            50:  "#fdf2f4",
            100: "#fbe6ea",
            200: "#f6cdd6",
            300: "#eea2b3",
            400: "#e16d8a",
            500: "#cd4467",
            600: "#b32850",
            700: "#961f44",
            800: "#7d1c3e",
            900: "#5e1530",
          },
          // Amarelo dourado (highlight sutil)
          gold: {
            50:  "#fffbeb",
            100: "#fef3c7",
            200: "#fde68a",
            300: "#fcd34d",
            400: "#fbbf24",
            500: "#f59e0b",
            600: "#d97706",
            700: "#b45309",
            800: "#92400e",
            900: "#78350f",
          },
          // Off-whites e neutros sofisticados
          cream: {
            50:  "#fefdfb",
            100: "#fcf9f3",
            200: "#f6f0e3",
            300: "#ebe0c8",
            400: "#d9c7a0",
            500: "#bfa779",
            600: "#a08660",
            700: "#7c684a",
            800: "#5a4c37",
            900: "#3f352a",
          },
          // Dark / fundos
          ink: {
            50:  "#f6f5fa",
            100: "#e9e6f3",
            200: "#d2cce4",
            300: "#a89fc5",
            400: "#7a6fa3",
            500: "#594d85",
            600: "#453a6b",
            700: "#372e55",
            800: "#221c3a",
            900: "#150f26",
            950: "#0c0818",
          },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 5px rgba(34, 197, 94, 0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(34, 197, 94, 0.8)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "gradient-x": {
          "0%, 100%": { "background-size": "200% 200%", "background-position": "left center" },
          "50%": { "background-size": "200% 200%", "background-position": "right center" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        "gradient-x": "gradient-x 3s ease infinite",
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(34, 197, 94, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 197, 94, 0.05) 1px, transparent 1px)",
        "bio-gradient": "linear-gradient(135deg, #0d9488 0%, #059669 50%, #22c55e 100%)",
        "dark-gradient": "linear-gradient(135deg, #0a0f0a 0%, #0d1a10 50%, #0a1a14 100%)",
        // Quantis brand gradients (R10)
        "quantis-gradient": "linear-gradient(135deg, #7531df 0%, #9152f5 40%, #3a66f0 100%)",
        "quantis-wine": "linear-gradient(135deg, #961f44 0%, #cd4467 50%, #e16d8a 100%)",
        "quantis-aurora": "linear-gradient(135deg, #511a9c 0%, #7531df 30%, #3a66f0 60%, #fbbf24 100%)",
        "quantis-dark": "linear-gradient(135deg, #0c0818 0%, #150f26 50%, #221c3a 100%)",
        "quantis-grid":
          "linear-gradient(rgba(145, 82, 245, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(145, 82, 245, 0.06) 1px, transparent 1px)",
      },
      fontSize: {
        // Tipografia maior e mais legível (R10)
        "xs-q": ["0.8125rem", { lineHeight: "1.25rem" }],   // 13px
        "sm-q": ["0.9375rem", { lineHeight: "1.4rem" }],    // 15px
        "base-q": ["1.0625rem", { lineHeight: "1.6rem" }],  // 17px
      },
      boxShadow: {
        "quantis-glow": "0 0 30px rgba(145, 82, 245, 0.25), 0 0 60px rgba(58, 102, 240, 0.12)",
        "quantis-glow-wine": "0 0 25px rgba(205, 68, 103, 0.3)",
        "quantis-card": "0 4px 24px -2px rgba(12, 8, 24, 0.4), 0 0 0 1px rgba(145, 82, 245, 0.08)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
