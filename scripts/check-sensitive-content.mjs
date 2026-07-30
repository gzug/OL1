import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const files = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard'],
  { encoding: 'utf8' },
)
  .split('\n')
  .filter(Boolean)
  .filter((file) => !file.startsWith('node_modules/'))
  .filter((file) => !file.startsWith('dist/'));

const forbiddenFiles = /\.(apk|aab|jks|keystore|p8|p12|mobileprovision)$/i;
const highSignalPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bAIza[0-9A-Za-z_-]{30,}\b/,
  /\bgh[opsu]_[0-9A-Za-z]{30,}\b/,
  /\bsk-[0-9A-Za-z_-]{20,}\b/,
  /\bBearer\s+[0-9A-Za-z._-]{20,}\b/i,
];

const violations = [];
for (const file of files) {
  if (forbiddenFiles.test(file)) {
    violations.push(`${file}: forbidden artifact`);
    continue;
  }

  let content;
  try {
    content = await readFile(file, 'utf8');
  } catch {
    continue;
  }
  if (highSignalPatterns.some((pattern) => pattern.test(content))) {
    violations.push(`${file}: possible secret`);
  }
}

if (violations.length > 0) {
  console.error(`Sensitive-content scan failed:\n${violations.join('\n')}`);
  process.exit(1);
}

console.log('Secret/PHI guard: no high-signal repository content found');
