import { readFileSync } from 'node:fs';
import { buildResponse } from './render.mjs';

const template = readFileSync(new URL('./template.html', import.meta.url), 'utf8');
const staticBodies = JSON.parse(readFileSync(new URL('./static-bodies.json', import.meta.url), 'utf8'));
const buildConfig = JSON.parse(readFileSync(new URL('./build-config.json', import.meta.url), 'utf8'));

export default async function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method || 'GET')) { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end(); }
  const apiBase = (process.env.SEO_API_BASE_URL || buildConfig.apiBase).replace(/\/+$/, '');
  const fetchJson = async path => {
    const response = await fetch(`${apiBase}/public/seo${path}`, { signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json' }, redirect: 'error' });
    if (!response.ok) { const error = new Error('Public content request failed'); error.status = response.status; throw error; }
    return response.json();
  };
  const result = await buildResponse({ url: req.url, host: req.headers.host?.split(':')[0], template, staticBodies, fetchJson, preview: process.env.SEO_NOINDEX === 'true' || process.env.VERCEL_ENV === 'preview' || buildConfig.preview });
  res.writeHead(result.status, result.headers);
  res.end(req.method === 'HEAD' ? '' : result.body);
}
