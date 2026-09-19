import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'url';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
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
