import { defineConfig } from 'vite';
import { resolve } from 'path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  build: {
    manifest: true,
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/client/entry-client.tsx'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
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
