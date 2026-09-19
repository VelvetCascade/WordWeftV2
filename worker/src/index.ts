/**
 * WordWeft Founding Writer — Secure R2 Upload Worker
 *
 * Routes:
 *   PUT  /upload/:applicationId       — Upload a chapter file to R2
 *   GET  /download/:applicationId/:fn — Download a chapter file from R2
 *   GET  /health                       — Health check
 *
 * Security:
 *   - R2 accessed via binding (zero API keys)
 *   - Every request authenticated with HMAC-SHA256 signed tokens
 *   - CORS restricted to whitelisted origins
 *   - File validation: size, type, magic bytes
 */

interface Env {
  CHAPTERS_BUCKET: R2Bucket;
  UPLOAD_SIGNING_SECRET: string;
  ALLOWED_ORIGINS: string;
}

interface TokenPayload {
  type: 'upload' | 'download' | 'chapter-image-upload';
  appId?: string;
  bookId?: string;
  fileName?: string;
  maxSize?: number;
  r2Key?: string;
  exp: number;
}

// ── Crypto helpers ──────────────────────────────────────────────────

async function hmacSign(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return base64UrlEncode(new Uint8Array(sig));
}

async function hmacVerify(data: string, signature: string, secret: string): Promise<boolean> {
  const expected = await hmacSign(data, secret);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

function base64UrlEncode(bytes: Uint8Array): string {
  const bin = Array.from(bytes, b => String.fromCharCode(b)).join('');
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4;
  if (pad) s += '===='.slice(pad);
  return atob(s);
}

// ── Token validation ────────────────────────────────────────────────

async function validateToken(
  token: string, secret: string, expectedType: 'upload' | 'download' | 'chapter-image-upload',
): Promise<TokenPayload> {
  const parts = token.split('.');
  if (parts.length !== 2) throw new Error('Invalid token format');
  const [payloadB64, signatureB64] = parts;

  if (!(await hmacVerify(payloadB64, signatureB64, secret))) {
    throw new Error('Invalid token signature');
  }

  const payload: TokenPayload = JSON.parse(base64UrlDecode(payloadB64));
  if (payload.type !== expectedType) throw new Error('Invalid token type');
  if (expectedType === 'chapter-image-upload') {
    if (!payload.bookId) throw new Error('Missing book ID');
  } else {
    if (!payload.appId) throw new Error('Missing application ID');
  }
  if (payload.exp * 1000 < Date.now()) throw new Error('Token expired');
  return payload;
}

// ── File validation ─────────────────────────────────────────────────

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_EXTENSIONS: ReadonlySet<string> = new Set(['.pdf', '.docx', '.txt']);
const ALLOWED_IMAGE_EXTENSIONS: ReadonlySet<string> = new Set(['.webp', '.jpg', '.jpeg', '.png', '.gif']);

const MAGIC_BYTES: Record<string, readonly number[]> = {
  '.pdf': [0x25, 0x50, 0x44, 0x46, 0x2d],   // %PDF-
  '.docx': [0x50, 0x4b, 0x03, 0x04],         // PK\x03\x04
};

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 200);
}

function getExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.substring(dot).toLowerCase() : '';
}

function validateFile(buf: ArrayBuffer, fileName: string, maxSize: number): void {
  if (buf.byteLength === 0) throw new Error('File is empty');
  if (buf.byteLength > maxSize) {
    throw new Error(`File exceeds the ${Math.round(maxSize / 1024 / 1024)} MB limit`);
  }
  const ext = getExtension(fileName);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error('File type not allowed. Accepted: PDF, DOCX, TXT');
  }
  const expected = MAGIC_BYTES[ext];
  if (expected) {
    const header = new Uint8Array(buf.slice(0, expected.length));
    for (let i = 0; i < expected.length; i++) {
      if (header[i] !== expected[i]) {
        throw new Error('File content does not match its extension');
      }
    }
  }
}

