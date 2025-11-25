import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [react()],
  build: {
    manifest: true,
    outDir: 'dist',
    rollupOptions: {
      input: {
        // Only pages that need hydration
        home: resolve(__dirname, 'src/pages/Home.entry.tsx'),
        about: resolve(__dirname, 'src/pages/About.entry.tsx'),
        // SSR-only CSS (no JS output)
        'docs-styles': resolve(__dirname, 'src/pages/Docs.css'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/styles-[hash].[ext]',
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
    cssCodeSplit: true,
    minify: 'esbuild',
    sourcemap: false,
  },
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  resolve: {
    conditions: ['bun', 'import', 'module', 'browser', 'default'],
  },
  ssr: {
    external: ['react', 'react-dom', 'react-dom/server', 'react/jsx-runtime'],
    noExternal: [],
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
