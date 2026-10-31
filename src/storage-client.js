import { storageSignature } from './storage-auth.js';

async function request(path, method = 'GET', payload) {
  const origin = process.env.STORAGE_SERVICE_URL;
  let base;
  try { base = new URL(origin); } catch { throw new Error('STORAGE_SERVICE_URL must be a valid HTTPS origin.'); }
  if ((base.protocol !== 'https:' && !(base.protocol === 'http:' && base.hostname === '127.0.0.1' && !process.env.VERCEL)) || base.username || base.password || base.pathname !== '/' || base.search || base.hash || base.origin !== origin) throw new Error('STORAGE_SERVICE_URL must be a valid HTTPS origin.');
  const url = new URL(path, base);
  const body = payload === undefined ? Buffer.alloc(0) : Buffer.from(JSON.stringify(payload));
  const timestamp = String(Date.now());
  const signature = storageSignature(method, url.pathname, timestamp, body);
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: { 'x-storage-timestamp': timestamp, 'x-storage-signature': signature, ...(body.length ? { 'Content-Type': 'application/json' } : {}) },
      ...(body.length ? { body } : {}),
      signal: AbortSignal.timeout(12000),
      cache: 'no-store',
    });
  } catch { throw new Error('Storage service is unavailable. Please try again.'); }
  if (response.ok) {
    try {
      if (path.startsWith('/images/')) {
        if (!response.headers.get('content-type')?.toLowerCase().startsWith('image/jpeg')) throw new Error('Invalid image response.');
        return Buffer.from(await response.arrayBuffer());
      }
      return await response.json();
    } catch { throw new Error('Storage service is unavailable. Please try again.'); }
  }
  let result;
  try { result = await response.json(); } catch { /* Do not expose proxy/server HTML errors. */ }
  const expected = (response.status === 400 || response.status === 403 || response.status === 404) && typeof result?.error === 'string';
  const error = new Error(expected ? result.error : 'Storage service is unavailable. Please try again.');
  error.status = expected ? response.status : 503;
  throw error;
}

export const listPosts = () => request('/posts');
export const publishPost = (user, data) => request('/posts', 'POST', { user, data }).then(result => result.post);
export const deletePost = (user, id) => request(`/posts/${encodeURIComponent(id)}`, 'DELETE', { user });
export async function readImage(id) {
  try { return await request(`/images/${encodeURIComponent(id)}`); }
  catch (error) { if (error.status === 404) return null; throw error; }
}
