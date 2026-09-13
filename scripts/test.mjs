import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Tests require Node 22.18+ or Node 24 for TypeScript support.');
const files = readdirSync('tests').filter(file => /\.test\.(ts|mjs)$/.test(file)).sort().map(file => `tests/${file}`);
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
