import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
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
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "react/no-unescaped-entities": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "prefer-const": "warn",
    },
  }
]);
