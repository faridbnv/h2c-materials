// typescript-eslint, flat config (15-TYPESCRIPT-PLAN section 6.2). TypeScript files only: the old JavaScript has no
// lint today and is a frozen baseline. Type-aware rules read the project through tsconfig.json (strong level).
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/node_modules/**', 'dist/**', 'tests/remake/fixtures/**', 'archive/**', '**/generated/**'] },
  {
    files: ['packages/**/*.ts', 'apps/**/*.ts', 'remake/**/*.ts', 'tests/remake/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'separate-type-imports' }],
      '@typescript-eslint/no-explicit-any': 'error',
      // No @ts-ignore; @ts-expect-error only with a one-line reason, so it fails loudly when no longer needed.
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-expect-error': 'allow-with-description', 'ts-ignore': true, 'ts-nocheck': true, 'ts-check': false, minimumDescriptionLength: 10 }],
    },
  },
);
