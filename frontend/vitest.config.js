import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.js'],
    include: ['src/tests/**/*.test.{js,jsx}'],
    // Node v25: child_process.fork + serialization:"advanced" is broken for ESM workers.
    // worker_threads works correctly — use the threads pool instead.
    pool: 'threads',
  },
});
