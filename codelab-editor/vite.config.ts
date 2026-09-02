import {defineConfig} from 'vite';
import {viteStaticCopy} from 'vite-plugin-static-copy';

export default defineConfig({
  root: 'src',
  plugins: [
    viteStaticCopy({
      targets: [
        {src: 'assets', dest: '.'},
        {src: '../node_modules/monaco-editor/min', dest: 'assets/monaco'},
      ],
    }),
  ],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {host: '127.0.0.1'},
});
