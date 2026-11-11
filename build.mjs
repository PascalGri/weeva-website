import { cp, mkdir, readdir, rm } from 'node:fs/promises';
const root = new URL('.', import.meta.url);
const output = new URL('dist/', root);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.name === '.nojekyll' || entry.name === 'assets' || /\.(html|css)$/.test(entry.name) || ['landing.js', 'fluid.js', 'bulge.js', 'subpages.js'].includes(entry.name)) {
    await cp(new URL(entry.name, root), new URL(entry.name, output), { recursive: true });
  }
}
console.log('Weeva static website built in dist/');
