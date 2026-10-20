import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

const dist = new URL('../dist/', import.meta.url).pathname;
async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : [relative(dist, path).replaceAll('\\', '/')];
  }));
  return groups.flat();
}

const files = (await filesIn(dist)).filter((file) => file !== 'sw.js' && !file.endsWith('.map'));
const hash = createHash('sha256');
for (const file of files) {
  hash.update(file);
  hash.update(await readFile(join(dist, file)));
}
const buildId = hash.digest('hex').slice(0, 12);
const workerPath = join(dist, 'sw.js');
const worker = await readFile(workerPath, 'utf8');
if (!worker.includes('__PRECACHE_URLS__') || !worker.includes('__BUILD_ID__')) throw new Error('Service worker build placeholders not found');
await writeFile(workerPath, worker.replace('__PRECACHE_URLS__', JSON.stringify(['./', ...files])).replace('__BUILD_ID__', buildId));
console.log(`PWA offline cache prepared with ${files.length + 1} app files.`);
