import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const sourceDir = resolve(process.cwd(), 'src', 'templates');
const targetDir = resolve(process.cwd(), 'dist', 'templates');

await mkdir(targetDir, { recursive: true });
await cp(sourceDir, targetDir, { recursive: true });

console.log('Copied templates to dist/templates');
