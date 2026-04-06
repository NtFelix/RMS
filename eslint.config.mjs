import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import typescriptPlugin from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import { globalIgnores } from "eslint/config";

export default [
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
    "**/.next/",
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
  {
    plugins: {
      "@next/next": nextPlugin,
      "react": reactPlugin,
      "react-hooks": reactHooksPlugin,
      "@typescript-eslint": typescriptPlugin,
    },
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "react/no-unescaped-entities": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "prefer-const": "warn",
    },
  },
];
