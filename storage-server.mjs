import { createServer } from 'node:http';
import { assertStorageSecret, verifyStorageRequest } from './src/storage-auth.js';
import { createStorage } from './src/vps-storage.js';

const maxBody = 800000;
assertStorageSecret();
const store = createStorage(process.env.STORAGE_DATA_DIR);
const port = Number(process.env.STORAGE_PORT || 3001);

function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }).end(JSON.stringify(value));
}

createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > maxBody) { json(res, 413, { error: 'Request is too large.' }); return; }
      chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks);
    if (!verifyStorageRequest(req, path, raw)) { json(res, 401, { error: 'Unauthorized storage request.' }); return; }
    if (req.method === 'GET' && path === '/posts') return json(res, 200, store.listPosts());
    if (req.method === 'GET' && path.startsWith('/images/')) {
      const image = store.readImage(path.slice('/images/'.length));
      if (!image) return json(res, 404, { error: 'Image not found.' });
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }).end(image);
      return;
    }
    let body = {};
    if (raw.length) {
      try { body = JSON.parse(raw.toString('utf8')); }
      catch { return json(res, 400, { error: 'Invalid JSON request.' }); }
    }
    if (req.method === 'POST' && path === '/posts') return json(res, 201, { post: store.publishPost(body.user, body.data) });
    if (req.method === 'PUT' && path.startsWith('/posts/')) return json(res, 200, { post: store.updatePost(body.user, path.slice('/posts/'.length), body.data) });
    if (req.method === 'DELETE' && path.startsWith('/posts/')) {
      store.deletePost(body.user, path.slice('/posts/'.length));
      return json(res, 200, { ok: true });
    }
    json(res, 404, { error: 'Not found.' });
  } catch (error) {
    const status = error.status || 500;
    if (status === 500) console.error(error);
    json(res, status, { error: status === 500 ? 'Storage service error.' : error.message });
  }
}).listen(port, '127.0.0.1', () => console.log(`Storage service listening on 127.0.0.1:${port}`));
