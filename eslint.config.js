import globals from "globals";
import importPlugin from 'eslint-plugin-import';
import js from "@eslint/js";
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
    globalIgnores([
        "env/",
        ".venv/",
        "dist/",
        "node_modules/",
    ]),
    {
        files: ["srv/**/*.js"],
        plugins: {
            js,
            importPlugin,
            sonarjs,
            unicorn,
        },
        extends: ["js/recommended"],
        languageOptions: {
            ecmaVersion: 2025,
            globals: {
                ...globals.browser,
            },
            sourceType: "module",
        },
        rules: {
            ...sonarjs.configs.recommended.rules,
            //...unicorn.configs.unopinionated.rules,
            "complexity": ["error", { "max": 15 }],
            "max-params": ["warn", 7],
            "no-array-constructor": "error",
            "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
            "unicorn/escape-case": ["error", "lowercase"],
            "unicorn/number-literal-case": ["error", { "hexadecimalValue": "lowercase" }],
            "unicorn/prefer-at": "error",
            "unicorn/prefer-blob-reading-methods": "error",
            "unicorn/prefer-class-fields": "error",
            "unicorn/prefer-string-replace-all": "error",
        },
    },
]);
