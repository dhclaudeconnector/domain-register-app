import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: false,
    clearMocks: true,
    restoreMocks: true,
    include: ['__tests__/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'lib/**/*.ts', 'services/**/*.ts', 'stores/**/*.ts'],
      exclude: [
        'app/layout.tsx',
        'app/globals.css',
        'components/ui/**',
        '**/*.d.ts',
        '**/node_modules/**',
      ],
    },
  },
});
