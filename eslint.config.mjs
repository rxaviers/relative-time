import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-plugin-prettier";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    ignores: ["dist/**"],
    plugins: {
      prettier,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "no-console": "off",
      "no-trailing-spaces": "warn",
      quotes: ["warn", "double"],
      semi: ["warn", "always"],
      "prettier/prettier": "warn",
    },
  },
  {
    files: ["src/**/*.js", "test/**/*.js"],
    languageOptions: {
      sourceType: "module",
    },
  },
  {
    files: ["test/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.mocha,
        expect: "readonly",
      },
    },
  },
  {
    files: ["test/index.js", "getting_started.js"],
    languageOptions: {
      sourceType: "commonjs",
    },
  },
];
