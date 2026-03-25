import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

const appRoot = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(appRoot, '../..');

export default defineConfig({
  root: appRoot,
  envDir: workspaceRoot,
  plugins: [
    react({ fastRefresh: false }),
    federation({
      name: 'progressApp',
      filename: 'remoteEntry.js',
      exposes: {
        './mount': resolve(appRoot, 'src/mount.jsx'),
      },
    }),
  ],
  server: {
    cors: true,
    port: 5175,
    strictPort: true,
    fs: {
      allow: [workspaceRoot],
    },
  },
  preview: {
    port: 5175,
    strictPort: true,
  },
  build: {
    target: 'esnext',
    minify: false,
    modulePreload: false,
    cssCodeSplit: false,
    outDir: resolve(workspaceRoot, 'dist/progress'),
    emptyOutDir: true,
  },
});