function validateImageFile(buf: ArrayBuffer, fileName: string, maxSize: number): string {
  if (buf.byteLength === 0) throw new Error('Image file is empty');
  if (buf.byteLength > maxSize) {
    throw new Error(`Image exceeds the ${Math.round(maxSize / 1024 / 1024)} MB limit`);
  }
  const ext = getExtension(fileName);
  if (ext === '.svg') {
    throw new Error('SVG images are not permitted for security reasons');
  }
  if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    throw new Error('Image format not supported. Allowed: WebP, JPEG, PNG, GIF');
  }

  const bytes = new Uint8Array(buf.slice(0, 16));
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  // GIF: GIF8
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38
  ) {
    return 'image/gif';
  }
  // WebP: RIFF....WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  throw new Error('Image content does not match allowed image signatures (JPEG, PNG, WebP, GIF)');
}

// ── CORS ────────────────────────────────────────────────────────────

function corsHeaders(origin: string, env: Env): Record<string, string> {
  const allowed = env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
  if (!allowed.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-File-Name',
    'Access-Control-Max-Age': '86400',
  };
}

function json(body: object, status: number, origin: string, env: Env): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin, env) },
  });
}

// ── Route: PUT /upload/:applicationId ───────────────────────────────

async function handleUpload(
  req: Request, appId: string, env: Env, origin: string,
): Promise<Response> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return json({ error: 'Missing authorization token' }, 401, origin, env);
  }

  let payload: TokenPayload;
  try {
    payload = await validateToken(auth.slice(7), env.UPLOAD_SIGNING_SECRET, 'upload');
  } catch {
    return json({ error: 'Invalid or expired upload token' }, 401, origin, env);
  }

  if (payload.appId !== appId) {
    return json({ error: 'Token does not match this application' }, 403, origin, env);
  }

  const fileName = req.headers.get('X-File-Name');
  if (!fileName) {
    return json({ error: 'Missing X-File-Name header' }, 400, origin, env);
  }
  const sanitized = sanitizeFilename(fileName);
  if (payload.fileName && sanitizeFilename(payload.fileName) !== sanitized) {
    return json({ error: 'Filename does not match token' }, 403, origin, env);
  }

  const buf = await req.arrayBuffer();
  try {
    validateFile(buf, fileName, payload.maxSize || MAX_FILE_SIZE);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'File validation failed' }, 400, origin, env);
  }

  const r2Key = `founding-writers/${appId}/${sanitized}`;
  await env.CHAPTERS_BUCKET.put(r2Key, buf, {
    httpMetadata: {
      contentType: req.headers.get('Content-Type') || 'application/octet-stream',
    },
    customMetadata: {
      applicationId: appId,
      originalFileName: fileName,
      uploadedAt: new Date().toISOString(),
    },
  });

  return json({ success: true, r2Key }, 200, origin, env);
}

// ── Route: GET /download/:applicationId/:filename ───────────────────

async function handleDownload(
  req: Request, appId: string, filename: string, env: Env, origin: string,
): Promise<Response> {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) {
    return json({ error: 'Missing download token' }, 401, origin, env);
  }

  let payload: TokenPayload;
  try {
    payload = await validateToken(token, env.UPLOAD_SIGNING_SECRET, 'download');
  } catch {
    return json({ error: 'Invalid or expired download token' }, 401, origin, env);
  }

  if (payload.appId !== appId) {
    return json({ error: 'Token does not match this application' }, 403, origin, env);
  }

  const r2Key = payload.r2Key || `founding-writers/${appId}/${filename}`;
  const obj = await env.CHAPTERS_BUCKET.get(r2Key);
  if (!obj) {
    return json({ error: 'File not found' }, 404, origin, env);
  }

  return new Response(obj.body, {
    status: 200,
    headers: {
      'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${sanitizeFilename(filename)}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      ...corsHeaders(origin, env),
    },
  });
}

