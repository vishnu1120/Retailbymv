import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function removeCrossorigin() {
  return {
    name: 'remove-crossorigin',
    transformIndexHtml(html) {
      return html.replace(/\s*crossorigin/g, '');
    }
  };
}

export default defineConfig({
  plugins: [react(), removeCrossorigin()],
  base: './',  // critical — makes all asset paths relative
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Stable filenames — no hash changes between builds
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  }
})