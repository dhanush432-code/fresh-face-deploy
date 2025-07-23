// eslint.config.mjs
import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';

export default tseslint.config(
  // 1. The core recommended configurations for TypeScript.
  // This automatically sets up the parser and recommended rules.
  // THIS IS THE MAIN FIX.
  ...tseslint.configs.recommended,

  // 2. Your original Next.js configuration.
  // We place it after the TypeScript config to ensure it can override
  // or add rules as needed.
  {
    files: ['**/*.{js,mjs,cjs,jsx,mjs,ts,tsx,mts}'],
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      // Load Next.js's recommended rules
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,

      // Optional: You can override or add your own rules here.
      // For example, to allow the `any` type (often useful during development):
      '@typescript-eslint/no-explicit-any': 'off',
      // Or to warn about unused variables instead of erroring:
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  }
);