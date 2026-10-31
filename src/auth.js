const GOOGLE_KEYS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
let cachedKeys;
let expiresAt = 0;

function decodePart(part) {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

async function googleKeys() {
  if (cachedKeys && Date.now() < expiresAt) return cachedKeys;
  const response = await fetch(GOOGLE_KEYS_URL);
  if (!response.ok) throw new Error('Google verification is unavailable. Please try again.');
  const keys = await response.json();
  if (!Array.isArray(keys.keys)) throw new Error('Google verification is unavailable. Please try again.');
  const maxAge = /(?:^|,)\s*max-age=(\d+)/i.exec(response.headers.get('cache-control') || '');
  cachedKeys = keys.keys;
  expiresAt = Date.now() + Math.min(Number(maxAge?.[1] || 300), 3600) * 1000;
  return cachedKeys;
}

export async function verifyGoogleToken(token, clientId, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 8192) throw new Error('Invalid Google credential.');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid Google credential.');
  let header, claims;
  try { header = decodePart(parts[0]); claims = decodePart(parts[1]); }
  catch { throw new Error('Invalid Google credential.'); }
  if (header.alg !== 'RS256' || !header.kid || !['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss)
    || claims.aud !== clientId?.trim() || typeof claims.sub !== 'string' || !/^[A-Za-z0-9_-]{1,255}$/.test(claims.sub)
    || typeof claims.exp !== 'number' || claims.exp * 1000 <= now
    || typeof claims.iat !== 'number' || claims.iat * 1000 > now + 60000 || claims.iat > claims.exp) throw new Error('Invalid or expired Google credential.');
  const key = (await googleKeys()).find(item => item.kid === header.kid && item.kty === 'RSA' && (!item.alg || item.alg === 'RS256'));
  if (!key) throw new Error('Google signing key is unavailable. Please try again.');
  const { createPublicKey, verify } = await import('node:crypto');
  const valid = verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), createPublicKey({ key, format: 'jwk' }), Buffer.from(parts[2], 'base64url'));
  if (!valid) throw new Error('Invalid Google credential.');
  return { id: `google-${claims.sub}`, name: typeof claims.name === 'string' ? claims.name.trim().slice(0, 30) || 'Google user' : 'Google user' };
}
