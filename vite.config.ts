import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'url';
import { execFileSync } from 'node:child_process';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    let revision = process.env.VERCEL_GIT_COMMIT_SHA || 'local';
    try { if (revision === 'local') revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { /* Source archives can build without Git. */ }
    return {
      define: { 'import.meta.env.WORDWEFT_BUILD_ID': JSON.stringify(`${revision.slice(0, 12)}-${Date.now().toString(36)}`) },
      build: {
        modulePreload: {
          // WebKit retains failed modulepreload entries across reloads, including
          // shared dependencies. Native imports can retry after a document reload.
          // Vite still appends the route's CSS dependencies to this result.
          resolveDependencies: (_filename, dependencies, { hostType }) => hostType === 'js' ? [] : dependencies,
        },
      },
      optimizeDeps: { entries: ['index.html'] },
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://127.0.0.1:8080',
            changeOrigin: true,
            bypass(req) {
              // The frontend API client lives at /api/client.ts in development.
              // Let Vite serve source modules instead of forwarding them to Spring.
              if (/^\/api\/.*\.[cm]?[jt]sx?(?:\?|$)/i.test(req.url || '')) {
                return req.url;
              }
              return undefined;
            },
          },
        },
      },
      plugins: [react()],
      resolve: {
        alias: {
          // Fix: `__dirname` is not available in ES modules.
          // Use `import.meta.url` to create an absolute path for the alias, which is the modern standard.
          '@': fileURLToPath(new URL('.', import.meta.url)),
        }
      }
    };
});
