import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { handleApi } from './src/api.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json' };
const port = Number(process.env.PORT || 3000);
createServer(async (req, res) => {
  if (await handleApi(req, res)) return;
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(root + path.sep) || pathname.split('/').some(part => part.startsWith('.')) || /^(api|content|tests)\//.test(pathname.slice(1))) return res.writeHead(403).end('Forbidden');
    const contents = await readFile(file);
    res.writeHead(200, { 'Content-Type': `${types[path.extname(file)] || 'application/octet-stream'}; charset=utf-8`, 'X-Content-Type-Options': 'nosniff' });
    res.end(contents);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Reading is Travel: http://127.0.0.1:${port}`));
