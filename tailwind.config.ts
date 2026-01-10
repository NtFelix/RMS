import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
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
        success: { // Added success
          DEFAULT: "#22c55e", // green-500
          foreground: "#ffffff", // white
        },
        // Custom dark mode colors
        "btn-bg": "hsl(var(--btn-bg))",
        "btn-hover": "hsl(var(--btn-hover))",
        "text-disabled": "hsl(var(--text-disabled))",
        "input-placeholder": "hsl(var(--input-placeholder))",
        "main-container": "hsl(var(--main-container))",
        // Sidebar styling
        "sidebar-container": "hsl(var(--background))",
        "sidebar-header": "hsl(var(--background))",
        "sidebar-footer": "hsl(var(--background))",
        // Header styling
        "header-container": "hsl(var(--background))",
        // Enhanced hover styles
        "table-row-hover": "hsl(var(--primary) / 0.1)",
        "btn-outline-hover": "hsl(var(--primary) / 0.15)",
        "btn-ghost-hover": "hsl(var(--primary) / 0.12)",
        // Context menu styles
        "context-menu-item": "hsl(var(--primary) / 0.15)",
        "context-menu-subtrigger": "hsl(var(--primary) / 0.15)",
        "context-menu-checkbox": "hsl(var(--primary) / 0.15)",
        "context-menu-radio": "hsl(var(--primary) / 0.15)",
        "modal-close-hover": "hsl(var(--primary) / 0.15)",
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
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 0.25rem)",
        sm: "calc(var(--radius) - 0.5rem)",
        xl: "calc(var(--radius) + 0.25rem)",
        "2xl": "calc(var(--radius) + 0.5rem)",
        "3xl": "calc(var(--radius) + 0.75rem)",
        "4xl": "calc(var(--radius) + 1.0rem)",
        // Pill shapes for interactive elements
        pill: "9999px",
        // Nested element radius following the formula: Outer radius = Inner radius + Padding
        "nested-sm": "calc(var(--radius) - 0.5rem)", // For 8px padding
        "nested-md": "calc(var(--radius) - 0.375rem)", // For 6px padding  
        "nested-lg": "calc(var(--radius) - 0.25rem)", // For 4px padding
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
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { transform: "scale(0.95)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-2px)" },
        },
        "gradient-x": {
          "0%, 100%": { "background-position": "0% 50%" },
          "50%": { "background-position": "100% 50%" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "33%": { transform: "translateY(-10px) rotate(2deg)" },
          "66%": { transform: "translateY(5px) rotate(-1deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "bounce-subtle": "bounce-subtle 0.6s ease-in-out",
        "gradient-x": "gradient-x 15s ease infinite",
        "float": "float 6s ease-in-out infinite",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function ({ addUtilities }: { addUtilities: any }) {
      const newUtilities = {
        ".glass": {
          "background-color": "rgba(255, 255, 255, 0.3)",
          "backdrop-filter": "blur(8px) saturate(150%)",
          "-webkit-backdrop-filter": "blur(8px) saturate(150%)",
          "border": "1px solid rgba(255, 255, 255, 0.2)",
        },
        ".dark .glass": {
          "background-color": "rgba(17, 24, 39, 0.4)",
          "backdrop-filter": "blur(8px) saturate(150%)",
          "-webkit-backdrop-filter": "blur(8px) saturate(150%)",
          "border": "1px solid rgba(55, 65, 81, 0.3)",
        },
        ".line-clamp-1": {
          "overflow": "hidden",
          "display": "-webkit-box",
          "-webkit-box-orient": "vertical",
          "-webkit-line-clamp": "1",
        },
        ".line-clamp-2": {
          "overflow": "hidden",
          "display": "-webkit-box",
          "-webkit-box-orient": "vertical",
          "-webkit-line-clamp": "2",
        },
        ".interactive-element": {
          "transition": "all 0.2s ease-out",
          "&:hover": {
            "transform": "scale(1.02)",
            "box-shadow": "0 4px 12px rgba(0, 0, 0, 0.1)",
          },
          "&:active": {
            "transform": "scale(0.98)",
          },
        },
        ".card-hover": {
          "transition": "all 0.3s ease-out",
          "&:hover": {
            "transform": "translateY(-2px)",
            "box-shadow": "0 8px 25px rgba(0, 0, 0, 0.1)",
          },
        },
      };
      addUtilities(newUtilities, ["responsive", "hover"]);
    },
  ],
} satisfies Config

export default config
