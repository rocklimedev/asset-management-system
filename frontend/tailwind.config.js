/** @type {import('tailwindcss').Config} */

/**
 * Every colour resolves to an opaque HSL token defined in src/index.css.
 * Rebranding happens there, not here.
 */
const hsl = (token) => `hsl(var(--${token}))`;

export default {
  darkMode: ["class"],

  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],

  theme: {
    extend: {
      colors: {
        brand: {
          50: hsl("brand-50"),
          100: hsl("brand-100"),
          200: hsl("brand-200"),
          300: hsl("brand-300"),
          400: hsl("brand-400"),
          500: hsl("brand-500"),
          600: hsl("brand-600"),
          700: hsl("brand-700"),
          800: hsl("brand-800"),
          900: hsl("brand-900"),
          950: hsl("brand-950"),
        },

        background: hsl("background"),
        foreground: hsl("foreground"),

        card: {
          DEFAULT: hsl("card"),
          foreground: hsl("card-foreground"),
        },

        popover: {
          DEFAULT: hsl("popover"),
          foreground: hsl("popover-foreground"),
        },

        primary: {
          DEFAULT: hsl("primary"),
          foreground: hsl("primary-foreground"),
          hover: hsl("primary-hover"),
          strong: hsl("primary-strong"),
          muted: hsl("primary-muted"),
          border: hsl("primary-border"),
        },

        secondary: {
          DEFAULT: hsl("secondary"),
          foreground: hsl("secondary-foreground"),
          hover: hsl("secondary-hover"),
        },

        muted: {
          DEFAULT: hsl("muted"),
          foreground: hsl("muted-foreground"),
        },

        accent: {
          DEFAULT: hsl("accent"),
          foreground: hsl("accent-foreground"),
          hover: hsl("accent-hover"),
        },

        success: {
          DEFAULT: hsl("success"),
          foreground: hsl("success-foreground"),
          muted: hsl("success-muted"),
          strong: hsl("success-strong"),
          border: hsl("success-border"),
        },

        warning: {
          DEFAULT: hsl("warning"),
          foreground: hsl("warning-foreground"),
          muted: hsl("warning-muted"),
          strong: hsl("warning-strong"),
          border: hsl("warning-border"),
        },

        destructive: {
          DEFAULT: hsl("destructive"),
          foreground: hsl("destructive-foreground"),
          hover: hsl("destructive-hover"),
          muted: hsl("destructive-muted"),
          strong: hsl("destructive-strong"),
          border: hsl("destructive-border"),
        },

        info: {
          DEFAULT: hsl("info"),
          foreground: hsl("info-foreground"),
          muted: hsl("info-muted"),
          strong: hsl("info-strong"),
          border: hsl("info-border"),
        },

        sidebar: {
          DEFAULT: hsl("sidebar"),
          foreground: hsl("sidebar-foreground"),
          border: hsl("sidebar-border"),
          accent: hsl("sidebar-accent"),
          "accent-foreground": hsl("sidebar-accent-foreground"),
          ring: hsl("sidebar-ring"),
        },

        chart: {
          1: hsl("chart-1"),
          2: hsl("chart-2"),
          3: hsl("chart-3"),
          4: hsl("chart-4"),
          5: hsl("chart-5"),
          6: hsl("chart-6"),
          grid: hsl("chart-grid"),
          axis: hsl("chart-axis"),
        },

        border: hsl("border"),
        input: hsl("input"),
        ring: hsl("ring"),
      },

      backgroundColor: {
        // The one deliberately translucent layer: the modal scrim.
        scrim: "hsl(var(--scrim) / var(--scrim-opacity))",
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
      },

      boxShadow: {
        card: "0 1px 2px 0 hsl(var(--neutral-900) / 0.04), 0 1px 3px 0 hsl(var(--neutral-900) / 0.06)",
        raised:
          "0 1px 3px 0 hsl(var(--neutral-900) / 0.08), 0 4px 12px -2px hsl(var(--neutral-900) / 0.08)",
        overlay:
          "0 8px 24px -4px hsl(var(--neutral-900) / 0.16), 0 2px 8px -2px hsl(var(--neutral-900) / 0.10)",
      },

      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },

      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },

      spacing: {
        "4.5": "1.125rem",
        sidebar: "15rem",
        "sidebar-collapsed": "4.25rem",
        header: "3.5rem",
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
      },

      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },

  plugins: [require("tailwindcss-animate")],
};
