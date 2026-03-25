import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

const appRoot = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(appRoot, '../..');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, workspaceRoot, '');

  return {
    root: appRoot,
    envDir: workspaceRoot,
    plugins: [
      react(),
      federation({
        name: 'shell',
        remotes: {
          authApp:
            env.VITE_AUTH_REMOTE_URL ?? 'http://localhost:5174/assets/remoteEntry.js',
          progressApp:
            env.VITE_PROGRESS_REMOTE_URL ??
            'http://localhost:5175/assets/remoteEntry.js',
        },
      }),
    ],
    server: {
      port: 5173,
      strictPort: true,
      fs: {
        allow: [workspaceRoot],
      },
    },
    preview: {
      port: 4173,
      strictPort: true,
    },
    build: {
      target: 'esnext',
      modulePreload: false,
      cssCodeSplit: false,
      outDir: resolve(workspaceRoot, 'dist/host'),
      emptyOutDir: true,
    },
  };
});
