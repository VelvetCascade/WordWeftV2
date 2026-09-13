import { build, loadEnv } from 'vite';
import { mkdir, readFile, writeFile, cp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { staticPages } from '../seo/content.mjs';
import { documentHtml } from '../seo/render.mjs';
import { metadataFor, parseRoute } from '../seo/metadata.mjs';

const root = process.cwd();
const output = resolve(root, '.vercel/output');
// Only clean the build output owned by this script, never the Vercel project configuration.
if (output !== join(root, '.vercel', 'output')) throw new Error('Unsafe output path');
await rm(output, { recursive: true, force: true });
const functions = join(output, 'functions/render.func');
await mkdir(functions, { recursive: true });
const env = { ...loadEnv('production', root, ''), ...process.env };
const preview = env.VERCEL_ENV === 'preview' || env.SEO_NOINDEX === 'true';
const apiBase = (env.SEO_API_BASE_URL || env.VITE_API_BASE_URL || 'https://wordweftv2.onrender.com/api').replace(/\/$/, '');
if (!/^https?:\/\//.test(apiBase)) throw new Error('SEO_API_BASE_URL must be an absolute HTTP(S) API URL');
if (env.VERCEL_ENV && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(new URL(apiBase).hostname)) throw new Error('Vercel deployments require a reachable backend; set SEO_API_BASE_URL and VITE_API_BASE_URL to the deployed API.');
await build({ configFile: false, ssr: { noExternal: true }, define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiBase), 'import.meta.env.VITE_GOOGLE_CLIENT_ID': '""', 'process.env.NODE_ENV': '"production"' }, build: { ssr: 'seo/static-entry.tsx', outDir: 'dist-ssr', emptyOutDir: true, rollupOptions: { output: { entryFileNames: 'static.mjs' } } } });
const { renderStatic } = await import(pathToFileURL(resolve('dist-ssr/static.mjs')).href);
const template = await readFile('dist/index.html', 'utf8');
if (!template.includes('<!--SEO_HEAD-->') || !template.includes('<!--SEO_BODY-->')) throw new Error('SEO template markers missing');
const bodies = Object.fromEntries(Object.keys(staticPages).map(path => [path, renderStatic(path)]));
await writeFile(join(functions, 'template.html'), template);
await writeFile(join(functions, 'static-bodies.json'), JSON.stringify(bodies));
await writeFile(join(functions, 'build-config.json'), JSON.stringify({ apiBase, preview }));
for (const file of ['handler.mjs', 'render.mjs', 'metadata.mjs', 'content.mjs']) await cp(`seo/${file}`, join(functions, file));
await writeFile(join(functions, 'package.json'), JSON.stringify({ type: 'module' }));
await writeFile(join(functions, '.vc-config.json'), JSON.stringify({ runtime: 'nodejs22.x', handler: 'handler.mjs', launcherType: 'Nodejs', maxDuration: 30, supportsResponseStreaming: false }));
await cp('dist', join(output, 'static'), { recursive: true });
// Route all HTML through the renderer. This also applies noindex to preview domains and gives unknown URLs a 404.
await rm(join(output, 'static/index.html'));
await writeFile(join(output, 'config.json'), JSON.stringify({ version: 3, routes: [
    { src: '/assets/(.*)', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' }, continue: true },
    { handle: 'filesystem' },
    { src: '/.*', dest: '/render' },
] }, null, 2));
// A useful static fallback for non-Vercel distribution; production dynamic SEO requires the included renderer.
await writeFile('dist/index.html', documentHtml(template, metadataFor(parseRoute('/')), bodies['/'], { noindex: preview, persistNoindex: preview }));
console.log(`SEO build: ${Object.keys(bodies).length} complete public pages; dynamic HTML and sitemap function ready.`);
