// Production-equivalent local server for verification, also usable behind another Node host.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import handler from '../.vercel/output/functions/render.func/handler.mjs';
const root = resolve('.vercel/output/static');
const types = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.txt': 'text/plain', '.json': 'application/json' };
http.createServer(async (req, res) => {
    try {
        const file = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
        if (file.startsWith(root + '/') || file.startsWith(root + '\\')) {
            const info = await stat(file).catch(() => null);
            if (info?.isFile()) { res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream'); res.end(await readFile(file)); return; }
        }
        await handler(req, res);
    } catch { res.writeHead(500); res.end('Server error'); }
}).listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log('SEO preview: http://127.0.0.1:' + (process.env.PORT || 4173)));
