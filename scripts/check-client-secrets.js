import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv } from 'vite';

const env = { ...loadEnv('production', process.cwd(), ''), ...process.env };
const secretNames = ['GEMINI_API_KEY', 'CLOUDINARY_API_SECRET', 'GOOGLE_SEARCH_API_KEY',
  'VITE_GEMINI_API_KEY', 'VITE_CLOUDINARY_API_SECRET', 'VITE_GOOGLE_SEARCH_API_KEY'];
const secrets = secretNames.map(name => env[name]).filter(value => value && value.length >= 12);
let failed = false;
function scan(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) { scan(path); continue; }
    if (!/\.(?:js|json|html|map|txt)$/.test(entry.name)) continue;
    const text = readFileSync(path, 'utf8');
    const unknownGoogleKey = (text.match(/AIza[0-9A-Za-z_-]{35}/g) || []).some(key => key !== env.VITE_FIREBASE_API_KEY);
    if (secrets.some(secret => text.includes(secret)) || /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/.test(text) || unknownGoogleKey) {
      console.error(`Potential credential in public build: ${path}`);
      failed = true;
    }
  }
}
scan('dist');
if (failed) process.exit(1);
console.log('Public build credential scan passed. Firebase Web key is allowlisted; cloud API restrictions must be checked separately.');
