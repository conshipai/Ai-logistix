import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

// `next lint` was removed in Next 16, so ESLint is invoked directly.
// eslint-config-next 16 ships flat configs, so no compatibility layer is needed.
const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'legacy/**',
      'coverage/**',
      'next-env.d.ts',
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    files: ['src/app/layout.tsx'],
    rules: {
      // This rule targets the pages router. In the App Router the root layout
      // is exactly where a stylesheet link belongs.
      '@next/next/no-page-custom-font': 'off',
    },
  },
  {
    rules: {
      // Unused arguments are meaningful in server actions, whose signature is
      // fixed by useActionState even when the previous state is not read.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
]

export default config
