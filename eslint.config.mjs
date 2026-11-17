import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // eslint-config-next already registers the jsx-a11y plugin; enable its full strict rule set.
      ...jsxA11y.flatConfigs.strict.rules,
      // Labels are tied to inputs by id; allow text nested a few elements deep.
      "jsx-a11y/label-has-associated-control": ["error", { assert: "htmlFor", depth: 3 }],
      // Scrollable regions and the chat log must be focusable for keyboard scrolling.
      "jsx-a11y/no-noninteractive-tabindex": ["error", { roles: ["tabpanel", "region", "log"] }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      eqeqeq: ["error", "always"],
      // Maintainability budgets: keep units small and readable; CI fails if exceeded.
      complexity: ["error", 10],
      "max-depth": ["error", 3],
      "max-params": ["error", 4],
      "max-nested-callbacks": ["error", 3],
      "max-lines": ["error", { max: 250, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 80, skipBlankLines: true, skipComments: true }],
      "no-nested-ternary": "error",
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
