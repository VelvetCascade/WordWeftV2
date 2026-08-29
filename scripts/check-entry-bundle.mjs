import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';

const maximumGzipBytes = 350 * 1024;
const distDirectory = resolve('dist');
const html = await readFile(resolve(distDirectory, 'index.html'), 'utf8');
const entryMatch = html.match(/<script[^>]+src="([^"]+\.js)"/);

if (!entryMatch) {
    throw new Error('Unable to locate the production entry script in dist/index.html.');
}

const entryPath = resolve(distDirectory, entryMatch[1].replace(/^\//, ''));
const entrySource = await readFile(entryPath);
const gzipBytes = gzipSync(entrySource).byteLength;
const gzipKilobytes = gzipBytes / 1024;

console.log(`Initial JavaScript: ${gzipKilobytes.toFixed(2)} kB gzip`);

if (gzipBytes > maximumGzipBytes) {
    console.error(`Initial JavaScript exceeds the ${(maximumGzipBytes / 1024).toFixed(0)} kB gzip budget.`);
    process.exit(1);
}

