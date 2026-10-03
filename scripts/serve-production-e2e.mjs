import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import handler from '../.vercel/output/functions/render.func/handler.mjs';
import { localPreviewApiBase } from './local-preview-config.mjs';

// Test-only proxy. Production serves the Vercel function directly.
const config = JSON.parse(await readFile('.vercel/output/functions/render.func/build-config.json', 'utf8'));
const apiBase = localPreviewApiBase(config, process.env.SEO_API_BASE_URL);
const root=resolve('.vercel/output/static');
const types={'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.txt':'text/plain','.json':'application/json'};
http.createServer(async(req,res)=>{
 try {
  const path=new URL(req.url,'http://localhost').pathname;
  if(path.startsWith('/api/')) {
   const body=['GET','HEAD'].includes(req.method)?undefined:await new Promise((done,fail)=>{const chunks=[];req.on('data',c=>chunks.push(c));req.on('end',()=>done(Buffer.concat(chunks)));req.on('error',fail);});
   const headers={...req.headers};delete headers.host;delete headers['content-length'];
   const upstream=await fetch(apiBase+req.url.slice('/api'.length),{method:req.method,headers,body});
   res.writeHead(upstream.status,Object.fromEntries(upstream.headers));
   if(upstream.body)await pipeline(Readable.fromWeb(upstream.body),res);else res.end();return;
  }
  const file=resolve(root,'.'+decodeURIComponent(path));
  if(file.startsWith(root+'/')){const info=await stat(file).catch(()=>null);if(info?.isFile()){res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(await readFile(file));return;}}
  await handler(req,res);
 }catch{if(!res.headersSent)res.writeHead(500);res.end('Local preview error');}
}).listen(4173,'127.0.0.1',()=>console.log('Local production E2E preview: http://127.0.0.1:4173'));
