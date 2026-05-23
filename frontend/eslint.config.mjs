import { defineConfig, globalIgnores } from 'eslint/config'
import nextPlugin from 'eslint-config-next'

// Modern ESLint 9 flat config for Next.js 16
const eslintConfig = defineConfig([
  // Global ignores
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'node_modules/**',
  ]),
  // Next.js core web vitals and TypeScript configs
  ...nextPlugin,
  // Test files - more relaxed rules
  {
    name: 'project/tests',
    files: ['**/__tests__/**/*.{ts,tsx,js}', '**/*.test.{ts,tsx,js}', '**/*.spec.{ts,tsx,js}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
])

export default eslintConfig