// ── Route: PUT /upload/chapter-image/:bookId/:filename ──────────────

async function handleChapterImageUpload(
  req: Request, bookId: string, filename: string, env: Env, origin: string,
): Promise<Response> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return json({ error: 'Missing authorization token' }, 401, origin, env);
  }

  let payload: TokenPayload;
  try {
    payload = await validateToken(auth.slice(7), env.UPLOAD_SIGNING_SECRET, 'chapter-image-upload');
  } catch {
    return json({ error: 'Invalid or expired upload token' }, 401, origin, env);
  }

  if (payload.bookId !== bookId) {
    return json({ error: 'Token does not match this story' }, 403, origin, env);
  }

  const sanitized = sanitizeFilename(filename);
  if (!payload.fileName || sanitizeFilename(payload.fileName) !== sanitized) {
    return json({ error: 'Filename does not match token' }, 403, origin, env);
  }
  const buf = await req.arrayBuffer();
  let contentType = 'image/webp';
  try {
    contentType = validateImageFile(buf, filename, payload.maxSize || MAX_IMAGE_SIZE);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Image validation failed' }, 400, origin, env);
  }

  const r2Key = `chapter-images/${bookId}/${sanitized}`;
  await env.CHAPTERS_BUCKET.put(r2Key, buf, {
    httpMetadata: {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
    },
    customMetadata: {
      bookId,
      originalFileName: filename,
      uploadedAt: new Date().toISOString(),
    },
  });

  return json({
    success: true,
    r2Key,
    path: `/chapter-images/${bookId}/${sanitized}`,
  }, 200, origin, env);
}

// ── Route: GET /chapter-images/:bookId/:filename ────────────────────

async function handleChapterImageServe(
  bookId: string, filename: string, env: Env, origin: string,
): Promise<Response> {
  const sanitized = sanitizeFilename(filename);
  const r2Key = `chapter-images/${bookId}/${sanitized}`;
  const obj = await env.CHAPTERS_BUCKET.get(r2Key);
  if (!obj) {
    return json({ error: 'Image not found' }, 404, origin, env);
  }

  return new Response(obj.body, {
    status: 200,
    headers: {
      'Content-Type': obj.httpMetadata?.contentType || 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

// ── Main entry ──────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') || '';
    const { pathname } = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    }

    // PUT /upload/:applicationId
    const uploadMatch = pathname.match(/^\/upload\/([a-zA-Z0-9]+)$/);
    if (uploadMatch && request.method === 'PUT') {
      return handleUpload(request, uploadMatch[1], env, origin);
    }

    // GET /download/:applicationId/:filename
    const downloadMatch = pathname.match(/^\/download\/([a-zA-Z0-9]+)\/(.+)$/);
    if (downloadMatch && request.method === 'GET') {
      return handleDownload(request, downloadMatch[1], decodeURIComponent(downloadMatch[2]), env, origin);
    }

    // PUT /upload/chapter-image/:bookId/:filename
    const chapterImageUploadMatch = pathname.match(/^\/upload\/chapter-image\/([a-zA-Z0-9_-]+)\/(.+)$/);
    if (chapterImageUploadMatch && request.method === 'PUT') {
      return handleChapterImageUpload(request, chapterImageUploadMatch[1], decodeURIComponent(chapterImageUploadMatch[2]), env, origin);
    }

    // GET /chapter-images/:bookId/:filename
    const chapterImageServeMatch = pathname.match(/^\/chapter-images\/([a-zA-Z0-9_-]+)\/(.+)$/);
    if (chapterImageServeMatch && request.method === 'GET') {
      return handleChapterImageServe(chapterImageServeMatch[1], decodeURIComponent(chapterImageServeMatch[2]), env, origin);
    }

    // Health check
    if (pathname === '/health' && request.method === 'GET') {
      return json({ status: 'ok' }, 200, origin, env);
    }

    return json({ error: 'Not found' }, 404, origin, env);
  },
};
