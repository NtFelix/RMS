import { defineConfig, globalIgnores } from "eslint/config";
import eslintNextPlugin from "@next/eslint-plugin-next";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactPlugin from "eslint-plugin-react";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";

const eslintConfig = defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    plugins: {
      "@next/next": eslintNextPlugin,
      "@typescript-eslint": tsPlugin,
      react: reactPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
        ...eslintNextPlugin.configs.recommended.rules,
        ...eslintNextPlugin.configs["core-web-vitals"].rules,
        "@typescript-eslint/no-unused-vars": "warn",
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/no-empty-object-type": "warn",
        "react/no-unescaped-entities": "warn",
        "@typescript-eslint/no-require-imports": "warn",
        "prefer-const": "warn",
    },
  },
  globalIgnores([
    "**/.next/",
    "**/out/",
    "**/build/",
    "**/dist/",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
    "**/*.spec.tsx",
    "**/node_modules/",
    "**/.env*",
    "!**/.env.example",
    "**/*.d.ts",
    "**/.vscode/",
    "**/.idea/",
    "**/.DS_Store",
    "**/.DS_Store?",
    "**/._*",
    "**/.Spotlight-V100",
    "**/.Trashes",
    "**/ehthumbs.db",
    "**/Thumbs.db",
  ]),
]);

export default eslintConfig;
