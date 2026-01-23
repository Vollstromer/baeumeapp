
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Für eine eigene Domain auf GitHub Pages nutzen wir den Root-Pfad '/'
export default defineConfig({
  plugins: [react()],
  base: '/', 
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', '@supabase/supabase-js'],
        },
      },
    },
  },
});
