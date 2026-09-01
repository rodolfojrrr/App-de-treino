import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const source = path.join(root, 'shared-app', 'src');
const targets = [
  path.join(root, 'mobile-app', 'src', 'premium-shared'),
  path.join(root, 'frontend', 'src', 'premium-shared')
];

for (const target of targets) {
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(source, target, { recursive: true });
  console.log(`Shared app sincronizado: ${path.relative(root, target)}`);
}
