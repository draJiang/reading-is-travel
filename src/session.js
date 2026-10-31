import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const COOKIE_NAME = 'reading_session';
const lifetime = 7 * 24 * 60 * 60 * 1000;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters.');
  return value;
}
function signature(payload) { return createHmac('sha256', secret()).update(payload).digest('base64url'); }

export function createSession(user) {
  const payload = Buffer.from(JSON.stringify({ id: user.id, name: user.name, expires: Date.now() + lifetime, nonce: randomBytes(12).toString('hex') })).toString('base64url');
  return `${payload}.${signature(payload)}`;
}
export function getSession(req) {
  const token = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  if (!token || token.length > 1024) return null;
  const [payload, mac, extra] = token.split('.');
  if (!payload || !mac || extra) return null;
  const expected = signature(payload);
  if (mac.length !== expected.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try {
    const user = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!/^(google-\d{1,64}|reader-[a-f0-9]{64})$/.test(user.id) || typeof user.name !== 'string' || !user.name.trim() || user.name.length > 30 || !Number.isFinite(user.expires) || user.expires <= Date.now()) return null;
    return { user: { id: user.id, name: user.name } };
  } catch { return null; }
}
export function sessionCookie(token, secure = false) {
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${lifetime / 1000}${secure ? '; Secure' : ''}`;
}
export function expiredCookie(secure = false) {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure ? '; Secure' : ''}`;
}
