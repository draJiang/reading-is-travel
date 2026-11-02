import { createHmac, timingSafeEqual } from 'node:crypto';

const windowMs = 2 * 60 * 1000;
const seen = new Map();

function secret() {
  const value = process.env.STORAGE_SHARED_SECRET;
  if (!value || value.length < 32) throw new Error('STORAGE_SHARED_SECRET must be at least 32 characters.');
  return value;
}

export function storageSignature(method, path, timestamp, body = Buffer.alloc(0)) {
  const data = Buffer.isBuffer(body) ? body : Buffer.from(body);
  return createHmac('sha256', secret()).update(method.toUpperCase()).update('\n').update(path).update('\n').update(String(timestamp)).update('\n').update(data).digest('hex');
}

export function verifyStorageRequest(req, path, body = Buffer.alloc(0), now = Date.now()) {
  const timestamp = req.headers['x-storage-timestamp'];
  const provided = req.headers['x-storage-signature'];
  if (typeof timestamp !== 'string' || !/^\d{13}$/.test(timestamp) || Math.abs(now - Number(timestamp)) > windowMs || typeof provided !== 'string' || !/^[a-f0-9]{64}$/.test(provided)) return false;
  const expected = storageSignature(req.method, path, timestamp, body);
  if (!timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'))) return false;
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    for (const [key, expiry] of seen) if (expiry <= now) seen.delete(key);
    if (seen.has(provided)) return false;
    seen.set(provided, now + windowMs);
  }
  return true;
}

// Fail at startup rather than accepting traffic with an absent signing key.
export function assertStorageSecret() { secret(); }
