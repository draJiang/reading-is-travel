import { verifyGoogleToken } from './auth.js';
import { createSession, getSession, sessionCookie, expiredCookie } from './session.js';
import { listPosts, publishPost, updatePost, deletePost, readImage } from './storage-client.js';
import { createHash } from 'node:crypto';

function send(res, status, data, extra = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra });
  res.end(JSON.stringify(data));
}
function sameOrigin(req) {
  try {
    const origin = new URL(req.headers.origin);
    return origin.host === req.headers.host && (origin.protocol === 'https:' || (origin.protocol === 'http:' && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin.host)));
  } catch { return false; }
}
async function body(req) {
  if (Number(req.headers['content-length']) > 800000) throw new Error('Request is too large.');
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 800000) throw new Error('Request is too large.');
  }
  try { return JSON.parse(raw); } catch { throw new Error('Invalid JSON request.'); }
}

export async function handleApi(req, res) {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (!pathname.startsWith('/api/')) return false;
  try {
    if (req.method === 'GET' && pathname === '/api/config') send(res, 200, { clientId: process.env.GOOGLE_CLIENT_ID || null });
    else if (req.method === 'GET' && pathname === '/api/session') send(res, 200, { user: getSession(req)?.user || null });
    else if (req.method === 'GET' && pathname === '/api/posts') send(res, 200, await listPosts());
    else if (req.method === 'GET' && pathname.startsWith('/api/images/')) {
      const image = await readImage(pathname.slice('/api/images/'.length));
      if (!image) send(res, 404, { error: 'Image not found.' });
      else { res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(image); }
    } else if (req.method === 'POST' && pathname === '/api/auth/google') {
      if (!sameOrigin(req)) return send(res, 403, { error: 'Invalid request origin.' });
      if (!process.env.GOOGLE_CLIENT_ID) return send(res, 503, { error: 'Google login is not configured.' });
      const user = await verifyGoogleToken((await body(req)).credential, process.env.GOOGLE_CLIENT_ID);
      if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters.');
      user.id = `reader-${createHash('sha256').update(`${process.env.SESSION_SECRET}:${user.id}`).digest('hex')}`;
      send(res, 200, { user }, { 'Set-Cookie': sessionCookie(createSession(user), !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '')) });
    } else if (req.method === 'POST' && pathname === '/api/logout') {
      if (!sameOrigin(req)) return send(res, 403, { error: 'Invalid request origin.' });
      send(res, 200, { user: null }, { 'Set-Cookie': expiredCookie(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '')) });
    } else if (req.method === 'POST' && pathname === '/api/posts') {
      if (!sameOrigin(req)) return send(res, 403, { error: 'Invalid request origin.' });
      const user = getSession(req)?.user;
      if (!user) return send(res, 401, { error: 'Sign in with Google before publishing.' });
      send(res, 201, { post: await publishPost(user, await body(req)) });
    } else if (req.method === 'PUT' && pathname.startsWith('/api/posts/')) {
      if (!sameOrigin(req)) return send(res, 403, { error: 'Invalid request origin.' });
      const user = getSession(req)?.user;
      if (!user) return send(res, 401, { error: 'Sign in with Google before editing.' });
      send(res, 200, { post: await updatePost(user, pathname.slice('/api/posts/'.length), await body(req)) });
    } else if (req.method === 'DELETE' && pathname.startsWith('/api/posts/')) {
      if (!sameOrigin(req)) return send(res, 403, { error: 'Invalid request origin.' });
      const user = getSession(req)?.user;
      if (!user) return send(res, 401, { error: 'Sign in with Google before deleting.' });
      await deletePost(user, pathname.slice('/api/posts/'.length));
      send(res, 200, { ok: true });
    } else send(res, 404, { error: 'Not found.' });
  } catch (error) {
    const safe = /^(Invalid|Enter |Pick |Choose |Request |This post|You can only|Sign in|Google |Storage |STORAGE_|SESSION_SECRET)/.test(error.message);
    const unavailable = /Storage service|not configured|STORAGE_|SESSION_SECRET/.test(error.message);
    send(res, unavailable ? 503 : (error.status || 400), { error: safe ? error.message : 'Request failed. Please try again.' });
  }
  return true;
}
