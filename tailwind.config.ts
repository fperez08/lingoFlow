import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#006071",
        "on-primary": "#ffffff",
        "primary-container": "#007b8f",
        "on-primary-container": "#e3f9ff",
        "primary-fixed": "#aaedff",
        "primary-fixed-dim": "#7ad3e9",
        "on-primary-fixed": "#001f26",
        "on-primary-fixed-variant": "#004e5c",
        "inverse-primary": "#7ad3e9",
        "surface-tint": "#006879",

        "secondary": "#516164",
        "on-secondary": "#ffffff",
        "secondary-container": "#d4e6e9",
        "on-secondary-container": "#57676a",
        "secondary-fixed": "#d4e6e9",
        "secondary-fixed-dim": "#b9cacd",
        "on-secondary-fixed": "#0e1e21",
        "on-secondary-fixed-variant": "#3a494c",

        "tertiary": "#874700",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#ab5c00",
        "on-tertiary-container": "#fff3ec",
        "tertiary-fixed": "#ffdcc3",
        "tertiary-fixed-dim": "#ffb77d",
        "on-tertiary-fixed": "#2f1500",
        "on-tertiary-fixed-variant": "#6e3900",

        "surface": "#f7f9fb",
        "surface-bright": "#f7f9fb",
        "surface-dim": "#d8dadc",
        "surface-variant": "#e0e3e5",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f2f4f6",
        "surface-container": "#eceef0",
        "surface-container-high": "#e6e8ea",
        "surface-container-highest": "#e0e3e5",

        "on-surface": "#191c1e",
        "on-surface-variant": "#3e484b",
        "inverse-surface": "#2d3133",
        "inverse-on-surface": "#eff1f3",

        "background": "#f7f9fb",
        "on-background": "#191c1e",

        "outline": "#6e797c",
        "outline-variant": "#bec8cc",

        "error": "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "1rem",
        xl: "1.5rem",
        full: "9999px",
      },
      fontFamily: {
        headline: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"],
        label: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
