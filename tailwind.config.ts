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
      };
      addUtilities(newUtilities, ["responsive", "hover"]);
    },
  ],
} satisfies Config

export default config
