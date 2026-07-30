import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDirectory = fileURLToPath(new URL('../src/app/', import.meta.url));
const forbidden = ['expo-sqlite', 'react-native-health-connect', '@/infrastructure/'];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(path)));
    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) files.push(path);
  }
  return files;
}

const violations = [];
for (const file of await collectFiles(appDirectory)) {
  const content = await readFile(file, 'utf8');
  for (const value of forbidden) {
    if (content.includes(value)) violations.push(`${file}: ${value}`);
  }
}

if (violations.length > 0) {
  console.error(`Native boundary violations:\n${violations.join('\n')}`);
  process.exit(1);
}

console.log('Native boundaries: ok');
