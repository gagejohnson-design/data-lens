import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-flow': ['reactflow', '@dagrejs/dagre'],
          'vendor-charts': ['axios'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
